import React from "react";
import AppRoutes from "./AppRoutes";

export default function App() {
  return (
    <React.Suspense fallback={<div className="p-4">Loading…</div>}>
      <AppRoutes />
    </React.Suspense>
  );
}