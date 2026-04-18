import { Link } from "react-router-dom";
import { routeCatalogByKey, type WingmanRouteKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

const callCards: {
  title: string;
  ask: string;
  position: string;
  watch: string;
  routeKey: WingmanRouteKey;
}[] = [
  {
    title: "Discovery call card",
    ask: "What does the room need to do that it cannot do today?",
    position: "Use this to move from vague problem statement into application-driven discovery.",
    watch: "Do not jump to SKU discussion before clarifying sources, displays, control, and cable constraints.",
    routeKey: "discovery",
  },
  {
    title: "Competitor replacement card",
    ask: "Is the customer committed to the competitor model, or just using it as a familiar reference?",
    position: "Use this to open the door to a WyreStorm equivalent without sounding defensive.",
    watch: "Be explicit when the match is partial or when accessory assumptions still exist.",
    routeKey: "compare",
  },
  {
    title: "Videowall opportunity card",
    ask: "Is the priority impact, resolution, maintenance, or budget control?",
    position: "Use this to steer the customer toward LED or LCD logic before the conversation gets lost in display detail.",
    watch: "Wall size, viewing distance, and service access are easy to under-qualify.",
    routeKey: "videowall",
  },
  {
    title: "Proposal closing card",
    ask: "What would the customer need to see before they are comfortable moving to the next stage?",
    position: "Use this to frame the proposal as the next logical decision tool rather than a passive document.",
    watch: "Unclear assumptions weaken proposal confidence fast.",
    routeKey: "proposal",
  },
];

export function CallCardsPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Sales Call Helper Cards"
        title="Keep the conversation moving with structured call prompts."
        purpose="These cards are built to support inexperienced sales users in live conversations by giving them simple prompts for what to ask, how to position, and what risk to watch next."
        nextMove="Use the most relevant card during the conversation, then push the outcome into Discovery, Compare, Videowall Builder, or Proposal Builder."
        actions={[
          { label: "Open discovery", to: routeCatalogByKey.discovery.path },
          { label: "Open compare", to: routeCatalogByKey.compare.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Call card library"
        subtitle="These cards should eventually be filtered by application, workflow stage, competitor, and opportunity type."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {callCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">{card.title}</h3>

              <div className="mt-5 space-y-4 text-sm leading-6">
                <div>
                  <p className="wingman-kicker">Ask this next</p>
                  <p className="mt-2 text-slate-700">{card.ask}</p>
                </div>

                <div>
                  <p className="wingman-kicker">Position it like this</p>
                  <p className="mt-2 text-slate-700">{card.position}</p>
                </div>

                <div>
                  <p className="wingman-kicker">Watch for risk</p>
                  <p className="mt-2 text-slate-700">{card.watch}</p>
                </div>
              </div>

              <Link
                to={routeCatalogByKey[card.routeKey].path}
                className="mt-5 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Open {routeCatalogByKey[card.routeKey].label}
              </Link>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
