// Store stocks data in localStorage
let stocksData = [];

$(document).ready(function() {
    // Load saved stocks from localStorage
    loadSavedStocks();
    
    // Form submit handler
    $('#addStockForm').on('submit', function(e) {
        e.preventDefault();
        addStock();
    });
    
    // Clear all handler
    $('#clearAllBtn').on('click', function() {
        if (confirm('Remove all stocks from the analysis?')) {
            stocksData = [];
            localStorage.removeItem('analysisStocks');
            renderTable();
        }
    });
    
    // Save data button handler
    $('#saveDataBtn').on('click', function() {
        submitManualData();
    });
});

// Load stocks from localStorage
function loadSavedStocks() {
    const saved = localStorage.getItem('analysisStocks');
    if (saved) {
        try {
            stocksData = JSON.parse(saved);
            renderTable();
        } catch (e) {
            console.error('Error loading saved stocks:', e);
            stocksData = [];
        }
    }
}

// Save stocks to localStorage
function saveStocks() {
    localStorage.setItem('analysisStocks', JSON.stringify(stocksData));
}

// Add a new stock
function addStock() {
    const input = $('#stockSymbol');
    const nameInput = $('#stockName');
    const symbol = input.val().trim().toUpperCase();
    const name = nameInput.val().trim();
    const addBtn = $('#addBtn');
    
    if (!symbol && !name) {
        showAlert('danger', 'Please enter either stock symbol or company name');
        return;
    }
    
    // Check if already added
    if (stocksData.some(s => s.symbol === symbol)) {
        showAlert('warning', 'This stock is already in the analysis');
        return;
    }
    
    // Show loading state
    addBtn.addClass('loading');
    addBtn.prop('disabled', true);
    
    // Add stock with placeholder data
    const stockData = {
        symbol: symbol || 'N/A',
        name: name || 'N/A',
        data_available: true,
        stock_id: Date.now(), // Use timestamp as unique ID
        // All metrics as "Enter Data"
        current_price: 'Enter Data',
        market_cap: 'Enter Data',
        sector: 'Enter Data',
        industry: 'Enter Data',
        liquidity: 'Enter Data',
        quick_ratio: 'Enter Data',
        debt_to_equity: 'Enter Data',
        roe: 'Enter Data',
        investor_growth_ratio: 'Enter Data',
        roa: 'Enter Data',
        ebitda_current: 'Enter Data',
        ebitda_previous: 'Enter Data',
        dividend_yield: 'Enter Data',
        pe_ratio: 'Enter Data',
        forward_pe: 'Enter Data',
        industry_pe: 'Enter Data',
        price_to_book: 'Enter Data',
        price_to_sales: 'Enter Data',
        ps_trend: 'Enter Data',
        beta: 'Enter Data',
        promoter_holdings: 'Enter Data'
    };
    
    stocksData.push(stockData);
    saveStocks();
    renderTable();
    input.val('');
    nameInput.val('');
    
    showAlert('success', `Stock ${symbol || name} added! Click "Edit" button to enter details.`);
    
    // Remove loading state
    addBtn.removeClass('loading');
    addBtn.prop('disabled', false);
}

// Remove a stock
function removeStock(symbol) {
    if (confirm(`Remove ${symbol} from the analysis?`)) {
        stocksData = stocksData.filter(s => s.symbol !== symbol);
        saveStocks();
        renderTable();
        showAlert('info', `Stock ${symbol} removed successfully`);
    }
}

