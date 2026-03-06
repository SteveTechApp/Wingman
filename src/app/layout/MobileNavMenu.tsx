import React from "react";

export type MobileNavMenuProps = {
  open?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
};

export default function MobileNavMenu(props: MobileNavMenuProps) {
  const { open, isOpen, onClose, children, className, ...rest } = props;
  const visible = Boolean(open ?? isOpen);

  if (!visible) return null;

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
      {...rest}
    >
      <div
        style={{
          width: "min(360px, 92vw)",
          height: "100%",
          background: "var(--wm-surface, #0f172a)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-12px 0 32px rgba(0,0,0,0.35)",
          padding: 16,
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}