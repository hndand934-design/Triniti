<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Mini Games</title>

  <!-- shared theme + shared wallet -->
  <link rel="stylesheet" href="./shared/theme.css">
  <script src="./shared/wallet.js"></script>

  <!-- home -->
  <link rel="stylesheet" href="./triniti.css" />
</head>
<body>
  <div class="bg"></div>
  <div class="sparkles" aria-hidden="true"></div>

  <div class="app">
    <!-- TOPBAR -->
    <header class="topbar">
      <div class="topbar__left">
        <div class="title">Mini Games</div>
        <div class="subtitle">Открыто вне Telegram · общий баланс</div>
      </div>

      <div class="topbar__right">
        <button id="soundBtn" class="pill" type="button" aria-label="Звук">
          <span id="soundDot" class="dot"></span>
          <span id="soundText">Звук on</span>
        </button>

        <button id="depositBtn" class="pill pill--ghost" type="button">Пополнить</button>
        <button id="withdrawBtn" class="pill pill--ghost" type="button">Вывести</button>

        <button id="freeBtn" class="pill pill--free" type="button" aria-label="Халява">
          <span class="gift">🎁</span>
          <span>Халява</span>
        </button>

        <button id="bonusBtn" class="pill pill--bonus" type="button">+1000 🪙</button>

        <div class="pill pill--balance">🪙 <b id="balance">1000</b></div>
      </div>
    </header>

    <!-- BODY -->
    <main class="home">
      <!-- LEFT LINE -->
      <aside class="rail" aria-label="Быстрые режимы">
        <div class="railCard">
          <div class="railBal">
            <div class="railBal__title">Баланс</div>
            <div class="railBal__val">🪙 <b id="balanceRail">1000</b></div>
          </div>

          <nav class="railNav">
            <a class="railBtn active" href="./dice/" title="Dice"><span>🎲</span></a>
            <a class="railBtn" href="./mines/" title="Mines"><span>💣</span></a>
            <a class="railBtn" href="./crash/" title="Crash"><span>🚀</span></a>
            <a class="railBtn" href="./coinflip/" title="Coin Flip"><span>🪙</span></a>
            <a class="railBtn" href="./rps/" title="RPS"><span>✊</span></a>
            <a class="railBtn" href="./penalty/" title="Penalty"><span>⚽</span></a>
            <a class="railBtn" href="./tower/" title="Tower"><span>🐉</span></a>
            <a class="railBtn" href="./wheel/" title="Wheel"><span>🎡</span></a>

            <button id="freeBtnRail" class="railBtn railBtn--gift" type="button" title="Халява">
              <span>🎁</span>
            </button>
          </nav>
        </div>
      </aside>

      <!-- CONTENT -->
      <section class="content">
        <!-- HERO (оставлен пустым) -->
        <section class="hero card hero--empty" aria-label="Блок будет заполнен позже">
          <!-- специально пусто -->
        </section>

        <!-- GAMES GRID -->
        <section class="grid">
          <a class="gameCard" href="./dice/">
            <div class="gcTop">
              <div class="gcIcon">🎲</div>
              <div class="gcName">Dice</div>
            </div>
            <div class="gcDesc">3D кубик · меньше/больше · честный RNG</div>
            <div class="gcMeta">Моментальная игра</div>
          </a>

          <a class="gameCard" href="./coinflip/">
            <div class="gcTop">
              <div class="gcIcon">🪙</div>
              <div class="gcName">Coin Flip</div>
            </div>
            <div class="gcDesc">Орёл/Решка · 3D монета</div>
            <div class="gcMeta">Быстрый риск</div>
          </a>

          <a class="gameCard" href="./crash/">
            <div class="gcTop">
              <div class="gcIcon">🚀</div>
              <div class="gcName">Crash</div>
            </div>
            <div class="gcDesc">Ракета растёт · забирай вовремя</div>
            <div class="gcMeta">60fps график</div>
          </a>

          <a class="gameCard" href="./mines/">
            <div class="gcTop">
              <div class="gcIcon">💣</div>
              <div class="gcName">Mines</div>
            </div>
            <div class="gcDesc">5×5 · лестница X · cashout</div>
            <div class="gcMeta">Тактика</div>
          </a>

          <a class="gameCard" href="./rps/">
            <div class="gcTop">
              <div class="gcIcon">✊✌️✋</div>
              <div class="gcName">RPS</div>
            </div>
            <div class="gcDesc">Серия · лестница X · cashout</div>
            <div class="gcMeta">Скорость</div>
          </a>

          <a class="gameCard" href="./penalty/">
            <div class="gcTop">
              <div class="gcIcon">⚽</div>
              <div class="gcName">Penalty</div>
            </div>
            <div class="gcDesc">Вратарь · сложность · лестница X</div>
            <div class="gcMeta">Экшен</div>
          </a>

          <a class="gameCard" href="./tower/">
            <div class="gcTop">
              <div class="gcIcon">🐉</div>
              <div class="gcName">Tower</div>
            </div>
            <div class="gcDesc">Яйцо/череп · ряды · cashout</div>
            <div class="gcMeta">Риск по шагам</div>
          </a>

          <a class="gameCard" href="./wheel/">
            <div class="gcTop">
              <div class="gcIcon">🎡</div>
              <div class="gcName">Wheel</div>
            </div>
            <div class="gcDesc">Выбор X · честный RNG</div>
            <div class="gcMeta">Классика</div>
          </a>
        </section>

        <footer class="footer">
          <div class="footCard">
            <div class="footTitle">Важно</div>
            <div class="footTxt">Монеты виртуальные. Вывода нет. Все режимы работают локально.</div>
          </div>
        </footer>
      </section>
    </main>
  </div>

  <!-- HALYAVA MODAL -->
  <div id="freeModal" class="modal" aria-hidden="true">
    <div class="modal__backdrop" data-close="1"></div>

    <div class="modal__panel" role="dialog" aria-modal="true" aria-label="Халява">
      <div class="modal__head">
        <div class="modal__title">Халява 🎁</div>
        <button class="modal__close" id="freeClose" type="button" aria-label="Закрыть">✕</button>
      </div>

      <div class="tabs">
        <button id="tabDaily" class="tab active" type="button">Ежедневное колесо</button>
        <button id="tabSocial" class="tab" type="button">Бонусы</button>
      </div>

      <!-- DAILY -->
      <section id="paneDaily" class="pane">
        <div class="dailyTopRow">
          <div>
            <div class="dailyTitle">Ежедневное колесо</div>
            <div class="dailyHint">1 попытка в сутки. Приз сразу в общий кошелёк.</div>
          </div>

          <div class="timerBox">
            <div class="timerLabel">Следующая попытка через</div>
            <div class="timerVal" id="dailyTimer">00:00:00</div>
          </div>
        </div>

        <div class="dailyWrap">
          <div class="dailyLeft">
            <div class="wheelBox">
              <div class="pointer"></div>
              <canvas id="dailyWheel" width="520" height="520"></canvas>
              <div class="wheelCenter">
                <div class="centerBig" id="wheelCenterTxt">SPIN</div>
                <div class="centerSmall" id="wheelCenterSub">сегодня</div>
              </div>
            </div>

            <button id="spinBtn" class="btnPrimary" type="button">Крутить</button>
            <div class="dailyMsg" id="dailyMsg">Жми “Крутить” и забирай приз.</div>
          </div>

          <div class="dailyRight">
            <div class="listCard">
              <div class="listTitle">Призы</div>
              <div id="prizeList" class="prizeList"></div>
              <div class="listNote">RNG: <code>crypto.getRandomValues</code></div>
            </div>
          </div>
        </div>
      </section>

      <!-- SOCIAL -->
      <section id="paneSocial" class="pane hidden">
        <div class="socialCard">
          <div class="dailyTitle">Бонусы за подписку</div>
          <div class="dailyHint">Один раз на браузер (локально).</div>

          <div class="socialGrid">
            <div class="socItem">
              <div class="socTop">
                <div class="socIcon">VK</div>
                <div>
                  <div class="socName">Подписка ВК</div>
                  <div class="socDesc">+500 🪙</div>
                </div>
              </div>
              <div class="socBtns">
                <a class="btnGhost" href="#" onclick="return false;">Открыть ВК</a>
                <button id="claimVK" class="btnPrimary" type="button">Я подписался</button>
              </div>
              <div class="socState" id="vkState">Не получено</div>
            </div>

            <div class="socItem">
              <div class="socTop">
                <div class="socIcon">TG</div>
                <div>
                  <div class="socName">Подписка Telegram</div>
                  <div class="socDesc">+500 🪙</div>
                </div>
              </div>
              <div class="socBtns">
                <a class="btnGhost" href="#" onclick="return false;">Открыть TG</a>
                <button id="claimTG" class="btnPrimary" type="button">Я подписался</button>
              </div>
              <div class="socState" id="tgState">Не получено</div>
            </div>
          </div>

          <div class="finePrint">
            * Реальная проверка подписки делается через сервер/бота. Сейчас логика локальная.
          </div>
        </div>
      </section>
    </div>
  </div>

  <script src="./triniti.js"></script>
