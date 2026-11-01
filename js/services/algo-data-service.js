/**
 * algo-data-service.js
 * Smart data fetching waterfall for OHLCV data:
 *   [1] Zerodha Kite Connect  (if token available)
 *   [2] Groww Trading API     (if token available)
 *   [3] Yahoo Finance         (via local CORS proxy, free, 15-min delayed)
 *   [4] NSE India endpoints   (via local CORS proxy)
 *   [5] Demo data             (always available, pre-loaded)
 *
 * Returns: { ohlcv: [...], source: 'kite'|'groww'|'yahoo'|'nse'|'demo', delayed: boolean }
 */

import { getAccessToken, pingProxy, PROXY_BASE } from './algo-api-config.js';

const CACHE = new Map();
const CACHE_TTL_MS   = 5 * 60 * 1000;   // 5 minutes
const REFRESH_INTERVAL_MS = 30 * 1000;   // 30 second polling

let _proxyAvailable  = null; // null = not checked yet
let _activeWebSocket = null;
let _refreshTimer    = null;
let _dataUpdateCallback = null;

// ============================================================
//  MAIN FETCH ENTRY POINT
// ============================================================

/**
 * Fetch OHLCV data for a symbol using the waterfall.
 * @param {string} symbol - NSE symbol e.g. 'RELIANCE', 'TCS'
 * @param {string} period - '1y', '6m', '3m', '1m'
 * @returns {{ ohlcv, source, delayed, symbol }}
 */
export async function fetchOHLCV(symbol, period = '1y') {
    const cacheKey = `${symbol}:${period}`;
    const cached   = CACHE.get(cacheKey);
    if (cached && Date.now() < cached.expiry) return cached.data;

    // Check proxy availability (cached for 60 seconds)
    if (_proxyAvailable === null) _proxyAvailable = await pingProxy();

    const result = await _runWaterfall(symbol, period);
    CACHE.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
    return result;
}

async function _runWaterfall(symbol, period) {
    // [1] Zerodha
    const kiteToken = getAccessToken('zerodha');
    if (kiteToken && _proxyAvailable) {
        try {
            const d = await _fetchKite(symbol, period, kiteToken);
            if (d?.length > 10) return { ohlcv: d, source: 'kite', delayed: false, symbol };
        } catch (e) { console.warn('[AlgoData] Kite failed, falling back', e); }
    }

    // [2] Groww
    const growwToken = getAccessToken('groww');
    if (growwToken && _proxyAvailable) {
        try {
            const d = await _fetchGroww(symbol, period, growwToken);
            if (d?.length > 10) return { ohlcv: d, source: 'groww', delayed: false, symbol };
        } catch (e) { console.warn('[AlgoData] Groww failed, falling back', e); }
    }

    // [3] Yahoo Finance (tries local proxy first, then public CORS proxies as fallback)
    try {
        const d = await _fetchYahoo(symbol, period);
        if (d?.length > 10) return { ohlcv: d, source: 'yahoo', delayed: true, symbol };
    } catch (e) { console.warn('[AlgoData] Yahoo failed, falling back', e); }

    // [4] NSE India via proxy (if local proxy available)
    if (_proxyAvailable) {
        try {
            const d = await _fetchNSE(symbol, period);
            if (d?.length > 10) return { ohlcv: d, source: 'nse', delayed: true, symbol };
        } catch (e) { console.warn('[AlgoData] NSE failed, using demo', e); }
    }

    // [5] Demo fallback
    return { ohlcv: getDemoData(symbol), source: 'demo', delayed: false, symbol };
}

// ============================================================
//  SOURCE IMPLEMENTATIONS
// ============================================================