// Render the comparison table
function renderTable() {
    const tbody = $('#metricsBody');
    const emptyState = $('#emptyState');
    const clearAllBtn = $('#clearAllBtn');
    const stockCount = $('#stockCount');
    
    // Update stock count
    stockCount.text(stocksData.length);
    
    // Show/hide empty state
    if (stocksData.length === 0) {
        emptyState.show();
        $('.table-container').hide();
        clearAllBtn.hide();
        return;
    }
    
    emptyState.hide();
    $('.table-container').show();
    clearAllBtn.show();
    
    // Build table rows - Each stock is a ROW
    let bodyHTML = '';
    stocksData.forEach((stock, index) => {
        bodyHTML += `
            <tr>
                <td class="text-center"><strong>${index + 1}</strong></td>
                <td><strong>${stock.name}</strong><br><small class="text-muted">${stock.symbol}</small></td>
                <td class="text-center">${formatValue('liquidity', stock.liquidity)}</td>
                <td class="text-center">${formatValue('quick_ratio', stock.quick_ratio)}</td>
                <td class="text-center">${formatValue('debt_to_equity', stock.debt_to_equity)}</td>
                <td class="text-center">${formatValue('roe', stock.roe)}</td>
                <td class="text-center">${formatValue('investor_growth_ratio', stock.investor_growth_ratio)}</td>
                <td class="text-center">${formatValue('roa', stock.roa)}</td>
                <td class="text-center">${formatValue('ebitda_current', stock.ebitda_current)}</td>
                <td class="text-center">${formatValue('ebitda_previous', stock.ebitda_previous)}</td>
                <td class="text-center">${formatValue('dividend_yield', stock.dividend_yield)}</td>
                <td class="text-center">${formatValue('pe_ratio', stock.pe_ratio)}</td>
                <td class="text-center">${formatValue('industry_pe', stock.industry_pe)}</td>
                <td class="text-center">${formatValue('price_to_book', stock.price_to_book)}</td>
                <td class="text-center">${formatValue('price_to_sales', stock.price_to_sales)}</td>
                <td class="text-center">${formatValue('beta', stock.beta)}</td>
                <td class="text-center">${formatValue('promoter_holdings', stock.promoter_holdings)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-primary me-1" onclick="openManualDataModal('${stock.symbol}', '${escapeSingleQuotes(stock.name)}', ${stock.stock_id})" title="Edit">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="removeStock('${stock.symbol}')" title="Delete">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.html(bodyHTML);
}

// Escape single quotes for HTML attributes
function escapeSingleQuotes(str) {
    return str.replace(/'/g, "\\'");
}

// Format value for display
function formatValue(key, value) {
    if (value === null || value === undefined || value === 'N/A') {
        return '<span class="text-muted">N/A</span>';
    }
    return value;
}


// Show alert message
function showAlert(type, message) {
    const container = $('#alertContainer');
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    container.html(alertHTML);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        container.find('.alert').fadeOut(function() {
            $(this).remove();
        });
    }, 5000);
}

// Open manual data entry modal
function openManualDataModal(symbol, name, stockId) {
    $('#modalStockSymbol').val(symbol);
    $('#modalName').val(name);
    
    // Find existing stock data
    const stock = stocksData.find(s => s.symbol === symbol);
    
    // Pre-fill metric fields if editing existing stock
    if (stock) {
        $('#modalLiquidity').val((stock.liquidity && stock.liquidity !== 'Enter Data') ? stock.liquidity : '');
        $('#modalQuickRatio').val((stock.quick_ratio && stock.quick_ratio !== 'Enter Data') ? stock.quick_ratio : '');
        $('#modalDebtEquity').val((stock.debt_to_equity && stock.debt_to_equity !== 'Enter Data') ? stock.debt_to_equity : '');
        $('#modalROE').val((stock.roe && stock.roe !== 'Enter Data') ? stock.roe : '');
        $('#modalInvestorGrowth').val((stock.investor_growth_ratio && stock.investor_growth_ratio !== 'Enter Data') ? stock.investor_growth_ratio : '');
        $('#modalROA').val((stock.roa && stock.roa !== 'Enter Data') ? stock.roa : '');
        $('#modalEBITDACurrent').val((stock.ebitda_current && stock.ebitda_current !== 'Enter Data') ? stock.ebitda_current : '');
        $('#modalEBITDAPrevious').val((stock.ebitda_previous && stock.ebitda_previous !== 'Enter Data') ? stock.ebitda_previous : '');
        $('#modalDividendYield').val((stock.dividend_yield && stock.dividend_yield !== 'Enter Data') ? stock.dividend_yield : '');
        $('#modalPE').val((stock.pe_ratio && stock.pe_ratio !== 'Enter Data') ? stock.pe_ratio : '');
        $('#modalIndustryPE').val((stock.industry_pe && stock.industry_pe !== 'Enter Data') ? stock.industry_pe : '');
        $('#modalPriceToBook').val((stock.price_to_book && stock.price_to_book !== 'Enter Data') ? stock.price_to_book : '');
        $('#modalPriceToSales').val((stock.price_to_sales && stock.price_to_sales !== 'Enter Data') ? stock.price_to_sales : '');
        $('#modalBeta').val((stock.beta && stock.beta !== 'Enter Data') ? stock.beta : '');
        $('#modalPromoterHoldings').val((stock.promoter_holdings && stock.promoter_holdings !== 'Enter Data') ? stock.promoter_holdings : '');
    } else {
        // Clear all metric fields for new stock
        $('#modalLiquidity, #modalQuickRatio, #modalDebtEquity, #modalROE, #modalInvestorGrowth, #modalROA, #modalEBITDACurrent, #modalEBITDAPrevious, #modalDividendYield, #modalPE, #modalIndustryPE, #modalPriceToBook, #modalPriceToSales, #modalBeta, #modalPromoterHoldings').val('');
    }
    
    // Set today's date as default
    $('#modalDate').val(new Date().toISOString().split('T')[0]);
    $('#modalOpen, #modalHigh, #modalLow, #modalClose, #modalVolume').val('');
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('manualDataModal'));
    modal.show();
}

// Submit manual data
function submitManualData() {
    const symbol = $('#modalStockSymbol').val();
    const name = $('#modalName').val();
    
    // Gather all 13 metrics
    const metrics = {
        liquidity: $('#modalLiquidity').val() || 'Enter Data',
        quick_ratio: $('#modalQuickRatio').val() || 'Enter Data',
        debt_to_equity: $('#modalDebtEquity').val() || 'Enter Data',
        roe: $('#modalROE').val() || 'Enter Data',
        investor_growth_ratio: $('#modalInvestorGrowth').val() || 'Enter Data',
        roa: $('#modalROA').val() || 'Enter Data',
        ebitda_current: $('#modalEBITDACurrent').val() || 'Enter Data',
        ebitda_previous: $('#modalEBITDAPrevious').val() || 'Enter Data',
        dividend_yield: $('#modalDividendYield').val() || 'Enter Data',
        pe_ratio: $('#modalPE').val() || 'Enter Data',
        industry_pe: $('#modalIndustryPE').val() || 'Enter Data',
        price_to_book: $('#modalPriceToBook').val() || 'Enter Data',
        price_to_sales: $('#modalPriceToSales').val() || 'Enter Data',
        beta: $('#modalBeta').val() || 'Enter Data',
        promoter_holdings: $('#modalPromoterHoldings').val() || 'Enter Data'
    };
    
    // Update the stock data in memory with all 13 metrics
    const stockIndex = stocksData.findIndex(s => s.symbol === symbol);
    if (stockIndex !== -1) {
        stocksData[stockIndex] = {
            ...stocksData[stockIndex],
            name: name,
            ...metrics
        };
        saveStocks();
        renderTable();
        
        showAlert('success', 'Data saved successfully! Table updated.');
        bootstrap.Modal.getInstance(document.getElementById('manualDataModal')).hide();
    } else {
        showAlert('danger', 'Stock not found in the analysis');
    }
}
