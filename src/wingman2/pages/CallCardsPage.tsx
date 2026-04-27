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

export function escapeStarterSvgText(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function starterCardScene(title: string): string {
  const value = String(title || "").toLowerCase();

  if (/(meeting|board|conference|huddle|room)/.test(value)) return "meeting";
  if (/(class|education|lecture|training)/.test(value)) return "classroom";
  if (/(video wall|videowall|led|signage|display wall)/.test(value)) return "videowall";
  if (/(matrix|switch|routing|distribution)/.test(value)) return "matrix";
  if (/(usb|byod|byom|uc|laptop)/.test(value)) return "usb";
  if (/(extender|transport|hdbaset|fibre|fiber|distance)/.test(value)) return "transport";

  return "generic";
}

function starterCardVisual(title: string): string {
  const label = String(title || "Call Card").trim() || "Call Card";
  const scene = starterCardScene(label);

  const sceneMarkup: Record<string, string> = {
    meeting: `
      <rect x="36" y="26" width="128" height="74" rx="10" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" />
      <rect x="54" y="42" width="92" height="40" rx="6" fill="rgba(255,255,255,0.10)" />
      <rect x="72" y="104" width="56" height="8" rx="4" fill="rgba(255,255,255,0.32)" />
      <circle cx="62" cy="126" r="10" fill="rgba(255,255,255,0.18)" />
      <circle cx="138" cy="126" r="10" fill="rgba(255,255,255,0.18)" />
      <rect x="76" y="118" width="48" height="16" rx="8" fill="rgba(255,255,255,0.16)" />
    `,
    classroom: `
      <rect x="34" y="24" width="132" height="68" rx="10" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" />
      <rect x="48" y="38" width="104" height="40" rx="5" fill="rgba(255,255,255,0.08)" />
      <rect x="44" y="106" width="34" height="18" rx="6" fill="rgba(255,255,255,0.16)" />
      <rect x="84" y="106" width="34" height="18" rx="6" fill="rgba(255,255,255,0.16)" />
      <rect x="124" y="106" width="34" height="18" rx="6" fill="rgba(255,255,255,0.16)" />
    `,
    videowall: `
      <rect x="36" y="22" width="128" height="96" rx="12" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.28)" />
      <path d="M100 22v96M36 70h128" stroke="rgba(255,255,255,0.22)" />
      <rect x="48" y="34" width="40" height="24" rx="4" fill="rgba(255,255,255,0.08)" />
      <rect x="112" y="82" width="40" height="24" rx="4" fill="rgba(255,255,255,0.08)" />
    `,
    matrix: `
      <circle cx="48" cy="42" r="8" fill="rgba(255,255,255,0.22)" />
      <circle cx="48" cy="74" r="8" fill="rgba(255,255,255,0.22)" />
      <circle cx="48" cy="106" r="8" fill="rgba(255,255,255,0.22)" />
      <circle cx="152" cy="42" r="8" fill="rgba(255,255,255,0.22)" />
      <circle cx="152" cy="74" r="8" fill="rgba(255,255,255,0.22)" />
      <circle cx="152" cy="106" r="8" fill="rgba(255,255,255,0.22)" />
      <rect x="84" y="34" width="32" height="80" rx="10" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.24)" />
      <path d="M56 42h28M56 74h28M56 106h28M116 42h28M116 74h28M116 106h28" stroke="rgba(255,255,255,0.24)" />
    `,
    usb: `
      <rect x="38" y="34" width="68" height="48" rx="8" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.28)" />
      <rect x="112" y="48" width="36" height="20" rx="6" fill="rgba(255,255,255,0.18)" />
      <path d="M106 58h12" stroke="rgba(255,255,255,0.28)" />
      <path d="M148 58c18 0 18 26 0 26H88" stroke="rgba(255,255,255,0.22)" fill="none" />
      <rect x="76" y="102" width="44" height="16" rx="8" fill="rgba(255,255,255,0.16)" />
    `,
    transport: `
      <rect x="36" y="52" width="34" height="34" rx="8" fill="rgba(255,255,255,0.16)" />
      <rect x="130" y="52" width="34" height="34" rx="8" fill="rgba(255,255,255,0.16)" />
      <path d="M70 68h60" stroke="rgba(255,255,255,0.30)" stroke-width="8" stroke-linecap="round" />
      <circle cx="100" cy="68" r="10" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.26)" />
      <path d="M100 78v24" stroke="rgba(255,255,255,0.22)" stroke-width="6" stroke-linecap="round" />
    `,
    generic: `
      <rect x="34" y="26" width="132" height="82" rx="12" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.26)" />
      <rect x="52" y="44" width="96" height="12" rx="6" fill="rgba(255,255,255,0.16)" />
      <rect x="52" y="64" width="72" height="12" rx="6" fill="rgba(255,255,255,0.12)" />
      <rect x="52" y="84" width="84" height="12" rx="6" fill="rgba(255,255,255,0.10)" />
    `,
  };

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="405" viewBox="0 0 200 150">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#122033" />
          <stop offset="55%" stop-color="#1c3558" />
          <stop offset="100%" stop-color="#365b8b" />
        </linearGradient>
        <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="rgba(255,255,255,0.04)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.18)" />
        </linearGradient>
      </defs>
      <rect width="200" height="150" rx="18" fill="url(#bg)" />
      <circle cx="168" cy="24" r="28" fill="rgba(255,255,255,0.08)" />
      <circle cx="30" cy="126" r="34" fill="rgba(255,255,255,0.05)" />
      ${sceneMarkup[scene] || sceneMarkup.generic}
      <rect x="16" y="118" width="168" height="18" rx="9" fill="url(#glow)" />
      <text x="24" y="131" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="700" fill="rgba(255,255,255,0.92)">
        ${escapeStarterSvgText(label.slice(0, 34))}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

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

export default CallCardsPage;
