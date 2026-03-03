// src/pages/public/PublicShell.tsx
import React from "react";
import { Outlet } from "react-router-dom";

export default function PublicShell() {
  return (
    <div
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: 0,
      }}
    >
      <Outlet />
    </div>
  );
}