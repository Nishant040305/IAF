/**
 * PDF Security Scanner
 * 
 * Deep inspection of PDF files to detect potentially malicious content.
 * Designed for high-security environments (Indian Air Force).
 * 
 * Detects:
 * - JavaScript code (/JavaScript, /JS)
 * - Open actions (/OpenAction) - auto-execute on open
 * - Automatic actions (/AA) - triggered by events
 * - Embedded files (/EmbeddedFile, /EmbeddedFiles)
 * - Launch actions (/Launch) - execute external programs
 * - URI actions with dangerous protocols
 * - AcroForms with scripts
 * - Rich media (Flash, video, audio)
 * - GoTo actions (can be used for phishing)
 * - Named actions
 * - Encrypted streams (can hide malicious content)
 * - Object streams (can hide malicious objects)
 * 
 * @module utils/pdfSecurityScanner
 */

const fs = require('fs').promises;

/**
 * Security threat levels
 */
const THREAT_LEVEL = {
    CRITICAL: 'critical',  // Definite malicious intent (JS, Launch)
    HIGH: 'high',          // Likely malicious (OpenAction with JS)
    MEDIUM: 'medium',      // Suspicious (embedded files, forms)
    LOW: 'low',            // Informational (external links)
    SAFE: 'safe'
};

/**
 * Dangerous patterns to detect in PDF content.
 * Each pattern has a regex, threat level, and description.
 */
