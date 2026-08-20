/**
 * Forecast Module - Future Financial Forecast Logic
 * 
 * Handles:
 * - Projections model calculation (Inflation, Investment Returns, Salary Growth, EPFO compounding)
 * - Seasonality-indexed expense analysis and EMI amortization tracking
 * - Forecast modal configuration and user inputs
 * - Forecast mode UI state application & read-only lock toggle
 * - Multi-format report export (Excel XLSX, PDF, CSV, JSON)
 * 
 * @module forecast
 */

import { 
    computeFinancialSummary, 
    calculateAmortizationSchedule, 
    getMonthsDifference 
} from './firebase-finance-service.js';

import { 
    log, 
    formatCurrency, 
    formatCurrencyWithSign 
} from './utils.js';

// ========================================
// State
// ========================================

export let forecastConfig = {
    isActive: false,
    targetMonth: '',
    inflation: 6.0,
    returns: 12.0,
    incomeGrowth: 5.0,
    expensesOverride: null,
    epfoContribution: 0
};

export let originalActualMonth = null;
export let originalActualData = null;

let financeTrackerBridge = {
    getCurrentMonth: () => '',
    setCurrentMonth: () => {},
    getFinanceData: () => ({}),
    setFinanceData: () => {},
    getMonthDisplay: (m) => m,
    getNextMonth: (m) => m,
    getPreviousMonth: (m) => m,
    updateMonthDisplay: () => {},
    renderAll: () => {},
    openModal: () => {},
    closeModal: () => {},
    showToast: (msg, type) => (window.showToast ? window.showToast(msg, type) : console.log(msg)),
    downloadFile: (c, f, m) => (window.downloadFile ? window.downloadFile(c, f, m) : null),
    buildCsvSection: (t, r) => (window.buildCsvSection ? window.buildCsvSection(t, r) : ''),
    ensureJsPDF: async () => (window.ensureJsPDF ? window.ensureJsPDF() : null),
    ensureSheetJS: async () => (window.ensureSheetJS ? window.ensureSheetJS() : null)
};


/**
 * Register bridge callbacks from main finance-tracker module
 */
export function registerForecastBridge(bridge) {
    financeTrackerBridge = { ...financeTrackerBridge, ...bridge };
}

// ========================================
// Forecast Modal Management
// ========================================

export function initForecastModalInputs() {
    const currentMonth = financeTrackerBridge.getCurrentMonth();
    const yearSelect = document.getElementById('forecastYearSelect');
    if (yearSelect && yearSelect.options.length === 0) {
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y <= currentYear + 30; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSelect.appendChild(opt);
        }
    }
    
    // Default selections: set target month to next month, target year to next year
    const [curYear] = currentMonth.split('-');
    const nextMonthKey = financeTrackerBridge.getNextMonth(currentMonth);
    const [, nextMon] = nextMonthKey.split('-');
    
    const monthSelect = document.getElementById('forecastMonthSelect');
    if (monthSelect) monthSelect.value = nextMon;
    if (yearSelect) yearSelect.value = Number(curYear) + 1;
    
    // Reset sliders to defaults
    const infInput = document.getElementById('forecastInflationInput');
    const infVal = document.getElementById('forecastInflationVal');
    if (infInput) infInput.value = "6.0";
    if (infVal) infVal.textContent = "6.0%";

    const retInput = document.getElementById('forecastReturnInput');
    const retVal = document.getElementById('forecastReturnVal');
    if (retInput) retInput.value = "6.0";
    if (retVal) retVal.textContent = "6.0%";

    const incInput = document.getElementById('forecastIncomeGrowthInput');
    const incVal = document.getElementById('forecastIncomeGrowthVal');
    if (incInput) incInput.value = "5.0";
    if (incVal) incVal.textContent = "5.0%";
    
    const epfoInput = document.getElementById('forecastEpfoContribInput');
    if (epfoInput) epfoInput.value = '';

    const expToggle = document.getElementById('forecastExpensesToggle');
    if (expToggle) expToggle.checked = false;
    const expContainer = document.getElementById('forecastExpensesInputContainer');
    if (expContainer) expContainer.style.display = 'none';
    const expInput = document.getElementById('forecastExpensesInput');
    if (expInput) expInput.value = '';
}

export function openForecastModal() {
    financeTrackerBridge.openModal('forecastModal');
    initForecastModalInputs();
}

export function closeForecastModal() {
    financeTrackerBridge.closeModal('forecastModal');
}

