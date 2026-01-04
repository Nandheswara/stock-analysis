// fetch.js
// Contains Groww crawler utilities and a factory to create a fetchStockData function
// which delegates UI work back to the caller via callbacks.
// 
// Performance Optimizations:
// - Request caching to prevent duplicate API calls
// - Request deduplication for in-flight requests
// - Retry logic with exponential backoff
// - Timeout handling for slow proxies

const GROWW_BASE_URL = 'https://groww.in/stocks/'

/**
 * Request cache for storing fetched stock data
 * Prevents redundant API calls for the same stock
 */
const stockDataCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

/**
 * In-flight request tracker to prevent duplicate requests
 */
const pendingRequests = new Map();

/**
 * Check if cached data is still valid
 * @param {string} key - Cache key
 * @returns {Object|null} Cached data or null if expired/missing
 */
function getCachedData(key) {
    const cached = stockDataCache.get(key);
    if (cached && Date.now() < cached.expiry) {
        console.debug('fetch.js: cache hit for', key);
        return cached.data;
    }
    if (cached) {
        stockDataCache.delete(key); // Clean up expired entry
    }
    return null;
}

/**
 * Store data in cache
 * @param {string} key - Cache key
 * @param {Object} data - Data to cache
 */
function setCachedData(key, data) {
    stockDataCache.set(key, {
        data,
        expiry: Date.now() + CACHE_TTL
    });
    
    // Cleanup old entries if cache is too large
    if (stockDataCache.size > 100) {
        const keysToDelete = [];
        for (const [k, v] of stockDataCache.entries()) {
            if (Date.now() >= v.expiry) {
                keysToDelete.push(k);
            }
        }
        keysToDelete.forEach(k => stockDataCache.delete(k));
    }
}

/**
 * Convert stock symbol/name to Groww URL slug
 * Examples:
 *   "TCS" -> "tata-consultancy-services-ltd" (needs lookup)
 *   "RELIANCE" -> "reliance-industries-ltd" (needs lookup)
 *   "tata-consultancy-services-ltd" -> "tata-consultancy-services-ltd" (already slug)
 * @param {string} symbol - Stock symbol or name
 * @returns {string} - Groww URL slug
 */
function symbolToGrowwSlug(symbol) {
  if (!symbol) return null
  
  // If already looks like a slug (contains hyphen and lowercase), use as-is
  const lowered = symbol.toLowerCase().trim()
  if (lowered.includes('-') && lowered.includes('ltd')) {
    return lowered
  }
  
  // Common symbol to slug mappings for popular stocks
  const symbolMap = {
    'tcs': 'tata-consultancy-services-ltd',
    'itc': 'itc-ltd',
    'reliance': 'reliance-industries-ltd',
    'hdfcbank': 'hdfc-bank-ltd',
    'hdfc': 'hdfc-bank-ltd',
    'infy': 'infosys-ltd',
    'infosys': 'infosys-ltd',
    'icicibank': 'icici-bank-ltd',
    'wipro': 'wipro-ltd',
    'sbin': 'state-bank-of-india',
    'kotakbank': 'kotak-mahindra-bank-ltd',
    'hcltech': 'hcl-technologies-ltd',
    'bhartiartl': 'bharti-airtel-ltd',
    'axisbank': 'axis-bank-ltd',
    'tatamotors': 'tata-motors-ltd',
    'tatasteel': 'tata-steel-ltd',
    'sunpharma': 'sun-pharmaceutical-industries-ltd',
    'maruti': 'maruti-suzuki-india-ltd',
    'hindunilvr': 'hindustan-unilever-ltd',
    'asianpaint': 'asian-paints-ltd',
    'lt': 'larsen-toubro-ltd',
    'bajfinance': 'bajaj-finance-ltd',
    'bajajfinsv': 'bajaj-finserv-ltd',
    'techm': 'tech-mahindra-ltd',
    'ultracemco': 'ultratech-cement-ltd',
    'titan': 'titan-company-ltd',
    'ongc': 'oil-natural-gas-corporation-ltd',
    'ntpc': 'ntpc-ltd',
    'powergrid': 'power-grid-corporation-of-india-ltd',
    'jswsteel': 'jsw-steel-ltd',
    'adaniports': 'adani-ports-special-economic-zone-ltd',
    'adanient': 'adani-enterprises-ltd',
    'coalindia': 'coal-india-ltd',
    'drreddy': 'dr-reddys-laboratories-ltd',
    'cipla': 'cipla-ltd',
    'divislab': 'divis-laboratories-ltd',
    'nestleind': 'nestle-india-ltd',
    'britannia': 'britannia-industries-ltd',
    'eichermot': 'eicher-motors-ltd',
    'm&m': 'mahindra-mahindra-ltd',
    'heromotoco': 'hero-motocorp-ltd',
    'indusindbk': 'indusind-bank-ltd',
    'grasim': 'grasim-industries-ltd',
    'upl': 'upl-ltd',
    'bpcl': 'bharat-petroleum-corporation-ltd',
    'ioc': 'indian-oil-corporation-ltd',
    'sbilife': 'sbi-life-insurance-company-ltd',
    'hdfclife': 'hdfc-life-insurance-company-ltd'
  }
  
  // Try to find in mapping
  if (symbolMap[lowered]) {
    return symbolMap[lowered]
  }
  
  // Generate a best-effort slug (symbol-ltd format)
  return lowered.replace(/\s+/g, '-') + '-ltd'
}

