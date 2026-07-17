-- ============================================================================
-- Wingman Application Database Schema
-- Version: 1.0.0
-- Description: Initial schema for Wingman multi-tenant workspace application
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STORAGE MODE: Single-Row State (Simple Mode)
-- ============================================================================
-- This table stores the entire application state as a single JSON payload.
-- Use WINGMAN_STORAGE_MODE=supabase to enable this mode.
-- Suitable for small deployments with few concurrent users.

CREATE TABLE IF NOT EXISTS wingman_app_state (
    id TEXT PRIMARY KEY DEFAULT 'global',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default row if it doesn't exist
INSERT INTO wingman_app_state (id, payload)
VALUES ('global', '{"version": 1, "users": [], "workspaces": [], "invitations": [], "sessions": [], "projectsByWorkspace": {}, "auditEvents": [], "telemetryEvents": []}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE MODE: Normalized Tables (Production Mode)
-- ============================================================================
-- These tables provide proper relational storage with foreign keys.
-- Use WINGMAN_STORAGE_MODE=supabase-tables or set SUPABASE_WINGMAN_TABLES_ENABLED=true
-- Recommended for production deployments with multiple workspaces.

-- ----------------------------------------------------------------------------
-- Users Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wingman_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    company TEXT,
    role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('sales', 'admin', 'customer')),
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wingman_users_email ON wingman_users(email);
CREATE INDEX IF NOT EXISTS idx_wingman_users_status ON wingman_users(status);

-- ----------------------------------------------------------------------------
-- Workspaces Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wingman_workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'pilot' CHECK (tier IN ('pilot', 'starter', 'professional', 'enterprise')),
    owner_user_id TEXT NOT NULL REFERENCES wingman_users(id) ON DELETE RESTRICT,
    active_project_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wingman_workspaces_slug ON wingman_workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_wingman_workspaces_owner ON wingman_workspaces(owner_user_id);

-- ----------------------------------------------------------------------------
-- Workspace Members (Junction Table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wingman_workspace_members (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES wingman_workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES wingman_users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('owner', 'admin', 'sales', 'customer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wingman_members_workspace ON wingman_workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wingman_members_user ON wingman_workspace_members(user_id);

-- ----------------------------------------------------------------------------
-- Workspace Invitations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wingman_workspace_invitations (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES wingman_workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'sales', 'customer')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    invited_by_user_id TEXT REFERENCES wingman_users(id) ON DELETE SET NULL,
    invited_by_name TEXT NOT NULL DEFAULT 'Wingman',
    invited_by_email TEXT,
    token_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wingman_invitations_workspace ON wingman_workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wingman_invitations_email ON wingman_workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_wingman_invitations_status ON wingman_workspace_invitations(status);
CREATE INDEX IF NOT EXISTS idx_wingman_invitations_token ON wingman_workspace_invitations(token_hash);

-- ----------------------------------------------------------------------------
-- Sessions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wingman_sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES wingman_users(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL REFERENCES wingman_workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wingman_sessions_user ON wingman_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wingman_sessions_workspace ON wingman_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wingman_sessions_token ON wingman_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_wingman_sessions_expires ON wingman_sessions(expires_at);

-- ----------------------------------------------------------------------------
-- Projects
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wingman_projects (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES wingman_workspaces(id) ON DELETE CASCADE,
    owner_id TEXT REFERENCES wingman_users(id) ON DELETE SET NULL,
    project_name TEXT NOT NULL DEFAULT 'Untitled Project',
    customer TEXT,
    site TEXT,
    room_name TEXT,
    stage TEXT NOT NULL DEFAULT 'Discovery' CHECK (stage IN ('Discovery', 'Design', 'Proposal', 'Deployment', 'Support')),
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'In Progress', 'Commercial Ready', 'Archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_wingman_projects_workspace ON wingman_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wingman_projects_owner ON wingman_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_wingman_projects_stage ON wingman_projects(stage);
CREATE INDEX IF NOT EXISTS idx_wingman_projects_status ON wingman_projects(status);
CREATE INDEX IF NOT EXISTS idx_wingman_projects_updated ON wingman_projects(updated_at DESC);

-- ----------------------------------------------------------------------------
-- Audit Events
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wingman_audit_events (
    id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES wingman_workspaces(id) ON DELETE SET NULL,
    project_id TEXT,
    actor_name TEXT NOT NULL DEFAULT 'Wingman',
    actor_email TEXT,
    scope TEXT NOT NULL DEFAULT 'projects' CHECK (scope IN ('auth', 'workspace', 'projects', 'telemetry')),
    action TEXT NOT NULL DEFAULT 'updated',
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'error')),
    detail TEXT NOT NULL DEFAULT 'Workspace activity captured.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_wingman_audit_workspace ON wingman_audit_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wingman_audit_project ON wingman_audit_events(project_id);
CREATE INDEX IF NOT EXISTS idx_wingman_audit_scope ON wingman_audit_events(scope);
CREATE INDEX IF NOT EXISTS idx_wingman_audit_created ON wingman_audit_events(created_at DESC);

-- ----------------------------------------------------------------------------
-- Telemetry Events
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wingman_telemetry_events (
    id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES wingman_workspaces(id) ON DELETE SET NULL,
    user_id TEXT REFERENCES wingman_users(id) ON DELETE SET NULL,
    project_id TEXT,
    kind TEXT NOT NULL DEFAULT 'info' CHECK (kind IN ('info', 'error', 'unhandledrejection')),
    message TEXT NOT NULL DEFAULT 'Runtime event',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_wingman_telemetry_workspace ON wingman_telemetry_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wingman_telemetry_user ON wingman_telemetry_events(user_id);
CREATE INDEX IF NOT EXISTS idx_wingman_telemetry_project ON wingman_telemetry_events(project_id);
CREATE INDEX IF NOT EXISTS idx_wingman_telemetry_kind ON wingman_telemetry_events(kind);
CREATE INDEX IF NOT EXISTS idx_wingman_telemetry_timestamp ON wingman_telemetry_events(timestamp DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
-- NOTE: These policies are designed for service role access from the backend.
-- The backend uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- If you need client-side access, implement appropriate RLS policies.

-- Enable RLS on all tables (security best practice)
ALTER TABLE wingman_app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE wingman_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wingman_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE wingman_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wingman_workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wingman_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wingman_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE wingman_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE wingman_telemetry_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access (these policies allow the backend to operate).
-- Scoped `TO service_role` explicitly - without this, `USING (true)` grants
-- every Postgres role (including any anon/authenticated key wired up later)
-- unrestricted access, which defeats the purpose of enabling RLS at all.
CREATE POLICY service_role_all ON wingman_app_state FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON wingman_users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON wingman_workspaces FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON wingman_workspace_members FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON wingman_workspace_invitations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON wingman_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON wingman_projects FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON wingman_audit_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON wingman_telemetry_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- Automatic Cleanup Functions
-- ============================================================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM wingman_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old audit events (keeps last 800)
CREATE OR REPLACE FUNCTION cleanup_old_audit_events()
RETURNS void AS $$
BEGIN
    DELETE FROM wingman_audit_events
    WHERE id NOT IN (
        SELECT id FROM wingman_audit_events
        ORDER BY created_at DESC
        LIMIT 800
    );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old telemetry events (keeps last 400)
CREATE OR REPLACE FUNCTION cleanup_old_telemetry_events()
RETURNS void AS $$
BEGIN
    DELETE FROM wingman_telemetry_events
    WHERE id NOT IN (
        SELECT id FROM wingman_telemetry_events
        ORDER BY timestamp DESC
        LIMIT 400
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Optional: Scheduled Cleanup (requires pg_cron extension)
-- ============================================================================
-- Uncomment the following if you have pg_cron enabled in your Supabase project:
--
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions()');
-- SELECT cron.schedule('cleanup-audit', '0 0 * * *', 'SELECT cleanup_old_audit_events()');
-- SELECT cron.schedule('cleanup-telemetry', '0 0 * * *', 'SELECT cleanup_old_telemetry_events()');

-- ============================================================================
-- Migration Complete
-- ============================================================================
