// Simple local CORS proxy - no dependencies
// Usage: `node js/cors-proxy.js`
// Requires Node 18+ (for global fetch). Listens on port 8080 by default.

const http = require('http')
const { URL } = require('url')
const fs = require('fs')
const path = require('path')

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
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

    try {
      const urlObj = new URL(req.url, `http://localhost:${PORT}`)

      // Save endpoint was previously used to persist scraped values to
      // `resource/grow.json`. This behavior is disabled now to avoid
      // writing crawl results to repository files. If callers still POST
      // here, respond with a 501 (Not Implemented) and a friendly message.
      if (urlObj.pathname === '/save' && req.method === 'POST') {
        // consume body (to avoid hanging clients)
        let body = ''
        for await (const chunk of req) body += chunk
        console.warn('Received POST /save but saving is disabled. Payload:', body || '<empty>')
        sendJSON(res, 501, { error: 'Saving crawled data to JSON is disabled on this proxy' })
        return
      }

      if (urlObj.pathname !== '/proxy') {
        sendJSON(res, 404, { error: 'Use /proxy?url=<target> or POST /save' })
        return
      }

      const target = urlObj.searchParams.get('url')
      if (!target) {
        sendJSON(res, 400, { error: 'Missing url parameter' })
        return
      }

      // Fetch target server-side and stream response back
      const fetchRes = await fetch(target, { method: 'GET' })
      const contentType = fetchRes.headers.get('content-type') || 'text/plain'

      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      })

      const body = await fetchRes.arrayBuffer()
      res.end(Buffer.from(body))
    } catch (err) {
      console.error('cors-proxy error', err && err.stack ? err.stack : err)
      sendJSON(res, 500, { error: String(err) })
    }
})

server.listen(PORT, () => {
  console.log(`Local CORS proxy running on http://localhost:${PORT}/proxy?url=<target>`)
})
