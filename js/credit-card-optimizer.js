/**
 * Credit Card Optimizer & Privileges Hub
 * 
 * Features:
 * - Dynamic Multi-Card Cashback & Reward Maximizer
 * - Auto-Detection & Preset Library for Indian Credit Cards (HSBC Live+, HDFC Millennia, Amazon Pay ICICI, Kiwi RuPay, etc.)
 * - Strict Merchant Exclusions (Fuel, Rent, Wallet, Education, Insurance, Govt) with 0% Warning Alerts
 * - Travel & Lifestyle Privileges (Domestic/International Airport Lounges, Railway Lounges, Movie BOGO)
 * - Credit Utilization Ratio (CUR) / CIBIL Score Protection Guard (30% threshold alert)
 * - Billing Cycle Payment Float (Interest-Free Period) Calculator
 * - Annual Fee Waiver Threshold Progress Tracker
 * - Fully User-Configurable Overrides (Future-proof against bank devaluations)
 * 
 * @module credit-card-optimizer
 */

// ============================================================================
// 1. INDIAN CREDIT CARD PRESETS REGISTRY
// ============================================================================

export const CARD_PRESETS_REGISTRY = {
    'hsbc-live-plus': {
        id: 'hsbc-live-plus',
        name: 'HSBC Live+ Credit Card',
        color: '#dc2626',
        matcher: /hsbc.*(live|cashback)/i,
        issuer: 'HSBC',
        network: 'Visa Infinite',
        annualFee: 999,
        feeWaiverSpendTarget: 200000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: 1200,
        baseCashbackPercent: 1.5,
        tiers: [
            {
                rate: 10.0,
                name: 'Dining, Food Delivery & Groceries (10%)',
                categories: ['dining', 'food-delivery', 'groceries', 'quick-commerce', 'supermarket'],
                merchants: ['swiggy', 'zomato', 'blinkit', 'zepto', 'instamart', 'bigbasket', 'dmart', 'nature\'s basket', 'star bazaar', 'mcdonalds', 'kfc', 'starbucks', 'dominos', 'eatclub', 'district', 'district app'],
                monthlyCap: 1200,
                fallbackRate: 1.5,
                notes: '10% accelerated cashback capped at ₹1,200/billing cycle (spend up to ₹12,000). Drops to 1.5% base afterwards.'
            },
            {
                rate: 1.5,
                name: 'All Other Eligible Retail (1.5%)',
                categories: ['all-retail'],
                merchants: [],
                monthlyCap: null,
                notes: 'Unlimited 1.5% cashback on all other eligible spends.'
            }
        ],
        exclusions: [
            { category: 'fuel', reason: 'Fuel is excluded from cashback (fuel surcharge waiver applies between ₹400-₹4,000).' },
            { category: 'rent', reason: 'Rental / property payments are strictly excluded from rewards.' },
            { category: 'wallet', reason: 'Wallet loading (Paytm, Mobikwik, Amazon Pay balance) yields 0% rewards.' },
            { category: 'insurance', reason: 'Insurance premium payments do not earn any cashback on HSBC Live+.' },
            { category: 'education', reason: 'Education fees and tuition payments earn 0% cashback.' },
            { category: 'government', reason: 'Taxes and government department payments are excluded.' },
            { category: 'emi', reason: 'Transactions converted into EMI do not qualify for cashback.' },
            { category: 'jewellery', reason: 'Jewellery, gold, and antiques (MCC 5094, 5944) are strictly excluded from earning cashback on HSBC Live+ (spends do count toward the ₹2L annual fee waiver).' },
            { category: 'jewelry', reason: 'Jewellery, gold, and antiques (MCC 5094, 5944) are strictly excluded from earning cashback on HSBC Live+ (spends do count toward the ₹2L annual fee waiver).' },
            { category: 'gold', reason: 'Jewellery, gold, and antiques (MCC 5094, 5944) are strictly excluded from earning cashback on HSBC Live+ (spends do count toward the ₹2L annual fee waiver).' },
            { category: 'utilities', reason: 'Utility bill payments (MCC 4900) are excluded from earning cashback on HSBC Live+.' },
            { category: 'telecom', reason: 'Telecom bills and mobile recharges earn 0% cashback on HSBC Live+.' }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: true,
                visitsPerYear: 2,
                ruleText: '2 complimentary visits per calendar year (max 1 visit every 6 months via Visa Infinite direct swipe).',
                spendCriteria: null
            },
            internationalAirport: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: 'Paid access via LoungeKey / Priority Pass.'
            },
            railwayLounge: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: 'No railway lounge access.'
            }
        },
        entertainment: {
            movies: {
                type: 'bogo',
                bogo: true,
                platform: 'District App (by Zomato) & BookMyShow',
                description: 'Buy 1 Get 1 Free (BOGO) movie tickets (up to ₹250 off on 2nd ticket on Saturdays) on District App & BookMyShow, plus 10% cashback on District dining and events.'
            }
        }
    },

    'hdfc-millennia': {
        id: 'hdfc-millennia',
        name: 'HDFC Millennia Credit Card',
        color: '#2563eb',
        matcher: /millennia/i,
        issuer: 'HDFC Bank',
        network: 'Mastercard / Visa / RuPay',
        annualFee: 1000,
        feeWaiverSpendTarget: 100000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: 1000,
        baseCashbackPercent: 1.0,
        tiers: [
            {
                rate: 5.0,
                name: 'Top 10 Merchant Partners (5%)',
                categories: ['shopping', 'food-delivery', 'entertainment', 'travel'],
                merchants: ['amazon', 'flipkart', 'myntra', 'swiggy', 'zomato', 'tata cliq', 'uber', 'cult.fit', 'cultfit', 'bookmyshow', 'bms', 'sony liv', 'sonyliv'],
                monthlyCap: 1000,
                fallbackRate: 1.0,
                notes: '5% CashPoints on 10 partner merchants (Amazon, Flipkart, Swiggy, Zomato, Myntra, Uber, BMS, Tata CLiQ, Cult.fit, Sony LIV). Capped at 1,000 CashPoints/mo.'
            },
            {
                rate: 1.0,
                name: 'Other Eligible Retail Spends (1%)',
                categories: ['all-retail'],
                merchants: [],
                monthlyCap: 1000,
                notes: '1% CashPoints on other eligible spends (capped at 1,000 CashPoints/mo).'
            }
        ],
        exclusions: [
            { category: 'fuel', reason: 'Fuel spends do not earn CashPoints (standard 1% surcharge waiver ₹400-₹5,000 applies).' },
            { category: 'rent', reason: 'Rent transactions earn 0% CashPoints + attract 1% convenience fee.' },
            { category: 'wallet', reason: 'Prepaid wallet loading earns 0% CashPoints.' },
            { category: 'government', reason: 'Government portals, utilities, and tax payments earn 0%.' },
            { category: 'education', reason: 'Education payments on 3rd party apps (Cred, CheQ) earn 0% CashPoints.' },
            { category: 'emi', reason: 'EMI transactions earn 0% CashPoints.' },
            { category: 'utilities', reason: 'Utility bill payments earn 0% CashPoints on HDFC Millennia.' },
            { category: 'telecom', reason: 'Telecom bills and mobile recharges earn 0% CashPoints on HDFC Millennia.' }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: true,
                isMilestoneBased: true,
                visitsPerYear: 4,
                ruleText: 'Milestone-based: Spend ₹1,00,000 or more in a calendar quarter to choose either 1 Lounge Access Voucher OR ₹1,000 brand voucher.',
                spendCriteria: '₹1,00,000 per calendar quarter'
            },
            internationalAirport: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: 'No complimentary international lounge access.'
            },
            railwayLounge: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: 'No railway lounge access.'
            }
        },
        entertainment: {
            movies: {
                type: 'cashback',
                bogo: false,
                rate: 5.0,
                platform: 'BookMyShow',
                description: '5% CashPoints on BookMyShow (counted within the 1,000 CashPoints/mo partner cap).'
            }
        }
    },

    'amazon-pay-icici': {
        id: 'amazon-pay-icici',
        name: 'Amazon Pay ICICI Credit Card',
        color: '#d97706',
        matcher: /amazon.*(pay|icici)/i,
        issuer: 'ICICI Bank',
        network: 'Visa Platinum',
        annualFee: 0,
        feeWaiverSpendTarget: 0,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 1.0,
        tiers: [
            {
                rate: 5.0,
                name: 'Amazon.in Shopping (5% Unlimited)',
                categories: ['shopping'],
                merchants: ['amazon', 'amazon.in', 'amazon shopping'],
                monthlyCap: null,
                notes: '5% Unlimited Cashback for Prime members (3% for non-Prime) credited directly to Amazon Pay balance.'
            },
            {
                rate: 2.0,
                name: 'Amazon Pay Partner Merchants & Bill Payments (2%)',
                categories: ['utilities', 'bill-payment', 'recharge', 'food-delivery', 'travel'],
                merchants: ['amazon pay', 'electricity', 'water', 'gas', 'dth', 'mobile recharge', 'broadband', 'uber', 'yatra', 'bookmyshow', 'swiggy'],
                monthlyCap: null,
                notes: '2% Unlimited Cashback on 100+ partner merchants & bill payments when paid via Amazon Pay portal.'
            },
            {
                rate: 1.0,
                name: 'All Other Spends (1% Unlimited)',
                categories: ['all-retail'],
                merchants: [],
                monthlyCap: null,
                notes: '1% Unlimited Cashback on all other eligible domestic and international retail spends.'
            }
        ],
        exclusions: [
            { category: 'fuel', reason: 'Fuel transactions earn 0% cashback (1% fuel surcharge waiver ₹400-₹4,000 applies).' },
            { category: 'rent', reason: 'Rent payments via third-party apps yield 0% cashback.' },
            { category: 'wallet', reason: 'Adding funds to Amazon Pay balance / prepaid wallets earns 0%.' },
            { category: 'emi', reason: 'Purchases converted to EMI earn 0% cashback.' },
            { category: 'gold', reason: 'Gold and silver coin/jewelry purchases on Amazon earn 0% cashback.' },
            { category: 'jewellery', reason: 'Purchases of gold, silver, and jewellery on Amazon earn 0% cashback.' },
            { category: 'jewelry', reason: 'Purchases of gold, silver, and jewellery on Amazon earn 0% cashback.' },
            { category: 'government', reason: 'Government tax and challan payments earn 0% cashback.' }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: 'No complimentary lounge access (Lifetime Free card).'
            },
            internationalAirport: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: 'No complimentary international lounge access.'
            },
            railwayLounge: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: 'No railway lounge access.'
            }
        },
        entertainment: {
            movies: {
                type: 'cashback',
                bogo: false,
                rate: 2.0,
                platform: 'BookMyShow via Amazon Pay',
                description: '2% cashback when BookMyShow is paid through Amazon Pay gateway, else 1% direct.'
            }
        }
    },

    'kiwi-rupay': {
        id: 'kiwi-rupay',
        name: 'Kiwi RuPay Credit Card',
        color: '#059669',
        matcher: /kiwi/i,
        issuer: 'Yes Bank',
        network: 'RuPay Credit on UPI',
        annualFee: 0,
        feeWaiverSpendTarget: 0,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 0.5,
        tiers: [
            {
                rate: 2.0,
                name: 'RuPay UPI Scan & Pay (1.5% - 2%)',
                categories: ['upi', 'qr-code', 'local-merchant', 'kirana', 'small-vendor'],
                merchants: ['upi', 'scan & pay', 'qr', 'tea stall', 'kirana', 'local shop', 'street vendor', 'pharmacy', 'bakery', 'auto'],
                monthlyCap: null,
                notes: 'Up to 2% cashback (Kiwis/Neon rewards) on Scan & Pay UPI merchant transactions.'
            },
            {
                rate: 0.5,
                name: 'Non-UPI Online / POS Spends (0.5%)',
                categories: ['all-retail'],
                merchants: [],
                monthlyCap: null,
                notes: '0.5% base reward on regular e-commerce or POS transactions.'
            }
        ],
        exclusions: [
            { category: 'p2p', reason: 'Peer-to-peer UPI transfers (friend/family) do not earn rewards; only merchant (P2M) QR codes qualify.' },
            { category: 'fuel', reason: 'Fuel merchant QR payments earn 0% cashback.' },
            { category: 'rent', reason: 'Rental payments via UPI earn 0%.' },
            { category: 'wallet', reason: 'Prepaid wallet reloads via UPI earn 0%.' },
            { category: 'government', reason: 'Tax payments and traffic challans earn 0%.' },
            { category: 'jewellery', reason: 'UPI QR merchant payments at jewellery stores are excluded from rewards.' },
            { category: 'jewelry', reason: 'UPI QR merchant payments at jewellery stores are excluded from rewards.' },
            { category: 'gold', reason: 'UPI QR merchant payments at jewellery stores are excluded from rewards.' },
            { category: 'insurance', reason: 'Insurance premium payments via UPI earn 0% rewards.' },
            { category: 'education', reason: 'Education and school fee payments via UPI earn 0% rewards.' }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: true,
                isMilestoneBased: true,
                visitsPerYear: 3,
                ruleText: 'Via Kiwi Neon: 1 domestic airport lounge pass unlocked at ₹50,000 annual spend, 2nd at ₹1,00,000, and 3rd at ₹1,50,000 spend.',
                spendCriteria: '₹50k / ₹1L / ₹1.5L spend milestones'
            },
            internationalAirport: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: 'No international lounge access.'
            },
            railwayLounge: {
                hasAccess: true,
                visitsPerYear: 2,
                ruleText: 'Participating RuPay credit cards have access to select IRCTC Executive Railway Lounges (New Delhi, Agra, Jaipur).'
            }
        },
        entertainment: {
            movies: {
                type: 'rupay-campaign',
                bogo: true,
                description: 'Periodic RuPay Friday & weekend promotional offers on BookMyShow (BOGO or flat discounts).'
            }
        }
    },

    'sbi-cashback': {
        id: 'sbi-cashback',
        name: 'SBI Cashback Credit Card',
        matcher: /sbi.*cashback/i,
        issuer: 'SBI Card',
        network: 'Visa Signature',
        annualFee: 999,
        feeWaiverSpendTarget: 200000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: 5000,
        baseCashbackPercent: 1.0,
        tiers: [
            {
                rate: 5.0,
                name: 'All Online Retail Spends (5%)',
                categories: ['shopping', 'online-retail', 'food-delivery', 'groceries', 'travel'],
                merchants: ['amazon', 'flipkart', 'myntra', 'swiggy', 'zomato', 'blinkit', 'zepto', 'makemytrip', 'ajio', 'nykaa', 'tata cliq'],
                monthlyCap: 5000,
                fallbackRate: 1.0,
                notes: '5% flat cashback across almost all online merchants. Monthly cap ₹5,000 (max spend ₹1,00,000).'
            },
            {
                rate: 1.0,
                name: 'Offline Retail Spends (1%)',
                categories: ['all-retail'],
                merchants: [],
                monthlyCap: null,
                notes: '1% unlimited cashback on offline POS purchases.'
            }
        ],
        exclusions: [
            { category: 'fuel', reason: 'Fuel is excluded from cashback.' },
            { category: 'rent', reason: 'Rent payments earn 0% cashback.' },
            { category: 'wallet', reason: 'Wallet loading earns 0% cashback.' },
            { category: 'utilities', reason: 'Utility bill payments (electricity, water, gas) earn 0% cashback.' },
            { category: 'education', reason: 'School/College fees earn 0% cashback.' },
            { category: 'jewelry', reason: 'Jewelry purchases are excluded.' },
            { category: 'insurance', reason: 'Insurance payments earn 0% cashback.' }
        ],
        lounges: {
            domesticAirport: { hasAccess: false, visitsPerYear: 0, ruleText: 'Direct domestic lounge access was discontinued.' },
            internationalAirport: { hasAccess: false, visitsPerYear: 0, ruleText: 'No international lounge access.' },
            railwayLounge: { hasAccess: false, visitsPerYear: 0, ruleText: 'No railway lounge access.' }
        },
        entertainment: { movies: { type: 'cashback', bogo: false, rate: 5.0, description: '5% online cashback on BookMyShow.' } }
    },

    'airtel-axis': {
        id: 'airtel-axis',
        name: 'Airtel Axis Bank Credit Card',
        matcher: /airtel.*axis/i,
        issuer: 'Axis Bank',
        network: 'Mastercard',
        annualFee: 500,
        feeWaiverSpendTarget: 200000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: 1000,
        baseCashbackPercent: 1.0,
        tiers: [
            {
                rate: 25.0,
                name: 'Airtel Mobile, Broadband & DTH (25%)',
                categories: ['recharge', 'broadband', 'telecom'],
                merchants: ['airtel', 'airtel thanks'],
                monthlyCap: 250,
                fallbackRate: 1.0,
                notes: '25% cashback on Airtel Thanks app (Capped at ₹250/mo).'
            },
            {
                rate: 10.0,
                name: 'Swiggy, Zomato & BigBasket (10%)',
                categories: ['food-delivery', 'groceries'],
                merchants: ['swiggy', 'zomato', 'bigbasket'],
                monthlyCap: 500,
                fallbackRate: 1.0,
                notes: '10% cashback on Swiggy, Zomato, BigBasket (Capped at ₹500/mo combined).'
            },
            {
                rate: 10.0,
                name: 'Utility Bills via Airtel Thanks (10%)',
                categories: ['utilities', 'electricity', 'gas', 'water'],
                merchants: ['electricity', 'water', 'piped gas', 'lpg cylinder'],
                monthlyCap: 250,
                fallbackRate: 1.0,
                notes: '10% on utility bills via Airtel Thanks app (Capped at ₹250/mo).'
            },
            {
                rate: 1.0,
                name: 'Other Retail Spends (1%)',
                categories: ['all-retail'],
                merchants: [],
                monthlyCap: null,
                notes: '1% unlimited on other eligible retail spends.'
            }
        ],
        exclusions: [
            { category: 'fuel', reason: 'Fuel excluded (surcharge waiver applies).' },
            { category: 'rent', reason: 'Rent excluded.' },
            { category: 'wallet', reason: 'Wallet loads excluded.' },
            { category: 'gold', reason: 'Gold and jewelry purchases excluded.' }
        ],
        lounges: {
            domesticAirport: { hasAccess: true, visitsPerYear: 4, ruleText: '4 complimentary domestic lounge visits per calendar year (1 per quarter).' },
            internationalAirport: { hasAccess: false, visitsPerYear: 0, ruleText: 'No international lounge access.' },
            railwayLounge: { hasAccess: false, visitsPerYear: 0, ruleText: 'No railway lounge access.' }
        },
        entertainment: { movies: { type: 'cashback', bogo: false, rate: 1.0, description: '1% base cashback.' } }
    },

    'tata-neu-infinity': {
        id: 'tata-neu-infinity',
        name: 'Tata Neu Infinity HDFC Credit Card',
        matcher: /tata.*neu.*infinity/i,
        issuer: 'HDFC Bank',
        network: 'RuPay / Visa',
        annualFee: 1499,
        feeWaiverSpendTarget: 300000,
        forexMarkupPercent: 2.0,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 1.5,
        tiers: [
            {
                rate: 10.0,
                name: 'Tata Brands via Tata Neu Pass (Up to 10%)',
                categories: ['groceries', 'shopping', 'travel', 'pharmacy', 'electronics'],
                merchants: ['bigbasket', 'tata 1mg', '1mg', 'croma', 'air india', 'air india express', 'ihcl', 'taj', 'westside', 'tata cliq'],
                monthlyCap: null,
                notes: '5% NeuCoins on card + 5% additional via Tata NeuPass = 10% total rewards.'
            },
            {
                rate: 1.5,
                name: 'RuPay UPI Merchant Payments (1.5%)',
                categories: ['upi', 'qr-code', 'local-merchant'],
                merchants: ['upi', 'qr', 'scan & pay'],
                monthlyCap: 500,
                notes: '1.5% NeuCoins on RuPay UPI merchant QR transactions (capped at 500 NeuCoins/mo).'
            },
            {
                rate: 1.5,
                name: 'Other Retail Spends (1.5%)',
                categories: ['all-retail'],
                merchants: [],
                monthlyCap: null,
                notes: '1.5% unlimited NeuCoins on other spends.'
            }
        ],
        exclusions: [
            { category: 'fuel', reason: 'Fuel excluded.' },
            { category: 'rent', reason: 'Rent excluded.' },
            { category: 'wallet', reason: 'Wallet loads excluded.' },
            { category: 'government', reason: 'Government transactions excluded.' }
        ],
        lounges: {
            domesticAirport: { hasAccess: true, visitsPerYear: 8, ruleText: '8 complimentary domestic visits per calendar year (2 per quarter via direct swipe).' },
            internationalAirport: { hasAccess: true, visitsPerYear: 4, ruleText: '4 complimentary international visits per year (1 per quarter via Priority Pass).' },
            railwayLounge: { hasAccess: false, visitsPerYear: 0, ruleText: 'No railway lounge access.' }
        },
        entertainment: { movies: { type: 'neucoins', bogo: false, rate: 1.5, description: '1.5% NeuCoins on BookMyShow.' } }
    }
};