async function _fetchKite(symbol, period, token) {
    const intervalMap = { '1y': 'day', '6m': 'day', '3m': 'day', '1m': 'day' };
    const daysMap     = { '1y': 365, '6m': 180, '3m': 90, '1m': 30 };
    const toDate   = new Date().toISOString().slice(0, 10);
    const fromDate = new Date(Date.now() - daysMap[period] * 864e5).toISOString().slice(0, 10);
    // Kite uses instrument token; we use symbol lookup
    const instRes = await fetch(`${PROXY_BASE}/kite/instruments/NSE`, {
        headers: { 'Authorization': `token ${token}`, 'X-Kite-Version': '3' }
    });
    const instruments = await instRes.json();
    const inst = instruments?.data?.find(i => i.tradingsymbol === symbol);
    if (!inst) throw new Error(`Instrument not found: ${symbol}`);
    const res = await fetch(`${PROXY_BASE}/kite/instruments/historical/${inst.instrument_token}/${intervalMap[period]}?from=${fromDate}&to=${toDate}`, {
        headers: { 'Authorization': `token ${token}`, 'X-Kite-Version': '3' }
    });
    const json = await res.json();
    return (json.data?.candles || []).map(c => ({
        date: c[0]?.slice(0, 10), open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5]
    }));
}

async function _fetchGroww(symbol, period, token) {
    const daysMap = { '1y': 365, '6m': 180, '3m': 90, '1m': 30 };
    const toDate   = Date.now();
    const fromDate = toDate - daysMap[period] * 864e5;
    const res = await fetch(`${PROXY_BASE}/groww/v1/hist/ohlc?exchange=NSE&tradingsymbol=${symbol}&startTime=${Math.floor(fromDate/1000)}&endTime=${Math.floor(toDate/1000)}&resolution=day`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const json = await res.json();
    return (json.data?.candles || []).map(c => ({
        date: new Date(c.epoch * 1000).toISOString().slice(0, 10),
        open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume
    }));
}

async function _fetchYahoo(symbol, period) {
    const rangeMap    = { '1y': '1y', '6m': '6mo', '3m': '3mo', '1m': '1mo' };
    const yahooSymbol = `${symbol.toUpperCase().trim()}.NS`;
    const targetUrl   = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=${rangeMap[period] || '1y'}`;

    const proxyCandidates = [];
    if (_proxyAvailable) {
        proxyCandidates.push(`${PROXY_BASE}/proxy?url=${encodeURIComponent(targetUrl)}`);
    }
    proxyCandidates.push(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`);
    proxyCandidates.push(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);

    for (const pUrl of proxyCandidates) {
        try {
            const res = await fetch(pUrl, { signal: AbortSignal.timeout(4500) });
            if (!res.ok) continue;
            const json = await res.json();
            const chart = json?.chart?.result?.[0];
            if (!chart || !chart.timestamp || !chart.indicators?.quote?.[0]) continue;
            const ts = chart.timestamp;
            const q = chart.indicators.quote[0];
            const candles = ts.map((t, i) => ({
                date: new Date(t * 1000).toISOString().slice(0, 10),
                open: +(q.open?.[i] ?? q.close?.[i] ?? 0).toFixed(2),
                high: +(q.high?.[i] ?? q.close?.[i] ?? 0).toFixed(2),
                low: +(q.low?.[i] ?? q.close?.[i] ?? 0).toFixed(2),
                close: +(q.close?.[i] ?? 0).toFixed(2),
                volume: +(q.volume?.[i] ?? 0)
            })).filter(d => d.close > 0);
            if (candles.length > 10) return candles;
        } catch {
            // try next proxy candidate
        }
    }
    throw new Error('All Yahoo proxy endpoints failed');
}

