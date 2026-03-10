import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const DB_FILE = path.join(ROOT, "data", "wingman-app-db.json");
const GOVERNANCE_FILE = path.join(ROOT, "src", "data", "governance", "wingman-governance.json");
const SESSION_TTL_MS = Math.max(60 * 60 * 1000, Number(process.env.WINGMAN_SESSION_TTL_MS || 7 * 24 * 60 * 60 * 1000));
const AUDIT_RETENTION = Math.max(50, Number(process.env.WINGMAN_AUDIT_RETENTION || 800));
const TELEMETRY_RETENTION = Math.max(50, Number(process.env.WINGMAN_TELEMETRY_RETENTION || 400));
const scryptAsync = promisify(crypto.scrypt);
let supabaseAdmin = null;
let lastStorageModeUsed = "file";
let lastStorageWarning = "";

function nowIso() {
  return new Date().toISOString();
}

function tidy(value) {
  return String(value ?? "").trim();
}

const WINGMAN_STORAGE_MODE = String(process.env.WINGMAN_STORAGE_MODE || "auto").trim().toLowerCase();
const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const SUPABASE_WINGMAN_STATE_TABLE = String(process.env.SUPABASE_WINGMAN_STATE_TABLE || "wingman_app_state").trim();
const SUPABASE_WINGMAN_STATE_ROW_ID = String(process.env.SUPABASE_WINGMAN_STATE_ROW_ID || "global").trim();
const SUPABASE_WINGMAN_TABLES_ENABLED = !["0", "false", "off", "no"].includes(
  String(process.env.SUPABASE_WINGMAN_TABLES_ENABLED || "false").trim().toLowerCase(),
);
const SUPABASE_WINGMAN_USERS_TABLE = String(process.env.SUPABASE_WINGMAN_USERS_TABLE || "wingman_users").trim();
const SUPABASE_WINGMAN_WORKSPACES_TABLE = String(process.env.SUPABASE_WINGMAN_WORKSPACES_TABLE || "wingman_workspaces").trim();
const SUPABASE_WINGMAN_MEMBERS_TABLE = String(process.env.SUPABASE_WINGMAN_MEMBERS_TABLE || "wingman_workspace_members").trim();
const SUPABASE_WINGMAN_INVITATIONS_TABLE = String(process.env.SUPABASE_WINGMAN_INVITATIONS_TABLE || "wingman_workspace_invitations").trim();
const SUPABASE_WINGMAN_SESSIONS_TABLE = String(process.env.SUPABASE_WINGMAN_SESSIONS_TABLE || "wingman_sessions").trim();
const SUPABASE_WINGMAN_PROJECTS_TABLE = String(process.env.SUPABASE_WINGMAN_PROJECTS_TABLE || "wingman_projects").trim();
const SUPABASE_WINGMAN_AUDIT_TABLE = String(process.env.SUPABASE_WINGMAN_AUDIT_TABLE || "wingman_audit_events").trim();
const SUPABASE_WINGMAN_TELEMETRY_TABLE = String(process.env.SUPABASE_WINGMAN_TELEMETRY_TABLE || "wingman_telemetry_events").trim();

function normalizeEmail(value) {
  return tidy(value).toLowerCase();
}

