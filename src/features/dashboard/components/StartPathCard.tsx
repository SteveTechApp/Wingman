import { ReactNode } from "react";

export type StartPathCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  hints?: string[];
  ctaLabel: string;
  onClick?: () => void;
  featured?: boolean;
  accent?: "blue" | "purple" | "green" | "slate";
  icon?: ReactNode;
};

const accentMap: Record<NonNullable<StartPathCardProps["accent"]>, {
  ring: string;
  pill: string;
  iconWrap: string;
  glow: string;
}> = {
  blue: {
    ring: "border-cyan-400/30 hover:border-cyan-300/50",
    pill: "bg-cyan-500/10 text-cyan-200 border-cyan-400/20",
    iconWrap: "bg-cyan-500/12 text-cyan-200 border-cyan-400/20",
    glow: "shadow-[0_0_40px_rgba(34,211,238,0.10)]",
  },
  purple: {
    ring: "border-violet-400/30 hover:border-violet-300/50",
    pill: "bg-violet-500/10 text-violet-200 border-violet-400/20",
    iconWrap: "bg-violet-500/12 text-violet-200 border-violet-400/20",
    glow: "shadow-[0_0_40px_rgba(139,92,246,0.10)]",
  },
  green: {
    ring: "border-emerald-400/30 hover:border-emerald-300/50",
    pill: "bg-emerald-500/10 text-emerald-200 border-emerald-400/20",
    iconWrap: "bg-emerald-500/12 text-emerald-200 border-emerald-400/20",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.10)]",
  },
  slate: {
    ring: "border-white/10 hover:border-white/20",
    pill: "bg-white/5 text-slate-200 border-white/10",
    iconWrap: "bg-white/5 text-slate-100 border-white/10",
    glow: "",
  },
};

function DefaultArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4.5 10H15.5M15.5 10L10.75 5.25M15.5 10L10.75 14.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StartPathCard({
  eyebrow,
  title,
  description,
  hints = [],
  ctaLabel,
  onClick,
  featured = false,
  accent = "slate",
  icon,
}: StartPathCardProps) {
  const palette = accentMap[accent];

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-3xl border bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.94))]",
        "p-6 md:p-7 transition-all duration-200",
        "backdrop-blur",
        palette.ring,
        palette.glow,
        featured ? "min-h-[260px]" : "min-h-[220px]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 opacity-100">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/[0.03] blur-3xl" />
        <div className="absolute -bottom-20 left-0 h-40 w-40 rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      <div className="relative flex h-full flex-col">
        <div className="mb-5 flex items-start gap-4">
          <div
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
              palette.iconWrap,
            ].join(" ")}
          >
            {icon ?? <DefaultArrowIcon />}
          </div>

          <div className="min-w-0">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300/85">
              {eyebrow}
            </div>
            <h3 className="text-2xl font-semibold leading-tight text-white">
              {title}
            </h3>
          </div>
        </div>

        <p className="max-w-2xl text-sm leading-6 text-slate-300">
          {description}
        </p>

        {hints.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {hints.map((hint) => (
              <span
                key={hint}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  palette.pill,
                ].join(" ")}
              >
                {hint}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={onClick}
            className={[
              "inline-flex items-center gap-2 rounded-full border px-4 py-2.5",
              "text-sm font-semibold text-white transition-all duration-200",
              "bg-white/6 border-white/12 hover:bg-white/10 hover:border-white/20",
              "group-hover:translate-x-[1px]",
            ].join(" ")}
          >
            <span>{ctaLabel}</span>
            <DefaultArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
}