// ============================================================================
// 2. SEARCH & MERCHANT TAXONOMY
// ============================================================================

export const MERCHANT_CATEGORY_TAXONOMY = {
    // Quick chips shown in the UI for 1-tap testing
    quickChips: [
        { label: '🍔 Swiggy / Zomato', query: 'swiggy', category: 'food-delivery' },
        { label: '🛒 Blinkit / Zepto', query: 'blinkit', category: 'groceries' },
        { label: '📦 Amazon', query: 'amazon', category: 'shopping' },
        { label: '🛍️ Flipkart / Myntra', query: 'flipkart', category: 'shopping' },
        { label: '📱 Offline UPI QR', query: 'upi', category: 'upi' },
        { label: '🚕 Uber / Cabs', query: 'uber', category: 'travel' },
        { label: '⚡ Electricity & Bills', query: 'electricity', category: 'utilities' },
        { label: '🎬 BookMyShow', query: 'bookmyshow', category: 'entertainment' },
        { label: '✈️ Airport Lounge', query: 'airport lounge', category: 'lounge' },
        { label: '⛽ Fuel / Petrol', query: 'fuel', category: 'fuel' },
        { label: '🏠 Rent Payment', query: 'rent', category: 'rent' },
        { label: '👛 Wallet Reload', query: 'wallet', category: 'wallet' }
    ],

    // Keyword mapping to detect category intent (sorted by length descending during parse)
    keywordMap: {
        // Groceries & Quick Commerce
        'swiggy instamart': { category: 'groceries', merchant: 'instamart' },
        'instamart': { category: 'groceries', merchant: 'instamart' },
        'blinkit': { category: 'groceries', merchant: 'blinkit' },
        'zepto': { category: 'groceries', merchant: 'zepto' },
        'bigbasket': { category: 'groceries', merchant: 'bigbasket' },
        'bbnow': { category: 'groceries', merchant: 'bigbasket' },
        'dmart ready': { category: 'groceries', merchant: 'dmart' },
        'dmart': { category: 'groceries', merchant: 'dmart' },
        'jiomart': { category: 'groceries', merchant: 'jiomart' },
        'nature\'s basket': { category: 'groceries', merchant: 'nature\'s basket' },
        'star bazaar': { category: 'groceries', merchant: 'star bazaar' },
        'country delight': { category: 'groceries', merchant: 'country delight' },
        'milkbasket': { category: 'groceries', merchant: 'milkbasket' },
        'freshtohome': { category: 'groceries', merchant: 'freshtohome' },
        'licious': { category: 'groceries', merchant: 'licious' },
        'supermarket': { category: 'supermarket', merchant: 'supermarket' },
        'grocery': { category: 'groceries', merchant: 'grocery' },
        'groceries': { category: 'groceries', merchant: 'groceries' },
        'vegetables': { category: 'groceries', merchant: 'vegetables' },
        'fruits': { category: 'groceries', merchant: 'fruits' },

        // Food Delivery & Dining
        'swiggy dineout': { category: 'dining', merchant: 'dineout' },
        'swiggy': { category: 'food-delivery', merchant: 'swiggy' },
        'zomato': { category: 'food-delivery', merchant: 'zomato' },
        'eatsure': { category: 'food-delivery', merchant: 'eatsure' },
        'eatclub': { category: 'food-delivery', merchant: 'eatclub' },
        'magicpin': { category: 'food-delivery', merchant: 'magicpin' },
        'dominos': { category: 'dining', merchant: 'dominos' },
        'mcdonalds': { category: 'dining', merchant: 'mcdonalds' },
        'kfc': { category: 'dining', merchant: 'kfc' },
        'pizza hut': { category: 'dining', merchant: 'pizza hut' },
        'starbucks': { category: 'dining', merchant: 'starbucks' },
        'subway': { category: 'dining', merchant: 'subway' },
        'burger king': { category: 'dining', merchant: 'burger king' },
        'haldirams': { category: 'dining', merchant: 'haldirams' },
        'barbeque nation': { category: 'dining', merchant: 'barbeque nation' },
        'eazydiner': { category: 'dining', merchant: 'eazydiner' },
        'dineout': { category: 'dining', merchant: 'dineout' },
        'district dining': { category: 'dining', merchant: 'district' },
        'faasos': { category: 'food-delivery', merchant: 'faasos' },
        'behrouz': { category: 'food-delivery', merchant: 'behrouz' },
        'bakingo': { category: 'food-delivery', merchant: 'bakingo' },
        'dining': { category: 'dining', merchant: 'dining' },
        'restaurant': { category: 'dining', merchant: 'restaurant' },
        'cafe': { category: 'dining', merchant: 'cafe' },
        'food': { category: 'food-delivery', merchant: 'food' },
        'dinner': { category: 'dining', merchant: 'dinner' },
        'lunch': { category: 'dining', merchant: 'lunch' },
        'breakfast': { category: 'dining', merchant: 'breakfast' },
        'bakery': { category: 'dining', merchant: 'bakery' },

        // Shopping & E-Commerce
        'amazon pay': { category: 'utilities', merchant: 'amazon pay' },
        'amazon fresh': { category: 'shopping', merchant: 'amazon' },
        'amazon': { category: 'shopping', merchant: 'amazon' },
        'flipkart': { category: 'shopping', merchant: 'flipkart' },
        'myntra': { category: 'shopping', merchant: 'myntra' },
        'tata cliq': { category: 'shopping', merchant: 'tata cliq' },
        'tatacliq': { category: 'shopping', merchant: 'tata cliq' },
        'ajio': { category: 'shopping', merchant: 'ajio' },
        'meesho': { category: 'shopping', merchant: 'meesho' },
        'nykaa': { category: 'shopping', merchant: 'nykaa' },
        'purplle': { category: 'shopping', merchant: 'purplle' },
        'croma': { category: 'shopping', merchant: 'croma' },
        'reliance digital': { category: 'shopping', merchant: 'reliance digital' },
        'vijay sales': { category: 'shopping', merchant: 'vijay sales' },
        'snitch': { category: 'shopping', merchant: 'snitch' },
        'zara': { category: 'shopping', merchant: 'zara' },
        'h&m': { category: 'shopping', merchant: 'h&m' },
        'uniqlo': { category: 'shopping', merchant: 'uniqlo' },
        'westside': { category: 'shopping', merchant: 'westside' },
        'decathlon': { category: 'shopping', merchant: 'decathlon' },
        'ikea': { category: 'shopping', merchant: 'ikea' },
        'zudio': { category: 'shopping', merchant: 'zudio' },
        'clothing': { category: 'shopping', merchant: 'clothing' },
        'fashion': { category: 'shopping', merchant: 'fashion' },
        'electronics': { category: 'shopping', merchant: 'electronics' },

        // Cabs & Travel
        'uber': { category: 'travel', merchant: 'uber' },
        'ola': { category: 'travel', merchant: 'ola' },
        'rapido': { category: 'travel', merchant: 'rapido' },
        'namma yatri': { category: 'travel', merchant: 'namma yatri' },
        'blusmart': { category: 'travel', merchant: 'blusmart' },
        'cab': { category: 'travel', merchant: 'cab' },
        'taxi': { category: 'travel', merchant: 'taxi' },
        'makemytrip': { category: 'travel', merchant: 'makemytrip' },
        'mmt': { category: 'travel', merchant: 'makemytrip' },
        'easemytrip': { category: 'travel', merchant: 'easemytrip' },
        'cleartrip': { category: 'travel', merchant: 'cleartrip' },
        'ixigo': { category: 'travel', merchant: 'ixigo' },
        'yatra': { category: 'travel', merchant: 'yatra' },
        'goibibo': { category: 'travel', merchant: 'goibibo' },
        'irctc': { category: 'travel', merchant: 'irctc' },
        'train': { category: 'travel', merchant: 'irctc' },
        'flight': { category: 'travel', merchant: 'flight' },
        'hotel': { category: 'travel', merchant: 'hotel' },
        'indigo': { category: 'travel', merchant: 'indigo' },
        'air india': { category: 'travel', merchant: 'air india' },
        'spicejet': { category: 'travel', merchant: 'spicejet' },

        // Entertainment & Movies
        'district movies': { category: 'entertainment', merchant: 'district' },
        'district app': { category: 'entertainment', merchant: 'district' },
        'district events': { category: 'entertainment', merchant: 'district' },
        'district': { category: 'entertainment', merchant: 'district' },
        'movie tickets': { category: 'entertainment', merchant: 'movie' },
        'movie ticket': { category: 'entertainment', merchant: 'movie' },
        'movies': { category: 'entertainment', merchant: 'movie' },
        'movie': { category: 'entertainment', merchant: 'movie' },
        'cinema': { category: 'entertainment', merchant: 'cinema' },
        'theatre': { category: 'entertainment', merchant: 'cinema' },
        'theater': { category: 'entertainment', merchant: 'cinema' },
        'bogo': { category: 'entertainment', merchant: 'movie' },
        'bookmyshow': { category: 'entertainment', merchant: 'bookmyshow' },
        'bms': { category: 'entertainment', merchant: 'bookmyshow' },
        'pvr': { category: 'entertainment', merchant: 'pvr' },
        'inox': { category: 'entertainment', merchant: 'inox' },
        'cinepolis': { category: 'entertainment', merchant: 'cinepolis' },
        'sony liv': { category: 'entertainment', merchant: 'sony liv' },
        'sonyliv': { category: 'entertainment', merchant: 'sony liv' },
        'netflix': { category: 'entertainment', merchant: 'netflix' },
        'hotstar': { category: 'entertainment', merchant: 'hotstar' },
        'disney hotstar': { category: 'entertainment', merchant: 'hotstar' },
        'spotify': { category: 'entertainment', merchant: 'spotify' },
        'apple music': { category: 'entertainment', merchant: 'apple music' },
        'cult.fit': { category: 'entertainment', merchant: 'cult.fit' },
        'cultfit': { category: 'entertainment', merchant: 'cult.fit' },
        'gym': { category: 'entertainment', merchant: 'cult.fit' },

        // UPI & Local Stores
        'upi': { category: 'upi', merchant: 'upi' },
        'qr': { category: 'upi', merchant: 'upi' },
        'scan & pay': { category: 'upi', merchant: 'upi' },
        'kirana': { category: 'upi', merchant: 'kirana' },
        'tea': { category: 'upi', merchant: 'tea' },
        'chai': { category: 'upi', merchant: 'tea' },
        'local store': { category: 'upi', merchant: 'kirana' },

        // Utilities & Bills
        'electricity': { category: 'utilities', merchant: 'electricity' },
        'power': { category: 'utilities', merchant: 'electricity' },
        'current bill': { category: 'utilities', merchant: 'electricity' },
        'bescom': { category: 'utilities', merchant: 'electricity' },
        'tneb': { category: 'utilities', merchant: 'electricity' },
        'cesc': { category: 'utilities', merchant: 'electricity' },
        'mseb': { category: 'utilities', merchant: 'electricity' },
        'tata power': { category: 'utilities', merchant: 'electricity' },
        'water': { category: 'utilities', merchant: 'water' },
        'gas': { category: 'utilities', merchant: 'gas' },
        'piped gas': { category: 'utilities', merchant: 'gas' },
        'lpg': { category: 'utilities', merchant: 'gas' },
        'indane': { category: 'utilities', merchant: 'gas' },
        'hp gas': { category: 'utilities', merchant: 'gas' },
        'bharat gas': { category: 'utilities', merchant: 'gas' },
        'recharge': { category: 'utilities', merchant: 'recharge' },
        'mobile bill': { category: 'utilities', merchant: 'recharge' },
        'broadband': { category: 'utilities', merchant: 'broadband' },
        'wifi': { category: 'utilities', merchant: 'broadband' },
        'dth': { category: 'utilities', merchant: 'dth' },
        'tata play': { category: 'utilities', merchant: 'dth' },
        'airtel': { category: 'telecom', merchant: 'airtel' },
        'jio': { category: 'telecom', merchant: 'jio' },
        'vi': { category: 'telecom', merchant: 'vi' },
        'fastag': { category: 'utilities', merchant: 'fastag' },
        'toll': { category: 'utilities', merchant: 'toll' },

        // Jewellery & Precious Metals
        'jewellery': { category: 'jewellery', merchant: 'jewellery' },
        'jewelry': { category: 'jewellery', merchant: 'jewelry' },
        'jewel': { category: 'jewellery', merchant: 'jewel' },
        'jeweller': { category: 'jewellery', merchant: 'jeweller' },
        'jewellers': { category: 'jewellery', merchant: 'jewellers' },
        'gold': { category: 'jewellery', merchant: 'gold' },
        'silver': { category: 'jewellery', merchant: 'silver' },
        'diamond': { category: 'jewellery', merchant: 'diamond' },
        'tanishq': { category: 'jewellery', merchant: 'tanishq' },
        'malabar': { category: 'jewellery', merchant: 'malabar' },
        'kalyan': { category: 'jewellery', merchant: 'kalyan' },
        'joyalukkas': { category: 'jewellery', merchant: 'joyalukkas' },
        'caratlane': { category: 'jewellery', merchant: 'caratlane' },
        'bluestone': { category: 'jewellery', merchant: 'bluestone' },
        'giva': { category: 'jewellery', merchant: 'giva' },

        // Exclusions
        'fuel': { category: 'fuel', merchant: 'fuel' },
        'petrol': { category: 'fuel', merchant: 'petrol' },
        'diesel': { category: 'fuel', merchant: 'diesel' },
        'cng': { category: 'fuel', merchant: 'fuel' },
        'hpcl': { category: 'fuel', merchant: 'fuel' },
        'bpcl': { category: 'fuel', merchant: 'fuel' },
        'iocl': { category: 'fuel', merchant: 'fuel' },
        'shell': { category: 'fuel', merchant: 'fuel' },
        'petrol pump': { category: 'fuel', merchant: 'fuel' },
        'rent': { category: 'rent', merchant: 'rent' },
        'house rent': { category: 'rent', merchant: 'rent' },
        'society maintenance': { category: 'rent', merchant: 'rent' },
        'mygate': { category: 'rent', merchant: 'rent' },
        'nobroker': { category: 'rent', merchant: 'rent' },
        'cred rent': { category: 'rent', merchant: 'rent' },
        'wallet': { category: 'wallet', merchant: 'wallet' },
        'paytm wallet': { category: 'wallet', merchant: 'wallet' },
        'mobikwik wallet': { category: 'wallet', merchant: 'wallet' },
        'amazon pay balance': { category: 'wallet', merchant: 'wallet' },
        'insurance': { category: 'insurance', merchant: 'insurance' },
        'life insurance': { category: 'insurance', merchant: 'insurance' },
        'health insurance': { category: 'insurance', merchant: 'insurance' },
        'term insurance': { category: 'insurance', merchant: 'insurance' },
        'lic': { category: 'insurance', merchant: 'insurance' },
        'policybazaar': { category: 'insurance', merchant: 'insurance' },
        'education': { category: 'education', merchant: 'education' },
        'tuition': { category: 'education', merchant: 'education' },
        'school fee': { category: 'education', merchant: 'education' },
        'college fee': { category: 'education', merchant: 'education' },
        'school': { category: 'education', merchant: 'education' },
        'college': { category: 'education', merchant: 'education' },
        'coaching': { category: 'education', merchant: 'education' },
        'allen': { category: 'education', merchant: 'education' },
        'aakash': { category: 'education', merchant: 'education' },
        'byjus': { category: 'education', merchant: 'education' },
        'tax': { category: 'government', merchant: 'tax' },
        'income tax': { category: 'government', merchant: 'tax' },
        'itr': { category: 'government', merchant: 'tax' },
        'advance tax': { category: 'government', merchant: 'tax' },
        'property tax': { category: 'government', merchant: 'tax' },
        'gst': { category: 'government', merchant: 'tax' },
        'challan': { category: 'government', merchant: 'challan' },

        // Travel Lounges & Forex
        'airport lounge': { category: 'lounge', merchant: 'airport lounge' },
        'railway lounge': { category: 'railway-lounge', merchant: 'railway lounge' },
        'international': { category: 'forex', merchant: 'forex' },
        'forex': { category: 'forex', merchant: 'forex' },
        'usd': { category: 'forex', merchant: 'forex' },
        'chatgpt': { category: 'forex', merchant: 'chatgpt' },
        'github': { category: 'forex', merchant: 'github' },
        'aws': { category: 'forex', merchant: 'aws' }
    }
};

