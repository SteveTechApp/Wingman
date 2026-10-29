import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { useUiMode } from "../data/uiMode";
import { WALL_ENTRY_NAME } from "../lib/wallEntry";
import { DiscoveryPage } from "./DiscoveryPage";
import { TemplatesPage } from "./TemplatesPage";

export function OpportunitiesPage() {
  const { isGuided, setMode } = useUiMode();
  const [params] = useSearchParams();
  const [resumeBuilder] = useState(() => ["projectId", "edit", "interview", "resume"].some(key => params.has(key)));
  useEffect(() => { if (resumeBuilder) setMode("unguided"); }, [resumeBuilder, setMode]);
  if (isGuided) return <TemplatesPage discoveryEntry />;
  return <>
    <nav className="wm-ui-card flex flex-wrap gap-2 p-3" aria-label="Opportunity starting points">
      <span className="wm-ui-button wm-ui-button-primary" aria-current="page">Build a room</span>
      <Link className="wm-ui-button wm-ui-button-secondary" to={routeCatalogByKey.templates.path}>Start from a room template</Link>
      {/* Named as the entry names itself, like every other starting point here
          that opens the wall page: a rep who follows it lands on that name. */}
      <Link className="wm-ui-button wm-ui-button-secondary" to={routeCatalogByKey.videowall.path}>{WALL_ENTRY_NAME}</Link>
      <Link className="wm-ui-button wm-ui-button-secondary" to={routeCatalogByKey.callCoach.path}>Prepare a conversation</Link>
    </nav>
    <DiscoveryPage roomBuilder />
  </>;
}