function slugify(value) {
  const base = tidy(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || "wingman-workspace";
}

function makeId(prefix = "wm") {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeWorkspaceRole(value, fallback = "sales") {
  const role = tidy(value).toLowerCase();
  if (role === "owner" || role === "admin" || role === "sales" || role === "customer") return role;
  if (role === "member") return "sales";
  return fallback;
}

function cloneJson(value, fallback = {}) {
  try {
    return JSON.parse(JSON.stringify(value ?? fallback));
  } catch {
    return fallback;
  }
}

async function readJsonFile(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function configuredStorageMode() {
  const supabaseReady = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
  if (WINGMAN_STORAGE_MODE === "file") return "file";
  if (WINGMAN_STORAGE_MODE === "supabase" && supabaseReady) return "supabase";
  if (WINGMAN_STORAGE_MODE === "supabase" && !supabaseReady) return "file";
  if (WINGMAN_STORAGE_MODE === "supabase-tables" && supabaseReady) return "supabase-tables";
  if (WINGMAN_STORAGE_MODE === "supabase-tables" && !supabaseReady) return "file";
  if (supabaseReady && SUPABASE_WINGMAN_TABLES_ENABLED) return "supabase-tables";
  return supabaseReady ? "supabase" : "file";
}

function getSupabaseAdmin() {
  const mode = configuredStorageMode();
  if (mode !== "supabase" && mode !== "supabase-tables") return null;
  if (supabaseAdmin) return supabaseAdmin;
  try {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return supabaseAdmin;
  } catch {
    return null;
  }
}

function emptyDb() {
  return {
    version: 1,
    updatedAt: nowIso(),
    users: [],
    workspaces: [],
    invitations: [],
    sessions: [],
    projectsByWorkspace: {},
    auditEvents: [],
    telemetryEvents: [],
  };
}

function normalizeDb(db) {
  db.users = Array.isArray(db.users) ? db.users : [];
  db.workspaces = (Array.isArray(db.workspaces) ? db.workspaces : []).map((workspace) => {
    const ownerUserId = tidy(workspace?.ownerUserId);
    const legacyMembers = asArray(workspace?.memberIds)
      .map((userId) => tidy(userId))
      .filter(Boolean);
    const memberships = asArray(workspace?.memberships).map((membership) => ({
      userId: tidy(membership?.userId),
      role: normalizeWorkspaceRole(membership?.role, "sales"),
      createdAt: tidy(membership?.createdAt) || workspace?.createdAt || nowIso(),
    }))
      .filter((membership) => membership.userId);

    if (ownerUserId && !memberships.some((membership) => membership.userId === ownerUserId)) {
      memberships.unshift({
        userId: ownerUserId,
        role: "owner",
        createdAt: tidy(workspace?.createdAt) || nowIso(),
      });
    }

    for (const userId of legacyMembers) {
      if (!memberships.some((membership) => membership.userId === userId)) {
        memberships.push({
          userId,
          role: ownerUserId === userId ? "owner" : "sales",
          createdAt: tidy(workspace?.createdAt) || nowIso(),
        });
      }
    }

    const memberIds = Array.from(new Set(memberships.map((membership) => membership.userId)));

    return {
      ...workspace,
      id: tidy(workspace?.id),
      name: tidy(workspace?.name),
      slug: tidy(workspace?.slug),
      tier: tidy(workspace?.tier) || "pilot",
      ownerUserId,
      memberIds,
      memberships,
      createdAt: tidy(workspace?.createdAt) || nowIso(),
    };
  }).filter((workspace) => workspace.id);
  db.invitations = Array.isArray(db.invitations) ? db.invitations : [];
  db.sessions = Array.isArray(db.sessions) ? db.sessions : [];
  db.projectsByWorkspace = db.projectsByWorkspace && typeof db.projectsByWorkspace === "object" ? db.projectsByWorkspace : {};
  db.auditEvents = Array.isArray(db.auditEvents) ? db.auditEvents : [];
  db.telemetryEvents = Array.isArray(db.telemetryEvents) ? db.telemetryEvents : [];
  return db;
}

function sqlList(values) {
  return `(${values.map((value) => `"${String(value).replace(/"/g, '\\"')}"`).join(",")})`;
}

async function upsertRows(client, table, rows) {
  if (!rows.length) return true;
  const { error } = await client.from(table).upsert(rows);
  if (error) {
    lastStorageWarning = error.message;
    return false;
  }
  return true;
}

async function deleteRowsNotIn(client, table, ids) {
  let query = client.from(table).delete();
  if (ids.length > 0) {
    query = query.not("id", "in", sqlList(ids));
  }
  const { error } = await query;
  if (error) {
    lastStorageWarning = error.message;
    return false;
  }
  return true;
}

async function readDbFromSupabaseTables() {
  const client = getSupabaseAdmin();
  if (!client) return null;

  const results = await Promise.all([
    client.from(SUPABASE_WINGMAN_USERS_TABLE).select("*"),
    client.from(SUPABASE_WINGMAN_WORKSPACES_TABLE).select("*"),
    client.from(SUPABASE_WINGMAN_MEMBERS_TABLE).select("*"),
    client.from(SUPABASE_WINGMAN_INVITATIONS_TABLE).select("*"),
    client.from(SUPABASE_WINGMAN_SESSIONS_TABLE).select("*"),
    client.from(SUPABASE_WINGMAN_PROJECTS_TABLE).select("*"),
    client.from(SUPABASE_WINGMAN_AUDIT_TABLE).select("*"),
    client.from(SUPABASE_WINGMAN_TELEMETRY_TABLE).select("*"),
  ]);

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    lastStorageWarning = firstError.message;
    return null;
  }

  const usersRows = results[0].data ?? [];
  const workspaceRows = results[1].data ?? [];
  const memberRows = results[2].data ?? [];
  const invitationRows = results[3].data ?? [];
  const sessionRows = results[4].data ?? [];
  const projectRows = results[5].data ?? [];
  const auditRows = results[6].data ?? [];
  const telemetryRows = results[7].data ?? [];

  const membershipsByWorkspace = new Map();
  const workspaceIdsByUser = new Map();
  for (const member of memberRows) {
    const workspaceId = tidy(member?.workspace_id);
    const userId = tidy(member?.user_id);
    if (!workspaceId || !userId) continue;
    membershipsByWorkspace.set(workspaceId, [
      ...(membershipsByWorkspace.get(workspaceId) ?? []),
      {
        userId,
        role: normalizeWorkspaceRole(member?.role, "sales"),
        createdAt: tidy(member?.created_at) || nowIso(),
      },
    ]);
    workspaceIdsByUser.set(userId, [...(workspaceIdsByUser.get(userId) ?? []), workspaceId]);
  }

  const db = normalizeDb({
    version: 1,
    updatedAt: nowIso(),
    users: usersRows.map((row) => ({
      id: tidy(row?.id),
      name: tidy(row?.name),
      company: tidy(row?.company),
      email: tidy(row?.email),
      role: tidy(row?.role) || "sales",
      passwordSalt: tidy(row?.password_salt),
      passwordHash: tidy(row?.password_hash),
      workspaceIds: workspaceIdsByUser.get(tidy(row?.id)) ?? [],
      createdAt: tidy(row?.created_at),
      lastLoginAt: tidy(row?.last_login_at),
      status: tidy(row?.status) || "active",
    })),
    workspaces: workspaceRows.map((row) => ({
      id: tidy(row?.id),
      name: tidy(row?.name),
      slug: tidy(row?.slug),
      tier: tidy(row?.tier) || "pilot",
      ownerUserId: tidy(row?.owner_user_id),
      memberIds: (membershipsByWorkspace.get(tidy(row?.id)) ?? []).map((membership) => membership.userId),
      memberships: membershipsByWorkspace.get(tidy(row?.id)) ?? [],
      createdAt: tidy(row?.created_at),
    })),
    invitations: invitationRows.map((row) => ({
      id: tidy(row?.id),
      workspaceId: tidy(row?.workspace_id),
      email: normalizeEmail(row?.email),
      role: normalizeWorkspaceRole(row?.role, "customer"),
      status: tidy(row?.status) || "pending",
      invitedByUserId: tidy(row?.invited_by_user_id),
      invitedByName: tidy(row?.invited_by_name),
      invitedByEmail: normalizeEmail(row?.invited_by_email),
      tokenHash: tidy(row?.token_hash),
      createdAt: tidy(row?.created_at) || nowIso(),
      acceptedAt: tidy(row?.accepted_at) || undefined,
    })).filter((invitation) => invitation.id && invitation.workspaceId && invitation.email),
    sessions: sessionRows.map((row) => ({
      id: tidy(row?.id),
      tokenHash: tidy(row?.token_hash),
      userId: tidy(row?.user_id),
      workspaceId: tidy(row?.workspace_id),
      createdAt: tidy(row?.created_at),
      expiresAt: tidy(row?.expires_at),
      lastSeenAt: tidy(row?.last_seen_at),
    })),
    projectsByWorkspace: {},
    auditEvents: auditRows
      .map((row) => ({
        ...(row?.payload && typeof row.payload === "object" ? row.payload : {}),
        id: tidy(row?.id),
        workspaceId: tidy(row?.workspace_id) || undefined,
        projectId: tidy(row?.project_id) || undefined,
        actorName: tidy(row?.actor_name),
        actorEmail: tidy(row?.actor_email),
        scope: tidy(row?.scope),
        action: tidy(row?.action),
        severity: tidy(row?.severity),
        detail: tidy(row?.detail),
        createdAt: tidy(row?.created_at),
      }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    telemetryEvents: telemetryRows
      .map((row) => ({
        ...(row?.payload && typeof row.payload === "object" ? row.payload : {}),
        id: tidy(row?.id),
        workspaceId: tidy(row?.workspace_id) || undefined,
        userId: tidy(row?.user_id) || undefined,
        projectId: tidy(row?.project_id) || undefined,
        kind: tidy(row?.kind),
        message: tidy(row?.message),
        timestamp: tidy(row?.timestamp),
      }))
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))),
  });

  for (const row of workspaceRows) {
    const workspaceId = tidy(row?.id);
    if (!workspaceId) continue;
    db.projectsByWorkspace[workspaceId] = {
      activeProjectId: tidy(row?.active_project_id) || null,
      projects: projectRows
        .filter((project) => tidy(project?.workspace_id) === workspaceId)
        .map((project) => project?.payload)
        .filter(Boolean),
    };
  }

  lastStorageWarning = "";
  return db;
}

async function readDbFromSupabase() {
  const client = getSupabaseAdmin();
  if (!client) return null;

  const { data, error } = await client
    .from(SUPABASE_WINGMAN_STATE_TABLE)
    .select("payload")
    .eq("id", SUPABASE_WINGMAN_STATE_ROW_ID)
    .maybeSingle();

  if (error) {
    lastStorageWarning = error.message;
    return null;
  }

  if (!data?.payload || typeof data.payload !== "object") {
    lastStorageWarning = "";
    return emptyDb();
  }

  lastStorageWarning = "";
  return normalizeDb(data.payload);
}

