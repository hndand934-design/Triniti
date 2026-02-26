// triniti.js
(() => {
  const W = window.TRINITI_WALLET;
  if (!W) {
    alert("Нет shared/wallet.js — подключи ./shared/wallet.js");
    return;
  }

  // base path для GitHub Pages /repo/
  function getBase() {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "/";
    return `/${parts[0]}/`;
  }
  const BASE = getBase();
  const go = (route) => location.href = BASE + route;

  // refs
  const balEl = document.getElementById("bal");
  const bonusBtn = document.getElementById("bonusBtn");
  const freeChipsTile = document.getElementById("freeChipsTile");

  const soundBtn = document.getElementById("soundBtn");
  const soundDot = document.getElementById("soundDot");
  const soundTxt = document.getElementById("soundTxt");

  const tgBtn = document.getElementById("tgBtn");
  const vkBtn = document.getElementById("vkBtn");

  const tabs = Array.from(document.querySelectorAll(".tab"));
  const gamesGrid = document.getElementById("gamesGrid");
  const historyRow = document.getElementById("historyRow");

  const bItems = Array.from(document.querySelectorAll(".bItem"));
  const searchBtn = document.getElementById("searchBtn");

  // press fx
  function pressFX(el) {
    const on = () => el.classList.add("is-pressed");
    const off = () => el.classList.remove("is-pressed");
    el.addEventListener("touchstart", on, { passive: true });
    el.addEventListener("touchend", off, { passive: true });
    el.addEventListener("touchcancel", off, { passive: true });
    el.addEventListener("mousedown", on);
    el.addEventListener("mouseup", off);
    el.addEventListener("mouseleave", off);
  }
  document.querySelectorAll("button, a, .gameCard, .pill, .iconBtn, .tab, .bItem").forEach(pressFX);

  // wallet render
  function renderBal() {
    if (balEl) balEl.textContent = String(W.getCoins());
  }
  window.addEventListener("wallet:change", renderBal);
  renderBal();

  // sound
  const SOUND_KEY = "triniti_sound_v1";
  let soundOn = (localStorage.getItem(SOUND_KEY) ?? "1") === "1";
  let audioCtx = null;

  function ctx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }
  function beep(freq=520, ms=55, vol=0.03) {
    if (!soundOn) return;
    const c = ctx(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = freq;

    const t = c.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms/1000);

    o.connect(g); g.connect(c.destination);
    o.start(t);
    o.stop(t + ms/1000 + 0.02);
  }
  function renderSound() {
    soundTxt.textContent = soundOn ? "Звук on" : "Звук off";
    soundDot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
    soundDot.style.boxShadow = soundOn
      ? "0 0 0 3px rgba(38,212,123,.14)"
      : "0 0 0 3px rgba(255,90,106,.14)";
  }
  renderSound();

  soundBtn?.addEventListener("click", async () => {
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
    renderSound();
    beep(soundOn ? 640 : 240, 60, 0.03);
    if (soundOn && audioCtx && audioCtx.state === "suspended") {
      try { await audioCtx.resume(); } catch {}
    }
  });

  // bonus
  const giveBonus = () => {
    W.addCoins(1000);
    beep(820, 70, 0.03);
    beep(980, 70, 0.03);
  };
  bonusBtn?.addEventListener("click", giveBonus);
  freeChipsTile?.addEventListener("click", giveBonus);

  // tg/vk
  tgBtn?.addEventListener("click", () => { alert("Telegram — заглушка."); beep(520,45,0.02); });
  vkBtn?.addEventListener("click", () => { alert("VK — заглушка."); beep(520,45,0.02); });

  // tabs filter
  function setTab(key) {
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === key));
    Array.from(gamesGrid.children).forEach(card => {
      const group = card.getAttribute("data-group") || "other";
      const show = (key === "all") || (group === key);
      card.style.display = show ? "" : "none";
    });
    beep(520, 45, 0.02);
  }
  tabs.forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));
  setTab("all");

  // history demo
  const demo = [
    { name:"Crash", res:"win", meta:"+240 🪙 • x2.40" },
    { name:"Mines", res:"lose", meta:"-100 🪙 • mine" },
    { name:"Wheel", res:"win", meta:"+150 🪙 • 1.50x" },
    { name:"Dice",  res:"lose", meta:"-50 🪙 • rolled 6" },
    { name:"RPS",   res:"win", meta:"+120 🪙 • 2 wins" },
  ];
  historyRow.innerHTML = demo.map(x => `
    <div class="hItem">
      <div class="hTop">
        <div class="hName">${x.name}</div>
        <div class="hRes ${x.res}">${x.res === "win" ? "WIN" : "LOSE"}</div>
      </div>
      <div class="hMeta">${x.meta}</div>
    </div>
  `).join("");

  // bottom nav
  function jumpTo(hash){
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior:"smooth", block:"start" });
  }
  bItems.forEach(btn => {
    btn.addEventListener("click", () => {
      bItems.forEach(x => x.classList.remove("active"));
      btn.classList.add("active");

      const h = btn.dataset.jump;
      if (h) jumpTo(h);

      if (btn.id === "supportBtn") alert("Поддержка — заглушка.");
      if (btn.id === "menuBtn") alert("Меню — заглушка.");

      beep(520,45,0.02);
    });
  });

  // search
  searchBtn?.addEventListener("click", () => {
    const q = prompt("Поиск игры (например: mines, crash, dice):");
    if (!q) return;
    const query = q.trim().toLowerCase();

    const cards = Array.from(gamesGrid.querySelectorAll(".gameCard"));
    const found = cards.find(c => (c.querySelector(".gameName")?.textContent || "").toLowerCase().includes(query));
    if (found) {
      found.scrollIntoView({ behavior:"smooth", block:"center" });
      found.style.outline = "2px solid rgba(184,255,44,.55)";
      setTimeout(() => found.style.outline = "", 900);
      beep(760,60,0.03);
    } else {
      alert("Не нашёл.");
      beep(240,80,0.03);
    }
  });

  // placeholders disabled
  document.querySelectorAll(".gameCard--disabled").forEach(el => {
    el.addEventListener("click", (e) => { e.preventDefault(); beep(240,70,0.03); });
  });

  // IMPORTANT: route fix (без 404)
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-route]");
    if (!el) return;
    e.preventDefault();
    const route = el.getAttribute("data-route");
    if (!route) return;
    beep(520,40,0.02);
    go(route);
  });
})();
