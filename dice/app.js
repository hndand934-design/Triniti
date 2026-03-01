(() => {
  // ======================
  // RNG (честный)
  // ======================
  function randFloat() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }
  function randInt(min, max) {
    return Math.floor(randFloat() * (max - min + 1)) + min;
  }

  // ======================
  // Shared Wallet (единый) + fallback
  // ======================
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

  // ======================
  // Sound
  // ======================
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

  // ======================
  // UI
  // ======================
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

  function onBonus() {
    addCoins(1000);
    beep(760, 70, 0.03);
  }
  bonusBtn.onclick = onBonus;
  bonusBtn2.onclick = onBonus;

  // ======================
  // Game state
  // ======================
  const HOUSE_EDGE = 0.985;
  let mode = "more";
  let busy = false;

  // ======================
  // Pips (на всякий)
  // ======================
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

  function mountFacesSafe() {
    const t = cubeEl.querySelector('[data-face="top"]');
    if (!t) return;
    // стандартная раскладка как в твоём коде
    cubeEl.querySelector('[data-face="top"]').innerHTML = faceHTML(1);
    cubeEl.querySelector('[data-face="bottom"]').innerHTML = faceHTML(6);
    cubeEl.querySelector('[data-face="front"]').innerHTML = faceHTML(2);
    cubeEl.querySelector('[data-face="back"]').innerHTML = faceHTML(5);
    cubeEl.querySelector('[data-face="right"]').innerHTML = faceHTML(3);
    cubeEl.querySelector('[data-face="left"]').innerHTML = faceHTML(4);
  }
  mountFacesSafe();

  // ======================
  // ✅ Жёсткие углы (мы их используем ТОЛЬКО для анимации),
  // а итоговое число берём из реальной матрицы после вращения.
  // ======================
  function setCubeAngles(rx, ry, rz) {
    cubeEl.style.setProperty("--rx", `${rx}deg`);
    cubeEl.style.setProperty("--ry", `${ry}deg`);
    cubeEl.style.setProperty("--rz", `${rz}deg`);
  }

  // базово
  setCubeAngles(0, 0, 0);

  // Попытка поставить число "наверх" (может визуально не совпасть — это НЕ страшно)
  function anglesForWanted(n) {
    // эти углы “как обычно” для твоей раскладки граней,
    // но реальный топ мы всё равно измерим матрицей
    switch (n) {
      case 1: return { rx: 0,   ry: 0, rz: 0 };
      case 2: return { rx: -90, ry: 0, rz: 0 };
      case 3: return { rx: 0,   ry: 0, rz: -90 };
      case 4: return { rx: 0,   ry: 0, rz: 90 };
      case 5: return { rx: 90,  ry: 0, rz: 0 };
      case 6: return { rx: 180, ry: 0, rz: 0 };
      default: return { rx: 0,  ry: 0, rz: 0 };
    }
  }

  // ======================
  // ✅ 100% СИНХРОН: определяем верхнюю грань по matrix3d
  // ======================
  const faceValue = { top: 1, bottom: 6, front: 2, back: 5, right: 3, left: 4 };

  function cssMatrix(el) {
    const tr = getComputedStyle(el).transform;
    // если "none"
    if (!tr || tr === "none") return new DOMMatrixReadOnly();
    return new DOMMatrixReadOnly(tr);
  }

  function detectTopValue() {
    const cubeM = cssMatrix(cubeEl);

    // В CSS ось Y направлена вниз, значит "верх" — это направление (-Y)
    // Для каждой грани берём нормаль (0,0,1) и считаем её после M=cube*face
    // Берём грань с МИНИМАЛЬНЫМ y (самая “вверх”).
    let bestFace = "top";
    let bestScore = Infinity;

    const faces = cubeEl.querySelectorAll(".face[data-face]");
    faces.forEach((f) => {
      const name = f.getAttribute("data-face");
      const fm = cssMatrix(f);

      // общий M
      const m = cubeM.multiply(fm);

      // нормаль (0,0,1) -> (m31, m32, m33) по правилам DOMMatrix
      const nx = m.m31;
      const ny = m.m32;
      const nz = m.m33;

      // score: чем меньше ny — тем больше "вверх" (к -Y)
      // небольшой учёт nz чтобы при странной позе не путалось
      const score = ny + Math.abs(nx) * 0.02 + Math.abs(nz) * 0.02;

      if (score < bestScore) {
        bestScore = score;
        bestFace = name;
      }
    });

    return faceValue[bestFace] || 1;
  }

  // ======================
  // Spin
  // ======================
  function spinToWanted(wanted) {
    const a = anglesForWanted(wanted);

    const extraX = 360 * randInt(1, 2);
    const extraY = 360 * randInt(1, 2) + 90 * randInt(0, 3);
    const extraZ = 360 * randInt(0, 1);

    const rx = a.rx + extraX;
    const ry = a.ry + extraY;
    const rz = a.rz + extraZ;

    return new Promise((resolve) => {
      let done = false;

      const onEnd = (e) => {
        if (e.target !== cubeEl) return;
        if (done) return;
        done = true;
        cubeEl.removeEventListener("transitionend", onEnd);
        resolve();
      };

      cubeEl.addEventListener("transitionend", onEnd);

      // fallback на мобилках
      setTimeout(() => {
        if (done) return;
        done = true;
        cubeEl.removeEventListener("transitionend", onEnd);
        resolve();
      }, 1200);

      setCubeAngles(rx, ry, rz);
    });
  }

  // ======================
  // Bet controls
  // ======================
  function clampBet() {
    const coins = Wallet.get();
    let v = Math.floor(Number(betInput.value) || 0);
    if (v < 1) v = 1;
    if (v > coins) v = coins;
    betInput.value = String(v);
    recalc();
  }
  betInput.addEventListener("input", clampBet);
  betMinus.onclick = () => { betInput.value = String((Number(betInput.value) || 1) - 10); clampBet(); };
  betPlus.onclick  = () => { betInput.value = String((Number(betInput.value) || 1) + 10); clampBet(); };

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

  // ======================
  // Mode + threshold
  // ======================
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

  // ======================
  // ✅ Roll: один источник истины = реально верхняя грань
  // ======================
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

    // хотим красивую рандомность
    const wanted = randInt(1, 6);

    rolledView.textContent = "…";
    beep(520, 55, 0.02);

    await spinToWanted(wanted);

    // ✅ берем реальный TOP после анимации (всегда совпадает с тем что видно)
    // небольшая задержка на отрисовку кадра
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const result = detectTopValue();

    // ✅ текст = реальный верх
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
