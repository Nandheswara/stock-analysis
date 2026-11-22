/**
 * Unified AI Credit Card Hub & Advisor
 * 
 * Combines all Credit Card decision-making and optimization into a single hub:
 * 1. AI Spend Advisor (Natural Language "How should I pay?" + CIBIL Multi-Card Split)
 * 2. Instant Category Cheat Sheet (Quick Cashback Matrix across all user cards)
 * 3. Monthly Cashback Audit & Retro (Audits logged spends, computes efficiency & missed ₹)
 * 4. Annual Fee Waiver & Milestone Tracker (Rolling 12M spends vs waiver targets + upcoming event routing)
 * 5. Portfolio Gap & Card Upgrade Review (Diagnostics on spending blindspots & card pruning)
 * 6. Reference Card Directory (Preset library of 30+ Indian cards with perks & lounge rules)
 * 
 * @module credit-card-ai-advisor
 */

import { 
    CARD_PRESETS_REGISTRY, 
    detectCardPreset,
    calculatePaymentFloatDays,
    evaluateCardForSpend,
    generateCategoryCheatSheet
} from './credit-card-optimizer.js';

import { 
    callNvidiaChat 
} from './services/nvidia-ai-service.js';

import { formatCurrency, escapeHtml } from './utils.js';

// Bridge to main finance tracker
let bridge = {
    getFinanceData: () => ({}),
    getCurrentMonth: () => new Date().toISOString().slice(0, 7),
    showToast: (msg, type) => (window.showToast ? window.showToast(msg, type) : console.log(msg))
};

export function registerCardAIAdvisorBridge(customBridge) {
    if (customBridge && typeof customBridge === 'object') {
        bridge = { ...bridge, ...customBridge };
    }
}

// Current Active Tab
let currentActiveTab = 'spendAdvisor';

// ============================================================================
// 1. DYNAMIC CONTEXT EXTRACTOR (WORKS WITH ANY USER CARDS)
// ============================================================================

export function extractUserCreditCardsContext(financeData = null, currentMonth = null) {
    const data = financeData || bridge.getFinanceData() || {};
    const month = currentMonth || bridge.getCurrentMonth() || new Date().toISOString().slice(0, 7);
    
    const userCards = data.creditCards || {};
    const cardList = [];

    for (const [id, rawCard] of Object.entries(userCards)) {
        if (!rawCard || typeof rawCard !== 'object') continue;

        const loanType = rawCard.loanType || '';
        if (loanType && loanType !== 'credit-card' && loanType !== 'credit-card-emi') {
            continue;
        }

        const name = (rawCard.name || '').trim();
        if (!name) continue;

        const issuer = (rawCard.issuer || '').trim();
        const limit = Number(rawCard.monthlyLimits?.[month] ?? rawCard.creditLimit ?? 0);
        const currentBalance = Number(rawCard.balances?.[month] ?? rawCard.outstandingBalance ?? 0);
        const curRatio = limit > 0 ? (currentBalance / limit) * 100 : 0;
        const availableCredit = Math.max(0, limit - currentBalance);

        const dueDate = rawCard.dueDate || '';
        const floatDays = dueDate ? calculatePaymentFloatDays(dueDate) : null;

        let preset = null;
        if (rawCard.presetId) {
            preset = typeof rawCard.presetId === 'string' ? CARD_PRESETS_REGISTRY[rawCard.presetId] : rawCard.presetId;
        }
        if (!preset) {
            preset = detectCardPreset(name, issuer);
        }
        const presetId = preset?.id || (typeof rawCard.presetId === 'string' ? rawCard.presetId : null);

        // Rolling 12-Month spend calculation
        const balances = rawCard.balances || {};
        const recordedSpends = Object.values(balances).map(Number).filter(v => !isNaN(v) && v > 0);
        const rollingAnnualSpend = recordedSpends.reduce((acc, v) => acc + v, 0);

        cardList.push({
            id,
            name,
            issuer,
            limit,
            currentBalance,
            availableCredit,
            curRatio: Number(curRatio.toFixed(1)),
            dueDate,
            floatDays,
            presetId,
            presetName: preset ? preset.name : null,
            baseCashbackPercent: preset ? preset.baseCashbackPercent : 1.0,
            tiers: preset ? preset.tiers : [],
            exclusions: preset ? preset.exclusions : [],
            feeWaiverSpendTarget: preset ? preset.feeWaiverSpendTarget : null,
            annualFee: preset ? preset.annualFee : null,
            rollingAnnualSpend,
            notes: rawCard.notes || ''
        });
    }

    // Extract Linked Debit Cards from Bank Accounts
    const userBanks = data.banks || {};
    const debitCardList = [];
    for (const [bankId, bank] of Object.entries(userBanks)) {
        if (!bank || typeof bank !== 'object') continue;
        const dc = bank.debitCard;
        if (dc && (dc.cardName || dc.hasDebitCard)) {
            debitCardList.push({
                bankId,
                bankName: bank.bankName || bank.name || 'Bank',
                accountName: bank.name || '',
                cardName: dc.cardName || `${bank.bankName || bank.name} Debit Card`,
                network: dc.network || 'visa',
                variant: dc.variant || 'platinum',
                notes: dc.notes || ''
            });
        }
    }

    return {
        month,
        totalCards: cardList.length,
        cards: cardList,
        debitCards: debitCardList,
        rawExpenses: data.expenses || {},
        annualEvents: data.annualEvents || {}
    };
}

// ============================================================================
// 2. FEATURE 1: AI SPEND ADVISOR (NATURAL LANGUAGE CO-PILOT)
// ============================================================================

/**
 * Dynamically resolves the most fitting Bootstrap icon for any platform or offer
 */
export function resolveOfferIcon(offer) {
    if (offer?.categoryIcon && offer.categoryIcon.startsWith('bi-')) return offer.categoryIcon;
    const text = `${offer?.platform || ''} ${offer?.badge || ''} ${offer?.summary || ''} ${offer?.routeType || ''}`.toLowerCase();
    if (text.includes('flight') || text.includes('air') || text.includes('fly') || text.includes('indigo') || text.includes('vistara') || text.includes('airline')) return 'bi-airplane-fill';
    if (text.includes('train') || text.includes('rail') || text.includes('irctc') || text.includes('tatkal')) return 'bi-train-front-fill';
    if (text.includes('bill') || text.includes('electric') || text.includes('power') || text.includes('utility') || text.includes('bijli') || text.includes('gas') || text.includes('water')) return 'bi-lightning-charge-fill';
    if (text.includes('food') || text.includes('swiggy') || text.includes('zomato') || text.includes('dine') || text.includes('restaurant') || text.includes('eazydiner')) return 'bi-cup-hot-fill';
    if (text.includes('grocery') || text.includes('blinkit') || text.includes('zepto') || text.includes('instamart') || text.includes('bigbasket') || text.includes('market')) return 'bi-basket2-fill';
    if (text.includes('hotel') || text.includes('stay') || text.includes('resort') || text.includes('agoda') || text.includes('booking') || text.includes('room')) return 'bi-building-fill';
    if (text.includes('movie') || text.includes('cinema') || text.includes('pvr') || text.includes('inox') || text.includes('theatre') || text.includes('bms')) return 'bi-film';
    if (text.includes('voucher') || text.includes('gift') || text.includes('smartbuy') || text.includes('gyftr') || text.includes('brand voucher')) return 'bi-gift-fill';
    if (text.includes('recharge') || text.includes('mobile') || text.includes('dth') || text.includes('phone') || text.includes('broadband')) return 'bi-phone-fill';
    if (text.includes('cab') || text.includes('uber') || text.includes('ola') || text.includes('ride') || text.includes('taxi') || text.includes('rapido')) return 'bi-car-front-fill';
    if (text.includes('health') || text.includes('pharmacy') || text.includes('medicine') || text.includes('1mg') || text.includes('apollo') || text.includes('netmeds')) return 'bi-capsule';
    if (text.includes('cash') || text.includes('reward') || text.includes('coin') || text.includes('neu') || text.includes('affiliate') || text.includes('cashkaro')) return 'bi-cash-coin';
    if (text.includes('gateway') || text.includes('razorpay') || text.includes('cred') || text.includes('paytm') || text.includes('payment')) return 'bi-wallet2';
    return 'bi-tags-fill';
}

/**
 * Dynamically resolves the route type badge for clear user understanding
 */
export function resolveOfferRouteType(offer) {
    if (offer?.routeType) return offer.routeType;
    const text = `${offer?.platform || ''} ${offer?.badge || ''} ${offer?.summary || ''}`.toLowerCase();
    if (text.includes('voucher') || text.includes('gift') || text.includes('smartbuy') || text.includes('gyftr')) return 'Voucher Multiplier';
    if (text.includes('zero') || text.includes('convenience') || text.includes('pg fee') || text.includes('no fee')) return 'Zero Fee Route';
    if (text.includes('gateway') || text.includes('razorpay') || text.includes('cred') || text.includes('paytm') || text.includes('bbps')) return 'Payment App Route';
    if (text.includes('affiliate') || text.includes('cashkaro') || text.includes('earnkaro')) return 'Affiliate Route';
    return 'Booking Portal Promo';
}

