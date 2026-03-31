(() => {
  // ================================
  // Dragon Tower — TRINITI FINAL CLEAN
  // ================================

  const WALLET_KEY_FALLBACK = "mini_wallet_dragontower_fallback_v1";
  const SOUND_KEY = "tower_sound";

  // ===== Wallet =====
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
        set: (v) => sw.setCoins(Math.max(0, Math.floor(v || 0))),
        add: (d) => sw.addCoins(Math.floor(d || 0))
      };
    }

    let coins = Number(localStorage.getItem(WALLET_KEY_FALLBACK) || 1000);

    const save = () => {
      localStorage.setItem(WALLET_KEY_FALLBACK, String(coins));
    };

    return {
      get: () => Math.floor(coins),
      set: (v) => { coins = Math.max(0, Math.floor(v)); save(); },
      add: (d) => { coins = Math.max(0, coins + Math.floor(d)); save(); }
    };
  })();

  // ===== RNG =====
  function rand(n) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return Math.floor((a[0] / 2 ** 32) * n);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ===== Sound =====
  let soundOn = localStorage.getItem(SOUND_KEY) !== "0";
  let ctx;

  function beep(type = "click") {
    if (!soundOn) return;

    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();

      const map = {
        click:[500,0.06],
        pick:[600,0.08],
        win:[800,0.12],
        lose:[200,0.14],
        cash:[900,0.12]
      };

      const [f,d] = map[type] || map.click;

      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);

      g.gain.value = 0.05;

      o.start();
      o.stop(ctx.currentTime + d);

    } catch {}
  }

  // ===== DOM =====
  const $ = (id) => document.getElementById(id);

  const balanceEl = $("balance");
  const soundBtn = $("soundBtn");
  const soundText = $("soundText");

  const modeNormal = $("modeNormal");
  const modeHard = $("modeHard");
  const modeHint = $("modeHint");
  const difficultyTag = $("difficultyTag");

  const betInput = $("betInput");
  const betMinus = $("betMinus");
  const betPlus = $("betPlus");
  const chips = [...document.querySelectorAll(".chip")];

  const startBtn = $("startBtn");
  const cashoutBtn = $("cashoutBtn");

  const statusText = $("statusText");
  const stepText = $("stepText");
  const xText = $("xText");
  const potentialText = $("potentialText");

  const grid = $("towerGrid");
  const ladder = $("ladder");
  const msg = $("msg");

  // ===== CONFIG =====
  const ROWS = 8;
  const COLS = 4;

  const XMAP = {
    normal:[1.18,1.42,1.72,2.10,2.60,3.30,4.20,5.50],
    hard:[1.35,1.75,2.35,3.20,4.20,5.50,7.20,9.40]
  };

  // ===== STATE =====
  const S = {
    mode:"normal",
    bet:100,
    playing:false,
    busy:false,
    row:0,
    cleared:0,
    board:[],
    opened:[]
  };

  // ===== HELPERS =====
  const fmtX = (x)=>`x${x.toFixed(2)}`;
  const fmt = (n)=>`${Math.floor(n)} 🪙`;

  function updateTop(){
    balanceEl.textContent = Wallet.get();
  }

  function updateSound(){
    soundText.textContent = soundOn ? "Звук on" : "Звук off";
  }

  function clampBet(){
    let v = Math.floor(+betInput.value||0);
    const max = Wallet.get();

    if(v<1)v=1;
    if(v>max)v=max;

    betInput.value = v;
    S.bet = v;
  }

  function getX(){
    if(!S.playing || S.cleared===0) return 1;
    return XMAP[S.mode][S.cleared-1];
  }

  function updateStats(){
    stepText.textContent = S.cleared;
    xText.textContent = fmtX(getX());

    const pot = S.playing ? S.bet*getX() : 0;
    potentialText.textContent = fmt(pot);

    startBtn.disabled = S.playing;
    cashoutBtn.disabled = !(S.playing && S.cleared>0 && !S.busy);
  }

  // ===== LADDER =====
  function renderLadder(){
    ladder.innerHTML = "";

    for(let i=ROWS-1;i>=0;i--){
      const el = document.createElement("div");
      el.className = "ladderItem";
      el.innerHTML = `
        <div class="rowName">Ряд ${i+1}</div>
        <div class="xVal">${fmtX(XMAP[S.mode][i])}</div>
      `;
      ladder.appendChild(el);
    }
  }

  function highlight(){
    [...ladder.children].forEach(e=>e.classList.remove("active"));

    if(!S.playing) return;

    const i = ROWS-1-S.row;
    ladder.children[i]?.classList.add("active");
  }

  // ===== BOARD =====
  function buildBoard(){
    S.board = [];
    S.opened = [];

    const skulls = S.mode==="normal"?1:3;

    for(let r=0;r<ROWS;r++){
      const row = [];

      for(let i=0;i<skulls;i++) row.push("skull");
      while(row.length<COLS) row.push("egg");

      shuffle(row);

      S.board.push(row);
      S.opened.push(Array(COLS).fill(false));
    }
  }

  function renderGrid(){
    grid.innerHTML="";

    for(let r=ROWS-1;r>=0;r--){
      const row = document.createElement("div");
      row.className="row";

      for(let c=0;c<COLS;c++){
        const cell = document.createElement("div");
        cell.className="cell";
        cell.dataset.r=r;
        cell.dataset.c=c;

        cell.innerHTML=`
          <div class="cellInner">
            <div class="face face--front"></div>
            <div class="face face--back">
              <div class="icon"><span>?</span></div>
            </div>
          </div>
        `;

        row.appendChild(cell);
      }

      grid.appendChild(row);
    }
  }

  function reveal(cell,type){
    const icon = cell.querySelector(".icon");
    icon.classList.add(type);
    icon.innerHTML = type==="egg"?"🥚":"💀";
    cell.classList.add("revealed");
  }

  function openRow(r){
    const cells = [...grid.querySelectorAll(`.cell[data-r="${r}"]`)];
    cells.forEach((c,i)=>{
      reveal(c,S.board[r][i]);
    });
  }

  function updateClickable(){
    [...grid.querySelectorAll(".cell")].forEach(c=>{
      const r = +c.dataset.r;
      const opened = S.opened[r][c.dataset.c];

      const active = S.playing && r===S.row && !opened && !S.busy;

      c.classList.toggle("disabled",!active);
      c.style.pointerEvents = active?"auto":"none";
    });
  }

  // ===== GAME =====
  function start(){
    if(S.playing) return;

    clampBet();

    if(S.bet>Wallet.get()) return alert("Недостаточно монет");

    Wallet.add(-S.bet);
    updateTop();

    S.playing=true;
    S.row=0;
    S.cleared=0;

    buildBoard();
    renderGrid();
    renderLadder();

    statusText.textContent="Игра началась";
    msg.textContent="Выбери плитку";

    highlight();
    updateClickable();
    updateStats();

    beep("click");
  }

  async function pick(cell){
    if(!S.playing || S.busy) return;

    const r = +cell.dataset.r;
    const c = +cell.dataset.c;

    if(r!==S.row) return;

    S.busy=true;

    const type = S.board[r][c];
    S.opened[r][c]=true;

    reveal(cell,type);
    beep("pick");

    await new Promise(r=>setTimeout(r,150));

    openRow(r);

    await new Promise(r=>setTimeout(r,450));

    if(type==="skull"){
      statusText.textContent="Проигрыш";
      msg.textContent="Череп — ставка сгорела";
      beep("lose");

      S.playing=false;
      S.busy=false;

      updateClickable();
      updateStats();
      return;
    }

    S.cleared++;

    if(S.cleared===ROWS){
      const win = Math.floor(S.bet * XMAP[S.mode][ROWS-1]);
      Wallet.add(win);
      updateTop();

      statusText.textContent="Финиш";
      msg.textContent=`+${win} 🪙`;

      S.playing=false;
      S.busy=false;

      beep("cash");
      updateStats();
      return;
    }

    S.row++;
    statusText.textContent="Ряд пройден";
    msg.textContent="Дальше";

    S.busy=false;

    highlight();
    updateClickable();
    updateStats();
  }

  function cash(){
    if(!S.playing || S.cleared===0) return;

    const win = Math.floor(S.bet * getX());
    Wallet.add(win);
    updateTop();

    statusText.textContent="Кэшаут";
    msg.textContent=`+${win} 🪙`;

    S.playing=false;
    S.busy=false;

    beep("cash");

    updateClickable();
    updateStats();
  }

  // ===== EVENTS =====
  grid.addEventListener("click",e=>{
    const c = e.target.closest(".cell");
    if(!c || c.classList.contains("disabled")) return;
    pick(c);
  });

  startBtn.onclick=start;
  cashoutBtn.onclick=cash;

  modeNormal.onclick=()=>{ if(!S.playing){S.mode="normal";renderLadder();beep();}};
  modeHard.onclick=()=>{ if(!S.playing){S.mode="hard";renderLadder();beep();}};

  betMinus.onclick=()=>{betInput.value-=10;clampBet();};
  betPlus.onclick=()=>{betInput.value=+betInput.value+10;clampBet();};

  chips.forEach(b=>{
    b.onclick=()=>{
      betInput.value = b.dataset.bet==="max"?Wallet.get():b.dataset.bet;
      clampBet();
    };
  });

  soundBtn.onclick=()=>{
    soundOn=!soundOn;
    localStorage.setItem(SOUND_KEY,soundOn?"1":"0");
    updateSound();
    beep();
  };

  // ===== INIT =====
  updateTop();
  updateSound();
  clampBet();
  renderGrid();
  renderLadder();
  updateStats();

})();
