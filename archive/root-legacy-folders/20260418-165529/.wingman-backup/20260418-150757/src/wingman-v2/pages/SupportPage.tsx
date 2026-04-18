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
      />

      <SectionCard
        title="Support actions"
        subtitle="Use this area for contact details, escalation requests, and proposal footer details."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Escalate to pre-sales", "Route uncertain opportunities to a technical owner."],
            ["Request solution review", "Ask for a second-pass validation before sending the proposal."],
            ["Add branded contact footer", "Insert the correct sales or distributor contact details into the output."],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              <button className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                Open
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}