</body>
</html>



:root{
  --bg0:#0b0f1a;
  --bg1:#0b1222;
  --text:#eaf0ff;
  --muted: rgba(234,240,255,.68);

  --stroke: rgba(255,255,255,.10);
  --stroke2: rgba(255,255,255,.08);

  --blue1:#4c7dff;
  --blue2:#2b61ff;

  --glass: rgba(255,255,255,.07);
  --glass2: rgba(255,255,255,.03);

  --r:18px;
}

*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
  color:var(--text);
  background: linear-gradient(180deg, var(--bg0), var(--bg1));
  overflow-x:hidden;
}

.bg{
  position:fixed; inset:0;
  background:
    radial-gradient(900px 600px at 20% 15%, rgba(76,125,255,.22), transparent 55%),
    radial-gradient(900px 700px at 80% 75%, rgba(176,64,255,.18), transparent 58%),
    radial-gradient(700px 400px at 50% 40%, rgba(255,255,255,.05), transparent 60%);
  pointer-events:none;
}

.sparkles{
  position:fixed; inset:0; pointer-events:none; opacity:.25;
  background-image:
    radial-gradient(2px 2px at 10% 15%, rgba(255,255,255,.35), transparent 60%),
    radial-gradient(1px 1px at 70% 25%, rgba(255,255,255,.25), transparent 60%),
    radial-gradient(2px 2px at 40% 70%, rgba(255,255,255,.22), transparent 60%),
    radial-gradient(1px 1px at 85% 80%, rgba(255,255,255,.20), transparent 60%);
}

