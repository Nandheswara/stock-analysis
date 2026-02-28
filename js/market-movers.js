/**
 * Market Movers Module - Dynamic Top Gainers and Losers (Side by Side)
 * Fetches REAL-TIME daily top movers from NSE India / Yahoo Finance
 * NO hardcoded stock symbols - 100% dynamic data
 * @module market-movers
 */

const MarketMovers = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        ITEMS_PER_PAGE: 10,
        CACHE_KEY: 'market_movers_dynamic_v2',
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
        MAX_STOCKS: 50, // Top 50 gainers and losers each
        CORS_PROXIES: [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ]
    };

    // API Endpoints
    const API = {
        NSE_GAINERS: 'https://www.nseindia.com/api/live-analysis-variations?index=gainers',
        NSE_LOSERS: 'https://www.nseindia.com/api/live-analysis-variations?index=losers',
        YAHOO_SCREENER: 'https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved',
        GROWW_TOP_GAINERS: 'https://groww.in/v1/api/stocks_data/v2/top_gainers',
        GROWW_TOP_LOSERS: 'https://groww.in/v1/api/stocks_data/v2/top_losers'
    };

    // State - separate pages for each table
    let state = {
        gainers: [],
        losers: [],
        gainersPage: 1,
        losersPage: 1,
        isLoading: false,
        dataSource: null
    };

    // Dynamic stock name mapping - fetched from NSE API
    let stockNamesCache = {};
    const STOCK_NAMES_CACHE_KEY = 'nse_stock_names_v1';
    const STOCK_NAMES_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    /**
     * Fetch stock names from NSE NIFTY 500 index (covers most traded stocks)
     */
    async function fetchStockNames() {
        // Check cache first
        const cached = getStockNamesFromCache();
        if (cached) {
            console.log('📦 Using cached stock names');
            stockNamesCache = cached;
            return;
        }

        console.log('🔄 Fetching stock names from NSE...');
        
        // Try multiple indices to get maximum coverage
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
                            // Clean up company name - remove "Limited" suffix for brevity
                            stockNamesCache[symbol] = companyName
                                .replace(/\s+Limited$/i, '')
                                .replace(/\s+Ltd\.?$/i, '')
                                .trim();
                        }
                    });
                    console.log(`✅ Loaded ${Object.keys(stockNamesCache).length} stock names from ${index}`);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to fetch from ${index}:`, error.message);
            }
        }

        // Save to cache if we got any data
        if (Object.keys(stockNamesCache).length > 0) {
            saveStockNamesToCache(stockNamesCache);
        }
    }

    /**
     * Get stock names from localStorage cache
     */
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
            console.warn('Stock names cache read error:', e);
        }
        return null;
    }

    /**
     * Save stock names to localStorage cache
     */
    function saveStockNamesToCache(names) {
        try {
            localStorage.setItem(STOCK_NAMES_CACHE_KEY, JSON.stringify({
                names,
                timestamp: Date.now()
            }));
            console.log(`💾 Cached ${Object.keys(names).length} stock names`);
        } catch (e) {
            console.warn('Stock names cache write error:', e);
        }
    }

    /**
     * Get stock name from dynamic cache or return empty string
     */
    function getStockName(symbol, apiName) {
        // If API provided a name different from symbol, use it
        if (apiName && apiName !== symbol && apiName !== 'N/A') {
            // Clean up the name
            return apiName
                .replace(/\s+Limited$/i, '')
                .replace(/\s+Ltd\.?$/i, '')
                .trim();
        }
        // Otherwise look up in our dynamically fetched mapping
        return stockNamesCache[symbol] || '';
    }

    /**
     * Fetch data through CORS proxy with fallback
     */
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
                console.warn(`Proxy failed: ${proxy.slice(0, 30)}...`, error.message);
            }
        }
        throw new Error('All proxies failed');
    }

    /**
     * Strategy 1: Fetch from NSE India API
     */
    async function fetchFromNSE() {
        console.log('📡 Trying NSE India API...');
        
        const [gainersData, losersData] = await Promise.all([
            fetchWithProxy(API.NSE_GAINERS),
            fetchWithProxy(API.NSE_LOSERS)
        ]);
        
        const parseNSEData = (data) => {
            if (!data?.data) return [];
            return data.data.slice(0, CONFIG.MAX_STOCKS).map(stock => {
                const symbol = stock.symbol || 'N/A';
                const companyName = stock.companyName || stock.meta?.companyName || stock.symbol || 'N/A';
                
                // Populate stock names cache while processing
                if (symbol && companyName && companyName !== symbol && !stockNamesCache[symbol]) {
                    stockNamesCache[symbol] = companyName
                        .replace(/\s+Limited$/i, '')
                        .replace(/\s+Ltd\.?$/i, '')
                        .trim();
                }
                
                return {
                    symbol,
                    name: companyName,
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
            // Save updated cache
            if (Object.keys(stockNamesCache).length > 0) {
                saveStockNamesToCache(stockNamesCache);
            }
            return { gainers, losers };
        }
        throw new Error('No data from NSE');
    }

    /**
     * Strategy 2: Fetch from Groww API
     */
    async function fetchFromGroww() {
        console.log('📡 Trying Groww API...');
        
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
                
                // Populate stock names cache while processing
                if (symbol && companyName && companyName !== symbol && !stockNamesCache[symbol]) {
                    stockNamesCache[symbol] = companyName
                        .replace(/\s+Limited$/i, '')
                        .replace(/\s+Ltd\.?$/i, '')
                        .trim();
                }
                
                return {
                    symbol,
                    name: companyName,
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
            // Save updated cache
            if (Object.keys(stockNamesCache).length > 0) {
                saveStockNamesToCache(stockNamesCache);
            }
            return { gainers, losers };
        }
        throw new Error('No data from Groww');
    }

    /**
     * Strategy 3: Fetch from Yahoo Finance Screener
     */
    async function fetchFromYahooScreener() {
        console.log('📡 Trying Yahoo Finance Screener...');
        
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
                    
                    // Populate stock names cache while processing
                    if (symbol && companyName && companyName !== symbol && !stockNamesCache[symbol]) {
                        stockNamesCache[symbol] = companyName
                            .replace(/\s+Limited$/i, '')
                            .replace(/\s+Ltd\.?$/i, '')
                            .trim();
                    }
                    
                    return {
                        symbol,
                        name: companyName,
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
            // Save updated cache
            if (Object.keys(stockNamesCache).length > 0) {
                saveStockNamesToCache(stockNamesCache);
            }
            return { gainers, losers };
        }
        throw new Error('No Indian stocks from Yahoo');
    }

    /**
     * Strategy 4: Fetch NIFTY indices data from NSE
     */
    async function fetchFromNSEIndices() {
        console.log('📡 Trying NSE NIFTY Indices...');
        
        const url = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20100';
        const data = await fetchWithProxy(url);
        
        if (!data?.data) throw new Error('No data');
        
        const stocks = data.data
            .filter(stock => stock.symbol !== 'NIFTY 100')
            .map(stock => {
                const symbol = stock.symbol || 'N/A';
                const companyName = stock.meta?.companyName || stock.symbol;
                
                // Populate stock names cache while processing
                if (symbol && companyName && !stockNamesCache[symbol]) {
                    stockNamesCache[symbol] = companyName
                        .replace(/\s+Limited$/i, '')
                        .replace(/\s+Ltd\.?$/i, '')
                        .trim();
                }
                
                return {
                    symbol,
                    name: companyName,
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
            // Save updated cache
            if (Object.keys(stockNamesCache).length > 0) {
                saveStockNamesToCache(stockNamesCache);
            }
            return { gainers, losers };
        }
        throw new Error('No data from NSE indices');
    }

    /**
     * Main fetch function - tries multiple strategies
     */
    async function fetchMarketMovers() {
        showLoading(true);
        
        const cached = getCache();
        if (cached) {
            console.log('📦 Using cached data from:', cached.source);
            state.dataSource = cached.source;
            showLoading(false);
            return { gainers: cached.gainers, losers: cached.losers };
        }

        console.log('🚀 Fetching fresh market movers...');
        const startTime = Date.now();
        
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
                    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
                    console.log(`✅ Success with ${strategy.name} in ${loadTime}s`);
                    console.log(`   Gainers: ${result.gainers.length}, Losers: ${result.losers.length}`);
                    
                    setCache(result.gainers, result.losers, state.dataSource);
                    showLoading(false);
                    return result;
                }
            } catch (error) {
                console.warn(`❌ ${strategy.name} failed:`, error.message);
            }
        }
        
        showLoading(false);
        showError('Unable to fetch market data. Please try again later.');
        return { gainers: [], losers: [] };
    }

    // Cache functions
    function getCache() {
        try {
            const cached = localStorage.getItem(CONFIG.CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < CONFIG.CACHE_DURATION) {
                    return data;
                }
            }
        } catch (e) {
            console.warn('Cache read error:', e);
        }
        return null;
    }

    function setCache(gainers, losers, source) {
        try {
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
                gainers, losers, source, timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('Cache write error:', e);
        }
    }

    function clearCache() {
        localStorage.removeItem(CONFIG.CACHE_KEY);
    }

    /**
     * Create HTML structure for side-by-side layout
     */
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
                <!-- Summary Stats -->
                <div class="movers-summary mb-3">
                    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <div class="summary-stats d-flex gap-3 flex-wrap">
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
                        <div class="data-info text-muted small">
                            <span>Source: <strong id="dataSource">Loading...</strong></span>
                            <span class="ms-3">Updated: <strong id="lastUpdate">--:--</strong></span>
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

    /**
     * Render both tables
     */
    function renderTables() {
        renderGainersTable();
        renderLosersTable();
        updateSummary();
    }

    /**
     * Render gainers table
     */
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
                    <tr class="stock-row gainer-row">
                        <td class="rank-cell">${rank}</td>
                        <td class="symbol-cell">
                            <span class="stock-symbol">${escapeHtml(stock.symbol)}</span>
                            <span class="stock-name">${escapeHtml(truncateName(displayName, 22))}</span>
                        </td>
                        <td class="price-cell">₹${formatPrice(stock.price)}</td>
                        <td class="change-cell positive">▲ ${formatPercent(stock.changePercent)}%</td>
                    </tr>
                `;
            }).join('');
        }
        
        renderPaginationFor('gainers', state.gainersPage, totalPages);
        
        const countEl = document.getElementById('gainersCount');
        if (countEl) countEl.textContent = list.length;
    }

    /**
     * Render losers table
     */
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
                    <tr class="stock-row loser-row">
                        <td class="rank-cell">${rank}</td>
                        <td class="symbol-cell">
                            <span class="stock-symbol">${escapeHtml(stock.symbol)}</span>
                            <span class="stock-name">${escapeHtml(truncateName(displayName, 22))}</span>
                        </td>
                        <td class="price-cell">₹${formatPrice(stock.price)}</td>
                        <td class="change-cell negative">▼ ${formatPercent(stock.changePercent)}%</td>
                    </tr>
                `;
            }).join('');
        }
        
        renderPaginationFor('losers', state.losersPage, totalPages);
        
        const countEl = document.getElementById('losersCount');
        if (countEl) countEl.textContent = list.length;
    }

    /**
     * Render pagination for a specific table
     */
    function renderPaginationFor(type, currentPage, totalPages) {
        const container = document.getElementById(`${type}Pagination`);
        if (!container) return;
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        const pages = getPageNumbers(currentPage, totalPages);
        
        let html = `
            <button class="btn-pagination btn-prev" 
                    data-type="${type}" data-page="${currentPage - 1}"
                    ${currentPage === 1 ? 'disabled' : ''}>‹</button>
        `;
        
        pages.forEach(page => {
            if (page === '...') {
                html += `<span class="pagination-ellipsis">...</span>`;
            } else {
                html += `
                    <button class="btn-pagination btn-page ${page === currentPage ? 'active' : ''}"
                            data-type="${type}" data-page="${page}">${page}</button>
                `;
            }
        });
        
        html += `
            <button class="btn-pagination btn-next"
                    data-type="${type}" data-page="${currentPage + 1}"
                    ${currentPage === totalPages ? 'disabled' : ''}>›</button>
        `;
        
        container.innerHTML = html;
        
        // Add click event listeners to pagination buttons
        container.querySelectorAll('.btn-pagination').forEach(btn => {
            btn.addEventListener('click', handlePaginationClick);
        });
    }

    /**
     * Handle pagination button click
     */
    function handlePaginationClick(e) {
        const btn = e.currentTarget;
        if (btn.disabled) return;
        
        const type = btn.dataset.type;
        const page = parseInt(btn.dataset.page, 10);
        
        if (type && !isNaN(page)) {
            goToPage(type, page);
        }
    }

    /**
     * Get smart page numbers with ellipsis
     */
    function getPageNumbers(current, total) {
        if (total <= 5) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }
        
        if (current <= 2) {
            return [1, 2, 3, '...', total];
        } else if (current >= total - 1) {
            return [1, '...', total - 2, total - 1, total];
        } else {
            return [1, '...', current, '...', total];
        }
    }

    /**
     * Navigate to specific page
     */
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

    /**
     * Update summary stats
     */
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
                hour: '2-digit', minute: '2-digit'
            });
        }
        if (dataSourceEl) {
            dataSourceEl.textContent = state.dataSource || 'Loading...';
        }
    }

    /**
     * Show/hide loading state
     */
    function showLoading(show) {
        state.isLoading = show;
        const loader = document.getElementById('moversLoader');
        const content = document.getElementById('moversContent');
        
        if (loader) loader.style.display = show ? 'flex' : 'none';
        if (content) content.style.display = show ? 'none' : 'block';
    }

    /**
     * Show error message
     */
    function showError(message) {
        const gainersBody = document.getElementById('gainersTableBody');
        const losersBody = document.getElementById('losersTableBody');
        const errorHtml = `<tr><td colspan="4" class="error-message">⚠️ ${escapeHtml(message)}</td></tr>`;
        
        if (gainersBody) gainersBody.innerHTML = errorHtml;
        if (losersBody) losersBody.innerHTML = errorHtml;
    }

    // Formatting helpers
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

    /**
     * Refresh data (force fetch)
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
    }

    /**
     * Initialize the module
     */
    async function init() {
        console.log('📈 Initializing Dynamic Market Movers (Side by Side)...');
        console.log('   No hardcoded stocks - 100% real-time data!');
        
        // Create HTML structure
        createHTML();
        
        // Setup refresh button
        const refreshBtn = document.getElementById('refreshMarketMovers');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refresh);
        }
        
        // Fetch stock names mapping first (runs in parallel with market data if cached)
        await fetchStockNames();
        
        // Initial load
        const { gainers, losers } = await fetchMarketMovers();
        state.gainers = gainers;
        state.losers = losers;
        renderTables();
    }

    // Public API
    return {
        init,
        refresh,
        goToPage
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => MarketMovers.init(), 100);
});