// ============================================================================
// 3. CORE LOGIC: PRESET DETECTION & RESOLUTION
// ============================================================================

/**
 * Detects matching preset from registry based on card name & issuer
 */
export function detectCardPreset(cardName = '', issuer = '') {
    const searchString = `${cardName} ${issuer}`.trim();
    for (const [presetId, preset] of Object.entries(CARD_PRESETS_REGISTRY)) {
        if (preset.matcher && preset.matcher.test(searchString)) {
            return preset;
        }
    }
    return null;
}

/**
 * Merges user-data.json card object with preset rules and custom user overrides
 */
export function resolveCardBenefits(card, cardId) {
    if (!card) return null;

    const detectedPreset = detectCardPreset(card.name, card.issuer);
    const customBenefits = card.benefits || {};

    const basePreset = detectedPreset || {
        id: 'generic-card',
        name: card.name || 'Generic Credit Card',
        issuer: card.issuer || 'Bank',
        annualFee: 0,
        feeWaiverSpendTarget: 0,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 1.0,
        tiers: [
            {
                rate: 1.0,
                name: 'All Retail Spends (1%)',
                categories: ['all-retail'],
                merchants: [],
                monthlyCap: null,
                notes: 'Standard 1% base cashback.'
            }
        ],
        exclusions: [
            { category: 'fuel', reason: 'Fuel excluded from rewards.' },
            { category: 'rent', reason: 'Rent excluded from rewards.' },
            { category: 'wallet', reason: 'Wallet loads excluded.' }
        ],
        lounges: {
            domesticAirport: { hasAccess: false, visitsPerYear: 0, ruleText: 'No lounge access.' },
            internationalAirport: { hasAccess: false, visitsPerYear: 0, ruleText: 'No lounge access.' },
            railwayLounge: { hasAccess: false, visitsPerYear: 0, ruleText: 'No lounge access.' }
        },
        entertainment: {
            movies: { type: 'standard', bogo: false, description: 'Standard platform offers.' }
        }
    };

    // Deep merge preset with user custom overrides
    return {
        cardId: cardId,
        cardName: card.name,
        cardIssuer: card.issuer,
        creditLimit: Number(card.creditLimit || 0),
        color: (card.color && card.color !== '#ff6b6b' && card.color !== '') ? card.color : (basePreset.color || card.color || '#6366f1'),
        dueDate: card.dueDate || '',
        presetId: basePreset.id,
        annualFee: customBenefits.annualFee !== undefined ? customBenefits.annualFee : basePreset.annualFee,
        feeWaiverSpendTarget: customBenefits.feeWaiverSpendTarget !== undefined ? customBenefits.feeWaiverSpendTarget : basePreset.feeWaiverSpendTarget,
        forexMarkupPercent: customBenefits.forexMarkupPercent !== undefined ? customBenefits.forexMarkupPercent : basePreset.forexMarkupPercent,
        baseCashbackPercent: customBenefits.baseCashbackPercent !== undefined ? customBenefits.baseCashbackPercent : basePreset.baseCashbackPercent,
        tiers: customBenefits.tiers && customBenefits.tiers.length > 0 ? customBenefits.tiers : basePreset.tiers,
        exclusions: customBenefits.exclusions && customBenefits.exclusions.length > 0 ? customBenefits.exclusions : basePreset.exclusions,
        lounges: customBenefits.lounges ? { ...basePreset.lounges, ...customBenefits.lounges } : basePreset.lounges,
        entertainment: customBenefits.entertainment ? { ...basePreset.entertainment, ...customBenefits.entertainment } : basePreset.entertainment
    };
}

