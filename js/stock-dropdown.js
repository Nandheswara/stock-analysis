/**
 * Stock dropdown loader module
 * Exports `loadStockSymbols()` which populates `#stockSymbol` <select>
 * and initializes Select2 with a substring matcher.
 */

export function loadStockSymbols() {
    const select = document.getElementById('stockSymbol');
    if (!select) return;
    // Destroy any existing Select2 instance
    if (window.jQuery && $(select).hasClass('select2-hidden-accessible')) {
        try { $(select).select2('destroy'); } catch(e) { /* ignore */ }
    }

    fetch('../resource/stocks.json')
        .then(resp => {
            if (!resp.ok) throw new Error('Network response was not ok');
            return resp.json();
        })
        .then(data => {
            if (!Array.isArray(data)) throw new Error('Invalid data');
            // clear existing options except the placeholder
            select.innerHTML = '<option value=""></option>';
            data.forEach(sym => {
                const opt = document.createElement('option');
                opt.value = sym;
                opt.textContent = sym;
                select.appendChild(opt);
            });

            // init Select2 with substring matcher
            if (window.jQuery && $(select).select2) {
                const substringMatcher = function(params, data) {
                    if (!params.term || params.term.trim() === '') return data;
                    const term = params.term.toLowerCase();
                    if (data.text && data.text.toLowerCase().indexOf(term) > -1) return data;
                    return null;
                };

                $(select).select2({
                    placeholder: 'Select symbol',
                    width: '100%',
                    matcher: substringMatcher,
                    allowClear: true
                });
            }
        })
        .catch(err => {
            console.warn('Failed to load symbols, using fallback', err);
            const fallback = ['A','B','C'];
            select.innerHTML = '<option value=""></option>';
            fallback.forEach(sym => {
                const opt = document.createElement('option');
                opt.value = sym;
                opt.textContent = sym;
                select.appendChild(opt);
            });

            if (window.jQuery && $(select).select2) {
                $(select).select2({ placeholder: 'Select symbol', width: '100%', allowClear: true });
            }
        });
}
