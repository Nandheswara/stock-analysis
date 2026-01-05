/**
 * Universal Metrics Scoring System
 */
const METRICS_CONFIG = {
    liquidity: {        
        column: 3,
        rules: [
            { min: 0, max: 0.999, label: 'Low', color: 'bad-value' },
            { min: 1, max: 1.999, label: 'Avg', color: 'neutral-value' },
            { min: 2, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },
    quickRatio: {       
        column: 4,
        rules: [
            { min: 0, max: 0.999, label: 'Low', color: 'bad-value' },
            { min: 1, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },
    DebtEquity: {       
        column: 5,
        rules: [
            { min: -Infinity, max: 0.999, label: 'Low', color: 'bad-value' },
            { min: 1, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },
    roe : {       
        column: 6,
        rules: [
            { min: -Infinity, max: 14.999, label: 'Low', color: 'bad-value' },
            { min: 15, max: 19.999, label: 'Avg', color: 'neutral-value' },
            { min: 20, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },
    roa : {       
        column: 7,
        rules: [
            { min: -Infinity, max: 4.999, label: 'Low', color: 'bad-value' },
            { min: 5, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },
    ebitdaLatest : {       
        column: 8,
        isComparison: true,
        compareWith: 9,
        badgeClass: 'metrics-badge'
    },
    ebitdaPrevious : {       
        column: 9,
        isComparison: true,
        compareWith: 8,
        badgeClass: 'metrics-badge'
    },
    stockPE : {
        column: 11,
        isComparison: true,
        compareWith: 12,
        badgeClass: 'metrics-badge'
    },
    industryPE : {
        column: 12,
        isComparison: true,
        compareWith: 11,
        badgeClass: 'metrics-badge'
    },
    divYield : {       
        column: 10,
        rules: [
            { min: -Infinity, max: 0.999, label: 'Low', color: 'bad-value' },
            { min: 1, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },
     pb : {       
        column: 13,
        rules: [
            { min: -Infinity, max: 0.999, label: 'Low', color: 'bad-value' },
            { min: 1, max: 3, label: 'Avg', color: 'neutral-value' },
            { min: 3.0001, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },  
    PSYoY	: {       
        column: 14,
        rules: [
            { min: -Infinity, max: 1.999, label: 'Low', color: 'bad-value' },
            { min: 2, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },
    BETA	: {       
        column: 15,
        rules: [
            { min: -Infinity, max: 0.999, label: 'Low', color: 'bad-value' },
            { min: 1, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },
    Promoter : {       
        column: 16,
        rules: [
            { min: -Infinity, max: 39.999, label: 'Low', color: 'bad-value' },
            { min: 40, max: 70, label: 'Avg', color: 'neutral-value' },
            { min: 70.001, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    }
};

const COMPARISON_DATA_ATTRIBUTE_COLUMNS = new Set();
['ebitdaLatest', 'stockPE'].forEach(metricKey => {
    const column = METRICS_CONFIG[metricKey]?.column;
    if (typeof column === 'number') {
        COMPARISON_DATA_ATTRIBUTE_COLUMNS.add(column);
    }
});

let timeoutId = null;

function parseMetricNumber(rawValue) {
    if (typeof rawValue !== 'string') {
        rawValue = String(rawValue || '');
    }
    const normalized = rawValue.replace(/[,\s]+/g, '');
    return parseFloat(normalized);
}

function resetComparisonAttributes(cell, badgeClass) {
    if (!cell) return;
    cell.classList.remove('good-value', 'neutral-value', 'bad-value', 'text-muted');
    cell.removeAttribute(`data-${badgeClass}-score`);
    cell.removeAttribute(`data-${badgeClass}-value`);
}

function applyComparisonAttributes(cell, badgeClass, rule, value, options = {}) {
    if (!cell) return;
    const { includeDataAttributes = true } = options;
    cell.classList.remove('good-value', 'neutral-value', 'bad-value', 'text-muted');
    if (rule && rule.color) {
        cell.classList.add(rule.color);
    }
    if (includeDataAttributes && rule && rule.label) {
        cell.setAttribute(`data-${badgeClass}-score`, rule.label);
    } else if (!includeDataAttributes) {
        cell.removeAttribute(`data-${badgeClass}-score`);
    }
    if (includeDataAttributes && typeof value === 'number' && isFinite(value)) {
        cell.setAttribute(`data-${badgeClass}-value`, value);
    } else {
        cell.removeAttribute(`data-${badgeClass}-value`);
    }
}

/**
 * Apply metrics scoring to all configured columns
 */
function applyAllMetrics() {
    try {
        const table = document.getElementById('stocksTable');
        if (!table) {
            return;
        }
        
        Object.keys(METRICS_CONFIG).forEach(metricKey => {
            const config = METRICS_CONFIG[metricKey];
            applyMetricToColumn(config);
        });
        
        try {
            computePerformance();
        } catch (perfErr) {
            // Silent fail for performance computation
        }
    } catch (error) {
        // Silent fail
    }
}

/**
 * Compute total performance per row based on METRICS_CONFIG
 * Writes a read-only value in the performance cell (format: goodCount/totalMetrics)
 */
function computePerformance() {
    const table = document.getElementById('stocksTable');
    if (!table) return;

    const metricKeys = Object.keys(METRICS_CONFIG);

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.forEach(row => {
        try {
            let goodCount = 0;
            let availableCount = 0;
            metricKeys.forEach(key => {
                const cfg = METRICS_CONFIG[key];
                const cell = row.querySelector(`td:nth-child(${cfg.column})`);
                if (!cell) return;
                const scoreAttr = cell.getAttribute(`data-${cfg.badgeClass}-score`);
                if (scoreAttr != null) {
                    availableCount += 1;
                    if (String(scoreAttr).toLowerCase() === 'good') {
                        goodCount += 1;
                    }
                }
            });

            let perfCell = row.querySelector('td.performance-cell');
            if (!perfCell) {
                const actionCell = row.querySelector('td:last-child');
                perfCell = document.createElement('td');
                perfCell.className = 'text-center performance-cell';
                actionCell.parentNode.insertBefore(perfCell, actionCell);
            }

            if (availableCount > 0) {
                perfCell.textContent = `${goodCount}/${availableCount}`;
                perfCell.setAttribute('title', `Good metrics: ${goodCount} of ${availableCount}`);
            } else {
                perfCell.textContent = '-';
                perfCell.removeAttribute('title');
            }
        } catch (e) {
            // Silent fail for individual row
        }
    });
}

/**
 * Apply metric scoring to a specific column
 */
function applyMetricToColumn(config) {
    const cells = document.querySelectorAll(`#stocksTable td:nth-child(${config.column})`);
    
    cells.forEach((cell) => {
        // Handle EBITDA comparison metrics (Latest vs Previous)
        if (config.isComparison && config.compareWith) {
            const row = cell.parentElement;
            const compareCell = row.querySelector(`td:nth-child(${config.compareWith})`);

            if (!compareCell) return;

            const currentValue = parseMetricNumber(cell.textContent.trim());
            const compareValue = parseMetricNumber(compareCell.textContent.trim());

            if (!isFinite(currentValue) || !isFinite(compareValue)) {
                resetComparisonAttributes(cell, config.badgeClass);
                resetComparisonAttributes(compareCell, config.badgeClass);
                return;
            }

            let currentRule = { label: 'Avg', color: 'neutral-value' };
            let compareRule = { label: 'Avg', color: 'neutral-value' };

            if (currentValue > compareValue) {
                currentRule = { label: 'Good', color: 'good-value' };
                compareRule = { label: 'Low', color: 'bad-value' };
            } else if (currentValue < compareValue) {
                currentRule = { label: 'Low', color: 'bad-value' };
                compareRule = { label: 'Good', color: 'good-value' };
            }

            const includeDataAttrsForCell = COMPARISON_DATA_ATTRIBUTE_COLUMNS.has(config.column);
            const includeDataAttrsForCompare = COMPARISON_DATA_ATTRIBUTE_COLUMNS.has(config.compareWith);

            applyComparisonAttributes(cell, config.badgeClass, currentRule, currentValue, { includeDataAttributes: includeDataAttrsForCell });
            applyComparisonAttributes(compareCell, config.badgeClass, compareRule, compareValue, { includeDataAttributes: includeDataAttrsForCompare });
            return;
        }
        
        // Handle regular numeric metrics
        const cellText = cell.textContent.trim();
        const value = parseFloat(cellText);
        
        if (!isNaN(value) && isFinite(value)) {
            const rule = config.rules.find(r => value >= r.min && value < r.max);
            if (rule) {
                cell.classList.remove('good-value', 'neutral-value', 'bad-value', 'text-muted');
                cell.classList.add(rule.color);
                // remove any existing visible badge spans (we will not create new ones)
                const existingBadges = cell.querySelectorAll(`.${config.badgeClass}`);
                existingBadges.forEach(badge => badge.remove());
                // preserve state as data attributes for CSS or logic to consume
                cell.setAttribute(`data-${config.badgeClass}-score`, rule.label);
                cell.setAttribute(`data-${config.badgeClass}-value`, value);
            }
        }
    });
}

$(document).ready(function() {
    setTimeout(() => {
        applyAllMetrics();
    }, 1500);
    
    const observerTarget = document.getElementById('metricsBody');
    if (observerTarget) {
        const observer = new MutationObserver(function(mutations) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                applyAllMetrics();
            }, 1000);
        });
        
        observer.observe(observerTarget, {
            childList: true,
            subtree: true
        });
    }
});

window.applyAllMetrics = applyAllMetrics;
