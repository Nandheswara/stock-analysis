/**
 * Agent Controller
 * 
 * Main orchestrator for the AI assistant. Implements the tool-calling loop:
 * User Message → Build Prompt → Call LLM → Execute Tools → Return Response
 * 
 * Manages conversation history within a session and coordinates between
 * the Gemini client, tool registry, context engine, and chat panel.
 * 
 * @module agent-controller
 */

import { 
    callGemini, 
    buildUserMessage, 
    buildFunctionResponse, 
    buildModelMessage,
    isApiKeyConfigured,
    GeminiError 
} from './gemini-client.js';
import { 
    getToolSchemasForPage, 
    executeTool, 
    toolRequiresConfirmation 
} from './tool-registry.js';
import { 
    getCurrentPage, 
    buildSystemPrompt 
} from './context-engine.js';

const MAX_TOOL_CALLS_PER_TURN = 5;
const SESSION_HISTORY_KEY = 'equitybot_session';
const MAX_HISTORY_TURNS = 20;

/**
 * @typedef {Object} ChatMessage
 * @property {'user'|'assistant'|'tool'|'error'|'system'} role
 * @property {string} content - Display text
 * @property {Object} [toolExecution] - Tool execution details
 * @property {boolean} [pending] - Whether awaiting confirmation
 * @property {number} timestamp
 */

/** @type {Array<Object>} Gemini conversation contents */
let conversationHistory = [];

/** @type {AbortController|null} */
let activeRequest = null;

/** @type {Function|null} Callback for UI updates */
let onMessageCallback = null;

/** @type {Function|null} Callback for typing state */
let onTypingCallback = null;

/** @type {{ name: string, args: Object, modelContent: Object }|null} */
let pendingConfirmation = null;

/**
 * Initialize the agent controller
 * @param {Object} options
 * @param {Function} options.onMessage - Called when a new message should be displayed
 * @param {Function} options.onTyping - Called when typing state changes
 */
export function initAgent({ onMessage, onTyping }) {
    onMessageCallback = onMessage;
    onTypingCallback = onTyping;
    loadSessionHistory();
}

import { parseIntent, getHelpGuidance } from './local-nlp-parser.js';

/**
 * Check if the Gemini API is enabled via settings toggle
 * @returns {boolean}
 */
export function isGeminiEnabled() {
    try {
        return localStorage.getItem('equitybot_use_gemini') === 'true';
    } catch {
        return false;
    }
}

/**
 * Check if the agent is ready (ready if in local-only mode, or if API key is set when Gemini is enabled)
 * @returns {boolean}
 */
export function isAgentReady() {
    if (!isGeminiEnabled()) return true; // Local mode is always ready
    return isApiKeyConfigured();
}

/**
 * Send a user message to the agent
 * @param {string} text - User's message
 * @returns {Promise<void>}
 */
export async function sendMessage(text) {
    if (!text.trim()) return;

    // Cancel any pending request
    if (activeRequest) {
        activeRequest.abort();
        activeRequest = null;
    }

    // Emit user message
    emitMessage({
        role: 'user',
        content: text
    });

    // Start typing indicator
    setTyping(true);

    const useGemini = isGeminiEnabled();

    if (useGemini && isApiKeyConfigured()) {
        try {
            // Add user message to conversation history
            conversationHistory.push(buildUserMessage(text));

            // Execute the tool-calling loop
            await executeAgentLoop();
            saveSessionHistory();
            return;
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.warn('[EquityBot] Gemini API execution failed. Falling back to local NLP parser.', error);
            // Fall through to local parser below
        }
    }

    // Execute via local parser (either Gemini is disabled or it failed)
    await executeLocalCommand(text);
    setTyping(false);
}

/**
 * Processes a command locally using regular expressions
 * @param {string} text 
 */
