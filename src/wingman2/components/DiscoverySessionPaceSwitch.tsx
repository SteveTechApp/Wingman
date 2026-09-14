import { FileText, PhoneCall, Radio } from "lucide-react";

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
      <div>
        <p className="wm-discovery-eyebrow wm-ui-copy wm-ui-kicker"><Radio aria-hidden="true" /> Discovery session</p>
        <h1 className="wm-ui-title">Keep the conversation moving.</h1>
        <p className="wm-ui-copy">{pace === "live" ? "Stay with the customer. Wingman keeps the next useful question in view and builds the brief as you talk." : "Work through an email, meeting note, or site survey at your own pace. Everything stays editable."}</p>
        {location && <p className="wm-discovery-client-line wm-ui-copy">{location}</p>}
      </div>
      <div className="wm-discovery-completion-card wm-ui-card" aria-label="Discovery completion">
        <strong>{completionPercent}%</strong>
        <span>{answeredCount} / {questionCount} captured</span>
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
      <div className="wm-discovery-session-dock-copy">
        <span>{isLive ? "Live rhythm" : "Desk rhythm"}</span>
        <strong>{isLive ? "One clear question. No screen-reading." : "Capture the source material, then refine."}</strong>
      </div>
      <div className="wm-discovery-session-switch wm-discovery-mode-toggle" role="group" aria-label="Discovery session type">
        <button type="button" className={isLive ? "wm-discovery-mode-button is-active" : "wm-discovery-mode-button"} aria-pressed={isLive} onClick={() => onChange("live")}>
          <PhoneCall aria-hidden="true" />
          <span><strong>On a call</strong><small>Fast, focused prompts</small></span>
        </button>
        <button type="button" className={!isLive ? "wm-discovery-mode-button is-active" : "wm-discovery-mode-button"} aria-pressed={!isLive} onClick={() => onChange("desk")}>
          <FileText aria-hidden="true" />
          <span><strong>From notes</strong><small>Email or site survey</small></span>
        </button>
      </div>
    </section>
  );
}
