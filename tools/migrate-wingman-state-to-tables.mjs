import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const FILE_DB = path.join(ROOT, "data", "wingman-app-db.json");

function tidy(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readJsonFile(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function normalizeDb(db) {
  return {
    version: 1,
    updatedAt: tidy(db?.updatedAt) || new Date().toISOString(),
    users: asArray(db?.users),
    workspaces: asArray(db?.workspaces),
    invitations: asArray(db?.invitations),
    sessions: asArray(db?.sessions),
    projectsByWorkspace: db?.projectsByWorkspace && typeof db.projectsByWorkspace === "object" ? db.projectsByWorkspace : {},
    auditEvents: asArray(db?.auditEvents),
    telemetryEvents: asArray(db?.telemetryEvents),
  };
}

async function loadSourceDb(client, stateTable, stateRowId) {
  const fromFile = normalizeDb(await readJsonFile(FILE_DB, null));
  if (fromFile.users.length || fromFile.workspaces.length || Object.keys(fromFile.projectsByWorkspace).length) {
    return { source: "file", db: fromFile };
  }

  const { data } = await client
    .from(stateTable)
    .select("payload")
    .eq("id", stateRowId)
    .maybeSingle();

  return {
    source: "supabase-blob",
    db: normalizeDb(data?.payload),
  };
}

async function upsertRows(client, table, rows) {
  if (!rows.length) return;
  const { error } = await client.from(table).upsert(rows);
  if (error) throw error;
}

function summarizeCounts({ users, workspaces, memberships, sessions, projects, audits, telemetry }) {
  return {
    users: users.length,
    workspaces: workspaces.length,
    memberships: memberships.length,
    sessions: sessions.length,
    projects: projects.length,
    auditEvents: audits.length,
    telemetryEvents: telemetry.length,
  };
}

async function main() {
  const supabaseUrl = tidy(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const serviceRole = tidy(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRole) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const client = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tableNames = {
    state: tidy(process.env.SUPABASE_WINGMAN_STATE_TABLE || "wingman_app_state"),
    stateRowId: tidy(process.env.SUPABASE_WINGMAN_STATE_ROW_ID || "global"),
    users: tidy(process.env.SUPABASE_WINGMAN_USERS_TABLE || "wingman_users"),
    workspaces: tidy(process.env.SUPABASE_WINGMAN_WORKSPACES_TABLE || "wingman_workspaces"),
    memberships: tidy(process.env.SUPABASE_WINGMAN_MEMBERS_TABLE || "wingman_workspace_members"),
    invitations: tidy(process.env.SUPABASE_WINGMAN_INVITATIONS_TABLE || "wingman_workspace_invitations"),
    sessions: tidy(process.env.SUPABASE_WINGMAN_SESSIONS_TABLE || "wingman_sessions"),
    projects: tidy(process.env.SUPABASE_WINGMAN_PROJECTS_TABLE || "wingman_projects"),
    audits: tidy(process.env.SUPABASE_WINGMAN_AUDIT_TABLE || "wingman_audit_events"),
    telemetry: tidy(process.env.SUPABASE_WINGMAN_TELEMETRY_TABLE || "wingman_telemetry_events"),
  };

  const { source, db } = await loadSourceDb(client, tableNames.state, tableNames.stateRowId);

  const workspaces = db.workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    tier: workspace.tier || "pilot",
    owner_user_id: workspace.ownerUserId,
    active_project_id: db.projectsByWorkspace?.[workspace.id]?.activeProjectId || null,
    created_at: workspace.createdAt || new Date().toISOString(),
  }));

  const users = db.users.map((user) => ({
    id: user.id,
    name: user.name,
    company: user.company || null,
    email: user.email,
    role: user.role || "sales",
    password_salt: user.passwordSalt,
    password_hash: user.passwordHash,
    status: user.status || "active",
    created_at: user.createdAt || new Date().toISOString(),
    last_login_at: user.lastLoginAt || null,
  }));

  const memberships = db.workspaces.flatMap((workspace) =>
    asArray(workspace.memberships?.length ? workspace.memberships : asArray(workspace.memberIds).map((userId) => ({
      userId,
      role: workspace.ownerUserId === userId ? "owner" : "sales",
      createdAt: workspace.createdAt,
    }))).map((membership) => ({
      id: `${workspace.id}:${membership.userId}`,
      workspace_id: workspace.id,
      user_id: membership.userId,
      role: membership.role || (workspace.ownerUserId === membership.userId ? "owner" : "sales"),
      created_at: membership.createdAt || workspace.createdAt || new Date().toISOString(),
    })),
  );

  const invitations = db.invitations.map((invitation) => ({
    id: invitation.id,
    workspace_id: invitation.workspaceId,
    email: invitation.email,
    role: invitation.role || "customer",
    status: invitation.status || "pending",
    invited_by_user_id: invitation.invitedByUserId || null,
    invited_by_name: invitation.invitedByName || "Wingman",
    invited_by_email: invitation.invitedByEmail || null,
    token_hash: invitation.tokenHash,
    created_at: invitation.createdAt || new Date().toISOString(),
    accepted_at: invitation.acceptedAt || null,
  }));

  const sessions = db.sessions.map((session) => ({
    id: session.id,
    token_hash: session.tokenHash,
    user_id: session.userId,
    workspace_id: session.workspaceId,
    created_at: session.createdAt,
    expires_at: session.expiresAt,
    last_seen_at: session.lastSeenAt,
  }));

  const projectWorkspaceMap = new Map();
  const projects = Object.entries(db.projectsByWorkspace).flatMap(([workspaceId, state]) =>
    asArray(state?.projects).map((project) => {
      projectWorkspaceMap.set(project.id, workspaceId);
      return {
        id: project.id,
        workspace_id: workspaceId,
        owner_id: project.ownerId || null,
        project_name: project.name || "Untitled Project",
        customer: project.customer || null,
        site: project.site || null,
        room_name: project.roomName || null,
        stage: project.stage || "Discovery",
        status: project.status || "Draft",
        created_at: project.createdAt || new Date().toISOString(),
        updated_at: project.updatedAt || project.createdAt || new Date().toISOString(),
        payload: project,
      };
    }),
  );

  const audits = db.auditEvents.map((event) => ({
    id: event.id,
    workspace_id: event.workspaceId || projectWorkspaceMap.get(event.projectId) || null,
    project_id: event.projectId || null,
    actor_name: event.actorName || "Wingman",
    actor_email: event.actorEmail || null,
    scope: event.scope || "projects",
    action: event.action || "updated",
    severity: event.severity || "info",
    detail: event.detail || "Workspace activity captured.",
    created_at: event.createdAt || new Date().toISOString(),
    payload: event,
  }));

  const telemetry = db.telemetryEvents.map((event) => ({
    id: event.id,
    workspace_id: event.workspaceId || projectWorkspaceMap.get(event.projectId) || null,
    user_id: event.userId || null,
    project_id: event.projectId || null,
    kind: event.kind || "info",
    message: event.message || "Runtime event",
    timestamp: event.timestamp || new Date().toISOString(),
    payload: event,
  }));

  await upsertRows(client, tableNames.users, users);
  await upsertRows(client, tableNames.workspaces, workspaces);
  await upsertRows(client, tableNames.memberships, memberships);
  await upsertRows(client, tableNames.invitations, invitations);
  await upsertRows(client, tableNames.sessions, sessions);
  await upsertRows(client, tableNames.projects, projects);
  await upsertRows(client, tableNames.audits, audits);
  await upsertRows(client, tableNames.telemetry, telemetry);

  console.log("[wingman-migrate] source:", source);
  console.log("[wingman-migrate] migrated:", summarizeCounts({ users, workspaces, memberships, sessions, projects, audits, telemetry }));
  console.log("[wingman-migrate] invitations:", invitations.length);
}

main().catch((error) => {
  console.error("[wingman-migrate] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
