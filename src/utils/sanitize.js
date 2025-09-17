/**
 * Simple sanitization utility for secure logging
 * Obfuscates sensitive data to prevent accidental exposure
 */

/**
 * Keys that contain sensitive data
 */
const SENSITIVE_KEYS = [
  'consumer_key', 'consumer_secret',
  'password', 'token', 'authorization',
  'api_key', 'api_secret', 'bearer',
  'oauth_signature', 'oauth_token',
  'credit_card', 'cvv', 'ssn'
];

/**
 * Mask a sensitive value
 */
function mask(value) {
  // Return null/undefined as-is
  if (value === null || value === undefined) return value;

  // Convert to string for masking
  const str = String(value);
  if (str.length === 0) return '';
  if (str.length <= 8) return '****';
  return str.substring(0, 3) + '****' + str.slice(-2);
}

/**
 * Sanitize an object for logging
 */
export function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(k => keyLower.includes(k));

    if (isSensitive) {
      result[key] = mask(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitize(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Sanitize a URL string
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return url;

  // Mask consumer keys and secrets in URLs
  return url
    .replace(/ck_[a-f0-9]{32}/gi, 'ck_****')
    .replace(/cs_[a-f0-9]{32}/gi, 'cs_****')
    .replace(/(consumer_key|consumer_secret|api_key|token)=([^&]+)/gi, '$1=****');
}

/**
 * Sanitize headers for logging
 */
export function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== 'object') return headers;

  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    const keyLower = key.toLowerCase();

    if (keyLower === 'authorization' || keyLower.includes('api-key')) {
      result[key] = mask(String(value));
    } else {
      result[key] = value;
    }
  }

  return result;
}

export default { sanitize, sanitizeUrl, sanitizeHeaders };