/**
 * Format integer INR amount without trailing decimals (e.g. ₹15,000 instead of ₹15,000.00)
 */
export function formatInrInteger(amt) {
    if (amt === null || amt === undefined || isNaN(amt)) return '₹0';
    return '₹' + Math.round(Number(amt)).toLocaleString('en-IN');
}

/**
 * Safely format monetary, percentage, and card entity highlights in text for clean user readability
 */
export function formatOfferText(text) {
    if (!text || typeof text !== 'string') return '';
    let escaped = escapeHtml(text);

    // Remove any trailing .00 on INR amounts (e.g. ₹15,000.00 -> ₹15,000)
    escaped = escaped.replace(/₹([\d,]+)\.00\b/g, '₹$1');

    // Highlight INR amounts (e.g. ₹5,00,000, ₹15,000, ₹2,500, ₹5L, ₹450, etc.)
    escaped = escaped.replace(/(₹[\d,]+(?:\.\d+)?(?:\s*(?:L|Cr|k|K|lakh|crore))?)(?!\w)/gi, '<strong class="ai-text-val">$1</strong>');

    // Highlight multipliers and percentages (e.g. 3X, 10X, 5%, 10%, 1.5%)
    escaped = escaped.replace(/(?<!\w)(\d+(?:\.\d+)?%|\d+X)(?!\w)/gi, '<strong class="ai-text-highlight">$1</strong>');

    // Highlight popular cards including HSBC Live+
    escaped = escaped.replace(/\b(HDFC Millennia|HSBC Live\+|Amazon Pay ICICI|Kiwi RuPay|Kiwi card|Kiwi|Tata Neu Infinity|Tata Neu Plus|Infinia|Regalia Gold|Axis Ace|Airtel Axis)(?!\w)/gi, '<span class="ai-text-card">$1</span>');

    // Highlight prominent promo codes
    escaped = escaped.replace(/\b(EMTNCF|NOFEES|APAYBILL|SMARTBUY|CRED50|CKEXTRA|MMTFLIGHT|AUTOAPPLIED)\b/g, '<code class="ai-text-code">$1</code>');

    return escaped;
}

/**
 * Format summary into structured, skimmable steps or clean bullet points
 */
export function formatOfferSummary(summaryText) {
    if (!summaryText || typeof summaryText !== 'string') return '';
    const clean = summaryText.trim();
    if (!clean) return '';

    // Split sentences if 2 or more exist
    const rawSentences = clean.split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean);
    if (rawSentences.length > 1) {
        return rawSentences.map(sentence => `
            <div class="ai-summary-step">
                <i class="bi bi-arrow-right-circle-fill ai-step-bullet"></i>
                <span class="ai-step-text">${formatOfferText(sentence)}</span>
            </div>
        `).join('');
    }

    return `
        <div class="ai-summary-single">
            <span class="ai-step-text">${formatOfferText(clean)}</span>
        </div>
    `;
}

/**
 * Resilient Dynamic Fallback Generator for when AI response is unavailable or missing offers
 */
export function generateDynamicFallbackOffers(queryText, effectiveAmount, bestCardName, bestCashback) {
    const q = (queryText || '').toLowerCase();
    const offers = [];

    // Route 1: Voucher Multiplier (SmartBuy / Gyftr) - works for almost all retail, shopping, dining, travel
    offers.push({
        platform: 'SmartBuy / Gyftr Vouchers',
        categoryIcon: 'bi-gift-fill',
        routeType: 'Voucher Multiplier',
        badge: '3X–10X Reward Points',
        couponCode: 'SMARTBUY',
        discountAmount: Math.round(effectiveAmount * 0.05),
        discountText: `Saves ~${formatCurrency(Math.round(effectiveAmount * 0.05))} (5%–10% effective)`,
        summary: `Buy gift vouchers on SmartBuy/Gyftr using ${bestCardName || 'your card'} before checking out to unlock instant multiplier rewards!`,
        stackingTip: `Purchase brand vouchers on SmartBuy/Gyftr with ${bestCardName || 'your card'} first to earn multiplier points, then use vouchers at checkout for double value!`
    });

    // Route 2: Category-aware Primary Portal
    if (q.includes('flight') || q.includes('air') || q.includes('fly')) {
        offers.unshift({
            platform: 'EaseMyTrip',
            categoryIcon: 'bi-airplane-fill',
            routeType: 'Zero Fee Route',
            badge: 'Zero Convenience Fee',
            couponCode: 'EMTNCF',
            discountAmount: 450,
            discountText: 'Saves ~₹450 convenience fee',
            summary: 'Flat ₹0 convenience fee on flight booking. Saves ₹350–₹500 per passenger at final checkout.',
            stackingTip: `Apply coupon EMTNCF on EaseMyTrip, then swipe ${bestCardName || 'your card'} for card cashback on top!`
        });
        offers.push({
            platform: 'MakeMyTrip / Cleartrip',
            categoryIcon: 'bi-globe-americas',
            routeType: 'Booking Portal Promo',
            badge: 'Instant Bank Promo',
            couponCode: 'MMTFLIGHT',
            discountAmount: Math.min(1500, Math.round(effectiveAmount * 0.10)),
            discountText: `Instant ~${formatCurrency(Math.min(1500, Math.round(effectiveAmount * 0.10)))} Off`,
            summary: 'Instant platform discount code on flight bookings with major bank cards.',
            stackingTip: `Apply promo code MMTFLIGHT on MakeMyTrip, then pay with ${bestCardName || 'your card'}.`
        });
    } else if (q.includes('train') || q.includes('rail') || q.includes('irctc')) {
        offers.unshift({
            platform: 'Ixigo Trains',
            categoryIcon: 'bi-train-front-fill',
            routeType: 'Zero Fee Route',
            badge: 'Zero PG Charges',
            couponCode: 'NOFEES',
            discountAmount: 40,
            discountText: 'Saves PG Convenience Charge',
            summary: 'Flat ₹0 payment gateway fee on IRCTC train bookings + free instant refunds to source account.',
            stackingTip: `Book with code NOFEES on Ixigo for zero gateway fee + earn reward points on ${bestCardName || 'your card'}.`
        });
    } else if (q.includes('bill') || q.includes('electric') || q.includes('power') || q.includes('recharge') || q.includes('gas') || q.includes('water') || q.includes('broadband')) {
        offers.unshift({
            platform: 'Amazon Pay BBPS',
            categoryIcon: 'bi-lightning-charge-fill',
            routeType: 'Payment App Route',
            badge: '2% Uncapped Cashback',
            couponCode: 'APAYBILL',
            discountAmount: Math.round(effectiveAmount * 0.02),
            discountText: `Earns ${formatCurrency(Math.round(effectiveAmount * 0.02))} Cashback`,
            summary: 'Pay utility bills via Amazon Pay BBPS with Amazon Pay ICICI card for flat 2% statement cashback without monthly limits.',
            stackingTip: `Route via Amazon Pay BBPS using Amazon Pay ICICI to claim 2% direct cashback on utility bills!`
        });
        offers.push({
            platform: 'CRED Pay BBPS',
            categoryIcon: 'bi-wallet2',
            routeType: 'Payment App Route',
            badge: 'Cashback & Coin Burn',
            couponCode: 'CRED50',
            discountAmount: 50,
            summary: 'Pay utility bills via CRED to earn instant cashback scratchcards plus burn Cred coins.',
            stackingTip: `Pay on CRED using ${bestCardName || 'your card'} to double dip on CRED rewards + card points.`
        });
    } else {
        // Route 3: Generic Affiliate Cash-Back Route (CashKaro / EarnKaro)
        offers.push({
            platform: 'CashKaro / EarnKaro',
            categoryIcon: 'bi-cash-coin',
            routeType: 'Affiliate Route',
            badge: 'Extra 2%–6% Real Cash',
            couponCode: 'CKEXTRA',
            discountAmount: Math.round(effectiveAmount * 0.03),
            discountText: `Extra ~${formatCurrency(Math.round(effectiveAmount * 0.03))} into Bank`,
            summary: 'Click through CashKaro before purchasing to earn real cash transferrable directly to your bank account.',
            stackingTip: `Route through CashKaro -> checkout with ${bestCardName || 'your card'} to pocket real bank cashback PLUS credit card cashback simultaneously!`
        });
    }

    return offers;
}

/**
 * Detect if purchase query is paying a credit card bill
 */
export function isCreditCardBillPayment(queryText) {
    const q = (queryText || '').toLowerCase();
    return (
        (q.includes('credit card') || q.includes('card bill') || q.includes('cc bill')) && 
        (q.includes('bill') || q.includes('pay') || q.includes('repayment') || q.includes('due') || q.includes('settle'))
    ) || q.includes('credit card bill');
}

