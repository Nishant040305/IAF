-- ============================================================================
-- VayuReader PostgreSQL Schema
-- Migration 001: Initial schema (replaces MongoDB collections)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- For text search

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL CHECK (char_length(name) >= 2),
    phone_number    VARCHAR(20) NOT NULL UNIQUE,
    device_id       VARCHAR(255),
    previous_device_id VARCHAR(255),
    last_login      TIMESTAMPTZ,
    is_blocked      BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified     BOOLEAN NOT NULL DEFAULT TRUE,
    token_version   INTEGER NOT NULL DEFAULT 0 CHECK (token_version >= 0),
    security_questions JSONB DEFAULT '[]'::jsonb,
    created_by_admin UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone_number ON users (phone_number);
CREATE INDEX idx_users_device_id ON users (device_id) WHERE device_id IS NOT NULL;

-- ============================================================================
-- ADMINS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admins (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL CHECK (char_length(name) >= 2),
    contact         VARCHAR(20) NOT NULL UNIQUE,
    permissions     TEXT[] NOT NULL DEFAULT '{}',
    created_by      VARCHAR(100) NOT NULL DEFAULT 'System',
    password_hash   VARCHAR(255) NOT NULL,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    token_version   INTEGER NOT NULL DEFAULT 0 CHECK (token_version >= 0),
    security_questions JSONB DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admins_contact ON admins (contact);
CREATE INDEX idx_admins_name ON admins (name);

-- ============================================================================
-- PDF DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pdf_documents (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       VARCHAR(500) NOT NULL,
    content     TEXT,
    pdf_url     VARCHAR(1000) NOT NULL,
    category    VARCHAR(255),
    view_count  INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    thumbnail   VARCHAR(1000),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pdf_documents_category ON pdf_documents (category) WHERE category IS NOT NULL;
CREATE INDEX idx_pdf_documents_created_at ON pdf_documents (created_at DESC);
CREATE INDEX idx_pdf_documents_pdf_url ON pdf_documents (pdf_url);
CREATE INDEX idx_pdf_documents_thumbnail ON pdf_documents (thumbnail) WHERE thumbnail IS NOT NULL;
-- GIN index for full-text search using trgm
CREATE INDEX idx_pdf_documents_title_trgm ON pdf_documents USING gin (title gin_trgm_ops);
CREATE INDEX idx_pdf_documents_content_trgm ON pdf_documents USING gin (content gin_trgm_ops) WHERE content IS NOT NULL;

-- ============================================================================
-- WORDS TABLE (Dictionary)
-- ============================================================================
CREATE TABLE IF NOT EXISTS words (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word        VARCHAR(255) NOT NULL UNIQUE,
    meanings    JSONB NOT NULL DEFAULT '[]'::jsonb,
    synonyms    TEXT[] DEFAULT '{}',
    antonyms    TEXT[] DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_words_word ON words (word);
CREATE INDEX idx_words_word_trgm ON words USING gin (word gin_trgm_ops);

-- ============================================================================
-- ABBREVIATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS abbreviations (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    abbreviation VARCHAR(255) NOT NULL UNIQUE,
    full_form    TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_abbreviations_abbreviation ON abbreviations (abbreviation);
CREATE INDEX idx_abbreviations_abbreviation_trgm ON abbreviations USING gin (abbreviation gin_trgm_ops);
CREATE INDEX idx_abbreviations_full_form_trgm ON abbreviations USING gin (full_form gin_trgm_ops);

-- ============================================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdf_documents_updated_at BEFORE UPDATE ON pdf_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_words_updated_at BEFORE UPDATE ON words
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_abbreviations_updated_at BEFORE UPDATE ON abbreviations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FOREIGN KEY: users.created_by_admin -> admins.id
-- ============================================================================
ALTER TABLE users
    ADD CONSTRAINT fk_users_created_by_admin
    FOREIGN KEY (created_by_admin) REFERENCES admins(id) ON DELETE SET NULL;