a{color:inherit; text-decoration:none}
button{font:inherit}

.app{
  width:min(1120px, calc(100% - 20px));
  margin: 14px auto 18px;
}
@media (max-width: 520px){
  .app{ width: calc(100% - 16px); margin: 10px auto 14px; }
}

/* TOPBAR */
.topbar{
  display:flex; justify-content:space-between; align-items:center; gap:10px;
  padding:12px 14px;
  border-radius: var(--r);
  background: linear-gradient(180deg, var(--glass), var(--glass2));
  border:1px solid var(--stroke2);
}
.title{font-weight:950}
.subtitle{font-size:12px; opacity:.8; margin-top:2px}
.topbar__right{display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end}

.pill{
  display:inline-flex; align-items:center; gap:8px;
  padding:10px 12px;
  border-radius:999px;
  border:1px solid var(--stroke);
  background: rgba(255,255,255,.05);
  color:var(--text);
  cursor:pointer;
  user-select:none;
  white-space:nowrap;
}
.pill--balance{cursor:default}
.pill--bonus{
  background: rgba(76,125,255,.14);
  border-color: rgba(76,125,255,.28);
}
.pill--free{
  background: rgba(255,255,255,.06);
  border-color: rgba(255,255,255,.14);
}
.pill--ghost{
  background: rgba(0,0,0,.18);
  border-color: rgba(255,255,255,.10);
}
.dot{
  width:8px;height:8px;border-radius:99px;background:#26d47b;
  box-shadow: 0 0 0 3px rgba(38,212,123,.14);
}

/* LAYOUT: left rail + content */
.home{
  margin-top:12px;
  display:grid;
  grid-template-columns: 98px 1fr;
  gap: 12px;
  align-items:start;
}
@media (max-width: 900px){
  .home{ grid-template-columns: 78px 1fr; }
}
@media (max-width: 520px){
  .home{ grid-template-columns: 70px 1fr; }
}

