/**
 * Chat Panel UI
 * 
 * Renders the floating chat panel for EquityBot.
 * Features: FAB button, glassmorphic panel, message rendering with markdown,
 * tool execution cards, typing indicators, suggested actions, confirmation
 * buttons, settings panel for API key, and responsive mobile layout.
 * 
 * @module chat-panel
 */

import { 
    initAgent, 
    sendMessage, 
    isAgentReady, 
    confirmPendingAction, 
    rejectPendingAction, 
    hasPendingConfirmation, 
    clearConversation, 
    getSuggestedActions 
} from './agent-controller.js';
import { registerTools } from './tool-registry.js';
import { financeTools } from './tools/finance-tools.js';
import { getApiKey, setApiKey, isApiKeyConfigured } from './gemini-client.js';

let isOpen = false;
let isSettingsOpen = false;
let chatContainer = null;
let messagesContainer = null;
let inputField = null;
let sendButton = null;
let typingIndicator = null;
let confirmationBar = null;

/**
 * Initialize the chat panel — inject DOM, register tools, bind events
 */
export function initChatPanel() {
    // Register finance tools
    registerTools(financeTools);

    // Inject the chat panel HTML
    injectChatDOM();

    // Initialize the agent controller
    initAgent({
        onMessage: handleNewMessage,
        onTyping: handleTypingState
    });

    // Show welcome message if API key is set
    if (isApiKeyConfigured()) {
        showWelcomeMessage();
    }

    // Listen for theme changes to update panel
    window.addEventListener('themechanged', () => {
        // Panel auto-adapts via CSS variables — no action needed
    });
}

// ==========================================
// DOM Injection
// ==========================================

