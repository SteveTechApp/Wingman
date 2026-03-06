import * as React from "react";
import { createStrictContext } from "./createStrictContext";
import { useWingman, wingmanActions } from "@/state/useWingman";

export type AuthUser = {
  id: string;
  email?: string;
};

export type AuthCtx = {
  isAuthed: boolean;
  user: AuthUser | null;
  signInDemo: (email?: string) => void;
  signOut: () => void;
};

const [AuthContext, useAuth] = createStrictContext<AuthCtx>("Auth");

export { useAuth };

export function AuthProvider(props: { children: React.ReactNode }) {
  const isAuthed = useWingman((s) => s.auth.isAuthed);
  const userId = useWingman((s) => s.auth.userId);

  const user = React.useMemo<AuthUser | null>(() => {
    if (!isAuthed || !userId) return null;
    return { id: userId };
  }, [isAuthed, userId]);

  const signInDemo = React.useCallback((email?: string) => {
    const id = "demo-user";
    wingmanActions.signInDemo(id);
    if (email) {
      wingmanActions.updateUserProfile({ email });
    }
  }, []);

  const signOut = React.useCallback(() => {
    wingmanActions.signOut();
  }, []);

  const value = React.useMemo<AuthCtx>(() => ({
    isAuthed,
    user,
    signInDemo,
    signOut,
  }), [isAuthed, user, signInDemo, signOut]);

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}