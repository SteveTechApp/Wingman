import * as React from "react";
import type { WorkflowProject } from "@/workflow/workflowStore";

type Props = {
  project: WorkflowProject;
};

export default function ProjectCard({ project }: Props) {
  return (
    <article className="wm-mc-project-card" draggable>
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

      <div className="wm-mc-project-owner">Owner: {project.owner}</div>
    </article>
  );
}