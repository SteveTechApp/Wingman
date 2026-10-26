import { useEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

export type WorkflowPage<Id extends string = string> = { id: Id; label: string };

/**
 * The page the address asks for, read back at the id type the page's own list
 * carries — so a caller whose pages are a derived union (the project page's
 * sections) gets `current` as that union, and a screen conditional naming an
 * id the list does not hold is a type error. An address that names no page on
 * this list falls back to the first one; `pages` is expected to be non-empty.
 */
export function useWorkflowPage<Id extends string>(pages: readonly WorkflowPage<Id>[], parameter = "view", initial?: Id) {
  const [params] = useSearchParams();
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const requested: string | undefined = params.get(parameter) ?? initial;
  const current: Id = pages.find((page) => page.id === requested)?.id ?? pages[0].id;
  function go(id: Id) {
    if (!pages.some((page) => page.id === id)) return;
    const next = new URLSearchParams(search);
    next.set(parameter, id);
    // The fragment names a place inside the page rather than a query value, so
    // switching page keeps it: the page's own anchor reader decides whether the
    // place it names is still on screen.
    navigate({ pathname, search: `?${next.toString()}`, hash });
  }
  return { current, go };
}

export function WorkflowNavigation({ pages, current, onChange, label }: {
  pages: readonly WorkflowPage[]; current: string; onChange: (id: string) => void; label: string;
}) {
  const index = pages.findIndex((page) => page.id === current);
  return <nav className="wm-workflow-navigation" aria-label={label}>
    <div className="wm-workflow-navigation__pages">{pages.map((page) => <button key={page.id} data-testid={`workflow-page-${page.id}`} type="button" aria-current={current === page.id ? "page" : undefined} onClick={() => onChange(page.id)}>{page.label}</button>)}</div>
    <div className="wm-workflow-navigation__arrows">
      <button type="button" disabled={index === 0} onClick={() => onChange(pages[index - 1].id)} aria-label="Previous page">←</button>
      <button type="button" disabled={index === pages.length - 1} onClick={() => onChange(pages[index + 1].id)} aria-label="Next page">→</button>
    </div>
  </nav>;
}

export function WorkflowPages({ pages, label, parameter = "view", initial }: {
  pages: readonly (WorkflowPage & { content: ReactNode })[]; label: string; parameter?: string; initial?: string;
}) {
  const { current, go } = useWorkflowPage(pages, parameter, initial);
  const body = useRef<HTMLDivElement>(null);
  const previous = useRef(current);
  useEffect(() => {
    if (previous.current === current) return;
    previous.current = current;
    body.current?.focus({ preventScroll: true });
    body.current?.scrollIntoView?.({ block: "start" });
  }, [current]);
  const selected = pages.find((page) => page.id === current)!;
  return <div>
    <WorkflowNavigation pages={pages} current={current} onChange={go} label={label} />
    <div ref={body} tabIndex={-1} role="region" aria-label={selected.label} className="wm-workflow-pages__body">{selected.content}</div>
  </div>;
}
