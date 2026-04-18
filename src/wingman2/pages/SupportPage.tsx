import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { featureAudit } from "../content/featureAudit";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

export function SupportPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Support / Escalation"
        title="Create a clean handoff when confidence drops."
        purpose="This page exists to stop uncertainty becoming risk by giving users a clear route to technical review, escalation, or branded follow-through when the answer is not yet safe enough."
        nextMove="Use escalation when the match is partial, the topology is unclear, or the proposal needs a second-pass technical review."
        actions={[
          { label: "Open proposal", to: routeCatalogByKey.proposal.path },
          { label: "Open projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
        ]}
      />

      <div className="space-y-6">
        <SectionCard
          title="Support actions"
          subtitle="Use this area for contact details, escalation requests, and proposal footer details."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Escalate to pre-sales",
                copy: "Route uncertain opportunities to a technical owner.",
                to: routeCatalogByKey.projects.path,
              },
              {
                title: "Request solution review",
                copy: "Ask for a second-pass validation before sending the proposal.",
                to: routeCatalogByKey.proposal.path,
              },
              {
                title: "Add branded contact footer",
                copy: "Insert the correct sales or distributor contact details into the output.",
                to: routeCatalogByKey.salesHelper.path,
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
                <Link
                  to={item.to}
                  className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Feature readiness audit"
          subtitle="This is the current assessment of how complete each Wingman2 feature is after the routing cleanup."
        >
          <div className="space-y-4">
            {featureAudit.map((item) => (
              <div key={item.routeKey} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="wingman-kicker">{item.route.label}</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{item.summary}</h3>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${item.statusMeta.className}`}>
                    {item.statusMeta.label}
                  </span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {item.needed.map((need) => (
                    <li key={need}>{need}</li>
                  ))}
                </ul>
                <Link
                  to={item.route.path}
                  className="mt-4 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  Open {item.route.label}
                </Link>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
