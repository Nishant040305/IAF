/**
 * Input Sanitization Utilities
 * 
 * Provides functions for safely handling user input to prevent
 * injection attacks (ReDoS, NoSQL injection, etc.)
 * 
 * @module utils/sanitize
 */



/**
 * Escapes special regex characters to prevent ReDoS attacks.
 * Use this before passing user input to RegExp or $regex queries.
 * 
 * @param {string} str - User input string
 * @returns {string} - Escaped string safe for regex
 * 
 * @example
 * const safe = escapeRegex('(a+)+'); // Returns '\(a\+\)\+'
 * db.find({ name: { $regex: safe, $options: 'i' } });
 */
const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Validates if a string is a valid UUID v4.
 * 
 * @param {string} id - String to validate
 * @returns {boolean} - True if valid UUID
 * 
 * @example
 * if (!isValidId(req.params.id)) {
 *   return res.status(400).json({ error: 'Invalid ID format' });
 * }
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidObjectId = (id) => {
    return typeof id === 'string' && UUID_REGEX.test(id);
};

/**
 * Sanitizes a phone number by removing non-digit characters.
 * 
 * @param {string} phone - Phone number input
 * @returns {string} - Cleaned phone number (digits only)
 */
const sanitizePhone = (phone) => {
    if (typeof phone !== 'string') return '';
    return phone.replace(/\D/g, '');
};

/**
 * Trims and normalizes a name string.
 * 
 * @param {string} name - Name input
 * @returns {string} - Trimmed name
 */
const sanitizeName = (name) => {
    if (typeof name !== 'string') return '';
    return name.trim().replace(/\s+/g, ' ');
};

/**
 * Creates a safe regex for case-insensitive exact match.
 * 
 * @param {string} str - String to match
 * @returns {RegExp} - Safe regex for exact match
 */
const createExactMatchRegex = (str) => {
    return new RegExp(`^${escapeRegex(str)}$`, 'i');
};

/**
 * Creates a safe regex for partial match (contains).
 * 
 * @param {string} str - String to search for
 * @returns {RegExp} - Safe regex for partial match
 */
const createContainsRegex = (str) => {
    return new RegExp(escapeRegex(str), 'i');
};

/**
 * Pattern for safe tags/categories (alphanumeric, spaces, hyphens, underscores only).
 * Blocks special characters that could be used for injection attacks.
 */
const SAFE_TAG_PATTERN = /^[a-zA-Z0-9\s\-_]+$/;

/**
 * Pattern for safe synonyms/antonyms (alphanumeric, spaces, hyphens, apostrophes).
 * Slightly more permissive for natural language words.
 */
const SAFE_WORD_PATTERN = /^[a-zA-Z0-9\s\-']+$/;

/**
 * Validates and sanitizes a category/tag string.
 * Blocks special characters that could be used for XSS, injection, etc.
 * 
 * @param {string} tag - Tag/category to validate
 * @returns {{valid: boolean, sanitized: string|null, error: string|null}}
 */
const sanitizeTag = (tag) => {
    if (!tag || typeof tag !== 'string') {
        return { valid: false, sanitized: null, error: 'Tag is required' };
    }

    const trimmed = tag.trim();
    
    if (trimmed.length === 0) {
        return { valid: false, sanitized: null, error: 'Tag cannot be empty' };
    }

    if (trimmed.length > 100) {
        return { valid: false, sanitized: null, error: 'Tag cannot exceed 100 characters' };
    }

    if (!SAFE_TAG_PATTERN.test(trimmed)) {
        return { 
            valid: false, 
            sanitized: null, 
            error: 'Tag contains invalid characters. Only letters, numbers, spaces, hyphens, and underscores are allowed.' 
        };
    }

    return { valid: true, sanitized: trimmed, error: null };
};

/**
 * Validates and sanitizes a synonym/antonym word.
 * 
 * @param {string} word - Word to validate
 * @returns {{valid: boolean, sanitized: string|null, error: string|null}}
 */
const sanitizeSynonym = (word) => {
    if (!word || typeof word !== 'string') {
        return { valid: false, sanitized: null, error: 'Word is required' };
    }

    const trimmed = word.trim();
    
    if (trimmed.length === 0) {
        return { valid: false, sanitized: null, error: 'Word cannot be empty' };
    }

    if (trimmed.length > 100) {
        return { valid: false, sanitized: null, error: 'Word cannot exceed 100 characters' };
    }

    if (!SAFE_WORD_PATTERN.test(trimmed)) {
        return { 
            valid: false, 
            sanitized: null, 
            error: 'Word contains invalid characters. Only letters, numbers, spaces, hyphens, and apostrophes are allowed.' 
        };
    }

    return { valid: true, sanitized: trimmed, error: null };
};

/**
 * Validates and sanitizes an array of tags/categories.
 * Returns only valid tags, filtering out invalid ones.
 * 
 * @param {string[]} tags - Array of tags to validate
 * @returns {{valid: string[], invalid: string[]}}
 */
const sanitizeTagArray = (tags) => {
    if (!Array.isArray(tags)) {
        return { valid: [], invalid: [] };
    }

    const valid = [];
    const invalid = [];

    for (const tag of tags) {
        const result = sanitizeTag(tag);
        if (result.valid) {
            valid.push(result.sanitized);
        } else {
            invalid.push(tag);
        }
    }

    return { valid, invalid };
};

/**
 * Validates and sanitizes an array of synonyms/antonyms.
 * Returns only valid words, filtering out invalid ones.
 * 
 * @param {string[]} words - Array of words to validate
 * @returns {{valid: string[], invalid: string[]}}
 */
const sanitizeSynonymArray = (words) => {
    if (!Array.isArray(words)) {
        return { valid: [], invalid: [] };
    }

    const valid = [];
    const invalid = [];

    for (const word of words) {
        const result = sanitizeSynonym(word);
        if (result.valid) {
            valid.push(result.sanitized);
        } else {
            invalid.push(word);
        }
    }

    return { valid, invalid };
};

module.exports = {
    escapeRegex,
    isValidObjectId,
    sanitizePhone,
    sanitizeName,
    createExactMatchRegex,
    createContainsRegex,
    sanitizeTag,
    sanitizeSynonym,
    sanitizeTagArray,
    sanitizeSynonymArray,
    SAFE_TAG_PATTERN,
    SAFE_WORD_PATTERN
};
