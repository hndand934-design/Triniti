(() => {
  // ================================
  // SHARED WALLET (единый баланс)
  // Ожидается window.SharedWallet из ../shared/wallet.js
  // ================================
  const SW = window.SharedWallet;
  if (!SW || typeof SW.getCoins !== "function") {
    console.error("SharedWallet не найден. Проверь подключение ../shared/wallet.js");
    alert("Ошибка: не найден общий кошелёк (shared/wallet.js).");
    return;
  }

  const Wallet = {
    get: () => Math.floor(SW.getCoins()),
    set: (v) => SW.setCoins(v),
    add: (d) => SW.addCoins(d),
  };

  // ===== RNG (честный) =====
  function randFloat() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }
  function randInt(n) { return Math.floor(randFloat() * n); }

  // ===== Sound =====
  const SOUND_KEY = "wheel_sound_v1";
  let soundOn = (localStorage.getItem(SOUND_KEY) ?? "1") === "1";
  let audioCtx = null;

  function getCtx(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }

  function beep(freq = 520, ms = 55, vol = 0.03) {
    if (!soundOn) return;
    const c = getCtx(); if(!c) return;

    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = freq;

    const t = c.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms/1000);

    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + ms/1000);
  }

  // ===== UI =====
  const balanceEl = document.getElementById("balance");
  const balance2  = document.getElementById("balance2");

  const soundBtn  = document.getElementById("soundBtn");
  const soundText = document.getElementById("soundText");
  const soundDot  = document.getElementById("soundDot");
  const bonusBtn  = document.getElementById("bonusBtn");

  const canvas = document.getElementById("wheel");
  const ctx = canvas.getContext("2d");
  const spinBtn = document.getElementById("spinBtn");

  const betInput = document.getElementById("betInput");
  const betMinus = document.getElementById("betMinus");
  const betPlus  = document.getElementById("betPlus");

  const statusView = document.getElementById("statusView");
  const pickView   = document.getElementById("pickView");
  const resultView = document.getElementById("resultView");

  const pickBtns = Array.from(document.querySelectorAll(".pick"));

  function renderBalances(){
    const c = Wallet.get();
    balanceEl.textContent = String(c);
    balance2.textContent = String(c);
  }

  function clampBet(){
    let v = Math.floor(Number(betInput.value) || 0);
    if (v < 1) v = 1;
    const max = Wallet.get();
    if (v > max) v = max;
    betInput.value = String(v);
  }

  function addCoins(d){
    Wallet.add(d);
    renderBalances();
    clampBet();
  }

  function renderSound(){
    soundText.textContent = soundOn ? "Звук on" : "Звук off";
    soundDot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
    soundDot.style.boxShadow = soundOn
      ? "0 0 0 3px rgba(38,212,123,.14)"
      : "0 0 0 3px rgba(255,90,106,.14)";
  }

  // ===== segments =====
  const SEGMENTS = [
    { label: "1.50x", mult: 1.5, color: "#2ddc5a" },
    { label: "0.00x", mult: 0.0, color: "#3a4656" },

    { label: "1.70x", mult: 1.7, color: "#e7efff" },
    { label: "0.00x", mult: 0.0, color: "#3a4656" },

    { label: "2.00x", mult: 2.0, color: "#ffd447" },
    { label: "0.00x", mult: 0.0, color: "#3a4656" },

    { label: "3.00x", mult: 3.0, color: "#7d4dff" },
    { label: "0.00x", mult: 0.0, color: "#3a4656" },

    { label: "4.00x", mult: 4.0, color: "#ff9a3c" },
    { label: "0.00x", mult: 0.0, color: "#3a4656" },

    { label: "1.50x", mult: 1.5, color: "#2ddc5a" },
    { label: "0.00x", mult: 0.0, color: "#3a4656" },

    { label: "1.70x", mult: 1.7, color: "#e7efff" },
    { label: "0.00x", mult: 0.0, color: "#3a4656" },

    { label: "2.00x", mult: 2.0, color: "#ffd447" },
    { label: "0.00x", mult: 0.0, color: "#3a4656" },

    { label: "1.50x", mult: 1.5, color: "#2ddc5a" },
    { label: "0.00x", mult: 0.0, color: "#3a4656" },
  ];

  const N = SEGMENTS.length;
  const TAU = Math.PI * 2;

  let rotation = 0;
  let spinning = false;
  let pickedMult = null;

  function drawWheel(){
    const w = canvas.width, h = canvas.height;
    const cx = w/2, cy = h/2;
    const rOuter = Math.min(w,h)*0.48;
    const rInner = rOuter*0.72;

    ctx.clearRect(0,0,w,h);

    // shadow ring
    ctx.save();
    ctx.translate(cx,cy);
    ctx.beginPath();
    ctx.arc(0,0,rOuter+10,0,TAU);
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.fill();
    ctx.restore();

    for(let i=0;i<N;i++){
      const a0 = rotation + (i * TAU/N);
      const a1 = rotation + ((i+1) * TAU/N);

      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,rOuter,a0,a1);
      ctx.closePath();
      ctx.fillStyle = SEGMENTS[i].color;
      ctx.fill();

      // ring cut
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(cx,cy,rInner,0,TAU);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx,cy,rOuter,a0,a1);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx,cy,rInner,0,TAU);
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx,cy,rInner*0.55,0,TAU);
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  function setPick(mult){
    pickedMult = mult;
    pickBtns.forEach(b => b.classList.toggle("active", Number(b.dataset.pick) === mult));
    pickView.textContent = mult ? `${mult.toFixed(2)}x` : "—";
    spinBtn.disabled = !pickedMult || spinning;
    beep(520, 50, 0.02);
  }

  // pointer at top (12 o’clock)
  function segmentIndexAtPointer(){
    const pointerAngle = -Math.PI/2;
    let ang = pointerAngle - rotation;
    while (ang < 0) ang += TAU;
    while (ang >= TAU) ang -= TAU;
    return Math.floor(ang / (TAU/N));
  }

  function animateSpin(targetRotation, duration=2600){
    return new Promise((resolve)=>{
      const start = performance.now();
      const from = rotation;
      const delta = targetRotation - from;

      const easeOutCubic = (t)=> 1 - Math.pow(1-t, 3);

      function frame(now){
        const t = Math.min(1, (now-start)/duration);
        rotation = from + delta * easeOutCubic(t);
        drawWheel();

        // тик
        if (soundOn && t < 0.98 && Math.random() < 0.12){
          beep(520 + Math.random()*120, 18, 0.015);
        }

        if(t < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  // ===== events =====
  soundBtn.addEventListener("click", async ()=>{
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
    renderSound();
    beep(soundOn ? 640 : 240, 60, 0.03);
    if (soundOn && audioCtx && audioCtx.state === "suspended") {
      try { await audioCtx.resume(); } catch {}
    }
  });

  bonusBtn.addEventListener("click", ()=>{
    addCoins(1000);
    beep(820, 70, 0.03);
    beep(980, 70, 0.03);
  });

  betInput.addEventListener("input", ()=>{ clampBet(); beep(520, 30, 0.01); });
  betMinus.addEventListener("click", ()=>{
    betInput.value = String((Number(betInput.value)||1) - 10);
    clampBet(); beep(520, 40, 0.02);
  });
  betPlus.addEventListener("click", ()=>{
    betInput.value = String((Number(betInput.value)||1) + 10);
    clampBet(); beep(520, 40, 0.02);
  });

  document.querySelectorAll(".chip").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const v = btn.dataset.bet;
      betInput.value = (v === "max") ? String(Wallet.get()) : String(v);
      clampBet();
      beep(540, 55, 0.02);
    });
  });

  pickBtns.forEach(b => b.addEventListener("click", ()=> setPick(Number(b.dataset.pick))));

  spinBtn.addEventListener("click", async ()=>{
    if (spinning || !pickedMult) return;

    const bet = Math.floor(Number(betInput.value) || 0);
    if (bet <= 0) return alert("Ставка должна быть больше 0");
    if (bet > Wallet.get()) return alert("Недостаточно монет");

    spinning = true;
    spinBtn.disabled = true;
    statusView.textContent = "Крутим...";
    resultView.textContent = "—";

    addCoins(-bet);

    const spins = 6 + randInt(5);
    const extra = randFloat() * TAU;
    const target = rotation + spins*TAU + extra;

    beep(600, 60, 0.02);
    await animateSpin(target, 2600);

    const idx = segmentIndexAtPointer();
    const seg = SEGMENTS[idx];
    resultView.textContent = seg.label;

    if (seg.mult > 0 && Math.abs(seg.mult - pickedMult) < 0.001){
      const win = Math.floor(bet * seg.mult);
      addCoins(win);
      statusView.textContent = "Победа";
      beep(820, 70, 0.03);
      beep(980, 70, 0.03);
    } else {
      statusView.textContent = "Проигрыш";
      beep(220, 110, 0.03);
    }

    spinning = false;
    spinBtn.disabled = !pickedMult;
  });

  // ===== init =====
  renderBalances();
  renderSound();
  clampBet();
  drawWheel();
})();