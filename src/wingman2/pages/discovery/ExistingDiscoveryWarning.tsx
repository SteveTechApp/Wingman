type ExistingDiscoveryWarningProps = {
  projectName: string;
  progress: number;
  savedAt: string;
  onContinue: () => void;
  onStartNew: () => void;
  onCancel: () => void;
};

export function ExistingDiscoveryWarning({
  projectName,
  progress,
  savedAt,
  onContinue,
  onStartNew,
  onCancel,
}: ExistingDiscoveryWarningProps) {
  return (
    <div className="wm-existing-discovery-warning-backdrop">
      <section
        className="wm-existing-discovery-warning-dialog wm-ui-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="existing-discovery-warning-title"
        aria-describedby="existing-discovery-warning-description"
      >
        <div className="wm-existing-discovery-warning-icon" aria-hidden="true">!</div>
        <div className="wm-existing-discovery-warning-copy">
          <p className="wm-existing-discovery-warning-kicker">WARNING!</p>
          <h2 id="existing-discovery-warning-title">Existing Discovery in progress</h2>
          <p id="existing-discovery-warning-description">
            Continue the existing Discovery or preserve it and start a new project.
          </p>
        </div>
        <dl className="wm-existing-discovery-warning-summary">
          <div><dt>Project</dt><dd>{projectName}</dd></div>
          <div><dt>Progress</dt><dd>{progress}% captured</dd></div>
          {savedAt ? <div><dt>Last saved</dt><dd>{savedAt}</dd></div> : null}
        </dl>
        <p className="wm-existing-discovery-warning-note">
          Starting a new project will not overwrite this work. The current brief is saved to the project workspace first.
        </p>
        <div className="wm-existing-discovery-warning-actions">
          <button className="wm-ui-button wm-ui-button-primary" type="button" onClick={onContinue}>
            Continue existing Discovery
          </button>
          <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={onStartNew}>
            Start new project
          </button>
          <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
