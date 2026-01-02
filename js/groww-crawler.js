;(function () {
  const GROWW_BASE_URL = 'https://groww.in/stocks/'

  /**
   * Convert stock symbol to Groww URL slug
   * @param {string} symbol - Stock symbol or name
   * @returns {string} - Groww URL slug
   */
  function symbolToGrowwSlug(symbol) {
    if (!symbol) return null
    
    const lowered = symbol.toLowerCase().trim()
    if (lowered.includes('-') && lowered.includes('ltd')) {
      return lowered
    }
    
    // Common symbol to slug mappings
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
      'tatasteel': 'tata-steel-ltd'
    }
    
    if (symbolMap[lowered]) {
      return symbolMap[lowered]
    }
    
    return lowered.replace(/\s+/g, '-') + '-ltd'
  }

  function buildGrowwUrl(symbol) {
    const slug = symbolToGrowwSlug(symbol)
    return `${GROWW_BASE_URL}${slug}`
  }

  async function fetchWithCorsFallback(url) {
    const tried = []
    // Prefer a local proxy when available (run scripts/cors-proxy.js)
    const localProxy = (u) => `http://localhost:8080/proxy?url=${encodeURIComponent(u)}`
    // Then try reliable public CORS proxies
    const proxies = [
      localProxy,
      (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
    ]

    for (const makeProxy of proxies) {
      const proxyUrl = makeProxy(url)
      try {
        console.debug('growwCrawler: trying proxy', proxyUrl)
        const r = await fetch(proxyUrl)
        if (!r.ok) throw new Error('Proxy response not ok: ' + r.status)
        const txt = await r.text()
        return txt
      } catch (err) {
        console.warn('growwCrawler: proxy failed', proxyUrl, err && err.message)
        tried.push({ proxy: proxyUrl, error: err && err.message })
      }
    }

    // Last resort: try direct fetch (may be blocked by CORS)
    try {
      console.debug('growwCrawler: trying direct fetch', url)
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
   * Parse all available metrics from Groww HTML
   */
  function parseGrowwStats(htmlText) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlText, 'text/html')

    const result = {
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
      currentPrice: null,
      week52Low: null,
      week52High: null,
      volume: null
    }

    const rows = Array.from(doc.querySelectorAll('td'))
    
    function findValueByLabel(labelRegex) {
      for (const td of rows) {
        const txt = td.textContent && td.textContent.trim()
        if (!txt) continue
        if (labelRegex.test(txt)) {
          let valueTd = td.nextElementSibling
          if (!valueTd) {
            const parent = td.parentElement
            if (parent) {
              const tds = parent.querySelectorAll('td')
              if (tds.length >= 2) valueTd = tds[1]
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

    function findFromFullText(pattern) {
      const text = doc.body?.textContent || ''
      const match = text.match(pattern)
      return match ? match[1]?.trim() : null
    }

    result.marketCap = findValueByLabel(/^Market Cap/i) || findFromFullText(/Market Cap[₹\s]*([\d,\.]+\s*Cr)/i)
    result.roe = findValueByLabel(/^ROE/i) || findFromFullText(/ROE\s*([\d\.]+%?)/i)
    result.pe = findValueByLabel(/P\/E Ratio|P\/E\s*\(TTM\)/i) || findFromFullText(/P\/E Ratio\s*\(TTM\)\s*([\d\.]+)/i)
    result.eps = findValueByLabel(/^EPS\s*\(TTM\)/i) || findFromFullText(/EPS\s*\(TTM\)\s*([\d\.]+)/i)
    result.pbRatio = findValueByLabel(/^P\/B Ratio/i) || findFromFullText(/P\/B Ratio\s*([\d\.]+)/i)
    result.dividendYield = findValueByLabel(/^Dividend Yield/i) || findFromFullText(/Dividend Yield\s*([\d\.]+%?)/i)
    result.industryPe = findValueByLabel(/^Industry P\/E/i) || findFromFullText(/Industry P\/E\s*([\d\.]+)/i)
    result.bookValue = findValueByLabel(/^Book Value/i) || findFromFullText(/Book Value\s*([\d\.]+)/i)
    result.debtToEquity = findValueByLabel(/^Debt to Equity/i) || findFromFullText(/Debt to Equity\s*([\d\.]+)/i)
    result.week52Low = findValueByLabel(/52W Low/i) || findFromFullText(/52W Low\s*([\d,\.]+)/i)
    result.week52High = findValueByLabel(/52W High/i) || findFromFullText(/52W High\s*([\d,\.]+)/i)
    result.volume = findValueByLabel(/^Volume$/i) || findFromFullText(/Volume\s*([\d,\.]+)/i)

    console.debug('parseGrowwStats result:', result)
    return result
  }

  async function fetchGrowwStats(url) {
    console.debug('growwCrawler: fetchGrowwStats', url)
    const html = await fetchWithCorsFallback(url)
    return parseGrowwStats(html)
  }

  async function fetchMarketCap(url) {
    const stats = await fetchGrowwStats(url)
    return stats && stats.marketCap ? stats.marketCap : null
  }

  function showResult(elem, text) {
    if (!elem) {
      console.log('Market Cap:', text)
      return
    }
    const outId = elem.getAttribute('data-output-id')
    if (outId) {
      const out = document.getElementById(outId)
      if (out) {
        out.textContent = text
        return
      }
    }
    elem.setAttribute('data-last-marketcap', text)
    elem.textContent = 'Fetched: ' + text
  }

  function wireButtons() {
    console.debug('growwCrawler: wiring buttons')
    const byId = document.getElementById('fetch-live')
    const buttons = [].slice.call(document.querySelectorAll('.fetch-live'))
    if (byId) buttons.unshift(byId)

    buttons.forEach(btn => {
      btn.addEventListener('click', async function (e) {
        e.preventDefault()
        const originalText = btn.textContent
        btn.textContent = 'Fetching...'
        try {
          // Get symbol from data attribute or default to ITC
          const symbol = btn.getAttribute('data-symbol') || 'itc'
          const url = buildGrowwUrl(symbol)
          const stats = await fetchGrowwStats(url)
          if (stats && stats.marketCap) {
            showResult(btn, `Market Cap: ${stats.marketCap}`)
          } else {
            showResult(btn, 'Data not found')
          }
        } catch (err) {
          showResult(btn, 'Error: ' + (err && err.message ? err.message : String(err)))
        } finally {
          setTimeout(() => { if (btn) btn.textContent = originalText }, 2000)
        }
      })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButtons)
  } else {
    wireButtons()
  }

  window.growwCrawler = { 
    fetchMarketCap, 
    fetchGrowwStats, 
    buildGrowwUrl,
    symbolToGrowwSlug 
  }
})()
