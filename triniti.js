(() => {
  // ===== SharedWallet fallback =====
  const WALLET_KEY = "triniti_shared_wallet_v1";
  function ensureSharedWallet() {
    const sw = window.SharedWallet;
    if (sw && sw.getCoins && sw.setCoins && sw.addCoins) return sw;

    let state = { coins: 1000 };
    try {
      const v = JSON.parse(localStorage.getItem(WALLET_KEY) || "null");
      if (v && typeof v.coins === "number") state.coins = Math.max(0, Math.floor(v.coins));
    } catch {}

    const save = () => localStorage.setItem(WALLET_KEY, JSON.stringify({ coins: state.coins }));
    window.SharedWallet = {
      getCoins(){ return state.coins; },
      setCoins(n){ state.coins = Math.max(0, Math.floor(Number(n)||0)); save(); },
      addCoins(d){ state.coins = Math.max(0, Math.floor(state.coins + (Number(d)||0))); save(); },
    };
    return window.SharedWallet;
  }
  const SW = ensureSharedWallet();
  const $ = (id) => document.getElementById(id);

  const coins = () => Math.floor(Number(SW.getCoins()) || 0);
  const addCoins = (d) => { SW.addCoins(d); syncBalanceUI(); };

  function syncBalanceUI(){
    const c = coins();
    $("balance") && ($("balance").textContent = String(c));
    $("balance2") && ($("balance2").textContent = String(c));
    $("balanceRail") && ($("balanceRail").textContent = String(c));
  }

  // ===== Sound =====
  const SOUND_KEY = "triniti_sound_v1";
  let soundOn = (localStorage.getItem(SOUND_KEY) ?? "1") === "1";
  let audioCtx = null;

  function getCtx(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    return audioCtx || (audioCtx = new AC());
  }
  function beep(freq=520, ms=60, vol=0.03){
    if(!soundOn) return;
    try{
      const ctx = getCtx(); if(!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type="sine";
      o.frequency.value=freq;
      const t = ctx.currentTime;
      g.gain.setValueAtTime(vol,t);
      g.gain.exponentialRampToValueAtTime(0.0001,t+ms/1000);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t+ms/1000);
    }catch{}
  }
  function renderSoundUI(){
    $("soundText") && ($("soundText").textContent = soundOn ? "Звук on" : "Звук off");
    const dot = $("soundDot");
    if(dot){
      dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
      dot.style.boxShadow  = soundOn ? "0 0 0 3px rgba(38,212,123,.14)" : "0 0 0 3px rgba(255,90,106,.14)";
    }
  }

  $("soundBtn")?.addEventListener("click", async ()=>{
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
    renderSoundUI();
    beep(soundOn ? 640 : 240, 60, 0.03);
    if(soundOn && audioCtx && audioCtx.state === "suspended"){
      try{ await audioCtx.resume(); }catch{}
    }
  });

  // ===== Deposit/Withdraw (заглушки) =====
  const depositMock = () => { beep(520,55,0.02); alert("Пополнение отключено (виртуальные монеты)."); };
  const withdrawMock = () => { beep(240,80,0.03); alert("Вывод отключен (виртуальные монеты)."); };

  $("depositBtn")?.addEventListener("click", depositMock);
  $("withdrawBtn")?.addEventListener("click", withdrawMock);

  // ===== Bonus +1000 =====
  $("bonusBtn")?.addEventListener("click", ()=>{ addCoins(1000); beep(760,70,0.03); });

  // ===== Modal: Halyava =====
  const freeModal = $("freeModal");
  const openModal = () => {
    freeModal?.classList.add("open");
    freeModal?.setAttribute("aria-hidden","false");
    beep(520,50,0.02);
  };
  const closeModal = () => {
    freeModal?.classList.remove("open");
    freeModal?.setAttribute("aria-hidden","true");
    beep(420,50,0.02);
  };

  $("freeBtn")?.addEventListener("click", openModal);
  $("freeBtn2")?.addEventListener("click", openModal);
  $("freeBtnRail")?.addEventListener("click", openModal);
  $("freeClose")?.addEventListener("click", closeModal);
  freeModal?.addEventListener("click",(e)=>{ if(e.target?.dataset?.close) closeModal(); });
  window.addEventListener("keydown",(e)=>{ if(e.key==="Escape" && freeModal?.classList.contains("open")) closeModal(); });

  // Tabs
  const tabDaily = $("tabDaily");
  const tabSocial = $("tabSocial");
  const paneDaily = $("paneDaily");
  const paneSocial = $("paneSocial");

  function setTab(which){
    const daily = which === "daily";
    tabDaily?.classList.toggle("active", daily);
    tabSocial?.classList.toggle("active", !daily);
    paneDaily?.classList.toggle("hidden", !daily);
    paneSocial?.classList.toggle("hidden", daily);
    beep(520,45,0.02);
  }
  tabDaily?.addEventListener("click", ()=>setTab("daily"));
  tabSocial?.addEventListener("click", ()=>setTab("social"));

  // =========================
  // DAILY WHEEL (SYNC FIX + 24H TIMER)
  // =========================
  const DAILY_NEXT_KEY = "triniti_daily_next_ms_v2";

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

  function rngInt(n){
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  }

  const freeStatus = $("freeStatus");
  const dailyTimer = $("dailyTimer");
  const dailyMsg = $("dailyMsg");
  const spinBtn = $("spinBtn");
  const wheelCanvas = $("dailyWheel");
  const wheelCenterTxt = $("wheelCenterTxt");
  const wheelCenterSub = $("wheelCenterSub");
  const prizeList = $("prizeList");

  const getNextTs = () => {
    const v = Number(localStorage.getItem(DAILY_NEXT_KEY) || 0);
    return Number.isFinite(v) ? v : 0;
  };
  const setNextTs24h = () => {
    const next = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(DAILY_NEXT_KEY, String(next));
    return next;
  };
  const canSpinNow = () => Date.now() >= getNextTs();

  function fmt(ms){
    ms = Math.max(0, ms);
    const s = Math.floor(ms/1000);
    const hh = String(Math.floor(s/3600)).padStart(2,"0");
    const mm = String(Math.floor((s%3600)/60)).padStart(2,"0");
    const ss = String(s%60).padStart(2,"0");
    return `${hh}:${mm}:${ss}`;
  }

  function renderFree(){
    const ok = canSpinNow();
    if(freeStatus) freeStatus.textContent = ok ? "доступна" : "ожидание";
  }
  function renderTimer(){
    if(!dailyTimer) return;
    dailyTimer.textContent = canSpinNow() ? "00:00:00" : fmt(getNextTs() - Date.now());
  }

  function renderPrizes(){
    if(!prizeList) return;
    prizeList.innerHTML = "";
    PRIZES.forEach(p=>{
      const el = document.createElement("div");
      el.className = "prizeItem";
      el.innerHTML = `<div class="p">${p.label}</div><div class="t">в кошелёк</div>`;
      prizeList.appendChild(el);
    });
  }

  function drawWheel(){
    if(!wheelCanvas) return;
    const ctx = wheelCanvas.getContext("2d");
    const W = wheelCanvas.width, H = wheelCanvas.height;
    const cx = W/2, cy = H/2;
    const r = Math.min(W,H)*0.48;

    ctx.clearRect(0,0,W,H);

    const n = PRIZES.length;
    const step = (Math.PI*2)/n;

    // стрелка сверху => старт -PI/2
    for(let i=0;i<n;i++){
      const a0 = -Math.PI/2 + i*step;
      const a1 = a0 + step;

      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,a0,a1);
      ctx.closePath();

      ctx.fillStyle = (i%2===0) ? "rgba(76,125,255,.18)" : "rgba(176,64,255,.14)";
      ctx.fill();

      ctx.strokeStyle="rgba(255,255,255,.10)";
      ctx.lineWidth=2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(a0 + step/2);
      ctx.textAlign="right";
      ctx.fillStyle="rgba(255,255,255,.92)";
      ctx.font="950 22px ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial";
      ctx.fillText(PRIZES[i].label, r-14, 8);
      ctx.restore();
    }
  }

  let spinning=false;
  let lastRotation=0;

  // ВАЖНО: “что выпало” = winIndex, и начисляем по нему же
  function spinToIndex(winIndex){
    return new Promise((resolve)=>{
      const n = PRIZES.length;
      const step = (Math.PI*2)/n;

      // центр сектора i: (-PI/2 + (i+0.5)*step)
      // под стрелку (-PI/2) => rotation = -(i+0.5)*step (mod 2pi)
      const ideal = -((winIndex + 0.5) * step);
      const fullTurns = 4 + rngInt(3); // 4..6
      const target = lastRotation + fullTurns*(Math.PI*2) + ideal;

      wheelCanvas.style.transition="transform 1150ms cubic-bezier(.2,.85,.2,1)";
      wheelCanvas.style.transform=`rotate(${target}rad)`;

      const onEnd = () => {
        wheelCanvas.removeEventListener("transitionend", onEnd);
        lastRotation = target % (Math.PI*2);
        resolve();
      };
      wheelCanvas.addEventListener("transitionend", onEnd, { once:true });
    });
  }

  async function onSpin(){
    if(spinning) return;

    if(!canSpinNow()){
      renderTimer(); renderFree();
      if(dailyMsg) dailyMsg.textContent="Пока нельзя. Дождись таймера 😉";
      beep(220,90,0.03);
      return;
    }

    spinning=true;
    if(spinBtn) spinBtn.disabled=true;

    if(wheelCenterTxt) wheelCenterTxt.textContent="…";
    if(wheelCenterSub) wheelCenterSub.textContent="крутим";
    if(dailyMsg) dailyMsg.textContent="Крутим колесо…";
    beep(520,55,0.02);

    const winIndex = rngInt(PRIZES.length);
    await spinToIndex(winIndex);

    const prize = PRIZES[winIndex];
    addCoins(prize.coins);     // начисление ТОЧНО по winIndex

    setNextTs24h();
    renderFree(); renderTimer();

    if(wheelCenterTxt) wheelCenterTxt.textContent = `+${prize.coins}`;
    if(wheelCenterSub) wheelCenterSub.textContent = "🪙 начислено";
    if(dailyMsg) dailyMsg.textContent = `Выпало: ${prize.label} — начислено на баланс ✅`;

    beep(760,70,0.03);
    setTimeout(()=>beep(920,70,0.03), 90);

    spinning=false;
    if(spinBtn) spinBtn.disabled=false;
  }
  spinBtn?.addEventListener("click", onSpin);

  // Social bonus
  const VK_KEY="triniti_bonus_vk_v1";
  const TG_KEY="triniti_bonus_tg_v1";
  function renderSocial(){
    const vkDone = localStorage.getItem(VK_KEY) === "1";
    const tgDone = localStorage.getItem(TG_KEY) === "1";

    $("vkState") && ($("vkState").textContent = vkDone ? "Получено ✅" : "Не получено");
    $("tgState") && ($("tgState").textContent = tgDone ? "Получено ✅" : "Не получено");

    $("claimVK") && ($("claimVK").disabled = vkDone);
    $("claimTG") && ($("claimTG").disabled = tgDone);
  }
  function claimOnce(key, amount){
    if(localStorage.getItem(key)==="1") return;
    localStorage.setItem(key,"1");
    addCoins(amount);
    renderSocial();
    beep(760,70,0.03);
    setTimeout(()=>beep(920,70,0.03), 90);
  }
  $("claimVK")?.addEventListener("click", ()=>claimOnce(VK_KEY, 500));
  $("claimTG")?.addEventListener("click", ()=>claimOnce(TG_KEY, 500));

  // init
  (function init(){
    if(!localStorage.getItem(DAILY_NEXT_KEY)) localStorage.setItem(DAILY_NEXT_KEY, "0");

    syncBalanceUI();
    renderSoundUI();

    renderPrizes();
    drawWheel();

    if(wheelCanvas){
      wheelCanvas.style.transform="rotate(0rad)";
      wheelCanvas.style.transformOrigin="50% 50%";
    }

    renderFree();
    renderTimer();
    renderSocial();

    setInterval(()=>{ renderTimer(); renderFree(); }, 1000);
  })();

  window.addEventListener("focus", ()=>{ syncBalanceUI(); renderFree(); renderTimer(); renderSocial(); });
})();
