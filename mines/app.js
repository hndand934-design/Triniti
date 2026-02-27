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
    if (sw && typeof sw.getCoins === "function" && typeof sw.setCoins === "function" && typeof sw.addCoins === "function") {
      return {
        get: () => Math.floor(Number(sw.getCoins()) || 0),
        set: (v) => sw.setCoins(Math.max(0, Math.floor(Number(v) || 0))),
        add: (d) => sw.addCoins(Math.floor(Number(d) || 0)),
      };
    }
    // fallback на случай если забыли shared/wallet.js
    const KEY = "mines_wallet_fallback_v1";
    const get = () => Math.floor(Number(localStorage.getItem(KEY) || 1000));
    const set = (v) => localStorage.setItem(KEY, String(Math.max(0, Math.floor(Number(v)||0))));
    const add = (d) => set(get() + Math.floor(Number(d)||0));
    return { get, set, add };
  })();

  // ===== Sound =====
  let soundOn = true;
  let audioCtx = null;

  function getAC(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }
  function tone(freq = 520, ms = 60, vol = 0.03, type = "sine"){
    if (!soundOn) return;
    try{
      const ctx = getAC(); if(!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
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
  function soundSafe(){
    tone(720, 55, 0.03, "sine");
    setTimeout(()=>tone(980, 55, 0.03, "sine"), 55);
  }
  function soundBoom(){
    tone(140, 140, 0.06, "square");
    setTimeout(()=>tone(90, 180, 0.06, "square"), 80);
  }

  // ===== UI refs =====
  const subTitle = document.getElementById("subTitle");
  const balanceEl = document.getElementById("balance");

  const soundBtn = document.getElementById("soundBtn");
  const soundText = document.getElementById("soundText");
  const bonusBtn = document.getElementById("bonusBtn");

  const gridEl = document.getElementById("grid");

  const openedView = document.getElementById("openedView");
  const safeMaxView = document.getElementById("safeMaxView");
  const multView = document.getElementById("multView");
  const cashNowView = document.getElementById("cashNowView");

  const cashoutBtn = document.getElementById("cashoutBtn");
  const resetBtn = document.getElementById("resetBtn");
  const msgEl = document.getElementById("msg");

  const betInput = document.getElementById("betInput");
  const betMinus = document.getElementById("betMinus");
  const betPlus = document.getElementById("betPlus");

  const minesRange = document.getElementById("minesRange");
  const minesView = document.getElementById("minesView");

  const startBtn = document.getElementById("startBtn");
  const ladderGrid = document.getElementById("ladderGrid");

  // ===== Top render =====
  function renderTop(){
    if (subTitle) subTitle.textContent = "TRINITI • единый кошелёк";
    balanceEl.textContent = String(Wallet.get());
  }
  function addCoins(d){ Wallet.add(d); renderTop(); clampBet(); }

  renderTop();

  // sound toggle
  soundBtn.onclick = () => {
    soundOn = !soundOn;
    soundText.textContent = "Звук";
    const dot = soundBtn.querySelector(".dot");
    dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
    dot.style.boxShadow = soundOn
      ? "0 0 0 3px rgba(38,212,123,.14)"
      : "0 0 0 3px rgba(255,90,106,.14)";
    tone(soundOn ? 640 : 240, 70, 0.03);
  };

  bonusBtn.onclick = () => { addCoins(1000); tone(760, 70, 0.03); };

  // ===== Game constants =====
  const SIZE = 25; // 5x5
  const MIN_MINES = 3;
  const MAX_MINES = 24;
  const HOUSE_EDGE = 0.05;

  // ===== State =====
  let st = null;

  function setMsg(t){ msgEl.textContent = t; }

  function buildMines(minesCount){
    const mines = new Set();
    while (mines.size < minesCount) mines.add(randInt(0, SIZE - 1));
    return mines;
  }

  // comb + multiplier
  function comb(n, k){
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    let num = 1, den = 1;
    for (let i = 1; i <= k; i++){
      num *= (n - (k - i));
      den *= i;
    }
    return num / den;
  }

  function calcMultiplier(safeOpened, minesCount){
    if (safeOpened <= 0) return 1.0;
    const fair = comb(SIZE, minesCount) / comb(SIZE - safeOpened, minesCount);
    return Math.max(1, fair * (1 - HOUSE_EDGE));
  }

  function money(n){ return `${Math.floor(n)} 🪙`; }

  // ===== Bet =====
  function clampBet(){
    const coins = Wallet.get();
    let v = Math.floor(Number(betInput.value) || 0);
    if (v < 1) v = 1;
    if (v > coins) v = coins;
    betInput.value = String(v);
    renderStats();
  }
  betInput.addEventListener("input", clampBet);
  betMinus.onclick = () => { betInput.value = String((Number(betInput.value)||1) - 10); clampBet(); };
  betPlus.onclick  = () => { betInput.value = String((Number(betInput.value)||1) + 10); clampBet(); };

  document.querySelectorAll(".chip").forEach((b) => {
    b.onclick = () => {
      const coins = Wallet.get();
      const val = b.dataset.bet;
      betInput.value = (val === "max") ? String(coins) : String(val);
      clampBet();
      tone(540, 55, 0.02);
    };
  });

  // ===== Mines range + Ladder =====
  minesRange.min = String(MIN_MINES);
  minesRange.max = String(MAX_MINES);

  function renderLadder(minesCount, safeOpened){
    const safeMax = SIZE - minesCount;
    const items = [];
    for (let s = 1; s <= safeMax; s++){
      const m = calcMultiplier(s, minesCount);
      const xTxt = `x${m.toFixed(m >= 100 ? 0 : m >= 10 ? 1 : 2)}`;
      const active = (st && st.active && !st.over && safeOpened === s) ? " active" : "";
      items.push(`
        <div class="lstep${active}">
          <span class="k">#${s}</span>
          <span class="x">${xTxt}</span>
        </div>
      `);
    }
    ladderGrid.innerHTML = items.join("");
  }

  function clampMines(){
    let m = Math.floor(Number(minesRange.value) || MIN_MINES);
    if (m < MIN_MINES) m = MIN_MINES;
    if (m > MAX_MINES) m = MAX_MINES;
    minesRange.value = String(m);
    minesView.textContent = String(m);

    // ✅ лестница ДО старта всегда видна
    const safeOpened = (st && st.active && !st.over) ? st.safeOpened : 0;
    renderLadder(m, safeOpened);

    renderStats();
  }
  minesRange.addEventListener("input", clampMines);

  // ===== Grid render =====
  function renderGrid(){
    const isActive = !!st && st.active;
    const over = st?.over;

    let html = "";
    for (let i = 0; i < SIZE; i++){
      const opened = isActive && st.opened.has(i);
      const isMine = isActive && st.mines.has(i);

      let cls = "cell";
      let icon = "";

      if (!isActive){
        cls += " locked";
      } else {
        if (opened && !isMine) { cls += " safe"; icon = "💎"; }
        if (opened && isMine)  { cls += " mine"; icon = "💣"; }
      }

      html += `<button class="${cls}" data-i="${i}" ${(!isActive || over) ? "disabled" : ""}>
        <span class="icon">${icon}</span>
      </button>`;
    }

    gridEl.innerHTML = html;
    gridEl.querySelectorAll(".cell").forEach((btn) => {
      btn.onclick = () => onCellClick(Number(btn.dataset.i));
    });
  }

  function renderStats(){
    const minesCount = Math.floor(Number(minesRange.value) || MIN_MINES);
    const safeMax = SIZE - minesCount;
    safeMaxView.textContent = String(safeMax);

    if (!st || !st.active){
      openedView.textContent = "0";
      multView.textContent = "x1.00";
      cashNowView.textContent = "—";
      cashoutBtn.disabled = true;
      return;
    }

    openedView.textContent = String(st.safeOpened);
    multView.textContent = `x${st.multiplier.toFixed(2)}`;

    const cashNow = Math.floor(st.bet * st.multiplier);
    cashNowView.textContent = money(cashNow);

    cashoutBtn.disabled = st.over || st.safeOpened <= 0 || st.cashed;
  }

  // ===== Flow =====
  function startGame(){
    if (st && st.active && !st.over){
      setMsg("Раунд уже идёт. Открывай клетки или нажми “Забрать/Сброс”.");
      return;
    }

    const bet = Math.floor(Number(betInput.value) || 0);
    const minesCount = Math.floor(Number(minesRange.value) || MIN_MINES);
    const coins = Wallet.get();

    if (bet <= 0) return alert("Ставка должна быть больше 0");
    if (bet > coins) return alert("Недостаточно монет");

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

    setMsg("Раунд начался. Открывай safe клетки. Можно “Забрать”.");
    renderLadder(minesCount, 0);
    renderGrid();
    renderStats();
  }

  function revealAll(){
    for (let i = 0; i < SIZE; i++) st.opened.add(i);
  }

  function onCellClick(i){
    if (!st || !st.active || st.over) return;
    if (st.opened.has(i)) return;

    st.opened.add(i);

    if (st.mines.has(i)){
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
    if (st.safeOpened >= safeMax){
      cashOut(true);
      return;
    }

    renderGrid();
    renderStats();
  }

  function cashOut(auto = false){
    if (!st || !st.active || st.over || st.cashed) return;
    if (st.safeOpened <= 0){
      setMsg("Нужно открыть хотя бы 1 safe клетку, чтобы забрать.");
      return;
    }

    st.cashed = true;
    st.over = true;

    const payout = Math.floor(st.bet * st.multiplier);
    addCoins(payout);

    setMsg(auto
      ? `🏁 Открыл все safe! Авто-забор: +${payout} 🪙 (x${st.multiplier.toFixed(2)})`
      : `✅ Забрал: +${payout} 🪙 (x${st.multiplier.toFixed(2)})`
    );

    revealAll();
    renderGrid();
    renderStats();
  }

  function resetGame(){
    if (st && st.active && !st.over){
      addCoins(st.bet);
      setMsg(`↩️ Сброс. Ставка ${st.bet} 🪙 возвращена.`);
    } else {
      setMsg("Выбери ставку и количество мин, затем нажми Start.");
    }

    st = null;
    renderGrid();
    clampMines(); // лестница остаётся видимой
    renderStats();
    clampBet();
  }

  // ===== Buttons =====
  startBtn.onclick = startGame;
  cashoutBtn.onclick = () => cashOut(false);
  resetBtn.onclick = resetGame;

  // ===== Init =====
  renderGrid();
  clampMines();
  clampBet();
  renderStats();
})();