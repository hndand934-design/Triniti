(() => {
  // =========================
  // Shared Wallet + fallback
  // =========================
  const WALLET_KEY_FALLBACK = "mini_wallet_home_fallback_v1";

  const Wallet = (() => {
    const sw = window.SharedWallet;
    if (sw && typeof sw.getCoins === "function" && typeof sw.setCoins === "function" && typeof sw.addCoins === "function") {
      return {
        get() { return Math.floor(Number(sw.getCoins()) || 0); },
        set(v) { sw.setCoins(Math.max(0, Math.floor(Number(v) || 0))); },
        add(d) { sw.addCoins(Math.floor(Number(d) || 0)); },
      };
    }

    let coins = (() => {
      const raw = localStorage.getItem(WALLET_KEY_FALLBACK);
      const n = raw ? Number(raw) : 1000;
      return Number.isFinite(n) ? n : 1000;
    })();

    function save(){ localStorage.setItem(WALLET_KEY_FALLBACK, String(coins)); }

    return {
      get(){ return Math.floor(Number(coins) || 0); },
      set(v){ coins = Math.max(0, Math.floor(Number(v) || 0)); save(); },
      add(d){ this.set(this.get() + Math.floor(Number(d) || 0)); },
    };
  })();

  const $ = (s) => document.querySelector(s);

  function renderWallet(){
    const c = Wallet.get();
    const b1 = $("#balance");
    const b2 = $("#balance2");
    if (b1) b1.textContent = String(c);
    if (b2) b2.textContent = String(c);
  }
  function addCoins(d){ Wallet.add(d); renderWallet(); }

  // =========================
  // RNG
  // =========================
  function rngInt(n){
    const u = new Uint32Array(1);
    crypto.getRandomValues(u);
    return u[0] % n;
  }

  // =========================
  // Sound
  // =========================
  const SOUND_KEY = "triniti_sound_v1";
  let soundOn = (localStorage.getItem(SOUND_KEY) ?? "1") === "1";
  let audioCtx = null;

  function ensureCtx(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }

  function beep(freq=520, ms=60, vol=0.03){
    if (!soundOn) return;
    try{
      const ctx = ensureCtx();
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;

      const t0 = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms/1000);

      o.connect(g); g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + ms/1000 + 0.02);
    }catch{}
  }

  function renderSoundUI(){
    const txt = $("#soundText");
    const dot = $("#soundDot");
    if (txt) txt.textContent = soundOn ? "Звук on" : "Звук off";
    if (dot){
      dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
      dot.style.boxShadow  = soundOn ? "0 0 0 3px rgba(38,212,123,.14)" : "0 0 0 3px rgba(255,90,106,.14)";
    }
  }

  $("#soundBtn")?.addEventListener("click", async () => {
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
    renderSoundUI();
    beep(soundOn ? 640 : 240, 60, 0.03);
    if (soundOn && audioCtx && audioCtx.state === "suspended"){
      try{ await audioCtx.resume(); }catch{}
    }
  });

  // бонус +1000
  $("#bonusBtn")?.addEventListener("click", () => {
    addCoins(1000);
    beep(760, 70, 0.03);
  });

  // =========================
  // Халява модалка
  // =========================
  const freeModal = $("#freeModal");

  function openModal(){
    freeModal?.classList.add("open");
    freeModal?.setAttribute("aria-hidden","false");
    beep(520, 50, 0.02);
  }
  function closeModal(){
    freeModal?.classList.remove("open");
    freeModal?.setAttribute("aria-hidden","true");
    beep(420, 50, 0.02);
  }

  $("#freeBtn")?.addEventListener("click", openModal);
  $("#freeBtn2")?.addEventListener("click", openModal);
  $("#freeClose")?.addEventListener("click", closeModal);

  freeModal?.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close) closeModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && freeModal?.classList.contains("open")) closeModal();
  });

  // tabs
  const tabDaily = $("#tabDaily");
  const tabSocial= $("#tabSocial");
  const paneDaily= $("#paneDaily");
  const paneSocial=$("#paneSocial");

  function setTab(which){
    const isDaily = which === "daily";
    tabDaily?.classList.toggle("active", isDaily);
    tabSocial?.classList.toggle("active", !isDaily);
    paneDaily?.classList.toggle("hidden", !isDaily);
    paneSocial?.classList.toggle("hidden", isDaily);
    beep(500, 45, 0.015);
  }
  tabDaily?.addEventListener("click", () => setTab("daily"));
  tabSocial?.addEventListener("click", () => setTab("social"));

  // =========================
  // Daily wheel
  // =========================
  const DAILY_KEY = "triniti_daily_spin_v1";
  const freeStatus = $("#freeStatus");
  const spinBtn = $("#spinBtn");
  const dailyMsg = $("#dailyMsg");
  const wheelCanvas = $("#dailyWheel");
  const wheelCenterTxt = $("#wheelCenterTxt");
  const wheelCenterSub = $("#wheelCenterSub");
  const prizeListEl = $("#prizeList");

  const PRIZES = [
    { label: "+0 🪙", coins: 0 },
    { label: "+50 🪙", coins: 50 },
    { label: "+100 🪙", coins: 100 },
    { label: "+150 🪙", coins: 150 },
    { label: "+200 🪙", coins: 200 },
    { label: "+250 🪙", coins: 250 },
    { label: "+500 🪙", coins: 500 },
    { label: "+1000 🪙", coins: 1000 },
  ];

  const todayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  };

  function canSpinToday(){ return localStorage.getItem(DAILY_KEY) !== todayStr(); }
  function markSpun(){ localStorage.setItem(DAILY_KEY, todayStr()); }

  function renderFreeStatus(){
    if (!freeStatus) return;
    freeStatus.textContent = canSpinToday() ? "доступна" : "уже забрана";
  }

  function renderPrizeList(){
    if (!prizeListEl) return;
    prizeListEl.innerHTML = "";
    PRIZES.forEach((p) => {
      const d = document.createElement("div");
      d.className = "prizeItem";
      d.innerHTML = `<div class="p">${p.label}</div><div class="t">в общий кошелёк</div>`;
      prizeListEl.appendChild(d);
    });
  }

  function drawWheel(){
    if (!wheelCanvas) return;
    const ctx = wheelCanvas.getContext("2d");
    const W = wheelCanvas.width;
    const H = wheelCanvas.height;
    const cx = W/2, cy = H/2;
    const r = Math.min(W,H) * 0.48;

    ctx.clearRect(0,0,W,H);

    ctx.beginPath();
    ctx.arc(cx, cy, r+8, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,255,255,.06)";
    ctx.fill();

    const n = PRIZES.length;
    const step = (Math.PI*2)/n;

    for(let i=0;i<n;i++){
      const a0 = -Math.PI/2 + i*step;
      const a1 = a0 + step;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();

      ctx.fillStyle = (i%2===0) ? "rgba(109,75,255,.22)" : "rgba(255,154,60,.18)";
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,.10)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a0 + step/2);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.font = "900 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillText(PRIZES[i].label, r - 14, 8);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r*0.12, 0, Math.PI*2);
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.stroke();
  }

  let spinning = false;

  function spinToIndex(winIndex){
    return new Promise((resolve) => {
      const n = PRIZES.length;
      const step = (Math.PI*2)/n;
      const sliceCenter = (winIndex + 0.5) * step;
      const fullTurns = 3 + rngInt(3);
      const target = (Math.PI*2)*fullTurns + (Math.PI*2 - sliceCenter) + (Math.PI/2);

      wheelCanvas.style.transition = "transform 1100ms cubic-bezier(.2,.85,.2,1)";
      wheelCanvas.style.transform = `rotate(${target}rad)`;

      const onEnd = () => {
        wheelCanvas.removeEventListener("transitionend", onEnd);
        resolve();
      };
      wheelCanvas.addEventListener("transitionend", onEnd, { once:true });
    });
  }

  async function onSpin(){
    if (spinning) return;

    if (!canSpinToday()){
      if (dailyMsg) dailyMsg.textContent = "Сегодня уже крутили. Приходи завтра 😉";
      beep(220, 90, 0.03);
      return;
    }

    spinning = true;
    if (spinBtn) spinBtn.disabled = true;

    if (wheelCenterTxt) wheelCenterTxt.textContent = "…";
    if (wheelCenterSub) wheelCenterSub.textContent = "крутим";
    if (dailyMsg) dailyMsg.textContent = "Крутим колесо…";
    beep(520, 55, 0.02);

    const winIndex = rngInt(PRIZES.length);
    await spinToIndex(winIndex);

    const prize = PRIZES[winIndex];
    addCoins(prize.coins);

    markSpun();
    renderFreeStatus();

    if (wheelCenterTxt) wheelCenterTxt.textContent = `+${prize.coins}`;
    if (wheelCenterSub) wheelCenterSub.textContent = "🪙 начислено";
    if (dailyMsg) dailyMsg.textContent = `Готово! Ты получил: ${prize.label}`;

    beep(760, 70, 0.03);
    setTimeout(() => beep(920, 70, 0.03), 90);

    spinning = false;
    if (spinBtn) spinBtn.disabled = false;
  }

  spinBtn?.addEventListener("click", onSpin);

  // =========================
  // Social бонусы (1 раз)
  // =========================
  const VK_KEY = "triniti_bonus_vk_v1";
  const TG_KEY = "triniti_bonus_tg_v1";

  const claimVK = $("#claimVK");
  const claimTG = $("#claimTG");
  const vkState = $("#vkState");
  const tgState = $("#tgState");

  function renderSocial(){
    const vkDone = localStorage.getItem(VK_KEY) === "1";
    const tgDone = localStorage.getItem(TG_KEY) === "1";

    if (vkState) vkState.textContent = vkDone ? "Получено ✅" : "Не получено";
    if (tgState) tgState.textContent = tgDone ? "Получено ✅" : "Не получено";

    if (claimVK) claimVK.disabled = vkDone;
    if (claimTG) claimTG.disabled = tgDone;
  }

  function claimOnce(key, amount){
    if (localStorage.getItem(key) === "1") return;
    localStorage.setItem(key, "1");
    addCoins(amount);
    renderSocial();
    beep(760, 70, 0.03);
    setTimeout(() => beep(920, 70, 0.03), 90);
  }

  claimVK?.addEventListener("click", () => claimOnce(VK_KEY, 500));
  claimTG?.addEventListener("click", () => claimOnce(TG_KEY, 500));

  // =========================
  // init
  // =========================
  (function init(){
    renderWallet();
    renderSoundUI();
    renderSocial();
    renderPrizeList();
    drawWheel();
    renderFreeStatus();

    if (wheelCanvas){
      wheelCanvas.style.transform = "rotate(0rad)";
      wheelCanvas.style.transformOrigin = "50% 50%";
    }
  })();

  window.addEventListener("focus", () => {
    renderWallet();
    renderFreeStatus();
    renderSocial();
  });
})();