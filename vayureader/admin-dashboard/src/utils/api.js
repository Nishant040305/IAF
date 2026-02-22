import axios from 'axios';
import { clearAdminToken, getAdminToken } from './adminToken';
import {
    getSessionKey,
    encrypt,
    decrypt,
    clearKeyCache
} from './encryption';
import { createDpopProof, clearDpopKeys } from './dpop';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
console.log('[API DEBUG] Base URL:', BASE_URL, 'ENV:', process.env.REACT_APP_API_BASE_URL);

// =============================================================================
// EXCLUDED PATHS — never encrypted (login / recovery / public)
// =============================================================================

const E2EE_EXCLUDED = [
    '/api/admin/login',
    '/api/auth/request-otp',
    '/api/auth/verify-otp',
    '/api/auth/login',
    '/api/admin/recovery',
    '/api/recovery',
];

const isExcluded = (url) => {
    if (!url) return true;
    return E2EE_EXCLUDED.some(path => url.includes(path));
};

// =============================================================================
// SECURITY ALERT — potential interception / tamper detection
// =============================================================================

let _securityAlertShown = false;

const showSecurityAlert = () => {
    if (_securityAlertShown) return;
    _securityAlertShown = true;
    const message =
        '⚠️ SECURITY ALERT\n\n' +
        'Secure communication with the server has been compromised.\n' +
        'Someone may be intercepting or tampering with your data.\n\n' +
        'Actions to take:\n' +
        '1. Stop all sensitive operations immediately\n' +
        '2. Disconnect from the current network\n' +
        '3. Report this incident to your IT Security authority\n\n' +
        'Do NOT continue using this application on this network.';
    window.alert(message);
    console.error('[E2EE SECURITY] Possible MITM attack detected — response decryption/integrity check failed');
    setTimeout(() => { _securityAlertShown = false; }, 60000);
};

// =============================================================================
// AXIOS INSTANCE
// =============================================================================

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
    },
    withCredentials: true,
    timeout: 60000 // 1-minute timeout specifically optimized to allow bulk uploads to complete
});

// =============================================================================
// REQUEST INTERCEPTOR — encrypt outgoing bodies as text/plain
// =============================================================================

api.interceptors.request.use(async (config) => {
    try {
        const token = getAdminToken();
        if (token) {
            config.headers = config.headers || {};
            if (!config.headers.Authorization && !config.headers.authorization) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            const requestUri = api.getUri(config);
            const proof = await createDpopProof({
                method: config.method || 'GET',
                requestUri,
                accessToken: token
            });
            config.headers.DPoP = proof;
        }

        if (isExcluded(config.url) || !token) return config;

        // Skip multipart (file uploads)
        const ct = config.headers?.['Content-Type'] || config.headers?.['content-type'] || '';
        if (ct.includes('multipart/form-data') || config.data instanceof FormData) return config;

        // Skip empty bodies (GET, DELETE without body)
        if (!config.data || (typeof config.data === 'object' && Object.keys(config.data).length === 0)) return config;

        // Encrypt body → raw base64 text
        const key = await getSessionKey(token);
        if (key) {
            config.data = await encrypt(config.data, key);
            config.headers['Content-Type'] = 'text/plain';
        }
    } catch (err) {
        console.error('[E2EE] Request encryption failed:', err);
    }
    return config;
}, (error) => Promise.reject(error));

// =============================================================================
// RESPONSE INTERCEPTOR — decrypt text/plain responses
// =============================================================================

api.interceptors.response.use(
    async (response) => {
        // Encrypted response arrives as text/plain
        const contentType = response.headers?.['content-type'] || '';
        if (contentType.includes('text/plain') && typeof response.data === 'string' && response.data.length > 0) {
            const token = getAdminToken();
            if (token && !isExcluded(response.config?.url)) {
                try {
                    const key = await getSessionKey(token);
                    if (key) {
                        const decrypted = await decrypt(response.data, key);
                        response.data = JSON.parse(decrypted);
                    }
                } catch (err) {
                    console.error('[E2EE] Response decryption failed:', err);
                    showSecurityAlert();
                    return Promise.reject(new Error('E2EE: Secure communication compromised'));
                }
            }
        }
        return response;
    },
    async (error) => {
        // Try to decrypt encrypted error responses
        const errorContentType = error.response?.headers?.['content-type'] || '';
        if (errorContentType.includes('text/plain') && error.response && typeof error.response.data === 'string' && error.response.data.length > 0) {
            const token = getAdminToken();
            if (token && !isExcluded(error.response.config?.url)) {
                try {
                    const key = await getSessionKey(token);
                    if (key) {
                        const decrypted = await decrypt(error.response.data, key);
                        error.response.data = JSON.parse(decrypted);
                    }
                } catch {
                    showSecurityAlert();
                }
            }
        }

        if (error.response && error.response.status === 401) {
            localStorage.removeItem('admin_info');
            clearAdminToken();
            clearKeyCache();
            clearDpopKeys();
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