async function executeLocalCommand(text) {
    const match = parseIntent(text);

    if (!match) {
        // Fallback: show instructions
        emitMessage({
            role: 'assistant',
            content: `I'm currently running in **Local Mode**.\n\n${getHelpGuidance()}\n\n*Tip: You can enable the advanced AI model in ⚙️ Settings by toggling on Gemini.*`
        });
        return;
    }

    const { tool: toolName, params } = match;

    // Check if this tool requires confirmation
    if (toolRequiresConfirmation(toolName)) {
        pendingConfirmation = {
            name: toolName,
            args: params,
            // Create a fake model response to append when confirmed
            modelContent: buildModelMessage(`I will execute ${toolName} locally.`)
        };

        emitMessage({
            role: 'assistant',
            content: formatConfirmationMessage(toolName, params),
            pending: true,
            toolExecution: { name: toolName, args: params, status: 'pending' }
        });
    } else {
        // Run immediately (read-only tools)
        try {
            const result = await executeTool(toolName, params);
            
            if (result.success !== false) {
                // Formatting specific read outputs
                if (toolName === 'get_financial_summary') {
                    renderFinancialSummaryLocal(result);
                } else if (toolName === 'list_investment_categories') {
                    renderCategoriesLocal(result);
                } else if (toolName === 'list_bank_accounts') {
                    renderBanksLocal(result);
                } else if (toolName === 'list_credit_cards') {
                    renderCardsLocal(result);
                } else {
                    emitMessage({
                        role: 'assistant',
                        content: result.message || `Command executed successfully.`
                    });
                }
            } else {
                emitMessage({
                    role: 'error',
                    content: result.error || 'Failed to execute command.'
                });
            }
        } catch (err) {
            emitMessage({
                role: 'error',
                content: `Error: ${err.message}`
            });
        }
    }
}

/**
 * Local UI rendering helpers for read tools
 */
function renderFinancialSummaryLocal(res) {
    emitMessage({
        role: 'assistant',
        content: `📊 **Financial Summary for ${res.month}**:\n` +
                 `• **Total Income**: ${res.income.formatted} *(Salary: ${res.income.salary ? res.income.formatted : '₹0'})*\n` +
                 `• **Total Expenses**: ${res.expenditure.formatted}\n` +
                 `• **Invested this Month**: ${res.investments.formattedThisMonth}\n` +
                 `• **Current Bank Balance**: ${res.bankBalance.formatted}\n` +
                 `• **Net Worth**: ${res.netWorth.formattedTotal} *(Assets: ${res.netWorth.formattedAssets} | Liabilities: ${res.netWorth.formattedLiabilities})*\n` +
                 `• **Savings Rate**: ${res.savingsRate}`
    });
}

function renderCategoriesLocal(res) {
    if (res.categories.length === 0) {
        emitMessage({
            role: 'assistant',
            content: `📂 No investment categories found for ${res.month}.`
        });
        return;
    }

    const list = res.categories.map(c => 
        `• **${c.name}**: ${c.formattedTotal} *(${c.itemCount} items)*`
    ).join('\n');

    emitMessage({
        role: 'assistant',
        content: `📂 **Investment Categories for ${res.month}**:\n${list}`
    });
}

function renderBanksLocal(res) {
    if (res.accounts.length === 0) {
        emitMessage({
            role: 'assistant',
            content: `🏦 No bank accounts found.`
        });
        return;
    }

    const list = res.accounts.map(a => 
        `• **${a.name}** *(${a.accountType})*: ${a.formattedBalance}`
    ).join('\n');

    emitMessage({
        role: 'assistant',
        content: `🏦 **Bank Accounts (${res.month})**:\n${list}\n\n**Total Balance**: ${res.formattedTotal}`
    });
}

function renderCardsLocal(res) {
    if (res.cards.length === 0) {
        emitMessage({
            role: 'assistant',
            content: `💳 No credit cards or liability accounts found.`
        });
        return;
    }

    const list = res.cards.map(c => 
        `• **${c.name}**: ${c.formattedBalance} *[${c.isPaid ? 'Paid' : 'Unpaid'}]*`
    ).join('\n');

    emitMessage({
        role: 'assistant',
        content: `💳 **Credit Cards & Liabilities (${res.month})**:\n${list}`
    });
}

/**
 * Confirm a pending tool execution
 */
