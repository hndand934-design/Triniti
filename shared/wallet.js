/* shared/wallet.js
   ЕДИНЫЙ КОШЕЛЁК для всех режимов TRINITI
*/
(() => {
  const KEY = "triniti_wallet_v1";

  function read() {
    try {
      const w = JSON.parse(localStorage.getItem(KEY) || "null");
      if (w && typeof w.coins === "number") return { coins: Math.floor(w.coins) };
    } catch {}
    return { coins: 1000 };
  }

  function write(coins) {
    const safe = Math.max(0, Math.floor(coins));
    localStorage.setItem(KEY, JSON.stringify({ coins: safe }));
    return safe;
  }

  let state = read();
  const listeners = new Set();

  function emit() {
    for (const fn of listeners) {
      try { fn(state.coins); } catch {}
    }
  }

  function setCoins(v) {
    state.coins = write(v);
    emit();
    return state.coins;
  }

  function addCoins(d) {
    return setCoins(state.coins + (Number(d) || 0));
  }

  function getCoins() {
    // всегда актуально
    state = read();
    return state.coins;
  }

  function onChange(fn) {
    listeners.add(fn);
    // сразу отдадим текущее
    try { fn(getCoins()); } catch {}
    return () => listeners.delete(fn);
  }

  // синхронизация между вкладками
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    state = read();
    emit();
  });

  // Экспорт в window
  window.SharedWallet = {
    KEY,
    getCoins,
    setCoins,
    addCoins,
    onChange,
  };
})();