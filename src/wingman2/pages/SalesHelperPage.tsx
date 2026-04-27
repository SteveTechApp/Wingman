import { useMemo } from "react";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { routeCatalogByKey } from "../app/routeCatalog";
import { getCurrentWorkflowProject, readProjectStore } from "../data/projectStore";
import { buildSalesReadinessPackage } from "../lib/salesReadiness";

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
    text: "Use one business-outcome reason and one operational or deployment reason instead of drowning the customer in specs.",
  },
];

const objectionCards = [
  {
    title: "Budget concern",
    text: "Reframe around deployment efficiency, supportability, and the risk of choosing a weaker fit.",
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
  const projectGuidance = useMemo(() => {
    const project = getCurrentWorkflowProject(readProjectStore());
    const roomModel = project?.discoveryBrief?.roomModel ?? {};
    const discovery = {
      projectTitle: String(roomModel.roomType || project?.name || "Standalone sales conversation"),
      summary: String(project?.discoveryBrief?.inference?.summary || "Use discovery and Finder context to strengthen the sales conversation."),
      roomSize: String(roomModel.roomSize || "Not confirmed"),
      displays: String(roomModel.displayArrangement || "Not confirmed"),
      usb: String(roomModel.usbTransport || "Not confirmed"),
      distance: String(roomModel.longestRun || "Not confirmed"),
      budget: String(roomModel.budgetStyle || "Not confirmed"),
    };
    const assumptions = [
      ...(project?.ingest?.unknowns ?? []),
      ...(project?.compareRuns?.[0]?.warnings ?? []),
    ];

    return buildSalesReadinessPackage({
      products: project?.productSelections ?? [],
      discovery,
      assumptions,
      ingest: project?.ingest,
      compareRun: project?.compareRuns?.[0] ?? null,
    });
  }, []);

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Sales Q&A Positioning Helper"
        title="Help the rep present the right SKU or BOM."
        purpose="This module supports the three Wingman sales motions: competitor replacement, a one-off outcome SKU, or a full room/tender BOM."
        nextMove="Use the positioning cards for the live conversation, then move into Compare, Finder, or Proposal with a clearer SKU or BOM story."
        actions={[
          { label: "Open compare", to: routeCatalogByKey.compare.path },
          { label: "Open finder", to: routeCatalogByKey.finder.path, variant: "secondary" },
        ]}
      />

      <div className="space-y-6">
        <SectionCard
          title="Guided rep mode"
          subtitle="Project-aware prompts for what to ask, what to say, and when to escalate."
        >
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <div className={`rounded-2xl border p-5 ${
              projectGuidance.reviewRequired
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-emerald-200 bg-emerald-50 text-emerald-950"
            }`}>
              <p className="text-sm font-black uppercase tracking-[0.14em]">Readiness</p>
              <p className="mt-3 text-4xl font-black">{projectGuidance.readinessScore}%</p>
              <p className="mt-2 text-sm leading-6">
                {projectGuidance.reviewRequired ? "Use as guided direction, then escalate before customer issue." : "Good enough for proposal drafting after final validation."}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                <p className="font-black text-slate-900">{projectGuidance.outputPurpose.motion}</p>
                <p className="mt-2">{projectGuidance.outputPurpose.customerOutput}</p>
              </div>
              {projectGuidance.repGuidance.slice(0, 3).map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Positioning guidance"
          subtitle="Use these cards to frame the recommendation in a way that is fast, clear, and useful for customer presentation."
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
          subtitle="Use these cards to keep control of common business and technical pushback."
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
