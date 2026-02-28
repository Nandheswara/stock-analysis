/**
 * News Page JavaScript
 * 
 * Handles:
 * - Fetching and displaying stock market news
 * - News ticker animation
 * - News filtering by category
 * - Market sentiment display
 * - Trending topics
 * - Quick market stats
 * 
 * Uses RSS feeds and news APIs for Indian stock market news
 */

/* ========================================
   Configuration
   ======================================== */

const NEWS_CONFIG = {
    /**
     * News API endpoints configuration
     * 
     * To use these APIs, you need to get your own API keys:
     * - GNews: Sign up at https://gnews.io/ (Free tier: 100 requests/day)
     * - NewsData: Sign up at https://newsdata.io/ (Free tier: 200 requests/day)
     * 
     * Replace 'YOUR_API_KEY_HERE' with your actual API key
     */
    NEWS_APIS: [
        {
            name: 'GNews',
            url: 'https://gnews.io/api/v4/search',
            enabled: false, // Set to true after adding your API key
            params: {
                q: 'indian stock market OR sensex OR nifty OR BSE OR NSE',
                lang: 'en',
                country: 'in',
                max: 10,
                apikey: 'YOUR_API_KEY_HERE' // Get free key from gnews.io
            }
        },
        {
            name: 'NewsData',
            url: 'https://newsdata.io/api/1/news',
            enabled: false, // Set to true after adding your API key
            params: {
                q: 'stock market india',
                country: 'in',
                language: 'en',
                category: 'business',
                apikey: 'YOUR_API_KEY_HERE' // Get free key from newsdata.io
            }
        }
    ],
    // RSS feed URLs for Indian stock news (Primary source - no API key needed)
    RSS_FEEDS: [
        'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
        'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms',
        'https://www.moneycontrol.com/rss/latestnews.xml',
        'https://www.moneycontrol.com/rss/marketreports.xml',
        'https://www.livemint.com/rss/markets',
        'https://www.livemint.com/rss/money',
        'https://feeds.feedburner.com/ndtvprofit-latest'
    ],
    // CORS Proxy options (try multiple in case one fails)
    CORS_PROXIES: [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest='
    ],
    // Current proxy index
    currentProxyIndex: 0,
    // Refresh interval in milliseconds (5 minutes)
    REFRESH_INTERVAL: 300000,
    // Items per page for load more
    ITEMS_PER_PAGE: 6,
    // News categories
    CATEGORIES: ['all', 'markets', 'stocks', 'economy', 'ipo', 'crypto']
};

/* ========================================
   State Management
   ======================================== */

let newsState = {
    allNews: [],
    filteredNews: [],
    displayedNews: [],
    currentCategory: 'all',
    isTickerPaused: false,
    refreshTimer: null,
    isLoading: false,
    currentPage: 1,
    nextPageToken: null,
    apiIndex: 0
};

/* ========================================
   Initialization
   ======================================== */

const TRENDING_TOPICS = [
    { text: "Sensex Rally", count: "15.2K" },
    { text: "RBI Policy", count: "12.8K" },
    { text: "IT Stocks", count: "9.5K" },
    { text: "Bank Nifty", count: "8.7K" },
    { text: "FII Buying", count: "7.3K" }
];

/* ========================================
   Market Stats Configuration
   ======================================== */

