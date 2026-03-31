(() => {
  // ================================
  // TRINITI — Wheel
  // финальная логика под новый макет
  // ================================

  // ===== Shared Wallet =====
  const SW = window.SharedWallet;

  const Wallet = (() => {
    if (
      SW &&
      typeof SW.getCoins === "function" &&
      typeof SW.setCoins === "function" &&
      typeof SW.addCoins === "function"
    ) {
      return {
        get: () => Math.floor(Number(SW.getCoins()) || 0),
        set: (v) => SW.setCoins(Math.max(0, Math.floor(Number(v) || 0))),
        add: (d) => SW.addCoins(Math.floor(Number(d) || 0))
      };
    }

    const KEY = "wheel_wallet_fallback_v2";
    const get = () => Math.floor(Number(localStorage.getItem(KEY) || 1000));
    const set = (v) => localStorage.setItem(KEY, String(Math.max(0, Math.floor(Number(v) || 0))));
    const add = (d) => set(get() + Math.floor(Number(d) || 0));
    return { get, set, add };
  })();

  // ===== RNG =====
  function randFloat() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }

  function randInt(n) {
    return Math.floor(randFloat() * n);
  }

  // ===== Sound =====
  const SOUND_KEY = "wheel_sound_v2";
  let soundOn = (localStorage.getItem(SOUND_KEY) ?? "1") === "1";
  let audioCtx = null;

  function getCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }

  function beep(freq = 520, ms = 55, vol = 0.03, type = "sine") {
    if (!soundOn) return;

    try {
      const ctx = getCtx();
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
    beep(780, 70, 0.03, "sine");
    setTimeout(() => beep(980, 70, 0.03, "sine"), 80);
  }

  function soundLose() {
    beep(220, 110, 0.03, "square");
  }

  function soundTick() {
    beep(520 + Math.random() * 80, 18, 0.012, "triangle");
  }

  // ===== DOM =====
  const $ = (id) => document.getElementById(id);

  const balanceEl = $("balance");

  const soundBtn = $("soundBtn");
  const soundText = $("soundText");
  const soundDot = $("soundDot");

  const canvas = $("wheel");
  const ctx = canvas.getContext("2d");

  const betInput = $("betInput");
  const betMinus = $("betMinus");
  const betPlus = $("betPlus");

  const spinBtn = $("spinBtn");

  const statusView = $("statusView");
  const pickView = $("pickView");
  const resultView = $("resultView");
  const potentialView = $("potentialView");

  const pickBtns = Array.from(document.querySelectorAll(".pick"));
  const chipBtns = Array.from(document.querySelectorAll(".chip"));

  // ===== Config =====
  const SEGMENTS = [
    { label: "1.50x", mult: 1.5, color: "#2ddc5a" },
    { label: "0.00x", mult: 0.0, color: "#344150" },

    { label: "1.70x", mult: 1.7, color: "#e7efff" },
    { label: "0.00x", mult: 0.0, color: "#344150" },

    { label: "2.00x", mult: 2.0, color: "#ffd447" },
    { label: "0.00x", mult: 0.0, color: "#344150" },

    { label: "3.00x", mult: 3.0, color: "#7d4dff" },
    { label: "0.00x", mult: 0.0, color: "#344150" },

    { label: "4.00x", mult: 4.0, color: "#ff9a3c" },
    { label: "0.00x", mult: 0.0, color: "#344150" },

    { label: "1.50x", mult: 1.5, color: "#2ddc5a" },
    { label: "0.00x", mult: 0.0, color: "#344150" },

    { label: "1.70x", mult: 1.7, color: "#e7efff" },
    { label: "0.00x", mult: 0.0, color: "#344150" },

    { label: "2.00x", mult: 2.0, color: "#ffd447" },
    { label: "0.00x", mult: 0.0, color: "#344150" },

    { label: "1.50x", mult: 1.5, color: "#2ddc5a" },
    { label: "0.00x", mult: 0.0, color: "#344150" }
  ];

  const N = SEGMENTS.length;
  const TAU = Math.PI * 2;

  // ===== State =====
  let pickedMult = 1.5;
  let rotation = 0;
  let spinning = false;
  let lastTickIndex = -1;

  // ===== Helpers =====
  function fmtCoins(n) {
    return `${Math.floor(n)} 🪙`;
  }

  function renderBalance() {
    if (balanceEl) balanceEl.textContent = String(Wallet.get());
  }

  function clampBet() {
    if (!betInput) return;

    const coins = Wallet.get();
    let v = Math.floor(Number(betInput.value) || 0);

    if (v < 1) v = 1;
    if (coins > 0 && v > coins) v = coins;
    if (coins <= 0) v = 1;

    betInput.value = String(v);
    renderPotential();
  }

  function renderPotential() {
    const bet = Math.floor(Number(betInput?.value) || 0);
    if (!potentialView) return;

    if (!pickedMult || bet <= 0) {
      potentialView.textContent = "0 🪙";
      return;
    }

    potentialView.textContent = fmtCoins(Math.floor(bet * pickedMult));
  }

  function renderSound() {
    if (soundText) soundText.textContent = soundOn ? "Звук on" : "Звук off";
    if (!soundDot) return;

    soundDot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
    soundDot.style.boxShadow = soundOn
      ? "0 0 0 3px rgba(38,212,123,.14)"
      : "0 0 0 3px rgba(255,90,106,.14)";
  }

  function renderPick() {
    pickBtns.forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.pick) === pickedMult);
    });

    if (pickView) {
      pickView.textContent = pickedMult ? `${pickedMult.toFixed(2)}x` : "—";
    }

    spinBtn.disabled = spinning || !pickedMult;
    renderPotential();
  }

  // ===== Wheel draw =====
  function drawWheel() {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const rOuter = Math.min(w, h) * 0.48;
    const rInner = rOuter * 0.67;

    ctx.clearRect(0, 0, w, h);

    // outer shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter + 12, 0, TAU);
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.fill();
    ctx.restore();

    for (let i = 0; i < N; i++) {
      const a0 = rotation + (i * TAU / N);
      const a1 = rotation + ((i + 1) * TAU / N);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, rOuter, a0, a1);
      ctx.closePath();
      ctx.fillStyle = SEGMENTS[i].color;
      ctx.fill();

      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,.32)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, rOuter, a0, a1);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      const mid = (a0 + a1) / 2;
      const tx = cx + Math.cos(mid) * ((rOuter + rInner) / 2);
      const ty = cy + Math.sin(mid) * ((rOuter + rInner) / 2);

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(mid + Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 24px system-ui, Arial";
      ctx.fillStyle = SEGMENTS[i].mult === 0 ? "#c6d0df" : "#0b1020";
      ctx.fillText(SEGMENTS[i].label, 0, 0);
      ctx.restore();
    }

    // center cutout
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx, cy, rInner, 0, TAU);
    ctx.fill();
    ctx.restore();

    // inner ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rInner, 0, TAU);
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.restore();
  }

  function segmentIndexAtPointer() {
    const pointerAngle = -Math.PI / 2;
    let ang = pointerAngle - rotation;

    while (ang < 0) ang += TAU;
    while (ang >= TAU) ang -= TAU;

    return Math.floor(ang / (TAU / N));
  }

  function animateSpin(targetRotation, duration = 2900) {
    return new Promise((resolve) => {
      const start = performance.now();
      const from = rotation;
      const delta = targetRotation - from;

      function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
      }

      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        rotation = from + delta * easeOutCubic(t);
        drawWheel();

        const idx = segmentIndexAtPointer();
        if (idx !== lastTickIndex && t < 0.985) {
          lastTickIndex = idx;
          soundTick();
        }

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  function setStatus(text) {
    if (statusView) statusView.textContent = text;
  }

  function setResult(text) {
    if (resultView) resultView.textContent = text;
  }

  // ===== Events =====
  soundBtn?.addEventListener("click", async () => {
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
    renderSound();
    beep(soundOn ? 640 : 240, 60, 0.03);

    if (soundOn && audioCtx && audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch {}
    }
  });

  betInput?.addEventListener("input", () => {
    clampBet();
  });

  betMinus?.addEventListener("click", () => {
    if (spinning || !betInput) return;
    betInput.value = String((Number(betInput.value) || 1) - 10);
    clampBet();
    beep(520, 45, 0.02);
  });

  betPlus?.addEventListener("click", () => {
    if (spinning || !betInput) return;
    betInput.value = String((Number(betInput.value) || 1) + 10);
    clampBet();
    beep(520, 45, 0.02);
  });

  chipBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (spinning || !betInput) return;

      const val = btn.dataset.bet;
      const coins = Wallet.get();
      betInput.value = val === "max" ? String(Math.max(1, coins)) : String(val);
      clampBet();
      beep(540, 50, 0.02);
    });
  });

  pickBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (spinning) return;
      pickedMult = Number(btn.dataset.pick);
      renderPick();
      beep(560, 50, 0.02);
    });
  });

  spinBtn?.addEventListener("click", async () => {
    if (spinning || !pickedMult) return;

    const bet = Math.floor(Number(betInput?.value) || 0);
    const coins = Wallet.get();

    if (bet <= 0) {
      alert("Ставка должна быть больше 0");
      return;
    }

    if (bet > coins) {
      alert("Недостаточно монет");
      return;
    }

    spinning = true;
    spinBtn.disabled = true;
    setStatus("Крутим...");
    setResult("—");

    Wallet.add(-bet);
    renderBalance();
    clampBet();

    const spins = 6 + randInt(4);
    const extra = randFloat() * TAU;
    const targetRotation = rotation + spins * TAU + extra;
    lastTickIndex = -1;

    beep(620, 60, 0.02);
    await animateSpin(targetRotation, 2900);

    const idx = segmentIndexAtPointer();
    const seg = SEGMENTS[idx];

    setResult(seg.label);

    if (seg.mult > 0 && Math.abs(seg.mult - pickedMult) < 0.0001) {
      const win = Math.floor(bet * seg.mult);
      Wallet.add(win);
      renderBalance();
      setStatus("Победа");
      soundWin();
    } else {
      setStatus("Проигрыш");
      soundLose();
    }

    spinning = false;
    spinBtn.disabled = false;
  });

  // ===== Init =====
  function init() {
    renderBalance();
    renderSound();
    clampBet();
    drawWheel();
    renderPick();
    setStatus("Ожидание");
    setResult("—");
  }

  init();
})();