// ============================================================================
// 4. TRANSACTION EVALUATION ENGINE
// ============================================================================

/**
 * Normalizes query string and resolves matching category and merchant
 * Sorts keywords by length descending so longer compound phrases (e.g. 'swiggy instamart', 'amazon pay', 'cred rent')
 * always match before single words (e.g. 'swiggy', 'amazon', 'rent').
 */
export function parseTransactionIntent(queryText = '') {
    const raw = (queryText || '').toLowerCase().trim();
    if (!raw) return { category: 'all-retail', merchant: 'general', raw: '' };

    const sortedKeywords = Object.keys(MERCHANT_CATEGORY_TAXONOMY.keywordMap)
        .sort((a, b) => b.length - a.length);

    for (const kw of sortedKeywords) {
        if (raw.includes(kw)) {
            const mapping = MERCHANT_CATEGORY_TAXONOMY.keywordMap[kw];
            return { category: mapping.category, merchant: mapping.merchant, raw };
        }
    }

    return { category: 'all-retail', merchant: raw, raw };
}

/**
 * Evaluates a single card against a specific transaction query & amount
 * Covers all edge cases:
 * 1. Available credit limit overflow check (prevents recommending over-limit cards)
 * 2. RuPay UPI compatibility vs Visa/Mastercard (only RuPay cards work on UPI QR scans)
 * 3. 0% Category Exclusions (Fuel, Rent, Wallet, Tax, Jewellery on HSBC, etc.)
 * 4. Jewellery milestone bonus on HSBC Live+ (0% cashback, but 100% counts towards ₹2L fee waiver)
 * 5. Minimum spend threshold (HDFC Millennia requires min ₹100 per transaction)
 * 6. Fuel surcharge rules (< ₹400 vs ₹400-₹4,000 vs > ₹4,000)
 * 7. Cap Overflow Math: Spend beyond tier accelerated cap continues earning base rate!
 * 8. Forex markup net cost & warning (3.5% + 18% GST = 4.13%)
 * 9. Surcharge warnings for Government/Tax and Rent/Wallet
 */
export function evaluateCardForSpend(card, cardId, queryText = '', amount = 1000, currentMonth = '', currentOutstanding = 0) {
    const resolved = resolveCardBenefits(card, cardId);
    if (!resolved) return null;

    const intent = parseTransactionIntent(queryText);
    const spendAmount = Math.max(0, Number(amount || 0));

    // A. Check Credit Limit & Available Limit
    const creditLimit = Number(resolved.creditLimit || 0);
    const availableLimit = creditLimit > 0 ? Math.max(0, creditLimit - Number(currentOutstanding || 0)) : 0;
    const isOverLimit = creditLimit > 0 && spendAmount > availableLimit;
    const overLimitDeficit = isOverLimit ? Math.round(spendAmount - availableLimit) : 0;

    // B. Check UPI Compatibility (RuPay vs Visa/Mastercard)
    const isUpiIntent = intent.category === 'upi' || intent.merchant === 'upi';
    const cardNetwork = (resolved.network || '').toLowerCase();
    const cardNameLower = (resolved.cardName || '').toLowerCase();
    const isRupay = resolved.presetId === 'kiwi-rupay' || cardNetwork.includes('rupay') || cardNameLower.includes('rupay');
    const isUpiIncompatible = isUpiIntent && !isRupay;

    // C. Special Alerts & Notes Initialization
    let specialMilestoneNote = null;
    let fuelSurchargeNote = null;
    let fuelSurchargeWarning = null;
    let forexWarning = null;
    let forexCost = 0;
    let netReturnAmount = 0;
    let taxWarning = null;
    let rentWarning = null;
    let walletWarning = null;

    if (intent.category === 'jewellery' && resolved.presetId === 'hsbc-live-plus') {
        specialMilestoneNote = 'Spends count 100% towards the ₹2 Lakh Annual Fee Waiver (saving ₹999 + GST renewal fee).';
    }

    if (intent.category === 'fuel') {
        if (spendAmount < 400) {
            fuelSurchargeWarning = 'Under ₹400: Surcharge waiver does NOT apply. Bank will charge ~₹10 + 18% GST out of pocket (0% cashback).';
        } else if (spendAmount > 4000) {
            fuelSurchargeWarning = 'Over ₹4,000: Surcharge waiver only applies up to ₹4,000 per swipe. Split bill into ₹4,000 chunks to get full 1% waiver.';
        } else {
            fuelSurchargeNote = '1% Fuel Surcharge waived (up to ₹250/mo, GST non-refundable, 0% cashback).';
        }
    }

    if (intent.category === 'government') {
        taxWarning = 'Tax portals levy a 0.8% - 1.2% payment gateway convenience fee for credit cards with 0% cashback. Pay via UPI or Net Banking to save.';
    }

    if (intent.category === 'rent') {
        rentWarning = 'Credit card rent payments incur 0% rewards plus a 1% + 18% GST bank processing fee on most issuers.';
    }

    if (intent.category === 'wallet') {
        walletWarning = 'Wallet loading earns 0% rewards and several banks levy a 1% + GST fee on credit card wallet reloads.';
    }

    // D. UPI Incompatible Handling
    if (isUpiIncompatible) {
        return {
            cardId,
            cardName: resolved.cardName,
            cardIssuer: resolved.cardIssuer,
            color: resolved.color,
            creditLimit: resolved.creditLimit,
            applicableRate: 0,
            cashbackEarned: 0,
            isExcluded: true,
            isUpiIncompatible: true,
            isOverLimit,
            overLimitDeficit,
            availableLimit,
            exclusionReason: 'Visa/Mastercard cards cannot scan UPI QR codes. Only RuPay cards work on UPI.',
            tierName: 'UPI Incompatible (RuPay Only)',
            notes: 'Cannot be used for UPI QR Scan & Pay. Use Kiwi RuPay for this transaction.',
            projectedCUR: calculateProjectedCUR(resolved.creditLimit, currentOutstanding, spendAmount),
            curWarning: checkCURWarning(resolved.creditLimit, currentOutstanding, spendAmount),
            paymentFloatDays: calculatePaymentFloatDays(card.dueDate),
            lounges: resolved.lounges,
            entertainment: resolved.entertainment
        };
    }

    // E. Check for Exclusions (0% Return)
    const matchedExclusion = resolved.exclusions.find(ex => {
        const cat = typeof ex === 'string' ? ex : ex.category;
        return cat === intent.category || cat === intent.merchant || (intent.raw && intent.raw.includes(cat));
    });

    if (matchedExclusion) {
        return {
            cardId,
            cardName: resolved.cardName,
            cardIssuer: resolved.cardIssuer,
            color: resolved.color,
            creditLimit: resolved.creditLimit,
            applicableRate: 0,
            cashbackEarned: 0,
            isExcluded: true,
            isUpiIncompatible: false,
            isOverLimit,
            overLimitDeficit,
            availableLimit,
            exclusionReason: typeof matchedExclusion === 'object' ? matchedExclusion.reason : 'Excluded category (0% rewards).',
            tierName: 'Excluded Spend (0%)',
            notes: specialMilestoneNote || fuelSurchargeNote || 'Zero rewards earned. Be aware of additional third-party convenience fees.',
            specialMilestoneNote,
            fuelSurchargeNote,
            fuelSurchargeWarning,
            taxWarning,
            rentWarning,
            walletWarning,
            projectedCUR: calculateProjectedCUR(resolved.creditLimit, currentOutstanding, spendAmount),
            curWarning: checkCURWarning(resolved.creditLimit, currentOutstanding, spendAmount),
            paymentFloatDays: calculatePaymentFloatDays(card.dueDate),
            lounges: resolved.lounges,
            entertainment: resolved.entertainment
        };
    }

    // F. Check Minimum Transaction Threshold (HDFC Millennia requires min ₹100)
    if (resolved.presetId === 'hdfc-millennia' && spendAmount < 100) {
        return {
            cardId,
            cardName: resolved.cardName,
            cardIssuer: resolved.cardIssuer,
            color: resolved.color,
            creditLimit: resolved.creditLimit,
            applicableRate: 0,
            cashbackEarned: 0,
            isExcluded: false,
            isUpiIncompatible: false,
            isOverLimit,
            overLimitDeficit,
            availableLimit,
            tierName: 'Sub-₹100 Spend (0%)',
            notes: 'HDFC Millennia requires a minimum transaction of ₹100 to earn CashPoints.',
            minSpendWarning: 'Transactions below ₹100 do not earn reward points on HDFC Millennia.',
            projectedCUR: calculateProjectedCUR(resolved.creditLimit, currentOutstanding, spendAmount),
            curWarning: checkCURWarning(resolved.creditLimit, currentOutstanding, spendAmount),
            paymentFloatDays: calculatePaymentFloatDays(card.dueDate),
            lounges: resolved.lounges,
            entertainment: resolved.entertainment
        };
    }

    // G. Check for Specific Tier Matches
    let matchedTier = null;
    let applicableRate = resolved.baseCashbackPercent;

    for (const tier of resolved.tiers) {
        const matchesCategory = tier.categories && tier.categories.some(c => c === intent.category || c === 'all-retail');
        const matchesMerchant = tier.merchants && tier.merchants.some(m => intent.raw.includes(m) || intent.merchant.includes(m));

        if (matchesMerchant) {
            matchedTier = tier;
            applicableRate = tier.rate;
            break; // Exact merchant match is highest priority
        }

        if (matchesCategory && !matchedTier && tier.rate > applicableRate) {
            matchedTier = tier;
            applicableRate = tier.rate;
        }
    }

    // H. Cap Overflow Splitting (Accelerated Cap + Base Fallback)
    let capWarning = null;
    let rawCashback = (spendAmount * applicableRate) / 100;

    if (matchedTier && matchedTier.monthlyCap) {
        const maxAcceleratedSpend = matchedTier.monthlyCap / (matchedTier.rate / 100);
        if (spendAmount > maxAcceleratedSpend) {
            const acceleratedCashback = matchedTier.monthlyCap;
            const overflowSpend = spendAmount - maxAcceleratedSpend;
            const fallbackRate = matchedTier.fallbackRate !== undefined ? matchedTier.fallbackRate : resolved.baseCashbackPercent;
            const overflowCashback = (overflowSpend * fallbackRate) / 100;

            rawCashback = acceleratedCashback + overflowCashback;
            capWarning = `Accelerated cap of ₹${matchedTier.monthlyCap.toLocaleString('en-IN')}/mo reached on first ₹${Math.round(maxAcceleratedSpend).toLocaleString('en-IN')}. Remaining ₹${Math.round(overflowSpend).toLocaleString('en-IN')} earns base ${fallbackRate}% (₹${Math.round(overflowCashback)}).`;
        }
    }

    // I. Forex Markup Fee vs Net Return Check
    if (intent.category === 'forex') {
        const markupPercent = resolved.forexMarkupPercent || 3.5;
        const totalForexFeePercent = markupPercent * 1.18;
        forexCost = (spendAmount * totalForexFeePercent) / 100;
        netReturnAmount = rawCashback - forexCost;
        const netPercent = applicableRate - totalForexFeePercent;
        forexWarning = `Forex Markup of ${markupPercent}% + 18% GST (~${totalForexFeePercent.toFixed(2)}% = ₹${Math.round(forexCost)}) applies. Net return: ${netPercent.toFixed(2)}% (₹${Math.round(netReturnAmount)}). Consider a Zero Forex card.`;
    }

    return {
        cardId,
        cardName: resolved.cardName,
        cardIssuer: resolved.cardIssuer,
        color: resolved.color,
        creditLimit: resolved.creditLimit,
        applicableRate,
        cashbackEarned: Math.round(rawCashback * 100) / 100,
        isExcluded: false,
        isUpiIncompatible: false,
        isOverLimit,
        overLimitDeficit,
        availableLimit,
        tierName: matchedTier ? matchedTier.name : `Standard Retail (${resolved.baseCashbackPercent}%)`,
        capWarning,
        forexWarning,
        forexCost: Math.round(forexCost),
        taxWarning,
        rentWarning,
        walletWarning,
        fuelSurchargeWarning,
        fuelSurchargeNote,
        specialMilestoneNote,
        notes: matchedTier ? matchedTier.notes : `Standard ${resolved.baseCashbackPercent}% base return.`,
        projectedCUR: calculateProjectedCUR(resolved.creditLimit, currentOutstanding, spendAmount),
        curWarning: checkCURWarning(resolved.creditLimit, currentOutstanding, spendAmount),
        paymentFloatDays: calculatePaymentFloatDays(card.dueDate),
        lounges: resolved.lounges,
        entertainment: resolved.entertainment
    };
}