async function _fetchNSE(symbol, period) {
    const url = `https://www.nseindia.com/api/historical/cm/equity?symbol=${symbol}&series=EQ&from=01-01-2024&to=31-12-2025`;
    const proxyUrl = `${PROXY_BASE}/proxy?url=${encodeURIComponent(url)}`;
    const res  = await fetch(proxyUrl);
    const json = await res.json();
    return (json.data || []).map(d => ({
        date: d.CH_TIMESTAMP?.slice(0, 10),
        open: parseFloat(d.CH_OPENING_PRICE), high: parseFloat(d.CH_TRADE_HIGH_PRICE),
        low: parseFloat(d.CH_TRADE_LOW_PRICE), close: parseFloat(d.CH_CLOSING_PRICE),
        volume: parseInt(d.CH_TOT_TRADED_QTY)
    })).filter(d => d.close > 0).reverse();
}

// ============================================================
//  WEBSOCKET STREAMING (Kite)
// ============================================================

export function startLiveStream(symbol, onTick) {
    const token = getAccessToken('zerodha');
    if (!token) return false;
    stopLiveStream();
    // Kite WebSocket streaming
    const ws = new WebSocket(`wss://ws.kite.trade?api_key=${loadConfig_apiKey('zerodha')}&access_token=${token}`);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
        // Subscribe to the instrument
        const msg = { a: 'subscribe', v: [] }; // would need instrument tokens
        ws.send(JSON.stringify(msg));
    };
    ws.onmessage = (evt) => {
        if (evt.data instanceof ArrayBuffer) {
            // Parse binary Kite tick data
            const view = new DataView(evt.data);
            if (evt.data.byteLength < 8) return;
            const price = view.getInt32(4, false) / 100;
            onTick({ price, timestamp: Date.now() });
        }
    };
    ws.onerror = (e) => console.warn('[AlgoData] WebSocket error', e);
    _activeWebSocket = ws;
    return true;
}

export function stopLiveStream() {
    if (_activeWebSocket) { _activeWebSocket.close(); _activeWebSocket = null; }
}

function loadConfig_apiKey(broker) {
    try { return JSON.parse(atob(localStorage.getItem('equityLabs_algoApiConfig') || ''))?.[broker]?.apiKey || ''; } catch { return ''; }
}

// ============================================================
//  AUTO-REFRESH POLLING
// ============================================================

export function startAutoRefresh(symbol, period, callback) {
    stopAutoRefresh();
    _dataUpdateCallback = callback;
    const run = async () => {
        if (!isMarketHours()) return;
        const data = await fetchOHLCV(symbol, period);
        callback(data);
    };
    _refreshTimer = setInterval(run, REFRESH_INTERVAL_MS);
}

export function stopAutoRefresh() {
    if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
}

function isMarketHours() {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const h = ist.getHours(), m = ist.getMinutes(), day = ist.getDay();
    if (day === 0 || day === 6) return false; // Weekend
    const openMin  = 9 * 60 + 15;
    const closeMin = 15 * 60 + 30;
    const curMin   = h * 60 + m;
    return curMin >= openMin && curMin <= closeMin;
}

export function getProxyStatus() { return _proxyAvailable; }

export async function refreshProxyStatus() {
    const { pingProxy } = await import('./algo-api-config.js');
    _proxyAvailable = await pingProxy();
    return _proxyAvailable;
}

// ============================================================
//  DEMO DATA & STATS UTILITIES
// ============================================================

export function getOHLCVStats(ohlcv) {
    if (!ohlcv || !ohlcv.length) return null;
    const last = ohlcv[ohlcv.length - 1];
    const prev = ohlcv.length > 1 ? ohlcv[ohlcv.length - 2] : last;
    const change = +(last.close - prev.close).toFixed(2);
    const changePercent = prev.close > 0 ? +((change / prev.close) * 100).toFixed(2) : 0;

    let high52w = -Infinity;
    let low52w = Infinity;
    for (const c of ohlcv) {
        if (c.high > high52w) high52w = c.high;
        if (c.low < low52w) low52w = c.low;
    }

    return {
        ltp: last.close,
        change,
        changePercent,
        high: last.high,
        low: last.low,
        volume: last.volume,
        high52w: high52w === -Infinity ? last.high : +high52w.toFixed(2),
        low52w: low52w === Infinity ? last.low : +low52w.toFixed(2),
        date: last.date,
        count: ohlcv.length
    };
}

