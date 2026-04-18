import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

const steps = [
  "Application Type",
  "Room / Space",
  "Sources & Displays",
  "Signal Transport",
  "USB / Control",
  "Cable Constraints",
  "Budget & Preferences",
];

export function DiscoveryPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Guided Customer Discovery"
        title="Turn a loose customer request into a usable technical brief."
        purpose="This page keeps the conversation structured so a less experienced rep can gather the right details, expose uncertainty early, and build toward a recommendation that sounds credible."
        nextMove="Complete the open discovery points, then push the brief into Product Finder for a pre-filled recommendation path."
      />

      <SectionCard
        title="Discovery workflow"
        subtitle="Each answer sharpens product matching, room template selection, and proposal-ready summaries."
      >
        <div className="grid gap-6 xl:grid-cols-[260px_1fr_340px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Steps</p>
            <div className="mt-4 space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    index === 0
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {index + 1}. {step}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Current step: Application Type</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                "Meeting room",
                "Boardroom",
                "Classroom",
                "Retail signage",
                "Hospitality",
                "Multi-zone",
              ].map((option) => (
                <button
                  key={option}
                  className={`rounded-2xl border px-4 py-4 text-left ${
                    option === "Meeting room"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-white"
                  }`}
                >
                  <p className="font-semibold">{option}</p>
                  <p className="mt-1 text-sm opacity-80">Apply a guided question branch</p>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Follow-up prompts</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>How many displays are in the room?</li>
                <li>Will users connect with HDMI, USB-C, or both?</li>
                <li>Is USB camera/peripheral extension required?</li>
                <li>What is the furthest cable run?</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Live summary</p>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-slate-500">Application</p>
                <p className="font-semibold text-slate-900">Small meeting room</p>
              </div>
              <div>
                <p className="text-slate-500">Known needs</p>
                <p className="font-semibold text-slate-900">2 sources, 1 display, USB-C laptop support</p>
              </div>
              <div>
                <p className="text-slate-500">Missing information</p>
                <p className="font-semibold text-amber-700">Camera USB path and control requirements</p>
              </div>
              <div>
                <p className="text-slate-500">Suggested next action</p>
                <p className="font-semibold text-slate-900">Run product finder with pre-filled filters</p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}