async function writeDbToSupabaseTables(db) {
  const client = getSupabaseAdmin();
  if (!client) return false;

  const normalized = normalizeDb(cloneJson(db, emptyDb()));
  const workspaces = normalized.workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    tier: workspace.tier || "pilot",
    owner_user_id: workspace.ownerUserId,
    active_project_id: normalized.projectsByWorkspace?.[workspace.id]?.activeProjectId || null,
    created_at: workspace.createdAt || nowIso(),
  }));
  const users = normalized.users.map((user) => ({
    id: user.id,
    name: user.name,
    company: user.company || null,
    email: user.email,
    role: user.role || "sales",
    password_salt: user.passwordSalt,
    password_hash: user.passwordHash,
    status: user.status || "active",
    created_at: user.createdAt || nowIso(),
    last_login_at: user.lastLoginAt || null,
  }));
  const memberships = normalized.workspaces.flatMap((workspace) =>
    asArray(workspace.memberships).map((membership) => ({
      id: `${workspace.id}:${membership.userId}`,
      workspace_id: workspace.id,
      user_id: membership.userId,
      role: normalizeWorkspaceRole(membership.role, workspace.ownerUserId === membership.userId ? "owner" : "sales"),
      created_at: membership.createdAt || workspace.createdAt || nowIso(),
    })),
  );
  const invitations = normalized.invitations.map((invitation) => ({
    id: invitation.id,
    workspace_id: invitation.workspaceId,
    email: invitation.email,
    role: normalizeWorkspaceRole(invitation.role, "customer"),
    status: tidy(invitation.status) || "pending",
    invited_by_user_id: invitation.invitedByUserId || null,
    invited_by_name: invitation.invitedByName || "Wingman",
    invited_by_email: invitation.invitedByEmail || null,
    token_hash: invitation.tokenHash,
    created_at: invitation.createdAt || nowIso(),
    accepted_at: invitation.acceptedAt || null,
  }));
  const sessions = normalized.sessions.map((session) => ({
    id: session.id,
    token_hash: session.tokenHash,
    user_id: session.userId,
    workspace_id: session.workspaceId,
    created_at: session.createdAt,
    expires_at: session.expiresAt,
    last_seen_at: session.lastSeenAt,
  }));
  const projectWorkspaceMap = new Map();
  const projects = Object.entries(normalized.projectsByWorkspace).flatMap(([workspaceId, state]) =>
    asArray(state?.projects).map((project) => {
      const payload = cloneJson(project, {});
      projectWorkspaceMap.set(payload.id, workspaceId);
      return {
        id: payload.id,
        workspace_id: workspaceId,
        owner_id: payload.ownerId || null,
        project_name: payload.name || "Untitled Project",
        customer: payload.customer || null,
        site: payload.site || null,
        room_name: payload.roomName || null,
        stage: payload.stage || "Discovery",
        status: payload.status || "Draft",
        created_at: payload.createdAt || nowIso(),
        updated_at: payload.updatedAt || payload.createdAt || nowIso(),
        payload,
      };
    }),
  );
  const auditEvents = normalized.auditEvents.map((event) => ({
    id: event.id,
    workspace_id: event.workspaceId || projectWorkspaceMap.get(event.projectId) || null,
    project_id: event.projectId || null,
    actor_name: event.actorName || "Wingman",
    actor_email: event.actorEmail || null,
    scope: event.scope || "projects",
    action: event.action || "updated",
    severity: event.severity || "info",
    detail: event.detail || "Workspace activity captured.",
    created_at: event.createdAt || nowIso(),
    payload: cloneJson(event, {}),
  }));
  const telemetryEvents = normalized.telemetryEvents.map((event) => ({
    id: event.id,
    workspace_id: event.workspaceId || projectWorkspaceMap.get(event.projectId) || null,
    user_id: event.userId || null,
    project_id: event.projectId || null,
    kind: event.kind || "info",
    message: event.message || "Runtime event",
    timestamp: event.timestamp || nowIso(),
    payload: cloneJson(event, {}),
  }));

  if (!(await upsertRows(client, SUPABASE_WINGMAN_USERS_TABLE, users))) return false;
  if (!(await upsertRows(client, SUPABASE_WINGMAN_WORKSPACES_TABLE, workspaces))) return false;
  if (!(await upsertRows(client, SUPABASE_WINGMAN_MEMBERS_TABLE, memberships))) return false;
  if (!(await upsertRows(client, SUPABASE_WINGMAN_INVITATIONS_TABLE, invitations))) return false;
  if (!(await upsertRows(client, SUPABASE_WINGMAN_SESSIONS_TABLE, sessions))) return false;
  if (!(await upsertRows(client, SUPABASE_WINGMAN_PROJECTS_TABLE, projects))) return false;
  if (!(await upsertRows(client, SUPABASE_WINGMAN_AUDIT_TABLE, auditEvents))) return false;
  if (!(await upsertRows(client, SUPABASE_WINGMAN_TELEMETRY_TABLE, telemetryEvents))) return false;

  if (!(await deleteRowsNotIn(client, SUPABASE_WINGMAN_TELEMETRY_TABLE, telemetryEvents.map((row) => row.id)))) return false;
  if (!(await deleteRowsNotIn(client, SUPABASE_WINGMAN_AUDIT_TABLE, auditEvents.map((row) => row.id)))) return false;
  if (!(await deleteRowsNotIn(client, SUPABASE_WINGMAN_PROJECTS_TABLE, projects.map((row) => row.id)))) return false;
  if (!(await deleteRowsNotIn(client, SUPABASE_WINGMAN_SESSIONS_TABLE, sessions.map((row) => row.id)))) return false;
  if (!(await deleteRowsNotIn(client, SUPABASE_WINGMAN_INVITATIONS_TABLE, invitations.map((row) => row.id)))) return false;
  if (!(await deleteRowsNotIn(client, SUPABASE_WINGMAN_MEMBERS_TABLE, memberships.map((row) => row.id)))) return false;
  if (!(await deleteRowsNotIn(client, SUPABASE_WINGMAN_WORKSPACES_TABLE, workspaces.map((row) => row.id)))) return false;
  if (!(await deleteRowsNotIn(client, SUPABASE_WINGMAN_USERS_TABLE, users.map((row) => row.id)))) return false;

  lastStorageWarning = "";
  return true;
}

async function writeDbToSupabase(db) {
  const client = getSupabaseAdmin();
  if (!client) return false;

  const payload = normalizeDb(cloneJson(db, emptyDb()));
  const { error } = await client.from(SUPABASE_WINGMAN_STATE_TABLE).upsert({
    id: SUPABASE_WINGMAN_STATE_ROW_ID,
    payload,
    updated_at: nowIso(),
  });

  if (error) {
    lastStorageWarning = error.message;
    return false;
  }

  lastStorageWarning = "";
  return true;
}

async function readDb() {
  if (configuredStorageMode() === "supabase-tables") {
    const remote = await readDbFromSupabaseTables();
    if (remote) {
      lastStorageModeUsed = "supabase-tables";
      return remote;
    }
  }

  if (configuredStorageMode() === "supabase") {
    const remote = await readDbFromSupabase();
    if (remote) {
      lastStorageModeUsed = "supabase";
      return remote;
    }
  }

  lastStorageModeUsed = "file";
  lastStorageWarning = "";
  const db = await readJsonFile(DB_FILE, emptyDb());
  return normalizeDb(db);
}

async function writeDb(db) {
  db.updatedAt = nowIso();
  if (configuredStorageMode() === "supabase-tables") {
    const saved = await writeDbToSupabaseTables(db);
    if (saved) {
      lastStorageModeUsed = "supabase-tables";
      return;
    }
  }
  if (configuredStorageMode() === "supabase") {
    const saved = await writeDbToSupabase(db);
    if (saved) {
      lastStorageModeUsed = "supabase";
      return;
    }
  }
  lastStorageModeUsed = "file";
  lastStorageWarning = "";
  await writeJsonFile(DB_FILE, db);
}

async function readGovernance() {
  return readJsonFile(GOVERNANCE_FILE, {
    recommendationRules: {
      id: "guided-project-physical-dynamics",
      version: "2026.03.10",
      approvedAt: "2026-03-10T09:00:00.000Z",
      approvedBy: "WyreStorm Solutions Engineering",
      catalogVersion: "wyrestorm-catalog.phase1",
      changeSummary: "Guided Project recommendations branch on source origin, first hop, cable media, network readiness, and endpoint delivery.",
      explainability: [],
    },
    deploymentControls: {
      workspaceIsolation: "Projects, telemetry, and audit events are stored per authenticated workspace.",
      auditCoverage: [],
      retentionDays: 90,
    },
  });
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = await scryptAsync(password, salt, 64);
  return {
    salt,
    hash: Buffer.from(derived).toString("hex"),
  };
}

async function verifyPassword(password, user) {
  const next = await hashPassword(password, user.passwordSalt);
  const expected = Buffer.from(user.passwordHash, "hex");
  const actual = Buffer.from(next.hash, "hex");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return Array.from(new Set(asArray(values).map((value) => tidy(value)).filter(Boolean)));
}

