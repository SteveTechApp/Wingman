import { deriveDiscoveryAudioDesign } from "../../lib/discoveryAudioDesign";
import type { DiscoveryAnswers, DiscoveryNotes } from "./discoveryTypes";

export function DiscoveryAudioDesignSummary({ answers, notes }: { answers: DiscoveryAnswers; notes: DiscoveryNotes }) {
  const design = deriveDiscoveryAudioDesign(answers, notes);
  if (!design) return null;
  return <section className="wm-ui-card wm-ui-section" aria-label="Audio design direction">
    <details><summary>Audio design guidance</summary>
    <p>{design.direction}</p><p>{design.zoning}</p>
    <details><summary>Complete-system scope and connections</summary>
      <p>{design.basis}</p><p>{design.signalPath}</p>
      <h3>Required scope by others</h3>
      <ul>{design.requiredScope.map((scope) => <li key={scope.key}><strong>{scope.description}</strong> — {scope.notes}</li>)}</ul>
      <h3>Confirm before pricing</h3><ul>{design.validation.map((item) => <li key={item}>{item}</li>)}</ul>
    </details>
  </details></section>;
}
