-- PolyglotMesh H2-compatible test schema (matches PostgreSQL schema.sql, but uses
-- types understood by the r2dbc-h2 driver in PostgreSQL compatibility mode).

CREATE TABLE IF NOT EXISTS saved_scripts (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    language VARCHAR(32) NOT NULL,
    code TEXT NOT NULL,
    description VARCHAR(300),
    author VARCHAR(80),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS execution_history (
    id VARCHAR(64) PRIMARY KEY,
    language VARCHAR(32) NOT NULL,
    code_snippet VARCHAR(512) NOT NULL,
    output TEXT,
    error TEXT,
    execution_time_ms BIGINT NOT NULL,
    success BOOLEAN NOT NULL,
    engine VARCHAR(100),
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_scripts_updated_at ON saved_scripts (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_history_executed_at ON execution_history (executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_history_language ON execution_history (language);