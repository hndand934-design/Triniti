(() => {
  function randFloat() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }

  function randInt(min, max) {
    return Math.floor(randFloat() * (max - min + 1)) + min;
  }

  const Wallet = (() => {
    const sw = window.SharedWallet;
    if (
      sw &&
      typeof sw.getCoins === "function" &&
      typeof sw.setCoins === "function" &&
      typeof sw.addCoins === "function"
    ) {
      return {
        get: () => Math.floor(Number(sw.getCoins()) || 0),
        set: (v) => sw.setCoins(Math.max(0, Math.floor(Number(v) || 0))),
        add: (d) => sw.addCoins(Math.floor(Number(d) || 0)),
      };
    }

    const KEY = "mines_wallet_fallback_v1";
    const get = () => Math.floor(Number(localStorage.getItem(KEY) || 1000));
    const set = (v) => localStorage.setItem(KEY, String(Math.max(0, Math.floor(Number(v) || 0))));
    const add = (d) => set(get() + Math.floor(Number(d) || 0));
    return { get, set, add };
  })();

  let soundOn = true;
  let audioCtx = null;

  function getAC() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }

  function tone(freq = 520, ms = 60, vol = 0.03, type = "sine") {
    if (!soundOn) return;
    try {
      const ctx = getAC();
      if (!ctx) return;

      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = ctx.currentTime;

      o.type = type;
      o.frequency.value = freq;

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);

      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + ms / 1000 + 0.02);
    } catch {}
  }

  function soundSafe() {
    tone(720, 55, 0.03, "sine");
    setTimeout(() => tone(980, 55, 0.03, "sine"), 55);
  }

  function soundBoom() {
    tone(140, 140, 0.06, "square");
    setTimeout(() => tone(90, 180, 0.06, "square"), 80);
  }

  function soundCash() {
    tone(760, 65, 0.03, "sine");
    setTimeout(() => tone(920, 65, 0.03, "sine"), 75);
  }

  const $ = (id) => document.getElementById(id);

  const subTitle = $("subTitle");
  const balanceEl = $("balance");
  const balance2El = $("balance2");

  const soundBtn = $("soundBtn");
  const soundText = $("soundText");
  const bonusBtn = $("bonusBtn");

  const gridEl = $("grid");

  const openedView = $("openedView");
  const safeMaxView = $("safeMaxView");
  const multView = $("multView");
  const cashNowView = $("cashNowView");

  const openedView2 = $("openedView2");
  const multView2 = $("multView2");
  const cashNowView2 = $("cashNowView2");
  const minesViewHead = $("minesViewHead");

  const cashoutBtn = $("cashoutBtn");
  const resetBtn = $("resetBtn");
  const msgEl = $("msg");

  const betInput = $("betInput");
  const betMinus = $("betMinus");
  const betPlus = $("betPlus");

  const minesRange = $("minesRange");
  const minesView = $("minesView");

  const startBtn = $("startBtn");
  const ladderGrid = $("ladderGrid");

  function renderTop() {
    if (subTitle) subTitle.textContent = "MINES • единый кошелёк";
    const coins = Wallet.get();
    if (balanceEl) balanceEl.textContent = String(coins);
    if (balance2El) balance2El.textContent = String(coins);
  }

  function addCoins(d) {
    Wallet.add(d);
    renderTop();
    clampBet();
  }

  renderTop();

  soundBtn?.addEventListener("click", () => {
    soundOn = !soundOn;
    if (soundText) soundText.textContent = "Звук";
    const dot = soundBtn.querySelector(".dot");
    if (dot) {
      dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
      dot.style.boxShadow = soundOn
        ? "0 0 0 3px rgba(38,212,123,.14)"
        : "0 0 0 3px rgba(255,90,106,.14)";
    }
    tone(soundOn ? 640 : 240, 70, 0.03);
  });

  bonusBtn?.addEventListener("click", () => {
    addCoins(1000);
    tone(760, 70, 0.03);
  });

  const SIZE = 25;
  const MIN_MINES = 3;
  const MAX_MINES = 24;
  const HOUSE_EDGE = 0.05;

  let st = null;

  function setMsg(text) {
    if (msgEl) msgEl.textContent = text;
  }

  function buildMines(minesCount) {
    const mines = new Set();
    while (mines.size < minesCount) mines.add(randInt(0, SIZE - 1));
    return mines;
  }

  function comb(n, k) {
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    let num = 1;
    let den = 1;
    for (let i = 1; i <= k; i++) {
      num *= (n - (k - i));
      den *= i;
    }
    return num / den;
  }

  function calcMultiplier(safeOpened, minesCount) {
    if (safeOpened <= 0) return 1.0;
    const fair = comb(SIZE, minesCount) / comb(SIZE - safeOpened, minesCount);
    return Math.max(1, fair * (1 - HOUSE_EDGE));
  }

  function money(n) {
    return `${Math.floor(n)} 🪙`;
  }

  function clampBet() {
    const coins = Wallet.get();
    let v = Math.floor(Number(betInput?.value) || 0);

    if (v < 1) v = 1;
    if (coins > 0 && v > coins) v = coins;
    if (coins <= 0) v = 1;

    if (betInput) betInput.value = String(v);
    renderStats();
  }

  betInput?.addEventListener("input", clampBet);
  betMinus?.addEventListener("click", () => {
    if (!betInput) return;
    betInput.value = String((Number(betInput.value) || 1) - 10);
    clampBet();
  });
  betPlus?.addEventListener("click", () => {
    if (!betInput) return;
    betInput.value = String((Number(betInput.value) || 1) + 10);
    clampBet();
  });

  document.querySelectorAll(".chip").forEach((b) => {
    b.addEventListener("click", () => {
      const coins = Wallet.get();
      const val = b.dataset.bet;
      if (!betInput) return;
      betInput.value = val === "max" ? String(coins) : String(val);
      clampBet();
      tone(540, 55, 0.02);
    });
  });

  if (minesRange) {
    minesRange.min = String(MIN_MINES);
    minesRange.max = String(MAX_MINES);
  }

  function renderLadder(minesCount, safeOpened) {
    if (!ladderGrid) return;

    const safeMax = SIZE - minesCount;
    const items = [];

    for (let s = 1; s <= safeMax; s++) {
      const m = calcMultiplier(s, minesCount);
      const xTxt = `x${m.toFixed(m >= 100 ? 0 : m >= 10 ? 1 : 2)}`;
      const active = st && st.active && !st.over && safeOpened === s ? " active" : "";
      items.push(`
        <div class="lstep${active}">
          #${s} · ${xTxt}
        </div>
      `);
    }

    ladderGrid.innerHTML = items.join("");
  }

  function clampMines() {
    if (!minesRange) return;

    let m = Math.floor(Number(minesRange.value) || MIN_MINES);
    if (m < MIN_MINES) m = MIN_MINES;
    if (m > MAX_MINES) m = MAX_MINES;

    minesRange.value = String(m);
    if (minesView) minesView.textContent = String(m);
    if (minesViewHead) minesViewHead.textContent = String(m);

    const safeOpened = st && st.active && !st.over ? st.safeOpened : 0;
    renderLadder(m, safeOpened);
    renderStats();
  }

  minesRange?.addEventListener("input", clampMines);

  function renderGrid() {
    if (!gridEl) return;

    const isActive = !!st && st.active;
    const over = st?.over;

    let html = "";

    for (let i = 0; i < SIZE; i++) {
      const opened = isActive && st.opened.has(i);
      const isMine = isActive && st.mines.has(i);

      let cls = "cell";
      let icon = "";

      if (!isActive) {
        cls += " locked";
      } else {
        if (opened && !isMine) {
          cls += " safe";
          icon = "💎";
        }
        if (opened && isMine) {
          cls += " mine";
          icon = "💣";
        }
      }

      html += `
        <button class="${cls}" data-i="${i}" ${(!isActive || over) ? "disabled" : ""}>
          <span class="icon">${icon}</span>
        </button>
      `;
    }

    gridEl.innerHTML = html;

    gridEl.querySelectorAll(".cell").forEach((btn) => {
      btn.addEventListener("click", () => onCellClick(Number(btn.dataset.i)));
    });
  }

  function renderStats() {
    const minesCount = Math.floor(Number(minesRange?.value) || MIN_MINES);
    const safeMax = SIZE - minesCount;

    if (safeMaxView) safeMaxView.textContent = String(safeMax);

    if (!st || !st.active) {
      if (openedView) openedView.textContent = "0";
      if (multView) multView.textContent = "x1.00";
      if (cashNowView) cashNowView.textContent = "—";

      if (openedView2) openedView2.textContent = `0 / ${safeMax}`;
      if (multView2) multView2.textContent = "x1.00";
      if (cashNowView2) cashNowView2.textContent = "—";

      if (cashoutBtn) cashoutBtn.disabled = true;
      return;
    }

    const cashNow = Math.floor(st.bet * st.multiplier);

    if (openedView) openedView.textContent = String(st.safeOpened);
    if (multView) multView.textContent = `x${st.multiplier.toFixed(2)}`;
    if (cashNowView) cashNowView.textContent = money(cashNow);

    if (openedView2) openedView2.textContent = `${st.safeOpened} / ${safeMax}`;
    if (multView2) multView2.textContent = `x${st.multiplier.toFixed(2)}`;
    if (cashNowView2) cashNowView2.textContent = money(cashNow);

    if (cashoutBtn) {
      cashoutBtn.disabled = st.over || st.safeOpened <= 0 || st.cashed;
    }
  }

  function startGame() {
    if (st && st.active && !st.over) {
      setMsg("Раунд уже идёт. Открывай клетки или нажми «Забрать / Сброс».");
      return;
    }

    const bet = Math.floor(Number(betInput?.value) || 0);
    const minesCount = Math.floor(Number(minesRange?.value) || MIN_MINES);
    const coins = Wallet.get();

    if (bet <= 0) {
      alert("Ставка должна быть больше 0");
      return;
    }

    if (bet > coins) {
      alert("Недостаточно монет");
      return;
    }

    addCoins(-bet);

    st = {
      active: true,
      bet,
      minesCount,
      mines: buildMines(minesCount),
      opened: new Set(),
      safeOpened: 0,
      multiplier: 1.0,
      over: false,
      cashed: false,
    };

    setMsg("Раунд начался. Открывай safe клетки. Можно забрать в любой момент.");
    renderLadder(minesCount, 0);
    renderGrid();
    renderStats();
    tone(620, 55, 0.025);
  }

  function revealAll() {
    if (!st) return;
    for (let i = 0; i < SIZE; i++) st.opened.add(i);
  }

  function onCellClick(i) {
    if (!st || !st.active || st.over) return;
    if (st.opened.has(i)) return;

    st.opened.add(i);

    if (st.mines.has(i)) {
      st.over = true;
      revealAll();
      setMsg(`💥 Мина! Ставка ${st.bet} 🪙 сгорела.`);
      soundBoom();
      renderLadder(st.minesCount, st.safeOpened);
      renderGrid();
      renderStats();
      return;
    }

    st.safeOpened += 1;
    st.multiplier = calcMultiplier(st.safeOpened, st.minesCount);

    soundSafe();
    renderLadder(st.minesCount, st.safeOpened);

    const safeMax = SIZE - st.minesCount;
    if (st.safeOpened >= safeMax) {
      cashOut(true);
      return;
    }

    renderGrid();
    renderStats();
  }

  function cashOut(auto = false) {
    if (!st || !st.active || st.over || st.cashed) return;

    if (st.safeOpened <= 0) {
      setMsg("Сначала открой хотя бы 1 safe клетку.");
      return;
    }

    st.cashed = true;
    st.over = true;

    const payout = Math.floor(st.bet * st.multiplier);
    addCoins(payout);

    setMsg(
      auto
        ? `🏁 Открыл все safe! Авто-забор: +${payout} 🪙 (x${st.multiplier.toFixed(2)})`
        : `✅ Забрал: +${payout} 🪙 (x${st.multiplier.toFixed(2)})`
    );

    soundCash();
    revealAll();
    renderGrid();
    renderStats();
  }

  function resetGame() {
    if (st && st.active && !st.over) {
      addCoins(st.bet);
      setMsg(`↩️ Сброс. Ставка ${st.bet} 🪙 возвращена.`);
    } else {
      setMsg("Выбери ставку и количество мин, затем нажми Start.");
    }

    st = null;
    renderGrid();
    clampMines();
    renderStats();
    clampBet();
    tone(420, 55, 0.02);
  }

  startBtn?.addEventListener("click", startGame);
  cashoutBtn?.addEventListener("click", () => cashOut(false));
  resetBtn?.addEventListener("click", resetGame);

  renderGrid();
  clampMines();
  clampBet();
  renderStats();
})();
