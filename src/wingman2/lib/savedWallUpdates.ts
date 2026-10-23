import { updateStoredProject } from "../data/projectStore";
import { wallCanvasPlan, wallResolutionSummary, type WallRequirements } from "./videowallOptions";
import { wallTransportPlan } from "./videowallTransport";
import { wallSurveyDisplayCount, wallSurveyGaps, wallSurveyGapText } from "./wallSurvey";
export function updateSavedWallRequirements(projectId: string, requirements: WallRequirements) {
  return updateStoredProject(projectId, project => {
    if (!project.videowall) return project;
    const transport = wallTransportPlan(requirements);
    const gaps = wallSurveyGaps(transport, requirements.linkDetails);
    const resolution = wallResolutionSummary(requirements);
    return { ...project, videowall: { ...project.videowall, savedAt: new Date().toISOString(), summary: {
      ...project.videowall.summary, requirements, transport,
      resolution: { canvas: resolution.canvas, display: resolution.display, source: resolution.source, mapping: resolution.label },
      canvasPlan: wallCanvasPlan(requirements),
      survey: { linkCount: wallSurveyDisplayCount(transport), gaps, text: wallSurveyGapText(gaps, wallSurveyDisplayCount(transport)) },
      updatedAt: new Date().toISOString(),
    } } };
  });
}