/**
 * Evaluates and ranks ALL cards in user's profile for a given query & amount
 * Ranking Hierarchy:
 * 1. Not Over Limit > Over Limit (A card that declines cannot be recommended)
 * 2. UPI Compatible > Incompatible (For UPI QR scans, Visa/Mastercard cannot be used)
 * 3. Non-excluded > Excluded (Earns rewards vs 0%)
 * 4. Highest net cashback earned (₹)
 * 5. Highest applicable percentage (%)
 * 6. Lowest projected Credit Utilization Ratio (%)
 * 7. Highest payment float days (days)
 */
export function rankCardsForSpend(cards = {}, queryText = '', amount = 1000, currentMonth = '') {
    const list = Object.entries(cards).filter(([_, card]) => (card.type || 'credit-card') === 'credit-card');

    if (list.length === 0) return [];

    const evaluations = list.map(([cardId, card]) => {
        const currentBal = (card.balances && card.balances[currentMonth] !== undefined)
            ? card.balances[currentMonth]
            : (card.outstandingBalance || 0);

        return evaluateCardForSpend(card, cardId, queryText, amount, currentMonth, currentBal);
    }).filter(Boolean);

    evaluations.sort((a, b) => {
        if (a.isOverLimit !== b.isOverLimit) {
            return a.isOverLimit ? 1 : -1;
        }
        if (a.isUpiIncompatible !== b.isUpiIncompatible) {
            return a.isUpiIncompatible ? 1 : -1;
        }
        if (a.isExcluded !== b.isExcluded) {
            return a.isExcluded ? 1 : -1;
        }
        if (b.cashbackEarned !== a.cashbackEarned) {
            return b.cashbackEarned - a.cashbackEarned;
        }
        if (b.applicableRate !== a.applicableRate) {
            return b.applicableRate - a.applicableRate;
        }
        if (a.projectedCUR !== b.projectedCUR) {
            return a.projectedCUR - b.projectedCUR;
        }
        return b.paymentFloatDays - a.paymentFloatDays;
    });

    return evaluations;
}

// ============================================================================
// 5. PRIVILEGES, LOUNGES & LIFESTYLE SUMMARY
// ============================================================================

/**
 * Extracts all airport & railway lounge benefits across active cards
 */
export function getLoungePrivilegesSummary(cards = {}) {
    const summary = {
        domesticAirport: [],
        internationalAirport: [],
        railwayLounges: []
    };

    for (const [cardId, card] of Object.entries(cards)) {
        if ((card.type || 'credit-card') !== 'credit-card') continue;
        const resolved = resolveCardBenefits(card, cardId);
        if (!resolved || !resolved.lounges) continue;

        const l = resolved.lounges;

        if (l.domesticAirport && l.domesticAirport.hasAccess) {
            summary.domesticAirport.push({
                cardId,
                cardName: resolved.cardName,
                cardIssuer: resolved.cardIssuer,
                color: resolved.color,
                visitsPerYear: l.domesticAirport.visitsPerYear,
                ruleText: l.domesticAirport.ruleText,
                isMilestoneBased: !!l.domesticAirport.isMilestoneBased,
                spendCriteria: l.domesticAirport.spendCriteria || 'None (Direct swipe)'
            });
        }

        if (l.internationalAirport && l.internationalAirport.hasAccess) {
            summary.internationalAirport.push({
                cardId,
                cardName: resolved.cardName,
                cardIssuer: resolved.cardIssuer,
                color: resolved.color,
                visitsPerYear: l.internationalAirport.visitsPerYear,
                ruleText: l.internationalAirport.ruleText,
                spendCriteria: l.internationalAirport.spendCriteria || 'Priority Pass / LoungeKey'
            });
        }

        if (l.railwayLounge && l.railwayLounge.hasAccess) {
            summary.railwayLounges.push({
                cardId,
                cardName: resolved.cardName,
                cardIssuer: resolved.cardIssuer,
                color: resolved.color,
                visitsPerYear: l.railwayLounge.visitsPerYear,
                ruleText: l.railwayLounge.ruleText,
                spendCriteria: l.railwayLounge.spendCriteria || 'IRCTC Executive Lounges'
            });
        }
    }

    return summary;
}

/**
 * Extracts movie ticket BOGO and cashback privileges
 */
export function getMoviePrivilegesSummary(cards = {}) {
    const movies = [];

    for (const [cardId, card] of Object.entries(cards)) {
        if ((card.type || 'credit-card') !== 'credit-card') continue;
        const resolved = resolveCardBenefits(card, cardId);
        if (!resolved || !resolved.entertainment || !resolved.entertainment.movies) continue;

        const m = resolved.entertainment.movies;
        movies.push({
            cardId,
            cardName: resolved.cardName,
            cardIssuer: resolved.cardIssuer,
            color: resolved.color,
            bogo: !!m.bogo,
            rate: m.rate || null,
            platform: m.platform || 'BookMyShow',
            description: m.description || 'Entertainment offers'
        });
    }

    // Sort BOGO cards first
    movies.sort((a, b) => (b.bogo ? 1 : 0) - (a.bogo ? 1 : 0));
    return movies;
}

/**
 * Extracts dining programs, restaurant discounts, and culinary partnerships
 */
export function getDiningPrivilegesSummary(cards = {}) {
    const list = [];
    for (const [cardId, card] of Object.entries(cards)) {
        if ((card.type || 'credit-card') !== 'credit-card') continue;
        const resolved = resolveCardBenefits(card, cardId);
        if (!resolved) continue;

        if (resolved.presetId === 'hsbc-live-plus') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'Up to 25% Total',
                program: 'HSBC Live+ Dining Programme & District',
                description: 'Up to 15% instant bill discount at 200+ partner fine-dining restaurants across India & Asia, which stacks with your 10% accelerated dining cashback (giving up to 25% total savings!).'
            });
        } else if (resolved.presetId === 'hdfc-millennia') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: '10% – 20% Off',
                program: 'Swiggy Dineout Partnership',
                description: 'Extra 10% to 20% instant discount on restaurant dining bills paid through Swiggy Dineout using promo code HDFCCARDS, plus 5% CashPoints.'
            });
        } else if (resolved.presetId === 'amazon-pay-icici') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'Min 15% Off',
                program: 'ICICI Culinary Treats',
                description: 'Minimum 15% discount on dining bills at 2,500+ partner restaurants across India via the ICICI Culinary Treats network.'
            });
        } else if (resolved.presetId === 'kiwi-rupay') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: '1.5% – 2% Cashback',
                program: 'RuPay UPI Dining & Cafes',
                description: 'Up to 2% cashback via Kiwi Scan & Pay at all local cafes, restaurants, bakeries, and street food stalls with zero payment surcharge.'
            });
        }
    }
    return list;
}

/**
 * Extracts e-commerce superpowers, partner merchant ecosystems, and brand deals
 */
