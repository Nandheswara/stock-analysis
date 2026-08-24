/**
 * Local NLP Parser (Option A)
 * 
 * An advanced, deterministic rule-based natural language parser.
 * Maps user messages to financial dashboard intents and extracts values.
 * 
 * Designed to be highly robust, scaling to support extensive phrasing styles,
 * synonyms, abbreviations, and parameters. Easy to expand or train in the future.
 * 
 * @module local-nlp-parser
 */

// ==========================================
// Extensible Intent Registry
// ==========================================

const INTENTS = [
    // ------------------------------------------
    // READ / VIEW INTENTS
    // ------------------------------------------
    {
        name: 'GET_FINANCIAL_SUMMARY',
        patterns: [
            /\b(summary|overview|status|dashboard|report|stats|metrics)\b/i,
            /\bhow (am i doing|are my finances|is my budget|much money do i have)\b/i,
            /\b(show|get|view) (financial )?(summary|status|report|state)\b/i,
            /\bfinancials\b/i
        ],
        extractor: (text) => ({ month: extractMonth(text) }),
        tool: 'get_financial_summary'
    },
    {
        name: 'GET_NET_WORTH',
        patterns: [
            /\bnet\s*worth\b/i,
            /\bassets\s*(and|\+)\s*liabilities\b/i,
            /\bwhat am i worth\b/i,
            /\b(total )?assets\b/i,
            /\b(total )?liabilities\b/i
        ],
        extractor: (text) => ({ month: extractMonth(text) }),
        tool: 'get_financial_summary'
    },
    {
        name: 'LIST_CATEGORIES',
        patterns: [
            /\b(list|show|get|view|check) (investment )?(categories|portfolio|investments)\b/i,
            /\bwhere is my money invested\b/i,
            /\bcategory list\b/i,
            /\bshow categories\b/i
        ],
        extractor: (text) => ({ month: extractMonth(text) }),
        tool: 'list_investment_categories'
    },
    {
        name: 'LIST_BANKS',
        patterns: [
            /\b(list|show|get|view|check) (bank )?(accounts|balances|banks|bank balance)\b/i,
            /\bwhat banks do i have\b/i,
            /\bmy bank balances\b/i
        ],
        extractor: (text) => ({ month: extractMonth(text) }),
        tool: 'list_bank_accounts'
    },
    {
        name: 'LIST_CREDIT_CARDS',
        patterns: [
            /\b(list|show|get|view|check) (credit\s*cards|cards|liabilities|outstanding)\b/i,
            /\bcard outstanding\b/i,
            /\bwhat are my credit cards\b/i
        ],
        extractor: (text) => ({ month: extractMonth(text) }),
        tool: 'list_credit_cards'
    },
    {
        name: 'GET_INCOME_DETAILS',
        patterns: [
            /\b(show|get|view|check) (my )?(income|salary|earnings|paycheck|salary details)\b/i,
            /\bhow much did i earn\b/i,
            /\bincome details\b/i
        ],
        extractor: (text) => ({ month: extractMonth(text) }),
        tool: 'get_income_details'
    },

    // ------------------------------------------
    // WRITE / UPDATE INTENTS
    // ------------------------------------------
    {
        name: 'UPDATE_INCOME',
        patterns: [
            /\b(update|change|set|save|record|input) (my )?(income|salary|earnings|paycheck|salary details)\b/i,
            /\bmy (income|salary) (is|has changed to)\b/i,
            /\bgot a raise\b/i,
            /\bsalary (to|is)\b/i
        ],
        extractor: (text) => {
            const amount = extractAmount(text);
            const month = extractMonth(text);

            const isOther = /\bother\s*income\b/i.test(text);

            const params = { month };
            if (amount !== null) {
                if (isOther) {
                    params.otherIncome = amount;
                } else {
                    params.salary = amount;
                }
            }
            return params;
        },
        tool: 'update_income'
    },
    {
        name: 'UPDATE_TAX',
        patterns: [
            /\b(update|change|set|save|record|input) (my )?tax(es| amount)?\b/i,
            /\btax (to|is)\b/i,
            /\bpaid tax of\b/i
        ],
        extractor: (text) => {
            const amount = extractAmount(text);
            const month = extractMonth(text);
            return { month, tax: amount };
        },
        tool: 'update_tax'
    },
    {
        name: 'UPDATE_EPFO',
        patterns: [
            /\b(update|change|set|save|record|input) (my )?epfo\b/i,
            /\bprovident fund (to|is)\b/i,
            /\bepf (to|is)\b/i
        ],
        extractor: (text) => {
            const amount = extractAmount(text);
            const month = extractMonth(text);
            return { month, value: amount };
        },
        tool: 'update_epfo'
    },
    {
        name: 'UPDATE_BANK_BALANCE',
        patterns: [
            /\b(update|change|set|save|record|input) bank\b/i,
            /\b(sbi|hdfc|icici|axis|kotak|hsbc|citi|pnb|canara|federal|idfc)\b.*balance\b/i,
            /\bbalance in\b/i,
            /\bset balance of\b/i
        ],
        extractor: (text) => {
            const amount = extractAmount(text);
            const month = extractMonth(text);

            let bankName = null;
            const bankMatch = text.match(/\b(sbi|hdfc|icici|axis|kotak|hsbc|citi|pnb|canara|federal|idfc)\b/i);
            if (bankMatch) {
                bankName = bankMatch[1].toUpperCase();
            } else {
                const balanceMatch = text.match(/([a-zA-Z\s]+?)\s+(?:balance|account)/i);
                if (balanceMatch) {
                    const cleanedName = balanceMatch[1].replace(/\b(update|set|change|my)\b/gi, '').trim();
                    if (cleanedName.toLowerCase() !== 'bank') {
                        bankName = cleanedName;
                    }
                }
            }

            return { bankName, balance: amount, month };
        },
        tool: 'update_bank_balance'
    },
    {
        name: 'UPDATE_CREDIT_CARD_BALANCE',
        patterns: [
            /\b(update|change|set|save|record) (card|credit card|outstanding|bill)\b/i,
            /\b(sbi|hdfc|icici|axis|kotak|hsbc|citi|amazon|onecard|amex)\b.*(card|outstanding|balance)\b/i,
            /\boutstanding in\b/i
        ],
        extractor: (text) => {
            const amount = extractAmount(text);
            const month = extractMonth(text);

            let cardName = null;
            const cardMatch = text.match(/\b(sbi|hdfc|icici|axis|kotak|hsbc|citi|amazon|onecard|amex)\b/i);
            if (cardMatch) {
                cardName = cardMatch[1].toUpperCase();
            } else {
                const match = text.match(/([a-zA-Z\s]+?)\s+(?:card|credit card|outstanding)/i);
                if (match) {
                    const cleanedName = match[1].replace(/\b(update|set|change|my)\b/gi, '').trim();
                    if (cleanedName.toLowerCase() !== 'credit' && cleanedName.toLowerCase() !== 'card') {
                        cardName = cleanedName;
                    }
                }
            }

            return { cardName, balance: amount, month };
        },
        tool: 'update_credit_card_balance'
    },
    {
        name: 'MARK_CREDIT_CARD_PAID',
        patterns: [
            /\b(pay|paid|mark paid|clear|cleared) (card|bill|outstanding)\b/i,
            /\b(card|bill|outstanding) is (paid|cleared)\b/i
        ],
        extractor: (text) => {
            const month = extractMonth(text);
            let cardName = null;
            const cardMatch = text.match(/\b(sbi|hdfc|icici|axis|kotak|hsbc|citi|amazon|onecard|amex)\b/i);
            if (cardMatch) {
                cardName = cardMatch[1].toUpperCase();
            }

            return { cardName, isPaid: true, month };
        },
        tool: 'update_credit_card_balance'
    },
    {
        name: 'ADD_INVESTMENT_CATEGORY',
        patterns: [
            /\b(create|add|new) category\b/i,
            /\bcategory called\b/i,
            /\bcategory named\b/i
        ],
        extractor: (text) => {
            let name = null;
            const quoteMatch = text.match(/(?:category)\s+['"“]([^'”"]+)['"”]/i) || 
                              text.match(/(?:called|named)\s+['"“]?([a-zA-Z0-9\s]+)['"”]?/i);
            if (quoteMatch) {
                name = quoteMatch[1].trim();
            } else {
                const wordMatch = text.match(/category\s+([a-zA-Z]+)/i);
                if (wordMatch) name = wordMatch[1].trim();
            }

            let icon = 'bi-folder';
            if (/\b(gold|metal)\b/i.test(text)) icon = 'bi-safe';
            else if (/\b(stock|equity|share|mutual|fund|nifty|index)\b/i.test(text)) icon = 'bi-graph-up-arrow';
            else if (/\b(crypto|bitcoin)\b/i.test(text)) icon = 'bi-currency-bitcoin';
            else if (/\b(cash|bank|money)\b/i.test(text)) icon = 'bi-cash-coin';

            return { name, icon };
        },
        tool: 'add_investment_category'
    },
    {
        name: 'ADD_INVESTMENT_ITEM',
        patterns: [
            /\b(add|invest|put)\b.*(in|to|under)\b/i,
            /\bnew investment\b/i,
            /\badd item\b/i
        ],
        extractor: (text) => {
            const amount = extractAmount(text);
            const month = extractMonth(text);
            
            let itemName = null;
            let categoryName = null;

            // Pattern: add [item] worth [amount] to [category]
            const pattern1 = text.match(/(?:add|invest)\s+([^,]+?)\s+(?:worth|of)?\s*\d+\s*(?:to|in|under)\s+([^,]+)/i);
            if (pattern1) {
                itemName = pattern1[1].replace(/\b(worth|of|amount)\b/gi, '').trim();
                categoryName = pattern1[2].trim();
            } else {
                // Pattern: add [item] to [category]
                const pattern2 = text.match(/(?:add|invest)\s+([^,]+?)\s+(?:to|in|under)\s+([^,]+)/i);
                if (pattern2) {
                    itemName = pattern2[1].trim();
                    categoryName = pattern2[2].trim();
                }
            }

            return { itemName, categoryName, amount, month };
        },
        tool: 'add_investment_item'
    },
    {
        name: 'DELETE_INVESTMENT_ITEM',
        patterns: [
            /\b(delete|remove|delete item|remove item) ([^,]+) (from) ([^,]+)\b/i,
            /\b(remove|delete) ([^,]+) in ([^,]+)\b/i
        ],
        extractor: (text) => {
            const month = extractMonth(text);
            let itemName = null;
            let categoryName = null;

            const match1 = text.match(/\b(delete|remove)\s+([^,]+?)\s+from\s+([^,]+)/i);
            if (match1) {
                itemName = match1[2].trim();
                categoryName = match1[3].trim();
            }

            return { itemName, categoryName, month };
        },
        tool: 'delete_investment_item'
    },
    {
        name: 'ADD_BANK_ACCOUNT',
        patterns: [
            /\b(create|add|new) bank account\b/i,
            /\bbank account called\b/i,
            /\badd bank account\b/i
        ],
        extractor: (text) => {
            let name = null;
            const quoteMatch = text.match(/(?:account)\s+['"“]([^'”"]+)['"”]/i) || 
                              text.match(/(?:called|named)\s+['"“]?([a-zA-Z0-9\s]+)['"”]?/i);
            if (quoteMatch) {
                name = quoteMatch[1].trim();
            } else {
                const wordMatch = text.match(/(?:called|named|account)\s+([a-zA-Z\s]+)/i);
                if (wordMatch) name = wordMatch[1].trim();
            }

            let accountType = 'savings';
            if (/\b(current)\b/i.test(text)) accountType = 'current';
            else if (/\b(fixed|fd)\b/i.test(text)) accountType = 'fd';
            else if (/\b(ppf)\b/i.test(text)) accountType = 'ppf';
            else if (/\b(nps)\b/i.test(text)) accountType = 'nps';

            const balance = extractAmount(text) || 0;

            return { name, accountType, balance };
        },
        tool: 'add_bank_account'
    },

    // ------------------------------------------
    // UTILITIES / NAVIGATION
    // ------------------------------------------
    {
        name: 'NAVIGATE_PAGE',
        patterns: [
            /\b(go to|take me to|navigate to|open|show me)\b.*(page|tracker|manager|planner|home|analysis|news|profile)/i,
            /\b(tracker|manager|planner|home|analysis|news|profile) page\b/i
        ],
        extractor: (text) => {
            let page = 'home';
            if (/\b(finance|tracker|piggy)\b/i.test(text)) page = 'finance-tracker';
            else if (/\b(stock|portfolio|wallet|manager)\b/i.test(text)) page = 'stock-manager';
            else if (/\b(budget|event|planner)\b/i.test(text)) page = 'budget-planner';
            else if (/\b(fundamental|analysis|equity|ratios)\b/i.test(text)) page = 'analysis';
            else if (/\b(news|newspaper)\b/i.test(text)) page = 'news';
            else if (/\b(profile|account|settings)\b/i.test(text)) page = 'profile';

            return { page };
        },
        tool: 'navigate_to_page'
    },
    {
        name: 'NAVIGATE_MONTH',
        patterns: [
            /\b(go to|view|show|navigate to)\b.*(month|january|february|march|april|may|june|july|august|september|october|november|december)/i,
            /\b(next|previous|last|this) month\b/i
        ],
        extractor: (text) => {
            const month = extractMonth(text);
            return { month };
        },
        tool: 'navigate_to_month'
    }
];

// ==========================================
// Semantic Extractor Helpers
// ==========================================

/**
 * Extract numbers with multipliers like 'k', 'lakh', 'L', 'm'
 * e.g., "500000", "50k" -> 50000, "5L" -> 500000, "5 lakh" -> 500000
 * @param {string} text 
 * @returns {number|null}
 */
export function extractAmount(text) {
    const cleaned = text.replace(/[,₹]/g, ''); // strip symbols

    // Match numbers with scale markers (e.g. 50k, 5l, 5 lakh)
    const match = cleaned.match(/\b(\d+(?:\.\d+)?)\s*(k|lakh|l|m)?\b/i);
    if (!match) return null;

    const val = parseFloat(match[1]);
    const unit = (match[2] || '').toLowerCase();

    switch (unit) {
        case 'k':
            return val * 1000;
        case 'l':
        case 'lakh':
            return val * 100000;
        case 'm':
            return val * 1000000;
        default:
            return val;
    }
}

/**
 * Extract a standard YYYY-MM month key from text.
 * Aligns with the active month currently selected on the user's dashboard.
 * @param {string} text 
 * @returns {string|null}
 */
export function extractMonth(text) {
    const lower = text.toLowerCase();

    // Try to get currently active month from the page first
    let activeMonthKey = null;
    if (window.equityLabsFinance && window.equityLabsFinance.getCurrentMonth) {
        activeMonthKey = window.equityLabsFinance.getCurrentMonth();
    }

    const now = new Date();
    let baseYear = now.getFullYear();
    let baseMonth = now.getMonth(); // 0-indexed

    if (activeMonthKey) {
        const [y, m] = activeMonthKey.split('-').map(Number);
        baseYear = y;
        baseMonth = m - 1; // Convert to 0-indexed
    }

    // 1. Check relative keywords
    if (/\b(this month)\b/i.test(lower)) {
        return `${baseYear}-${String(baseMonth + 1).padStart(2, '0')}`;
    }
    if (/\b(last month|prev month|previous month)\b/i.test(lower)) {
        const d = new Date(baseYear, baseMonth - 1, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    if (/\b(next month)\b/i.test(lower)) {
        const d = new Date(baseYear, baseMonth + 1, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    // 2. Check explicit Month Name (e.g. July, Jul, July 2026)
    const monthNames = [
        ['january', 'jan'], ['february', 'feb'], ['march', 'mar'],
        ['april', 'apr'], ['may'], ['june', 'jun'],
        ['july', 'jul'], ['august', 'aug'], ['september', 'sep'],
        ['october', 'oct'], ['november', 'nov'], ['december', 'dec']
    ];

    for (let i = 0; i < monthNames.length; i++) {
        const aliases = monthNames[i];
        for (const alias of aliases) {
            const regex = new RegExp(`\\b${alias}\\b`, 'i');
            if (regex.test(lower)) {
                const yearMatch = lower.match(new RegExp(`\\b${alias}\\s+(\\d{4})\\b`, 'i')) || 
                                  lower.match(/\b(20\d{2})\b/);
                const year = yearMatch ? parseInt(yearMatch[1]) : baseYear;
                return `${year}-${String(i + 1).padStart(2, '0')}`;
            }
        }
    }

    // 3. Check raw YYYY-MM
    const isoMatch = lower.match(/\b(20\d{2})-(\d{1,2})\b/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}`;
    }

    // 4. Default: fallback to current active month on the page
    if (activeMonthKey) {
        return activeMonthKey;
    }

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ==========================================
// Parsing & Intent Classification
// ==========================================

/**
 * Main parser entry point
 * @param {string} text - User message
 * @returns {{ intent: string, params: Object, tool: string }|null}
 */
export function parseIntent(text) {
    const cleanText = text.trim();
    if (!cleanText) return null;

    // Scan registry for a matching intent pattern
    for (const intent of INTENTS) {
        for (const pattern of intent.patterns) {
            if (pattern.test(cleanText)) {
                const params = intent.extractor(cleanText);
                return {
                    intent: intent.name,
                    params,
                    tool: intent.tool
                };
            }
        }
    }

    return null;
}

/**
 * Helper to get fallback/guidance text when no intent matches
 * @returns {string}
 */
export function getHelpGuidance() {
    return `I couldn't match your command. Try phrasing it like this:
- **Income**: *"Update my salary to 85k"* or *"Set other income to 15,000"*
- **Banks**: *"Set HDFC bank balance to 50k"* or *"Show bank accounts"*
- **Liabilities**: *"Set Axis Card outstanding to 2,000"* or *"Mark HDFC card as paid"*
- **Investments**: *"Add digital gold worth 5000 in Mutual Funds"* or *"Show categories"*
- **Misc**: *"Set epfo to 1,50,000"* or *"Set tax to 3000"*`;
}