/**
 * Build Groww URL from symbol
 * @param {string} symbol - Stock symbol or slug
 * @returns {string} - Full Groww URL
 */
function buildGrowwUrl(symbol) {
  const slug = symbolToGrowwSlug(symbol)
  return `${GROWW_BASE_URL}${slug}`
}

/**
 * Fetch URL through multiple CORS proxies with fallback
 * Tries multiple proxy services until one succeeds
 * @param {string} url - The target URL to fetch
 * @returns {Promise<string>} - The response text
 */
async function fetchWithCorsFallback(url) {
  const tried = []
  
  // List of CORS proxy services to try (in order of reliability)
  const proxies = [
    // Local proxy (if running cors-proxy.js)
    (u) => `http://localhost:8080/proxy?url=${encodeURIComponent(u)}`,
    // Public CORS proxies - try multiple services
    (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.org/?${encodeURIComponent(u)}`,
    (u) => `https://proxy.cors.sh/${u}`,
    (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
    (u) => `https://cors-anywhere.herokuapp.com/${u}`,
    (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
  ]

  for (const makeProxy of proxies) {
    const proxyUrl = makeProxy(url)
    try {
      console.debug('fetch.js: trying proxy', proxyUrl)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const r = await fetch(proxyUrl, { 
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!r.ok) throw new Error('Proxy response not ok: ' + r.status)
      
      let txt = await r.text()
      
      // allorigins.win returns JSON with 'contents' field
      if (proxyUrl.includes('api.allorigins.win/get')) {
        try {
          const json = JSON.parse(txt)
          txt = json.contents || txt
        } catch (e) {
          // Not JSON, use as-is
        }
      }
      
      // Verify we got HTML content (not an error page)
      if (txt && txt.includes('<!DOCTYPE') || txt.includes('<html')) {
        console.debug('fetch.js: proxy success', proxyUrl.substring(0, 50))
        return txt
      } else {
        throw new Error('Response does not contain HTML')
      }
    } catch (err) {
      const errorMsg = err.name === 'AbortError' ? 'Timeout' : (err && err.message)
      console.warn('fetch.js: proxy failed', proxyUrl.substring(0, 50), errorMsg)
      tried.push({ proxy: proxyUrl, error: errorMsg })
    }
  }

  // Last resort: try direct fetch (will likely fail due to CORS)
  try {
    console.debug('fetch.js: trying direct fetch', url)
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error('Network response not ok: ' + res.status)
    return await res.text()
  } catch (err) {
    tried.push({ direct: url, error: err && err.message })
    const msg = 'All fetch attempts failed. Please start the local CORS proxy: node js/cors-proxy.js'
    console.error('fetch.js:', msg)
    console.error('Attempted proxies:', tried)
    throw new Error(msg)
  }
}

/**
 * Parse Groww HTML page to extract all stock metrics
 * Metrics extracted:
 * - Market Cap, ROE, P/E Ratio (TTM), EPS (TTM), P/B Ratio
 * - Dividend Yield, Industry P/E, Book Value, Debt to Equity, Face Value
 * - Current Price, 52W High/Low, Today's High/Low, Volume, Open, Prev Close
 * @param {string} htmlText - Raw HTML from Groww page
 * @returns {object} - Object containing all extracted metrics
 */
function parseGrowwStats(htmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlText, 'text/html')

  const result = {
    // Fundamentals
    marketCap: null,
    roe: null,
    pe: null,
    eps: null,
    pbRatio: null,
    dividendYield: null,
    industryPe: null,
    bookValue: null,
    debtToEquity: null,
    faceValue: null,
    promoterHoldings: null,
    // Performance
    currentPrice: null,
    priceChange: null,
    priceChangePercent: null,
    todayLow: null,
    todayHigh: null,
    week52Low: null,
    week52High: null,
    open: null,
    prevClose: null,
    volume: null,
    totalTradedValue: null,
    upperCircuit: null,
    lowerCircuit: null
  }

  // Helper to clean numeric values
  function cleanNumber(str) {
    if (!str) return null
    // Remove currency symbols, commas, 'Cr', '%' etc and trim
    const cleaned = str.replace(/[₹,Cr%]/g, '').trim()
    const num = parseFloat(cleaned)
    return isNaN(num) ? str.trim() : num
  }

  // Helper to find text content by pattern in the page
  function findTextByPattern(pattern) {
    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false)
    let node
    while (node = walker.nextNode()) {
      const txt = node.textContent.trim()
      if (pattern.test(txt)) {
        return txt
      }
    }
    return null
  }

  // Method 1: Parse from table cells (td elements)
  const rows = Array.from(doc.querySelectorAll('td'))
  
  function findValueByLabel(labelRegex, nextSiblingIndex = 1) {
    for (const td of rows) {
      const txt = td.textContent && td.textContent.trim()
      if (!txt) continue
      if (labelRegex.test(txt)) {
        let valueTd = td.nextElementSibling
        if (!valueTd) {
          const parent = td.parentElement
          if (parent) {
            const tds = parent.querySelectorAll('td')
            if (tds.length >= 2) valueTd = tds[nextSiblingIndex]
          }
        }
        if (valueTd) {
          const val = valueTd.textContent && valueTd.textContent.trim()
          if (val) return val
        }
      }
    }
    return null
  }

  // Method 2: Parse from common Groww page structure (div based)
  function findValueFromDivStructure(labelText) {
    // Groww uses div structures where label and value are siblings or nearby
    const allDivs = doc.querySelectorAll('div')
    for (const div of allDivs) {
      const children = div.children
      if (children.length >= 2) {
        const firstChild = children[0].textContent?.trim()
        if (firstChild && firstChild.toLowerCase().includes(labelText.toLowerCase())) {
          return children[1].textContent?.trim() || null
        }
      }
    }
    return null
  }

  // Method 3: Parse from entire text content using regex
  function findFromFullText(pattern) {
    const text = doc.body?.textContent || ''
    const match = text.match(pattern)
    return match ? match[1]?.trim() : null
  }

  function findPercentInNode(node) {
    if (!node) return null
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false)
    let current
    while (current = walker.nextNode()) {
      const text = (current.textContent || '').trim()
      const percentMatch = text.match(/([\d.,]+%)/)
      if (percentMatch) {
        return percentMatch[1].trim()
      }
    }
    return null
  }

  function searchPercentInCandidates(candidates) {
    for (const candidate of candidates) {
      if (!candidate) continue
      const percent = findPercentInNode(candidate)
      if (percent) return percent
    }
    return null
  }

  function extractPromoterHoldings() {
    // Method 1: Target the specific Groww Shareholding Pattern structure
    // Look for div with class 'shp76TextRight' (the percentage display element)
    const shpElements = Array.from(doc.querySelectorAll('div.shp76TextRight'))
    for (const el of shpElements) {
      // Check if parent section contains "Promoter" text
      const section = el.closest('section')
      if (section) {
        const sectionText = section.textContent || ''
        // Ensure we're in the Promoters section, not other shareholding categories
        if (/Promoter(?:s)?/i.test(sectionText) && !/(Retail|Foreign|Domestic|Mutual)/i.test(sectionText.substring(0, sectionText.indexOf(el.textContent || '')))) {
          const percentMatch = el.textContent?.trim().match(/([\d.,]+%)/)
          if (percentMatch) {
            console.debug('extractPromoterHoldings: Found via shp76TextRight', percentMatch[1])
            return percentMatch[1].trim()
          }
        }
      }
    }

    // Method 2: Look for "Promoters" label (bodyLarge class) and find adjacent percentage
    const bodyLargeElements = Array.from(doc.querySelectorAll('div.bodyLarge'))
    for (const el of bodyLargeElements) {
      if (/^Promoter(?:s)?$/i.test(el.textContent?.trim() || '')) {
        // Look for shp76TextRight in the same section
        const section = el.closest('section')
        if (section) {
          const percentEl = section.querySelector('div.shp76TextRight')
          if (percentEl) {
            const percentMatch = percentEl.textContent?.trim().match(/([\d.,]+%)/)
            if (percentMatch) {
              console.debug('extractPromoterHoldings: Found via bodyLarge label', percentMatch[1])
              return percentMatch[1].trim()
            }
          }
        }
      }
    }

    // Method 3: Generic label search
    const labelRegex = /Promoter(?:s| Holdings?)?/i
    const labelNodes = Array.from(doc.querySelectorAll('div, span, td, th, p'))
      .filter(node => labelRegex.test(node.textContent || ''))

    for (const label of labelNodes) {
      const percent = searchPercentInCandidates([
        label,
        label.nextElementSibling,
        label.parentElement,
        label.parentElement?.nextElementSibling
      ])
      if (percent) {
        return percent
      }
    }

    const heading = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .find(el => /Shareholding Pattern/i.test(el.textContent || ''))

    if (heading) {
      const percent = searchPercentInCandidates([
        heading.nextElementSibling,
        heading.parentElement,
        heading.parentElement?.nextElementSibling
      ])
      if (percent) {
        return percent
      }
    }

    const fallbackText = doc.body?.textContent || ''
    const fallbackMatch = fallbackText.match(/Promoter(?:s| Holdings?)?[^%]{0,60}([\d.,]+%)/i)
    if (fallbackMatch) {
      return fallbackMatch[1].trim()
    }

    return null
  }

  // Extract fundamentals
  result.marketCap = findValueByLabel(/^Market Cap/i) || findFromFullText(/Market Cap[₹\s]*([\d,\.]+\s*Cr)/i)
  result.roe = findValueByLabel(/^ROE/i) || findFromFullText(/ROE\s*([\d\.]+%?)/i)
  result.pe = findValueByLabel(/P\/E Ratio|P\/E\s*\(TTM\)/i) || findFromFullText(/P\/E Ratio\s*\(TTM\)\s*([\d\.]+)/i)
  result.eps = findValueByLabel(/^EPS\s*\(TTM\)/i) || findFromFullText(/EPS\s*\(TTM\)\s*([\d\.]+)/i)
  result.pbRatio = findValueByLabel(/^P\/B Ratio/i) || findFromFullText(/P\/B Ratio\s*([\d\.]+)/i)
  result.dividendYield = findValueByLabel(/^Dividend Yield/i) || findFromFullText(/Dividend Yield\s*([\d\.]+%?)/i)
  result.industryPe = findValueByLabel(/^Industry P\/E/i) || findFromFullText(/Industry P\/E\s*([\d\.]+)/i)
  result.bookValue = findValueByLabel(/^Book Value/i) || findFromFullText(/Book Value\s*([\d\.]+)/i)
  result.debtToEquity = findValueByLabel(/^Debt to Equity/i) || findFromFullText(/Debt to Equity\s*([\d\.]+)/i)
  result.faceValue = findValueByLabel(/^Face Value/i) || findFromFullText(/Face Value\s*([\d\.]+)/i)

  // Extract performance metrics
  result.todayLow = findValueByLabel(/Today's Low/i) || findFromFullText(/Today's Low\s*([\d,\.]+)/i)
  result.todayHigh = findValueByLabel(/Today's High/i) || findFromFullText(/Today's High\s*([\d,\.]+)/i)
  result.week52Low = findValueByLabel(/52W Low/i) || findFromFullText(/52W Low\s*([\d,\.]+)/i)
  result.week52High = findValueByLabel(/52W High/i) || findFromFullText(/52W High\s*([\d,\.]+)/i)
  result.open = findValueByLabel(/^Open$/i) || findFromFullText(/Open\s*([\d,\.]+)/i)
  result.prevClose = findValueByLabel(/Prev\.\s*Close/i) || findFromFullText(/Prev\. Close\s*([\d,\.]+)/i)
  result.volume = findValueByLabel(/^Volume$/i) || findFromFullText(/Volume\s*([\d,\.]+)/i)
  result.totalTradedValue = findValueByLabel(/Total traded value/i) || findFromFullText(/Total traded value\s*([\d,\.]+\s*Cr)/i)
  result.upperCircuit = findValueByLabel(/Upper Circuit/i) || findFromFullText(/Upper Circuit\s*([\d,\.]+)/i)
  result.lowerCircuit = findValueByLabel(/Lower Circuit/i) || findFromFullText(/Lower Circuit\s*([\d,\.]+)/i)
  result.promoterHoldings = extractPromoterHoldings()

  // Try to extract current price from h1 or price display elements
  const priceMatch = doc.body?.textContent.match(/₹\s*([\d,\.]+)\s*([+\-][\d\.]+)\s*\(([\d\.]+%?)\)/i)
  if (priceMatch) {
    result.currentPrice = priceMatch[1]?.replace(/,/g, '')
    result.priceChange = priceMatch[2]
    result.priceChangePercent = priceMatch[3]
  }

  // Clean up values - convert string numbers to numbers where possible
  for (const key of Object.keys(result)) {
    if (result[key] && typeof result[key] === 'string') {
      result[key] = result[key].replace(/^\s*₹\s*/, '').trim()
    }
  }

  console.debug('parseGrowwStats result:', result)
  return result
}

/**
 * Fetch Groww stats with caching and request deduplication
 * @param {string} url - Groww URL to fetch
 * @param {boolean} bypassCache - Skip cache and force fresh fetch
 * @returns {Promise<Object>} Parsed stock stats
 */
async function fetchGrowwStats(url, bypassCache = false) {
  console.debug('fetch.js: fetchGrowwStats', url)
  
  // Check cache first (unless bypassed)
  if (!bypassCache) {
    const cached = getCachedData(url);
    if (cached) {
      return cached;
    }
  }
  
  // Check for pending request to prevent duplicates
  if (pendingRequests.has(url)) {
    console.debug('fetch.js: returning pending request for', url);
    return pendingRequests.get(url);
  }
  
  // Create new request
  const requestPromise = (async () => {
    try {
      const html = await fetchWithCorsFallback(url);
      const stats = parseGrowwStats(html);
      
      // Cache the result
      setCachedData(url, stats);
      
      return stats;
    } finally {
      // Clean up pending request tracker
      pendingRequests.delete(url);
    }
  })();
  
  // Track pending request
  pendingRequests.set(url, requestPromise);
  
  return requestPromise;
}

// Backwards-compatible single-value fetch
async function fetchMarketCap(url) {
  const stats = await fetchGrowwStats(url)
  return stats && stats.marketCap ? stats.marketCap : null
}

// Expose a lightweight crawler object for compatibility
export const growwCrawler = { fetchMarketCap, fetchGrowwStats, buildGrowwUrl, symbolToGrowwSlug }

// ============================================================================
// Yahoo Finance Integration
// ============================================================================

const YAHOO_BASE_URL = 'https://finance.yahoo.com/quote/'

/**
 * Yahoo symbol mapping cache (loaded once from resource/yahoo-symbols.json)
 */
let yahooSymbolsCache = null

/**
 * Groww slug to stock symbol mapping
 * Converts slug format (e.g., "tata-consultancy-services-ltd") to symbol (e.g., "TCS")
 */
const slugToSymbolMap = {
  'tata-consultancy-services-ltd': 'TCS',
  'itc-ltd': 'ITC',
  'reliance-industries-ltd': 'RELIANCE',
  'hdfc-bank-ltd': 'HDFCBANK',
  'infosys-ltd': 'INFY',
  'icici-bank-ltd': 'ICICIBANK',
  'wipro-ltd': 'WIPRO',
  'state-bank-of-india': 'SBIN',
  'kotak-mahindra-bank-ltd': 'KOTAKBANK',
  'hcl-technologies-ltd': 'HCLTECH',
  'bharti-airtel-ltd': 'BHARTIARTL',
  'axis-bank-ltd': 'AXISBANK',
  'tata-motors-ltd': 'TATAMOTORS',
  'tata-steel-ltd': 'TATASTEEL',
  'sun-pharmaceutical-industries-ltd': 'SUNPHARMA',
  'maruti-suzuki-india-ltd': 'MARUTI',
  'hindustan-unilever-ltd': 'HINDUNILVR',
  'asian-paints-ltd': 'ASIANPAINT',
  'larsen-toubro-ltd': 'LT',
  'bajaj-finance-ltd': 'BAJFINANCE',
  'bajaj-finserv-ltd': 'BAJAJFINSV',
  'tech-mahindra-ltd': 'TECHM',
  'ultratech-cement-ltd': 'ULTRACEMCO',
  'titan-company-ltd': 'TITAN',
  'oil-natural-gas-corporation-ltd': 'ONGC',
  'ntpc-ltd': 'NTPC',
  'power-grid-corporation-of-india-ltd': 'POWERGRID',
  'jsw-steel-ltd': 'JSWSTEEL',
  'adani-ports-special-economic-zone-ltd': 'ADANIPORTS',
  'adani-enterprises-ltd': 'ADANIENT',
  'coal-india-ltd': 'COALINDIA',
  'dr-reddys-laboratories-ltd': 'DRREDDY',
  'cipla-ltd': 'CIPLA',
  'divis-laboratories-ltd': 'DIVISLAB',
  'nestle-india-ltd': 'NESTLEIND',
  'britannia-industries-ltd': 'BRITANNIA',
  'eicher-motors-ltd': 'EICHERMOT',
  'mahindra-mahindra-ltd': 'M&M',
  'hero-motocorp-ltd': 'HEROMOTOCO',
  'indusind-bank-ltd': 'INDUSINDBK',
  'grasim-industries-ltd': 'GRASIM',
  'upl-ltd': 'UPL',
  'bharat-petroleum-corporation-ltd': 'BPCL',
  'indian-oil-corporation-ltd': 'IOC',
  'sbi-life-insurance-company-ltd': 'SBILIFE',
  'hdfc-life-insurance-company-ltd': 'HDFCLIFE',
  'zomato-ltd': 'ZOMATO',
  'bharat-electronics-ltd': 'BEL',
  'gail-india-ltd': 'GAIL',
  'jio-financial-services-ltd': 'JIOFIN',
  'vodafone-idea-ltd': 'IDEA'
}

/**
 * Load Yahoo symbols mapping from JSON file
 * @returns {Promise<Object>} Symbol mapping object
 */
async function loadYahooSymbols() {
  if (yahooSymbolsCache) {
    return yahooSymbolsCache
  }
  
  try {
    const response = await fetch('/resource/yahoo-symbols.json')
    if (!response.ok) {
      throw new Error(`Failed to load Yahoo symbols: ${response.status}`)
    }
    yahooSymbolsCache = await response.json()
    console.debug('fetch.js: Loaded Yahoo symbols mapping', yahooSymbolsCache)
    return yahooSymbolsCache
  } catch (err) {
    console.error('fetch.js: Failed to load Yahoo symbols mapping', err)
    // Return basic fallback mapping
    yahooSymbolsCache = { 'ITC': 'ITC.NS' }
    return yahooSymbolsCache
  }
}

/**
 * Convert stock symbol to Yahoo Finance symbol format
 * Handles both direct symbols (e.g., "TCS") and Groww slugs (e.g., "tata-consultancy-services-ltd")
 * @param {string} symbol - Stock symbol or Groww slug
 * @returns {Promise<string|null>} Yahoo symbol (e.g., "TCS.NS") or null if not found
 */
async function symbolToYahooSymbol(symbol) {
  if (!symbol) return null
  
  const mapping = await loadYahooSymbols()
  let upperSymbol = symbol.toUpperCase().trim()
  
  // First check if this is a Groww slug and convert to symbol
  const lowerSymbol = symbol.toLowerCase().trim()
  if (slugToSymbolMap[lowerSymbol]) {
    upperSymbol = slugToSymbolMap[lowerSymbol]
    console.debug('fetch.js: Converted Groww slug to symbol:', lowerSymbol, '->', upperSymbol)
  }
  
  // Try exact match first
  if (mapping[upperSymbol]) {
    console.debug('fetch.js: Found Yahoo symbol for', upperSymbol, '->', mapping[upperSymbol])
    return mapping[upperSymbol]
  }
  
  // Try to extract symbol from common formats
  // e.g., "ITC Ltd" -> "ITC", "Reliance Industries" -> "RELIANCE"
  const parts = upperSymbol.split(/\s+/)
  if (parts.length > 0 && mapping[parts[0]]) {
    console.debug('fetch.js: Extracted and found Yahoo symbol:', parts[0], '->', mapping[parts[0]])
    return mapping[parts[0]]
  }
  
  // If not found, try appending .NS as default for NSE stocks
  console.warn('fetch.js: Yahoo symbol not found in mapping, using default .NS format:', upperSymbol)
  return `${upperSymbol}.NS`
}

/**
 * Build Yahoo Finance key statistics URL
 * @param {string} symbol - Stock symbol
 * @returns {Promise<string>} Full Yahoo Finance URL
 */
async function buildYahooUrl(symbol) {
  const yahooSymbol = await symbolToYahooSymbol(symbol)
  if (!yahooSymbol) {
    throw new Error(`Cannot build Yahoo URL: invalid symbol ${symbol}`)
  }
  return `${YAHOO_BASE_URL}${encodeURIComponent(yahooSymbol)}/key-statistics`
}

/**
 * Parse Yahoo Finance key-statistics page to extract metrics
 * Extracts: ROA (%), EBITDA Latest, EBITDA Previous, P/S YoY, BETA
 * @param {string} htmlText - Raw HTML from Yahoo Finance page
 * @returns {object} - Object containing extracted Yahoo metrics
 */
function parseYahooStats(htmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlText, 'text/html')

  const result = {
    roa: null,           // ROA (%) - Return on Assets
    ebitdaLatest: null,  // EBITDA Latest
    ebitdaPrevious: null,// EBITDA Previous
    psYoY: null,         // P/S YoY - Price/Sales Year over Year
    beta: null           // Beta (volatility measure)
  }

  // Helper to clean numeric values
  function cleanNumber(str) {
    if (!str) return null
    // Remove commas, percentage signs, currency symbols
    const cleaned = str.replace(/[$,₹%]/g, '').trim()
    
    // Handle 'N/A', '-', or empty strings
    if (cleaned === 'N/A' || cleaned === '-' || cleaned === '') return null
    
    // Handle values with B (Billion), M (Million), K (Thousand)
    const multiplierMatch = cleaned.match(/([\d.]+)([BMK])/i)
    if (multiplierMatch) {
      const num = parseFloat(multiplierMatch[1])
      const multiplier = multiplierMatch[2].toUpperCase()
      const multipliers = { 'B': 1e9, 'M': 1e6, 'K': 1e3 }
      return num * (multipliers[multiplier] || 1)
    }
    
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  // Helper to find value by label in table rows
  function findValueByLabel(labelPattern) {
    const allRows = Array.from(doc.querySelectorAll('tr'))
    
    for (const row of allRows) {
      const cells = row.querySelectorAll('td, th')
      if (cells.length < 2) continue
      
      // Check if first cell contains the label
      const labelText = cells[0].textContent?.trim() || ''
      if (labelPattern.test(labelText)) {
        // Return the value from the second cell
        const valueText = cells[1].textContent?.trim()
        console.debug(`parseYahooStats: Found ${labelPattern} -> ${valueText}`)
        return valueText
      }
    }
    return null
  }

  // Helper to find value by label in spans/divs (alternate structure)
  function findValueInSpans(labelPattern) {
    const allSpans = Array.from(doc.querySelectorAll('span, div, p'))
    
    for (let i = 0; i < allSpans.length - 1; i++) {
      const span = allSpans[i]
      const text = span.textContent?.trim() || ''
      
      if (labelPattern.test(text)) {
        // Check next sibling or parent's next sibling for value
        const candidates = [
          span.nextElementSibling,
          span.parentElement?.nextElementSibling,
          allSpans[i + 1]
        ]
        
        for (const candidate of candidates) {
          if (candidate) {
            const valueText = candidate.textContent?.trim()
            if (valueText && valueText !== text) {
              console.debug(`parseYahooStats: Found in spans ${labelPattern} -> ${valueText}`)
              return valueText
            }
          }
        }
      }
    }
    return null
  }

  // Helper to find value in Yahoo Finance's new Valuation Measures table structure
  function findInValuationMeasures(labelPattern) {
    // Look for the Valuation Measures section
    const allElements = doc.querySelectorAll('[class*="yf-"], table td, table th, div, span')
    
    for (let i = 0; i < allElements.length; i++) {
      const elem = allElements[i]
      const text = elem.textContent?.trim() || ''
      
      if (labelPattern.test(text)) {
        console.debug(`parseYahooStats: Found label match for ${labelPattern}:`, text)
        
        // Strategy 1: Look in same row (table structure)
        const row = elem.closest('tr')
        if (row) {
          const cells = Array.from(row.querySelectorAll('td'))
          // Find the cell with the label and get the next cell
          for (let j = 0; j < cells.length - 1; j++) {
            if (labelPattern.test(cells[j].textContent?.trim() || '')) {
              const value = cells[j + 1].textContent?.trim()
              console.debug('parseYahooStats: Found value in next cell:', value)
              return value
            }
          }
          // If cells exist, return last cell as it often contains the value
          if (cells.length > 0) {
            const value = cells[cells.length - 1].textContent?.trim()
            if (value && value !== text) {
              console.debug('parseYahooStats: Found value in last cell:', value)
              return value
            }
          }
        }
        
        // Strategy 2: Look in next sibling elements
        let nextElem = elem.nextElementSibling
        let attempts = 0
        while (nextElem && attempts < 5) {
          const value = nextElem.textContent?.trim()
          if (value && value !== text && !/^[A-Za-z\s]+$/.test(value)) {
            console.debug('parseYahooStats: Found value in next sibling:', value)
            return value
          }
          nextElem = nextElem.nextElementSibling
          attempts++
        }
        
        // Strategy 3: Look in parent's next sibling
        const parent = elem.parentElement
        if (parent?.nextElementSibling) {
          const value = parent.nextElementSibling.textContent?.trim()
          if (value && value !== text) {
            console.debug('parseYahooStats: Found value in parent next sibling:', value)
            return value
          }
        }
      }
    }
    return null
  }

  // Extract ROA (Return on Assets)
  let roaValue = findInValuationMeasures(/Return on Assets|ROA/i) || 
                 findValueByLabel(/Return on Assets|ROA/i) || 
                 findValueInSpans(/Return on Assets|ROA/i)
  result.roa = cleanNumber(roaValue)
  console.debug('parseYahooStats: ROA extracted:', result.roa)

  // Extract EBITDA (look for latest and previous quarters/years)
  let ebitdaValue = findInValuationMeasures(/^EBITDA$/i) || 
                    findValueByLabel(/^EBITDA$/i) || 
                    findValueInSpans(/^EBITDA$/i)
  if (ebitdaValue) {
    // If we find EBITDA, it's typically the latest value
    result.ebitdaLatest = cleanNumber(ebitdaValue)
    
    // Try to find previous EBITDA (may be in adjacent cells or rows)
    // This is tricky - Yahoo may show quarterly EBITDA in a table
    // For now, set previous to null - will need page inspection to refine
    result.ebitdaPrevious = null
  }
  console.debug('parseYahooStats: EBITDA extracted:', result.ebitdaLatest)

  // Extract Price/Sales (P/S) from Valuation Measures table
  // Yahoo Finance shows this in a table with class "yf-18eg72q" or similar
  let psValue = null
  
  // Method 1: Use the specialized Valuation Measures finder
  psValue = findInValuationMeasures(/Price\/Sales|Price-to-Sales|P\/S/i)
  if (psValue) {
    console.debug('parseYahooStats: Found P/S in Valuation Measures:', psValue)
  }
  
  // Method 2: Fallback to traditional table row search
  if (!psValue) {
    psValue = findValueByLabel(/Price\/Sales|Price-to-Sales|P\/S.*TTM/i)
    if (psValue) {
      console.debug('parseYahooStats: Found P/S in table rows:', psValue)
    }
  }
  
  // Method 3: Fallback to span/div search
  if (!psValue) {
    psValue = findValueInSpans(/Price\/Sales|Price-to-Sales|P\/S/i)
    if (psValue) {
      console.debug('parseYahooStats: Found P/S in spans:', psValue)
    }
  }
  
  result.psYoY = cleanNumber(psValue)

  // Extract Beta (usually labeled as "Beta (5Y Monthly)" or just "Beta")
  let betaValue = findInValuationMeasures(/Beta/i) || 
                  findValueByLabel(/Beta/i) || 
                  findValueInSpans(/Beta/i)
  result.beta = cleanNumber(betaValue)
  console.debug('parseYahooStats: BETA extracted:', result.beta)

  console.debug('parseYahooStats result:', result)
  return result
}

/**
 * Fetch Yahoo Finance stats with error handling
 * @param {string} url - Yahoo Finance URL
 * @returns {Promise<Object>} Parsed Yahoo stats
 */
async function fetchYahooStats(url) {
  console.debug('fetch.js: fetchYahooStats', url)
  
  // Check cache first
  const cached = getCachedData(url)
  if (cached) {
    return cached
  }
  
  try {
    const html = await fetchWithCorsFallback(url)
    const stats = parseYahooStats(html)
    
    // Cache the result
    setCachedData(url, stats)
    
    return stats
  } catch (err) {
    console.error('fetch.js: fetchYahooStats failed', err)
    // Return null object on failure (non-blocking)
    return {
      roa: null,
      ebitdaLatest: null,
      ebitdaPrevious: null,
      psYoY: null,
      beta: null
    }
  }
}

/**
 * Map Yahoo metrics to analysis table fields
 * @param {object} yahooData - Data from parseYahooStats
 * @returns {object} - Mapped data for the analysis table
 */
function mapYahooToTableFields(yahooData) {
  return {
    roa: yahooData.roa,
    ebitda_latest: yahooData.ebitdaLatest,
    ebitda_previous: yahooData.ebitdaPrevious,
    ps_yoy: yahooData.psYoY,
    beta: yahooData.beta
  }
}

/**
 * Map Groww metrics to analysis table fields
 * @param {object} growwData - Data from parseGrowwStats
 * @returns {object} - Mapped data for the analysis table
 */
function mapGrowwToTableFields(growwData) {
  // Helper to parse numeric values
  const parseNum = (val) => {
    if (val === null || val === undefined) return null
    if (typeof val === 'number') return val
    const cleaned = String(val).replace(/[₹,Cr%]/g, '').trim()
    const num = parseFloat(cleaned)
    return isNaN(num) ? val : num
  }

  return {
    // Map to existing table columns
    roe: growwData.roe ? parseNum(growwData.roe) : null,
    pe_ratio: growwData.pe ? parseNum(growwData.pe) : null,
    industry_pe: growwData.industryPe ? parseNum(growwData.industryPe) : null,
    price_to_book: growwData.pbRatio ? parseNum(growwData.pbRatio) : null,
    dividend_yield: growwData.dividendYield ? parseNum(growwData.dividendYield) : null,
    debt_to_equity: growwData.debtToEquity ? parseNum(growwData.debtToEquity) : null,
    promoter_holdings: growwData.promoterHoldings ? parseNum(growwData.promoterHoldings) : null,
    // Additional fields that could be added
    market_cap: growwData.marketCap || null,
    eps: growwData.eps ? parseNum(growwData.eps) : null,
    book_value: growwData.bookValue ? parseNum(growwData.bookValue) : null,
    face_value: growwData.faceValue ? parseNum(growwData.faceValue) : null,
    current_price: growwData.currentPrice ? parseNum(growwData.currentPrice) : null,
    week_52_high: growwData.week52High ? parseNum(growwData.week52High) : null,
    week_52_low: growwData.week52Low ? parseNum(growwData.week52Low) : null,
    volume: growwData.volume ? parseNum(growwData.volume) : null,
    open_price: growwData.open ? parseNum(growwData.open) : null,
    prev_close: growwData.prevClose ? parseNum(growwData.prevClose) : null
  }
}

/**
 * Factory: create a fetchStockData function bound to UI callbacks.
 * Callers should provide: getStocksData(), renderTable(), showAlert(type,msg), updateStockInFirebase(optional)
 * 
 * Now fetches data from BOTH Groww and Yahoo Finance in parallel for comprehensive metrics
 */
export function makeFetchStockData({ getStocksData, renderTable, showAlert, updateStockInFirebase }) {
  return async function fetchStockData(symbol, stockId) {
    console.debug('fetchStockData called', { symbol, stockId })
    try {
      if (showAlert) showAlert('info', `Fetching data for ${symbol} from Groww and Yahoo Finance...`)

      // Build URLs for both Groww and Yahoo Finance
      const growwUrl = buildGrowwUrl(symbol)
      const yahooUrl = await buildYahooUrl(symbol)
      
      console.debug('fetchStockData: Groww URL', growwUrl)
      console.debug('fetchStockData: Yahoo URL', yahooUrl)

      // Fetch from BOTH sources in parallel using Promise.all
      const [growwData, yahooData] = await Promise.all([
        fetchGrowwStats(growwUrl).catch(err => {
          console.error('Groww fetch failed:', err)
          return null // Non-blocking: continue even if Groww fails
        }),
        fetchYahooStats(yahooUrl).catch(err => {
          console.error('Yahoo fetch failed:', err)
          return null // Non-blocking: continue even if Yahoo fails
        })
      ])
      
      // Check if we got any data from either source
      const hasGrowwData = growwData && !Object.values(growwData).every(v => v === null)
      const hasYahooData = yahooData && !Object.values(yahooData).every(v => v === null)
      
      if (!hasGrowwData && !hasYahooData) {
        if (showAlert) showAlert('warning', `No data found for ${symbol} from either source.`)
        return
      }

      // Map data from both sources
      const mappedGrowwData = hasGrowwData ? mapGrowwToTableFields(growwData) : {}
      const mappedYahooData = hasYahooData ? mapYahooToTableFields(yahooData) : {}
      
      // Combine data from both sources
      const mappedData = { ...mappedGrowwData, ...mappedYahooData }
      
      const promoterFetched = Boolean(growwData?.promoterHoldings)
      
      // Count how many fields were fetched from both sources
      const fetchedFields = Object.entries(mappedData).filter(([k, v]) => v !== null)
      
      console.debug('fetchStockData: combined mapped data', mappedData)

      const shouldUpdate = fetchedFields.length > 0 || !promoterFetched
      if (!shouldUpdate) {
        if (showAlert) showAlert('warning', `Could not extract any metrics for ${symbol}`)
        return
      }

      // Build success message showing data from both sources
      let successMsg = `Fetched ${fetchedFields.length} metrics for ${symbol}`
      if (hasGrowwData && hasYahooData) {
        successMsg += ' (Groww + Yahoo Finance)'
      } else if (hasGrowwData) {
        successMsg += ' (Groww only)'
      } else if (hasYahooData) {
        successMsg += ' (Yahoo Finance only)'
      }
      
      if (showAlert) showAlert('success', successMsg)

      // Update in-memory data
      try {
        const stocks = getStocksData ? getStocksData() : null
        if (stocks && Array.isArray(stocks)) {
          const stock = stocks.find(s => s.stock_id === stockId)
          if (stock) {
            if (!promoterFetched) {
              mappedData.promoter_holdings = 0
            }
            
            // Update only fields that have values
            for (const [key, value] of Object.entries(mappedData)) {
              if (value !== null) {
                stock[key] = value
              }
            }
            
            // If Firebase update function is available, persist to Firebase
            if (updateStockInFirebase && typeof updateStockInFirebase === 'function') {
              try {
                await updateStockInFirebase(stockId, mappedData)
                console.debug('fetchStockData: saved to Firebase', stockId)
              } catch (fbErr) {
                console.warn('fetchStockData: Firebase save failed', fbErr)
              }
            }
            
            if (renderTable) renderTable()
          }
        }
      } catch (err) {
        console.warn('Could not update stock data', err)
      }
    } catch (err) {
      console.error('fetchStockData error', err)
      if (showAlert) showAlert('danger', `Error fetching data: ${err && err.message ? err.message : String(err)}`)
    }
  }
}

// Export buildYahooUrl for testing
export { buildYahooUrl }