function getWorkspaceMemberships(workspace) {
  const normalizedWorkspace = normalizeDb({ ...emptyDb(), workspaces: [workspace] }).workspaces[0];
  return asArray(normalizedWorkspace?.memberships);
}

function getWorkspaceRoleForUser(workspace, userId) {
  if (!workspace || !userId) return null;
  const membership = getWorkspaceMemberships(workspace).find((entry) => entry.userId === userId);
  return membership?.role || null;
}

function permissionsForWorkspaceRole(role) {
  const normalizedRole = normalizeWorkspaceRole(role, "sales");
  const isAdmin = normalizedRole === "owner" || normalizedRole === "admin";
  const isEditor = isAdmin || normalizedRole === "sales";
  return {
    canManageWorkspace: isAdmin,
    canEditProjects: isEditor,
    canCreateInternalComments: isEditor,
    canCreateCustomerComments: isEditor || normalizedRole === "customer",
    canPrepareShares: isEditor,
    canRegisterAttachments: isEditor,
    canMarkCommercialReady: isEditor,
    canViewDiagnostics: isEditor,
  };
}

function canManageWorkspaceRole(actorRole, targetRole) {
  const actor = normalizeWorkspaceRole(actorRole, "sales");
  const target = normalizeWorkspaceRole(targetRole, "sales");
  if (actor === "owner") return target !== "owner";
  if (actor === "admin") return target === "sales" || target === "customer";
  return false;
}

function addMembershipToWorkspace(workspace, userId, role, createdAt = nowIso()) {
  const memberships = getWorkspaceMemberships(workspace).filter((membership) => membership.userId !== userId);
  memberships.push({
    userId,
    role: normalizeWorkspaceRole(role, workspace.ownerUserId === userId ? "owner" : "sales"),
    createdAt,
  });
  workspace.memberships = memberships;
  workspace.memberIds = unique(memberships.map((membership) => membership.userId));
}

function removePendingInvitationsForMember(db, workspaceId, email) {
  db.invitations = asArray(db.invitations).map((invitation) => {
    if (invitation.workspaceId !== workspaceId || invitation.email !== email || invitation.status !== "pending") {
      return invitation;
    }
    return {
      ...invitation,
      status: "accepted",
      acceptedAt: invitation.acceptedAt || nowIso(),
    };
  });
}

function createInvitationToken() {
  return crypto.randomBytes(24).toString("hex");
}

function publicWorkspaceMember(workspace, membership, user, lastSeenAt) {
  return {
    id: `${workspace.id}:${membership.userId}`,
    userId: membership.userId,
    name: user?.name || user?.email || "Workspace member",
    email: user?.email || "",
    company: user?.company || undefined,
    role: normalizeWorkspaceRole(membership.role, membership.userId === workspace.ownerUserId ? "owner" : "sales"),
    joinedAt: membership.createdAt || workspace.createdAt || nowIso(),
    lastSeenAt: lastSeenAt || undefined,
  };
}

function publicInvitation(invitation, workspace, token) {
  return {
    id: invitation.id,
    workspaceId: invitation.workspaceId,
    workspaceName: workspace?.name || "Wingman Workspace",
    email: invitation.email,
    role: normalizeWorkspaceRole(invitation.role, "customer"),
    status: tidy(invitation.status) || "pending",
    invitedByName: invitation.invitedByName || "Wingman",
    invitedByEmail: invitation.invitedByEmail || "",
    createdAt: invitation.createdAt || nowIso(),
    acceptedAt: invitation.acceptedAt || undefined,
    acceptUrl: token ? `/invite?token=${encodeURIComponent(token)}` : undefined,
  };
}

function findWorkspaceMember(workspace, userId) {
  return getWorkspaceMemberships(workspace).find((membership) => membership.userId === userId) || null;
}

function findPendingInvitationByToken(db, token) {
  const tokenHash = hashToken(token);
  return asArray(db.invitations).find((invitation) =>
    invitation.status === "pending" && invitation.tokenHash === tokenHash
  ) || null;
}

function sanitizeAuditEntry(entry, fallback = {}) {
  return {
    id: tidy(entry?.id) || makeId("audit"),
    workspaceId: tidy(entry?.workspaceId || fallback.workspaceId) || undefined,
    scope: tidy(entry?.scope || fallback.scope) || "projects",
    action: tidy(entry?.action || fallback.action) || "updated",
    detail: tidy(entry?.detail || fallback.detail) || "Workspace activity captured.",
    actorName: tidy(entry?.actorName || fallback.actorName) || "Wingman",
    actorEmail: normalizeEmail(entry?.actorEmail || fallback.actorEmail),
    severity: ["info", "warn", "error"].includes(tidy(entry?.severity || fallback.severity)) ? tidy(entry?.severity || fallback.severity) : "info",
    createdAt: tidy(entry?.createdAt || fallback.createdAt) || nowIso(),
    projectId: tidy(entry?.projectId || fallback.projectId) || undefined,
  };
}

function mergeById(existing, incoming, fallbackFactory = (item) => item) {
  const out = new Map();
  for (const item of asArray(existing)) {
    if (!item?.id) continue;
    out.set(item.id, cloneJson(item));
  }
  for (const item of asArray(incoming)) {
    const normalized = fallbackFactory(item);
    if (!normalized?.id) continue;
    out.set(normalized.id, normalized);
  }
  return Array.from(out.values());
}

