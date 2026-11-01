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
        keyBenefitsSummary: ["4 Domestic Airport Lounges/quarter (on ₹75k spend in prev quarter)","2 Complimentary International Airport Lounges/year via DreamFolks / Priority Pass","BookMyShow BOGO: Buy 1 Get 1 Free up to ₹500 off on second ticket twice a month (saves up to ₹12,000/yr)","Up to 4 complimentary golf rounds or lessons per month","ICICI Culinary Treats: Minimum 15% discount at 2,500+ restaurants","4 ICICI Reward Points per ₹100 on international spends (1% return)","1% Fuel Surcharge Waiver on spends between ₹400 and ₹4,000"],
        pros: ["High Movie Savings: Buy 1 Get 1 Free up to ₹500 off on 2nd movie ticket twice a month on BookMyShow (saves up to ₹12,000 annually).","Generous Welcome Gift: Brand vouchers worth over ₹9,000–₹13,000 comfortably offset the initial ₹6,500 joining fee.","Generous Domestic Lounge Quota: Up to 16 complimentary domestic airport lounge visits per year (4 per quarter).","Complimentary International Lounges: 2 free international lounge visits per calendar year via DreamFolks membership.","Complimentary Golf: Up to 4 free golf rounds or coaching lessons per month across top golf courses in India.","Accelerated International Rewards: 4 Reward Points per ₹100 spent internationally (1% return).","Frequent LTF for Alumni & Corporates: Widely available as Lifetime Free (LTF) under ICICI Alumni Program (IITs, IIMs, NITs) or corporate salary tiers."],
        cons: ["Low Base Domestic Rewards: Earning only 2 RP per ₹100 (0.5% return) is uncompetitive compared to dedicated cashback cards (e.g. SBI Cashback at 5%, HSBC Live+ at 10%).","Strict Quarterly Lounge Spend Hurdle: Requires spending ₹75,000 in the previous calendar quarter to unlock domestic airport lounges.","High Annual Fee Waiver Threshold: Requires ₹6,00,000 annual spend to waive the ₹3,500 renewal fee.","Reward Redemption Handling Fee: ICICI levies a ₹99 + 18% GST handling fee on every redemption order.","Standard 3.5% Forex Fee: No reduced forex markup for international spends compared to 0% cards like Scapia."],
        tiers: [
          {
                    "rate": 1,
                    "name": "International Spends (4 RP/₹100 = 1%)",
                    "categories": [
                              "forex",
                              "international"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "4 ICICI Reward Points per ₹100 spent internationally (1 RP = ₹0.25 => 1% return)."
          },
          {
                    "rate": 0.5,
                    "name": "Domestic Retail Spends (2 RP/₹100 = 0.5%)",
                    "categories": [
                              "all-retail",
                              "shopping",
                              "dining",
                              "travel"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "2 ICICI Reward Points per ₹100 spent domestically (1 RP = ₹0.25 => 0.5% return)."
          },
          {
                    "rate": 0.25,
                    "name": "Utilities & Insurance (1 RP/₹100 = 0.25%)",
                    "categories": [
                              "utilities",
                              "insurance"
                    ],
                    "merchants": [
                              "electricity",
                              "water",
                              "gas",
                              "lic"
                    ],
                    "monthlyCap": null,
                    "notes": "1 ICICI Reward Point per ₹100 spent on utilities and insurance (0.25% return)."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded from rewards (1% fuel surcharge waiver ₹400-₹4,000 applies)."
          },
          {
                    "category": "rent",
                    "reason": "Rent payments earn 0% rewards + 1% processing fee."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loading earns 0% rewards."
          },
          {
                    "category": "government",
                    "reason": "Government tax and challan payments earn 0% rewards."
          },
          {
                    "category": "emi",
                    "reason": "EMI transactions earn 0% rewards."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "isMilestoneBased": true,
                    "visitsPerYear": 16,
                    "ruleText": "4 complimentary visits per calendar quarter (requires spending ₹75,000 in previous calendar quarter via Visa direct swipe).",
                    "spendCriteria": "₹75,000 in prev calendar quarter"
          },
          "internationalAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 2,
                    "ruleText": "2 complimentary visits per calendar year via DreamFolks / Priority Pass.",
                    "spendCriteria": "Priority Pass / DreamFolks"
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
                    "maxDiscount": 500,
                    "platform": "BookMyShow",
                    "description": "Buy 1 Get 1 Free: Up to ₹500 off on second movie ticket, usable twice per calendar month on BookMyShow."
          }
},
        golf: {
          "hasAccess": true,
          "roundsPerMonth": 4,
          "description": "Up to 4 complimentary golf rounds or lessons every month based on ₹50,000 monthly retail spend.",
          "spendCriteria": "₹50,000 monthly spend"
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
        keyBenefitsSummary: ["2 Domestic Airport Lounges/quarter (on ₹50k spend in prev quarter)","2 Railway Lounges/quarter across major railway junctions","25% discount on BookMyShow & Inox up to ₹150 twice a month","2 complimentary golf rounds or lessons per month","ICICI Culinary Treats dining discounts"],
        pros: ["Both Airport & Railway Lounge Access: 2 airport + 2 railway lounges per quarter.","Movie Ticket Discounts: 25% off up to ₹150 per ticket twice a month on BookMyShow.","Complimentary Golf: 2 free golf rounds/lessons per month.","Welcome Vouchers: ₹5,000+ vouchers offset the ₹3,000 joining fee."],
        cons: ["Quarterly lounge spend criterion: Requires ₹50,000 quarterly spend for domestic airport lounges.","Low domestic reward rate of 0.5% (2 RP/₹100).","₹99 + GST redemption fee per order."],
        tiers: [
          {
                    "rate": 1,
                    "name": "International Spends (1%)",
                    "categories": [
                              "forex",
                              "international"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "4 Reward Points per ₹100 spent internationally (1% return)."
          },
          {
                    "rate": 0.5,
                    "name": "Domestic Retail Spends (0.5%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "2 Reward Points per ₹100 spent domestically (0.5% return)."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded."
          },
          {
                    "category": "rent",
                    "reason": "Rent payments earn 0% rewards."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loading earns 0%."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "isMilestoneBased": true,
                    "visitsPerYear": 8,
                    "ruleText": "2 complimentary domestic visits per calendar quarter (unlocked on ₹50,000 spend in previous quarter).",
                    "spendCriteria": "₹50,000 in prev quarter"
          },
          "internationalAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No international lounge access."
          },
          "railwayLounge": {
                    "hasAccess": true,
                    "visitsPerYear": 8,
                    "ruleText": "2 complimentary railway lounge visits per quarter across major Indian railway junctions.",
                    "spendCriteria": "None (Direct swipe)"
          }
},
        entertainment: {
          "movies": {
                    "type": "discount",
                    "bogo": false,
                    "rate": 25,
                    "platform": "BookMyShow",
                    "description": "25% discount (up to ₹150 off per ticket) twice a month on BookMyShow & Inox."
          }
},
        golf: {
          "hasAccess": true,
          "roundsPerMonth": 2,
          "description": "2 complimentary golf rounds or lessons per month on ₹50,000 monthly spend.",
          "spendCriteria": "₹50,000 monthly spend"
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
        keyBenefitsSummary: ["1 Domestic Airport Lounge/quarter (on ₹35k spend in prev quarter)","1 Railway Lounge/quarter across India","25% discount on BookMyShow up to ₹100 twice/month","RuPay variant available for UPI QR Scan & Pay"],
        pros: ["Affordable annual fee (₹500) waived on ₹1.5L annual spend.","Railway Lounge Access: 1 complimentary railway lounge per quarter.","BookMyShow discount: 25% off up to ₹100 twice a month.","RuPay variant connects seamlessly to UPI for payments at local merchants."],
        cons: ["Requires ₹35,000 spend in previous quarter just to unlock 1 airport lounge visit.","Low domestic reward rate of 0.5% (2 RP/₹100).","No international lounge access."],
        tiers: [
          {
                    "rate": 0.5,
                    "name": "Domestic Retail Spends (0.5%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "2 Reward Points per ₹100 spent domestically (0.5% return)."
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
                    "reason": "Wallet loading excluded."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "isMilestoneBased": true,
                    "visitsPerYear": 4,
                    "ruleText": "1 complimentary domestic visit per calendar quarter (on ₹35,000 spend in previous quarter).",
                    "spendCriteria": "₹35,000 in prev quarter"
          },
          "internationalAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "No international lounge access."
          },
          "railwayLounge": {
                    "hasAccess": true,
                    "visitsPerYear": 4,
                    "ruleText": "1 complimentary railway lounge visit per quarter.",
                    "spendCriteria": "Direct swipe"
          }
},
        entertainment: {
          "movies": {
                    "type": "discount",
                    "bogo": false,
                    "rate": 25,
                    "platform": "BookMyShow",
                    "description": "25% discount up to ₹100 on BookMyShow & Inox twice a month."
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
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: null,
        baseCashbackPercent: 1,
        bestFor: "Amazon Prime shoppers, uncapped cashback lovers, lifetime free cardholders",
        welcomeBenefit: "Up to ₹2,000+ in Amazon Pay balance & shopping coupons on card approval",
        keyBenefitsSummary: ["Lifetime Free (LTF): ₹0 Joining Fee, ₹0 Annual Fee forever","5% Unlimited Cashback on Amazon.in for Prime members (3% for non-Prime)","2% Unlimited Cashback on 100+ Amazon Pay partner merchants (recharges, electricity, Swiggy, Uber)","1% Unlimited Cashback on all other eligible domestic & international retail spends","Auto-credit directly to Amazon Pay balance with zero redemption charges"],
        pros: ["Zero Annual Fees: Completely Lifetime Free (LTF) with no hidden conditions or renewal charges.","Uncapped 5% Cashback: No monthly limit or ceiling on 5% cashback on Amazon.in shopping.","Automatic Credit: Cashback is automatically added to Amazon Pay balance every month with ₹0 redemption fees.","No Cost EMI options frequently available across high-value electronics and gadgets on Amazon.","Minimum 15% discount at 2,500+ partner restaurants via ICICI Culinary Treats."],
        cons: ["No complimentary airport or railway lounge access.","Cashback is paid into Amazon Pay balance (cannot be withdrawn as direct bank account cash).","Non-Prime members only earn 3% on Amazon shopping instead of 5%.","Gold, jewellery, fuel, and wallet reloads earn 0% cashback."],
        tiers: [
          {
                    "rate": 5,
                    "name": "Amazon.in Shopping (5% Unlimited)",
                    "categories": [
                              "shopping"
                    ],
                    "merchants": [
                              "amazon",
                              "amazon.in",
                              "amazon shopping"
                    ],
                    "monthlyCap": null,
                    "notes": "5% Unlimited Cashback for Prime members (3% for non-Prime) credited directly to Amazon Pay balance."
          },
          {
                    "rate": 2,
                    "name": "Amazon Pay Partner Merchants & Bill Payments (2%)",
                    "categories": [
                              "utilities",
                              "bill-payment",
                              "recharge",
                              "food-delivery",
                              "travel"
                    ],
                    "merchants": [
                              "amazon pay",
                              "electricity",
                              "water",
                              "gas",
                              "dth",
                              "mobile recharge",
                              "broadband",
                              "uber",
                              "yatra",
                              "bookmyshow",
                              "swiggy"
                    ],
                    "monthlyCap": null,
                    "notes": "2% Unlimited Cashback on 100+ partner merchants & bill payments when paid via Amazon Pay portal."
          },
          {
                    "rate": 1,
                    "name": "All Other Spends (1% Unlimited)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "1% Unlimited Cashback on all other eligible domestic and international retail spends."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel transactions earn 0% cashback (1% fuel surcharge waiver ₹400-₹4,000 applies)."
          },
          {
                    "category": "rent",
                    "reason": "Rent payments via third-party apps yield 0% cashback."
          },
          {
                    "category": "wallet",
                    "reason": "Adding funds to Amazon Pay balance / prepaid wallets earns 0%."
          },
          {
                    "category": "emi",
                    "reason": "Purchases converted to EMI earn 0% cashback."
          },
          {
                    "category": "gold",
                    "reason": "Gold and silver coin/jewelry purchases on Amazon earn 0% cashback."
          },
          {
                    "category": "jewellery",
                    "reason": "Purchases of gold, silver, and jewellery on Amazon earn 0% cashback."
          },
          {
                    "category": "jewelry",
                    "reason": "Purchases of gold, silver, and jewellery on Amazon earn 0% cashback."
          },
          {
                    "category": "government",
                    "reason": "Government tax and challan payments earn 0% cashback."
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

    'hsbc-live-plus': {
        id: 'hsbc-live-plus',
        name: 'HSBC Live+ Credit Card',
        shortName: 'HSBC Live+',
        color: '#dc2626',
        matcher: /(live\s*\+|live\s*plus)|((?=.*hsbc)(?=.*(live|cashback)))/i,
        issuer: 'HSBC',
        network: 'Visa Infinite',
        cardType: 'Dining & Grocery Cashback',
        annualFee: 999,
        joiningFee: 999,
        feeWaiverSpendTarget: 200000,
        forexMarkupPercent: 3.5,
        defaultMonthlyAcceleratedCap: 1200,
        baseCashbackPercent: 1.5,
        bestFor: "Dining, Zomato/Swiggy food delivery, Blinkit/Zepto quick commerce & DMart groceries (10% cashback)",
        welcomeBenefit: "₹1,000 Amazon voucher on completing first transaction within 30 days",
        keyBenefitsSummary: ["10% Accelerated Cashback on Dining, Food Delivery & Groceries (up to ₹1,200/billing cycle)","1.5% Unlimited Cashback on all other eligible retail transactions","2 Domestic Airport Lounge visits/year (1 per 6 months via Visa Infinite direct swipe)","Buy 1 Get 1 Free on movie tickets up to ₹250 off on Saturdays via District / BookMyShow","Annual fee waived on ₹2,00,000 annual spend"],
        pros: ["Highest Grocery & Dining Cashback: 10% cashback on Swiggy, Zomato, Blinkit, Zepto, Instamart, BigBasket, DMart (up to ₹1,200/mo).","Uncapped 1.5% Base Cashback: All other eligible retail spends earn 1.5% unlimited cashback (higher than most competing cards).","BookMyShow / District BOGO: Buy 1 Get 1 free up to ₹250 off on Saturday movie tickets.","Pre-sale tickets & 10% discounts for major live concerts, events & culinary festivals via District.","Jewellery spends count 100% towards the ₹2 Lakh annual fee waiver (saving ₹999 + GST renewal fee)."],
        cons: ["Monthly accelerated cashback is capped at ₹1,200 (max spend of ₹12,000 at 10%).","Jewellery and gold strictly earn 0% cashback (though they count toward fee waiver).","Utilities, telecom bills, and fuel earn 0% cashback.","Domestic lounge access is limited to 2 visits per year (max 1 visit every 6 months)."],
        tiers: [
          {
                    "rate": 10,
                    "name": "Dining, Food Delivery & Groceries (10%)",
                    "categories": [
                              "dining",
                              "food-delivery",
                              "groceries",
                              "quick-commerce",
                              "supermarket"
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
                              "district app"
                    ],
                    "monthlyCap": 1200,
                    "fallbackRate": 1.5,
                    "notes": "10% accelerated cashback capped at ₹1,200/billing cycle (spend up to ₹12,000). Drops to 1.5% base afterwards."
          },
          {
                    "rate": 1.5,
                    "name": "All Other Eligible Retail (1.5%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "Unlimited 1.5% cashback on all other eligible spends."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel is excluded from cashback (fuel surcharge waiver applies between ₹400-₹4,000)."
          },
          {
                    "category": "rent",
                    "reason": "Rental / property payments are strictly excluded from rewards."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loading (Paytm, Mobikwik, Amazon Pay balance) yields 0% rewards."
          },
          {
                    "category": "insurance",
                    "reason": "Insurance premium payments do not earn any cashback on HSBC Live+."
          },
          {
                    "category": "education",
                    "reason": "Education fees and tuition payments earn 0% cashback."
          },
          {
                    "category": "government",
                    "reason": "Taxes and government department payments are excluded."
          },
          {
                    "category": "emi",
                    "reason": "Transactions converted into EMI do not qualify for cashback."
          },
          {
                    "category": "jewellery",
                    "reason": "Jewellery, gold, and antiques (MCC 5094, 5944) are strictly excluded from earning cashback on HSBC Live+ (spends do count toward the ₹2L annual fee waiver)."
          },
          {
                    "category": "jewelry",
                    "reason": "Jewellery, gold, and antiques (MCC 5094, 5944) are strictly excluded from earning cashback on HSBC Live+ (spends do count toward the ₹2L annual fee waiver)."
          },
          {
                    "category": "gold",
                    "reason": "Jewellery, gold, and antiques (MCC 5094, 5944) are strictly excluded from earning cashback on HSBC Live+ (spends do count toward the ₹2L annual fee waiver)."
          },
          {
                    "category": "utilities",
                    "reason": "Utility bill payments (MCC 4900) are excluded from earning cashback on HSBC Live+."
          },
          {
                    "category": "telecom",
                    "reason": "Telecom bills and mobile recharges earn 0% cashback on HSBC Live+."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 2,
                    "ruleText": "2 complimentary visits per calendar year (max 1 visit every 6 months via Visa Infinite direct swipe).",
                    "spendCriteria": null
          },
          "internationalAirport": {
                    "hasAccess": false,
                    "visitsPerYear": 0,
                    "ruleText": "Paid access via LoungeKey / Priority Pass."
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
        bestFor: "Amazon, Flipkart, Swiggy, Zomato, Myntra, Uber & 1:1 statement CashPoints redemption",
        welcomeBenefit: "1,000 CashPoints upon payment of membership fee",
        keyBenefitsSummary: ["5% CashPoints on 10 Top Merchants: Amazon, Flipkart, Myntra, Swiggy, Zomato, Uber, BMS, Tata CLiQ, Cult.fit, Sony LIV","1% CashPoints on other eligible retail spends","1:1 CashPoints redemption against statement balance (1 CashPoint = ₹1.00 cash)","₹1,00,000 spend annual fee waiver","Quarterly milestone voucher of ₹1,000 on spending ₹1 Lakh in a calendar quarter"],
        pros: ["Broad 5% Merchant Network: Covers all major Indian online portals (Amazon, Flipkart, Swiggy, Zomato, Myntra, Uber).","True 1:1 Statement Cash Credit: CashPoints redeem directly against credit card statement outstanding at ₹1 = 1 CashPoint.","₹1,000 quarterly brand voucher (or lounge access) on spending ₹1 Lakh in a calendar quarter.","Reasonable ₹1 Lakh annual spend milestone for fee waiver."],
        cons: ["Monthly 5% CashPoints is capped at 1,000 CashPoints (max spend of ₹20,000/mo).","Domestic airport lounge access is now conditional (requires ₹1 Lakh quarterly spend).","Transactions below ₹100 do not earn any CashPoints.","Rent, wallet reloads, utilities, and telecom bills earn 0% CashPoints."],
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
                    "name": "Other Eligible Retail Spends (1%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": 1000,
                    "notes": "1% CashPoints on other eligible spends (capped at 1,000 CashPoints/mo)."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel spends do not earn CashPoints (standard 1% surcharge waiver ₹400-₹5,000 applies)."
          },
          {
                    "category": "rent",
                    "reason": "Rent transactions earn 0% CashPoints + attract 1% convenience fee."
          },
          {
                    "category": "wallet",
                    "reason": "Prepaid wallet loading earns 0% CashPoints."
          },
          {
                    "category": "government",
                    "reason": "Government portals, utilities, and tax payments earn 0%."
          },
          {
                    "category": "education",
                    "reason": "Education payments on 3rd party apps (Cred, CheQ) earn 0% CashPoints."
          },
          {
                    "category": "emi",
                    "reason": "EMI transactions earn 0% CashPoints."
          },
          {
                    "category": "utilities",
                    "reason": "Utility bill payments earn 0% CashPoints on HDFC Millennia."
          },
          {
                    "category": "telecom",
                    "reason": "Telecom bills and mobile recharges earn 0% CashPoints on HDFC Millennia."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "isMilestoneBased": true,
                    "visitsPerYear": 4,
                    "ruleText": "Milestone-based: Spend ₹1,00,000 or more in a calendar quarter to choose either 1 Lounge Access Voucher OR ₹1,000 brand voucher.",
                    "spendCriteria": "₹1,00,000 per calendar quarter"
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
        keyBenefitsSummary: ["12 Domestic Lounges/year (unconditional direct swipe)","6 International Lounges/year via Priority Pass","5x Reward Points (6.67% value) on Marks & Spencer, Myntra, Nykaa, Reliance Digital","Low 2.0% Forex Markup on international transactions","₹1,500 quarterly milestone vouchers on ₹1.5L quarterly spend"],
        pros: ["Unconditional Domestic Lounge Access: 12 visits/year (direct swipe without quarterly spend hurdles!).","6 Complimentary International Lounges/year via Priority Pass for primary & add-on members.","Low Forex Markup: 2.0% instead of standard 3.5%, making it great for international travel.","5x Rewards (6.67% return) on partner brands: Marks & Spencer, Myntra, Nykaa, Reliance Digital.","₹1,500 quarterly milestone vouchers from Marriott, Marks & Spencer, or Reliance Digital."],
        cons: ["Points redemption value on SmartBuy flights/hotels is 0.50p (and 0.35p on shopping catalogue).","₹4,00,000 spend needed for annual fee waiver.","No BookMyShow BOGO offer (only points-based redemption)."],
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
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "4 Reward Points per ₹150 spent on all regular retail (1 RP = ₹0.50 on SmartBuy flight/hotel bookings)."
          }
],
        exclusions: [
          {
                    "category": "fuel",
                    "reason": "Fuel excluded."
          },
          {
                    "category": "rent",
                    "reason": "Rent payments earn 0% rewards."
          },
          {
                    "category": "wallet",
                    "reason": "Wallet loading earns 0%."
          },
          {
                    "category": "government",
                    "reason": "Government transactions earn 0%."
          }
],
        lounges: {
          "domesticAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 12,
                    "ruleText": "12 complimentary domestic airport lounge visits per calendar year (unconditional via direct swipe).",
                    "spendCriteria": "None (Direct swipe)"
          },
          "internationalAirport": {
                    "hasAccess": true,
                    "visitsPerYear": 6,
                    "ruleText": "6 complimentary international airport lounge visits per calendar year via Priority Pass.",
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
        keyBenefitsSummary: ["Unlimited Domestic & International Airport Lounge access globally for primary & add-on cardholders","Up to 33.3% return via SmartBuy 5x multipliers on flights & hotels","Base 3.33% reward rate (5 RP per ₹150, 1 RP = ₹1 on flights/hotels)","Low 2.0% Forex Markup on international spends","Unlimited complimentary golf games worldwide","ITC 1+1 buffet dining offer & Club Marriott benefits"],
        pros: ["Unrivaled Return: 3.33% base rewards and up to 33.3% on flights/hotels booked via HDFC SmartBuy.","True 1:1 Point Value: 1 Reward Point = ₹1.00 when booking flights and hotels on SmartBuy.","Unlimited Global Lounge Access: Free unlimited lounge access worldwide for both primary and add-on cardholders via Priority Pass.","Low 2% Forex Markup with 3.33% base points gives net positive return on foreign transactions.","Unlimited complimentary golf rounds and lessons across India and abroad."],
        cons: ["Strict Invitation-Only Eligibility: Demands ₹3,00,000+ monthly net salary or high credit limits.","Very High ₹10 Lakh Annual Spend Target for fee waiver.","Monthly SmartBuy bonus point caps apply (max 10,000 bonus points/calendar month)."],
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
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "5 Reward Points per ₹150 spent on all regular retail (1 RP = ₹1.00 on flights/hotels)."
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
            "CashPoint conversion value is ₹0.25 each against statement balance (compared to ₹1.00 on Millennia).",
            "Zero complimentary domestic or international airport or railway lounge access.",
            "Strictly 0 rewards on fuel, wallet reloads, rent payments, government/taxes, and jewellery."
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
                    "all-retail"
                ],
                merchants: [],
                monthlyCap: null,
                notes: "2 CashPoints per ₹150 on other eligible retail spends (0.25% return)."
            }
        ],
        exclusions: [
            {
                category: "fuel",
                reason: "Fuel is excluded from CashPoints (1% fuel surcharge waiver applies between ₹400-₹5,000)."
            },
            {
                category: "rent",
                reason: "Rental and property management payments earn 0 CashPoints."
            },
            {
                category: "wallet",
                reason: "Prepaid wallet loading transactions earn 0 CashPoints."
            },
            {
                category: "government",
                reason: "Government tax, property tax, and challan payments earn 0 CashPoints."
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
            "Zero complimentary airport or railway lounge access.",
            "Higher spend waiver hurdle: ₹2,00,000 annual spend required to waive the ₹500 renewal fee.",
            "Excludes fuel, rent, wallet reloads, utility bills, and government tax payments from cashback."
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
                notes: "1% unlimited cashback on other eligible retail spends."
            }
        ],
        exclusions: [
            {
                category: "fuel",
                reason: "Fuel is excluded from cashback (1% fuel surcharge waiver applies ₹400-₹5,000)."
            },
            {
                category: "rent",
                reason: "Rent payments earn 0% cashback."
            },
            {
                category: "wallet",
                reason: "Wallet loading earns 0% cashback."
            },
            {
                category: "government",
                reason: "Government tax and challan payments earn 0% cashback."
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
        pros: ["Up to 10% return across the vast Tata ecosystem (BigBasket, Croma, Tata 1mg, Air India, Taj, Westside).","1.5% NeuCoins on RuPay UPI payments at offline merchants and local stores.","8 Domestic + 4 International Airport Lounge visits per year.","Low 2% Forex Markup on international transactions.","1 NeuCoin = ₹1.00 directly usable across any Tata brand app."],
        cons: ["NeuCoins can only be spent within the Tata ecosystem (cannot be redeemed for direct statement cash credit).","Monthly cap of 500 NeuCoins on RuPay UPI merchant spends.","₹1,499 + GST annual fee with a high ₹3,00,000 spend waiver target."],
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
                    "notes": "1.5% NeuCoins on RuPay UPI merchant QR transactions (capped at 500 NeuCoins/mo)."
          },
          {
                    "rate": 1.5,
                    "name": "Other Retail Spends (1.5%)",
                    "categories": [
                              "all-retail"
                    ],
                    "merchants": [],
                    "monthlyCap": null,
                    "notes": "1.5% unlimited NeuCoins on other spends."
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
                    "categories": [
                              "shopping",
                              "travel"
                    ],
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
                    "categories": [
                              "food-delivery",
                              "travel",
                              "entertainment",
                              "pharmacy"
                    ],
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
        } else if (resolved.presetId === 'amazon-pay-icici' || resolved.presetId === 'icici-sapphiro-visa' || resolved.presetId === 'icici-rubyx' || resolved.presetId === 'icici-coral') {
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

        if (resolved.presetId === 'icici-sapphiro-visa') {
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
    window.toggleCardProsConsExpand = toggleCardProsConsExpand;
    window.openAddCardFromPreset = openAddCardFromPreset;
    window.testCardInSpendFinder = testCardInSpendFinder;
}



// ============================================================================
// 9. CARD GUIDE & DIRECTORY CONTROLLER (PROS, CONS & BENEFITS)
// ============================================================================

let activeDirectoryCategory = 'all';
let directorySearchQuery = '';

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
        const joiningDisplay = card.joiningFee === 0 ? '₹0 (LTF)' : `₹${card.joiningFee?.toLocaleString('en-IN')}`;
        const annualDisplay = card.annualFee === 0 ? '₹0 (LTF)' : `₹${card.annualFee?.toLocaleString('en-IN')}`;
        const waiverDisplay = card.feeWaiverSpendTarget > 0 ? `₹${(card.feeWaiverSpendTarget / 100000).toFixed(card.feeWaiverSpendTarget % 100000 === 0 ? 0 : 1)}L Spend` : (card.annualFee === 0 ? 'Lifetime Free' : 'N/A');
        const forexDisplay = card.forexMarkupPercent === 0 ? '0.0% (Zero Forex)' : `${card.forexMarkupPercent}%`;

        return `
            <div class="directory-card-card">
                <div class="dir-card-color-stripe" style="background: ${card.color};"></div>
                <div class="dir-card-header">
                    <div class="dir-card-ident">
                        <div class="dir-card-avatar" style="background: ${card.color};">
                            <i class="bi bi-credit-card-2-front"></i>
                        </div>
                        <div>
                            <div class="dir-card-title">${escapeHtml(card.name)}</div>
                            <div class="dir-card-issuer">${escapeHtml(card.issuer)} • ${escapeHtml(card.network)}</div>
                        </div>
                    </div>
                    <div class="dir-card-badges">
                        <span class="dir-category-badge">${escapeHtml(card.cardType || 'Credit Card')}</span>
                        ${isOwned ? `<span class="dir-wallet-badge"><i class="bi bi-check2-circle"></i> In Your Wallet</span>` : ''}
                    </div>
                </div>

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
    if (preset.id === 'icici-sapphiro-visa') query = 'BookMyShow';
    else if (preset.id === 'amazon-pay-icici') query = 'Amazon';
    else if (preset.id === 'sbi-bpcl-octane') query = 'BPCL Fuel';
    else if (preset.id === 'axis-atlas' || preset.id === 'scapia-federal' || preset.id === 'hdfc-regalia-gold') query = 'Flights';
    else if (preset.id === 'kiwi-rupay') query = 'UPI';

    switchCardOptimizerTab('spend');
    const searchInput = document.getElementById('cardAdvisorSearchInput');
    if (searchInput) searchInput.value = query;
    currentSearchQuery = query;
    renderQuickChips();
    runCardAdvisorSearch();
}
