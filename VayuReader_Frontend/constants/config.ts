const env = (globalThis as any)?.process?.env || {};
const backendUrl = env.EXPO_PUBLIC_BACKEND_URL || 'https://iaf-00xf.onrender.com';
export const AUTH_BASE_URL = backendUrl;
export const PDF_BASE_URL = backendUrl;
export const DICT_BASE_URL = backendUrl;
export const ABBR_BASE_URL = backendUrl;