import type { StoredProject } from "@/features/projects/projectStore";
import type { RecommendationGovernanceRulebook } from "@/features/governance/recommendationGovernance";
import { resolveWingmanApiBase } from "@/app/api/runtimeEndpoint";
import {
  type DeploymentPermissions,
  type DeploymentWorkspaceRole,
} from "@/features/workspace/workspaceAccess";

export type DeploymentRole = "admin" | "sales" | "customer";
export type { DeploymentPermissions, DeploymentWorkspaceRole };
export type DeploymentMode = "backend";

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
  expiresAt?: string;
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

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function buildApiBase(): string {
  return resolveWingmanApiBase();
}

const API_BASE = buildApiBase();

function backendSessionToken(session: DeploymentSession | null | undefined): string | undefined {
  if (!session || session.mode !== "backend") return undefined;
  const token = tidy(session.token);
  return token || undefined;
}

function sanitizeDeploymentSession(session: DeploymentSession): DeploymentSession {
  const { token: _token, ...rest } = session;
  return rest;
}

async function requestJson<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Content-Type") && init.body != null) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const credentials = init.credentials ?? "include";

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials,
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
    if (parsed.mode !== "backend") {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    const normalized = sanitizeDeploymentSession(parsed);
    if (normalized !== parsed) {
      persistDeploymentSession(normalized);
    }
    return normalized;
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
    const safeSession = sanitizeDeploymentSession(session);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(safeSession));
  } catch {
  }
}

export async function fetchDeploymentHealth(): Promise<Record<string, unknown>> {
  if (!API_BASE) {
    return {
      ok: false,
      offline: true,
      reason: "No deployment API configured",
    };
  }

  try {
    return await requestJson<Record<string, unknown>>("/health");
  } catch (error) {
    return {
      ok: false,
      offline: true,
      reason: error instanceof Error ? error.message : "Health check failed",
    };
  }
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

  try {
    const payload = await requestJson<DeploymentAuthPayload>("/auth/session", { method: "GET" }, backendSessionToken(session));
    persistDeploymentSession(payload.session);
    return payload.session;
  } catch {
    persistDeploymentSession(null);
    return null;
  }
}

export async function signOutFromDeploymentApi(session = getPersistedDeploymentSession()): Promise<void> {
  try {
    if (session?.mode === "backend") {
      await requestJson<{ ok: true }>("/auth/logout", { method: "POST" }, backendSessionToken(session));
    }
  } catch {
  } finally {
    persistDeploymentSession(null);
  }
}

export async function fetchDeploymentProjects(session: DeploymentSession): Promise<DeploymentProjectsPayload> {
  return requestJson<DeploymentProjectsPayload>("/projects", { method: "GET" }, backendSessionToken(session));
}

export async function syncDeploymentProjects(
  session: DeploymentSession,
  input: { projects: StoredProject[]; activeProjectId: string | null }
): Promise<DeploymentProjectsPayload> {
  return requestJson<DeploymentProjectsPayload>("/projects/sync", {
    method: "POST",
    body: JSON.stringify(input),
  }, backendSessionToken(session));
}

