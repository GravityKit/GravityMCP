/**
 * Logger utility for MCP server
 * Handles logging in both MCP mode (JSON-RPC) and test mode (console)
 */

// Detect if running as MCP server or in test mode
const isMCPMode = !process.env.NODE_ENV || process.env.NODE_ENV === 'production';

/**
 * Send a log message that works in both MCP and test modes
 * In MCP mode: sends JSON-RPC notification to stderr to avoid stdout conflicts
 * In test mode: uses console.log
 */
export function sendLogMessage(message, level = 'info') {
  if (isMCPMode) {
    // In MCP mode, use stderr to avoid conflicting with JSON-RPC on stdout
    // Claude Desktop will still see these in the logs
    if (level === 'error') {
      console.error(message);
    } else {
      // Use stderr for all logs in MCP mode to keep stdout clean for JSON-RPC
      console.error(`[${level}] ${message}`);
    }
  } else {
    // In test mode, use regular console.log
    if (level === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  }
}

export default {
  info: (message) => sendLogMessage(message, 'info'),
  error: (message) => sendLogMessage(message, 'error'),
  warn: (message) => sendLogMessage(message, 'warn'),
  debug: (message) => sendLogMessage(message, 'debug')
};