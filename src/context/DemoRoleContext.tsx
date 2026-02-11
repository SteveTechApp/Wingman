
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type DemoRole = "GUEST" | "REGISTERED" | "ADMIN";

type Ctx = {
  role: DemoRole;
  setRole: (r: DemoRole) => void;
};

const DemoRoleContext = createContext<Ctx | null>(null);

const KEY = "wingman_demo_role";

export function DemoRoleProvider(props: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<DemoRole>("GUEST");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as DemoRole | null;
      if (saved === "GUEST" || saved === "REGISTERED" || saved === "ADMIN") setRoleState(saved);
    } catch {
      // ignore
    }
  }, []);

  const setRole = (r: DemoRole) => {
    setRoleState(r);
    try { localStorage.setItem(KEY, r); } catch { /* ignore */ }
  };

  const value = useMemo(() => ({ role, setRole }), [role]);
  return <DemoRoleContext.Provider value={value}>{props.children}</DemoRoleContext.Provider>;
}

export function useDemoRole() {
  const ctx = useContext(DemoRoleContext);
  if (!ctx) throw new Error("useDemoRole must be used within DemoRoleProvider");
  return ctx;
}