export function toggleForecastExpensesInput() {
    const toggle = document.getElementById('forecastExpensesToggle');
    const container = document.getElementById('forecastExpensesInputContainer');
    const input = document.getElementById('forecastExpensesInput');
    if (!toggle || !container || !input) return;

    if (toggle.checked) {
        container.style.display = 'block';
        if (!input.value) {
            const summary = computeFinancialSummary(
                financeTrackerBridge.getFinanceData(), 
                financeTrackerBridge.getCurrentMonth()
            );
            input.value = Math.round(summary.expenditure) || '';
        }
    } else {
        container.style.display = 'none';
        input.value = '';
    }
}

export function applyForecastMode() {
    const monthSelect = document.getElementById('forecastMonthSelect');
    const yearSelect = document.getElementById('forecastYearSelect');
    if (!monthSelect || !yearSelect) return;

    const month = monthSelect.value;
    const year = yearSelect.value;
    const targetMonthKey = `${year}-${month}`;
    const currentMonth = financeTrackerBridge.getCurrentMonth();
    
    if (targetMonthKey <= currentMonth && !forecastConfig.isActive) {
        alert('Please select a future month and year for the forecast.');
        return;
    }
    
    const refMonth = originalActualMonth !== null ? originalActualMonth : currentMonth;
    if (targetMonthKey <= refMonth) {
        alert('Please select a future month and year for the forecast.');
        return;
    }
    
    const inflation = parseFloat(document.getElementById('forecastInflationInput')?.value) || 0;
    const returns = parseFloat(document.getElementById('forecastReturnInput')?.value) || 0;
    const incomeGrowth = parseFloat(document.getElementById('forecastIncomeGrowthInput')?.value) || 0;
    
    const expToggle = document.getElementById('forecastExpensesToggle');
    let expensesOverride = null;
    if (expToggle && expToggle.checked) {
        const val = parseFloat(document.getElementById('forecastExpensesInput')?.value);
        if (Number.isNaN(val) || val < 0) {
            alert('Please enter a valid monthly expenses amount.');
            return;
        }
        expensesOverride = val;
    }
    
    if (originalActualMonth === null) {
        originalActualMonth = currentMonth;
        originalActualData = financeTrackerBridge.getFinanceData();
    }
    
    const epfoContribution = parseFloat(document.getElementById('forecastEpfoContribInput')?.value) || 0;

    forecastConfig = {
        isActive: true,
        targetMonth: targetMonthKey,
        inflation,
        returns,
        incomeGrowth,
        expensesOverride,
        epfoContribution
    };
    
    try {
        const projData = generateForecastData(originalActualData, originalActualMonth, targetMonthKey, forecastConfig);
        financeTrackerBridge.setFinanceData(projData);
        financeTrackerBridge.setCurrentMonth(targetMonthKey);
    } catch (e) {
        log('error', 'Error generating forecast: ' + e.message);
        alert('An error occurred while generating the forecast: ' + e.message);
        exitForecastMode();
        return;
    }
    
    closeForecastModal();
    
    const banner = document.getElementById('forecastActiveBanner');
    const bannerText = document.getElementById('forecastBannerText');
    if (banner && bannerText) {
        const monthDisplay = financeTrackerBridge.getMonthDisplay(targetMonthKey);
        bannerText.textContent = `Forecast Mode Active: Projections for ${monthDisplay} (Inflation: ${inflation.toFixed(1)}%, Return: ${returns.toFixed(1)}%, Income Growth: ${incomeGrowth.toFixed(1)}%)`;
        banner.style.display = 'flex';
    }
    
    financeTrackerBridge.updateMonthDisplay();
    financeTrackerBridge.renderAll();
}

export function exitForecastMode() {
    forecastConfig.isActive = false;
    
    if (originalActualMonth !== null) {
        financeTrackerBridge.setCurrentMonth(originalActualMonth);
        financeTrackerBridge.setFinanceData(originalActualData);
        originalActualMonth = null;
        originalActualData = null;
    }
    
    const banner = document.getElementById('forecastActiveBanner');
    if (banner) banner.style.display = 'none';
    const cashBanner = document.getElementById('cashShortageBanner');
    if (cashBanner) cashBanner.style.display = 'none';
    
    financeTrackerBridge.updateMonthDisplay();
    financeTrackerBridge.renderAll();
}

// ========================================
// Dynamic Helper & Forecast Generator
// ========================================

