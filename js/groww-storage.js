;(function () {
  /**
   * Save scraped value to local proxy /save endpoint
   * @param {string} source
   * @param {string} symbol
   * @param {string} value
   * @param {string} [endpoint]
   */
  async function saveToLocal(source, symbol, value, endpoint) {
    // Persistence of crawled data to repository JSON has been disabled.
    // This function previously POSTed to a local proxy `/save` which wrote
    // to `resource/grow.json`. To avoid committing scraped data, that
    // behavior is intentionally removed. If you need local persistence,
    // implement a separate trusted service outside this repo.
    console.warn('growwStorage.saveToLocal called but saving is disabled.', { source, symbol, value, endpoint })
    throw new Error('Saving crawled data to JSON is disabled')
  }

  window.growwStorage = { saveToLocal }
})()
