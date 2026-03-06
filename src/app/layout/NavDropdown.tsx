import React from "react";

export type NavDropdownProps = {
  label?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
};

export default function NavDropdown(props: NavDropdownProps) {
  const { label, children, className, ...rest } = props;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
      {...rest}
    >
      {label ? <span>{label}</span> : null}
      {children ? (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            minWidth: 180,
            marginTop: 8,
            padding: 8,
            borderRadius: 12,
            background: "var(--wm-surface, #111827)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
            zIndex: 50,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}