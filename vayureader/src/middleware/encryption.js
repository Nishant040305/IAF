/**
 * End-to-End Encryption Middleware
 * 
 * Transparently handles E2EE for ALL authenticated API requests/responses.
 * Encryption is ON by default for any request carrying a valid JWT.
 * 
 * Wire format: raw text/plain base64 (NOT JSON).
 *   - Request:  client sends text/plain base64 → middleware decrypts → JSON in req.body
 *   - Response: controller calls res.json() → middleware encrypts → text/plain base64
 * 
 * Unauthenticated requests (login, recovery, public) pass through as JSON.
 * SSE uses res.write(), not res.json(), so it is unaffected.
 * 
 * @module middleware/encryption
 */

const { encrypt, decrypt, deriveKey } = require('../services/encryption.service');
const { decodeToken } = require('../services/jwt.service');
const response = require('../utils/response');

// =============================================================================
// PATHS TO EXCLUDE FROM ENCRYPTION
// =============================================================================

const EXCLUDED_PATHS = [
    '/api/admin/login',
    '/api/auth/request-otp',
    '/api/auth/verify-otp',
    '/api/auth/login',
    '/api/admin/recovery',
    '/api/recovery',
    '/api/events',           // SSE — uses res.write(), not res.json()
    '/health'
];

const isExcluded = (path) => {
    return EXCLUDED_PATHS.some(excluded => path.startsWith(excluded));
};

// =============================================================================
// IDENTITY EXTRACTION
// =============================================================================

const extractIdentity = (req) => {
    let token = null;

    if (req.cookies) {
        if (req.cookies.admin_token) token = req.cookies.admin_token;
        else if (req.cookies.auth_token) token = req.cookies.auth_token;
    }

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return null;

    const decoded = decodeToken(token);
    if (!decoded) return null;

    if (decoded.type === 'admin') {
        return {
            id: String(decoded.adminId),
            contact: decoded.contact,
            tokenVersion: Number.isInteger(decoded.tokenVersion) ? decoded.tokenVersion : 0
        };
    }

    if (decoded.type === 'user') {
        return {
            id: String(decoded.userId),
            contact: decoded.phone_number,
            tokenVersion: Number.isInteger(decoded.tokenVersion) ? decoded.tokenVersion : 0
        };
    }

    return null;
};

// =============================================================================
// MIDDLEWARE
// =============================================================================

const e2eeMiddleware = (req, res, next) => {
    if (isExcluded(req.originalUrl || req.url)) {
        return next();
    }

    const identity = extractIdentity(req);
    if (!identity) {
        return next();
    }

    const key = deriveKey(identity.id, identity.contact, identity.tokenVersion);
    req._e2eeIdentity = identity;

    // --- RESPONSE ENCRYPTION ---
    // Intercept res.json() → encrypt → send as text/plain
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        try {
            // CRITICAL: Prevent Nginx and Browsers from caching E2EE encrypted payloads!
            // E2EE relies on dynamic, session-specific keys. A cached encrypted payload
            // will fail to decrypt if the user logs out/in or increments token version.
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');

            const encrypted = encrypt(body, key);
            return res.type('text/plain').send(encrypted);
        } catch (err) {
            console.error('[E2EE] Response encryption failed:', err.message);
            return originalJson(body);
        }
    };

    // --- REQUEST DECRYPTION ---
    // Encrypted body arrives as a raw text string (text/plain)
    if (typeof req.body === 'string' && req.body.length > 0) {
        try {
            const decrypted = decrypt(req.body, key);
            req.body = JSON.parse(decrypted);
            req._e2eeDecrypted = true;
        } catch (err) {
            console.error('[E2EE] Request decryption failed:', err.message);
            return response.badRequest(res, 'E2EE: Failed to decrypt request');
        }
    }

    next();
};

const verifyMultipartE2EESignature = (req, res, next) => {
    try {
        if (!req._e2eeIdentity) return next();

        const signature = req.body._e2eeMeta;
        if (!signature) {
            return response.badRequest(res, 'Missing E2EE security signature for file upload');
        }

        const key = deriveKey(req._e2eeIdentity.id, req._e2eeIdentity.contact, req._e2eeIdentity.tokenVersion);
        const decrypted = JSON.parse(decrypt(signature, key));

        if (!decrypted.secureFileMatch || !decrypted.timestamp) {
            return response.badRequest(res, 'Invalid E2EE security signature payload');
        }

        const ageMs = Date.now() - decrypted.timestamp;
        if (ageMs > 5 * 60 * 1000 || ageMs < -60000) {
            return response.badRequest(res, 'E2EE signature expired (replay attack protection)');
        }

        delete req.body._e2eeMeta;
        next();
    } catch (err) {
        console.error('[E2EE] Multipart signature decryption failed:', err.message);
        return response.badRequest(res, 'E2EE signature validation failed. Upload rejected.');
    }
};

module.exports = {
    e2eeMiddleware,
    verifyMultipartE2EESignature,
    extractIdentity,
    isExcluded,
    EXCLUDED_PATHS
};
