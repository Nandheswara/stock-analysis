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
    // RSS feed URLs for Indian stock news
    RSS_FEEDS: [
        'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
        'https://www.moneycontrol.com/rss/latestnews.xml',
        'https://www.livemint.com/rss/markets'
    ],
    // Refresh interval in milliseconds (5 minutes)
    REFRESH_INTERVAL: 300000,
    // Maximum news items to display
    MAX_NEWS_ITEMS: 20,
    // Ticker scroll speed in seconds
    TICKER_SPEED: 60,
    // News categories
    CATEGORIES: ['all', 'markets', 'stocks', 'economy', 'ipo', 'crypto']
};

/* ========================================
   State Management
   ======================================== */

let newsState = {
    allNews: [],
    filteredNews: [],
    currentCategory: 'all',
    isTickerPaused: false,
    refreshTimer: null,
    isLoading: false
};

/* ========================================
   Sample News Data (Fallback)
   ======================================== */

const SAMPLE_NEWS = [
    {
        id: 1,
        title: "Sensex surges 500 points as IT stocks rally; Nifty crosses 22,500",
        description: "Indian benchmark indices rallied on Tuesday with the Sensex gaining over 500 points, driven by strong buying in IT and banking stocks.",
        category: "markets",
        source: "Economic Times",
        time: new Date(Date.now() - 1800000).toISOString(),
        image: null,
        url: "#"
    },
    {
        id: 2,
        title: "RBI keeps repo rate unchanged at 6.5% for eighth consecutive time",
        description: "The Reserve Bank of India's Monetary Policy Committee voted to keep the benchmark lending rate unchanged, citing inflation concerns.",
        category: "economy",
        source: "Mint",
        time: new Date(Date.now() - 3600000).toISOString(),
        image: null,
        url: "#"
    },
    {
        id: 3,
        title: "Reliance Industries hits all-time high; market cap crosses ₹20 lakh crore",
        description: "Shares of Reliance Industries Ltd touched a new all-time high, making it the most valuable company in India by market capitalization.",
        category: "stocks",
        source: "MoneyControl",
        time: new Date(Date.now() - 5400000).toISOString(),
        image: null,
        url: "#",
        featured: true
    },
    {
        id: 4,
        title: "Upcoming IPO: Tech startup eyes ₹2,000 crore public offering",
        description: "A leading Indian technology startup is planning to launch its initial public offering next month, aiming to raise ₹2,000 crore.",
        category: "ipo",
        source: "Business Standard",
        time: new Date(Date.now() - 7200000).toISOString(),
        image: null,
        url: "#"
    },
    {
        id: 5,
        title: "Bank Nifty witnesses profit booking; falls 200 points from day's high",
        description: "The Bank Nifty index saw profit booking in the second half of the trading session, falling 200 points from its intraday high.",
        category: "markets",
        source: "CNBC TV18",
        time: new Date(Date.now() - 9000000).toISOString(),
        image: null,
        url: "#"
    },
    {
        id: 6,
        title: "Bitcoin crosses $60,000; crypto market cap hits $2.5 trillion",
        description: "Bitcoin surged past $60,000 for the first time in two years, pushing the total cryptocurrency market capitalization above $2.5 trillion.",
        category: "crypto",
        source: "CoinDesk",
        time: new Date(Date.now() - 10800000).toISOString(),
        image: null,
        url: "#"
    },
    {
        id: 7,
        title: "FIIs turn net buyers; pump in ₹3,500 crore in Indian equities",
        description: "Foreign institutional investors turned net buyers in Indian equities, investing over ₹3,500 crore in the cash segment.",
        category: "markets",
        source: "Economic Times",
        time: new Date(Date.now() - 12600000).toISOString(),
        image: null,
        url: "#"
    },
    {
        id: 8,
        title: "Infosys announces ₹9,300 crore share buyback program",
        description: "IT major Infosys announced a share buyback program worth ₹9,300 crore at a premium of 25% to the current market price.",
        category: "stocks",
        source: "Mint",
        time: new Date(Date.now() - 14400000).toISOString(),
        image: null,
        url: "#"
    },
    {
        id: 9,
        title: "Government announces PLI scheme for semiconductor manufacturing",
        description: "The government unveiled a new Production Linked Incentive scheme worth ₹76,000 crore to boost domestic semiconductor manufacturing.",
        category: "economy",
        source: "Business Standard",
        time: new Date(Date.now() - 16200000).toISOString(),
        image: null,
        url: "#"
    },
    {
        id: 10,
        title: "Auto stocks in focus as February sales data shows strong growth",
        description: "Automobile stocks are in focus today as monthly sales data for February shows double-digit growth across major manufacturers.",
        category: "stocks",
        source: "MoneyControl",
        time: new Date(Date.now() - 18000000).toISOString(),
        image: null,
        url: "#"
    },
    {
        id: 11,
        title: "Nifty Pharma index outperforms; Sun Pharma, Dr Reddy's lead gains",
        description: "The Nifty Pharma index outperformed broader markets with a 2% gain, led by strong buying in Sun Pharma and Dr Reddy's Laboratories.",
        category: "markets",
        source: "CNBC TV18",
        time: new Date(Date.now() - 21600000).toISOString(),
        image: null,
        url: "#"
    },
    {
        id: 12,
        title: "New IPO listing: Shares debut at 45% premium to issue price",
        description: "The newly listed company's shares debuted at a significant premium of 45% over the IPO issue price, rewarding early investors.",
        category: "ipo",
        source: "Economic Times",
        time: new Date(Date.now() - 25200000).toISOString(),
        image: null,
        url: "#"
    }
];

