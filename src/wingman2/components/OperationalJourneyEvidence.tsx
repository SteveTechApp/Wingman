import { useEffect, useState } from "react";
import { Clock, Package, Target, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { summarizeOperationalJourneyEvents, type OperationalJourneySummary } from "../features/design-project";
import { formatAnalyticsDate } from "../lib/analyticsDashboard";

function EvidenceCard({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: number; accent: string }) {
  return (
    <div className={`wm-analytics-summary-card wm-analytics-summary-card--${accent}`}>
      <div className="wm-analytics-summary-card__icon"><Icon className="h-5 w-5" aria-hidden="true" /></div>
      <div className="wm-analytics-summary-card__content">
        <span className="wm-analytics-summary-card__label">{label}</span>
        <strong className="wm-analytics-summary-card__value">{value}</strong>
      </div>
    </div>
  );
}

export function OperationalJourneyEvidence({ refreshKey }: { refreshKey: number }) {
  const [summary, setSummary] = useState<OperationalJourneySummary>(() => summarizeOperationalJourneyEvents([]));

  useEffect(() => {
    let active = true;
    void fetch("/api/wingman/telemetry", { credentials: "include" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Telemetry unavailable")))
      .then((payload: { events?: Array<{ feature?: string; message?: string; timestamp?: string }> }) => {
        if (active) setSummary(summarizeOperationalJourneyEvents(payload.events ?? []));
      })
      .catch(() => {
        if (active) setSummary(summarizeOperationalJourneyEvents([]));
      });
    return () => { active = false; };
  }, [refreshKey]);

  return (
    <section className="wm-analytics-section" aria-label="Operational journey evidence">
      <div className="wm-analytics-section__header">
        <div>
          <h2 className="wm-analytics-section__title"><Target className="h-5 w-5" aria-hidden="true" />Operational journey evidence</h2>
          <p className="wm-analytics-section__subtitle">
            {summary.observationWindow
              ? `Observed ${formatAnalyticsDate(summary.observationWindow.from)} to ${formatAnalyticsDate(summary.observationWindow.to)}.`
              : "No production observation window. Operational journey events have not been observed for this workspace."}
          </p>
        </div>
      </div>
      <div className="wm-analytics-summary">
        <EvidenceCard icon={Target} label="Journeys started" value={summary.started} accent="aqua" />
        <EvidenceCard icon={TrendingUp} label="Stages completed" value={summary.completed} accent="green" />
        <EvidenceCard icon={TrendingDown} label="Journeys failed" value={summary.failed} accent="red" />
        <EvidenceCard icon={Clock} label="Sync degraded" value={summary.degraded} accent="amber" />
        <EvidenceCard icon={Package} label="Publication blocked" value={summary.publicationBlocked} accent="violet" />
      </div>
    </section>
  );
}
