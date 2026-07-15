/**
 * Gemini API Client
 * 
 * Thin wrapper around the Gemini REST API with function-calling support.
 * Uses the free-tier Gemini 2.0 Flash model via generativelanguage.googleapis.com.
 * 
 * @module gemini-client
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const API_KEY_STORAGE_KEY = 'equitybot_gemini_api_key';

/**
 * Get the stored API key from localStorage
 * @returns {string|null}
 */
export function getApiKey() {
    try {
        return localStorage.getItem(API_KEY_STORAGE_KEY);
    } catch {
        return null;
    }
}

/**
 * Store the API key in localStorage
 * @param {string} key 
 */
export function setApiKey(key) {
    try {
        localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
    } catch {
        // Storage error — non-critical
    }
}

/**
 * Check if API key is configured
 * @returns {boolean}
 */
export function isApiKeyConfigured() {
    const key = getApiKey();
    return !!(key && key.length > 10);
}

/**
 * Convert tool definitions to Gemini function declarations format
 * @param {Array} tools - Array of tool objects from the tool registry
 * @returns {Array} Gemini-formatted function declarations
 */
function toGeminiFunctionDeclarations(tools) {
    return tools.map(tool => {
        const properties = {};
        const required = [];

        if (tool.parameters) {
            Object.entries(tool.parameters).forEach(([name, param]) => {
                properties[name] = {
                    type: param.type.toUpperCase(),
                    description: param.description
                };
                if (param.enum) {
                    properties[name].enum = param.enum;
                }
                if (param.required) {
                    required.push(name);
                }
            });
        }

        return {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'OBJECT',
                properties,
                required
            }
        };
    });
}

/**
 * Send a request to the Gemini API with function-calling support.
 * Automatically retries on rate-limit (429) errors with exponential backoff.
 * 
 * @param {Object} options
 * @param {string} options.systemInstruction - System prompt
 * @param {Array} options.contents - Conversation history in Gemini format
 * @param {Array} [options.tools] - Tool definitions from tool registry
 * @param {AbortSignal} [options.signal] - AbortController signal
 * @returns {Promise<Object>} Response with either text or functionCall
 */
export async function callGemini({ systemInstruction, contents, tools = [], signal }) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new GeminiError('API key not configured. Please set your Gemini API key.', 'NO_API_KEY');
    }

    const url = `${GEMINI_API_BASE}/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;

    const body = {
        contents,
        generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048
        }
    };

    // Add system instruction
    if (systemInstruction) {
        body.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    // Add tool declarations if provided
    if (tools.length > 0) {
        body.tools = [{
            functionDeclarations: toGeminiFunctionDeclarations(tools)
        }];
        body.toolConfig = {
            functionCallingConfig: {
                mode: 'AUTO'
            }
        };
    }

    const requestBody = JSON.stringify(body);

    // Retry loop with exponential backoff for rate-limit errors
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 2000; // Start with 2 seconds

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
            signal
        });

        if (response.ok) {
            const data = await response.json();
            return parseGeminiResponse(data);
        }

        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${response.status}`;

        // Rate limit — retry with backoff
        if (response.status === 429 && attempt < MAX_RETRIES) {
            const delayMs = BASE_DELAY_MS * Math.pow(2, attempt); // 2s, 4s, 8s
            console.log(`[EquityBot] Rate limited. Retrying in ${delayMs / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
            await delay(delayMs);
            continue;
        }

        // Non-retryable errors
        if (response.status === 400 && message.includes('API key')) {
            throw new GeminiError('Invalid API key. Please check your Gemini API key.', 'INVALID_API_KEY');
        }
        if (response.status === 429) {
            throw new GeminiError('Rate limit exceeded. Please wait about 30 seconds and try again. The free Gemini tier allows 15 requests per minute.', 'RATE_LIMITED');
        }
        if (response.status === 403) {
            throw new GeminiError('API key does not have access. Please enable the Generative Language API.', 'FORBIDDEN');
        }

        throw new GeminiError(`Gemini API error: ${message}`, 'API_ERROR');
    }
}

/**
 * Utility: wait for a specified number of milliseconds
 * @param {number} ms 
 * @returns {Promise<void>}
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse the Gemini API response into a standardized format
 * @param {Object} data - Raw API response
 * @returns {Object} Parsed response
 */
function parseGeminiResponse(data) {
    const candidate = data?.candidates?.[0];
    if (!candidate) {
        // Check for safety block
        if (data?.promptFeedback?.blockReason) {
            return {
                type: 'text',
                text: 'I apologize, but I cannot process that request. Please try rephrasing.',
                finishReason: 'SAFETY'
            };
        }
        throw new GeminiError('No response from Gemini API', 'EMPTY_RESPONSE');
    }

    const parts = candidate.content?.parts || [];
    const finishReason = candidate.finishReason || 'STOP';

    // Check for function call
    const functionCallPart = parts.find(p => p.functionCall);
    if (functionCallPart) {
        return {
            type: 'functionCall',
            functionCall: {
                name: functionCallPart.functionCall.name,
                args: functionCallPart.functionCall.args || {}
            },
            // Return the full model content for conversation threading
            modelContent: candidate.content,
            finishReason
        };
    }

    // Text response
    const textParts = parts.filter(p => p.text).map(p => p.text);
    return {
        type: 'text',
        text: textParts.join(''),
        modelContent: candidate.content,
        finishReason
    };
}

/**
 * Build a function response content object for the conversation
 * @param {string} name - Function name
 * @param {Object} result - Function execution result
 * @returns {Object} Gemini-format function response content
 */
export function buildFunctionResponse(name, result) {
    return {
        role: 'user',
        parts: [{
            functionResponse: {
                name,
                response: result
            }
        }]
    };
}

/**
 * Build a user message content object
 * @param {string} text - User message
 * @returns {Object} Gemini-format user content
 */
export function buildUserMessage(text) {
    return {
        role: 'user',
        parts: [{ text }]
    };
}

/**
 * Build a model message content object
 * @param {string} text - Model response text
 * @returns {Object} Gemini-format model content
 */
export function buildModelMessage(text) {
    return {
        role: 'model',
        parts: [{ text }]
    };
}

/**
 * Custom error class for Gemini API errors
 */
export class GeminiError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'GeminiError';
        this.code = code;
    }
}
