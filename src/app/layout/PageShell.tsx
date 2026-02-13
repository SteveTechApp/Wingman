import React from "react";

type Breadcrumb = { label: string; href?: string };

export default function PageShell(props: {
  title?: string;
  subtitle?: string;
  kicker?: string;
  breadcrumbs?: Breadcrumb[];
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { title, subtitle, kicker, breadcrumbs, right, children } = props;

  return (
    <section className="wm-page wm-density-compact">
      <div className="wm-container py-2 md:py-2 wm-density-compact">
        <div className="wm-card wm-card-pad wm-density-compact">
          {breadcrumbs?.length ? (
            <div className="mb-3 text-xs wm-muted flex flex-wrap gap-2 wm-density-compact">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-2 wm-density-compact">
                  {b.href ? (
                    <a className="hover:underline wm-density-compact" href={b.href}>
                      {b.label}
                    </a>
                  ) : (
                    <span>{b.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 ? <span className="opacity-40 wm-density-compact">/</span> : null}
                </span>
              ))}
            </div>
          ) : null}

          <div className="wm-pagehead wm-density-compact">
            {kicker ? <div className="wm-kicker mb-2 wm-density-compact">{kicker}</div> : null}

            <div className="flex items-start justify-between gap-3 wm-density-compact">
              <div className="min-w-0 wm-density-compact">
                <h1 className="wm-h1 wm-density-compact">{title ?? "Wingman"}</h1>
                {subtitle ? <p className="wm-subtitle mt-1 wm-density-compact">{subtitle}</p> : null}
              </div>
              {right ? <div className="shrink-0 wm-density-compact">{right}</div> : null}
            </div>
          </div>

          <div className="mt-4 wm-density-compact">{children}</div>
        </div>
      </div>
    </section>
  );
}