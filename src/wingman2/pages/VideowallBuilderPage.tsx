import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey, type WingmanRouteKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { RecommendationCard } from "../components/RecommendationCard";
import { SectionCard } from "../components/SectionCard";

const wallTypes = [
  {
    key: "led",
    label: "LED videowall",
    summary: "Use when bezel-free impact, scalable size, and viewing distance flexibility are priority.",
    recommendationTitle: "Premium LED design direction",
    recommendationSku: "VIDEOWALL-LED-CONCEPT",
    confidence: 84,
    rationale: [
      "Strong path for premium large-format presentation impact.",
      "Supports a clearer story around scale, control, and future flexibility.",
      "Best fit when impact and visibility matter more than panel simplicity.",
    ],
    exampleWallSize: "6.0m x 2.0m",
    targetEnvironment: "Corporate foyer / experience area",
    signalPath: "LED controller + distribution + control layer",
    caution: "Confirm service access, viewing distance, and controller architecture before final recommendation.",
  },
  {
    key: "lcd",
    label: "LCD videowall",
    summary: "Use when cost control, indoor clarity, and standard panel structures fit the application.",
    recommendationTitle: "Structured LCD wall path",
    recommendationSku: "VIDEOWALL-LCD-CONCEPT",
    confidence: 79,
    rationale: [
      "Better suited to cost-conscious indoor videowall projects.",
      "Simpler service model where standard display structures are acceptable.",
      "Stronger fit for traditional control-room or signage wall proposals.",
    ],
    exampleWallSize: "3 x 3 55in layout",
    targetEnvironment: "Control room / indoor signage wall",
    signalPath: "Wall processor or matrix + distribution + control layer",
    caution: "Confirm bezel expectations, mounting tolerances, and processor behavior before final recommendation.",
  },
] as const;

const designFactors = [
  "Overall wall width and height",
  "Viewing distance",
  "Pixel pitch or bezel strategy",
  "Content resolution and aspect ratio",
  "Signal distribution and controller path",
  "Mounting, service, and control requirements",
];

type ProgressState = "completed" | "current" | "upcoming";

const builderOutputs: {
  label: string;
  routeKey: WingmanRouteKey;
  state: ProgressState;
}[] = [
  { label: "Create videowall project brief", routeKey: "projects", state: "completed" },
  { label: "Send summary to proposal builder", routeKey: "proposal", state: "current" },
  { label: "Attach recommended signal and control path", routeKey: "compare", state: "upcoming" },
  { label: "Create customer assumptions list", routeKey: "support", state: "upcoming" },
];

function progressClasses(state: ProgressState) {
  switch (state) {
    case "completed":
      return {
        wrapper: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/70",
        icon: "text-emerald-600",
        badge: "bg-emerald-100 text-emerald-700",
        label: "Completed",
      };
    case "current":
      return {
        wrapper: "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100/70",
        icon: "text-amber-600",
        badge: "bg-amber-100 text-amber-700",
        label: "Current",
      };
    default:
      return {
        wrapper: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
        icon: "text-slate-400",
        badge: "bg-slate-200 text-slate-600",
        label: "To do",
      };
  }
}

function progressIcon(state: ProgressState) {
  switch (state) {
    case "completed":
      return <CheckCircle2 className="h-5 w-5" />;
    case "current":
      return <Clock3 className="h-5 w-5" />;
    default:
      return <Circle className="h-5 w-5" />;
  }
}

export function VideowallBuilderPage() {
  const [selectedWallType, setSelectedWallType] = useState<(typeof wallTypes)[number]["key"]>("led");
  const wallType = wallTypes.find((item) => item.key === selectedWallType) ?? wallTypes[0];

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="LED / LCD Videowall Builder"
        title="Shape a videowall concept into a commercially credible design path."
        purpose="This builder helps distributor reps move from a rough videowall requirement into a structured LED or LCD solution with clearer sizing, control, signal, and proposal guidance."
        nextMove="Choose wall type, set the core wall dimensions, then validate resolution, control, and service assumptions before carrying the design into proposal output."
        actions={[
          { label: "Open proposal", to: routeCatalogByKey.proposal.path },
          { label: "Open support", to: routeCatalogByKey.support.path, variant: "secondary" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Videowall configuration"
          subtitle="Use this workspace to compare LED and LCD design logic and frame the right customer conversation."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {wallTypes.map((type) => {
              const isActive = type.key === selectedWallType;
              return (
                <div key={type.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">{type.label}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{type.summary}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedWallType(type.key)}
                    className={`mt-5 rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {isActive ? "Selected path" : "Select path"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Core design inputs</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {designFactors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">Example wall summary</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <p className="text-slate-500">Wall type</p>
                  <p className="font-semibold text-slate-900">{wallType.label}</p>
                </div>
                <div>
                  <p className="text-slate-500">Wall size</p>
                  <p className="font-semibold text-slate-900">{wallType.exampleWallSize}</p>
                </div>
                <div>
                  <p className="text-slate-500">Target environment</p>
                  <p className="font-semibold text-slate-900">{wallType.targetEnvironment}</p>
                </div>
                <div>
                  <p className="text-slate-500">Signal path</p>
                  <p className="font-semibold text-slate-900">{wallType.signalPath}</p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <RecommendationCard
            title={wallType.recommendationTitle}
            sku={wallType.recommendationSku}
            status="recommended"
            confidence={wallType.confidence}
            rationale={wallType.rationale}
            caution={wallType.caution}
            actionTo={routeCatalogByKey.proposal.path}
          />

          <SectionCard
            title="Builder outputs"
            subtitle="Use this progress guide to keep the sales motion structured and route each next action into the right Wingman workspace."
          >
            <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Completed</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Current</span>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-600">To do</span>
            </div>

            <div className="grid gap-3 text-sm">
              {builderOutputs.map((item) => {
                const tone = progressClasses(item.state);
                const destination = routeCatalogByKey[item.routeKey];

                return (
                  <Link
                    key={item.label}
                    to={destination.path}
                    className={`rounded-2xl border px-4 py-4 transition ${tone.wrapper}`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <span className="inline-flex items-center gap-3 font-medium">
                        <span className={tone.icon}>{progressIcon(item.state)}</span>
                        {item.label}
                      </span>

                      <span className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone.badge}`}
                        >
                          {tone.label}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Open {destination.navLabel}
                        </span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
