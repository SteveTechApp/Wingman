import * as React from "react";

type Props = {
  variant?: "full" | "mark";
  size?: number;
  className?: string;
  subtitle?: string;
};

export default function BrandMark({ variant="full", size=28, className="", subtitle="Wingman" }: Props){
  return (
    <div className={className} style={{ display:"inline-flex", alignItems:"center", gap:10 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="wmG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--wm-accent)" />
            <stop offset="1" stopColor="var(--wm-accent-2)" />
          </linearGradient>
        </defs>
        <rect x="6" y="6"   rx="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" />
        <path d="M18 34c6-10 12-14 20-14 6 0 10 2 14 6-6 2-11 6-14 12-2 4-2 7-2 10-8-2-14-6-18-14z"
              fill="url(#wmG)" opacity="0.95" />
        <path d="M18 34c8 8 16 12 24 12" stroke="rgba(255,255,255,0.55)" strokeLinecap="round" />
      </svg>

      {variant === "full" && (
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ fontWeight: 800, letterSpacing: "0.02em", color: "var(--wm-text)" }}>WyreStorm</div>
          <div style={{ fontWeight: 700, color: "var(--wm-text-muted)" }}>{subtitle}</div>
        </div>
      )}
    </div>
  );
}

