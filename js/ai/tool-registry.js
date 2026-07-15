/**
 * Tool Registry
 * 
 * Central registry for all tools available to the AI agent.
 * Tools are page-scoped so only relevant tools are sent to the LLM.
 * 
 * @module tool-registry
 */

/**
 * @typedef {Object} ToolParameter
 * @property {string} type - Parameter type (string, number, boolean)
 * @property {string} description - Human-readable description
 * @property {boolean} [required] - Whether the parameter is required
 * @property {Array<string>} [enum] - Allowed values
 */

/**
 * @typedef {Object} ToolDefinition
 * @property {string} name - Unique tool name
 * @property {string} description - Description for the LLM
 * @property {Object<string, ToolParameter>} parameters - Parameter definitions
 * @property {Function} handler - Async function that executes the tool
 * @property {Array<string>} pages - Pages where this tool is available
 * @property {boolean} [requiresConfirmation] - Whether the tool requires user confirmation
 * @property {string} [category] - Tool category (read, write, navigate)
 */

const registry = new Map();

/**
 * Register a tool
 * @param {ToolDefinition} tool 
 */
export function registerTool(tool) {
    if (!tool.name || !tool.handler) {
        console.warn(`[ToolRegistry] Invalid tool definition: missing name or handler`);
        return;
    }
    registry.set(tool.name, tool);
}

/**
 * Register multiple tools at once
 * @param {Array<ToolDefinition>} tools 
 */
export function registerTools(tools) {
    tools.forEach(tool => registerTool(tool));
}

/**
 * Get a tool by name
 * @param {string} name 
 * @returns {ToolDefinition|undefined}
 */
export function getTool(name) {
    return registry.get(name);
}

/**
 * Get all tools available for a given page
 * @param {string} page - Current page identifier (e.g., 'finance-tracker')
 * @returns {Array<ToolDefinition>}
 */
export function getToolsForPage(page) {
    const tools = [];
    registry.forEach(tool => {
        if (tool.pages.includes('*') || tool.pages.includes(page)) {
            tools.push(tool);
        }
    });
    return tools;
}

/**
 * Get tool schemas (for LLM prompt) for a given page
 * Returns only the name, description, and parameters — not the handler
 * @param {string} page 
 * @returns {Array<Object>}
 */
export function getToolSchemasForPage(page) {
    return getToolsForPage(page).map(({ name, description, parameters }) => ({
        name,
        description,
        parameters
    }));
}

/**
 * Execute a tool by name with given arguments
 * @param {string} name - Tool name
 * @param {Object} args - Arguments to pass to the handler
 * @returns {Promise<Object>} Execution result
 */
export async function executeTool(name, args) {
    const tool = registry.get(name);
    if (!tool) {
        return {
            success: false,
            error: `Unknown tool: ${name}`
        };
    }

    try {
        const result = await tool.handler(args);
        return {
            success: true,
            toolName: name,
            requiresConfirmation: tool.requiresConfirmation || false,
            category: tool.category || 'unknown',
            ...result
        };
    } catch (error) {
        return {
            success: false,
            toolName: name,
            error: error.message || 'Tool execution failed'
        };
    }
}

/**
 * Check if a tool requires user confirmation before execution
 * @param {string} name - Tool name
 * @returns {boolean}
 */
export function toolRequiresConfirmation(name) {
    const tool = registry.get(name);
    return tool ? (tool.requiresConfirmation || false) : false;
}

/**
 * Get all registered tool names
 * @returns {Array<string>}
 */
export function getAllToolNames() {
    return Array.from(registry.keys());
}

/**
 * Clear all registered tools (useful for testing)
 */
export function clearRegistry() {
    registry.clear();
}