export async function confirmPendingAction() {
    if (!pendingConfirmation) return;

    const { name, args, modelContent } = pendingConfirmation;
    pendingConfirmation = null;

    setTyping(true);

    try {
        // Execute the tool
        const result = await executeTool(name, args);

        emitMessage({
            role: 'tool',
            content: result.message || (result.success !== false ? `✅ ${name} executed successfully` : `❌ ${result.error || 'Failed'}`),
            toolExecution: {
                name,
                args,
                result,
                status: result.success !== false ? 'success' : 'error'
            }
        });

        const useGemini = isGeminiEnabled();
        if (useGemini && isApiKeyConfigured()) {
            // Add the model's function call and response to history
            conversationHistory.push(modelContent);
            conversationHistory.push(buildFunctionResponse(name, result));

            // Let the LLM generate a final summary
            await executeAgentLoop();
        } else {
            setTyping(false);
            // In Local mode, we stop here and ask for the next command
            emitMessage({
                role: 'assistant',
                content: result.success !== false 
                    ? `I have successfully updated that field for you. What would you like to do next?`
                    : `I encountered an error trying to update that field. Please try again.`
            });
        }
    } catch (error) {
        setTyping(false);
        emitMessage({
            role: 'error',
            content: `Failed to execute action: ${error.message}`
        });
    }

    saveSessionHistory();
}

/**
 * Reject/cancel a pending tool execution
 */
export function rejectPendingAction() {
    if (!pendingConfirmation) return;

    const { name } = pendingConfirmation;
    pendingConfirmation = null;

    emitMessage({
        role: 'system',
        content: `Cancelled: ${name}. Let me know if you'd like to do something else.`
    });

    // Add a synthetic response to keep conversation consistent
    conversationHistory.push(buildModelMessage(`The user cancelled the ${name} action. I'll wait for their next request.`));

    saveSessionHistory();
}

/**
 * Check if there's a pending confirmation
 * @returns {boolean}
 */
export function hasPendingConfirmation() {
    return pendingConfirmation !== null;
}

/**
 * Clear conversation history and start fresh
 */
export function clearConversation() {
    conversationHistory = [];
    pendingConfirmation = null;
    try {
        sessionStorage.removeItem(SESSION_HISTORY_KEY);
    } catch { /* ignore */ }
}

/**
 * Get suggested quick actions based on current page
 * @returns {Array<{ text: string, prompt: string }>}
 */
export function getSuggestedActions() {
    const page = getCurrentPage();

    if (page === 'finance-tracker') {
        return [
            { text: '📊 Financial Summary', prompt: 'Show me my financial summary for this month' },
            { text: '💰 Net Worth', prompt: "What's my net worth?" },
            { text: '📋 List Categories', prompt: 'List all my investment categories' },
            { text: '🏦 Bank Balances', prompt: 'Show my bank balances' }
        ];
    }

    return [
        { text: '🏠 What can you do?', prompt: 'What can you help me with?' },
        { text: '📊 Go to Finance', prompt: 'Take me to the Finance Tracker' }
    ];
}

// ==========================================
// Internal
// ==========================================

/**
 * Execute the agent loop — call LLM, handle tool calls, repeat
 */
async function executeAgentLoop() {
    let toolCallCount = 0;

    while (toolCallCount < MAX_TOOL_CALLS_PER_TURN) {
        const page = getCurrentPage();
        const tools = getToolSchemasForPage(page);
        const systemPrompt = buildSystemPrompt();

        activeRequest = new AbortController();

        const response = await callGemini({
            systemInstruction: systemPrompt,
            contents: conversationHistory,
            tools,
            signal: activeRequest.signal
        });

        activeRequest = null;

        if (response.type === 'text') {
            // Final text response
            setTyping(false);
            conversationHistory.push(response.modelContent);

            emitMessage({
                role: 'assistant',
                content: response.text
            });

            return;
        }

        if (response.type === 'functionCall') {
            const { name, args } = response.functionCall;
            toolCallCount++;

            // Check if this tool requires confirmation
            if (toolRequiresConfirmation(name)) {
                setTyping(false);

                // Store pending confirmation
                pendingConfirmation = {
                    name,
                    args,
                    modelContent: response.modelContent
                };

                emitMessage({
                    role: 'assistant',
                    content: formatConfirmationMessage(name, args),
                    pending: true,
                    toolExecution: { name, args, status: 'pending' }
                });

                return;
            }

            // Execute tool immediately (read-only tools)
            const result = await executeTool(name, args);

            // Add to conversation history
            conversationHistory.push(response.modelContent);
            conversationHistory.push(buildFunctionResponse(name, result));

            // Continue the loop — LLM will process the result
        }
    }

    // Max tool calls reached
    setTyping(false);
    emitMessage({
        role: 'error',
        content: 'I tried too many operations. Please simplify your request.'
    });
}

