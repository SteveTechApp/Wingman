import { useRef, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

const sections = [
  { key: "brief", label: "Brief", hint: "Review the wall requirements" },
  { key: "recommendation", label: "Recommendation", hint: "Equipment and signal path" },
  { key: "layout", label: "Wall layout", hint: "Dimensions and source mapping" },
  { key: "survey", label: "Cabling & survey", hint: "Runs and installation details" },
  { key: "save", label: "Save & export", hint: "Save the design or open a proposal" },
] as const;

type SectionKey = typeof sections[number]["key"];

/** Each result section has its own address; the builder retains the design. */
export function VideowallResultPages({ pages }: { pages: Record<SectionKey, ReactNode> }) {
  const [search, setSearch] = useSearchParams();
  const heading = useRef<HTMLHeadingElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const index = Math.max(0, sections.findIndex(section => section.key === search.get("section")));
  const current = sections[index];

  function open(next: SectionKey) {
    setSearch(previous => {
      const params = new URLSearchParams(previous);
      params.set("section", next);
      return params;
    });
    // The heading stays mounted while its section changes.
    heading.current?.focus({ preventScroll: true });
    navigation.current?.scrollIntoView?.({ block: "start", behavior: "instant" });
  }

  return (
    <>
      <nav ref={navigation} className="vw-wizard-stages" aria-label="Video wall sections">
        {sections.map((section, position) => (
          <button
            key={section.key}
            type="button"
            data-testid={`videowall-section-${section.key}`}
            aria-current={section.key === current.key ? "step" : undefined}
            aria-pressed={section.key === current.key}
            onClick={() => open(section.key)}
          >
            <span className="vw-wizard-stage-number" aria-hidden="true">{position + 1}</span>
            <span className="vw-wizard-stage-copy"><strong>{section.label}</strong></span>
          </button>
        ))}
      </nav>
      <section className="vw-wizard-stage" aria-labelledby="videowall-section-title" data-testid={`videowall-page-${current.key}`}>
        <header>
          <p className="wm-ui-kicker">Section {index + 1} of {sections.length}</p>
          <h2 id="videowall-section-title" ref={heading} tabIndex={-1}>{current.label}</h2>
          <p className="vw-wizard-stage-intro">{current.hint}</p>
        </header>
        {pages[current.key]}
      </section>
      <div className="vw-wizard-nav" aria-label="Section navigation">
        {index > 0 ? <button type="button" onClick={() => open(sections[index - 1].key)}>Back to {sections[index - 1].label.toLowerCase()}</button> : <span />}
        {index < sections.length - 1 ? <button type="button" className="vw-wizard-primary" onClick={() => open(sections[index + 1].key)}>Continue to {sections[index + 1].label.toLowerCase()}</button> : null}
      </div>
    </>
  );
}