const MARKET_API_CONFIG = {
    // Yahoo Finance symbols for Indian indices
    symbols: {
        nifty: '^NSEI',
        sensex: '^BSESN',
        bankNifty: '^NSEBANK'
    },
    // API endpoints for market data
    apis: [
        {
            name: 'YahooFinance',
            // Using a CORS proxy with Yahoo Finance
            getUrl: (symbol) => `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
        }
    ],
    // Fallback to NSE India API
    nseApi: 'https://www.nseindia.com/api/equity-stockIndices?index=',
    // Update interval (1 minute)
    UPDATE_INTERVAL: 60000
};

// Dynamic market stats state
let marketStats = {
    nifty: { value: '--', change: '--', changePercent: '--', isPositive: true, loading: true },
    sensex: { value: '--', change: '--', changePercent: '--', isPositive: true, loading: true },
    bankNifty: { value: '--', change: '--', changePercent: '--', isPositive: true, loading: true }
};

let marketStatsTimer = null;

/* ========================================
   Initialization
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    initializeNewsPage();
});

/**
 * Initialize the news page
 */
async function initializeNewsPage() {
    console.log('Initializing News Page...');
    
    // Initialize UI components
    initializeEventListeners();
    
    // Load initial data
    await loadNewsData();
    
    // Initialize widgets
    initializeTrendingTopics();
    
    // Fetch dynamic market data
    await fetchMarketStats();
    initializeMarketSentiment();
    
    // Start auto-refresh for news and market data
    startAutoRefresh();
    startMarketStatsRefresh();
    
    console.log('News Page initialized successfully');
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshNewsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }
    
    // Pause ticker button
    const pauseBtn = document.getElementById('pauseNewsBtn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', handlePauseTicker);
    }
    
    // Category filter buttons
    const filterBtns = document.querySelectorAll('.news-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', handleCategoryFilter);
    });
}

/* ========================================
   News Data Functions
   ======================================== */

/**
 * Load news data from APIs and RSS feeds
 */
async function loadNewsData() {
    newsState.isLoading = true;
    newsState.currentPage = 1;
    showLoadingState();
    
    try {
        // Try multiple sources in order of preference
        let news = [];
        
        // 1. Try News APIs first
        news = await fetchNewsFromAPIs();
        
        // 2. If APIs fail, try RSS feeds
        if (!news || news.length === 0) {
            console.log('APIs failed, trying RSS feeds...');
            news = await fetchNewsFromRSS();
        }
        
        if (news && news.length > 0) {
            newsState.allNews = news;
            console.log(`Loaded ${news.length} news articles`);
        } else {
            console.warn('No news fetched from any source');
            newsState.allNews = [];
        }
        
        // Apply current filter
        filterNews(newsState.currentCategory);
        
        // Update ticker
        updateNewsTicker();
        
    } catch (error) {
        console.error('Error loading news:', error);
        newsState.allNews = [];
        filterNews(newsState.currentCategory);
        updateNewsTicker();
    } finally {
        newsState.isLoading = false;
    }
}

/**
 * Fetch news from News APIs
 * @returns {Array} Array of news items
 */
async function fetchNewsFromAPIs() {
    const allNews = [];
    
    // Try each enabled API
    for (const api of NEWS_CONFIG.NEWS_APIS) {
        // Skip disabled APIs or APIs without proper keys
        if (!api.enabled || api.params.apikey === 'YOUR_API_KEY_HERE') {
            console.log(`Skipping ${api.name} - not configured`);
            continue;
        }
        
        try {
            const news = await fetchFromNewsAPI(api);
            if (news && news.length > 0) {
                allNews.push(...news);
            }
        } catch (error) {
            console.warn(`Failed to fetch from ${api.name}:`, error.message);
        }
    }
    
    // Remove duplicates based on title similarity
    const uniqueNews = removeDuplicates(allNews);
    
    // Sort by time (newest first)
    uniqueNews.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    return uniqueNews;
}

/**
 * Fetch news from a specific News API
 * @param {Object} api - API configuration
 * @returns {Array} Array of news items
 */
async function fetchFromNewsAPI(api) {
    const params = new URLSearchParams(api.params);
    const url = `${api.url}?${params.toString()}`;
    
    const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
            'Accept': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse based on API type
    if (api.name === 'GNews') {
        return parseGNewsResponse(data);
    } else if (api.name === 'NewsData') {
        return parseNewsDataResponse(data);
    }
    
    return [];
}

/**
 * Parse GNews API response
 * @param {Object} data - API response
 * @returns {Array} Normalized news items
 */
function parseGNewsResponse(data) {
    if (!data.articles || !Array.isArray(data.articles)) {
        return [];
    }
    
    return data.articles.map((article, index) => ({
        id: `gnews-${Date.now()}-${index}`,
        title: article.title || '',
        description: article.description || article.content || '',
        category: detectCategory(article.title + ' ' + (article.description || '')),
        source: article.source?.name || 'GNews',
        time: article.publishedAt || new Date().toISOString(),
        image: article.image || null,
        url: article.url || '#'
    }));
}

/**
 * Parse NewsData API response
 * @param {Object} data - API response
 * @returns {Array} Normalized news items
 */
function parseNewsDataResponse(data) {
    if (!data.results || !Array.isArray(data.results)) {
        return [];
    }
    
    // Store next page token for pagination
    newsState.nextPageToken = data.nextPage || null;
    
    return data.results.map((article, index) => ({
        id: `newsdata-${Date.now()}-${index}`,
        title: article.title || '',
        description: article.description || article.content || '',
        category: detectCategory(article.title + ' ' + (article.description || '')),
        source: article.source_id || 'NewsData',
        time: article.pubDate || new Date().toISOString(),
        image: article.image_url || null,
        url: article.link || '#'
    }));
}

/**
 * Remove duplicate news based on title similarity
 * @param {Array} news - Array of news items
 * @returns {Array} Deduplicated news
 */
function removeDuplicates(news) {
    const seen = new Set();
    return news.filter(item => {
        // Create a normalized key from the title
        const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

/**
 * Fetch news from RSS feeds using CORS proxies
 * Tries multiple proxies if one fails
 */
async function fetchNewsFromRSS() {
    const allNews = [];
    let successfulProxy = null;
    
    for (const feedUrl of NEWS_CONFIG.RSS_FEEDS) {
        let fetched = false;
        
        // Try each proxy until one works
        for (let i = 0; i < NEWS_CONFIG.CORS_PROXIES.length && !fetched; i++) {
            const proxyIndex = (NEWS_CONFIG.currentProxyIndex + i) % NEWS_CONFIG.CORS_PROXIES.length;
            const proxy = NEWS_CONFIG.CORS_PROXIES[proxyIndex];
            
            try {
                const proxyUrl = proxy + encodeURIComponent(feedUrl);
                const response = await fetch(proxyUrl, {
                    signal: AbortSignal.timeout(8000)
                });
                
                if (!response.ok) continue;
                
                const xmlText = await response.text();
                
                // Validate it's actually XML
                if (!xmlText.includes('<?xml') && !xmlText.includes('<rss') && !xmlText.includes('<feed')) {
                    continue;
                }
                
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                
                // Check for parse errors
                if (xmlDoc.querySelector('parsererror')) {
                    continue;
                }
                
                const items = xmlDoc.querySelectorAll('item');
                if (items.length === 0) {
                    // Try Atom format
                    const entries = xmlDoc.querySelectorAll('entry');
                    entries.forEach((entry, index) => {
                        const title = entry.querySelector('title')?.textContent || '';
                        const summary = entry.querySelector('summary, content')?.textContent || '';
                        const updated = entry.querySelector('updated, published')?.textContent || '';
                        const linkEl = entry.querySelector('link');
                        const link = linkEl?.getAttribute('href') || linkEl?.textContent || '#';
                        
                        allNews.push({
                            id: `atom-${Date.now()}-${allNews.length}-${index}`,
                            title: cleanText(title),
                            description: cleanText(summary),
                            category: detectCategory(title + ' ' + summary),
                            source: extractSourceFromUrl(feedUrl),
                            time: updated ? new Date(updated).toISOString() : new Date().toISOString(),
                            image: null,
                            url: link
                        });
                    });
                } else {
                    items.forEach((item, index) => {
                        const title = item.querySelector('title')?.textContent || '';
                        const description = item.querySelector('description')?.textContent || '';
                        const pubDate = item.querySelector('pubDate')?.textContent || '';
                        const link = item.querySelector('link')?.textContent || '#';
                        const enclosure = item.querySelector('enclosure');
                        const imageUrl = enclosure?.getAttribute('url') || null;
                        
                        // Extract image from description if not in enclosure
                        let finalImage = imageUrl;
                        if (!finalImage && description) {
                            const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
                            if (imgMatch) {
                                finalImage = imgMatch[1];
                            }
                        }
                        
                        allNews.push({
                            id: `rss-${Date.now()}-${allNews.length}-${index}`,
                            title: cleanText(title),
                            description: cleanText(description),
                            category: detectCategory(title + ' ' + description),
                            source: extractSourceFromUrl(feedUrl),
                            time: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                            image: finalImage,
                            url: link
                        });
                    });
                }
                
                fetched = true;
                successfulProxy = proxyIndex;
                
            } catch (error) {
                console.warn(`Proxy ${proxyIndex} failed for ${feedUrl}:`, error.message);
            }
        }
    }
    
    // Remember which proxy worked for future requests
    if (successfulProxy !== null) {
        NEWS_CONFIG.currentProxyIndex = successfulProxy;
    }
    
    // Sort by time (newest first) and remove duplicates
    const uniqueNews = removeDuplicates(allNews);
    uniqueNews.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    console.log(`Fetched ${uniqueNews.length} unique articles from RSS feeds`);
    return uniqueNews;
}

/**
 * Detect news category based on content
 * @param {string} text - Text to analyze
 * @returns {string} Category name
 */
function detectCategory(text) {
    const lowerText = text.toLowerCase();
    
    if (/\b(ipo|initial public offering|debut|listing)\b/i.test(lowerText)) {
        return 'ipo';
    }
    if (/\b(crypto|bitcoin|ethereum|blockchain|cryptocurrency)\b/i.test(lowerText)) {
        return 'crypto';
    }
    if (/\b(rbi|inflation|gdp|fiscal|monetary|government|policy)\b/i.test(lowerText)) {
        return 'economy';
    }
    if (/\b(sensex|nifty|index|market|fii|dii|rally|fall)\b/i.test(lowerText)) {
        return 'markets';
    }
    
    return 'stocks';
}

/**
 * Extract source name from URL
 * @param {string} url - Feed URL
 * @returns {string} Source name
 */
function extractSourceFromUrl(url) {
    if (url.includes('economictimes')) return 'Economic Times';
    if (url.includes('moneycontrol')) return 'MoneyControl';
    if (url.includes('livemint')) return 'Mint';
    if (url.includes('business-standard')) return 'Business Standard';
    return 'News Source';
}

/**
 * Clean HTML tags and entities from text
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

/* ========================================
   News Display Functions
   ======================================== */

/**
 * Filter news by category
 * @param {string} category - Category to filter by
 */
function filterNews(category) {
    newsState.currentCategory = category;
    newsState.currentPage = 1;
    
    if (category === 'all') {
        newsState.filteredNews = [...newsState.allNews];
    } else {
        newsState.filteredNews = newsState.allNews.filter(
            news => news.category === category
        );
    }
    
    // Get items for current page
    newsState.displayedNews = newsState.filteredNews.slice(0, NEWS_CONFIG.ITEMS_PER_PAGE);
    
    renderNewsItems();
}

/**
 * Render news items to the DOM
 */
function renderNewsItems() {
    const container = document.getElementById('newsFlowContent');
    if (!container) return;
    
    if (newsState.displayedNews.length === 0 && !newsState.isLoading) {
        container.innerHTML = `
            <div class="no-news">
                <i class="bi bi-newspaper"></i>
                <h4>No News Found</h4>
                <p>Unable to fetch news at the moment. Please try refreshing the page.</p>
                <button class="btn btn-primary mt-3" onclick="handleRefresh()">
                    <i class="bi bi-arrow-clockwise"></i> Retry
                </button>
            </div>
        `;
        return;
    }
    
    const newsHTML = newsState.displayedNews.map((news, index) => 
        createNewsItemHTML(news, index === 0)
    ).join('');
    
    container.innerHTML = newsHTML + `
        <div class="load-more-container">
            <button class="btn-load-more" onclick="loadMoreNews()" id="loadMoreBtn">
                <i class="bi bi-plus-circle"></i> Load More News
            </button>
        </div>
    `;
}

/**
 * Create HTML for a single news item
 * @param {Object} news - News item data
 * @param {boolean} isFeatured - Whether this is a featured item
 * @returns {string} HTML string
 */
function createNewsItemHTML(news, isFeatured = false) {
    const timeAgo = getTimeAgo(news.time);
    const categoryIcon = getCategoryIcon(news.category);
    
    return `
        <article class="news-item ${isFeatured || news.featured ? 'featured' : ''}" 
                 onclick="openNewsUrl('${news.url}')"
                 data-category="${news.category}">
            <div class="news-item-image">
                ${news.image 
                    ? `<img src="${news.image}" alt="${news.title}" loading="lazy">`
                    : `<div class="placeholder-image"><i class="bi bi-newspaper"></i></div>`
                }
            </div>
            <div class="news-item-content">
                <div class="news-item-meta">
                    <span class="news-category ${news.category}">
                        <i class="bi ${categoryIcon}"></i> ${capitalizeFirst(news.category)}
                    </span>
                    <span class="news-time">
                        <i class="bi bi-clock"></i> ${timeAgo}
                    </span>
                </div>
                <h3 class="news-item-title">${escapeHtml(news.title)}</h3>
                <p class="news-item-description">${escapeHtml(news.description)}</p>
                <div class="news-item-source">
                    <i class="bi bi-broadcast"></i>
                    <span>${escapeHtml(news.source)}</span>
                </div>
            </div>
        </article>
    `;
}

/**
 * Get icon for news category
 * @param {string} category - Category name
 * @returns {string} Bootstrap icon class
 */
function getCategoryIcon(category) {
    const icons = {
        markets: 'bi-graph-up',
        stocks: 'bi-bar-chart-line',
        economy: 'bi-bank',
        ipo: 'bi-rocket-takeoff',
        crypto: 'bi-currency-bitcoin'
    };
    return icons[category] || 'bi-newspaper';
}

/**
 * Get relative time string
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short' 
    });
}

/**
 * Show loading state in news container
 */
function showLoadingState() {
    const container = document.getElementById('newsFlowContent');
    if (container) {
        container.innerHTML = `
            <div class="news-loading">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading news...</span>
                </div>
                <p>Fetching latest news...</p>
            </div>
        `;
    }
}

/* ========================================
   News Ticker Functions
   ======================================== */

/**
 * Update the news ticker with latest headlines
 */
function updateNewsTicker() {
    const ticker = document.getElementById('newsTicker');
    if (!ticker) return;
    
    const headlines = newsState.allNews.slice(0, 10);
    
    if (headlines.length === 0) {
        ticker.innerHTML = '<span class="ticker-placeholder">No news available</span>';
        return;
    }
    
    // Duplicate items for seamless loop
    const tickerHTML = [...headlines, ...headlines].map(news => `
        <span class="ticker-item" onclick="openNewsUrl('${news.url}')">
            <span class="ticker-separator">●</span>
            <span class="ticker-time">${getTimeAgo(news.time)}</span>
            ${escapeHtml(news.title)}
        </span>
    `).join('');
    
    ticker.innerHTML = tickerHTML;
    
    // Apply paused state if needed
    if (newsState.isTickerPaused) {
        ticker.classList.add('paused');
    }
}

/* ========================================
   Widget Functions
   ======================================== */

/**
 * Initialize market sentiment widget
 */
function initializeMarketSentiment() {
    // Calculate sentiment based on market data and news
    const sentiment = calculateMarketSentiment();
    
    const sentimentFill = document.getElementById('sentimentFill');
    const sentimentValue = document.getElementById('sentimentValue');
    const sentimentLabel = document.getElementById('sentimentLabel');
    
    if (sentimentFill) {
        sentimentFill.style.width = `${sentiment}%`;
        sentimentFill.style.background = getSentimentGradient(sentiment);
    }
    
    if (sentimentValue) {
        const valueEl = sentimentValue.querySelector('.value');
        if (valueEl) {
            valueEl.textContent = sentiment;
            valueEl.style.color = getSentimentColor(sentiment);
        }
    }
    
    if (sentimentLabel) {
        sentimentLabel.textContent = getSentimentLabel(sentiment);
        sentimentLabel.style.color = getSentimentColor(sentiment);
    }
}

/**
 * Calculate market sentiment (0-100) based on:
 * 1. Market index performance (40% weight)
 * 2. News sentiment analysis (40% weight)
 * 3. Market breadth approximation (20% weight)
 * @returns {number} Sentiment score
 */
function calculateMarketSentiment() {
    let marketScore = 50; // Default neutral
    let newsScore = 50;
    let breadthScore = 50;
    
    // 1. Calculate market performance score (based on index changes)
    const indexScores = [];
    
    Object.values(marketStats).forEach(stat => {
        if (!stat.loading && stat.changePercent !== '--') {
            const percent = parseFloat(stat.changePercent.replace('%', '').replace('+', ''));
            if (!isNaN(percent)) {
                // Map percentage change to 0-100 scale
                // -3% or worse = 0, +3% or better = 100
                const score = Math.min(100, Math.max(0, ((percent + 3) / 6) * 100));
                indexScores.push(score);
            }
        }
    });
    
    if (indexScores.length > 0) {
        marketScore = Math.round(indexScores.reduce((a, b) => a + b, 0) / indexScores.length);
    }
    
    // 2. Calculate news sentiment score
    const positiveKeywords = [
        'surge', 'rally', 'gain', 'high', 'bullish', 'rise', 'up', 'soar',
        'jump', 'climb', 'advance', 'positive', 'growth', 'profit', 'boom',
        'record', 'strong', 'optimistic', 'recovery', 'breakthrough'
    ];
    const negativeKeywords = [
        'fall', 'drop', 'loss', 'low', 'bearish', 'decline', 'down', 'crash',
        'plunge', 'sink', 'slump', 'negative', 'weak', 'fear', 'crisis',
        'concern', 'worry', 'risk', 'volatile', 'correction'
    ];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    newsState.allNews.forEach(news => {
        const text = (news.title + ' ' + news.description).toLowerCase();
        positiveKeywords.forEach(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            const matches = text.match(regex);
            if (matches) positiveCount += matches.length;
        });
        negativeKeywords.forEach(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            const matches = text.match(regex);
            if (matches) negativeCount += matches.length;
        });
    });
    
    const totalKeywords = positiveCount + negativeCount;
    if (totalKeywords > 0) {
        newsScore = Math.round((positiveCount / totalKeywords) * 100);
    }
    
    // 3. Estimate market breadth from index behavior
    // If multiple indices are positive, breadth is likely positive
    const positiveIndices = Object.values(marketStats).filter(s => s.isPositive).length;
    const totalIndices = Object.keys(marketStats).length;
    breadthScore = Math.round((positiveIndices / totalIndices) * 100);
    
    // Weighted average: Market 40%, News 40%, Breadth 20%
    const finalScore = Math.round(
        (marketScore * 0.4) + 
        (newsScore * 0.4) + 
        (breadthScore * 0.2)
    );
    
    console.log(`Sentiment - Market: ${marketScore}, News: ${newsScore}, Breadth: ${breadthScore}, Final: ${finalScore}`);
    
    return Math.min(100, Math.max(0, finalScore));
}

/**
 * Get sentiment label based on score
 * @param {number} sentiment - Sentiment score
 * @returns {string} Label text
 */
function getSentimentLabel(sentiment) {
    if (sentiment >= 80) return 'Extremely Bullish';
    if (sentiment >= 65) return 'Bullish';
    if (sentiment >= 55) return 'Slightly Bullish';
    if (sentiment >= 45) return 'Neutral';
    if (sentiment >= 35) return 'Slightly Bearish';
    if (sentiment >= 20) return 'Bearish';
    return 'Extremely Bearish';
}

/**
 * Get gradient for sentiment bar
 * @param {number} sentiment - Sentiment score
 * @returns {string} CSS gradient
 */
function getSentimentGradient(sentiment) {
    if (sentiment >= 65) {
        return 'linear-gradient(90deg, #28a745, #20c997)';
    } else if (sentiment >= 35) {
        return 'linear-gradient(90deg, #ffc107, #fd7e14)';
    } else {
        return 'linear-gradient(90deg, #dc3545, #c82333)';
    }
}

/**
 * Get color based on sentiment score
 * @param {number} sentiment - Sentiment score (0-100)
 * @returns {string} CSS color
 */
function getSentimentColor(sentiment) {
    if (sentiment < 35) return '#dc3545'; // Bearish - Red
    if (sentiment > 65) return '#28a745'; // Bullish - Green
    return '#ffc107'; // Neutral - Yellow
}

/**
 * Initialize trending topics widget
 */
function initializeTrendingTopics() {
    const container = document.getElementById('trendingTopics');
    if (!container) return;
    
    const trendingHTML = TRENDING_TOPICS.map((topic, index) => `
        <div class="trending-item" onclick="searchTopic('${topic.text}')">
            <span class="trending-rank">${index + 1}</span>
            <span class="trending-text">${escapeHtml(topic.text)}</span>
            <span class="trending-count">${topic.count}</span>
        </div>
    `).join('');
    
    container.innerHTML = trendingHTML;
}

/**
 * Fetch real-time market stats from APIs
 */
async function fetchMarketStats() {
    console.log('Fetching market stats...');
    
    // Show loading state
    Object.keys(marketStats).forEach(key => {
        marketStats[key].loading = true;
    });
    renderMarketStats();
    
    // Try fetching from Yahoo Finance via CORS proxy
    const fetchPromises = Object.entries(MARKET_API_CONFIG.symbols).map(async ([key, symbol]) => {
        try {
            const data = await fetchYahooFinanceData(symbol);
            if (data) {
                marketStats[key] = {
                    value: formatNumber(data.price),
                    change: formatChange(data.change),
                    changePercent: formatPercent(data.changePercent),
                    isPositive: data.change >= 0,
                    loading: false
                };
                return true;
            }
        } catch (error) {
            console.warn(`Failed to fetch ${key}:`, error.message);
        }
        return false;
    });
    
    const results = await Promise.all(fetchPromises);
    
    // If all failed, try alternative API
    if (results.every(r => !r)) {
        console.log('Yahoo Finance failed, trying alternative sources...');
        await fetchFromAlternativeAPI();
    }
    
    renderMarketStats();
}

/**
 * Fetch data from Yahoo Finance
 * @param {string} symbol - Stock symbol
 * @returns {Object|null} Price data
 */
async function fetchYahooFinanceData(symbol) {
    // Try multiple CORS proxies
    for (const proxy of NEWS_CONFIG.CORS_PROXIES) {
        try {
            const apiUrl = MARKET_API_CONFIG.apis[0].getUrl(symbol);
            const proxyUrl = proxy + encodeURIComponent(apiUrl);
            
            const response = await fetch(proxyUrl, {
                signal: AbortSignal.timeout(10000),
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) continue;
            
            const data = await response.json();
            
            if (data.chart && data.chart.result && data.chart.result[0]) {
                const result = data.chart.result[0];
                const meta = result.meta;
                const quote = result.indicators?.quote?.[0];
                
                if (meta) {
                    const currentPrice = meta.regularMarketPrice || meta.previousClose;
                    const previousClose = meta.chartPreviousClose || meta.previousClose;
                    const change = currentPrice - previousClose;
                    const changePercent = (change / previousClose) * 100;
                    
                    return {
                        price: currentPrice,
                        change: change,
                        changePercent: changePercent
                    };
                }
            }
        } catch (error) {
            console.warn(`Proxy failed for ${symbol}:`, error.message);
        }
    }
    
    return null;
}

/**
 * Fetch from alternative free API sources
 */
async function fetchFromAlternativeAPI() {
    // Try fetching from a free stock API
    const fallbackData = {
        nifty: { symbol: 'NIFTY_50', name: 'Nifty 50' },
        sensex: { symbol: 'SENSEX', name: 'Sensex' },
        bankNifty: { symbol: 'NIFTY_BANK', name: 'Bank Nifty' }
    };
    
    // Try Google Finance scraping via proxy (as last resort)
    for (const [key, info] of Object.entries(fallbackData)) {
        try {
            // Use a financial data aggregator
            const googleUrl = `https://www.google.com/finance/quote/${info.symbol}:INDEXNSE`;
            
            for (const proxy of NEWS_CONFIG.CORS_PROXIES) {
                try {
                    const response = await fetch(proxy + encodeURIComponent(googleUrl), {
                        signal: AbortSignal.timeout(8000)
                    });
                    
                    if (!response.ok) continue;
                    
                    const html = await response.text();
                    
                    // Extract price from Google Finance HTML
                    const priceMatch = html.match(/data-last-price="([\d.]+)"/i);
                    const changeMatch = html.match(/data-change="([\d.-]+)"/i);
                    const changePercentMatch = html.match(/data-change-percent="([\d.-]+)"/i);
                    
                    if (priceMatch) {
                        const price = parseFloat(priceMatch[1]);
                        const change = changeMatch ? parseFloat(changeMatch[1]) : 0;
                        const changePercent = changePercentMatch ? parseFloat(changePercentMatch[1]) : 0;
                        
                        marketStats[key] = {
                            value: formatNumber(price),
                            change: formatChange(change),
                            changePercent: formatPercent(changePercent),
                            isPositive: change >= 0,
                            loading: false
                        };
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
        } catch (error) {
            console.warn(`Alternative API failed for ${key}:`, error.message);
        }
    }
}

/**
 * Format number with Indian number system
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    return num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Format change value
 * @param {number} change - Change value
 * @returns {string} Formatted change
 */
function formatChange(change) {
    if (change === null || change === undefined || isNaN(change)) return '--';
    const prefix = change >= 0 ? '+' : '';
    return prefix + change.toFixed(2);
}

/**
 * Format percentage
 * @param {number} percent - Percentage value
 * @returns {string} Formatted percentage
 */
function formatPercent(percent) {
    if (percent === null || percent === undefined || isNaN(percent)) return '--';
    const prefix = percent >= 0 ? '+' : '';
    return prefix + percent.toFixed(2) + '%';
}

/**
 * Render market stats to DOM
 */
function renderMarketStats() {
    // Nifty
    updateStatElement('niftyValue', marketStats.nifty.value);
    updateStatElement('niftyChange', marketStats.nifty.changePercent, marketStats.nifty.isPositive);
    
    // Sensex
    updateStatElement('sensexValue', marketStats.sensex.value);
    updateStatElement('sensexChange', marketStats.sensex.changePercent, marketStats.sensex.isPositive);
    
    // Bank Nifty
    updateStatElement('bankNiftyValue', marketStats.bankNifty.value);
    updateStatElement('bankNiftyChange', marketStats.bankNifty.changePercent, marketStats.bankNifty.isPositive);
    
    // Update timestamp
    const timeEl = document.getElementById('statsUpdateTime');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = `Last updated: ${now.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })}`;
    }
}

/**
 * Start auto-refresh for market stats
 */
function startMarketStatsRefresh() {
    if (marketStatsTimer) {
        clearInterval(marketStatsTimer);
    }
    
    marketStatsTimer = setInterval(() => {
        fetchMarketStats();
    }, MARKET_API_CONFIG.UPDATE_INTERVAL);
}

/**
 * Update a stat element
 * @param {string} elementId - Element ID
 * @param {string} value - Value to display
 * @param {boolean} isPositive - Whether the change is positive
 */
function updateStatElement(elementId, value, isPositive = null) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.textContent = value;
    
    if (isPositive !== null) {
        element.classList.remove('positive', 'negative');
        element.classList.add(isPositive ? 'positive' : 'negative');
    }
}

/* ========================================
   Event Handlers
   ======================================== */

/**
 * Handle refresh button click
 */
async function handleRefresh() {
    const refreshBtn = document.getElementById('refreshNewsBtn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Refreshing...';
    }
    
    await loadNewsData();
    initializeMarketSentiment();
    
    if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
    }
}

