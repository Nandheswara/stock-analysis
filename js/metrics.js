// Universal Metrics Scoring System - DEBUGGED VERSION
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
        column: 8,
        rules: [
            { min: -Infinity, max: 4.999, label: 'Low', color: 'bad-value' },
            { min: 5, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },
    divYield : {       
        column: 11,
        rules: [
            { min: -Infinity, max: 0.999, label: 'Low', color: 'bad-value' },
            { min: 1, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },
     pb : {       
        column: 14,
        rules: [
            { min: -Infinity, max: 0.999, label: 'Low', color: 'bad-value' },
            { min: 1, max: 3, label: 'Avg', color: 'neutral-value' },
            { min: 3.0001, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },  
    PSYoY	: {       
        column: 15,
        rules: [
            { min: -Infinity, max: 1.999, label: 'Low', color: 'bad-value' },
            { min: 2, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },
    BETA	: {       
        column: 16,
        rules: [
            { min: -Infinity, max: 0.999, label: 'Low', color: 'bad-value' },
            { min: 1, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    },
    Promoter : {       
        column: 17,
        rules: [
            { min: -Infinity, max: 39.999, label: 'Low', color: 'bad-value' },
            { min: 40, max: 70, label: 'Avg', color: 'neutral-value' },
            { min: 70.001, max: Infinity, label: 'Good', color: 'good-value' }
        ],
        badgeClass: 'metrics-badge'
    }
};

let metricsProcessed = false;
let timeoutId = null;

function applyAllMetrics() {
    console.log('🔄 applyAllMetrics called');
    
    if (metricsProcessed) {
        console.log('⏭️ Already processing, skipping');
        return;
    }
    metricsProcessed = true;
    
    try {
        // Check if table exists
        const table = document.getElementById('stocksTable');
        if (!table) {
            console.error('❌ stocksTable not found');
            return;
        }
        
        // Apply to ALL metrics
        Object.keys(METRICS_CONFIG).forEach(metricKey => {
            const config = METRICS_CONFIG[metricKey];
            console.log(`📊 Processing ${metricKey} (column ${config.column})`);
            applyMetricToColumn(config);
        });
        
        console.log('✅ All metrics applied successfully');
        try {
            // After applying individual metric badges, compute overall performance
            computePerformance();
            console.log('🔢 Performance computed');
        } catch (perfErr) {
            console.error('❌ Error computing performance:', perfErr);
        }
    } catch (error) {
        console.error('❌ Error in applyAllMetrics:', error);
    } finally {
        // Reset after delay
        setTimeout(() => { 
            metricsProcessed = false; 
            console.log('🔓 Processing flag reset');
        }, 1000);
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
    const totalMetrics = metricKeys.length;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.forEach(row => {
        try {
            let goodCount = 0;
            metricKeys.forEach(key => {
                const cfg = METRICS_CONFIG[key];
                // find the cell for this metric using the configured column (1-based)
                const cell = row.querySelector(`td:nth-child(${cfg.column})`);
                if (!cell) return;
                // read the data attribute written by applyMetricToColumn
                const scoreAttr = cell.getAttribute(`data-${cfg.badgeClass}-score`);
                if (scoreAttr && String(scoreAttr).toLowerCase() === 'good') {
                    goodCount += 1;
                }
            });

            // Find performance cell in this row (we added class .performance-cell)
            let perfCell = row.querySelector('td.performance-cell');
            if (!perfCell) {
                // If not present, insert before the last action cell
                const actionCell = row.querySelector('td:last-child');
                perfCell = document.createElement('td');
                perfCell.className = 'text-center performance-cell';
                actionCell.parentNode.insertBefore(perfCell, actionCell);
            }

            perfCell.textContent = `${goodCount}/${totalMetrics}`;
            perfCell.setAttribute('title', `Good metrics: ${goodCount} of ${totalMetrics}`);
        } catch (e) {
            console.error('Error computing performance for row', e);
        }
    });
}

function applyMetricToColumn(config) {
    const cells = document.querySelectorAll(`#stocksTable td:nth-child(${config.column})`);
    console.log(`📈 Found ${cells.length} cells for column ${config.column}`);
    
    cells.forEach((cell, index) => {
        const cellText = cell.textContent.trim();
        const value = parseFloat(cellText.replace(/[^\d.-]/g, ''));
        
        console.log(`Cell ${index}: "${cellText}" → ${value}`);
        
        if (!isNaN(value) && value !== 'NaN' && value >= 0) {
            const rule = config.rules.find(r => value >= r.min && value < r.max);
            
            if (rule) {
                console.log(`✅ Applying ${rule.label} (${rule.color}) to ${value}`);
                
                // CLEANUP classes
                cell.classList.remove('good-value', 'neutral-value', 'bad-value', 'text-muted');
                cell.classList.add(rule.color);
                
                // Remove existing badges
                const existingBadges = cell.querySelectorAll(`.${config.badgeClass}`);
                existingBadges.forEach(badge => {
                    badge.remove();
                    console.log('🗑️ Removed old badge');
                });
                
                // Data attributes
                cell.setAttribute(`data-${config.badgeClass}-score`, rule.label);
                cell.setAttribute(`data-${config.badgeClass}-value`, value);
                
                // NEW badge
                const badge = document.createElement('span');
                badge.className = `${config.badgeClass} badge ms-1 ${rule.color}`;
                badge.textContent = rule.label;
                badge.style.fontSize = '0.7rem';
                cell.appendChild(badge);
                
                console.log(`✅ Badge added: ${rule.label}`);
            }
        }
    });
}

// Initialize
$(document).ready(function() {
    console.log('🚀 metrics.js loaded');
    
    // Initial run after table renders
    setTimeout(() => {
        console.log('⏰ Initial metrics run');
        applyAllMetrics();
    }, 1500);
    
    // MutationObserver
    const observerTarget = document.getElementById('metricsBody');
    if (observerTarget) {
        const observer = new MutationObserver(function(mutations) {
            console.log('🔍 Table changed, scheduling metrics');
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                applyAllMetrics();
            }, 500);
        });
        
        observer.observe(observerTarget, {
            childList: true,
            subtree: true
        });
        console.log('👁️ Observer active');
    } else {
        console.error('❌ metricsBody not found for observer');
    }
});

window.applyAllMetrics = applyAllMetrics;
