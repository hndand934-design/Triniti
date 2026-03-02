(() => {
  // =========================
  // Shared Wallet helper
  // =========================
  const SW = window.SharedWallet;
  const Wallet = (() => {
    if (SW && typeof SW.getCoins === "function" && typeof SW.setCoins === "function" && typeof SW.addCoins === "function") {
      return {
        get: () => Math.floor(Number(SW.getCoins()) || 0),
        set: (v) => SW.setCoins(Math.max(0, Math.floor(Number(v) || 0))),
        add: (d) => SW.addCoins(Math.floor(Number(d) || 0)),
      };
    }
    const KEY = "triniti_shared_wallet_fallback_v1";
    const load = () => {
      try {
        const j = JSON.parse(localStorage.getItem(KEY) || "null");
        if (j && typeof j.coins === "number") return { coins: j.coins };
      } catch {}
      return { coins: 1000 };
    };
    const st = load();
    const save = () => localStorage.setItem(KEY, JSON.stringify({ coins: st.coins }));
    return {
      get: () => Math.floor(Number(st.coins) || 0),
      set: (v) => { st.coins = Math.max(0, Math.floor(Number(v) || 0)); save(); },
      add: (d) => { st.coins = Math.max(0, Math.floor((Number(st.coins)||0) + (Number(d)||0))); save(); },
    };
  })();

  const $ = (id) => document.getElementById(id);

  function syncBalances() {
    const c = Wallet.get();
    ["balance", "balance2", "mBalance"].forEach((x) => {
      const el = $(x);
      if (el) el.textContent = String(c);
    });
  }

  // =========================
  // Sound toggle (тихо)
  // =========================
  const SOUND_KEY = "triniti_sound_v2";
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
      setTimeout(() => { o.stop(); ctx.close(); }, ms);
    } catch {}
  }

  function renderSoundUI() {
    const txt = $("soundText");
    const dot = $("soundDot");
    if (txt) txt.textContent = soundOn ? "Звук on" : "Звук off";
    if (dot) {
      dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
      dot.style.boxShadow = soundOn
        ? "0 0 0 3px rgba(38,212,123,.14)"
        : "0 0 0 3px rgba(255,90,106,.14)";
    }
  }

  // =========================
  // Deposit/Withdraw (заглушки)
  // =========================
  function attachMoneyButtons() {
    const handlers = [
      ["depositBtn", "Пополнение сейчас виртуальное (без вывода)."],
      ["withdrawBtn", "Вывод отключён. Монеты виртуальные."],
      ["mDepositBtn", "Пополнение сейчас виртуальное (без вывода)."],
      ["mWithdrawBtn", "Вывод отключён. Монеты виртуальные."],
    ];
    handlers.forEach(([id, msg]) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("click", () => { beep(520, 45, 0.02); alert(msg); });
    });
  }

  // =========================
  // Mobile tabs
  // =========================
  function initMobileTabs() {
    const tabs = Array.from(document.querySelectorAll(".mTab"));
    const panes = Array.from(document.querySelectorAll(".mPane"));
    if (!tabs.length || !panes.length) return;

    const setPane = (name) => {
      tabs.forEach((t) => t.classList.toggle("active", t.dataset.pane === name));
      panes.forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== name));
    };

    tabs.forEach((t) => t.addEventListener("click", () => { beep(520, 45, 0.02); setPane(t.dataset.pane); }));
    setPane("games");
  }

  // =========================
  // FREE WHEEL (красивое + точное попадание)
  // =========================
  const FREE_KEY = "triniti_freewheel_v3";
  const DAY = 24 * 60 * 60 * 1000;

  // 6 секторов как ты просил
  const PRIZES = [0, 5, 10, 15, 20, 25];

  // яркие цвета как на примере (каждый сектор разный)
  const COLORS = [
    ["#00D08A", "#00A06B"], // green
    ["#20B7FF", "#1B79FF"], // blue
    ["#8A5CFF", "#5B2CFF"], // purple
    ["#FF4FB1", "#C92B8A"], // pink
    ["#FFB020", "#FF7A00"], // orange
    ["#FFD14A", "#FF9E2C"], // gold
  ];

  function randInt(max) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % max;
  }

  function loadFree() {
    try {
      const j = JSON.parse(localStorage.getItem(FREE_KEY) || "null");
      if (j && typeof j.lastTs === "number") return j;
    } catch {}
    return { lastTs: 0, lastPrize: null };
  }
  function saveFree(s) { localStorage.setItem(FREE_KEY, JSON.stringify(s)); }

  let freeState = loadFree();
  let spinning = false;

  // угол колеса (0 = сектор 0 начинается на стрелке справа)
  let wheelAngle = 0;

  const TWO_PI = Math.PI * 2;

  function norm(a) {
    a %= TWO_PI;
    if (a < 0) a += TWO_PI;
    return a;
  }

  function msLeft() {
    const now = Date.now();
    const next = freeState.lastTs + DAY;
    return Math.max(0, next - now);
  }

  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  function currentIndexAtPointer() {
    // Стрелка у нас на ПРАВО (угол 0 радиан).
    // Секторы начинаются с wheelAngle.
    // Значит смотрим, какая часть круга находится в точке 0.
    const seg = TWO_PI / PRIZES.length;
    const rel = norm(0 - wheelAngle);           // сколько "вперед" от начала сектора 0
    const idx = Math.floor(rel / seg);          // 0..N-1
    return Math.min(PRIZES.length - 1, Math.max(0, idx));
  }

  function updateFreeUI() {
    const freeStatus = $("freeStatus");
    if (freeStatus) freeStatus.textContent = msLeft() === 0 ? "доступна" : "таймер";

    const t = fmtTime(msLeft());
    ["freeTimer", "mFreeTimer"].forEach((id) => { const el = $(id); if (el) el.textContent = t; });

    const lp = freeState.lastPrize == null ? "—" : `+${freeState.lastPrize} 🪙`;
    ["lastPrize", "mLastPrize"].forEach((id) => { const el = $(id); if (el) el.textContent = lp; });

    const can = msLeft() === 0 && !spinning;
    ["spinBtn", "mSpin"].forEach((id) => { const el = $(id); if (el) el.disabled = !can; });
  }

  function drawWheel(canvas) {
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    // делаем реально резким и одинаковым
    const rect = canvas.getBoundingClientRect();
    const cssSize = Math.max(260, Math.floor(rect.width || 520));
    const size = Math.floor(cssSize * dpr);

    canvas.width = size;
    canvas.height = size;

    const cx = size / 2, cy = size / 2;
    const r = size * 0.46;

    ctx.clearRect(0, 0, size, size);

    // outer rim
    const rimR = r * 1.09;
    const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, rimR);
    rimGrad.addColorStop(0, "rgba(255,255,255,.08)");
    rimGrad.addColorStop(0.6, "rgba(255,255,255,.10)");
    rimGrad.addColorStop(1, "rgba(0,0,0,.35)");

    ctx.beginPath();
    ctx.arc(cx, cy, rimR, 0, TWO_PI);
    ctx.fillStyle = rimGrad;
    ctx.fill();

    // segments
    const seg = TWO_PI / PRIZES.length;

    for (let i = 0; i < PRIZES.length; i++) {
      const a0 = wheelAngle + i * seg;
      const a1 = a0 + seg;

      const [c1, c2] = COLORS[i % COLORS.length];
      const grad = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r * 1.10);
      grad.addColorStop(0, "rgba(255,255,255,.14)");
      grad.addColorStop(0.35, c1);
      grad.addColorStop(1, c2);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,.22)";
      ctx.lineWidth = Math.max(1, size * 0.004);
      ctx.stroke();

      // text
      const mid = (a0 + a1) / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);

      ctx.fillStyle = "rgba(255,255,255,.96)";
      ctx.font = `900 ${Math.floor(size * 0.06)}px ui-sans-serif, system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,.55)";
      ctx.shadowBlur = size * 0.02;

      ctx.fillText(`${PRIZES[i]}`, r * 0.62, 0);

      // маленькая монетка
      ctx.font = `900 ${Math.floor(size * 0.045)}px ui-sans-serif, system-ui`;
      ctx.shadowBlur = size * 0.018;
      ctx.fillText("🪙", r * 0.76, 0);

      ctx.restore();
    }

    // inner shade
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.58, 0, TWO_PI);
    ctx.fillStyle = "rgba(0,0,0,.14)";
    ctx.fill();

    // highlight ring
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.98, 0, TWO_PI);
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = Math.max(1, size * 0.006);
    ctx.stroke();
  }

  function initWheelDrawing() {
    const canvases = [$("wheel"), $("mWheel")];
    const redraw = () => canvases.forEach(drawWheel);
    redraw();
    window.addEventListener("resize", redraw);
    return redraw;
  }

  function spinWheel(redraw) {
    if (spinning) return;
    if (msLeft() > 0) return;

    spinning = true;
    updateFreeUI();

    // хотим, чтобы реально выпадало разнообразно:
    // делаем случайный конечный угол, но так, чтобы сектор под стрелкой был рандомный.
    const seg = TWO_PI / PRIZES.length;
    const targetIdx = randInt(PRIZES.length);

    // центр нужного сектора должен прийти в угол 0 (стрелка справа)
    const targetCenter = targetIdx * seg + seg / 2;

    // добавим мелкий случайный "джиттер" внутри сектора (чтобы не всегда в центр)
    const jitter = (randInt(1000) / 1000 - 0.5) * seg * 0.35;

    // wheelAngle_final ≡ -(targetCenter + jitter) (mod 2π)
    const spins = 7 + randInt(5); // 7..11 оборотов
    const final = -(targetCenter + jitter) + spins * TWO_PI;

    const start = wheelAngle;
    const delta = final - start;

    const dur = 1650;
    const t0 = performance.now();

    function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }

    function frame(now) {
      const p = Math.min(1, (now - t0) / dur);
      wheelAngle = start + delta * easeOutQuint(p);
      redraw();

      if (p < 1) {
        requestAnimationFrame(frame);
        return;
      }

      // ВАЖНО: приз берём НЕ по targetIdx, а по факту сектора под стрелкой.
      // Тогда никогда не будет рассинхрона.
      const realIdx = currentIndexAtPointer();
      const prize = PRIZES[realIdx];

      Wallet.add(prize);
      syncBalances();

      freeState.lastTs = Date.now();
      freeState.lastPrize = prize;
      saveFree(freeState);

      const text = prize > 0
        ? `Выпало: +${prize} 🪙 — начислено в баланс.`
        : `Выпало: 0 🪙 — повезёт в следующий раз.`;

      const msgDesk = $("dailyMsg");
      const msgMob = $("mFreeMsg");
      if (msgDesk) msgDesk.textContent = text;
      if (msgMob) msgMob.textContent = text;

      beep(prize > 0 ? 920 : 240, 70, 0.03);

      spinning = false;
      updateFreeUI();
    }

    requestAnimationFrame(frame);
  }

  // =========================
  // Social bonuses (VK/TG)
  // =========================
  function initSocial() {
    const KEY_VK = "triniti_social_vk_v1";
    const KEY_TG = "triniti_social_tg_v1";
    const BONUS = 10;

    function render() {
      const gotVK = localStorage.getItem(KEY_VK) === "1";
      const gotTG = localStorage.getItem(KEY_TG) === "1";

      const vkTxt = gotVK ? "Получено ✅" : "Не получено";
      const tgTxt = gotTG ? "Получено ✅" : "Не получено";

      ["vkState", "mVKState"].forEach((id) => { const el = $(id); if (el) el.textContent = vkTxt; });
      ["tgState", "mTGState"].forEach((id) => { const el = $(id); if (el) el.textContent = tgTxt; });

      const claimVK = $("claimVK"); const claimTG = $("claimTG");
      const mClaimVK = $("mClaimVK"); const mClaimTG = $("mClaimTG");

      [claimVK, mClaimVK].forEach((b) => { if (b) b.disabled = gotVK; });
      [claimTG, mClaimTG].forEach((b) => { if (b) b.disabled = gotTG; });
    }

    function claim(which) {
      const key = which === "vk" ? KEY_VK : KEY_TG;
      if (localStorage.getItem(key) === "1") return;
      localStorage.setItem(key, "1");
      Wallet.add(BONUS);
      syncBalances();
      render();
      beep(920, 70, 0.03);
    }

    const claimVK = $("claimVK"); const claimTG = $("claimTG");
    const mClaimVK = $("mClaimVK"); const mClaimTG = $("mClaimTG");

    if (claimVK) claimVK.addEventListener("click", () => claim("vk"));
    if (mClaimVK) mClaimVK.addEventListener("click", () => claim("vk"));
    if (claimTG) claimTG.addEventListener("click", () => claim("tg"));
    if (mClaimTG) mClaimTG.addEventListener("click", () => claim("tg"));

    render();
  }

  // =========================
  // Promocodes
  // =========================
  const PROMOS = {
    "WELCOME10": 10,
    "TRINITI25": 25,
    "TRINITI5": 5,
  };

  function applyPromo(code, msgEl) {
    const raw = String(code || "").trim().toUpperCase();
    if (!raw) {
      if (msgEl) msgEl.textContent = "Введи промокод.";
      beep(240, 70, 0.03);
      return;
    }

    const amount = PROMOS[raw];
    if (!amount) {
      if (msgEl) msgEl.textContent = "Неверный промокод.";
      beep(240, 70, 0.03);
      return;
    }

    const usedKey = `triniti_promo_used_${raw}`;
    if (localStorage.getItem(usedKey) === "1") {
      if (msgEl) msgEl.textContent = "Этот промокод уже использован.";
      beep(240, 70, 0.03);
      return;
    }

    localStorage.setItem(usedKey, "1");
    Wallet.add(amount);
    syncBalances();

    if (msgEl) msgEl.textContent = `Активировано: +${amount} 🪙`;
    beep(920, 70, 0.03);
  }

  function initPromos() {
    const input = $("promoInput");
    const btn = $("promoApply");
    const msg = $("promoMsg");
    if (btn && input) btn.addEventListener("click", () => applyPromo(input.value, msg));

    const inputD = $("promoInputDesk");
    const btnD = $("promoApplyDesk");
    const msgD = $("promoMsgDesk");
    if (btnD && inputD) btnD.addEventListener("click", () => applyPromo(inputD.value, msgD));
  }

  // =========================
  // Modals (desktop)
  // =========================
  function setModal(modal, on) {
    if (!modal) return;
    modal.classList.toggle("show", !!on);
    modal.setAttribute("aria-hidden", on ? "false" : "true");
  }

  function initModals(redrawWheel) {
    const freeModal = $("freeModal");
    const promoModal = $("promoModal");

    const freeBtn = $("freeBtn");
    const freeBtn2 = $("freeBtn2");
    const freeClose = $("freeClose");

    const promoBtn = $("promoBtn");
    const promoClose = $("promoClose");

    if (freeBtn) freeBtn.addEventListener("click", () => { setModal(freeModal, true); redrawWheel(); beep(520,45,0.02); });
    if (freeBtn2) freeBtn2.addEventListener("click", () => { setModal(freeModal, true); redrawWheel(); beep(520,45,0.02); });
    if (freeClose) freeClose.addEventListener("click", () => setModal(freeModal, false));

    if (promoBtn) promoBtn.addEventListener("click", () => { setModal(promoModal, true); beep(520,45,0.02); });
    if (promoClose) promoClose.addEventListener("click", () => setModal(promoModal, false));

    document.querySelectorAll(".modal__backdrop").forEach((b) => {
      b.addEventListener("click", () => {
        setModal(freeModal, false);
        setModal(promoModal, false);
      });
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        setModal(freeModal, false);
        setModal(promoModal, false);
      }
    });
  }

  // =========================
  // Timers UI
  // =========================
  function updateFreeUI() {
    const freeStatus = $("freeStatus");
    if (freeStatus) freeStatus.textContent = msLeft() === 0 ? "доступна" : "таймер";

    const t = fmtTime(msLeft());
    ["freeTimer", "mFreeTimer"].forEach((id) => { const el = $(id); if (el) el.textContent = t; });

    const lp = freeState.lastPrize == null ? "—" : `+${freeState.lastPrize} 🪙`;
    ["lastPrize", "mLastPrize"].forEach((id) => { const el = $(id); if (el) el.textContent = lp; });

    const can = msLeft() === 0 && !spinning;
    ["spinBtn", "mSpin"].forEach((id) => { const el = $(id); if (el) el.disabled = !can; });
  }

  // =========================
  // Init
  // =========================
  function init() {
    syncBalances();
    renderSoundUI();
    attachMoneyButtons();
    initMobileTabs();

    const soundBtn = $("soundBtn");
    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        soundOn = !soundOn;
        localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
        renderSoundUI();
        beep(soundOn ? 640 : 240, 60, 0.03);
      });
    }

    const sTG = $("supportTG");
    const sVK = $("supportVK");
    if (sTG) sTG.addEventListener("click", () => { beep(520,45,0.02); alert("TG поддержка (заглушка)"); });
    if (sVK) sVK.addEventListener("click", () => { beep(520,45,0.02); alert("VK поддержка (заглушка)"); });

    const redraw = initWheelDrawing();

    const spinBtn = $("spinBtn");
    const mSpin = $("mSpin");
    if (spinBtn) spinBtn.addEventListener("click", () => spinWheel(redraw));
    if (mSpin) mSpin.addEventListener("click", () => spinWheel(redraw));

    initSocial();
    initPromos();
    initModals(redraw);

    updateFreeUI();
    setInterval(updateFreeUI, 250);

    window.addEventListener("storage", () => {
      syncBalances();
      freeState = loadFree();
      updateFreeUI();
      redraw();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
