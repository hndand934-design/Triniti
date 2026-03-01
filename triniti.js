(() => {
  // ===== Shared Wallet bootstrap (fallback) =====
  const WALLET_KEY = "triniti_shared_wallet_v1";
  function ensureSharedWallet() {
    const sw = window.SharedWallet;
    if (sw && typeof sw.getCoins === "function" && typeof sw.setCoins === "function" && typeof sw.addCoins === "function") {
      return sw;
    }
    function load() {
      try {
        const v = JSON.parse(localStorage.getItem(WALLET_KEY) || "null");
        if (v && typeof v.coins === "number") return { coins: Math.max(0, Math.floor(v.coins)) };
      } catch {}
      return { coins: 1000 };
    }
    function save(state) {
      localStorage.setItem(WALLET_KEY, JSON.stringify({ coins: Math.max(0, Math.floor(state.coins)) }));
    }
    const state = load();
    window.SharedWallet = {
      getCoins(){ return Math.max(0, Math.floor(state.coins)); },
      setCoins(n){ state.coins = Math.max(0, Math.floor(Number(n)||0)); save(state); },
      addCoins(d){ state.coins = Math.max(0, Math.floor(state.coins + (Number(d)||0))); save(state); },
    };
    return window.SharedWallet;
  }
  const SW = ensureSharedWallet();

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function coins(){ return Math.floor(Number(SW.getCoins()) || 0); }
  function addCoins(d){ SW.addCoins(d); syncBalanceUI(); }

  // ===== Sound (тихо) =====
  const SOUND_KEY = "triniti_sound_v1";
  let soundOn = (localStorage.getItem(SOUND_KEY) ?? "1") === "1";
  let audioCtx = null;

  function ensureCtx(){
    if (!soundOn) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }
  function beep(freq=520, ms=55, vol=0.03){
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

  function applySoundUI(){
    const soundDot = $("soundDot");
    const soundText = $("soundText");
    if (soundText) soundText.textContent = soundOn ? "Звук on" : "Звук off";
    if (soundDot) {
      soundDot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
      soundDot.style.boxShadow = soundOn
        ? "0 0 0 3px rgba(38,212,123,.14)"
        : "0 0 0 3px rgba(255,90,106,.14)";
    }
  }

  // ===== Balance UI sync (desktop + mobile) =====
  function syncBalanceUI(){
    const v = String(coins());
    const bal1 = $("balance");
    const bal2 = $("balance2");
    const mBal = $("mBalance");
    if (bal1) bal1.textContent = v;
    if (bal2) bal2.textContent = v;
    if (mBal) mBal.textContent = v;
  }
  window.addEventListener("storage", (e) => {
    if (e.key === WALLET_KEY) syncBalanceUI();
  });

  // ===== Mobile tabs =====
  function setMobileTab(name){
    $$(".mTab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
    const map = {
      games: "page-games",
      bonus: "page-bonus",
      promo: "page-promo",
      support:"page-support",
      free: "page-free"
    };
    Object.values(map).forEach(id => $(id)?.classList.add("hidden"));
    $(map[name])?.classList.remove("hidden");
  }

  // ===== Modal open/close =====
  function openFree(){
    $("freeModal")?.classList.add("show");
    $("freeModal")?.setAttribute("aria-hidden","false");
    beep(540, 55, 0.02);
  }
  function closeFree(){
    $("freeModal")?.classList.remove("show");
    $("freeModal")?.setAttribute("aria-hidden","true");
    beep(240, 55, 0.02);
  }

  // ===== Tabs inside modal =====
  function setFreePane(which){
    $("tabDaily")?.classList.toggle("active", which === "daily");
    $("tabSocial")?.classList.toggle("active", which === "social");
    $("paneDaily")?.classList.toggle("hidden", which !== "daily");
    $("paneSocial")?.classList.toggle("hidden", which !== "social");
  }

  // ===== Daily wheel (sync prize + начисление) =====
  function randFloat(){
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2**32;
  }
  function randInt(min,max){
    return Math.floor(randFloat()*(max-min+1))+min;
  }

  const DAILY_KEY = "triniti_daily_wheel_v1";
  // state: { nextAt:number(ms), lastPrize:number, lastLabel:string }
  function loadDaily(){
    try{
      const v = JSON.parse(localStorage.getItem(DAILY_KEY) || "null");
      if (v && typeof v.nextAt === "number") return v;
    }catch{}
    return { nextAt: 0, lastPrize: 0, lastLabel: "" };
  }
  function saveDaily(s){ localStorage.setItem(DAILY_KEY, JSON.stringify(s)); }

  const prizes = [
    { label:"+50 🪙",  coins: 50,  w: 22 },
    { label:"+100 🪙", coins: 100, w: 18 },
    { label:"+150 🪙", coins: 150, w: 14 },
    { label:"+250 🪙", coins: 250, w: 10 },
    { label:"+500 🪙", coins: 500, w: 6  },
    { label:"+0 🪙",   coins: 0,   w: 30 },
  ];

  function pickPrize(){
    const sum = prizes.reduce((a,p)=>a+p.w,0);
    let r = randFloat()*sum;
    for (const p of prizes){
      r -= p.w;
      if (r <= 0) return p;
    }
    return prizes[0];
  }

  // canvas wheel
  function drawWheel(){
    const c = $("dailyWheel");
    if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    const cx = W/2, cy = H/2;
    const R = Math.min(W,H)/2 - 10;

    ctx.clearRect(0,0,W,H);

    const n = prizes.length;
    const step = (Math.PI*2)/n;
    for (let i=0;i<n;i++){
      const a0 = -Math.PI/2 + i*step;
      const a1 = a0 + step;

      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,R,a0,a1);
      ctx.closePath();

      // alternating
      ctx.fillStyle = i%2===0 ? "rgba(76,125,255,.35)" : "rgba(255,255,255,.08)";
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,.10)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // text
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(a0 + step/2);
      ctx.textAlign="right";
      ctx.fillStyle="rgba(234,240,255,.92)";
      ctx.font="bold 22px ui-sans-serif,system-ui";
      ctx.fillText(prizes[i].label, R-18, 8);
      ctx.restore();
    }

    // center ring
    ctx.beginPath();
    ctx.arc(cx,cy,72,0,Math.PI*2);
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.14)";
    ctx.lineWidth=2;
    ctx.stroke();
  }

  // timer 24h
  function fmtTime(ms){
    ms = Math.max(0, ms);
    const s = Math.floor(ms/1000);
    const hh = String(Math.floor(s/3600)).padStart(2,"0");
    const mm = String(Math.floor((s%3600)/60)).padStart(2,"0");
    const ss = String(s%60).padStart(2,"0");
    return `${hh}:${mm}:${ss}`;
  }

  let daily = loadDaily();
  let timerInt = null;

  function updateTimerUI(){
    const now = Date.now();
    const left = daily.nextAt - now;
    const t = $("dailyTimer");
    const btn = $("spinBtn");
    const msg = $("dailyMsg");
    const status = $("freeStatus");

    if (left > 0){
      if (t) t.textContent = `до попытки: ${fmtTime(left)}`;
      if (btn) btn.disabled = true;
      if (msg) msg.textContent = `Следующая попытка через ${fmtTime(left)}.`;
      if (status) status.textContent = "не доступна";
    } else {
      if (t) t.textContent = `попытка доступна`;
      if (btn) btn.disabled = false;
      if (msg) msg.textContent = "Жми “Крутить” и забирай приз.";
      if (status) status.textContent = "доступна";
    }
  }

  function startTimer(){
    if (timerInt) clearInterval(timerInt);
    timerInt = setInterval(updateTimerUI, 250);
    updateTimerUI();
  }

  function renderPrizeList(){
    const list = $("prizeList");
    if (!list) return;
    list.innerHTML = "";
    prizes.forEach(p => {
      const row = document.createElement("div");
      row.className = "prizeItem";
      row.innerHTML = `<span>${p.label}</span><b>${p.w}%</b>`;
      list.appendChild(row);
    });
  }

  // spin animation: rotate canvas element
  let wheelAngle = 0;
  let spinning = false;

  function setWheelRotation(rad){
    const c = $("dailyWheel");
    if (!c) return;
    c.style.transform = `rotate(${rad}rad)`;
  }

  async function spin(){
    if (spinning) return;

    const now = Date.now();
    if (daily.nextAt > now) return;

    spinning = true;
    const btn = $("spinBtn");
    if (btn) btn.disabled = true;

    // 1) выбираем приз один раз (самое важное: синхрон)
    const prize = pickPrize();

    // 2) готовим угол так, чтобы под pointer попал сектор приза
    const n = prizes.length;
    const step = (Math.PI*2)/n;
    const idx = prizes.indexOf(prize);
    const targetCenter = -Math.PI/2 + idx*step + step/2;

    // pointer сверху, значит хотим чтобы сектор оказался под ним:
    const extra = (Math.PI*2) * randInt(6, 9);
    const to = extra - targetCenter;

    const from = wheelAngle;
    const dur = 1100;
    const t0 = performance.now();

    beep(520, 55, 0.02);

    await new Promise((resolve) => {
      const tick = (t) => {
        const k = Math.min(1, (t - t0)/dur);
        const ease = 1 - Math.pow(1-k, 3);
        wheelAngle = from + (to - from) * ease;
        setWheelRotation(wheelAngle);
        if (k >= 1) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    // 3) начисление — строго этим же prize.coins
    if (prize.coins > 0) addCoins(prize.coins);

    daily.lastPrize = prize.coins;
    daily.lastLabel = prize.label;
    daily.nextAt = Date.now() + 24*60*60*1000;
    saveDaily(daily);

    const msg = $("dailyMsg");
    if (msg) msg.textContent = `Выпало: ${prize.label} — начислено в баланс.`;

    beep(prize.coins > 0 ? 920 : 220, 80, 0.03);

    spinning = false;
    updateTimerUI();
  }

  // ===== Social bonuses =====
  const VK_KEY = "triniti_claim_vk_v1";
  const TG_KEY = "triniti_claim_tg_v1";

  function updateSocialUI(){
    const vkState = $("vkState");
    const tgState = $("tgState");
    const vkOk = localStorage.getItem(VK_KEY) === "1";
    const tgOk = localStorage.getItem(TG_KEY) === "1";
    if (vkState) vkState.textContent = vkOk ? "Получено ✅" : "Не получено";
    if (tgState) tgState.textContent = tgOk ? "Получено ✅" : "Не получено";
    const vkBtn = $("claimVK");
    const tgBtn = $("claimTG");
    if (vkBtn) vkBtn.disabled = vkOk;
    if (tgBtn) tgBtn.disabled = tgOk;
  }

  function claimOnce(key, amount){
    if (localStorage.getItem(key) === "1") return;
    localStorage.setItem(key, "1");
    addCoins(amount);
    beep(760, 70, 0.03);
    updateSocialUI();
  }

  // ===== Init =====
  function init(){
    // desktop buttons
    $("soundBtn")?.addEventListener("click", () => {
      soundOn = !soundOn;
      localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
      applySoundUI();
      beep(soundOn ? 640 : 240, 60, 0.03);
    });
    $("bonusBtn")?.addEventListener("click", () => { addCoins(1000); beep(760, 70, 0.03); });

    // free open (desktop + hero + mobile)
    $("freeBtn")?.addEventListener("click", openFree);
    $("freeBtn2")?.addEventListener("click", openFree);
    $("mFreeOpen")?.addEventListener("click", openFree);

    // close modal
    $("freeClose")?.addEventListener("click", closeFree);
    $("freeModal")?.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.close === "1") closeFree();
    });

    // modal tabs
    $("tabDaily")?.addEventListener("click", () => setFreePane("daily"));
    $("tabSocial")?.addEventListener("click", () => setFreePane("social"));

    // wheel
    drawWheel();
    renderPrizeList();
    startTimer();
    $("spinBtn")?.addEventListener("click", spin);

    // social
    $("claimVK")?.addEventListener("click", () => claimOnce(VK_KEY, 500));
    $("claimTG")?.addEventListener("click", () => claimOnce(TG_KEY, 500));
    updateSocialUI();

    // mobile tabs
    $$(".mTab").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        if (!tab) return;
        if (tab === "free") {
          setMobileTab("free");
        } else {
          setMobileTab(tab);
        }
        beep(520, 45, 0.02);
      });
    });
    setMobileTab("games");

    // mobile “Пополнить/Вывести” (пока заглушки)
    $("mDeposit")?.addEventListener("click", () => { beep(640, 60, 0.03); alert("Пополнение (в разработке)"); });
    $("mWithdraw")?.addEventListener("click", () => { beep(240, 60, 0.03); alert("Вывод (в разработке)"); });

    // initial
    applySoundUI();
    syncBalanceUI();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.addEventListener("load", () => {
    syncBalanceUI();
    updateTimerUI();
  });
})();