/**
 * Format a user-friendly confirmation message
 * @param {string} toolName 
 * @param {Object} args 
 * @returns {string}
 */
function formatConfirmationMessage(toolName, args) {
    const formatCurrency = (v) => new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(v);

    const messages = {
        update_income: () => {
            const parts = [];
            if (args.salary !== undefined) parts.push(`Salary → ${formatCurrency(args.salary)}`);
            if (args.otherIncome !== undefined) parts.push(`Other Income → ${formatCurrency(args.otherIncome)}`);
            return `I'll update your income:\n${parts.join('\n')}`;
        },
        update_tax: () => `I'll set your tax to ${formatCurrency(args.tax)}`,
        update_epfo: () => `I'll set your EPFO balance to ${formatCurrency(args.value)}`,
        add_investment_category: () => `I'll create a new category: **${args.name}**`,
        add_investment_item: () => `I'll add **${args.itemName}** (${formatCurrency(args.amount)}) to **${args.categoryName}**`,
        update_investment_item: () => {
            const parts = [];
            if (args.newAmount !== undefined) parts.push(`Amount → ${formatCurrency(args.newAmount)}`);
            if (args.newName !== undefined) parts.push(`Name → "${args.newName}"`);
            return `I'll update **${args.itemName}** in **${args.categoryName}**:\n${parts.join('\n')}`;
        },
        delete_investment_item: () => `I'll delete **${args.itemName}** from **${args.categoryName}**`,
        update_bank_balance: () => `I'll update **${args.bankName}** balance to ${formatCurrency(args.balance)}`,
        add_bank_account: () => `I'll add a new bank account: **${args.name}**${args.balance ? ` with ${formatCurrency(args.balance)}` : ''}`,
        update_credit_card_balance: () => {
            const parts = [];
            if (args.balance !== undefined) parts.push(`Balance → ${formatCurrency(args.balance)}`);
            if (args.isPaid !== undefined) parts.push(`Status → ${args.isPaid ? 'Paid' : 'Unpaid'}`);
            return `I'll update **${args.cardName}**:\n${parts.join('\n')}`;
        }
    };

    const formatter = messages[toolName];
    const detail = formatter ? formatter() : `I'll execute: **${toolName}**`;

    return `${detail}\n\nShall I proceed?`;
}

/**
 * Emit a message to the UI
 * @param {ChatMessage} message 
 */
function emitMessage(message) {
    if (onMessageCallback) {
        onMessageCallback({
            ...message,
            timestamp: Date.now()
        });
    }
}

/**
 * Set typing indicator state
 * @param {boolean} isTyping 
 */
function setTyping(isTyping) {
    if (onTypingCallback) {
        onTypingCallback(isTyping);
    }
}

/**
 * Save conversation history to sessionStorage
 */
function saveSessionHistory() {
    try {
        // Trim history if too long
        if (conversationHistory.length > MAX_HISTORY_TURNS * 2) {
            conversationHistory = conversationHistory.slice(-MAX_HISTORY_TURNS * 2);
        }
        sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(conversationHistory));
    } catch { /* ignore */ }
}

/**
 * Load conversation history from sessionStorage
 */
function loadSessionHistory() {
    try {
        const saved = sessionStorage.getItem(SESSION_HISTORY_KEY);
        if (saved) {
            conversationHistory = JSON.parse(saved);
        }
    } catch {
        conversationHistory = [];
    }
}
