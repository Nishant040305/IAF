/**
 * End-to-End Encryption Service
 * 
 * Provides AES-256-GCM encryption/decryption for API payloads.
 * Keys are derived deterministically from user identity using HKDF,
 * so both client and server compute the same key independently.
 * 
 * Key material: userId/adminId + contact/phone_number + tokenVersion
 * 
 * The client derives the same key by reading the JWT payload
 * (which contains id, contact, tokenVersion) and using the same
 * HKDF algorithm. No secret sharing is required.
 * 
 * @module services/encryption.service
 */

const crypto = require('crypto');

// =============================================================================
// CONSTANTS
// =============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;       // 96-bit IV for GCM (NIST recommended)
const TAG_LENGTH = 16;      // 128-bit auth tag
const KEY_LENGTH = 32;      // 256-bit key
const HKDF_SALT = 'vayureader-e2ee-v1';  // Static salt for HKDF domain separation
const HKDF_INFO = 'api-payload-encryption';

// =============================================================================
// KEY DERIVATION
// =============================================================================

/**
 * Derives a deterministic AES-256 encryption key from user identity.
 * Uses HKDF (HMAC-based Key Derivation Function).
 * 
 * Both client and server use the same inputs (extracted from JWT payload)
 * to derive the same key independently. No shared secret is exchanged.
 * 
 * @param {string} id - User's MongoDB ObjectId (userId or adminId)
 * @param {string} contact - User's phone_number or admin's contact
 * @param {number} tokenVersion - Current token version (key rotation on logout)
 * @returns {Buffer} 32-byte AES-256 key
 */
const deriveKey = (id, contact, tokenVersion) => {
    if (!id || !contact || tokenVersion === undefined || tokenVersion === null) {
        throw new Error('E2EE: Missing key derivation parameters (id, contact, tokenVersion)');
    }

    // Input keying material from identity fields
    const ikm = `${id}:${contact}:${tokenVersion}`;
    const salt = Buffer.from(HKDF_SALT, 'utf8');
    const info = Buffer.from(HKDF_INFO, 'utf8');

    // HKDF-Extract: PRK = HMAC-SHA256(salt, IKM)
    const prk = crypto.createHmac('sha256', salt).update(ikm).digest();

    // HKDF-Expand: OKM = HMAC-SHA256(PRK, info || 0x01) truncated to KEY_LENGTH
    const okm = crypto.createHmac('sha256', prk)
        .update(Buffer.concat([info, Buffer.from([0x01])]))
        .digest();

    return okm.subarray(0, KEY_LENGTH);
};

// =============================================================================
// ENCRYPTION / DECRYPTION
// =============================================================================

/**
 * Encrypts a plaintext payload using AES-256-GCM.
 * 
 * Output format: base64(IV || ciphertext || authTag)
 * 
 * @param {string|Object} plaintext - Data to encrypt (objects are JSON-stringified)
 * @param {Buffer} key - 32-byte AES-256 key
 * @returns {string} Base64-encoded encrypted payload
 */
const encrypt = (plaintext, key) => {
    const data = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Pack: IV (12) + ciphertext (variable) + authTag (16)
    const packed = Buffer.concat([iv, encrypted, authTag]);
    return packed.toString('base64');
};

/**
 * Decrypts an AES-256-GCM encrypted payload.
 * 
 * @param {string} encryptedBase64 - Base64-encoded encrypted payload (IV || ciphertext || authTag)
 * @param {Buffer} key - 32-byte AES-256 key
 * @returns {string} Decrypted plaintext
 * @throws {Error} If decryption fails (tampered data, wrong key, etc.)
 */
const decrypt = (encryptedBase64, key) => {
    const packed = Buffer.from(encryptedBase64, 'base64');

    if (packed.length < IV_LENGTH + TAG_LENGTH + 1) {
        throw new Error('E2EE: Encrypted payload too short');
    }

    // Unpack: IV (12) + ciphertext (variable) + authTag (16)
    const iv = packed.subarray(0, IV_LENGTH);
    const authTag = packed.subarray(packed.length - TAG_LENGTH);
    const ciphertext = packed.subarray(IV_LENGTH, packed.length - TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
};

module.exports = {
    deriveKey,
    encrypt,
    decrypt,
    ALGORITHM,
    HKDF_SALT,
    HKDF_INFO
};
