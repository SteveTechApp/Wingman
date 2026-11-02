import { useRef, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { PageBandRail } from "../../components/PageBands";
import { bandIndex, bandKeyAt, bandNeighbours } from "../../lib/pageBands";

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
  const navigation = useRef<HTMLDivElement>(null);
  // The ladder answers which sections sit either side of the one the address
  // names, so the address read and the nav read cannot disagree.
  const key = bandKeyAt(sections, search.get("section")) ?? "brief";
  const index = bandIndex(sections, key);
  const current = sections[index];
  const { previous, next } = bandNeighbours(sections, key);

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
      <div ref={navigation}>
        <PageBandRail
          label="Video wall sections"
          bands={sections}
          active={key}
          onSelect={open}
          testIdPrefix="videowall-section"
          className="vw-wizard-stages"
          numberClassName="vw-wizard-stage-number"
          copyClassName="vw-wizard-stage-copy"
          ariaCurrent="step"
        />
      </div>
      <section className="vw-wizard-stage" aria-labelledby="videowall-section-title" data-testid={`videowall-page-${key}`}>
        <header>
          <p className="wm-ui-kicker">Section {index + 1} of {sections.length}</p>
          <h2 id="videowall-section-title" ref={heading} tabIndex={-1}>{current.label}</h2>
          <p className="vw-wizard-stage-intro">{current.hint}</p>
        </header>
        {pages[key]}
      </section>
      <div className="vw-wizard-nav" aria-label="Section navigation">
        {previous ? <button type="button" onClick={() => open(previous.key)}>Back to {previous.label.toLowerCase()}</button> : <span />}
        {next ? <button type="button" className="vw-wizard-primary" onClick={() => open(next.key)}>Continue to {next.label.toLowerCase()}</button> : null}
      </div>
    </>
  );
}