function sanitizeProject(project, workspaceId, userId) {
  const source = cloneJson(project, {});
  const createdAt = tidy(source.createdAt) || nowIso();
  const updatedAt = tidy(source.updatedAt) || createdAt;

  return {
    ...source,
    id: tidy(source.id) || makeId("proj"),
    workspaceId,
    ownerId: tidy(source.ownerId) || userId,
    name: tidy(source.name) || "Untitled Project",
    customer: tidy(source.customer),
    site: tidy(source.site),
    roomName: tidy(source.roomName),
    stage: tidy(source.stage) || "Discovery",
    status: tidy(source.status) || "Draft",
    notes: tidy(source.notes),
    createdAt,
    updatedAt,
    attachments: mergeById([], source.attachments, (item) => ({
      id: tidy(item?.id) || makeId("attach"),
      name: tidy(item?.name) || "Imported asset",
      kind: tidy(item?.kind) || "other",
      source: tidy(item?.source) || "Wingman",
      summary: tidy(item?.summary) || undefined,
      contentType: tidy(item?.contentType) || undefined,
      sizeBytes: Number.isFinite(Number(item?.sizeBytes)) ? Number(item.sizeBytes) : undefined,
      uploadedAt: tidy(item?.uploadedAt) || nowIso(),
      uploadedBy: tidy(item?.uploadedBy) || userId,
    })),
    comments: mergeById([], source.comments, (item) => ({
      id: tidy(item?.id) || makeId("comment"),
      body: tidy(item?.body),
      audience: tidy(item?.audience) === "customer" ? "customer" : "internal",
      authorName: tidy(item?.authorName) || "Wingman user",
      authorEmail: normalizeEmail(item?.authorEmail),
      createdAt: tidy(item?.createdAt) || nowIso(),
    })).filter((item) => item.body),
    shares: mergeById([], source.shares, (item) => ({
      id: tidy(item?.id) || makeId("share"),
      title: tidy(item?.title) || "Customer share pack",
      message: tidy(item?.message) || "",
      audience: tidy(item?.audience) === "internal" ? "internal" : "customer",
      status: tidy(item?.status) || "draft",
      shareUrl: tidy(item?.shareUrl) || undefined,
      accessCode: tidy(item?.accessCode) || undefined,
      summaryHeadline: tidy(item?.summaryHeadline) || undefined,
      createdAt: tidy(item?.createdAt) || nowIso(),
      createdBy: tidy(item?.createdBy) || userId,
    })),
    auditTrail: mergeById([], source.auditTrail, (item) => sanitizeAuditEntry(item, { actorName: "Wingman", actorEmail: "" }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 20),
    recommendationGovernance: source.recommendationGovernance && typeof source.recommendationGovernance === "object"
      ? cloneJson(source.recommendationGovernance)
      : undefined,
    customerSummary: source.customerSummary && typeof source.customerSummary === "object"
      ? cloneJson(source.customerSummary)
      : undefined,
  };
}

function makeProjectAuditEvent({ scope, action, detail, user, projectId, workspaceId, severity = "info" }) {
  return sanitizeAuditEntry({
    workspaceId,
    scope,
    action,
    detail,
    actorName: user.name || user.email || "Wingman user",
    actorEmail: user.email || "",
    severity,
    projectId,
  });
}

function appendAuditEvent(db, event) {
  db.auditEvents = [event, ...asArray(db.auditEvents)].slice(0, AUDIT_RETENTION);
}

function appendProjectAudit(project, event) {
  project.auditTrail = [event, ...asArray(project.auditTrail)].slice(0, 20);
}

function appendTelemetryEvent(db, event) {
  db.telemetryEvents = [event, ...asArray(db.telemetryEvents)].slice(0, TELEMETRY_RETENTION);
}

function ensureWorkspaceState(db, workspaceId) {
  if (!db.projectsByWorkspace[workspaceId]) {
    db.projectsByWorkspace[workspaceId] = {
      activeProjectId: null,
      projects: [],
    };
  }
  const state = db.projectsByWorkspace[workspaceId];
  state.projects = asArray(state.projects);
  state.activeProjectId = tidy(state.activeProjectId) || null;
  return state;
}

function pruneExpiredSessions(db) {
  const now = Date.now();
  db.sessions = asArray(db.sessions).filter((session) => {
    const expiresAt = Date.parse(session?.expiresAt || "");
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    company: user.company || undefined,
    role: user.role || "sales",
  };
}

function publicWorkspace(workspace) {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    tier: workspace.tier || "pilot",
    memberCount: getWorkspaceMemberships(workspace).length,
  };
}

function makeSessionPayload(sessionToken, user, workspace) {
  const workspaceRole = getWorkspaceRoleForUser(workspace, user.id) || "sales";
  return {
    ok: true,
    session: {
      mode: "backend",
      token: sessionToken,
      issuedAt: nowIso(),
      user: publicUser(user),
      workspace: publicWorkspace(workspace),
      workspaceRole,
      permissions: permissionsForWorkspaceRole(workspaceRole),
    },
  };
}

function getTokenFromRequest(req, url) {
  const authHeader = tidy(req.headers.authorization);
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  return tidy(url.searchParams.get("token"));
}

function getAuthContext(req, url, db) {
  const token = getTokenFromRequest(req, url);
  if (!token) return { ok: false, error: "Authentication required." };

  pruneExpiredSessions(db);
  const session = db.sessions.find((candidate) => candidate.tokenHash === hashToken(token));
  if (!session) return { ok: false, error: "Session not found or expired." };

  const user = db.users.find((candidate) => candidate.id === session.userId);
  const workspace = db.workspaces.find((candidate) => candidate.id === session.workspaceId);
  if (!user || !workspace) return { ok: false, error: "Session context could not be restored." };
  const workspaceMembers = new Set(getWorkspaceMemberships(workspace).map((membership) => membership.userId));
  const userWorkspaceIds = new Set(asArray(user.workspaceIds));
  const isMember =
    workspace.ownerUserId === user.id ||
    workspaceMembers.has(user.id) ||
    userWorkspaceIds.has(workspace.id);
  if (!isMember) return { ok: false, error: "User is not authorized for this workspace." };

  const workspaceRole = getWorkspaceRoleForUser(workspace, user.id) || "sales";
  const permissions = permissionsForWorkspaceRole(workspaceRole);

  session.lastSeenAt = nowIso();
  return { ok: true, session, token, user, workspace, workspaceRole, permissions };
}

function normalizeProjectsForWorkspace(projects, workspaceId, userId) {
  return asArray(projects)
    .map((project) => sanitizeProject(project, workspaceId, userId))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function mergeWorkspaceProjects(existingProjects, incomingProjects, workspaceId, userId) {
  const existingMap = new Map(
    asArray(existingProjects).map((project) => {
      const normalized = sanitizeProject(project, workspaceId, userId);
      return [normalized.id, normalized];
    }),
  );

  const merged = [];
  for (const project of asArray(incomingProjects)) {
    const incoming = sanitizeProject(project, workspaceId, userId);
    const existing = existingMap.get(incoming.id);
    if (!existing) {
      merged.push(incoming);
      continue;
    }

    const combined = {
      ...existing,
      ...incoming,
      attachments: mergeById(existing.attachments, incoming.attachments, (item) => item),
      comments: mergeById(existing.comments, incoming.comments, (item) => item),
      shares: mergeById(existing.shares, incoming.shares, (item) => item),
      auditTrail: mergeById(existing.auditTrail, incoming.auditTrail, (item) => sanitizeAuditEntry(item)),
    };

    merged.push(combined);
  }

  return merged.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function sanitizeProjectForRole(project, workspaceRole) {
  const normalizedRole = normalizeWorkspaceRole(workspaceRole, "sales");
  if (normalizedRole !== "customer") return project;
  return {
    ...project,
    comments: asArray(project.comments).filter((comment) => comment.audience === "customer"),
    shares: asArray(project.shares)
      .filter((share) => share.audience !== "internal")
      .map((share) => ({
        ...share,
        accessCode: undefined,
      })),
    auditTrail: [],
  };
}

async function createSession(db, user, workspace) {
  const token = crypto.randomBytes(32).toString("hex");
  db.sessions = [
    {
      id: makeId("session"),
      tokenHash: hashToken(token),
      userId: user.id,
      workspaceId: workspace.id,
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      lastSeenAt: nowIso(),
    },
    ...asArray(db.sessions).filter((session) => session.userId !== user.id),
  ];
  return token;
}

export async function handleWingmanHealthGet(_req, res, { sendJson }) {
  const db = await readDb();
  const governance = await readGovernance();
  const projectCount = Object.values(db.projectsByWorkspace).reduce((sum, state) => sum + asArray(state?.projects).length, 0);

  sendJson(res, 200, {
    ok: true,
    service: "wingman-deployment-api",
    now: nowIso(),
    storageModeConfigured: configuredStorageMode(),
    storageModeActive: lastStorageModeUsed,
    storageWarning: lastStorageWarning || undefined,
    users: db.users.length,
    workspaces: db.workspaces.length,
    projects: projectCount,
    auditEvents: db.auditEvents.length,
    telemetryEvents: db.telemetryEvents.length,
    governanceVersion: governance?.recommendationRules?.version || "unknown",
  });
}

export async function handleWingmanAuthSignupPost(req, res, { sendJson, parseJsonBody }) {
  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const name = tidy(body?.name);
  const company = tidy(body?.company);
  const email = normalizeEmail(body?.email);
  const password = tidy(body?.password);

  if (!name || !company || !email || !password) {
    sendJson(res, 400, { ok: false, error: "Name, company, email, and password are required." });
    return;
  }

  const db = await readDb();
  if (db.users.some((user) => user.email === email)) {
    sendJson(res, 409, { ok: false, error: "An account with that email already exists." });
    return;
  }

  const userId = makeId("user");
  const workspaceId = makeId("ws");
  const workspaceName = company || `${name}'s Workspace`;
  const passwordRecord = await hashPassword(password);

  const user = {
    id: userId,
    name,
    company,
    email,
    role: "sales",
    passwordSalt: passwordRecord.salt,
    passwordHash: passwordRecord.hash,
    workspaceIds: [workspaceId],
    createdAt: nowIso(),
    lastLoginAt: nowIso(),
    status: "active",
  };

  const workspace = {
    id: workspaceId,
    name: workspaceName,
    slug: slugify(workspaceName),
    tier: "pilot",
    ownerUserId: userId,
    memberIds: [userId],
    memberships: [{
      userId,
      role: "owner",
      createdAt: nowIso(),
    }],
    createdAt: nowIso(),
  };

  db.users.push(user);
  db.workspaces.push(workspace);
  ensureWorkspaceState(db, workspaceId);
  const sessionToken = await createSession(db, user, workspace);

  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "auth",
    action: "signup",
    detail: `Workspace ${workspace.name} was created.`,
    user,
    workspaceId: workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, makeSessionPayload(sessionToken, user, workspace));
}

export async function handleWingmanAuthLoginPost(req, res, { sendJson, parseJsonBody }) {
  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const email = normalizeEmail(body?.email);
  const password = tidy(body?.password);
  if (!email || !password) {
    sendJson(res, 400, { ok: false, error: "Email and password are required." });
    return;
  }

  const db = await readDb();
  const user = db.users.find((candidate) => candidate.email === email);
  if (!user || !(await verifyPassword(password, user))) {
    sendJson(res, 401, { ok: false, error: "Email or password is incorrect." });
    return;
  }

  const workspace = db.workspaces.find((candidate) => asArray(candidate.memberIds).includes(user.id))
    || db.workspaces.find((candidate) => candidate.ownerUserId === user.id);
  if (!workspace) {
    sendJson(res, 500, { ok: false, error: "Workspace not found for this user." });
    return;
  }

  user.lastLoginAt = nowIso();
  const sessionToken = await createSession(db, user, workspace);
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "auth",
    action: "login",
    detail: `User ${user.email} signed in.`,
    user,
    workspaceId: workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, makeSessionPayload(sessionToken, user, workspace));
}

export async function handleWingmanAuthSessionGet(req, res, url, { sendJson }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }

  await writeDb(db);
  sendJson(res, 200, makeSessionPayload(auth.token, auth.user, auth.workspace));
}

