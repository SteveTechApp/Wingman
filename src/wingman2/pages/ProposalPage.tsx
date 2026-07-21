import ProposalCompletionWizard from "../components/ProposalCompletionWizard";

export function ProposalPageProjectMode() {
  return (
    <main
      className="wm-proposal-route-page wm-ui-page wingman-page-host"
      data-wingman-proposal-page="true"
    >
      <ProposalCompletionWizard />
    </main>
  );
}

export const ProposalPage = ProposalPageProjectMode;

export default ProposalPageProjectMode;