import { FileText, PhoneCall } from "lucide-react";

export type DiscoveryPace = "live" | "desk";

type DiscoverySessionHeroProps = {
  pace: DiscoveryPace;
  clientName: string;
  siteName: string;
  completionPercent: number;
  answeredCount: number;
  questionCount: number;
};

export function DiscoverySessionHero({ pace, clientName, siteName, completionPercent, answeredCount, questionCount }: DiscoverySessionHeroProps) {
  const location = [clientName.trim(), siteName.trim()].filter(Boolean).join(" · ");
  return (
    <header className="wm-discovery-capture-hero wm-ui-hero">
      <div className="wm-discovery-session-title">
        <h1 className="wm-ui-title">Discovery</h1>
        <p className="wm-ui-copy">{location || (pace === "live" ? "On a call" : "From notes")}</p>
      </div>
      <div className="wm-discovery-completion-card wm-ui-card" aria-label="Discovery completion">
        <span>{answeredCount} of {questionCount}</span>
        <div className="wm-discovery-session-progress" aria-hidden="true"><span style={{ width: `${completionPercent}%` }} /></div>
        <strong>{completionPercent}%</strong>
      </div>
    </header>
  );
}

type DiscoverySessionPaceSwitchProps = {
  pace: DiscoveryPace;
  onChange: (pace: DiscoveryPace) => void;
};

export function DiscoverySessionPaceSwitch({ pace, onChange }: DiscoverySessionPaceSwitchProps) {
  const isLive = pace === "live";

  return (
    <section className="wm-discovery-session-dock wm-discovery-trail-card wm-ui-section wm-ui-card" aria-label="Set the pace for this discovery">
      <span className="wm-discovery-session-dock-label">Capture from</span>
      <div className="wm-discovery-session-switch wm-discovery-mode-toggle" role="group" aria-label="Discovery session type">
        <button type="button" className={isLive ? "wm-discovery-mode-button is-active" : "wm-discovery-mode-button"} aria-pressed={isLive} onClick={() => onChange("live")}>
          <PhoneCall aria-hidden="true" />
          <span><strong>On a call</strong></span>
        </button>
        <button type="button" className={!isLive ? "wm-discovery-mode-button is-active" : "wm-discovery-mode-button"} aria-pressed={!isLive} onClick={() => onChange("desk")}>
          <FileText aria-hidden="true" />
          <span><strong>From notes</strong></span>
        </button>
      </div>
    </section>
  );
}
