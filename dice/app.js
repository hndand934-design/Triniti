(() => {
  // ===== RNG (честный) =====
  function randFloat() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }
  function randInt(min, max) {
    return Math.floor(randFloat() * (max - min + 1)) + min;
  }

  // ===== Shared Wallet (единый) + fallback =====
  const WALLET_KEY_FALLBACK = "mini_wallet_dice_v1";
  const Wallet = (() => {
    const sw = window.SharedWallet;
    if (sw && typeof sw.getCoins === "function" && typeof sw.setCoins === "function" && typeof sw.addCoins === "function") {
      return {
        get() { return Math.floor(Number(sw.getCoins()) || 0); },
        set(v) { sw.setCoins(Math.max(0, Math.floor(Number(v) || 0))); },
        add(d) { sw.addCoins(Math.floor(Number(d) || 0)); },
      };
    }

    function loadFallback() {
      try {
        const w = JSON.parse(localStorage.getItem(WALLET_KEY_FALLBACK) || "null");
        if (w && typeof w.coins === "number") return w;
      } catch {}
      return { coins: 1000 };
    }
    function saveFallback(w) { localStorage.setItem(WALLET_KEY_FALLBACK, JSON.stringify(w)); }
    let w = loadFallback();

    return {
      get() { return Math.floor(Number(w.coins) || 0); },
      set(v) { w.coins = Math.max(0, Math.floor(Number(v) || 0)); saveFallback(w); },
      add(d) { this.set(this.get() + Math.floor(Number(d) || 0)); },
    };
  })();

  function addCoins(d) { Wallet.add(d); renderTop(); }

  // ===== Sound (лёгкий, без лагов) =====
  let soundOn = true;
  let audioCtx = null;

  function ensureCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }

  function beep(freq = 520, ms = 55, vol = 0.03) {
    if (!soundOn) return;
    try {
      const ctx = ensureCtx();
      if (!ctx) return;

      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;

      const t0 = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);

      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + ms / 1000 + 0.02);
    } catch {}
  }

  // ===== UI =====
  const subTitle = document.getElementById("subTitle");
  const balanceEl = document.getElementById("balance");

  const soundBtn = document.getElementById("soundBtn");
  const soundText = document.getElementById("soundText");
  const bonusBtn = document.getElementById("bonusBtn");
  const bonusBtn2 = document.getElementById("bonusBtn2");

  const btnLess = document.getElementById("btnLess");
  const btnMore = document.getElementById("btnMore");
  const rulePill = document.getElementById("rulePill");

  const multView = document.getElementById("multView");
  const profitView = document.getElementById("profitView");
  const chanceView = document.getElementById("chanceView");

  const thrRange = document.getElementById("thrRange");
  const thrView = document.getElementById("thrView");
  const rolledView = document.getElementById("rolledView");

  const betInput = document.getElementById("betInput");
  const betMinus = document.getElementById("betMinus");
  const betPlus = document.getElementById("betPlus");
  const rollBtn = document.getElementById("rollBtn");

  const cubeEl = document.getElementById("cube");

  function renderTop() {
    subTitle.textContent = "Открыто вне Telegram";
    balanceEl.textContent = String(Wallet.get());
  }
  renderTop();

  // ===== Sound toggle =====
  soundBtn.onclick = async () => {
    soundOn = !soundOn;
    soundText.textContent = soundOn ? "Звук on" : "Звук off";
    const dot = soundBtn.querySelector(".dot");
    dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
    dot.style.boxShadow = soundOn
      ? "0 0 0 3px rgba(38,212,123,.14)"
      : "0 0 0 3px rgba(255,90,106,.14)";

    if (soundOn) ensureCtx();
    beep(soundOn ? 640 : 240, 70, 0.03);
  };

  // ===== Bonus =====
  function onBonus() {
    addCoins(1000);
    beep(760, 70, 0.03);
  }
  bonusBtn.onclick = onBonus;
  bonusBtn2.onclick = onBonus;

  // ===== Game state =====
  const HOUSE_EDGE = 0.985;
  let mode = "more";
  let busy = false;

  // ===== Cube faces (pips) =====
  const PIPS = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  function faceHTML(val) {
    const on = new Set(PIPS[val]);
    const dots = Array.from({ length: 9 }, (_, i) => `<span class="pip ${on.has(i) ? "on" : ""}"></span>`).join("");
    return `<div class="pips" aria-label="pips-${val}">${dots}</div>`;
  }

  function mountFaces() {
    // Важно: соответствие твоей разметке граней:
    // top=1 bottom=6 front=2 back=5 right=3 left=4
    cubeEl.querySelector('[data-face="top"]').innerHTML = faceHTML(1);
    cubeEl.querySelector('[data-face="bottom"]').innerHTML = faceHTML(6);
    cubeEl.querySelector('[data-face="front"]').innerHTML = faceHTML(2);
    cubeEl.querySelector('[data-face="back"]').innerHTML = faceHTML(5);
    cubeEl.querySelector('[data-face="right"]').innerHTML = faceHTML(3);
    cubeEl.querySelector('[data-face="left"]').innerHTML = faceHTML(4);
  }
  mountFaces();

  // ===== Orientation model (24 состояния) =====
  // Мы храним, какое число сейчас на каждой стороне.
  const BASE = { U: 1, D: 6, F: 2, B: 5, R: 3, L: 4 };

  function keyOf(o) { return `${o.U}${o.D}${o.F}${o.B}${o.R}${o.L}`; }

  // Повороты на 90° (логическая модель куба)
  function rotX(o) { // вращаем "на себя": верх->перед
    return { U: o.B, D: o.F, F: o.U, B: o.D, R: o.R, L: o.L };
  }
  function rotY(o) { // вправо: перед->право
    return { U: o.U, D: o.D, F: o.L, B: o.R, R: o.F, L: o.B };
  }
  function rotZ(o) { // по часовой: верх->право
    return { U: o.L, D: o.R, F: o.F, B: o.B, R: o.U, L: o.D };
  }

  function normDeg(d) {
    let x = d % 360;
    if (x < 0) x += 360;
    return x;
  }

  // BFS: собираем все ориентации + углы
  function bfsOrientations() {
    const start = { ...BASE };
    const q = [{ o: start, rx: 0, ry: 0, rz: 0 }];
    const seen = new Map();
    seen.set(keyOf(start), { rx: 0, ry: 0, rz: 0, o: start });

    const moves = [
      { fn: rotX, dx: 90, dy: 0, dz: 0 },
      { fn: rotY, dx: 0, dy: 90, dz: 0 },
      { fn: rotZ, dx: 0, dy: 0, dz: 90 },
    ];

    while (q.length) {
      const cur = q.shift();
      for (const m of moves) {
        const no = m.fn(cur.o);
        const k = keyOf(no);
        if (seen.has(k)) continue;

        const nx = normDeg(cur.rx + m.dx);
        const ny = normDeg(cur.ry + m.dy);
        const nz = normDeg(cur.rz + m.dz);

        const rec = { rx: nx, ry: ny, rz: nz, o: no };
        seen.set(k, rec);
        q.push({ o: no, rx: nx, ry: ny, rz: nz });
      }
    }

    const byTop = new Map();
    for (const rec of seen.values()) {
      const top = rec.o.U;
      if (!byTop.has(top)) byTop.set(top, []);
      byTop.get(top).push(rec);
    }
    return byTop;
  }

  const ORIENTS_BY_TOP = bfsOrientations();

  // ===== ✅ КЛЮЧЕВОЙ ФИКС: применяем transform в правильном порядке =====
  // CSS transforms применяются справа-налево, поэтому чтобы логика совпала, мы пишем:
  // ... rotateZ(rz) rotateY(ry) rotateX(rx)
  // Тогда по факту применяется: rotateX -> rotateY -> rotateZ (как в нашей модели).
  function applyCubeTransform(rx, ry, rz) {
    cubeEl.style.transform =
      `rotateX(-22deg) rotateY(35deg) ` +
      `rotateZ(${rz}deg) rotateY(${ry}deg) rotateX(${rx}deg)`;
  }

  // Стартовая поза
  applyCubeTransform(0, 0, 0);

  function spinToRecord(rec) {
    const extraX = 360 * randInt(1, 2);
    const extraY = 360 * randInt(1, 2);
    const extraZ = 360 * randInt(0, 1);

    const rx = rec.rx + extraX;
    const ry = rec.ry + extraY;
    const rz = rec.rz + extraZ;

    return new Promise((resolve) => {
      const onEnd = (e) => {
        // ✅ чтобы не ловить transitionend от внутренних .face/.pip
        if (e.target !== cubeEl) return;
        cubeEl.removeEventListener("transitionend", onEnd);
        resolve();
      };
      cubeEl.addEventListener("transitionend", onEnd);

      // применяем
      applyCubeTransform(rx, ry, rz);
    });
  }

  // ===== Bet controls =====
  function clampBet() {
    const coins = Wallet.get();
    let v = Math.floor(Number(betInput.value) || 0);
    if (v < 1) v = 1;
    if (v > coins) v = coins;
    betInput.value = String(v);
    recalc();
  }
  betInput.addEventListener("input", clampBet);
  betMinus.onclick = () => { betInput.value = String((Number(betInput.value)||1) - 10); clampBet(); };
  betPlus.onclick  = () => { betInput.value = String((Number(betInput.value)||1) + 10); clampBet(); };

  document.querySelectorAll(".chip").forEach((b) => {
    b.onclick = () => {
      const coins = Wallet.get();
      const val = b.dataset.bet;
      betInput.value = (val === "max") ? String(coins) : String(val);
      clampBet();
      beep(540, 55, 0.02);
    };
  });
  clampBet();

  // ===== Mode + threshold =====
  function setMode(m) {
    mode = m;
    btnLess.classList.toggle("active", mode === "less");
    btnMore.classList.toggle("active", mode === "more");
    beep(520, 55, 0.02);
    recalc();
  }
  btnLess.onclick = () => setMode("less");
  btnMore.onclick = () => setMode("more");

  thrRange.oninput = () => {
    thrView.textContent = String(thrRange.value);
    beep(460, 40, 0.015);
    recalc();
  };

  function chanceFor(thr, mode) {
    if (mode === "more") return (7 - thr) / 6;
    return (thr - 1) / 6;
  }

  function recalc() {
    const thr = Number(thrRange.value);
    thrView.textContent = String(thr);

    const bet = Math.floor(Number(betInput.value) || 0);
    const chance = chanceFor(thr, mode);
    const mult = Math.max(1.01, (1 / chance) * HOUSE_EDGE);
    const payout = Math.floor(bet * mult);
    const profit = Math.max(0, payout - bet);

    multView.textContent = `x${mult.toFixed(2)}`;
    profitView.textContent = `+${profit}`;
    chanceView.textContent = `${(chance * 100).toFixed(1)}%`;

    if (mode === "more") rulePill.textContent = `Выигрыш если выпало ≥ ${thr}`;
    else rulePill.textContent = `Выигрыш если выпало ≤ ${thr - 1}`;
  }
  recalc();

  // ===== Roll action (синхрон 100%) =====
  rollBtn.onclick = async () => {
    if (busy) return;

    const coins = Wallet.get();
    const bet = Math.floor(Number(betInput.value) || 0);
    if (bet <= 0) return alert("Ставка должна быть больше 0");
    if (bet > coins) return alert("Недостаточно монет");

    busy = true;
    rollBtn.disabled = true;

    addCoins(-bet);

    const thr = Number(thrRange.value);

    // ✅ выбираем число и ОДНОЗНАЧНО соответствующую ориентацию
    const wantedTop = randInt(1, 6);
    const list = ORIENTS_BY_TOP.get(wantedTop);
    const rec = list[randInt(0, list.length - 1)];

    // ✅ итоговое число берём из ориентации (то, что реально сверху по модели)
    // это же число показываем текстом и используем для win/lose
    const result = rec.o.U;

    rolledView.textContent = "…";
    beep(520, 55, 0.02);

    await spinToRecord(rec);

    // ✅ теперь точно синхрон
    rolledView.textContent = String(result);

    const win =
      (mode === "more" && result >= thr) ||
      (mode === "less" && result <= (thr - 1));

    const chance = chanceFor(thr, mode);
    const mult = Math.max(1.01, (1 / chance) * HOUSE_EDGE);
    const payout = Math.floor(bet * mult);

    if (win) {
      addCoins(payout);
      beep(760, 65, 0.03);
      beep(920, 65, 0.03);
    } else {
      beep(220, 85, 0.03);
    }

    recalc();
    clampBet();

    busy = false;
    rollBtn.disabled = false;
  };
})();