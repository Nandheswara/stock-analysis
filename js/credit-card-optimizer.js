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
    'icici-emeralde-metal': {
        id: 'icici-emeralde-metal',
        name: 'ICICI Emeralde Private Metal Credit Card',
        shortName: 'ICICI Emeralde Metal',
        color: '#1e293b',
        matcher: /emeralde.*metal|metal.*emeralde|emeralde\s*private/i,
        issuer: 'ICICI Bank',
        network: 'Visa Infinite',
        cardType: 'Super-Premium Luxury Metal',
        annualFee: 12499,
        joiningFee: 12499,
        feeWaiverSpendTarget: 1000000,
        forexMarkupPercent: 2.0,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 0.75,
        bestFor: "Luxury travelers, golfers, and movie lovers seeking unconditional global lounges & zero-hurdle BMS BOGO",
        welcomeBenefit: "Taj Epicure membership + 12,500 bonus reward points + luxury brand vouchers on paying joining fee",
        keyBenefitsSummary: [
            "Unlimited Complimentary Domestic & International Airport Lounges worldwide (Zero quarterly spend hurdle)",
            "BookMyShow BOGO: Buy 1 Get 1 Free up to ₹750 off on 2nd movie ticket up to 4 times a month (saves up to ₹36,000/yr, no spend hurdle)",
            "Unlimited Complimentary Golf rounds and coaching lessons every month",
            "Reduced 2.0% Forex Markup Fee on international foreign currency transactions",
            "6 ICICI Reward Points per ₹200 on retail transactions (0.75% return) with uncapped earning",
            "Exempt from 1% fuel surcharge fee on spends > ₹10,000 and exempt from utility transaction fee",
            "1% Fuel Surcharge Waiver on spends between ₹400 and ₹4,000 at all petrol pumps"
        ],
        pros: [
            "Unconditional Global Lounge Access: Unlimited domestic and international airport lounges worldwide for primary and add-on cardholders with zero spend hurdles.",
            "Highest BookMyShow Allowance: Buy 1 Get 1 Free up to ₹750 off per ticket up to 4 times a month (up to ₹36,000/yr savings) with no minimum quarterly spend required.",
            "Unlimited Complimentary Golf: Unlimited golf games and coaching lessons every month across top golf clubs in India and abroad.",
            "Reduced 2.0% Forex Fee: Much lower currency conversion markup compared to standard 3.5% fee on other ICICI cards.",
            "Special Fee Exemptions: Exempt from the 1% fuel fee on swipes over ₹10k and exempt from the 1% utility processing fee over ₹50k."
        ],
        cons: [
            "High Annual Fee: ₹12,499 + 18% GST joining and annual renewal fee.",
            "High Fee Waiver Threshold: Requires ₹10,00,000 annual retail spend to waive the annual fee (excludes rent, govt & education).",
            "Modest Base Reward Rate: Earning 0.75% base return (6 RP/₹200) is modest compared to HDFC Infinia (3.33%).",
            "Reward Redemption Handling Fee: ₹99 + 18% GST fee applies on every reward points redemption order."
        ],
        tiers: [
            {
                rate: 1.5,
                name: "International Spends (12 RP/₹200 = 1.5%)",
                categories: ["forex", "international"],
                merchants: [],
                monthlyCap: null,
                notes: "12 ICICI Reward Points per ₹200 spent internationally (1.5% return)."
            },
            {
                rate: 0.75,
                name: "Domestic Retail Spends (6 RP/₹200 = 0.75%)",
                categories: ["all-retail", "shopping", "dining", "travel"],
                merchants: [],
                monthlyCap: null,
                notes: "6 ICICI Reward Points per ₹200 spent domestically (0.75% return, uncapped)."
            },
            {
                rate: 0.25,
                name: "Utilities & Insurance (2 RP/₹200 = 0.25%)",
                categories: ["utilities", "insurance"],
                merchants: ["electricity", "water", "gas", "lic"],
                monthlyCap: null,
                notes: "2 ICICI Reward Points per ₹200 spent on utilities and insurance (0.25% return; ₹80k monthly cap per cycle)."
            }
        ],
        exclusions: [
            { category: "fuel", reason: "Fuel excluded from reward points (1% surcharge waiver ₹400-₹4,000 applies; exempt from > ₹10k fee)." },
            { category: "rent", reason: "Rent payments (MCC 6513) earn 0% rewards + 1% processing fee." },
            { category: "wallet", reason: "Prepaid wallet loads earn 0% rewards (1% fee applies on loads ≥ ₹5,000)." },
            { category: "government", reason: "Government tax and challan payments earn 0% rewards." },
            { category: "gaming", reason: "Online skill-based gaming (MCC 5816) earns 0% rewards + 2% fee." },
            { category: "education", reason: "Education payments via 3rd-party apps (CRED, Paytm) earn 0% + 1% fee. Direct payments earn standard reward points with 0% fee." },
            { category: "emi", reason: "EMI transactions earn 0% rewards." }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: true,
                isMilestoneBased: false,
                visitsPerYear: 999,
                ruleText: "Unlimited complimentary domestic airport lounge visits for primary & add-on cardholders (No spend hurdle).",
                spendCriteria: "None (Direct swipe)"
            },
            internationalAirport: {
                hasAccess: true,
                visitsPerYear: 999,
                ruleText: "Unlimited complimentary international airport lounge access worldwide via DreamFolks / Priority Pass.",
                spendCriteria: "Priority Pass / DreamFolks"
            },
            railwayLounge: {
                hasAccess: true,
                visitsPerYear: 16,
                ruleText: "4 complimentary railway lounge visits per quarter across India.",
                spendCriteria: "Direct swipe"
            }
        },
        entertainment: {
            movies: {
                type: "bogo",
                bogo: true,
                maxDiscount: 750,
                platform: "BookMyShow",
                description: "Buy 1 Get 1 Free: Up to ₹750 off on 2nd movie ticket up to 4 times a month on BookMyShow (exempt from spend hurdle)."
            }
        },
        golf: {
            hasAccess: true,
            roundsPerMonth: 999,
            description: "Unlimited complimentary golf rounds and lessons every month at premier courses worldwide.",
            spendCriteria: "None (Privileged access)"
        }
    },

    'icici-sapphiro-visa': {
        id: 'icici-sapphiro-visa',
        name: 'ICICI Sapphiro Visa Credit Card',
        shortName: 'ICICI Sapphiro',
        color: '#0284c7',
        matcher: /sapphir|saphiri/i,
        issuer: 'ICICI Bank',
        network: 'Visa Signature / Infinite',
        cardType: 'Premium Lifestyle & Travel',
        annualFee: 3500,
        joiningFee: 6500,
        feeWaiverSpendTarget: 600000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 0.5,
        bestFor: "BookMyShow BOGO movie lovers, golf rounds, and travelers with ₹75k+ quarterly spends",
        welcomeBenefit: "Vouchers worth ₹9,000+ (Tata CLiQ, EaseMyTrip, Croma, Uber) on paying joining fee",
        keyBenefitsSummary: [
            "4 Domestic Airport Lounges/quarter (on ₹75k spend in prev calendar quarter w.e.f. Jan 01, 2025)",
            "2 Complimentary International Airport Lounges/year via DreamFolks / Priority Pass",
            "BookMyShow BOGO: Buy 1 Get 1 Free up to ₹500 off on second ticket twice a month (saves up to ₹12,000/yr, on ₹25k spend in prev quarter w.e.f. Jan 15, 2026)",
            "Up to 4 complimentary golf rounds or lessons per month",
            "ICICI Culinary Treats: Minimum 15% discount at 2,500+ restaurants",
            "4 ICICI Reward Points per ₹100 on international spends (1% return)",
            "1% Fuel Surcharge Waiver on spends between ₹400 and ₹4,000 (up to ₹50k/cycle)"
        ],
        pros: [
            "High Movie Savings: Buy 1 Get 1 Free up to ₹500 off on 2nd movie ticket twice a month on BookMyShow (saves up to ₹12,000 annually).",
            "Generous Welcome Gift: Brand vouchers worth over ₹9,000–₹13,000 comfortably offset the initial ₹6,500 joining fee.",
            "Generous Domestic Lounge Quota: Up to 16 complimentary domestic airport lounge visits per year (4 per quarter).",
            "Complimentary International Lounges: 2 free international lounge visits per calendar year via DreamFolks membership.",
            "Complimentary Golf: Up to 4 free golf rounds or coaching lessons per month across top golf courses in India.",
            "Accelerated International Rewards: 4 Reward Points per ₹100 spent internationally (1% return).",
            "Frequent LTF for Alumni & Corporates: Widely available as Lifetime Free (LTF) under ICICI Alumni Program (IITs, IIMs, NITs) or corporate salary tiers."
        ],
        cons: [
            "Low Base Domestic Rewards: Earning only 2 RP per ₹100 (0.5% return) is uncompetitive compared to dedicated cashback cards (e.g. SBI Cashback at 5%, HSBC Live+ at 10%).",
            "Strict Quarterly Lounge Spend Hurdle: Requires spending ₹75,000 in the previous calendar quarter to unlock domestic airport lounges (w.e.f. Jan 01, 2025).",
            "BookMyShow Spend Hurdle: Requires spending ₹25,000 in the previous calendar quarter to unlock BookMyShow BOGO offers (w.e.f. Jan 15, 2026).",
            "Monthly Category Cappings: Utility (₹80k), Insurance (₹80k), Grocery (₹40k), Transportation (₹20k w.e.f. Feb 01, 2026) max spend cap per statement cycle.",
            "High Annual Fee Waiver Threshold: Requires ₹6,00,000 annual spend to waive the ₹3,500 renewal fee (excludes rent, govt & education).",
            "Reward Redemption Handling Fee: ICICI levies a ₹99 + 18% GST handling fee on every redemption order.",
            "Standard 3.5% Forex Fee: No reduced forex markup for international spends compared to 0% cards like Scapia."
        ],
        tiers: [
            {
                rate: 1,
                name: "International Spends (4 RP/₹100 = 1%)",
                categories: ["forex", "international"],
                merchants: [],
                monthlyCap: null,
                notes: "4 ICICI Reward Points per ₹100 spent internationally (1 RP = ₹0.25 => 1% return)."
            },
            {
                rate: 0.5,
                name: "Domestic Retail Spends (2 RP/₹100 = 0.5%)",
                categories: ["all-retail", "shopping", "dining", "travel"],
                merchants: [],
                monthlyCap: null,
                notes: "2 ICICI Reward Points per ₹100 spent domestically (1 RP = ₹0.25 => 0.5% return)."
            },
            {
                rate: 0.25,
                name: "Utilities & Insurance (1 RP/₹100 = 0.25%)",
                categories: ["utilities", "insurance"],
                merchants: ["electricity", "water", "gas", "lic"],
                monthlyCap: null,
                notes: "1 ICICI Reward Point per ₹100 spent on utilities and insurance (0.25% return; capped at ₹80k spend/cycle)."
            }
        ],
        exclusions: [
            { category: "fuel", reason: "Fuel excluded from rewards (1% fuel surcharge waiver ₹400-₹4,000 applies up to ₹50k/cycle; 1% fee on spends > ₹10,000)." },
            { category: "rent", reason: "Rent payments (MCC 6513) earn 0% rewards + 1% processing fee." },
            { category: "wallet", reason: "Wallet loading earns 0% rewards (1% fee applies on loads ≥ ₹5,000 w.e.f. Jan 2026)." },
            { category: "government", reason: "Government tax and challan payments earn 0% rewards." },
            { category: "gaming", reason: "Online skill-based gaming (MCC 5816) earns 0% rewards + 2% transaction fee." },
            { category: "education", reason: "Education payments via 3rd-party apps (CRED, Paytm) earn 0% + 1% fee. Direct payments earn standard reward points with 0% fee." },
            { category: "emi", reason: "EMI transactions earn 0% rewards." },
            { category: "transportation", reason: "Transportation spends > ₹50,000 incur a 1% fee (MCC 4111, 4112, 4784, 4131 w.e.f. Jan 15, 2026)." }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: true,
                isMilestoneBased: true,
                visitsPerYear: 16,
                ruleText: "4 complimentary visits per calendar quarter (requires spending ₹75,000 in previous calendar quarter via Visa direct swipe w.e.f. Jan 01, 2025).",
                spendCriteria: "₹75,000 in prev calendar quarter"
            },
            internationalAirport: {
                hasAccess: true,
                visitsPerYear: 2,
                ruleText: "2 complimentary visits per calendar year via DreamFolks / Priority Pass.",
                spendCriteria: "Priority Pass / DreamFolks"
            },
            railwayLounge: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No railway lounge access."
            }
        },
        entertainment: {
            movies: {
                type: "bogo",
                bogo: true,
                maxDiscount: 500,
                platform: "BookMyShow",
                description: "Buy 1 Get 1 Free: Up to ₹500 off on second movie ticket, usable twice per calendar month on BookMyShow (requires spending ₹25,000 in previous quarter w.e.f. Jan 15, 2026)."
            }
        },
        golf: {
            hasAccess: true,
            roundsPerMonth: 4,
            description: "Up to 4 complimentary golf rounds or lessons every month based on ₹50,000 monthly retail spend.",
            spendCriteria: "₹50,000 monthly spend"
        }
    },

    'icici-rubyx': {
        id: 'icici-rubyx',
        name: 'ICICI Rubyx Credit Card',
        shortName: 'ICICI Rubyx',
        color: '#b91c1c',
        matcher: /rubyx/i,
        issuer: 'ICICI Bank',
        network: 'Visa / Mastercard Dual',
        cardType: 'Mid-Tier Lifestyle',
        annualFee: 2000,
        joiningFee: 3000,
        feeWaiverSpendTarget: 300000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 0.5,
        bestFor: "Movie lovers (25% off BMS), railway travelers & mid-tier golfers",
        welcomeBenefit: "Shopping and travel vouchers worth ₹5,000+ on paying joining fee",
        keyBenefitsSummary: [
            "2 Domestic Airport Lounges/quarter (on ₹75k spend in prev calendar quarter w.e.f. Jan 01, 2025)",
            "2 Railway Lounges/quarter across major railway junctions",
            "25% discount on BookMyShow & Inox up to ₹150 twice a month (requires ₹25k quarterly spend w.e.f. Jan 15, 2026)",
            "2 complimentary golf rounds or lessons per month",
            "ICICI Culinary Treats dining discounts"
        ],
        pros: [
            "Both Airport & Railway Lounge Access: 2 airport + 2 railway lounges per quarter.",
            "Movie Ticket Discounts: 25% off up to ₹150 per ticket twice a month on BookMyShow.",
            "Complimentary Golf: 2 free golf rounds/lessons per month on ₹50k monthly spend.",
            "Welcome Vouchers: ₹5,000+ vouchers offset the ₹3,000 joining fee."
        ],
        cons: [
            "Quarterly lounge spend criterion: Requires ₹75,000 quarterly spend for domestic airport lounges (w.e.f. Jan 01, 2025).",
            "BookMyShow Spend Hurdle: Requires spending ₹25,000 in previous quarter to unlock 25% movie discount (w.e.f. Jan 15, 2026).",
            "Monthly Category Cappings: Utility (₹80k), Insurance (₹80k), Grocery (₹40k), Transportation (₹20k w.e.f. Feb 01, 2026) monthly cap per cycle.",
            "Low domestic reward rate of 0.5% (2 RP/₹100).",
            "₹99 + GST redemption fee per order."
        ],
        tiers: [
            {
                rate: 1,
                name: "International Spends (1%)",
                categories: ["forex", "international"],
                merchants: [],
                monthlyCap: null,
                notes: "4 Reward Points per ₹100 spent internationally (1% return)."
            },
            {
                rate: 0.5,
                name: "Domestic Retail Spends (0.5%)",
                categories: ["all-retail", "shopping", "dining", "travel"],
                merchants: [],
                monthlyCap: null,
                notes: "2 Reward Points per ₹100 spent domestically (0.5% return)."
            },
            {
                rate: 0.25,
                name: "Utilities & Insurance (0.25%)",
                categories: ["utilities", "insurance"],
                merchants: ["electricity", "water", "gas", "lic"],
                monthlyCap: null,
                notes: "1 Reward Point per ₹100 on utilities & insurance (0.25% return; capped at ₹80k spend/cycle)."
            }
        ],
        exclusions: [
            { category: "fuel", reason: "Fuel excluded (1% surcharge waiver ₹400-₹4,000 applies up to ₹50k/cycle; 1% fee on spends > ₹10,000)." },
            { category: "rent", reason: "Rent payments (MCC 6513) earn 0% rewards + 1% processing fee." },
            { category: "wallet", reason: "Wallet loading earns 0% (1% fee on loads ≥ ₹5,000 w.e.f. Jan 2026)." },
            { category: "government", reason: "Government tax and challan payments earn 0% rewards." },
            { category: "gaming", reason: "Online skill-based gaming (MCC 5816) earns 0% rewards + 2% transaction fee." },
            { category: "education", reason: "Education payments via 3rd-party apps (CRED, Paytm) earn 0% + 1% fee. Direct payments earn standard reward points with 0% fee." },
            { category: "transportation", reason: "Transportation spends > ₹50,000 incur a 1% fee (MCC 4111, 4112, 4784, 4131 w.e.f. Jan 15, 2026)." }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: true,
                isMilestoneBased: true,
                visitsPerYear: 8,
                ruleText: "2 complimentary domestic visits per calendar quarter (unlocked on ₹75,000 spend in previous calendar quarter w.e.f. Jan 01, 2025).",
                spendCriteria: "₹75,000 in prev quarter"
            },
            internationalAirport: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No international lounge access."
            },
            railwayLounge: {
                hasAccess: true,
                visitsPerYear: 8,
                ruleText: "2 complimentary railway lounge visits per quarter across major Indian railway junctions.",
                spendCriteria: "None (Direct swipe)"
            }
        },
        entertainment: {
            movies: {
                type: "discount",
                bogo: false,
                rate: 25,
                platform: "BookMyShow",
                description: "25% discount (up to ₹150 off per ticket) twice a month on BookMyShow & Inox (requires spending ₹25,000 in previous quarter w.e.f. Jan 15, 2026)."
            }
        },
        golf: {
            hasAccess: true,
            roundsPerMonth: 2,
            description: "2 complimentary golf rounds or lessons per month on ₹50,000 monthly spend.",
            spendCriteria: "₹50,000 monthly spend"
        }
    },

    'icici-coral': {
        id: 'icici-coral',
        name: 'ICICI Coral Credit Card',
        shortName: 'ICICI Coral',
        color: '#ea580c',
        matcher: /coral/i,
        issuer: 'ICICI Bank',
        network: 'Visa / Mastercard / RuPay',
        cardType: 'Entry Lifestyle',
        annualFee: 500,
        joiningFee: 500,
        feeWaiverSpendTarget: 150000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 0.5,
        bestFor: "First-time cardholders wanting railway & airport lounge access with low fees",
        welcomeBenefit: "Welcome bonus reward points upon card activation",
        keyBenefitsSummary: [
            "1 Domestic Airport Lounge/quarter (on ₹75k spend in prev calendar quarter w.e.f. Jan 01, 2025)",
            "1 Railway Lounge/quarter across India",
            "25% discount on BookMyShow up to ₹100 twice/month (requires ₹25k quarterly spend w.e.f. Jan 15, 2026)",
            "RuPay variant available for UPI QR Scan & Pay"
        ],
        pros: [
            "Affordable annual fee (₹500) waived on ₹1.5L annual spend (excludes rent, govt & education).",
            "Railway Lounge Access: 1 complimentary railway lounge per quarter.",
            "BookMyShow discount: 25% off up to ₹100 twice a month.",
            "RuPay variant connects seamlessly to UPI for payments at local merchants."
        ],
        cons: [
            "Requires ₹75,000 spend in previous quarter to unlock 1 airport lounge visit (w.e.f. Jan 01, 2025).",
            "BookMyShow Spend Hurdle: Requires spending ₹25,000 in previous quarter to unlock 25% movie discount (w.e.f. Jan 15, 2026).",
            "Monthly Category Cappings: Utility (₹40k), Insurance (₹40k), Grocery (₹20k), Transportation (₹10k w.e.f. Feb 01, 2026) monthly cap per cycle.",
            "Low domestic reward rate of 0.5% (2 RP/₹100).",
            "No international lounge access."
        ],
        tiers: [
            {
                rate: 0.5,
                name: "Domestic Retail Spends (0.5%)",
                categories: ["all-retail", "shopping", "dining", "travel"],
                merchants: [],
                monthlyCap: null,
                notes: "2 Reward Points per ₹100 spent domestically (0.5% return)."
            },
            {
                rate: 0.25,
                name: "Utilities & Insurance (0.25%)",
                categories: ["utilities", "insurance"],
                merchants: ["electricity", "water", "gas", "lic"],
                monthlyCap: null,
                notes: "1 Reward Point per ₹100 on utilities & insurance (0.25% return; capped at ₹40k spend/cycle)."
            }
        ],
        exclusions: [
            { category: "fuel", reason: "Fuel excluded (1% surcharge waiver ₹400-₹4,000 applies up to ₹50k/cycle; 1% fee on spends > ₹10,000)." },
            { category: "rent", reason: "Rent payments (MCC 6513) earn 0% rewards + 1% processing fee." },
            { category: "wallet", reason: "Wallet loading excluded (1% fee on loads ≥ ₹5,000 w.e.f. Jan 2026)." },
            { category: "government", reason: "Government tax and challan payments earn 0% rewards." },
            { category: "gaming", reason: "Online skill-based gaming (MCC 5816) earns 0% rewards + 2% transaction fee." },
            { category: "education", reason: "Education payments via 3rd-party apps (CRED, Paytm) earn 0% + 1% fee. Direct payments earn standard reward points with 0% fee." },
            { category: "transportation", reason: "Transportation spends > ₹50,000 incur a 1% fee (MCC 4111, 4112, 4784, 4131 w.e.f. Jan 15, 2026)." }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: true,
                isMilestoneBased: true,
                visitsPerYear: 4,
                ruleText: "1 complimentary domestic visit per calendar quarter (on ₹75,000 spend in previous calendar quarter w.e.f. Jan 01, 2025).",
                spendCriteria: "₹75,000 in prev quarter"
            },
            internationalAirport: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No international lounge access."
            },
            railwayLounge: {
                hasAccess: true,
                visitsPerYear: 4,
                ruleText: "1 complimentary railway lounge visit per quarter.",
                spendCriteria: "Direct swipe"
            }
        },
        entertainment: {
            movies: {
                type: "discount",
                bogo: false,
                rate: 25,
                platform: "BookMyShow",
                description: "25% discount up to ₹100 on BookMyShow & Inox twice a month (requires spending ₹25,000 in previous quarter w.e.f. Jan 15, 2026)."
            }
        }
    },

    'amazon-pay-icici': {
        id: 'amazon-pay-icici',
        name: 'Amazon Pay ICICI Credit Card',
        shortName: 'Amazon Pay ICICI',
        color: '#d97706',
        matcher: /(amazon\s*pay)|((?=.*amazon)(?=.*(pay|icici)))/i,
        issuer: 'ICICI Bank',
        network: 'Visa Platinum',
        cardType: 'Uncapped E-Commerce Cashback',
        annualFee: 0,
        joiningFee: 0,
        feeWaiverSpendTarget: 0,
        forexMarkupPercent: 1.99,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 1,
        bestFor: "Amazon Prime shoppers, uncapped cashback lovers, lifetime free cardholders",
        welcomeBenefit: "Up to ₹2,000+ in Amazon Pay balance & shopping coupons on card approval",
        keyBenefitsSummary: [
            "Lifetime Free (LTF): ₹0 Joining Fee, ₹0 Annual Fee forever",
            "5% Unlimited Cashback on Amazon.in for Prime members (3% for non-Prime)",
            "2% Unlimited Cashback on 100+ partner apps via Amazon Pay & bills paid inside Amazon Pay",
            "1% Unlimited Cashback on all other eligible domestic retail merchant spends",
            "Reduced 1.99% Forex Markup Fee on foreign currency transactions (0% cashback on international spends)",
            "Auto-credit directly to Amazon Pay balance every month with zero redemption charges"
        ],
        pros: [
            "Zero Annual Fees: Completely Lifetime Free (LTF) with no hidden conditions or renewal charges.",
            "Uncapped 5% Cashback: No monthly limit or ceiling on 5% cashback on Amazon.in shopping.",
            "Automatic Credit: Cashback is automatically credited as Amazon Pay balance every billing cycle with ₹0 redemption fees.",
            "Reduced 1.99% Forex Markup: Lower foreign currency conversion fee (1.99% w.e.f. Oct 1, 2025).",
            "No Cost EMI: 3-month merchant No Cost EMI frequently available on Amazon.in.",
            "ICICI Culinary Treats: Minimum 15% discount at 2,500+ partner dining restaurants."
        ],
        cons: [
            "No complimentary airport or railway lounge access.",
            "International spends earn 0% cashback (w.e.f. Oct 11, 2025, with 1.99% forex markup).",
            "Utility bills paid outside Amazon platform earn 0% cashback (w.e.f. Oct 11, 2025; pay via Amazon Pay to get 2%).",
            "Education, government tax, rent, and wallet reloads earn 0% cashback.",
            "Non-Prime members earn 3% on Amazon shopping instead of 5%.",
            "Cashback is credited to Amazon Pay wallet (cannot be directly transferred to bank account)."
        ],
        tiers: [
            {
                "rate": 5,
                "name": "Amazon.in Shopping (5% Unlimited)",
                "categories": [],
                "merchants": [
                    "amazon",
                    "amazon.in",
                    "amazon shopping",
                    "amazon fresh"
                ],
                "monthlyCap": null,
                "notes": "5% Unlimited Cashback for Prime members (3% for non-Prime) credited directly to Amazon Pay balance."
            },
            {
                "rate": 2,
                "name": "Amazon Pay Partner Apps & Bill Payments (2%)",
                "categories": [],
                "merchants": [
                    "amazon pay",
                    "uber",
                    "swiggy",
                    "yatra",
                    "bookmyshow",
                    "redbus",
                    "abhibus",
                    "rapido",
                    "eazydiner"
                ],
                "monthlyCap": null,
                "notes": "2% Unlimited Cashback on 100+ partner merchants via Amazon Pay and digital bills/recharges paid directly inside Amazon Pay."
            },
            {
                "rate": 1,
                "name": "All Other Eligible Domestic Spends (1% Unlimited)",
                "categories": [
                    "all-retail"
                ],
                "merchants": [],
                "monthlyCap": null,
                "notes": "1% Unlimited Cashback on all other eligible domestic merchant transactions."
            }
        ],
        exclusions: [
            {
                "category": "fuel",
                "reason": "Fuel transactions earn 0% cashback (1% fuel surcharge waiver applies on all petrol pumps; 1% fee on spends exceeding ₹10,000)."
            },
            {
                "category": "rent",
                "reason": "Rent payments via third-party apps earn 0% cashback + 1% processing fee (w.e.f. Jun 18, 2024)."
            },
            {
                "category": "wallet",
                "reason": "Wallet loading (Paytm, Mobikwik, Amazon Pay balance) earns 0% cashback (1% fee applies for loads ≥ ₹5,000 w.e.f. Jan 2026)."
            },
            {
                "category": "emi",
                "reason": "Purchases converted to EMI earn 0% cashback (No Cost EMI up to 3 months available on Amazon)."
            },
            {
                "category": "gold",
                "reason": "Gold coins via Amazon Pay, gold, silver, and precious metals earn 0% cashback."
            },
            {
                "category": "jewellery",
                "reason": "Purchases of gold, silver, and jewellery earn 0% cashback."
            },
            {
                "category": "jewelry",
                "reason": "Purchases of gold, silver, and jewellery earn 0% cashback."
            },
            {
                "category": "government",
                "reason": "Government tax and challan payments earn 0% cashback."
            },
            {
                "category": "education",
                "reason": "Education and school/college fees earn 0% cashback (w.e.f. Oct 11, 2025; 1% fee on third-party apps)."
            },
            {
                "category": "international",
                "reason": "Per ICICI terms w.e.f. Oct 11, 2025, international and foreign currency spends earn 0% cashback (1.99% forex markup applies)."
            },
            {
                "category": "forex",
                "reason": "Per ICICI terms w.e.f. Oct 11, 2025, international and foreign currency spends earn 0% cashback (1.99% forex markup applies)."
            },
            {
                "category": "utilities",
                "reason": "Per ICICI terms w.e.f. Oct 11, 2025, utility bills paid outside the Amazon platform earn 0% cashback. Pay via Amazon Pay app to earn 2% cashback."
            },
            {
                "category": "gaming",
                "reason": "Skill-based online gaming (MCC 5816) earns 0% cashback + 2% transaction fee."
            },
            {
                "category": "transportation",
                "reason": "Transportation spends > ₹50,000 incur a 1% fee (MCC 4111, 4112, 4784, 4131 w.e.f. Jan 15, 2026)."
            }
        ],
        lounges: {
            "domesticAirport": {
                "hasAccess": false,
                "visitsPerYear": 0,
                "ruleText": "No complimentary lounge access (Lifetime Free card)."
            },
            "internationalAirport": {
                "hasAccess": false,
                "visitsPerYear": 0,
                "ruleText": "No complimentary international lounge access."
            },
            "railwayLounge": {
                "hasAccess": false,
                "visitsPerYear": 0,
                "ruleText": "No railway lounge access."
            }
        },
        entertainment: {
            "movies": {
                "type": "cashback",
                "bogo": false,
                "rate": 2,
                "platform": "BookMyShow via Amazon Pay",
                "description": "2% cashback when BookMyShow is paid through Amazon Pay gateway, else 1% direct."
            }
        }
    },

    'icici-platinum-chip': {
        id: 'icici-platinum-chip',
        name: 'ICICI Platinum Chip Credit Card',
        shortName: 'ICICI Platinum Chip',
        color: '#64748b',
        matcher: /platinum\s*chip|chip\s*platinum/i,
        issuer: 'ICICI Bank',
        network: 'Visa Platinum',
        cardType: 'Entry Lifetime Free',
        annualFee: 0,
        joiningFee: 0,
        feeWaiverSpendTarget: 0,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 0.5,
        bestFor: "First-time cardholders and individuals wanting a zero-fee credit card to build credit history with ICICI Bank",
        welcomeBenefit: "Lifetime Free card with ₹0 annual fee forever",
        keyBenefitsSummary: [
            "Lifetime Free (LTF): ₹0 Joining Fee and ₹0 Annual Fee for life",
            "2 ICICI Reward Points per ₹100 on retail purchases (0.5% return)",
            "1 ICICI Reward Point per ₹100 on utilities and insurance (0.25% return)",
            "1% Fuel Surcharge Waiver on transactions between ₹400 and ₹4,000 at all petrol pumps",
            "ICICI Culinary Treats: Minimum 15% discount at 2,500+ partner restaurants across India"
        ],
        pros: [
            "Completely Lifetime Free: Zero joining fee and zero annual renewal fee forever with no minimum spend conditions.",
            "CIBIL Score Building: Excellent starter credit card for students, fresh graduates, and first-time applicants.",
            "Pre-approved ICICI Upgrades: Regular spending opens pre-approved upgrade offers to Coral, Rubyx, or Sapphiro.",
            "Fuel Surcharge Waiver: Full 1% waiver across petrol pumps for transactions between ₹400 and ₹4,000."
        ],
        cons: [
            "No Lounge Access: Does not offer complimentary airport or railway lounge visits.",
            "No Movie Offers: No BookMyShow BOGO or movie ticket discounts.",
            "Low Base Rewards: 0.5% return (2 RP/₹100) is modest compared to cashback cards.",
            "Monthly Category Spend Caps: Utility/Insurance capped at ₹40k, Grocery capped at ₹20k, Transportation capped at ₹10k per cycle."
        ],
        tiers: [
            {
                rate: 0.5,
                name: "Domestic Retail Spends (0.5%)",
                categories: ["all-retail", "shopping", "dining", "travel"],
                merchants: [],
                monthlyCap: null,
                notes: "2 ICICI Reward Points per ₹100 spent domestically (0.5% return)."
            },
            {
                rate: 0.25,
                name: "Utilities & Insurance (0.25%)",
                categories: ["utilities", "insurance"],
                merchants: ["electricity", "water", "gas", "lic"],
                monthlyCap: null,
                notes: "1 ICICI Reward Point per ₹100 on utilities & insurance (0.25% return; capped at ₹40k spend/cycle)."
            }
        ],
        exclusions: [
            { category: "fuel", reason: "Fuel excluded (1% surcharge waiver ₹400-₹4,000 applies up to ₹50k/cycle; 1% fee on spends > ₹10,000)." },
            { category: "rent", reason: "Rent payments (MCC 6513) earn 0% rewards + 1% processing fee." },
            { category: "wallet", reason: "Wallet loading earns 0% (1% fee on loads ≥ ₹5,000 w.e.f. Jan 2026)." },
            { category: "government", reason: "Government tax and challan payments earn 0% rewards." },
            { category: "gaming", reason: "Online skill-based gaming (MCC 5816) earns 0% rewards + 2% transaction fee." },
            { category: "transportation", reason: "Transportation spends > ₹50,000 incur a 1% fee (MCC 4111, 4112, 4784, 4131 w.e.f. Jan 15, 2026)." }
        ],
        lounges: {
            domesticAirport: { hasAccess: false, visitsPerYear: 0, ruleText: "No complimentary domestic airport lounge access." },
            internationalAirport: { hasAccess: false, visitsPerYear: 0, ruleText: "No complimentary international lounge access." },
            railwayLounge: { hasAccess: false, visitsPerYear: 0, ruleText: "No complimentary railway lounge access." }
        }
    },

    'icici-makemytrip': {
        id: 'icici-makemytrip',
        name: 'MakeMyTrip ICICI Bank Credit Card',
        shortName: 'MMT ICICI',
        color: '#dc2626',
        matcher: /makemytrip|mmt.*icici|icici.*mmt/i,
        issuer: 'ICICI Bank',
        network: 'Visa Platinum / Signature',
        cardType: 'Co-Branded Travel & Forex',
        annualFee: 999,
        joiningFee: 999,
        feeWaiverSpendTarget: 250000,
        forexMarkupPercent: 0.0,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 1.0,
        bestFor: "Frequent travelers booking flights, hotels, and holidays on MakeMyTrip wanting 0% forex markup",
        welcomeBenefit: "₹1,500 MakeMyTrip My Cash + MMTBLACK Gold membership + ₹2,500 hotel & holiday vouchers",
        keyBenefitsSummary: [
            "Zero Forex Markup (0.00%): No foreign currency markup fee on international transactions (w.e.f. Nov 10, 2026)",
            "4% My Cash on MakeMyTrip Hotel & Holiday bookings (4 My Cash per ₹100 spent)",
            "2% My Cash on MakeMyTrip Flight bookings (2 My Cash per ₹100 spent)",
            "1% My Cash on all other domestic retail spends (1 My Cash per ₹100 spent; 1 My Cash = ₹1)",
            "1 Domestic Airport Lounge per quarter (on ₹75,000 quarterly spend w.e.f. Jan 01, 2025)",
            "1 Complimentary Railway Lounge visit per quarter across major Indian railway stations",
            "MMTBLACK Gold Membership: Complimentary room upgrades, early check-in & late checkout"
        ],
        pros: [
            "Zero Forex Fee: 0.00% foreign exchange markup w.e.f. Nov 10, 2026, making it one of the top cards for overseas travel.",
            "High Travel Return: 4% on hotels and 2% on flights on MakeMyTrip directly usable as ₹1 = 1 My Cash.",
            "Direct Wallet Credit: My Cash is automatically credited to MakeMyTrip account with 100% redemption on future travel.",
            "Both Airport & Railway Lounges: 1 domestic airport lounge (on ₹75k spend) + 1 railway lounge per quarter.",
            "Generous Welcome Bonus: ₹1,500 My Cash plus holiday vouchers exceed the ₹999 joining fee."
        ],
        cons: [
            "Rewards Tied to MakeMyTrip: My Cash can only be redeemed on MakeMyTrip for travel bookings (cannot be taken as cash).",
            "Quarterly Lounge Hurdle: Domestic airport lounge requires ₹75,000 spend in previous calendar quarter (w.e.f. Jan 01, 2025).",
            "Excluded Categories: Fuel, rent, wallet, tax, and gaming earn 0% My Cash.",
            "1% Fuel Fee > ₹10,000: Single fuel transactions exceeding ₹10,000 attract a 1% fee."
        ],
        tiers: [
            {
                rate: 4,
                name: "MakeMyTrip Hotels & Holidays (4% My Cash)",
                categories: [],
                merchants: ["makemytrip hotel", "mmt hotel", "makemytrip holidays"],
                monthlyCap: null,
                notes: "4 My Cash per ₹100 spent on MakeMyTrip hotel and holiday bookings (1 My Cash = ₹1)."
            },
            {
                rate: 2,
                name: "MakeMyTrip Flights (2% My Cash)",
                categories: [],
                merchants: ["makemytrip", "mmt", "makemytrip flight"],
                monthlyCap: null,
                notes: "2 My Cash per ₹100 spent on MakeMyTrip flight bookings (1 My Cash = ₹1)."
            },
            {
                rate: 1,
                name: "All Other Domestic Spends (1% My Cash)",
                categories: ["all-retail", "shopping", "dining", "travel"],
                merchants: [],
                monthlyCap: null,
                notes: "1 My Cash per ₹100 spent on all other retail transactions (1% return)."
            }
        ],
        exclusions: [
            { category: "fuel", reason: "Fuel excluded from My Cash (1% surcharge waiver ₹400-₹4,000 applies up to ₹50k/cycle; 1% fee on spends > ₹10,000)." },
            { category: "rent", reason: "Rent payments (MCC 6513) earn 0% rewards + 1% processing fee." },
            { category: "wallet", reason: "Prepaid wallet loading earns 0% (1% fee applies on loads ≥ ₹5,000 w.e.f. Jan 2026)." },
            { category: "government", reason: "Government tax and challan payments earn 0% rewards." },
            { category: "gaming", reason: "Online skill-based gaming (MCC 5816) earns 0% rewards + 2% transaction fee." },
            { category: "transportation", reason: "Transportation spends > ₹50,000 incur a 1% fee (MCC 4111, 4112, 4784, 4131 w.e.f. Jan 15, 2026)." }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: true,
                isMilestoneBased: true,
                visitsPerYear: 4,
                ruleText: "1 complimentary domestic airport lounge visit per quarter (on ₹75,000 spend in preceding calendar quarter w.e.f. Jan 01, 2025).",
                spendCriteria: "₹75,000 in prev calendar quarter"
            },
            internationalAirport: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No complimentary international airport lounge access."
            },
            railwayLounge: {
                hasAccess: true,
                visitsPerYear: 4,
                ruleText: "1 complimentary railway lounge visit per quarter across major Indian railway stations.",
                spendCriteria: "Direct swipe"
            }
        }
    },

    'icici-hpcl-super-saver': {
        id: 'icici-hpcl-super-saver',
        name: 'ICICI HPCL Super Saver Credit Card',
        shortName: 'ICICI HPCL Saver',
        color: '#0284c7',
        matcher: /hpcl.*saver|super\s*saver|icici.*hpcl/i,
        issuer: 'ICICI Bank',
        network: 'Visa / RuPay',
        cardType: 'Co-Branded Fuel & Daily Needs',
        annualFee: 500,
        joiningFee: 500,
        feeWaiverSpendTarget: 150000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: 400,
        baseCashbackPercent: 0.5,
        bestFor: "HPCL fuel customers, daily commuters, grocery shoppers and utility bill payers",
        welcomeBenefit: "2,000 bonus reward points (worth ₹500) + ₹100 cashback on HPCL fuel via HP Pay app",
        keyBenefitsSummary: [
            "5% Total Savings on HPCL Fuel: 4% cashback (16 RP/₹100) + 1% fuel surcharge waiver on HPCL pumps",
            "5% Cashback on Utilities & Departmental Stores (20 RP/₹100, max 400 RP per month)",
            "RuPay variant available for seamless UPI QR Scan & Pay at merchant shops",
            "25% discount up to ₹100 on BookMyShow and Inox movie tickets twice a month (on ₹25k quarterly spend w.e.f. Jan 15, 2026)",
            "1 Domestic Airport Lounge per quarter (on ₹75,000 spend in preceding calendar quarter w.e.f. Jan 01, 2025)",
            "Annual Fee waived on ₹1,50,000 annual spend (excludes rent, govt & education)"
        ],
        pros: [
            "Strong Fuel Savings: 5% combined savings on petrol/diesel at HPCL pumps when paid via HP Pay / POS.",
            "5% on Utilities & Groceries: High 5% accelerated rewards on everyday essential categories.",
            "RuPay UPI Compatibility: RuPay variant allows UPI payments directly from credit line.",
            "Low Annual Fee: ₹500/yr easily waived on ₹1.5L annual retail spend.",
            "Movie Discount: 25% off up to ₹100 on BookMyShow."
        ],
        cons: [
            "Fuel Savings Limited to HPCL: 5% fuel benefit is only valid at Hindustan Petroleum (HPCL) outlets, not IOCL or BPCL.",
            "Accelerated Category Cap: 5% utilities & groceries capped at 400 RP (₹100) per month.",
            "Quarterly Lounge Hurdle: Requires ₹75,000 spend in preceding calendar quarter for domestic airport lounge (w.e.f. Jan 01, 2025).",
            "1% Fuel Fee > ₹10,000: Single fuel transactions exceeding ₹10,000 attract a 1% fee."
        ],
        tiers: [
            {
                rate: 4,
                name: "HPCL Petrol & Diesel Spends (4% Cashback)",
                categories: [],
                merchants: ["hpcl", "hindustan petroleum", "hp fuel", "hp pay"],
                monthlyCap: 400,
                notes: "16 ICICI Reward Points per ₹100 (4% cashback) at HPCL fuel outlets + 1% surcharge waiver."
            },
            {
                rate: 5,
                name: "Utilities & Departmental Stores (5%)",
                categories: ["utilities", "groceries"],
                merchants: ["electricity", "water", "gas", "supermarket", "grocery"],
                monthlyCap: 100,
                notes: "20 ICICI Reward Points per ₹100 (5% return, capped at 400 RP = ₹100 per month)."
            },
            {
                rate: 0.5,
                name: "All Other Domestic Retail Spends (0.5%)",
                categories: ["all-retail", "shopping", "dining", "travel"],
                merchants: [],
                monthlyCap: null,
                notes: "2 ICICI Reward Points per ₹100 spent domestically (0.5% return)."
            }
        ],
        exclusions: [
            { category: "rent", reason: "Rent payments (MCC 6513) earn 0% rewards + 1% processing fee." },
            { category: "wallet", reason: "Prepaid wallet loads earn 0% (1% fee applies on loads ≥ ₹5,000 w.e.f. Jan 2026)." },
            { category: "government", reason: "Government tax and challan payments earn 0% rewards." },
            { category: "gaming", reason: "Online skill-based gaming (MCC 5816) earns 0% rewards + 2% transaction fee." },
            { category: "transportation", reason: "Transportation spends > ₹50,000 incur a 1% fee (MCC 4111, 4112, 4784, 4131 w.e.f. Jan 15, 2026)." }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: true,
                isMilestoneBased: true,
                visitsPerYear: 4,
                ruleText: "1 complimentary domestic airport lounge visit per quarter (on ₹75,000 spend in preceding calendar quarter w.e.f. Jan 01, 2025).",
                spendCriteria: "₹75,000 in prev calendar quarter"
            },
            internationalAirport: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No complimentary international airport lounge access."
            },
            railwayLounge: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No railway lounge access."
            }
        },
        entertainment: {
            movies: {
                type: "discount",
                bogo: false,
                rate: 25,
                platform: "BookMyShow",
                description: "25% discount up to ₹100 twice a month on BookMyShow (requires ₹25k spend in prev quarter w.e.f. Jan 15, 2026)."
            }
        }
    },

    'hsbc-live-plus': {
        id: 'hsbc-live-plus',
        name: 'HSBC Live+ Credit Card',
        shortName: 'HSBC Live+',
        color: '#dc2626',
        matcher: /(live\s*\+|live\s*plus)|((?=.*hsbc)(?=.*(live|cashback)))/i,
        issuer: 'HSBC',
        network: 'Visa Infinite',
        cardType: 'Dining, Grocery & Utility Cashback',
        annualFee: 999,
        joiningFee: 999,
        feeWaiverSpendTarget: 200000,
        forexMarkupPercent: 1.99,
        defaultMonthlyAcceleratedCap: 1200,
        baseCashbackPercent: 1.5,
        bestFor: "Dining, Swiggy/Zomato food delivery, Blinkit/Zepto groceries, utility bills & offline retail shopping (10% cashback)",
        welcomeBenefit: "₹1,000 Amazon voucher on completing first transaction within 30 days",
        keyBenefitsSummary: [
            "10% Accelerated Cashback on Dining, Food Delivery, Groceries, Offline Retail Shopping & Utility Bills (up to ₹1,200/billing cycle)",
            "1.5% Unlimited Cashback on all other eligible domestic retail transactions (Amazon, Flipkart & Myntra earn 1.5%)",
            "3 Complimentary Airport Lounges/year (2 Domestic: 1 per 6 months + 1 International visit w.e.f. Sept 2026)",
            "Low 1.99% Forex Markup on international currency transactions (0% cashback on international spends)",
            "Buy 1 Get 1 Free on movie tickets up to ₹250 off on Saturdays via District / BookMyShow",
            "Annual fee waived on ₹2,00,000 annual spend across primary and add-on cards"
        ],
        pros: [
            "Highest Grocery, Dining & Utility Cashback: 10% cashback on Swiggy, Zomato, Blinkit, Zepto, Instamart, BigBasket, DMart, Electricity, Water & Broadband bills (MCC 4900, 4814, up to ₹1,200/mo).",
            "10% on Retail Shopping: Accelerated 10% on offline departmental stores, apparel, and electronics (MCC 5311, 5651, 5732).",
            "Uncapped 1.5% Base Domestic Cashback: Domestic retail spends earn 1.5% unlimited cashback (Amazon, Flipkart, and Myntra earn 1.5%).",
            "Domestic & International Airport Lounges: 3 visits per year (2 domestic: 1 every 6 months + 1 international w.e.f. Sept 2026).",
            "Low 1.99% Forex Markup: Significantly lower than standard bank markup of 3.5%.",
            "BookMyShow / District BOGO: Buy 1 Get 1 free up to ₹250 off on Saturday movie tickets.",
            "Jewellery spends count 100% towards the ₹2 Lakh annual fee waiver (saving ₹999 + GST renewal fee)."
        ],
        cons: [
            "Monthly accelerated cashback is capped at ₹1,200 (max spend of ₹12,000 at 10%).",
            "International spends earn 0% cashback (reduced 1.99% forex markup applies instead).",
            "No Fuel Surcharge Waiver: Fuel surcharge waiver is not applicable (NA) on HSBC Live+.",
            "Online shopping at Amazon, Flipkart & Myntra is excluded from 10% and earns 1.5% base cashback.",
            "Jewellery, insurance, education, hospitals, rent, and wallet reloads earn 0% cashback."
        ],
        tiers: [
            {
                "rate": 10,
                "name": "Dining, Food Delivery, Groceries, Shopping & Utilities (10%)",
                "categories": [
                    "dining",
                    "food-delivery",
                    "groceries",
                    "quick-commerce",
                    "supermarket",
                    "utilities",
                    "telecom",
                    "shopping"
                ],
                "merchants": [
                    "swiggy",
                    "zomato",
                    "blinkit",
                    "zepto",
                    "instamart",
                    "bigbasket",
                    "dmart",
                    "nature's basket",
                    "star bazaar",
                    "mcdonalds",
                    "kfc",
                    "starbucks",
                    "dominos",
                    "eatclub",
                    "district",
                    "district app",
                    "electricity",
                    "water",
                    "gas",
                    "broadband",
                    "wifi",
                    "bescom",
                    "tneb",
                    "mseb",
                    "cesc",
                    "tata power",
                    "croma",
                    "reliance digital",
                    "vijay sales",
                    "zara",
                    "h&m",
                    "marks & spencer",
                    "shoppers stop",
                    "lifestyle",
                    "westside",
                    "pantaloons",
                    "decathlon",
                    "nykaa"
                ],
                "monthlyCap": 1200,
                "fallbackRate": 1.5,
                "notes": "10% accelerated cashback capped at ₹1,200/billing cycle (spend up to ₹12,000). Drops to 1.5% base afterwards."
            },
            {
                "rate": 1.5,
                "name": "Amazon, Flipkart & Myntra (1.5% - Excluded from 10%)",
                "categories": [],
                "merchants": [
                    "amazon",
                    "flipkart",
                    "myntra"
                ],
                "monthlyCap": null,
                "notes": "Per HSBC terms, shopping spends on Amazon, Flipkart & Myntra are excluded from the 10% category and earn 1.5% cashback."
            },
            {
                "rate": 1.5,
                "name": "All Other Eligible Domestic Retail (1.5%)",
                "categories": [
                    "all-retail"
                ],
                "merchants": [],
                "monthlyCap": null,
                "notes": "Unlimited 1.5% cashback on all other eligible domestic retail spends."
            }
        ],
        exclusions: [
            {
                "category": "fuel",
                "reason": "Fuel is excluded from cashback. Fuel surcharge waiver is NOT applicable (NA) on HSBC Live+."
            },
            {
                "category": "rent",
                "reason": "Rental and property management payments (MCC 6513, 7349, 7012) earn 0% cashback + 1% processing fee."
            },
            {
                "category": "wallet",
                "reason": "E-wallet loading and quasi-cash transactions (MCC 6540, 6051) earn 0% cashback."
            },
            {
                "category": "financial",
                "reason": "Financial institutions, security broker services, and money transfers (MCC 6010, 6011, 6012, 6211, 4829) earn 0% cashback."
            },
            {
                "category": "insurance",
                "reason": "Insurance premium payments (MCC 5960, 6300) earn 0% cashback on HSBC Live+."
            },
            {
                "category": "education",
                "reason": "Education fees, schools, and university payments (MCC 8211, 8220, 8241, 8244, 8249, 8299, 8351) earn 0% cashback."
            },
            {
                "category": "government",
                "reason": "Government taxes, fines, and challan payments (MCC 9211, 9222, 9223, 9311, 9399, 9402, 9405, 9950) earn 0% cashback."
            },
            {
                "category": "emi",
                "reason": "Instant EMI (IEMI) and loan facilities are strictly excluded from earning cashback."
            },
            {
                "category": "jewellery",
                "reason": "Jewellery, gold, and antique items (MCC 5094, 5932, 5937, 5944) earn 0% cashback (spends count 100% towards the ₹2L annual fee waiver)."
            },
            {
                "category": "jewelry",
                "reason": "Jewellery, gold, and antique items (MCC 5094, 5932, 5937, 5944) earn 0% cashback (spends count 100% towards the ₹2L annual fee waiver)."
            },
            {
                "category": "gold",
                "reason": "Jewellery, gold, and antique items (MCC 5094, 5932, 5937, 5944) earn 0% cashback (spends count 100% towards the ₹2L annual fee waiver)."
            },
            {
                "category": "hospital",
                "reason": "Hospitals and healthcare institutions (MCC 8062) earn 0% cashback on HSBC Live+."
            },
            {
                "category": "transit",
                "reason": "Tolls, bridge fees, and local bus transit (MCC 4784, 4111) earn 0% cashback."
            },
            {
                "category": "charity",
                "reason": "Charity and social service organizations (MCC 8398, 8641) earn 0% cashback."
            },
            {
                "category": "b2b",
                "reason": "Business-to-business commercial spends and wholesale clubs (MCC 5300, etc.) earn 0% cashback."
            },
            {
                "category": "gambling",
                "reason": "Gambling, betting, and lottery transactions (MCC 7995) earn 0% cashback."
            },
            {
                "category": "forex",
                "reason": "Per HSBC terms w.e.f. Sept 2026, 1.5% cashback is no longer earned on international spends (1.99% forex markup applies)."
            },
            {
                "category": "international",
                "reason": "Per HSBC terms w.e.f. Sept 2026, 1.5% cashback is no longer earned on international spends (1.99% forex markup applies)."
            }
        ],
        lounges: {
            "domesticAirport": {
                "hasAccess": true,
                "visitsPerYear": 2,
                "ruleText": "2 complimentary domestic airport lounge visits per calendar year (limited to 1 usage every 6 calendar months via Visa Infinite direct swipe).",
                "spendCriteria": "1 visit every 6 months (Direct swipe)"
            },
            "internationalAirport": {
                "hasAccess": true,
                "visitsPerYear": 1,
                "ruleText": "1 complimentary international airport lounge visit per year (w.e.f. 1st September 2026). Total 3 airport lounge visits/year.",
                "spendCriteria": "1 visit/year complimentary"
            },
            "railwayLounge": {
                "hasAccess": false,
                "visitsPerYear": 0,
                "ruleText": "No railway lounge access."
            }
        },
        entertainment: {
            "movies": {
                "type": "bogo",
                "bogo": true,
                "maxDiscount": 250,
                "platform": "District App (by Zomato) & BookMyShow",
                "description": "Buy 1 Get 1 Free (BOGO) movie tickets (up to ₹250 off on 2nd ticket on Saturdays) on District App & BookMyShow, plus 10% cashback on District dining and events."
            }
        }
    },

    'hdfc-millennia': {
        id: 'hdfc-millennia',
        name: 'HDFC Millennia Credit Card',
        shortName: 'HDFC Millennia',
        color: '#2563eb',
        matcher: /millennia/i,
        issuer: 'HDFC Bank',
        network: 'Mastercard / Visa / RuPay',
        cardType: 'Online Partner Cashback',
        annualFee: 1000,
        joiningFee: 1000,
        feeWaiverSpendTarget: 100000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: 1000,
        baseCashbackPercent: 1,
        bestFor: "Amazon, Flipkart, Swiggy, Zomato, Myntra, Uber, PayZapp & 1:1 statement CashPoints redemption",
        welcomeBenefit: "1,000 CashPoints upon payment of membership fee",
        keyBenefitsSummary: [
            "5% CashPoints on 10 Top Merchants: Amazon, Flipkart, Myntra, Swiggy, Zomato, Uber, BMS, Tata CLiQ, Cult.fit, Sony LIV (max 1,000 CP/mo)",
            "1% CashPoints on other eligible retail spends, utilities, telecom & direct education (max 1,000 CP/mo)",
            "1:1 CashPoints redemption against statement balance (1 CashPoint = ₹1.00 cash, ₹50 fee per redemption)",
            "₹1,00,000 spend annual fee waiver (saving ₹1,000 renewal fee)",
            "Quarterly milestone voucher of ₹1,000 on spending ₹1 Lakh in a calendar quarter"
        ],
        pros: [
            "Broad 5% Merchant Network: Covers all major Indian online portals (Amazon, Flipkart, Swiggy, Zomato, Myntra, Uber, BMS, Tata CLiQ).",
            "True 1:1 Statement Cash Credit: CashPoints redeem directly against credit card statement outstanding at ₹1 = 1 CashPoint (min 500 CP, up to 3,000 CP/mo).",
            "1% CashPoints on utilities, telecom and direct education payments (via PayZapp or SmartPay).",
            "₹1,000 quarterly brand voucher from Gyftr (BigBasket, BookMyShow, Pizza Hut, Uber) on spending ₹1 Lakh in a calendar quarter.",
            "Reasonable ₹1 Lakh annual spend milestone for 100% renewal fee waiver."
        ],
        cons: [
            "Monthly 5% CashPoints is capped at 1,000 CashPoints (max spend of ₹20,000/mo).",
            "No complimentary domestic airport lounge access (discontinued w.e.f. 1st Dec 2023).",
            "Transactions below ₹100 do not earn any CashPoints (multiples of ₹100 rule).",
            "₹50 + GST fee on redeeming CashPoints against statement credit balance.",
            "Fuel, wallet reloads, rent payments, and third-party education earn 0% CashPoints."
        ],
        tiers: [
            {
                "rate": 5,
                "name": "Top 10 Merchant Partners (5%)",
                "categories": [
                    "shopping",
                    "food-delivery",
                    "entertainment",
                    "travel"
                ],
                "merchants": [
                    "amazon",
                    "flipkart",
                    "myntra",
                    "swiggy",
                    "zomato",
                    "tata cliq",
                    "uber",
                    "cult.fit",
                    "cultfit",
                    "bookmyshow",
                    "bms",
                    "sony liv",
                    "sonyliv"
                ],
                "monthlyCap": 1000,
                "fallbackRate": 1,
                "notes": "5% CashPoints on 10 partner merchants (Amazon, Flipkart, Swiggy, Zomato, Myntra, Uber, BMS, Tata CLiQ, Cult.fit, Sony LIV). Capped at 1,000 CashPoints/mo."
            },
            {
                "rate": 1,
                "name": "Other Eligible Spends & Utilities (1%)",
                "categories": [
                    "all-retail",
                    "utilities",
                    "telecom",
                    "education"
                ],
                "merchants": [
                    "payzapp",
                    "smartpay"
                ],
                "monthlyCap": 1000,
                "notes": "1% CashPoints on other eligible retail spends, utilities, telecom and direct education (capped at 1,000 CashPoints/mo)."
            }
        ],
        exclusions: [
            {
                "category": "fuel",
                "reason": "Fuel spends do not earn CashPoints (standard 1% surcharge waiver ₹400-₹5,000 applies; 1% fee on spends > ₹15,000)."
            },
            {
                "category": "rent",
                "reason": "Rent transactions earn 0% CashPoints + attract 1% processing fee (capped at ₹4,999)."
            },
            {
                "category": "wallet",
                "reason": "Prepaid wallet loading earns 0% CashPoints (1% fee applies on spends > ₹10,000/mo)."
            },
            {
                "category": "government",
                "reason": "Government portals, taxes, and challan payments earn 0% CashPoints."
            },
            {
                "category": "education",
                "reason": "Education payments via 3rd party apps (CRED, Cheq, Paytm) earn 0% CashPoints + 1% fee. Direct institute portal payments earn 1% CashPoints with 0% fee."
            },
            {
                "category": "emi",
                "reason": "EMI transactions earn 0% CashPoints."
            },
            {
                "category": "gaming",
                "reason": "Online skill-based gaming earns 0% CashPoints (1% fee on spends > ₹10,000/mo)."
            }
        ],
        lounges: {
            "domesticAirport": {
                "hasAccess": false,
                "visitsPerYear": 0,
                "ruleText": "Complimentary domestic lounge access discontinued w.e.f. 1st Dec 2023. Cardholders receive a ₹1,000 Quarterly Milestone Gift Voucher (BigBasket, BMS, Uber, etc.) on ₹1 Lakh quarterly spend.",
                "spendCriteria": "₹1,00,000 per calendar quarter (Voucher only)"
            },
            "internationalAirport": {
                "hasAccess": false,
                "visitsPerYear": 0,
                "ruleText": "No complimentary international lounge access."
            },
            "railwayLounge": {
                "hasAccess": false,
                "visitsPerYear": 0,
                "ruleText": "No railway lounge access."
            }
        },
        entertainment: {
            "movies": {
                "type": "cashback",
                "bogo": false,
                "rate": 5,
                "platform": "BookMyShow",
                "description": "5% CashPoints on BookMyShow (counted within the 1,000 CashPoints/mo partner cap)."
            }
        }
    },

    'hdfc-regalia-gold': {
        id: 'hdfc-regalia-gold',
        name: 'HDFC Regalia Gold Credit Card',
        shortName: 'Regalia Gold',
        color: '#d97706',
        matcher: /(?=.*regalia)(?=.*gold)|regalia/i,
        issuer: 'HDFC Bank',
        network: 'Visa Signature / Mastercard',
        cardType: 'Premium Travel & Lifestyle',
        annualFee: 2500,
        joiningFee: 2500,
        feeWaiverSpendTarget: 400000,
        forexMarkupPercent: 2,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 1.33,
        bestFor: "Frequent domestic and international travelers, fashion shopping (Myntra/Nykaa/M&S)",
        welcomeBenefit: "Club Vistara Silver, MMT Black Elite, and ₹2,500 retail voucher on fee payment & ₹1L spend in 90 days",
        keyBenefitsSummary: ["Up to 12 Domestic Lounges/year on meeting quarterly spend criteria","6 International Lounges/year via Priority Pass (min 4 txns)","5x Reward Points (6.67% value) on Marks & Spencer, Myntra, Nykaa, Reliance Digital","Low 2.0% Forex Markup on international transactions","₹1,500 quarterly milestone vouchers on ₹1.5L quarterly spend"],
        pros: ["Domestic Lounge Access: Up to 12 visits/year on meeting quarterly spend criteria (e.g. April–June spends unlock July–Sept access).","6 Complimentary International Lounges/year via Priority Pass for primary & add-on members (after 4 transactions).","Low Forex Markup: 2.0% instead of standard 3.5%, making it great for international travel.","5x Rewards (6.67% return) on partner brands: Marks & Spencer, Myntra, Nykaa, Reliance Digital.","₹1,500 quarterly milestone vouchers from Marriott, Marks & Spencer, or Reliance Digital."],
        cons: ["Domestic lounge access requires meeting quarterly spends hurdle.","Points redemption value on SmartBuy flights/hotels is ₹0.50 per point.","Statement credit redemption rate revised to 15 paise per point w.e.f. 1st Nov 2025 (₹50 redemption fee applies).","Reward points on grocery transactions capped at 2,000/mo, utility & telecom capped at 2,000/mo.","₹4,00,000 spend needed for annual fee waiver."],
        tiers: [
          {
                    "rate": 6.67,
                    "name": "Fashion & Retail Partners (5x RP = 6.67%)",
                    "categories": [
                              "shopping"
                    ],
                    "merchants": [
                              "marks & spencer",
                              "myntra",
                              "nykaa",
                              "reliance digital"
                    ],
                    "monthlyCap": 5000,
                    "fallbackRate": 1.33,
                    "notes": "5x Reward Points on partner brands (Marks & Spencer, Myntra, Nykaa, Reliance Digital)."
          },
          {
                    "rate": 4,
                    "name": "SmartBuy Flights & Hotels (3x RP = 4%)",
                    "categories": [
                              "travel"
                    ],
                    "merchants": [
                              "smartbuy",
                              "flights",
                              "hotels"
                    ],
                    "monthlyCap": 4000,
                    "fallbackRate": 1.33,
                    "notes": "Accelerated reward points on flights & hotels booked through SmartBuy portal."
          },
          {
                    "rate": 1.33,
                    "name": "All Other Retail Spends (4 RP/₹150 = 1.33%)",
                    "categories": [
                              "all-retail",
                              "education"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "4 Reward Points per ₹150 spent on all regular retail and direct education (1 RP = ₹0.50 on SmartBuy flight/hotel bookings)."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded (1% surcharge waiver ₹400-₹5,000 applies; 1% fee on spends > ₹15,000)."
          },
          {
                    "category": "rent",
                    "reason": "Rent payments earn 0% rewards + attract 1% processing fee (capped at ₹4,999)."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loading earns 0% (1% fee on spends > ₹10,000/mo)."
          },
          {
                    "category": "government",
                    "reason": "Government transactions earn 0%."
          },
          {
                    "category": "education",
                    "reason": "Education payments via 3rd party apps earn 0% + 1% fee. Direct payments earn 1.33% with 0% fee."
          },
          {
                    "category": "gaming",
                    "reason": "Online skill-based gaming earns 0% (1% fee on spends > ₹10,000/mo)."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 12,
                    "ruleText": "12 complimentary domestic airport lounge visits per calendar year on meeting quarterly spend criteria.",
                    "spendCriteria": "Quarterly Spend Hurdle"
          },
          "internationalAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 6,
                    "ruleText": "6 complimentary international airport lounge visits per calendar year via Priority Pass (after 4 transactions).",
                    "spendCriteria": "Priority Pass (min 4 txns)"
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "points",
                    "bogo": false,
                    "rate": 1.33,
                    "platform": "BookMyShow",
                    "description": "4 Reward Points per ₹150 spent on BookMyShow (1.33% value)."
          }
}
    },

    'hdfc-infinia': {
        id: 'hdfc-infinia',
        name: 'HDFC Infinia Metal Credit Card',
        shortName: 'HDFC Infinia',
        color: '#111827',
        matcher: /infinia/i,
        issuer: 'HDFC Bank',
        network: 'Visa Infinite',
        cardType: 'Super-Premium Metal',
        annualFee: 12500,
        joiningFee: 12500,
        feeWaiverSpendTarget: 1000000,
        forexMarkupPercent: 2,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 3.33,
        bestFor: "High-net-worth spenders seeking up to 33.3% travel value, 1:1 flight booking & unlimited global lounges",
        welcomeBenefit: "12,500 Reward Points (worth ₹12,500 on SmartBuy flights/hotels) + Club Marriott membership upon fee payment",
        keyBenefitsSummary: ["Unlimited Domestic & International Airport Lounge access globally for primary & add-on cardholders","Up to 33.3% return via SmartBuy 5x multipliers on flights & hotels","Base 3.33% reward rate (5 RP per ₹150, 1 RP = ₹1 on flights/hotels)","Low 2.0% Forex Markup on international spends","Zero Late Payment, Overlimit, Cash Advance, and Redemption Fees (MITC Exempt)","Unlimited complimentary golf games worldwide","ITC 1+1 buffet dining offer & Club Marriott benefits"],
        pros: ["Unrivaled Return: 3.33% base rewards and up to 33.3% on flights/hotels booked via HDFC SmartBuy.","True 1:1 Point Value: 1 Reward Point = ₹1.00 when booking flights and hotels on SmartBuy.","Unlimited Global Lounge Access: Free unlimited lounge access worldwide for both primary and add-on cardholders via Priority Pass.","Low 2% Forex Markup with 3.33% base points gives net positive return on foreign transactions.","Exempt from Fees: Nil Late Payment Fee, Nil Cash Advance Fee, Nil Overlimit Fee, and Nil Reward Redemption Fee under HDFC MITC.","Unlimited complimentary golf rounds and lessons across India and abroad."],
        cons: ["Strict Invitation-Only Eligibility: Demands ₹3,00,000+ monthly net salary or high credit limits.","Very High ₹10 Lakh Annual Spend Target for fee waiver.","Effective 1st April 2026, continued access to Infinia requires ₹18 Lakhs annual spend OR ₹50 Lakhs Relationship Value (RLV).","Monthly SmartBuy bonus point caps apply (max 10,000 bonus points/calendar month)."],
        tiers: [
          {
                    "rate": 16.67,
                    "name": "SmartBuy Flights & Hotels (5x RP = 16.67%)",
                    "categories": [
                              "travel"
                    ],
                    "merchants": [
                              "smartbuy",
                              "flights",
                              "hotels"
                    ],
                    "monthlyCap": 10000,
                    "fallbackRate": 3.33,
                    "notes": "5x Reward Points (up to 33.3% return) on travel bookings via HDFC SmartBuy."
          },
          {
                    "rate": 9.99,
                    "name": "SmartBuy Instant Vouchers & Apple (3x RP)",
                    "categories": [
                              "shopping"
                    ],
                    "merchants": [
                              "apple",
                              "gyftr",
                              "instant vouchers"
                    ],
                    "monthlyCap": 5000,
                    "fallbackRate": 3.33,
                    "notes": "3x Reward Points on Apple products & gift vouchers via SmartBuy."
          },
          {
                    "rate": 3.33,
                    "name": "All Other Retail Spends (5 RP/₹150 = 3.33%)",
                    "categories": [
                              "all-retail",
                              "education"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "5 Reward Points per ₹150 spent on all regular retail and direct education payments (1 RP = ₹1.00 on flights/hotels)."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded (1% surcharge waiver ₹400-₹5,000 applies; 1% fee on spends > ₹15,000)."
          },
          {
                    "category": "rent",
                    "reason": "Rent excluded (1% fee capped at ₹4,999 applies)."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loads excluded (1% fee applies on spends > ₹10,000/mo)."
          },
          {
                    "category": "government",
                    "reason": "Government transactions excluded."
          },
          {
                    "category": "education",
                    "reason": "Education payments via 3rd party apps earn 0% + 1% fee. Direct payments earn 3.33% with 0% fee."
          },
          {
                    "category": "gaming",
                    "reason": "Online skill-based gaming earns 0% (1% fee on spends > ₹10,000/mo)."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 999,
                    "ruleText": "Unlimited complimentary domestic airport lounge access for primary and add-on cardholders.",
                    "spendCriteria": "Unlimited (Direct swipe)"
          },
          "internationalAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 999,
                    "ruleText": "Unlimited complimentary international lounge access worldwide via Priority Pass for primary & add-on cards.",
                    "spendCriteria": "Priority Pass"
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "bogo",
                    "bogo": true,
                    "platform": "BookMyShow",
                    "description": "Buy 1 Get 1 Free on BookMyShow (up to ₹250 off)."
          }
},
        golf: {
          "hasAccess": true,
          "roundsPerMonth": 999,
          "description": "Unlimited complimentary golf games and coaching sessions worldwide.",
          "spendCriteria": "Complimentary"
}
    },

    'hdfc-moneyback-plus': {
        id: 'hdfc-moneyback-plus',
        name: 'HDFC MoneyBack+ Credit Card',
        shortName: 'HDFC MoneyBack+',
        color: '#1d4ed8',
        matcher: /money\s*back/i,
        issuer: 'HDFC Bank',
        network: 'Visa / Mastercard / RuPay',
        cardType: 'Accelerated CashPoints & Daily Shopping',
        annualFee: 500,
        joiningFee: 500,
        feeWaiverSpendTarget: 50000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: 625,
        baseCashbackPercent: 0.25,
        bestFor: "Amazon, Flipkart, Swiggy, BigBasket, Reliance Smart & entry-level online shopping",
        welcomeBenefit: "500 CashPoints on payment of joining fee + ₹500 gift voucher on ₹50,000 quarterly spend",
        keyBenefitsSummary: [
            "10X CashPoints (2.5% value) on Amazon, Flipkart, Swiggy, BigBasket, and Reliance Smart SuperStore",
            "2 CashPoints per ₹150 on all other retail and UPI spends (0.25% value)",
            "₹500 Gift Voucher on spending ₹50,000 or more in each calendar quarter (up to ₹2,000/yr extra return)",
            "Annual renewal fee of ₹500 waived on annual spends of ₹50,000",
            "1% Fuel Surcharge waiver (₹400 to ₹5,000, capped at ₹250/statement cycle)"
        ],
        pros: [
            "10X CashPoints (2.5% return) on everyday merchant giants: Amazon, Flipkart, Swiggy, BigBasket, and Reliance Smart.",
            "Very achievable ₹50,000 annual spend milestone for 100% renewal fee waiver (saving ₹500).",
            "Quarterly ₹500 milestone gift voucher on ₹50,000 spend in a calendar quarter (up to ₹2,000/yr extra value).",
            "Available on RuPay network variant, enabling UPI Scan & Pay merchant transactions.",
            "Zero liability on lost card upon prompt reporting to 24/7 bank hotline."
        ],
        cons: [
            "Base reward rate on general non-partner retail spends is very low at 0.25% (2 CashPoints per ₹150).",
            "Monthly 10X CashPoints is capped at 2,500 CashPoints (₹625 value, corresponding to ₹25,000 spend/mo).",
            "CashPoint conversion value against statement credit is 20 paise per point w.e.f. 1st Nov 2025 (₹50 redemption fee applies).",
            "Zero complimentary domestic or international airport or railway lounge access.",
            "Strictly 0 rewards on fuel, wallet reloads, rent payments, third-party education, and gaming."
        ],
        tiers: [
            {
                rate: 2.5,
                name: "10X Partner Merchants (2.5%)",
                categories: [
                    "shopping",
                    "food-delivery",
                    "groceries"
                ],
                merchants: [
                    "amazon",
                    "flipkart",
                    "swiggy",
                    "bigbasket",
                    "reliance smart",
                    "smart superstore"
                ],
                monthlyCap: 625,
                fallbackRate: 0.25,
                notes: "10X CashPoints (20 CashPoints per ₹150 = 2.5% value where 1 pt = ₹0.25). Capped at 2,500 CashPoints (₹625) per month."
            },
            {
                rate: 0.25,
                name: "Other Eligible Retail Spends (0.25%)",
                categories: [
                    "all-retail",
                    "education"
                ],
                merchants: [],
                monthlyCap: null,
                notes: "2 CashPoints per ₹150 on other eligible retail spends and direct education (0.25% return)."
            }
        ],
        exclusions: [
            {
                category: "fuel",
                reason: "Fuel is excluded from CashPoints (1% fuel surcharge waiver ₹400-₹5,000 applies; 1% fee on spends > ₹15,000)."
            },
            {
                category: "rent",
                reason: "Rental payments earn 0 CashPoints + 1% fee (capped at ₹4,999)."
            },
            {
                category: "wallet",
                reason: "Prepaid wallet loading earns 0 CashPoints (1% fee applies on spends > ₹10,000/mo)."
            },
            {
                category: "government",
                reason: "Government tax, property tax, and challan payments earn 0 CashPoints."
            },
            {
                category: "education",
                reason: "Education payments via 3rd party apps earn 0% + 1% fee. Direct portal payments earn 0.25% with 0% fee."
            },
            {
                category: "gaming",
                reason: "Online skill-based gaming earns 0% (1% fee on spends > ₹10,000/mo)."
            },
            {
                category: "emi",
                reason: "Transactions converted into EMI do not qualify for CashPoints."
            },
            {
                category: "jewellery",
                reason: "Jewellery and gold purchases earn 0 CashPoints."
            }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No complimentary domestic airport lounge access."
            },
            internationalAirport: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No complimentary international lounge access."
            },
            railwayLounge: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No railway lounge access."
            }
        },
        entertainment: {
            movies: {
                type: "standard",
                bogo: false,
                platform: "SmartBuy / Dineout",
                description: "Standard platform discounts, no exclusive BOGO movie offer."
            }
        }
    },

    'hdfc-swiggy': {
        id: 'hdfc-swiggy',
        name: 'Swiggy HDFC Bank Credit Card',
        shortName: 'Swiggy HDFC',
        color: '#f97316',
        matcher: /swiggy.*hdfc|hdfc.*swiggy/i,
        issuer: 'HDFC Bank',
        network: 'Mastercard / RuPay',
        cardType: 'Co-Branded Dining & Quick Commerce Cashback',
        annualFee: 500,
        joiningFee: 500,
        feeWaiverSpendTarget: 200000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: 1500,
        baseCashbackPercent: 1.0,
        bestFor: "Swiggy food orders, Instamart groceries, Dineout restaurant bills & top 1,000 online shopping portals",
        welcomeBenefit: "Complimentary 3-month Swiggy One membership on card activation",
        keyBenefitsSummary: [
            "10% Cashback on Swiggy application spends (Food delivery, Instamart, Dineout, Genie) capped at ₹1,500/mo",
            "5% Cashback on 1,000+ top online shopping websites (Amazon, Flipkart, Myntra, Nykaa, etc.) capped at ₹1,500/mo",
            "1% Unlimited Cashback on all other eligible retail spends",
            "Direct statement cashback credit without redemption fee (1 Cashback = ₹1.00 cash)",
            "Annual fee waived on spending ₹2,00,000 in an anniversary year"
        ],
        pros: [
            "Massive 10% cashback on Swiggy Food Delivery, Instamart groceries, and Dineout dining (up to ₹1,500/mo).",
            "Broad 5% cashback on over 1,000 online partner apps including Amazon, Flipkart, Myntra, Zara, Uber, and Nykaa (up to ₹1,500/mo).",
            "Cashback directly offsets your monthly card statement balance automatically without manual redemption.",
            "Free 3-month Swiggy One membership included as a welcome gift.",
            "Available on RuPay variant for seamless UPI merchant QR payments."
        ],
        cons: [
            "Each cashback bucket (10% and 5%) is strictly capped at ₹1,500 per calendar month.",
            "Overall cashback across all categories capped at ₹3,500 per statement cycle (MITC Page 26).",
            "Zero complimentary airport or railway lounge access.",
            "Higher spend waiver hurdle: ₹2,00,000 annual spend required to waive the ₹500 renewal fee.",
            "Excludes fuel, rent, wallet reloads, utility bills, third-party education, and government payments from cashback."
        ],
        tiers: [
            {
                rate: 10,
                name: "Swiggy App Spends (10%)",
                categories: [
                    "food-delivery",
                    "groceries",
                    "dining"
                ],
                merchants: [
                    "swiggy",
                    "swiggy instamart",
                    "instamart",
                    "dineout",
                    "swiggy genie"
                ],
                monthlyCap: 1500,
                fallbackRate: 1.0,
                notes: "10% cashback on Swiggy platform (Food, Instamart, Dineout, Genie). Capped at ₹1,500 per month."
            },
            {
                rate: 5,
                name: "Online Partner Platforms (5%)",
                categories: [
                    "shopping",
                    "travel"
                ],
                merchants: [
                    "amazon",
                    "flipkart",
                    "myntra",
                    "nykaa",
                    "uber",
                    "ola",
                    "croma",
                    "tata cliq",
                    "ajio",
                    "meesho",
                    "zara",
                    "h&m",
                    "bookmyshow"
                ],
                monthlyCap: 1500,
                fallbackRate: 1.0,
                notes: "5% cashback across top 1,000+ online shopping apps. Capped at ₹1,500 per month."
            },
            {
                rate: 1.0,
                name: "Other Eligible Retail Spends (1%)",
                categories: [
                    "all-retail"
                ],
                merchants: [],
                monthlyCap: null,
                notes: "1% unlimited cashback on other eligible retail spends (overall card cashback capped at ₹3,500/cycle)."
            }
        ],
        exclusions: [
            {
                category: "fuel",
                reason: "Fuel is excluded from cashback (1% fuel surcharge waiver applies ₹400-₹5,000; 1% fee on spends > ₹15,000)."
            },
            {
                category: "rent",
                reason: "Rent payments earn 0% cashback + 1% processing fee (capped at ₹4,999)."
            },
            {
                category: "wallet",
                reason: "Wallet loading earns 0% cashback (1% fee applies on spends > ₹10,000/mo)."
            },
            {
                category: "government",
                reason: "Government tax and challan payments earn 0% cashback."
            },
            {
                category: "education",
                reason: "Education payments earn 0% cashback (w.e.f. 1st Sept 2024 per MITC Page 24 Section l)."
            },
            {
                category: "gaming",
                reason: "Online skill-based gaming earns 0% cashback (1% fee on spends > ₹10,000/mo)."
            },
            {
                category: "utilities",
                reason: "Utility bills and recharges earn 0% cashback."
            },
            {
                category: "emi",
                reason: "EMI transactions earn 0% cashback."
            }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No complimentary domestic airport lounge access."
            },
            internationalAirport: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No complimentary international lounge access."
            },
            railwayLounge: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No railway lounge access."
            }
        },
        entertainment: {
            movies: {
                type: "cashback",
                bogo: false,
                rate: 5,
                platform: "BookMyShow",
                description: "5% cashback on BookMyShow (part of 1,000+ online platforms category)."
            }
        }
    },

    'hdfc-pixel-play': {
        id: 'hdfc-pixel-play',
        name: 'HDFC Bank PIXEL Play Credit Card',
        shortName: 'PIXEL Play',
        color: '#0ea5e9',
        matcher: /pixel(\s*play)?/i,
        issuer: 'HDFC Bank',
        network: 'RuPay Credit on UPI / Visa',
        cardType: 'Digital Customizable RuPay Credit Card',
        annualFee: 500,
        joiningFee: 500,
        feeWaiverSpendTarget: 100000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: 15000,
        baseCashbackPercent: 1.0,
        bestFor: "Customizable 5% cashback on 2 chosen merchant packs, 3% dining, and RuPay UPI Scan & Pay",
        welcomeBenefit: "Joining fee waived on spending ₹20,000 in first 90 days",
        keyBenefitsSummary: [
            "5% CashPoints on your choice of 2 merchant categories (Dining, Travel, E-Commerce, Grocery)",
            "3% CashPoints on your choice of 1 food delivery/dining platform (Zomato/Swiggy)",
            "1% Unlimited CashPoints on all other eligible retail and UPI spends (max ₹15,000/mo)",
            "RuPay Credit on UPI: Scan & Pay at merchant QR codes directly with 50-day interest-free float",
            "1:1 CashPoints redemption against statement balance via PayZapp app (1 CashPoint = ₹1.00)"
        ],
        pros: [
            "Customizable Rewards: Choose your own favorite 5% and 3% cashback merchant packs in the PayZapp app.",
            "RuPay Credit on UPI enabled: Instant merchant QR code scan and pay with zero surcharge.",
            "True 1:1 Statement Cashback: 1 CashPoint = ₹1.00 directly credited to card statement / PayZapp balance.",
            "High Monthly Cap: Up to ₹15,000 cashback per calendar month under Fair Usage Policy.",
            "Achievable Fee Waiver: Joining fee waived on ₹20,000 in 90 days; annual fee waived on ₹1,00,000 annual spend."
        ],
        cons: [
            "UPI mode rewards capped at 500 points per calendar month (MITC Page 23/44).",
            "No complimentary airport lounge access.",
            "Excludes fuel, wallet loads, rent, and third-party education from cashback.",
            "3.5% foreign currency transaction markup."
        ],
        tiers: [
            {
                rate: 5,
                name: "Selected 5% Merchant Packs (5%)",
                categories: ["shopping", "travel", "groceries"],
                merchants: ["amazon", "flipkart", "makemytrip", "blinkit", "zepto"],
                monthlyCap: null,
                fallbackRate: 1.0,
                notes: "5% CashPoints on 2 chosen merchant categories customized in PayZapp."
            },
            {
                rate: 3,
                name: "Selected Dining Pack (3%)",
                categories: ["dining", "food-delivery"],
                merchants: ["swiggy", "zomato"],
                monthlyCap: null,
                fallbackRate: 1.0,
                notes: "3% CashPoints on chosen dining delivery platform in PayZapp."
            },
            {
                rate: 1,
                name: "All Other Retail & UPI Spends (1%)",
                categories: ["all-retail", "upi", "qr-code", "local-merchant", "utilities", "telecom"],
                merchants: ["upi", "qr"],
                monthlyCap: 15000,
                notes: "1% CashPoints across other retail and RuPay UPI spends (capped at ₹15,000/mo, UPI mode max 500 pts/mo)."
            }
        ],
        exclusions: [
            { category: "fuel", reason: "Fuel spends do not earn CashPoints (1% surcharge waiver ₹400-₹5,000 applies; 1% fee on spends > ₹15,000)." },
            { category: "rent", reason: "Rent transactions earn 0% CashPoints + 1% processing fee (capped at ₹4,999)." },
            { category: "wallet", reason: "Wallet loads earn 0% CashPoints (1% fee applies on spends > ₹10,000/mo)." },
            { category: "government", reason: "Government transactions earn 0% CashPoints." },
            { category: "education", reason: "Education payments via 3rd party apps earn 0% CashPoints + 1% fee. Direct payments earn 1% with 0% fee." },
            { category: "emi", reason: "EMI transactions earn 0% CashPoints." },
            { category: "gaming", reason: "Online skill-based gaming earns 0% CashPoints (1% fee on spends > ₹10,000/mo)." }
        ],
        lounges: {
            domesticAirport: { hasAccess: false, visitsPerYear: 0, ruleText: "No complimentary domestic lounge access." },
            internationalAirport: { hasAccess: false, visitsPerYear: 0, ruleText: "No complimentary international lounge access." },
            railwayLounge: { hasAccess: false, visitsPerYear: 0, ruleText: "No railway lounge access." }
        },
        entertainment: {
            movies: { type: "cashback", bogo: false, rate: 1, platform: "PayZapp / BMS", description: "Standard 1% CashPoints on movie tickets." }
        }
    },

    'tata-neu-infinity': {
        id: 'tata-neu-infinity',
        name: 'Tata Neu Infinity HDFC Credit Card',
        shortName: 'Tata Neu Infinity',
        color: '#6366f1',
        matcher: /(neu\s*infinity)|((?=.*(tata|neu))(?=.*infinity))/i,
        issuer: 'HDFC Bank',
        network: 'RuPay / Visa',
        cardType: 'Tata Ecosystem & UPI',
        annualFee: 1499,
        joiningFee: 1499,
        feeWaiverSpendTarget: 300000,
        forexMarkupPercent: 2,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 1.5,
        bestFor: "BigBasket, Croma, Tata 1mg, Air India, Taj hotels & 1.5% UPI QR transactions",
        welcomeBenefit: "1,499 NeuCoins upon payment of membership fee",
        keyBenefitsSummary: ["Up to 10% NeuCoins on Tata Brands (5% on card + 5% on Tata NeuPass)","1.5% NeuCoins on RuPay UPI QR transactions (capped at 500 NeuCoins/mo)","1.5% Unlimited NeuCoins on other eligible retail spends","8 Domestic Airport Lounges (2/quarter) + 4 International Lounges (1/quarter via Priority Pass)","Low 2.0% Forex Markup on foreign spends"],
        pros: ["Up to 10% return across the vast Tata ecosystem (BigBasket, Croma, Tata 1mg, Air India, Taj, Westside).","1.5% NeuCoins on RuPay UPI payments at offline merchants and local stores.","8 Domestic + 4 International Airport Lounge visits per year.","Low 2% Forex Markup on international transactions.","No reward redemption fee for NeuCoins (exempt under HDFC MITC Section I.f).","1 NeuCoin = ₹1.00 directly usable across any Tata brand app."],
        cons: ["NeuCoins can only be spent within the Tata ecosystem (cannot be redeemed for direct statement cash credit).","Monthly cap of 500 NeuCoins on RuPay UPI merchant spends (MITC Page 23).","₹1,499 + GST annual fee with a high ₹3,00,000 spend waiver target."],
        tiers: [
          {
                    "rate": 10,
                    "name": "Tata Brands via Tata Neu Pass (Up to 10%)",
                    "categories": [
                              "groceries",
                              "shopping",
                              "travel",
                              "pharmacy",
                              "electronics"
                    ],
                    "merchants": [
                              "bigbasket",
                              "tata 1mg",
                              "1mg",
                              "croma",
                              "air india",
                              "air india express",
                              "ihcl",
                              "taj",
                              "westside",
                              "tata cliq"
                    ],
                    "monthlyCap": null,
                    "notes": "5% NeuCoins on card + 5% additional via Tata NeuPass = 10% total rewards."
          },
          {
                    "rate": 1.5,
                    "name": "RuPay UPI Merchant Payments (1.5%)",
                    "categories": [
                              "upi",
                              "qr-code",
                              "local-merchant"
                    ],
                    "merchants": [
                              "upi",
                              "qr",
                              "scan & pay"
                    ],
                    "monthlyCap": 500,
                    "notes": "1.5% NeuCoins on RuPay UPI merchant QR transactions (capped at 500 NeuCoins/mo per MITC Page 23)."
          },
          {
                    "rate": 1.5,
                    "name": "Other Retail Spends (1.5%)",
                    "categories": [
                              "all-retail",
                              "education"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "1.5% unlimited NeuCoins on other retail spends and direct education."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded (1% surcharge waiver ₹400-₹5,000 applies; 1% fee on spends > ₹15,000)."
          },
          {
                    "category": "rent",
                    "reason": "Rent excluded (1% fee capped at ₹4,999 applies)."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loads excluded (1% fee applies on spends > ₹10,000/mo)."
          },
          {
                    "category": "government",
                    "reason": "Government transactions excluded."
          },
          {
                    "category": "education",
                    "reason": "Education payments via 3rd party apps earn 0% + 1% fee. Direct payments earn 1.5% with 0% fee."
          },
          {
                    "category": "gaming",
                    "reason": "Online skill-based gaming earns 0% (1% fee on spends > ₹10,000/mo)."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 8,
                    "ruleText": "8 complimentary domestic visits per calendar year (2 per quarter via direct swipe).",
                    "spendCriteria": "None (Direct swipe)"
          },
          "internationalAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 4,
                    "ruleText": "4 complimentary international visits per year (1 per quarter via Priority Pass).",
                    "spendCriteria": "Priority Pass"
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "neucoins",
                    "bogo": false,
                    "rate": 1.5,
                    "platform": "BookMyShow",
                    "description": "1.5% NeuCoins on BookMyShow."
          }
}
    },

    'axis-atlas': {
        id: 'axis-atlas',
        name: 'Axis Atlas Credit Card',
        shortName: 'Axis Atlas',
        color: '#4338ca',
        matcher: /atlas/i,
        issuer: 'Axis Bank',
        network: 'Visa Signature / Mastercard World',
        cardType: 'Aviation & Travel Miles',
        annualFee: 5000,
        joiningFee: 5000,
        feeWaiverSpendTarget: null,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 4,
        bestFor: "Frequent flyers & hotel stayers maximizing Accor ALL, Singapore Airlines, Qatar, Turkish miles (up to 20% value)",
        welcomeBenefit: "5,000 EDGE Miles (worth 10,000 partner airmiles or Accor points = ₹18,000+ hotel stay value) on first swipe within 30 days",
        keyBenefitsSummary: ["5 EDGE Miles/₹100 on direct airline & hotel spends (10% base value back)","2 EDGE Miles/₹100 on other retail (4% base value back)","1:2 Partner Transfer ratio: 1 EDGE Mile = 2 Partner Points/Miles across 15+ airlines & hotels (Accor, KrisFlyer, Qatar)","Tier-based Airport Lounge Access: 8 to 18 domestic lounges + 4 to 12 international lounges/year","Substantial milestone bonuses: up to 17,500 bonus EDGE Miles on hitting tier spend targets"],
        pros: ["Best Transfer Ratio in India: 1 EDGE Mile = 2 Airline Miles or 2 Accor ALL points (yielding up to 20% effective return!).","Massive Welcome Value: 5,000 EDGE Miles on card activation worth ₹18,000+ at Accor luxury properties.","Accelerated Travel Multiplier: 5 EDGE Miles per ₹100 on all airline and hotel bookings (direct or travel portals).","Tier Milestone Bonuses: Earn 2,500, 5,000, and 10,000 bonus EDGE Miles as you spend ₹3L, ₹7.5L, and ₹15L.","Guest Lounge Access: International lounge allocations can be used for accompanying guests."],
        cons: ["No Annual Fee Waiver: The ₹5,000 renewal fee cannot be waived via spend thresholds (though 2,500-10,000 renewal miles soften it).","Complex Redemption: Requires understanding airline frequent flyer and hotel points systems to extract maximum value.","Standard 3.5% Forex markup fee applies to overseas spends."],
        tiers: [
          {
                    "rate": 10,
                    "name": "Direct Airlines & Hotels (5 EDGE Miles = 10%)",
                    "categories": [
                              "travel",
                              "airlines",
                              "hotels"
                    ],
                    "merchants": [
                              "indigo",
                              "air india",
                              "vistara",
                              "marriott",
                              "taj",
                              "accor",
                              "hilton",
                              "hyatt",
                              "makemytrip",
                              "easemytrip",
                              "cleartrip"
                    ],
                    "monthlyCap": null,
                    "notes": "5 EDGE Miles per ₹100 spent (worth 10 partner points/miles = 10%–20% return)."
          },
          {
                    "rate": 4,
                    "name": "All Other Retail Spends (2 EDGE Miles = 4%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "2 EDGE Miles per ₹100 spent on all eligible retail (worth 4 partner points/miles = 4%–8% return)."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded."
          },
          {
                    "category": "rent",
                    "reason": "Rent excluded."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loads excluded."
          },
          {
                    "category": "government",
                    "reason": "Government transactions excluded."
          },
          {
                    "category": "insurance",
                    "reason": "Insurance excluded."
          },
          {
                    "category": "gold",
                    "reason": "Gold excluded."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 18,
                    "ruleText": "Tier-based: Silver (8 visits), Gold (12 visits), Platinum (18 visits) per year for cardholder and guests.",
                    "spendCriteria": "Tier Status"
          },
          "internationalAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 12,
                    "ruleText": "Tier-based: Silver (4 visits), Gold (6 visits), Platinum (12 visits) per year via DreamFolks for cardholder and guests.",
                    "spendCriteria": "Tier Status"
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "points",
                    "bogo": false,
                    "rate": 4,
                    "platform": "BookMyShow",
                    "description": "2 EDGE Miles per ₹100 spent (4% value)."
          }
}
    },

    'flipkart-axis': {
        id: 'flipkart-axis',
        name: 'Flipkart Axis Bank Credit Card',
        shortName: 'Flipkart Axis',
        color: '#2563eb',
        matcher: /(?=.*flipkart)(?=.*axis)|flipkart\s*axis|axis\s*flipkart/i,
        issuer: 'Axis Bank',
        network: 'Visa / Mastercard',
        cardType: 'Shopping Cashback',
        annualFee: 500,
        joiningFee: 500,
        feeWaiverSpendTarget: 350000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 1,
        bestFor: "Flipkart, Cleartrip shoppers, Swiggy food orders & Uber cab rides",
        welcomeBenefit: "Welcome benefits worth ₹600 (₹500 Flipkart voucher + Swiggy discount)",
        keyBenefitsSummary: ["5% Unlimited Cashback on Flipkart & Cleartrip","4% Unlimited Cashback on Preferred Partners: Swiggy, Uber, PVR, Cult.fit, Tata 1mg","1% Unlimited Cashback on all other retail spends","Direct statement credit: Cashback auto-credited to next statement cycle","4 Domestic Lounges/year (on ₹50k spend in prev quarter)"],
        pros: ["Uncapped 5% flat cashback on Flipkart & Cleartrip with zero monthly ceiling.","4% Cashback on key daily lifestyle apps: Swiggy, Uber, PVR, Cult.fit, Tata 1mg.","Direct statement credit with no redemption fees or points conversion hassle.","Low annual fee of ₹500."],
        cons: ["Domestic lounge access now requires a ₹50,000 spend in the previous calendar quarter.","Fuel, rent, wallet loads, jewellery, insurance, and government utilities earn 0%.","Base offline retail cashback is modest at 1%."],
        tiers: [
          {
                    "rate": 5,
                    "name": "Flipkart & Cleartrip (5% Unlimited)",
                    "categories": [],
                    "merchants": [
                              "flipkart",
                              "cleartrip",
                              "shopsy"
                    ],
                    "monthlyCap": null,
                    "notes": "5% flat unlimited cashback on Flipkart & Cleartrip."
          },
          {
                    "rate": 4,
                    "name": "Preferred Partners (4% Unlimited)",
                    "categories": [],
                    "merchants": [
                              "swiggy",
                              "uber",
                              "pvr",
                              "cult.fit",
                              "cultfit",
                              "tata 1mg",
                              "1mg"
                    ],
                    "monthlyCap": null,
                    "notes": "4% flat cashback on Swiggy, Uber, PVR, Cult.fit, and Tata 1mg."
          },
          {
                    "rate": 1,
                    "name": "All Other Spends (1% Unlimited)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "1% unlimited cashback on other eligible retail spends."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded."
          },
          {
                    "category": "rent",
                    "reason": "Rent excluded."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loads excluded."
          },
          {
                    "category": "government",
                    "reason": "Government transactions excluded."
          },
          {
                    "category": "utilities",
                    "reason": "Utilities excluded."
          },
          {
                    "category": "insurance",
                    "reason": "Insurance excluded."
          },
          {
                    "category": "gold",
                    "reason": "Gold and jewellery excluded."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "isMilestoneBased": true,
                    "visitsPerYear": 4,
                    "ruleText": "4 complimentary domestic airport lounge visits per calendar year (requires ₹50,000 spend in previous quarter).",
                    "spendCriteria": "₹50,000 in prev quarter"
          },
          "internationalAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No international lounge access."
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "cashback",
                    "bogo": false,
                    "rate": 4,
                    "platform": "PVR & BookMyShow",
                    "description": "4% cashback on PVR, 1% on other movie platforms."
          }
}
    },

    'axis-ace': {
        id: 'axis-ace',
        name: 'Axis Ace Credit Card',
        shortName: 'Axis Ace',
        color: '#047857',
        matcher: /(?=.*axis)(?=.*ace)|axis\s*ace|ace\s*axis|^ace$/i,
        issuer: 'Axis Bank',
        network: 'Visa Signature',
        cardType: 'Utility & Offline Cashback',
        annualFee: 499,
        joiningFee: 499,
        feeWaiverSpendTarget: 200000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: 500,
        baseCashbackPercent: 1.5,
        bestFor: "Electricity bills, DTH, gas recharges via Google Pay & 1.5% offline retail spends",
        welcomeBenefit: "100% cashback on first utility bill paid via Google Pay (up to ₹250)",
        keyBenefitsSummary: ["5% Cashback on Bill Payments (Electricity, Water, Gas, LPG) & Mobile Recharges via Google Pay","4% Cashback on Swiggy, Zomato & Ola","1.5% Unlimited Cashback on all other offline POS & retail transactions","4 Domestic Lounges/year (on ₹50k quarterly spend)"],
        pros: ["Industry-leading 5% cashback on utility bills via Google Pay (capped at ₹500/mo).","4% Cashback on Swiggy, Zomato & Ola.","Strong 1.5% uncapped base rate on offline swipe transactions (better than HDFC Millennia's 1%).","Direct statement cash credit with no minimum redemption threshold."],
        cons: ["5% utility cashback is exclusive to Google Pay on Android (not available on iOS Google Pay).","Domestic lounge access now requires ₹50k spend in previous quarter.","Fuel, rent, wallet loads earn 0% cashback."],
        tiers: [
          {
                    "rate": 5,
                    "name": "Utility Bills via Google Pay (5%)",
                    "categories": [
                              "utilities",
                              "electricity",
                              "gas",
                              "water",
                              "recharge"
                    ],
                    "merchants": [
                              "google pay",
                              "electricity",
                              "water",
                              "piped gas",
                              "lpg cylinder",
                              "dth"
                    ],
                    "monthlyCap": 500,
                    "fallbackRate": 1.5,
                    "notes": "5% cashback on bill payments and recharges via Google Pay (capped at ₹500/mo)."
          },
          {
                    "rate": 4,
                    "name": "Swiggy, Zomato & Ola (4%)",
                    "categories": [
                              "food-delivery",
                              "travel"
                    ],
                    "merchants": [
                              "swiggy",
                              "zomato",
                              "ola"
                    ],
                    "monthlyCap": 500,
                    "fallbackRate": 1.5,
                    "notes": "4% cashback on Swiggy, Zomato, and Ola (capped at ₹500/mo)."
          },
          {
                    "rate": 1.5,
                    "name": "All Other Retail Spends (1.5%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "1.5% unlimited cashback on other eligible retail spends."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded."
          },
          {
                    "category": "rent",
                    "reason": "Rent excluded."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loads excluded."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "isMilestoneBased": true,
                    "visitsPerYear": 4,
                    "ruleText": "4 complimentary domestic visits per calendar year (on ₹50,000 spend in previous quarter).",
                    "spendCriteria": "₹50,000 in prev quarter"
          },
          "internationalAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No international lounge access."
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "cashback",
                    "bogo": false,
                    "rate": 1.5,
                    "platform": "BookMyShow",
                    "description": "1.5% unlimited cashback."
          }
}
    },

    'airtel-axis': {
        id: 'airtel-axis',
        name: 'Airtel Axis Bank Credit Card',
        shortName: 'Airtel Axis',
        color: '#dc2626',
        matcher: /(?=.*airtel)(?=.*axis)|airtel\s*axis|axis\s*airtel/i,
        issuer: 'Axis Bank',
        network: 'Mastercard',
        cardType: 'Telecom & Utilities Cashback',
        annualFee: 500,
        joiningFee: 500,
        feeWaiverSpendTarget: 200000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: 1000,
        baseCashbackPercent: 1,
        bestFor: "Airtel users, monthly electricity/gas utility bills & Swiggy/Zomato food orders",
        welcomeBenefit: "Amazon voucher worth ₹500 upon card activation within 30 days",
        keyBenefitsSummary: ["25% Cashback on Airtel Mobile, Broadband & DTH recharges via Airtel Thanks app (capped at ₹250/mo)","10% Cashback on Utility Bills (Electricity, Water, Gas) via Airtel Thanks app (capped at ₹250/mo)","10% Cashback on Swiggy, Zomato & BigBasket (capped at ₹500/mo combined)","1% Unlimited Cashback on all other eligible spends","4 Complimentary Domestic Airport Lounges/year (1 per quarter via direct swipe)"],
        pros: ["Unbeatable 25% cashback on Airtel mobile recharges, fiber broadband, and DTH.","10% Cashback on daily electricity, piped gas, and water utility bills via Airtel Thanks.","10% Cashback on popular delivery apps (Swiggy, Zomato, BigBasket).","4 Domestic Airport Lounge visits per year (1 per calendar quarter).","Low annual fee of ₹500 + GST waived on ₹2 Lakh spend."],
        cons: ["Strict monthly category cashback caps (₹250/mo on telecom, ₹250/mo on utilities, ₹500/mo on food).","Best rewards require utilizing the Airtel Thanks application.","Fuel, rent, wallet, and jewellery transactions earn 0% cashback."],
        tiers: [
          {
                    "rate": 25,
                    "name": "Airtel Mobile, Broadband & DTH (25%)",
                    "categories": [
                              "recharge",
                              "broadband",
                              "telecom"
                    ],
                    "merchants": [
                              "airtel",
                              "airtel thanks"
                    ],
                    "monthlyCap": 250,
                    "fallbackRate": 1,
                    "notes": "25% cashback on Airtel Thanks app (Capped at ₹250/mo)."
          },
          {
                    "rate": 10,
                    "name": "Swiggy, Zomato & BigBasket (10%)",
                    "categories": [
                              "food-delivery",
                              "groceries"
                    ],
                    "merchants": [
                              "swiggy",
                              "zomato",
                              "bigbasket"
                    ],
                    "monthlyCap": 500,
                    "fallbackRate": 1,
                    "notes": "10% cashback on Swiggy, Zomato, BigBasket (Capped at ₹500/mo combined)."
          },
          {
                    "rate": 10,
                    "name": "Utility Bills via Airtel Thanks (10%)",
                    "categories": [
                              "utilities",
                              "electricity",
                              "gas",
                              "water"
                    ],
                    "merchants": [
                              "electricity",
                              "water",
                              "piped gas",
                              "lpg cylinder"
                    ],
                    "monthlyCap": 250,
                    "fallbackRate": 1,
                    "notes": "10% on utility bills via Airtel Thanks app (Capped at ₹250/mo)."
          },
          {
                    "rate": 1,
                    "name": "Other Retail Spends (1%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "1% unlimited on other eligible retail spends."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded (surcharge waiver applies)."
          },
          {
                    "category": "rent",
                    "reason": "Rent excluded."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loads excluded."
          },
          {
                    "category": "gold",
                    "reason": "Gold and jewelry purchases excluded."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 4,
                    "ruleText": "4 complimentary domestic lounge visits per calendar year (1 per quarter)."
          },
          "internationalAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No international lounge access."
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "cashback",
                    "bogo": false,
                    "rate": 1,
                    "description": "1% base cashback."
          }
}
    },

    'sbi-cashback': {
        id: 'sbi-cashback',
        name: 'SBI Cashback Credit Card',
        shortName: 'SBI Cashback',
        color: '#0284c7',
        matcher: /((?=.*sbi)(?=.*cashback))|(cashback\s*sbi)|(sbi\s*cashback)/i,
        issuer: 'SBI Card',
        network: 'Visa Signature',
        cardType: 'Universal Online Cashback',
        annualFee: 999,
        joiningFee: 999,
        feeWaiverSpendTarget: 200000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: 5000,
        baseCashbackPercent: 1,
        bestFor: "Shopping across diverse online websites with flat 5% cashback without merchant lock-in",
        welcomeBenefit: "Activation offers and statement cashback on card issuance",
        keyBenefitsSummary: ["5% Flat Cashback on almost all online retail transactions (Amazon, Flipkart, Myntra, Swiggy, Zomato, Nykaa, etc.)","High Monthly Cap: ₹5,000 monthly cashback (spend up to ₹1,00,000/mo at 5%)","1% Unlimited Cashback on offline retail spends","Direct statement credit: Automatically deducted from card bill balance","Annual fee waived on ₹2,00,000 annual spend"],
        pros: ["Universal 5% Online Cashback: Works across almost every online platform without needing merchant partnerships.","High ₹5,000 Monthly Cashback Cap: Allows up to ₹1,00,000 spend at 5% every month.","Auto Statement Credit: Cashback automatically reduces credit card statement bill balance.","Simple & Transparent: No complicated reward point ratios, redemption portals, or catalogue fees."],
        cons: ["Airport lounge access was completely discontinued on this card.","Utility bills, insurance payments, school fees, fuel, rent, and wallet loads earn 0% cashback.","₹999 + GST annual fee with a ₹2 Lakh waiver target."],
        tiers: [
          {
                    "rate": 5,
                    "name": "All Online Retail Spends (5%)",
                    "categories": [
                              "shopping",
                              "online-retail",
                              "food-delivery",
                              "groceries",
                              "travel"
                    ],
                    "merchants": [
                              "amazon",
                              "flipkart",
                              "myntra",
                              "swiggy",
                              "zomato",
                              "blinkit",
                              "zepto",
                              "makemytrip",
                              "ajio",
                              "nykaa",
                              "tata cliq"
                    ],
                    "monthlyCap": 5000,
                    "fallbackRate": 1,
                    "notes": "5% flat cashback across almost all online merchants. Monthly cap ₹5,000 (max spend ₹1,00,000)."
          },
          {
                    "rate": 1,
                    "name": "Offline Retail Spends (1%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "1% unlimited cashback on offline POS purchases."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel is excluded from cashback."
          },
          {
                    "category": "rent",
                    "reason": "Rent payments earn 0% cashback."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loading earns 0% cashback."
          },
          {
                    "category": "utilities",
                    "reason": "Utility bill payments (electricity, water, gas) earn 0% cashback."
          },
          {
                    "category": "education",
                    "reason": "School/College fees earn 0% cashback."
          },
          {
                    "category": "jewelry",
                    "reason": "Jewelry purchases are excluded."
          },
          {
                    "category": "insurance",
                    "reason": "Insurance payments earn 0% cashback."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "Direct domestic lounge access was discontinued."
          },
          "internationalAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No international lounge access."
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "cashback",
                    "bogo": false,
                    "rate": 5,
                    "description": "5% online cashback on BookMyShow."
          }
}
    },

    'sbi-simplyclick': {
        id: 'sbi-simplyclick',
        name: 'SBI SimplyCLICK Credit Card',
        shortName: 'SBI SimplyCLICK',
        color: '#0369a1',
        matcher: /simply.*click/i,
        issuer: 'SBI Card',
        network: 'Visa / Mastercard',
        cardType: 'Online Shopping',
        annualFee: 499,
        joiningFee: 499,
        feeWaiverSpendTarget: 100000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 0.25,
        bestFor: "Beginners shopping online on Amazon, BookMyShow, Cleartrip, Netmeds, Lenskart",
        welcomeBenefit: "₹500 Amazon gift voucher on payment of annual fee",
        keyBenefitsSummary: ["10x Reward Points (2.5% return) on Amazon, BookMyShow, Cleartrip, Lenskart, Netmeds, Apollo 24|7","5x Reward Points (1.25% return) on all other online shopping spends","1x Reward Point (0.25% return) on offline POS spends","₹1,00,000 spend annual fee waiver"],
        pros: ["10x Reward Points (2.5% value) across Amazon, BMS, Cleartrip, Lenskart, Netmeds, Apollo.","Welcome ₹500 Amazon voucher directly neutralizes the ₹499 joining fee.","Low ₹1 Lakh spend milestone to waive the ₹499 renewal fee.","Low eligibility threshold making it easy to acquire for first-time credit card applicants."],
        cons: ["No complimentary airport or railway lounge access.","Very poor 0.25% return on offline retail swipes.","₹99 + GST reward redemption fee on catalog vouchers."],
        tiers: [
          {
                    "rate": 2.5,
                    "name": "10x Partner Merchants (2.5%)",
                    "categories": [
                              "shopping",
                              "entertainment",
                              "pharmacy",
                              "travel"
                    ],
                    "merchants": [
                              "amazon",
                              "bookmyshow",
                              "cleartrip",
                              "lenskart",
                              "netmeds",
                              "apollo 24|7",
                              "apollo"
                    ],
                    "monthlyCap": null,
                    "notes": "10x Reward Points (2.5% return) on Amazon, BookMyShow, Cleartrip, Lenskart, Netmeds, Apollo."
          },
          {
                    "rate": 1.25,
                    "name": "All Other Online Spends (5x RP = 1.25%)",
                    "categories": [
                              "online-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "5x Reward Points (1.25% return) on all other online retail spends."
          },
          {
                    "rate": 0.25,
                    "name": "Offline Retail Spends (1x RP = 0.25%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "1 Reward Point per ₹100 spent offline (0.25% value)."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded."
          },
          {
                    "category": "rent",
                    "reason": "Rent excluded."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loads excluded."
          },
          {
                    "category": "government",
                    "reason": "Government transactions excluded."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No airport lounge access."
          },
          "internationalAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No international lounge access."
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "points",
                    "bogo": false,
                    "rate": 2.5,
                    "platform": "BookMyShow",
                    "description": "10x Reward Points (2.5% value) on BookMyShow."
          }
}
    },

    'sbi-bpcl-octane': {
        id: 'sbi-bpcl-octane',
        name: 'BPCL SBI Card Octane',
        shortName: 'BPCL Octane',
        color: '#15803d',
        matcher: /bpcl.*octane|octane/i,
        issuer: 'SBI Card',
        network: 'Visa Signature',
        cardType: 'Fuel & Utility Saver',
        annualFee: 1499,
        joiningFee: 1499,
        feeWaiverSpendTarget: 200000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 0.25,
        bestFor: "High fuel spenders purchasing petrol/diesel at Bharat Petroleum (BPCL) pumps (7.25% value)",
        welcomeBenefit: "6,000 Reward Points (worth ₹1,500 on BPCL fuel) on fee payment",
        keyBenefitsSummary: ["7.25% Value Back on Fuel at BPCL pumps (25 Reward Points per ₹100 = 6.25% + 1% fuel surcharge waiver)","25 Reward Points per ₹100 on Bharatgas LPG cylinder booking (6.25% value)","10 Reward Points per ₹100 on Groceries, Supermarket, Dining & Movies (2.5% value)","4 Complimentary Domestic Airport Lounges/year (1 per quarter via direct swipe)","Annual fee waived on ₹2,00,000 annual spend"],
        pros: ["India’s Best Fuel Card: 7.25% total return on petrol & diesel at Bharat Petroleum pumps.","6.25% Value Back on Bharatgas LPG cylinder bookings.","2.5% Return on daily groceries, dining, and movie tickets.","4 Domestic Airport Lounge visits per year (1 per quarter).","Welcome points (worth ₹1,500) completely neutralize the ₹1,499 joining fee."],
        cons: ["Fuel benefits are restricted strictly to BPCL petrol pumps (0% on HPCL, IndianOil, Shell).","Base reward rate on general retail is low at 0.25% (1 RP/₹100).","Requires visiting physical BPCL pumps to redeem fuel vouchers via POS machine."],
        tiers: [
          {
                    "rate": 7.25,
                    "name": "BPCL Fuel & Petrol Pumps (7.25%)",
                    "categories": [
                              "fuel"
                    ],
                    "merchants": [
                              "bpcl",
                              "bharat petroleum"
                    ],
                    "monthlyCap": 2500,
                    "fallbackRate": 0.25,
                    "notes": "25 Reward Points per ₹100 (6.25%) + 1% fuel surcharge waiver at BPCL petrol pumps."
          },
          {
                    "rate": 6.25,
                    "name": "Bharatgas LPG Cylinder Bookings (6.25%)",
                    "categories": [
                              "utilities",
                              "gas"
                    ],
                    "merchants": [
                              "bharatgas",
                              "lpg cylinder"
                    ],
                    "monthlyCap": 1000,
                    "fallbackRate": 0.25,
                    "notes": "25 Reward Points per ₹100 (6.25% value back) on Bharatgas bookings."
          },
          {
                    "rate": 2.5,
                    "name": "Groceries, Supermarket & Dining (2.5%)",
                    "categories": [
                              "groceries",
                              "supermarket",
                              "dining"
                    ],
                    "merchants": [
                              "groceries",
                              "dmart",
                              "bigbasket",
                              "blinkit",
                              "zepto",
                              "swiggy",
                              "zomato"
                    ],
                    "monthlyCap": 1500,
                    "fallbackRate": 0.25,
                    "notes": "10 Reward Points per ₹100 (2.5% value back) on groceries, dining and movies."
          },
          {
                    "rate": 0.25,
                    "name": "Other Retail Spends (0.25%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "1 Reward Point per ₹100 spent (0.25% return)."
          }
],
        exclusions: [
          {
                    "category": "rent",
                    "reason": "Rent excluded."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loads excluded."
          },
          {
                    "category": "government",
                    "reason": "Government transactions excluded."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 4,
                    "ruleText": "4 complimentary domestic airport lounge visits per calendar year (1 per quarter via direct swipe).",
                    "spendCriteria": "None (Direct swipe)"
          },
          "internationalAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No international lounge access."
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "points",
                    "bogo": false,
                    "rate": 2.5,
                    "platform": "BookMyShow",
                    "description": "10 Reward Points per ₹100 (2.5% value back) on movie tickets."
          }
}
    },

    'amex-plat-travel': {
        id: 'amex-plat-travel',
        name: 'American Express Platinum Travel Credit Card',
        shortName: 'Amex Plat Travel',
        color: '#64748b',
        matcher: /amex.*plat.*travel|platinum.*travel/i,
        issuer: 'American Express',
        network: 'American Express',
        cardType: 'Milestone Travel',
        annualFee: 5000,
        joiningFee: 3500,
        feeWaiverSpendTarget: null,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 1,
        bestFor: "Hitting the ₹4 Lakh annual spend milestone for ₹48,000+ reward value (Taj stay + 40k MR points)",
        welcomeBenefit: "10,000 Membership Rewards (MR) points upon spending ₹15,000 in first 90 days",
        keyBenefitsSummary: ["15,000 Bonus MR points on hitting ₹1.9 Lakh annual spend","25,000 Bonus MR points + ₹10,000 Taj Stay Voucher on hitting ₹4 Lakh annual spend","8 Complimentary Domestic Airport Lounge visits per year (2 per quarter)","1 MR point per ₹50 spent on all regular retail"],
        pros: ["Incredible 8%–10% net reward return when spending exactly ₹4 Lakh in a card membership year.","₹10,000 Taj Hotels stay voucher on reaching ₹4 Lakh milestone.","40,000+ total MR points redeemable for Marriott Bonvoy (1:1 during transfer bonus) or statement credit.","World-class American Express fraud protection and customer concierge service."],
        cons: ["Reward return drops sharply to <0.5% if you spend less than ₹1.9L or more than ₹4L per year.","Lower merchant acceptance compared to Visa and Mastercard at local offline vendors.","No renewal fee waiver spend target (fee is ₹5,000 + GST every year)."],
        tiers: [
          {
                    "rate": 8,
                    "name": "Milestone Travel Spends (8% Return at ₹4L)",
                    "categories": [
                              "travel",
                              "shopping",
                              "dining",
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "Effective ~8% return in Taj stay vouchers + 40,000 MR points when pacing towards ₹4 Lakh annual milestone."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded."
          },
          {
                    "category": "rent",
                    "reason": "Rent excluded."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loads excluded."
          },
          {
                    "category": "utilities",
                    "reason": "Utilities earn 0 MR points."
          },
          {
                    "category": "insurance",
                    "reason": "Insurance excluded."
          },
          {
                    "category": "emi",
                    "reason": "EMI transactions excluded."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 8,
                    "ruleText": "8 complimentary domestic airport lounge visits per year (2 per calendar quarter via direct swipe).",
                    "spendCriteria": "None (Direct swipe)"
          },
          "internationalAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No complimentary international lounge access."
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "points",
                    "bogo": false,
                    "rate": 1,
                    "platform": "BookMyShow",
                    "description": "Standard MR points on BookMyShow."
          }
}
    },

    'idfc-first-wealth': {
        id: 'idfc-first-wealth',
        name: 'IDFC FIRST Wealth Credit Card',
        shortName: 'IDFC FIRST Wealth',
        color: '#991b1b',
        matcher: /(first\s*wealth)|wealth/i,
        issuer: 'IDFC FIRST Bank',
        network: 'Visa Infinite',
        cardType: 'Premium Lifetime Free',
        annualFee: 0,
        joiningFee: 0,
        feeWaiverSpendTarget: 0,
        forexMarkupPercent: 1.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 0.67,
        bestFor: "Zero annual fee lovers wanting free domestic & international lounges, low 1.5% forex, and BookMyShow BOGO",
        welcomeBenefit: "Gift voucher worth ₹500 on spending ₹15,000 within 90 days of card issuance",
        keyBenefitsSummary: ["Lifetime Free (LTF): ₹0 Joining Fee, ₹0 Annual Fee forever","4 Domestic + 4 International Airport Lounges per quarter (on ₹20k monthly spend)","Low 1.5% Forex Markup on international spends","Buy 1 Get 1 Free on movie tickets up to ₹500 off (twice per month)","Complimentary roadside assistance (RSA) worth ₹1,399"],
        pros: ["Truly Lifetime Free with zero renewal fees and no hidden spend conditions.","Low 1.5% Foreign Currency Markup (saves 2% vs traditional bank credit cards).","Both Domestic (4/quarter) and International (4/quarter) lounge access included via DreamFolks.","Buy 1 Get 1 Free movie tickets up to ₹500 discount twice a month on Paytm / District movies.","Reward points never expire and can be redeemed directly against online purchases."],
        cons: ["Lounge access now requires spending ₹20,000 in the previous calendar month.","Modest base reward rate of ~0.67% on regular spends (3x points per ₹150, 1 pt = ₹0.25).","High monthly spend threshold (₹30,000) needed to unlock 10x accelerated rewards tier."],
        tiers: [
          {
                    "rate": 2.5,
                    "name": "Monthly Spends Above ₹30,000 (10x RP = 2.5%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "10x Reward Points (2.5% value) on all incremental spends above ₹30,000 in a billing cycle."
          },
          {
                    "rate": 0.67,
                    "name": "Regular Retail Spends (3x RP = 0.67%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "3 Reward Points per ₹150 spent (0.67% return)."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded."
          },
          {
                    "category": "rent",
                    "reason": "Rent excluded."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loads excluded."
          },
          {
                    "category": "government",
                    "reason": "Government transactions excluded."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "isMilestoneBased": true,
                    "visitsPerYear": 16,
                    "ruleText": "4 complimentary domestic visits per calendar quarter (on ₹20,000 spend in previous month).",
                    "spendCriteria": "₹20,000 in prev month"
          },
          "internationalAirport": {
                    "hasAccess": true,
                    "isMilestoneBased": true,
                    "visitsPerYear": 16,
                    "ruleText": "4 complimentary international visits per calendar quarter (on ₹20,000 spend in previous month).",
                    "spendCriteria": "₹20,000 in prev month"
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "bogo",
                    "bogo": true,
                    "platform": "Paytm / District",
                    "description": "Buy 1 Get 1 Free: Up to ₹500 off on 2nd movie ticket twice a month via Paytm / District."
          }
}
    },

    'scapia-federal': {
        id: 'scapia-federal',
        name: 'Scapia Federal Credit Card',
        shortName: 'Scapia',
        color: '#0f766e',
        matcher: /scapia/i,
        issuer: 'Federal Bank',
        network: 'Visa Signature',
        cardType: 'Zero Forex Travel',
        annualFee: 0,
        joiningFee: 0,
        feeWaiverSpendTarget: 0,
        forexMarkupPercent: 0,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 2,
        bestFor: "International travelers and backpackers wanting 0% forex markup and unlimited airport lounges",
        welcomeBenefit: "Instant digital issuance with zero joining and annual fees",
        keyBenefitsSummary: ["Zero Forex Markup (0.0%): Flat 0% currency conversion fee worldwide (saves 3.5%–4.13% on all foreign spends)","Unlimited Domestic Airport Lounge Access across India on spending just ₹10,000 per billing cycle","10% Scapia Coins on all flights and hotel bookings on Scapia App","2% Scapia Coins on all other eligible retail spends","100% digital app management with instant onboarding"],
        pros: ["True 0% Forex Markup: Save ~4.13% (including GST) on every swipe abroad or international website.","Unlimited Domestic Airport Lounges with an exceptionally low ₹10,000 monthly spend requirement.","Lifetime Free: No joining fee, no annual fee, no renewal criteria.","10% Scapia Coins on travel bookings (flights and hotels) booked inside the app."],
        cons: ["Scapia coins can only be redeemed for flights and hotels on the Scapia travel portal.","No international lounge access (domestic lounges only).","Occasional pauses in new credit card issuance due to Federal Bank regulatory limits."],
        tiers: [
          {
                    "rate": 10,
                    "name": "Scapia App Flights & Hotels (10%)",
                    "categories": [
                              "travel"
                    ],
                    "merchants": [
                              "scapia",
                              "scapia app",
                              "flights",
                              "hotels"
                    ],
                    "monthlyCap": null,
                    "notes": "10% Scapia coins on all travel bookings made inside the Scapia app."
          },
          {
                    "rate": 2,
                    "name": "All Other Spends & Forex (2%)",
                    "categories": [
                              "all-retail",
                              "forex"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "2% Scapia coins on all other eligible spends domestically and internationally."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded."
          },
          {
                    "category": "rent",
                    "reason": "Rent excluded."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loads excluded."
          },
          {
                    "category": "government",
                    "reason": "Government transactions excluded."
          },
          {
                    "category": "utilities",
                    "reason": "Utilities excluded."
          },
          {
                    "category": "gold",
                    "reason": "Gold excluded."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "isMilestoneBased": true,
                    "visitsPerYear": 999,
                    "ruleText": "Unlimited complimentary domestic airport lounge visits (unlocked on spending ₹10,000 in previous billing cycle).",
                    "spendCriteria": "₹10,000 in billing cycle"
          },
          "internationalAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No international lounge access."
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "coins",
                    "bogo": false,
                    "rate": 2,
                    "platform": "BookMyShow",
                    "description": "2% Scapia coins on movie tickets."
          }
}
    },

    'onecard-metal': {
        id: 'onecard-metal',
        name: 'OneCard Metal Credit Card',
        shortName: 'OneCard Metal',
        color: '#1f2937',
        matcher: /onecard/i,
        issuer: 'Federal / BOB / SBM Bank',
        network: 'Visa Signature',
        cardType: 'Entry Metal',
        annualFee: 0,
        joiningFee: 0,
        feeWaiverSpendTarget: 0,
        forexMarkupPercent: 1,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 1,
        bestFor: "Sleek metal card experience, zero annual fees, and automatic 5x rewards on top categories",
        welcomeBenefit: "Full metal credit card with zero joining and annual fees",
        keyBenefitsSummary: ["Heavy Metal Card: Free premium metal card with zero lifetime fees","5x Rewards automatically applied to your top 2 spending categories each month","Low 1.0% Forex Markup on international spends","Instant fractional point redemption for statement cash credit with no fees"],
        pros: ["Free premium heavy metal card with zero joining fee and lifetime free validity.","Automatic 5x Rewards on your top 2 highest spend categories every month.","Low 1% Forex Markup (much lower than standard 3.5%).","Instant cash redemption directly against transactions in the OneCard app with zero fees."],
        cons: ["No complimentary airport or railway lounge access.","Base rewards outside top 2 categories are low at 0.2%–1%.","Fuel and rent excluded from 5x category rewards."],
        tiers: [
          {
                    "rate": 5,
                    "name": "Top 2 Monthly Spend Categories (5x)",
                    "categories": [
                              "shopping",
                              "dining",
                              "food-delivery",
                              "groceries",
                              "travel"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "5x Reward Points automatically applied to your top 2 spending categories of the month."
          },
          {
                    "rate": 1,
                    "name": "All Other Spends (1%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "1 Reward Point per ₹10 spent (1% value)."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded."
          },
          {
                    "category": "rent",
                    "reason": "Rent excluded."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loads excluded."
          },
          {
                    "category": "government",
                    "reason": "Government transactions excluded."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No airport lounge access."
          },
          "internationalAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No international lounge access."
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "points",
                    "bogo": false,
                    "rate": 5,
                    "platform": "BookMyShow",
                    "description": "Up to 5x rewards when movies fall within your top 2 spend categories."
          }
}
    },

    'kiwi-rupay': {
        id: 'kiwi-rupay',
        name: 'Kiwi RuPay Credit Card',
        shortName: 'Kiwi RuPay',
        color: '#059669',
        matcher: /kiwi/i,
        issuer: 'Yes Bank',
        network: 'RuPay Credit on UPI',
        cardType: 'UPI Credit on RuPay',
        annualFee: 0,
        joiningFee: 0,
        feeWaiverSpendTarget: 0,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 1.5,
        bestFor: "Everyday UPI QR scans, kirana stores, offline payments with up to 2% cashback & lounge milestones",
        welcomeBenefit: "₹250 flat cashback on first UPI transaction via Kiwi app",
        keyBenefitsSummary: ["Lifetime Free (LTF): Zero Joining and Annual Fee forever","Up to 2% Cashback on RuPay UPI merchant QR scans via Kiwi app","Zero payment surcharge at local merchants, tea stalls & cafes","Milestone Airport Lounges: Up to 3 domestic airport lounge vouchers via Kiwi Neon milestones (at ₹50k, ₹1L, ₹1.5L spends)","Instant virtual card generation in under 2 minutes"],
        pros: ["Works on UPI: Scan any merchant QR code and pay directly from credit card with up to 50 days interest-free float.","Up to 2% cashback on daily offline merchant QR transactions where credit cards are usually not accepted.","Completely Lifetime Free with no renewal fee or annual charges.","Milestone Airport Lounges unlocked via Kiwi Neon spends (up to 3 vouchers/year)."],
        cons: ["Peer-to-peer (P2P) transfers to friends and family do not earn cashback or are restricted per NPCI guidelines.","Accelerated cashback requires using Kiwi mobile app interface.","High value spends at major e-commerce platforms yield better rewards on specialized shopping cards."],
        tiers: [
          {
                    "rate": 2,
                    "name": "Kiwi Neon UPI Merchant Scan & Pay (2%)",
                    "categories": [
                              "upi",
                              "qr-code",
                              "local-merchant",
                              "dining",
                              "groceries"
                    ],
                    "merchants": [
                              "upi",
                              "qr",
                              "scan & pay"
                    ],
                    "monthlyCap": null,
                    "notes": "Up to 2% cashback on UPI QR merchant payments via Kiwi app (1.5% base + 0.5% milestone bonus)."
          },
          {
                    "rate": 1,
                    "name": "Other Retail Spends (1%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "1% cashback on online/e-commerce retail transactions."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded from cashback (UPI fuel does not get surcharge waiver; 1% fee on spends > ₹10,000)."
          },
          {
                    "category": "rent",
                    "reason": "Rent payments earn 0% cashback + incur 1% or ₹199 min fee on YES Bank (max 5 transactions per 30 days)."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loads earn 0% cashback (1% fee applies on loads exceeding ₹2,000 w.e.f. YES Bank MITC)."
          },
          {
                    "category": "education",
                    "reason": "Education payments via third-party apps incur 1% fee (0% fee if paid directly on institute portal)."
          },
          {
                    "category": "government",
                    "reason": "Government tax and challan payments earn 0% cashback."
          },
          {
                    "category": "p2p",
                    "reason": "Peer-to-peer transfers to friends/family do not earn cashback."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "isMilestoneBased": true,
                    "visitsPerYear": 3,
                    "ruleText": "Milestone-based via Kiwi Neon: 1 lounge access voucher upon reaching ₹50,000 spend, +1 at ₹1,00,000, and +1 at ₹1,50,000.",
                    "spendCriteria": "Kiwi Neon Milestones (₹50k / ₹100k / ₹150k)"
          },
          "internationalAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No international lounge access."
          },
          "railwayLounge": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No railway lounge access."
          }
},
        entertainment: {
          "movies": {
                    "type": "cashback",
                    "bogo": false,
                    "rate": 2,
                    "platform": "BookMyShow via UPI",
                    "description": "Up to 2% cashback when BookMyShow is paid via Kiwi UPI Scan & Pay."
          }
}
    },

    'yes-bank-marquee': {
        id: 'yes-bank-marquee',
        name: 'YES Bank Marquee Credit Card',
        shortName: 'YES Marquee',
        color: '#1e3a8a',
        matcher: /marquee|yes.*marquee/i,
        issuer: 'YES Bank',
        network: 'Mastercard World Elite / Visa Infinite',
        cardType: 'Super-Premium Lifestyle & Travel',
        annualFee: 4999,
        joiningFee: 9999,
        feeWaiverSpendTarget: 1000000,
        forexMarkupPercent: 1.0,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 2.25,
        bestFor: "Luxury travel, ultra-low 1% forex markup, BookMyShow BOGO, and extensive airport lounge access",
        welcomeBenefit: "60,000 YES Rewardz points (worth ₹15,000 on flights/hotels) on paying joining fee",
        keyBenefitsSummary: [
            "Ultra-low 1% Forex Markup on foreign currency transactions (saves 2.5% vs standard cards)",
            "Unlimited/Generous Airport Lounge Access: 24 Domestic + 24 International visits/year via Priority Pass",
            "Complimentary Guest Lounge Access: 4 International + 2 Domestic guest visits per calendar year",
            "BookMyShow BOGO: Buy 1 Get 1 Free up to ₹800 off per month on movies and events",
            "Up to 4 complimentary golf rounds or coaching lessons per month across top Indian golf courses",
            "4.5% Return (36 Reward Points/₹200) on online retail; 2.25% (18 Reward Points/₹200) on offline retail",
            "1% Fuel Surcharge Waiver on transactions between ₹500 and ₹5,000 (up to ₹1,000/statement cycle)"
        ],
        pros: [
            "Ultra-Low 1% Forex Markup: One of the lowest in India, saving ₹2,500 per ₹1 Lakh spent internationally.",
            "Exceptional Lounge Benefits: 24 domestic + 24 international lounge visits with dedicated free guest access.",
            "High Entertainment Savings: BookMyShow BOGO up to ₹800/month (saves up to ₹9,600 annually).",
            "Strong Reward Rates: 4.5% effective reward value online and 2.25% offline.",
            "Complimentary Golf: 4 free rounds/lessons per month."
        ],
        cons: [
            "Domestic airport lounge access requires spending ₹1,00,000 in the previous calendar quarter.",
            "Reward points on utility spends are capped at 1,250 points per statement cycle (1% fee on utility spends > ₹50,000).",
            "Fuel spends > ₹10,000 incur a 1% fee.",
            "Wallet loads > ₹2,000 incur 1% fee; rent payments incur 1% or ₹199 minimum fee.",
            "High ₹10 Lakh annual spend hurdle to waive the ₹4,999 renewal fee."
        ],
        tiers: [
            {
                rate: 4.5,
                name: "Online Retail Spends (36 RP/₹200 = 4.5%)",
                categories: [
                    "shopping",
                    "online-retail",
                    "food-delivery",
                    "travel"
                ],
                merchants: [],
                monthlyCap: null,
                notes: "36 YES Rewardz Points per ₹200 spent on online retail (1 RP = ₹0.25 => 4.5% value)."
            },
            {
                rate: 2.25,
                name: "Offline & General Retail Spends (18 RP/₹200 = 2.25%)",
                categories: [
                    "all-retail"
                ],
                merchants: [],
                monthlyCap: null,
                notes: "18 YES Rewardz Points per ₹200 spent on offline retail (1 RP = ₹0.25 => 2.25% value)."
            }
        ],
        exclusions: [
            { category: "fuel", reason: "Fuel excluded from reward points (1% surcharge waiver applies between ₹500-₹5,000 up to ₹1,000/mo; 1% fee on spends > ₹10,000)." },
            { category: "rent", reason: "Rent payments earn 0% rewards + incur 1% or ₹199 min fee (max 5 transactions per 30 days)." },
            { category: "wallet", reason: "Wallet loads earn 0% rewards (1% fee applies on loads exceeding ₹2,000)." },
            { category: "education", reason: "Education payments via third-party platforms incur 1% fee (0% fee if paid directly on institute portal)." },
            { category: "government", reason: "Government tax and challan payments earn 0% rewards." }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: true,
                visitsPerYear: 24,
                isMilestoneBased: true,
                ruleText: "Up to 6 domestic airport lounge visits per quarter (24/year) on spending ₹1,00,000 in previous calendar quarter + 2 guest visits/year.",
                spendCriteria: "₹1,00,000 in previous quarter"
            },
            internationalAirport: {
                hasAccess: true,
                visitsPerYear: 24,
                isMilestoneBased: false,
                ruleText: "Up to 24 complimentary international airport lounge visits per year via Priority Pass (no spend hurdle) + 4 guest visits/year.",
                spendCriteria: "Priority Pass (Unconditional)"
            },
            railwayLounge: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No railway lounge access."
            }
        },
        entertainment: {
            movies: {
                type: "bogo",
                bogo: true,
                maxDiscount: 800,
                rate: 50,
                platform: "BookMyShow",
                description: "Buy 1 Get 1 Free on BookMyShow up to ₹800 off per month on movie and event tickets."
            }
        },
        golf: {
            hasAccess: true,
            roundsPerMonth: 4,
            spendCriteria: "Complimentary benefit",
            description: "Up to 4 complimentary golf rounds or coaching lessons per calendar month across premier golf courses in India."
        }
    },

    'yes-bank-reserv': {
        id: 'yes-bank-reserv',
        name: 'YES Bank Reserv Credit Card',
        shortName: 'YES Reserv',
        color: '#475569',
        matcher: /reserv|yes.*reserv/i,
        issuer: 'YES Bank',
        network: 'Mastercard World / Visa Signature',
        cardType: 'Premium Lifestyle & Dining',
        annualFee: 2499,
        joiningFee: 2499,
        feeWaiverSpendTarget: 300000,
        forexMarkupPercent: 2.0,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 1.5,
        bestFor: "Dining, movies (BOGO), and frequent domestic/international travelers",
        welcomeBenefit: "Welcome gift vouchers / reward points on paying joining fee or ₹40,000 spend in 30 days",
        keyBenefitsSummary: [
            "Low 2% Forex Markup on foreign currency spends (w.e.f. June 15, 2026)",
            "Domestic Airport Lounges: 12 visits/year (3/quarter on ₹1,00,000 quarterly spend)",
            "International Airport Lounges: 6 visits/year via Priority Pass (unconditional)",
            "BookMyShow BOGO: Buy 1 Get 1 Free up to ₹250 off (twice a month = up to ₹6,000/year)",
            "1 complimentary golf round or coaching lesson per month",
            "3% Return (24 RP/₹200) on online retail; 1.5% (12 RP/₹200) on offline retail",
            "1% Fuel Surcharge Waiver on spends between ₹500 and ₹4,000 (up to ₹500/statement cycle)"
        ],
        pros: [
            "Low 2% forex markup compared to standard 3.5% fee on competitor cards.",
            "BookMyShow BOGO up to ₹250 off twice a month saves up to ₹6,000 annually.",
            "Includes 6 complimentary international lounge visits via Priority Pass without quarterly spend hurdle.",
            "Moderate annual fee waiver threshold of ₹3,00,000."
        ],
        cons: [
            "Domestic airport lounge access requires spending ₹1,00,000 in the previous calendar quarter.",
            "Utility reward points capped at 750 points per statement cycle (1% fee on utility spends > ₹50,000).",
            "1% fee on fuel spends exceeding ₹10,000; surcharge waiver capped at ₹500/month.",
            "Wallet loads > ₹2,00,0 incur 1% fee; rent payments incur 1% or ₹199 minimum fee."
        ],
        tiers: [
            {
                rate: 3.0,
                name: "Online Retail Spends (24 RP/₹200 = 3%)",
                categories: [
                    "shopping",
                    "online-retail",
                    "food-delivery",
                    "travel"
                ],
                merchants: [],
                monthlyCap: null,
                notes: "24 YES Rewardz Points per ₹200 spent on online retail (1 RP = ₹0.25 => 3% value)."
            },
            {
                rate: 1.5,
                name: "Offline & General Retail Spends (12 RP/₹200 = 1.5%)",
                categories: [
                    "all-retail"
                ],
                merchants: [],
                monthlyCap: null,
                notes: "12 YES Rewardz Points per ₹200 spent on offline retail (1 RP = ₹0.25 => 1.5% value)."
            }
        ],
        exclusions: [
            { category: "fuel", reason: "Fuel excluded from rewards (1% surcharge waiver applies between ₹500-₹4,000 up to ₹500/mo; 1% fee on spends > ₹10,000)." },
            { category: "rent", reason: "Rent payments earn 0% rewards + incur 1% or ₹199 min fee (max 5 transactions per 30 days)." },
            { category: "wallet", reason: "Wallet loads earn 0% rewards (1% fee applies on loads exceeding ₹2,000)." },
            { category: "education", reason: "Education payments via third-party platforms incur 1% fee (0% fee if paid directly on institute portal)." },
            { category: "government", reason: "Government tax and challan payments earn 0% rewards." }
        ],
        lounges: {
            domesticAirport: {
                hasAccess: true,
                visitsPerYear: 12,
                isMilestoneBased: true,
                ruleText: "Up to 3 domestic airport lounge visits per quarter (12/year) on spending ₹1,00,000 in previous calendar quarter.",
                spendCriteria: "₹1,00,000 in previous quarter"
            },
            internationalAirport: {
                hasAccess: true,
                visitsPerYear: 6,
                isMilestoneBased: false,
                ruleText: "Up to 6 complimentary international airport lounge visits per year via Priority Pass (no spend hurdle).",
                spendCriteria: "Priority Pass (Unconditional)"
            },
            railwayLounge: {
                hasAccess: false,
                visitsPerYear: 0,
                ruleText: "No railway lounge access."
            }
        },
        entertainment: {
            movies: {
                type: "bogo",
                bogo: true,
                maxDiscount: 250,
                rate: 50,
                platform: "BookMyShow",
                description: "Buy 1 Get 1 Free on BookMyShow up to ₹250 off twice a month on movie tickets."
            }
        },
        golf: {
            hasAccess: true,
            roundsPerMonth: 1,
            spendCriteria: "Complimentary benefit",
            description: "1 complimentary golf round or coaching lesson per calendar month across premier golf courses in India."
        }
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
        { label: '🎬 BookMyShow BOGO', query: 'bookmyshow', category: 'entertainment' },
        { label: '⛳ Golf Sessions', query: 'golf', category: 'lifestyle' },
        { label: '✈️ Flights & Travel', query: 'flights', category: 'travel' },
        { label: '🚕 Uber / Cabs', query: 'uber', category: 'travel' },
        { label: '⚡ Electricity & Bills', query: 'electricity', category: 'utilities' },
        { label: '✈️ Airport Lounge', query: 'airport lounge', category: 'lounge' },
        { label: '⛽ Fuel / Petrol', query: 'fuel', category: 'fuel' }
    ],

    // Keyword mapping to detect category intent (sorted by length descending during parse)
    keywordMap: {
        // Golf & Leisure
        'golf': { category: 'lifestyle', merchant: 'golf' },
        'golf course': { category: 'lifestyle', merchant: 'golf' },
        'golf session': { category: 'lifestyle', merchant: 'golf' },
        'country club': { category: 'lifestyle', merchant: 'golf' },

        // Fuel & Petrol Brands
        'bpcl': { category: 'fuel', merchant: 'bpcl' },
        'bharat petroleum': { category: 'fuel', merchant: 'bpcl' },
        'bharatgas': { category: 'utilities', merchant: 'bharatgas' },
        'hpcl': { category: 'fuel', merchant: 'hpcl' },
        'hindustan petroleum': { category: 'fuel', merchant: 'hpcl' },
        'indian oil': { category: 'fuel', merchant: 'ioc' },
        'ioc': { category: 'fuel', merchant: 'ioc' },
        'petrol': { category: 'fuel', merchant: 'fuel' },
        'diesel': { category: 'fuel', merchant: 'fuel' },

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
        'aws': { category: 'forex', merchant: 'aws' },

        // Gaming & Fantasy Sports (MCC 5816)
        'dream11': { category: 'gaming', merchant: 'dream11' },
        'mpl': { category: 'gaming', merchant: 'mpl' },
        'rummy': { category: 'gaming', merchant: 'rummy' },
        'poker': { category: 'gaming', merchant: 'poker' },
        'gaming': { category: 'gaming', merchant: 'gaming' },
        'gamescraft': { category: 'gaming', merchant: 'gaming' },
        'winzo': { category: 'gaming', merchant: 'gaming' }
    }
};

