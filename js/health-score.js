/**
 * Standalone Financial Health Score Engine & UI Controls
 * 
 * Features:
 * - 4-Pillar 8-Indicator CFP standard calculation engine
 * - Semi-circle SVG radial gauge & dynamic progress bars
 * - 12-Month historical trend line chart
 * - Interactive "What-If" score simulator
 * - Action Plan modal recommendations
 * 
 * @module health-score.js
 */

import { computeFinancialSummary } from './firebase-finance-service.js';

let bridge = {
    getFinanceData: () => ({}),
    getCurrentMonth: () => new Date().toISOString().slice(0, 7),
    getMonthDisplay: (m) => m,
    formatCurrency: (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    openModal: () => {},
    getChartsObject: () => ({})
};

export function registerHealthScoreBridge(customBridge) {
    if (customBridge && typeof customBridge === 'object') {
        bridge = { ...bridge, ...customBridge };
    }
}

export function getHistoricalMonthsList(count = 12, refMonth = null) {
    const targetMonth = refMonth || bridge.getCurrentMonth();
    const months = [targetMonth];
    let curr = targetMonth;
    for (let i = 1; i < count; i++) {
        const [year, mon] = curr.split('-').map(Number);
        if (isNaN(year) || isNaN(mon)) break;
        const prevDate = new Date(year, mon - 2, 1);
        curr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        months.unshift(curr);
    }
    return months;
}export function getCibilScoreForMonth(data, monthKey) {
    if (!data) return 0;
    // 1. Direct month lookup across all CIBIL schema variations ('cibil', 'cibilScore', 'cibilScores')
    const direct = Number(
        data.cibil?.[monthKey]?.value || 
        data.cibil?.[monthKey] || 
        data.cibilScore?.[monthKey]?.score || 
        data.cibilScores?.[monthKey]?.score || 
        data.cibilScore?.latest || 0
    );
    if (direct > 0) return direct;

    // 2. Historical fallback: Carry forward the most recent recorded CIBIL score
    if (data.cibil && typeof data.cibil === 'object') {
        const recordedMonths = Object.keys(data.cibil)
            .filter(m => m <= monthKey && Number(data.cibil[m]?.value || data.cibil[m]) > 0)
            .sort();
        if (recordedMonths.length > 0) {
            const lastMonth = recordedMonths.pop();
            return Number(data.cibil[lastMonth]?.value || data.cibil[lastMonth]);
        }
    }
    return 0;
}

export function getRepresentativeExpenditure(data, monthKey, currentExp) {
    if (!data) return currentExp || 0;
    
    // Look at past 6 months to find baseline non-zero expenditures
    const pastMonths = getHistoricalMonthsList(6, monthKey);
    const expList = [];
    pastMonths.forEach(m => {
        const sum = computeFinancialSummary(data, m);
        if (sum.expenditure > 0) expList.push(sum.expenditure);
    });

    if (expList.length === 0) return currentExp || 0;
    
    const avgExp = expList.reduce((a, b) => a + b, 0) / expList.length;

    // Use whichever is higher between currentExp and avgExp to ensure emergency buffer is evaluated against full monthly living expenses
    return Math.max(currentExp || 0, avgExp || 0);
}


export function calculateFinancialHealthScore(data = null, monthKey = null) {
    const activeData = data || bridge.getFinanceData();
    const activeMonth = monthKey || bridge.getCurrentMonth();

    const summary = computeFinancialSummary(activeData, activeMonth);
    const monthIncObj = activeData.income?.[activeMonth] || summary.monthIncome || {};
    const salary = Number(monthIncObj.salary || monthIncObj.totalIncome) || 0;
    const other = Number(monthIncObj.otherIncome) || 0;
    let income = Number(monthIncObj.totalIncome) || (salary + other);
    
    // Fallback: If current month income is 0, check most recent active month's income
    if (income <= 0 && activeData.income) {
        const activeMonths = Object.keys(activeData.income).filter(m => (Number(activeData.income[m]?.salary) || 0) > 0);
        if (activeMonths.length > 0) {
            const lastActiveMonth = activeMonths.sort().pop();
            const lastInc = activeData.income[lastActiveMonth];
            income = Number(lastInc?.totalIncome || lastInc?.salary || 0) + (Number(lastInc?.otherIncome) || 0);
        }
    }

    const rawExpenditure = summary.expenditure || 0;
    const expenditure = getRepresentativeExpenditure(activeData, activeMonth, rawExpenditure);
    const bankBal = summary.totalBankBalance || 0;

    let invested = summary.investedThisMonth || summary.monthCategoryTotal || 0;
    
    // Fallback: If selected month has no investments recorded yet, carry forward regular SIP totals from most recent recorded month
    if (invested <= 0 && activeData.categories) {
        const pastMonthsWithInvestments = [];
        Object.values(activeData.categories).forEach(cat => {
            if (cat && cat.items) {
                Object.values(cat.items).forEach(item => {
                    if (item.month && item.month <= activeMonth && item.amount > 0) {
                        pastMonthsWithInvestments.push(item.month);
                    }
                });
            }
        });
        if (pastMonthsWithInvestments.length > 0) {
            const lastInvMonth = pastMonthsWithInvestments.sort().pop();
            const pastSummary = computeFinancialSummary(activeData, lastInvMonth);
            invested = pastSummary.investedThisMonth || pastSummary.monthCategoryTotal || 0;
        }
    }

    const liabilities = summary.totalLiabilities || 0;
    const assets = summary.totalAssets || (bankBal + summary.cumulativeCategoryTotal + (summary.epfoValue || 0));

    const cibilScore = getCibilScoreForMonth(activeData, activeMonth);
    const hasInsurance = Object.keys(activeData.insurance || {}).length > 0;
    const hasEpfo = (summary.epfoValue || 0) > 0 || Object.keys(activeData.epfo || {}).length > 0;

    // --- PILLAR 1: SPEND (25 Pts Max) ---
    // 1A. Savings Rate (15 Pts)
    let savingsRate = income > 0 ? Math.max(0, ((income - rawExpenditure) / income) * 100) : (invested > 0 ? 100 : 0);
    let subSavings = 0;
    if (savingsRate >= 30) subSavings = 15;
    else if (savingsRate >= 20) subSavings = 12;
    else if (savingsRate >= 10) subSavings = 8;
    else if (savingsRate > 0) subSavings = 4;



    // 1B. On-Time Bill & Liability Settlement (10 Pts)
    let unpaidRatio = summary.currentMonthCCOutstanding > 0 ? summary.totalUnpaidCharges / summary.currentMonthCCOutstanding : 0;
    let subBills = unpaidRatio === 0 ? 10 : (unpaidRatio <= 0.5 ? 5 : 2);
    let spendScore = Math.min(25, subSavings + subBills);

    // --- PILLAR 2: SAVE (25 Pts Max) ---
    // 2A. Liquid Emergency Buffer (15 Pts)
    let monthsBuffer = expenditure > 0 ? bankBal / expenditure : (bankBal > 0 ? 6 : 0);
    let subBuffer = 0;
    if (monthsBuffer >= 6) subBuffer = 15;
    else if (monthsBuffer >= 3) subBuffer = 11;
    else if (monthsBuffer >= 1) subBuffer = 6;
    else if (monthsBuffer > 0) subBuffer = 2;

    // 2B. Asset/Debt Solvency Ratio (10 Pts)
    let solvencyRatio = liabilities > 0 ? assets / liabilities : 3.0;
    let subSolvency = solvencyRatio >= 3.0 ? 10 : (solvencyRatio >= 2.0 ? 7 : (solvencyRatio >= 1.2 ? 4 : 1));
    let saveScore = Math.min(25, subBuffer + subSolvency);

    // --- PILLAR 3: BORROW / DEBT CONTROL (25 Pts Max) ---
    // 3A. Debt-to-Income Leverage (15 Pts)
    let dtiRatio = income > 0 ? (liabilities / (income * 12)) * 100 : (liabilities > 0 ? 50 : 0);
    let subDti = 0;
    if (liabilities === 0 || dtiRatio <= 15) subDti = 15;
    else if (dtiRatio <= 30) subDti = 11;
    else if (dtiRatio <= 45) subDti = 6;
    else subDti = 2;

    // 3B. CIBIL / Credit Score Quality Index (10 Pts)
    let subCibil = 3;
    if (cibilScore >= 750) subCibil = 10;
    else if (cibilScore >= 700) subCibil = 8;
    else if (cibilScore >= 650) subCibil = 5;
    else if (liabilities === 0) subCibil = 8;
    let debtScore = Math.min(25, subDti + subCibil);

    // --- PILLAR 4: PLAN & INVEST (25 Pts Max) ---
    // 4A. Investment SIP Velocity (15 Pts)
    let investRate = income > 0 ? (invested / income) * 100 : (invested > 0 ? 100 : 0);
    let subInvest = 0;
    if (investRate >= 20) subInvest = 15;
    else if (investRate >= 15) subInvest = 12;
    else if (investRate >= 10) subInvest = 8;
    else if (investRate >= 5) subInvest = 4;

    // 4B. Risk Protection (Insurance + EPFO) (10 Pts)
    let subProtection = (hasInsurance && hasEpfo) ? 10 : ((hasInsurance || hasEpfo) ? 6 : 2);
    let investScore = Math.min(25, subInvest + subProtection);

    const totalScore = Math.min(100, Math.max(0, Math.round(spendScore + saveScore + debtScore + investScore)));

    let status = 'Needs Attention';
    let statusClass = 'status-danger';
    let statusColor = '#ef4444';
    if (totalScore >= 90) {
        status = 'Excellent';
        statusClass = 'status-success';
        statusColor = '#10b981';
    } else if (totalScore >= 75) {
        status = 'Good';
        statusClass = 'status-info';
        statusColor = '#3b82f6';
    } else if (totalScore >= 50) {
        status = 'Fair';
        statusClass = 'status-warning';
        statusColor = '#f59e0b';
    }

    return {
        totalScore,
        status,
        statusClass,
        statusColor,
        pillars: {
            savings: { score: spendScore, max: 25, valPct: Math.min(100, Math.round((spendScore / 25) * 100)), text: `${savingsRate.toFixed(1)}% Savings Rate` },
            buffer: { score: saveScore, max: 25, valPct: Math.min(100, Math.round((saveScore / 25) * 100)), text: `${monthsBuffer.toFixed(1)} Months Cash Buffer` },
            debt: { score: debtScore, max: 25, valPct: Math.min(100, Math.round((debtScore / 25) * 100)), text: liabilities === 0 ? 'Zero Debt' : `${dtiRatio.toFixed(1)}% Debt/Income` },
            invest: { score: investScore, max: 25, valPct: Math.min(100, Math.round((investScore / 25) * 100)), text: `${investRate.toFixed(1)}% Investment Rate` }
        },
        indicators: {
            savingsRate,
            monthsBuffer,
            dtiRatio,
            investRate,
            cibilScore,
            solvencyRatio,
            hasInsurance,
            hasEpfo,
            unpaidRatio
        }
    };
}

export function updateFinancialHealthScoreUI() {
    const scoreData = calculateFinancialHealthScore();
    
    const numEl = document.getElementById('healthScoreNum');
    if (numEl) numEl.textContent = scoreData.totalScore;

    const badgeEl = document.getElementById('healthStatusBadge');
    if (badgeEl) {
        badgeEl.textContent = scoreData.status;
        badgeEl.className = `health-status-badge ${scoreData.statusClass}`;
    }

    const gaugePath = document.getElementById('healthGaugePath');
    if (gaugePath) {
        const offset = 157 - (157 * scoreData.totalScore / 100);
        gaugePath.style.strokeDashoffset = offset;
        gaugePath.style.stroke = scoreData.statusColor;
    }

    const p = scoreData.pillars;

    const savScoreEl = document.getElementById('pillarSavingsScore');
    const savBarEl = document.getElementById('pillarSavingsBar');
    const savValEl = document.getElementById('pillarSavingsValText');
    if (savScoreEl) savScoreEl.textContent = `${p.savings.score}/25 Pts`;
    if (savBarEl) savBarEl.style.width = `${p.savings.valPct}%`;
    if (savValEl) savValEl.textContent = p.savings.text;

    const bufScoreEl = document.getElementById('pillarBufferScore');
    const bufBarEl = document.getElementById('pillarBufferBar');
    const bufValEl = document.getElementById('pillarBufferValText');
    if (bufScoreEl) bufScoreEl.textContent = `${p.buffer.score}/25 Pts`;
    if (bufBarEl) bufBarEl.style.width = `${p.buffer.valPct}%`;
    if (bufValEl) bufValEl.textContent = p.buffer.text;

    const debtScoreEl = document.getElementById('pillarDebtScore');
    const debtBarEl = document.getElementById('pillarDebtBar');
    const debtValEl = document.getElementById('pillarDebtValText');
    if (debtScoreEl) debtScoreEl.textContent = `${p.debt.score}/25 Pts`;
    if (debtBarEl) debtBarEl.style.width = `${p.debt.valPct}%`;
    if (debtValEl) debtValEl.textContent = p.debt.text;

    const invScoreEl = document.getElementById('pillarInvestScore');
    const invBarEl = document.getElementById('pillarInvestBar');
    const invValEl = document.getElementById('pillarInvestValText');
    if (invScoreEl) invScoreEl.textContent = `${p.invest.score}/25 Pts`;
    if (invBarEl) invBarEl.style.width = `${p.invest.valPct}%`;
    if (invValEl) invValEl.textContent = p.invest.text;

    // Render 12-Month Historical Health Score Progression Chart
    renderHealthScoreTrendChart();
}


export function renderHealthScoreTrendChart() {
    const canvas = document.getElementById('healthScoreTrendChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const charts = bridge.getChartsObject();
    if (charts.healthScoreTrend) {
        charts.healthScoreTrend.destroy();
    }

    const data = bridge.getFinanceData();
    const months = getHistoricalMonthsList(6);
    const scoreDataList = months.map(m => calculateFinancialHealthScore(data, m).totalScore);
    const monthLabels = months.map(m => bridge.getMonthDisplay(m));

    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    charts.healthScoreTrend = new Chart(canvas, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Health Index',
                data: scoreDataList,
                borderColor: '#7289ff',
                backgroundColor: 'rgba(114, 137, 255, 0.14)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointHitRadius: 12,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#7289ff',
                pointBorderWidth: 2.5,
                clip: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            clip: false,
            layout: {
                padding: {
                    top: 24,
                    bottom: 6,
                    left: 8,
                    right: 12
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Health Index: ${ctx.raw} / 100`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor, font: { size: 9 } },
                    grid: { display: false }
                },
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        color: textColor,
                        font: { size: 9 },
                        stepSize: 25
                    },
                    grid: { color: gridColor }
                }

            }
        }
    });

}


export function openHealthScoreModal() {
    const scoreData = calculateFinancialHealthScore();

    const scoreNumEl = document.getElementById('modalHealthScoreNum');
    if (scoreNumEl) scoreNumEl.textContent = scoreData.totalScore;

    const scoreText = document.getElementById('modalHealthScoreText');
    if (scoreText) scoreText.textContent = `${scoreData.totalScore} / 100`;

    const summaryText = document.getElementById('modalHealthSummaryText');
    if (summaryText) {
        summaryText.textContent = `Score: ${scoreData.totalScore}/100 • ${scoreData.status} Solvency Rating`;
    }

    const badgeEl = document.getElementById('modalHealthStatusBadge');
    if (badgeEl) {
        badgeEl.textContent = scoreData.status;
        badgeEl.className = `health-status-badge ${scoreData.statusClass}`;
    }


    const tipsContainer = document.getElementById('healthScoreTipsList');
    if (tipsContainer) {
        const ind = scoreData.indicators;
        const data = bridge.getFinanceData();
        const monthKey = bridge.getCurrentMonth();
        const summary = computeFinancialSummary(data, monthKey);

        const expenditure = summary.expenditure || 0;
        const bankBal = summary.totalBankBalance || 0;
        const liabilities = summary.totalLiabilities || 0;

        // Build 8-indicator scorecard items
        const indicators = [
            {
                name: 'Savings Rate',
                pillar: 'Spend',
                score: ind.savingsRate >= 30 ? 15 : (ind.savingsRate >= 20 ? 12 : (ind.savingsRate >= 10 ? 8 : (ind.savingsRate > 0 ? 4 : 0))),
                max: 15,
                valText: `${ind.savingsRate.toFixed(1)}%`,
                benchmark: '≥ 30%',
                icon: 'bi-piggy-bank',
                advice: ind.savingsRate < 30 ? `Your savings rate is ${ind.savingsRate.toFixed(1)}%. Target saving 30%+ of monthly income to close the gap.` : `Excellent! Your savings rate of ${ind.savingsRate.toFixed(1)}% meets top CFP standards.`
            },
            {
                name: 'Bill & Credit Card Settlement',
                pillar: 'Spend',
                score: ind.unpaidRatio === 0 ? 10 : (ind.unpaidRatio <= 0.5 ? 5 : 2),
                max: 10,
                valText: ind.unpaidRatio === 0 ? '100% Paid' : `${(ind.unpaidRatio * 100).toFixed(0)}% Unpaid`,
                benchmark: '100% Paid',
                icon: 'bi-receipt-cutoff',
                advice: ind.unpaidRatio > 0 ? `You have unpaid credit card dues this month. Clear dues to avoid interest and protect score.` : `Great job! All credit card dues settled on time.`
            },
            {
                name: 'Emergency Liquid Runway',
                pillar: 'Save',
                score: ind.monthsBuffer >= 6 ? 15 : (ind.monthsBuffer >= 3 ? 11 : (ind.monthsBuffer >= 1 ? 6 : (ind.monthsBuffer > 0 ? 2 : 0))),
                max: 15,
                valText: `${ind.monthsBuffer.toFixed(1)} Months`,
                benchmark: '≥ 6 Months',
                icon: 'bi-shield-exclamation',
                advice: ind.monthsBuffer < 6 ? `You have ${ind.monthsBuffer.toFixed(1)} months buffer. Add ${bridge.formatCurrency(Math.max(0, expenditure * 6 - bankBal))} more to bank balance for a 6-month liquid cushion.` : `Solid emergency fund! You have ${ind.monthsBuffer.toFixed(1)} months of liquid expenses saved.`
            },
            {
                name: 'Solvency Asset/Debt Ratio',
                pillar: 'Save',
                score: ind.solvencyRatio >= 3.0 ? 10 : (ind.solvencyRatio >= 2.0 ? 7 : (ind.solvencyRatio >= 1.2 ? 4 : 1)),
                max: 10,
                valText: liabilities === 0 ? 'Zero Debt (3.0x+)' : `${ind.solvencyRatio.toFixed(1)}x Assets/Debt`,
                benchmark: '≥ 3.0x',
                icon: 'bi-bank2',
                advice: ind.solvencyRatio < 3.0 ? `Your assets are ${ind.solvencyRatio.toFixed(1)}x liabilities. Increase total net worth to 3x total debt.` : `Strong solvency! Your asset base comfortably covers liabilities.`
            },
            {
                name: 'Debt-to-Income Leverage',
                pillar: 'Borrow',
                score: liabilities === 0 || ind.dtiRatio <= 15 ? 15 : (ind.dtiRatio <= 30 ? 11 : (ind.dtiRatio <= 45 ? 6 : 2)),
                max: 15,
                valText: liabilities === 0 ? 'Zero Debt (0%)' : `${ind.dtiRatio.toFixed(1)}% DTI`,
                benchmark: '≤ 15% DTI',
                icon: 'bi-credit-card-2-front',
                advice: ind.dtiRatio > 15 ? `Debt leverage is at ${ind.dtiRatio.toFixed(1)}% of annual income. Pay down loans to reduce DTI below 15%.` : `Optimal leverage! Debt levels are comfortably low.`
            },
            {
                name: 'CIBIL / Credit Rating Index',
                pillar: 'Borrow',
                score: ind.cibilScore >= 750 ? 10 : (ind.cibilScore >= 700 ? 8 : (ind.cibilScore >= 650 ? 5 : (liabilities === 0 ? 8 : 3))),
                max: 10,
                valText: ind.cibilScore > 0 ? `${ind.cibilScore}` : 'Not Recorded',
                benchmark: '≥ 750 CIBIL',
                icon: 'bi-speedometer2',
                advice: ind.cibilScore < 750 ? (ind.cibilScore > 0 ? `Credit score is ${ind.cibilScore}. Keep card utilization below 30% to cross 750.` : `Record your CIBIL score in the CIBIL tracker widget to earn full points.`) : `Prime credit score (${ind.cibilScore})!`
            },
            {
                name: 'Investment SIP Velocity',
                pillar: 'Plan',
                score: ind.investRate >= 20 ? 15 : (ind.investRate >= 15 ? 12 : (ind.investRate >= 10 ? 8 : (ind.investRate >= 5 ? 4 : 0))),
                max: 15,
                valText: `${ind.investRate.toFixed(1)}%`,
                benchmark: '≥ 20% SIP',
                icon: 'bi-graph-up-arrow',
                advice: ind.investRate < 20 ? `You currently invest ${ind.investRate.toFixed(1)}% of income. Increase SIP allocation to 20%+ for wealth creation.` : `High investment rate of ${ind.investRate.toFixed(1)}%! Wealth velocity is maximized.`
            },
            {
                name: 'Risk & Retirement Protection',
                pillar: 'Plan',
                score: (ind.hasInsurance && ind.hasEpfo) ? 10 : ((ind.hasInsurance || ind.hasEpfo) ? 6 : 2),
                max: 10,
                valText: (ind.hasInsurance && ind.hasEpfo) ? 'Insurance + EPFO' : (ind.hasInsurance ? 'Insurance Only' : (ind.hasEpfo ? 'EPFO Only' : 'None')),
                benchmark: 'Active Policies',
                icon: 'bi-umbrella-fill',
                advice: (!ind.hasInsurance || !ind.hasEpfo) ? `Add active term/health insurance policies and record your EPFO balance.` : `Fully protected with insurance coverage and EPFO retirement tracking.`
            }
        ];

        // Sort into Priority Focus (Score < 65% of max), On-Track Growth (Score < 100%), and Achieved Strengths (Score == max)
        const priorityFocus = indicators.filter(i => (i.score / i.max) < 0.65);
        const onTrackGrowth = indicators.filter(i => (i.score / i.max) >= 0.65 && i.score < i.max);
        const achievedStrengths = indicators.filter(i => i.score === i.max);

        let html = '';

        // 1. Priority Focus Section (Red)
        if (priorityFocus.length > 0) {
            html += `
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 0.85rem; font-weight: 700; color: #ef4444; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
                        <i class="bi bi-bullseye"></i> Priority Action Items (${priorityFocus.length})
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${priorityFocus.map(item => `
                            <div class="health-tip-card" style="border-left: 4px solid #ef4444;">
                                <i class="bi ${item.icon} health-tip-icon" style="color: #ef4444;"></i>
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                                        <div class="health-tip-title">${item.name} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">• ${item.pillar}</span></div>
                                        <div class="score-badge-group">
                                            <span class="score-pill-current status-danger">${item.score}/${item.max} Pts</span>
                                            <span class="score-pill-gain gain-urgent"><i class="bi bi-graph-up-arrow"></i> +${item.max - item.score} Pts Gain</span>
                                        </div>
                                    </div>
                                    <div class="health-tip-body" style="margin-top: 6px;">
                                        Current: <strong>${item.valText}</strong> | Target Benchmark: <strong>${item.benchmark}</strong><br>
                                        💡 <em>${item.advice}</em>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 2. On-Track Growth Section (Yellow)
        if (onTrackGrowth.length > 0) {
            html += `
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 0.85rem; font-weight: 700; color: #f59e0b; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
                        <i class="bi bi-arrow-up-circle-fill"></i> On-Track Optimization Items (${onTrackGrowth.length})
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${onTrackGrowth.map(item => `
                            <div class="health-tip-card" style="border-left: 4px solid #f59e0b;">
                                <i class="bi ${item.icon} health-tip-icon" style="color: #f59e0b;"></i>
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                                        <div class="health-tip-title">${item.name} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">• ${item.pillar}</span></div>
                                        <div class="score-badge-group">
                                            <span class="score-pill-current status-warning">${item.score}/${item.max} Pts</span>
                                            <span class="score-pill-gain gain-warning"><i class="bi bi-graph-up-arrow"></i> +${item.max - item.score} Pts Gain</span>
                                        </div>
                                    </div>
                                    <div class="health-tip-body" style="margin-top: 6px;">
                                        Current: <strong>${item.valText}</strong> | Target Benchmark: <strong>${item.benchmark}</strong><br>
                                        💡 <em>${item.advice}</em>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 3. Achieved Financial Milestones (Green)
        if (achievedStrengths.length > 0) {
            html += `
                <div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #10b981; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
                        <i class="bi bi-patch-check-fill"></i> Achieved Financial Milestones (${achievedStrengths.length})
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${achievedStrengths.map(item => `
                            <div class="health-tip-card" style="border-left: 4px solid #10b981;">
                                <i class="bi ${item.icon} health-tip-icon" style="color: #10b981;"></i>
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                                        <div class="health-tip-title">${item.name} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">• ${item.pillar}</span></div>
                                        <div class="score-badge-group">
                                            <span class="score-pill-current status-success">${item.score}/${item.max} Pts</span>
                                            <span class="score-pill-gain"><i class="bi bi-check-circle-fill"></i> Top Tier</span>
                                        </div>
                                    </div>
                                    <div class="health-tip-body" style="margin-top: 6px;">
                                        ${item.advice}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        tipsContainer.innerHTML = html;
    }


    bridge.openModal('healthScoreModal');
}


// Global window assignments for inline HTML onclick handlers
if (typeof window !== 'undefined') {
    window.calculateFinancialHealthScore = calculateFinancialHealthScore;
    window.updateFinancialHealthScoreUI = updateFinancialHealthScoreUI;
    window.renderHealthScoreTrendChart = renderHealthScoreTrendChart;
    window.openHealthScoreModal = openHealthScoreModal;
}


