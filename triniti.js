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
    // fallback (на всякий)
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
    const ids = ["balance", "balance2", "mBalance"];
    ids.forEach((x) => { const el = $(x); if (el) el.textContent = String(c); });
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
      el.addEventListener("click", () => {
        beep(520, 45, 0.02);
        alert(msg);
      });
    });
  }

  // =========================
  // Mobile tabs switch
  // =========================
  function initMobileTabs() {
    const tabs = Array.from(document.querySelectorAll(".mTab"));
    const panes = Array.from(document.querySelectorAll(".mPane"));
    if (!tabs.length || !panes.length) return;

    const setPane = (name) => {
      tabs.forEach((t) => t.classList.toggle("active", t.dataset.pane === name));
      panes.forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== name));
    };

    tabs.forEach((t) => {
      t.addEventListener("click", () => { beep(520, 45, 0.02); setPane(t.dataset.pane); });
    });

    setPane("games");
  }

  // =========================
  // Free wheel (shared for mobile + desktop)
  // =========================
  const FREE_KEY = "triniti_freewheel_v2"; // { lastTs, lastPrize }
  const DAY = 24 * 60 * 60 * 1000;
  const PRIZES = [0, 5, 10, 15, 20, 25];

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

  function saveFree(s) {
    localStorage.setItem(FREE_KEY, JSON.stringify(s));
  }

  let freeState = loadFree();
  let spinning = false;
  let wheelAngle = 0;

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

  function updateFreeUI() {
    // desktop hero small status
    const freeStatus = $("freeStatus");
    if (freeStatus) freeStatus.textContent = msLeft() === 0 ? "доступна" : "таймер";

    // timers
    const t = fmtTime(msLeft());
    const ids = ["freeTimer", "mFreeTimer"];
    ids.forEach((id) => { const el = $(id); if (el) el.textContent = t; });

    // last prize
    const lp = freeState.lastPrize == null ? "—" : `+${freeState.lastPrize} 🪙`;
    const lpIds = ["lastPrize", "mLastPrize"];
    lpIds.forEach((id) => { const el = $(id); if (el) el.textContent = lp; });

    // buttons disabled
    const can = msLeft() === 0 && !spinning;
    const btns = ["spinBtn", "mSpin"];
    btns.forEach((id) => { const el = $(id); if (el) el.disabled = !can; });
  }

  function drawWheel(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();

    const size = Math.floor((rect.width || 520) * dpr);
    canvas.width = size;
    canvas.height = size;

    const cx = size / 2, cy = size / 2;
    const r = size * 0.46;

    ctx.clearRect(0, 0, size, size);

    // rim
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.06, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.10)";
    ctx.fill();

    const seg = (Math.PI * 2) / PRIZES.length;

    for (let i = 0; i < PRIZES.length; i++) {
      const a0 = wheelAngle + i * seg;
      const a1 = a0 + seg;

      // nice alternating colors (в одной гамме)
      const base = i % 2 === 0 ? "rgba(76,125,255,.55)" : "rgba(120,80,255,.50)";
      const base2 = i % 2 === 0 ? "rgba(43,97,255,.35)" : "rgba(76,125,255,.35)";

      const grad = ctx.createRadialGradient(cx, cy, r * 0.10, cx, cy, r * 1.08);
      grad.addColorStop(0, "rgba(255,255,255,.10)");
      grad.addColorStop(0.45, base);
      grad.addColorStop(1, base2);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,.14)";
      ctx.lineWidth = Math.max(1, size * 0.004);
      ctx.stroke();

      // text prize
      const mid = (a0 + a1) / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);

      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.font = `900 ${Math.floor(size * 0.055)}px ui-sans-serif, system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,.55)";
      ctx.shadowBlur = size * 0.02;

      ctx.fillText(`${PRIZES[i]} 🪙`, r * 0.62, 0);
      ctx.restore();
    }

    // inner glow
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.56, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fill();
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

    // выбираем сектор честно
    const idx = randInt(PRIZES.length);
    const prize = PRIZES[idx]; // ВАЖНО: это единственный источник правды (fix sync)

    // pointer is on the right (0 rad). We need land center of idx at angle 0.
    const seg = (Math.PI * 2) / PRIZES.length;
    const targetCenter = idx * seg + seg / 2;

    // normalize to make it land at pointer: wheelAngle + targetCenter = 0 (mod 2π)
    // so finalAngle = -targetCenter + k*2π
    const spins = 6 + randInt(4); // 6..9
    const final = -targetCenter + spins * Math.PI * 2;

    const start = wheelAngle;
    const delta = final - start;

    const dur = 1400;
    const t0 = performance.now();

    beep(520, 55, 0.02);

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function frame(now) {
      const p = Math.min(1, (now - t0) / dur);
      wheelAngle = start + delta * easeOutCubic(p);
      redraw();

      if (p < 1) {
        requestAnimationFrame(frame);
        return;
      }

      // начисление строго тем, что выпало
      Wallet.add(prize);
      syncBalances();

      freeState.lastTs = Date.now();
      freeState.lastPrize = prize;
      saveFree(freeState);

      const msgDesk = $("dailyMsg");
      const msgMob = $("mFreeMsg");
      const text = prize > 0
        ? `Выпало: +${prize} 🪙 — начислено в баланс.`
        : `Выпало: 0 🪙 — повезёт в следующий раз.`;

      if (msgDesk) msgDesk.textContent = text;
      if (msgMob) msgMob.textContent = text;

      spinning = false;
      beep(prize > 0 ? 920 : 240, 70, 0.03);

      updateFreeUI();
    }

    requestAnimationFrame(frame);
  }

  // =========================
  // Social bonuses (VK/TG) one-time
  // =========================
  function initSocial() {
    const KEY_VK = "triniti_social_vk_v1";
    const KEY_TG = "triniti_social_tg_v1";
    const BONUS = 10;

    function render() {
      const gotVK = localStorage.getItem(KEY_VK) === "1";
      const gotTG = localStorage.getItem(KEY_TG) === "1";

      const vkState = $("vkState"); const tgState = $("tgState");
      const mVKState = $("mVKState"); const mTGState = $("mTGState");

      const vkTxt = gotVK ? "Получено ✅" : "Не получено";
      const tgTxt = gotTG ? "Получено ✅" : "Не получено";

      [vkState, mVKState].forEach((el) => { if (el) el.textContent = vkTxt; });
      [tgState, mTGState].forEach((el) => { if (el) el.textContent = tgTxt; });

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
    // mobile
    const input = $("promoInput");
    const btn = $("promoApply");
    const msg = $("promoMsg");
    if (btn && input) btn.addEventListener("click", () => applyPromo(input.value, msg));

    // desktop modal
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

    // ESC
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        setModal(freeModal, false);
        setModal(promoModal, false);
      }
    });
  }

  // =========================
  // Init
  // =========================
  function init() {
    syncBalances();
    renderSoundUI();
    attachMoneyButtons();
    initMobileTabs();

    // sound btn (desktop)
    const soundBtn = $("soundBtn");
    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        soundOn = !soundOn;
        localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
        renderSoundUI();
        beep(soundOn ? 640 : 240, 60, 0.03);
      });
    }

    // Support buttons (mobile)
    const sTG = $("supportTG");
    const sVK = $("supportVK");
    if (sTG) sTG.addEventListener("click", () => { beep(520,45,0.02); alert("TG поддержка (заглушка)"); });
    if (sVK) sVK.addEventListener("click", () => { beep(520,45,0.02); alert("VK поддержка (заглушка)"); });

    // wheel draw + spin
    const redraw = initWheelDrawing();
    const spinBtn = $("spinBtn");
    const mSpin = $("mSpin");
    if (spinBtn) spinBtn.addEventListener("click", () => spinWheel(redraw));
    if (mSpin) mSpin.addEventListener("click", () => spinWheel(redraw));

    initSocial();
    initPromos();
    initModals(redraw);

    // timer tick
    updateFreeUI();
    setInterval(updateFreeUI, 250);

    // обновление баланса при изменениях в других вкладках
    window.addEventListener("storage", () => {
      syncBalances();
      freeState = loadFree();
      updateFreeUI();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
