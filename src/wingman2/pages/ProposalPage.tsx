import ProposalCompletionWizard from "../components/ProposalCompletionWizard";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";

export function ProposalPageProjectMode() {
  return (
    <main
      className="wm-proposal-route-page wm-ui-page wingman-page-host"
      data-wingman-proposal-page="true"
    >
      <nav className="wm-ui-card flex flex-wrap gap-2 p-3" aria-label="Response tools">
        <span className="wm-ui-button wm-ui-button-primary" aria-current="page">Build response</span>
        <Link className="wm-ui-button wm-ui-button-secondary" to={routeCatalogByKey.ingest.path}>Decode a request</Link>
        <Link className="wm-ui-button wm-ui-button-secondary" to={routeCatalogByKey.proposalVisuals.path}>Add a visual</Link>
      </nav>
      <ProposalCompletionWizard />
    </main>
  );
}

export const ProposalPage = ProposalPageProjectMode;

export default ProposalPageProjectMode;