export function getBrandSuperpowersSummary(cards = {}) {
    const list = [];
    for (const [cardId, card] of Object.entries(cards)) {
        if ((card.type || 'credit-card') !== 'credit-card') continue;
        const resolved = resolveCardBenefits(card, cardId);
        if (!resolved) continue;

        if (resolved.presetId === 'amazon-pay-icici') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: '5% Unlimited',
                title: 'Amazon Prime 5% Uncapped & 100+ Partner Apps',
                description: 'Zero monthly cap on 5% Amazon shopping rewards. Flat 2% unlimited cashback across 100+ partner apps (Uber, BMS, Yatra, MakeMyTrip) via Amazon Pay. Lifetime Free with No-Cost EMI.'
            });
        } else if (resolved.presetId === 'hdfc-millennia') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: '1:1 CashPoints',
                title: 'Top 10 Merchant Partners & ₹1k Quarterly Voucher',
                description: '5% CashPoints across Amazon, Flipkart, Myntra, Swiggy, Zomato, Tata CLiQ, Uber, Cult.fit, BMS, Sony LIV. CashPoints redeem 1:1 against statement credit (₹1 = 1 pt) + ₹1,000 quarterly milestone voucher on ₹1L spend.'
            });
        } else if (resolved.presetId === 'hsbc-live-plus') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: '10% Grocery & Food',
                title: 'Everyday Spends & Concert Pre-Sale Access',
                description: '10% accelerated return on Swiggy, Zomato, Blinkit, Zepto, Instamart, BigBasket, DMart, plus pre-sale tickets and 10% promotional discounts on major music concerts & events via District / BookMyShow.'
            });
        } else if (resolved.presetId === 'kiwi-rupay') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'RuPay on UPI',
                title: 'Zero Surcharge Offline QR & Neon Milestone Lounges',
                description: 'Turns your credit card into a daily UPI scanner with 1.5%–2% cashback on kirana & local vendors. Kiwi Neon milestones unlock up to 3 domestic airport lounge vouchers at ₹50k, ₹1L, and ₹1.5L spends.'
            });
        }
    }
    return list;
}

/**
 * Computes the 12-month Card Membership Year / Anniversary cycle for a credit card.
 * In Indian banking (HDFC, HSBC, ICICI, Axis), fee waiver spend criteria are evaluated
 * over the 12-month Card Membership Year from the card issuance / anniversary month, NOT calendar years.
 *
 * @param {Object} card - Card object from financeData.creditCards
 * @param {string} asOfMonthStr - e.g. "2026-11"
 * @returns {Object} { startMonthStr, endMonthStr, cycleLabel, anniversaryMonthName, monthsElapsed, monthsRemaining, cycleMonths }
 */
