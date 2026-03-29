(() => {
  // =========================
  // RNG
  // =========================
  function randFloat() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }

  // =========================
  // Wallet
  // =========================
  const Wallet = (() => {
    const sw = window.SharedWallet;

    if (
      sw &&
      typeof sw.getCoins === "function" &&
      typeof sw.setCoins === "function" &&
      typeof sw.addCoins === "function"
    ) {
      return {
        get: () => Math.floor(Number(sw.getCoins()) || 0),
        set: (v) => sw.setCoins(Math.max(0, Math.floor(Number(v) || 0))),
        add: (d) => sw.addCoins(Math.floor(Number(d) || 0)),
      };
    }

    const KEY = "rps_wallet_fallback_v1";

    const get = () => Math.floor(Number(localStorage.getItem(KEY) || 1000));
    const set = (v) => localStorage.setItem(KEY, String(Math.max(0, Math.floor(Number(v) || 0))));
    const add = (d) => set(get() + Math.floor(Number(d) || 0));

    return { get, set, add };
  })();

  // =========================
  // Sound
  // =========================
  let soundOn = true;
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

  // =========================
  // UI refs
  // =========================
  const $ = (id) => document.getElementById(id);

  const balanceEl = $("balance");

  const soundBtn = $("soundBtn");
  const soundText = $("soundText");
  const bonusBtn = $("bonusBtn");

  const statusView = $("statusView");
  const youPickView = $("youPickView");
  const botPickView = $("botPickView");
  const resultView = $("resultView");

  const ladderEl = $("ladder");
  const seriesView = $("seriesView");
  const multView = $("multView");
  const potentialView = $("potentialView");

  const botIcon = $("botIcon");
  const youIcon = $("youIcon");

  const betInput = $("betInput");
  const betMinus = $("betMinus");
  const betPlus = $("betPlus");

  const playBtn = $("playBtn");
  const cashoutBtn = $("cashoutBtn");
  const winView = $("winView");

  // =========================
  // Config
  // =========================
  const STEPS = [1.00, 1.20, 1.50, 2.00, 3.00, 5.00, 10.00];
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

  // =========================
  // State
  // =========================
  let picked = "rock";
  let inSeries = false;
  let series = 0;
  let lockedBet = 0;
  let busy = false;

  // =========================
  // Helpers
  // =========================
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

  function resetRoundViews() {
    if (botPickView) botPickView.textContent = "—";
    if (resultView) resultView.textContent = "—";
    if (botIcon) botIcon.textContent = "✊🏻";
  }

  function renderLadder() {
    if (!ladderEl) return;

    ladderEl.innerHTML = "";

    STEPS.forEach((x, i) => {
      const box = document.createElement("div");
      box.className = "step" + (i === series ? " active" : "");
      box.innerHTML = `
        <div class="sTitle">${i === 0 ? "Старт" : `Шаг ${i}`}</div>
        <div class="sX">x${x.toFixed(2)}</div>
      `;
      ladderEl.appendChild(box);
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
      potentialView.textContent = baseBet > 0
        ? `${Math.floor(baseBet * currentX())} 🪙`
        : "0 🪙";
    }

    if (winView) {
      winView.textContent = inSeries && series > 0
        ? `${currentPayout()} 🪙`
        : "0 🪙";
    }
  }

  function lockBetUI(lock) {
    if (betInput) betInput.disabled = lock;
    if (betMinus) betMinus.disabled = lock;
    if (betPlus) betPlus.disabled = lock;

    document.querySelectorAll(".chip").forEach((b) => {
      b.disabled = lock;
    });
  }

  function setPicked(v) {
    picked = v;

    document.querySelectorAll(".pickBtn").forEach((b) => {
      b.classList.toggle("active", b.dataset.move === v);
    });

    if (youIcon) youIcon.textContent = ICON[v];
    if (youPickView) youPickView.textContent = MOVE_RU[v];

    beep(520, 45, 0.02);
  }

  function clampBet() {
    if (!betInput) return;
    if (inSeries) return;

    let v = Math.floor(Number(betInput.value) || 0);
    const coins = Wallet.get();

    if (v < 1) v = 1;
    if (coins > 0 && v > coins) v = coins;
    if (coins <= 0) v = 1;

    betInput.value = String(v);
    renderStats();
  }

  function botMove() {
    const i = Math.floor(randFloat() * 3);
    return MOVES[i];
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

  function doCashout(auto = false) {
    if (!inSeries) return;
    if (series <= 0) return;

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

    inSeries = false;
    series = 0;
    lockedBet = 0;
    busy = false;

    if (cashoutBtn) cashoutBtn.disabled = true;
    lockBetUI(false);

    renderLadder();
    renderStats();
    soundCash();
  }

  // =========================
  // Init base UI
  // =========================
  syncBalanceUI();
  renderLadder();
  renderStats();
  resetRoundViews();
  setPicked("rock");

  if (statusView) statusView.textContent = "Ожидание";
  if (resultView) resultView.textContent = "—";

  // =========================
  // Events
  // =========================
  soundBtn?.addEventListener("click", async () => {
    soundOn = !soundOn;

    if (soundText) {
      soundText.textContent = soundOn ? "Звук on" : "Звук off";
    }

    const dot = soundBtn.querySelector(".dot");
    if (dot) {
      dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
      dot.style.boxShadow = soundOn
        ? "0 0 0 3px rgba(38,212,123,.14)"
        : "0 0 0 3px rgba(255,90,106,.14)";
    }

    if (soundOn && audioCtx && audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch {}
    }

    beep(soundOn ? 640 : 240, 60, 0.03);
  });

  bonusBtn?.addEventListener("click", () => {
    addCoins(1000);
    beep(760, 70, 0.03);
  });

  document.querySelectorAll(".chip").forEach((b) => {
    b.addEventListener("click", () => {
      if (inSeries || !betInput) return;

      const val = b.dataset.bet;
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

    if (!inSeries) {
      const bet = Math.floor(Number(betInput?.value) || 0);
      const coins = Wallet.get();

      if (bet <= 0) {
        busy = false;
        return;
      }

      if (bet > coins) {
        alert("Недостаточно монет");
        busy = false;
        return;
      }

      lockedBet = bet;
      addCoins(-lockedBet);

      inSeries = true;
      lockBetUI(true);

      if (cashoutBtn) cashoutBtn.disabled = true;
      if (statusView) statusView.textContent = "Серия";
      if (winView) winView.textContent = "0 🪙";
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
    }

    if (outcome === "win") {
      series = Math.min(series + 1, MAX_STEP);

      if (resultView) resultView.textContent = "Победа";
      if (statusView) statusView.textContent = "Серия растёт";

      soundWin();

      if (cashoutBtn) {
        cashoutBtn.disabled = series === 0;
      }

      renderLadder();
      renderStats();

      if (series === MAX_STEP) {
        await new Promise((resolve) => setTimeout(resolve, 140));
        doCashout(true);
        return;
      }
    }

    if (outcome === "lose") {
      if (resultView) resultView.textContent = "Поражение";
      if (statusView) statusView.textContent = "Серия в ноль";

      soundLose();

      if (winView) winView.textContent = "0 🪙";

      inSeries = false;
      series = 0;
      lockedBet = 0;

      if (cashoutBtn) cashoutBtn.disabled = true;
      lockBetUI(false);
    }

    renderLadder();
    renderStats();

    busy = false;
  });

  // final sync
  clampBet();
})();