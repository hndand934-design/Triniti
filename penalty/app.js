(() => {
  // =========================
  // Shared Wallet (единый) + fallback
  // =========================
  const WALLET_KEY_FALLBACK = "mini_wallet_penalty_v1";

  const Wallet = (() => {
    const sw = window.SharedWallet;
    if (
      sw &&
      typeof sw.getCoins === "function" &&
      typeof sw.setCoins === "function" &&
      typeof sw.addCoins === "function"
    ) {
      return {
        get() { return Math.floor(Number(sw.getCoins()) || 0); },
        set(v) { sw.setCoins(Math.max(0, Math.floor(Number(v) || 0))); },
        add(d) { sw.addCoins(Math.floor(Number(d) || 0)); },
      };
    }

    function loadFallback() {
      const raw = localStorage.getItem(WALLET_KEY_FALLBACK);
      const n = raw ? Number(raw) : 1000;
      return Number.isFinite(n) ? n : 1000;
    }
    function saveFallback(n) { localStorage.setItem(WALLET_KEY_FALLBACK, String(n)); }
    let coins = loadFallback();

    return {
      get() { return Math.floor(Number(coins) || 0); },
      set(v) { coins = Math.max(0, Math.floor(Number(v) || 0)); saveFallback(coins); },
      add(d) { this.set(this.get() + Math.floor(Number(d) || 0)); },
    };
  })();

  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtX = (x) => "x" + (Math.round(x * 100) / 100).toFixed(2);
  const fmtRub = (n) => Math.round(n) + " ₽";

  function rngInt(n) {
    const u = new Uint32Array(1);
    crypto.getRandomValues(u);
    return u[0] % n;
  }
  function rngFloat() {
    const u = new Uint32Array(1);
    crypto.getRandomValues(u);
    return u[0] / 2 ** 32;
  }

  // ===== ЛЕСТНИЦЫ (как у тебя) =====
  const LADDER_EASY = [1.25, 1.55, 1.95, 2.50, 3.30, 4.40, 6.20, 9.10, 14.00, 22.50, 38.00, 70.00];
  const LADDER_HARD = [1.35, 1.75, 2.30, 3.20, 4.60, 6.80, 10.50, 16.50, 26.00, 41.00, 70.00, 120.00];

  // =========================
  // СЛОЖНОСТЬ (УСИЛЕНА, БЕЗ ВИЗУАЛА)
  // =========================
  // 1) перчатки двигаются чаще, и ещё чаще с шагом
  const GOALIE_BASE = {
    easy: { moveEveryMs: 360, tweenMs: 190 }, // было реже
    hard: { moveEveryMs: 250, tweenMs: 170 }, // было реже
  };

  // насколько ускорять движение вратаря на каждом шаге (мс меньше = быстрее)
  const MOVE_ACCEL_PER_STEP = {
    easy: 10,  // -10ms за шаг
    hard: 12,  // -12ms за шаг
  };

  // нижний предел, чтобы не стало “телепортом”
  const MOVE_MIN_MS = {
    easy: 220,
    hard: 160,
  };

  // 2) шанс “рефлекс-сейва” (когда зона НЕ закрыта) — увеличен
  function reflexSaveChance(diff, step) {
    // step растёт => шанс растёт
    if (diff === "hard") {
      // было примерно 0.18..0.45, теперь выше
      return clamp(0.26 + step * 0.06, 0.26, 0.62);
    }
    // easy: было 0.10..0.28, теперь выше
    return clamp(0.18 + step * 0.045, 0.18, 0.48);
  }

  // 3) “предугадывание” удара: шанс, что вратарь успеет закрыть выбранную зону
  function anticipationChance(diff, step) {
    if (diff === "hard") return clamp(0.22 + step * 0.045, 0.22, 0.62);
    return clamp(0.14 + step * 0.035, 0.14, 0.48);
  }

  // ===== AUDIO =====
  let soundOn = true;
  let audioCtx = null;

  function beep(type = "click") {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      const t0 = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);

      const presets = {
        click: { f1: 520, f2: 420, dur: 0.07, vol: 0.08 },
        kick:  { f1: 240, f2: 150, dur: 0.10, vol: 0.11 },
        goal:  { f1: 660, f2: 920, dur: 0.14, vol: 0.10 },
        save:  { f1: 180, f2: 120, dur: 0.16, vol: 0.10 },
      };
      const p = presets[type] || presets.click;

      o.type = "sine";
      o.frequency.setValueAtTime(p.f1, t0);
      o.frequency.exponentialRampToValueAtTime(p.f2, t0 + p.dur);

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(p.vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + p.dur);

      o.start(t0);
      o.stop(t0 + p.dur + 0.02);
    } catch {}
  }

  // ===== STATE =====
  const state = {
    bet: 100,
    diff: "easy",
    inRound: false,
    step: 0,
    currentX: 1.0,
    cashoutEnabled: false,

    goalieCells: [0, 1],
    goalieCover: [0, 1],
    goalieTimer: null,

    goalRect: null,
    zoneRects: [],
    ballHome: null,
    animLock: false,

    heat: new Array(15).fill(0),
  };

  // ===== DOM =====
  const balEl = $("#bal");
  const betEl = $("#bet");
  const betLabel = $("#betLabel");
  const diffLabel = $("#diffLabel");
  const diffHint = $("#diffHint");

  const easyBtn = $("#easyBtn");
  const hardBtn = $("#hardBtn");

  const minusBtn = $("#minus");
  const plusBtn = $("#plus");
  const chips = document.querySelectorAll(".chip");

  const ladderEl = $("#ladder");
  const stepTxt = $("#stepTxt");
  const xTxt = $("#xTxt");
  const stepMini = $("#stepMini");
  const xMini = $("#xMini");
  const cashLabel = $("#cashLabel");

  const placeBtn = $("#placeBtn");
  const cashBtn = $("#cashBtn");
  const resetBtn = $("#resetBtn");
  const msgEl = $("#msg");

  const zonesEl = $("#zones");
  const glovesEl = $("#gloves");
  const ballEl = $("#ball");

  const soundBtn = $("#soundBtn");
  const soundTxt = $("#soundTxt");
  const soundDot = $("#soundDot");
  const bonusBtn = $("#bonusBtn");

  // ===== UI =====
  function ladderArr() {
    return state.diff === "hard" ? LADDER_HARD : LADDER_EASY;
  }

  function computeX(step) {
    const arr = ladderArr();
    if (step <= 0) return 1.0;
    const idx = clamp(step - 1, 0, arr.length - 1);
    return arr[idx];
  }

  function renderLadder() {
    ladderEl.innerHTML = "";
    const arr = ladderArr();
    arr.forEach((x, i) => {
      const s = document.createElement("div");
      s.className = "lStep" + ((state.step === i + 1) ? " active" : "");
      s.innerHTML = `<div class="t">Шаг ${i + 1}</div><div class="x">${fmtX(x)}</div>`;
      ladderEl.appendChild(s);
    });
  }

  function setMsg(t) { msgEl.textContent = t; }

  function updateTexts() {
    balEl.textContent = String(Wallet.get());

    betEl.value = String(state.bet);
    betLabel.textContent = String(state.bet);

    diffLabel.textContent = state.diff === "hard" ? "Сложный" : "Лёгкий";
    diffHint.textContent = state.diff === "hard"
      ? "Сложный: вратарь угадывает чаще."
      : "Лёгкий: вратарь угадывает реже.";

    stepTxt.textContent = String(state.step);
    xTxt.textContent = fmtX(state.currentX);
    stepMini.textContent = String(state.step);
    xMini.textContent = fmtX(state.currentX);

    const potential = state.inRound ? Math.round(state.bet * state.currentX) : 0;
    cashLabel.textContent = state.cashoutEnabled ? fmtRub(potential) : "—";

    placeBtn.disabled = state.inRound;
    cashBtn.disabled = !state.cashoutEnabled;

    const lockBet = state.inRound;
    betEl.disabled = lockBet;
    minusBtn.disabled = lockBet;
    plusBtn.disabled = lockBet;
    chips.forEach(b => (b.disabled = lockBet));
    easyBtn.disabled = lockBet;
    hardBtn.disabled = lockBet;
  }

  // ===== ZONES / MEASURE =====
  function buildZones() {
    zonesEl.innerHTML = "";
    for (let i = 0; i < 15; i++) {
      const z = document.createElement("div");
      z.className = "zone";
      z.dataset.idx = String(i);
      z.addEventListener("click", () => onShoot(i));
      zonesEl.appendChild(z);
    }
  }

  function measureRects() {
    const zoneNodes = [...zonesEl.querySelectorAll(".zone")];
    state.zoneRects = zoneNodes.map(n => n.getBoundingClientRect());
    state.goalRect = zonesEl.getBoundingClientRect();

    const gr = state.goalRect;
    const homeX = gr.left + gr.width / 2;
    const homeY = gr.top + gr.height + Math.min(92, gr.height * 0.45);
    state.ballHome = { x: homeX, y: homeY };
  }

  function zoneCenter(idx) {
    const r = state.zoneRects[idx];
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function moveGlovesToPair(pair) {
    if (!state.goalRect || state.zoneRects.length !== 15) return;
    const a = zoneCenter(pair[0]);
    const b = zoneCenter(pair[1]);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;

    const gx = cx - (state.goalRect.left + state.goalRect.width / 2);
    const gy = cy - (state.goalRect.top + state.goalRect.height / 2);

    const maxX = state.goalRect.width * 0.38;
    const maxY = state.goalRect.height * 0.30;
    const tx = clamp(gx, -maxX, maxX);
    const ty = clamp(gy, -maxY, maxY);

    // скорость анимации (чуть быстрее на сложном/шаге)
    const baseTween = (state.diff === "hard" ? GOALIE_BASE.hard.tweenMs : GOALIE_BASE.easy.tweenMs);
    const faster = clamp(baseTween - state.step * 6, 120, baseTween);
    glovesEl.style.transitionDuration = faster + "ms";
    glovesEl.style.translate = `${tx}px ${ty}px`;
  }

  function setZonesEnabled(on) {
    zonesEl.querySelectorAll(".zone").forEach(z => z.classList.toggle("disabled", !on));
  }

  // ===== GRID HELPERS =====
  const ROWS = 3, COLS = 5;
  function neighbors(idx) {
    const r = Math.floor(idx / COLS);
    const c = idx % COLS;
    const out = [];
    if (c > 0) out.push(idx - 1);
    if (c < COLS - 1) out.push(idx + 1);
    if (r > 0) out.push(idx - COLS);
    if (r < ROWS - 1) out.push(idx + COLS);
    return out;
  }

  // ===== СКРЫТОЕ УСЛОЖНЕНИЕ (НЕ ВИЗУАЛЬНО) =====
  const HEAT_DECAY = 0.90; // меньше затухает => вратарь “помнит” чаще

  function bumpHeat(idx) {
    state.heat[idx] += 2.15;             // было меньше — теперь сильнее
    for (const nb of neighbors(idx)) state.heat[nb] += 0.75;
  }
  function decayHeat() {
    for (let i = 0; i < state.heat.length; i++) state.heat[i] *= HEAT_DECAY;
  }

  function randomAdjacentPair() {
    const base = rngInt(ROWS * COLS);
    const nbs = neighbors(base);
    const nb = nbs[rngInt(nbs.length)];
    return base < nb ? [base, nb] : [nb, base];
  }

  let ALL_PAIRS = null;
  function allPairs() {
    if (ALL_PAIRS) return ALL_PAIRS;
    const pairs = [];
    for (let i = 0; i < 15; i++) {
      for (const nb of neighbors(i)) {
        const a = Math.min(i, nb), b = Math.max(i, nb);
        if (!pairs.some(p => p[0] === a && p[1] === b)) pairs.push([a, b]);
      }
    }
    ALL_PAIRS = pairs;
    return pairs;
  }

  function pairWeight(pair) {
    const [a, b] = pair;
    const heat = state.heat[a] + state.heat[b];

    // чуть сильнее приоритет центра
    const center = 7;
    const distA = Math.abs(a - center);
    const distB = Math.abs(b - center);
    const centerBias = (1 / (1 + distA)) + (1 / (1 + distB));

    // агрессия выше (чаще ловит “привычные” зоны)
    const aggro = (state.diff === "hard")
      ? clamp(0.75 + state.step * 0.22, 0.75, 2.10)
      : clamp(0.55 + state.step * 0.16, 0.55, 1.60);

    return 0.22 + heat * aggro + centerBias * 0.22;
  }

  function weightedPickPair() {
    const pairs = allPairs();
    let sum = 0;
    const w = new Array(pairs.length);

    for (let i = 0; i < pairs.length; i++) {
      const ww = pairWeight(pairs[i]);
      w[i] = ww;
      sum += ww;
    }

    const r = rngFloat() * sum;
    let acc = 0;
    for (let i = 0; i < pairs.length; i++) {
      acc += w[i];
      if (acc >= r) return pairs[i];
    }
    return pairs[pairs.length - 1];
  }

  function updateGoalieState(pair) {
    state.goalieCells = pair;
    state.goalieCover = pair.slice();
    moveGlovesToPair(pair);
  }

  // динамический таймер (чем выше шаг — тем чаще движение)
  function currentMoveEveryMs() {
    const base = (state.diff === "hard" ? GOALIE_BASE.hard.moveEveryMs : GOALIE_BASE.easy.moveEveryMs);
    const accel = (state.diff === "hard" ? MOVE_ACCEL_PER_STEP.hard : MOVE_ACCEL_PER_STEP.easy);
    const minMs = (state.diff === "hard" ? MOVE_MIN_MS.hard : MOVE_MIN_MS.easy);
    return Math.max(minMs, base - state.step * accel);
  }

  function startGoalie() {
    stopGoalie();
    updateGoalieState(weightedPickPair());

    // вместо setInterval — безопасный self-timeout, чтобы менять частоту динамически
    const tick = () => {
      if (!state.inRound) return;

      decayHeat();

      let pair = weightedPickPair();

      // меньше хаоса (вратарь более “умный”)
      const chaos = (state.diff === "hard") ? 0.08 : 0.16;
      if (rngFloat() < chaos) pair = randomAdjacentPair();

      updateGoalieState(pair);

      state.goalieTimer = setTimeout(tick, currentMoveEveryMs());
    };

    state.goalieTimer = setTimeout(tick, currentMoveEveryMs());
  }

  function stopGoalie() {
    if (state.goalieTimer) {
      clearTimeout(state.goalieTimer);
      state.goalieTimer = null;
    }
  }

  // ===== BALL ANIMATION =====
  async function animateBallToZone(idx) {
    measureRects();
    if (!state.ballHome) return;

    const br = ballEl.getBoundingClientRect();
    const curX = br.left + br.width / 2;
    const curY = br.top + br.height / 2;

    const homeDx = state.ballHome.x - curX;
    const homeDy = state.ballHome.y - curY;

    ballEl.style.transition = "none";
    ballEl.style.transform = `translate3d(${homeDx}px, ${homeDy}px, 0) scale(1)`;
    void ballEl.offsetWidth;

    const target = zoneCenter(idx);
    const dx = target.x - state.ballHome.x;
    const dy = target.y - state.ballHome.y;

    ballEl.style.transition = "";
    ballEl.classList.remove("shoot");
    void ballEl.offsetWidth;

    ballEl.classList.add("shoot");
    ballEl.style.transform = `translate3d(${homeDx + dx}px, ${homeDy + dy}px, 0) scale(0.60)`;

    await new Promise(r => setTimeout(r, 280));

    ballEl.style.transform = `translate3d(${homeDx}px, ${homeDy}px, 0) scale(1)`;
    await new Promise(r => setTimeout(r, 170));

    ballEl.classList.remove("shoot");
  }

  // ===== FLOW =====
  function beginRound() {
    if (state.inRound) return;

    const b = Math.round(Number(betEl.value || state.bet));
    state.bet = clamp(Number.isFinite(b) ? b : 100, 1, 1e9);

    const coins = Wallet.get();
    if (state.bet > coins) {
      setMsg("Недостаточно баланса для ставки.");
      beep("save");
      updateTexts();
      return;
    }

    Wallet.add(-state.bet);

    state.inRound = true;
    state.step = 0;
    state.currentX = 1.0;
    state.cashoutEnabled = false;
    state.animLock = false;

    setZonesEnabled(true);
    setMsg("Серия началась. Выбери зону удара.");
    renderLadder();
    updateTexts();

    requestAnimationFrame(() => {
      measureRects();
      for (let i = 0; i < state.heat.length; i++) state.heat[i] *= 0.22; // меньше сброс => сложнее
      startGoalie();
    });

    beep("click");
  }

  function endRoundLose() {
    state.inRound = false;
    state.cashoutEnabled = false;
    state.animLock = false;

    stopGoalie();
    setZonesEnabled(false);

    state.step = 0;
    state.currentX = 1.0;

    renderLadder();
    updateTexts();
  }

  function nextStepWin() {
    const arr = ladderArr();
    state.step = clamp(state.step + 1, 0, arr.length);
    state.currentX = computeX(state.step);
    state.cashoutEnabled = state.step >= 1;

    renderLadder();
    updateTexts();

    if (state.step >= arr.length) doCashout(true);

    // на росте шага — обновляем частоту движения вратаря (за счёт self-timeout в tick)
  }

  function doCashout(auto = false) {
    if (!state.inRound || !state.cashoutEnabled) return;

    const payout = Math.round(state.bet * state.currentX);
    Wallet.add(payout);

    stopGoalie();
    setZonesEnabled(false);

    setMsg(auto ? `Авто-кэшаут: +${fmtRub(payout)}.` : `Кэшаут: +${fmtRub(payout)}.`);

    state.inRound = false;
    state.cashoutEnabled = false;
    state.animLock = false;

    state.step = 0;
    state.currentX = 1.0;

    renderLadder();
    updateTexts();
    beep("goal");
  }

  function resetAll() {
    // как было: если в раунде — ставка возвращается
    if (state.inRound) {
      Wallet.add(state.bet);
    }

    stopGoalie();
    setZonesEnabled(false);

    state.inRound = false;
    state.step = 0;
    state.currentX = 1.0;
    state.cashoutEnabled = false;
    state.animLock = false;

    setMsg("Выбери ставку и сложность, затем нажми «Ставка».");
    renderLadder();
    updateTexts();
    beep("click");

    requestAnimationFrame(() => measureRects());
  }

  async function onShoot(idx) {
    if (!state.inRound) {
      setMsg("Сначала нажми «Ставка».");
      beep("click");
      return;
    }
    if (state.animLock) return;
    state.animLock = true;

    bumpHeat(idx);

    // ===== Анти-чит/сложность: шанс, что вратарь “успеет” закрыть выбранную зону
    // визуально это будет просто обычное движение перчаток (без новых эффектов)
    const antP = anticipationChance(state.diff, state.step);
    if (!state.goalieCover.includes(idx) && rngFloat() < antP) {
      // выберем пару, которая точно включает idx и соседа
      const nbs = neighbors(idx);
      const nb = nbs[rngInt(nbs.length)];
      const pair = idx < nb ? [idx, nb] : [nb, idx];
      updateGoalieState(pair);
      // маленькая пауза, чтобы “успел” сместиться
      await new Promise(r => setTimeout(r, clamp(80 + (state.diff === "hard" ? 40 : 60), 80, 140)));
    }

    beep("kick");
    await animateBallToZone(idx);

    // ===== Проверяем сейв =====
    let saved = state.goalieCover.includes(idx);

    // если не закрыто — рефлекс-сейв (усилен)
    if (!saved) {
      const p = reflexSaveChance(state.diff, state.step);
      if (rngFloat() < p) saved = true;
    }

    if (saved) {
      setMsg("Сейв! Ставка сгорела.");
      beep("save");
      endRoundLose();
      return;
    }

    setMsg("ГОООЛ! X вырос — можно продолжать или «Забрать».");
    beep("goal");
    nextStepWin();

    state.animLock = false;
  }

  function setDiff(d) {
    if (state.inRound) return;
    state.diff = d;

    easyBtn.classList.toggle("active", d === "easy");
    hardBtn.classList.toggle("active", d === "hard");

    renderLadder();
    updateTexts();
    beep("click");
  }

  function updateSoundUI() {
    soundTxt.textContent = soundOn ? "Звук on" : "Звук off";
    soundDot.style.background = soundOn ? "#26d47b" : "rgba(255,255,255,.35)";
    soundDot.style.boxShadow = soundOn ? "0 0 0 3px rgba(38,212,123,.14)" : "none";
  }

  // ===== INIT =====
  function init() {
    buildZones();

    // стартовые значения
    state.bet = 100;
    betEl.value = "100";

    setZonesEnabled(false);
    setDiff("easy");
    state.currentX = 1.0;

    renderLadder();
    updateTexts();

    const sndRaw = localStorage.getItem("penalty_sound");
    if (sndRaw === "0") soundOn = false;
    updateSoundUI();

    soundBtn.addEventListener("click", async () => {
      soundOn = !soundOn;
      localStorage.setItem("penalty_sound", soundOn ? "1" : "0");
      updateSoundUI();
      beep("click");
      if (soundOn && audioCtx && audioCtx.state === "suspended") {
        try { await audioCtx.resume(); } catch {}
      }
    });

    bonusBtn.addEventListener("click", () => {
      Wallet.add(1000);
      updateTexts();
      beep("goal");
    });

    minusBtn.addEventListener("click", () => {
      state.bet = clamp(state.bet - 10, 1, 1e9);
      const coins = Wallet.get();
      if (!state.inRound) state.bet = Math.min(state.bet, coins);
      betEl.value = String(state.bet);
      updateTexts();
      beep("click");
    });

    plusBtn.addEventListener("click", () => {
      state.bet = clamp(state.bet + 10, 1, 1e9);
      const coins = Wallet.get();
      if (!state.inRound) state.bet = Math.min(state.bet, coins);
      betEl.value = String(state.bet);
      updateTexts();
      beep("click");
    });

    betEl.addEventListener("input", () => {
      const coins = Wallet.get();
      let n = Math.round(Number(betEl.value || 0));
      if (!Number.isFinite(n)) n = 100;
      n = clamp(n, 1, 1e9);
      if (!state.inRound) n = Math.min(n, coins);
      state.bet = n;
      betEl.value = String(state.bet);
      updateTexts();
    });

    chips.forEach(btn => {
      btn.addEventListener("click", () => {
        const coins = Wallet.get();
        const v = btn.dataset.chip;
        state.bet = (v === "max") ? clamp(coins, 1, 1e9) : clamp(Number(v), 1, 1e9);
        betEl.value = String(state.bet);
        updateTexts();
        beep("click");
      });
    });

    easyBtn.addEventListener("click", () => setDiff("easy"));
    hardBtn.addEventListener("click", () => setDiff("hard"));

    placeBtn.addEventListener("click", beginRound);
    cashBtn.addEventListener("click", () => doCashout(false));
    resetBtn.addEventListener("click", resetAll);

    requestAnimationFrame(() => measureRects());
    window.addEventListener("resize", () => {
      requestAnimationFrame(() => {
        measureRects();
        if (state.inRound) moveGlovesToPair(state.goalieCells);
      });
    });

    window.addEventListener("scroll", () => {
      requestAnimationFrame(() => measureRects());
    }, { passive: true });
  }

  init();
})();