export function detectMonthlyContribution(catId, itemName, refMonth, data = financeTrackerBridge.getFinanceData()) {
    let maxChange = 0;
    let currMonth = refMonth;
    
    for (let i = 0; i < 3; i++) {
        const prevMonthKey = financeTrackerBridge.getPreviousMonth(currMonth);
        
        let currAmt = 0;
        const catObj = data?.categories?.[catId];
        if (catObj && catObj.items) {
            Object.values(catObj.items).forEach(item => {
                if (item && item.month === currMonth && item.name === itemName) {
                    currAmt = Number(item.amount) || 0;
                }
            });
        }
        
        let prevAmt = 0;
        if (catObj && catObj.items) {
            Object.values(catObj.items).forEach(item => {
                if (item && item.month === prevMonthKey && item.name === itemName) {
                    prevAmt = Number(item.amount) || 0;
                }
            });
        }
        
        let change = 0;
        if (prevAmt > 0) {
            change = Math.max(0, currAmt - prevAmt);
        } else if (currAmt > 0) {
            const nameLower = (itemName + ' ' + catId + ' ' + (catObj?.name || '')).toLowerCase();
            const isExplicitLumpSum = nameLower.includes('land') || nameLower.includes('plot') || nameLower.includes('flat') || nameLower.includes('property');
            
            if (!isExplicitLumpSum && (currAmt <= 50000 || nameLower.includes('sip') || nameLower.includes('chit') || nameLower.includes('rd') || nameLower.includes('recurring') || nameLower.includes('monthly'))) {
                change = currAmt;
            }
        }
        
        if (change > maxChange) {
            maxChange = change;
        }
        currMonth = prevMonthKey;
    }
    return maxChange;
}

