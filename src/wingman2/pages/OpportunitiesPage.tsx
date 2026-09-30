import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { DiscoveryPage } from "./DiscoveryPage";

export function OpportunitiesPage() {
  return <>
    <nav className="wm-ui-card flex flex-wrap gap-2 p-3" aria-label="Opportunity starting points">
      <span className="wm-ui-button wm-ui-button-primary" aria-current="page">Capture requirements</span>
      <Link className="wm-ui-button wm-ui-button-secondary" to={routeCatalogByKey.templates.path}>Start from a room template</Link>
      <Link className="wm-ui-button wm-ui-button-secondary" to={routeCatalogByKey.callCoach.path}>Prepare a conversation</Link>
    </nav>
    <DiscoveryPage />
  </>;
}