/* LEFT RAIL */
.rail{
  position:sticky;
  top: 12px;
  height: fit-content;
}
.railCard{
  border-radius: var(--r);
  background: linear-gradient(180deg, var(--glass), var(--glass2));
  border:1px solid var(--stroke2);
  overflow:hidden;
  padding:10px;
}
.railBal{
  border-radius: 14px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.18);
  padding:10px;
  text-align:left;
}
.railBal__title{ font-size:12px; color:var(--muted); }
.railBal__val{ margin-top:6px; font-weight:950; font-size:16px; }

.railNav{
  margin-top:10px;
  display:flex;
  flex-direction:column;
  gap:8px;
  align-items:center;
}
.railBtn{
  width:52px; height:52px;
  display:grid; place-items:center;
  border-radius: 16px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.18);
  cursor:pointer;
  user-select:none;
  transition: transform .12s ease, filter .12s ease, border-color .12s ease;
}
.railBtn span{ font-size:18px; }
.railBtn:hover{ filter: brightness(1.05); }
.railBtn:active{ transform: translateY(1px) scale(.99); }
.railBtn.active{
  border-color: rgba(76,125,255,.55);
  box-shadow: 0 12px 26px rgba(43,97,255,.12);
}
.railBtn--gift{
  border-color: rgba(255,255,255,.16);
  background: rgba(76,125,255,.10);
}

/* CONTENT */
.content{ min-width: 0; }

.card{
  border-radius: var(--r);
  background: linear-gradient(180deg, var(--glass), var(--glass2));
  border:1px solid var(--stroke2);
  overflow:hidden;
}

/* HERO empty */
.hero{
  padding:14px;
}
.hero--empty{
  min-height: 180px;
}
@media (max-width: 520px){
  .hero--empty{ min-height: 140px; }
}

/* GRID */
.grid{
  margin-top:12px;
  display:grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap:12px;
}
@media (max-width: 980px){
  .grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 520px){
  .grid{ grid-template-columns: 1fr; }
}
.gameCard{
  border-radius: var(--r);
  background: linear-gradient(180deg, var(--glass), var(--glass2));
  border:1px solid var(--stroke2);
  padding:14px;
  display:flex;
  flex-direction:column;
  gap:8px;
  min-height: 140px;
  transition: transform .12s ease, filter .12s ease, border-color .12s ease;
}
.gameCard:hover{ filter: brightness(1.05); border-color: rgba(255,255,255,.18); }
.gameCard:active{ transform: translateY(1px) scale(.99); }

.gcTop{ display:flex; align-items:center; gap:10px; }
.gcIcon{
  width:42px; height:42px;
  display:grid; place-items:center;
  border-radius: 16px;
  background: rgba(0,0,0,.18);
  border:1px solid rgba(255,255,255,.10);
  font-size:18px;
}
.gcName{ font-weight:950; }
.gcDesc{ font-size:12px; color:var(--muted); line-height:1.35; }
.gcMeta{ margin-top:auto; font-size:12px; opacity:.85; }

.footer{ margin-top: 12px; }
.footCard{
  border-radius: var(--r);
  background: linear-gradient(180deg, var(--glass), var(--glass2));
  border:1px solid var(--stroke2);
  padding:14px;
}
.footTitle{font-weight:950}
.footTxt{margin-top:6px; font-size:12px; color:var(--muted);}

/* MODAL */
.modal{ position:fixed; inset:0; display:none; z-index:50; }
.modal.open{ display:block; }

/* затемнение с блюром */
.modal__backdrop{
  position:absolute; inset:0;
  background: rgba(0,0,0,.65);
  backdrop-filter: blur(8px);
}

/* ВАЖНО: панель НЕпрозрачная */
.modal__panel{
  position:absolute;
  left:50%; top:50%;
  transform: translate(-50%,-50%);
  width: min(980px, calc(100% - 18px));
  max-height: calc(100% - 18px);
  overflow:auto;

  border-radius: 18px;
  background: rgba(12, 16, 28, .98);     /* плотный фон */
  border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 22px 60px rgba(0,0,0,.55);
}

.modal__head{
  display:flex; justify-content:space-between; align-items:center;
  padding:12px 14px;
  border-bottom:1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.18);
}
.modal__title{ font-weight:950; }
.modal__close{
  border:1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.22);
  color:var(--text);
  border-radius: 12px;
  padding:8px 10px;
  cursor:pointer;
}

