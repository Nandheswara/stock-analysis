// fetch.js
// Contains Groww crawler utilities and a factory to create a fetchStockData function
// which delegates UI work back to the caller via callbacks.

const GROWW_ITC = 'https://groww.in/stocks/itc-ltd'

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

function parseGrowwStats(htmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlText, 'text/html')

  const rows = Array.from(doc.querySelectorAll('td'))
  const result = {}

  // Walk through td elements and look for known labels, then take the next
  // sibling td or the second td in the same parent row as the value.
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

  result.marketCap = findValueByLabel(/^Market Cap(.*)?$/i) || null
  // ROE label may be 'ROE' or 'ROE (%)' etc.
  result.roe = findValueByLabel(/^ROE(.*)?$/i) || null
  // Keep room for other metrics if needed
  result.pe = findValueByLabel(/^P\/E|P\/E Ratio|P\/E Ratio\(TTM\)/i) || null
  return result
}

async function fetchGrowwStats(url = GROWW_ITC) {
  console.debug('fetch.js: fetchGrowwStats', url)
  const html = await fetchWithCorsFallback(url)
  return parseGrowwStats(html)
}

// Backwards-compatible single-value fetch
async function fetchMarketCap(url = GROWW_ITC) {
  const stats = await fetchGrowwStats(url)
  return stats && stats.marketCap ? stats.marketCap : null
}

// Expose a lightweight crawler object for compatibility
export const growwCrawler = { fetchMarketCap }

/**
 * Factory: create a fetchStockData function bound to UI callbacks.
 * Callers should provide: getStocksData(), renderTable(), showAlert(type,msg)
 */
export function makeFetchStockData({ getStocksData, renderTable, showAlert }) {
  return async function fetchStockData(symbol, stockId) {
    console.debug('fetchStockData called', { symbol, stockId })
    try {
      // Only attempt crawling for ITC (legacy behaviour)
      const isItc = String(symbol).toLowerCase().includes('itc') || String(symbol).toLowerCase().includes('itc-ltd')
      if (!isItc) {
        if (showAlert) showAlert('warning', 'Live fetch currently supports ITC only. Use Edit to enter data manually.')
        return
      }

      if (showAlert) showAlert('info', `Fetching Market Cap for ${symbol}...`)

      const url = 'https://groww.in/stocks/itc-ltd'
      const val = await fetchMarketCap(url)

      if (val) {
        if (showAlert) showAlert('success', `Market Cap for ${symbol}: ${val}`)

        // Try to save scraped value using growwStorage helper (if available)
        (async function() {
          try {
            if (window.growwStorage && typeof window.growwStorage.saveToLocal === 'function') {
              const j = await window.growwStorage.saveToLocal('GROW', symbol, val)
              if (j && j.ok) {
                if (showAlert) showAlert('success', `Saved Market Cap to local store (${symbol})`)
              } else {
                console.warn('Save returned', j)
                if (showAlert) showAlert('warning', 'Could not save scraped value locally')
              }
            } else {
              if (showAlert) showAlert('warning', 'Save helper not available (is groww-storage.js included?)')
            }
          } catch (err) {
            console.warn('Error saving scraped value', err)
            if (showAlert) showAlert('warning', 'Local save failed (is local proxy running?)')
          }
        })()

        // Update in-memory data if available
        try {
          const stocks = getStocksData ? getStocksData() : null
          if (stocks && Array.isArray(stocks)) {
            const stock = stocks.find(s => s.stock_id === stockId)
            if (stock) {
              stock.market_cap = val
              if (renderTable) renderTable()
            }
          }
        } catch (err) {
          console.warn('Could not update in-memory stock object', err)
        }
      } else {
        if (showAlert) showAlert('warning', `Market Cap not found for ${symbol}`)
      }
    } catch (err) {
      if (showAlert) showAlert('danger', `Error fetching data: ${err && err.message ? err.message : String(err)}`)
    }
  }
}
