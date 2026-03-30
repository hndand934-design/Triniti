(() => {
  function randFloat() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }

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

    const KEY = "rps_wallet_fallback_v1";

    function get() {
      return Math.floor(Number(localStorage.getItem(KEY) || 1000));
    }

    function set(v) {
      localStorage.setItem(KEY, String(Math.max(0, Math.floor(Number(v) || 0))));
    }

    function add(d) {
      set(get() + Math.floor(Number(d) || 0));
    }

    return { get, set, add };
  })();

  const SOUND_KEY = "triniti_rps_sound_v1";
  let soundOn = (localStorage.getItem(SOUND_KEY) ?? "1") === "1";
  let audioCtx = null;

  function getAudioCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }

  function beep(freq = 520, ms = 55, vol = 0.03, type = "sine") {
    if (!soundOn) return;

    try {
      const ctx = getAudioCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = type;
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

  function soundWin() {
    beep(760, 60, 0.03);
    setTimeout(() => beep(920, 60, 0.03), 75);
  }

  function soundLose() {
    beep(220, 85, 0.03);
  }

  function soundDraw() {
    beep(420, 55, 0.02);
  }

  function soundCash() {
    beep(820, 70, 0.03);
    setTimeout(() => beep(980, 60, 0.025), 75);
  }

  const $ = (id) => document.getElementById(id);

  const balanceEl = $("balance");
  const soundBtn = $("soundBtn");
  const soundText = $("soundText");

  const statusView = $("statusView");
  const seriesView = $("seriesView");
  const multView = $("multView");
  const potentialView = $("potentialView");

  const youPickView = $("youPickView");
  const botPickView = $("botPickView");
  const resultView = $("resultView");

  const youIcon = $("youIcon");
  const botIcon = $("botIcon");

  const betInput = $("betInput");
  const betMinus = $("betMinus");
  const betPlus = $("betPlus");

  const playBtn = $("playBtn");
  const cashoutBtn = $("cashoutBtn");
  const winView = $("winView");

  const ladderEl = $("ladder");

  const STEPS = [1.0, 1.2, 1.5, 2.0, 3.0, 5.0, 10.0];
  const MAX_STEP = STEPS.length - 1;

  const MOVES = ["rock", "scissors", "paper"];

  const MOVE_RU = {
    rock: "Камень",
    scissors: "Ножницы",
    paper: "Бумага"
  };

  const ICON = {
    rock: "✊🏻",
    scissors: "✌🏻",
    paper: "✋🏻"
  };

  let picked = "rock";
  let inSeries = false;
  let series = 0;
  let lockedBet = 0;
  let busy = false;

  function syncBalanceUI() {
    if (balanceEl) balanceEl.textContent = String(Wallet.get());
  }

  function addCoins(d) {
    Wallet.add(d);
    syncBalanceUI();
    clampBet();
  }

  function currentX() {
    return STEPS[Math.min(series, MAX_STEP)];
  }

  function currentPayout() {
    if (!inSeries || lockedBet <= 0) return 0;
    return Math.floor(lockedBet * currentX());
  }

  function renderSoundUI() {
    if (soundText) {
      soundText.textContent = soundOn ? "Звук on" : "Звук off";
    }

    const dot = soundBtn?.querySelector(".dot");
    if (dot) {
      dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
      dot.style.boxShadow = soundOn
        ? "0 0 0 3px rgba(38,212,123,.14)"
        : "0 0 0 3px rgba(255,90,106,.14)";
    }
  }

  function renderLadder() {
    if (!ladderEl) return;

    ladderEl.innerHTML = "";

    STEPS.forEach((x, i) => {
      const step = document.createElement("div");
      step.className = "step" + (i === series ? " active" : "");
      step.innerHTML = `
        <div class="sTitle">${i === 0 ? "Старт" : `Шаг ${i}`}</div>
        <div class="sX">x${x.toFixed(2)}</div>
      `;
      ladderEl.appendChild(step);
    });
  }

  function renderStats() {
    if (seriesView) {
      seriesView.textContent = `${series} побед`;
    }

    if (multView) {
      multView.textContent = `x${currentX().toFixed(2)}`;
    }

    const baseBet = inSeries
      ? lockedBet
      : Math.floor(Number(betInput?.value) || 0);

    if (potentialView) {
      potentialView.textContent =
        baseBet > 0 ? `${Math.floor(baseBet * currentX())} 🪙` : "0 🪙";
    }

    if (winView) {
      winView.textContent =
        inSeries && series > 0 ? `${currentPayout()} 🪙` : "0 🪙";
    }
  }

  function renderIdleViews() {
    if (statusView) statusView.textContent = "Ожидание";
    if (botPickView) botPickView.textContent = "—";
    if (resultView) resultView.textContent = "—";
    if (botIcon) botIcon.textContent = ICON.rock;
  }

  function lockBetUI(lock) {
    if (betInput) betInput.disabled = lock;
    if (betMinus) betMinus.disabled = lock;
    if (betPlus) betPlus.disabled = lock;

    document.querySelectorAll(".chip").forEach((btn) => {
      btn.disabled = lock;
    });
  }

  function setPicked(move, silent = false) {
    picked = move;

    document.querySelectorAll(".pickBtn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.move === move);
    });

    if (youIcon) youIcon.textContent = ICON[move];
    if (youPickView) youPickView.textContent = MOVE_RU[move];

    if (!silent) beep(520, 45, 0.02);
  }

  function clampBet() {
    if (!betInput || inSeries) return;

    let value = Math.floor(Number(betInput.value) || 0);
    const coins = Wallet.get();

    if (value < 1) value = 1;
    if (coins > 0 && value > coins) value = coins;
    if (coins <= 0) value = 1;

    betInput.value = String(value);
    renderStats();
  }

  function botMove() {
    const index = Math.floor(randFloat() * MOVES.length);
    return MOVES[index];
  }

  function decide(you, bot) {
    if (you === bot) return "draw";

    if (
      (you === "rock" && bot === "scissors") ||
      (you === "scissors" && bot === "paper") ||
      (you === "paper" && bot === "rock")
    ) {
      return "win";
    }

    return "lose";
  }

  function setRoundUI(bot) {
    if (botIcon) botIcon.textContent = ICON[bot];
    if (botPickView) botPickView.textContent = MOVE_RU[bot];
    if (resultView) resultView.textContent = "—";
  }

  function resetToIdle() {
    inSeries = false;
    series = 0;
    lockedBet = 0;
    busy = false;

    lockBetUI(false);

    if (cashoutBtn) cashoutBtn.disabled = true;

    renderIdleViews();
    renderLadder();
    renderStats();
  }

  function startSeriesIfNeeded() {
    if (inSeries) return true;

    const bet = Math.floor(Number(betInput?.value) || 0);
    const coins = Wallet.get();

    if (bet <= 0) return false;

    if (bet > coins) {
      alert("Недостаточно монет");
      return false;
    }

    lockedBet = bet;
    addCoins(-lockedBet);

    inSeries = true;
    series = 0;

    lockBetUI(true);

    if (cashoutBtn) cashoutBtn.disabled = true;
    if (statusView) statusView.textContent = "Серия";

    renderStats();
    renderLadder();

    return true;
  }

  function doCashout(auto = false) {
    if (!inSeries || series <= 0) return;

    const payout = currentPayout();
    addCoins(payout);

    if (statusView) {
      statusView.textContent = auto ? "Авто-кэшаут" : "Кэшаут";
    }

    if (resultView) {
      resultView.textContent = "Забрано";
    }

    if (winView) {
      winView.textContent = `${payout} 🪙`;
    }

    soundCash();

    setTimeout(() => {
      resetToIdle();
    }, auto ? 120 : 80);
  }

  syncBalanceUI();
  renderSoundUI();
  renderLadder();
  renderStats();
  renderIdleViews();
  setPicked("rock", true);

  soundBtn?.addEventListener("click", async () => {
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");

    if (soundOn && audioCtx && audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch {}
    }

    renderSoundUI();
    beep(soundOn ? 640 : 240, 60, 0.03);
  });

  document.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (inSeries || !betInput) return;

      const val = btn.dataset.bet;
      const coins = Wallet.get();

      betInput.value = val === "max" ? String(coins) : String(val);
      clampBet();
      beep(540, 55, 0.02);
    });
  });

  betInput?.addEventListener("input", clampBet);

  betMinus?.addEventListener("click", () => {
    if (inSeries || !betInput) return;
    betInput.value = String((Number(betInput.value) || 1) - 10);
    clampBet();
  });

  betPlus?.addEventListener("click", () => {
    if (inSeries || !betInput) return;
    betInput.value = String((Number(betInput.value) || 1) + 10);
    clampBet();
  });

  document.querySelectorAll(".pickBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setPicked(btn.dataset.move);
    });
  });

  cashoutBtn?.addEventListener("click", () => {
    if (busy) return;
    doCashout(false);
  });

  playBtn?.addEventListener("click", async () => {
    if (busy) return;
    busy = true;

    const started = startSeriesIfNeeded();
    if (!started) {
      busy = false;
      return;
    }

    if (statusView) statusView.textContent = "Раунд...";
    if (youPickView) youPickView.textContent = MOVE_RU[picked];
    if (youIcon) youIcon.textContent = ICON[picked];

    const bot = botMove();
    setRoundUI(bot);

    await new Promise((resolve) => setTimeout(resolve, 140));

    const outcome = decide(picked, bot);

    if (outcome === "draw") {
      if (resultView) resultView.textContent = "Ничья";
      if (statusView) statusView.textContent = "Ничья";

      soundDraw();
      renderLadder();
      renderStats();

      busy = false;
      return;
    }

    if (outcome === "win") {
      series = Math.min(series + 1, MAX_STEP);

      if (resultView) resultView.textContent = "Победа";
      if (statusView) statusView.textContent = "Серия растёт";

      soundWin();

      if (cashoutBtn) {
        cashoutBtn.disabled = series <= 0;
      }

      renderLadder();
      renderStats();

      if (series === MAX_STEP) {
        await new Promise((resolve) => setTimeout(resolve, 140));
        doCashout(true);
        return;
      }

      busy = false;
      return;
    }

    if (outcome === "lose") {
      if (resultView) resultView.textContent = "Поражение";
      if (statusView) statusView.textContent = "Серия в ноль";
      if (winView) winView.textContent = "0 🪙";

      soundLose();

      setTimeout(() => {
        resetToIdle();
      }, 80);

      return;
    }
  });

  clampBet();
})();