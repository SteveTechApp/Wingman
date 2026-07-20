import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Copy, MessageSquareText, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import {
  AV_GLOSSARY_CATEGORIES,
  AV_GLOSSARY_TERMS,
  type AvGlossaryAudience,
  type AvGlossaryTerm,
} from "../data/avGlossary";

const audienceOptions: Array<{ id: AvGlossaryAudience; label: string; helper: string }> = [
  { id: "endUser", label: "End user", helper: "Outcome-led wording" },
  { id: "partner", label: "Partner / reseller", helper: "Sales and install framing" },
  { id: "consultant", label: "Consultant", helper: "Architecture-led wording" },
];

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function termSearchText(term: AvGlossaryTerm) {
  return normalise(
    [
      term.term,
      term.acronym,
      term.category,
      term.plainEnglish,
      term.whyItMatters,
      ...term.aliases,
      ...term.related,
      ...term.ask,
      ...term.cautions,
      ...Object.values(term.roleLanguage),
    ].filter(Boolean).join(" "),
  );
}

function categoryLabel(category: string) {
  return category === "All" ? "All" : category;
}

export function GlossaryPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeAudience, setActiveAudience] = useState<AvGlossaryAudience>("endUser");
  const [selectedId, setSelectedId] = useState(AV_GLOSSARY_TERMS[0]?.id ?? "");
  const [copyStatus, setCopyStatus] = useState("");

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
  const activeAudienceLabel = audienceOptions.find((option) => option.id === activeAudience)?.label ?? "End user";
  const selectedPhrase = selectedTerm?.roleLanguage[activeAudience] ?? "";
  const categoryCounts = useMemo(() => {
    return AV_GLOSSARY_TERMS.reduce<Record<string, number>>((counts, term) => {
      counts[term.category] = (counts[term.category] ?? 0) + 1;
      return counts;
    }, {});
  }, []);

  async function copySelectedPhrase() {
    if (!selectedPhrase) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedPhrase);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = selectedPhrase;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.top = "-1000px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyStatus("Copied customer-safe wording.");
      window.setTimeout(() => setCopyStatus(""), 1800);
    } catch {
      setCopyStatus("Copy unavailable in this browser.");
    }
  }

  return (
    <main className="wm-glossary-page">
      <PageHero
        eyebrow="AV Glossary"
        title="Look up terms, acronyms and AV technologies fast."
        purpose="Use the glossary during discovery, product selection or proposal work when a term needs quick sales-safe explanation."
        nextMove="Search the acronym, choose the audience role, then use the plain-language wording to keep the customer conversation moving."
        actions={[
          { label: "Browse Catalogue", to: routeCatalogByKey.catalogBrowser.path, variant: "primary" },
          { label: "Open Sales Strategy", to: routeCatalogByKey.salesHelper.path, variant: "secondary" },
        ]}
      />

      <section className="wm-glossary-toolbar" aria-label="Glossary search and filters">
        <label className="wm-glossary-search">
          <Search className="h-4 w-4" />
          <span>Search glossary</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search HDMI, EDID, AVoIP, USB-C, Dante..."
          />
        </label>

        <div className="wm-glossary-audience" aria-label="Audience wording" role="group">
          {audienceOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={activeAudience === option.id ? "is-active" : ""}
              onClick={() => setActiveAudience(option.id)}
              aria-pressed={activeAudience === option.id}
            >
              <strong>{option.label}</strong>
              <span>{option.helper}</span>
            </button>
          ))}
        </div>

        <div className="wm-glossary-category-row" aria-label="Glossary categories">
          {["All", ...AV_GLOSSARY_CATEGORIES].map((category) => (
            <button
              key={category}
              type="button"
              className={activeCategory === category ? "is-active" : ""}
              onClick={() => setActiveCategory(category)}
              aria-pressed={activeCategory === category}
            >
              {categoryLabel(category)}
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
                <span>{term.category}</span>
                <strong>{term.term}</strong>
                {term.acronym ? <small>{term.acronym}</small> : null}
              </button>
            ))}
          </div>

          {!filteredTerms.length ? (
            <div className="wm-glossary-empty">
              <BookOpen className="h-5 w-5" />
              <p>No glossary match yet.</p>
              <span>Try the connector, acronym, product family or customer problem.</span>
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
              <div className="wm-glossary-detail-actions">
                <button type="button" onClick={copySelectedPhrase}>
                  <Copy className="h-4 w-4" />
                  <span>Copy wording</span>
                </button>
                <Link to={routeCatalogByKey.salesHelper.path}>Use in call</Link>
              </div>
            </header>

            <div className="wm-glossary-definition-grid">
              <section>
                <BookOpen className="h-4 w-4" />
                <p>Plain meaning</p>
                <strong>{selectedTerm.plainEnglish}</strong>
              </section>
              <section>
                <Sparkles className="h-4 w-4" />
                <p>Why sales should care</p>
                <strong>{selectedTerm.whyItMatters}</strong>
              </section>
            </div>

            <section className="wm-glossary-say-panel">
              <div>
                <MessageSquareText className="h-4 w-4" />
                <p>Say it to a {activeAudienceLabel}</p>
              </div>
              <strong>{selectedPhrase}</strong>
              {copyStatus ? <span role="status">{copyStatus}</span> : null}
            </section>

            <div className="wm-glossary-two-column">
              <section>
                <h3>Ask next</h3>
                <ul>
                  {selectedTerm.ask.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3>Watch out</h3>
                <ul>
                  {selectedTerm.cautions.map((item) => (
                    <li key={item}>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="wm-glossary-related">
              <h3>Related terms</h3>
              <div>
                {selectedTerm.related.map((related) => (
                  <button
                    key={related}
                    type="button"
                    onClick={() => {
                      setQuery(related);
                      setActiveCategory("All");
                    }}
                  >
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