// ============================================================================
// 3. CORE LOGIC: PRESET DETECTION & RESOLUTION
// ============================================================================

/**
 * Detects matching preset from registry based on card name & issuer
 */
export function detectCardPreset(cardName = '', issuer = '') {
    const c = (cardName || '').trim();
    const i = (issuer || '').trim();
    const s1 = `${c} ${i}`.trim();
    const s2 = `${i} ${c}`.trim();
    const s3 = c;
    const s4 = s1.replace(/[-_.]+/g, ' ');

    for (const [presetId, preset] of Object.entries(CARD_PRESETS_REGISTRY)) {
        if (preset.matcher) {
            if (preset.matcher.test(s1) || preset.matcher.test(s2) || preset.matcher.test(s3) || preset.matcher.test(s4)) {
                return preset;
            }
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
        shortName: basePreset.shortName || card.name,
        network: basePreset.network || card.network || 'Visa / Mastercard',
        cardType: basePreset.cardType || 'Credit Card',
        joiningFee: basePreset.joiningFee !== undefined ? basePreset.joiningFee : (basePreset.annualFee || 0),
        annualFee: customBenefits.annualFee !== undefined ? customBenefits.annualFee : basePreset.annualFee,
        feeWaiverSpendTarget: customBenefits.feeWaiverSpendTarget !== undefined ? customBenefits.feeWaiverSpendTarget : basePreset.feeWaiverSpendTarget,
        forexMarkupPercent: customBenefits.forexMarkupPercent !== undefined ? customBenefits.forexMarkupPercent : basePreset.forexMarkupPercent,
        baseCashbackPercent: customBenefits.baseCashbackPercent !== undefined ? customBenefits.baseCashbackPercent : basePreset.baseCashbackPercent,
        tiers: customBenefits.tiers && customBenefits.tiers.length > 0 ? customBenefits.tiers : basePreset.tiers,
        exclusions: customBenefits.exclusions && customBenefits.exclusions.length > 0 ? customBenefits.exclusions : basePreset.exclusions,
        lounges: customBenefits.lounges ? { ...basePreset.lounges, ...customBenefits.lounges } : basePreset.lounges,
        entertainment: customBenefits.entertainment ? { ...basePreset.entertainment, ...customBenefits.entertainment } : basePreset.entertainment,
        golf: customBenefits.golf ? { ...basePreset.golf, ...customBenefits.golf } : (basePreset.golf || null),
        bestFor: basePreset.bestFor || '',
        welcomeBenefit: basePreset.welcomeBenefit || '',
        keyBenefitsSummary: basePreset.keyBenefitsSummary || [],
        pros: customBenefits.pros && customBenefits.pros.length > 0 ? customBenefits.pros : (basePreset.pros || []),
        cons: customBenefits.cons && customBenefits.cons.length > 0 ? customBenefits.cons : (basePreset.cons || [])
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
    const isUpiIntent = intent.category === 'upi' || intent.merchant === 'upi' || (intent.raw && (intent.raw.includes('upi') || intent.raw.includes('qr')));
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

    let utilityFeeWarning = null;
    let educationWarning = null;
    let gamingWarning = null;
    let transportFeeWarning = null;

    if (intent.category === 'forex') {
        const markupPercent = resolved.forexMarkupPercent || 3.5;
        const totalForexFeePercent = markupPercent * 1.18;
        forexCost = (spendAmount * totalForexFeePercent) / 100;
        forexWarning = `Forex Markup of ${markupPercent}% + 18% GST (~${totalForexFeePercent.toFixed(2)}% = ₹${Math.round(forexCost)}) applies. Consider a Zero Forex card.`;
    }

    if (intent.category === 'jewellery' && resolved.presetId === 'hsbc-live-plus') {
        specialMilestoneNote = 'Spends count 100% towards the ₹2 Lakh Annual Fee Waiver (saving ₹999 + GST renewal fee).';
    }

    const isYesBank = (resolved.cardIssuer || '').toLowerCase().includes('yes bank') || resolved.presetId === 'kiwi-rupay' || resolved.presetId === 'yes-bank-marquee' || resolved.presetId === 'yes-bank-reserv';
    const isHdfc = (resolved.cardIssuer || '').toLowerCase().includes('hdfc') || (resolved.presetId || '').startsWith('hdfc-') || resolved.presetId === 'tata-neu-infinity';
    const isIcici = (resolved.cardIssuer || '').toLowerCase().includes('icici');

    if (intent.category === 'fuel') {
        if (resolved.presetId === 'hsbc-live-plus') {
            fuelSurchargeWarning = 'Fuel Surcharge Waiver is NOT applicable (NA) on HSBC Live+. 1% surcharge is debited at pump with 0% cashback.';
        } else if (isIcici) {
            if (resolved.presetId === 'icici-emeralde-metal') {
                fuelSurchargeNote = 'Complimentary Fuel Surcharge Waiver: Emeralde Private Metal is completely exempt from fuel surcharges and transaction fees across all petrol pumps.';
            } else if (resolved.presetId === 'icici-hpcl-super-saver' && (intent.merchant === 'hpcl' || (intent.raw && intent.raw.includes('hpcl')))) {
                fuelSurchargeNote = '5% Total Fuel Savings (4% cashback up to ₹400/cycle + 1% surcharge waiver for ₹400–₹4,000) at HPCL petrol pumps.';
            } else if (spendAmount > 10000) {
                fuelSurchargeWarning = 'Over ₹10,000: ICICI Bank levies a 1% fee on fuel spends exceeding ₹10,000 (standard 1% surcharge is waived at all pumps).';
            } else if (spendAmount < 400) {
                fuelSurchargeWarning = 'Under ₹400: Surcharge waiver does NOT apply on ICICI Bank (valid between ₹400 and ₹4,000). 0% cashback.';
            } else if (spendAmount > 4000) {
                fuelSurchargeWarning = 'Over ₹4,000: Surcharge waiver only applies up to ₹4,000 per swipe on ICICI Bank. Split bill into ₹4,000 chunks to get full 1% waiver.';
            } else {
                fuelSurchargeNote = '1% Fuel Surcharge waived across petrol pumps (valid between ₹400 and ₹4,000 up to ₹50,000 spend/cycle, 0% cashback).';
            }
        } else if (isYesBank) {
            if (spendAmount > 10000) {
                fuelSurchargeWarning = 'Over ₹10,000: YES Bank levies a 1% fee on fuel spends exceeding ₹10,000 (0% rewards).';
            } else if (resolved.presetId === 'kiwi-rupay' && isUpiIntent) {
                fuelSurchargeWarning = 'Fuel surcharge waiver is NOT applicable for UPI payments on YES Bank credit cards (0% cashback).';
            } else if (spendAmount < 500) {
                fuelSurchargeWarning = 'Under ₹500: Surcharge waiver does not apply on YES Bank (valid between ₹500 and ₹3,000–₹5,000).';
            } else {
                fuelSurchargeNote = '1% Fuel Surcharge waived (valid between ₹500 and ₹3,000–₹5,000, 0% cashback).';
            }
        } else if (isHdfc) {
            if (spendAmount > 15000) {
                fuelSurchargeWarning = 'Over ₹15,000: HDFC Bank levies a 1% fee on fuel spends exceeding ₹15,000 (capped at ₹4,999, 0% rewards).';
            } else if (spendAmount < 400) {
                fuelSurchargeWarning = 'Under ₹400: Surcharge waiver does NOT apply on HDFC Bank (valid between ₹400 and ₹5,000). 0% cashback.';
            } else if (spendAmount > 5000) {
                fuelSurchargeWarning = 'Over ₹5,000: Surcharge waiver only applies up to ₹5,000 per swipe on HDFC Bank. Split bill into ₹5,000 chunks to get full 1% waiver.';
            } else {
                const maxWaiver = resolved.presetId === 'hdfc-infinia' ? '₹1,000' : (resolved.presetId === 'hdfc-regalia-gold' || resolved.presetId === 'tata-neu-infinity' ? '₹500' : '₹250');
                fuelSurchargeNote = `1% Fuel Surcharge waived across petrol pumps (valid ₹400–₹5,000, max waiver ${maxWaiver}/cycle, 0% cashback).`;
            }
        } else if (spendAmount < 400) {
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
        if (isYesBank && spendAmount > 1000) {
            rentWarning = 'YES Bank levies a 1% or ₹199 minimum fee (+ 18% GST) on rent payments above ₹1,000, capped at 5 transactions per 30 days (0% rewards).';
        } else if (isHdfc) {
            rentWarning = 'HDFC Bank levies a 1% + 18% GST fee on rental transactions done via third-party merchants (CRED, Paytm, Cheq, etc.), capped at ₹4,999 per transaction (0% rewards).';
        } else if (isIcici) {
            rentWarning = 'ICICI Bank levies a 1% + 18% GST processing fee on all rental payments (MCC 6513) with 0% reward points.';
        } else {
            rentWarning = 'Credit card rent payments incur 0% rewards plus a 1% + 18% GST bank processing fee on most issuers.';
        }
    }

    if (intent.category === 'wallet') {
        if (isIcici && spendAmount >= 5000) {
            walletWarning = 'Wallet loading earns 0% rewards. ICICI Bank levies a 1% + 18% GST fee on wallet load transactions of ₹5,000 or more (w.e.f. Jan 2026).';
        } else if (isYesBank && spendAmount > 2000) {
            walletWarning = 'Wallet loading earns 0% rewards. YES Bank levies a 1% + 18% GST fee on wallet loads exceeding ₹2,000 (max fee ₹5,000).';
        } else if (isHdfc && spendAmount > 10000) {
            walletWarning = 'Wallet loading earns 0% rewards. HDFC Bank levies a 1% + 18% GST fee on wallet loading (excl. PayZapp) exceeding ₹10,000 in a calendar month (capped at ₹4,999).';
        } else {
            walletWarning = 'Wallet loading earns 0% rewards and several banks levy a 1% + GST fee on credit card wallet reloads.';
        }
    }

    if (intent.category === 'utilities') {
        const isYesPremium = resolved.presetId === 'yes-bank-marquee' || resolved.presetId === 'yes-bank-reserv';
        const yesThreshold = isYesPremium ? 50000 : 25000;
        if (spendAmount > 50000 && isIcici && resolved.presetId !== 'icici-emeralde-metal') {
            utilityFeeWarning = 'Transactions exceeding ₹50,000 incur a 1% + 18% GST utility processing fee on ICICI Bank credit cards.';
        } else if (isYesBank && spendAmount > yesThreshold) {
            utilityFeeWarning = `Transactions exceeding ₹${yesThreshold.toLocaleString('en-IN')} incur a 1% + 18% GST utility processing fee on YES Bank credit cards.`;
        } else if (isHdfc && spendAmount > 50000) {
            utilityFeeWarning = 'Transactions exceeding ₹50,000 per month incur a 1% + 18% GST utility processing fee on HDFC Bank consumer credit cards (capped at ₹4,999/mo).';
        }
    }

    if (intent.category === 'education') {
        const isThirdPartyApp = intent.merchant === 'cred' || intent.merchant === 'paytm' || intent.merchant === 'cheq' || intent.merchant === 'phonepe' || intent.merchant === 'mobikwik' || intent.merchant === 'nobroker' || (intent.raw && (intent.raw.includes('cred') || intent.raw.includes('cheq') || intent.raw.includes('paytm') || intent.raw.includes('phonepe') || intent.raw.includes('mobikwik') || intent.raw.includes('nobroker')));

        if (isIcici) {
            if (resolved.presetId === 'amazon-pay-icici') {
                educationWarning = 'Education spends earn 0% cashback on Amazon Pay ICICI (w.e.f. Oct 11, 2025). Third-party apps (CRED, Paytm) also incur a 1% + GST processing fee.';
            } else if (isThirdPartyApp) {
                educationWarning = 'ICICI Bank levies a 1% + 18% GST fee on education spends paid via third-party platforms (CRED, Cheq, Paytm) with 0% rewards. Pay directly on school/college portal to earn rewards and avoid fee.';
            } else {
                specialMilestoneNote = 'Education payments made directly at school/college websites or POS machines earn standard ICICI Reward Points with 0% fee.';
            }
        } else if (isYesBank) {
            educationWarning = 'YES Bank levies a 1% + 18% GST fee on education spends paid via third-party platforms (CRED, PhonePe). Pay directly on school/college portal to avoid fee.';
        } else if (isHdfc) {
            if (isThirdPartyApp) {
                educationWarning = 'HDFC Bank levies a 1% + 18% GST fee (capped at ₹4,999) on education paid via third-party apps (CRED, Cheq, etc.) with 0% rewards. Pay directly on school/college portal to earn rewards and avoid fee.';
            } else {
                specialMilestoneNote = 'Education payments made directly on school/college websites or POS machines earn standard rewards (1% CashPoints on Millennia) with 0% fee on HDFC Bank.';
            }
        }
    }

    if (intent.category === 'gaming') {
        if (isIcici) {
            gamingWarning = 'Skill-based gaming spends earn 0% cashback. ICICI Bank levies a 2% + 18% GST fee (MCC 5816 w.e.f. Jan 2026).';
        } else if (isHdfc && spendAmount > 10000) {
            gamingWarning = 'Online skill-based gaming earns 0% rewards. HDFC Bank levies a 1% + 18% GST fee on gaming spends exceeding ₹10,000 in a calendar month (capped at ₹4,999).';
        } else {
            gamingWarning = 'Online gaming and lottery transactions earn 0% rewards and may attract bank convenience fees.';
        }
    }

    const isTransportIntent = intent.category === 'travel' || intent.category === 'transportation' || intent.merchant === 'fastag' || intent.merchant === 'toll' || (intent.raw && (intent.raw.includes('irctc') || intent.raw.includes('rail') || intent.raw.includes('train') || intent.raw.includes('bus') || intent.raw.includes('toll') || intent.raw.includes('fastag') || intent.raw.includes('metro') || intent.raw.includes('commuter') || intent.raw.includes('transport')));
    if (isTransportIntent && isIcici && spendAmount > 50000) {
        transportFeeWarning = 'Transactions exceeding ₹50,000 under Transportation (MCC 4111, 4112, 4784, 4131: IRCTC/trains, buses, tolls, FASTag) incur a 1% + 18% GST processing fee on ICICI Bank credit cards (w.e.f. Jan 15, 2026).';
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
            effectiveSavings: 0,
            perkValue: 0,
            perkBadge: null,
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
            entertainment: resolved.entertainment,
            golf: resolved.golf,
            pros: resolved.pros,
            cons: resolved.cons,
            bestFor: resolved.bestFor,
            welcomeBenefit: resolved.welcomeBenefit,
            keyBenefitsSummary: resolved.keyBenefitsSummary,
            presetId: resolved.presetId
        };
    }

    // E. Check for Exclusions (0% Return)
    const matchedExclusion = resolved.exclusions.find(ex => {
        const cat = typeof ex === 'string' ? ex : ex.category;

        // Special case: Amazon Pay ICICI utility bills earn 2% when paid via Amazon Pay!
        if (resolved.presetId === 'amazon-pay-icici' && cat === 'utilities') {
            const isViaAmazonPay = intent.merchant === 'amazon pay' || (intent.raw && (intent.raw.includes('amazon pay') || intent.raw.includes('amazon')));
            if (isViaAmazonPay) return false; // Do not exclude if paying via Amazon Pay!
        }

        // Special case for ICICI HPCL Super Saver: HPCL fuel earns 4% cashback!
        if (resolved.presetId === 'icici-hpcl-super-saver' && cat === 'fuel') {
            const isHpcl = intent.merchant === 'hpcl' || (intent.raw && intent.raw.includes('hpcl'));
            if (isHpcl) return false; // Do not exclude if HPCL pump!
        }

        // Special case for ICICI core cards: direct school/college education earns standard rewards with 0% fee! (Amazon Pay ICICI excludes all education)
        if (isIcici && resolved.presetId !== 'amazon-pay-icici' && cat === 'education') {
            const isThirdPartyApp = intent.merchant === 'cred' || intent.merchant === 'paytm' || intent.merchant === 'cheq' || intent.merchant === 'phonepe' || intent.merchant === 'mobikwik' || intent.merchant === 'nobroker' || (intent.raw && (intent.raw.includes('cred') || intent.raw.includes('cheq') || intent.raw.includes('paytm') || intent.raw.includes('phonepe') || intent.raw.includes('mobikwik') || intent.raw.includes('nobroker')));
            if (!isThirdPartyApp) return false; // Do not exclude if direct institute payment!
        }

        // Special case for HDFC: direct school/college education earns standard rewards with 0% fee!
        if (isHdfc && cat === 'education') {
            const isThirdPartyApp = intent.merchant === 'cred' || intent.merchant === 'paytm' || intent.merchant === 'cheq' || intent.merchant === 'phonepe' || intent.merchant === 'mobikwik' || intent.merchant === 'nobroker' || (intent.raw && (intent.raw.includes('cred') || intent.raw.includes('cheq') || intent.raw.includes('paytm') || intent.raw.includes('phonepe') || intent.raw.includes('mobikwik') || intent.raw.includes('nobroker')));
            if (!isThirdPartyApp) return false; // Do not exclude if direct institute payment!
        }

        return cat === intent.category || cat === intent.merchant || (intent.raw && intent.raw.includes(cat));
    });

    // BPCL Octane special rule on fuel
    if (resolved.presetId === 'sbi-bpcl-octane' && (intent.category === 'fuel' || intent.merchant === 'bpcl')) {
        fuelSurchargeNote = '7.25% Value Back (6.25% rewards + 1% fuel surcharge waiver) at BPCL petrol pumps.';
    }

    if (matchedExclusion) {
        return {
            cardId,
            cardName: resolved.cardName,
            cardIssuer: resolved.cardIssuer,
            color: resolved.color,
            creditLimit: resolved.creditLimit,
            applicableRate: 0,
            cashbackEarned: 0,
            effectiveSavings: 0,
            perkValue: 0,
            perkBadge: null,
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
            utilityFeeWarning,
            educationWarning,
            gamingWarning,
            transportFeeWarning,
            forexWarning,
            forexCost: Math.round(forexCost),
            projectedCUR: calculateProjectedCUR(resolved.creditLimit, currentOutstanding, spendAmount),
            curWarning: checkCURWarning(resolved.creditLimit, currentOutstanding, spendAmount),
            paymentFloatDays: calculatePaymentFloatDays(card.dueDate),
            lounges: resolved.lounges,
            entertainment: resolved.entertainment,
            golf: resolved.golf,
            pros: resolved.pros,
            cons: resolved.cons,
            bestFor: resolved.bestFor,
            welcomeBenefit: resolved.welcomeBenefit,
            keyBenefitsSummary: resolved.keyBenefitsSummary,
            presetId: resolved.presetId
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
            effectiveSavings: 0,
            perkValue: 0,
            perkBadge: null,
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
            entertainment: resolved.entertainment,
            golf: resolved.golf,
            pros: resolved.pros,
            cons: resolved.cons,
            bestFor: resolved.bestFor,
            welcomeBenefit: resolved.welcomeBenefit,
            keyBenefitsSummary: resolved.keyBenefitsSummary,
            presetId: resolved.presetId
        };
    }

    // G. Check for Specific Tier Matches
    let matchedTier = null;
    let applicableRate = resolved.baseCashbackPercent;

    for (const tier of resolved.tiers) {
        const matchesCategory = tier.categories && tier.categories.some(c => c === intent.category || c === 'all-retail');
        const matchesMerchant = tier.merchants && tier.merchants.some(m => intent.raw.includes(m) || intent.merchant.includes(m));

        if (matchesMerchant) {
            // For Amazon Pay ICICI, utility or bill payments cannot match the 5% Amazon.in retail shopping tier
            if (resolved.presetId === 'amazon-pay-icici' && tier.rate === 5 && (intent.category === 'utilities' || intent.category === 'telecom' || intent.raw.includes('amazon pay'))) {
                continue;
            }
            matchedTier = tier;
            applicableRate = tier.rate;
            break; // Exact merchant match is highest priority
        }

        // For Amazon Pay ICICI, utility bills paid via Amazon Pay match the 2% tier
        if (resolved.presetId === 'amazon-pay-icici' && tier.rate === 2 && (intent.category === 'utilities' || intent.category === 'telecom')) {
            matchedTier = tier;
            applicableRate = tier.rate;
            break;
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

    // I. Lifestyle & Category Perks Evaluation (Movies BOGO, Golf, Airport Lounges)
    let perkValue = 0;
    let perkBadge = null;
    const isMovieIntent = intent.category === 'entertainment' || /movie|cinema|district|bookmyshow|bms|theatre|theater|ticket|pvr|inox/i.test(intent.raw);
    const isGolfIntent = intent.category === 'lifestyle' || /golf/i.test(intent.raw);
    const isLoungeIntent = intent.category === 'lounge' || /lounge|airport/i.test(intent.raw);

    if (isMovieIntent && resolved.entertainment?.movies) {
        const moviePerk = resolved.entertainment.movies;
        if (moviePerk.bogo) {
            const maxOff = moviePerk.maxDiscount || (resolved.presetId === 'icici-sapphiro-visa' ? 500 : 250);
            const bogoSaving = Math.min(spendAmount > 0 ? spendAmount / 2 : maxOff, maxOff);
            perkValue = Math.round(bogoSaving);
            perkBadge = `BOGO (Up to ₹${maxOff} off)`;
        } else if (moviePerk.rate && moviePerk.rate > applicableRate) {
            applicableRate = moviePerk.rate;
            rawCashback = (spendAmount * applicableRate) / 100;
        }
    } else if (isGolfIntent && resolved.golf?.hasAccess) {
        const golfSaving = spendAmount > 0 ? spendAmount : 2500;
        perkValue = Math.round(golfSaving);
        const quota = resolved.golf.roundsPerMonth === 999 ? 'Unlimited' : `${resolved.golf.roundsPerMonth} rounds/mo`;
        perkBadge = `Free Golf (${quota})`;
    } else if (isLoungeIntent && (resolved.lounges?.domesticAirport?.hasAccess || resolved.lounges?.internationalAirport?.hasAccess)) {
        const domVisits = resolved.lounges?.domesticAirport?.visitsPerYear || 0;
        const intlVisits = resolved.lounges?.internationalAirport?.visitsPerYear || 0;
        const totalVisits = domVisits + intlVisits;
        const isMilestone = !!resolved.lounges?.domesticAirport?.isMilestoneBased;
        
        // Direct swipe cards and cards with generous domestic + international quotas provide higher value
        const baseLoungeSaving = isMilestone ? 1200 : 1500;
        const quotaBonus = Math.min(totalVisits * 40, 700); // e.g. 18 visits = +700; 2 visits = +80
        perkValue = Math.round(baseLoungeSaving + quotaBonus);
        perkBadge = domVisits > 0 
            ? `Free Lounge (${domVisits} Dom/yr${intlVisits > 0 ? ` + ${intlVisits} Intl` : ''})` 
            : `Free Lounge (${intlVisits} Intl/yr)`;
    }

    const effectiveSavings = Math.round((perkValue + rawCashback) * 100) / 100;

    // J. Forex Markup Fee vs Net Return Check
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
        effectiveSavings,
        perkValue,
        perkBadge,
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
        utilityFeeWarning,
        educationWarning,
        gamingWarning,
        transportFeeWarning,
        fuelSurchargeWarning,
        fuelSurchargeNote,
        specialMilestoneNote,
        notes: matchedTier ? matchedTier.notes : `Standard ${resolved.baseCashbackPercent}% base return.`,
        projectedCUR: calculateProjectedCUR(resolved.creditLimit, currentOutstanding, spendAmount),
        curWarning: checkCURWarning(resolved.creditLimit, currentOutstanding, spendAmount),
        paymentFloatDays: calculatePaymentFloatDays(card.dueDate),
        lounges: resolved.lounges,
        entertainment: resolved.entertainment,
        golf: resolved.golf,
        pros: resolved.pros,
        cons: resolved.cons,
        bestFor: resolved.bestFor,
        welcomeBenefit: resolved.welcomeBenefit,
        keyBenefitsSummary: resolved.keyBenefitsSummary,
        presetId: resolved.presetId
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
        if (b.effectiveSavings !== a.effectiveSavings) {
            return b.effectiveSavings - a.effectiveSavings;
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
        } else if (resolved.presetId === 'hdfc-regalia-gold' || resolved.presetId === 'hdfc-infinia') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'Good Food Trail',
                program: 'HDFC Good Food Trail & Club Marriott',
                description: 'Up to 25% savings on dining bills across premium restaurants, 1+1 buffet offers at select 5-star hotels, and Club Marriott dining benefits.'
            });
        } else if ((resolved.cardIssuer || '').toLowerCase().includes('icici') || resolved.presetId === 'amazon-pay-icici' || resolved.presetId === 'icici-sapphiro-visa' || resolved.presetId === 'icici-rubyx' || resolved.presetId === 'icici-coral') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'Min 15% Off',
                program: 'ICICI Culinary Treats',
                description: 'Minimum 15% discount on dining bills at 2,500+ partner restaurants across India via the ICICI Culinary Treats network.'
            });
        } else if (resolved.presetId === 'axis-atlas' || resolved.presetId === 'axis-ace' || resolved.presetId === 'airtel-axis' || resolved.presetId === 'flipkart-axis') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'Up to 20% Off',
                program: 'Axis Bank Dining Delights',
                description: 'Up to 15%–20% discount at 10,000+ partner dining restaurants across India via EazyDiner.'
            });
        } else if (resolved.presetId === 'yes-bank-marquee' || resolved.presetId === 'yes-bank-reserv') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'Up to 20% Off',
                program: 'YES Bank Gourmet Dining',
                description: 'Up to 15%–20% off on dining bills across participating premium and fine dining restaurants.'
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
 * Extracts golf privileges across active cards
 */
