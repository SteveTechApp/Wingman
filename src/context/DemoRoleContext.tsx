import React, { createContext, useContext, useMemo, useState } from "react";

export type DemoRole = "sales" | "presales" | "admin";

export type Ctx = {
  role: DemoRole;
  setRole: (r: DemoRole) => void;
};

const DemoRoleContext = createContext<Ctx | null>(null);

export function DemoRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<DemoRole>("sales");
  const value = useMemo<Ctx>(() => ({ role, setRole }), [role]);
  return <DemoRoleContext.Provider value={value}>{children}</DemoRoleContext.Provider>;
}

export function useDemoRole(): Ctx {
  const ctx = useContext(DemoRoleContext);
  if (!ctx) throw new Error("useDemoRole must be used within <DemoRoleProvider>.");
  return ctx;
}