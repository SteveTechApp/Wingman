import React from "react";

export function Chip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "accent" }) {
  const bg = tone === "accent" ? "rgba(31,224,163,0.15)" : "rgba(255,255,255,0.08)";
  return <span style={{ padding: "4px 8px", borderRadius: 999, background: bg, fontSize: 12 }}>{label}</span>;
}
