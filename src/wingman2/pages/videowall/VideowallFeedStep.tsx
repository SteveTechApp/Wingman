import { useState } from "react";
import {
  wallFeedPathKeyFor,
  wallFeedPaths,
  wallFeedingAnswer,
  wallFeedingChecks,
  wallFeedingChoices,
  wallFeedingKeyFor,
  wallFeedingPanelNote,
  wallFeedingProcessorNote,
} from "../../lib/wallFeeding";
import type { WallRequirements } from "../../lib/videowallOptions";

/**
 * The connection question, asked after the wall's size and before its layout:
 * one canvas that the wall scales, or a feed per panel, and which box produces
 * that canvas. A rep arriving from a saved design sees the answer in use, so
 * this screen confirms a build as often as it chooses one.
 */
export function VideowallFeedStep({
  requirements,
  onChange,
  onBack,
  onNext,
}: {
  requirements: WallRequirements;
  onChange: (patch: Partial<WallRequirements>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [model, setModel] = useState(() => wallFeedingKeyFor(requirements));
  const [path, setPath] = useState(() => wallFeedPathKeyFor(requirements));
  const choices = wallFeedingChoices(requirements);
  const paths = wallFeedPaths(requirements, model);
  // The pick is what the step is showing; the design holds only what the
  // decision engine reads, so a path that shares a transport with another is
  // still the rep's own answer while they are on this screen.
  const chosen = paths.find((item) => item.key === path) ?? paths[0];
  const checks = wallFeedingChecks(requirements, model, chosen.key);
  const panelNote = wallFeedingPanelNote(requirements);
  const processorNote = wallFeedingProcessorNote(requirements);

  function chooseModel(key: (typeof choices)[number]["key"]) {
    const choice = choices.find((item) => item.key === key);
    if (!choice) return;
    const next = { ...requirements, ...choice.patch };
    setModel(choice.key);
    setPath(wallFeedPathKeyFor(next));
    if (choice.patch) onChange(choice.patch);
  }

  function choosePath(key: (typeof chosen)["key"]) {
    const item = paths.find((entry) => entry.key === key);
    if (!item) return;
    setPath(item.key);
    onChange(item.patch);
  }

  return (
    <section className="vw-wizard-card" data-testid="videowall-wizard-step-feeding" aria-label="How is the wall fed?">
      <div className="vw-wizard-fieldset" role="group" aria-label="How the wall is fed">
        <p className="vw-wizard-label">How the wall is fed</p>
        <div className="vw-wizard-options">
          {choices.map((choice) => (
            <button
              key={choice.key}
              type="button"
              data-testid={`videowall-feeding-${choice.key}`}
              aria-pressed={model === choice.key}
              onClick={() => chooseModel(choice.key)}
            >
              <strong>{choice.label}</strong>
              <span>{choice.detail}</span>
            </button>
          ))}
        </div>
        {panelNote ? (
          <p className="vw-wizard-hint" data-testid="videowall-feeding-panel-note">{panelNote}</p>
        ) : null}
      </div>

      <div className="vw-wizard-fieldset" role="group" aria-label="What feeds the wall">
        <p className="vw-wizard-label">What feeds it</p>
        <div className="vw-wizard-options">
          {paths.map((item) => (
            <button
              key={item.key}
              type="button"
              data-testid={`videowall-feed-path-${item.key}`}
              aria-pressed={chosen.key === item.key}
              onClick={() => choosePath(item.key)}
            >
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </button>
          ))}
        </div>
        {processorNote ? (
          <p className="vw-wizard-hint" data-testid="videowall-feeding-processor-note">{processorNote}</p>
        ) : null}
      </div>

      <div className="vw-wizard-fieldset">
        <p className="vw-wizard-label">What this connection carries</p>
        {checks.map((check) => (
          <p key={check} className="vw-wizard-hint" data-testid="videowall-feeding-check">{check}</p>
        ))}
      </div>

      <div className="vw-wizard-nav">
        <button type="button" className="vw-wizard-secondary" onClick={onBack}>Back</button>
        <button type="button" className="vw-wizard-primary" onClick={onNext}>
          Continue with {wallFeedingAnswer(requirements).toLowerCase()}
        </button>
      </div>
    </section>
  );
}