export function generateForecastData(baseData, startMonth, targetMonth, config) {
    const proj = JSON.parse(JSON.stringify(baseData));

    function calculateHistoricalAvgExpenses(data, refMonth) {
        let total = 0;
        let count = 0;
        const monthByCal = {};
        
        let curr = refMonth;
        for (let i = 0; i < 12; i++) {
            if (data.income?.[curr] || data.monthlySnapshots?.[curr]) {
                const sum = computeFinancialSummary(data, curr);
                const exp = (sum && sum.expenditure > 0) ? sum.expenditure : (Number(data.monthlySnapshots?.[curr]?.totalExpenses) || 0);
                if (exp > 0) {
                    total += exp;
                    count++;
                    
                    const calMonthIndex = parseInt(curr.split('-')[1], 10) - 1;
                    if (!monthByCal[calMonthIndex]) {
                        monthByCal[calMonthIndex] = { total: 0, count: 0 };
                    }
                    monthByCal[calMonthIndex].total += exp;
                    monthByCal[calMonthIndex].count += 1;
                }
            }
            curr = financeTrackerBridge.getPreviousMonth(curr);
        }
        
        const overallAverage = count > 0 ? (total / count) : 0;
        const seasonalMultipliers = {};
        
        for (let mIdx = 0; mIdx < 12; mIdx++) {
            if (monthByCal[mIdx] && monthByCal[mIdx].count > 0 && overallAverage > 0) {
                const mAvg = monthByCal[mIdx].total / monthByCal[mIdx].count;
                seasonalMultipliers[mIdx] = mAvg / overallAverage;
            } else {
                seasonalMultipliers[mIdx] = 1.0;
            }
        }
        
        return { overallAverage, seasonalMultipliers };
    }
    
    const monthsList = [startMonth];
    let current = startMonth;
    while (current !== targetMonth && monthsList.length < 600) {
        current = financeTrackerBridge.getNextMonth(current);
        monthsList.push(current);
    }
    
    let referenceMonth = startMonth;
    let tempMonth = startMonth;
    for (let i = 0; i < 12; i++) {
        const inc = baseData.income?.[tempMonth];
        if (inc && Number(inc.salary) > 0) {
            referenceMonth = tempMonth;
            break;
        }
        tempMonth = financeTrackerBridge.getPreviousMonth(tempMonth);
    }
    
    const startSummary = computeFinancialSummary(baseData, referenceMonth);
    const r_m = Math.pow(1 + config.returns / 100, 1 / 12) - 1;
    const expenseAnalysis = calculateHistoricalAvgExpenses(baseData, referenceMonth);
    
    // --- OPTIMIZATION 1: Pre-calculate detectMonthlyContribution for all items ---
    const detectedContribMap = {};
    Object.entries(proj.categories || {}).forEach(([catId, cat]) => {
        detectedContribMap[catId] = {};
        Object.values(cat.items || {}).forEach(item => {
            if (item && item.name && !detectedContribMap[catId][item.name]) {
                detectedContribMap[catId][item.name] = detectMonthlyContribution(catId, item.name, referenceMonth, baseData);
            }
        });
    });

    // --- OPTIMIZATION 2: Pre-calculate Amortization Schedules for all loans ---
    const loanSchedules = {};
    Object.entries(proj.loans || {}).forEach(([cardId, card]) => {
        if (card.loanStartMonth && card.tenure) {
            loanSchedules[cardId] = calculateAmortizationSchedule(
                parseFloat(card.totalLoanAmount) || 0,
                parseFloat(card.interestRate) || 0,
                parseInt(card.tenure) || 0,
                parseFloat(card.processingFee) || 0,
                card.loanType
            );
        }
    });

    // --- OPTIMIZATION 3: Fast item amount lookup map by [catId][itemName][month] ---
    const itemAmountMap = {};
    Object.entries(proj.categories || {}).forEach(([catId, cat]) => {
        itemAmountMap[catId] = {};
        Object.values(cat.items || {}).forEach(item => {
            if (item && item.name && item.month) {
                if (!itemAmountMap[catId][item.name]) itemAmountMap[catId][item.name] = {};
                itemAmountMap[catId][item.name][item.month] = Number(item.amount) || 0;
            }
        });
    });

    for (let k = 1; k < monthsList.length; k++) {
        const m = monthsList[k];
        const prevM = monthsList[k - 1];
        const y = k / 12;
        
        const startIncomeObj = baseData.income[referenceMonth] || { salary: 0, otherIncome: 0 };
        const baseSalary = Number(startIncomeObj.salary) || 0;
        const baseOther = Number(startIncomeObj.otherIncome) || 0;
        proj.income[m] = {
            salary: baseSalary,
            otherIncome: baseOther,
            totalIncome: baseSalary + baseOther
        };
        
        const startTaxObj = baseData.taxes?.[referenceMonth] || { tax: 0 };
        const baseTax = Number(startTaxObj.tax) || 0;
        const projTax = baseTax * Math.pow(1 + config.incomeGrowth / 100, y);
        if (!proj.taxes) proj.taxes = {};
        proj.taxes[m] = { tax: projTax };
        
        const r_epfo = Math.pow(1 + 0.0815, 1 / 12) - 1;
        const epfoMonthlyContrib = (config.epfoContribution !== undefined && config.epfoContribution !== null && !isNaN(config.epfoContribution)) 
            ? Number(config.epfoContribution) 
            : 0;

        let prevEpfoVal = 0;
        if (k === 1) {
            const startEpfoObj = baseData.epfo?.[referenceMonth] || { value: 0 };
            prevEpfoVal = Number(startEpfoObj.value) || 0;
        } else {
            prevEpfoVal = Number(proj.epfo?.[prevM]?.value) || 0;
        }

        const projEpfo = prevEpfoVal + (prevEpfoVal * r_epfo) + epfoMonthlyContrib;
        if (!proj.epfo) proj.epfo = {};
        proj.epfo[m] = { value: projEpfo };
        
        let monthlyInvestmentTotal = 0;
        Object.entries(proj.categories || {}).forEach(([catId, cat]) => {
            if (!cat.items) cat.items = {};
            
            const uniqueItemNames = new Set(Object.keys(itemAmountMap[catId] || {}));
            Object.values(cat.items).forEach(item => {
                if (item && item.name && (item.month === referenceMonth || item.month === financeTrackerBridge.getPreviousMonth(referenceMonth))) {
                    if (!item.name.includes('(Projected)') && !item.name.includes('Expected Investment Returns')) {
                        uniqueItemNames.add(item.name);
                    }
                }
            });
            
            let catContribTotal = 0;
            uniqueItemNames.forEach(itemName => {
                let prevAmt = 0;
                if (itemAmountMap[catId]?.[itemName]?.[prevM] !== undefined) {
                    prevAmt = itemAmountMap[catId][itemName][prevM];
                } else if (k === 1) {
                    prevAmt = itemAmountMap[catId]?.[itemName]?.[referenceMonth] || 0;
                }
                
                const growth = prevAmt * r_m;
                const projContrib = detectedContribMap[catId]?.[itemName] || 0;
                const newAmt = prevAmt + growth + projContrib;
                
                if (!itemAmountMap[catId]) itemAmountMap[catId] = {};
                if (!itemAmountMap[catId][itemName]) itemAmountMap[catId][itemName] = {};
                itemAmountMap[catId][itemName][m] = newAmt;

                const newItemId = `forecast_item_${m}_${catId}_${itemName.replace(/\s+/g, '_')}`;
                cat.items[newItemId] = {
                    amount: newAmt,
                    month: m,
                    name: itemName,
                    category: cat.name
                };
                
                catContribTotal += projContrib;
            });
            monthlyInvestmentTotal += catContribTotal;
        });
        
        let loanOutflow = 0;
        Object.entries(proj.loans || {}).forEach(([cardId, card]) => {
            if (!card.balances) card.balances = {};
            if (!card.paymentStatusByMonth) card.paymentStatusByMonth = {};
            
            if (card.loanStartMonth && card.tenure) {
                const monthIndex = getMonthsDifference(card.loanStartMonth, m) + 1;
                if (monthIndex >= 1 && monthIndex <= card.tenure) {
                    const schedule = loanSchedules[cardId];
                    if (schedule) {
                        const record = schedule[monthIndex - 1];
                        if (record) {
                            loanOutflow += (record.totalOutflow || 0);
                            card.balances[m] = record.endBalance;
                            card.paymentStatusByMonth[m] = true;
                        }
                    }
                } else if (monthIndex > card.tenure) {
                    card.balances[m] = 0;
                    card.paymentStatusByMonth[m] = true;
                }
            }
        });
        
        const calMonthIndex = parseInt(m.split('-')[1], 10) - 1;
        const seasonalMultiplier = expenseAnalysis.seasonalMultipliers[calMonthIndex] || 1.0;

        let generalExpensesAndCC;
        if (config.expensesOverride !== null) {
            generalExpensesAndCC = config.expensesOverride * Math.pow(1 + config.inflation / 100, y);
        } else {
            const baseAverage = expenseAnalysis.overallAverage > 0 ? expenseAnalysis.overallAverage : startSummary.expenditure;
            const seasonalBaseExpenses = baseAverage * seasonalMultiplier;
            generalExpensesAndCC = Math.max(0, seasonalBaseExpenses * Math.pow(1 + config.inflation / 100, y) - loanOutflow);
        }
        
        Object.values(proj.creditCards || {}).forEach(card => {
            if (!card.balances) card.balances = {};
            card.balances[m] = 0;
            if (!card.paymentStatusByMonth) card.paymentStatusByMonth = {};
            card.paymentStatusByMonth[m] = true;
        });
        
        Object.values(proj.insurance || {}).forEach(card => {
            if (!card.balances) card.balances = {};
            card.balances[m] = 0;
        });

        if (!proj.expenses) proj.expenses = {};
        if (!proj.expenses['forecast_projected_expense']) {
            proj.expenses['forecast_projected_expense'] = {
                name: 'Projected Monthly Expenses',
                type: 'general-expense',
                balances: {},
                outstandingBalance: 0
            };
        }
        proj.expenses['forecast_projected_expense'].balances[m] = generalExpensesAndCC;
        
        const totalExpensesM = loanOutflow + generalExpensesAndCC;
        const monthlySavings = (baseSalary + baseOther) - totalExpensesM - monthlyInvestmentTotal;
        
        let prevTotalBankBal = 0;
        Object.values(proj.banks || {}).forEach(bank => {
            if (!bank.balances) bank.balances = {};
            if (bank.balances[prevM] === undefined) {
                bank.balances[prevM] = bank.balances[prevM] || bank.balance || 0;
            }
            prevTotalBankBal += bank.balances[prevM];
        });
        
        Object.values(proj.banks || {}).forEach(bank => {
            if (!bank.balances) bank.balances = {};
            if (prevTotalBankBal !== 0) {
                const ratio = bank.balances[prevM] / prevTotalBankBal;
                bank.balances[m] = bank.balances[prevM] + monthlySavings * ratio;
            } else {
                const count = Object.keys(proj.banks || {}).length;
                bank.balances[m] = (bank.balances[prevM] || 0) + monthlySavings / (count || 1);
            }
        });
    }
    
    return proj;
}


