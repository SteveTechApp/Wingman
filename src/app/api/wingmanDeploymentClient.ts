import type { StoredProject } from "@/features/projects/projectStore";
import type { RecommendationGovernanceRulebook } from "@/features/governance/recommendationGovernance";
import {
  buildWorkspacePermissions,
  type DeploymentPermissions,
  type DeploymentWorkspaceRole,
} from "@/features/workspace/workspaceAccess";

export type DeploymentRole = "admin" | "sales" | "customer";
export type { DeploymentPermissions, DeploymentWorkspaceRole };
export type DeploymentMode = "backend" | "demo";

export type DeploymentUser = {
  id: string;
  name: string;
  email: string;
  company?: string;
  role: DeploymentRole;
};

export type DeploymentWorkspace = {
  id: string;
  name: string;
  slug: string;
  tier: string;
  memberCount: number;
};

export type DeploymentSession = {
  mode: DeploymentMode;
  token?: string;
  issuedAt: string;
  user: DeploymentUser;
  workspace: DeploymentWorkspace;
  workspaceRole: DeploymentWorkspaceRole;
  permissions: DeploymentPermissions;
};

export type DeploymentWorkspaceMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  company?: string;
  role: DeploymentWorkspaceRole;
  joinedAt: string;
  lastSeenAt?: string;
};

export type DeploymentWorkspaceInvitation = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: Exclude<DeploymentWorkspaceRole, "owner">;
  status: "pending" | "accepted" | "revoked";
  invitedByName: string;
  invitedByEmail: string;
  createdAt: string;
  acceptedAt?: string;
  acceptUrl?: string;
};

export type DeploymentInvitationResolution = {
  ok: true;
  invitation: DeploymentWorkspaceInvitation;
};

export type ProjectAuditEntry = {
  id: string;
  scope: string;
  action: string;
  detail: string;
  actorName: string;
  actorEmail: string;
  severity: "info" | "warn" | "error";
  createdAt: string;
  projectId?: string;
};

export type ProjectCommentInput = {
  body: string;
  audience: "internal" | "customer";
};

export type ProjectShareInput = {
  title: string;
  message?: string;
  audience: "internal" | "customer";
  summaryHeadline?: string;
};

export type ProjectAttachmentInput = {
  name: string;
  kind: "document" | "diagram" | "brief" | "other";
  source: string;
  summary?: string;
  contentType?: string;
  sizeBytes?: number;
};

export type DeploymentTelemetryEvent = {
  id?: string;
  kind: "error" | "unhandledrejection" | "info";
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  timestamp: string;
  route?: string;
  projectId?: string;
  handled?: boolean;
};

export type DeploymentProjectsPayload = {
  ok: true;
  projects: StoredProject[];
  activeProjectId: string | null;
  workspace: DeploymentWorkspace;
};

export type DeploymentAuthPayload = {
  ok: true;
  session: DeploymentSession;
};

const SESSION_KEY = "wm_deployment_session_v1";

function nowIso(): string {
  return new Date().toISOString();
}

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function buildApiBase(): string {
  const explicit = tidy(import.meta.env.VITE_WINGMAN_API_BASE_URL);
  if (explicit) return explicit.replace(/\/$/, "");

  const competitor = tidy(import.meta.env.VITE_COMPETITOR_LOOKUP_ENDPOINT);
  if (competitor) {
    try {
      const parsed = new URL(competitor);
      const cleanPath = parsed.pathname.replace(/\/$/, "");
      parsed.pathname = cleanPath.endsWith("/api/competitor-lookup")
        ? cleanPath.replace(/\/api\/competitor-lookup$/, "/api/wingman")
        : "/api/wingman";
      return parsed.toString().replace(/\/$/, "");
    } catch {
    }
  }

  return "http://127.0.0.1:8787/api/wingman";
}

const API_BASE = buildApiBase();

async function requestJson<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Content-Type") && init.body != null) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.ok === false) {
    throw new Error(tidy(payload?.error) || `Request failed (${response.status}).`);
  }

  return payload as T;
}

export function getDeploymentApiBase(): string {
  return API_BASE;
}

