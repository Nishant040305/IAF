-- ============================================================================
-- VayuReader ClickHouse Schema
-- Migration 002: Log tables (replaces MongoDB AuditLog + UserAudit)
-- ============================================================================

-- ============================================================================
-- AUDIT LOGS (Admin actions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs
(
    id             UUID DEFAULT generateUUIDv4(),
    action         Enum8('CREATE' = 1, 'UPDATE' = 2, 'DELETE' = 3, 'READ' = 4),
    resource_type  Enum8('PDF' = 1, 'DICTIONARY_WORD' = 2, 'ABBREVIATION' = 3, 'ADMIN' = 4),
    resource_id    String,
    admin_id       String,
    admin_name     String,
    admin_contact  String,
    details        String DEFAULT '{}',   -- JSON string for flexible metadata
    timestamp      DateTime64(3) DEFAULT now64(3),
    created_at     DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, resource_type, action)
TTL toDateTime(timestamp) + INTERVAL 365 DAY
SETTINGS index_granularity = 8192;

-- Secondary indexes for common query patterns
ALTER TABLE audit_logs ADD INDEX idx_resource_id resource_id TYPE bloom_filter(0.01) GRANULARITY 4;
ALTER TABLE audit_logs ADD INDEX idx_admin_name admin_name TYPE ngrambf_v1(3, 256, 2, 0) GRANULARITY 4;

-- ============================================================================
-- USER AUDIT LOGS (User activity tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_audit_logs
(
    id             UUID DEFAULT generateUUIDv4(),
    user_id        String,
    phone_number   String,
    action         Enum8('LOGIN' = 1, 'DEVICE_CHANGE' = 2, 'NAME_CHANGE' = 3, 'READ_PDF' = 4),
    device_id      String DEFAULT '',
    metadata       String DEFAULT '{}',   -- JSON string for flexible metadata
    timestamp      DateTime64(3) DEFAULT now64(3),
    created_at     DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, action, user_id)
TTL toDateTime(timestamp) + INTERVAL 365 DAY
SETTINGS index_granularity = 8192;

-- Secondary indexes
ALTER TABLE user_audit_logs ADD INDEX idx_user_id user_id TYPE bloom_filter(0.01) GRANULARITY 4;
ALTER TABLE user_audit_logs ADD INDEX idx_phone_number phone_number TYPE bloom_filter(0.01) GRANULARITY 4;
ALTER TABLE user_audit_logs ADD INDEX idx_device_id device_id TYPE bloom_filter(0.01) GRANULARITY 4;
