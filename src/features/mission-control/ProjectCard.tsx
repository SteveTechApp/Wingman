import * as React from "react";
import type { WorkflowProject } from "@/workflow/workflowStore";
import { setActiveWorkflowProject } from "@/workflow/workflowStore";

type Props = {
  project: WorkflowProject;
  isActive?: boolean;
};

export default function ProjectCard({ project, isActive }: Props) {
  return (
    <article
      className={`wm-mc-project-card ${isActive ? "is-active" : ""}`}
      draggable
      onClick={() => setActiveWorkflowProject(project.id)}
      title="Set active project"
    >
      <div className="wm-mc-project-topline">
        <h4 className="wm-mc-project-title">{project.name}</h4>
        <span className={`wm-mc-health is-${project.health.toLowerCase().replace(/\s+/g, "-")}`}>
          {project.health}
        </span>
      </div>

      <div className="wm-mc-project-meta">
        <span>{project.customer}</span>
        <span>{project.roomType}</span>
      </div>

      <div className="wm-mc-project-facts">
        <span>{project.sources ?? 0} sources</span>
        <span>{project.displays ?? 0} displays</span>
        <span>{project.distanceM ?? 0}m</span>
      </div>

      <div className="wm-mc-project-owner">Owner: {project.owner}</div>
    </article>
  );
}