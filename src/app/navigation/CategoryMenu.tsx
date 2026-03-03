import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { TOOL_CATEGORIES, type ToolCategory } from "@/data/toolCategories";

function isActivePath(current: string, path: string) {
  if (path === "/") return current === "/";
  return current === path || current.startsWith(path + "/");
}

type Active = { category: ToolCategory; item: ToolCategory["items"][number] } | null;

export default function CategoryMenu({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const loc = useLocation();
  const current = loc.pathname;

  const [showInternal, setShowInternal] = useState<boolean>(() => {
    try {
      return localStorage.getItem("wm_nav_internal") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("wm_nav_internal", showInternal ? "1" : "0");
    } catch {}
  }, [showInternal]);

  const active: Active = useMemo(() => {
    for (const c of TOOL_CATEGORIES) {
      for (const it of c.items) {
        if (isActivePath(current, it.path)) return { category: c, item: it };
      }
    }
    return null;
  }, [current]);

  return (
    <aside
      className="wm-surface"
      style={{
        width: collapsed ? 72 : 280,
        transition: "width 160ms ease",
        overflow: "hidden",
        alignSelf: "start",
      }}
    >
      <div
        style={{
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ color: "var(--wm-text)", fontWeight: 700, display: collapsed ? "none" : "block" }}>
          Navigation
          {active?.category ? (
            <div style={{ color: "var(--wm-text-muted)", fontSize: 12, marginTop: 2 }}>{active.category.label}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!collapsed && (
            <button className="wm-btn wm-btn--ghost" type="button" onClick={() => setShowInternal((v) => !v)}>
              {showInternal ? "Internal: On" : "Internal: Off"}
            </button>
          )}

          <button
            className="wm-btn wm-btn--icon"
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Toggle menu"
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>
      </div>

      <div style={{ padding: 8, display: "grid", gap: 10 }}>
        {TOOL_CATEGORIES.map((c) => (
          <div key={c.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
            {!collapsed && (
              <div style={{ color: "var(--wm-text-muted)", fontSize: 12, fontWeight: 700, padding: "0 8px 8px" }}>
                {c.label}
              </div>
            )}

            <div style={{ display: "grid", gap: 6 }}>
              {c.items
                .filter((it) => showInternal || !it.internal)
                .map((it) => {
                  const isOn = isActivePath(current, it.path);
                  return (
                    <NavLink
                      key={it.path}
                      to={it.path}
                      className={() => "wm-btn wm-btn--ghost" + (isOn ? " wm-btn--primary" : "")}
                      style={{
                        display: "block",
                        width: "100%",
                        boxSizing: "border-box",
                        padding: collapsed ? "10px" : "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          justifyContent: collapsed ? "center" : "flex-start",
                        }}
                      >
                        <span style={{ fontWeight: 650 }}>
                          {collapsed ? it.label.slice(0, 1).toUpperCase() : it.label}
                        </span>

                        {!collapsed && it.internal ? (
                          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--wm-text-muted)" }}>INT</span>
                        ) : null}
                      </div>

                      {!collapsed && it.description ? (
                        <div style={{ marginTop: 4, fontSize: 12, color: "var(--wm-text-muted)" }}>
                          {it.description}
                        </div>
                      ) : null}
                    </NavLink>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}