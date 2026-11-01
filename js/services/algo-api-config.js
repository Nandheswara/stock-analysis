/**
 * algo-api-config.js
 * Manages brokerage API key storage and OAuth flows for Zerodha Kite Connect & Groww.
 * Keys are stored in localStorage (guest) or Firebase user profile (logged-in users).
 * Keys are NEVER sent to Equity Labs servers — only to official broker endpoints via proxy.
 */

const STORAGE_KEY = 'equityLabs_algoApiConfig';
const PROXY_BASE  = 'http://localhost:8080';

// ============================================================
//  CONFIG SCHEMA
// ============================================================
const DEFAULT_CONFIG = {
    zerodha: { apiKey: '', apiSecret: '', accessToken: '', tokenExpiry: null, connected: false },
    groww:   { apiKey: '', apiSecret: '', accessToken: '', tokenExpiry: null, connected: false },
};

// ============================================================
//  LOAD / SAVE
// ============================================================

export function loadConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return structuredClone(DEFAULT_CONFIG);
        const cfg = JSON.parse(atob(raw)); // light obfuscation — not cryptographic
        // Validate token expiry
        const now = Date.now();
        if (cfg.zerodha?.tokenExpiry && now > cfg.zerodha.tokenExpiry) {
            cfg.zerodha.accessToken = ''; cfg.zerodha.connected = false;
        }
        if (cfg.groww?.tokenExpiry && now > cfg.groww.tokenExpiry) {
            cfg.groww.accessToken = ''; cfg.groww.connected = false;
        }
        return { ...DEFAULT_CONFIG, ...cfg };
    } catch {
        return structuredClone(DEFAULT_CONFIG);
    }
}

export function saveConfig(cfg) {
    try {
        localStorage.setItem(STORAGE_KEY, btoa(JSON.stringify(cfg)));
    } catch (e) {
        console.error('[AlgoAPIConfig] Failed to save config:', e);
    }
}

export function clearConfig() {
    localStorage.removeItem(STORAGE_KEY);
}

export function updateBrokerKeys(broker, apiKey, apiSecret) {
    const cfg = loadConfig();
    cfg[broker] = { ...cfg[broker], apiKey, apiSecret, accessToken: '', connected: false };
    saveConfig(cfg);
}

export function storeAccessToken(broker, token, expiryMs) {
    const cfg = loadConfig();
    cfg[broker].accessToken = token;
    cfg[broker].tokenExpiry = Date.now() + expiryMs;
    cfg[broker].connected   = true;
    saveConfig(cfg);
}

export function getAccessToken(broker) {
    const cfg = loadConfig();
    const b = cfg[broker];
    if (!b || !b.accessToken) return null;
    if (b.tokenExpiry && Date.now() > b.tokenExpiry) return null;
    return b.accessToken;
}

export function isConnected(broker) {
    return !!getAccessToken(broker);
}

// ============================================================
//  PROXY PING
// ============================================================

export async function pingProxy() {
    try {
        const res = await fetch(`${PROXY_BASE}/ping`, { signal: AbortSignal.timeout(2000) });
        return res.ok;
    } catch {
        return false;
    }
}

// ============================================================
//  ZERODHA KITE CONNECT — OAuth flow
// ============================================================

export function initiateKiteAuth() {
    const cfg = loadConfig();
    if (!cfg.zerodha.apiKey) {
        alert('Enter your Zerodha API Key first.');
        return false;
    }
    // Kite Connect OAuth redirect
    const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${cfg.zerodha.apiKey}`;
    const popup = window.open(loginUrl, 'KiteAuth', 'width=600,height=700,left=100,top=100');
    // The redirect_uri must be set in your Kite app settings to a page that calls handleKiteCallback()
    // Here we poll for the popup URL to contain a request_token param
    let pollCount = 0;
    const poll = setInterval(() => {
        try {
            if (popup.closed) { clearInterval(poll); return; }
            const params = new URL(popup.location.href).searchParams;
            const requestToken = params.get('request_token');
            if (requestToken) {
                clearInterval(poll);
                popup.close();
                exchangeKiteToken(requestToken);
            }
        } catch { /* cross-origin, keep waiting */ }
        if (++pollCount > 300) clearInterval(poll); // 5 min timeout
    }, 1000);
    return true;
}

async function exchangeKiteToken(requestToken) {
    const cfg = loadConfig();
    try {
        // The token exchange requires HMAC-SHA256 of apiKey+requestToken+apiSecret
        // This must go through the proxy to avoid exposing the secret
        const res = await fetch(`${PROXY_BASE}/kite/session/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                api_key: cfg.zerodha.apiKey,
                request_token: requestToken,
                checksum: await computeKiteChecksum(cfg.zerodha.apiKey, requestToken, cfg.zerodha.apiSecret),
            })
        });
        const data = await res.json();
        if (data.data?.access_token) {
            storeAccessToken('zerodha', data.data.access_token, 8 * 60 * 60 * 1000); // 8h TTL
            dispatchConfigEvent('zerodha', true);
        } else {
            console.error('[Kite] Token exchange failed:', data);
            alert('Kite authentication failed. Check your API key and secret.');
        }
    } catch (e) {
        console.error('[Kite] Token exchange error:', e);
        alert('Kite connection error. Ensure the local CORS proxy is running.');
    }
}

async function computeKiteChecksum(apiKey, requestToken, secret) {
    // SHA-256 of apiKey+requestToken+apiSecret (Kite Connect spec)
    const msg = apiKey + requestToken + secret;
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
//  GROWW TRADING API — OAuth flow
// ============================================================

export function initiateGrowwAuth() {
    const cfg = loadConfig();
    if (!cfg.groww.apiKey) {
        alert('Enter your Groww API Key first.');
        return false;
    }
    const authUrl = `https://groww.in/trade-api/auth?client_id=${cfg.groww.apiKey}&response_type=code&scope=read`;
    const popup = window.open(authUrl, 'GrowwAuth', 'width=600,height=700,left=100,top=100');
    let pollCount = 0;
    const poll = setInterval(() => {
        try {
            if (popup.closed) { clearInterval(poll); return; }
            const params = new URL(popup.location.href).searchParams;
            const code = params.get('code');
            if (code) {
                clearInterval(poll);
                popup.close();
                exchangeGrowwToken(code);
            }
        } catch { /* cross-origin */ }
        if (++pollCount > 300) clearInterval(poll);
    }, 1000);
    return true;
}

async function exchangeGrowwToken(code) {
    const cfg = loadConfig();
    try {
        const res = await fetch(`${PROXY_BASE}/groww/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: cfg.groww.apiKey, client_secret: cfg.groww.apiSecret, code, grant_type: 'authorization_code' })
        });
        const data = await res.json();
        if (data.access_token) {
            storeAccessToken('groww', data.access_token, 24 * 60 * 60 * 1000); // 24h TTL
            dispatchConfigEvent('groww', true);
        } else {
            alert('Groww authentication failed.');
        }
    } catch (e) {
        console.error('[Groww] Token exchange error:', e);
        alert('Groww connection error. Ensure the local CORS proxy is running.');
    }
}

// ============================================================
//  UI EVENT
// ============================================================

function dispatchConfigEvent(broker, connected) {
    window.dispatchEvent(new CustomEvent('algoApiConfigChanged', { detail: { broker, connected } }));
}

export { PROXY_BASE };
