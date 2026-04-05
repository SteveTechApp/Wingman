import * as React from "react";
type Props = {
 id: string;
 title: string;
 subtitle?: string;
 right?: React.ReactNode;
 defaultCollapsed?: boolean;
 children?: React.ReactNode;
};

function readBool(key: string, fallback: boolean): boolean {
 try {
 const v = localStorage.getItem(key);
 if (v === null) return fallback;
 return v === "1";
 } catch {
 return fallback;
 }
}

function writeBool(key: string, value: boolean) {
 try {
 localStorage.setItem(key, value ? "1" : "0");
 } catch {}
}

export default function CollapsibleCard({
 id,
 title,
 subtitle,
 right,
 defaultCollapsed,
 children,
}: Props) {
 const storageKey = `wm_collapsible_${id}`;
 const [collapsed, setCollapsed] = React.useState<boolean>(() =>
 readBool(storageKey, !!defaultCollapsed)
 );

 React.useEffect(() => {
 writeBool(storageKey, collapsed);
 }, [storageKey, collapsed]);

 return (
 <section className="wm-card wm-animate-in wm-collapsible" style={{ padding: 14 }}>
 <div
 style={{
 display: "flex",
 alignItems: "flex-start",
 justifyContent: "space-between",
 gap: 12,
 }}
 >
 <button
 type="button"
 className="wm-collapse-toggle"
 onClick={() => setCollapsed((v) => !v)}
 aria-expanded={!collapsed}
 aria-controls={`wm-collapsible-body-${id}`}
 title={collapsed ? "Expand" : "Collapse"}
 style={{
 display: "flex",
 alignItems: "flex-start",
 gap: 10,
 background: "transparent",
 border: "none",
 padding: 0,
 cursor: "pointer",
 color: "inherit",
 textAlign: "left",
 flex: 1,
 minWidth: 0,
 }}
 >
 <span className="wm-chevron is-collapsed" aria-hidden="true">{">"}</span>
 <span style={{ minWidth: 0 }}>
 <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.01em" }}>{title}</div>
 {subtitle ? (
 <div style={{ marginTop: 4, fontSize: 12, opacity: 0.86, lineHeight: 1.35 }}>
 {subtitle}
 </div>
 ) : null}
 </span>
 </button>

 <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
 {right ? <div>{right}</div> : null}
 <button
 type="button"
 className="wm-btn"
 onClick={() => setCollapsed((v) => !v)}
 style={{ height: 28, padding: "0 10px" }}
 aria-label={collapsed ? "Expand section" : "Collapse section"}
 title={collapsed ? "Expand" : "Collapse"}
 >
 {collapsed ? "Expand" : "Collapse"}
 </button>
 </div>
 </div>

 <div id={`wm-collapsible-body-${id}`} style={{ marginTop: 12, display: collapsed ? "none" : "block" }}>
 {children}
 </div>
 </section>
 );
}
