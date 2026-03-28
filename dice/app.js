(() => {
  // ======================
  // RNG
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
  // Shared Wallet + fallback
  // ======================
  const WALLET_KEY_FALLBACK = "mini_wallet_dice_v1";

  const Wallet = (() => {
    const sw = window.SharedWallet;

    if (
      sw &&
      typeof sw.getCoins === "function" &&
      typeof sw.setCoins === "function" &&
      typeof sw.addCoins === "function"
    ) {
      return {
        get() {
          return Math.floor(Number(sw.getCoins()) || 0);
        },
        set(v) {
          sw.setCoins(Math.max(0, Math.floor(Number(v) || 0)));
        },
        add(d) {
          sw.addCoins(Math.floor(Number(d) || 0));
        }
      };
    }

    function loadFallback() {
      try {
        const stored = JSON.parse(localStorage.getItem(WALLET_KEY_FALLBACK) || "null");
        if (stored && typeof stored.coins === "number") return stored;
      } catch {}
      return { coins: 1000 };
    }

    function saveFallback(state) {
      localStorage.setItem(WALLET_KEY_FALLBACK, JSON.stringify(state));
    }

    let state = loadFallback();

    return {
      get() {
        return Math.floor(Number(state.coins) || 0);
      },
      set(v) {
        state.coins = Math.max(0, Math.floor(Number(v) || 0));
        saveFallback(state);
      },
      add(d) {
        this.set(this.get() + Math.floor(Number(d) || 0));
      }
    };
  })();

  function addCoins(delta) {
    Wallet.add(delta);
    renderTop();
  }

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

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + ms / 1000 + 0.02);
    } catch {}
  }

  // ======================
  // DOM
  // ======================
  const $ = (id) => document.getElementById(id);

  const balanceEl = $("balance");

  const soundBtn = $("soundBtn");
  const bonusBtn = $("bonusBtn2");

  const btnLess = $("btnLess");
  const btnMore = $("btnMore");
  const rulePill = $("rulePill");

  const multView = $("multView");
  const profitView = $("profitView");
  const chanceView = $("chanceView");

  const thrRange = $("thrRange");
  const thrView = $("thrView");
  const rolledView = $("rolledView");

  const betInput = $("betInput");
  const betMinus = $("betMinus");
  const betPlus = $("betPlus");
  const rollBtn = $("rollBtn");

  const cubeEl = $("cube");

  // ======================
  // Top render
  // ======================
  function renderTop() {
    if (balanceEl) {
      balanceEl.textContent = String(Wallet.get());
    }
  }

  renderTop();

  // ======================
  // Sound UI
  // ======================
  function renderSoundButton() {
    if (!soundBtn) return;

    const dot = soundBtn.querySelector(".dot");
    if (!dot) return;

    dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
    dot.style.boxShadow = soundOn
      ? "0 0 0 3px rgba(38,212,123,.14)"
      : "0 0 0 3px rgba(255,90,106,.14)";
    soundBtn.style.filter = soundOn ? "none" : "grayscale(.2)";
  }

  soundBtn?.addEventListener("click", async () => {
    soundOn = !soundOn;

    if (soundOn) {
      try {
        const ctx = ensureCtx();
        if (ctx && ctx.state === "suspended") await ctx.resume();
      } catch {}
    }

    renderSoundButton();
    beep(soundOn ? 640 : 240, 70, 0.03);
  });

  renderSoundButton();

  // ======================
  // Bonus
  // ======================
  function onBonus() {
    addCoins(1000);
    beep(760, 70, 0.03);
    setTimeout(() => beep(920, 70, 0.03), 90);
  }

  bonusBtn?.addEventListener("click", onBonus);

  // ======================
  // Game state
  // ======================
  const HOUSE_EDGE = 0.985;
  let mode = "more";
  let busy = false;

  // ======================
  // Pips
  // ======================
  const PIPS = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };

  function faceHTML(val) {
    const on = new Set(PIPS[val]);
    const dots = Array.from(
      { length: 9 },
      (_, i) => `<span class="pip ${on.has(i) ? "on" : ""}"></span>`
    ).join("");

    return `<div class="pips" aria-label="pips-${val}">${dots}</div>`;
  }

  function mountFacesSafe() {
    if (!cubeEl) return;
    if (!cubeEl.querySelector('[data-face="top"]')) return;

    cubeEl.querySelector('[data-face="top"]').innerHTML = faceHTML(1);
    cubeEl.querySelector('[data-face="bottom"]').innerHTML = faceHTML(6);
    cubeEl.querySelector('[data-face="front"]').innerHTML = faceHTML(2);
    cubeEl.querySelector('[data-face="back"]').innerHTML = faceHTML(5);
    cubeEl.querySelector('[data-face="right"]').innerHTML = faceHTML(3);
    cubeEl.querySelector('[data-face="left"]').innerHTML = faceHTML(4);
  }

  mountFacesSafe();

  // ======================
  // Cube rotation
  // ======================
  function setCubeAngles(rx, ry, rz) {
    if (!cubeEl) return;
    cubeEl.style.setProperty("--rx", `${rx}deg`);
    cubeEl.style.setProperty("--ry", `${ry}deg`);
    cubeEl.style.setProperty("--rz", `${rz}deg`);
  }

  setCubeAngles(0, 0, 0);

  function anglesForWanted(n) {
    switch (n) {
      case 1: return { rx: 0, ry: 0, rz: 0 };
      case 2: return { rx: -90, ry: 0, rz: 0 };
      case 3: return { rx: 0, ry: 0, rz: -90 };
      case 4: return { rx: 0, ry: 0, rz: 90 };
      case 5: return { rx: 90, ry: 0, rz: 0 };
      case 6: return { rx: 180, ry: 0, rz: 0 };
      default: return { rx: 0, ry: 0, rz: 0 };
    }
  }

  // ======================
  // Detect real top face
  // ======================
  const faceValue = {
    top: 1,
    bottom: 6,
    front: 2,
    back: 5,
    right: 3,
    left: 4
  };

  function cssMatrix(el) {
    const tr = getComputedStyle(el).transform;
    if (!tr || tr === "none") {
      return new DOMMatrixReadOnly();
    }
    return new DOMMatrixReadOnly(tr);
  }

  function detectTopValue() {
    if (!cubeEl) return 1;

    const cubeM = cssMatrix(cubeEl);
    let bestFace = "top";
    let bestScore = Infinity;

    const faces = cubeEl.querySelectorAll(".face[data-face]");

    faces.forEach((face) => {
      const name = face.getAttribute("data-face");
      const faceM = cssMatrix(face);
      const m = cubeM.multiply(faceM);

      const nx = m.m31;
      const ny = m.m32;
      const nz = m.m33;

      const score = ny + Math.abs(nx) * 0.02 + Math.abs(nz) * 0.02;

      if (score < bestScore) {
        bestScore = score;
        bestFace = name;
      }
    });

    return faceValue[bestFace] || 1;
  }

  function spinToWanted(wanted) {
    return new Promise((resolve) => {
      if (!cubeEl) {
        resolve();
        return;
      }

      const a = anglesForWanted(wanted);

      const extraX = 360 * randInt(1, 2);
      const extraY = 360 * randInt(1, 2) + 90 * randInt(0, 3);
      const extraZ = 360 * randInt(0, 1);

      const rx = a.rx + extraX;
      const ry = a.ry + extraY;
      const rz = a.rz + extraZ;

      let done = false;

      const onEnd = (e) => {
        if (e.target !== cubeEl) return;
        if (done) return;
        done = true;
        cubeEl.removeEventListener("transitionend", onEnd);
        resolve();
      };

      cubeEl.addEventListener("transitionend", onEnd);

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
    let value = Math.floor(Number(betInput?.value) || 0);

    if (value < 1) value = 1;
    if (coins > 0 && value > coins) value = coins;
    if (coins <= 0) value = 1;

    if (betInput) betInput.value = String(value);
    recalc();
  }

  betInput?.addEventListener("input", clampBet);

  betMinus?.addEventListener("click", () => {
    if (!betInput) return;
    betInput.value = String((Number(betInput.value) || 1) - 10);
    clampBet();
    beep(460, 40, 0.02);
  });

  betPlus?.addEventListener("click", () => {
    if (!betInput) return;
    betInput.value = String((Number(betInput.value) || 1) + 10);
    clampBet();
    beep(460, 40, 0.02);
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (!betInput) return;

      const coins = Wallet.get();
      const val = chip.dataset.bet;
      betInput.value = val === "max" ? String(Math.max(1, coins)) : String(val);
      clampBet();
      beep(540, 55, 0.02);
    });
  });

  clampBet();

  // ======================
  // Mode + threshold
  // ======================
  function chanceFor(threshold, currentMode) {
    if (currentMode === "more") return (7 - threshold) / 6;
    return (threshold - 1) / 6;
  }

  function recalc() {
    const threshold = Number(thrRange?.value || 2);
    const bet = Math.floor(Number(betInput?.value) || 0);
    const chance = chanceFor(threshold, mode);
    const multiplier = Math.max(1.01, (1 / chance) * HOUSE_EDGE);
    const payout = Math.floor(bet * multiplier);
    const profit = Math.max(0, payout - bet);

    if (thrView) thrView.textContent = String(threshold);
    if (multView) multView.textContent = `x${multiplier.toFixed(2)}`;
    if (profitView) profitView.textContent = `+${profit}`;
    if (chanceView) chanceView.textContent = `${(chance * 100).toFixed(1)}%`;

    if (rulePill) {
      rulePill.textContent = mode === "more"
        ? `≥ ${threshold}`
        : `≤ ${threshold - 1}`;
    }
  }

  function setMode(nextMode) {
    mode = nextMode;

    btnLess?.classList.toggle("active", mode === "less");
    btnMore?.classList.toggle("active", mode === "more");

    beep(520, 55, 0.02);
    recalc();
  }

  btnLess?.addEventListener("click", () => setMode("less"));
  btnMore?.addEventListener("click", () => setMode("more"));

  thrRange?.addEventListener("input", () => {
    if (thrView) thrView.textContent = String(thrRange.value);
    beep(460, 40, 0.015);
    recalc();
  });

  recalc();

  // ======================
  // Roll
  // ======================
  rollBtn?.addEventListener("click", async () => {
    if (busy) return;

    const coins = Wallet.get();
    const bet = Math.floor(Number(betInput?.value) || 0);
    const threshold = Number(thrRange?.value || 2);

    if (bet <= 0) {
      alert("Ставка должна быть больше 0");
      return;
    }

    if (bet > coins) {
      alert("Недостаточно монет");
      return;
    }

    busy = true;
    rollBtn.disabled = true;

    addCoins(-bet);
    if (rolledView) rolledView.textContent = "…";

    beep(520, 55, 0.02);

    const wanted = randInt(1, 6);
    await spinToWanted(wanted);

    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );

    const result = detectTopValue();

    if (rolledView) rolledView.textContent = String(result);

    const isWin =
      (mode === "more" && result >= threshold) ||
      (mode === "less" && result <= threshold - 1);

    const chance = chanceFor(threshold, mode);
    const multiplier = Math.max(1.01, (1 / chance) * HOUSE_EDGE);
    const payout = Math.floor(bet * multiplier);

    if (isWin) {
      addCoins(payout);
      beep(760, 65, 0.03);
      setTimeout(() => beep(920, 65, 0.03), 70);
    } else {
      beep(220, 85, 0.03);
    }

    recalc();
    clampBet();

    busy = false;
    rollBtn.disabled = false;
  });

  // ======================
  // Init
  // ======================
  renderTop();
  renderSoundButton();

  window.addEventListener("focus", () => {
    renderTop();
    recalc();
  });
})();