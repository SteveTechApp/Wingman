import { useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
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
    rationale: [
      "Strong path for premium large-format presentation impact.",
      "Supports a clearer story around scale, control, and future flexibility.",
      "Best fit when impact and visibility matter more than panel simplicity.",
    ],
  },
  {
    key: "lcd",
    label: "LCD videowall",
    summary: "Use when cost control, indoor clarity, and standard panel structures fit the application.",
    recommendationTitle: "Structured LCD wall path",
    recommendationSku: "VIDEOWALL-LCD-CONCEPT",
    rationale: [
      "Better suited to cost-conscious indoor videowall projects.",
      "Simpler service model where standard display structures are acceptable.",
      "Stronger fit for traditional control-room or signage wall proposals.",
    ],
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
                  <p className="font-semibold text-slate-900">6.0m x 2.0m</p>
                </div>
                <div>
                  <p className="text-slate-500">Target environment</p>
                  <p className="font-semibold text-slate-900">Corporate foyer / experience area</p>
                </div>
                <div>
                  <p className="text-slate-500">Signal path</p>
                  <p className="font-semibold text-slate-900">Controller + distribution + control layer</p>
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
            confidence={84}
            rationale={wallType.rationale}
            caution="Confirm service access, viewing distance, and controller architecture before final recommendation."
            actionTo={routeCatalogByKey.proposal.path}
          />

          <SectionCard
            title="Builder outputs"
            subtitle="Use these outputs to keep the sales motion structured."
          >
            <div className="grid gap-3 text-sm">
              <Link
                to={routeCatalogByKey.projects.path}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-700 transition hover:border-slate-300"
              >
                Create videowall project brief
              </Link>
              <Link
                to={routeCatalogByKey.proposal.path}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-700 transition hover:border-slate-300"
              >
                Send summary to proposal builder
              </Link>
              <Link
                to={routeCatalogByKey.compare.path}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-700 transition hover:border-slate-300"
              >
                Attach recommended signal and control path
              </Link>
              <Link
                to={routeCatalogByKey.support.path}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-700 transition hover:border-slate-300"
              >
                Create customer assumptions list
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
