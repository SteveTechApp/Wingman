import { useState } from "react";
import {
  wallFeedPathKeyFor,
  wallFeedPaths,
  wallFeedingChecks,
  wallFeedingChoices,
  wallFeedingKeyFor,
  wallFeedingPanelNote,
  wallFeedingProcessorNote,
} from "../../lib/wallFeeding";
import { videowallNetworkChoices, videowallNetworkKeyFor } from "../../lib/videowallDraft";
import type { WallRequirements } from "../../lib/videowallOptions";

export function VideowallConnectionOptions({
  requirements,
  onChange,
  includeNetworkProvision = false,
}: {
  requirements: WallRequirements;
  onChange: (patch: Partial<WallRequirements>) => void;
  includeNetworkProvision?: boolean;
}) {
  const [model, setModel] = useState(() => wallFeedingKeyFor(requirements));
  const [path, setPath] = useState(() => wallFeedPathKeyFor(requirements));
  const choices = wallFeedingChoices(requirements);
  const paths = wallFeedPaths(requirements, model);
  const chosen = paths.find((item) => item.key === path) ?? paths[0];
  const checks = wallFeedingChecks(requirements, model, chosen.key);
  const panelNote = wallFeedingPanelNote(requirements);
  const processorNote = wallFeedingProcessorNote(requirements);

  function chooseNetwork(key: (typeof videowallNetworkChoices)[number]["key"]) {
    const choice = videowallNetworkChoices.find((item) => item.key === key);
    if (!choice) return;
    const next = { ...requirements, ...choice.patch };
    setPath(wallFeedPathKeyFor(next));
    onChange({ ...choice.patch, multiviewSelected: false });
  }

  function chooseModel(key: (typeof choices)[number]["key"]) {
    const choice = choices.find((item) => item.key === key);
    if (!choice) return;
    const next = { ...requirements, ...choice.patch };
    setModel(choice.key);
    setPath(wallFeedPathKeyFor(next));
    onChange({ ...choice.patch, multiviewSelected: false });
  }

  function choosePath(key: (typeof chosen)["key"]) {
    const item = paths.find((entry) => entry.key === key);
    if (!item) return;
    setPath(item.key);
    onChange({
      ...item.patch,
      multiviewSelected: item.key === "nhd150" || item.key === "nhd600",
    });
  }

  return <>
    {includeNetworkProvision && <div className="vw-wizard-fieldset" role="group" aria-label="Network provision">
      <p className="vw-wizard-label">Network provision</p>
      <div className="vw-wizard-options">
        {videowallNetworkChoices.map((choice) => (
          <button key={choice.key} type="button" aria-pressed={videowallNetworkKeyFor(requirements) === choice.key}
            onClick={() => chooseNetwork(choice.key)}>
            <strong>{choice.label}</strong><span>{choice.detail}</span>
          </button>
        ))}
      </div>
    </div>}

    <div className="vw-wizard-fieldset" role="group" aria-label="How the wall is fed">
      <p className="vw-wizard-label">How the wall is fed</p>
      <div className="vw-wizard-options">
        {choices.map((choice) => (
          <button key={choice.key} type="button" data-testid={`videowall-feeding-${choice.key}`}
            aria-pressed={model === choice.key} onClick={() => chooseModel(choice.key)}>
            <strong>{choice.label}</strong><span>{choice.detail}</span>
          </button>
        ))}
      </div>
      {panelNote ? <p className="vw-wizard-hint" data-testid="videowall-feeding-panel-note">{panelNote}</p> : null}
    </div>

    <div className="vw-wizard-fieldset" role="group" aria-label="What feeds the wall">
      <p className="vw-wizard-label">What feeds it</p>
      <div className="vw-wizard-options">
        {paths.map((item) => (
          <button key={item.key} type="button" data-testid={`videowall-feed-path-${item.key}`}
            aria-pressed={chosen.key === item.key} onClick={() => choosePath(item.key)}>
            <strong>{item.label}</strong><span>{item.detail}</span>
          </button>
        ))}
      </div>
      {processorNote ? <p className="vw-wizard-hint" data-testid="videowall-feeding-processor-note">{processorNote}</p> : null}
    </div>

    <div className="vw-wizard-fieldset">
      <p className="vw-wizard-label">What this connection carries</p>
      {checks.map((check) => <p key={check} className="vw-wizard-hint" data-testid="videowall-feeding-check">{check}</p>)}
    </div>
  </>;
}
