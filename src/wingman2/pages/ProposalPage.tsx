import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

export function ProposalPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Proposal Builder"
        title="Turn internal solution logic into a customer-ready story."
        purpose="This page is where recommendation quality becomes presentation quality, packaging discovery, matching, comparison, and room logic into an output a distributor rep can use with confidence."
        nextMove="Review the proposal sections, tighten the assumptions, and finalize the output for customer presentation or internal approval."
        actions={[
          { label: "Open support", to: routeCatalogByKey.support.path },
          { label: "Back to projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Proposal preview"
        subtitle="Use polished sectioning, large headings, room visuals, recommendation logic, assumptions, and next steps."
        rightSlot={
          <div className="flex gap-3">
            <Link
              to={routeCatalogByKey.support.path}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Request review
            </Link>
            <Link
              to={routeCatalogByKey.projects.path}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Return to project
            </Link>
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Sections</p>
            <div className="mt-4 space-y-2 text-sm">
              {[
                "Cover",
                "Executive Summary",
                "Discovered Requirements",
                "Recommended Solution",
                "Competitor Replacement",
                "Room Diagram",
                "Assumptions",
                "Contact",
              ].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-2xl px-4 py-3 ${
                    index === 0
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-950 px-8 py-10 text-white">
              <p className="wingman-kicker text-slate-400">WyreStorm Wingman proposal</p>
              <h2 className="wingman-display mt-3 text-5xl">Meeting Room AV Solution</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                A distributor-ready recommendation built from discovery, product matching, and competitor review.
              </p>
            </div>
            <div className="grid gap-6 p-8 lg:grid-cols-2">
              <div>
                <p className="wingman-kicker">Executive summary</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  This recommendation prioritizes fast deployment, simple user experience, and a clear path to future room expansion.
                </p>
              </div>
              <div>
                <p className="wingman-kicker">Recommended core products</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  SW-640L-TX-W, matched receiver path, and accessory bundle for connectivity and control.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
