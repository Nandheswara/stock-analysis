// Simple local CORS proxy - no dependencies
// Usage: `node js/cors-proxy.js`
// Requires Node 18+ (for global fetch). Listens on port 8080 by default.
//
// Routes:
//   GET  /ping              → health-check (used by Algo Scripts to detect proxy)
//   GET  /proxy?url=<url>  → generic CORS proxy
//   GET  /kite/*           → forward to https://api.kite.trade/* (with Auth headers)
//   POST /kite/*           → forward POST to Kite API
//   GET  /groww/*          → forward to https://api.groww.in/* (with Auth headers)
//   POST /save             → disabled (returns 501)

const http = require('http')
const { URL } = require('url')

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080

function sendJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(obj))
}

const server = http.createServer(async (req, res) => {
  // Basic CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      // Allow Authorization and Kite-specific headers for broker API proxying
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Kite-Version',
    })
    res.end()
    return
  }

    try {
      const urlObj = new URL(req.url, `http://localhost:${PORT}`)

      // ── /ping ── Health-check used by Algo Scripts to detect proxy availability
      if (urlObj.pathname === '/ping') {
        sendJSON(res, 200, { status: 'ok', proxy: 'equity-labs-cors-proxy', port: PORT })
        return
      }

      // ── /save ── Disabled: previously persisted scrape results to grow.json
      if (urlObj.pathname === '/save' && req.method === 'POST') {
        // consume body (to avoid hanging clients)
        let body = ''
        for await (const chunk of req) body += chunk
        sendJSON(res, 501, { error: 'Saving crawled data to JSON is disabled on this proxy' })
        return
      }

      // ── /kite/* ── Forward to Zerodha Kite Connect API with broker headers
      if (urlObj.pathname.startsWith('/kite/')) {
        const kitePath = urlObj.pathname.replace('/kite', '') + (urlObj.search || '')
        const kiteTarget = `https://api.kite.trade${kitePath}`
        await proxyBrokerRequest(req, res, kiteTarget, ['Authorization', 'X-Kite-Version'])
        return
      }

      // ── /groww/* ── Forward to Groww Trading API with broker headers
      if (urlObj.pathname.startsWith('/groww/')) {
        const growwPath = urlObj.pathname.replace('/groww', '') + (urlObj.search || '')
        const growwTarget = `https://api.groww.in${growwPath}`
        await proxyBrokerRequest(req, res, growwTarget, ['Authorization', 'Content-Type'])
        return
      }

      if (urlObj.pathname !== '/proxy') {
        sendJSON(res, 404, { error: 'Routes: /ping | /proxy?url=<target> | /kite/* | /groww/*' })
        return
      }

      const target = urlObj.searchParams.get('url')
      if (!target) {
        sendJSON(res, 400, { error: 'Missing url parameter' })
        return
      }

      // Fetch target server-side and stream response back
      const fetchRes = await fetch(target, { 
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })
      
      if (!fetchRes.ok) {
        console.error(`[CORS Proxy] Failed to fetch ${target}: ${fetchRes.status} ${fetchRes.statusText}`)
        sendJSON(res, fetchRes.status, { error: `Upstream returned ${fetchRes.status}: ${fetchRes.statusText}` })
        return
      }
      
      const contentType = fetchRes.headers.get('content-type') || 'text/html'

      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      })

      const body = await fetchRes.arrayBuffer()
      res.end(Buffer.from(body))

    } catch (err) {
      console.error('cors-proxy error', err && err.stack ? err.stack : err)
      sendJSON(res, 500, { error: String(err) })
    }
})

/**
 * Proxy a request to a broker API, forwarding specified headers from the client.
 * Supports GET and POST methods.
 */
async function proxyBrokerRequest(req, res, targetUrl, allowedHeaders = []) {
  // Collect forwarded headers
  const forwardHeaders = {}
  allowedHeaders.forEach(h => {
    const val = req.headers[h.toLowerCase()]
    if (val) forwardHeaders[h] = val
  })

  let bodyBuf = null
  if (req.method === 'POST') {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    bodyBuf = Buffer.concat(chunks)
    if (!forwardHeaders['Content-Type']) forwardHeaders['Content-Type'] = req.headers['content-type'] || 'application/json'
  }

  const brokerRes = await fetch(targetUrl, {
    method: req.method,
    headers: forwardHeaders,
    body: bodyBuf || undefined,
  })

  const contentType = brokerRes.headers.get('content-type') || 'application/json'
  res.writeHead(brokerRes.status, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Kite-Version',
  })
  const body = await brokerRes.arrayBuffer()
  res.end(Buffer.from(body))
}

// Note: Using console.log instead of imported logger to keep this file dependency-free

server.listen(PORT, () => {
  console.log(`Local CORS proxy running on http://localhost:${PORT}/proxy?url=<target>`)
})
