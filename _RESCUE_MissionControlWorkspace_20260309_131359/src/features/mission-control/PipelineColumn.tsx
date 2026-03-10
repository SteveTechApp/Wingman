import * as React from "react";
import ProjectCard from "./ProjectCard";
import type { WorkflowStage } from "@/workflow/workflowStages";
import { WORKFLOW_LABELS, WORKFLOW_STAGE_CLASS } from "@/workflow/workflowStages";
import type { WorkflowProject } from "@/workflow/workflowStore";

type Props = {
  stage: WorkflowStage;
  activeId: string | null;
  projects: WorkflowProject[];
  onMove: (projectId: string, stage: WorkflowStage) => void;
};

export default function PipelineColumn({ stage, activeId, projects, onMove }: Props) {
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData("text/plain");
    if (projectId) {
      onMove(projectId, stage);
    }
  };

  return (
    <section className={`wm-mc-column ${WORKFLOW_STAGE_CLASS[stage]}`} onDragOver={onDragOver} onDrop={onDrop}>
      <header className="wm-mc-column-header">
        <div className="wm-mc-column-title">{WORKFLOW_LABELS[stage]}</div>
        <div className="wm-mc-column-count">{projects.length}</div>
      </header>

      <div className="wm-mc-column-body">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div
              key={project.id}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", project.id);
              }}
            >
              <ProjectCard project={project} isActive={project.id === activeId} />
            </div>
          ))
        ) : (
          <div className="wm-mc-column-empty">No projects in this stage</div>
        )}
      </div>
    </section>
  );
}