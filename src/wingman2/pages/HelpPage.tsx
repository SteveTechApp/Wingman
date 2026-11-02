import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import userGuide from "../../../docs/USER_GUIDE.md?raw";
import { PageBandPanel, PageBandRail } from "../components/PageBands";
import { bandKeyAt, bandNeighbours } from "../lib/pageBands";
import { parseGuide, type GuideBlock, type GuideInline } from "../lib/guideMarkdown";

function Inline({ spans }: { spans: readonly GuideInline[] }) {
  return (
    <>
      {spans.map((span, index) => {
        if (span.code) return <code key={index} className="wm-help-code">{span.text}</code>;
        if (span.bold) return <strong key={index}>{span.text}</strong>;
        if (span.italic) return <em key={index}>{span.text}</em>;
        return <span key={index}>{span.text}</span>;
      })}
    </>
  );
}

function Blocks({ blocks }: { blocks: readonly GuideBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h3 key={index} id={block.id} className="wm-help-heading">
              {block.text}
            </h3>
          );
        }

        if (block.kind === "paragraph") {
          return (
            <p key={index} className="wm-help-copy">
              <Inline spans={block.spans} />
            </p>
          );
        }

        if (block.kind === "list") {
          const items = block.items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <Inline spans={item} />
            </li>
          ));
          return block.ordered
            ? <ol key={index} className="wm-help-list">{items}</ol>
            : <ul key={index} className="wm-help-list">{items}</ul>;
        }

        return (
          <div key={index} className="wm-help-table-wrap">
            <table className="wm-help-table">
              <thead>
                <tr>
                  {block.head.map((cell, cellIndex) => (
                    <th key={cellIndex} scope="col"><Inline spans={cell} /></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}><Inline spans={cell} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}

/**
 * Wingman's guide, read in the app.
 *
 * The page holds no copy of its own: `docs/USER_GUIDE.md` is imported raw and
 * each `##` heading is a band, so the guide a rep opens here is the guide the
 * repository ships. The open band lives in the address, which is what lets the
 * Guru, a bookmark or a colleague's message point at one section rather than at
 * the top of a long page.
 */
export function HelpPage() {
  const guide = useMemo(() => parseGuide(userGuide), []);
  const [params, setParams] = useSearchParams();
  const active = bandKeyAt(guide.sections, params.get("section")) ?? guide.sections[0]?.key ?? null;
  const { previous, next } = active ? bandNeighbours(guide.sections, active) : { previous: undefined, next: undefined };

  function openSection(key: string) {
    setParams((current) => {
      const nextParams = new URLSearchParams(current);
      nextParams.set("section", key);
      return nextParams;
    }, { replace: true });
  }

  if (!active) {
    return (
      <article className="wm-help-page">
        <header className="wm-help-header">
          <p className="wm-help-kicker">Wingman help</p>
          <h1>{guide.title}</h1>
        </header>
        <div className="wm-help-lead"><Blocks blocks={guide.lead} /></div>
        <p className="wm-help-copy">The guide has no sections to read yet.</p>
      </article>
    );
  }

  return (
    <article className="wm-help-page">
      <header className="wm-help-header">
        <p className="wm-help-kicker">Wingman help</p>
        <h1>{guide.title}</h1>
      </header>

      <div className="wm-help-lead"><Blocks blocks={guide.lead} /></div>

      <PageBandRail
        label="Guide sections"
        bands={guide.sections}
        active={active}
        onSelect={openSection}
        testIdPrefix="help-section"
        className="wm-help-rail"
        itemClassName="wm-help-band"
        activeClassName="is-open"
        numberClassName="wm-help-band-number"
        copyClassName="wm-help-band-copy"
      />

      {guide.sections.map((section) => (
        <PageBandPanel key={section.key} band={section.key} of={active} className="wm-help-panel">
          <Blocks blocks={section.blocks} />
        </PageBandPanel>
      ))}

      <nav className="wm-help-nav" aria-label="Guide sections">
        {previous ? (
          <button type="button" className="wm-help-nav-button" onClick={() => openSection(previous.key)}>
            {`Previous: ${previous.label}`}
          </button>
        ) : <span />}
        {next ? (
          <button type="button" className="wm-help-nav-button" onClick={() => openSection(next.key)}>
            {`Next: ${next.label}`}
          </button>
        ) : null}
      </nav>

      <p className="wm-help-source">
        This page prints the Wingman user guide shipped with the app. Guru can point you at a section, and the
        page's address keeps the section you were reading.
      </p>
    </article>
  );
}
