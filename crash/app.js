(() => {
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt2 = (x) => (Math.round(x * 100) / 100).toFixed(2);

  // =========================
  // DOM
  // =========================
  const balanceEl = $("balance");

  const soundBtn = $("soundBtn");
  const soundDot = $("soundDot");

  const bonusBtn = $("bonusBtn");

  const multVal = $("multVal");
  const statusVal = $("statusVal");
  const betVal = $("betVal");

  const statusHint = $("statusHint");
  const betHint = $("betHint");

  const overlayX = $("overlayX");
  const overlayText = $("overlayText");
  const bottomLine = $("bottomLine");

  const betInput = $("betInput");
  const betMinus = $("betMinus");
  const betPlus = $("betPlus");

  const joinBtn = $("joinBtn");
  const cashBtn = $("cashBtn");

  const graph = $("graph");
  const gamePanel = $("gamePanel");
  const ctx2d = graph.getContext("2d", { alpha: false });

  const chips = Array.from(document.querySelectorAll(".chip"));

  // =========================
  // RNG
  // =========================
  function randFloat() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }

  // =========================
  // Shared Wallet
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

    const KEY = "mini_wallet_crash_fallback_v2";
    let coins = 1000;

    try {
      const saved = Number(localStorage.getItem(KEY));
      if (Number.isFinite(saved)) {
        coins = Math.max(0, Math.floor(saved));
      }
    } catch {}

    const save = () => {
      try {
        localStorage.setItem(KEY, String(coins));
      } catch {}
    };

    return {
      get() {
        return coins;
      },
      set(v) {
        coins = Math.max(0, Math.floor(Number(v) || 0));
        save();
      },
      add(d) {
        coins = Math.max(0, Math.floor(coins + (Number(d) || 0)));
        save();
      }
    };
  })();

  function renderWallet() {
    if (balanceEl) {
      balanceEl.textContent = String(Wallet.get());
    }
  }

  function addCoins(d) {
    Wallet.add(d);
    renderWallet();
  }

  // =========================
  // Sound
  // =========================
  let soundOn = true;
  let audioCtx = null;

  function getCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }

  function beep(freq = 520, ms = 60, vol = 0.03, type = "sine") {
    if (!soundOn) return;

    try {
      const ctx = getCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime;

      osc.type = type;
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + ms / 1000 + 0.02);
    } catch {}
  }

  const sStart = () => {
    beep(520, 45, 0.02);
    setTimeout(() => beep(760, 70, 0.03), 65);
  };

  const sCrash = () => {
    beep(170, 120, 0.05, "sawtooth");
    setTimeout(() => beep(120, 160, 0.04, "square"), 60);
  };

  const sCash = () => {
    beep(760, 60, 0.03);
    setTimeout(() => beep(920, 60, 0.03), 80);
  };

  function renderSoundUI() {
    if (!soundDot) return;

    soundDot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
    soundDot.style.boxShadow = soundOn
      ? "0 0 0 3px rgba(38,212,123,.14)"
      : "0 0 0 3px rgba(255,90,106,.14)";
  }

  // =========================
  // State
  // =========================
  const STATE = {
    WAIT: "wait",
    FLY: "fly",
    CRASH: "crash"
  };

  let state = STATE.WAIT;

  let waitDuration = 5;
  let waitLeft = waitDuration;
  let waitTimer = null;

  let raf = 0;
  let startTs = 0;
  let currentX = 1.0;
  let crashPoint = 1.01;

  let inRound = false;
  let bet = 100;
  let playerBet = 0;

  let cashed = false;
  let cashedAt = 0;
  let cashedProfit = 0;
  let cashedPayout = 0;

  let pts = [];

  function setFlyingMode(on) {
    gamePanel?.classList.toggle("fly", !!on);
  }

  // =========================
  // Crash RNG
  // =========================
  function genCrashPoint() {
    const u = Math.max(1e-12, randFloat());
    const p = 1.35;
    const k = 1.55;
    const x = 1 + Math.pow(-Math.log(u), p) * k;
    return clamp(x, 1.01, 200);
  }

  function xFromTime(t) {
    const a = 0.35;
    const b = 0.055;
    return 1 + a * t + b * t * t;
  }

  function stopAllTimers() {
    if (waitTimer) {
      clearInterval(waitTimer);
      waitTimer = null;
    }

    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  // =========================
  // Canvas
  // =========================
  function resizeCanvas() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = graph.getBoundingClientRect();
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);

    if (graph.width !== w || graph.height !== h) {
      graph.width = w;
      graph.height = h;
    }
  }

  function draw() {
    resizeCanvas();

    const w = graph.width;
    const h = graph.height;

    ctx2d.fillStyle = "#050714";
    ctx2d.fillRect(0, 0, w, h);

    const padL = Math.floor(w * 0.07);
    const padR = Math.floor(w * 0.04);
    const padT = Math.floor(h * 0.10);
    const padB = Math.floor(h * 0.12);
    const pw = w - padL - padR;
    const ph = h - padT - padB;

    ctx2d.strokeStyle = "rgba(255,255,255,.06)";
    ctx2d.lineWidth = Math.max(1, Math.floor(w * 0.0012));

    for (let i = 0; i <= 6; i++) {
      const x = padL + (pw * i) / 6;
      ctx2d.beginPath();
      ctx2d.moveTo(x, padT);
      ctx2d.lineTo(x, padT + ph);
      ctx2d.stroke();
    }

    for (let j = 0; j <= 4; j++) {
      const y = padT + (ph * j) / 4;
      ctx2d.beginPath();
      ctx2d.moveTo(padL, y);
      ctx2d.lineTo(padL + pw, y);
      ctx2d.stroke();
    }

    if (pts.length < 2) return;

    const last = pts[pts.length - 1];
    const maxT = Math.max(3, last.t);
    const maxX = Math.max(2, last.x);

    const X = (t) => padL + (t / maxT) * pw;
    const Y = (x) => padT + ph - ((x - 1) / (maxX - 1)) * ph;

    const path = new Path2D();
    path.moveTo(X(pts[0].t), Y(pts[0].x));

    for (let i = 1; i < pts.length; i++) {
      path.lineTo(X(pts[i].t), Y(pts[i].x));
    }

    const area = new Path2D(path);
    area.lineTo(X(last.t), padT + ph);
    area.lineTo(X(pts[0].t), padT + ph);
    area.closePath();

    const grad = ctx2d.createLinearGradient(0, padT, 0, padT + ph);
    grad.addColorStop(0, "rgba(255,90,106,.35)");
    grad.addColorStop(1, "rgba(255,90,106,0)");

    ctx2d.fillStyle = grad;
    ctx2d.fill(area);

    ctx2d.strokeStyle = "rgba(255,120,140,.95)";
    ctx2d.lineWidth = Math.max(2, Math.floor(w * 0.004));
    ctx2d.lineCap = "round";
    ctx2d.lineJoin = "round";
    ctx2d.stroke(path);

    const lx = X(last.t);
    const ly = Y(last.x);

    ctx2d.fillStyle = "rgba(255,170,190,.95)";
    ctx2d.beginPath();
    ctx2d.arc(lx, ly, Math.max(3, Math.floor(w * 0.007)), 0, Math.PI * 2);
    ctx2d.fill();

    ctx2d.fillStyle = "rgba(255,200,210,.92)";
    ctx2d.beginPath();
    ctx2d.moveTo(lx + 10, ly);
    ctx2d.lineTo(lx - 2, ly - 6);
    ctx2d.lineTo(lx - 2, ly + 6);
    ctx2d.closePath();
    ctx2d.fill();
  }

  // =========================
  // UI
  // =========================
  function setUI() {
    multVal.textContent = `x${fmt2(currentX)}`;
    overlayX.textContent = `${fmt2(currentX)}x`;

    betVal.textContent = inRound ? `${playerBet} 🪙` : "—";

    if (!inRound) {
      betHint.textContent = "не в раунде";
    } else if (state === STATE.WAIT) {
      betHint.textContent = "вошёл в раунд";
    } else if (state === STATE.FLY) {
      betHint.textContent = cashed
        ? `забрал x${fmt2(cashedAt)} (+${cashedProfit} 🪙)`
        : "в полёте";
    } else {
      betHint.textContent = cashed
        ? `забрал x${fmt2(cashedAt)} (+${cashedProfit} 🪙)`
        : "ставка сгорела";
    }

    if (state === STATE.WAIT) {
      statusVal.textContent = "Раунд";
      statusHint.textContent = `Старт через ${waitLeft}с`;
      overlayText.textContent = inRound ? "Ты в раунде" : "Ожидание старта";
      bottomLine.textContent = `Новый раунд через ${waitLeft}с…`;
    } else if (state === STATE.FLY) {
      statusVal.textContent = "Полёт";
      statusHint.textContent = inRound
        ? (cashed ? "Кэшаут сделан" : "Можно забрать")
        : "Ты не в раунде";

      if (!inRound) {
        overlayText.textContent = "Ты не в раунде";
      } else if (cashed) {
        overlayText.textContent = `Ты забрал +${cashedProfit} 🪙`;
      } else {
        overlayText.textContent = "Нажми «Забрать»";
      }

      bottomLine.textContent = "В полёте можно забрать выигрыш";
    } else {
      statusVal.textContent = "Краш";
      statusHint.textContent = "Раунд завершён";
      overlayText.textContent = "Ракета улетела";
      bottomLine.textContent = "Скоро следующий раунд…";
    }

    joinBtn.disabled = !(state === STATE.WAIT) || inRound;
    cashBtn.disabled = !(state === STATE.FLY && inRound && !cashed);
  }

  // =========================
  // Bet
  // =========================
  function setBet(v) {
    const coins = Wallet.get();
    let n = Math.floor(Number(v) || 1);

    n = Math.max(1, n);
    n = Math.min(n, Math.max(1, coins));

    bet = n;
    betInput.value = String(n);
  }

  // =========================
  // Actions
  // =========================
  function joinRound() {
    if (state !== STATE.WAIT || inRound) return;

    const coins = Wallet.get();
    const v = Math.floor(Number(betInput.value) || 0);

    if (v <= 0) {
      alert("Ставка должна быть больше 0");
      return;
    }

    if (v > coins) {
      alert("Недостаточно монет");
      return;
    }

    addCoins(-v);

    inRound = true;
    playerBet = v;

    cashed = false;
    cashedAt = 0;
    cashedProfit = 0;
    cashedPayout = 0;

    beep(680, 70, 0.02);
    setUI();
  }

  function cashout() {
    if (state !== STATE.FLY || !inRound || cashed) return;

    cashed = true;
    cashedAt = currentX;

    const payout = Math.floor(playerBet * cashedAt);
    const profit = Math.max(0, payout - playerBet);

    cashedPayout = payout;
    cashedProfit = profit;

    addCoins(payout);
    sCash();
    setUI();
  }

  // =========================
  // Flow
  // =========================
  function startWait() {
    stopAllTimers();
    setFlyingMode(false);

    state = STATE.WAIT;
    currentX = 1.0;
    crashPoint = genCrashPoint();
    pts = [{ t: 0, x: 1.0 }];

    waitLeft = waitDuration;

    setUI();
    draw();

    waitTimer = setInterval(() => {
      if (state !== STATE.WAIT) return;

      waitLeft -= 1;

      if (waitLeft <= 0) {
        clearInterval(waitTimer);
        waitTimer = null;
        startFly();
        return;
      }

      setUI();
    }, 1000);
  }

  function startFly() {
    stopAllTimers();
    setFlyingMode(true);

    state = STATE.FLY;
    startTs = performance.now();
    pts = [{ t: 0, x: 1.0 }];
    currentX = 1.0;

    sStart();
    setUI();

    const tick = () => {
      if (state !== STATE.FLY) return;

      const now = performance.now();
      const t = (now - startTs) / 1000;

      let x = xFromTime(t);
      if (x >= crashPoint) x = crashPoint;

      currentX = x;
      pts.push({ t, x });

      if (pts.length > 1400) {
        pts.shift();
      }

      setUI();
      draw();

      if (x >= crashPoint) {
        endCrash();
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
  }

  function endCrash() {
    stopAllTimers();
    setFlyingMode(false);

    state = STATE.CRASH;

    sCrash();
    setUI();
    draw();

    setTimeout(() => {
      inRound = false;
      playerBet = 0;

      cashed = false;
      cashedAt = 0;
      cashedProfit = 0;
      cashedPayout = 0;

      startWait();
    }, 3000);
  }

  // =========================
  // Events
  // =========================
  window.addEventListener("resize", draw);

  soundBtn?.addEventListener("click", async () => {
    soundOn = !soundOn;
    localStorage.setItem("crash_sound", soundOn ? "1" : "0");
    renderSoundUI();
    beep(soundOn ? 640 : 240, 60, 0.03);

    if (soundOn && audioCtx && audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch {}
    }
  });

  bonusBtn?.addEventListener("click", () => {
    addCoins(1000);
    beep(760, 70, 0.03);
    setBet(betInput.value || 100);
  });

  betMinus?.addEventListener("click", () => {
    setBet((Number(betInput.value) || 1) - 10);
  });

  betPlus?.addEventListener("click", () => {
    setBet((Number(betInput.value) || 1) + 10);
  });

  betInput?.addEventListener("input", () => {
    setBet(betInput.value);
  });

  chips.forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.bet;
      if (v === "max") {
        setBet(Wallet.get() || 1);
      } else {
        setBet(v);
      }
      beep(540, 55, 0.02);
    });
  });

  joinBtn?.addEventListener("click", joinRound);
  cashBtn?.addEventListener("click", cashout);

  // =========================
  // Init
  // =========================
  function init() {
    const raw = localStorage.getItem("crash_sound");
    if (raw === "0") soundOn = false;

    renderWallet();
    renderSoundUI();

    setBet(betInput.value || 100);
    draw();
    setUI();
    startWait();
  }

  init();
})();