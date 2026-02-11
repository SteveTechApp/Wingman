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
    <section className="wm-page">
      <div className="wm-container py-4 md:py-5">
        <div className="wm-card wm-card-pad">
          {breadcrumbs?.length ? (
            <div className="mb-3 text-xs wm-muted flex flex-wrap gap-2">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-2">
                  {b.href ? (
                    <a className="hover:underline" href={b.href}>
                      {b.label}
                    </a>
                  ) : (
                    <span>{b.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 ? <span className="opacity-40">/</span> : null}
                </span>
              ))}
            </div>
          ) : null}

          <div className="wm-pagehead">
            {kicker ? <div className="wm-kicker mb-2">{kicker}</div> : null}

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="wm-h1">{title ?? "Wingman"}</h1>
                {subtitle ? <p className="wm-subtitle mt-1">{subtitle}</p> : null}
              </div>
              {right ? <div className="shrink-0">{right}</div> : null}
            </div>
          </div>

          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}