import { PageHero } from "../components/PageHero";
import { ComparisonMatrix } from "../components/ComparisonMatrix";
import { RecommendationCard } from "../components/RecommendationCard";
import { SectionCard } from "../components/SectionCard";
import type { CompareRow } from "../types";

const rows: CompareRow[] = [
  { label: "HDMI inputs", competitor: "4", wyrestorm: "4", verdict: "Match" },
  { label: "USB-C connectivity", competitor: "Optional", wyrestorm: "Native", verdict: "Better" },
  { label: "Auto switching", competitor: "Yes", wyrestorm: "Yes", verdict: "Match" },
  { label: "Control integration", competitor: "Basic", wyrestorm: "Expanded", verdict: "Better" },
  { label: "USB routing clarity", competitor: "Unknown", wyrestorm: "Verify by topology", verdict: "Verify" },
];

export function ComparePage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Competitor Comparison"
        title="Replace competitor SKUs with a clear, defensible WyreStorm answer."
        purpose="This is the page that helps distributor reps sound technically solid in live conversations by showing the equivalent, the differentiation, and the cautions without ambiguity."
        nextMove="Run the comparison, confirm any partial-match areas, then carry the preferred replacement into the proposal or room solution flow."
      />

      <SectionCard
        title="Competitor replacement workspace"
        subtitle="This page should carry the strongest commercial and technical confidence in the whole application."
        rightSlot={
          <div className="flex gap-3">
            <button className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700">Compare another SKU</button>
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">Add matched solution</button>
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[1.25fr_360px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input
                  readOnly
                  value="Competitor SKU: DM-PSU-441"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                />
                <input
                  readOnly
                  value="WyreStorm equivalent: SW-640L-TX-W"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                />
                <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white">Run compare</button>
              </div>
            </div>

            <ComparisonMatrix
              title="Side-by-side equivalent review"
              competitorSku="DM-PSU-441"
              wyrestormSku="SW-640L-TX-W"
              rows={rows}
            />

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Clear differentiation", "Highlight commercial and technical wins without overselling."],
                ["Visual confidence", "Use confidence, compatibility, and caution states consistently."],
                ["Next-best actions", "Send the user directly to proposal, accessories, or room templates."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <RecommendationCard
              title="Equivalent recommendation"
              sku="SW-640L-TX-W"
              status="recommended"
              confidence={91}
              rationale={[
                "Commercially credible one-screen equivalent view.",
                "Clearer USB-C story for distributor conversations.",
                "Fast progression into proposal and room solution flows.",
              ]}
              caution="USB routing should be confirmed when customer peripherals are already specified."
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Positioning notes</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>Lead with source flexibility and ease of deployment.</li>
                <li>Use control and accessory path as differentiation.</li>
                <li>Be explicit where the match is partial rather than direct.</li>
              </ul>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