// ========================================
// UI State & Read-only Mode Helpers
// ========================================

export function applyForecastUIStates(
    financeData = financeTrackerBridge.getFinanceData(), 
    currentMonth = financeTrackerBridge.getCurrentMonth()
) {
    document.body.classList.add('forecast-mode-active');


    if (forecastConfig && forecastConfig.isActive) {
        const bannerText = document.getElementById('forecastBannerText');
        if (bannerText) {
            const mDisplay = financeTrackerBridge.getMonthDisplay(currentMonth);
            const inf = forecastConfig.inflation || 0;
            const ret = forecastConfig.returns || 0;
            const inc = forecastConfig.incomeGrowth || 0;
            bannerText.textContent = `Forecast Mode Active: Projections for ${mDisplay} (Inflation: ${inf.toFixed(1)}%, Return: ${ret.toFixed(1)}%, Income Growth: ${inc.toFixed(1)}%)`;
        }
    }

    const query = '#financeMainContent button, #financeMainContent input, #financeMainContent select, #financeMainContent .action-icon, #financeMainContent .card-action-btn, #financeMainContent .edit-btn, #financeMainContent .delete-btn, #financeMainContent .add-item-btn';
    document.querySelectorAll(query).forEach(el => {
        if (el.id !== 'maskDataBtn' && el.id !== 'forecastBtn' && el.id !== 'monthPrevBtn' && el.id !== 'monthNextBtn'
            && !el.classList.contains('month-btn') && !el.classList.contains('btn-forecast-exit')
            && !el.classList.contains('btn-forecast-export') && !el.classList.contains('btn-forecast-export-main') && !el.closest('#forecastActiveBanner')
            && !el.closest('.finance-modal-overlay')) {

            el.classList.add('forecast-disabled-element');
            el.setAttribute('data-orig-title', el.getAttribute('title') || '');
            el.setAttribute('title', 'Editing is disabled in Forecast Mode');
        }
    });

    const summary = computeFinancialSummary(financeData, currentMonth);
    const totalBank = summary.totalBankBalance;
    
    const cashShortageBanner = document.getElementById('cashShortageBanner');
    if (totalBank < 0) {
        if (cashShortageBanner) {
            cashShortageBanner.style.display = 'flex';
            const textEl = document.getElementById('cashShortageText');
            if (textEl) {
                textEl.innerHTML = `
                    <strong>Warning:</strong> Projected cash shortage detected! Your total bank balance falls below ₹0 to <strong style="color:#ff6b6b;">${formatCurrencyWithSign(totalBank)}</strong> in the forecasted month.
                `;
            }
        }
        const bankCard = document.getElementById('summaryBankBalanceCard') || document.getElementById('summaryBankCard') || document.querySelector('.bank-balance-metric');
        if (bankCard) {
            bankCard.classList.add('cash-shortage-card-warning');
            const bankVal = bankCard.querySelector('.metric-value') || bankCard;
            if (bankVal) bankVal.classList.add('cash-shortage-text-warning');
        }
    } else {
        if (cashShortageBanner) cashShortageBanner.style.display = 'none';
    }
}

