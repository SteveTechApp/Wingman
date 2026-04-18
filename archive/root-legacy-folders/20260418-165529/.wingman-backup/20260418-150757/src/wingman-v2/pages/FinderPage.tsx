import { PageHero } from "../components/PageHero";
import { RecommendationCard } from "../components/RecommendationCard";
import { SectionCard } from "../components/SectionCard";
import { StatusChip } from "../components/StatusChip";

const products = [
  { sku: "SW-640L-TX-W", title: "4x1 Presentation Switcher", status: "recommended" as const },
  { sku: "SW-510W-TX", title: "Wireless / wired collaboration TX", status: "alternative" as const },
  { sku: "MX-0402-MST", title: "Matrix option for expanded routing", status: "caution" as const },
];

export function FinderPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Product Finder"
        title="Match the requirement to the right WyreStorm direction."
        purpose="This page narrows discovery into a commercially useful shortlist, making the recommendation logic clear enough for a sales rep to explain with confidence."
        nextMove="Review the best match, validate any cautions, then add the preferred path to Competitor Compare or Proposal Builder."
      />

      <SectionCard
        title="Finder workspace"
        subtitle="Filters on the left, best-match logic in the center, recommendation narrative on the right."
      >
        <div className="grid gap-6 xl:grid-cols-[250px_1fr_360px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Filters</p>
            <div className="mt-4 space-y-4 text-sm">
              {[
                "Application: Meeting room",
                "Inputs: 2",
                "Display outputs: 1",
                "USB-C: Required",
                "Cable type: HDMI + USB-C",
                "Control: Basic room control",
              ].map((line) => (
                <div key={line} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-700">
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.sku} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{product.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{product.sku}</p>
                  </div>
                  <StatusChip
                    label={
                      product.status === "recommended"
                        ? "Recommended"
                        : product.status === "alternative"
                        ? "Alternative"
                        : "Caution"
                    }
                    variant={product.status}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {["Meeting room", "USB-C", "4K", "Presentation switch"].map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-sm text-slate-700">
                  Strong fit for small meeting environments that need simple source selection, familiar cabling, and fast rep-friendly positioning.
                </p>
              </div>
            ))}
          </div>

          <RecommendationCard
            title="Best Match"
            sku="SW-640L-TX-W"
            status="recommended"
            confidence={89}
            rationale={[
              "Matches the requested room size and source count.",
              "Supports a strong 'simple but capable' distributor sales story.",
              "Easy path into proposal builder and room template bundle.",
            ]}
            caution="Validate whether a receiver and accessory set should be included as standard."
          />
        </div>
      </SectionCard>
    </div>
  );
}