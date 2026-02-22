/**
 * Session Service
 *
 * Maintains server-side session state for JWT-bearing clients.
 * This enables immediate session revocation (kill switch) even for
 * otherwise stateless JWTs.
 *
 * @module services/session.service
 */

const crypto = require('crypto');
const { redisClient } = require('../config/redis');
const { jwt: jwtConfig } = require('../config/environment');

const SESSION_PREFIX = 'auth:session:';
const SESSION_INDEX_PREFIX = 'auth:session:index:';
const MAX_REDIS_TTL_SECONDS = 2147483647; // Redis max EX value (~68 years)

const SESSION_TYPES = {
    USER: 'user',
    ADMIN: 'admin'
};

const getSessionKey = (sid) => `${SESSION_PREFIX}${sid}`;
const getSessionIndexKey = (type, accountId) => `${SESSION_INDEX_PREFIX}${type}:${accountId}`;

const normalizeType = (type) => {
    if (type === SESSION_TYPES.USER || type === SESSION_TYPES.ADMIN) {
        return type;
    }
    throw new Error(`Invalid session type: ${type}`);
};

const resolveSessionTtl = (type) => {
    const normalizedType = normalizeType(type);
    const days = normalizedType === SESSION_TYPES.ADMIN
        ? jwtConfig.expiryDays
        : jwtConfig.lifetimeDays;
    const ttlSeconds = Math.floor((days || 1) * 24 * 60 * 60);
    return Math.min(Math.max(ttlSeconds, 60), MAX_REDIS_TTL_SECONDS);
};

const generateSessionId = () => crypto.randomBytes(24).toString('base64url');

/**
 * Creates a server-side session and returns its sid.
 *
 * @param {Object} params
 * @param {'user'|'admin'} params.type - Session type
 * @param {string|Object} params.accountId - Account identifier
 * @param {number} [params.tokenVersion=0] - Account token version at issuance
 * @param {Object} [params.metadata={}] - Optional metadata (ip, uaHash, etc.)
 * @returns {Promise<{sid: string, ttlSeconds: number}>}
 */
const createSession = async ({ type, accountId, tokenVersion = 0, metadata = {} }) => {
    const normalizedType = normalizeType(type);
    const normalizedAccountId = String(accountId || '');

    if (!normalizedAccountId) {
        throw new Error('Session accountId is required');
    }

    const sid = generateSessionId();
    const ttlSeconds = resolveSessionTtl(normalizedType);
    const payload = {
        type: normalizedType,
        accountId: normalizedAccountId,
        tokenVersion: Number.isInteger(tokenVersion) ? tokenVersion : 0,
        createdAt: new Date().toISOString(),
        metadata: metadata && typeof metadata === 'object' ? metadata : {}
    };

    await redisClient.set(getSessionKey(sid), JSON.stringify(payload), { EX: ttlSeconds });

    const indexKey = getSessionIndexKey(normalizedType, normalizedAccountId);
    await redisClient.sAdd(indexKey, sid);
    await redisClient.expire(indexKey, ttlSeconds);

    return { sid, ttlSeconds };
};

/**
 * Reads and parses a session by sid.
 *
 * @param {string} sid - Session identifier
 * @returns {Promise<Object|null>}
 */
const getSession = async (sid) => {
    if (!sid || typeof sid !== 'string') {
        return null;
    }

    const raw = await redisClient.get(getSessionKey(sid));
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (error) {
        await redisClient.del(getSessionKey(sid));
        return null;
    }
};

/**
 * Validates that a JWT session claim still maps to an active server session.
 *
 * @param {Object} params
 * @param {string} params.sid - JWT sid claim
 * @param {'user'|'admin'} params.type - Expected session type
 * @param {string|Object} params.accountId - Expected account id
 * @param {number} params.tokenVersion - Expected token version
 * @returns {Promise<{valid: boolean, session?: Object, error?: string}>}
 */
const validateSession = async ({ sid, type, accountId, tokenVersion }) => {
    if (!sid || typeof sid !== 'string') {
        return { valid: false, error: 'Missing session id' };
    }

    const session = await getSession(sid);
    if (!session) {
        return { valid: false, error: 'Session not found or expired' };
    }

    const expectedType = normalizeType(type);
    const expectedAccountId = String(accountId || '');
    const expectedTokenVersion = Number.isInteger(tokenVersion) ? tokenVersion : 0;

    if (session.type !== expectedType) {
        return { valid: false, error: 'Session type mismatch' };
    }

    if (String(session.accountId) !== expectedAccountId) {
        return { valid: false, error: 'Session subject mismatch' };
    }

    if ((session.tokenVersion || 0) !== expectedTokenVersion) {
        return { valid: false, error: 'Session token version mismatch' };
    }

    return { valid: true, session };
};

/**
 * Revokes a single session.
 *
 * @param {string} sid - Session identifier
 * @returns {Promise<void>}
 */
const revokeSession = async (sid) => {
    if (!sid || typeof sid !== 'string') return;

    const session = await getSession(sid);
    await redisClient.del(getSessionKey(sid));

    if (session?.type && session?.accountId) {
        const indexKey = getSessionIndexKey(session.type, session.accountId);
        await redisClient.sRem(indexKey, sid);
    }
};

/**
 * Revokes all sessions for a given account.
 *
 * @param {'user'|'admin'} type - Session type
 * @param {string|Object} accountId - Account identifier
 * @returns {Promise<number>} Number of sessions revoked
 */
const revokeAllSessions = async (type, accountId) => {
    const normalizedType = normalizeType(type);
    const normalizedAccountId = String(accountId || '');
    if (!normalizedAccountId) return 0;

    const indexKey = getSessionIndexKey(normalizedType, normalizedAccountId);
    const sessionIds = await redisClient.sMembers(indexKey);
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
        await redisClient.del(indexKey);
        return 0;
    }

    const pipeline = redisClient.multi();
    for (const sid of sessionIds) {
        pipeline.del(getSessionKey(sid));
    }
    pipeline.del(indexKey);
    await pipeline.exec();

    return sessionIds.length;
};

module.exports = {
    SESSION_TYPES,
    createSession,
    getSession,
    validateSession,
    revokeSession,
    revokeAllSessions
};