export function getDemoData(symbol = 'RELIANCE') {
    const sym = (symbol || 'RELIANCE').toUpperCase().trim();
    const knownSeeds = {
        RELIANCE:   { start: 2980, vol: 9.5e6, trend: 0.0003 },
        TCS:        { start: 3920, vol: 3.2e6, trend: 0.0002 },
        INFY:       { start: 1540, vol: 8.4e6, trend: -0.0001 },
        HDFC:       { start: 1720, vol: 1.1e7, trend: 0.0001 },
        HDFCBANK:   { start: 1680, vol: 1.2e7, trend: 0.0002 },
        ICICIBANK:  { start: 1195, vol: 1.4e7, trend: 0.0004 },
        SBIN:       { start: 815,  vol: 2.1e7, trend: 0.0003 },
        TATAMOTORS: { start: 975,  vol: 1.6e7, trend: 0.0005 },
        WIPRO:      { start: 495,  vol: 6.8e6, trend: -0.0002 },
        BAJFINANCE: { start: 7250, vol: 1.5e6, trend: 0.0002 },
        ASIANPAINT: { start: 2890, vol: 1.8e6, trend: -0.0003 },
        MARUTI:     { start: 12450,vol: 8.5e5, trend: 0.0004 },
        TITAN:      { start: 3480, vol: 2.1e6, trend: 0.0003 },
        HCLTECH:    { start: 1740, vol: 3.9e6, trend: 0.0002 },
        KOTAKBANK:  { start: 1780, vol: 4.5e6, trend: 0.0001 },
        BHARTIARTL: { start: 1460, vol: 8.2e6, trend: 0.0005 },
        ITC:        { start: 505,  vol: 2.5e7, trend: 0.0002 },
        LT:         { start: 3620, vol: 2.8e6, trend: 0.0003 }
    };

    let cfg = knownSeeds[sym];
    let seedOffset = 0;
    if (!cfg) {
        let hash = 0;
        for (let i = 0; i < sym.length; i++) {
            hash = ((hash << 5) - hash) + sym.charCodeAt(i) | 0;
        }
        const absHash = Math.abs(hash);
        const derivedStart = 250 + (absHash % 4500);
        const derivedVol   = 1e6 + (absHash % 15) * 1e6;
        const derivedTrend = ((absHash % 10) - 4) * 0.0001;
        seedOffset = absHash % 100000;
        cfg = { start: derivedStart, vol: derivedVol, trend: derivedTrend };
    } else {
        let hash = 0;
        for (let i = 0; i < sym.length; i++) hash = ((hash << 5) - hash) + sym.charCodeAt(i) | 0;
        seedOffset = Math.abs(hash) % 50000;
    }

    const candles = [];
    let price = cfg.start;
    const startDate = new Date(Date.now() - 365 * 864e5);
    let seed = cfg.start + seedOffset;
    function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

    for (let i = 0; i < 365; i++) {
        const d = new Date(startDate.getTime() + i * 864e5);
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const dailyRet = (rand() - 0.49) * 0.028 + (cfg.trend || 0);
        const open     = price * (1 + (rand() - 0.5) * 0.005);
        const close    = open * (1 + dailyRet);
        const high     = Math.max(open, close) * (1 + rand() * 0.012);
        const low      = Math.min(open, close) * (1 - rand() * 0.012);
        const volume   = Math.round(cfg.vol * (0.5 + rand()));
        candles.push({ date: d.toISOString().slice(0, 10), open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2), volume });
        price = close;
    }
    return candles;
}

export const DEMO_SYMBOLS = ['RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK', 'SBIN', 'TATAMOTORS', 'WIPRO', 'BAJFINANCE', 'ASIANPAINT', 'MARUTI', 'TITAN'];

