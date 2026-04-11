import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  acceptDeploymentWorkspaceInvitation,
  createDemoDeploymentSession,
  fetchDeploymentHealth,
  persistDeploymentSession,
  restoreDeploymentSession,
  signInWithDeploymentApi,
  signOutFromDeploymentApi,
  signUpWithDeploymentApi,
  type DeploymentMode,
  type DeploymentPermissions,
  type DeploymentSession,
  type DeploymentWorkspace,
  type DeploymentWorkspaceRole,
} from "@/app/api/wingmanDeploymentClient";
import { resolveWingmanApiBase } from "@/app/api/runtimeEndpoint";
import { configureProjectStoreSession } from "@/features/projects/projectStore";
import { buildWorkspacePermissions } from "@/features/workspace/workspaceAccess";
import { wingmanActions } from "@/state/useWingman";

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error"
  | "guest";

export type AuthUser = {
  id?: string;
  email?: string;
  name?: string;
  company?: string;
  role?: "admin" | "sales" | "customer";
  workspaceRole?: string;
  permissions?: Record<string, boolean>;
  [key: string]: unknown;
};

export type AuthPermissions = DeploymentPermissions;

export type AuthSession = {
  authenticated: boolean;
  mode: DeploymentMode | "none";
  user: AuthUser | null;
  workspace: DeploymentWorkspace | null;
  workspaceRole: DeploymentWorkspaceRole | null;
  permissions: AuthPermissions;
  token?: string;
  issuedAt?: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = {
  name?: string;
  company?: string;
  email: string;
  password: string;
};

export type InvitationAcceptanceInput =
  | string
  | {
      token: string;
      name?: string;
      password?: string;
    };

export type InvitationAcceptanceResult = {
  ok: boolean;
  message?: string;
  [key: string]: unknown;
};

export type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAuthed: boolean;
  status: AuthStatus;
  error: string | null;
  backendHealthy: boolean;
  workspaceRole: string | null;
  permissions: AuthPermissions;
  signIn: (inputOrEmail: SignInInput | string, password?: string) => Promise<AuthUser | null>;
  signUp: (inputOrName: SignUpInput | string, email?: string, password?: string) => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  signInDemo: (email?: string) => Promise<AuthUser | null>;
  refreshSession: () => Promise<AuthUser | null>;
  acceptInvitation: (input: InvitationAcceptanceInput) => Promise<InvitationAcceptanceResult>;
};

const SESSION_BOOTSTRAP_TIMEOUT_MS = 3500;
const HEALTH_TIMEOUT_MS = 2500;
const WINGMAN_API_BASE = resolveWingmanApiBase();

const NO_WORKSPACE_PERMISSIONS = buildWorkspacePermissions(null);

const AuthContext = createContext<AuthContextValue | null>(null);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function mapUser(session: DeploymentSession | null): AuthUser | null {
  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    company: session.user.company,
    role: session.user.role,
    workspaceRole: session.workspaceRole,
    permissions: session.permissions,
  };
}

function mapAuthSession(session: DeploymentSession | null): AuthSession | null {
  if (!session) {
    return null;
  }

  return {
    authenticated: true,
    mode: session.mode,
    user: mapUser(session),
    workspace: session.workspace,
    workspaceRole: session.workspaceRole,
    permissions: session.permissions,
    token: session.token,
    issuedAt: session.issuedAt,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let handle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    handle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([work, timeoutPromise]);
  } finally {
    if (handle) {
      clearTimeout(handle);
    }
  }
}

function normaliseSignInInput(inputOrEmail: SignInInput | string, password?: string): SignInInput {
  if (typeof inputOrEmail === "string") {
    return {
      email: inputOrEmail.trim(),
      password: password ?? "",
    };
  }

  return {
    email: inputOrEmail.email.trim(),
    password: inputOrEmail.password,
  };
}

function normaliseSignUpInput(inputOrName: SignUpInput | string, email?: string, password?: string): SignUpInput {
  if (typeof inputOrName === "string") {
    return {
      name: inputOrName.trim(),
      company: "",
      email: (email ?? "").trim(),
      password: password ?? "",
    };
  }

  return {
    name: inputOrName.name?.trim(),
    company: inputOrName.company?.trim(),
    email: inputOrName.email.trim(),
    password: inputOrName.password,
  };
}

function normaliseInvitationAcceptanceInput(input: InvitationAcceptanceInput): {
  token: string;
  name?: string;
  password?: string;
} {
  if (typeof input === "string") {
    return {
      token: input.trim(),
    };
  }

  return {
    token: input.token.trim(),
    name: input.name?.trim() || undefined,
    password: input.password?.trim() || undefined,
  };
}

function isBackendHealthy(payload: unknown): boolean {
  const record = asRecord(payload);

  if (!record) {
    return false;
  }

  if (typeof record.offline === "boolean") {
    return !record.offline;
  }

  if (typeof record.ok === "boolean") {
    return record.ok;
  }

  return true;
}