function injectChatDOM() {
    const wrapper = document.createElement('div');
    wrapper.id = 'equitybot-wrapper';
    wrapper.innerHTML = `
        <!-- Floating Action Button -->
        <button id="equitybot-fab" class="equitybot-fab" aria-label="Open AI Assistant" title="EquityBot Assistant">
            <span class="equitybot-fab-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27a7 7 0 0 1-12.46 0H6a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                    <circle cx="9" cy="14" r="1"/>
                    <circle cx="15" cy="14" r="1"/>
                    <path d="M9 18h6"/>
                </svg>
            </span>
            <span class="equitybot-fab-pulse"></span>
        </button>

        <!-- Chat Panel -->
        <div id="equitybot-panel" class="equitybot-panel" aria-hidden="true">
            <!-- Header -->
            <div class="equitybot-header">
                <div class="equitybot-header-left">
                    <div class="equitybot-avatar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27a7 7 0 0 1-12.46 0H6a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                            <circle cx="9" cy="14" r="1"/>
                            <circle cx="15" cy="14" r="1"/>
                            <path d="M9 18h6"/>
                        </svg>
                    </div>
                    <div class="equitybot-header-info">
                        <span class="equitybot-header-title">EquityBot</span>
                        <span class="equitybot-header-status" id="equitybot-status">Ready</span>
                    </div>
                </div>
                <div class="equitybot-header-actions">
                    <button id="equitybot-clear-btn" class="equitybot-header-btn" title="Clear conversation" aria-label="Clear conversation">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                    <button id="equitybot-settings-btn" class="equitybot-header-btn" title="Settings" aria-label="Settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                    </button>
                    <button id="equitybot-close-btn" class="equitybot-header-btn" title="Close" aria-label="Close chat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Settings Panel -->
            <div id="equitybot-settings" class="equitybot-settings" style="display: none;">
                <div class="equitybot-settings-content">
                    <h4 class="equitybot-settings-title">⚙️ Assistant Settings</h4>
                    
                    <!-- Gemini Toggle Switch -->
                    <div class="equitybot-toggle-row">
                        <div class="equitybot-toggle-text">
                            <span class="equitybot-toggle-name">Advanced Gemini AI</span>
                            <span class="equitybot-toggle-sub">Enables complex conversations (requires API Key)</span>
                        </div>
                        <label class="equitybot-switch">
                            <input type="checkbox" id="equitybot-toggle-gemini">
                            <span class="equitybot-slider"></span>
                        </label>
                    </div>

                    <!-- API Key Section (visible when toggle is checked) -->
                    <div id="equitybot-api-section" class="equitybot-api-section" style="display: none; margin-top: 12px; border-top: 1px solid var(--eb-border); padding-top: 12px;">
                        <p class="equitybot-settings-desc">Enter your Gemini API key. Get one from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>.</p>
                        <div class="equitybot-settings-field">
                            <input type="password" id="equitybot-api-key-input" class="equitybot-api-input" placeholder="Paste your Gemini API key..." autocomplete="off" spellcheck="false" />
                            <button id="equitybot-save-key-btn" class="equitybot-save-key-btn">Save</button>
                        </div>
                        <p class="equitybot-settings-note" id="equitybot-key-status"></p>
                    </div>
                </div>
            </div>

            <!-- Messages Area -->
            <div id="equitybot-messages" class="equitybot-messages">
                <!-- Messages will be injected here -->
            </div>

            <!-- Typing Indicator -->
            <div id="equitybot-typing" class="equitybot-typing" style="display: none;">
                <div class="equitybot-typing-avatar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27a7 7 0 0 1-12.46 0H6a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                    </svg>
                </div>
                <div class="equitybot-typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>

            <!-- Confirmation Bar -->
            <div id="equitybot-confirmation" class="equitybot-confirmation" style="display: none;">
                <button id="equitybot-confirm-btn" class="equitybot-confirm-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Confirm
                </button>
                <button id="equitybot-cancel-btn" class="equitybot-cancel-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Cancel
                </button>
            </div>

            <!-- Suggested Actions -->
            <div id="equitybot-suggestions" class="equitybot-suggestions">
                <!-- Suggestions will be injected dynamically -->
            </div>

            <!-- Input Area -->
            <div class="equitybot-input-area">
                <textarea id="equitybot-input" class="equitybot-input" placeholder="Ask EquityBot anything..." rows="1" aria-label="Chat message input"></textarea>
                <button id="equitybot-send" class="equitybot-send-btn" title="Send message" aria-label="Send" disabled>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);

    // Cache DOM references
    chatContainer = document.getElementById('equitybot-panel');
    messagesContainer = document.getElementById('equitybot-messages');
    inputField = document.getElementById('equitybot-input');
    sendButton = document.getElementById('equitybot-send');
    typingIndicator = document.getElementById('equitybot-typing');
    confirmationBar = document.getElementById('equitybot-confirmation');

    // Bind events
    bindEvents();

    // Render initial suggestions
    renderSuggestions();

    // Update key status
    updateKeyStatus();
}

// ==========================================
// Event Binding
// ==========================================

function bindEvents() {
    // FAB toggle
    document.getElementById('equitybot-fab').addEventListener('click', togglePanel);

    // Close button
    document.getElementById('equitybot-close-btn').addEventListener('click', closePanel);

    // Send message
    sendButton.addEventListener('click', handleSend);

    // Input handling
    inputField.addEventListener('input', handleInputChange);
    inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // Clear conversation
    document.getElementById('equitybot-clear-btn').addEventListener('click', () => {
        clearConversation();
        messagesContainer.innerHTML = '';
        showWelcomeMessage();
        renderSuggestions();
    });

    // Settings
    const settingsBtn = document.getElementById('equitybot-settings-btn');
    const geminiToggle = document.getElementById('equitybot-toggle-gemini');
    const apiSection = document.getElementById('equitybot-api-section');

    settingsBtn.addEventListener('click', toggleSettings);

    // Initialize toggle state
    const useGemini = localStorage.getItem('equitybot_use_gemini') === 'true';
    geminiToggle.checked = useGemini;
    apiSection.style.display = useGemini ? 'block' : 'none';

    // Handle toggle change
    geminiToggle.addEventListener('change', (e) => {
        const checked = e.target.checked;
        localStorage.setItem('equitybot_use_gemini', checked ? 'true' : 'false');
        apiSection.style.display = checked ? 'block' : 'none';
        
        // Show notification status message in chat
        appendMessage({
            role: 'system',
            content: checked 
                ? 'Advanced Gemini AI Mode Enabled. Make sure your API key is configured.' 
                : 'Local NLP Mode Enabled. Assistant commands will execute instantly and offline.'
        });
        scrollToBottom();
    });

    // Save API key
    document.getElementById('equitybot-save-key-btn').addEventListener('click', handleSaveApiKey);
    document.getElementById('equitybot-api-key-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSaveApiKey();
    });

    // Confirmation buttons
    document.getElementById('equitybot-confirm-btn').addEventListener('click', () => {
        hideConfirmation();
        confirmPendingAction();
    });
    document.getElementById('equitybot-cancel-btn').addEventListener('click', () => {
        hideConfirmation();
        rejectPendingAction();
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
        if (isOpen && chatContainer && !chatContainer.contains(e.target) && 
            !document.getElementById('equitybot-fab').contains(e.target)) {
            closePanel();
        }
    });

    // Escape to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            closePanel();
        }
    });
}

// ==========================================
// Panel Toggle
// ==========================================

function togglePanel() {
    if (isOpen) {
        closePanel();
    } else {
        openPanel();
    }
}

function openPanel() {
    isOpen = true;
    chatContainer.classList.add('equitybot-panel--open');
    chatContainer.setAttribute('aria-hidden', 'false');
    document.getElementById('equitybot-fab').classList.add('equitybot-fab--hidden');
    
    // Focus input after animation
    setTimeout(() => inputField.focus(), 350);
    scrollToBottom();
}

function closePanel() {
    isOpen = false;
    isSettingsOpen = false;
    chatContainer.classList.remove('equitybot-panel--open');
    chatContainer.setAttribute('aria-hidden', 'true');
    document.getElementById('equitybot-fab').classList.remove('equitybot-fab--hidden');
    document.getElementById('equitybot-settings').style.display = 'none';
}

function toggleSettings() {
    isSettingsOpen = !isSettingsOpen;
    const settings = document.getElementById('equitybot-settings');
    settings.style.display = isSettingsOpen ? 'block' : 'none';

    if (isSettingsOpen) {
        const keyInput = document.getElementById('equitybot-api-key-input');
        const existing = getApiKey();
        if (existing) {
            keyInput.value = existing.slice(0, 8) + '...' + existing.slice(-4);
        }
        keyInput.focus();
    }
}

// ==========================================
// Message Handling
// ==========================================

function handleSend() {
    const text = inputField.value.trim();
    if (!text) return;

    inputField.value = '';
    inputField.style.height = 'auto';
    sendButton.disabled = true;
    hideSuggestions();

    sendMessage(text);
}

function handleInputChange() {
    // Auto-resize textarea
    inputField.style.height = 'auto';
    inputField.style.height = Math.min(inputField.scrollHeight, 120) + 'px';

    // Enable/disable send button
    sendButton.disabled = !inputField.value.trim();
}

function handleNewMessage(message) {
    appendMessage(message);

    if (message.pending) {
        showConfirmation();
    }

    scrollToBottom();
}

function handleTypingState(isTyping) {
    typingIndicator.style.display = isTyping ? 'flex' : 'none';
    document.getElementById('equitybot-status').textContent = isTyping ? 'Thinking...' : 'Ready';

    if (isTyping) {
        scrollToBottom();
    }
}

// ==========================================
// Message Rendering
// ==========================================

function appendMessage(message) {
    const el = document.createElement('div');
    el.className = `equitybot-message equitybot-message--${message.role}`;

    if (message.role === 'user') {
        el.innerHTML = `<div class="equitybot-message-content">${escapeHtml(message.content)}</div>`;
    } else if (message.role === 'assistant') {
        el.innerHTML = `
            <div class="equitybot-message-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27a7 7 0 0 1-12.46 0H6a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                </svg>
            </div>
            <div class="equitybot-message-content">${renderMarkdown(message.content)}</div>`;
    } else if (message.role === 'tool') {
        const status = message.toolExecution?.status || 'success';
        const icon = status === 'success' ? '✅' : '❌';
        el.innerHTML = `
            <div class="equitybot-message-avatar equitybot-message-avatar--tool">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
            </div>
            <div class="equitybot-message-content equitybot-tool-card equitybot-tool-card--${status}">
                <span class="equitybot-tool-icon">${icon}</span>
                <span>${escapeHtml(message.content)}</span>
            </div>`;
    } else if (message.role === 'error') {
        el.innerHTML = `
            <div class="equitybot-message-content equitybot-message--error-content">
                <span>⚠️ ${escapeHtml(message.content)}</span>
            </div>`;
    } else if (message.role === 'system') {
        el.innerHTML = `
            <div class="equitybot-message-content equitybot-message--system-content">
                ${escapeHtml(message.content)}
            </div>`;
    }

    messagesContainer.appendChild(el);
}

/**
 * Render basic markdown to HTML (bold, italic, code, line breaks)
 */
function renderMarkdown(text) {
    if (!text) return '';

    return escapeHtml(text)
        // Code blocks
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // Line breaks (double newline = paragraph, single = br)
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// Suggestions
// ==========================================

function renderSuggestions() {
    const container = document.getElementById('equitybot-suggestions');
    const actions = getSuggestedActions();

    container.innerHTML = actions.map(action => 
        `<button class="equitybot-suggestion-chip" data-prompt="${escapeHtml(action.prompt)}">${action.text}</button>`
    ).join('');

    container.style.display = 'flex';

    // Bind click events
    container.querySelectorAll('.equitybot-suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.dataset.prompt;
            inputField.value = prompt;
            handleSend();
        });
    });
}

function hideSuggestions() {
    document.getElementById('equitybot-suggestions').style.display = 'none';
}

// ==========================================
// Confirmation
// ==========================================

function showConfirmation() {
    confirmationBar.style.display = 'flex';
}

function hideConfirmation() {
    confirmationBar.style.display = 'none';
}

// ==========================================
// Settings
// ==========================================

function handleSaveApiKey() {
    const keyInput = document.getElementById('equitybot-api-key-input');
    const rawValue = keyInput.value.trim();

    // If the value contains the masked format, user didn't change it
    if (rawValue.includes('...') && rawValue.length < 20) {
        document.getElementById('equitybot-settings').style.display = 'none';
        isSettingsOpen = false;
        return;
    }

    if (!rawValue || rawValue.length < 10) {
        document.getElementById('equitybot-key-status').textContent = '❌ Please enter a valid API key';
        document.getElementById('equitybot-key-status').className = 'equitybot-settings-note equitybot-key-error';
        return;
    }

    setApiKey(rawValue);
    updateKeyStatus();
    keyInput.value = rawValue.slice(0, 8) + '...' + rawValue.slice(-4);

    // Close settings after short delay
    setTimeout(() => {
        document.getElementById('equitybot-settings').style.display = 'none';
        isSettingsOpen = false;

        // Show welcome message if this is the first time
        if (messagesContainer.children.length === 0) {
            showWelcomeMessage();
        }
    }, 800);
}

function updateKeyStatus() {
    const statusEl = document.getElementById('equitybot-key-status');
    if (isApiKeyConfigured()) {
        statusEl.textContent = '✅ API key configured';
        statusEl.className = 'equitybot-settings-note equitybot-key-success';
    } else {
        statusEl.textContent = 'No API key set';
        statusEl.className = 'equitybot-settings-note';
    }
}

// ==========================================
// Welcome
// ==========================================

function showWelcomeMessage() {
    const useGemini = localStorage.getItem('equitybot_use_gemini') === 'true';
    const modeDesc = useGemini 
        ? "Advanced Gemini AI mode is enabled." 
        : "Local NLP mode is enabled (instant, free, and offline-first).";

    appendMessage({
        role: 'assistant',
        content: `👋 Hi! I'm **EquityBot**, your AI finance assistant.\n\nI can help you manage your finances right from this chat — update income, add investments, check your net worth, and more.\n\n*Currently: ${modeDesc}*\n\nTry asking me something or click a suggestion below!`,
        timestamp: Date.now()
    });
}

// ==========================================
// Utilities
// ==========================================

function scrollToBottom() {
    requestAnimationFrame(() => {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    });
}