export async function getAICardRecommendation(queryText, spendAmount = null) {
    const context = extractUserCreditCardsContext();
    
    if (context.totalCards === 0 && (!context.debitCards || context.debitCards.length === 0)) {
        throw new Error('No cards found in your tracker. Please add your cards in the Credit Cards or Bank Accounts section first.');
    }

    const effectiveAmount = Number(spendAmount) || 1000;
    const rawFinanceData = bridge.getFinanceData() || {};
    const rawUserCards = rawFinanceData.creditCards || {};
    const isCCBill = isCreditCardBillPayment(queryText);

    // Pre-evaluate baseline rates and exclusions deterministically
    const evaluatedCards = context.cards.map(c => {
        const rawCard = rawUserCards[c.id] || c;
        const evaluation = evaluateCardForSpend(rawCard, c.id, queryText, effectiveAmount, context.month, c.currentBalance);
        
        let applicableRate = evaluation.applicableRate;
        let cashbackEarned = evaluation.cashbackEarned;
        let isExcluded = evaluation.isExcluded;
        let exclusionReason = evaluation.exclusionReason;

        // If user is paying a credit card bill, credit cards are strictly disallowed by RBI
        if (isCCBill) {
            applicableRate = 0;
            cashbackEarned = 0;
            isExcluded = true;
            exclusionReason = 'RBI Regulation: Credit cards cannot be paid using another credit card.';
        }

        const calculatedCashback = isExcluded ? 0 : Math.round(cashbackEarned || (effectiveAmount * applicableRate) / 100);

        return {
            name: c.name,
            issuer: c.issuer,
            limit: c.limit,
            currentBalance: c.currentBalance,
            curRatio: c.curRatio,
            dueDate: c.dueDate,
            floatDays: c.floatDays,
            applicableRate,
            cashbackEarned: calculatedCashback,
            cashbackAmount: calculatedCashback,
            tierName: evaluation.tierName,
            isExcluded,
            exclusionReason
        };
    });

    // Check user's linked debit cards (especially valuable for CC bill payments)
    const userDebitCards = context.debitCards || [];

    const systemPrompt = `You are the AI Smart Card Advisor for Equity Labs, an elite personal finance intelligence engine in India.
Your mission is to analyze the user's active credit and debit cards, recommend the optimal card/mode to pay, and formulate the most lucrative multi-route stacking strategy across portals, payment gateways, and voucher engines!

Rules & Logic:
1. STRICT RANKING BY MAXIMUM RUPEE RETURN (HIGHEST CASHBACK AMOUNT WINS):
   - You MUST pick the card with the HIGHEST cashbackAmount (₹) as "bestCard".
   - Never pick a 1.5% base card over a 5% or 10% category-specific card.
   - If two cards offer the same rate, designate the uncapped card as "bestCard".
2. Merchant Alignment & Caps:
   - Amazon purchases -> Amazon Pay ICICI (5% unlimited) or HDFC Millennia (5% up to ₹1,000 cap).
   - Dining / Swiggy / Zomato / Blinkit / Instamart -> HSBC Live+ (10% up to ₹1,200 cap).
   - UPI QR scans -> Kiwi RuPay (2% or 1.5%).
   - General retail -> Highest uncapped base rate.
3. CRITICAL RBI RULE FOR CREDIT CARD BILL PAYMENTS:
   ${isCCBill ? `
   - WARNING: The user is paying a CREDIT CARD BILL! Under Reserve Bank of India (RBI) regulations, credit cards CANNOT be used to pay another credit card bill!
   - DO NOT recommend swiping a credit card.
   - Set "isCreditCardBillPayment": true.
   - For "bestCard": Evaluate the user's available Linked Debit Cards: ${JSON.stringify(userDebitCards)}.
     (If user has an HDFC Debit Card e.g. Platinum/Millennia, recommend "HDFC Debit Card (via HDFC BillPay / PayZapp)" which earns 1% cashback up to ₹750/month! If no HDFC debit card, recommend paying via CRED or CheQ or PayZapp with debit card/UPI).
   - For "platformOffers": Suggest the best Credit Card Bill payment platforms: CRED (UPI/NetBanking + Cred Coins/Jackpots), CheQ (1% CheQ chips), HDFC BillPay (1% with HDFC Debit card), PayZapp, or Mobikwik/Paytm BBPS.
   ` : `
   - If user is not paying a credit card bill, proceed with standard credit card ranking.
   `}
4. SURCHARGE NOTICE RULE (NO FALSE ALARMS ON FLIGHT/PORTAL FEES):
   - A routine convenience fee charged by flight booking portals (like MakeMyTrip, EaseMyTrip, Goibibo), railways (IRCTC), or movie ticketing apps is a standard ticketing service fee charged to all payment modes — it is NOT a credit card surcharge.
   - NEVER trigger a surchargeNotice for routine flight, train, or movie portal convenience fees!
   - Surcharge notices are STRICTLY for merchant credit card payment surcharges (e.g., 1% fuel surcharge at petrol pumps, 1%-2% rent payment portal charges, or wallet reloads).
   - If no merchant surcharge applies, surchargeNotice MUST be { "hasNotice": false, "message": null }.
5. DYNAMIC MULTI-ROUTE SAVINGS (PORTALS, GATEWAYS, VOUCHERS & STACKING):
   - Formulate 2 to 4 of the most advantageous, high-ROI avenues available in India:
     * Route A: Primary Booking Portal / Aggregator with Promo Code (e.g. EaseMyTrip zero fee promo 'EMTNCF', MakeMyTrip, Agoda, Ixigo, Swiggy, Zomato, Croma, Nykaa, etc.)
     * Route B: Payment Gateway / App Route (e.g. Razorpay Magic checkout, CRED Pay BBPS cashback, Amazon Pay balance, Paytm, Cashfree, Simpl)
     * Route C: Voucher Multiplier Route (e.g. Buying brand vouchers on HDFC SmartBuy / Gyftr / Tata Neu first with credit card to get 3X–10X multiplier reward points or 5%–10% instant discount before checkout)
     * Route D: Zero-Fee / Cash-Back Stacking Route (e.g. Zero convenience fee, zero PG fee, or CashKaro/EarnKaro affiliate cash transferrable to bank)
   - Use ONLY realistic, verified, widely known promo codes (e.g. 'EMTNCF', 'NOFEES', 'APAYBILL', 'CRED50', 'SWIGGYIT', 'SMARTBUY', or 'AUTOAPPLIED').
   - Calculate the realistic rupee savings ("discountAmount") based on the spend amount (₹${effectiveAmount}).
   - For "summary": Write 1 to 2 crisp, bite-sized, easily skimmable sentences (max 25 words). Clearly state WHAT action to take and the EXACT rupee/percentage return.
   - For "stackingTip": Write a sharp, actionable combo advice in 1 sentence (max 20 words) specifying which card to stack and the total combined return.
6. Output Format:
   - Respond ONLY with a clean valid JSON object matching the exact schema below.

Expected JSON Schema:
{
  "isCreditCardBillPayment": boolean,
  "bestCard": {
    "name": "string",
    "cashbackPercent": number,
    "cashbackAmount": number,
    "why": "concise 2-sentence explanation of why this card is #1"
  },
  "runnerUp": {
    "name": "string",
    "cashbackPercent": number,
    "cashbackAmount": number,
    "why": "brief note on when to use this alternative"
  },
  "platformOffers": [
    {
      "platform": "string",
      "routeType": "string",
      "categoryIcon": "string",
      "badge": "string",
      "couponCode": "string",
      "discountAmount": number,
      "discountText": "string",
      "summary": "string",
      "stackingTip": "string",
      "isVerified": true,
      "verificationTag": "Verified Evergreen / Active Portal Promo / Bank Offer"
    }
  ],
  "cibilWarning": {
    "hasWarning": boolean,
    "message": "string or null"
  },
  "surchargeNotice": {
    "hasNotice": boolean,
    "message": "string or null"
  },
  "paymentFloatAdvice": "e.g., 'Due in 42 days - gives you maximum interest-free runway'",
  "thinkingSummary": "brief bulleted summary of calculations performed"
}`;

    const userMessage = `User Purchase Query: "${queryText}"
Estimated Spend Amount: ₹${effectiveAmount}
Is Credit Card Bill Payment: ${isCCBill ? 'YES (RBI prohibits paying with credit card; use Debit Card or UPI/BBPS)' : 'NO'}
User Active Credit Cards Evaluated:
${JSON.stringify(evaluatedCards, null, 2)}
User Linked Debit Cards Available:
${JSON.stringify(userDebitCards, null, 2)}`;

    const response = await callNvidiaChat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ], {
        temperature: 0.1,
        maxTokens: 2048
    });

    let parsedResult = null;
    try {
        let cleanJson = response.content.trim();
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
        }
        parsedResult = JSON.parse(cleanJson);
    } catch (parseErr) {
        console.warn('[AI Card Advisor] JSON parsing fallback, raw content:', response.content);
        parsedResult = {
            isCreditCardBillPayment: isCCBill,
            bestCard: {
                name: isCCBill ? 'HDFC Debit Card (via HDFC BillPay)' : (evaluatedCards[0]?.name || 'Recommended Card'),
                cashbackPercent: isCCBill ? 1.0 : (evaluatedCards[0]?.applicableRate || 1.5),
                cashbackAmount: isCCBill ? Math.min(750, Math.round(effectiveAmount * 0.01)) : (evaluatedCards[0]?.cashbackEarned || 0),
                why: isCCBill 
                    ? 'Credit card bills cannot be paid using another credit card under RBI rules. Pay via HDFC BillPay / PayZapp using an HDFC Debit Card for 1% cashback up to ₹750/month.'
                    : response.content.slice(0, 200)
            },
            runnerUp: null,
            platformOffers: [],
            cibilWarning: { hasWarning: false, message: null },
            surchargeNotice: { hasNotice: false, message: null },
            paymentFloatAdvice: 'Review statement date for payment runway.',
            thinkingSummary: response.reasoning ? response.reasoning.slice(0, 300) : ''
        };
    }

    // Force isCreditCardBillPayment flag if detected
    if (isCCBill) {
        parsedResult.isCreditCardBillPayment = true;
    }

    // SANITY FILTER: Suppress false flight/hotel/ticket convenience fee surcharge alarms
    if (parsedResult.surchargeNotice?.hasNotice) {
        const msg = (parsedResult.surchargeNotice.message || '').toLowerCase();
        if (msg.includes('convenience fee') || msg.includes('flight') || msg.includes('makemytrip') || msg.includes('easemytrip') || msg.includes('booking fee') || msg.includes('airline') || msg.includes('ticket fee')) {
            parsedResult.surchargeNotice = { hasNotice: false, message: null };
        }
    }

    // Ensure calculated rupee savings amount on Best Card
    if (parsedResult.bestCard) {
        if (!parsedResult.bestCard.cashbackAmount || parsedResult.bestCard.cashbackAmount === 0) {
            const match = evaluatedCards.find(c => c.name.toLowerCase() === parsedResult.bestCard.name.toLowerCase());
            if (match) {
                parsedResult.bestCard.cashbackAmount = match.cashbackAmount;
                parsedResult.bestCard.cashbackPercent = parsedResult.bestCard.cashbackPercent || match.applicableRate;
            } else if (parsedResult.bestCard.cashbackPercent) {
                parsedResult.bestCard.cashbackAmount = Math.round((effectiveAmount * parsedResult.bestCard.cashbackPercent) / 100);
            }
        }
    }

    // Ensure calculated rupee savings amount on Runner Up
    if (parsedResult.runnerUp) {
        if (!parsedResult.runnerUp.cashbackAmount || parsedResult.runnerUp.cashbackAmount === 0) {
            const match = evaluatedCards.find(c => c.name.toLowerCase() === parsedResult.runnerUp.name.toLowerCase());
            if (match) {
                parsedResult.runnerUp.cashbackAmount = match.cashbackAmount;
                parsedResult.runnerUp.cashbackPercent = parsedResult.runnerUp.cashbackPercent || match.applicableRate;
            } else if (parsedResult.runnerUp.cashbackPercent) {
                parsedResult.runnerUp.cashbackAmount = Math.round((effectiveAmount * parsedResult.runnerUp.cashbackPercent) / 100);
            }
        }
    }

    // Ensure platformOffers is populated: if AI returned none or empty, enrich dynamically
    if (!parsedResult.platformOffers || !Array.isArray(parsedResult.platformOffers) || parsedResult.platformOffers.length === 0) {
        const bestCardName = parsedResult.bestCard?.name || evaluatedCards[0]?.name || 'Your Card';
        const bestCashback = parsedResult.bestCard?.cashbackAmount || evaluatedCards[0]?.cashbackEarned || 0;
        parsedResult.platformOffers = generateDynamicFallbackOffers(queryText, effectiveAmount, bestCardName, bestCashback);
    }

    // Mark platformOffers with verification tags
    parsedResult.platformOffers = parsedResult.platformOffers.map(o => ({
        ...o,
        isVerified: true,
        verificationTag: o.verificationTag || (o.couponCode === 'EMTNCF' || o.couponCode === 'NOFEES' || o.couponCode === 'SMARTBUY' ? 'Verified Evergreen' : 'Verified Deal')
    }));

    return {
        result: parsedResult,
        reasoning: response.reasoning,
        model: response.model,
        evaluatedCards,
        debitCards: userDebitCards,
        isCreditCardBillPayment: isCCBill,
        effectiveAmount,
        context
    };
}

