import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { TOOL_CATEGORIES, type ToolCategory } from "@/data/toolCategories";

const INTERNAL_FLAG_KEY = "wingman_enable_internal_tools_v1";

function isActivePath(currentPath: string, target: string) {
  if (target === "/") return currentPath === "/";
  return currentPath === target || currentPath.startsWith(target + "/");
}

function getInternalEnabled(): boolean {
  return (localStorage.getItem(INTERNAL_FLAG_KEY) || "").toLowerCase() === "true";
}

export default function CategoryMenu() {
  const [open, setOpen] = useState(false);
  const [showInternal, setShowInternal] = useState<boolean>(() => getInternalEnabled());
  const loc = useLocation();

  const active = useMemo(() => {
    const current = loc.pathname;
    for (const c of TOOL_CATEGORIES) {
      for (const it of c.items) {
        if (isActivePath(current, it.path)) return { category: c, item: it };
      }
    }
    return null;
  }, [loc.pathname]);

  const toggleInternal = (v: boolean) => {
    setShowInternal(v);
    localStorage.setItem(INTERNAL_FLAG_KEY, v ? "true" : "false");
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: INTERNAL_FLAG_KEY }));
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="wm-btn"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="opacity-80">Menu</span>
        <span className="font-extrabold">{active?.item?.label ?? "Tools"}</span>
        <span className="opacity-70">â–¾</span>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[420px] rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-white/60">
              Tools & Categories
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <Link to="/app/toolhub" onClick={() => setOpen(false)} className="text-xs underline text-white/70 hover:text-white">
                Open Tool Hub
              </Link>

              <label className="inline-flex items-center gap-2 text-xs text-white/70">
                <input
                  type="checkbox"
                  checked={showInternal}
                  onChange={(e) => toggleInternal(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Internal
              </label>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-auto">
            {TOOL_CATEGORIES.map((c: ToolCategory) => (
              <div key={c.id} className="border-b border-white/5">
                <div className="px-4 pt-3 pb-2 text-[11px] font-extrabold uppercase tracking-widest text-white/60">
                  {c.label}
                </div>

                <div className="pb-2">
                  {c.items
                    .filter((it) => showInternal || !it.internal)
                    .map((it) => (
                      <Link
                        key={it.path}
                        to={it.path}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2 hover:bg-white/5"
                        role="menuitem"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-bold text-white">{it.label}</div>
                          {it.internal ? (
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/50">
                              Internal
                            </span>
                          ) : null}
                        </div>
                        {it.description ? (
                          <div className="mt-0.5 text-xs text-white/60">{it.description}</div>
                        ) : null}
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 bg-black/20 flex justify-end">
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-white/60 hover:text-white">
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