/**
 * Handle pause ticker button click
 */
function handlePauseTicker() {
    newsState.isTickerPaused = !newsState.isTickerPaused;
    
    const ticker = document.getElementById('newsTicker');
    const pauseBtn = document.getElementById('pauseNewsBtn');
    const pauseIcon = document.getElementById('pauseIcon');
    
    if (ticker) {
        ticker.classList.toggle('paused', newsState.isTickerPaused);
    }
    
    if (pauseBtn) {
        pauseBtn.classList.toggle('paused', newsState.isTickerPaused);
    }
    
    if (pauseIcon) {
        pauseIcon.className = newsState.isTickerPaused 
            ? 'bi bi-play-fill' 
            : 'bi bi-pause-fill';
    }
}

/**
 * Handle category filter click
 * @param {Event} event - Click event
 */
function handleCategoryFilter(event) {
    const btn = event.currentTarget;
    const category = btn.dataset.category;
    
    // Update active state
    document.querySelectorAll('.news-filter-btn').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');
    
    // Filter news
    filterNews(category);
}

/* ========================================
   Utility Functions
   ======================================== */

/**
 * Open news URL in new tab
 * @param {string} url - URL to open
 */
function openNewsUrl(url) {
    if (url && url !== '#') {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

/**
 * Search for a trending topic
 * @param {string} topic - Topic to search
 */
function searchTopic(topic) {
    // Filter news containing the topic
    const searchTerm = topic.toLowerCase();
    newsState.filteredNews = newsState.allNews.filter(news => 
        news.title.toLowerCase().includes(searchTerm) ||
        news.description.toLowerCase().includes(searchTerm)
    );
    
    // Reset category filter and pagination
    document.querySelectorAll('.news-filter-btn').forEach(b => {
        b.classList.remove('active');
    });
    document.querySelector('[data-category="all"]')?.classList.add('active');
    newsState.currentCategory = 'all';
    newsState.currentPage = 1;
    
    // Set displayed news
    newsState.displayedNews = newsState.filteredNews.slice(0, NEWS_CONFIG.ITEMS_PER_PAGE);
    
    renderNewsItems();
}

/**
 * Fetch more news from APIs for pagination
 * @param {string} category - Optional category filter
 * @returns {Promise<Array>} Array of news items
 */
async function fetchMoreNewsFromAPI(category = null) {
    const allNews = [];
    
    // Build search query based on category
    let searchQuery = 'indian stock market OR sensex OR nifty';
    if (category && category !== 'all') {
        const categoryKeywords = {
            'markets': 'indian stock market sensex nifty BSE NSE',
            'stocks': 'indian stocks shares equity trading',
            'economy': 'indian economy RBI GDP inflation',
            'ipo': 'IPO initial public offering india',
            'crypto': 'cryptocurrency bitcoin india crypto'
        };
        searchQuery = categoryKeywords[category] || searchQuery;
    }
    
    // Try fetching from enabled APIs with pagination
    for (const api of NEWS_CONFIG.NEWS_APIS) {
        // Skip disabled APIs or APIs without proper keys
        if (!api.enabled || api.params.apikey === 'YOUR_API_KEY_HERE') {
            continue;
        }
        
        try {
            const params = new URLSearchParams({
                ...api.params,
                q: searchQuery
            });
            
            // Add pagination for NewsData API
            if (api.name === 'NewsData' && newsState.nextPageToken) {
                params.set('page', newsState.nextPageToken);
            }
            
            const url = `${api.url}?${params.toString()}`;
            
            const response = await fetch(url, {
                signal: AbortSignal.timeout(15000),
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) continue;
            
            const data = await response.json();
            
            // Parse based on API type
            let news = [];
            if (api.name === 'GNews') {
                news = parseGNewsResponse(data);
            } else if (api.name === 'NewsData') {
                news = parseNewsDataResponse(data);
            }
            
            if (news.length > 0) {
                allNews.push(...news);
            }
        } catch (error) {
            console.warn(`Failed to fetch more from ${api.name}:`, error.message);
        }
    }
    
    // Always try RSS feeds (primary source when APIs are not configured)
    try {
        const rssNews = await fetchNewsFromRSS();
        if (rssNews.length > 0) {
            // Filter out already displayed news
            const existingTitles = new Set(
                newsState.allNews.map(n => n.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50))
            );
            const newRssNews = rssNews.filter(n => {
                const key = n.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
                return !existingTitles.has(key);
            });
            allNews.push(...newRssNews);
        }
    } catch (error) {
        console.warn('RSS fetch failed:', error.message);
    }
    
    return removeDuplicates(allNews);
}

/**
 * Load more news items from APIs
 */
async function loadMoreNews() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<i class="bi bi-hourglass-split spin"></i> Loading...';
    }
    
    try {
        // First, show any remaining filtered news not yet displayed
        const currentDisplayed = newsState.displayedNews.length;
        const totalFiltered = newsState.filteredNews.length;
        
        if (currentDisplayed < totalFiltered) {
            // Show more from already fetched news
            newsState.currentPage++;
            const endIndex = newsState.currentPage * NEWS_CONFIG.ITEMS_PER_PAGE;
            newsState.displayedNews = newsState.filteredNews.slice(0, endIndex);
            renderNewsItems();
        } else {
            // Fetch more news from APIs
            const newNews = await fetchMoreNewsFromAPI(newsState.currentCategory);
            
            if (newNews.length > 0) {
                // Filter out duplicates with existing news
                const existingTitles = new Set(newsState.allNews.map(n => 
                    n.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50)
                ));
                
                const uniqueNewNews = newNews.filter(n => {
                    const key = n.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
                    return !existingTitles.has(key);
                });
                
                if (uniqueNewNews.length > 0) {
                    // Add new news to allNews
                    newsState.allNews = [...newsState.allNews, ...uniqueNewNews];
                    
                    // Re-apply category filter
                    if (newsState.currentCategory === 'all') {
                        newsState.filteredNews = [...newsState.allNews];
                    } else {
                        newsState.filteredNews = newsState.allNews.filter(
                            news => news.category === newsState.currentCategory
                        );
                    }
                    
                    // Update displayed news
                    newsState.currentPage++;
                    const endIndex = newsState.currentPage * NEWS_CONFIG.ITEMS_PER_PAGE;
                    newsState.displayedNews = newsState.filteredNews.slice(0, endIndex);
                    
                    renderNewsItems();
                    
                    console.log(`Loaded ${uniqueNewNews.length} new articles`);
                } else {
                    showNoMoreNewsMessage();
                }
            } else {
                showNoMoreNewsMessage();
            }
        }
        
        // Scroll to newly loaded items smoothly
        const newsItems = document.querySelectorAll('.news-item');
        if (newsItems.length > NEWS_CONFIG.ITEMS_PER_PAGE) {
            const targetItem = newsItems[newsItems.length - NEWS_CONFIG.ITEMS_PER_PAGE];
            if (targetItem) {
                setTimeout(() => {
                    targetItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
    } catch (error) {
        console.error('Error loading more news:', error);
        showNoMoreNewsMessage();
    } finally {
        // Re-enable button
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = '<i class="bi bi-arrow-down-circle me-2"></i>Load More News';
        }
    }
}

/**
 * Show message when no more news is available
 */
function showNoMoreNewsMessage() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>All Caught Up!';
        loadMoreBtn.disabled = true;
        
        // Re-enable after some time to allow retry
        setTimeout(() => {
            loadMoreBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Retry Loading';
            loadMoreBtn.disabled = false;
        }, 5000);
    }
}

/**
 * Start auto-refresh timer
 */
function startAutoRefresh() {
    if (newsState.refreshTimer) {
        clearInterval(newsState.refreshTimer);
    }
    
    newsState.refreshTimer = setInterval(() => {
        loadNewsData();
    }, NEWS_CONFIG.REFRESH_INTERVAL);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ========================================
   CSS Animation Helper
   ======================================== */

// Add spin animation for refresh button
const style = document.createElement('style');
style.textContent = `
    .spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Export for global access
window.openNewsUrl = openNewsUrl;
window.searchTopic = searchTopic;
window.loadMoreNews = loadMoreNews;
window.fetchMarketStats = fetchMarketStats;
window.initializeMarketSentiment = initializeMarketSentiment;
window.handleRefresh = handleRefresh;