export function getCardAnniversaryCycle(card = {}, asOfMonthStr = '2026-11') {
    // Standardize asOfMonthStr if year passed
    const currentRefMonth = (asOfMonthStr && asOfMonthStr.length === 4) ? `${asOfMonthStr}-11` : (asOfMonthStr || '2026-11');

    // 1. Determine joining / anniversary start month (YYYY-MM)
    let startMonth = card.anniversaryMonth || card.createdMonth;

    if (!startMonth && card.balances && Object.keys(card.balances).length > 0) {
        startMonth = Object.keys(card.balances).sort()[0];
    }

    if (!startMonth && card.createdAt) {
        const d = new Date(card.createdAt);
        if (!isNaN(d.getTime())) {
            startMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
    }

    // Default fallback to currentRefMonth if completely unknown
    if (!startMonth || !/^\d{4}-\d{2}$/.test(startMonth)) {
        startMonth = currentRefMonth;
    }

    const [startYearNum, startMonthNum] = startMonth.split('-').map(Number);
    const [currYearNum, currMonthNum] = currentRefMonth.split('-').map(Number);

    // Calculate active cycle start year
    let cycleStartYear = currYearNum;
    if (currMonthNum < startMonthNum) {
        cycleStartYear = currYearNum - 1;
    }
    if (cycleStartYear < startYearNum) {
        cycleStartYear = startYearNum;
    }

    const cycleStartMonth = startMonthNum;
    const startStr = `${cycleStartYear}-${String(cycleStartMonth).padStart(2, '0')}`;

    // Generate the 12 rolling billing cycle months
    const cycleMonths = [];
    let y = cycleStartYear;
    let m = cycleStartMonth;
    for (let i = 0; i < 12; i++) {
        cycleMonths.push(`${y}-${String(m).padStart(2, '0')}`);
        m++;
        if (m > 12) {
            m = 1;
            y++;
        }
    }
    const endStr = cycleMonths[11];

    // Format human-friendly labels (e.g. "Aug 2026 – Jul 2027")
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startHuman = `${monthNames[cycleStartMonth - 1]} ${cycleStartYear}`;
    const [endYearNum, endMonthNum] = endStr.split('-').map(Number);
    const endHuman = `${monthNames[endMonthNum - 1]} ${endYearNum}`;
    const anniversaryName = monthNames[cycleStartMonth - 1];

    const currentIdx = cycleMonths.indexOf(currentRefMonth);
    const monthsElapsed = currentIdx >= 0 ? currentIdx + 1 : (currentRefMonth > endStr ? 12 : 1);
    const monthsRemaining = Math.max(0, 12 - monthsElapsed);

    return {
        startMonthStr: startStr,
        endMonthStr: endStr,
        cycleLabel: `${startHuman} – ${endHuman}`,
        anniversaryMonthName: anniversaryName,
        monthsElapsed,
        monthsRemaining,
        cycleMonths
    };
}

/**
 * Calculates annual fee waiver spend progress across cards based on each card's individual anniversary date
 */
export function getAnnualFeeWaiverSummary(cards = {}, asOfMonth = '2026-11') {
    const list = [];
    const currentRefMonth = (asOfMonth && asOfMonth.length === 4) ? `${asOfMonth}-11` : (asOfMonth || '2026-11');

    for (const [cardId, card] of Object.entries(cards)) {
        if ((card.type || 'credit-card') !== 'credit-card') continue;
        const resolved = resolveCardBenefits(card, cardId);
        if (!resolved || !resolved.annualFee || resolved.annualFee === 0) continue;

        const cycle = getCardAnniversaryCycle(card, currentRefMonth);

        // Sum cumulative spends across the exact 12-month membership cycle
        let annualSpend = 0;
        const monthlyBreakdown = {};
        if (card.balances) {
            for (const m of cycle.cycleMonths) {
                const amt = Number(card.balances[m] || 0);
                monthlyBreakdown[m] = amt;
                annualSpend += amt;
            }
        }

        const target = resolved.feeWaiverSpendTarget || 0;
        const percent = target > 0 ? Math.min(100, Math.round((annualSpend / target) * 100)) : 100;
        const remaining = Math.max(0, target - annualSpend);
        const monthlyRequired = cycle.monthsRemaining > 0 ? Math.round(remaining / cycle.monthsRemaining) : 0;

        list.push({
            cardId,
            cardName: resolved.cardName,
            color: resolved.color,
            annualFee: resolved.annualFee,
            feeWaiverSpendTarget: target,
            annualSpend,
            percentAchieved: percent,
            remainingToWaive: remaining,
            isWaived: annualSpend >= target,
            cycleLabel: cycle.cycleLabel,
            anniversaryMonth: cycle.anniversaryMonthName,
            monthsElapsed: cycle.monthsElapsed,
            monthsRemaining: cycle.monthsRemaining,
            monthlyRequired,
            monthlyBreakdown
        });
    }

    return list;
}

// ============================================================================
// 6. CREDIT UTILIZATION & FLOAT HELPERS
// ============================================================================

export function calculateProjectedCUR(limit, currentBalance, newSpend) {
    if (!limit || limit <= 0) return 0;
    const total = (Number(currentBalance || 0) + Number(newSpend || 0));
    return Math.round((total / limit) * 1000) / 10; // 1 decimal place
}

export function checkCURWarning(limit, currentBalance, newSpend) {
    const cur = calculateProjectedCUR(limit, currentBalance, newSpend);
    if (cur > 50) {
        return { level: 'danger', message: `Critical CUR Alert: Spending on this card pushes utilization to ${cur}% (>50%), which harms CIBIL score.` };
    }
    if (cur > 30) {
        return { level: 'warning', message: `CUR Warning: Pushes utilization to ${cur}% (>30% threshold recommended for 800+ CIBIL score).` };
    }
    return null;
}

export function calculatePaymentFloatDays(dueDateStr) {
    if (!dueDateStr) return 30; // fallback average
    try {
        const today = new Date();
        const due = new Date(dueDateStr);
        if (isNaN(due.getTime())) return 30;
        const diffMs = due.getTime() - today.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(0, days);
    } catch (e) {
        return 30;
    }
}

// ============================================================================
// 7. CHEAT SHEET DATA GENERATOR
// ============================================================================

/**
 * Produces a concise matrix of best cards across top daily categories
 */
export function generateCategoryCheatSheet(cards = {}) {
    const categories = [
        { id: 'dining', icon: 'bi-cup-hot', title: 'Dining & Cafes', query: 'dining', sampleAmount: 1500 },
        { id: 'food', icon: 'bi-bag-check', title: 'Food Delivery (Swiggy/Zomato)', query: 'swiggy', sampleAmount: 800 },
        { id: 'groceries', icon: 'bi-cart3', title: 'Groceries (Blinkit/Zepto/DMart)', query: 'blinkit', sampleAmount: 2000 },
        { id: 'amazon', icon: 'bi-box-seam', title: 'Amazon Shopping', query: 'amazon', sampleAmount: 3000 },
        { id: 'flipkart', icon: 'bi-tag', title: 'Flipkart & Myntra', query: 'flipkart', sampleAmount: 3000 },
        { id: 'upi', icon: 'bi-qr-code-scan', title: 'UPI Scan & Pay / Local Store', query: 'upi', sampleAmount: 350 },
        { id: 'cabs', icon: 'bi-car-front', title: 'Uber & Cabs', query: 'uber', sampleAmount: 500 },
        { id: 'bills', icon: 'bi-lightning-charge', title: 'Electricity & Utility Bills', query: 'electricity', sampleAmount: 2500 },
        { id: 'movies', icon: 'bi-film', title: 'Movie Tickets (BookMyShow)', query: 'bookmyshow', sampleAmount: 700 },
        { id: 'jewellery', icon: 'bi-gem', title: 'Jewellery & Gold', query: 'jewellery', sampleAmount: 25000 },
        { id: 'fuel', icon: 'bi-fuel-pump', title: 'Fuel & Petrol', query: 'fuel', sampleAmount: 1500 },
        { id: 'general', icon: 'bi-credit-card-2-back', title: 'All Other General Retail', query: 'other', sampleAmount: 2000 }
    ];

    return categories.map(cat => {
        const rankings = rankCardsForSpend(cards, cat.query, cat.sampleAmount);
        const winner = rankings.length > 0 ? rankings[0] : null;
        const runnerUp = rankings.length > 1 && !rankings[1].isExcluded ? rankings[1] : null;

        return {
            ...cat,
            winner,
            runnerUp
        };
    });
}

// ============================================================================
// 8. UI CONTROLLERS & DOM BINDINGS
// ============================================================================

let optimizerBridge = {
    getFinanceData: () => (window.financeData || {}),
    getCurrentMonth: () => (window.currentMonth || new Date().toISOString().slice(0, 7)),
    formatCurrency: (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    openModal: (id) => (window.openModal ? window.openModal(id) : document.getElementById(id)?.classList.add('active')),
    closeModal: (id) => (window.closeModal ? window.closeModal(id) : document.getElementById(id)?.classList.remove('active')),
    showToast: (msg, type) => (window.showToast ? window.showToast(msg, type) : console.log(msg))
};

export function registerCardOptimizerBridge(customBridge) {
    if (customBridge && typeof customBridge === 'object') {
        optimizerBridge = { ...optimizerBridge, ...customBridge };
    }
}

let activeTab = 'spend';
let currentSearchQuery = '';
let currentSearchAmount = 1000;
let isCheatSheetOpen = false;

export function openCardOptimizerModal(defaultQuery = '') {
    const modal = document.getElementById('cardOptimizerModal');
    if (!modal) return;

    optimizerBridge.openModal('cardOptimizerModal');
    renderQuickChips();

    const searchInput = document.getElementById('cardAdvisorSearchInput');
    const amountInput = document.getElementById('cardAdvisorAmountInput');

    if (defaultQuery && searchInput) {
        searchInput.value = defaultQuery;
        currentSearchQuery = defaultQuery;
    } else if (searchInput) {
        searchInput.value = currentSearchQuery || 'Swiggy';
        currentSearchQuery = searchInput.value;
    }

    if (amountInput) {
        amountInput.value = currentSearchAmount || 1000;
    }

    switchCardOptimizerTab('spend');
    runCardAdvisorSearch();
}

export function closeCardOptimizerModal() {
    optimizerBridge.closeModal('cardOptimizerModal');
}

export function switchCardOptimizerTab(tabName) {
    activeTab = tabName;
    const spendTab = document.getElementById('cardOptimizerSpendTab');
    const privTab = document.getElementById('cardOptimizerPrivilegesTab');
    const tabSpendBtn = document.getElementById('tabSpendOptimizerBtn');
    const tabPrivBtn = document.getElementById('tabPrivilegesBtn');

    if (tabName === 'spend') {
        if (spendTab) spendTab.style.display = 'block';
        if (privTab) privTab.style.display = 'none';
        if (tabSpendBtn) tabSpendBtn.classList.add('active');
        if (tabPrivBtn) tabPrivBtn.classList.remove('active');
        runCardAdvisorSearch();
    } else {
        if (spendTab) spendTab.style.display = 'none';
        if (privTab) privTab.style.display = 'block';
        if (tabSpendBtn) tabSpendBtn.classList.remove('active');
        if (tabPrivBtn) tabPrivBtn.classList.add('active');
        renderPrivilegesTab();
    }
}

export function renderQuickChips() {
    const container = document.getElementById('cardAdvisorQuickChips');
    if (!container) return;

    container.innerHTML = MERCHANT_CATEGORY_TAXONOMY.quickChips.map(chip => `
        <button type="button" class="advisor-chip ${currentSearchQuery.toLowerCase() === chip.query.toLowerCase() ? 'active' : ''}" 
                onclick="window.selectCardAdvisorChip('${chip.query}')">
            ${chip.label}
        </button>
    `).join('');
}

export function selectCardAdvisorChip(query) {
    const searchInput = document.getElementById('cardAdvisorSearchInput');
    if (searchInput) {
        searchInput.value = query;
    }
    currentSearchQuery = query;
    renderQuickChips();
    runCardAdvisorSearch();
}

export function runCardAdvisorSearch() {
    const searchInput = document.getElementById('cardAdvisorSearchInput');
    const amountInput = document.getElementById('cardAdvisorAmountInput');
    const clearBtn = document.getElementById('cardAdvisorClearBtn');

    const query = searchInput ? searchInput.value.trim() : '';
    const amount = amountInput ? Number(amountInput.value || 1000) : 1000;
    currentSearchQuery = query;
    currentSearchAmount = amount;

    if (clearBtn) {
        clearBtn.style.display = query ? 'flex' : 'none';
    }

    const financeData = optimizerBridge.getFinanceData();
    const cards = financeData.creditCards || {};
    const currentMonth = optimizerBridge.getCurrentMonth();

    const resultsContainer = document.getElementById('cardAdvisorResultsContainer');
    if (!resultsContainer) return;

    const rankings = rankCardsForSpend(cards, query, amount, currentMonth);

    if (rankings.length === 0) {
        resultsContainer.innerHTML = `
            <div class="card-advisor-empty-state">
                <i class="bi bi-credit-card-2-back"></i>
                <h4>No Credit Cards Added</h4>
                <p>Add your credit cards to see personalized cashback rankings, lounge access, and CIBIL alerts.</p>
            </div>
        `;
        return;
    }

    const winner = rankings[0];
    const runnersUp = rankings.slice(1);
    const isMovieQuery = query && /movie|cinema|district|bookmyshow|bms|theatre|theater|ticket|pvr|inox/i.test(query);

    resultsContainer.innerHTML = `
        <!-- Top Recommendation Banner -->
        <div class="card-recommendation-hero ${winner.isExcluded ? 'is-excluded' : ''}">
            <div class="hero-header">
                <div class="rank-badge gold">
                    <i class="bi ${winner.isExcluded ? 'bi-exclamation-triangle-fill' : 'bi-trophy-fill'}"></i>
                    <span>${winner.isExcluded ? 'Zero Cashback' : 'Top Recommendation'}</span>
                </div>
                ${!winner.isExcluded ? `
                    <div class="cashback-badge">
                        <span class="cashback-rate">${winner.applicableRate}%</span>
                        <span class="cashback-label">Cashback</span>
                    </div>
                ` : `
                    <div class="cashback-badge excluded">
                        <span class="cashback-rate">0%</span>
                        <span class="cashback-label">Excluded</span>
                    </div>
                `}
            </div>

            <div class="hero-body">
                <div class="card-identity">
                    <span class="card-color-dot" style="background:${winner.color};"></span>
                    <div>
                        <div class="card-name-title">${escapeHtml(winner.cardName)}</div>
                        <div class="card-issuer-sub">${escapeHtml(winner.cardIssuer)}</div>
                    </div>
                </div>

                <div class="hero-savings">
                    ${!winner.isExcluded ? `
                        <div class="savings-amount">+${optimizerBridge.formatCurrency(winner.cashbackEarned)}</div>
                        <div class="savings-note">projected reward on ${optimizerBridge.formatCurrency(amount)} spend</div>
                    ` : `
                        <div class="savings-amount warning-text">₹0.00</div>
                        <div class="savings-note">${escapeHtml(winner.exclusionReason)}</div>
                    `}
                </div>
            </div>

            <!-- Notes & Conditions -->
            <div class="hero-footer">
                <div class="tier-info">
                    <i class="bi bi-info-circle"></i> ${escapeHtml(winner.notes)}
                </div>
                ${winner.isOverLimit ? `
                    <div class="hero-warning overlimit-warning">
                        <i class="bi bi-slash-circle-fill"></i>
                        <div><strong>Limit Exceeded:</strong> Spend of ${optimizerBridge.formatCurrency(amount)} exceeds available limit of ${optimizerBridge.formatCurrency(winner.availableLimit)} (Deficit: ${optimizerBridge.formatCurrency(winner.overLimitDeficit)}). Card transaction will decline.</div>
                    </div>
                ` : ''}
                ${winner.isUpiIncompatible ? `
                    <div class="hero-warning upi-warning">
                        <i class="bi bi-x-circle-fill"></i>
                        <div><strong>UPI Incompatible:</strong> Visa / Mastercard cannot scan merchant UPI QR codes. Only RuPay credit cards support UPI payments.</div>
                    </div>
                ` : ''}
                ${winner.capWarning ? `
                    <div class="hero-warning cap-warning">
                        <i class="bi bi-exclamation-circle-fill"></i> 
                        <div>${escapeHtml(winner.capWarning)}</div>
                    </div>
                ` : ''}
                ${winner.forexWarning ? `
                    <div class="hero-warning forex-warning">
                        <i class="bi bi-currency-exchange"></i>
                        <div>${escapeHtml(winner.forexWarning)}</div>
                    </div>
                ` : ''}
                ${winner.fuelSurchargeWarning ? `
                    <div class="hero-warning surcharge-warning">
                        <i class="bi bi-fuel-pump-fill"></i>
                        <div>${escapeHtml(winner.fuelSurchargeWarning)}</div>
                    </div>
                ` : ''}
                ${winner.fuelSurchargeNote ? `
                    <div class="hero-warning surcharge-note">
                        <i class="bi bi-check2-circle"></i>
                        <div>${escapeHtml(winner.fuelSurchargeNote)}</div>
                    </div>
                ` : ''}
                ${winner.taxWarning ? `
                    <div class="hero-warning fee-warning">
                        <i class="bi bi-receipt-cutoff"></i>
                        <div>${escapeHtml(winner.taxWarning)}</div>
                    </div>
                ` : ''}
                ${winner.rentWarning ? `
                    <div class="hero-warning fee-warning">
                        <i class="bi bi-house-door-fill"></i>
                        <div>${escapeHtml(winner.rentWarning)}</div>
                    </div>
                ` : ''}
                ${winner.walletWarning ? `
                    <div class="hero-warning fee-warning">
                        <i class="bi bi-wallet-fill"></i>
                        <div>${escapeHtml(winner.walletWarning)}</div>
                    </div>
                ` : ''}
                ${winner.specialMilestoneNote ? `
                    <div class="hero-warning milestone-bonus">
                        <i class="bi bi-award-fill"></i>
                        <div>${escapeHtml(winner.specialMilestoneNote)}</div>
                    </div>
                ` : ''}
                ${isMovieQuery && winner.entertainment && winner.entertainment.movies && winner.entertainment.movies.bogo ? `
                    <div class="hero-warning movie-bogo-bonus">
                        <i class="bi bi-ticket-perforated-fill"></i>
                        <div><strong>Buy 1 Get 1 Free (BOGO) Offer:</strong> ${escapeHtml(winner.entertainment.movies.description)}</div>
                    </div>
                ` : ''}
                ${winner.curWarning ? `
                    <div class="hero-warning cur-${winner.curWarning.level}">
                        <i class="bi bi-shield-exclamation"></i>
                        <div>${escapeHtml(winner.curWarning.message)}</div>
                    </div>
                ` : ''}
                <div class="float-tag">
                    <i class="bi bi-calendar-check"></i> ~${winner.paymentFloatDays} days interest-free float
                </div>
            </div>
        </div>

        <!-- Other Cards Ranking -->
        ${runnersUp.length > 0 ? `
            <div class="runners-up-section">
                <div class="runners-up-title">
                    <span>Alternative Card Comparison (${runnersUp.length})</span>
                    <span class="runners-up-subtitle">Sorted by eligibility & net return</span>
                </div>
                <div class="runners-up-list">
                    ${runnersUp.map((r, idx) => `
                        <div class="runner-card-row ${r.isOverLimit ? 'row-overlimit' : ''} ${r.isExcluded ? 'row-excluded' : ''}">
                            <div class="runner-rank">
                                <span>#${idx + 2}</span>
                            </div>
                            <div class="runner-info">
                                <div class="runner-name-line">
                                    <span class="card-color-dot-sm" style="background:${r.color};"></span>
                                    <strong>${escapeHtml(r.cardName)}</strong>
                                    <span class="runner-issuer">${escapeHtml(r.cardIssuer)}</span>
                                    ${r.isOverLimit ? `<span class="badge-overlimit"><i class="bi bi-slash-circle"></i> Over Limit</span>` : ''}
                                    ${r.isUpiIncompatible ? `<span class="badge-incompatible"><i class="bi bi-x-circle"></i> RuPay Only</span>` : ''}
                                    ${isMovieQuery && r.entertainment && r.entertainment.movies && r.entertainment.movies.bogo ? `<span class="badge-bogo"><i class="bi bi-ticket-perforated"></i> BOGO</span>` : ''}
                                </div>
                                <div class="runner-note-line">
                                    ${r.isExcluded 
                                        ? `<span class="badge-exclusion"><i class="bi bi-ban"></i> ${escapeHtml(r.exclusionReason)}</span>`
                                        : (r.isOverLimit 
                                            ? `<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> Exceeds limit by ₹${r.overLimitDeficit.toLocaleString('en-IN')}</span>` 
                                            : `<span>${escapeHtml(r.tierName)}</span>`
                                          )
                                    }
                                </div>
                            </div>
                            <div class="runner-return">
                                <div class="return-rate ${r.isExcluded || r.isOverLimit || r.isUpiIncompatible ? 'rate-zero' : ''}">${r.isOverLimit || r.isUpiIncompatible ? '0%' : `${r.applicableRate}%`}</div>
                                <div class="return-amount">${r.isExcluded || r.isOverLimit || r.isUpiIncompatible ? '₹0' : `+${optimizerBridge.formatCurrency(r.cashbackEarned)}`}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

export function clearCardAdvisorSearch() {
    const searchInput = document.getElementById('cardAdvisorSearchInput');
    if (searchInput) searchInput.value = '';
    currentSearchQuery = '';
    renderQuickChips();
    runCardAdvisorSearch();
}

export function renderPrivilegesTab() {
    const container = document.getElementById('cardPrivilegesContent');
    if (!container) return;

    const financeData = optimizerBridge.getFinanceData();
    const cards = financeData.creditCards || {};
    const currentMonth = optimizerBridge.getCurrentMonth();
    const currentYear = currentMonth.slice(0, 4);

    const loungeSummary = getLoungePrivilegesSummary(cards);
    const movieSummary = getMoviePrivilegesSummary(cards);
    const diningSummary = getDiningPrivilegesSummary(cards);
    const brandSummary = getBrandSuperpowersSummary(cards);
    const feeWaiverSummary = getAnnualFeeWaiverSummary(cards, currentMonth);

    container.innerHTML = `
        <!-- Section 1: Airport & Railway Lounges -->
        <div class="privilege-card-section">
            <div class="privilege-section-title">
                <i class="bi bi-airplane-engines" style="color: #3b82f6;"></i>
                <span>Airport & Railway Lounge Access</span>
            </div>

            <div class="privilege-grid">
                <!-- Domestic Lounges -->
                <div class="privilege-box">
                    <div class="privilege-box-header">
                        <i class="bi bi-geo-alt-fill" style="color: #10b981;"></i>
                        <strong>Domestic Airport Lounges</strong>
                    </div>
                    ${loungeSummary.domesticAirport.length > 0 ? `
                        <div class="privilege-items-list">
                            ${loungeSummary.domesticAirport.map(item => `
                                <div class="privilege-item-row">
                                    <div class="privilege-card-ident">
                                        <span class="card-color-dot-sm" style="background:${item.color};"></span>
                                        <span class="p-card-name">${escapeHtml(item.cardName)}</span>
                                    </div>
                                    <div class="privilege-rule-badge ${item.isMilestoneBased ? 'badge-milestone' : 'badge-free'}">
                                        ${item.isMilestoneBased ? 'Milestone' : `${item.visitsPerYear} visits/yr`}
                                    </div>
                                    <div class="privilege-desc-text">${escapeHtml(item.ruleText)}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="privilege-empty-text">No active cards with complimentary domestic airport lounge access.</div>
                    `}
                </div>

                <!-- International & Railway Lounges -->
                <div class="privilege-box">
                    <div class="privilege-box-header">
                        <i class="bi bi-train-front" style="color: #f59e0b;"></i>
                        <strong>Railway & International Lounges</strong>
                    </div>
                    ${(loungeSummary.railwayLounges.length > 0 || loungeSummary.internationalAirport.length > 0) ? `
                        <div class="privilege-items-list">
                            ${loungeSummary.railwayLounges.map(item => `
                                <div class="privilege-item-row">
                                    <div class="privilege-card-ident">
                                        <span class="card-color-dot-sm" style="background:${item.color};"></span>
                                        <span class="p-card-name">${escapeHtml(item.cardName)}</span>
                                        <span class="privilege-network-tag">Railway</span>
                                    </div>
                                    <div class="privilege-rule-badge badge-free">${item.visitsPerYear} visits/yr</div>
                                    <div class="privilege-desc-text">${escapeHtml(item.ruleText)}</div>
                                </div>
                            `).join('')}
                            ${loungeSummary.internationalAirport.map(item => `
                                <div class="privilege-item-row">
                                    <div class="privilege-card-ident">
                                        <span class="card-color-dot-sm" style="background:${item.color};"></span>
                                        <span class="p-card-name">${escapeHtml(item.cardName)}</span>
                                        <span class="privilege-network-tag">International</span>
                                    </div>
                                    <div class="privilege-rule-badge badge-free">${item.visitsPerYear} visits/yr</div>
                                    <div class="privilege-desc-text">${escapeHtml(item.ruleText)}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="privilege-empty-text">No active cards with railway or complimentary international lounge access.</div>
                    `}
                </div>
            </div>
        </div>

        <!-- Section 2: Movie & Entertainment Perks -->
        <div class="privilege-card-section">
            <div class="privilege-section-title">
                <i class="bi bi-film" style="color: #ec4899;"></i>
                <span>Movie & Entertainment Privileges</span>
            </div>
            ${movieSummary.length > 0 ? `
                <div class="movies-privilege-grid">
                    ${movieSummary.map(m => `
                        <div class="movie-card-perk">
                            <div class="movie-header">
                                <span class="card-color-dot-sm" style="background:${m.color};"></span>
                                <strong>${escapeHtml(m.cardName)}</strong>
                                ${m.bogo ? `<span class="bogo-tag">BOGO Offer</span>` : ''}
                            </div>
                            <div class="movie-platform"><i class="bi bi-ticket-perforated"></i> ${escapeHtml(m.platform)}</div>
                            <div class="movie-desc">${escapeHtml(m.description)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="privilege-empty-text">No entertainment perks found on active cards.</div>
            `}
        </div>

        <!-- Section 3: Dining & Culinary Programs (Stackable Discounts) -->
        <div class="privilege-card-section">
            <div class="privilege-section-title">
                <i class="bi bi-cup-hot" style="color: #f97316;"></i>
                <span>Dining & Culinary Programs (Stackable Discounts)</span>
            </div>
            ${diningSummary.length > 0 ? `
                <div class="perk-cards-grid">
                    ${diningSummary.map(d => `
                        <div class="perk-card-box">
                            <div class="perk-card-header">
                                <span class="card-color-dot-sm" style="background:${d.color};"></span>
                                <strong>${escapeHtml(d.cardName)}</strong>
                                <span class="perk-tag-orange">${escapeHtml(d.badge)}</span>
                            </div>
                            <div class="perk-program-title"><i class="bi bi-tag-fill"></i> ${escapeHtml(d.program)}</div>
                            <div class="perk-card-desc">${escapeHtml(d.description)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="privilege-empty-text">No active dining privilege programs found.</div>
            `}
        </div>

        <!-- Section 4: Mega Brand Deals & E-Commerce Superpowers -->
        <div class="privilege-card-section">
            <div class="privilege-section-title">
                <i class="bi bi-lightning-charge" style="color: #8b5cf6;"></i>
                <span>E-Commerce Superpowers & Partner Ecosystems</span>
            </div>
            ${brandSummary.length > 0 ? `
                <div class="perk-cards-grid">
                    ${brandSummary.map(b => `
                        <div class="perk-card-box">
                            <div class="perk-card-header">
                                <span class="card-color-dot-sm" style="background:${b.color};"></span>
                                <strong>${escapeHtml(b.cardName)}</strong>
                                <span class="perk-tag-emerald">${escapeHtml(b.badge)}</span>
                            </div>
                            <div class="perk-program-title"><i class="bi bi-stars"></i> ${escapeHtml(b.title)}</div>
                            <div class="perk-card-desc">${escapeHtml(b.description)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="privilege-empty-text">No partner ecosystem perks found.</div>
            `}
        </div>

        <!-- Section 5: Card Membership Year & Fee Waiver Trackers -->
        <div class="privilege-card-section">
            <div class="privilege-section-title">
                <i class="bi bi-shield-check" style="color: #10b981;"></i>
                <span>Card Membership Year & Fee Waiver Trackers</span>
                <span class="privilege-section-badge">12-Month Rolling Cycle</span>
            </div>
            <div class="privilege-section-subtitle">
                Tracked against each card's individual anniversary start date (12 billing cycles), rather than the calendar year.
            </div>
            ${feeWaiverSummary.length > 0 ? `
                <div class="fee-waiver-list">
                    ${feeWaiverSummary.map(f => `
                        <div class="fee-waiver-item">
                            <div class="fee-waiver-header">
                                <div class="fee-waiver-card-info">
                                    <span class="card-color-dot-sm" style="background:${f.color};"></span>
                                    <strong class="fee-card-name">${escapeHtml(f.cardName)}</strong>
                                    <span class="annual-fee-text">(Annual Fee: ₹${f.annualFee.toLocaleString('en-IN')})</span>
                                </div>
                                <div class="waiver-status ${f.isWaived ? 'waived' : ''}">
                                    ${f.isWaived 
                                        ? '<i class="bi bi-check-circle-fill"></i> Fee Waived!' 
                                        : `<span class="fee-remaining-pill">₹${f.remainingToWaive.toLocaleString('en-IN')} remaining</span>`}
                                </div>
                            </div>
                            
                            <div class="fee-cycle-meta">
                                <span class="fee-cycle-pill"><i class="bi bi-calendar3"></i> Card Year: <strong>${escapeHtml(f.cycleLabel)}</strong></span>
                                <span class="fee-cycle-sub"><i class="bi bi-clock-history"></i> Month ${f.monthsElapsed} of 12 (${f.monthsRemaining} mos remaining)</span>
                            </div>

                            <div class="fee-progress-bar">
                                <div class="fee-progress-fill ${f.isWaived ? 'fill-waived' : 'fill-active'}" 
                                     style="width: ${f.percentAchieved}%; ${!f.isWaived && f.color ? `background: ${f.color};` : ''}">
                                </div>
                            </div>
                            <div class="fee-waiver-footer">
                                <span>Spent in Card Year: <strong>₹${f.annualSpend.toLocaleString('en-IN')}</strong> of ₹${f.feeWaiverSpendTarget.toLocaleString('en-IN')} (${f.percentAchieved}%)</span>
                                ${!f.isWaived && f.monthsRemaining > 0 ? `
                                    <span class="fee-pacing-note"><i class="bi bi-graph-up-arrow"></i> Pace: <strong>₹${f.monthlyRequired.toLocaleString('en-IN')}/mo</strong> needed</span>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="privilege-empty-text">All your active cards are either Lifetime Free (LTF) or do not require annual spend waivers!</div>
            `}
        </div>
    `;
}

export function toggleCardCheatSheet() {
    const container = document.getElementById('creditCardCheatSheetContainer');
    const btnText = document.getElementById('cheatSheetBtnText');
    if (!container) return;

    isCheatSheetOpen = !isCheatSheetOpen;
    container.style.display = isCheatSheetOpen ? 'block' : 'none';

    if (btnText) {
        btnText.textContent = isCheatSheetOpen ? 'Hide Matrix' : 'Cheat Sheet';
    }

    if (isCheatSheetOpen) {
        renderCardCheatSheet();
    }
}

export function renderCardCheatSheet() {
    const grid = document.getElementById('cardCheatSheetGrid');
    if (!grid) return;

    const financeData = optimizerBridge.getFinanceData();
    const cards = financeData.creditCards || {};

    const matrix = generateCategoryCheatSheet(cards);

    if (matrix.length === 0 || !matrix[0].winner) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-muted);">
                Add credit cards to view your personalized daily spend cheat sheet.
            </div>
        `;
        return;
    }

    grid.innerHTML = matrix.map(item => `
        <div class="cheat-card" onclick="window.openCardOptimizerModal('${item.query}')">
            <div class="cheat-card-header">
                <i class="bi ${item.icon}"></i>
                <span>${escapeHtml(item.title)}</span>
            </div>
            <div class="cheat-card-body">
                ${item.winner ? `
                    <div class="winner-row">
                        <span class="winner-dot" style="background:${item.winner.color};"></span>
                        <span class="winner-name">${escapeHtml(item.winner.cardName)}</span>
                        <span class="winner-rate-badge">${item.winner.applicableRate}%</span>
                    </div>
                    ${item.runnerUp ? `
                        <div class="runner-row">
                            <span class="runner-sub">Alt: ${escapeHtml(item.runnerUp.cardName)} (${item.runnerUp.applicableRate}%)</span>
                        </div>
                    ` : ''}
                ` : `
                    <div class="winner-row">
                        <span class="winner-name text-muted">No card</span>
                    </div>
                `}
            </div>
        </div>
    `).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Bind to window for HTML onclick compatibility
if (typeof window !== 'undefined') {
    window.openCardOptimizerModal = openCardOptimizerModal;
    window.closeCardOptimizerModal = closeCardOptimizerModal;
    window.switchCardOptimizerTab = switchCardOptimizerTab;
    window.selectCardAdvisorChip = selectCardAdvisorChip;
    window.runCardAdvisorSearch = runCardAdvisorSearch;
    window.clearCardAdvisorSearch = clearCardAdvisorSearch;
    window.toggleCardCheatSheet = toggleCardCheatSheet;
    window.renderCardCheatSheet = renderCardCheatSheet;
}

