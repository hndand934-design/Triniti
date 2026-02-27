(() => {
  const KEY = "triniti_shared_wallet_v1";

  function load() {
    try {
      const w = JSON.parse(localStorage.getItem(KEY) || "null");
      if (w && typeof w.coins === "number") return { coins: Math.floor(w.coins) };
    } catch {}
    return { coins: 1000 };
  }

  function save(w) {
    localStorage.setItem(KEY, JSON.stringify({ coins: Math.floor(w.coins) }));
  }

  let state = load();

  function setCoins(v) {
    state.coins = Math.max(0, Math.floor(Number(v) || 0));
    save(state);
    return state.coins;
  }

  function addCoins(d) {
    return setCoins(state.coins + Math.floor(Number(d) || 0));
  }

  function getCoins() {
    // всегда читаем актуальное (если другое окно поменяло)
    state = load();
    return state.coins;
  }

  // Глобальный API для всех режимов
  window.SharedWallet = {
    KEY,
    getCoins,
    setCoins,
    addCoins
  };
})();