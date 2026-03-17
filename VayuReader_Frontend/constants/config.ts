const env = (globalThis as any)?.process?.env || {};
const backendUrl = env.EXPO_PUBLIC_AUTH_BASE_URL || env.EXPO_PUBLIC_BACKEND_URL || 'https://reader.afcel.in';
export const AUTH_BASE_URL = env.EXPO_PUBLIC_AUTH_BASE_URL || backendUrl;
export const PDF_BASE_URL = env.EXPO_PUBLIC_PDF_BASE_URL || backendUrl;
export const DICT_BASE_URL = env.EXPO_PUBLIC_DICT_BASE_URL || backendUrl;
export const ABBR_BASE_URL = env.EXPO_PUBLIC_ABBR_BASE_URL || backendUrl;

/**
 * SECURITY_BYPASS: When 'true', disables E2EE encryption/decryption
 * on API requests and responses. Useful for debugging with plain JSON.
 * Set via EXPO_PUBLIC_SECURITY_BYPASS=true in .env or app config.
 */
export const SECURITY_BYPASS = (env.EXPO_PUBLIC_SECURITY_BYPASS || 'true') === 'true';