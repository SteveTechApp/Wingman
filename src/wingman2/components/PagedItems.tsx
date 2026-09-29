import { useState, type ReactNode } from "react";

export function PagedItems<T>({ items, children, pageSize = 8, resetKey = "" }: {
  items: readonly T[]; children: (items: T[]) => ReactNode; pageSize?: number; resetKey?: string;
}) {
  const [position, setPosition] = useState({ key: resetKey, page: 0 });
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = position.key === resetKey ? Math.min(position.page, pages - 1) : 0;
  return <div className="wm-paged-items">
    {pages > 1 ? <nav className="wm-workflow-navigation" aria-label="Results pages">
      <span>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, items.length)} of {items.length}</span>
      <div className="wm-workflow-navigation__arrows"><button type="button" disabled={page === 0} onClick={() => setPosition({ key: resetKey, page: page - 1 })}>Previous results</button><button type="button" disabled={page === pages - 1} onClick={() => setPosition({ key: resetKey, page: page + 1 })}>Next results</button></div>
    </nav> : null}
    {children(items.slice(page * pageSize, (page + 1) * pageSize))}
  </div>;
}
