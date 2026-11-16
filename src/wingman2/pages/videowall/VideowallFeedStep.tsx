import { wallConnectionSummary } from "../../lib/wallFeeding";
import type { WallRequirements } from "../../lib/videowallOptions";
import { VideowallConnectionOptions } from "./VideowallConnectionOptions";

/** The guided connection step: wall feed model, network and the box that carries it. */
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
  return (
    <section className="vw-wizard-card" data-testid="videowall-wizard-step-feeding" aria-label="How is the wall fed?">
      <VideowallConnectionOptions requirements={requirements} onChange={onChange} />
      <div className="vw-wizard-nav">
        <button type="button" className="vw-wizard-secondary" onClick={onBack}>Back</button>
        <button type="button" className="vw-wizard-primary" onClick={onNext}>
          Continue with {wallConnectionSummary(requirements).toLowerCase()}
        </button>
      </div>
    </section>
  );
}
