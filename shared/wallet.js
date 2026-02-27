/* shared/wallet.js — единый кошелёк TRINITI (safe) */
(() => {
  const KEY = "triniti_wallet_v1";

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

  function emit() {
    try {
      window.dispatchEvent(new CustomEvent("wallet:update", { detail: { coins: state.coins } }));
    } catch {}
  }

  function clamp(v) {
    return Math.max(0, Math.floor(Number(v) || 0));
  }

  const api = {
    getCoins() {
      return state.coins;
    },
    setCoins(v) {
      state.coins = clamp(v);
      save(state);
      emit();
      return state.coins;
    },
    addCoins(d) {
      state.coins = clamp(state.coins + (Number(d) || 0));
      save(state);
      emit();
      return state.coins;
    }
  };

  window.SharedWallet = api;

  // на всякий случай — обновим сразу
  emit();
})();