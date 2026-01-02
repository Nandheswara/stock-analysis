// fetch.js
// Contains Groww crawler utilities and a factory to create a fetchStockData function
// which delegates UI work back to the caller via callbacks.

const GROWW_BASE_URL = 'https://groww.in/stocks/'

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

async function fetchWithCorsFallback(url) {
  const tried = []
  const localProxy = (u) => `http://localhost:8080/proxy?url=${encodeURIComponent(u)}`
  const proxies = [
    localProxy,
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ]

  for (const makeProxy of proxies) {
    const proxyUrl = makeProxy(url)
    try {
      console.debug('fetch.js: trying proxy', proxyUrl)
      const r = await fetch(proxyUrl)
      if (!r.ok) throw new Error('Proxy response not ok: ' + r.status)
      const txt = await r.text()
      return txt
    } catch (err) {
      console.warn('fetch.js: proxy failed', proxyUrl, err && err.message)
      tried.push({ proxy: proxyUrl, error: err && err.message })
    }
  }

  try {
    console.debug('fetch.js: trying direct fetch', url)
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error('Network response not ok: ' + res.status)
    return await res.text()
  } catch (err) {
    tried.push({ direct: url, error: err && err.message })
    const msg = 'All fetch attempts failed: ' + JSON.stringify(tried)
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

async function fetchGrowwStats(url) {
  console.debug('fetch.js: fetchGrowwStats', url)
  const html = await fetchWithCorsFallback(url)
  return parseGrowwStats(html)
}

// Backwards-compatible single-value fetch
async function fetchMarketCap(url) {
  const stats = await fetchGrowwStats(url)
  return stats && stats.marketCap ? stats.marketCap : null
}

// Expose a lightweight crawler object for compatibility
export const growwCrawler = { fetchMarketCap, fetchGrowwStats, buildGrowwUrl, symbolToGrowwSlug }

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
 */
export function makeFetchStockData({ getStocksData, renderTable, showAlert, updateStockInFirebase }) {
  return async function fetchStockData(symbol, stockId) {
    console.debug('fetchStockData called', { symbol, stockId })
    try {
      if (showAlert) showAlert('info', `Fetching data for ${symbol}...`)

      // Build the Groww URL from symbol
      const url = buildGrowwUrl(symbol)
      console.debug('fetchStockData: Groww URL', url)

      // Fetch all available stats
      const growwData = await fetchGrowwStats(url)
      
      if (!growwData || Object.values(growwData).every(v => v === null)) {
        if (showAlert) showAlert('warning', `No data found for ${symbol}. The stock URL might be incorrect.`)
        return
      }

      // Map Groww data to table fields
      const mappedData = mapGrowwToTableFields(growwData)
      
      // Count how many fields were fetched
      const fetchedFields = Object.entries(mappedData).filter(([k, v]) => v !== null)
      const fieldsSummary = fetchedFields.map(([k, v]) => `${k}: ${v}`).join(', ')
      
      console.debug('fetchStockData: mapped data', mappedData)

      if (fetchedFields.length > 0) {
        if (showAlert) showAlert('success', `Fetched ${fetchedFields.length} metrics for ${symbol}`)

        // Update in-memory data
        try {
          const stocks = getStocksData ? getStocksData() : null
          if (stocks && Array.isArray(stocks)) {
            const stock = stocks.find(s => s.stock_id === stockId)
            if (stock) {
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
      } else {
        if (showAlert) showAlert('warning', `Could not extract any metrics for ${symbol}`)
      }
    } catch (err) {
      console.error('fetchStockData error', err)
      if (showAlert) showAlert('danger', `Error fetching data: ${err && err.message ? err.message : String(err)}`)
    }
  }
}