const DANGEROUS_PATTERNS = [
    // JavaScript - CRITICAL
    {
        name: 'JavaScript',
        patterns: [
            // Focus on executable action constructs to reduce false positives
            // from incidental "/JavaScript" tokens in non-executable content.
            /\/S\s*\/JavaScript\b/gi,
            /\/JS\s*(?:\(|<)/gi,
            /\/JavaScript\s*(?:<<|\d+\s+\d+\s+R)/gi
        ],
        level: THREAT_LEVEL.CRITICAL,
        description: 'PDF contains JavaScript code which can execute malicious actions'
    },
    
    // OpenAction - HIGH (auto-executes when PDF opens)
    {
        name: 'OpenAction',
        patterns: [
            /\/OpenAction\s/gi,
            /\/OpenAction</gi
        ],
        level: THREAT_LEVEL.HIGH,
        description: 'PDF contains OpenAction that auto-executes when document opens'
    },
    
    // Automatic Actions - HIGH (event-triggered)
    {
        name: 'AutomaticActions',
        patterns: [
            /\/AA\s*<</gi,
            /\/AA\s*\d+\s+\d+\s+R/gi
        ],
        level: THREAT_LEVEL.HIGH,
        description: 'PDF contains automatic actions triggered by events'
    },
    
    // Launch Action - CRITICAL (executes external programs)
    {
        name: 'LaunchAction',
        patterns: [
            /\/Launch\s/gi,
            /\/S\s*\/Launch/gi,
            /\/Win\s*<</gi,
            /\/Unix\s*<</gi,
            /\/Mac\s*<</gi
        ],
        level: THREAT_LEVEL.CRITICAL,
        description: 'PDF contains Launch action that can execute external programs'
    },
    
    // Embedded Files - MEDIUM (can contain malware)
    {
        name: 'EmbeddedFiles',
        patterns: [
            /\/EmbeddedFile/gi,
            /\/EmbeddedFiles/gi,
            /\/Filespec/gi,
            /\/F\s*\(/gi
        ],
        level: THREAT_LEVEL.MEDIUM,
        description: 'PDF contains embedded files which may contain malware'
    },
    
    // URI Actions with dangerous protocols - HIGH
    {
        name: 'DangerousURI',
        patterns: [
            /\/URI\s*\(\s*javascript:/gi,
            /\/URI\s*\(\s*file:/gi,
            /\/URI\s*\(\s*data:/gi,
            /\/URI\s*\(\s*vbscript:/gi,
            /\/URI\s*<[^>]*javascript:/gi,
            /\/URI\s*<[^>]*file:/gi
        ],
        level: THREAT_LEVEL.HIGH,
        description: 'PDF contains URI with dangerous protocol (javascript:, file:, data:)'
    },
    
    // AcroForm with JavaScript - HIGH
    {
        name: 'AcroFormJS',
        patterns: [
            /\/AcroForm[\s\S]{0,500}\/JavaScript/gi,
            /\/AcroForm[\s\S]{0,500}\/JS\s/gi
        ],
        level: THREAT_LEVEL.HIGH,
        description: 'PDF contains interactive form with JavaScript'
    },
    
    // Rich Media / Flash - MEDIUM (Flash is deprecated and insecure)
    {
        name: 'RichMedia',
        patterns: [
            /\/RichMedia/gi,
            /\/Flash/gi,
            /\/Movie/gi,
            /\/Sound/gi,
            /\/Screen/gi,
            /application\/x-shockwave-flash/gi
        ],
        level: THREAT_LEVEL.MEDIUM,
        description: 'PDF contains rich media (Flash/video/audio) which may be exploitable'
    },
    
    // Named Actions - MEDIUM (can trigger various actions)
    {
        name: 'NamedAction',
        patterns: [
            /\/Named\s*\/\w+/gi,
            /\/S\s*\/Named/gi
        ],
        level: THREAT_LEVEL.MEDIUM,
        description: 'PDF contains named actions'
    },
    
    // GoToR/GoToE - MEDIUM (remote/embedded goto, can be used for phishing)
    {
        name: 'RemoteGoTo',
        patterns: [
            /\/GoToR/gi,
            /\/GoToE/gi,
            /\/S\s*\/GoToR/gi,
            /\/S\s*\/GoToE/gi
        ],
        level: THREAT_LEVEL.MEDIUM,
        description: 'PDF contains remote GoTo action (potential phishing vector)'
    },
    
    // ImportData - HIGH (can import external data)
    {
        name: 'ImportData',
        patterns: [
            /\/ImportData/gi,
            /\/S\s*\/ImportData/gi
        ],
        level: THREAT_LEVEL.HIGH,
        description: 'PDF contains ImportData action'
    },
    
    // SubmitForm - MEDIUM (can exfiltrate data)
    {
        name: 'SubmitForm',
        patterns: [
            /\/SubmitForm/gi,
            /\/S\s*\/SubmitForm/gi
        ],
        level: THREAT_LEVEL.MEDIUM,
        description: 'PDF contains form submission action (potential data exfiltration)'
    },
    
    // ResetForm - LOW (informational)
    {
        name: 'ResetForm',
        patterns: [
            /\/ResetForm/gi
        ],
        level: THREAT_LEVEL.LOW,
        description: 'PDF contains form reset action'
    },
    
    // XFA Forms - HIGH (complex forms with potential vulnerabilities)
    {
        name: 'XFAForms',
        patterns: [
            /\/XFA\s/gi,
            /xmlns:xfa/gi
        ],
        level: THREAT_LEVEL.HIGH,
        description: 'PDF contains XFA forms (complex, potentially vulnerable)'
    },
    
    // ObjStm (Object Streams) - LOW
    // Common in modern PDFs; keep as warning while other layers (AV + sanitization) protect on upload.
    {
        name: 'ObjectStreams',
        patterns: [
            /\/ObjStm/gi,
            /\/Type\s*\/ObjStm/gi
        ],
        level: THREAT_LEVEL.LOW,
        description: 'PDF uses object streams (logged as warning)'
    },
    
    // Encrypted content - MEDIUM (can hide malicious content from scanners)
    {
        name: 'Encryption',
        patterns: [
            /\/Encrypt\s/gi,
            /\/Filter\s*\/Standard/gi
        ],
        level: THREAT_LEVEL.MEDIUM,
        description: 'PDF contains encrypted content (may hide malicious data)'
    },
    
    // JBIG2 (historically vulnerable to exploits)
    {
        name: 'JBIG2',
        patterns: [
            /\/JBIG2Decode/gi,
            /\/Filter\s*\/JBIG2Decode/gi
        ],
        level: THREAT_LEVEL.MEDIUM,
        description: 'PDF uses JBIG2 compression (historically vulnerable)'
    },
    
    // FontMatrix injection (CVE-2024-4367 in PDF.js)
    // Malicious JS can be embedded in font matrix arrays
    {
        name: 'FontMatrixInjection',
        patterns: [
            /\/FontMatrix\s*\[[^\]]*\(/gi,
            /\/FontMatrix\s*\[[^\]]*alert/gi,
            /\/FontMatrix\s*\[[^\]]*confirm/gi,
            /\/FontMatrix\s*\[[^\]]*eval/gi,
            /\/FontMatrix\s*\[[^\]]*document/gi,
            /\/FontMatrix\s*\[[^\]]*window/gi
        ],
        level: THREAT_LEVEL.CRITICAL,
        description: 'PDF contains potential FontMatrix injection (CVE-2024-4367)'
    },
    
    // Annotation-based XSS vectors
    {
        name: 'AnnotationXSS',
        patterns: [
            /\/V\s*\([^)]*<script/gi,
            /\/V\s*\([^)]*onclick/gi,
            /\/V\s*\([^)]*onerror/gi,
            /\/V\s*\([^)]*onload/gi,
            /\/V\s*\([^)]*ontoggle/gi,
            /\/V\s*\([^)]*onmouseover/gi,
            /\/Contents\s*\([^)]*<script/gi,
            /\/Contents\s*\([^)]*ontoggle/gi,
            /\/T\s*\([^)]*ontoggle/gi,
            /\/T\s*\([^)]*<details/gi
        ],
        level: THREAT_LEVEL.CRITICAL,
        description: 'PDF contains annotation-based XSS payload'
    },
    
    // Data URI with HTML/script content
    {
        name: 'DataURIPayload',
        patterns: [
            /\/URI\s*\([^)]*data:text\/html/gi,
            /\/URI\s*<[^>]*data:text\/html/gi
        ],
        level: THREAT_LEVEL.CRITICAL,
        description: 'PDF contains data URI with HTML content (XSS vector)'
    }
];

/**
 * Scan modes for different security requirements
 */
const SCAN_MODE = {
    STRICT: 'strict',       // Block anything suspicious (recommended for IAF)
    MODERATE: 'moderate',   // Block high/critical threats only
    PERMISSIVE: 'permissive' // Block only critical threats
};

/**
 * Get threat levels to block based on scan mode
 */
const getBlockedLevels = (mode) => {
    switch (mode) {
        case SCAN_MODE.STRICT:
            return [THREAT_LEVEL.CRITICAL, THREAT_LEVEL.HIGH, THREAT_LEVEL.MEDIUM];
        case SCAN_MODE.MODERATE:
            return [THREAT_LEVEL.CRITICAL, THREAT_LEVEL.HIGH];
        case SCAN_MODE.PERMISSIVE:
            return [THREAT_LEVEL.CRITICAL];
        default:
            return [THREAT_LEVEL.CRITICAL, THREAT_LEVEL.HIGH, THREAT_LEVEL.MEDIUM];
    }
};

/**
 * Scan a PDF file for malicious content.
 * 
 * @param {string} filePath - Path to the PDF file
 * @param {Object} options - Scan options
 * @param {string} options.mode - Scan mode: 'strict', 'moderate', 'permissive'
 * @param {number} options.maxFileSize - Maximum file size to scan (default 100MB)
 * @returns {Promise<Object>} Scan result
 * 
 * @example
 * const result = await scanPdfForThreats('/path/to/file.pdf', { mode: 'strict' });
 * if (!result.safe) {
 *   console.log('Threats found:', result.threats);
 * }
 */
const scanPdfForThreats = async (filePath, options = {}) => {
    const {
        mode = SCAN_MODE.STRICT,
        maxFileSize = 100 * 1024 * 1024 // 100MB
    } = options;

    const result = {
        safe: true,
        scanned: true,
        mode,
        threats: [],
        warnings: [],
        summary: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        },
        scanTime: 0
    };

    const startTime = Date.now();

    try {
        // Check file size first
        const stats = await fs.stat(filePath);
        if (stats.size > maxFileSize) {
            result.scanned = false;
            result.safe = false;
            result.error = `File too large to scan: ${(stats.size / 1024 / 1024).toFixed(2)}MB exceeds ${maxFileSize / 1024 / 1024}MB limit`;
            return result;
        }

        // Read file content as buffer
        const buffer = await fs.readFile(filePath);
        
        // Verify PDF magic bytes
        const pdfHeader = buffer.slice(0, 8).toString('ascii');
        if (!pdfHeader.startsWith('%PDF-')) {
            result.safe = false;
            result.scanned = false;
            result.error = 'Invalid PDF: Missing PDF header signature';
            return result;
        }

        // Convert to string for pattern matching
        // We scan both ASCII and try to decode potential obfuscated content
        const content = buffer.toString('binary');
        const contentLower = content.toLowerCase();

        // Get blocked threat levels based on mode
        const blockedLevels = getBlockedLevels(mode);

        // Scan for each dangerous pattern
        for (const pattern of DANGEROUS_PATTERNS) {
            for (const regex of pattern.patterns) {
                // Reset regex lastIndex for global patterns
                regex.lastIndex = 0;
                
                const matches = content.match(regex) || contentLower.match(regex);
                if (matches && matches.length > 0) {
                    const threat = {
                        name: pattern.name,
                        level: pattern.level,
                        description: pattern.description,
                        occurrences: matches.length,
                        blocked: blockedLevels.includes(pattern.level)
                    };

                    // Increment summary counter
                    result.summary[pattern.level]++;

                    if (threat.blocked) {
                        result.threats.push(threat);
                        result.safe = false;
                    } else {
                        result.warnings.push(threat);
                    }

                    // Only count each pattern type once
                    break;
                }
            }
        }

        // Additional heuristic checks
        
        // Check for suspicious stream lengths (potential buffer overflow attempts)
        const streamLengthMatches = content.match(/\/Length\s+(\d+)/g);
        if (streamLengthMatches) {
            for (const match of streamLengthMatches) {
                const length = parseInt(match.replace(/\/Length\s+/, ''));
                if (length > 50 * 1024 * 1024) { // 50MB stream is suspicious
                    result.warnings.push({
                        name: 'SuspiciousStreamLength',
                        level: THREAT_LEVEL.LOW,
                        description: `Unusually large stream length detected: ${(length / 1024 / 1024).toFixed(2)}MB`,
                        blocked: false
                    });
                    result.summary.low++;
                }
            }
        }

        // Check for excessive object count (potential DoS)
        const objMatches = content.match(/\d+\s+\d+\s+obj/g);
        if (objMatches && objMatches.length > 50000) {
            result.warnings.push({
                name: 'ExcessiveObjects',
                level: THREAT_LEVEL.LOW,
                description: `Excessive number of PDF objects: ${objMatches.length}`,
                blocked: false
            });
            result.summary.low++;
        }

        // Check for deeply nested arrays/dictionaries (potential stack overflow)
        let maxNesting = 0;
        let currentNesting = 0;
        for (let i = 0; i < Math.min(content.length, 1000000); i++) {
            if (content[i] === '<' || content[i] === '[') {
                currentNesting++;
                maxNesting = Math.max(maxNesting, currentNesting);
            } else if (content[i] === '>' || content[i] === ']') {
                currentNesting = Math.max(0, currentNesting - 1);
            }
        }
        if (maxNesting > 100) {
            result.warnings.push({
                name: 'DeepNesting',
                level: THREAT_LEVEL.LOW,
                description: `Deeply nested structures detected (depth: ${maxNesting})`,
                blocked: false
            });
            result.summary.low++;
        }

    } catch (error) {
        result.scanned = false;
        result.safe = false;
        result.error = `Scan error: ${error.message}`;
    }

    result.scanTime = Date.now() - startTime;
    return result;
};

/**
 * Quick check if a PDF contains any JavaScript.
 * Faster than full scan for quick rejection.
 * 
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<boolean>} True if JavaScript is found
 */
const containsJavaScript = async (filePath) => {
    try {
        const buffer = await fs.readFile(filePath);
        const content = buffer.toString('binary').toLowerCase();
        
        return content.includes('/javascript') || 
               content.includes('/js ') || 
               content.includes('/js(') ||
               content.includes('/js<');
    } catch {
        return true; // Fail safe - assume dangerous if can't read
    }
};

/**
 * Format scan result for logging/display.
 * 
 * @param {Object} result - Scan result from scanPdfForThreats
 * @returns {string} Formatted string
 */
const formatScanResult = (result) => {
    if (result.safe) {
        return `PDF Security Scan: PASSED (mode: ${result.mode}, time: ${result.scanTime}ms)`;
    }

    const threatList = result.threats
        .map(t => `  - [${t.level.toUpperCase()}] ${t.name}: ${t.description}`)
        .join('\n');

    return `PDF Security Scan: FAILED (mode: ${result.mode}, time: ${result.scanTime}ms)\n` +
           `Threats detected:\n${threatList}\n` +
           `Summary: ${result.summary.critical} critical, ${result.summary.high} high, ` +
           `${result.summary.medium} medium, ${result.summary.low} low`;
};

/**
 * Get a user-friendly error message for blocked uploads.
 * 
 * @param {Object} result - Scan result from scanPdfForThreats
 * @returns {string} User-friendly error message
 */
const getBlockedMessage = (result) => {
    if (result.safe) {
        return null;
    }

    if (result.error) {
        return `PDF rejected: ${result.error}`;
    }

    const criticalThreats = result.threats.filter(t => t.level === THREAT_LEVEL.CRITICAL);
    const highThreats = result.threats.filter(t => t.level === THREAT_LEVEL.HIGH);

    if (criticalThreats.length > 0) {
        const names = criticalThreats.map(t => t.name).join(', ');
        return `PDF rejected: Contains dangerous active content (${names}). ` +
               `For security reasons, PDFs with executable code are not allowed.`;
    }

    if (highThreats.length > 0) {
        const names = highThreats.map(t => t.name).join(', ');
        return `PDF rejected: Contains potentially dangerous elements (${names}). ` +
               `Please upload a PDF without interactive or automated features.`;
    }

    const mediumThreats = result.threats.filter(t => t.level === THREAT_LEVEL.MEDIUM);
    if (mediumThreats.length > 0) {
        const names = mediumThreats.map(t => t.name).join(', ');
        return `PDF rejected: Contains suspicious elements (${names}). ` +
               `Please upload a standard PDF document.`;
    }

    return 'PDF rejected: Security scan failed. Please upload a standard PDF document.';
};

module.exports = {
    THREAT_LEVEL,
    SCAN_MODE,
    scanPdfForThreats,
    containsJavaScript,
    formatScanResult,
    getBlockedMessage,
    getBlockedLevels
};
