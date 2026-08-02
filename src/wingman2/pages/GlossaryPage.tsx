import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Lightbulb, Search, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  AV_GLOSSARY_CATEGORIES,
  AV_GLOSSARY_TERMS,
  type AvGlossaryTerm,
} from "../data/avGlossary";

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function termSearchText(term: AvGlossaryTerm) {
  const referenceText = term.reference
    ? [
        term.reference.caption,
        ...term.reference.columns,
        ...term.reference.rows.flatMap((row) => [row.label, ...row.cells, row.note ?? ""]),
        term.reference.footnote ?? "",
      ]
    : [];

  return normalise(
    [
      term.term,
      term.acronym,
      term.category,
      term.plainEnglish,
      term.whyItMatters,
      term.inReality,
      ...term.aliases,
      ...term.related,
      ...term.cautions,
      ...referenceText,
    ].filter(Boolean).join(" "),
  );
}

export function GlossaryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedId, setSelectedId] = useState(AV_GLOSSARY_TERMS[0]?.id ?? "");

  useEffect(() => {
    const requestedTerm = searchParams.get("term");

    if (!requestedTerm) {
      return;
    }

    const requestedValue = normalise(requestedTerm);
    const target = AV_GLOSSARY_TERMS.find((term) =>
      [term.id, term.term, term.acronym ?? "", ...term.aliases]
        .map(normalise)
        .includes(requestedValue),
    );

    if (target) {
      setActiveCategory("All");
      setQuery("");
      setSelectedId(target.id);
    }
  }, [searchParams]);

  const searchIndex = useMemo(
    () => AV_GLOSSARY_TERMS.map((term) => ({ term, text: termSearchText(term) })),
    [],
  );

  const filteredTerms = useMemo(() => {
    const normalisedQuery = normalise(query);

    return searchIndex
      .filter(({ term, text }) => {
        const categoryMatches = activeCategory === "All" || term.category === activeCategory;
        const queryMatches = !normalisedQuery || text.includes(normalisedQuery);

        return categoryMatches && queryMatches;
      })
      .map(({ term }) => term);
  }, [activeCategory, query, searchIndex]);

  useEffect(() => {
    if (!filteredTerms.length) {
      return;
    }

    if (!filteredTerms.some((term) => term.id === selectedId)) {
      setSelectedId(filteredTerms[0].id);
    }
  }, [filteredTerms, selectedId]);

  const selectedTerm = filteredTerms.find((term) => term.id === selectedId) ?? filteredTerms[0] ?? AV_GLOSSARY_TERMS[0];
  const categoryCounts = useMemo(() => {
    return AV_GLOSSARY_TERMS.reduce<Record<string, number>>((counts, term) => {
      counts[term.category] = (counts[term.category] ?? 0) + 1;
      return counts;
    }, {});
  }, []);

  // Jump straight to a term by name, so "related terms" behaves like a
  // reference cross-reference rather than re-running a text search that might
  // land somewhere else.
  function openTerm(name: string) {
    const target = AV_GLOSSARY_TERMS.find((term) => {
      const candidates = [term.term, term.acronym ?? "", ...term.aliases].map(normalise);
      return candidates.includes(normalise(name));
    });

    setActiveCategory("All");

    if (target) {
      setQuery("");
      setSelectedId(target.id);
      setSearchParams({ term: target.id });
      return;
    }

    setQuery(name);
  }

  return (
    <main className="wm-page wm-glossary-page" data-wingman-page="glossary">
      <section className="wm-glossary-intro" aria-labelledby="glossary-title">
        <header className="wm-glossary-header">
          <div>
            <h1 id="glossary-title" className="wm-page-title">AV glossary</h1>
            <p className="wm-page-description">
              Search practical definitions, standards, cable grades and the trade-offs that matter on an AV job.
            </p>
          </div>
          <div className="wm-action-row" aria-label="Glossary actions">
            <Link className="wm-button wm-button-secondary" to={routeCatalogByKey.catalogBrowser.path}>
              Browse Catalogue
            </Link>
            <Link className="wm-button wm-button-secondary" to={routeCatalogByKey.salesHelper.path}>
              Open Sales Strategy
            </Link>
          </div>
        </header>

        <label className="wm-glossary-search">
          <Search className="h-4 w-4" />
          <span className="sr-only">Search glossary</span>
          <input
            className="wm-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search terms, acronyms, standards or cable grades..."
          />
        </label>
      </section>

      <section className="wm-glossary-toolbar" aria-label="Glossary search and filters">
        <div className="wm-glossary-category-row" aria-label="Glossary categories">
          {["All", ...AV_GLOSSARY_CATEGORIES].map((category) => (
            <button
              key={category}
              type="button"
              className={activeCategory === category ? "is-active" : ""}
              onClick={() => setActiveCategory(category)}
              aria-pressed={activeCategory === category}
            >
              {category}
              <span>{category === "All" ? AV_GLOSSARY_TERMS.length : categoryCounts[category] ?? 0}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="wm-glossary-workspace">
        <aside className="wm-glossary-results" aria-label="Glossary terms">
          <div className="wm-glossary-results-head">
            <p>Terms</p>
            <span>{filteredTerms.length} shown</span>
          </div>

          <div className="wm-glossary-term-list">
            {filteredTerms.map((term) => (
              <button
                key={term.id}
                type="button"
                className={selectedTerm?.id === term.id ? "is-active" : ""}
                onClick={() => setSelectedId(term.id)}
              >
                <span className="wm-glossary-term-meta">{term.category}</span>
                <span className="wm-glossary-term-title">
                  <strong>{term.term}</strong>
                  {term.acronym || term.aliases[0] ? <small>{term.acronym ?? term.aliases[0]}</small> : null}
                </span>
                <span className="wm-glossary-term-summary">{term.plainEnglish}</span>
              </button>
            ))}
          </div>

          {!filteredTerms.length ? (
            <div className="wm-glossary-empty">
              <BookOpen className="h-5 w-5" />
              <p>No glossary match yet.</p>
              <span>Try the connector, acronym, standard, cable grade or format.</span>
            </div>
          ) : null}
        </aside>

        {selectedTerm ? (
          <article className="wm-glossary-detail">
            <header className="wm-glossary-detail-head">
              <div>
                <p>{selectedTerm.category}</p>
                <h2>
                  {selectedTerm.term}
                  {selectedTerm.acronym ? <span>{selectedTerm.acronym}</span> : null}
                </h2>
              </div>
              {selectedTerm.aliases.length ? (
                <div className="wm-glossary-alias-row">
                  <p>Also called</p>
                  <span>{selectedTerm.aliases.join(" · ")}</span>
                </div>
              ) : null}
            </header>

            <div className="wm-glossary-definition-grid">
              <section>
                <BookOpen className="h-4 w-4" />
                <p>Plain meaning</p>
                <strong>{selectedTerm.plainEnglish}</strong>
              </section>
              <section>
                <Sparkles className="h-4 w-4" />
                <p>Typical AV use</p>
                <strong>{selectedTerm.whyItMatters}</strong>
              </section>
            </div>

            {selectedTerm.inReality ? (
              <section className="wm-glossary-reality-panel">
                <div>
                  <Lightbulb className="h-4 w-4" />
                  <p>What it means in practice</p>
                </div>
                <strong>{selectedTerm.inReality}</strong>
              </section>
            ) : null}

            {selectedTerm.reference ? (
              <section className="wm-glossary-reference">
                <h3>{selectedTerm.reference.caption}</h3>
                <div className="wm-glossary-reference-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">{selectedTerm.reference.rowLabel}</th>
                        {selectedTerm.reference.columns.map((column) => (
                          <th key={column} scope="col">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTerm.reference.rows.map((row) => (
                        <tr key={row.label}>
                          <th scope="row">{row.label}</th>
                          {row.cells.map((cell, index) => (
                            <td key={`${row.label}-${selectedTerm.reference?.columns[index] ?? index}`}>
                              {cell}
                              {index === row.cells.length - 1 && row.note ? <small>{row.note}</small> : null}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedTerm.reference.footnote ? <p>{selectedTerm.reference.footnote}</p> : null}
              </section>
            ) : null}

            <section className="wm-glossary-cautions">
              <h3>Limitations and trade-offs</h3>
              <ul>
                {selectedTerm.cautions.map((item) => (
                  <li key={item}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="wm-glossary-related">
              <h3>Related terms</h3>
              <div>
                {selectedTerm.related.map((related) => (
                  <button key={related} type="button" onClick={() => openTerm(related)}>
                    {related}
                  </button>
                ))}
              </div>
            </section>
          </article>
        ) : null}
      </section>
    </main>
  );
}

export default GlossaryPage;
