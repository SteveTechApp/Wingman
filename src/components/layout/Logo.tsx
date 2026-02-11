
import React from "react";

export type LogoProps = {
  className?: string;
};

/**
 * Wingman Logo (safe fallback).
 * Avoids hard dependency on missing PNG assets.
 */
export default function Logo({ className }: LogoProps) {
  return (
    <div className={["flex items-center gap-2", className].filter(Boolean).join(" ")}>
      <span
        aria-hidden="true"
        className="inline-flex h-16 w-auto items-center justify-center rounded-lg border border-white/15 bg-white/5"
      >
        <span className="text-[12px] font-black tracking-tight">W</span>
      </span>
      <span className="font-black tracking-tight">WyreStorm</span>
    </div>
  );
}

