/**
 * Repository Registry
 * 
 * Central access point for all repository instances.
 * Provides a clean API for importing repositories throughout the app.
 * 
 * @module repositories/index
 */

const UserRepository = require('./postgres/UserRepository');
const AdminRepository = require('./postgres/AdminRepository');
const PdfDocumentRepository = require('./postgres/PdfDocumentRepository');
const WordRepository = require('./postgres/WordRepository');
const AbbreviationRepository = require('./postgres/AbbreviationRepository');
const AuditLogRepository = require('./clickhouse/AuditLogRepository');
const UserAuditRepository = require('./clickhouse/UserAuditRepository');

module.exports = {
    // PostgreSQL repositories (general/OLTP)
    UserRepository,
    AdminRepository,
    PdfDocumentRepository,
    WordRepository,
    AbbreviationRepository,

    // ClickHouse repositories (logs/OLAP)
    AuditLogRepository,
    UserAuditRepository
};
