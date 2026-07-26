/**
 * File Upload Validation Utility
 * Provides security checks for CSV and JSON file uploads
 */

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (matches backend)
const MAX_ENTRIES = Infinity; // No limit on entries

// Dangerous patterns to strip
const DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<[^>]+on\w+\s*=/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
];
const DANGEROUS_CSV_PREFIX = /^(=|[-+@].*[|(!])/;
export const STRICT_WORD_PATTERN = /^[a-zA-Z0-9\s\-'.\/()]+$/;

/**
 * Sanitize a string by removing dangerous content
 */
export function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    let sanitized = str;
    DANGEROUS_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
    });
    // Remove null bytes and control characters
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    return sanitized.trim();
}

/**
 * Prevent spreadsheet formula injection by prefixing dangerous cells.
 */
export function sanitizeCsvCell(value) {
    if (typeof value !== 'string') return value;
    if (DANGEROUS_CSV_PREFIX.test(value)) {
        return `'${value}`;
    }
    return value;
}

/**
 * Format value as a CSV-safe cell (formula-safe + quote-escaped + wrapped).
 */
export function formatCsvCell(value) {
    const raw = String(value ?? '');
    const safe = sanitizeCsvCell(raw);
    return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Validate file before processing
 */
export function validateFile(file, allowedTypes) {
    const errors = [];

    if (!file) {
        errors.push('No file selected');
        return { valid: false, errors };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check file extension
    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(extension)) {
        errors.push(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    // MIME type spoofing detection
    const expectedMimes = {
        csv: ['text/csv', 'application/vnd.ms-excel', 'text/plain', ''],
        json: ['application/json', 'text/plain', ''],
        pdf: ['application/pdf', '']
    };

    if (file.type) {
        const allowedMimes = allowedTypes.reduce((acc, t) => acc.concat(expectedMimes[t] || []), []);
        if (allowedMimes.length > 0 && !allowedMimes.includes(file.type)) {
            errors.push(`Security Warning: File MIME type "${file.type}" does not match expected type for .${extension}. Possible file spoofing.`);
        }
    }

    return { valid: errors.length === 0, errors };
}