async function fetchCookieBackedSession(): Promise<DeploymentSession | null> {
  if (!WINGMAN_API_BASE) {
    return null;
  }

  const response = await fetch(`${WINGMAN_API_BASE}/auth/session`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as { session?: DeploymentSession } | null;
  const nextSession = payload?.session ?? null;

  if (!nextSession) {
    return null;
  }

  persistDeploymentSession(nextSession);
  return nextSession;
}

function syncLegacyStores(session: DeploymentSession | null): void {
  if (session) {
    wingmanActions.setAuthed(true, session.user.id);
    wingmanActions.updateUserProfile({
      email: session.user.email,
      name: session.user.name,
      company: session.user.company,
    });
  }

  if (!session) {
    wingmanActions.setAuthed(false);
  }

  configureProjectStoreSession(session);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mountedRef = useRef(true);
  const authOperationRef = useRef(0);

  const [deploymentSession, setDeploymentSession] = useState<DeploymentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [backendHealthy, setBackendHealthy] = useState(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const beginAuthOperation = useCallback(() => {
    authOperationRef.current += 1;
    return authOperationRef.current;
  }, []);

  const applySession = useCallback((
    nextSession: DeploymentSession | null,
    nextStatus: AuthStatus = nextSession ? "authenticated" : "guest",
    nextError: string | null = null,
    operationId?: number,
  ): AuthUser | null => {
    if (typeof operationId === "number" && authOperationRef.current !== operationId) {
      return mapUser(nextSession);
    }

    if (nextSession) {
      persistDeploymentSession(nextSession);
    }

    if (!nextSession) {
      persistDeploymentSession(null);
    }

    syncLegacyStores(nextSession);

    if (!mountedRef.current) {
      return mapUser(nextSession);
    }

    setDeploymentSession(nextSession);
    setLoading(false);
    setError(nextError);

    if (nextStatus === "guest") {
      setStatus("guest");
    }

    if (nextStatus !== "guest") {
      setStatus(nextStatus);
    }

    return mapUser(nextSession);
  }, []);

  const refreshBackendState = useCallback(async () => {
    try {
      const health = await withTimeout(
        fetchDeploymentHealth(),
        HEALTH_TIMEOUT_MS,
        "Deployment health check",
      );

      if (mountedRef.current) {
        setBackendHealthy(isBackendHealthy(health));
      }
    } catch {
      if (mountedRef.current) {
        setBackendHealthy(false);
      }
    }
  }, []);

  const bootstrapSession = useCallback(async (): Promise<AuthUser | null> => {
    const operationId = beginAuthOperation();

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
      setStatus("loading");
    }

    try {
      let restored = await withTimeout(
        restoreDeploymentSession(),
        SESSION_BOOTSTRAP_TIMEOUT_MS,
        "Session restore",
      );

      if (!restored) {
        restored = await withTimeout(
          fetchCookieBackedSession(),
          SESSION_BOOTSTRAP_TIMEOUT_MS,
          "Cookie session restore",
        );
      }

      if (restored) {
        return applySession(restored, "authenticated", null, operationId);
      }

      return applySession(null, "guest", null, operationId);
    } catch (reason) {
      persistDeploymentSession(null);
      const message = getErrorMessage(reason, "Saved session could not be restored.");
      return applySession(null, "guest", message, operationId);
    } finally {
      void refreshBackendState();
    }
  }, [applySession, beginAuthOperation, refreshBackendState]);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  const refreshSession = useCallback(async (): Promise<AuthUser | null> => {
    const operationId = beginAuthOperation();

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
      setStatus("loading");
    }

    try {
      let refreshed = await withTimeout(
        restoreDeploymentSession(deploymentSession ?? undefined),
        SESSION_BOOTSTRAP_TIMEOUT_MS,
        "Session refresh",
      );

      if (!refreshed) {
        refreshed = await withTimeout(
          fetchCookieBackedSession(),
          SESSION_BOOTSTRAP_TIMEOUT_MS,
          "Cookie session refresh",
        );
      }

      if (refreshed) {
        return applySession(refreshed, "authenticated", null, operationId);
      }

      return applySession(null, "guest", null, operationId);
    } catch (reason) {
      persistDeploymentSession(null);
      const message = getErrorMessage(reason, "Unable to refresh session.");
      return applySession(null, "guest", message, operationId);
    } finally {
      void refreshBackendState();
    }
  }, [applySession, beginAuthOperation, deploymentSession, refreshBackendState]);

  const signIn = useCallback(async (inputOrEmail: SignInInput | string, password?: string): Promise<AuthUser | null> => {
    const credentials = normaliseSignInInput(inputOrEmail, password);
    const operationId = beginAuthOperation();

    if (!credentials.email) {
      throw new Error("Enter your email address.");
    }

    if (!credentials.password) {
      throw new Error("Enter your password.");
    }

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
      setStatus("loading");
    }

    try {
      const nextSession = await withTimeout(
        signInWithDeploymentApi(credentials),
        SESSION_BOOTSTRAP_TIMEOUT_MS,
        "Sign-in",
      );

      if (mountedRef.current) {
        setBackendHealthy(true);
      }

      return applySession(nextSession, "authenticated", null, operationId);
    } catch (reason) {
      const message = getErrorMessage(reason, "Unable to sign in.");

      if (mountedRef.current) {
        setBackendHealthy(false);
      }

      applySession(null, "guest", message, operationId);
      throw new Error(message);
    }
  }, [applySession, beginAuthOperation]);

  const signUp = useCallback(async (inputOrName: SignUpInput | string, email?: string, password?: string): Promise<AuthUser | null> => {
    const details = normaliseSignUpInput(inputOrName, email, password);
    const operationId = beginAuthOperation();

    if (!details.name) {
      throw new Error("Enter your name.");
    }

    if (!details.company) {
      throw new Error("Enter your company.");
    }

    if (!details.email) {
      throw new Error("Enter your email address.");
    }

    if (!details.password) {
      throw new Error("Enter your password.");
    }

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
      setStatus("loading");
    }

    try {
      const nextSession = await withTimeout(
        signUpWithDeploymentApi({
          name: details.name,
          company: details.company,
          email: details.email,
          password: details.password,
        }),
        SESSION_BOOTSTRAP_TIMEOUT_MS,
        "Sign-up",
      );

      if (mountedRef.current) {
        setBackendHealthy(true);
      }

      return applySession(nextSession, "authenticated", null, operationId);
    } catch (reason) {
      const message = getErrorMessage(reason, "Unable to sign up.");

      if (mountedRef.current) {
        setBackendHealthy(false);
      }

      applySession(null, "guest", message, operationId);
      throw new Error(message);
    }
  }, [applySession, beginAuthOperation]);

  const signOut = useCallback(async (): Promise<void> => {
    const operationId = beginAuthOperation();

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
      setStatus("loading");
    }

    try {
      await withTimeout(
        signOutFromDeploymentApi(deploymentSession ?? undefined),
        SESSION_BOOTSTRAP_TIMEOUT_MS,
        "Sign-out",
      );
    } finally {
      applySession(null, "guest", null, operationId);
    }
  }, [applySession, beginAuthOperation, deploymentSession]);

  const signInDemo = useCallback(async (email?: string): Promise<AuthUser | null> => {
    const operationId = beginAuthOperation();

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
      setStatus("loading");
    }

    const nextSession = createDemoDeploymentSession(email);
    return applySession(nextSession, "authenticated", null, operationId);
  }, [applySession, beginAuthOperation]);

  const acceptInvitation = useCallback(async (input: InvitationAcceptanceInput): Promise<InvitationAcceptanceResult> => {
    const payload = normaliseInvitationAcceptanceInput(input);
    const operationId = beginAuthOperation();

    if (!payload.token) {
      throw new Error("Invitation token is missing.");
    }

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
      setStatus("loading");
    }

    try {
      const nextSession = await withTimeout(
        acceptDeploymentWorkspaceInvitation(payload, deploymentSession ?? undefined),
        SESSION_BOOTSTRAP_TIMEOUT_MS,
        "Invitation acceptance",
      );

      if (mountedRef.current) {
        setBackendHealthy(true);
      }

      applySession(nextSession, "authenticated", null, operationId);

      return {
        ok: true,
        message: "Invitation accepted.",
      };
    } catch (reason) {
      const message = getErrorMessage(reason, "Unable to accept invitation.");

      if (mountedRef.current) {
        setLoading(false);
        setError(message);
        setStatus(deploymentSession ? "authenticated" : "guest");
      }

      throw new Error(message);
    }
  }, [applySession, beginAuthOperation, deploymentSession]);

  const user = useMemo(() => mapUser(deploymentSession), [deploymentSession]);
  const session = useMemo(() => mapAuthSession(deploymentSession), [deploymentSession]);
  const workspaceRole = deploymentSession?.workspaceRole ?? null;
  const permissions = deploymentSession?.permissions ?? NO_WORKSPACE_PERMISSIONS;
  const isAuthenticated = Boolean(deploymentSession);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    isAuthenticated,
    isAuthed: isAuthenticated,
    status,
    error,
    backendHealthy,
    workspaceRole,
    permissions,
    signIn,
    signUp,
    signOut,
    logout: signOut,
    signInDemo,
    refreshSession,
    acceptInvitation,
  }), [
    acceptInvitation,
    backendHealthy,
    error,
    isAuthenticated,
    loading,
    permissions,
    refreshSession,
    session,
    signIn,
    signInDemo,
    signOut,
    signUp,
    status,
    user,
    workspaceRole,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
