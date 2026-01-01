;(function () {
  const GROWW_ITC = 'https://groww.in/stocks/itc-ltd'

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

  function parseMarketCap(htmlText) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlText, 'text/html')

    const headTds = Array.from(doc.querySelectorAll('td')).filter(td => {
      const txt = td.textContent && td.textContent.trim()
      return txt === 'Market Cap' || txt === 'Market Cap (Rs.)' || /Market Cap/i.test(txt)
    })

    if (!headTds.length) return null

    for (const head of headTds) {
      let valueTd = head.nextElementSibling
      if (!valueTd) {
        const parent = head.parentElement
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

    return null
  }

  async function fetchMarketCap(url = GROWW_ITC) {
    console.debug('growwCrawler: fetchMarketCap', url)
    try {
      const html = await fetchWithCorsFallback(url)
      const marketCap = parseMarketCap(html)
      return marketCap
    } catch (err) {
      throw err
    }
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
          const val = await fetchMarketCap()
          if (val) showResult(btn, val)
          else showResult(btn, 'Market Cap not found')
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

  window.growwCrawler = { fetchMarketCap }
})()
