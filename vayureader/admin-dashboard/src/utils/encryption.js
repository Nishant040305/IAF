/**
 * Client-Side E2EE Utility
 * 
 * Derives encryption keys from the JWT payload (id + contact + tokenVersion)
 * using the same HKDF algorithm as the server. No key exchange needed — both
 * sides independently compute the same key from the same identity fields.
 * 
 * Uses the Web Crypto API (built into browsers, no dependencies).
 */

// =============================================================================
// CONSTANTS — must exactly match server's encryption.service.js
// =============================================================================

const HKDF_SALT = 'vayureader-e2ee-v1';
const HKDF_INFO = 'api-payload-encryption';
const IV_LENGTH = 12;   // 96-bit IV for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

// =============================================================================
// HELPERS
// =============================================================================

const encode = (str) => new TextEncoder().encode(str);
const decode = (buf) => new TextDecoder().decode(buf);

const bufToBase64 = (buf) => {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const base64ToBuf = (b64) => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

// =============================================================================
// JWT PAYLOAD EXTRACTION
// =============================================================================

/**
 * Decode JWT payload (base64url → JSON).
 * Does NOT verify signature — just reads the payload.
 */
function decodeJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padding = '='.repeat((4 - (base64.length % 4)) % 4);
        return JSON.parse(atob(base64 + padding));
    } catch {
        return null;
    }
}

/**
 * Extract E2EE identity fields from a JWT token.
 * @param {string} token - JWT token string
 * @returns {{ id: string, contact: string, tokenVersion: number }|null}
 */
export function extractIdentity(token) {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;

    if (payload.type === 'admin') {
        return {
            id: String(payload.adminId),
            contact: payload.contact,
            tokenVersion: typeof payload.tokenVersion === 'number' ? payload.tokenVersion : 0
        };
    }
    if (payload.type === 'user') {
        return {
            id: String(payload.userId),
            contact: payload.phone_number,
            tokenVersion: typeof payload.tokenVersion === 'number' ? payload.tokenVersion : 0
        };
    }
    return null;
}

// =============================================================================
// KEY DERIVATION — mirrors server's HKDF exactly
// =============================================================================

/**
 * Derive AES-256-GCM key from identity fields.
 * Algorithm (matches server):
 *   IKM  = "${id}:${contact}:${tokenVersion}"
 *   PRK  = HMAC-SHA256(salt, IKM)
 *   OKM  = HMAC-SHA256(PRK, info || 0x01)[0..31]
 * 
 * @param {string} id - User/Admin MongoDB ObjectId
 * @param {string} contact - Phone number / contact
 * @param {number} tokenVersion - Token version
 * @returns {Promise<CryptoKey>} AES-256-GCM CryptoKey
 */
export async function deriveKey(id, contact, tokenVersion) {
    const ikm = `${id}:${contact}:${tokenVersion}`;

    // HKDF-Extract: PRK = HMAC-SHA256(salt, IKM)
    const saltKey = await crypto.subtle.importKey(
        'raw', encode(HKDF_SALT), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const prk = await crypto.subtle.sign('HMAC', saltKey, encode(ikm));

    // HKDF-Expand: OKM = HMAC-SHA256(PRK, info || 0x01)
    const prkKey = await crypto.subtle.importKey(
        'raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const infoWithCounter = new Uint8Array([...encode(HKDF_INFO), 0x01]);
    const okm = await crypto.subtle.sign('HMAC', prkKey, infoWithCounter);

    // Import first 32 bytes as AES-256-GCM key
    return crypto.subtle.importKey(
        'raw', okm.slice(0, 32), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
    );
}

/**
 * Derive E2EE key directly from a JWT token string.
 * @param {string} token - JWT token
 * @returns {Promise<CryptoKey|null>}
 */
export async function deriveKeyFromToken(token) {
    const identity = extractIdentity(token);
    if (!identity) return null;
    return deriveKey(identity.id, identity.contact, identity.tokenVersion);
}

// =============================================================================
// KEY CACHE — avoids re-deriving on every API call
// =============================================================================

let _cachedKey = null;
let _cachedToken = null;

/**
 * Get the E2EE key for a given token, using cache when possible.
 * @param {string} token - JWT token
 * @returns {Promise<CryptoKey|null>}
 */
export async function getSessionKey(token) {
    if (!token) return null;
    if (_cachedKey && _cachedToken === token) return _cachedKey;
    _cachedKey = await deriveKeyFromToken(token);
    _cachedToken = token;
    return _cachedKey;
}

/**
 * Clear the key cache (call on logout).
 */
export function clearKeyCache() {
    _cachedKey = null;
    _cachedToken = null;
}

// =============================================================================
// ENCRYPTION / DECRYPTION
// =============================================================================

/**
 * Encrypt data with AES-256-GCM.
 * Output: base64(IV || ciphertext || authTag)
 * 
 * @param {Object|string} data - Data to encrypt
 * @param {CryptoKey} key - AES-256-GCM key
 * @returns {Promise<string>} Base64-encoded encrypted payload
 */
export async function encrypt(data, key) {
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Web Crypto AES-GCM returns ciphertext+tag concatenated
    const cipherBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: TAG_LENGTH * 8 },
        key,
        encode(plaintext)
    );

    // Pack: IV (12) + ciphertext+authTag
    const packed = new Uint8Array(IV_LENGTH + cipherBuf.byteLength);
    packed.set(iv, 0);
    packed.set(new Uint8Array(cipherBuf), IV_LENGTH);

    return bufToBase64(packed.buffer);
}

/**
 * Decrypt AES-256-GCM payload.
 * 
 * @param {string} encryptedBase64 - base64(IV || ciphertext || authTag)
 * @param {CryptoKey} key - AES-256-GCM key
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decrypt(encryptedBase64, key) {
    const packed = new Uint8Array(base64ToBuf(encryptedBase64));
    const iv = packed.slice(0, IV_LENGTH);
    const cipherAndTag = packed.slice(IV_LENGTH);

    const decryptedBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, tagLength: TAG_LENGTH * 8 },
        key,
        cipherAndTag
    );

    return decode(decryptedBuf);
}
