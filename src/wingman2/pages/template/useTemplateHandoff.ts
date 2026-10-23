import { useCallback, useEffect, useMemo, useRef } from "react";
import type { NavigateFunction } from "react-router-dom";
import { routeCatalogByKey } from "../../app/routeCatalog";
import { useUiMode } from "../../data/uiMode";
import { upsertStoredProject, useProjectStore } from "../../data/projectStore";
import { writeDiscoveryHandoff } from "../../lib/discoveryTemplateHandoff";
import { templateRoomBuilderHandoff } from "../../lib/templateRoomBuilderHandoff";
import { templateVideoWallHandoff, writeVideoWallHandoff } from "../../lib/videowallHandoff";
import { buildTemplateProject } from "../../lib/templateReviewProposal";
import type { RoomTemplate, TemplateBomRow } from "../../lib/roomTemplates";

/**
 * Where the template's design continues: the room builder for a room template,
 * the video wall builder for a template that includes wall processing.
 *
 * The guided-to-expert switch is the same handoff, so it lives here too rather
 * than being written twice on the page.
 */
export function useTemplateHandoff({
  template,
  selectedRows,
  navigate,
}: {
  template: RoomTemplate | undefined;
  selectedRows: TemplateBomRow[];
  navigate: NavigateFunction;
}) {
  const { isGuided, setMode } = useUiMode();
  const previousGuided = useRef(isGuided);
  const { projects } = useProjectStore();
  const wallHandoff = useMemo(() => (template ? templateVideoWallHandoff(template) : null), [template]);

  const openFullRoomBuilder = useCallback(() => {
    if (!template) return;
    if (wallHandoff) {
      // The wall is saved to the active project, so make this template's project
      // active first: the saved wall then stays linked to the template and its
      // proposal export can print the transport estimate.
      const linked = projects.find((project) => project.discoveryBrief?.roomModel?.sourceTemplateId === template.id);
      upsertStoredProject(linked ?? buildTemplateProject(template, selectedRows));
      writeVideoWallHandoff(wallHandoff);
      setMode("unguided");
      navigate(routeCatalogByKey.videowall.path);
      return;
    }
    writeDiscoveryHandoff(templateRoomBuilderHandoff(template, selectedRows));
    setMode("unguided");
    navigate(routeCatalogByKey.discovery.path);
  }, [template, selectedRows, setMode, navigate, wallHandoff, projects]);

  useEffect(() => {
    if (previousGuided.current && !isGuided) openFullRoomBuilder();
    previousGuided.current = isGuided;
  }, [isGuided, openFullRoomBuilder]);

  return { wallHandoff, openFullRoomBuilder };
}
