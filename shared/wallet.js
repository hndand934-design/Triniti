// shared/wallet.js
(() => {
  const KEY = "triniti_shared_wallet_v1";

  function load() {
    try {
      const w = JSON.parse(localStorage.getItem(KEY) || "null");
      if (w && typeof w.coins === "number") return w;
    } catch {}
    return { coins: 1000 };
  }
  function save(w) {
    localStorage.setItem(KEY, JSON.stringify(w));
  }

  const wallet = load();

  function setCoins(v) {
    wallet.coins = Math.max(0, Math.floor(Number(v) || 0));
    save(wallet);
    window.dispatchEvent(new CustomEvent("wallet:change", { detail: { coins: wallet.coins } }));
    return wallet.coins;
  }

  function addCoins(d) {
    return setCoins(wallet.coins + (Number(d) || 0));
  }

  function getCoins() {
    return wallet.coins;
  }

  window.TRINITI_WALLET = { KEY, getCoins, setCoins, addCoins };
})();