export function clearForecastUIStates() {
    document.body.classList.remove('forecast-mode-active');

    const query = '.forecast-disabled-element';
    document.querySelectorAll(query).forEach(el => {
        el.classList.remove('forecast-disabled-element');
        if (el.hasAttribute('data-orig-title')) {
            el.setAttribute('title', el.getAttribute('data-orig-title'));
            el.removeAttribute('data-orig-title');
        } else {
            el.removeAttribute('title');
        }
    });

    const bankCard = document.getElementById('summaryBankBalanceCard') || document.getElementById('summaryBankCard') || document.querySelector('.bank-balance-metric');
    if (bankCard) {
        bankCard.classList.remove('cash-shortage-card-warning');
        const bankVal = bankCard.querySelector('.metric-value') || bankCard;
        if (bankVal) bankVal.classList.remove('cash-shortage-text-warning');
    }
    
    const cashShortageBanner = document.getElementById('cashShortageBanner');
    if (cashShortageBanner) cashShortageBanner.style.display = 'none';
}

// ========================================
// Forecast Multi-format Report Export
// ========================================

export function getSelectedForecastTargetMonth() {
    const month = document.getElementById('forecastMonthSelect')?.value || '12';
    const year = document.getElementById('forecastYearSelect')?.value || (new Date().getFullYear() + 1);
    return `${year}-${month}`;
}


export function getForecastInputConfig() {
    const inflation = parseFloat(document.getElementById('forecastInflationInput')?.value) || 6.0;
    const returns = parseFloat(document.getElementById('forecastReturnInput')?.value) || 6.0;
    const incomeGrowth = parseFloat(document.getElementById('forecastIncomeGrowthInput')?.value) || 5.0;
    const epfoContribVal = document.getElementById('forecastEpfoContribInput')?.value;
    const epfoContribution = (epfoContribVal !== undefined && epfoContribVal !== null && epfoContribVal !== '') ? parseFloat(epfoContribVal) : 0;
    
    const expToggle = document.getElementById('forecastExpensesToggle');
    let expensesOverride = null;
    if (expToggle && expToggle.checked) {
        const val = parseFloat(document.getElementById('forecastExpensesInput')?.value);
        if (!isNaN(val) && val >= 0) expensesOverride = val;
    }
    
    const targetMonth = getSelectedForecastTargetMonth();
    return {
        isActive: true,
        targetMonth,
        inflation,
        returns,
        incomeGrowth,
        expensesOverride,
        epfoContribution
    };
}

