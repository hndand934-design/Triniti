(() => {
  // --- RNG (честный) ---
  function randFloat() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }

  // --- Shared Wallet (единый) ---
  const Wallet = (() => {
    const sw = window.SharedWallet;
    if (!sw || typeof sw.getCoins !== "function" || typeof sw.setCoins !== "function" || typeof sw.addCoins !== "function") {
      let coins = 1000;
      return {
        get(){ return coins|0; },
        set(v){ coins = Math.max(0, v|0); },
        add(d){ coins = Math.max(0, (coins + (d|0))|0); }
      };
    }
    return {
      get(){ return Math.floor(Number(sw.getCoins()) || 0); },
      set(v){ sw.setCoins(Math.max(0, Math.floor(Number(v) || 0))); },
      add(d){ sw.addCoins(Math.floor(Number(d) || 0)); },
    };
  })();

  function addCoins(d){ Wallet.add(d); renderTop(); }
  function getCoins(){ return Wallet.get(); }

  // --- Sound (лёгкий, без лагов) ---
  let soundOn = true;
  let audioCtx = null;

  function getAC(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }

  function beep(freq = 520, ms = 55, vol = 0.03) {
    if (!soundOn) return;
    try {
      const ctx = getAC();
      if (!ctx) return;

      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;

      const t0 = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);

      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + ms / 1000 + 0.02);
    } catch {}
  }

  // --- UI ---
  const subTitle = document.getElementById("subTitle");
  const balanceEl = document.getElementById("balance");
  const balance2 = document.getElementById("balance2");

  const soundBtn = document.getElementById("soundBtn");
  const soundText = document.getElementById("soundText");
  const bonusBtn = document.getElementById("bonusBtn");

  const coinEl = document.getElementById("coin");
  const flipBtn = document.getElementById("flipBtn");

  const betInput = document.getElementById("betInput");
  const betMinus = document.getElementById("betMinus");
  const betPlus = document.getElementById("betPlus");

  const betView = document.getElementById("betView");
  const winView = document.getElementById("winView");
  const statusView = document.getElementById("statusView");

  const pickEagle = document.getElementById("pickEagle");
  const pickTail = document.getElementById("pickTail");

  // --- state ---
  let picked = "eagle"; // eagle|tail
  let busy = false;

  function renderTop() {
    subTitle.textContent = "Открыто вне Telegram";
    const coins = getCoins();
    balanceEl.textContent = String(coins);
    balance2.textContent = String(coins);
  }
  renderTop();

  // theme
  function setCoinTheme(theme) {
    coinEl.classList.remove("coin3d--purple", "coin3d--gold", "coin3d--silver");
    coinEl.classList.add(`coin3d--${theme}`);
  }

  // reset UI
  function resetRoundUI(){
    setCoinTheme("purple");
    winView.textContent = "+0";
    statusView.textContent = "Готов";
  }

  // sound toggle
  soundBtn.onclick = () => {
    soundOn = !soundOn;
    soundText.textContent = soundOn ? "Звук on" : "Звук off";
    const dot = soundBtn.querySelector(".dot");
    dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
    dot.style.boxShadow = soundOn
      ? "0 0 0 3px rgba(38,212,123,.14)"
      : "0 0 0 3px rgba(255,90,106,.14)";
    beep(soundOn ? 640 : 240, 60, 0.03);
  };

  // bonus
  bonusBtn.onclick = () => { addCoins(1000); beep(760, 70, 0.03); };

  // pick
  function setPick(v) {
    picked = v;
    pickEagle.classList.toggle("active", v === "eagle");
    pickTail.classList.toggle("active", v === "tail");
    resetRoundUI();
    beep(520, 50, 0.025);
  }
  pickEagle.onclick = () => setPick("eagle");
  pickTail.onclick = () => setPick("tail");

  // bet
  function clampBet() {
    const coins = getCoins();
    let v = Math.floor(Number(betInput.value) || 0);
    if (v < 1) v = 1;
    if (v > coins) v = coins;

    betInput.value = String(v);
    betView.textContent = String(v);

    resetRoundUI();
  }
  betInput.addEventListener("input", clampBet);
  betMinus.onclick = () => { betInput.value = String((Number(betInput.value) || 1) - 10); clampBet(); };
  betPlus.onclick  = () => { betInput.value = String((Number(betInput.value) || 1) + 10); clampBet(); };

  document.querySelectorAll(".chip").forEach((b) => {
    b.onclick = () => {
      const coins = getCoins();
      const val = b.dataset.bet;
      betInput.value = (val === "max") ? String(coins) : String(val);
      clampBet();
      beep(540, 55, 0.02);
    };
  });

  clampBet();

  // 3D anim helper
  function playFlipAnim() {
    return new Promise((resolve) => {
      const onEnd = () => {
        coinEl.classList.remove("spin");
        coinEl.classList.remove("spinning");
        resolve();
      };
      coinEl.addEventListener("animationend", onEnd, { once: true });

      coinEl.classList.remove("spin");
      coinEl.classList.add("spinning");
      void coinEl.offsetWidth;
      coinEl.classList.add("spin");
    });
  }

  // flip
  flipBtn.onclick = async () => {
    if (busy) return;

    const coins = getCoins();
    const bet = Math.floor(Number(betInput.value) || 0);

    if (bet <= 0) return alert("Ставка должна быть больше 0");
    if (bet > coins) return alert("Недостаточно монет");

    busy = true;
    flipBtn.disabled = true;

    statusView.textContent = "Бросок...";
    winView.textContent = "+0";

    // списываем ставку
    addCoins(-bet);

    // результат
    const result = (randFloat() < 0.5) ? "eagle" : "tail";

    // во время броска монета фиолетовая
    setCoinTheme("purple");
    beep(520, 55, 0.02);

    await playFlipAnim();

    // после броска: цвет + понятный статус снизу (без текста на монете)
    const isEagle = (result === "eagle");
    setCoinTheme(isEagle ? "gold" : "silver");

    const resultText = isEagle ? "Выпало: Орёл" : "Выпало: Решка";
    const win = (result === picked);

    if (win) {
      const payout = bet * 2;
      addCoins(payout);

      winView.textContent = `+${bet}`;
      statusView.textContent = `Победа • ${resultText}`;
      beep(760, 65, 0.03);
      beep(920, 65, 0.03);
    } else {
      winView.textContent = "+0";
      statusView.textContent = `Поражение • ${resultText}`;
      beep(220, 85, 0.03);
    }

    busy = false;
    flipBtn.disabled = false;
  };
})();