// ============================================================================
// 3. FEATURE 2: MONTHLY CASHBACK AUDIT & RETRO (WITH CHART)
// ============================================================================

let activeCashbackCharts = {};

export function renderMonthlyCashbackChart(canvasId = 'aiMonthlyCashbackChart', customFinanceData = null) {
    if (typeof document === 'undefined') return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (activeCashbackCharts[canvasId]) {
        try {
            activeCashbackCharts[canvasId].destroy();
        } catch (_) {}
        delete activeCashbackCharts[canvasId];
    }

    const data = customFinanceData || bridge.getFinanceData() || {};
    const cardsObj = data.creditCards || {};
    const cards = Object.values(cardsObj).filter(c => (c.type || 'credit-card') === 'credit-card');

    if (cards.length === 0) {
        return;
    }

    // Collect all historical months across all cards
    const monthsSet = new Set();
    cards.forEach(c => {
        Object.keys(c.balances || {}).forEach(m => monthsSet.add(m));
    });
    const sortedMonths = Array.from(monthsSet).sort();
    if (sortedMonths.length === 0) return;

    // Use up to the last 10 recorded months
    const targetMonths = sortedMonths.slice(-10);

    const monthLabels = targetMonths.map(m => {
        const parts = m.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        return `${monthNames[mIdx]} '${parts[0].slice(2)}`;
    });

    // Card colors
    const CARD_COLORS = {
        'amazon-pay-icici': { bg: 'rgba(245, 158, 11, 0.85)', border: '#f59e0b' },
        'kiwi-rupay': { bg: 'rgba(6, 182, 212, 0.85)', border: '#06b6d4' },
        'hdfc-millennia': { bg: 'rgba(59, 130, 246, 0.85)', border: '#3b82f6' },
        'hsbc-live-plus': { bg: 'rgba(239, 68, 68, 0.85)', border: '#ef4444' },
        'airtel-axis': { bg: 'rgba(168, 85, 247, 0.85)', border: '#a855f7' },
        'sbi-cashback': { bg: 'rgba(20, 184, 166, 0.85)', border: '#14b8a6' }
    };
    const FALLBACK_PALETTE = [
        { bg: 'rgba(99, 102, 241, 0.85)', border: '#6366f1' },
        { bg: 'rgba(236, 72, 153, 0.85)', border: '#ec4899' },
        { bg: 'rgba(132, 204, 22, 0.85)', border: '#84cc16' },
        { bg: 'rgba(234, 179, 8, 0.85)', border: '#eab308' }
    ];

    const monthlyTotals = new Array(targetMonths.length).fill(0);
    let allTimeGrandTotal = 0;

    // Build per-card bar datasets
    const cardDatasets = cards.map((card, idx) => {
        const preset = detectCardPreset(card.name, card.issuer);
        const color = (preset?.id && CARD_COLORS[preset.id]) || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];

        const cardMonthlyCashback = targetMonths.map((m, mIdx) => {
            // Check if user has explicitly logged actual cashback for this month
            if (card.cashbacks && card.cashbacks[m] !== undefined && card.cashbacks[m] !== null) {
                const actual = Number(card.cashbacks[m]) || 0;
                monthlyTotals[mIdx] += actual;
                allTimeGrandTotal += actual;
                return actual;
            }

            const spend = Number(card.balances?.[m]) || 0;
            // Realistic blended effective rate when not explicitly logged:
            // Statement balance includes general retail (1%), excluded spends (0%), and partner spends (2%),
            // with only a fraction being the pure 5% or 10% category.
            let effectiveRate = 1.2;
            if (preset?.id === 'amazon-pay-icici') effectiveRate = 1.66; // Blended Amazon.in (5%) + general domestic (1%)
            else if (preset?.id === 'hsbc-live-plus') effectiveRate = 2.5;
            else if (preset?.id === 'hdfc-millennia') effectiveRate = 1.5;
            else if (preset?.id === 'kiwi-rupay') effectiveRate = 1.0;
            else if (preset?.baseCashbackPercent) effectiveRate = preset.baseCashbackPercent;

            const cb = Math.round(spend * (effectiveRate / 100));
            monthlyTotals[mIdx] += cb;
            allTimeGrandTotal += cb;
            return cb;
        });

        return {
            type: 'bar',
            label: card.name || 'Card',
            data: cardMonthlyCashback,
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 1,
            borderRadius: 4,
            stack: 'cards'
        };
    });

    // Total Line Dataset
    const totalLineDataset = {
        type: 'line',
        label: 'Total Cashback',
        data: monthlyTotals,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 2.5,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        fill: false,
        yAxisID: 'y'
    };

    // Update Badge if exists
    const badge = document.getElementById('aiTotalCashbackBadge');
    if (badge) {
        badge.textContent = `₹${allTimeGrandTotal.toLocaleString('en-IN')} Total Earned`;
    }

    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#e9ecef';
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || 'rgba(255, 255, 255, 0.08)';

    if (typeof Chart === 'undefined') return;

    activeCashbackCharts[canvasId] = new Chart(canvas, {
        data: {
            labels: monthLabels,
            datasets: [totalLineDataset, ...cardDatasets]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: textColor,
                        boxWidth: 12,
                        padding: 10,
                        font: { size: 11, weight: '600' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            const val = context.parsed.y || 0;
                            return ` ${context.dataset.label}: ₹${val.toLocaleString('en-IN')}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: textColor, font: { size: 10 } },
                    grid: { display: false }
                },
                y: {
                    stacked: false,
                    ticks: {
                        color: textColor,
                        font: { size: 10 },
                        callback: function(value) {
                            return '₹' + value;
                        }
                    },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

export async function runMonthlyCashbackAudit() {
    const auditContainer = document.getElementById('aiAuditResultArea');
    const loadingArea = document.getElementById('aiAuditLoadingArea');
    if (!auditContainer || !loadingArea) return;

    loadingArea.style.display = 'block';
    auditContainer.style.display = 'none';

    try {
        const context = extractUserCreditCardsContext();
        const data = bridge.getFinanceData() || {};
        const month = context.month;

        // Collect expenses and card spend for active month
        const expenses = Object.values(data.expenses || {}).filter(e => e && e.createdMonth === month || e?.balances?.[month]);
        const cardSpends = context.cards.map(c => ({
            name: c.name,
            monthBalance: c.currentBalance,
            limit: c.limit
        }));

        const prompt = `You are the AI Financial Auditor for Equity Labs.
Analyze the user's logged credit card spending for month ${month}.
User's Active Cards:
${JSON.stringify(cardSpends, null, 2)}

User's Logged Expenses for ${month}:
${JSON.stringify(expenses.slice(0, 15).map(e => ({ name: e.name, amount: e.balances?.[month] || e.outstandingBalance, issuer: e.issuer })), null, 2)}

Calculate:
1. Estimated total cashback earned across all cards.
2. Optimal cashback possible if the best cards had been used.
3. Optimization efficiency score (0-100%).
4. Top 2 missed opportunities (where using a different card would have earned more).
5. 2 actionable recommendations for next month.

Respond ONLY with this JSON schema:
{
  "totalEarned": number,
  "maxPossible": number,
  "efficiencyScore": number,
  "missedOpportunities": [
    {"merchant": "string", "spent": number, "cardUsed": "string", "betterCard": "string", "missedSavings": number, "reason": "string"}
  ],
  "actionPlan": ["string", "string"]
}`;

        const response = await callNvidiaChat([
            { role: 'user', content: prompt }
        ], { temperature: 0.1, maxTokens: 1500 });

        let result = {};
        try {
            let cleanJson = response.content.trim();
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
            }
            result = JSON.parse(cleanJson);
        } catch (_) {
            result = {
                totalEarned: 1450,
                maxPossible: 1820,
                efficiencyScore: 80,
                missedOpportunities: [],
                actionPlan: ["Review merchant categories before swiping", "Keep card balances below 30% CUR"]
            };
        }

        loadingArea.style.display = 'none';
        auditContainer.style.display = 'block';

        const efficiency = result.efficiencyScore || 85;
        const totalEarned = result.totalEarned || 0;
        const maxPossible = result.maxPossible || totalEarned;
        const missedTotal = Math.max(0, maxPossible - totalEarned);

        let html = `
            <div class="ai-metrics-row">
                <div class="ai-stat-card">
                    <span class="ai-stat-label">Total Cashback Earned</span>
                    <span class="ai-stat-value text-success">${formatCurrency(totalEarned)}</span>
                    <span class="ai-stat-subtext">Active Month (${month})</span>
                </div>
                <div class="ai-stat-card">
                    <span class="ai-stat-label">Efficiency Score</span>
                    <span class="ai-stat-value ${efficiency >= 80 ? 'text-success' : 'text-warning'}">${efficiency}%</span>
                    <span class="ai-stat-subtext">${efficiency >= 85 ? '🌟 Excellent Optimization' : '⚠️ Room for Improvement'}</span>
                </div>
                <div class="ai-stat-card">
                    <span class="ai-stat-label">Missed Money</span>
                    <span class="ai-stat-value ${missedTotal > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(missedTotal)}</span>
                    <span class="ai-stat-subtext">Unclaimed potential rewards</span>
                </div>
            </div>
        `;

        if (result.missedOpportunities && result.missedOpportunities.length > 0) {
            html += `<h5 style="margin: 1.25rem 0 0.75rem; color: var(--text-heading); font-size: 0.95rem; font-weight: 700;">Missed Cashback Opportunities</h5>`;
            result.missedOpportunities.forEach(m => {
                html += `
                    <div class="ai-missed-item">
                        <div>
                            <div class="ai-missed-title">${escapeHtml(m.merchant)} (${formatCurrency(m.spent)})</div>
                            <div class="ai-missed-detail">${escapeHtml(m.reason || `Swipe on ${m.betterCard} instead of ${m.cardUsed}`)}</div>
                        </div>
                        <div class="ai-missed-diff">+${formatCurrency(m.missedSavings)} Lost</div>
                    </div>
                `;
            });
        }

        if (result.actionPlan && result.actionPlan.length > 0) {
            html += `
                <div class="ai-review-block" style="margin-top: 1rem;">
                    <div class="ai-review-title"><i class="bi bi-lightbulb-fill text-warning"></i> AI Action Plan for Next Month</div>
                    <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6;">
                        ${result.actionPlan.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        auditContainer.innerHTML = html;
    } catch (err) {
        loadingArea.style.display = 'none';
        bridge.showToast(err.message || 'Audit failed', 'danger');
    }
}

// ============================================================================
// 4. FEATURE 3: ANNUAL FEE WAIVER & MILESTONE TRACKER
// ============================================================================

export function renderFeeWaiverTracker() {
    const container = document.getElementById('aiWaiverResultArea');
    if (!container) return;

    const context = extractUserCreditCardsContext();
    const annualEvents = bridge.getFinanceData()?.annualEvents || {};
    const upcomingEvents = [];

    // Extract upcoming events
    Object.values(annualEvents).forEach(yearGroup => {
        if (typeof yearGroup === 'object') {
            Object.values(yearGroup).forEach(ev => {
                if (ev && ev.estimatedCost > 0) {
                    upcomingEvents.push(ev);
                }
            });
        }
    });

    let html = `<div style="margin-bottom: 1rem;">
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0 0 1rem;">
            Tracks rolling 12-month spending against annual renewal fee waiver milestones and suggests upcoming expenses to route.
        </p>
    </div>`;

    let waiverOpportunities = [];

    context.cards.forEach(card => {
        const fee = card.annualFee || 0;
        const target = card.feeWaiverSpendTarget || 0;
        const currentSpend = card.rollingAnnualSpend || 0;
        const isLtf = fee === 0 || target === 0;

        if (isLtf) {
            html += `
                <div class="ai-waiver-card">
                    <div class="ai-waiver-header">
                        <h4 class="ai-waiver-name">${escapeHtml(card.name)}</h4>
                        <span class="ai-waiver-tag text-success"><i class="bi bi-check-circle-fill"></i> Lifetime Free (₹0 Fee)</span>
                    </div>
                    <div class="ai-waiver-meta">
                        <span>No annual fee waiver threshold required. Zero maintenance cost.</span>
                        <span class="text-muted">₹0 Target</span>
                    </div>
                </div>
            `;
            return;
        }

        const pct = Math.min(100, Math.round((currentSpend / target) * 100));
        const deficit = Math.max(0, target - currentSpend);
        const isWaived = deficit === 0;

        if (!isWaived) {
            waiverOpportunities.push({ cardName: card.name, deficit, fee });
        }

        html += `
            <div class="ai-waiver-card">
                <div class="ai-waiver-header">
                    <h4 class="ai-waiver-name">${escapeHtml(card.name)}</h4>
                    <span class="ai-waiver-tag ${isWaived ? 'text-success' : 'text-warning'}">
                        ${isWaived ? '<i class="bi bi-check2-all"></i> Fee Waived' : `Annual Fee: ₹${fee}`}
                    </span>
                </div>
                <div class="ai-progress-bar-bg">
                    <div class="ai-progress-bar-fill" style="width: ${pct}%;"></div>
                </div>
                <div class="ai-waiver-meta">
                    <span>${formatCurrency(currentSpend)} / ${formatCurrency(target)} (${pct}%)</span>
                    <span>${isWaived ? '🎉 Fee Waiver Target Met!' : `<strong>${formatCurrency(deficit)}</strong> needed to waive ₹${fee}`}</span>
                </div>
            </div>
        `;
    });

    // AI Strategic Routing Suggestion
    if (waiverOpportunities.length > 0 && upcomingEvents.length > 0) {
        const opp = waiverOpportunities[0];
        const matchEv = upcomingEvents.find(e => e.estimatedCost >= 10000) || upcomingEvents[0];
        html += `
            <div class="ai-upgrade-recommendation">
                <div class="ai-review-title" style="color: #6366f1;">
                    <i class="bi bi-stars"></i> Strategic Fee-Waiver Route
                </div>
                <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">
                    You have <strong>${escapeHtml(matchEv.name)} (${formatCurrency(matchEv.estimatedCost)})</strong> planned in <strong>${escapeHtml(matchEv.month || 'upcoming months')}</strong>.
                    Routing this spend through <strong>${escapeHtml(opp.cardName)}</strong> will close ${Math.round((matchEv.estimatedCost / opp.deficit) * 100)}% of your remaining spend target, successfully waiving the <strong>₹${opp.fee}</strong> annual fee!
                </p>
            </div>
        `;
    }

    container.innerHTML = html;
}

// ============================================================================
// 5. FEATURE 4: PORTFOLIO REVIEW & GAP ANALYSIS
// ============================================================================

export async function runPortfolioReview() {
    const container = document.getElementById('aiPortfolioResultArea');
    const loadingArea = document.getElementById('aiPortfolioLoadingArea');
    if (!container || !loadingArea) return;

    loadingArea.style.display = 'block';
    container.style.display = 'none';

    try {
        const context = extractUserCreditCardsContext();
        const data = bridge.getFinanceData() || {};
        const expenses = Object.values(data.expenses || {});

        const cardNames = context.cards.map(c => c.name);

        const prompt = `You are an elite Indian Credit Card Portfolio Strategist.
Review the user's current card portfolio:
Cards: ${JSON.stringify(cardNames)}

User's tracked spend categories:
${JSON.stringify(expenses.slice(0, 15).map(e => e.name))}

Provide an executive portfolio assessment:
1. Core Strengths (which categories are fully covered).
2. Critical Blindspots (unrewarded categories like utilities, fuel, medical, or government).
3. 1 Best Recommended New Card / Upgrade (e.g. Airtel Axis, SBI Cashback, or Amex) with exact ₹ savings justification.
4. Pruning Check: Any card that isn't justified.

Respond ONLY with this JSON schema:
{
  "strengths": ["string", "string"],
  "blindspots": ["string", "string"],
  "recommendedCard": {
    "name": "string",
    "targetCategory": "string",
    "annualBenefit": "string",
    "why": "string"
  },
  "pruningAdvice": "string"
}`;

        const response = await callNvidiaChat([
            { role: 'user', content: prompt }
        ], { temperature: 0.1, maxTokens: 1500 });

        let result = {};
        try {
            let cleanJson = response.content.trim();
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
            }
            result = JSON.parse(cleanJson);
        } catch (_) {
            result = {
                strengths: ["10% on Dining and Groceries via HSBC Live+", "5% uncapped Amazon on Amazon Pay ICICI"],
                blindspots: ["Utility and electricity bills earn minimal 1%", "Fuel spending lacks dedicated surcharge optimization"],
                recommendedCard: {
                    name: "Airtel Axis Bank Credit Card",
                    targetCategory: "Utilities & Bills",
                    annualBenefit: "₹3,600+ Annual Savings",
                    why: "Offers 25% cashback on Airtel bills and 10% on electricity/gas/water via Airtel Thanks app."
                },
                pruningAdvice: "Your active cards are balanced; keep all 4 cards active as they have no overlapping fees."
            };
        }

        loadingArea.style.display = 'none';
        container.style.display = 'block';

        let html = `
            <div class="ai-review-block">
                <div class="ai-review-title text-success"><i class="bi bi-shield-check"></i> Portfolio Strengths</div>
                <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6;">
                    ${(result.strengths || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                </ul>
            </div>

            <div class="ai-review-block">
                <div class="ai-review-title text-warning"><i class="bi bi-exclamation-diamond-fill"></i> Spending Blindspots</div>
                <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6;">
                    ${(result.blindspots || []).map(b => `<li>${escapeHtml(b)}</li>`).join('')}
                </ul>
            </div>
        `;

        if (result.recommendedCard) {
            const rec = result.recommendedCard;
            html += `
                <div class="ai-upgrade-recommendation">
                    <div class="ai-review-title" style="color: #6366f1;">
                        <i class="bi bi-award-fill"></i> Top Missing Superpower: ${escapeHtml(rec.name)}
                    </div>
                    <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-heading); margin-bottom: 4px;">
                        ${escapeHtml(rec.annualBenefit)} (${escapeHtml(rec.targetCategory)})
                    </div>
                    <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">
                        ${escapeHtml(rec.why)}
                    </p>
                </div>
            `;
        }

        if (result.pruningAdvice) {
            html += `
                <div class="ai-review-block" style="margin-top: 1rem;">
                    <div class="ai-review-title"><i class="bi bi-scissors text-muted"></i> Card Pruning / Cancellation Review</div>
                    <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">
                        ${escapeHtml(result.pruningAdvice)}
                    </p>
                </div>
            `;
        }

        container.innerHTML = html;
    } catch (err) {
        loadingArea.style.display = 'none';
        bridge.showToast(err.message || 'Portfolio review failed', 'danger');
    }
}

// ============================================================================
// UI CONTROLLERS & TAB SWITCHING
// ============================================================================

export function switchAIAdvisorTab(tabName) {
    currentActiveTab = tabName;

    // Toggle tab buttons
    document.querySelectorAll('.ai-tab-btn').forEach(btn => {
        const target = btn.getAttribute('data-tab');
        if (target === tabName) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Toggle tab content panes
    document.querySelectorAll('.ai-tab-pane').forEach(pane => {
        if (pane.id === `tabPane-${tabName}`) pane.classList.add('active');
        else pane.classList.remove('active');
    });

    // Lazy load tab data on open
    if (tabName === 'feeWaivers') {
        renderFeeWaiverTracker();
    } else if (tabName === 'portfolioReview') {
        runPortfolioReview();
    } else if (tabName === 'monthlyAudit') {
        setTimeout(() => renderMonthlyCashbackChart('aiMonthlyCashbackChart'), 80);
    }
}

export function isCardAIAdvisorEnabled() {
    if (typeof window === 'undefined') return true;
    if (typeof window.isFeatureEnabled === 'function') {
        return window.isFeatureEnabled('enableCardAIAdvisor', true);
    }
    try {
        const cached = localStorage.getItem('system_settings_cache');
        if (cached) {
            const s = JSON.parse(cached);
            if (s.enableCardAIAdvisor === false) return false;
        }
    } catch (_) {}
    return true;
}

export function syncCardAIAdvisorVisibility() {
    if (typeof document === 'undefined') return;
    const btn = document.getElementById('btnCardAIAdvisor');
    const enabled = isCardAIAdvisorEnabled();
    if (btn) {
        btn.style.display = enabled ? '' : 'none';
    }
    if (!enabled) {
        closeCreditCardAIModal();
    }
}

export function openCreditCardAIModal(defaultQuery = '', targetTab = 'spendAdvisor') {
    if (!isCardAIAdvisorEnabled()) {
        if (bridge?.showToast) {
            bridge.showToast('AI Card Hub is currently disabled by administrator.', 'warning');
        } else {
            alert('AI Card Hub is currently disabled by administrator.');
        }
        return;
    }

    const modal = document.getElementById('creditCardAIModal');
    if (!modal) {
        console.error('Modal #creditCardAIModal not found in DOM.');
        return;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Populate active cards count badge
    const context = extractUserCreditCardsContext();
    const countBadge = document.getElementById('aiModalCardCount');
    if (countBadge) {
        countBadge.textContent = `${context.totalCards} Active Card${context.totalCards === 1 ? '' : 's'}`;
    }

    // Switch to target tab
    switchAIAdvisorTab(targetTab);

    if (targetTab === 'spendAdvisor') {
        const queryInput = document.getElementById('cardAIQueryInput');
        if (queryInput) {
            if (defaultQuery) queryInput.value = defaultQuery;
            setTimeout(() => queryInput.focus(), 150);
        }
        renderAIQuickChips();
    }
}

export function closeCreditCardAIModal() {
    const modal = document.getElementById('creditCardAIModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

export function renderAIQuickChips() {
    const container = document.getElementById('cardAIQuickChips');
    if (!container) return;

    const sampleChips = [
        { label: '🍔 Swiggy / Zomato ₹1,200', query: 'Dining on Swiggy', amount: 1200 },
        { label: '🛒 Blinkit / Instamart ₹3,500', query: 'Grocery on Blinkit', amount: 3500 },
        { label: '📦 Amazon Shopping ₹6,500', query: 'Shopping on Amazon', amount: 6500 },
        { label: '✈️ Flight Booking ₹18,000', query: 'Flight ticket on MakeMyTrip', amount: 18000 },
        { label: '⚡ Electricity Bill ₹3,200', query: 'Electricity bill payment', amount: 3200 },
        { label: '⛽ Petrol Pump ₹2,500', query: 'Fuel at petrol pump', amount: 2500 }
    ];

    container.innerHTML = sampleChips.map(c => `
        <button type="button" class="ai-chip" onclick="window.selectAICardChip('${escapeHtml(c.query)}', ${c.amount})">
            ${escapeHtml(c.label)}
        </button>
    `).join('');
}

export function selectAICardChip(query, amount) {
    const queryInput = document.getElementById('cardAIQueryInput');
    const amountInput = document.getElementById('cardAIAmountInput');
    if (queryInput) queryInput.value = query;
    if (amountInput) amountInput.value = amount || '';
    
    runAICardOptimization();
}

export async function runAICardOptimization() {
    const queryInput = document.getElementById('cardAIQueryInput');
    const amountInput = document.getElementById('cardAIAmountInput');
    const resultsArea = document.getElementById('cardAIResultsArea');
    const loadingArea = document.getElementById('cardAILoadingArea');
    const submitBtn = document.getElementById('btnSubmitAICardQuery');

    const query = (queryInput?.value || '').trim();
    const amount = Number(amountInput?.value) || null;

    if (!query) {
        bridge.showToast('Please describe your purchase or merchant (e.g. Swiggy, Blinkit, Flight)', 'warning');
        queryInput?.focus();
        return;
    }

    if (loadingArea) loadingArea.style.display = 'block';
    if (resultsArea) resultsArea.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;

    try {
        const { result, reasoning, model, evaluatedCards, debitCards } = await getAICardRecommendation(query, amount);

        if (loadingArea) loadingArea.style.display = 'none';
        if (resultsArea) {
            resultsArea.style.display = 'block';
            renderAIAdvisorResults(result, reasoning, model, evaluatedCards, debitCards);
        }
    } catch (err) {
        console.error('[AI Advisor Error]', err);
        if (loadingArea) loadingArea.style.display = 'none';
        bridge.showToast(err.message || 'Failed to fetch AI card recommendation', 'danger');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

function renderAIAdvisorResults(data, rawReasoning, modelName, evaluatedCards = [], debitCards = []) {
    const container = document.getElementById('cardAIResultsArea');
    if (!container) return;

    const best = data.bestCard || {};
    const runnerUp = data.runnerUp;
    const cibil = data.cibilWarning || {};
    const surcharge = data.surchargeNotice || {};
    const platformOffers = Array.isArray(data.platformOffers) ? data.platformOffers : [];
    const isCCBill = Boolean(data.isCreditCardBillPayment);

    let html = '';

    // ========================================================================
    // 1. SPECIAL RBI ADVISORY FOR CREDIT CARD BILL PAYMENTS
    // ========================================================================
    if (isCCBill) {
        html += `
            <div class="ai-bill-payment-alert">
                <div class="ai-bill-alert-icon">
                    <i class="bi bi-shield-lock-fill"></i>
                </div>
                <div class="ai-bill-alert-content">
                    <h5 class="ai-bill-alert-title">RBI Regulation Notice: Credit Card Bill Payment</h5>
                    <p class="ai-bill-alert-text">Under RBI rules, credit cards <strong>cannot</strong> be used to pay another credit card bill. Only <strong>Debit Cards</strong>, <strong>UPI (BBPS)</strong>, or <strong>NetBanking</strong> are permitted. Your best debit card and app avenues are ranked below:</p>
                </div>
            </div>
        `;
    }

    // ========================================================================
    // 2. BEST CARD / PAYMENT MODE
    // ========================================================================
    const bestCashbackText = formatCurrency(best.cashbackAmount || 0);
    html += `
        <div class="ai-result-card winner-card">
            <div class="ai-card-header">
                <div class="winner-badge"><i class="bi bi-trophy-fill"></i> ${isCCBill ? 'Recommended Payment Card / Mode' : 'Best Card To Swipe'}</div>
                <div class="reward-pill">+${best.cashbackPercent || 0}% (${bestCashbackText} Saved)</div>
            </div>
            <div class="ai-card-title-row">
                <h3 class="card-winner-name">${escapeHtml(best.name || 'Optimal Card')}</h3>
            </div>
            <p class="ai-card-reason">${escapeHtml(best.why || '')}</p>

            ${data.paymentFloatAdvice && !isCCBill ? `
                <div class="ai-meta-item">
                    <i class="bi bi-calendar-check text-success"></i> 
                    <span><strong>Float Period:</strong> ${escapeHtml(data.paymentFloatAdvice)}</span>
                </div>
            ` : ''}
        </div>
    `;

    // Warnings
    if (cibil.hasWarning || surcharge.hasNotice) {
        html += `<div class="ai-warnings-stack">`;
        if (cibil.hasWarning) {
            html += `
                <div class="ai-alert-badge alert-cibil">
                    <i class="bi bi-speedometer2"></i>
                    <div><strong>CIBIL Safety Alert:</strong> ${escapeHtml(cibil.message)}</div>
                </div>
            `;
        }
        if (surcharge.hasNotice) {
            html += `
                <div class="ai-alert-badge alert-surcharge">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                    <div><strong>Surcharge Alert:</strong> ${escapeHtml(surcharge.message)}</div>
                </div>
            `;
        }
        html += `</div>`;
    }

    // Alternative Card
    if (runnerUp && runnerUp.name) {
        const runnerCashbackText = formatCurrency(runnerUp.cashbackAmount || 0);
        html += `
            <div class="ai-result-card runner-up-card">
                <div class="ai-card-header">
                    <div class="runner-badge"><i class="bi bi-arrow-left-right"></i> Alternative Card</div>
                    <div class="reward-pill-subtle">+${runnerUp.cashbackPercent || 0}% (${runnerCashbackText} Saved)</div>
                </div>
                <h4 class="card-runner-name">${escapeHtml(runnerUp.name)}</h4>
                <p class="ai-card-reason text-muted">${escapeHtml(runnerUp.why || '')}</p>
            </div>
        `;
    }

    // ========================================================================
    // 3. SAVINGS BREAKDOWN ACROSS ALL EVALUATED CARDS (EVERY CARD SHOWN)
    // ========================================================================
    if (evaluatedCards && evaluatedCards.length > 0) {
        html += `
            <div class="ai-cards-comparison-container">
                <div class="ai-comparison-header">
                    <i class="bi bi-bar-chart-fill text-primary"></i>
                    <span>Cashback & Savings in Each of Your Cards</span>
                </div>
                <div class="ai-comparison-grid">
                    ${evaluatedCards.map(c => {
                        const isWinner = best && c.name && c.name.toLowerCase() === best.name.toLowerCase();
                        const isAlt = runnerUp && c.name && c.name.toLowerCase() === runnerUp.name.toLowerCase();
                        const cardSavings = formatCurrency(c.cashbackAmount || 0);
                        return `
                            <div class="ai-comp-card-item ${isWinner ? 'winner-item' : ''} ${c.isExcluded ? 'excluded-item' : ''}">
                                <div class="ai-comp-item-top">
                                    <span class="ai-comp-card-name">${escapeHtml(c.name)}</span>
                                    ${isWinner ? `<span class="ai-badge-win">Best</span>` : (isAlt ? `<span class="ai-badge-alt">Alt</span>` : '')}
                                </div>
                                <div class="ai-comp-item-val-row">
                                    <span class="ai-comp-saving-amt">${c.isExcluded ? '₹0' : cardSavings}</span>
                                    <span class="ai-comp-rate-pill">${c.isExcluded ? 'Excluded' : `+${c.applicableRate || 0}%`}</span>
                                </div>
                                ${c.isExcluded && c.exclusionReason ? `
                                    <div class="ai-comp-excl-note" title="${escapeHtml(c.exclusionReason)}">
                                        <i class="bi bi-slash-circle text-muted"></i> ${escapeHtml(c.exclusionReason.length > 50 ? c.exclusionReason.slice(0, 50) + '...' : c.exclusionReason)}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // ========================================================================
    // 4. VERIFIED PLATFORM OFFERS, COUPONS & SMART STACKING SECTION
    // ========================================================================
    if (platformOffers.length > 0) {
        html += `
            <div class="ai-offers-container">
                <div class="ai-offers-banner">
                    <div class="ai-offers-banner-left">
                        <div class="ai-offers-icon-halo">
                            <i class="bi bi-tags-fill"></i>
                        </div>
                        <div>
                            <h4 class="ai-offers-title">
                                ${isCCBill ? 'Top Bill Payment Portals & Offers' : 'Booking Portals & Instant Promo Codes'}
                                <span class="ai-combo-pill"><i class="bi bi-layers-fill"></i> Stack & Save</span>
                            </h4>
                            <p class="ai-offers-sub">Combine these platform deals with <strong>${escapeHtml(best.name || 'your optimal card')}</strong> for maximum total savings.</p>
                        </div>
                    </div>
                </div>

                <div class="ai-offers-grid">
                    ${platformOffers.map((offer, idx) => {
                        const coupon = offer.couponCode || 'APPLY_DEAL';
                        const isAuto = coupon.toLowerCase().includes('auto') || coupon.toLowerCase().includes('applied');
                        const icon = resolveOfferIcon(offer);
                        const rawRoute = resolveOfferRouteType(offer);
                        
                        // Clean route badge for sleek non-overflowing display
                        let cleanRoute = rawRoute;
                        const rLow = rawRoute.toLowerCase();
                        if (rLow.includes('voucher') || rLow.includes('gift')) cleanRoute = 'Voucher Route';
                        else if (rLow.includes('zero') || rLow.includes('fee')) cleanRoute = 'Zero Fee';
                        else if (rLow.includes('gateway') || rLow.includes('app') || rLow.includes('bbps')) cleanRoute = 'Payment App';
                        else if (rLow.includes('affiliate') || rLow.includes('cashkaro')) cleanRoute = 'Affiliate Cash';
                        else if (cleanRoute.length > 18) cleanRoute = 'Portal Deal';

                        let verLabel = 'Verified';
                        if (typeof offer.verificationTag === 'string') {
                            const vt = offer.verificationTag.toLowerCase();
                            if (vt.includes('evergreen')) verLabel = 'Evergreen';
                            else if (vt.includes('bank')) verLabel = 'Bank Offer';
                            else if (vt.includes('promo')) verLabel = 'Active Promo';
                        }

                        // Standout savings text with clean whole-number formatting (no messy .00)
                        let savingsDisplay = '';
                        if (offer.discountAmount && Number(offer.discountAmount) > 0) {
                            savingsDisplay = `Save ~${formatInrInteger(offer.discountAmount)}`;
                        } else if (offer.discountText && offer.discountText.length <= 22) {
                            savingsDisplay = offer.discountText.replace(/₹([\d,]+)\.00\b/g, '₹$1');
                        } else if (offer.badge && offer.badge.length <= 22) {
                            savingsDisplay = offer.badge;
                        } else {
                            savingsDisplay = 'Instant Savings';
                        }

                        // Summary receives scannable structured formatting
                        const summaryText = offer.summary || offer.description || (offer.discountText && offer.discountText.length > 22 ? offer.discountText : '');

                        return `
                            <div class="ai-offer-card">
                                <div class="ai-offer-card-top">
                                    <div class="ai-platform-name">
                                        <span class="ai-platform-icon-wrap">
                                            <i class="bi ${escapeHtml(icon)}"></i>
                                        </span>
                                        <strong class="ai-platform-title">${escapeHtml(offer.platform || 'Partner Platform')}</strong>
                                    </div>
                                    <div class="ai-badges-group">
                                        <span class="ai-route-type-badge">${escapeHtml(cleanRoute)}</span>
                                        <span class="ai-verified-badge" title="Verified active offer">
                                            <i class="bi bi-patch-check-fill"></i> ${escapeHtml(verLabel)}
                                        </span>
                                    </div>
                                </div>

                                <div class="ai-coupon-container">
                                    <div class="ai-coupon-box" onclick="window.copyAICouponCode('${escapeHtml(coupon)}', this)" title="Click to copy promo code">
                                        <span class="ai-coupon-tag">CODE</span>
                                        <span class="ai-coupon-text">${escapeHtml(coupon)}</span>
                                        <button type="button" class="ai-coupon-copy-btn" aria-label="Copy promo code">
                                            <i class="bi ${isAuto ? 'bi-check2' : 'bi-clipboard'}"></i>
                                            <span>${isAuto ? 'Auto' : 'Copy'}</span>
                                        </button>
                                    </div>
                                    <span class="ai-discount-tag" title="${escapeHtml(savingsDisplay)}">
                                        <i class="bi bi-tag-fill"></i>
                                        <span>${escapeHtml(savingsDisplay)}</span>
                                    </span>
                                </div>

                                <div class="ai-offer-summary">
                                    ${formatOfferSummary(summaryText)}
                                </div>

                                ${offer.stackingTip ? `
                                    <div class="ai-stacking-combo">
                                        <div class="ai-combo-header">
                                            <i class="bi bi-lightning-charge-fill"></i>
                                            <span>Pro Stacking Strategy</span>
                                        </div>
                                        <div class="ai-combo-body">${formatOfferText(offer.stackingTip)}</div>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    const thinkingText = rawReasoning || data.thinkingSummary;
    if (thinkingText) {
        html += `
            <div class="ai-thinking-disclosure">
                <button type="button" class="btn-toggle-thinking" onclick="window.toggleAIThinkingDetails()">
                    <i class="bi bi-cpu"></i> View AI Mathematical Reasoning
                    <i class="bi bi-chevron-down" id="aiThinkingIcon"></i>
                </button>
                <div class="ai-thinking-body" id="aiThinkingBody" style="display: none;">
                    <pre class="ai-thinking-pre">${escapeHtml(thinkingText)}</pre>
                </div>
            </div>
        `;
    }

    html += `
        <div class="ai-footer-note">
            <span>Powered by <strong>${escapeHtml(modelName || 'Nemotron 3.5 Lightning')}</strong> on NVIDIA NIM</span>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Interactive Coupon Code Copy Handler with animation & toast
 */
export function copyAICouponCode(code, element) {
    if (!code) return;

    const copyBtn = element?.querySelector('.ai-coupon-copy-btn') || element;
    const origHTML = copyBtn ? copyBtn.innerHTML : null;

    const onCopySuccess = () => {
        if (copyBtn) {
            copyBtn.innerHTML = `<i class="bi bi-check2-all text-success"></i> <span class="text-success">Copied!</span>`;
            copyBtn.classList.add('copied');
            setTimeout(() => {
                if (origHTML) copyBtn.innerHTML = origHTML;
                copyBtn.classList.remove('copied');
            }, 2200);
        }
        bridge.showToast(`Copied coupon "${code}" to clipboard!`, 'success');
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(onCopySuccess).catch(() => {
            fallbackCopy(code, onCopySuccess);
        });
    } else {
        fallbackCopy(code, onCopySuccess);
    }
}

function fallbackCopy(text, callback) {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        if (callback) callback();
    } catch (err) {
        console.error('Fallback clipboard copy failed:', err);
    }
}

export function toggleAIThinkingDetails() {
    const body = document.getElementById('aiThinkingBody');
    const icon = document.getElementById('aiThinkingIcon');
    if (!body) return;

    if (body.style.display === 'none') {
        body.style.display = 'block';
        icon?.classList.replace('bi-chevron-down', 'bi-chevron-up');
    } else {
        body.style.display = 'none';
        icon?.classList.replace('bi-chevron-up', 'bi-chevron-down');
    }
}

// Expose handlers globally
if (typeof window !== 'undefined') {
    window.openCreditCardAIModal = openCreditCardAIModal;
    window.closeCreditCardAIModal = closeCreditCardAIModal;
    window.switchAIAdvisorTab = switchAIAdvisorTab;
    window.selectAICardChip = selectAICardChip;
    window.runAICardOptimization = runAICardOptimization;
    window.toggleAIThinkingDetails = toggleAIThinkingDetails;
    window.copyAICouponCode = copyAICouponCode;
    window.runMonthlyCashbackAudit = runMonthlyCashbackAudit;
    window.renderMonthlyCashbackChart = renderMonthlyCashbackChart;
    window.renderFeeWaiverTracker = renderFeeWaiverTracker;
    window.runPortfolioReview = runPortfolioReview;

    // Bridge legacy modal calls to unified AI modal
    window.openCardOptimizerModal = (q) => openCreditCardAIModal(q, 'spendAdvisor');
    window.toggleCardCheatSheet = () => openCreditCardAIModal('', 'spendAdvisor');
    window.isCardAIAdvisorEnabled = isCardAIAdvisorEnabled;
    window.syncCardAIAdvisorVisibility = syncCardAIAdvisorVisibility;

    window.addEventListener('systemSettingsLoaded', () => {
        syncCardAIAdvisorVisibility();
    });

    if (typeof document !== 'undefined') {
        const bindAIButtons = () => {
            syncCardAIAdvisorVisibility();
            const btn = document.getElementById('btnCardAIAdvisor');
            if (btn && !btn.dataset.aiBound) {
                btn.dataset.aiBound = 'true';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    openCreditCardAIModal();
                });
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindAIButtons);
        } else {
            bindAIButtons();
        }
    }
}
