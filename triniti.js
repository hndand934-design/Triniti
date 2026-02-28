(() => {
  // =========================
  // 0) Shared Wallet bootstrap
  // =========================
  // Если shared/wallet.js по какой-то причине не загрузился — делаем fallback,
  // чтобы сайт НЕ ломался и кошелёк всё равно был единым.
  const WALLET_KEY = "triniti_shared_wallet_v1";

  function ensureSharedWallet() {
    const sw = window.SharedWallet;

    if (
      sw &&
      typeof sw.getCoins === "function" &&
      typeof sw.setCoins === "function" &&
      typeof sw.addCoins === "function"
    ) {
      return sw; // всё ок
    }

    // fallback
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
      getCoins() {
        return Math.max(0, Math.floor(state.coins));
      },
      setCoins(n) {
        state.coins = Math.max(0, Math.floor(Number(n) || 0));
        save(state);
      },
      addCoins(d) {
        state.coins = Math.max(0, Math.floor(state.coins + (Number(d) || 0)));
        save(state);
      },
    };

    return window.SharedWallet;
  }

  const SW = ensureSharedWallet();

  // =========================
  // 1) Helpers
  // =========================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function coins() {
    return Math.floor(Number(SW.getCoins()) || 0);
  }
  function setCoins(v) {
    SW.setCoins(v);
    syncBalanceUI();
  }
  function addCoins(d) {
    SW.addCoins(d);
    syncBalanceUI();
  }

  // =========================
  // 2) Sound (тихо) + toggle
  // =========================
  const SOUND_KEY = "triniti_sound_v1";
  let soundOn = (localStorage.getItem(SOUND_KEY) ?? "1") === "1";

  function beep(freq = 520, ms = 55, vol = 0.03) {
    if (!soundOn) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, ms);
    } catch {}
  }

  function applySoundUI() {
    const soundTxt = $("#soundTxt");
    const soundDot = $("#soundDot");
    if (soundTxt) soundTxt.textContent = soundOn ? "Звук on" : "Звук off";
    if (soundDot) {
      soundDot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
      soundDot.style.boxShadow = soundOn
        ? "0 0 0 3px rgba(38,212,123,.14)"
        : "0 0 0 3px rgba(255,90,106,.14)";
    }
  }

  // =========================
  // 3) Balance UI sync
  // =========================
  function syncBalanceUI() {
    const bal = $("#bal");
    if (bal) bal.textContent = String(coins());
  }

  // обновление, если баланс менялся в другой вкладке/странице
  window.addEventListener("storage", (e) => {
    if (e.key === WALLET_KEY) syncBalanceUI();
  });

  // =========================
  // 4) Header buttons
  // =========================
  function initHeader() {
    const soundBtn = $("#soundBtn");
    const bonusBtn = $("#bonusBtn");
    const freeTile = $("#freeChipsTile");

    applySoundUI();
    syncBalanceUI();

    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        soundOn = !soundOn;
        localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
        applySoundUI();
        beep(soundOn ? 640 : 240, 60, 0.03);
      });
    }

    // +1000 на главной (кнопка в шапке)
    if (bonusBtn) {
      bonusBtn.addEventListener("click", () => {
        addCoins(1000);
        beep(760, 70, 0.03);
      });
    }

    // +1000 на плитке "Free chips"
    if (freeTile) {
      freeTile.addEventListener("click", () => {
        addCoins(1000);
        beep(760, 70, 0.03);
        // небольшой визуальный фидбек, если CSS поддержит
        freeTile.classList.add("pulse");
        setTimeout(() => freeTile.classList.remove("pulse"), 250);
      });
    }

    // TG/VK кнопки — просто заглушки (без ошибок)
    const tgBtn = $("#tgBtn");
    const vkBtn = $("#vkBtn");
    if (tgBtn) tgBtn.addEventListener("click", () => beep(520, 50, 0.02));
    if (vkBtn) vkBtn.addEventListener("click", () => beep(520, 50, 0.02));
  }

  // =========================
  // 5) Tabs фильтр игр
  // =========================
  function initTabs() {
    const tabs = $$(".tab");
    const grid = $("#gamesGrid");
    if (!tabs.length || !grid) return;

    function setTab(name) {
      tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === name));

      const cards = $$("#gamesGrid .gameCard");
      cards.forEach((c) => {
        const g = c.dataset.group || "other";
        const show = name === "all" ? true : g === name;
        c.style.display = show ? "" : "none";
      });
    }

    tabs.forEach((t) => {
      t.addEventListener("click", () => {
        setTab(t.dataset.tab || "all");
        beep(520, 45, 0.02);
      });
    });

    setTab("all");
  }

  // =========================
  // 6) Bottom nav jump
  // =========================
  function initBottomNav() {
    const items = $$(".bItem[data-jump]");
    if (!items.length) return;

    items.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-jump");
        if (!target) return;

        const el = document.querySelector(target);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          items.forEach((b) => b.classList.toggle("active", b === btn));
          beep(520, 45, 0.02);
        }
      });
    });

    // support/menu — без алертов
    const supportBtn = $("#supportBtn");
    const menuBtn = $("#menuBtn");
    if (supportBtn) supportBtn.addEventListener("click", () => beep(520, 50, 0.02));
    if (menuBtn) menuBtn.addEventListener("click", () => beep(520, 50, 0.02));
  }

  // =========================
  // 7) Search (простой)
  // =========================
  function initSearch() {
    const btn = $("#searchBtn");
    const grid = $("#gamesGrid");
    if (!btn || !grid) return;

    btn.addEventListener("click", () => {
      const q = (prompt("Поиск игры (например: mines, wheel, rps)") || "").trim().toLowerCase();
      if (!q) return;

      const cards = $$("#gamesGrid .gameCard");
      let any = false;

      cards.forEach((c) => {
        const text = (c.textContent || "").toLowerCase();
        const show = text.includes(q);
        c.style.display = show ? "" : "none";
        if (show) any = true;
      });

      // если ничего — вернём все
      if (!any) {
        cards.forEach((c) => (c.style.display = ""));
      }

      beep(520, 45, 0.02);
    });
  }

  // =========================
  // 8) Init
  // =========================
  function init() {
    initHeader();
    initTabs();
    initBottomNav();
    initSearch();
    syncBalanceUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // на всякий — обновим баланс после полной загрузки
  window.addEventListener("load", syncBalanceUI);
})();