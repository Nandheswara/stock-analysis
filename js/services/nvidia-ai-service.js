/**
 * NVIDIA AI Service Layer
 * 
 * Provides a standardized client to interact with NVIDIA NIM (build.nvidia.com)
 * through our serverless Cloudflare Worker or local Node.js proxy.
 * 
 * Default Model: nvidia/nemotron-3.5-lightning-30b-a3b (Fast MoE Reasoning Model)
 * 
 * @module nvidia-ai-service
 */

const STORAGE_KEYS = {
    API_KEY: 'equity_nvidia_api_key',
    PROXY_URL: 'equity_nvidia_proxy_url',
    MODEL: 'equity_nvidia_model'
};

// Default public proxy or local fallback
const DEFAULT_CONFIG = {
    model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    apiKey: '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',
    // In local dev it tries local proxy, in production it uses Cloudflare Worker proxy or direct if CORS supported
    localProxyUrl: 'http://localhost:8080/nvidia/chat',
    defaultWorkerUrl: 'https://equity-card-ai.nandheswara21.workers.dev'
};

/**
 * Get current NVIDIA service configuration
 */
export function getNvidiaConfig() {
    const isBrowser = typeof window !== 'undefined';
    const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    const savedKey = isBrowser && window.localStorage ? localStorage.getItem(STORAGE_KEYS.API_KEY) : null;
    const savedProxy = isBrowser && window.localStorage ? localStorage.getItem(STORAGE_KEYS.PROXY_URL) : null;
    const savedModel = isBrowser && window.localStorage ? localStorage.getItem(STORAGE_KEYS.MODEL) : null;

    let activeProxyUrl = savedProxy;
    if (!activeProxyUrl) {
        // Use the live Cloudflare Worker proxy by default everywhere (both localhost and GitHub Pages)
        activeProxyUrl = DEFAULT_CONFIG.defaultWorkerUrl;
    }

    return {
        model: savedModel || DEFAULT_CONFIG.model,
        apiKey: savedKey || DEFAULT_CONFIG.apiKey,
        proxyUrl: activeProxyUrl,
        isCustomProxy: Boolean(savedProxy)
    };
}

/**
 * Save user overrides for NVIDIA config
 */
export function setNvidiaConfig({ apiKey, proxyUrl, model } = {}) {
    if (apiKey !== undefined) {
        if (apiKey.trim()) localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey.trim());
        else localStorage.removeItem(STORAGE_KEYS.API_KEY);
    }
    if (proxyUrl !== undefined) {
        if (proxyUrl.trim()) localStorage.setItem(STORAGE_KEYS.PROXY_URL, proxyUrl.trim());
        else localStorage.removeItem(STORAGE_KEYS.PROXY_URL);
    }
    if (model !== undefined) {
        if (model.trim()) localStorage.setItem(STORAGE_KEYS.MODEL, model.trim());
        else localStorage.removeItem(STORAGE_KEYS.MODEL);
    }
}

/**
 * Send chat completion request to NVIDIA NIM
 * 
 * @param {Array<{role: string, content: string}>} messages
 * @param {Object} options
 * @returns {Promise<{content: string, reasoning: string, usage: Object}>}
 */
export async function callNvidiaChat(messages, options = {}) {
    const config = getNvidiaConfig();
    const model = options.model || config.model;
    const temperature = options.temperature !== undefined ? options.temperature : 0.2;
    const maxTokens = options.maxTokens || 4096;

    const payload = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        chat_template_kwargs: { enable_thinking: false }
    };

    let targetUrl = config.proxyUrl;

    const headers = {
        'Content-Type': 'application/json'
    };

    // If calling local proxy or direct, pass authorization header
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    let response;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

        response = await fetch(targetUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
    } catch (networkErr) {
        // Fallback: If local proxy failed and user is local, or vice versa, attempt fallback
        if (window.location.hostname === 'localhost' && targetUrl === DEFAULT_CONFIG.localProxyUrl) {
            console.warn('[NVIDIA AI] Local proxy not reachable, attempting direct/worker endpoint fallback...');
            try {
                response = await fetch(DEFAULT_CONFIG.defaultWorkerUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload)
                });
            } catch (fallbackErr) {
                throw new Error(`Failed to connect to proxy (${networkErr.message}). Ensure either local proxy (node js/cors-proxy.js) or Cloudflare Worker is active.`);
            }
        } else {
            throw new Error(`Connection error to AI service: ${networkErr.message}. Check your internet connection or proxy settings.`);
        }
    }

    if (!response.ok) {
        let errMessage = `HTTP ${response.status} ${response.statusText}`;
        try {
            const errJson = await response.json();
            errMessage = errJson.error?.message || errJson.error || errJson.message || errMessage;
        } catch (_) {
            const errText = await response.text();
            if (errText) errMessage = errText.slice(0, 200);
        }
        throw new Error(`NVIDIA AI Error: ${errMessage}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice || !choice.message) {
        throw new Error('NVIDIA AI returned an empty or invalid completion format.');
    }

    const content = choice.message.content || '';
    const reasoning = choice.message.reasoning_content || '';

    return {
        content,
        reasoning,
        usage: data.usage || {},
        model: data.model || model
    };
}