export async function handleWingmanAuthLogoutPost(req, res, url, { sendJson }) {
  const db = await readDb();
  const token = getTokenFromRequest(req, url);
  if (token) {
    const tokenHash = hashToken(token);
    const session = db.sessions.find((entry) => entry.tokenHash === tokenHash);
    const user = session ? db.users.find((entry) => entry.id === session.userId) : null;
    db.sessions = db.sessions.filter((entry) => entry.tokenHash !== tokenHash);
    if (user) {
      appendAuditEvent(db, makeProjectAuditEvent({
        scope: "auth",
        action: "logout",
        detail: `User ${user.email} signed out.`,
        user,
        workspaceId: session?.workspaceId,
      }));
    }
    await writeDb(db);
  }
  sendJson(res, 200, { ok: true });
}

export async function handleWingmanWorkspaceGet(req, res, url, { sendJson }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }

  const state = ensureWorkspaceState(db, auth.workspace.id);
  sendJson(res, 200, {
    ok: true,
    workspace: publicWorkspace(auth.workspace),
    workspaceRole: auth.workspaceRole,
    permissions: auth.permissions,
    projects: asArray(state.projects).length,
    activeProjectId: state.activeProjectId,
  });
}

export async function handleWingmanProjectsGet(req, res, url, { sendJson }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }

  const state = ensureWorkspaceState(db, auth.workspace.id);
  state.projects = normalizeProjectsForWorkspace(state.projects, auth.workspace.id, auth.user.id);
  await writeDb(db);

  sendJson(res, 200, {
    ok: true,
    workspace: publicWorkspace(auth.workspace),
    activeProjectId: state.activeProjectId,
    projects: state.projects.map((project) => sanitizeProjectForRole(project, auth.workspaceRole)),
  });
}

