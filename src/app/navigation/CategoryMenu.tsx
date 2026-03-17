import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { TOOL_CATEGORIES, type ToolCategory } from "@/data/toolCategories";

function isActivePath(currentPath: string, target: string) {
  if (target === "/") return currentPath === "/";
  return currentPath === target || currentPath.startsWith(target + "/");
}

export default function CategoryMenu() {
  const [open, setOpen] = React.useState(false);
  const loc = useLocation();

  const active = React.useMemo(() => {
    const current = loc.pathname;
    for (const c of TOOL_CATEGORIES) {
      for (const it of c.items) {
        if (isActivePath(current, it.path)) return { category: c, item: it };
      }
    }
    return null;
  }, [loc.pathname]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex\ items-center\ gap-2\ rounded-xl\ border\ border-white/10\ bg-black/20\ px-3\ py-2\ text-sm\ font-semibold\ text-white\ hover:bg-black/30"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-emerald-100/70">Menu</span>
        <span className="text-white">{active?.item?.label ?? "Tools"}</span>
        <span className="text-emerald-100/60">?f��??s��?,??"?f��?,?s�?f��??s�?.??o�?,???o�</span>
      </button>

      {open && (
        <div className="absolute\ left-0\ mt-2\ w-\[380px]\ rounded-2xl\ border\ border-white/10\ bg-slate-950\ shadow-2xl\ overflow-hidden\ z-50">
          <div className="px-4\ py-3\ border-b\ border-white/10">
            <div className="text-\[11px]\ font-bold\ uppercase\ tracking-widest\ text-emerald-100/60">
              Tools & Categories
            </div>
            <div className="mt-2\ flex\ items-center\ justify-between\ gap-3">
              <Link
                to="/tools"
                onClick={() => setOpen(false)}
                className="text-xs\ text-emerald-100/70\ hover:text-emerald-100\ underline"
              >
                Open Tools Hub
              </Link>
            </div>
          </div>

          <div className="max-h-\[70vh]\ overflow-visible">
            {TOOL_CATEGORIES.map((c: ToolCategory) => (
              <div key={c.id} className="border-b\ border-white/5">
                <div className="px-4\ pt-3\ pb-2\ text-\[11px]\ font-bold\ uppercase\ tracking-widest\ text-emerald-100/60">
                  {c.label}
                </div>

                <div className="pb-2">
                  {c.items
                    .filter((it) => !it.internal)
                    .map((it) => (
                      <Link
                        key={it.path}
                        to={it.path}
                        onClick={() => setOpen(false)}
                        className="block\ px-4\ py-2\ hover:bg-emerald-950/40"
                        role="menuitem"
                      >
                        <div className="flex\ items-center\ justify-between\ gap-3">
                          <div className="text-sm\ font-semibold\ text-white">{it.label}</div>
                        </div>
                        {it.description ? (
                          <div className="mt-0\.5\ text-xs\ text-emerald-100/60">{it.description}</div>
                        ) : null}
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4\ py-3\ bg-black/20">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs\ text-emerald-100/60\ hover:text-emerald-100"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
