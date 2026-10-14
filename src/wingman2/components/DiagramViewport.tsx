import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";


export function DiagramViewport({ title, width, height, children, actions, light = false }: { title: string; width: number; height: number; children: ReactNode; actions?: ReactNode; light?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const [available, setAvailable] = useState(800);
  const viewport = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => setAvailable(Math.max(1, element.clientWidth - 32));
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    return () => { document.body.style.overflow = previous; trigger.current?.focus(); };
  }, [expanded]);
  const scale = zoom ?? Math.min(1, Math.max(0.1, available / width));
  const content = <section className={`wm-diagram-viewer ${expanded ? "is-expanded" : ""}`} role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label={title} onKeyDown={event => {
    if (event.key === "Escape") setExpanded(false);
    if (expanded && event.key === "Tab") {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, [tabindex="0"]'));
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <div className="wm-diagram-controls"><strong>{title}</strong><div>
      <button type="button" onClick={() => setZoom(Math.max(.1, scale - .2))} aria-label="Zoom out">−</button>
      <output aria-live="polite">{Math.round(scale * 100)}%</output>
      <button type="button" onClick={() => setZoom(Math.min(3, scale + .2))} aria-label="Zoom in">+</button>
      <button type="button" onClick={() => { setZoom(null); viewport.current?.scrollTo(0, 0); }}>Fit width</button>
      <button type="button" onClick={() => setZoom(1)}>Actual size</button>
      {expanded ? <button ref={close} type="button" onClick={() => setExpanded(false)}>Close full screen</button> : <button ref={trigger} type="button" onClick={() => setExpanded(true)}>Full screen</button>}
    </div></div>
    {actions}
    <div ref={viewport} className={`wm-diagram-scroll ${light ? "is-light" : ""}`} tabIndex={0} aria-label="Scrollable drawing">
      <div className="wm-diagram-drawing" style={{ width: width * scale, height: height * scale }}>{children}</div>
    </div>
  </section>;
  return expanded ? createPortal(content, document.body) : content;
}