/* tabs */
.tabs{ display:flex; gap:8px; padding:12px 14px 0; flex-wrap:wrap; }
.tab{
  padding:10px 12px;
  border-radius: 14px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.22);
  cursor:pointer;
  font-weight:900;
}
.tab.active{
  border-color: rgba(76,125,255,.55);
  background: rgba(76,125,255,.18);
}
.pane{ padding:14px; }
.pane.hidden{ display:none; }

/* daily */
.dailyTopRow{
  display:flex; justify-content:space-between; align-items:flex-start; gap:12px;
  flex-wrap:wrap;
}
.dailyTitle{ font-weight:950; font-size:16px; }
.dailyHint{ margin-top:4px; font-size:12px; color:var(--muted); }

.timerBox{
  border-radius: 14px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.22);
  padding:10px 12px;
  min-width: 220px;
}
.timerLabel{ font-size:12px; color:var(--muted); }
.timerVal{ margin-top:4px; font-weight:950; font-size:16px; letter-spacing:.5px; }

.dailyWrap{
  margin-top:12px;
  display:grid;
  grid-template-columns: 1fr 320px;
  gap:12px;
}
@media (max-width: 900px){
  .dailyWrap{ grid-template-columns: 1fr; }
}

.wheelBox{
  position:relative;
  border-radius: 18px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.22);
  padding:12px;
  display:grid;
  place-items:center;
  overflow:hidden;
}
.pointer{
  position:absolute;
  top:8px;
  left:50%;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 18px solid rgba(255,255,255,.88);
  filter: drop-shadow(0 8px 10px rgba(0,0,0,.35));
}
#dailyWheel{
  width: min(420px, 86vw);
  height: auto;
  display:block;
  transform-origin: 50% 50%;
}
.wheelCenter{
  position:absolute;
  width: 110px; height:110px;
  border-radius: 999px;
  border:1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.35);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2px;
}
.centerBig{ font-weight:950; }
.centerSmall{ font-size:12px; color:var(--muted); }

.btnPrimary{
  border:1px solid rgba(76,125,255,.60);
  background: linear-gradient(180deg, rgba(76,125,255,.95), rgba(43,97,255,.85));
  box-shadow: 0 16px 30px rgba(43,97,255,.18);
  color:var(--text);
  padding:12px 14px;
  border-radius: 16px;
  font-weight:950;
  cursor:pointer;
}
.btnPrimary:active{transform:scale(.99)}

.btnGhost{
  border:1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.05);
  color:var(--text);
  padding:12px 14px;
  border-radius: 16px;
  font-weight:950;
  cursor:pointer;
}
.btnGhost:active{transform:scale(.99)}

.dailyMsg{ margin-top:10px; font-size:12px; color:rgba(234,240,255,.78); }

.listCard{
  border-radius: 18px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.22);
  padding:12px;
}
.listTitle{ font-weight:950; }
.prizeList{ margin-top:10px; display:grid; gap:8px; }
.prizeItem{
  display:flex; justify-content:space-between; align-items:center;
  padding:10px 12px;
  border-radius: 14px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
}
.prizeItem .p{ font-weight:950; }
.prizeItem .t{ font-size:12px; color:var(--muted); }
.listNote{ margin-top:10px; font-size:12px; color:var(--muted); }

/* social */
.socialGrid{
  margin-top:12px;
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:12px;
}
@media (max-width: 900px){
  .socialGrid{ grid-template-columns: 1fr; }
}
.socItem{
  border-radius: 18px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.22);
  padding:12px;
}
.socTop{ display:flex; gap:10px; align-items:center; }
.socIcon{
  width:44px; height:44px;
  border-radius: 16px;
  display:grid; place-items:center;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  font-weight:950;
}
.socName{ font-weight:950; }
.socDesc{ font-size:12px; color:var(--muted); margin-top:2px; }
.socBtns{ margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; }
.socState{ margin-top:10px; font-size:12px; color:rgba(234,240,255,.75); }
.finePrint{ margin-top:12px; font-size:12px; color:var(--muted); }

/* mobile */
@media (max-width: 420px){
  .railBtn{ width:46px; height:46px; border-radius: 14px; }
  .railBal{ padding:9px; }
  .pill{ padding:9px 10px; }
}


