(() => {
  // ===== RNG =====
  function randFloat() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }

  function randInt(min, max) {
    return Math.floor(randFloat() * (max - min + 1)) + min;
  }

  // ===== Shared Wallet =====
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
        add: (d) => sw.addCoins(Math.floor(Number(d) || 0))
      };
    }

    const KEY = "mines_wallet_fallback_v1";

    const get = () => Math.floor(Number(localStorage.getItem(KEY) || 1000));
    const set = (v) => localStorage.setItem(KEY, String(Math.max(0, Math.floor(Number(v) || 0))));
    const add = (d) => set(get() + Math.floor(Number(d) || 0));

    return { get, set, add };
  })();

  // ===== Sound =====
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

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.value = freq;

      const t0 = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + ms / 1000 + 0.02);
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
    tone(760, 60, 0.03, "sine");
    setTimeout(() => tone(920, 60, 0.03, "sine"), 70);
  }

  // ===== UI refs =====
  const subTitle = document.getElementById("subTitle");

  const balanceEl = document.getElementById("balance");
  const balance2El = document.getElementById("balance2");
  const balanceMobileMirrorEl = document.getElementById("balanceMobileMirror");

  const soundBtn = document.getElementById("soundBtn");
  const soundText = document.getElementById("soundText");
  const bonusBtn = document.getElementById("bonusBtn");

  const gridEl = document.getElementById("grid");

  const openedView = document.getElementById("openedView");
  const openedView2 = document.getElementById("openedView2");

  const safeMaxView = document.getElementById("safeMaxView");

  const multView = document.getElementById("multView");
  const multView2 = document.getElementById("multView2");

  const cashNowView = document.getElementById("cashNowView");
  const cashNowView2 = document.getElementById("cashNowView2");

  const cashoutBtn = document.getElementById("cashoutBtn");
  const resetBtn = document.getElementById("resetBtn");
  const msgEl = document.getElementById("msg");

  const betInput = document.getElementById("betInput");
  const betMinus = document.getElementById("betMinus");
  const betPlus = document.getElementById("betPlus");

  const minesRange = document.getElementById("minesRange");
  const minesView = document.getElementById("minesView");
  const minesViewHead = document.getElementById("minesViewHead");

  const startBtn = document.getElementById("startBtn");
  const ladderGrid = document.getElementById("ladderGrid");

  // ===== Top render =====
  function renderTop() {
    const coins = Wallet.get();

    if (subTitle) subTitle.textContent = "TRINITI • единый кошелёк";
    if (balanceEl) balanceEl.textContent = String(coins);
    if (balance2El) balance2El.textContent = String(coins);
    if (balanceMobileMirrorEl) balanceMobileMirrorEl.textContent = String(coins);
  }

  function addCoins(delta) {
    Wallet.add(delta);
    renderTop();
    clampBet();
  }

  renderTop();

  // ===== Sound toggle =====
  function renderSoundUI() {
    if (!soundText) return;
    soundText.textContent = soundOn ? "Звук" : "Звук off";

    const dot = soundBtn?.querySelector(".dot");
    if (!dot) return;

    dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
    dot.style.boxShadow = soundOn
      ? "0 0 0 3px rgba(38,212,123,.14)"
      : "0 0 0 3px rgba(255,90,106,.14)";
  }

  if (soundBtn) {
    soundBtn.onclick = () => {
      soundOn = !soundOn;
      renderSoundUI();
      tone(soundOn ? 640 : 240, 70, 0.03);
    };
  }

  renderSoundUI();

  if (bonusBtn) {
    bonusBtn.onclick = () => {
      addCoins(1000);
      tone(760, 70, 0.03);
    };
  }

  // ===== Game constants =====
  const SIZE = 25;
  const MIN_MINES = 3;
  const MAX_MINES = 24;
  const HOUSE_EDGE = 0.05;

  // ===== State =====
  let st = null;

  function setMsg(text) {
    if (msgEl) msgEl.textContent = text;
  }

  function buildMines(minesCount) {
    const mines = new Set();
    while (mines.size < minesCount) {
      mines.add(randInt(0, SIZE - 1));
    }
    return mines;
  }

  // ===== Maths =====
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

  // ===== Bet =====
  function clampBet() {
    const coins = Wallet.get();
    let v = Math.floor(Number(betInput?.value) || 0);

    if (v < 1) v = 1;
    if (v > coins) v = coins;
    if (coins <= 0) v = 1;

    if (betInput) betInput.value = String(v);

    renderStats();
  }

  if (betInput) betInput.addEventListener("input", clampBet);

  if (betMinus) {
    betMinus.onclick = () => {
      betInput.value = String((Number(betInput.value) || 1) - 10);
      clampBet();
    };
  }

  if (betPlus) {
    betPlus.onclick = () => {
      betInput.value = String((Number(betInput.value) || 1) + 10);
      clampBet();
    };
  }

  document.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const coins = Wallet.get();
      const val = btn.dataset.bet;

      betInput.value = val === "max" ? String(coins) : String(val);
      clampBet();
      tone(540, 55, 0.02);
    });
  });

  // ===== Mines range + ladder =====
  if (minesRange) {
    minesRange.min = String(MIN_MINES);
    minesRange.max = String(MAX_MINES);
  }

  function renderLadder(minesCount, safeOpened) {
    if (!ladderGrid) return;

    const safeMax = SIZE - minesCount;
    const items = [];

    for (let s = 1; s <= safeMax; s++) {
      const mult = calcMultiplier(s, minesCount);
      const xTxt = `x${mult.toFixed(mult >= 100 ? 0 : mult >= 10 ? 1 : 2)}`;
      const active = st && st.active && !st.over && safeOpened === s ? " active" : "";

      items.push(`
        <div class="lstep${active}">
          #${s} • ${xTxt}
        </div>
      `);
    }

    ladderGrid.innerHTML = items.join("");
  }

  function clampMines() {
    let m = Math.floor(Number(minesRange?.value) || MIN_MINES);

    if (m < MIN_MINES) m = MIN_MINES;
    if (m > MAX_MINES) m = MAX_MINES;

    if (minesRange) minesRange.value = String(m);
    if (minesView) minesView.textContent = String(m);
    if (minesViewHead) minesViewHead.textContent = String(m);

    const safeOpened = st && st.active && !st.over ? st.safeOpened : 0;
    renderLadder(m, safeOpened);
    renderStats();
  }

  if (minesRange) minesRange.addEventListener("input", clampMines);

  // ===== Grid render =====
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
        <button class="${cls}" data-i="${i}" ${(!isActive || over) ? "disabled" : ""} type="button">
          <span class="icon">${icon}</span>
        </button>
      `;
    }

    gridEl.innerHTML = html;

    gridEl.querySelectorAll(".cell").forEach((btn) => {
      btn.onclick = () => onCellClick(Number(btn.dataset.i));
    });
  }

  // ===== Stats =====
  function setText(el, value) {
    if (el) el.textContent = value;
  }

  function renderStats() {
    const minesCount = Math.floor(Number(minesRange?.value) || MIN_MINES);
    const safeMax = SIZE - minesCount;

    setText(safeMaxView, String(safeMax));

    if (!st || !st.active) {
      setText(openedView, "0");
      setText(openedView2, "0");

      setText(multView, "x1.00");
      setText(multView2, "x1.00");

      setText(cashNowView, "—");
      setText(cashNowView2, "—");

      if (cashoutBtn) cashoutBtn.disabled = true;
      return;
    }

    setText(openedView, String(st.safeOpened));
    setText(openedView2, String(st.safeOpened));

    const multText = `x${st.multiplier.toFixed(2)}`;
    setText(multView, multText);
    setText(multView2, multText);

    const cashNow = Math.floor(st.bet * st.multiplier);
    const cashText = money(cashNow);
    setText(cashNowView, cashText);
    setText(cashNowView2, cashText);

    if (cashoutBtn) {
      cashoutBtn.disabled = st.over || st.safeOpened <= 0 || st.cashed;
    }
  }

  // ===== Flow =====
  function startGame() {
    if (st && st.active && !st.over) {
      setMsg("Раунд уже идёт. Открывай клетки или нажми «Забрать» / «Сброс».");
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
      cashed: false
    };

    setMsg("Раунд начался. Открывай safe клетки. Можно «Забрать».");
    renderLadder(minesCount, 0);
    renderGrid();
    renderStats();
    tone(620, 55, 0.025);
  }

  function revealAll() {
    if (!st) return;
    for (let i = 0; i < SIZE; i++) {
      st.opened.add(i);
    }
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
      setMsg("Нужно открыть хотя бы 1 safe клетку, чтобы забрать.");
      return;
    }

    st.cashed = true;
    st.over = true;

    const payout = Math.floor(st.bet * st.multiplier);
    addCoins(payout);

    setMsg(
      auto
        ? `🏁 Открыты все safe клетки. Авто-забор: +${payout} 🪙 (${st.multiplier.toFixed(2)}x)`
        : `✅ Забрал: +${payout} 🪙 (${st.multiplier.toFixed(2)}x)`
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
      tone(420, 60, 0.025);
    } else {
      setMsg("Выбери ставку и количество мин, затем нажми Start.");
    }

    st = null;
    renderGrid();
    clampMines();
    renderStats();
    clampBet();
  }

  // ===== Buttons =====
  if (startBtn) startBtn.onclick = startGame;
  if (cashoutBtn) cashoutBtn.onclick = () => cashOut(false);
  if (resetBtn) resetBtn.onclick = resetGame;

  // ===== Init =====
  renderGrid();
  clampMines();
  clampBet();
  renderStats();
})();
