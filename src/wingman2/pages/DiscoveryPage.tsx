import { useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

const applicationProfiles = {
  "Meeting room": {
    knownNeeds: "2 sources, 1 display, USB-C laptop support",
    missingInfo: "Camera USB path and control requirements",
  },
  Boardroom: {
    knownNeeds: "Multiple presentation sources, dual displays, control integration",
    missingInfo: "Table connectivity, camera count, and audio handoff",
  },
  Classroom: {
    knownNeeds: "Lectern input switching, display extension, simple instructor control",
    missingInfo: "USB teaching peripherals and recording workflow",
  },
  "Retail signage": {
    knownNeeds: "Distributed displays, repeatable content routing, simple support path",
    missingInfo: "Display count, signal distance, and failover behavior",
  },
  Hospitality: {
    knownNeeds: "Guest-facing displays, flexible sources, easy day-two support",
    missingInfo: "Centralized control and content scheduling requirements",
  },
  "Multi-zone": {
    knownNeeds: "Many-to-many routing, future expansion, mixed display endpoints",
    missingInfo: "Network availability, latency expectations, and USB needs",
  },
} as const;

const steps = [
  "Application Type",
  "Room / Space",
  "Sources & Displays",
  "Signal Transport",
  "USB / Control",
  "Cable Constraints",
  "Budget & Preferences",
];

const applicationOptions = Object.keys(applicationProfiles) as (keyof typeof applicationProfiles)[];

export function DiscoveryPage() {
  const [selectedApplication, setSelectedApplication] = useState<keyof typeof applicationProfiles>("Meeting room");
  const selectedProfile = applicationProfiles[selectedApplication];

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Guided Customer Discovery"
        title="Turn a loose customer request into a usable technical brief."
        purpose="This page keeps the conversation structured so a less experienced rep can gather the right details, expose uncertainty early, and build toward a recommendation that sounds credible."
        nextMove="Complete the open discovery points, then push the brief into Product Finder for a pre-filled recommendation path."
        actions={[
          { label: "Open Product Finder", to: routeCatalogByKey.finder.path },
          { label: "Save to Projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
        ]}
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
              {applicationOptions.map((option) => {
                const isActive = option === selectedApplication;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedApplication(option)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-white"
                    }`}
                  >
                    <p className="font-semibold">{option}</p>
                    <p className="mt-1 text-sm opacity-80">Apply a guided question branch</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Follow-up prompts</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>How many displays are in the room?</li>
                <li>Will users connect with HDMI, USB-C, or both?</li>
                <li>Is USB camera or peripheral extension required?</li>
                <li>What is the furthest cable run?</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to={routeCatalogByKey.callCards.path}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                >
                  Open call cards
                </Link>
                <Link
                  to={routeCatalogByKey.finder.path}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Push to Product Finder
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Live summary</p>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-slate-500">Application</p>
                <p className="font-semibold text-slate-900">{selectedApplication}</p>
              </div>
              <div>
                <p className="text-slate-500">Known needs</p>
                <p className="font-semibold text-slate-900">{selectedProfile.knownNeeds}</p>
              </div>
              <div>
                <p className="text-slate-500">Missing information</p>
                <p className="font-semibold text-amber-700">{selectedProfile.missingInfo}</p>
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