(() => {
  // ===== SharedWallet fallback =====
  const WALLET_KEY = "triniti_shared_wallet_v1";
  function ensureSharedWallet() {
    const sw = window.SharedWallet;
    if (sw && sw.getCoins && sw.setCoins && sw.addCoins) return sw;

    let state = { coins: 1000 };
    try {
      const v = JSON.parse(localStorage.getItem(WALLET_KEY) || "null");
      if (v && typeof v.coins === "number") state.coins = Math.max(0, Math.floor(v.coins));
    } catch {}

    const save = () => localStorage.setItem(WALLET_KEY, JSON.stringify({ coins: state.coins }));
    window.SharedWallet = {
      getCoins(){ return state.coins; },
      setCoins(n){ state.coins = Math.max(0, Math.floor(Number(n)||0)); save(); },
      addCoins(d){ state.coins = Math.max(0, Math.floor(state.coins + (Number(d)||0))); save(); },
    };
    return window.SharedWallet;
  }
  const SW = ensureSharedWallet();
  const $ = (id) => document.getElementById(id);

  const coins = () => Math.floor(Number(SW.getCoins()) || 0);
  const addCoins = (d) => { SW.addCoins(d); syncBalanceUI(); };

  function syncBalanceUI(){
    const c = coins();
    $("balance") && ($("balance").textContent = String(c));
    $("balance2") && ($("balance2").textContent = String(c));
    $("balanceRail") && ($("balanceRail").textContent = String(c));
  }

  // ===== Sound =====
  const SOUND_KEY = "triniti_sound_v1";
  let soundOn = (localStorage.getItem(SOUND_KEY) ?? "1") === "1";
  let audioCtx = null;

  function getCtx(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    return audioCtx || (audioCtx = new AC());
  }
  function beep(freq=520, ms=60, vol=0.03){
    if(!soundOn) return;
    try{
      const ctx = getCtx(); if(!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type="sine";
      o.frequency.value=freq;
      const t = ctx.currentTime;
      g.gain.setValueAtTime(vol,t);
      g.gain.exponentialRampToValueAtTime(0.0001,t+ms/1000);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t+ms/1000);
    }catch{}
  }
  function renderSoundUI(){
    $("soundText") && ($("soundText").textContent = soundOn ? "Звук on" : "Звук off");
    const dot = $("soundDot");
    if(dot){
      dot.style.background = soundOn ? "#26d47b" : "#ff5a6a";
      dot.style.boxShadow  = soundOn ? "0 0 0 3px rgba(38,212,123,.14)" : "0 0 0 3px rgba(255,90,106,.14)";
    }
  }

  $("soundBtn")?.addEventListener("click", async ()=>{
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
    renderSoundUI();
    beep(soundOn ? 640 : 240, 60, 0.03);
    if(soundOn && audioCtx && audioCtx.state === "suspended"){
      try{ await audioCtx.resume(); }catch{}
    }
  });

  // ===== Deposit/Withdraw (заглушки) =====
  const depositMock = () => { beep(520,55,0.02); alert("Пополнение отключено (виртуальные монеты)."); };
  const withdrawMock = () => { beep(240,80,0.03); alert("Вывод отключен (виртуальные монеты)."); };

  $("depositBtn")?.addEventListener("click", depositMock);
  $("withdrawBtn")?.addEventListener("click", withdrawMock);

  // ===== Bonus +1000 =====
  $("bonusBtn")?.addEventListener("click", ()=>{ addCoins(1000); beep(760,70,0.03); });

  // ===== Modal: Halyava =====
  const freeModal = $("freeModal");
  const openModal = () => {
    freeModal?.classList.add("open");
    freeModal?.setAttribute("aria-hidden","false");
    beep(520,50,0.02);
  };
  const closeModal = () => {
    freeModal?.classList.remove("open");
    freeModal?.setAttribute("aria-hidden","true");
    beep(420,50,0.02);
  };

  $("freeBtn")?.addEventListener("click", openModal);
  $("freeBtn2")?.addEventListener("click", openModal);
  $("freeBtnRail")?.addEventListener("click", openModal);
  $("freeClose")?.addEventListener("click", closeModal);
  freeModal?.addEventListener("click",(e)=>{ if(e.target?.dataset?.close) closeModal(); });
  window.addEventListener("keydown",(e)=>{ if(e.key==="Escape" && freeModal?.classList.contains("open")) closeModal(); });

  // Tabs
  const tabDaily = $("tabDaily");
  const tabSocial = $("tabSocial");
  const paneDaily = $("paneDaily");
  const paneSocial = $("paneSocial");

  function setTab(which){
    const daily = which === "daily";
    tabDaily?.classList.toggle("active", daily);
    tabSocial?.classList.toggle("active", !daily);
    paneDaily?.classList.toggle("hidden", !daily);
    paneSocial?.classList.toggle("hidden", daily);
    beep(520,45,0.02);
  }
  tabDaily?.addEventListener("click", ()=>setTab("daily"));
  tabSocial?.addEventListener("click", ()=>setTab("social"));

  // =========================
  // DAILY WHEEL (SYNC FIX + 24H TIMER)
  // =========================
  const DAILY_NEXT_KEY = "triniti_daily_next_ms_v2";

  const PRIZES = [
    { label: "+0 🪙", coins: 0 },
    { label: "+50 🪙", coins: 50 },
    { label: "+100 🪙", coins: 100 },
    { label: "+150 🪙", coins: 150 },
    { label: "+200 🪙", coins: 200 },
    { label: "+250 🪙", coins: 250 },
    { label: "+500 🪙", coins: 500 },
    { label: "+1000 🪙", coins: 1000 },
  ];

  function rngInt(n){
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  }

  const freeStatus = $("freeStatus");
  const dailyTimer = $("dailyTimer");
  const dailyMsg = $("dailyMsg");
  const spinBtn = $("spinBtn");
  const wheelCanvas = $("dailyWheel");
  const wheelCenterTxt = $("wheelCenterTxt");
  const wheelCenterSub = $("wheelCenterSub");
  const prizeList = $("prizeList");

  const getNextTs = () => {
    const v = Number(localStorage.getItem(DAILY_NEXT_KEY) || 0);
    return Number.isFinite(v) ? v : 0;
  };
  const setNextTs24h = () => {
    const next = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(DAILY_NEXT_KEY, String(next));
    return next;
  };
  const canSpinNow = () => Date.now() >= getNextTs();

  function fmt(ms){
    ms = Math.max(0, ms);
    const s = Math.floor(ms/1000);
    const hh = String(Math.floor(s/3600)).padStart(2,"0");
    const mm = String(Math.floor((s%3600)/60)).padStart(2,"0");
    const ss = String(s%60).padStart(2,"0");
    return `${hh}:${mm}:${ss}`;
  }

  function renderFree(){
    const ok = canSpinNow();
    if(freeStatus) freeStatus.textContent = ok ? "доступна" : "ожидание";
  }
  function renderTimer(){
    if(!dailyTimer) return;
    dailyTimer.textContent = canSpinNow() ? "00:00:00" : fmt(getNextTs() - Date.now());
  }

  function renderPrizes(){
    if(!prizeList) return;
    prizeList.innerHTML = "";
    PRIZES.forEach(p=>{
      const el = document.createElement("div");
      el.className = "prizeItem";
      el.innerHTML = `<div class="p">${p.label}</div><div class="t">в кошелёк</div>`;
      prizeList.appendChild(el);
    });
  }

  function drawWheel(){
    if(!wheelCanvas) return;
    const ctx = wheelCanvas.getContext("2d");
    const W = wheelCanvas.width, H = wheelCanvas.height;
    const cx = W/2, cy = H/2;
    const r = Math.min(W,H)*0.48;

    ctx.clearRect(0,0,W,H);

    const n = PRIZES.length;
    const step = (Math.PI*2)/n;

    // стрелка сверху => старт -PI/2
    for(let i=0;i<n;i++){
      const a0 = -Math.PI/2 + i*step;
      const a1 = a0 + step;

      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,a0,a1);
      ctx.closePath();

      ctx.fillStyle = (i%2===0) ? "rgba(76,125,255,.18)" : "rgba(176,64,255,.14)";
      ctx.fill();

      ctx.strokeStyle="rgba(255,255,255,.10)";
      ctx.lineWidth=2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(a0 + step/2);
      ctx.textAlign="right";
      ctx.fillStyle="rgba(255,255,255,.92)";
      ctx.font="950 22px ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial";
      ctx.fillText(PRIZES[i].label, r-14, 8);
      ctx.restore();
    }
  }

  let spinning=false;
  let lastRotation=0;

  // ВАЖНО: “что выпало” = winIndex, и начисляем по нему же
  function spinToIndex(winIndex){
    return new Promise((resolve)=>{
      const n = PRIZES.length;
      const step = (Math.PI*2)/n;

      // центр сектора i: (-PI/2 + (i+0.5)*step)
      // под стрелку (-PI/2) => rotation = -(i+0.5)*step (mod 2pi)
      const ideal = -((winIndex + 0.5) * step);
      const fullTurns = 4 + rngInt(3); // 4..6
      const target = lastRotation + fullTurns*(Math.PI*2) + ideal;

      wheelCanvas.style.transition="transform 1150ms cubic-bezier(.2,.85,.2,1)";
      wheelCanvas.style.transform=`rotate(${target}rad)`;

      const onEnd = () => {
        wheelCanvas.removeEventListener("transitionend", onEnd);
        lastRotation = target % (Math.PI*2);
        resolve();
      };
      wheelCanvas.addEventListener("transitionend", onEnd, { once:true });
    });
  }

  async function onSpin(){
    if(spinning) return;

    if(!canSpinNow()){
      renderTimer(); renderFree();
      if(dailyMsg) dailyMsg.textContent="Пока нельзя. Дождись таймера 😉";
      beep(220,90,0.03);
      return;
    }

    spinning=true;
    if(spinBtn) spinBtn.disabled=true;

    if(wheelCenterTxt) wheelCenterTxt.textContent="…";
    if(wheelCenterSub) wheelCenterSub.textContent="крутим";
    if(dailyMsg) dailyMsg.textContent="Крутим колесо…";
    beep(520,55,0.02);

    const winIndex = rngInt(PRIZES.length);
    await spinToIndex(winIndex);

    const prize = PRIZES[winIndex];
    addCoins(prize.coins);     // начисление ТОЧНО по winIndex

    setNextTs24h();
    renderFree(); renderTimer();

    if(wheelCenterTxt) wheelCenterTxt.textContent = `+${prize.coins}`;
    if(wheelCenterSub) wheelCenterSub.textContent = "🪙 начислено";
    if(dailyMsg) dailyMsg.textContent = `Выпало: ${prize.label} — начислено на баланс ✅`;

    beep(760,70,0.03);
    setTimeout(()=>beep(920,70,0.03), 90);

    spinning=false;
    if(spinBtn) spinBtn.disabled=false;
  }
  spinBtn?.addEventListener("click", onSpin);

  // Social bonus
  const VK_KEY="triniti_bonus_vk_v1";
  const TG_KEY="triniti_bonus_tg_v1";
  function renderSocial(){
    const vkDone = localStorage.getItem(VK_KEY) === "1";
    const tgDone = localStorage.getItem(TG_KEY) === "1";

    $("vkState") && ($("vkState").textContent = vkDone ? "Получено ✅" : "Не получено");
    $("tgState") && ($("tgState").textContent = tgDone ? "Получено ✅" : "Не получено");

    $("claimVK") && ($("claimVK").disabled = vkDone);
    $("claimTG") && ($("claimTG").disabled = tgDone);
  }
  function claimOnce(key, amount){
    if(localStorage.getItem(key)==="1") return;
    localStorage.setItem(key,"1");
    addCoins(amount);
    renderSocial();
    beep(760,70,0.03);
    setTimeout(()=>beep(920,70,0.03), 90);
  }
  $("claimVK")?.addEventListener("click", ()=>claimOnce(VK_KEY, 500));
  $("claimTG")?.addEventListener("click", ()=>claimOnce(TG_KEY, 500));

  // init
  (function init(){
    if(!localStorage.getItem(DAILY_NEXT_KEY)) localStorage.setItem(DAILY_NEXT_KEY, "0");

    syncBalanceUI();
    renderSoundUI();

    renderPrizes();
    drawWheel();

    if(wheelCanvas){
      wheelCanvas.style.transform="rotate(0rad)";
      wheelCanvas.style.transformOrigin="50% 50%";
    }

    renderFree();
    renderTimer();
    renderSocial();

    setInterval(()=>{ renderTimer(); renderFree(); }, 1000);
  })();

  window.addEventListener("focus", ()=>{ syncBalanceUI(); renderFree(); renderTimer(); renderSocial(); });
})();
