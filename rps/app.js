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
  // Wallet (только shared)
  // =========================
  const Wallet = window.SharedWallet;

  function getCoins() {
    return Math.floor(Number(Wallet?.getCoins?.() || 0));
  }

  function addCoins(v) {
    Wallet?.addCoins?.(Math.floor(v));
    updateBalance();
  }

  // =========================
  // SOUND
  // =========================
  let soundOn = true;
  let ctx;

  function beep(f = 500) {
    if (!soundOn) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.value = 0.03;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => o.stop(), 60);
    } catch {}
  }

  // =========================
  // UI
  // =========================
  const $ = (id) => document.getElementById(id);

  const balanceEl = $("balance");
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
  const playBtn = $("playBtn");
  const cashoutBtn = $("cashoutBtn");
  const winView = $("winView");

  const ladderEl = $("ladder");

  // =========================
  // CONFIG
  // =========================
  const STEPS = [1, 1.2, 1.5, 2, 3, 5, 10];

  const ICON = {
    rock: "✊🏻",
    scissors: "✌🏻",
    paper: "✋🏻",
  };

  const MOVES = ["rock", "scissors", "paper"];

  // =========================
  // STATE
  // =========================
  let picked = "rock";
  let series = 0;
  let inGame = false;
  let bet = 0;
  let busy = false;

  // =========================
  // UI RENDER
  // =========================
  function updateBalance() {
    balanceEl.textContent = getCoins();
  }

  function renderStats() {
    seriesView.textContent = series;
    multView.textContent = "x" + STEPS[series].toFixed(2);

    const base = inGame ? bet : Number(betInput.value);
    potentialView.textContent = Math.floor(base * STEPS[series]);

    winView.textContent = inGame && series > 0
      ? Math.floor(bet * STEPS[series])
      : 0;
  }

  function renderLadder() {
    ladderEl.innerHTML = "";

    STEPS.forEach((x, i) => {
      const d = document.createElement("div");
      d.className = "step" + (i === series ? " active" : "");
      d.textContent = "x" + x;
      ladderEl.appendChild(d);
    });
  }

  function setPicked(v) {
    picked = v;

    document.querySelectorAll(".pickBtn").forEach(b =>
      b.classList.toggle("active", b.dataset.move === v)
    );

    youIcon.textContent = ICON[v];
    youPickView.textContent = v;

    beep(600);
  }

  function resetGame() {
    inGame = false;
    series = 0;
    bet = 0;
    busy = false;

    cashoutBtn.disabled = true;

    statusView.textContent = "Ожидание";
    resultView.textContent = "—";
    botPickView.textContent = "—";

    renderStats();
    renderLadder();
  }

  function botMove() {
    return MOVES[Math.floor(randFloat() * 3)];
  }

  function decide(a, b) {
    if (a === b) return 0;

    if (
      (a === "rock" && b === "scissors") ||
      (a === "scissors" && b === "paper") ||
      (a === "paper" && b === "rock")
    ) return 1;

    return -1;
  }

  // =========================
  // EVENTS
  // =========================
  document.querySelectorAll(".pickBtn").forEach(btn => {
    btn.onclick = () => setPicked(btn.dataset.move);
  });

  $("betMinus").onclick = () => {
    if (inGame) return;
    betInput.value = Math.max(1, Number(betInput.value) - 10);
    renderStats();
  };

  $("betPlus").onclick = () => {
    if (inGame) return;
    betInput.value = Number(betInput.value) + 10;
    renderStats();
  };

  $("soundBtn").onclick = () => {
    soundOn = !soundOn;
  };

  cashoutBtn.onclick = () => {
    if (!inGame || series === 0) return;

    const win = Math.floor(bet * STEPS[series]);
    addCoins(win);

    statusView.textContent = "Забрано";
    resultView.textContent = "✔";

    beep(900);
    resetGame();
  };

  playBtn.onclick = async () => {
    if (busy) return;
    busy = true;

    // старт
    if (!inGame) {
      const b = Number(betInput.value);
      if (b <= 0 || b > getCoins()) {
        busy = false;
        return;
      }

      bet = b;
      addCoins(-bet);
      inGame = true;
    }

    statusView.textContent = "Раунд";

    const bot = botMove();

    botIcon.textContent = ICON[bot];
    botPickView.textContent = bot;

    await new Promise(r => setTimeout(r, 120));

    const res = decide(picked, bot);

    if (res === 0) {
      resultView.textContent = "Ничья";
      beep(400);
    }

    if (res === 1) {
      series++;
      resultView.textContent = "Победа";
      cashoutBtn.disabled = false;
      beep(800);

      if (series >= STEPS.length - 1) {
        const win = Math.floor(bet * STEPS[series]);
        addCoins(win);
        resultView.textContent = "AUTO";
        resetGame();
        busy = false;
        return;
      }
    }

    if (res === -1) {
      resultView.textContent = "Проигрыш";
      beep(200);
      resetGame();
      busy = false;
      return;
    }

    renderStats();
    renderLadder();

    busy = false;
  };

  // =========================
  // INIT
  // =========================
  updateBalance();
  renderStats();
  renderLadder();
  setPicked("rock");
})();