export async function handleWingmanProjectsSyncPost(req, res, url, { sendJson, parseJsonBody }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canEditProjects) {
    sendJson(res, 403, { ok: false, error: "This workspace role is read-only for project changes." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const state = ensureWorkspaceState(db, auth.workspace.id);
  const previousProjects = normalizeProjectsForWorkspace(state.projects, auth.workspace.id, auth.user.id);
  const incomingProjects = normalizeProjectsForWorkspace(body?.projects, auth.workspace.id, auth.user.id);
  const deletedIds = previousProjects
    .filter((project) => !incomingProjects.some((candidate) => candidate.id === project.id))
    .map((project) => project.id);

  state.projects = mergeWorkspaceProjects(previousProjects, incomingProjects, auth.workspace.id, auth.user.id);
  state.activeProjectId = tidy(body?.activeProjectId) || state.projects[0]?.id || null;

  const previousById = new Map(previousProjects.map((project) => [project.id, project]));
  for (const project of state.projects) {
    const previous = previousById.get(project.id);
    if (!previous || previous.updatedAt !== project.updatedAt) {
      appendProjectAudit(project, makeProjectAuditEvent({
        scope: "projects",
        action: previous ? "synced" : "created",
        detail: previous ? "Project changes were synchronized to the deployment backend." : "Project was created in the deployment backend.",
        user: auth.user,
        projectId: project.id,
        workspaceId: auth.workspace.id,
      }));
    }
  }

  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "projects",
    action: "sync",
    detail: `Workspace sync stored ${state.projects.length} projects${deletedIds.length ? ` and removed ${deletedIds.length}` : ""}.`,
    user: auth.user,
    projectId: state.activeProjectId || undefined,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, {
    ok: true,
    workspace: publicWorkspace(auth.workspace),
    activeProjectId: state.activeProjectId,
    projects: state.projects.map((project) => sanitizeProjectForRole(project, auth.workspaceRole)),
  });
}

function findProject(state, projectId) {
  return asArray(state.projects).find((project) => project.id === projectId);
}

export async function handleWingmanProjectCommentsPost(req, res, url, projectId, { sendJson, parseJsonBody }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const text = tidy(body?.body);
  if (!text) {
    sendJson(res, 400, { ok: false, error: "Comment body is required." });
    return;
  }

  const audience = tidy(body?.audience) === "customer" ? "customer" : "internal";
  if (audience === "internal" && !auth.permissions.canCreateInternalComments) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot add internal comments." });
    return;
  }
  if (audience === "customer" && !auth.permissions.canCreateCustomerComments) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot add customer-safe comments." });
    return;
  }

  const state = ensureWorkspaceState(db, auth.workspace.id);
  const project = findProject(state, projectId);
  if (!project) {
    sendJson(res, 404, { ok: false, error: "Project not found." });
    return;
  }

  const comment = {
    id: makeId("comment"),
    body: text,
    audience,
    authorName: auth.user.name || auth.user.email,
    authorEmail: auth.user.email,
    createdAt: nowIso(),
  };

  project.comments = [comment, ...asArray(project.comments)].slice(0, 40);
  project.updatedAt = nowIso();
  appendProjectAudit(project, makeProjectAuditEvent({
    scope: "projects",
    action: "comment",
    detail: `A ${comment.audience} comment was added.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "projects",
    action: "comment",
    detail: `Comment added to ${project.name}.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, { ok: true, project: sanitizeProjectForRole(project, auth.workspaceRole) });
}

export async function handleWingmanProjectSharesPost(req, res, url, projectId, { sendJson, parseJsonBody }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canPrepareShares) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot create share packs." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const title = tidy(body?.title) || "Customer share pack";
  const state = ensureWorkspaceState(db, auth.workspace.id);
  const project = findProject(state, projectId);
  if (!project) {
    sendJson(res, 404, { ok: false, error: "Project not found." });
    return;
  }

  const share = {
    id: makeId("share"),
    title,
    message: tidy(body?.message),
    audience: tidy(body?.audience) === "internal" ? "internal" : "customer",
    status: "draft",
    shareUrl: `/share/${project.id}/${makeId("public")}`,
    accessCode: crypto.randomBytes(3).toString("hex").toUpperCase(),
    summaryHeadline: tidy(body?.summaryHeadline) || undefined,
    createdAt: nowIso(),
    createdBy: auth.user.id,
  };

  project.shares = [share, ...asArray(project.shares)].slice(0, 20);
  project.updatedAt = nowIso();
  appendProjectAudit(project, makeProjectAuditEvent({
    scope: "projects",
    action: "share",
    detail: `A ${share.audience} share pack was prepared.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "projects",
    action: "share",
    detail: `Share pack created for ${project.name}.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, { ok: true, project: sanitizeProjectForRole(project, auth.workspaceRole) });
}

export async function handleWingmanProjectAttachmentsPost(req, res, url, projectId, { sendJson, parseJsonBody }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canRegisterAttachments) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot register attachments." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const name = tidy(body?.name);
  if (!name) {
    sendJson(res, 400, { ok: false, error: "Attachment name is required." });
    return;
  }

  const state = ensureWorkspaceState(db, auth.workspace.id);
  const project = findProject(state, projectId);
  if (!project) {
    sendJson(res, 404, { ok: false, error: "Project not found." });
    return;
  }

  const attachment = {
    id: makeId("attach"),
    name,
    kind: ["document", "diagram", "brief"].includes(tidy(body?.kind)) ? tidy(body?.kind) : "other",
    source: tidy(body?.source) || "Wingman",
    summary: tidy(body?.summary) || undefined,
    contentType: tidy(body?.contentType) || undefined,
    sizeBytes: Number.isFinite(Number(body?.sizeBytes)) ? Number(body.sizeBytes) : undefined,
    uploadedAt: nowIso(),
    uploadedBy: auth.user.id,
  };

  project.attachments = [attachment, ...asArray(project.attachments)].slice(0, 20);
  project.updatedAt = nowIso();
  appendProjectAudit(project, makeProjectAuditEvent({
    scope: "projects",
    action: "attachment",
    detail: `${attachment.kind} attachment "${attachment.name}" was registered.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "projects",
    action: "attachment",
    detail: `Attachment stored for ${project.name}.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, { ok: true, project: sanitizeProjectForRole(project, auth.workspaceRole) });
}

export async function handleWingmanProjectMarkReadyPost(req, res, url, projectId, { sendJson, parseJsonBody }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canMarkCommercialReady) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot complete the commercial readiness gate." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const state = ensureWorkspaceState(db, auth.workspace.id);
  const project = findProject(state, projectId);
  if (!project) {
    sendJson(res, 404, { ok: false, error: "Project not found." });
    return;
  }

  const completionNote = tidy(body?.completionNote) || `Completion gate passed on ${new Date().toLocaleString()}.`;
  project.status = "Commercial Ready";
  project.stage = tidy(project.stage) || "Proposal";
  project.notes = [tidy(project.notes), completionNote].filter(Boolean).join("\n\n");
  project.proposal = {
    ...(project.proposal && typeof project.proposal === "object" ? project.proposal : {}),
    notes: [tidy(project.proposal?.notes), completionNote].filter(Boolean).join("\n\n"),
  };
  project.updatedAt = nowIso();

  appendProjectAudit(project, makeProjectAuditEvent({
    scope: "projects",
    action: "mark-ready",
    detail: "Commercial readiness gate completed.",
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "projects",
    action: "mark-ready",
    detail: `Commercial readiness completed for ${project.name}.`,
    user: auth.user,
    projectId: project.id,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, { ok: true, project: sanitizeProjectForRole(project, auth.workspaceRole) });
}

export async function handleWingmanWorkspaceMembersGet(req, res, url, { sendJson }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canManageWorkspace) {
    sendJson(res, 403, { ok: false, error: "Workspace member management is restricted to admins." });
    return;
  }

  const members = getWorkspaceMemberships(auth.workspace).map((membership) => {
    const user = db.users.find((candidate) => candidate.id === membership.userId);
    const lastSeenAt = asArray(db.sessions)
      .filter((session) => session.userId === membership.userId && session.workspaceId === auth.workspace.id)
      .sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)))[0]?.lastSeenAt;
    return publicWorkspaceMember(auth.workspace, membership, user, lastSeenAt);
  });

  sendJson(res, 200, { ok: true, members });
}

export async function handleWingmanWorkspaceInvitationsGet(req, res, url, { sendJson }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canManageWorkspace) {
    sendJson(res, 403, { ok: false, error: "Workspace invitations are restricted to admins." });
    return;
  }

  const invitations = asArray(db.invitations)
    .filter((invitation) => invitation.workspaceId === auth.workspace.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((invitation) => publicInvitation(invitation, auth.workspace));

  sendJson(res, 200, { ok: true, invitations });
}

export async function handleWingmanWorkspaceInvitationsPost(req, res, url, { sendJson, parseJsonBody }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canManageWorkspace) {
    sendJson(res, 403, { ok: false, error: "Workspace invitations are restricted to admins." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const email = normalizeEmail(body?.email);
  const role = normalizeWorkspaceRole(body?.role, "customer");
  if (!email) {
    sendJson(res, 400, { ok: false, error: "Invitation email is required." });
    return;
  }
  if (!canManageWorkspaceRole(auth.workspaceRole, role)) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot invite that member role." });
    return;
  }

  const existingMember = getWorkspaceMemberships(auth.workspace).find((membership) => {
    const memberUser = db.users.find((candidate) => candidate.id === membership.userId);
    return memberUser?.email === email;
  });
  if (existingMember) {
    sendJson(res, 409, { ok: false, error: "That user is already a member of this workspace." });
    return;
  }

  const token = createInvitationToken();
  const pendingIndex = asArray(db.invitations).findIndex((invitation) =>
    invitation.workspaceId === auth.workspace.id &&
    invitation.email === email &&
    invitation.status === "pending"
  );
  const invitation = {
    id: pendingIndex >= 0 ? db.invitations[pendingIndex].id : makeId("invite"),
    workspaceId: auth.workspace.id,
    email,
    role,
    status: "pending",
    invitedByUserId: auth.user.id,
    invitedByName: auth.user.name || auth.user.email,
    invitedByEmail: auth.user.email,
    tokenHash: hashToken(token),
    createdAt: pendingIndex >= 0 ? db.invitations[pendingIndex].createdAt : nowIso(),
    acceptedAt: undefined,
  };

  if (pendingIndex >= 0) db.invitations[pendingIndex] = invitation;
  else db.invitations = [invitation, ...asArray(db.invitations)];

  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "workspace",
    action: "invite",
    detail: `Workspace invitation created for ${email}.`,
    user: auth.user,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, {
    ok: true,
    invitation: publicInvitation(invitation, auth.workspace, token),
  });
}

export async function handleWingmanWorkspaceMemberRolePost(req, res, url, userId, { sendJson, parseJsonBody }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canManageWorkspace) {
    sendJson(res, 403, { ok: false, error: "Workspace member management is restricted to admins." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const membership = findWorkspaceMember(auth.workspace, userId);
  const targetUser = db.users.find((candidate) => candidate.id === userId);
  if (!membership || !targetUser) {
    sendJson(res, 404, { ok: false, error: "Workspace member not found." });
    return;
  }
  if (membership.role === "owner" || auth.workspace.ownerUserId === userId) {
    sendJson(res, 403, { ok: false, error: "Workspace ownership cannot be reassigned here." });
    return;
  }
  if (auth.user.id === userId) {
    sendJson(res, 403, { ok: false, error: "Change another member's role instead of your own." });
    return;
  }

  const nextRole = normalizeWorkspaceRole(body?.role, "sales");
  if (!canManageWorkspaceRole(auth.workspaceRole, nextRole)) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot assign that member role." });
    return;
  }
  if (!canManageWorkspaceRole(auth.workspaceRole, membership.role)) {
    sendJson(res, 403, { ok: false, error: "This workspace role cannot change that member." });
    return;
  }

  addMembershipToWorkspace(auth.workspace, userId, nextRole, membership.createdAt || nowIso());

  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "workspace",
    action: "role-change",
    detail: `${targetUser.email} is now ${nextRole}.`,
    user: auth.user,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, {
    ok: true,
    member: publicWorkspaceMember(auth.workspace, findWorkspaceMember(auth.workspace, userId), targetUser),
  });
}

