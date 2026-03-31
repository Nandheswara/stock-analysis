/**
 * Market Movers Module - Dynamic Top Gainers and Losers (Side by Side)
 * Fetches REAL-TIME daily top movers from NSE India / Yahoo Finance
 * NO hardcoded stock symbols - 100% dynamic data
 *
 * Features:
 * - Market hours aware (9:00 AM - 3:30 PM IST, Mon-Fri)
 * - Adaptive cache TTL and auto-refresh intervals
 * - Diff-based rendering with flash animations for changed rows
 * - Visibility-aware polling (pauses when tab is hidden)
 * - LIVE badge and countdown timer during trading hours
 *
 * @module market-movers
 */

const MarketMovers = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        ITEMS_PER_PAGE: 10,
        CACHE_KEY_PREFIX: 'market_movers_dynamic_v3',
        MAX_STOCKS: 50,
        INDEX_PREF_KEY: 'market_movers_index_pref',
        CORS_PROXIES: [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ],
        // Adaptive intervals based on market status
        REFRESH_INTERVALS: {
            MARKET_OPEN: 60 * 1000,       // 60 seconds during trading
            PRE_POST_MARKET: 3 * 60 * 1000, // 3 minutes pre/post market
            MARKET_CLOSED: 0               // No auto-refresh when closed
        },
        CACHE_DURATIONS: {
            MARKET_OPEN: 30 * 1000,        // 30 seconds during trading
            PRE_POST_MARKET: 2 * 60 * 1000,  // 2 minutes pre/post market
            MARKET_CLOSED: 30 * 60 * 1000    // 30 minutes when closed
        },
        // IST = UTC + 5:30 (offset in minutes)
        IST_OFFSET: 330
    };

    // Index options for the source selector
    const INDEX_OPTIONS = [
        { value: 'auto',              label: 'Auto (Best Source)',  apiParam: null },
        { value: 'NIFTY 50',          label: 'NIFTY 50',           apiParam: 'NIFTY%2050' },
        { value: 'NIFTY 100',         label: 'NIFTY 100',          apiParam: 'NIFTY%20100' },
        { value: 'NIFTY 200',         label: 'NIFTY 200',          apiParam: 'NIFTY%20200' },
        { value: 'NIFTY 500',         label: 'NIFTY 500',          apiParam: 'NIFTY%20500' },
        { value: 'NIFTY BANK',        label: 'NIFTY Bank',         apiParam: 'NIFTY%20BANK' },
        { value: 'NIFTY IT',          label: 'NIFTY IT',           apiParam: 'NIFTY%20IT' },
        { value: 'NIFTY PHARMA',      label: 'NIFTY Pharma',       apiParam: 'NIFTY%20PHARMA' },
        { value: 'NIFTY AUTO',        label: 'NIFTY Auto',         apiParam: 'NIFTY%20AUTO' },
        { value: 'NIFTY FMCG',       label: 'NIFTY FMCG',         apiParam: 'NIFTY%20FMCG' },
        { value: 'NIFTY METAL',       label: 'NIFTY Metal',        apiParam: 'NIFTY%20METAL' },
        { value: 'NIFTY ENERGY',      label: 'NIFTY Energy',       apiParam: 'NIFTY%20ENERGY' },
        { value: 'NIFTY REALTY',      label: 'NIFTY Realty',       apiParam: 'NIFTY%20REALTY' },
        { value: 'NIFTY INFRA',       label: 'NIFTY Infra',        apiParam: 'NIFTY%20INFRA' },
        { value: 'NIFTY MIDCAP 50',   label: 'NIFTY Midcap 50',   apiParam: 'NIFTY%20MIDCAP%2050' },
        { value: 'NIFTY MIDCAP 100',  label: 'NIFTY Midcap 100',  apiParam: 'NIFTY%20MIDCAP%20100' },
        { value: 'NIFTY SMLCAP 50',   label: 'NIFTY Smallcap 50', apiParam: 'NIFTY%20SMLCAP%2050' },
        { value: 'NIFTY SMLCAP 100',  label: 'NIFTY Smallcap 100',apiParam: 'NIFTY%20SMLCAP%20100' }
    ];

    // Index option groups for the selector UI
    const INDEX_GROUPS = [
        {
            label: 'Broad Market',
            options: INDEX_OPTIONS.filter(o =>
                ['auto', 'NIFTY 50', 'NIFTY 100', 'NIFTY 200', 'NIFTY 500'].includes(o.value)
            )
        },
        {
            label: 'Sectoral',
            options: INDEX_OPTIONS.filter(o =>
                ['NIFTY BANK', 'NIFTY IT', 'NIFTY PHARMA', 'NIFTY AUTO', 'NIFTY FMCG',
                 'NIFTY METAL', 'NIFTY ENERGY', 'NIFTY REALTY', 'NIFTY INFRA'].includes(o.value)
            )
        },
        {
            label: 'Mid & Small Cap',
            options: INDEX_OPTIONS.filter(o =>
                ['NIFTY MIDCAP 50', 'NIFTY MIDCAP 100', 'NIFTY SMLCAP 50', 'NIFTY SMLCAP 100'].includes(o.value)
            )
        }
    ];

    // API Endpoints
    const API = {
        NSE_GAINERS: 'https://www.nseindia.com/api/live-analysis-variations?index=gainers',
        NSE_LOSERS: 'https://www.nseindia.com/api/live-analysis-variations?index=losers',
        YAHOO_SCREENER: 'https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved',
        GROWW_TOP_GAINERS: 'https://groww.in/v1/api/stocks_data/v2/top_gainers',
        GROWW_TOP_LOSERS: 'https://groww.in/v1/api/stocks_data/v2/top_losers',
        NSE_INDEX: 'https://www.nseindia.com/api/equity-stockIndices?index='
    };

    // State
    let state = {
        gainers: [],
        losers: [],
        gainersPage: 1,
        losersPage: 1,
        isLoading: false,
        dataSource: null,
        autoRefreshTimer: null,
        countdownTimer: null,
        countdownSeconds: 0,
        marketStatus: 'closed', // 'open', 'pre_post', 'closed'
        lastFetchTime: null,
        selectedIndex: loadIndexPref() // 'auto' or a specific NIFTY index
    };

    /** Load saved index preference from localStorage */
    function loadIndexPref() {
        try {
            return localStorage.getItem(CONFIG.INDEX_PREF_KEY) || 'auto';
        } catch (e) { return 'auto'; }
    }

    /** Save index preference to localStorage */
    function saveIndexPref(value) {
        try { localStorage.setItem(CONFIG.INDEX_PREF_KEY, value); } catch (e) { /* ignore */ }
    }

    /** Get cache key scoped to selected index */
    function getCacheKey() {
        return CONFIG.CACHE_KEY_PREFIX + '_' + state.selectedIndex.replace(/\s+/g, '_');
    }

    // Dynamic stock name mapping
    let stockNamesCache = {};
    const STOCK_NAMES_CACHE_KEY = 'nse_stock_names_v1';
    const STOCK_NAMES_CACHE_DURATION = 24 * 60 * 60 * 1000;

    /* ========================================
       Market Hours Detection (IST)
       ======================================== */

    /**
     * Get current time in IST
     * @returns {Date} Date object adjusted to IST
     */
    function getISTTime() {
        const now = new Date();
        const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utcMs + (CONFIG.IST_OFFSET * 60000));
    }

    /**
     * Determine current market status
     * @returns {'open'|'pre_post'|'closed'} Market status
     */
    function getMarketStatus() {
        const ist = getISTTime();
        const day = ist.getDay(); // 0=Sun, 6=Sat
        const hours = ist.getHours();
        const minutes = ist.getMinutes();
        const timeInMinutes = hours * 60 + minutes;

        // Weekend
        if (day === 0 || day === 6) return 'closed';

        // Market open: 9:15 AM - 3:30 PM IST
        const marketOpen = 9 * 60 + 15;   // 9:15 AM
        const marketClose = 15 * 60 + 30;  // 3:30 PM

        // Pre-market: 8:30 AM - 9:15 AM
        const preMarketStart = 8 * 60 + 30;
        // Post-market: 3:30 PM - 4:00 PM
        const postMarketEnd = 16 * 60;

        if (timeInMinutes >= marketOpen && timeInMinutes < marketClose) {
            return 'open';
        }
        if ((timeInMinutes >= preMarketStart && timeInMinutes < marketOpen) ||
            (timeInMinutes >= marketClose && timeInMinutes < postMarketEnd)) {
            return 'pre_post';
        }
        return 'closed';
    }

    /**
     * Get the appropriate cache duration based on market status
     */
    function getCacheDuration() {
        const status = getMarketStatus();
        switch (status) {
            case 'open': return CONFIG.CACHE_DURATIONS.MARKET_OPEN;
            case 'pre_post': return CONFIG.CACHE_DURATIONS.PRE_POST_MARKET;
            default: return CONFIG.CACHE_DURATIONS.MARKET_CLOSED;
        }
    }

    /**
     * Get the appropriate auto-refresh interval based on market status
     */
    function getRefreshInterval() {
        const status = getMarketStatus();
        switch (status) {
            case 'open': return CONFIG.REFRESH_INTERVALS.MARKET_OPEN;
            case 'pre_post': return CONFIG.REFRESH_INTERVALS.PRE_POST_MARKET;
            default: return CONFIG.REFRESH_INTERVALS.MARKET_CLOSED;
        }
    }

    /**
     * Get a human-friendly label for current market status
     */
    function getMarketStatusLabel() {
        const status = getMarketStatus();
        switch (status) {
            case 'open': return 'Market Open';
            case 'pre_post': return 'Pre/Post Market';
            default: return 'Market Closed';
        }
    }

    /* ========================================
       Stock Names Cache
       ======================================== */

    async function fetchStockNames() {
        const cached = getStockNamesFromCache();
        if (cached) {
            stockNamesCache = cached;
            return;
        }

        const indices = [
            'NIFTY%20500',
            'NIFTY%20TOTAL%20MARKET',
            'NIFTY%20MIDCAP%20150'
        ];

        for (const index of indices) {
            try {
                const url = `https://www.nseindia.com/api/equity-stockIndices?index=${index}`;
                const data = await fetchWithProxy(url);
                if (data?.data && Array.isArray(data.data)) {
                    data.data.forEach(stock => {
                        const symbol = stock.symbol || stock.meta?.symbol;
                        const companyName = stock.meta?.companyName;
                        if (symbol && companyName && !stockNamesCache[symbol]) {
                            stockNamesCache[symbol] = companyName
                                .replace(/\s+Limited$/i, '')
                                .replace(/\s+Ltd\.?$/i, '')
                                .trim();
                        }
                    });
                }
            } catch (error) {
                // Expected failure for some indices
            }
        }

        if (Object.keys(stockNamesCache).length > 0) {
            saveStockNamesToCache(stockNamesCache);
        }
    }

    function getStockNamesFromCache() {
        try {
            const cached = localStorage.getItem(STOCK_NAMES_CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < STOCK_NAMES_CACHE_DURATION) {
                    return data.names;
                }
            }
        } catch (e) {
            // Cache read error
        }
        return null;
    }

    function saveStockNamesToCache(names) {
        try {
            localStorage.setItem(STOCK_NAMES_CACHE_KEY, JSON.stringify({
                names,
                timestamp: Date.now()
            }));
        } catch (e) {
            // Cache write error
        }
    }

    function getStockName(symbol, apiName) {
        if (apiName && apiName !== symbol && apiName !== 'N/A') {
            return apiName
                .replace(/\s+Limited$/i, '')
                .replace(/\s+Ltd\.?$/i, '')
                .trim();
        }
        return stockNamesCache[symbol] || '';
    }

    /* ========================================
       Data Fetching
       ======================================== */

    async function fetchWithProxy(url, options = {}) {
        for (const proxy of CONFIG.CORS_PROXIES) {
            try {
                const proxyUrl = proxy + encodeURIComponent(url);
                const response = await fetch(proxyUrl, {
                    ...options,
                    headers: { 'Accept': 'application/json', ...options.headers }
                });
                if (response.ok) {
                    const text = await response.text();
                    try {
                        return JSON.parse(text);
                    } catch {
                        if (text.includes('{')) {
                            const jsonStart = text.indexOf('{');
                            const jsonEnd = text.lastIndexOf('}') + 1;
                            return JSON.parse(text.slice(jsonStart, jsonEnd));
                        }
                    }
                }
            } catch (error) {
                // Proxy failure is expected during fallback
            }
        }
        throw new Error('All proxies failed');
    }

    async function fetchFromNSE() {
        const [gainersData, losersData] = await Promise.all([
            fetchWithProxy(API.NSE_GAINERS),
            fetchWithProxy(API.NSE_LOSERS)
        ]);
        const parseNSEData = (data) => {
            if (!data?.data) return [];
            return data.data.slice(0, CONFIG.MAX_STOCKS).map(stock => {
                const symbol = stock.symbol || 'N/A';
                const companyName = stock.companyName || stock.meta?.companyName || stock.symbol || 'N/A';
                if (symbol && companyName && companyName !== symbol && !stockNamesCache[symbol]) {
                    stockNamesCache[symbol] = companyName.replace(/\s+Limited$/i, '').replace(/\s+Ltd\.?$/i, '').trim();
                }
                return {
                    symbol, name: companyName,
                    price: parseFloat(stock.ltp) || parseFloat(stock.lastPrice) || 0,
                    change: parseFloat(stock.change) || 0,
                    changePercent: parseFloat(stock.pChange) || parseFloat(stock.perChange) || 0,
                    volume: parseInt(stock.tradedQuantity) || parseInt(stock.totalTradedVolume) || 0
                };
            });
        };
        const gainers = parseNSEData(gainersData);
        const losers = parseNSEData(losersData);
        if (gainers.length > 0 || losers.length > 0) {
            state.dataSource = 'NSE India';
            if (Object.keys(stockNamesCache).length > 0) saveStockNamesToCache(stockNamesCache);
            return { gainers, losers };
        }
        throw new Error('No data from NSE');
    }

    async function fetchFromGroww() {
        const [gainersData, losersData] = await Promise.all([
            fetchWithProxy(API.GROWW_TOP_GAINERS),
            fetchWithProxy(API.GROWW_TOP_LOSERS)
        ]);
        const parseGrowwData = (data) => {
            const stocks = data?.stocks || data?.records || data || [];
            if (!Array.isArray(stocks)) return [];
            return stocks.slice(0, CONFIG.MAX_STOCKS).map(stock => {
                const symbol = stock.nseScriptCode || stock.bseScriptCode || stock.symbol || 'N/A';
                const companyName = stock.companyName || stock.companyShortName || stock.symbol || 'N/A';
                if (symbol && companyName && companyName !== symbol && !stockNamesCache[symbol]) {
                    stockNamesCache[symbol] = companyName.replace(/\s+Limited$/i, '').replace(/\s+Ltd\.?$/i, '').trim();
                }
                return {
                    symbol, name: companyName,
                    price: parseFloat(stock.ltp) || parseFloat(stock.close) || 0,
                    change: parseFloat(stock.dayChange) || 0,
                    changePercent: parseFloat(stock.dayChangePerc) || 0,
                    volume: parseInt(stock.volume) || 0
                };
            });
        };
        const gainers = parseGrowwData(gainersData);
        const losers = parseGrowwData(losersData);
        if (gainers.length > 0 || losers.length > 0) {
            state.dataSource = 'Groww';
            if (Object.keys(stockNamesCache).length > 0) saveStockNamesToCache(stockNamesCache);
            return { gainers, losers };
        }
        throw new Error('No data from Groww');
    }

    async function fetchFromYahooScreener() {
        const gainersUrl = `${API.YAHOO_SCREENER}?scrIds=day_gainers&count=${CONFIG.MAX_STOCKS}`;
        const losersUrl = `${API.YAHOO_SCREENER}?scrIds=day_losers&count=${CONFIG.MAX_STOCKS}`;
        const [gainersData, losersData] = await Promise.all([
            fetchWithProxy(gainersUrl),
            fetchWithProxy(losersUrl)
        ]);
        const parseYahooData = (data) => {
            const quotes = data?.finance?.result?.[0]?.quotes || [];
            return quotes
                .filter(q => q.symbol?.endsWith('.NS') || q.symbol?.endsWith('.BO'))
                .slice(0, CONFIG.MAX_STOCKS)
                .map(stock => {
                    const symbol = stock.symbol?.replace(/\.(NS|BO)$/, '') || 'N/A';
                    const companyName = stock.shortName || stock.longName || stock.symbol || 'N/A';
                    if (symbol && companyName && companyName !== symbol && !stockNamesCache[symbol]) {
                        stockNamesCache[symbol] = companyName.replace(/\s+Limited$/i, '').replace(/\s+Ltd\.?$/i, '').trim();
                    }
                    return {
                        symbol, name: companyName,
                        price: stock.regularMarketPrice || 0,
                        change: stock.regularMarketChange || 0,
                        changePercent: stock.regularMarketChangePercent || 0,
                        volume: stock.regularMarketVolume || 0
                    };
                });
        };
        let gainers = parseYahooData(gainersData);
        let losers = parseYahooData(losersData);
        if (gainers.length > 0 || losers.length > 0) {
            state.dataSource = 'Yahoo Finance';
            if (Object.keys(stockNamesCache).length > 0) saveStockNamesToCache(stockNamesCache);
            return { gainers, losers };
        }
        throw new Error('No Indian stocks from Yahoo');
    }

    /**
     * Fetch gainers/losers for a specific NIFTY index
     */
    async function fetchFromSpecificIndex(indexValue) {
        const option = INDEX_OPTIONS.find(o => o.value === indexValue);
        if (!option || !option.apiParam) throw new Error('Invalid index');

        const url = `${API.NSE_INDEX}${option.apiParam}`;
        const data = await fetchWithProxy(url);
        if (!data?.data) throw new Error('No data from ' + indexValue);

        const stocks = data.data
            .filter(stock => stock.symbol !== indexValue)
            .map(stock => {
                const symbol = stock.symbol || 'N/A';
                const companyName = stock.meta?.companyName || stock.symbol;
                if (symbol && companyName && !stockNamesCache[symbol]) {
                    stockNamesCache[symbol] = companyName.replace(/\s+Limited$/i, '').replace(/\s+Ltd\.?$/i, '').trim();
                }
                return {
                    symbol, name: companyName,
                    price: parseFloat(stock.lastPrice) || parseFloat(stock.ltp) || 0,
                    change: parseFloat(stock.change) || 0,
                    changePercent: parseFloat(stock.pChange) || 0,
                    volume: parseInt(stock.totalTradedVolume) || 0
                };
            })
            .filter(s => s.price > 0);

        const sorted = [...stocks].sort((a, b) => b.changePercent - a.changePercent);
        const gainers = sorted.filter(s => s.changePercent > 0).slice(0, CONFIG.MAX_STOCKS);
        const losers = sorted.filter(s => s.changePercent < 0).reverse().slice(0, CONFIG.MAX_STOCKS);

        if (gainers.length > 0 || losers.length > 0) {
            state.dataSource = `NSE ${option.label}`;
            if (Object.keys(stockNamesCache).length > 0) saveStockNamesToCache(stockNamesCache);
            return { gainers, losers };
        }
        throw new Error('No data from ' + indexValue);
    }

    async function fetchFromNSEIndices() {
        const url = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20100';
        const data = await fetchWithProxy(url);
        if (!data?.data) throw new Error('No data');
        const stocks = data.data
            .filter(stock => stock.symbol !== 'NIFTY 100')
            .map(stock => {
                const symbol = stock.symbol || 'N/A';
                const companyName = stock.meta?.companyName || stock.symbol;
                if (symbol && companyName && !stockNamesCache[symbol]) {
                    stockNamesCache[symbol] = companyName.replace(/\s+Limited$/i, '').replace(/\s+Ltd\.?$/i, '').trim();
                }
                return {
                    symbol, name: companyName,
                    price: parseFloat(stock.lastPrice) || parseFloat(stock.ltp) || 0,
                    change: parseFloat(stock.change) || 0,
                    changePercent: parseFloat(stock.pChange) || 0,
                    volume: parseInt(stock.totalTradedVolume) || 0
                };
            })
            .filter(s => s.price > 0);
        const sorted = [...stocks].sort((a, b) => b.changePercent - a.changePercent);
        const gainers = sorted.filter(s => s.changePercent > 0).slice(0, CONFIG.MAX_STOCKS);
        const losers = sorted.filter(s => s.changePercent < 0).reverse().slice(0, CONFIG.MAX_STOCKS);
        if (gainers.length > 0 || losers.length > 0) {
            state.dataSource = 'NSE NIFTY 100';
            if (Object.keys(stockNamesCache).length > 0) saveStockNamesToCache(stockNamesCache);
            return { gainers, losers };
        }
        throw new Error('No data from NSE indices');
    }

    /**
     * Main fetch function - tries multiple strategies
     * When a specific index is selected, fetches directly from NSE for that index.
     * When 'auto', falls back through multiple sources.
     */
    async function fetchMarketMovers() {
        showLoading(true);

        const cached = getCache();
        if (cached) {
            state.dataSource = cached.source;
            showLoading(false);
            return { gainers: cached.gainers, losers: cached.losers };
        }

        // If a specific index is selected, fetch directly from NSE for that index
        if (state.selectedIndex !== 'auto') {
            try {
                const result = await fetchFromSpecificIndex(state.selectedIndex);
                if (result.gainers.length > 0 || result.losers.length > 0) {
                    setCache(result.gainers, result.losers, state.dataSource);
                    state.lastFetchTime = Date.now();
                    showLoading(false);
                    return result;
                }
            } catch (error) {
                // Fall through to auto strategies
            }
        }

        const strategies = [
            { name: 'Groww', fn: fetchFromGroww },
            { name: 'Yahoo Screener', fn: fetchFromYahooScreener },
            { name: 'NSE Gainers/Losers', fn: fetchFromNSE },
            { name: 'NSE NIFTY', fn: fetchFromNSEIndices }
        ];

        for (const strategy of strategies) {
            try {
                const result = await strategy.fn();
                if (result.gainers.length > 0 || result.losers.length > 0) {
                    setCache(result.gainers, result.losers, state.dataSource);
                    state.lastFetchTime = Date.now();
                    showLoading(false);
                    return result;
                }
            } catch (error) {
                // Strategy failure is expected during fallback
            }
        }

        showLoading(false);
        showError('Unable to fetch market data. Please try again later.');
        return { gainers: [], losers: [] };
    }

    /* ========================================
       Cache Functions (Market-Hours Aware)
       ======================================== */

    function getCache() {
        try {
            const cached = localStorage.getItem(getCacheKey());
            if (cached) {
                const data = JSON.parse(cached);
                const cacheDuration = getCacheDuration();
                if (Date.now() - data.timestamp < cacheDuration) {
                    return data;
                }
            }
        } catch (e) {
            // Cache read error
        }
        return null;
    }

    function setCache(gainers, losers, source) {
        try {
            localStorage.setItem(getCacheKey(), JSON.stringify({
                gainers, losers, source, timestamp: Date.now()
            }));
        } catch (e) {
            // Cache write error
        }
    }

    function clearCache() {
        localStorage.removeItem(getCacheKey());
    }

    /* ========================================
       Diff Detection & Flash Animation
       ======================================== */

    /**
     * Build a map of symbol -> { price, changePercent, rank } for quick lookup
     */
    function buildStockMap(stocks) {
        const map = {};
        stocks.forEach((stock, idx) => {
            map[stock.symbol] = {
                price: stock.price,
                changePercent: stock.changePercent,
                rank: idx + 1
            };
        });
        return map;
    }

    /**
     * Compare old and new stock lists to find changed symbols
     * Returns a Set of symbols that changed price, percentage, or rank
     */
    function detectChanges(oldList, newList) {
        const changes = new Set();
        const oldMap = buildStockMap(oldList);
        const newMap = buildStockMap(newList);

        for (const symbol of Object.keys(newMap)) {
            const oldEntry = oldMap[symbol];
            const newEntry = newMap[symbol];
            if (!oldEntry) {
                // New entry
                changes.add(symbol);
            } else if (
                oldEntry.price !== newEntry.price ||
                oldEntry.changePercent !== newEntry.changePercent ||
                oldEntry.rank !== newEntry.rank
            ) {
                changes.add(symbol);
            }
        }
        return changes;
    }

    /**
     * Apply flash animation to rows that changed
     */
    function flashChangedRows(changedSymbols, tableBodyId, type) {
        if (changedSymbols.size === 0) return;
        const tableBody = document.getElementById(tableBodyId);
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll('.stock-row');
        rows.forEach(row => {
            const symbolEl = row.querySelector('.stock-symbol');
            if (symbolEl && changedSymbols.has(symbolEl.textContent.trim())) {
                row.classList.add(type === 'gainers' ? 'flash-green' : 'flash-red');
                setTimeout(() => {
                    row.classList.remove('flash-green', 'flash-red');
                }, 1500);
            }
        });
    }

    /* ========================================
       Auto-Refresh & Visibility Awareness
       ======================================== */

    /**
     * Start adaptive auto-refresh based on market hours
     */
    function startAutoRefresh() {
        stopAutoRefresh();

        const interval = getRefreshInterval();
        if (interval === 0) {
            // Market is closed, no auto-refresh
            updateMarketStatusBadge();
            return;
        }

        state.countdownSeconds = Math.floor(interval / 1000);
        updateMarketStatusBadge();

        // Countdown timer (updates every second)
        state.countdownTimer = setInterval(() => {
            if (document.hidden) return; // Pause countdown when tab not visible
            state.countdownSeconds--;
            updateCountdownDisplay();
            if (state.countdownSeconds <= 0) {
                state.countdownSeconds = Math.floor(interval / 1000);
            }
        }, 1000);

        // Data refresh timer
        state.autoRefreshTimer = setInterval(async () => {
            if (document.hidden) return; // Skip refresh when tab not visible
            if (state.isLoading) return;

            await silentRefresh();
            state.countdownSeconds = Math.floor(interval / 1000);
        }, interval);
    }

    function stopAutoRefresh() {
        if (state.autoRefreshTimer) {
            clearInterval(state.autoRefreshTimer);
            state.autoRefreshTimer = null;
        }
        if (state.countdownTimer) {
            clearInterval(state.countdownTimer);
            state.countdownTimer = null;
        }
    }

    /**
     * Silent background refresh - no loading spinner, diff-based update
     */
    async function silentRefresh() {
        clearCache();
        try {
            const { gainers, losers } = await fetchMarketMoversQuiet();

            if (gainers.length === 0 && losers.length === 0) return;

            // Detect changes
            const gainersChanged = detectChanges(state.gainers, gainers);
            const losersChanged = detectChanges(state.losers, losers);

            // Update state
            state.gainers = gainers;
            state.losers = losers;
            state.lastFetchTime = Date.now();

            // Re-render tables
            renderTables();

            // Flash changed rows
            flashChangedRows(gainersChanged, 'gainersTableBody', 'gainers');
            flashChangedRows(losersChanged, 'losersTableBody', 'losers');

            updateMarketStatusBadge();
        } catch (error) {
            // Silent refresh failure is non-critical
        }
    }

    /**
     * Fetch without showing loading spinner (for background refresh)
     */
    async function fetchMarketMoversQuiet() {
        // If a specific index is selected, fetch directly
        if (state.selectedIndex !== 'auto') {
            try {
                const result = await fetchFromSpecificIndex(state.selectedIndex);
                if (result.gainers.length > 0 || result.losers.length > 0) {
                    setCache(result.gainers, result.losers, state.dataSource);
                    return result;
                }
            } catch (error) {
                // Fall through to auto strategies
            }
        }

        const strategies = [
            { name: 'Groww', fn: fetchFromGroww },
            { name: 'Yahoo Screener', fn: fetchFromYahooScreener },
            { name: 'NSE Gainers/Losers', fn: fetchFromNSE },
            { name: 'NSE NIFTY', fn: fetchFromNSEIndices }
        ];

        for (const strategy of strategies) {
            try {
                const result = await strategy.fn();
                if (result.gainers.length > 0 || result.losers.length > 0) {
                    setCache(result.gainers, result.losers, state.dataSource);
                    return result;
                }
            } catch (error) {
                // Strategy failure
            }
        }
        return { gainers: [], losers: [] };
    }

    /**
     * Handle page visibility changes - pause/resume polling
     */
    function setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab hidden - timers continue but skip execution via guards
                return;
            }
            // Tab visible again - check if market status changed, restart if needed
            const newStatus = getMarketStatus();
            if (newStatus !== state.marketStatus) {
                state.marketStatus = newStatus;
                startAutoRefresh();
            }
            // If cache expired while hidden, do an immediate refresh
            const cached = getCache();
            if (!cached && !state.isLoading) {
                silentRefresh();
            }
        });
    }

    /**
     * Periodically check if market status changed (e.g. market opened/closed)
     * and adjust auto-refresh accordingly
     */
    /**
     * Periodically check if market status changed (e.g. market opened/closed)
     * and adjust auto-refresh accordingly
     */
    function startMarketStatusMonitor() {
        state.marketStatusMonitorTimer = setInterval(() => {
            const newStatus = getMarketStatus();
            if (newStatus !== state.marketStatus) {
                state.marketStatus = newStatus;
                startAutoRefresh();
            }
        }, 60 * 1000); // Check every minute
    }

    /* ========================================
       UI: Index Selector Chips
       ======================================== */

    function buildIndexChipsHTML() {
        return INDEX_GROUPS.map(group => `
            <div class="index-chip-group">
                <span class="index-group-label">${escapeHtml(group.label)}</span>
                ${group.options.map(opt => `
                    <button type="button"
                        class="index-chip ${state.selectedIndex === opt.value ? 'active' : ''}"
                        data-index="${escapeHtml(opt.value)}"
                        role="radio"
                        aria-checked="${state.selectedIndex === opt.value}"
                        title="${escapeHtml(opt.label)}">
                        ${escapeHtml(opt.label)}
                    </button>
                `).join('')}
            </div>
        `).join('');
    }

    function setupIndexSelector() {
        const container = document.getElementById('indexChips');
        if (!container) return;

        container.addEventListener('click', async (e) => {
            const chip = e.target.closest('.index-chip');
            if (!chip || chip.classList.contains('active')) return;

            const indexValue = chip.dataset.index;
            if (!indexValue) return;

            // Update state and UI
            state.selectedIndex = indexValue;
            saveIndexPref(indexValue);

            // Update active chip
            container.querySelectorAll('.index-chip').forEach(c => {
                c.classList.remove('active');
                c.setAttribute('aria-checked', 'false');
            });
            chip.classList.add('active');
            chip.setAttribute('aria-checked', 'true');

            // Reset and re-fetch
            state.gainersPage = 1;
            state.losersPage = 1;
            clearCache();
            await refresh();
        });
    }

    /* ========================================
       UI: HTML Structure
       ======================================== */

    function createHTML() {
        const container = document.getElementById('marketMoversContainer');
        if (!container) return;

        container.innerHTML = `
            <!-- Loader -->
            <div id="moversLoader" class="movers-loader">
                <div class="loader-content">
                    <div class="loader-spinner"></div>
                    <p class="loader-text">Fetching live market data...</p>
                </div>
            </div>

            <!-- Content -->
            <div id="moversContent" style="display: none;">
                <!-- Index Selector -->
                <div class="index-selector-wrapper mb-3">
                    <div class="index-selector-chips" id="indexChips" role="radiogroup" aria-label="Select market index">
                        ${buildIndexChipsHTML()}
                    </div>
                </div>

                <!-- Summary Stats -->
                <div class="movers-summary mb-3">
                    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <div class="summary-stats d-flex gap-3 flex-wrap align-items-center">
                            <span id="marketStatusBadge" class="badge bg-secondary">
                                <i class="bi bi-circle-fill"></i>
                                <span id="marketStatusText">Checking...</span>
                            </span>
                            <span class="badge bg-secondary">
                                Total: <strong id="totalStocks">0</strong>
                            </span>
                            <span class="badge bg-success">
                                Gainers: <strong id="totalGainers">0</strong>
                            </span>
                            <span class="badge bg-danger">
                                Losers: <strong id="totalLosers">0</strong>
                            </span>
                        </div>
                        <div class="data-info text-muted small d-flex align-items-center gap-3">
                            <span>Source: <strong id="dataSource">Loading...</strong></span>
                            <span>Updated: <strong id="lastUpdate">--:--</strong></span>
                            <span id="countdownWrapper" class="countdown-wrapper" style="display: none;">
                                Next: <strong id="countdownDisplay">--</strong>
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Side by Side Tables -->
                <div class="row">
                    <!-- Top Gainers -->
                    <div class="col-lg-6 mb-3 mb-lg-0">
                        <div class="movers-section gainers-section">
                            <div class="section-header d-flex justify-content-between align-items-center mb-3">
                                <h5 class="mb-0 text-success">
                                    <i class="bi bi-graph-up-arrow"></i> Top Gainers
                                </h5>
                                <span class="badge bg-success" id="gainersCount">0</span>
                            </div>
                            <div class="movers-table-wrapper">
                                <table class="table movers-table table-sm">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Symbol</th>
                                            <th>Price</th>
                                            <th>Change</th>
                                        </tr>
                                    </thead>
                                    <tbody id="gainersTableBody"></tbody>
                                </table>
                            </div>
                            <div class="pagination-wrapper mt-2">
                                <div id="gainersPagination" class="pagination-controls d-flex justify-content-center gap-1"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Top Losers -->
                    <div class="col-lg-6">
                        <div class="movers-section losers-section">
                            <div class="section-header d-flex justify-content-between align-items-center mb-3">
                                <h5 class="mb-0 text-danger">
                                    <i class="bi bi-graph-down-arrow"></i> Top Losers
                                </h5>
                                <span class="badge bg-danger" id="losersCount">0</span>
                            </div>
                            <div class="movers-table-wrapper">
                                <table class="table movers-table table-sm">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Symbol</th>
                                            <th>Price</th>
                                            <th>Change</th>
                                        </tr>
                                    </thead>
                                    <tbody id="losersTableBody"></tbody>
                                </table>
                            </div>
                            <div class="pagination-wrapper mt-2">
                                <div id="losersPagination" class="pagination-controls d-flex justify-content-center gap-1"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /* ========================================
       UI: Market Status Badge & Countdown
       ======================================== */

    function updateMarketStatusBadge() {
        const badge = document.getElementById('marketStatusBadge');
        const statusText = document.getElementById('marketStatusText');
        if (!badge || !statusText) return;

        const status = getMarketStatus();
        const label = getMarketStatusLabel();

        badge.classList.remove('bg-success', 'bg-warning', 'bg-secondary', 'market-live-badge');

        switch (status) {
            case 'open':
                badge.classList.add('bg-success', 'market-live-badge');
                statusText.textContent = 'LIVE';
                break;
            case 'pre_post':
                badge.classList.add('bg-warning');
                statusText.textContent = label;
                break;
            default:
                badge.classList.add('bg-secondary');
                statusText.textContent = label;
                break;
        }

        // Show/hide countdown
        const countdownWrapper = document.getElementById('countdownWrapper');
        if (countdownWrapper) {
            countdownWrapper.style.display = (status === 'open' || status === 'pre_post') ? 'inline' : 'none';
        }
    }

    function updateCountdownDisplay() {
        const el = document.getElementById('countdownDisplay');
        if (!el) return;
        const seconds = state.countdownSeconds;
        if (seconds <= 0) {
            el.textContent = 'refreshing...';
        } else if (seconds < 60) {
            el.textContent = `${seconds}s`;
        } else {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            el.textContent = `${m}m ${s}s`;
        }
    }

    /* ========================================
       UI: Table Rendering
       ======================================== */

    function renderTables() {
        renderGainersTable();
        renderLosersTable();
        updateSummary();
    }

    function renderGainersTable() {
        const list = state.gainers;
        const start = (state.gainersPage - 1) * CONFIG.ITEMS_PER_PAGE;
        const end = start + CONFIG.ITEMS_PER_PAGE;
        const pageItems = list.slice(start, end);
        const totalPages = Math.ceil(list.length / CONFIG.ITEMS_PER_PAGE) || 1;

        const tableBody = document.getElementById('gainersTableBody');
        if (!tableBody) return;

        if (pageItems.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="no-data">No gainers today</td></tr>`;
        } else {
            tableBody.innerHTML = pageItems.map((stock, idx) => {
                const rank = start + idx + 1;
                const displayName = getStockName(stock.symbol, stock.name);
                return `
                    <tr class="stock-row gainer-row" data-symbol="${escapeHtml(stock.symbol)}">
                        <td class="rank-cell">${rank}</td>
                        <td class="symbol-cell">
                            <span class="stock-symbol">${escapeHtml(stock.symbol)}</span>
                            <span class="stock-name">${escapeHtml(truncateName(displayName, 22))}</span>
                        </td>
                        <td class="price-cell">\u20B9${formatPrice(stock.price)}</td>
                        <td class="change-cell positive">\u25B2 ${formatPercent(stock.changePercent)}%</td>
                    </tr>
                `;
            }).join('');
        }

        renderPaginationFor('gainers', state.gainersPage, totalPages);
        const countEl = document.getElementById('gainersCount');
        if (countEl) countEl.textContent = list.length;
    }

    function renderLosersTable() {
        const list = state.losers;
        const start = (state.losersPage - 1) * CONFIG.ITEMS_PER_PAGE;
        const end = start + CONFIG.ITEMS_PER_PAGE;
        const pageItems = list.slice(start, end);
        const totalPages = Math.ceil(list.length / CONFIG.ITEMS_PER_PAGE) || 1;

        const tableBody = document.getElementById('losersTableBody');
        if (!tableBody) return;

        if (pageItems.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="no-data">No losers today</td></tr>`;
        } else {
            tableBody.innerHTML = pageItems.map((stock, idx) => {
                const rank = start + idx + 1;
                const displayName = getStockName(stock.symbol, stock.name);
                return `
                    <tr class="stock-row loser-row" data-symbol="${escapeHtml(stock.symbol)}">
                        <td class="rank-cell">${rank}</td>
                        <td class="symbol-cell">
                            <span class="stock-symbol">${escapeHtml(stock.symbol)}</span>
                            <span class="stock-name">${escapeHtml(truncateName(displayName, 22))}</span>
                        </td>
                        <td class="price-cell">\u20B9${formatPrice(stock.price)}</td>
                        <td class="change-cell negative">\u25BC ${formatPercent(stock.changePercent)}%</td>
                    </tr>
                `;
            }).join('');
        }

        renderPaginationFor('losers', state.losersPage, totalPages);
        const countEl = document.getElementById('losersCount');
        if (countEl) countEl.textContent = list.length;
    }

    /* ========================================
       UI: Pagination
       ======================================== */

    function renderPaginationFor(type, currentPage, totalPages) {
        const container = document.getElementById(`${type}Pagination`);
        if (!container) return;
        if (totalPages <= 1) { container.innerHTML = ''; return; }

        const pages = getPageNumbers(currentPage, totalPages);
        let html = `<button class="btn-pagination btn-prev" data-type="${type}" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&#8249;</button>`;
        pages.forEach(page => {
            if (page === '...') {
                html += `<span class="pagination-ellipsis">...</span>`;
            } else {
                html += `<button class="btn-pagination btn-page ${page === currentPage ? 'active' : ''}" data-type="${type}" data-page="${page}">${page}</button>`;
            }
        });
        html += `<button class="btn-pagination btn-next" data-type="${type}" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>&#8250;</button>`;
        container.innerHTML = html;
        container.querySelectorAll('.btn-pagination').forEach(btn => {
            btn.addEventListener('click', handlePaginationClick);
        });
    }

    function handlePaginationClick(e) {
        const btn = e.currentTarget;
        if (btn.disabled) return;
        const type = btn.dataset.type;
        const page = parseInt(btn.dataset.page, 10);
        if (type && !isNaN(page)) goToPage(type, page);
    }

    function getPageNumbers(current, total) {
        if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
        if (current <= 2) return [1, 2, 3, '...', total];
        if (current >= total - 1) return [1, '...', total - 2, total - 1, total];
        return [1, '...', current, '...', total];
    }

    function goToPage(type, page) {
        const list = type === 'gainers' ? state.gainers : state.losers;
        const totalPages = Math.ceil(list.length / CONFIG.ITEMS_PER_PAGE) || 1;
        if (page < 1 || page > totalPages) return;
        if (type === 'gainers') {
            state.gainersPage = page;
            renderGainersTable();
        } else {
            state.losersPage = page;
            renderLosersTable();
        }
    }

    /* ========================================
       UI: Summary & Status
       ======================================== */

    function updateSummary() {
        const totalEl = document.getElementById('totalStocks');
        const gainersEl = document.getElementById('totalGainers');
        const losersEl = document.getElementById('totalLosers');
        const lastUpdateEl = document.getElementById('lastUpdate');
        const dataSourceEl = document.getElementById('dataSource');

        if (totalEl) totalEl.textContent = state.gainers.length + state.losers.length;
        if (gainersEl) gainersEl.textContent = state.gainers.length;
        if (losersEl) losersEl.textContent = state.losers.length;
        if (lastUpdateEl) {
            lastUpdateEl.textContent = new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        }
        if (dataSourceEl) {
            dataSourceEl.textContent = state.dataSource || 'Loading...';
        }
    }

    function showLoading(show) {
        state.isLoading = show;
        const loader = document.getElementById('moversLoader');
        const content = document.getElementById('moversContent');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        if (content) content.style.display = show ? 'none' : 'block';
    }

    function showError(message) {
        const gainersBody = document.getElementById('gainersTableBody');
        const losersBody = document.getElementById('losersTableBody');
        const errorHtml = `<tr><td colspan="4" class="error-message">\u26A0\uFE0F ${escapeHtml(message)}</td></tr>`;
        if (gainersBody) gainersBody.innerHTML = errorHtml;
        if (losersBody) losersBody.innerHTML = errorHtml;
    }

    /* ========================================
       Formatting Helpers
       ======================================== */

    function formatPrice(price) {
        if (!price || isNaN(price)) return '0.00';
        return Number(price).toLocaleString('en-IN', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    }

    function formatPercent(percent) {
        if (!percent || isNaN(percent)) return '0.00';
        return Math.abs(percent).toFixed(2);
    }

    function truncateName(name, maxLength) {
        if (!name) return '';
        return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /* ========================================
       Public Methods
       ======================================== */

    /**
     * Manual refresh (force fetch)
     */
    async function refresh() {
        if (state.isLoading) return;
        clearCache();
        const { gainers, losers } = await fetchMarketMovers();
        state.gainers = gainers;
        state.losers = losers;
        state.gainersPage = 1;
        state.losersPage = 1;
        renderTables();
        updateMarketStatusBadge();

        // Reset countdown
        const interval = getRefreshInterval();
        if (interval > 0) {
            state.countdownSeconds = Math.floor(interval / 1000);
        }
    }

    /**
     * Initialize the module
     */
    async function init() {
        createHTML();

        // Setup index selector
        setupIndexSelector();

        // Setup refresh button
        const refreshBtn = document.getElementById('refreshMarketMovers');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refresh);
        }

        // Setup visibility handler for pause/resume
        setupVisibilityHandler();

        // Detect initial market status
        state.marketStatus = getMarketStatus();

        // Fetch stock names mapping
        await fetchStockNames();

        // Initial data load
        const { gainers, losers } = await fetchMarketMovers();
        state.gainers = gainers;
        state.losers = losers;
        state.lastFetchTime = Date.now();
        renderTables();

        // Start adaptive auto-refresh
        startAutoRefresh();
        updateMarketStatusBadge();

        // Monitor market status transitions
        startMarketStatusMonitor();
    }

    /**
     * Cleanup on page unload
     */
    function destroy() {
        stopAutoRefresh();
        if (state.marketStatusMonitorTimer) {
            clearInterval(state.marketStatusMonitorTimer);
            state.marketStatusMonitorTimer = null;
        }
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', destroy);

    // Public API
    return {
        init,
        refresh,
        goToPage,
        destroy,
        getMarketStatus
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    MarketMovers.init();
});
