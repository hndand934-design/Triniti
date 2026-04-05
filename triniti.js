(function () {
  const WALLET_KEY_FALLBACK = "triniti_shared_wallet";
  const AUTH_KEY = "triniti_user_registered";
  const PROMO_USED_KEY = "triniti_promo_used_v1";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function readWallet() {
    try {
      if (window.TrinitiWallet && typeof window.TrinitiWallet.get === "function") {
        return safeNumber(window.TrinitiWallet.get(), 0);
      }
    } catch (_) {}

    const raw = localStorage.getItem(WALLET_KEY_FALLBACK);
    return safeNumber(raw, 0);
  }

  function writeWallet(value) {
    const amount = Math.max(0, safeNumber(value, 0));

    try {
      if (window.TrinitiWallet && typeof window.TrinitiWallet.set === "function") {
        window.TrinitiWallet.set(amount);
        return amount;
      }
    } catch (_) {}

    localStorage.setItem(WALLET_KEY_FALLBACK, String(amount));
    return amount;
  }

  function addWallet(amount) {
    const next = readWallet() + safeNumber(amount, 0);
    return writeWallet(next);
  }

  function formatMoney(v) {
    return safeNumber(v, 0).toLocaleString("ru-RU");
  }

  function isRegistered() {
    return localStorage.getItem(AUTH_KEY) === "1";
  }

  function setRegistered(flag) {
    localStorage.setItem(AUTH_KEY, flag ? "1" : "0");
  }

  function updateBalanceUI() {
    const value = formatMoney(readWallet());
    const balance = $("#balance");
    const balance2 = $("#balance2");

    if (balance) balance.textContent = value;
    if (balance2) balance2.textContent = value;
  }

  function updateOnlineUI() {
    const base = 182;
    const offset = Math.floor(Math.random() * 9) - 4;
    const value = Math.max(150, base + offset);

    const online = $("#onlineCount");
    const onlineMobile = $("#onlineCountMobile");

    if (online) online.textContent = String(value);
    if (onlineMobile) onlineMobile.textContent = String(value);
  }

  function syncLocks() {
    const locked = !isRegistered();

    $$(".gameCard").forEach((card) => {
      card.dataset.locked = locked ? "1" : "0";
    });

    [
      "#depositBtn",
      "#withdrawBtn",
      "#depositBtnMobile",
      "#withdrawBtnMobile",
      "#heroDepositBtn",
      "#heroDepositBtnMobile"
    ].forEach((selector) => {
      const el = $(selector);
      if (!el) return;
      el.classList.toggle("is-locked", locked);
    });
  }

  function bindAuthButtons() {
    const loginAction = () => {
      setRegistered(true);
      if (readWallet() <= 0) writeWallet(1000);
      syncLocks();
      updateBalanceUI();
      alert("Вход выполнен. Доступ к режимам открыт.");
    };

    const registerAction = () => {
      setRegistered(true);
      if (readWallet() <= 0) writeWallet(1000);
      syncLocks();
      updateBalanceUI();
      alert("Регистрация завершена. Режимы разблокированы.");
    };

    [
      "#loginBtn",
      "#loginBtnMobile"
    ].forEach((selector) => {
      const el = $(selector);
      if (el) el.addEventListener("click", loginAction);
    });

    [
      "#registerBtn",
      "#registerBtnMobile"
    ].forEach((selector) => {
      const el = $(selector);
      if (el) el.addEventListener("click", registerAction);
    });
  }

  function bindWalletButtons() {
    const depositAction = () => {
      if (!isRegistered()) {
        alert("Сначала войди или зарегистрируйся.");
        return;
      }
      addWallet(500);
      updateBalanceUI();
      alert("Баланс пополнен на 500 ₽");
    };

    const withdrawAction = () => {
      if (!isRegistered()) {
        alert("Сначала войди или зарегистрируйся.");
        return;
      }
      alert("Запрос на вывод отправлен.");
    };

    [
      "#depositBtn",
      "#depositBtnMobile",
      "#heroDepositBtn",
      "#heroDepositBtnMobile"
    ].forEach((selector) => {
      const el = $(selector);
      if (el) el.addEventListener("click", depositAction);
    });

    [
      "#withdrawBtn",
      "#withdrawBtnMobile"
    ].forEach((selector) => {
      const el = $(selector);
      if (el) el.addEventListener("click", withdrawAction);
    });
  }

  function bindGameLocks() {
    $$(".gameCard").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (isRegistered()) return;
        e.preventDefault();
        alert("Этот режим откроется после регистрации.");
      });
    });
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");

    if (!$(".modal.open")) {
      document.body.style.overflow = "";
    }
  }

  function bindModals() {
    const freeModal = $("#freeModal");
    const promoModal = $("#promoModal");
    const supportModal = $("#supportModal");

    $$("[data-open='free']").forEach((btn) => {
      btn.addEventListener("click", () => openModal(freeModal));
    });

    $$("[data-open='promo']").forEach((btn) => {
      btn.addEventListener("click", () => openModal(promoModal));
    });

    $$("[data-open='support']").forEach((btn) => {
      btn.addEventListener("click", () => openModal(supportModal));
    });

    [
      ["#freeClose", freeModal],
      ["#promoClose", promoModal],
      ["#supportClose", supportModal]
    ].forEach(([selector, modal]) => {
      const el = $(selector);
      if (el) el.addEventListener("click", () => closeModal(modal));
    });

    $$(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.matches("[data-close='1']")) {
          closeModal(modal);
        }
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      $$(".modal.open").forEach((modal) => closeModal(modal));
    });
  }

  function bindTabs() {
    const tabDaily = $("#tabDaily");
    const tabSocial = $("#tabSocial");
    const paneDaily = $("#paneDaily");
    const paneSocial = $("#paneSocial");

    if (tabDaily && tabSocial && paneDaily && paneSocial) {
      tabDaily.addEventListener("click", () => {
        tabDaily.classList.add("active");
        tabSocial.classList.remove("active");
        paneDaily.classList.remove("hidden");
        paneSocial.classList.add("hidden");
      });

      tabSocial.addEventListener("click", () => {
        tabSocial.classList.add("active");
        tabDaily.classList.remove("active");
        paneSocial.classList.remove("hidden");
        paneDaily.classList.add("hidden");
      });
    }
  }

  function bindPromo() {
    const input = $("#promoInput");
    const apply = $("#promoApply");
    const msg = $("#promoMsg");

    if (!input || !apply || !msg) return;

    apply.addEventListener("click", () => {
      const code = input.value.trim().toUpperCase();

      if (!code) {
        msg.textContent = "Введи промокод.";
        return;
      }

      if (localStorage.getItem(PROMO_USED_KEY) === "1") {
        msg.textContent = "Промокод уже использован.";
        return;
      }

      if (code === "TRINITI100") {
        addWallet(100);
        updateBalanceUI();
        localStorage.setItem(PROMO_USED_KEY, "1");
        msg.textContent = "Промокод активирован. +100 ₽";
      } else {
        msg.textContent = "Неверный промокод.";
      }
    });
  }

  function bindSocialClaims() {
    const vkBtn = $("#claimVK");
    const tgBtn = $("#claimTG");
    const vkState = $("#vkState");
    const tgState = $("#tgState");

    if (vkBtn && vkState) {
      vkBtn.addEventListener("click", () => {
        if (vkBtn.disabled) return;
        addWallet(10);
        updateBalanceUI();
        vkState.textContent = "Получено";
        vkBtn.disabled = true;
      });
    }

    if (tgBtn && tgState) {
      tgBtn.addEventListener("click", () => {
        if (tgBtn.disabled) return;
        addWallet(10);
        updateBalanceUI();
        tgState.textContent = "Получено";
        tgBtn.disabled = true;
      });
    }
  }

  function bindJumpButtons() {
    $$("[data-jump]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const selector = btn.getAttribute("data-jump");
        if (!selector) return;

        const target = document.querySelector(selector);
        if (!target) return;

        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        if (btn.classList.contains("mobileBottomNav__item")) {
          $$(".mobileBottomNav__item").forEach((item) => item.classList.remove("active"));
          btn.classList.add("active");
        }
      });
    });
  }

  function startTimer() {
    const timer = $("#dailyTimer");
    if (!timer) return;

    let total = 8 * 60 * 60;

    setInterval(() => {
      const h = String(Math.floor(total / 3600)).padStart(2, "0");
      const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
      const s = String(total % 60).padStart(2, "0");

      timer.textContent = `${h}:${m}:${s}`;

      total -= 1;
      if (total < 0) total = 8 * 60 * 60;
    }, 1000);
  }

  function renderPrizeList() {
    const wrap = $("#prizeList");
    if (!wrap) return;

    const prizes = ["5 ₽", "10 ₽", "15 ₽", "25 ₽", "50 ₽", "75 ₽", "100 ₽", "150 ₽"];

    wrap.innerHTML = prizes
      .map((p) => `<div class="prizeItem"><span>${p}</span><span class="p">шанс</span></div>`)
      .join("");
  }

  function drawWheel() {
    const canvas = $("#dailyWheel");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prizes = ["5", "10", "15", "25", "50", "75", "100", "150"];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = 220;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    prizes.forEach((label, i) => {
      const start = (Math.PI * 2 * i) / prizes.length - Math.PI / 2;
      const end = (Math.PI * 2 * (i + 1)) / prizes.length - Math.PI / 2;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();

      ctx.fillStyle = i % 2 === 0 ? "#c49144" : "#f1d08a";
      ctx.fill();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((start + end) / 2);
      ctx.fillStyle = "#24170a";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(label, r - 30, 8);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    ctx.stroke();
  }

  function bindSpin() {
    const spinBtn = $("#spinBtn");
    const msg = $("#dailyMsg");
    if (!spinBtn || !msg) return;

    const prizes = [5, 10, 15, 25, 50, 75, 100, 150];

    spinBtn.addEventListener("click", () => {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      const prize = prizes[arr[0] % prizes.length];

      addWallet(prize);
      updateBalanceUI();
      msg.textContent = `Ты получил ${prize} ₽`;
    });
  }

  function init() {
    if (readWallet() < 0) writeWallet(0);

    updateBalanceUI();
    updateOnlineUI();
    syncLocks();
    bindAuthButtons();
    bindWalletButtons();
    bindGameLocks();
    bindModals();
    bindTabs();
    bindPromo();
    bindSocialClaims();
    bindJumpButtons();
    startTimer();
    renderPrizeList();
    drawWheel();
    bindSpin();

    setInterval(updateOnlineUI, 9000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
