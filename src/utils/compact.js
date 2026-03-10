/**
 * Compact utility — strips null and empty string values from objects/arrays recursively.
 * Used by wrapHandler() to reduce token usage in MCP responses.
 *
 * Strips: null, ''
 * Preserves: false (semantic meaning, e.g. is_active: false), 0, "0"
 * Pass compact=false to get raw unstripped data when you need to see blank fields.
 */

/**
 * Recursively strip null and '' values from an object or array.
 * @param {*} obj - Value to compact
 * @returns {*} Compacted value
 */
export function stripEmpty(obj) {
  if (Array.isArray(obj)) {
    return obj.map(stripEmpty);
  }
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === '') continue;
      result[key] = stripEmpty(value);
    }
    return result;
  }
  return obj;
}

export default { stripEmpty };
