(() => {
  // ================================
  // Dragon Tower FINAL
  // ================================

  const WALLET_KEY_FALLBACK = "mini_wallet_dragontower_fallback_v1";
  const SOUND_KEY = "tower_sound";

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
        add(d) { sw.addCoins(Math.floor(Number(d) || 0)); }
      };
    }

    let coins = 1000;
    try {
      const raw = localStorage.getItem(WALLET_KEY_FALLBACK);
      const n = raw ? Number(raw) : 1000;
      coins = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 1000;
    } catch {}

    const save = () => {
      try { localStorage.setItem(WALLET_KEY_FALLBACK, String(coins)); } catch {}
    };

    return {
      get() { return Math.floor(Number(coins) || 0); },
      set(v) {
        coins = Math.max(0, Math.floor(Number(v) || 0));
        save();
      },
      add(d) {
        coins = Math.max(0, Math.floor(coins + Math.floor(Number(d) || 0)));
        save();
      }
    };
  })();

  function randFloat() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }

  function randInt(n) {
    return Math.floor(randFloat() * n);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  let soundOn = localStorage.getItem(SOUND_KEY) !== "0";
  let audioCtx = null;

  function ensureCtx() {
    if (!soundOn) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }

  function beep(type = "click") {
    if (!soundOn) return;

    try {
      const ctx = ensureCtx();
      if (!ctx) return;

      const presets = {
        click: { f1: 520, f2: 420, dur: 0.06, vol: 0.06, wave: "sine" },
        pick:  { f1: 560, f2: 480, dur: 0.07, vol: 0.07, wave: "sine" },
        win:   { f1: 740, f2: 980, dur: 0.12, vol: 0.08, wave: "sine" },
        lose:  { f1: 220, f2: 150, dur: 0.14, vol: 0.09, wave: "square" },
        cash:  { f1: 760, f2: 1020, dur: 0.14, vol: 0.09, wave: "sine" }
      };

      const p = presets[type] || presets.click;
      const t0 = ctx.currentTime;

      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = p.wave;
      o.frequency.setValueAtTime(p.f1, t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, p.f2), t0 + p.dur);

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(p.vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + p.dur);

      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + p.dur + 0.02);
    } catch {}
  }

  const $ = (id) => document.getElementById(id);

  const subTitle = $("subTitle");
  const balanceEl = $("balance");

  const soundBtn = $("soundBtn");
  const soundText = $("soundText");

  const modeNormalBtn = $("modeNormal");
  const modeHardBtn = $("modeHard");
  const modeHint = $("modeHint");
  const difficultyTag = $("difficultyTag");

  const betInput = $("betInput");
  const betMinus = $("betMinus");
  const betPlus = $("betPlus");
  const chips = Array.from(document.querySelectorAll(".chip"));

  const startBtn = $("startBtn");
  const cashoutBtn = $("cashoutBtn");

  const statusText = $("statusText");
  const stepText = $("stepText");
  const xText = $("xText");
  const potentialText = $("potentialText");

  const towerGridEl = $("towerGrid");
  const ladderEl = $("ladder");
  const msgEl = $("msg");

  const ROWS = 8;
  const COLS = 4;

  const LADDER = {
    normal: [1.18, 1.42, 1.72, 2.10, 2.60, 3.30, 4.20, 5.50],
    hard:   [1.35, 1.75, 2.35, 3.20, 4.20, 5.50, 7.20, 9.40]
  };

  const state = {
    mode: "normal",
    bet: 100,
    inRound: false,
    busy: false,
    lost: false,
    currentRow: 0,
    cleared: 0,
    board: [],
    revealed: []
  };

  function fmtX(x) {
    return `x${(Math.round(x * 100) / 100).toFixed(2)}`;
  }

  function fmtCoins(n) {
    return `${Math.floor(n)} 🪙`;
  }

  function setMsg(text) {
    if (msgEl) msgEl.textContent = text;
  }

  function renderTop() {
    if (subTitle) subTitle.textContent = "DRAGON TOWER • единый кошелёк";
    if (balanceEl) balanceEl.textContent = String(Wallet.get());
  }

  function renderSoundUI() {
    if (soundText) {
      soundText.textContent = soundOn ? "Звук on" : "Звук off";
    }

    const dot = soundBtn?.querySelector(".dot");
    if (!dot) return;

    dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
    dot.style.boxShadow = soundOn
      ? "0 0 0 3px rgba(38,212,123,.14)"
      : "0 0 0 3px rgba(255,90,106,.14)";
  }

  function clampBet() {
    if (!betInput) return;

    const coins = Wallet.get();
    let v = Math.floor(Number(betInput.value) || 0);

    if (v < 1) v = 1;
    if (coins > 0 && v > coins) v = coins;
    if (coins <= 0) v = 1;

    betInput.value = String(v);
    state.bet = v;
  }

  function setModeUI() {
    modeNormalBtn?.classList.toggle("active", state.mode === "normal");
    modeHardBtn?.classList.toggle("active", state.mode === "hard");

    if (modeHint) {
      modeHint.textContent = state.mode === "normal"
        ? "Обычный: 3 яйца / 1 череп."
        : "Сложный: 1 яйцо / 3 черепа.";
    }

    if (difficultyTag) {
      difficultyTag.textContent = state.mode === "normal" ? "Обычный" : "Сложный";
    }
  }

  function getCurrentX() {
    if (!state.inRound || state.cleared <= 0) return 1;
    return LADDER[state.mode][state.cleared - 1];
  }

  function renderStatus() {
    if (!state.inRound && !state.lost && statusText) {
      statusText.textContent = "Ожидание";
    }

    if (stepText) stepText.textContent = String(state.cleared);
    if (xText) xText.textContent = fmtX(getCurrentX());

    const potential = state.inRound ? Math.floor(state.bet * getCurrentX()) : 0;
    if (potentialText) potentialText.textContent = fmtCoins(potential);

    if (startBtn) startBtn.disabled = state.busy || state.inRound;
    if (cashoutBtn) {
      cashoutBtn.disabled = !(state.inRound && !state.lost && state.cleared > 0 && !state.busy);
    }

    const lockBet = state.inRound || state.busy;
    if (betInput) betInput.disabled = lockBet;
    if (betMinus) betMinus.disabled = lockBet;
    if (betPlus) betPlus.disabled = lockBet;
    chips.forEach((b) => (b.disabled = lockBet));
    if (modeNormalBtn) modeNormalBtn.disabled = lockBet;
    if (modeHardBtn) modeHardBtn.disabled = lockBet;
  }

  function renderLadder() {
    if (!ladderEl) return;

    ladderEl.innerHTML = "";

    for (let i = ROWS - 1; i >= 0; i--) {
      const item = document.createElement("div");
      item.className = "ladderItem";
      item.innerHTML = `
        <div class="rowName">Ряд ${i + 1}</div>
        <div class="xVal">${fmtX(LADDER[state.mode][i])}</div>
      `;
      ladderEl.appendChild(item);
    }

    updateLadderActive();
  }

  function updateLadderActive() {
    if (!ladderEl) return;

    const items = Array.from(ladderEl.querySelectorAll(".ladderItem"));
    items.forEach((el) => el.classList.remove("active"));

    if (!state.inRound) return;

    const idx = ROWS - 1 - state.currentRow;
    if (items[idx]) items[idx].classList.add("active");
  }

  function buildEmptyTower() {
    if (!towerGridEl) return;

    towerGridEl.innerHTML = "";

    for (let uiRow = ROWS - 1; uiRow >= 0; uiRow--) {
      const rowEl = document.createElement("div");
      rowEl.className = "row";
      rowEl.dataset.row = String(uiRow);

      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "cell disabled";
        cell.dataset.row = String(uiRow);
        cell.dataset.col = String(c);
        cell.innerHTML = `
          <div class="cellInner">
            <div class="face face--front"></div>
            <div class="face face--back">
              <div class="icon"><span>?</span></div>
            </div>
          </div>
        `;
        rowEl.appendChild(cell);
      }

      towerGridEl.appendChild(rowEl);
    }
  }

  function setCellBack(cell, type) {
    const back = cell.querySelector(".face--back .icon");
    if (!back) return;

    back.classList.remove("egg", "skull");
    back.classList.add(type);

    const span = back.querySelector("span");
    if (span) span.textContent = type === "egg" ? "🥚" : "💀";
  }

  function applyRowInteractivity() {
    if (!towerGridEl) return;

    const cells = Array.from(towerGridEl.querySelectorAll(".cell"));
    cells.forEach((cell) => {
      const r = Number(cell.dataset.row);
      const c = Number(cell.dataset.col);
      const isRevealed = state.revealed?.[r]?.[c] === true;

      cell.classList.toggle("revealed", isRevealed);

      const clickable =
        state.inRound &&
        !state.busy &&
        !state.lost &&
        r === state.currentRow &&
        !isRevealed;

      cell.classList.toggle("disabled", !clickable);
      cell.style.pointerEvents = clickable ? "auto" : "none";
    });
  }

  function revealRow(r) {
    const rowCells = Array.from(towerGridEl.querySelectorAll(`.cell[data-row="${r}"]`));
    rowCells.forEach((cell) => {
      const c = Number(cell.dataset.col);
      const t = state.board[r][c];
      setCellBack(cell, t);
      cell.classList.add("revealed");
    });
  }

  function markPicked(cell, type) {
    cell.classList.add(type === "egg" ? "hitSafe" : "hitSkull");
  }

  function newBoard() {
    state.board = Array.from({ length: ROWS }, () => Array(COLS).fill("egg"));
    state.revealed = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

    const skulls = state.mode === "normal" ? 1 : 3;

    for (let r = 0; r < ROWS; r++) {
      const arr = [];
      for (let i = 0; i < skulls; i++) arr.push("skull");
      while (arr.length < COLS) arr.push("egg");
      shuffle(arr);

      for (let c = 0; c < COLS; c++) {
        state.board[r][c] = arr[c];
      }
    }
  }

  function resetIdle(keepMessage = false) {
    state.inRound = false;
    state.busy = false;
    state.lost = false;
    state.cleared = 0;
    state.currentRow = 0;

    if (!keepMessage) {
      setMsg("Выбери режим и ставку, затем нажми «Ставка».");
    }

    renderStatus();
    updateLadderActive();
    applyRowInteractivity();
  }

  function startRound() {
    if (state.busy || state.inRound) return;

    clampBet();

    const coins = Wallet.get();
    if (state.bet <= 0) {
      alert("Ставка должна быть больше 0");
      return;
    }
    if (state.bet > coins) {
      alert("Недостаточно монет");
      return;
    }

    Wallet.add(-state.bet);
    renderTop();

    state.inRound = true;
    state.busy = false;
    state.lost = false;
    state.cleared = 0;
    state.currentRow = 0;

    newBoard();
    buildEmptyTower();

    if (statusText) statusText.textContent = "Игра началась";
    setMsg("Выбери плитку в первом ряду.");

    renderLadder();
    updateLadderActive();
    applyRowInteractivity();
    renderStatus();

    beep("click");
  }

  async function handlePick(cell) {
    if (!state.inRound || state.busy || state.lost) return;

    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);
    if (r !== state.currentRow) return;

    state.busy = true;
    renderStatus();

    state.revealed[r][c] = true;
    const pickedType = state.board[r][c];

    setCellBack(cell, pickedType);
    cell.classList.add("revealed");
    markPicked(cell, pickedType);

    beep("pick");

    await new Promise((res) => setTimeout(res, 160));

    revealRow(r);
    for (let k = 0; k < COLS; k++) {
      state.revealed[r][k] = true;
    }

    await new Promise((res) => setTimeout(res, 520));

    if (pickedType === "skull") {
      state.lost = true;
      if (statusText) statusText.textContent = "Проигрыш";
      setMsg("Череп! Ставка сгорела.");
      beep("lose");

      for (let rr = 0; rr < ROWS; rr++) {
        revealRow(rr);
        for (let cc = 0; cc < COLS; cc++) {
          state.revealed[rr][cc] = true;
        }
      }

      state.inRound = false;
      state.busy = false;
      updateLadderActive();
      applyRowInteractivity();
      renderStatus();
      return;
    }

    state.cleared += 1;
    beep("win");

    if (state.cleared >= ROWS) {
      const payout = Math.floor(state.bet * LADDER[state.mode][ROWS - 1]);
      Wallet.add(payout);
      renderTop();

      if (statusText) statusText.textContent = "Финиш";
      setMsg(`Башня пройдена! Авто-кэшаут: +${payout} 🪙`);

      state.inRound = false;
      state.busy = false;
      updateLadderActive();
      applyRowInteractivity();
      renderStatus();
      beep("cash");
      return;
    }

    state.currentRow += 1;
    if (statusText) statusText.textContent = "Ряд пройден";
    setMsg(`Ряд ${state.cleared} пройден. Выбери плитку в ряду ${state.cleared + 1}.`);

    state.busy = false;
    updateLadderActive();
    applyRowInteractivity();
    renderStatus();
  }

  function cashout() {
    if (!(state.inRound && !state.lost && state.cleared > 0 && !state.busy)) return;

    const x = getCurrentX();
    const payout = Math.floor(state.bet * x);

    Wallet.add(payout);
    renderTop();

    if (statusText) statusText.textContent = "Кэшаут";
    setMsg(`Кэшаут: +${payout} 🪙 (${fmtX(x)})`);

    state.inRound = false;
    state.busy = false;
    state.lost = false;

    updateLadderActive();
    applyRowInteractivity();
    renderStatus();

    beep("cash");
  }

  function setMode(mode) {
    if (state.inRound || state.busy) return;

    state.mode = mode;
    setModeUI();
    renderLadder();
    buildEmptyTower();
    resetIdle(true);

    if (statusText) statusText.textContent = "Ожидание";
    setMsg("Выбери режим и ставку, затем нажми «Ставка».");

    beep("click");
  }

  function initPressables() {
    document.querySelectorAll(".pressable").forEach((el) => {
      el.addEventListener("pointerdown", () => el.classList.add("is-pressed"));
      const clear = () => el.classList.remove("is-pressed");
      el.addEventListener("pointerup", clear);
      el.addEventListener("pointerleave", clear);
      el.addEventListener("pointercancel", clear);
    });
  }

  towerGridEl?.addEventListener("click", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell || cell.classList.contains("disabled")) return;
    handlePick(cell);
  });

  startBtn?.addEventListener("click", startRound);
  cashoutBtn?.addEventListener("click", cashout);

  modeNormalBtn?.addEventListener("click", () => setMode("normal"));
  modeHardBtn?.addEventListener("click", () => setMode("hard"));

  betInput?.addEventListener("input", () => {
    clampBet();
    if (!state.inRound) renderStatus();
  });

  betMinus?.addEventListener("click", () => {
    if (!betInput) return;
    betInput.value = String((Number(betInput.value) || 1) - 10);
    betInput.dispatchEvent(new Event("input"));
    beep("click");
  });

  betPlus?.addEventListener("click", () => {
    if (!betInput) return;
    betInput.value = String((Number(betInput.value) || 1) + 10);
    betInput.dispatchEvent(new Event("input"));
    beep("click");
  });

  chips.forEach((b) => {
    b.addEventListener("click", () => {
      if (!betInput) return;
      const val = b.dataset.bet;
      const coins = Wallet.get();

      betInput.value = val === "max" ? String(Math.max(1, coins)) : String(val);
      betInput.dispatchEvent(new Event("input"));
      beep("click");
    });
  });

  soundBtn?.addEventListener("click", async () => {
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
    renderSoundUI();
    beep("click");

    if (soundOn && audioCtx && audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch {}
    }
  });

  function init() {
    renderTop();
    renderSoundUI();
    setModeUI();
    clampBet();
    renderLadder();
    buildEmptyTower();
    resetIdle();
    initPressables();
  }

  init();
})();
