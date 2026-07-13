import ProposalCompletionWizard from "../components/ProposalCompletionWizard";
import TemplateProposalSeedPanel from "../components/TemplateProposalSeedPanel";

export function ProposalPageProjectMode() {
  return (
    <main
      className="wm-proposal-route-page wm-ui-page wingman-page-host"
      data-wingman-proposal-page="true"
    >
      <TemplateProposalSeedPanel />
      <ProposalCompletionWizard />
    </main>
  );
}

export const ProposalPage = ProposalPageProjectMode;

export default ProposalPageProjectMode;