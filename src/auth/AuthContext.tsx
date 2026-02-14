import React, { createContext, useContext, useMemo, useState } from "react";
import { getAnyAuth, loginLocal, logout } from "./authStore";

type AuthContextValue = {
  isAuthed: boolean;
  email?: string;
  signInDemo: (email?: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | undefined>(() => getAnyAuth()?.user.email);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthed: Boolean(email),
      email,
      signInDemo: (nextEmail = "demo@wingman.local") => {
        loginLocal({ email: nextEmail, name: "Demo User" }, true);
        setEmail(nextEmail);
      },
      signOut: () => {
        logout();
        setEmail(undefined);
      },
    }),
    [email],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
