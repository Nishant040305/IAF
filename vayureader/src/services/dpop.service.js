/**
 * DPoP Service
 *
 * Verifies Demonstration of Proof-of-Possession (DPoP) proofs and binds
 * bearer JWT usage to a client-held private key.
 *
 * @module services/dpop.service
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { redisClient } = require('../config/redis');
const { dpop: dpopConfig } = require('../config/environment');

const JTI_PREFIX = 'dpop:jti:';
const JTI_REGEX = /^[A-Za-z0-9._~-]{12,200}$/;
const QUERY_FALLBACK_PREFIXES = ['/api/events', '/uploads/', '/api/pdfs/file/'];

const sha256Base64Url = (input) => crypto.createHash('sha256').update(input).digest('base64url');

const normalizeEcPublicJwk = (jwk) => {
    if (!jwk || typeof jwk !== 'object') return null;
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || typeof jwk.x !== 'string' || typeof jwk.y !== 'string') {
        return null;
    }
    return {
        kty: 'EC',
        crv: 'P-256',
        x: jwk.x,
        y: jwk.y
    };
};

const calculateJwkThumbprint = (publicJwk) => {
    const normalized = normalizeEcPublicJwk(publicJwk);
    if (!normalized) return null;

    const canonical = JSON.stringify({
        crv: normalized.crv,
        kty: normalized.kty,
        x: normalized.x,
        y: normalized.y
    });

    return sha256Base64Url(canonical);
};

const validateDpopPublicJwk = (publicJwk) => {
    const normalized = normalizeEcPublicJwk(publicJwk);
    if (!normalized) {
        return {
            valid: false,
            error: 'dpopPublicKey must be an EC P-256 public JWK with x and y'
        };
    }

    const jkt = calculateJwkThumbprint(normalized);
    if (!jkt) {
        return { valid: false, error: 'Failed to compute JWK thumbprint' };
    }

    return {
        valid: true,
        normalizedJwk: normalized,
        jkt
    };
};

const getSafeHtuFromRequest = (req) => {
    const originalUrl = req.originalUrl || req.url || '/';
    const parsed = new URL(originalUrl, 'http://localhost');
    parsed.searchParams.delete('dpop');
    const query = parsed.searchParams.toString();
    return query ? `${parsed.pathname}?${query}` : parsed.pathname;
};

const shouldAllowQueryProofFallback = (req) => {
    const htu = getSafeHtuFromRequest(req);
    return QUERY_FALLBACK_PREFIXES.some((prefix) => htu.startsWith(prefix));
};

const extractDpopProof = (req) => {
    const headerProof = req.headers?.dpop;
    if (typeof headerProof === 'string' && headerProof.trim()) {
        return headerProof.trim();
    }

    if (dpopConfig.allowQueryProof && shouldAllowQueryProofFallback(req)) {
        const queryProof = req.query?.dpop;
        if (typeof queryProof === 'string' && queryProof.trim()) {
            return queryProof.trim();
        }
    }

    return null;
};

/**
 * Verifies DPoP proof for a request.
 *
 * @param {Object} params
 * @param {Object} params.req - Express request
 * @param {string} params.accessToken - JWT access token used for auth
 * @param {string} params.expectedJkt - Expected cnf.jkt bound to the access token
 * @returns {Promise<{valid:boolean, error?:string, jkt?:string}>}
 */
const verifyDpopProof = async ({ req, accessToken, expectedJkt }) => {
    if (!dpopConfig.enabled) {
        return { valid: true };
    }

    if (!expectedJkt || typeof expectedJkt !== 'string') {
        return { valid: false, error: 'Token is not bound to a DPoP key (missing cnf.jkt)' };
    }

    const proof = extractDpopProof(req);
    if (!proof) {
        return { valid: false, error: 'Missing DPoP proof' };
    }

    let decodedComplete;
    try {
        decodedComplete = jwt.decode(proof, { complete: true });
    } catch (error) {
        return { valid: false, error: 'Malformed DPoP proof' };
    }

    if (!decodedComplete?.header || !decodedComplete?.payload) {
        return { valid: false, error: 'Invalid DPoP proof structure' };
    }

    const { header } = decodedComplete;
    if (header.typ !== 'dpop+jwt') {
        return { valid: false, error: 'Invalid DPoP typ header' };
    }

    if (header.alg !== 'ES256') {
        return { valid: false, error: 'Unsupported DPoP alg; expected ES256' };
    }

    const keyValidation = validateDpopPublicJwk(header.jwk);
    if (!keyValidation.valid) {
        return { valid: false, error: keyValidation.error };
    }

    if (keyValidation.jkt !== expectedJkt) {
        return { valid: false, error: 'DPoP key mismatch for access token binding' };
    }

    let verifiedPayload;
    try {
        const publicKeyObj = crypto.createPublicKey({
            key: keyValidation.normalizedJwk,
            format: 'jwk'
        });
        verifiedPayload = jwt.verify(proof, publicKeyObj, {
            algorithms: ['ES256'],
            ignoreExpiration: true,
            ignoreNotBefore: true
        });
    } catch (error) {
        return { valid: false, error: 'Invalid DPoP proof signature' };
    }

    const expectedMethod = req.method.toUpperCase();
    if (String(verifiedPayload.htm || '').toUpperCase() !== expectedMethod) {
        return { valid: false, error: 'DPoP htm mismatch' };
    }

    const expectedHtu = getSafeHtuFromRequest(req);
    if (verifiedPayload.htu !== expectedHtu) {
        return { valid: false, error: 'DPoP htu mismatch' };
    }

    if (!Number.isInteger(verifiedPayload.iat)) {
        return { valid: false, error: 'Invalid DPoP iat' };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const maxSkew = Math.max(5, dpopConfig.maxIatSkewSeconds);
    if (Math.abs(nowSec - verifiedPayload.iat) > maxSkew) {
        return { valid: false, error: 'DPoP proof iat outside accepted skew window' };
    }

    if (typeof verifiedPayload.jti !== 'string' || !JTI_REGEX.test(verifiedPayload.jti)) {
        return { valid: false, error: 'Invalid DPoP jti' };
    }

    const expectedAth = sha256Base64Url(accessToken);
    if (verifiedPayload.ath !== expectedAth) {
        return { valid: false, error: 'DPoP ath mismatch for access token' };
    }

    const replayKey = `${JTI_PREFIX}${expectedJkt}:${verifiedPayload.jti}`;
    const setResult = await redisClient.set(replayKey, '1', {
        EX: dpopConfig.proofTtlSeconds,
        NX: true
    });

    if (setResult !== 'OK') {
        return { valid: false, error: 'DPoP proof replay detected' };
    }

    return { valid: true, jkt: expectedJkt };
};

module.exports = {
    calculateJwkThumbprint,
    validateDpopPublicJwk,
    verifyDpopProof,
    getSafeHtuFromRequest
};