/* ========================================
   Trending Topics Data
   ======================================== */

const TRENDING_TOPICS = [
    { text: "Sensex Rally", count: "15.2K" },
    { text: "RBI Policy", count: "12.8K" },
    { text: "IT Stocks", count: "9.5K" },
    { text: "Bank Nifty", count: "8.7K" },
    { text: "FII Buying", count: "7.3K" }
];

/* ========================================
   Market Stats Data (Sample)
   ======================================== */

const MARKET_STATS = {
    nifty: { value: "22,523.65", change: "+156.35", changePercent: "+0.70%", isPositive: true },
    sensex: { value: "74,119.39", change: "+456.78", changePercent: "+0.62%", isPositive: true },
    bankNifty: { value: "47,892.15", change: "-123.45", changePercent: "-0.26%", isPositive: false }
};

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
    initializeMarketSentiment();
    initializeTrendingTopics();
    initializeMarketStats();
    
    // Start auto-refresh
    startAutoRefresh();
    
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
 * Load news data from RSS feeds or use sample data
 */
async function loadNewsData() {
    newsState.isLoading = true;
    showLoadingState();
    
    try {
        // Try to fetch real news from RSS feeds
        const news = await fetchNewsFromRSS();
        
        if (news && news.length > 0) {
            newsState.allNews = news;
        } else {
            // Use sample data as fallback
            newsState.allNews = SAMPLE_NEWS;
        }
        
        // Apply current filter
        filterNews(newsState.currentCategory);
        
        // Update ticker
        updateNewsTicker();
        
    } catch (error) {
        console.error('Error loading news:', error);
        // Use sample data on error
        newsState.allNews = SAMPLE_NEWS;
        filterNews(newsState.currentCategory);
        updateNewsTicker();
    } finally {
        newsState.isLoading = false;
    }
}

/**
 * Fetch news from RSS feeds using a CORS proxy
 */
async function fetchNewsFromRSS() {
    const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
    const allNews = [];
    
    for (const feedUrl of NEWS_CONFIG.RSS_FEEDS) {
        try {
            const response = await fetch(CORS_PROXY + encodeURIComponent(feedUrl), {
                signal: AbortSignal.timeout(10000)
            });
            
            if (!response.ok) continue;
            
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            const items = xmlDoc.querySelectorAll('item');
            items.forEach((item, index) => {
                if (allNews.length >= NEWS_CONFIG.MAX_NEWS_ITEMS) return;
                
                const title = item.querySelector('title')?.textContent || '';
                const description = item.querySelector('description')?.textContent || '';
                const pubDate = item.querySelector('pubDate')?.textContent || '';
                const link = item.querySelector('link')?.textContent || '#';
                
                // Extract category from title/description
                const category = detectCategory(title + ' ' + description);
                
                allNews.push({
                    id: Date.now() + index,
                    title: cleanText(title),
                    description: cleanText(description),
                    category: category,
                    source: extractSourceFromUrl(feedUrl),
                    time: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                    image: null,
                    url: link
                });
            });
            
        } catch (error) {
            console.warn(`Failed to fetch from ${feedUrl}:`, error.message);
        }
    }
    
    // Sort by time (newest first)
    allNews.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    return allNews;
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
    
    if (category === 'all') {
        newsState.filteredNews = [...newsState.allNews];
    } else {
        newsState.filteredNews = newsState.allNews.filter(
            news => news.category === category
        );
    }
    
    renderNewsItems();
}