export async function createDeploymentProjectComment(
  session: DeploymentSession,
  projectId: string,
  input: ProjectCommentInput
): Promise<{ ok: true; project: StoredProject }> {
  return requestJson<{ ok: true; project: StoredProject }>(`/projects/${encodeURIComponent(projectId)}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  }, backendSessionToken(session));
}

export async function createDeploymentProjectShare(
  session: DeploymentSession,
  projectId: string,
  input: ProjectShareInput
): Promise<{ ok: true; project: StoredProject }> {
  return requestJson<{ ok: true; project: StoredProject }>(`/projects/${encodeURIComponent(projectId)}/shares`, {
    method: "POST",
    body: JSON.stringify(input),
  }, backendSessionToken(session));
}

export async function createDeploymentProjectAttachment(
  session: DeploymentSession,
  projectId: string,
  input: ProjectAttachmentInput
): Promise<{ ok: true; project: StoredProject }> {
  return requestJson<{ ok: true; project: StoredProject }>(`/projects/${encodeURIComponent(projectId)}/attachments`, {
    method: "POST",
    body: JSON.stringify(input),
  }, backendSessionToken(session));
}

export async function markDeploymentProjectCommercialReady(
  session: DeploymentSession,
  projectId: string,
  input: { completionNote: string }
): Promise<{ ok: true; project: StoredProject }> {
  return requestJson<{ ok: true; project: StoredProject }>(`/projects/${encodeURIComponent(projectId)}/mark-ready`, {
    method: "POST",
    body: JSON.stringify(input),
  }, backendSessionToken(session));
}

export async function fetchDeploymentWorkspaceMembers(
  session: DeploymentSession,
): Promise<{ ok: true; members: DeploymentWorkspaceMember[] }> {
  return requestJson<{ ok: true; members: DeploymentWorkspaceMember[] }>("/workspace/members", {
    method: "GET",
  }, backendSessionToken(session));
}

export async function fetchDeploymentWorkspaceInvitations(
  session: DeploymentSession,
): Promise<{ ok: true; invitations: DeploymentWorkspaceInvitation[] }> {
  return requestJson<{ ok: true; invitations: DeploymentWorkspaceInvitation[] }>("/workspace/invitations", {
    method: "GET",
  }, backendSessionToken(session));
}

export async function createDeploymentWorkspaceInvitation(
  session: DeploymentSession,
  input: { email: string; role: Exclude<DeploymentWorkspaceRole, "owner"> }
): Promise<{ ok: true; invitation: DeploymentWorkspaceInvitation }> {
  return requestJson<{ ok: true; invitation: DeploymentWorkspaceInvitation }>("/workspace/invitations", {
    method: "POST",
    body: JSON.stringify(input),
  }, backendSessionToken(session));
}

export async function updateDeploymentWorkspaceMemberRole(
  session: DeploymentSession,
  userId: string,
  input: { role: Exclude<DeploymentWorkspaceRole, "owner"> }
): Promise<{ ok: true; member: DeploymentWorkspaceMember }> {
  return requestJson<{ ok: true; member: DeploymentWorkspaceMember }>(`/workspace/members/${encodeURIComponent(userId)}/role`, {
    method: "POST",
    body: JSON.stringify(input),
  }, backendSessionToken(session));
}

export async function updateDeploymentWorkspaceSettings(
  session: DeploymentSession,
  input: { name: string; tier?: string }
): Promise<{ ok: true; workspace: DeploymentWorkspace }> {
  return requestJson<{ ok: true; workspace: DeploymentWorkspace }>("/workspace/settings", {
    method: "POST",
    body: JSON.stringify(input),
  }, backendSessionToken(session));
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
  const tokenHeader = backendSessionToken(session);
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
  return requestJson<{ ok: true; events: ProjectAuditEntry[] }>(`/audit${query}`, { method: "GET" }, backendSessionToken(session));
}

export async function fetchDeploymentTelemetry(
  session: DeploymentSession
): Promise<{ ok: true; events: DeploymentTelemetryEvent[] }> {
  return requestJson<{ ok: true; events: DeploymentTelemetryEvent[] }>("/telemetry", { method: "GET" }, backendSessionToken(session));
}

export async function postDeploymentTelemetry(
  event: DeploymentTelemetryEvent,
  session = getPersistedDeploymentSession()
): Promise<void> {
  if (!session || session.mode !== "backend") return;
  await requestJson<{ ok: true }>("/telemetry", {
    method: "POST",
    body: JSON.stringify(event),
  }, backendSessionToken(session));
}

export async function fetchDeploymentGovernance(
  session = getPersistedDeploymentSession()
): Promise<RecommendationGovernanceRulebook> {
  const token = backendSessionToken(session);
  return requestJson<RecommendationGovernanceRulebook>("/governance", { method: "GET" }, token);
}