export function getPersistedDeploymentSession(): DeploymentSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeploymentSession;
    if (!parsed?.mode || !parsed?.user || !parsed?.workspace) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistDeploymentSession(session: DeploymentSession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!session) {
      window.localStorage.removeItem(SESSION_KEY);
      return;
    }
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
  }
}

export function createDemoDeploymentSession(email?: string): DeploymentSession {
  const normalizedEmail = tidy(email) || "demo@wingman.local";
  const workspaceRole: DeploymentWorkspaceRole = "owner";
  return {
    mode: "demo",
    issuedAt: nowIso(),
    user: {
      id: "demo-user",
      name: "Demo User",
      email: normalizedEmail,
      company: "Wingman Demo",
      role: "sales",
    },
    workspace: {
      id: "demo-workspace",
      name: "Demo Workspace",
      slug: "demo-workspace",
      tier: "demo",
      memberCount: 1,
    },
    workspaceRole,
    permissions: buildWorkspacePermissions(workspaceRole),
  };
}

export async function fetchDeploymentHealth(): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>("/health");
}

export async function signUpWithDeploymentApi(input: {
  name: string;
  company: string;
  email: string;
  password: string;
}): Promise<DeploymentSession> {
  const payload = await requestJson<DeploymentAuthPayload>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  persistDeploymentSession(payload.session);
  return payload.session;
}

export async function signInWithDeploymentApi(input: {
  email: string;
  password: string;
}): Promise<DeploymentSession> {
  const payload = await requestJson<DeploymentAuthPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  persistDeploymentSession(payload.session);
  return payload.session;
}

export async function restoreDeploymentSession(session = getPersistedDeploymentSession()): Promise<DeploymentSession | null> {
  if (!session) return null;
  if (session.mode === "demo") return session;
  if (!session.token) return null;

  try {
    const payload = await requestJson<DeploymentAuthPayload>("/auth/session", { method: "GET" }, session.token);
    persistDeploymentSession(payload.session);
    return payload.session;
  } catch {
    persistDeploymentSession(null);
    return null;
  }
}

export async function signOutFromDeploymentApi(session = getPersistedDeploymentSession()): Promise<void> {
  try {
    if (session?.mode === "backend" && session.token) {
      await requestJson<{ ok: true }>("/auth/logout", { method: "POST" }, session.token);
    }
  } catch {
  } finally {
    persistDeploymentSession(null);
  }
}

export async function fetchDeploymentProjects(session: DeploymentSession): Promise<DeploymentProjectsPayload> {
  return requestJson<DeploymentProjectsPayload>("/projects", { method: "GET" }, session.token);
}

export async function syncDeploymentProjects(
  session: DeploymentSession,
  input: { projects: StoredProject[]; activeProjectId: string | null }
): Promise<DeploymentProjectsPayload> {
  return requestJson<DeploymentProjectsPayload>("/projects/sync", {
    method: "POST",
    body: JSON.stringify(input),
  }, session.token);
}

