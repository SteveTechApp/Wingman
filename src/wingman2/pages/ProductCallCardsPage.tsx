import { useMemo, useState } from "react";
import {
  DATA_CONFIDENCE_LABELS,
  WINGMAN_AUDIENCES,
  WINGMAN_CALL_MODES,
  type WingmanAudience,
  type WingmanCallMode,
  type ProductPositioningCard,
} from "../types/productPositioning";
import { PRODUCT_POSITIONING_CARDS, searchProductPositioningCards } from "../data/productPositioningCards";

type ListBlockProps = {
  title: string;
  items: string[];
};

function ListBlock({ title, items }: ListBlockProps) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">{title}</h3>
      <ul className="space-y-2 text-sm text-slate-100">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
function TextPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">{title}</h3>
      <div className="text-sm leading-6 text-slate-100">{children}</div>
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copyText}
      className="rounded-full border border-cyan-300/50 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10"
    >
      {copied ? "Copied" : "Copy follow-up wording"}
    </button>
  );
}

function ProductSelector({
  cards,
  selectedSku,
  onSelect,
}: {
  cards: ProductPositioningCard[];
  selectedSku: string;
  onSelect: (sku: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const selected = card.sku === selectedSku;
        return (
          <button
            key={card.sku}
            type="button"
            onClick={() => onSelect(card.sku)}
            className={[
              "rounded-2xl border p-4 text-left transition",
              selected
                ? "border-cyan-300 bg-cyan-300/10 shadow-[0_0_30px_rgba(34,211,238,0.12)]"
                : "border-slate-700/70 bg-slate-950/45 hover:border-cyan-300/70 hover:bg-slate-900/80",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-white">{card.sku}</p>
                <p className="mt-1 text-sm text-slate-300">{card.productName}</p>
              </div>
              <span className="rounded-full border border-cyan-300/40 px-2 py-1 text-xs font-semibold text-cyan-100">
                {DATA_CONFIDENCE_LABELS[card.dataConfidence]}
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">{card.productFamily}</p>
          </button>
        );
      })}
    </div>
  );
}

function CallCardActions({ card }: { card: ProductPositioningCard }) {
  const encodedSku = encodeURIComponent(card.sku);

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={`/wingman/product-pitch?sku=${encodedSku}`}
        className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
      >
        Open Product Pitch
      </a>
      <a
        href={`/wingman/compare?wyrestormSku=${encodedSku}`}
        className="rounded-full border border-cyan-300/50 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10"
      >
        Compare competitor
      </a>
      <a
        href={`/wingman/proposal?sku=${encodedSku}`}
        className="rounded-full border border-cyan-300/50 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10"
      >
        Create response pack
      </a>
    </div>
  );
}

