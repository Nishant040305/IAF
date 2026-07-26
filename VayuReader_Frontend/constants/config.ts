const env = (globalThis as any)?.process?.env || {};
const backendUrl = env.EXPO_PUBLIC_AUTH_BASE_URL || env.EXPO_PUBLIC_BACKEND_URL || 'https://vayureader.nmohan.tech';
export const AUTH_BASE_URL = env.EXPO_PUBLIC_AUTH_BASE_URL || backendUrl;
export const PDF_BASE_URL = env.EXPO_PUBLIC_PDF_BASE_URL || backendUrl;