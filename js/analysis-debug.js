;(function () {
  console.log('analysis-debug: external script running')

  document.addEventListener('click', function (e) {
    const btn = e.target.closest && e.target.closest('button')
    if (!btn) return
    const title = btn.getAttribute && btn.getAttribute('title')
    if (title && title.toLowerCase().includes('fetch')) {
      console.log('analysis-debug: Fetch button clicked', { button: btn, title })

      // If the button has an inline onclick calling fetchStockData, try to extract args and invoke it.
      try {
        const onclick = btn.getAttribute && btn.getAttribute('onclick')
        if (onclick && typeof window.fetchStockData === 'function') {
          console.log('analysis-debug: found inline onclick:', onclick)
          // Parse arguments between parentheses robustly (handles single/double quotes)
          const start = onclick.indexOf('(')
          const end = onclick.lastIndexOf(')')
          if (start !== -1 && end !== -1 && end > start) {
            const argsStr = onclick.slice(start + 1, end)
            const argRe = /['"]([^'"]+)['"]/g
            const args = []
            let am
            while ((am = argRe.exec(argsStr)) !== null) {
              args.push(am[1])
            }
            console.log('analysis-debug: parsed args', args)
            if (args.length >= 2) {
              const sym = args[0]
              const id = args[1]
              console.log('analysis-debug: calling fetchStockData with', sym, id)
              try {
                window.fetchStockData(sym, id)
              } catch (err) {
                console.error('analysis-debug: error calling fetchStockData', err)
              }
            } else {
              console.log('analysis-debug: could not parse two args from onclick')
            }
          } else {
            console.log('analysis-debug: no parentheses found in onclick')
          }
        }
      } catch (err) {
        console.error('analysis-debug: error parsing onclick', err)
      }
    }
  })

  window.addEventListener('load', function () {
    console.log('analysis-debug: window.load, fetchStockData type=', typeof window.fetchStockData)
    console.log('analysis-debug: window.growwCrawler type=', typeof window.growwCrawler)
  })
})()