export function getGolfPrivilegesSummary(cards = {}) {
    const list = [];
    for (const [cardId, card] of Object.entries(cards)) {
        if ((card.type || 'credit-card') !== 'credit-card') continue;
        const resolved = resolveCardBenefits(card, cardId);
        if (!resolved || !resolved.golf || !resolved.golf.hasAccess) continue;

        list.push({
            cardId,
            cardName: resolved.cardName,
            color: resolved.color,
            roundsPerMonth: resolved.golf.roundsPerMonth,
            description: resolved.golf.description,
            spendCriteria: resolved.golf.spendCriteria || 'Monthly spend criteria'
        });
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

        if (resolved.presetId === 'icici-emeralde-metal') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'Luxury Metal',
                title: 'Unlimited Lounges & Golf + 4x BMS BOGO',
                description: 'Unlimited domestic and international airport lounges with zero spend hurdles, Buy 1 Get 1 free up to ₹750 off 4 times/mo on BookMyShow, unlimited golf rounds, and reduced 2% forex markup.'
            });
        } else if (resolved.presetId === 'icici-makemytrip') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'Zero Forex Travel',
                title: '0.00% Forex + 4% My Cash on MMT Hotels',
                description: '0.00% Zero Forex Markup w.e.f. Nov 10, 2026, 4% My Cash on MakeMyTrip hotels, 2% on flights, and domestic airport + railway lounge access.'
            });
        } else if (resolved.presetId === 'icici-hpcl-super-saver') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: '5% Fuel Savings',
                title: '5% on HPCL Fuel & 5% on Utilities & Groceries',
                description: '4% cashback + 1% surcharge waiver on HPCL fuel, 5% on utilities and departmental stores, and 25% off on BookMyShow.'
            });
        } else if (resolved.presetId === 'icici-sapphiro-visa') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'Gem Collection',
                title: 'BookMyShow BOGO + 4 Golf Rounds + 16 Lounges',
                description: 'Buy 1 Get 1 free on BookMyShow up to ₹500 off (twice a month), 4 complimentary golf games/lessons monthly, and 16 domestic + 2 international airport lounge visits.'
            });
        } else if (resolved.presetId === 'hdfc-infinia') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'SmartBuy 5x',
                title: 'Up to 33.3% Return & Unlimited Global Lounges',
                description: 'Up to 33.3% reward value on SmartBuy flights and hotels, 1:1 points redemption, unlimited worldwide airport lounge access with Priority Pass, and complimentary golf games worldwide.'
            });
        } else if (resolved.presetId === 'axis-atlas') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: '1:2 Miles Transfer',
                title: 'Accor ALL, Singapore Airlines & Qatar Partner Transfer',
                description: '1:2 points transfer ratio to 15+ airline and hotel partners (e.g. Accor ALL yielding up to 20% stay value), 5 EDGE Miles/₹100 on airlines/hotels.'
            });
        } else if (resolved.presetId === 'scapia-federal') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'Zero Forex',
                title: '0% Forex Currency Conversion & Unlimited Lounges',
                description: 'Zero foreign currency markup fee on international transactions (saves 3.5%–4.13%) and unlimited domestic airport lounge access on spending ₹10,000/mo.'
            });
        } else if (resolved.presetId === 'idfc-first-wealth') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'LTF Premium',
                title: 'Lifetime Free Domestic & International Lounges + 1.5% Forex',
                description: 'Lifetime Free with ₹0 annual fee, 4 domestic + 4 international lounges per quarter, low 1.5% forex markup, and BookMyShow BOGO up to ₹500.'
            });
        } else if (resolved.presetId === 'amazon-pay-icici') {
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
                badge: '10% Dining, Grocery, Shopping & Utilities',
                title: 'Everyday Essentials, 1.99% Forex & 3 Airport Lounges',
                description: '10% accelerated return on Swiggy, Zomato, Blinkit, Zepto, Instamart, BigBasket, DMart, Electricity/Water/Broadband utility bills (MCC 4900, 4814), and offline retail shopping. Plus 3 complimentary airport lounges/yr (2 Dom + 1 Intl) and low 1.99% forex markup.'
            });
        } else if (resolved.presetId === 'yes-bank-marquee') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: '1% Forex & Luxury Travel',
                title: '1% Forex + 48 Lounges + BookMyShow BOGO',
                description: 'Ultra-low 1% forex markup on foreign currency spends, 24 domestic + 24 international airport lounges with complimentary guest access, BookMyShow BOGO up to ₹800/mo, 4 golf games/mo, and 4.5% online reward rate.'
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
        } else if (resolved.presetId === 'tata-neu-infinity') {
            list.push({
                cardId,
                cardName: resolved.cardName,
                color: resolved.color,
                badge: 'Tata Neu 10%',
                title: 'Tata Brand Ecosystem & 1.5% UPI QR',
                description: 'Up to 10% NeuCoins on BigBasket, Croma, Tata 1mg, Air India, Taj hotels, and 1.5% NeuCoins on RuPay UPI merchant QR transactions.'
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
        { id: 'movies', icon: 'bi-film', title: 'Movie Tickets (BookMyShow BOGO)', query: 'bookmyshow', sampleAmount: 800 },
        { id: 'golf', icon: 'bi-flag', title: 'Golf Sessions & Coaching', query: 'golf', sampleAmount: 2000 },
        { id: 'lounge', icon: 'bi-airplane', title: 'Airport Lounge Access', query: 'airport lounge', sampleAmount: 1500 },
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
    const dirTab = document.getElementById('cardOptimizerDirectoryTab');
    const tabSpendBtn = document.getElementById('tabSpendOptimizerBtn');
    const tabPrivBtn = document.getElementById('tabPrivilegesBtn');
    const tabDirBtn = document.getElementById('tabCardDirectoryBtn');

    if (spendTab) spendTab.style.display = tabName === 'spend' ? 'block' : 'none';
    if (privTab) privTab.style.display = tabName === 'privileges' ? 'block' : 'none';
    if (dirTab) dirTab.style.display = tabName === 'directory' ? 'block' : 'none';

    if (tabSpendBtn) tabSpendBtn.classList.toggle('active', tabName === 'spend');
    if (tabPrivBtn) tabPrivBtn.classList.toggle('active', tabName === 'privileges');
    if (tabDirBtn) tabDirBtn.classList.toggle('active', tabName === 'directory');

    if (tabName === 'spend') {
        runCardAdvisorSearch();
    } else if (tabName === 'privileges') {
        renderPrivilegesTab();
    } else if (tabName === 'directory') {
        renderCardDirectoryTab();
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
                        <span class="cashback-rate">${winner.perkBadge ? escapeHtml(winner.perkBadge.split(' ')[0]) : winner.applicableRate + '%'}</span>
                        <span class="cashback-label">${winner.perkBadge ? 'Special Perk' : 'Cashback'}</span>
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
                        <div class="savings-amount">+${optimizerBridge.formatCurrency(winner.effectiveSavings)}</div>
                        <div class="savings-note">${winner.perkBadge ? `<span class="badge-perk-inline">${escapeHtml(winner.perkBadge)}</span> + ` : ''}projected reward on ${optimizerBridge.formatCurrency(amount)} spend</div>
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
                ${winner.utilityFeeWarning ? `
                    <div class="hero-warning fee-warning">
                        <i class="bi bi-lightning-charge-fill"></i>
                        <div>${escapeHtml(winner.utilityFeeWarning)}</div>
                    </div>
                ` : ''}
                ${winner.educationWarning ? `
                    <div class="hero-warning fee-warning">
                        <i class="bi bi-mortarboard-fill"></i>
                        <div>${escapeHtml(winner.educationWarning)}</div>
                    </div>
                ` : ''}
                ${winner.gamingWarning ? `
                    <div class="hero-warning fee-warning">
                        <i class="bi bi-controller"></i>
                        <div>${escapeHtml(winner.gamingWarning)}</div>
                    </div>
                ` : ''}
                ${winner.transportFeeWarning ? `
                    <div class="hero-warning fee-warning">
                        <i class="bi bi-train-front-fill"></i>
                        <div>${escapeHtml(winner.transportFeeWarning)}</div>
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
                ${(query && /golf/i.test(query) && winner.golf) ? `
                    <div class="hero-warning golf-bonus">
                        <i class="bi bi-flag-fill"></i>
                        <div><strong>Complimentary Golf Privilege:</strong> ${escapeHtml(winner.golf.description)}</div>
                    </div>
                ` : ''}
                <div class="float-tag">
                    <i class="bi bi-calendar-check"></i> ~${winner.paymentFloatDays} days interest-free float
                </div>

                <!-- Hero Card Benefits, Pros & Cons Toggle -->
                <div class="hero-pros-cons-action">
                    <button type="button" class="btn-card-pros-cons" id="btnProsCons_hero" onclick="window.toggleCardProsConsExpand('hero', '${winner.presetId || winner.cardId}')">
                        <i class="bi bi-star-fill" style="color: #f59e0b;"></i> 
                        <span>Card Benefits, Pros & Cons (${winner.pros?.length || 0} Pros, ${winner.cons?.length || 0} Cons)</span>
                        <i class="bi bi-chevron-down pros-cons-arrow"></i>
                    </button>
                </div>

                <div id="cardProsConsDetail_hero" class="card-pros-cons-panel" style="display: none;">
                    ${winner.bestFor ? `
                        <div class="card-best-for-callout">
                            <i class="bi bi-bullseye"></i> <strong>Best For:</strong> ${escapeHtml(winner.bestFor)}
                        </div>
                    ` : ''}

                    ${winner.welcomeBenefit ? `
                        <div class="card-welcome-box">
                            <i class="bi bi-gift-fill"></i>
                            <div><strong>Welcome Benefit:</strong> ${escapeHtml(winner.welcomeBenefit)}</div>
                        </div>
                    ` : ''}

                    ${winner.keyBenefitsSummary && winner.keyBenefitsSummary.length > 0 ? `
                        <div class="card-quick-perks">
                            ${winner.keyBenefitsSummary.map(k => `<span class="quick-perk-badge"><i class="bi bi-check2"></i> ${escapeHtml(k)}</span>`).join('')}
                        </div>
                    ` : ''}

                    <div class="pros-cons-grid">
                        <div class="pros-column">
                            <div class="pros-column-title"><i class="bi bi-hand-thumbs-up-fill"></i> Pros</div>
                            <ul class="pros-list">
                                ${(winner.pros || []).map(p => `<li><i class="bi bi-check-circle-fill"></i> <span>${escapeHtml(p)}</span></li>`).join('')}
                            </ul>
                        </div>
                        <div class="cons-column">
                            <div class="cons-column-title"><i class="bi bi-hand-thumbs-down-fill"></i> Cons & Limitations</div>
                            <ul class="cons-list">
                                ${(winner.cons || []).map(c => `<li><i class="bi bi-exclamation-triangle-fill"></i> <span>${escapeHtml(c)}</span></li>`).join('')}
                            </ul>
                        </div>
                    </div>
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
                                <button type="button" class="btn-card-pros-cons" style="font-size:0.7rem; padding:3px 8px; margin-top:4px;" onclick="window.toggleCardProsConsExpand('runner_${idx}', '${r.presetId || r.cardId}')">
                                    <span>Perks</span> <i class="bi bi-chevron-down pros-cons-arrow"></i>
                                </button>
                            </div>
                        </div>
                        <div id="cardProsConsDetail_runner_${idx}" class="card-pros-cons-panel" style="display: none; margin-bottom: 10px;">
                            ${r.bestFor ? `<div class="card-best-for-callout"><i class="bi bi-bullseye"></i> <strong>Best For:</strong> ${escapeHtml(r.bestFor)}</div>` : ''}
                            <div class="pros-cons-grid">
                                <div class="pros-column">
                                    <div class="pros-column-title"><i class="bi bi-hand-thumbs-up-fill"></i> Pros</div>
                                    <ul class="pros-list">
                                        ${(r.pros || []).slice(0, 3).map(p => `<li><i class="bi bi-check-circle-fill"></i> <span>${escapeHtml(p)}</span></li>`).join('')}
                                    </ul>
                                </div>
                                <div class="cons-column">
                                    <div class="cons-column-title"><i class="bi bi-hand-thumbs-down-fill"></i> Cons</div>
                                    <ul class="cons-list">
                                        ${(r.cons || []).slice(0, 3).map(c => `<li><i class="bi bi-exclamation-triangle-fill"></i> <span>${escapeHtml(c)}</span></li>`).join('')}
                                    </ul>
                                </div>
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
    const golfSummary = getGolfPrivilegesSummary(cards);
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

        <!-- Section 2.5: Golf & Country Club Privileges -->
        <div class="privilege-card-section">
            <div class="privilege-section-title">
                <i class="bi bi-flag-fill" style="color: #10b981;"></i>
                <span>Complimentary Golf & Country Club Access</span>
            </div>
            ${golfSummary.length > 0 ? `
                <div class="perk-cards-grid">
                    ${golfSummary.map(g => `
                        <div class="perk-card-box">
                            <div class="perk-card-header">
                                <span class="card-color-dot-sm" style="background:${g.color};"></span>
                                <strong>${escapeHtml(g.cardName)}</strong>
                                <span class="perk-tag-emerald">${g.roundsPerMonth === 999 ? 'Unlimited' : `${g.roundsPerMonth} rounds/mo`}</span>
                            </div>
                            <div class="perk-program-title"><i class="bi bi-flag"></i> Golf Privileges</div>
                            <div class="perk-card-desc">${escapeHtml(g.description)}</div>
                            <div class="privilege-desc-text" style="margin-top:6px; font-size:0.75rem; color:var(--text-muted);">Spend Criteria: ${escapeHtml(g.spendCriteria)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="privilege-empty-text">No active cards with complimentary golf privileges found (e.g. ICICI Sapphiro, HDFC Infinia, ICICI Rubyx).</div>
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
                        <span class="winner-rate-badge">${item.winner.perkBadge ? escapeHtml(item.winner.perkBadge.split(' ')[0]) : item.winner.applicableRate + '%'}</span>
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
    window.renderCardDirectoryTab = renderCardDirectoryTab;
    window.runCardDirectoryFilter = runCardDirectoryFilter;
    window.setDirectoryCategoryFilter = setDirectoryCategoryFilter;
    window.clearCardDirectorySearch = clearCardDirectorySearch;
    window.toggleDirectoryCard = toggleDirectoryCard;
    window.toggleAllDirectoryCards = toggleAllDirectoryCards;
    window.toggleCardProsConsExpand = toggleCardProsConsExpand;
    window.openAddCardFromPreset = openAddCardFromPreset;
    window.testCardInSpendFinder = testCardInSpendFinder;
}



// ============================================================================
// 9. CARD GUIDE & DIRECTORY CONTROLLER (PROS, CONS & BENEFITS)
// ============================================================================

let activeDirectoryCategory = 'all';
let directorySearchQuery = '';
const expandedDirectoryCards = new Set();

export function renderCardDirectoryTab() {
    const container = document.getElementById('cardDirectoryGrid');
    if (!container) return;

    const financeData = optimizerBridge.getFinanceData();
    const activeCards = financeData.creditCards || {};

    // Determine presets user already has in wallet
    const ownedPresetIds = new Set();
    Object.values(activeCards).forEach(c => {
        if ((c.type || 'credit-card') !== 'credit-card') return;
        const detected = detectCardPreset(c.name, c.issuer);
        if (detected) ownedPresetIds.add(detected.id);
    });

    const query = (directorySearchQuery || '').toLowerCase().trim();
    const cat = activeDirectoryCategory;

    const allPresets = Object.values(CARD_PRESETS_REGISTRY);

    // Keep "All Cards (N)" filter chip text in sync with actual registry size
    const allFilterChip = document.querySelector('.dir-filter-chip[data-filter="all"]');
    if (allFilterChip) {
        allFilterChip.textContent = `All Cards (${allPresets.length})`;
    }

    const filtered = allPresets.filter(preset => {
        // Category filtering
        if (cat === 'icici' && !preset.issuer.toLowerCase().includes('icici')) return false;
        if (cat === 'hdfc' && !preset.issuer.toLowerCase().includes('hdfc')) return false;
        if (cat === 'axis' && !preset.issuer.toLowerCase().includes('axis')) return false;
        if (cat === 'sbi' && !preset.issuer.toLowerCase().includes('sbi')) return false;
        if (cat === 'amex' && !preset.issuer.toLowerCase().includes('american express')) return false;
        if (cat === 'ltf' && preset.annualFee !== 0) return false;
        if (cat === 'travel') {
            const hasLounge = (preset.lounges?.domesticAirport?.hasAccess || preset.lounges?.internationalAirport?.hasAccess);
            const isTravelCard = (preset.cardType || '').toLowerCase().includes('travel') || (preset.cardType || '').toLowerCase().includes('miles');
            if (!hasLounge && !isTravelCard) return false;
        }
        if (cat === 'movies' && !(preset.entertainment?.movies?.bogo || preset.entertainment?.movies?.rate >= 5 || preset.entertainment?.movies?.type === 'bogo')) return false;
        if (cat === 'golf' && !(preset.golf && preset.golf.hasAccess)) return false;
        if (cat === 'cashback' && !(preset.cardType || '').toLowerCase().includes('cashback')) return false;

        // Query search
        if (query) {
            const searchString = `${preset.name} ${preset.shortName || ''} ${preset.issuer} ${preset.network} ${preset.cardType || ''} ${preset.bestFor || ''} ${(preset.keyBenefitsSummary || []).join(' ')} ${(preset.pros || []).join(' ')}`.toLowerCase();
            if (!searchString.includes(query)) return false;
        }

        return true;
    });

    const countBadge = document.getElementById('cardDirectoryCountBadge');
    if (countBadge) {
        countBadge.textContent = filtered.length === allPresets.length 
            ? `Showing all ${filtered.length} cards` 
            : `Showing ${filtered.length} of ${allPresets.length} cards`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <i class="bi bi-search" style="font-size: 2rem; opacity: 0.4; display: block; margin-bottom: 8px;"></i>
                <h4>No Matching Cards Found</h4>
                <p>Try clearing your search query or choosing another category filter.</p>
                <button type="button" class="btn-finance btn-finance-outline" style="margin-top: 10px;" onclick="window.setDirectoryCategoryFilter('all'); window.clearCardDirectorySearch();">View All Cards</button>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(card => {
        const isOwned = ownedPresetIds.has(card.id);
        const isExpanded = expandedDirectoryCards.has(card.id);
        const joiningDisplay = card.joiningFee === 0 ? '₹0 (LTF)' : `₹${card.joiningFee?.toLocaleString('en-IN')}`;
        const annualDisplay = card.annualFee === 0 ? '₹0 (LTF)' : `₹${card.annualFee?.toLocaleString('en-IN')}`;
        const waiverDisplay = card.feeWaiverSpendTarget > 0 ? `₹${(card.feeWaiverSpendTarget / 100000).toFixed(card.feeWaiverSpendTarget % 100000 === 0 ? 0 : 1)}L Spend` : (card.annualFee === 0 ? 'Lifetime Free' : 'N/A');
        const forexDisplay = card.forexMarkupPercent === 0 ? '0.0% (Zero Forex)' : `${card.forexMarkupPercent}%`;

        return `
            <div class="directory-card-card ${isExpanded ? 'expanded' : ''}" id="directoryCard_${card.id}" data-card-id="${card.id}">
                <div class="dir-card-color-stripe" style="background: ${card.color};"></div>
                <div class="dir-card-header" onclick="window.toggleDirectoryCard('${card.id}')" role="button" tabindex="0" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-controls="dirCardDetails_${card.id}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); window.toggleDirectoryCard('${card.id}');}">
                    <div class="dir-card-ident">
                        <div class="dir-card-avatar" style="background: ${card.color};">
                            <i class="bi bi-credit-card-2-front"></i>
                        </div>
                        <div>
                            <div class="dir-card-title">${escapeHtml(card.name)}</div>
                            <div class="dir-card-issuer">${escapeHtml(card.issuer)} • ${escapeHtml(card.network)}</div>
                        </div>
                    </div>
                    <div class="dir-card-header-right">
                        <div class="dir-card-badges">
                            <span class="dir-category-badge">${escapeHtml(card.cardType || 'Credit Card')}</span>
                            ${isOwned ? `<span class="dir-wallet-badge"><i class="bi bi-check2-circle"></i> In Your Wallet</span>` : ''}
                            <span class="dir-annual-badge"><i class="bi bi-tag-fill"></i> ${annualDisplay}</span>
                        </div>
                        <div class="dir-card-chevron-wrap" title="${isExpanded ? 'Collapse card details' : 'Expand card details'}">
                            <i class="bi bi-chevron-down dir-card-chevron"></i>
                        </div>
                    </div>
                </div>

                <div class="dir-card-details" id="dirCardDetails_${card.id}" style="${isExpanded ? 'display: block;' : 'display: none;'}">
                    <div class="dir-card-body">
                        <div class="dir-fees-matrix">
                            <div class="dir-fee-cell">
                                <div class="dir-fee-label">Joining</div>
                                <div class="dir-fee-val">${joiningDisplay}</div>
                            </div>
                            <div class="dir-fee-cell">
                                <div class="dir-fee-label">Annual</div>
                                <div class="dir-fee-val">${annualDisplay}</div>
                            </div>
                            <div class="dir-fee-cell">
                                <div class="dir-fee-label">Fee Waiver</div>
                                <div class="dir-fee-val">${waiverDisplay}</div>
                            </div>
                            <div class="dir-fee-cell">
                                <div class="dir-fee-label">Forex Fee</div>
                                <div class="dir-fee-val">${forexDisplay}</div>
                            </div>
                        </div>

                        ${card.bestFor ? `
                            <div class="card-best-for-callout">
                                <i class="bi bi-bullseye" style="color: ${card.color};"></i> <strong>Best For:</strong> ${escapeHtml(card.bestFor)}
                            </div>
                        ` : ''}

                        ${card.welcomeBenefit ? `
                            <div class="card-welcome-box">
                                <i class="bi bi-gift-fill"></i>
                                <div><strong>Welcome Benefit:</strong> ${escapeHtml(card.welcomeBenefit)}</div>
                            </div>
                        ` : ''}

                        ${card.keyBenefitsSummary && card.keyBenefitsSummary.length > 0 ? `
                            <div class="card-quick-perks">
                                ${card.keyBenefitsSummary.map(k => `<span class="quick-perk-badge"><i class="bi bi-check-circle"></i> ${escapeHtml(k)}</span>`).join('')}
                            </div>
                        ` : ''}

                        <div class="pros-cons-grid">
                            <div class="pros-column">
                                <div class="pros-column-title"><i class="bi bi-hand-thumbs-up-fill"></i> Top Benefits & Pros</div>
                                <ul class="pros-list">
                                    ${(card.pros || []).map(p => `<li><i class="bi bi-check2-circle"></i> <span>${escapeHtml(p)}</span></li>`).join('')}
                                </ul>
                            </div>
                            <div class="cons-column">
                                <div class="cons-column-title"><i class="bi bi-hand-thumbs-down-fill"></i> Cons & Limitations</div>
                                <ul class="cons-list">
                                    ${(card.cons || []).map(c => `<li><i class="bi bi-exclamation-triangle"></i> <span>${escapeHtml(c)}</span></li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="dir-card-footer">
                        <button type="button" class="btn-dir-action btn-dir-test" onclick="window.testCardInSpendFinder('${card.id}')">
                            <i class="bi bi-calculator"></i> Test Spend
                        </button>
                        ${!isOwned ? `
                            <button type="button" class="btn-dir-action btn-dir-add" onclick="window.openAddCardFromPreset('${card.id}')">
                                <i class="bi bi-plus-lg"></i> Add to My Cards
                            </button>
                        ` : `
                            <button type="button" class="btn-dir-action btn-dir-added" disabled>
                                <i class="bi bi-check-circle-fill"></i> Active in Wallet
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

export function runCardDirectoryFilter() {
    const input = document.getElementById('cardDirectorySearchInput');
    const clearBtn = document.getElementById('cardDirectoryClearBtn');
    directorySearchQuery = input ? input.value.trim() : '';
    if (clearBtn) {
        clearBtn.style.display = directorySearchQuery ? 'flex' : 'none';
    }
    renderCardDirectoryTab();
}

export function setDirectoryCategoryFilter(category) {
    activeDirectoryCategory = category;
    const filterPills = document.querySelectorAll('.dir-filter-chip');
    filterPills.forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-filter') === category);
    });
    renderCardDirectoryTab();
}

export function clearCardDirectorySearch() {
    const input = document.getElementById('cardDirectorySearchInput');
    const clearBtn = document.getElementById('cardDirectoryClearBtn');
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    directorySearchQuery = '';
    renderCardDirectoryTab();
}

export function toggleDirectoryCard(cardId) {
    const cardEl = document.getElementById(`directoryCard_${cardId}`);
    const detailsEl = document.getElementById(`dirCardDetails_${cardId}`);
    if (!detailsEl) return;

    const isCurrentlyExpanded = expandedDirectoryCards.has(cardId);
    if (isCurrentlyExpanded) {
        expandedDirectoryCards.delete(cardId);
        detailsEl.style.display = 'none';
        if (cardEl) {
            cardEl.classList.remove('expanded');
            const header = cardEl.querySelector('.dir-card-header');
            if (header) header.setAttribute('aria-expanded', 'false');
            const chevronWrap = cardEl.querySelector('.dir-card-chevron-wrap');
            if (chevronWrap) chevronWrap.setAttribute('title', 'Expand card details');
        }
    } else {
        expandedDirectoryCards.add(cardId);
        detailsEl.style.display = 'block';
        if (cardEl) {
            cardEl.classList.add('expanded');
            const header = cardEl.querySelector('.dir-card-header');
            if (header) header.setAttribute('aria-expanded', 'true');
            const chevronWrap = cardEl.querySelector('.dir-card-chevron-wrap');
            if (chevronWrap) chevronWrap.setAttribute('title', 'Collapse card details');
        }
    }
}

export function toggleAllDirectoryCards(expand) {
    const cards = document.querySelectorAll('.directory-card-card');
    cards.forEach(cardEl => {
        const id = cardEl.getAttribute('data-card-id');
        const detailsEl = cardEl.querySelector('.dir-card-details');
        const header = cardEl.querySelector('.dir-card-header');
        const chevronWrap = cardEl.querySelector('.dir-card-chevron-wrap');
        if (!detailsEl) return;

        if (expand) {
            if (id) expandedDirectoryCards.add(id);
            detailsEl.style.display = 'block';
            cardEl.classList.add('expanded');
            if (header) header.setAttribute('aria-expanded', 'true');
            if (chevronWrap) chevronWrap.setAttribute('title', 'Collapse card details');
        } else {
            if (id) expandedDirectoryCards.delete(id);
            detailsEl.style.display = 'none';
            cardEl.classList.remove('expanded');
            if (header) header.setAttribute('aria-expanded', 'false');
            if (chevronWrap) chevronWrap.setAttribute('title', 'Expand card details');
        }
    });
}

export function toggleCardProsConsExpand(prefix, id) {
    const detailPanel = document.getElementById(`cardProsConsDetail_${prefix}`);
    const btn = document.getElementById(`btnProsCons_${prefix}`);
    if (!detailPanel) return;
    const isHidden = detailPanel.style.display === 'none' || !detailPanel.style.display;
    detailPanel.style.display = isHidden ? 'flex' : 'none';
    if (btn) btn.classList.toggle('expanded', isHidden);
}

export function openAddCardFromPreset(presetId) {
    const preset = CARD_PRESETS_REGISTRY[presetId];
    if (!preset) return;

    optimizerBridge.closeModal('cardOptimizerModal');

    if (window.openAddCreditCardModal) {
        window.openAddCreditCardModal();
        setTimeout(() => {
            const nameInput = document.getElementById('cardName');
            const issuerInput = document.getElementById('cardIssuer');
            const limitInput = document.getElementById('cardCreditLimit');
            if (nameInput) nameInput.value = preset.name;
            if (issuerInput) issuerInput.value = preset.issuer;
            if (limitInput && (!limitInput.value || limitInput.value === '0')) {
                limitInput.value = preset.annualFee > 5000 ? 500000 : 150000;
            }
            optimizerBridge.showToast(`Prefilled details for ${preset.name}! Enter your current balance and save.`, 'info');
        }, 80);
    }
}

export function testCardInSpendFinder(presetId) {
    const preset = CARD_PRESETS_REGISTRY[presetId];
    if (!preset) return;

    let query = 'Swiggy';
    if (preset.id === 'icici-sapphiro-visa' || preset.id === 'icici-emeralde-metal') query = 'BookMyShow';
    else if (preset.id === 'amazon-pay-icici' || preset.id === 'hdfc-millennia') query = 'Amazon';
    else if (preset.id === 'sbi-bpcl-octane') query = 'BPCL Fuel';
    else if (preset.id === 'icici-hpcl-super-saver') query = 'HPCL Fuel';
    else if (preset.id === 'icici-makemytrip') query = 'MakeMyTrip';
    else if (preset.id === 'axis-atlas' || preset.id === 'scapia-federal' || preset.id === 'hdfc-regalia-gold') query = 'Flights';
    else if (preset.id === 'kiwi-rupay' || preset.id === 'hdfc-pixel-play') query = 'UPI';

    switchCardOptimizerTab('spend');
    const searchInput = document.getElementById('cardAdvisorSearchInput');
    if (searchInput) searchInput.value = query;
    currentSearchQuery = query;
    renderQuickChips();
    runCardAdvisorSearch();
}
