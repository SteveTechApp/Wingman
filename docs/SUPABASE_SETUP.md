# Supabase Setup Guide for Wingman

This guide explains how to configure Supabase for production use with the Wingman application.

## Table of Contents

1. [Overview](#overview)
2. [Creating a Supabase Project](#creating-a-supabase-project)
3. [Running the Database Migration](#running-the-database-migration)
4. [Environment Variable Configuration](#environment-variable-configuration)
5. [Storage Modes](#storage-modes)
6. [Switching from File Storage to Supabase](#switching-from-file-storage-to-supabase)
7. [Verifying the Setup](#verifying-the-setup)
8. [Troubleshooting](#troubleshooting)

## Overview

Wingman supports three storage modes:

| Mode | Description | Best For |
|------|-------------|----------|
| `file` | Local JSON file storage | Development, single-server deployments |
| `supabase` | Single-row JSON in Supabase | Simple cloud deployments with low traffic |
| `supabase-tables` | Normalized relational tables | Production deployments with multiple users |

For production, we recommend **`supabase-tables`** mode for better performance, data integrity, and querying capabilities.

## Creating a Supabase Project

### Step 1: Create an Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" and sign up with GitHub, GitLab, or email
3. Complete the account verification process

### Step 2: Create a New Project

1. From the [Supabase Dashboard](https://supabase.com/dashboard), click "New Project"
2. Fill in the project details:
   - **Name**: Choose a descriptive name (e.g., "wingman-production")
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Select the region closest to your users
   - **Pricing Plan**: Free tier works for development; consider Pro for production
3. Click "Create new project" and wait for provisioning (usually 1-2 minutes)

### Step 3: Get Your API Credentials

1. In your project dashboard, go to **Project Settings** (gear icon)
2. Navigate to **API** in the left sidebar
3. Copy these values:
   - **Project URL**: Your `SUPABASE_URL` value
   - **service_role key**: Your `SUPABASE_SERVICE_ROLE_KEY` value

> **Security Warning**: The `service_role` key bypasses Row Level Security and has full database access. Never expose it in client-side code or commit it to version control.

## Running the Database Migration

### Option A: Using the Supabase SQL Editor (Recommended)

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the contents of `server/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click "Run" to execute the migration
6. If this database was provisioned before the `TO service_role` policy fix landed, also run
   `server/migrations/002_scope_service_role_policies.sql` (safe/no-op on a fresh database).

### Option B: Using the Supabase CLI

```bash
# Install the Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace with your project reference ID)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

Existing databases should also apply `server/migrations/002_scope_service_role_policies.sql`
(see note above) — a fresh database created from the current `001_initial_schema.sql` already
has this fix.

### Option C: Using psql Directly

```bash
# Get your connection string from Supabase Dashboard > Settings > Database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f server/migrations/001_initial_schema.sql
```

## Environment Variable Configuration

Add these environment variables to your `.env` file:

### Required Variables

```bash
# Supabase connection
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# Enable table storage mode
WINGMAN_STORAGE_MODE=supabase-tables
SUPABASE_WINGMAN_TABLES_ENABLED=true

# Fail if Supabase is unavailable (recommended for production)
WINGMAN_STORAGE_FAIL_CLOSED=true
```

### Optional Table Name Overrides

If you need to use different table names (e.g., for a shared database), you can override them:

```bash
SUPABASE_WINGMAN_USERS_TABLE=wingman_users
SUPABASE_WINGMAN_WORKSPACES_TABLE=wingman_workspaces
SUPABASE_WINGMAN_MEMBERS_TABLE=wingman_workspace_members
SUPABASE_WINGMAN_INVITATIONS_TABLE=wingman_workspace_invitations
SUPABASE_WINGMAN_SESSIONS_TABLE=wingman_sessions
SUPABASE_WINGMAN_PROJECTS_TABLE=wingman_projects
SUPABASE_WINGMAN_AUDIT_TABLE=wingman_audit_events
SUPABASE_WINGMAN_TELEMETRY_TABLE=wingman_telemetry_events
```

## Storage Modes

### File Storage (`file`)

- Data stored in `data/runtime/wingman-app-db.json`
- No external dependencies
- Not suitable for multi-server deployments
- Data lost if server storage is ephemeral

### Single-Row Supabase (`supabase`)

- Entire application state stored as JSON in one row
- Simple setup (only needs `wingman_app_state` table)
- Limited scalability (entire state loaded/saved on each operation)
- Suitable for small teams (< 10 users)

### Normalized Tables (`supabase-tables`)

- Proper relational schema with foreign keys
- Better query performance
- Supports larger datasets
- Enables future features like direct SQL queries, backups, and analytics
- Recommended for production

## Switching from File Storage to Supabase

If you have existing data in file storage that you want to migrate:

### Step 1: Export Current Data

The current state is stored in `data/runtime/wingman-app-db.json`. Make a backup:

```bash
cp data/runtime/wingman-app-db.json data/runtime/wingman-app-db.backup.json
```

### Step 2: Run the Migration

Execute the SQL migration as described above.

### Step 3: Configure Environment Variables

```bash
# Update your .env file
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WINGMAN_STORAGE_MODE=supabase-tables
SUPABASE_WINGMAN_TABLES_ENABLED=true
```

### Step 4: Start with Fresh Tables

When you restart the server with the new configuration, it will:
1. Connect to Supabase
2. Read from the (empty) tables
3. New signups and data will be stored in Supabase

### Step 5: Manual Data Migration (Optional)

If you need to migrate existing users and projects, you can:

1. Use the Supabase Dashboard to manually insert records
2. Write a migration script to read the JSON and insert via the Supabase client
3. Contact support for assistance with large data migrations

Example migration script outline:

```javascript
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const data = JSON.parse(await fs.readFile("data/runtime/wingman-app-db.json", "utf8"));

// Insert users
for (const user of data.users) {
  await supabase.from("wingman_users").insert({
    id: user.id,
    name: user.name,
    email: user.email,
    company: user.company,
    role: user.role,
    password_salt: user.passwordSalt,
    password_hash: user.passwordHash,
    status: user.status || "active",
    created_at: user.createdAt,
    last_login_at: user.lastLoginAt,
  });
}

// Continue for workspaces, members, projects, etc.
```

## Verifying the Setup

After configuration, verify the setup is working:

### 1. Check the Health Endpoint

```bash
curl http://localhost:8787/api/wingman/health
```

Expected response:

```json
{
  "ok": true,
  "service": "wingman-deployment-api",
  "storageModeConfigured": "supabase-tables",
  "storageModeActive": "supabase-tables",
  "users": 0,
  "workspaces": 0,
  "projects": 0
}
```

### 2. Test Sign Up

Create a new account through the UI or API to verify write operations work:

```bash
curl -X POST http://localhost:8787/api/wingman/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "company": "Test Company",
    "email": "test@example.com",
    "password": "securepassword123"
  }'
```

### 3. Verify Data in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Table Editor**
3. Check that records appear in `wingman_users` and `wingman_workspaces`

## Troubleshooting

### "Supabase storage mode is configured but Supabase credentials are missing"

Ensure both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly in your environment.

### "Supabase tables storage read failed"

1. Verify the migration was run successfully
2. Check that table names match the environment variables
3. Verify the service role key has access to the tables

### Storage Falling Back to File Mode

If `storageWarning` appears in the health response:

1. Check the `storageWarning` message for details
2. Verify Supabase credentials are correct
3. Ensure the project is not paused (free tier projects pause after inactivity)
4. Set `WINGMAN_STORAGE_FAIL_CLOSED=true` to prevent silent fallback

### Row Level Security Errors

The migration creates permissive RLS policies for service role access. If you encounter RLS errors:

1. Verify you're using the `service_role` key (not the `anon` key)
2. Check that RLS policies were created correctly
3. Run the RLS policy creation statements from the migration again if needed

### Connection Timeouts

1. Check that your server can reach Supabase (firewall rules)
2. Verify the region is appropriate for your deployment location
3. Consider connection pooling for high-traffic deployments

## Database Schema Reference

The following tables are created by the migration:

| Table | Description |
|-------|-------------|
| `wingman_app_state` | Single-row state storage (for `supabase` mode) |
| `wingman_users` | User accounts with hashed passwords |
| `wingman_workspaces` | Multi-tenant workspaces |
| `wingman_workspace_members` | User-workspace memberships with roles |
| `wingman_workspace_invitations` | Pending and accepted invitations |
| `wingman_sessions` | Active authentication sessions |
| `wingman_projects` | Sales projects with full payload |
| `wingman_audit_events` | Security and activity audit log |
| `wingman_telemetry_events` | Runtime error and event tracking |

For the complete schema definition, see `server/migrations/001_initial_schema.sql`. Databases
provisioned before the RLS policy role-scoping fix should also apply
`server/migrations/002_scope_service_role_policies.sql`.
