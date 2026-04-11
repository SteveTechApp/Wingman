import * as React from "react";
import { createStrictContext } from "./createStrictContext";
import {
  acceptDeploymentWorkspaceInvitation,
  createDemoDeploymentSession,
  fetchDeploymentHealth,
  persistDeploymentSession,
  restoreDeploymentSession,
  signInWithDeploymentApi,
  signOutFromDeploymentApi,
  signUpWithDeploymentApi,
  type DeploymentPermissions,
  type DeploymentSession,
  type DeploymentWorkspace,
  type DeploymentWorkspaceRole,
} from "@/app/api/wingmanDeploymentClient";
import { buildWorkspacePermissions } from "@/features/workspace/workspaceAccess";
import { configureProjectStoreSession } from "@/features/projects/projectStore";
import { useWingman, wingmanActions } from "@/state/useWingman";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  company?: string;
  role: "admin" | "sales" | "customer";
};

export type AuthCtx = {
  status: "loading" | "authenticated" | "guest";
  isAuthed: boolean;
  mode: "backend" | "demo" | "none";
  user: AuthUser | null;
  workspace: DeploymentWorkspace | null;
  workspaceRole: DeploymentWorkspaceRole | null;
  permissions: DeploymentPermissions;
  error: string | null;
  backendHealthy: boolean;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signUp: (input: { name: string; company: string; email: string; password: string }) => Promise<void>;
  acceptInvitation: (input: { token: string; name?: string; password?: string }) => Promise<void>;
  refreshSession: () => Promise<void>;
  signInDemo: (email?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const [AuthContext, useAuth] = createStrictContext<AuthCtx>("Auth");

export { useAuth };

function mapUser(session: DeploymentSession | null): AuthUser | null {
  if (!session) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    company: session.user.company,
    role: session.user.role,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function AuthProvider(props: { children: React.ReactNode }) {
  const isAuthed = useWingman((s) => s.auth.isAuthed);
  const [status, setStatus] = React.useState<AuthCtx["status"]>("loading");
  const [mode, setMode] = React.useState<AuthCtx["mode"]>("none");
  const [session, setSession] = React.useState<DeploymentSession | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [backendHealthy, setBackendHealthy] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const restored = await restoreDeploymentSession();
        if (cancelled) return;

        if (restored) {
          setSession(restored);
          setMode(restored.mode);
          setStatus("authenticated");
          wingmanActions.setAuthed(true, restored.user.id);
          wingmanActions.updateUserProfile({
            email: restored.user.email,
            name: restored.user.name,
            company: restored.user.company,
          });
          configureProjectStoreSession(restored);
        } else {
          setSession(null);
          setMode("none");
          setStatus("guest");
          wingmanActions.setAuthed(false);
          configureProjectStoreSession(null);
        }
      } finally {
        if (!cancelled) {
          try {
            await fetchDeploymentHealth();
            if (!cancelled) setBackendHealthy(true);
          } catch {
            if (!cancelled) setBackendHealthy(false);
          }
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = React.useCallback((next: DeploymentSession | null) => {
    persistDeploymentSession(next);
    setSession(next);
    setMode(next?.mode ?? "none");
    setStatus(next ? "authenticated" : "guest");
    setError(null);

    if (next) {
      wingmanActions.setAuthed(true, next.user.id);
      wingmanActions.updateUserProfile({
        email: next.user.email,
        name: next.user.name,
        company: next.user.company,
      });
    } else {
      wingmanActions.setAuthed(false);
    }

    configureProjectStoreSession(next);
  }, []);

  const signIn = React.useCallback(async (input: { email: string; password: string }) => {
    setError(null);
    try {
      const next = await signInWithDeploymentApi(input);
      applySession(next);
    } catch (error) {
      setError(getErrorMessage(error, "Unable to sign in."));
      throw error;
    }
  }, [applySession]);

  const signUp = React.useCallback(async (input: { name: string; company: string; email: string; password: string }) => {
    setError(null);
    try {
      const next = await signUpWithDeploymentApi(input);
      applySession(next);
    } catch (error) {
      setError(getErrorMessage(error, "Unable to sign up."));
      throw error;
    }
  }, [applySession]);

  const acceptInvitation = React.useCallback(async (input: { token: string; name?: string; password?: string }) => {
    setError(null);
    try {
      const next = await acceptDeploymentWorkspaceInvitation(input, session);
      applySession(next);
    } catch (error) {
      setError(getErrorMessage(error, "Unable to accept invitation."));
      throw error;
    }
  }, [applySession, session]);

  const refreshSession = React.useCallback(async () => {
    const next = await restoreDeploymentSession(session);
    applySession(next);
  }, [applySession, session]);

  const signInDemo = React.useCallback(async (email?: string) => {
    const next = createDemoDeploymentSession(email);
    applySession(next);
  }, [applySession]);

  const signOut = React.useCallback(async () => {
    await signOutFromDeploymentApi(session);
    applySession(null);
  }, [applySession, session]);

  const value = React.useMemo<AuthCtx>(() => ({
    status,
    isAuthed: isAuthed || Boolean(session),
    mode,
    user: mapUser(session),
    workspace: session?.workspace ?? null,
    workspaceRole: session?.workspaceRole ?? null,
    permissions: session?.permissions ?? buildWorkspacePermissions(session?.workspaceRole),
    error,
    backendHealthy,
    signIn,
    signUp,
    acceptInvitation,
    refreshSession,
    signInDemo,
    signOut,
  }), [
    status,
    isAuthed,
    session,
    mode,
    error,
    backendHealthy,
    signIn,
    signUp,
    acceptInvitation,
    refreshSession,
    signInDemo,
    signOut,
  ]);

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

