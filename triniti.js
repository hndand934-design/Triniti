(() => {
  // ===== minimal wallet for homepage =====
  // Если у тебя уже есть shared/wallet.js — можешь заменить этот блок на него.
  const WALLET_KEY = "triniti_wallet_v1";

  function loadWallet(){
    try{
      const w = JSON.parse(localStorage.getItem(WALLET_KEY) || "null");
      if (w && typeof w.coins === "number") return w;
    }catch{}
    return { coins: 1000 };
  }
  function saveWallet(w){ localStorage.setItem(WALLET_KEY, JSON.stringify(w)); }

  let wallet = loadWallet();

  // ===== UI refs =====
  const balEl = document.getElementById("bal");
  const bonusBtn = document.getElementById("bonusBtn");

  const soundBtn = document.getElementById("soundBtn");
  const soundDot = document.getElementById("soundDot");
  const soundTxt = document.getElementById("soundTxt");

  const tgBtn = document.getElementById("tgBtn");
  const vkBtn = document.getElementById("vkBtn");

  const tabs = Array.from(document.querySelectorAll(".tab"));
  const gamesGrid = document.getElementById("gamesGrid");

  const historyRow = document.getElementById("historyRow");

  const bottomNav = document.querySelector(".bottomNav");
  const bItems = Array.from(document.querySelectorAll(".bItem"));

  const searchBtn = document.getElementById("searchBtn");

  // ===== sound =====
  const SOUND_KEY = "triniti_sound_v1";
  let soundOn = (localStorage.getItem(SOUND_KEY) ?? "1") === "1";

  let audioCtx = null;
  function ctx(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }
  function beep(freq=520, ms=55, vol=0.03){
    if(!soundOn) return;
    const c = ctx(); if(!c) return;
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
  function renderSound(){
    soundTxt.textContent = soundOn ? "Звук on" : "Звук off";
    soundDot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
    soundDot.style.boxShadow = soundOn
      ? "0 0 0 3px rgba(38,212,123,.14)"
      : "0 0 0 3px rgba(255,90,106,.14)";
  }

  // ===== wallet render =====
  function setCoins(v){
    wallet.coins = Math.max(0, Math.floor(v));
    saveWallet(wallet);
    balEl.textContent = String(wallet.coins);
  }
  function addCoins(d){ setCoins(wallet.coins + d); }

  // ===== tabs filter =====
  function setTab(key){
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === key));
    const cards = Array.from(gamesGrid.children);

    cards.forEach(card => {
      // placeholders may be divs — still ok
      const group = card.getAttribute("data-group") || "other";
      const show = (key === "all")
        || (key === "fast" && group === "fast")
        || (key === "risk" && group === "risk")
        || (key === "other" && group === "other");
      card.style.display = show ? "" : "none";
    });

    beep(520, 45, 0.02);
  }

  // ===== history demo =====
  const demo = [
    { name:"Crash", res:"win", meta:"+240 🪙 • x2.40" },
    { name:"Mines", res:"lose", meta:"-100 🪙 • mine" },
    { name:"Wheel", res:"win", meta:"+150 🪙 • 1.50x" },
    { name:"Dice",  res:"lose", meta:"-50 🪙 • rolled 6" },
    { name:"RPS",   res:"win", meta:"+120 🪙 • 2 wins" },
  ];
  function renderHistory(){
    historyRow.innerHTML = demo.map(item => `
      <div class="hItem">
        <div class="hTop">
          <div class="hName">${item.name}</div>
          <div class="hRes ${item.res}">${item.res === "win" ? "WIN" : "LOSE"}</div>
        </div>
        <div class="hMeta">${item.meta}</div>
      </div>
    `).join("");
  }

  // ===== bottom nav jumps =====
  function jumpTo(hash){
    const el = document.querySelector(hash);
    if(!el) return;
    el.scrollIntoView({ behavior:"smooth", block:"start" });
  }

  // ===== search (simple) =====
  function doSearch(){
    const q = prompt("Поиск игры (например: mines, crash, dice):");
    if(!q) return;
    const query = q.trim().toLowerCase();

    const cards = Array.from(gamesGrid.querySelectorAll(".gameCard"));
    let found = null;
    for(const c of cards){
      const name = (c.querySelector(".gameName")?.textContent || "").toLowerCase();
      if(name.includes(query)){ found = c; break; }
    }
    if(found){
      found.scrollIntoView({ behavior:"smooth", block:"center" });
      found.style.outline = "2px solid rgba(184,255,44,.55)";
      setTimeout(()=>{ found.style.outline = ""; }, 900);
      beep(760, 60, 0.03);
    }else{
      alert("Не нашёл. Попробуй другое название.");
      beep(240, 80, 0.03);
    }
  }

  // ===== events =====
  soundBtn?.addEventListener("click", async () => {
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
    renderSound();
    beep(soundOn ? 640 : 240, 60, 0.03);
    if (soundOn && audioCtx && audioCtx.state === "suspended") {
      try { await audioCtx.resume(); } catch {}
    }
  });

  bonusBtn?.addEventListener("click", () => {
    addCoins(1000);
    beep(820, 70, 0.03);
    beep(980, 70, 0.03);
  });

  tgBtn?.addEventListener("click", () => {
    alert("Telegram кнопка-плейсхолдер. Подключим ссылку позже.");
    beep(520, 45, 0.02);
  });
  vkBtn?.addEventListener("click", () => {
    alert("VK кнопка-плейсхолдер. Подключим ссылку позже.");
    beep(520, 45, 0.02);
  });

  tabs.forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));

  bItems.forEach(btn => {
    btn.addEventListener("click", () => {
      bItems.forEach(x => x.classList.remove("active"));
      btn.classList.add("active");

      const hash = btn.dataset.jump;
      if(hash) jumpTo(hash);

      if(btn.id === "supportBtn") alert("Поддержка (плейсхолдер).");
      if(btn.id === "menuBtn") alert("Меню (плейсхолдер).");
      beep(520, 45, 0.02);
    });
  });

  searchBtn?.addEventListener("click", doSearch);

  // IMPORTANT: disable click for placeholders
  document.querySelectorAll(".gameCard--disabled").forEach(el=>{
    el.addEventListener("click", (e)=>{ e.preventDefault(); beep(240, 70, 0.03); });
  });

  // ===== init =====
  (function init(){
    renderSound();
    setCoins(wallet.coins);
    renderHistory();
    setTab("all");
  })();
})();