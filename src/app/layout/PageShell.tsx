import React from "react";

export type PageShellProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  style?: React.CSSProperties;
  [key: string]: any;
};

export default function PageShell(props: PageShellProps) {
  const {
    title,
    subtitle,
    actions,
    children,
    className,
    contentClassName,
    style,
    ...rest
  } = props;

  return (
    <section
      className={className}
      style={{
        width: "100%",
        minHeight: "100%",
        padding: 24,
        ...style,
      }}
      {...rest}
    >
      {(title || subtitle || actions) && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            {title ? (
              <h1 style={{ margin: 0, fontSize: "1.6rem", lineHeight: 1.2 }}>
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <div style={{ marginTop: 6, opacity: 0.8 }}>{subtitle}</div>
            ) : null}
          </div>

          {actions ? <div>{actions}</div> : null}
        </div>
      )}

      <div className={contentClassName}>{children}</div>
    </section>
  );
}