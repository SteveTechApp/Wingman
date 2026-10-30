import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { RoomBriefWizard } from "../components/RoomBriefWizard";
import { useUiMode } from "../data/uiMode";
import { WALL_ENTRY_NAME } from "../lib/wallEntry";
import { DiscoveryPage } from "./DiscoveryPage";

export function OpportunitiesPage() {
  const { isGuided, setMode } = useUiMode();
  const [params] = useSearchParams();
  // `?interview=1` is how the room brief ends: it addresses this page again with
  // the decided room already written as a handoff. That is a parameter change on
  // a page that is already mounted rather than a fresh load, so it is read on
  // every render — a mount-time snapshot would leave the rep reading the
  // decision they just made while the address said the brief. It does not flip
  // the interface mode either: a guided rep who has just described their room
  // should land in the guided interview, not be moved to the expert view.
  const interview = params.get("interview") === "1";
  const [resumeBuilder] = useState(() => ["projectId", "edit", "resume"].some(key => params.has(key)));
  useEffect(() => { if (resumeBuilder) setMode("unguided"); }, [resumeBuilder, setMode]);
  // Guided, this page decides the room before it offers anything to buy: the
  // library answers "which design", and that question is only worth asking once
  // the room is known. The grid stays one link away for a rep who already does.
  if (isGuided && !interview) return <>
    <RoomBriefWizard />
    <nav className="wm-ui-card flex flex-wrap gap-2 p-3" aria-label="Other starting points">
      <Link className="wm-ui-button wm-ui-button-secondary" to={routeCatalogByKey.templates.path}>Browse the design library</Link>
      <Link className="wm-ui-button wm-ui-button-secondary" to={routeCatalogByKey.videowall.path}>{WALL_ENTRY_NAME}</Link>
      <Link className="wm-ui-button wm-ui-button-secondary" to={routeCatalogByKey.callCoach.path}>Prepare a conversation</Link>
    </nav>
  </>;
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