export default function ProductCallCardsPage() {
  const [query, setQuery] = useState("");
  const [selectedSku, setSelectedSku] = useState("");
  const [audience, setAudience] = useState<WingmanAudience>("DISTRIBUTOR");
  const [callMode, setCallMode] = useState<WingmanCallMode>("INBOUND_SUPPORT");

  const filteredCards = useMemo(() => searchProductPositioningCards(query), [query]);

  const selectedCard = useMemo(() => {
    if (!selectedSku) {
      return undefined;
    }

    return PRODUCT_POSITIONING_CARDS.find((card) => card.sku === selectedSku);
  }, [selectedSku]);

  const audienceNote = selectedCard?.audienceNotes[audience] ?? "No audience-specific note has been added yet.";
  const callModeNote = selectedCard?.callModeNotes[callMode] ?? "No call-mode-specific note has been added yet.";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-cyan-300/20 bg-slate-900/80 p-5 shadow-[0_0_50px_rgba(8,145,178,0.12)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">Wingman sales intelligence</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Product Call Cards</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
                Select a WyreStorm SKU first. Wingman then loads the relevant positioning, questions, objections, attach products and follow-up wording for that product.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-200">
                Audience
                <select
                  value={audience}
                  onChange={(event) => setAudience(event.target.value as WingmanAudience)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  {WINGMAN_AUDIENCES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-200">
                Call mode
                <select
                  value={callMode}
                  onChange={(event) => setCallMode(event.target.value as WingmanCallMode)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  {WINGMAN_CALL_MODES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="flex-1 text-sm font-semibold text-cyan-100">
              Search by SKU, application, product family, trigger phrase or competitor category
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedSku("");
                }}
                placeholder="Try NHD-0401-MV, multiview, sports bar, wireless presentation, education..."
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white placeholder:text-slate-500"
              />
            </label>

            {selectedCard ? (
              <button
                type="button"
                onClick={() => setSelectedSku("")}
                className="rounded-full border border-cyan-300/50 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10"
              >
                Change product
              </button>
            ) : null}
          </div>

          <div className="mt-4">
            <ProductSelector cards={filteredCards} selectedSku={selectedSku} onSelect={setSelectedSku} />
          </div>
        </section>

        {!selectedCard ? (
          <section className="rounded-3xl border border-cyan-300/20 bg-slate-900/80 p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">Select a product</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Choose a SKU to load the call card</h2>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-slate-200">
              This keeps the page focused. The detailed positioning, call prompts, objections, disqualifiers, attach products and follow-up wording will only appear after a product is selected.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-3xl border border-cyan-300/20 bg-slate-900/80 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">{selectedCard.productFamily}</p>
                    <h2 className="mt-2 text-3xl font-bold text-white">{selectedCard.sku}</h2>
                    <p className="mt-1 text-lg text-slate-200">{selectedCard.productName}</p>
                    <p className="mt-3 max-w-3xl text-base leading-7 text-slate-100">{selectedCard.salientPoint}</p>
                  </div>
                  <span className="rounded-full border border-cyan-300/40 px-3 py-2 text-sm font-semibold text-cyan-100">
                    {DATA_CONFIDENCE_LABELS[selectedCard.dataConfidence]}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <TextPanel title="One-line positioning">
                    {selectedCard.oneLinePositioning}
                  </TextPanel>
                  <TextPanel title="One-minute brief">
                    {selectedCard.oneMinuteBrief}
                  </TextPanel>
                  <TextPanel title="Audience note">
                    {audienceNote}
                  </TextPanel>
                  <TextPanel title="Call-mode guidance">
                    {callModeNote}
                  </TextPanel>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <ListBlock title="First questions to ask" items={selectedCard.openingQuestions} />
                  <ListBlock title="Listen-for triggers" items={selectedCard.listenForTriggers} />
                  <ListBlock title="Qualification questions" items={selectedCard.qualificationQuestions} />
                  <ListBlock title="Technical checks" items={selectedCard.technicalCheckQuestions} />
                </div>

                <div className="mt-5">
                  <CallCardActions card={selectedCard} />
                </div>
              </article>

              <aside className="flex flex-col gap-5">
                <ListBlock title="Best-fit applications" items={selectedCard.bestFitApplications} />
                <ListBlock title="Weak-fit applications" items={selectedCard.weakFitApplications} />
                <ListBlock title="Red flags / disqualifiers" items={selectedCard.disqualifiers} />
                <ListBlock title="Review gates" items={selectedCard.reviewGates} />
              </aside>
            </section>

            <section className="grid gap-5 xl:grid-cols-3">
              <TextPanel title="Attach products">
                <div className="space-y-3">
                  {selectedCard.attachProducts.map((item) => (
                    <div key={(item.sku ?? item.productFamily) + "-" + item.reason} className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
                      <p className="font-semibold text-white">{item.sku ?? item.productFamily}</p>
                      <p className="mt-1 text-slate-200">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </TextPanel>

              <TextPanel title="Objection handling">
                <div className="space-y-3">
                  {selectedCard.objectionHandling.map((item) => (
                    <div key={item.objection} className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
                      <p className="font-semibold text-white">{item.objection}</p>
                      <p className="mt-1 text-slate-200">{item.response}</p>
                    </div>
                  ))}
                </div>
              </TextPanel>

              <TextPanel title="Competitor angle">
                <div className="space-y-3">
                  {selectedCard.competitorAngles.map((item) => (
                    <div key={(item.competitorCategory ?? item.competitorBrand ?? "competitor") + "-" + item.positioningNote} className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
                      <p className="font-semibold text-white">{item.competitorBrand ?? item.competitorCategory ?? "Competitor category"}</p>
                      <p className="mt-1 text-slate-200">{item.positioningNote}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-cyan-200">Search terms</p>
                      <p className="mt-1 text-slate-300">{item.compareSearchTerms.join(", ")}</p>
                    </div>
                  ))}
                </div>
              </TextPanel>
            </section>

            <section className="rounded-3xl border border-cyan-300/20 bg-slate-900/80 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Copyable follow-up wording</p>
                  <p className="mt-3 max-w-5xl text-base leading-7 text-slate-100">{selectedCard.followUpWording}</p>
                </div>
                <div className="shrink-0">
                  <CopyButton text={selectedCard.followUpWording} />
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
