(() => {
  const AUTH_KEY = "triniti_auth_v2";
  const USER_KEY = "triniti_user_v2";
  const COINS_KEY = "triniti_shared_wallet_v2";

  function safeInt(v, fallback = 0) {
    const n = Math.floor(Number(v) || 0);
    return Number.isFinite(n) ? n : fallback;
  }

  function readJSON(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  function emitChange() {
    try {
      window.dispatchEvent(new CustomEvent("triniti-wallet-changed", {
        detail: {
          isAuthed: api.isAuthed(),
          user: api.getUser(),
          coins: api.getCoins()
        }
      }));
    } catch {}
  }

  const api = {
    isAuthed() {
      try {
        return localStorage.getItem(AUTH_KEY) === "1";
      } catch {
        return false;
      }
    },

    getUser() {
      return readJSON(USER_KEY, null);
    },

    getCoins() {
      try {
        const raw = localStorage.getItem(COINS_KEY);
        if (raw == null) return 0;
        return Math.max(0, safeInt(raw, 0));
      } catch {
        return 0;
      }
    },

    setCoins(value) {
      try {
        localStorage.setItem(COINS_KEY, String(Math.max(0, safeInt(value, 0))));
      } catch {}
      emitChange();
    },

    addCoins(delta) {
      const next = Math.max(0, api.getCoins() + safeInt(delta, 0));
      api.setCoins(next);
      return next;
    },

    register(email = "") {
      const cleanEmail = String(email || "").trim() || "player@triniti.local";
      try {
        localStorage.setItem(AUTH_KEY, "1");
      } catch {}

      writeJSON(USER_KEY, {
        email: cleanEmail,
        registeredAt: Date.now()
      });

      if (api.getCoins() <= 0) {
        try {
          localStorage.setItem(COINS_KEY, "1000");
        } catch {}
      }

      emitChange();
      return true;
    },

    login(email = "") {
      const cleanEmail = String(email || "").trim();
      const prev = api.getUser();

      try {
        localStorage.setItem(AUTH_KEY, "1");
      } catch {}

      writeJSON(USER_KEY, {
        email: cleanEmail || prev?.email || "player@triniti.local",
        registeredAt: prev?.registeredAt || Date.now()
      });

      if (api.getCoins() < 0) {
        api.setCoins(0);
      } else {
        emitChange();
      }

      return true;
    },

    logout() {
      try {
        localStorage.setItem(AUTH_KEY, "0");
      } catch {}
      writeJSON(USER_KEY, null);
      emitChange();
    },

    requireAuth(message = "Сначала войдите или зарегистрируйтесь.") {
      if (api.isAuthed()) return true;
      alert(message);
      return false;
    }
  };

  if (!window.SharedWallet) {
    window.SharedWallet = api;
  }
})();