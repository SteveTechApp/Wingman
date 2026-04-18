import { FileUp, LayoutTemplate, Scale, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { RecommendationCard } from "../components/RecommendationCard";
import { SectionCard } from "../components/SectionCard";

const quickActions = [
  { label: "Start Discovery", icon: Search, to: routeCatalogByKey.discovery.path },
  { label: "Compare Competitor SKU", icon: Scale, to: routeCatalogByKey.compare.path },
  { label: "Browse Room Templates", icon: LayoutTemplate, to: routeCatalogByKey.templates.path },
  { label: "Upload Customer Files", icon: FileUp, to: routeCatalogByKey.ingest.path },
];

const statCards = [
  {
    label: "Active projects",
    value: "14",
    href: routeCatalogByKey.projects.path,
    helper: "Open project management",
  },
  {
    label: "Proposal-ready drafts",
    value: "6",
    href: routeCatalogByKey.proposal.path,
    helper: "Open proposal builder",
  },
  {
    label: "High-confidence matches",
    value: "82%",
    href: routeCatalogByKey.compare.path,
    helper: "Open competitor compare",
  },
];

export function DashboardPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Dashboard"
        title="Start from the sales motion, not the product list."
        purpose="This workspace is the fast-control center for distributor reps who need to qualify demand, position WyreStorm clearly, and move toward a recommendation without hesitation."
        nextMove="Choose the workflow that matches the conversation: Discovery, Competitor Compare, Room Templates, or Upload Customer Files."
        actions={[
          { label: "Open projects", to: routeCatalogByKey.projects.path },
          { label: "Open support", to: routeCatalogByKey.support.path, variant: "secondary" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <SectionCard
          title="Quick-start actions"
          subtitle="Start from problem type rather than product taxonomy."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {quickActions.map(({ label, icon: Icon, to }) => (
              <Link
                key={label}
                to={to}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-left transition hover:border-slate-300 hover:bg-white"
              >
                <div>
                  <p className="text-base font-semibold text-slate-900">{label}</p>
                  <p className="mt-1 text-sm text-slate-500">Guided flow with next-best actions</p>
                </div>
                <Icon className="h-5 w-5 text-slate-500" />
              </Link>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {statCards.map((card) => (
              <Link
                key={card.label}
                to={card.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-orange-300 hover:shadow-[0_10px_30px_rgba(251,146,60,0.12)]"
              >
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-orange-600 opacity-0 transition group-hover:opacity-100">
                  {card.helper}
                </p>
              </Link>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <RecommendationCard
            title="Recommended replacement path"
            sku="SW-640L-TX-W / SW-640L-RX-W"
            status="recommended"
            confidence={92}
            rationale={[
              "Aligns with small-to-medium meeting room switching needs.",
              "Strong fit for HDMI plus USB-C source flexibility.",
              "Clear sales story versus competitor classroom matrix bundles.",
            ]}
            caution="Confirm USB host and device topology before finalizing the proposal."
            actionTo={routeCatalogByKey.proposal.path}
          />

          <div className="rounded-3xl wingman-panel p-6">
            <p className="wingman-kicker">Recent insight</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Competitor compare is the hero workflow.</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Surface clear differentiation, confidence scores, and next-best actions so distributor reps can move quickly in live conversations.
            </p>
            <Link
              to={routeCatalogByKey.compare.path}
              className="mt-5 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Open competitor compare
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