export async function createDeploymentProjectComment(
  session: DeploymentSession,
  projectId: string,
  input: ProjectCommentInput
): Promise<{ ok: true; project: StoredProject }> {
  return requestJson<{ ok: true; project: StoredProject }>(`/projects/${encodeURIComponent(projectId)}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  }, session.token);
}

export async function createDeploymentProjectShare(
  session: DeploymentSession,
  projectId: string,
  input: ProjectShareInput
): Promise<{ ok: true; project: StoredProject }> {
  return requestJson<{ ok: true; project: StoredProject }>(`/projects/${encodeURIComponent(projectId)}/shares`, {
    method: "POST",
    body: JSON.stringify(input),
  }, session.token);
}

export async function createDeploymentProjectAttachment(
  session: DeploymentSession,
  projectId: string,
  input: ProjectAttachmentInput
): Promise<{ ok: true; project: StoredProject }> {
  return requestJson<{ ok: true; project: StoredProject }>(`/projects/${encodeURIComponent(projectId)}/attachments`, {
    method: "POST",
    body: JSON.stringify(input),
  }, session.token);
}

export async function markDeploymentProjectCommercialReady(
  session: DeploymentSession,
  projectId: string,
  input: { completionNote: string }
): Promise<{ ok: true; project: StoredProject }> {
  return requestJson<{ ok: true; project: StoredProject }>(`/projects/${encodeURIComponent(projectId)}/mark-ready`, {
    method: "POST",
    body: JSON.stringify(input),
  }, session.token);
}

export async function fetchDeploymentWorkspaceMembers(
  session: DeploymentSession,
): Promise<{ ok: true; members: DeploymentWorkspaceMember[] }> {
  return requestJson<{ ok: true; members: DeploymentWorkspaceMember[] }>("/workspace/members", {
    method: "GET",
  }, session.token);
}

export async function fetchDeploymentWorkspaceInvitations(
  session: DeploymentSession,
): Promise<{ ok: true; invitations: DeploymentWorkspaceInvitation[] }> {
  return requestJson<{ ok: true; invitations: DeploymentWorkspaceInvitation[] }>("/workspace/invitations", {
    method: "GET",
  }, session.token);
}

export async function createDeploymentWorkspaceInvitation(
  session: DeploymentSession,
  input: { email: string; role: Exclude<DeploymentWorkspaceRole, "owner"> }
): Promise<{ ok: true; invitation: DeploymentWorkspaceInvitation }> {
  return requestJson<{ ok: true; invitation: DeploymentWorkspaceInvitation }>("/workspace/invitations", {
    method: "POST",
    body: JSON.stringify(input),
  }, session.token);
}

export async function updateDeploymentWorkspaceMemberRole(
  session: DeploymentSession,
  userId: string,
  input: { role: Exclude<DeploymentWorkspaceRole, "owner"> }
): Promise<{ ok: true; member: DeploymentWorkspaceMember }> {
  return requestJson<{ ok: true; member: DeploymentWorkspaceMember }>(`/workspace/members/${encodeURIComponent(userId)}/role`, {
    method: "POST",
    body: JSON.stringify(input),
  }, session.token);
}

export async function updateDeploymentWorkspaceSettings(
  session: DeploymentSession,
  input: { name: string; tier?: string }
): Promise<{ ok: true; workspace: DeploymentWorkspace }> {
  return requestJson<{ ok: true; workspace: DeploymentWorkspace }>("/workspace/settings", {
    method: "POST",
    body: JSON.stringify(input),
  }, session.token);
}

export async function resolveDeploymentWorkspaceInvitation(
  token: string,
): Promise<DeploymentInvitationResolution> {
  return requestJson<DeploymentInvitationResolution>(`/invitations/resolve?token=${encodeURIComponent(token)}`, {
    method: "GET",
  });
}

export async function acceptDeploymentWorkspaceInvitation(input: {
  token: string;
  name?: string;
  password?: string;
}, session = getPersistedDeploymentSession()): Promise<DeploymentSession> {
  const tokenHeader = session?.mode === "backend" ? session.token : undefined;
  const payload = await requestJson<DeploymentAuthPayload>("/invitations/accept", {
    method: "POST",
    body: JSON.stringify(input),
  }, tokenHeader);
  persistDeploymentSession(payload.session);
  return payload.session;
}

export async function fetchDeploymentAudit(
  session: DeploymentSession,
  projectId?: string
): Promise<{ ok: true; events: ProjectAuditEntry[] }> {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return requestJson<{ ok: true; events: ProjectAuditEntry[] }>(`/audit${query}`, { method: "GET" }, session.token);
}

export async function fetchDeploymentTelemetry(
  session: DeploymentSession
): Promise<{ ok: true; events: DeploymentTelemetryEvent[] }> {
  return requestJson<{ ok: true; events: DeploymentTelemetryEvent[] }>("/telemetry", { method: "GET" }, session.token);
}

export async function postDeploymentTelemetry(
  event: DeploymentTelemetryEvent,
  session = getPersistedDeploymentSession()
): Promise<void> {
  if (!session || session.mode !== "backend" || !session.token) return;
  await requestJson<{ ok: true }>("/telemetry", {
    method: "POST",
    body: JSON.stringify(event),
  }, session.token);
}

export async function fetchDeploymentGovernance(
  session = getPersistedDeploymentSession()
): Promise<RecommendationGovernanceRulebook> {
  const token = session?.mode === "backend" ? session.token : undefined;
  return requestJson<RecommendationGovernanceRulebook>("/governance", { method: "GET" }, token);
}
