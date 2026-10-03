import { useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

export type WorkflowPage = { id: string; label: string };

export function useWorkflowPage(pages: readonly WorkflowPage[], parameter = "view", initial?: string) {
  const [params, setParams] = useSearchParams();
  const requested = params.get(parameter) ?? initial;
  const current = pages.find((page) => page.id === requested)?.id ?? pages[0].id;
  function go(id: string) {
    if (!pages.some((page) => page.id === id)) return;
    setParams((previous) => { const next = new URLSearchParams(previous); next.set(parameter, id); return next; });
  }
  return { current, go };
}

export function WorkflowNavigation({ pages, current, onChange, label }: {
  pages: readonly WorkflowPage[]; current: string; onChange: (id: string) => void; label: string;
}) {
  const index = pages.findIndex((page) => page.id === current);
  return <nav className="wm-workflow-navigation" aria-label={label}>
    <div className="wm-workflow-navigation__pages">{pages.map((page) => <button key={page.id} type="button" aria-current={current === page.id ? "page" : undefined} onClick={() => onChange(page.id)}>{page.label}</button>)}</div>
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
  return <div className="wm-workflow-pages">
    <WorkflowNavigation pages={pages} current={current} onChange={go} label={label} />
    <div ref={body} tabIndex={-1} role="region" aria-label={selected.label} className="wm-workflow-pages__body">{selected.content}</div>
  </div>;
}
