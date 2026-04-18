import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { routeCatalogByKey } from "../app/routeCatalog";

const positioningCards = [
  {
    title: "How to position the recommendation",
    text: "Lead with user simplicity first, then explain the technical strength that makes the design credible.",
  },
  {
    title: "How to handle uncertainty",
    text: "Be explicit where the answer is partial. Confidence rises when the rep shows what still needs confirmation.",
  },
  {
    title: "How to differentiate from competitors",
    text: "Use one commercial reason and one operational or deployment reason instead of drowning the customer in specs.",
  },
];

const objectionCards = [
  {
    title: "Price pressure",
    text: "Reframe around deployment efficiency, supportability, and the cost of choosing a weaker fit.",
  },
  {
    title: "Customer already requested competitor brand",
    text: "Acknowledge the request, then show the closest equivalent and where WyreStorm improves the use case.",
  },
  {
    title: "Technical hesitation from the rep",
    text: "Use Guru prompts and structured helper cards to keep the conversation moving until deeper technical review is needed.",
  },
];

export function SalesHelperPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Sales Q&A Positioning Helper"
        title="Give the rep a better answer before the customer hears the wrong one."
        purpose="This module turns product information into sales language by helping less experienced distributor reps ask better questions, position more cleanly, and handle common objections with confidence."
        nextMove="Use the positioning cards for the live conversation, then move into Compare, Finder, or Proposal with a clearer commercial story."
        actions={[
          { label: "Open compare", to: routeCatalogByKey.compare.path },
          { label: "Open finder", to: routeCatalogByKey.finder.path, variant: "secondary" },
        ]}
      />

      <div className="space-y-6">
        <SectionCard
          title="Positioning guidance"
          subtitle="Use these cards to frame the recommendation in a way that is fast, clear, and commercially useful."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {positioningCards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Objection handling"
          subtitle="Use these cards to keep control of common commercial and technical pushback."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {objectionCards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Suggested live prompts"
          subtitle="These are the kinds of prompts Wingman should eventually generate dynamically from project context."
        >
          <div className="grid gap-3 text-sm">
            {[
              "What is the customer really trying to make simpler for the end user?",
              "Which current requirement matters most: source flexibility, distance, control, or future expansion?",
              "Is the competitor SKU being used as a specification anchor or just a reference point?",
              "What still needs confirming before the recommendation is safe to present as final?",
            ].map((prompt) => (
              <div key={prompt} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-700">
                {prompt}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