export async function exportForecastData(formatTarget = 'xlsx') {
    try {
        let format = 'xlsx';
        if (typeof formatTarget === 'string' && ['xlsx', 'pdf', 'csv', 'json'].includes(formatTarget.toLowerCase())) {
            format = formatTarget.toLowerCase();
        } else if (formatTarget && typeof formatTarget === 'object') {
            if (formatTarget.format && typeof formatTarget.format === 'string') {
                format = formatTarget.format.toLowerCase();
            }
        }

        const showToast = financeTrackerBridge.showToast || window.showToast || console.log;
        const downloadFile = financeTrackerBridge.downloadFile || window.downloadFile;
        const buildCsvSection = financeTrackerBridge.buildCsvSection || window.buildCsvSection;
        const ensureJsPDF = financeTrackerBridge.ensureJsPDF || window.ensureJsPDF;
        const ensureSheetJS = financeTrackerBridge.ensureSheetJS || window.ensureSheetJS;

        const currentMonth = financeTrackerBridge.getCurrentMonth();

        const financeData = financeTrackerBridge.getFinanceData();
        const isForecastActive = forecastConfig && forecastConfig.isActive;
        const refMonth = (isForecastActive && originalActualMonth) ? originalActualMonth : currentMonth;
        const targetMon = (isForecastActive && forecastConfig.targetMonth) ? forecastConfig.targetMonth : getSelectedForecastTargetMonth();
        const config = isForecastActive ? forecastConfig : getForecastInputConfig();
        const baseDataToUse = (isForecastActive && originalActualData) ? originalActualData : financeData;

        const projData = isForecastActive ? financeData : generateForecastData(baseDataToUse, refMonth, targetMon, config);

        const monthsList = [refMonth];
        let curr = refMonth;
        while (curr !== targetMon && monthsList.length < 600) {
            curr = financeTrackerBridge.getNextMonth(curr);
            monthsList.push(curr);
        }

        showToast(`Preparing forecast export report (${format.toUpperCase()})...`, 'info');

        const summaryRows = [];
        monthsList.forEach(m => {
            const sum = computeFinancialSummary(projData, m);
            const inc = projData.income?.[m] || {};
            
            let monthlyInvContrib = 0;
            Object.entries(projData.categories || {}).forEach(([catId, cat]) => {
                Object.values(cat.items || {}).forEach(item => {
                    if (item && item.month === m) {
                        const detected = detectMonthlyContribution(catId, item.name, refMonth, projData);
                        monthlyInvContrib += detected;
                    }
                });
            });

            const totalInc = Number(inc.totalIncome) || 0;
            const totalExp = sum.expenditure || 0;
            const netSavings = totalInc - totalExp - monthlyInvContrib;

            summaryRows.push({
                'Forecast Month': m,
                'Monthly Salary Income (₹)': totalInc,
                'General & EMI Expenditure (₹)': totalExp,
                'Monthly Investment Outflow (₹)': monthlyInvContrib,
                'Monthly Net Savings (₹)': netSavings,
                'Total Bank Balance (₹)': sum.totalBankBalance || 0,
                'Total Invested Portfolio (₹)': sum.investedThisMonth || 0,
                'EPFO Corpus (₹)': sum.epfoValue || 0,
                'Total Liabilities (₹)': sum.totalLiabilities || 0,
                'Projected Net Worth (₹)': sum.netWorth || 0
            });
        });

        const investmentRows = [];
        monthsList.forEach(m => {
            Object.values(projData.categories || {}).forEach(cat => {
                Object.values(cat.items || {}).forEach(item => {
                    if (item && item.month === m && Number(item.amount) > 0) {
                        investmentRows.push({
                            'Month': m,
                            'Category': cat.name,
                            'Asset Name': item.name,
                            'Projected Amount (₹)': Number(item.amount) || 0
                        });
                    }
                });
            });
        });

        const loanRows = [];
        monthsList.forEach(m => {
            Object.values(projData.loans || {}).forEach(card => {
                const bal = (card.balances && card.balances[m] !== undefined) ? card.balances[m] : 0;
                loanRows.push({
                    'Month': m,
                    'Loan Name': card.name,
                    'Remaining Principal Balance (₹)': bal
                });
            });
        });

        const paramRows = [
            { 'Parameter': 'Reference Start Month', 'Value': refMonth },
            { 'Parameter': 'Target Forecast Month', 'Value': targetMon },
            { 'Parameter': 'Annual Inflation Rate (%)', 'Value': `${config?.inflation || 6}%` },
            { 'Parameter': 'Annual Investment Return (%)', 'Value': `${config?.returns || 6}%` },
            { 'Parameter': 'Monthly EPFO Contribution (₹)', 'Value': config?.epfoContribution ? `₹${config.epfoContribution}` : 'Optional (0)' },
            { 'Parameter': 'Custom Expense Override (₹)', 'Value': config?.expensesOverride !== null ? `₹${config.expensesOverride}` : 'Disabled (Calculated using 12-month seasonality average)' }
        ];

        const filenameBase = `Financial_Forecast_${refMonth}_to_${targetMon}`;

        if (format === 'json') {
            const jsonPayload = {
                forecastPeriod: { startMonth: refMonth, targetMonth: targetMon },
                forecastConfiguration: paramRows,
                monthByMonthSummary: summaryRows,
                investmentPortfolioProjections: investmentRows,
                liabilitiesAmortization: loanRows
            };
            downloadFile(JSON.stringify(jsonPayload, null, 2), `${filenameBase}.json`, 'application/json;charset=utf-8;');
        } else if (format === 'pdf') {
            const PDF = await ensureJsPDF();
            const doc = new PDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            
            doc.setFontSize(15);
            doc.text(`Financial Forecast Report (${refMonth} to ${targetMon})`, 40, 40);
            doc.setFontSize(9);
            doc.text(`Inflation Rate: ${config?.inflation || 6}% | Investment Return: ${config?.returns || 6}% | Generated on ${new Date().toLocaleDateString('en-IN')}`, 40, 55);
            
            const autoTableFn = doc.autoTable || (window.jspdf && window.jspdf.autoTable) || (PDF && PDF.API && PDF.API.autoTable);
            if (typeof autoTableFn === 'function') {
                autoTableFn.call(doc, {
                    startY: 68,
                    head: [['Month', 'Income', 'Expenses', 'Inv Outflow', 'Net Savings', 'Bank Bal', 'Invested', 'EPFO', 'Liabilities', 'Net Worth']],
                    body: summaryRows.map(r => [
                        r['Forecast Month'],
                        formatCurrency(r['Monthly Salary Income (₹)']),
                        formatCurrency(r['General & EMI Expenditure (₹)']),
                        formatCurrency(r['Monthly Investment Outflow (₹)']),
                        formatCurrency(r['Monthly Net Savings (₹)']),
                        formatCurrency(r['Total Bank Balance (₹)']),
                        formatCurrency(r['Total Invested Portfolio (₹)']),
                        formatCurrency(r['EPFO Corpus (₹)']),
                        formatCurrency(r['Total Liabilities (₹)']),
                        formatCurrency(r['Projected Net Worth (₹)'])
                    ]),
                    theme: 'grid',
                    styles: { fontSize: 7, cellPadding: 4 },
                    headStyles: { fillColor: [79, 70, 229] }
                });
            } else {
                let yPos = 75;
                doc.setFontSize(8);
                summaryRows.forEach(r => {
                    if (yPos > 520) { doc.addPage(); yPos = 40; }
                    doc.text(`${r['Forecast Month']} | Inc: ${formatCurrency(r['Monthly Salary Income (₹)'])} | Exp: ${formatCurrency(r['General & EMI Expenditure (₹)'])} | NW: ${formatCurrency(r['Projected Net Worth (₹)'])}`, 40, yPos);
                    yPos += 14;
                });
            }
            doc.save(`${filenameBase}.pdf`);

        } else if (format === 'csv') {
            const sections = [
                buildCsvSection('Forecast Month-by-Month Summary', summaryRows),
                buildCsvSection('Investment Portfolio Projections', investmentRows),
                buildCsvSection('Liabilities & Loan Amortization', loanRows),
                buildCsvSection('Forecast Configuration', paramRows)
            ];
            downloadFile(sections.join('\r\n\r\n'), `${filenameBase}.csv`, 'text/csv;charset=utf-8;');
        } else {
            const XLSX = await ensureSheetJS();
            const wb = XLSX.utils.book_new();

            const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
            XLSX.utils.book_append_sheet(wb, wsSummary, "Monthly Summary");

            const wsInvest = XLSX.utils.json_to_sheet(investmentRows);
            XLSX.utils.book_append_sheet(wb, wsInvest, "Investments");

            const wsLoans = XLSX.utils.json_to_sheet(loanRows);
            XLSX.utils.book_append_sheet(wb, wsLoans, "Loans & Liabilities");

            const wsParams = XLSX.utils.json_to_sheet(paramRows);
            XLSX.utils.book_append_sheet(wb, wsParams, "Forecast Parameters");

            XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        }
        showToast(`Forecast ${format.toUpperCase()} report exported successfully!`, 'success');
    } catch (err) {
        console.error('Forecast export failed:', err);
        showToast(`Failed to export forecast report: ${err.message}`, 'error');
    }
}

export async function exportForecastDataFromModal() {
    const formatSelect = document.getElementById('forecastModalFormatSelect') || document.getElementById('exportFormatSelect');
    const format = formatSelect ? formatSelect.value : 'xlsx';
    closeForecastModal();
    await exportForecastData(format);
}


export async function exportForecastDataModalFormat(format = 'xlsx') {
    closeForecastModal();
    await exportForecastData(format);
}

export function openForecastExportModal() {
    const modal = document.getElementById('forecastExportModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

export function closeForecastExportModal() {
    const modal = document.getElementById('forecastExportModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}


export async function exportForecastDataAndClose(format) {
    closeForecastExportModal();
    await exportForecastData(format);
}

// Attach window global handlers for direct HTML element event listeners
Object.assign(window, {
    openForecastModal,
    closeForecastModal,
    openForecastExportModal,
    closeForecastExportModal,
    exportForecastDataAndClose,
    toggleForecastExpensesInput,
    applyForecastMode,
    exitForecastMode,
    exportForecastData,
    exportForecastDataFromModal,
    exportForecastDataModalFormat
});


