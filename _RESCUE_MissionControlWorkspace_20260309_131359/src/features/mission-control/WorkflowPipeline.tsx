import * as React from "react";
import PipelineColumn from "./PipelineColumn";
import { WORKFLOW_STAGES, type WorkflowStage } from "@/workflow/workflowStages";
import {
  ensureWorkflowSeed,
  getActiveWorkflowProjectId,
  getWorkflowProjects,
  moveWorkflowProject,
  type WorkflowProject,
} from "@/workflow/workflowStore";

export default function WorkflowPipeline() {
  const [projects, setProjects] = React.useState<WorkflowProject[]>(() => ensureWorkflowSeed());
  const [activeId, setActiveId] = React.useState<string | null>(() => getActiveWorkflowProjectId());

  const onMove = React.useCallback((projectId: string, stage: WorkflowStage) => {
    setProjects(moveWorkflowProject(projectId, stage));
    setActiveId(getActiveWorkflowProjectId());
  }, []);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setProjects(getWorkflowProjects());
      setActiveId(getActiveWorkflowProjectId());
    }, 600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="wm-mc-pipeline">
      {WORKFLOW_STAGES.map((stage) => (
        <PipelineColumn
          key={stage}
          stage={stage}
          activeId={activeId}
          projects={projects.filter((p) => p.stage === stage)}
          onMove={onMove}
        />
      ))}
    </div>
  );
}