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
  const WALLET_KEY_FALLBACK = "mini_wallet_coinflip_v4";

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
    recalc();
  }

  function getCoins() {
    return Wallet.get();
  }

  // ======================
  // Sound
  // ======================
  let soundOn = true;
  let audioCtx = null;

  function getAC() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }

  function beep(freq = 520, ms = 55, vol = 0.03) {
    if (!soundOn) return;

    try {
      const ctx = getAC();
      if (!ctx) return;

      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = ctx.currentTime;

      o.type = "sine";
      o.frequency.value = freq;

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
  // DOM
  // ======================
  const $ = (id) => document.getElementById(id);

  const balanceEl = $("balance");
  const soundBtn = $("soundBtn");
  const bonusBtn = $("bonusBtn2");

  const coinEl = $("coin");
  const flipBtn = $("flipBtn");

  const betInput = $("betInput");
  const betMinus = $("betMinus");
  const betPlus = $("betPlus");

  const pickEagle = $("pickEagle");
  const pickTail = $("pickTail");

  const betView = $("betView");
  const winView = $("winView");
  const statusView = $("statusView");
  const pickView = $("pickView");
  const miniPickView = $("miniPickView");
  const coinStateView = $("coinStateView");

  // ======================
  // State
  // ======================
  let picked = "eagle";
  let busy = false;

  // ======================
  // Render
  // ======================
  function renderTop() {
    if (balanceEl) {
      balanceEl.textContent = String(getCoins());
    }
  }

  function renderSoundButton() {
    if (!soundBtn) return;

    const dot = soundBtn.querySelector(".dot");
    if (!dot) return;

    dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
    dot.style.boxShadow = soundOn
      ? "0 0 0 3px rgba(38,212,123,.14)"
      : "0 0 0 3px rgba(255,90,106,.14)";
  }

  function setCoinTheme(theme) {
    if (!coinEl) return;
    coinEl.classList.remove("coin3d--purple", "coin3d--gold", "coin3d--silver");
    coinEl.classList.add(`coin3d--${theme}`);
  }

  function setCoinIdlePurple() {
    setCoinTheme("purple");
    if (coinStateView) {
      coinStateView.textContent = "Фиолетовая";
    }
  }

  function setCoinResultTheme(result) {
    if (result === "eagle") {
      setCoinTheme("gold");
      if (coinStateView) coinStateView.textContent = "Золото";
    } else {
      setCoinTheme("silver");
      if (coinStateView) coinStateView.textContent = "Серебро";
    }
  }

  function resetRoundUI() {
    setCoinIdlePurple();

    if (winView) {
      winView.textContent = `+${Math.floor(Number(betInput?.value) || 0)}`;
    }

    if (statusView) {
      statusView.textContent = "Готов";
    }
  }

  function setPick(v) {
    picked = v;

    pickEagle?.classList.toggle("active", v === "eagle");
    pickTail?.classList.toggle("active", v === "tail");

    const label = v === "eagle" ? "Орёл" : "Решка";

    if (pickView) pickView.textContent = label;
    if (miniPickView) miniPickView.textContent = label;

    resetRoundUI();
    beep(520, 50, 0.025);
  }

  function recalc() {
    let bet = Math.floor(Number(betInput?.value) || 0);
    if (bet < 1) bet = 1;

    if (betInput) {
      betInput.value = String(bet);
    }

    if (betView) {
      betView.textContent = String(bet);
    }

    if (winView) {
      winView.textContent = `+${bet}`;
    }
  }

  // ======================
  // Bet controls
  // ======================
  function clampBet() {
    const coins = getCoins();
    let v = Math.floor(Number(betInput?.value) || 0);

    if (v < 1) v = 1;
    if (coins > 0 && v > coins) v = coins;
    if (coins <= 0) v = 1;

    if (betInput) {
      betInput.value = String(v);
    }

    recalc();
    resetRoundUI();
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

      const coins = getCoins();
      const val = chip.dataset.bet;

      betInput.value = val === "max"
        ? String(Math.max(1, coins))
        : String(val);

      clampBet();
      beep(540, 55, 0.02);
    });
  });

  // ======================
  // Pick buttons
  // ======================
  pickEagle?.addEventListener("click", () => setPick("eagle"));
  pickTail?.addEventListener("click", () => setPick("tail"));

  // ======================
  // Sound button
  // ======================
  soundBtn?.addEventListener("click", async () => {
    soundOn = !soundOn;

    if (soundOn) {
      try {
        const ctx = getAC();
        if (ctx && ctx.state === "suspended") {
          await ctx.resume();
        }
      } catch {}
    }

    renderSoundButton();
    beep(soundOn ? 640 : 240, 60, 0.03);
  });

  // ======================
  // Bonus button
  // ======================
  bonusBtn?.addEventListener("click", () => {
    addCoins(1000);
    beep(760, 70, 0.03);
    setTimeout(() => beep(920, 70, 0.03), 90);
  });

  // ======================
  // Coin animation
  // ======================
  function playFlipAnim() {
    return new Promise((resolve) => {
      if (!coinEl) {
        resolve();
        return;
      }

      let finished = false;

      const done = () => {
        if (finished) return;
        finished = true;
        coinEl.classList.remove("spin");
        coinEl.classList.remove("spinning");
        coinEl.removeEventListener("animationend", onEnd);
        resolve();
      };

      const onEnd = () => done();

      coinEl.classList.remove("spin");
      coinEl.classList.add("spinning");
      void coinEl.offsetWidth;
      coinEl.classList.add("spin");

      coinEl.addEventListener("animationend", onEnd, { once: true });
      setTimeout(done, 1100);
    });
  }

  // ======================
  // Main game
  // ======================
  flipBtn?.addEventListener("click", async () => {
    if (busy) return;

    const coins = getCoins();
    const bet = Math.floor(Number(betInput?.value) || 0);

    if (bet <= 0) {
      alert("Ставка должна быть больше 0");
      return;
    }

    if (bet > coins) {
      alert("Недостаточно монет");
      return;
    }

    busy = true;
    flipBtn.disabled = true;

    if (statusView) statusView.textContent = "Бросок...";
    if (winView) winView.textContent = "+0";

    addCoins(-bet);

    const result = randFloat() < 0.5 ? "eagle" : "tail";

    setCoinIdlePurple();
    beep(520, 55, 0.02);

    await playFlipAnim();

    const resultText = result === "eagle" ? "Орёл" : "Решка";
    const win = result === picked;

    setCoinResultTheme(result);

    if (win) {
      const payout = bet * 2;
      addCoins(payout);

      if (winView) {
        winView.textContent = `+${bet}`;
      }

      if (statusView) {
        statusView.textContent = `Победа • ${resultText}`;
      }

      beep(760, 65, 0.03);
      setTimeout(() => beep(920, 65, 0.03), 70);
    } else {
      if (winView) {
        winView.textContent = "+0";
      }

      if (statusView) {
        statusView.textContent = `Поражение • ${resultText}`;
      }

      beep(220, 85, 0.03);
    }

    busy = false;
    flipBtn.disabled = false;
  });

  // ======================
  // Init
  // ======================
  renderTop();
  renderSoundButton();
  setPick("eagle");
  clampBet();

  window.addEventListener("focus", () => {
    renderTop();
    recalc();
  });
})();