import React, { createContext, useContext, useMemo, useState } from "react";

export type AuthUser = { id: string; name: string };

export type AuthCtx = {
  isAuthed: boolean;
  user: AuthUser | null;
  signInDemo: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const value = useMemo<AuthCtx>(() => ({
    isAuthed,
    user,
    signInDemo: () => {
      setIsAuthed(true);
      setUser({ id: "demo", name: "Demo User" });
    },
    signOut: () => {
      setIsAuthed(false);
      setUser(null);
    },
  }), [isAuthed, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>.");
  return ctx;
}