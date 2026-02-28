(() => {
  const KEY = "triniti_shared_wallet_v1";

  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "null");
      if (v && typeof v.coins === "number") return { coins: Math.max(0, Math.floor(v.coins)) };
    } catch {}
    return { coins: 1000 };
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify({ coins: Math.max(0, Math.floor(state.coins)) }));
  }

  const state = load();

  const api = {
    getCoins() { return Math.max(0, Math.floor(state.coins)); },
    setCoins(n) { state.coins = Math.max(0, Math.floor(Number(n) || 0)); save(state); },
    addCoins(d) { state.coins = Math.max(0, Math.floor(state.coins + (Number(d) || 0))); save(state); }
  };

  // если уже был создан — не перезатираем (безопасно)
  if (!window.SharedWallet) window.SharedWallet = api;
})();