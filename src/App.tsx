import React, { Suspense } from "react";

import AppRoutes from "./AppRoutes";
import { AuthProvider } from "@/auth/AuthContext";

export default function App() {
  return (
    
      <AuthProvider>
        <Suspense fallback={<div className="wm-bg wm-page wm-container"><div className="wm-card wm-card-pad">Loading…</div></div>}>
          <AppRoutes />
        </Suspense>
      </AuthProvider>
    
  );
}