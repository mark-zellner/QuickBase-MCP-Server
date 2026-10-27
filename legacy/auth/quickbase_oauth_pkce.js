// Quickbase OAuth2 PKCE helper for browser-based apps / code pages
// Usage:
//   const qbAuth = new QuickbaseAuth({ realm: "yourrealm.quickbase.com", clientId: "...", redirectUri: "...", scopes: ["read:table", "write:table"] });
//   await qbAuth.handleRedirect(); // call on page load to complete code exchange
//   if (!qbAuth.isAuthenticated()) qbAuth.login(); // redirect to Quickbase authorize
//   const resp = await qbAuth.apiFetch("https://api.quickbase.com/v1/records", { method: "POST", body: JSON.stringify(...) });

(function () {
  const STORAGE_KEYS = {
    codeVerifier: "qb_pkce_code_verifier",
    oauthState: "qb_oauth_state",
    token: "qb_oauth_token",
  };

  function base64UrlEncode(arrayBuffer) {
    let str = btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));
    return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function generateRandomString(length = 64) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => ("0" + b.toString(16)).slice(-2)).join("");
  }

  async function sha256(input) {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    return await crypto.subtle.digest("SHA-256", data);
  }

  function toFormBody(params) {
    return Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null)
      .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
      .join("&");
  }

  class QuickbaseAuth {
    constructor({ realm, clientId, redirectUri, scopes = ["read:table", "write:table"], tokenEndpoint = "https://api.quickbase.com/oauth2/token", authorizePath = "/oauth2/authorize", storage = sessionStorage } = {}) {
      if (!realm || !clientId || !redirectUri) throw new Error("QuickbaseAuth requires realm, clientId, and redirectUri");
      this.realm = realm;
      this.clientId = clientId;
      this.redirectUri = redirectUri;
      this.scopes = scopes;
      this.tokenEndpoint = tokenEndpoint;
      this.authorizeUrl = `https://${realm}${authorizePath}`;
      this.storage = storage;
    }

    // Begin OAuth by redirecting to QB authorize
    async login({ prompt = "consent" } = {}) {
      const state = generateRandomString(24);
      const codeVerifier = generateRandomString(96);
      const codeChallenge = base64UrlEncode(await sha256(codeVerifier));

      this.storage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier);
      this.storage.setItem(STORAGE_KEYS.oauthState, state);

      const url = new URL(this.authorizeUrl);
      url.searchParams.set("client_id", this.clientId);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("redirect_uri", this.redirectUri);
      url.searchParams.set("scope", this.scopes.join(" "));
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
      url.searchParams.set("prompt", prompt);

      window.location.assign(url.toString());
    }

    logout() {
      this.storage.removeItem(STORAGE_KEYS.token);
      this.storage.removeItem(STORAGE_KEYS.codeVerifier);
      this.storage.removeItem(STORAGE_KEYS.oauthState);
    }

    isAuthenticated() {
      const token = this._getToken();
      if (!token || !token.access_token) return false;
      if (!token.expires_at) return true; // lack of exp means we try to use it
      return Date.now() < token.expires_at - 30000; // 30s early
    }

    _getToken() {
      try { return JSON.parse(this.storage.getItem(STORAGE_KEYS.token) || "null"); } catch { return null; }
    }

    _setToken(tok) {
      this.storage.setItem(STORAGE_KEYS.token, JSON.stringify(tok));
    }

    async handleRedirect() {
      // Complete the code->token exchange if URL contains code
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      if (!code) return false;

      const expectedState = this.storage.getItem(STORAGE_KEYS.oauthState);
      const codeVerifier = this.storage.getItem(STORAGE_KEYS.codeVerifier);
      // Clean URL quickly to avoid reprocessing on reload
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);

      if (!state || state !== expectedState) throw new Error("OAuth state mismatch");
      if (!codeVerifier) throw new Error("Missing PKCE code_verifier");

      const formBody = toFormBody({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
        client_id: this.clientId,
      });

      const resp = await fetch(this.tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "QB-Realm-Hostname": this.realm,
        },
        body: formBody,
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`Token exchange failed: ${resp.status} ${text}`);
      }
      const tok = await resp.json().catch(() => ({}));
      const expiresAt = tok.expires_in ? Date.now() + tok.expires_in * 1000 : undefined;
      this._setToken({ ...tok, expires_at: expiresAt });
      this.storage.removeItem(STORAGE_KEYS.codeVerifier);
      this.storage.removeItem(STORAGE_KEYS.oauthState);
      return true;
    }

    async ensureFreshToken() {
      const tok = this._getToken();
      if (!tok) return null;
      if (tok.expires_at && Date.now() < tok.expires_at - 30000) return tok;
      if (!tok.refresh_token) return tok; // cannot refresh

      const formBody = toFormBody({
        grant_type: "refresh_token",
        refresh_token: tok.refresh_token,
        client_id: this.clientId,
      });
      const resp = await fetch(this.tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "QB-Realm-Hostname": this.realm,
        },
        body: formBody,
      });
      if (!resp.ok) {
        // refresh failed; clear and force login next time
        this.logout();
        return null;
      }
      const newTok = await resp.json().catch(() => ({}));
      const expiresAt = newTok.expires_in ? Date.now() + newTok.expires_in * 1000 : undefined;
      const merged = { ...tok, ...newTok, expires_at: expiresAt };
      this._setToken(merged);
      return merged;
    }

    async getAccessToken() {
      const tok = await this.ensureFreshToken();
      return tok?.access_token || null;
    }

    async apiFetch(url, options = {}) {
      const token = await this.getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const headers = new Headers(options.headers || {});
      if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
      if (!headers.has("QB-Realm-Hostname")) headers.set("QB-Realm-Hostname", this.realm);
      if (!headers.has("Content-Type") && options.body && typeof options.body === "string") headers.set("Content-Type", "application/json");
      return fetch(url, { ...options, headers });
    }
  }

  // UMD-style export
  if (typeof window !== "undefined") window.QuickbaseAuth = QuickbaseAuth;
})();
