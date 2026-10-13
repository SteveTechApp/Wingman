type Props = { questionCount: number; detailedLabel: string; essentialLabel: string; onConfirm: () => void; onDismiss: () => void };
export function DiscoveryEscalationConfirmation({ questionCount, detailedLabel, essentialLabel, onConfirm, onDismiss }: Props) {
  return (<div className="wm-discovery-escalation-confirm" data-wingman-escalation-confirm="true" role="dialog" aria-label={`Switch to ${detailedLabel} discovery?`}>
          <div className="wm-discovery-escalation-confirm-content">
            <span className="wm-discovery-escalation-confirm-icon" aria-hidden="true">🔬</span>
            <div>
              <strong>Unlock full discovery?</strong>
              <p>
                The question you want to edit is outside the 6 Essential questions. {detailedLabel} discovery reveals all {questionCount} questions.
              </p>
            </div>
          </div>
          <div className="wm-discovery-escalation-confirm-actions">
            <button
              type="button"
              className="wm-ui-button wm-ui-button-primary"
              onClick={onConfirm}
              data-testid="escalation-confirm"
            >
              Switch to {detailedLabel}
            </button>
            <button
              type="button"
              className="wm-ui-button wm-ui-button-secondary"
              onClick={onDismiss}
              data-testid="escalation-dismiss"
            >
              Stay in {essentialLabel}
            </button>
          </div>
        </div>);
}
