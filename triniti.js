(() => {
  const API_BASE = "http://localhost:4000/api";
  const TOKEN_KEY = "triniti_token_v1";
  const EMAIL = "test@test.com";
  const PASSWORD = "12345678";

  const PROMO_KEY_USED = "triniti_promo_used_v1";
  const DAILY_NEXT_KEY = "triniti_daily_next_ms_v3";
  const VK_KEY = "triniti_bonus_vk_v2";
  const TG_KEY = "triniti_bonus_tg_v2";

  const PROMOS = {
    TRINITI5: 5,
    TRINITI10: 10,
    TRINITI25: 25
  };

  const PRIZES = [
    { label: "+0 🪙", coins: 0 },
    { label: "+5 🪙", coins: 5 },
    { label: "+10 🪙", coins: 10 },
    { label: "+15 🪙", coins: 15 },
    { label: "+20 🪙", coins: 20 },
    { label: "+25 🪙", coins: 25 }
  ];

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  let audioCtx = null;
  let spinning = false;
  let lastRotation = 0;

  function getCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }

  function beep(freq = 520, ms = 60, vol = 0.03) {
    try {
      const ctx = getCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + ms / 1000);
    } catch {}
  }

  async function api(path, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    const res = await fetch(API_BASE + path, {
      ...options,
      headers
    });

    const text = await res.text();
    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || "Ошибка запроса");
    }

    return data;
  }

  async function ensureAuth() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) return token;

    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: EMAIL,
          password: PASSWORD
        })
      });
    } catch {}

    const loginData = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD
      })
    });

    localStorage.setItem(TOKEN_KEY, loginData.token);
    return loginData.token;
  }

  async function fetchBalance() {
    const data = await api("/wallet/balance", {
      method: "GET"
    });

    return Number(data.balance || 0);
  }

  async function syncBalanceUI() {
    try {
      await ensureAuth();
      const balance = await fetchBalance();

      if ($("balance")) $("balance").textContent = String(balance);
      if ($("balance2")) $("balance2").textContent = String(balance);
      if ($("balanceRail")) $("balanceRail").textContent = String(balance);
    } catch (e) {
      console.error("syncBalanceUI error:", e);
    }
  }

  async function depositReal() {
    try {
      await ensureAuth();

      const amountStr = prompt("Введите сумму пополнения:");
      if (amountStr === null) return;

      const amount = Number(amountStr);
      if (!amount || amount <= 0) {
        alert("Введите корректную сумму.");
        beep(240, 80, 0.03);
        return;
      }

      const created = await api("/deposit/create", {
        method: "POST",
        body: JSON.stringify({ amount })
      });

      await api("/deposit/confirm-test", {
        method: "POST",
        body: JSON.stringify({ depositId: created.depositId })
      });

      await syncBalanceUI();
      beep(760, 70, 0.03);
      setTimeout(() => beep(920, 70, 0.03), 90);

      alert(`Баланс пополнен на ${amount} 🪙`);
    } catch (e) {
      console.error(e);
      alert("Ошибка пополнения: " + e.message);
      beep(240, 80, 0.03);
    }
  }

  async function withdrawReal() {
    try {
      await ensureAuth();

      const balance = await fetchBalance();

      const amountStr = prompt("Введите сумму вывода:");
      if (amountStr === null) return;

      const amount = Number(amountStr);
      if (!amount || amount <= 0) {
        alert("Введите корректную сумму.");
        beep(240, 80, 0.03);
        return;
      }

      if (amount > balance) {
        alert("Недостаточно средств.");
        beep(240, 80, 0.03);
        return;
      }

      const requisites = prompt("Введите реквизиты для тестового вывода:", "test-card");
      if (requisites === null) return;

      const created = await api("/withdraw/create", {
        method: "POST",
        body: JSON.stringify({
          amount,
          requisites
        })
      });

      await api("/withdraw/confirm-test", {
        method: "POST",
        body: JSON.stringify({
          withdrawalId: created.withdrawalId
        })
      });

      await syncBalanceUI();
      beep(760, 70, 0.03);
      setTimeout(() => beep(520, 70, 0.03), 90);

      alert(`Вывод на ${amount} 🪙 выполнен`);
    } catch (e) {
      console.error(e);
      alert("Ошибка вывода: " + e.message);
      beep(240, 80, 0.03);
    }
  }

  function initPaymentButtons() {
    $("depositBtn")?.addEventListener("click", depositReal);
    $("withdrawBtn")?.addEventListener("click", withdrawReal);
    $("depositBtnMobile")?.addEventListener("click", depositReal);
    $("withdrawBtnMobile")?.addEventListener("click", withdrawReal);
  }

  const modals = {
    free: $("freeModal"),
    promo: $("promoModal"),
    support: $("supportModal")
  };

  function openModal(name) {
    const modal = modals[name];
    if (!modal) return;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    beep(520, 50, 0.02);
  }

  function closeModal(name) {
    const modal = modals[name];
    if (!modal) return;

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    beep(420, 50, 0.02);
  }

  function initModals() {
    $("freeClose")?.addEventListener("click", () => closeModal("free"));
    $("promoClose")?.addEventListener("click", () => closeModal("promo"));
    $("supportClose")?.addEventListener("click", () => closeModal("support"));

    Object.entries(modals).forEach(([name, modal]) => {
      modal?.addEventListener("click", (e) => {
        if (e.target?.dataset?.close) closeModal(name);
      });
    });

    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;

      Object.entries(modals).forEach(([name, modal]) => {
        if (modal?.classList.contains("open")) {
          closeModal(name);
        }
      });
    });

    $$("[data-open]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const name = el.getAttribute("data-open");
        if (!name) return;

        e.preventDefault();
        openModal(name);
      });
    });
  }

  function setActiveInGroup(selector, activeEl) {
    $$(selector).forEach((el) => {
      el.classList.toggle("active", el === activeEl);
    });
  }

  function updateMenuStateByTarget(targetSelector) {
    if (!targetSelector) return;

    if (targetSelector === "#heroTop") {
      const sidebarHome = document.querySelector('.sideItem[data-jump="#heroTop"]');
      const bottomHome = document.querySelector('.mobileBottomNav__item[data-jump="#heroTop"]');

      if (sidebarHome) setActiveInGroup(".sideItem", sidebarHome);
      if (bottomHome) setActiveInGroup(".mobileBottomNav__item", bottomHome);
    }

    if (targetSelector === "#featuredSec") {
      const sidebarFeatured = document.querySelector('.sideItem[data-jump="#featuredSec"]');
      const toolbarFeatured = document.querySelector('.toolbarTab[data-jump="#featuredSec"]');

      if (sidebarFeatured) setActiveInGroup(".sideItem", sidebarFeatured);
      if (toolbarFeatured) setActiveInGroup(".toolbarTab", toolbarFeatured);
    }

    if (targetSelector === "#gamesSec") {
      const topGames = document.querySelector('.navPill[data-jump="#gamesSec"], .navPill[data-jump="#games"], .navPill[data-jump="#gamesSec"], .navPill[data-jump="#games"]');
      const sidebarGames = document.querySelector('.sideItem[data-jump="#gamesSec"]');
      const toolbarGames = document.querySelector('.toolbarTab[data-jump="#gamesSec"]');
      const bottomGames = document.querySelector('.mobileBottomNav__item[data-jump="#gamesSec"]');

      if (topGames) setActiveInGroup(".navPill", topGames);
      if (sidebarGames) setActiveInGroup(".sideItem", sidebarGames);
      if (toolbarGames) setActiveInGroup(".toolbarTab", toolbarGames);
      if (bottomGames) setActiveInGroup(".mobileBottomNav__item", bottomGames);
    }
  }

  function initJumpButtons() {
    const jumpButtons = $$("[data-jump]");

    jumpButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const selector = btn.getAttribute("data-jump");
        const target = selector ? document.querySelector(selector) : null;

        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }

        if (btn.classList.contains("navPill")) {
          setActiveInGroup(".navPill", btn);
        }

        if (btn.classList.contains("sideItem")) {
          setActiveInGroup(".sideItem", btn);
        }

        if (btn.classList.contains("toolbarTab")) {
          setActiveInGroup(".toolbarTab", btn);
        }

        if (btn.classList.contains("mobileBottomNav__item")) {
          setActiveInGroup(".mobileBottomNav__item", btn);
        }

        updateMenuStateByTarget(selector);
        beep(520, 45, 0.02);
      });
    });
  }

  function initPressFeedback() {
    $$(".pressable").forEach((el) => {
      el.addEventListener("pointerdown", () => {
        el.classList.add("is-pressed");
      });

      const clear = () => el.classList.remove("is-pressed");
      el.addEventListener("pointerup", clear);
      el.addEventListener("pointerleave", clear);
      el.addEventListener("pointercancel", clear);
    });
  }

  function initPromo() {
    $("promoApply")?.addEventListener("click", async () => {
      const input = ($("promoInput")?.value || "").trim().toUpperCase();
      const msg = $("promoMsg");

      if (!input) {
        if (msg) msg.textContent = "Введите промокод.";
        beep(240, 80, 0.03);
        return;
      }

      let used = {};
      try {
        used = JSON.parse(localStorage.getItem(PROMO_KEY_USED) || "{}");
      } catch {}

      if (used[input]) {
        if (msg) msg.textContent = "Этот промокод уже использован.";
        beep(240, 80, 0.03);
        return;
      }

      const reward = PROMOS[input];
      if (!reward) {
        if (msg) msg.textContent = "Неверный промокод.";
        beep(240, 80, 0.03);
        return;
      }

      used[input] = 1;
      localStorage.setItem(PROMO_KEY_USED, JSON.stringify(used));

      try {
        await ensureAuth();

        const created = await api("/deposit/create", {
          method: "POST",
          body: JSON.stringify({ amount: reward })
        });

        await api("/deposit/confirm-test", {
          method: "POST",
          body: JSON.stringify({ depositId: created.depositId })
        });

        await syncBalanceUI();

        if (msg) msg.textContent = `Промокод активирован: +${reward} 🪙 ✅`;
        beep(760, 70, 0.03);
        setTimeout(() => beep(920, 70, 0.03), 90);
      } catch (e) {
        console.error(e);
        if (msg) msg.textContent = "Ошибка активации промокода.";
        beep(240, 80, 0.03);
      }
    });
  }

  function rngInt(n) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  }

  function getNextTs() {
    const value = Number(localStorage.getItem(DAILY_NEXT_KEY) || 0);
    return Number.isFinite(value) ? value : 0;
  }

  function setNextTs24h() {
    const next = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(DAILY_NEXT_KEY, String(next));
    return next;
  }

  function canSpinNow() {
    return Date.now() >= getNextTs();
  }

  function fmt(ms) {
    const safe = Math.max(0, ms);
    const s = Math.floor(safe / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  function renderTimer() {
    const timer = $("dailyTimer");
    if (!timer) return;

    timer.textContent = canSpinNow() ? "00:00:00" : fmt(getNextTs() - Date.now());
  }

  function renderPrizes() {
    const prizeList = $("prizeList");
    if (!prizeList) return;

    prizeList.innerHTML = "";
    PRIZES.forEach((p) => {
      const el = document.createElement("div");
      el.className = "prizeItem";
      el.innerHTML = `<div class="p">${p.label}</div><div class="t">в кошелёк</div>`;
      prizeList.appendChild(el);
    });
  }

  function drawWheel() {
    const wheelCanvas = $("dailyWheel");
    if (!wheelCanvas) return;

    const ctx = wheelCanvas.getContext("2d");
    const W = wheelCanvas.width;
    const H = wheelCanvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) * 0.48;

    ctx.clearRect(0, 0, W, H);

    const n = PRIZES.length;
    const step = (Math.PI * 2) / n;

    const colors = [
      "rgba(76,125,255,.35)",
      "rgba(255,86,186,.30)",
      "rgba(54,220,170,.28)",
      "rgba(255,196,66,.28)",
      "rgba(176,64,255,.30)",
      "rgba(76,125,255,.28)"
    ];

    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i * step;
      const a1 = a0 + step;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();

      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,.14)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a0 + step / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.font = "950 26px ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial";
      ctx.fillText(PRIZES[i].label, r - 16, 10);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  function spinToIndex(winIndex) {
    const wheelCanvas = $("dailyWheel");

    return new Promise((resolve) => {
      if (!wheelCanvas) {
        resolve();
        return;
      }

      const n = PRIZES.length;
      const step = (Math.PI * 2) / n;

      const ideal = -((winIndex + 0.5) * step);
      const fullTurns = 5 + rngInt(3);
      const target = lastRotation + fullTurns * (Math.PI * 2) + ideal;

      wheelCanvas.style.transition = "transform 1400ms cubic-bezier(.16,.9,.18,1)";
      wheelCanvas.style.transform = `rotate(${target}rad)`;

      const onEnd = () => {
        wheelCanvas.removeEventListener("transitionend", onEnd);
        lastRotation = target % (Math.PI * 2);
        resolve();
      };

      wheelCanvas.addEventListener("transitionend", onEnd, { once: true });
    });
  }

  async function onSpin() {
    const spinBtn = $("spinBtn");
    const wheelCenterTxt = $("wheelCenterTxt");
    const wheelCenterSub = $("wheelCenterSub");
    const dailyMsg = $("dailyMsg");

    if (spinning) return;

    if (!canSpinNow()) {
      renderTimer();
      if (dailyMsg) dailyMsg.textContent = "Пока нельзя. Дождись таймера 😉";
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

    try {
      await ensureAuth();

      if (prize.coins > 0) {
        const created = await api("/deposit/create", {
          method: "POST",
          body: JSON.stringify({ amount: prize.coins })
        });

        await api("/deposit/confirm-test", {
          method: "POST",
          body: JSON.stringify({ depositId: created.depositId })
        });
      }

      await syncBalanceUI();
    } catch (e) {
      console.error(e);
    }

    setNextTs24h();
    renderTimer();

    if (wheelCenterTxt) wheelCenterTxt.textContent = `+${prize.coins}`;
    if (wheelCenterSub) wheelCenterSub.textContent = "🪙 начислено";
    if (dailyMsg) dailyMsg.textContent = `Выпало: ${prize.label} — начислено ✅`;

    beep(760, 70, 0.03);
    setTimeout(() => beep(920, 70, 0.03), 90);

    spinning = false;
    if (spinBtn) spinBtn.disabled = false;
  }

  function initWheel() {
    $("spinBtn")?.addEventListener("click", onSpin);
  }

  function renderSocial() {
    const vkDone = localStorage.getItem(VK_KEY) === "1";
    const tgDone = localStorage.getItem(TG_KEY) === "1";

    if ($("vkState")) $("vkState").textContent = vkDone ? "Получено ✅" : "Не получено";
    if ($("tgState")) $("tgState").textContent = tgDone ? "Получено ✅" : "Не получено";

    if ($("claimVK")) $("claimVK").disabled = vkDone;
    if ($("claimTG")) $("claimTG").disabled = tgDone;
  }

  async function claimOnce(key, amount) {
    if (localStorage.getItem(key) === "1") return;

    try {
      await ensureAuth();

      const created = await api("/deposit/create", {
        method: "POST",
        body: JSON.stringify({ amount })
      });

      await api("/deposit/confirm-test", {
        method: "POST",
        body: JSON.stringify({ depositId: created.depositId })
      });

      localStorage.setItem(key, "1");
      renderSocial();
      await syncBalanceUI();

      beep(760, 70, 0.03);
      setTimeout(() => beep(920, 70, 0.03), 90);
    } catch (e) {
      console.error(e);
      alert("Ошибка начисления бонуса");
    }
  }

  function initSocial() {
    $("claimVK")?.addEventListener("click", () => claimOnce(VK_KEY, 10));
    $("claimTG")?.addEventListener("click", () => claimOnce(TG_KEY, 10));
  }

  function setTab(which) {
    const daily = which === "daily";

    $("tabDaily")?.classList.toggle("active", daily);
    $("tabSocial")?.classList.toggle("active", !daily);
    $("paneDaily")?.classList.toggle("hidden", !daily);
    $("paneSocial")?.classList.toggle("hidden", daily);

    beep(520, 45, 0.02);
  }

  function initTabs() {
    $("tabDaily")?.addEventListener("click", () => setTab("daily"));
    $("tabSocial")?.addEventListener("click", () => setTab("social"));
  }

  function initSupportButtons() {
    $$('[data-beep="1"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        beep(520, 55, 0.02);
      });
    });
  }

  function initFocusSync() {
    window.addEventListener("focus", async () => {
      try {
        await syncBalanceUI();
        renderTimer();
        renderSocial();
      } catch {}
    });
  }

  async function init() {
    if (!localStorage.getItem(DAILY_NEXT_KEY)) {
      localStorage.setItem(DAILY_NEXT_KEY, "0");
    }

    initPressFeedback();
    initPaymentButtons();
    initModals();
    initJumpButtons();
    initPromo();
    initWheel();
    initSocial();
    initTabs();
    initSupportButtons();
    initFocusSync();

    renderPrizes();
    drawWheel();
    renderTimer();
    renderSocial();

    const wheelCanvas = $("dailyWheel");
    if (wheelCanvas) {
      wheelCanvas.style.transform = "rotate(0rad)";
      wheelCanvas.style.transformOrigin = "50% 50%";
    }

    try {
      await ensureAuth();
      await syncBalanceUI();
    } catch (e) {
      console.error("Init auth error:", e);
    }

    setInterval(() => {
      renderTimer();
    }, 1000);
  }

  init();
})();
