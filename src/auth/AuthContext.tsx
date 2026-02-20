import React, { createContext, useContext, useMemo, useState } from "react";
import { getAnyAuth, loginLocal, logout } from "./authStore";

type AuthCtx = {
  isAuthed: boolean;
  user: { email: string; name?: string } | null;
  signInDemo: (email?: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState(() => getAnyAuth());

  const value = useMemo<AuthCtx>(() => ({
    isAuthed: !!auth,
    user: auth?.user ?? null,
    signInDemo: (email = "demo@wingman.local") => {
      const next = loginLocal({ email, name: email.split("@")[0] }, true);
      setAuth(next);
    },
    signOut: () => {
      logout();
      setAuth(null);
    },
  }), [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      isAuthed: false,
      user: null,
      signInDemo: () => undefined,
      signOut: () => undefined,
    };
  }
  return ctx;
}