/**
 * Render news items to the DOM
 */
function renderNewsItems() {
    const container = document.getElementById('newsFlowContent');
    if (!container) return;
    
    if (newsState.filteredNews.length === 0) {
        container.innerHTML = `
            <div class="no-news">
                <i class="bi bi-newspaper"></i>
                <h4>No News Found</h4>
                <p>No news articles found for this category. Try selecting a different category.</p>
            </div>
        `;
        return;
    }
    
    const newsHTML = newsState.filteredNews.map((news, index) => 
        createNewsItemHTML(news, index === 0)
    ).join('');
    
    container.innerHTML = newsHTML + `
        <div class="load-more-container">
            <button class="btn-load-more" onclick="loadMoreNews()">
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
    // Calculate sentiment based on sample data (in real app, this would come from API)
    const sentiment = calculateMarketSentiment();
    
    const sentimentFill = document.getElementById('sentimentFill');
    const sentimentValue = document.getElementById('sentimentValue');
    
    if (sentimentFill) {
        sentimentFill.style.width = `${sentiment}%`;
    }
    
    if (sentimentValue) {
        const valueEl = sentimentValue.querySelector('.value');
        if (valueEl) {
            valueEl.textContent = sentiment;
            valueEl.style.color = getSentimentColor(sentiment);
        }
    }
}

/**
 * Calculate market sentiment (0-100)
 * @returns {number} Sentiment score
 */
function calculateMarketSentiment() {
    // This is a placeholder calculation
    // In a real app, this would analyze news sentiment or use market data
    const positiveKeywords = ['surge', 'rally', 'gain', 'high', 'bullish', 'rise', 'up'];
    const negativeKeywords = ['fall', 'drop', 'loss', 'low', 'bearish', 'decline', 'down'];
    
    let positive = 0;
    let negative = 0;
    
    newsState.allNews.forEach(news => {
        const text = (news.title + ' ' + news.description).toLowerCase();
        positiveKeywords.forEach(kw => {
            if (text.includes(kw)) positive++;
        });
        negativeKeywords.forEach(kw => {
            if (text.includes(kw)) negative++;
        });
    });
    
    const total = positive + negative;
    if (total === 0) return 50;
    
    return Math.round((positive / total) * 100);
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
 * Initialize market stats widget
 */
function initializeMarketStats() {
    updateStatElement('niftyValue', MARKET_STATS.nifty.value);
    updateStatElement('niftyChange', MARKET_STATS.nifty.changePercent, MARKET_STATS.nifty.isPositive);
    
    updateStatElement('sensexValue', MARKET_STATS.sensex.value);
    updateStatElement('sensexChange', MARKET_STATS.sensex.changePercent, MARKET_STATS.sensex.isPositive);
    
    updateStatElement('bankNiftyValue', MARKET_STATS.bankNifty.value);
    updateStatElement('bankNiftyChange', MARKET_STATS.bankNifty.changePercent, MARKET_STATS.bankNifty.isPositive);
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
    
    // Reset category filter
    document.querySelectorAll('.news-filter-btn').forEach(b => {
        b.classList.remove('active');
    });
    document.querySelector('[data-category="all"]')?.classList.add('active');
    newsState.currentCategory = 'all';
    
    renderNewsItems();
}

/**
 * Load more news items (placeholder)
 */
function loadMoreNews() {
    // In a real app, this would fetch more news from API
    alert('In a production environment, this would load more news from the API.');
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