export async function handleWingmanWorkspaceSettingsPost(req, res, url, { sendJson, parseJsonBody }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canManageWorkspace) {
    sendJson(res, 403, { ok: false, error: "Workspace settings are restricted to admins." });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const name = tidy(body?.name);
  const tier = tidy(body?.tier) || auth.workspace.tier || "pilot";
  if (!name) {
    sendJson(res, 400, { ok: false, error: "Workspace name is required." });
    return;
  }

  auth.workspace.name = name;
  auth.workspace.slug = slugify(name);
  auth.workspace.tier = tier;

  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "workspace",
    action: "settings",
    detail: `Workspace settings updated for ${name}.`,
    user: auth.user,
    workspaceId: auth.workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, { ok: true, workspace: publicWorkspace(auth.workspace) });
}

export async function handleWingmanInvitationResolveGet(_req, res, url, { sendJson }) {
  const db = await readDb();
  const token = tidy(url.searchParams.get("token"));
  if (!token) {
    sendJson(res, 400, { ok: false, error: "Invitation token is required." });
    return;
  }

  const invitation = findPendingInvitationByToken(db, token);
  const workspace = invitation
    ? db.workspaces.find((candidate) => candidate.id === invitation.workspaceId)
    : null;
  if (!invitation || !workspace) {
    sendJson(res, 404, { ok: false, error: "Invitation not found or already used." });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    invitation: publicInvitation(invitation, workspace, token),
  });
}

export async function handleWingmanInvitationAcceptPost(req, res, url, { sendJson, parseJsonBody }) {
  const db = await readDb();
  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const token = tidy(body?.token);
  if (!token) {
    sendJson(res, 400, { ok: false, error: "Invitation token is required." });
    return;
  }

  const invitation = findPendingInvitationByToken(db, token);
  const workspace = invitation
    ? db.workspaces.find((candidate) => candidate.id === invitation.workspaceId)
    : null;
  if (!invitation || !workspace) {
    sendJson(res, 404, { ok: false, error: "Invitation not found or already used." });
    return;
  }

  const auth = getAuthContext(req, url, db);
  let user = auth.ok ? auth.user : null;

  if (user && user.email !== invitation.email) {
    sendJson(res, 403, { ok: false, error: "Sign in with the invited email address before accepting this invitation." });
    return;
  }

  if (!user) {
    const existingUser = db.users.find((candidate) => candidate.email === invitation.email);
    const password = tidy(body?.password);
    if (existingUser) {
      if (!password || !(await verifyPassword(password, existingUser))) {
        sendJson(res, 401, { ok: false, error: "Use the invited account password to join this workspace." });
        return;
      }
      user = existingUser;
    } else {
      const name = tidy(body?.name);
      if (!name || !password) {
        sendJson(res, 400, { ok: false, error: "Name and password are required to activate this invitation." });
        return;
      }
      const passwordRecord = await hashPassword(password);
      user = {
        id: makeId("user"),
        name,
        company: workspace.name,
        email: invitation.email,
        role: invitation.role === "admin" ? "admin" : invitation.role === "customer" ? "customer" : "sales",
        passwordSalt: passwordRecord.salt,
        passwordHash: passwordRecord.hash,
        workspaceIds: [],
        createdAt: nowIso(),
        lastLoginAt: nowIso(),
        status: "active",
      };
      db.users.push(user);
    }
  }

  user.workspaceIds = unique([...(asArray(user.workspaceIds)), workspace.id]);
  if (!findWorkspaceMember(workspace, user.id)) {
    addMembershipToWorkspace(workspace, user.id, invitation.role, nowIso());
  }
  removePendingInvitationsForMember(db, workspace.id, invitation.email);
  invitation.status = "accepted";
  invitation.acceptedAt = nowIso();
  user.lastLoginAt = nowIso();

  const sessionToken = await createSession(db, user, workspace);
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "workspace",
    action: "invite-accepted",
    detail: `${user.email} joined ${workspace.name}.`,
    user,
    workspaceId: workspace.id,
  }));

  await writeDb(db);
  sendJson(res, 200, makeSessionPayload(sessionToken, user, workspace));
}

export async function handleWingmanGovernanceGet(req, res, url, { sendJson }) {
  const governance = await readGovernance();
  const db = await readDb();
  const auth = getAuthContext(req, url, db);

  sendJson(res, 200, {
    ...governance,
    workspaceScoped: Boolean(auth.ok),
  });
}

export async function handleWingmanAuditGet(req, res, url, { sendJson }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canViewDiagnostics) {
    sendJson(res, 403, { ok: false, error: "Audit access is unavailable for this workspace role." });
    return;
  }

  const projectId = tidy(url.searchParams.get("projectId"));
  const state = ensureWorkspaceState(db, auth.workspace.id);
  const allowedProjectIds = new Set(asArray(state.projects).map((project) => project.id));
  const events = asArray(db.auditEvents)
    .filter((event) => !event.workspaceId || event.workspaceId === auth.workspace.id)
    .filter((event) => !event.projectId || allowedProjectIds.has(event.projectId))
    .filter((event) => !projectId || event.projectId === projectId)
    .slice(0, 60);

  sendJson(res, 200, { ok: true, events });
}

export async function handleWingmanTelemetryGet(req, res, url, { sendJson }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }
  if (!auth.permissions.canViewDiagnostics) {
    sendJson(res, 403, { ok: false, error: "Telemetry access is unavailable for this workspace role." });
    return;
  }

  const state = ensureWorkspaceState(db, auth.workspace.id);
  const allowedProjectIds = new Set(asArray(state.projects).map((project) => project.id));
  const events = asArray(db.telemetryEvents)
    .filter((event) => !event.workspaceId || event.workspaceId === auth.workspace.id)
    .filter((event) => !event.projectId || allowedProjectIds.has(event.projectId))
    .slice(0, 80);

  sendJson(res, 200, { ok: true, events });
}

export async function handleWingmanTelemetryPost(req, res, url, { sendJson, parseJsonBody }) {
  const db = await readDb();
  const auth = getAuthContext(req, url, db);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return;
  }

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const event = {
    id: tidy(body?.id) || makeId("telemetry"),
    kind: ["error", "unhandledrejection", "info"].includes(tidy(body?.kind)) ? tidy(body?.kind) : "info",
    message: tidy(body?.message) || "Runtime event",
    stack: tidy(body?.stack) || undefined,
    source: tidy(body?.source) || undefined,
    line: Number.isFinite(Number(body?.line)) ? Number(body.line) : undefined,
    column: Number.isFinite(Number(body?.column)) ? Number(body.column) : undefined,
    timestamp: tidy(body?.timestamp) || nowIso(),
    route: tidy(body?.route) || undefined,
    projectId: tidy(body?.projectId) || undefined,
    handled: typeof body?.handled === "boolean" ? body.handled : undefined,
    workspaceId: auth.workspace.id,
    userId: auth.user.id,
  };

  appendTelemetryEvent(db, event);
  appendAuditEvent(db, makeProjectAuditEvent({
    scope: "telemetry",
    action: "runtime",
    detail: `Runtime telemetry captured: ${event.kind}.`,
    user: auth.user,
    projectId: event.projectId,
    workspaceId: auth.workspace.id,
    severity: event.kind === "info" ? "info" : "warn",
  }));

  await writeDb(db);
  sendJson(res, 200, { ok: true });
}
