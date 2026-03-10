import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

const PROJECTS = [
  { name: "Meeting Room Refresh", customer: "Acme Ltd", stage: "Discovery", updated: "Today" },
  { name: "Boardroom Upgrade", customer: "Northvale Group", stage: "Design", updated: "Yesterday" },
  { name: "Reception Signage", customer: "Harbour Hotel", stage: "Proposal", updated: "2 days ago" },
];

export default function ProjectsPage() {
  return (
    <PageFrame
      title="Projects"
      subtitle="Open, resume, and manage active Wingman workspaces."
      actions={
        <div className="wm-toolbar">
          <button className="wm-btn-secondary" type="button">Import</button>
          <button className="wm-btn-primary" type="button">Start New Project</button>
        </div>
      }
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Workspace</span>
            <h3>Resume active opportunities quickly</h3>
            <p>
              The project page should make it obvious which job needs attention next, with fast resume actions.
            </p>
          </div>

          <div className="wm-heroCard">
            <span className="wm-kicker">Current View</span>
            <h3>{PROJECTS.length} active projects</h3>
            <p>
              Keep project status, recent activity, and next action visible without forcing the user into deep navigation.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Saved Workspaces"
        subtitle="Open recent projects and continue from the last stage."
      >
        <div className="wm-list">
          {PROJECTS.map((project) => (
            <div key={project.name} className="wm-listItem">
              <div className="wm-listItem__body">
                <div className="wm-listItem__title">{project.name}</div>
                <div className="wm-listItem__meta">{project.customer} · Stage: {project.stage} · Updated: {project.updated}</div>
                <div className="wm-tagRow">
                  <span className="wm-tag">{project.stage}</span>
                  <span className="wm-tag">{project.updated}</span>
                </div>
              </div>

              <div className="wm-right">
                <button className="wm-btn-secondary" type="button">Details</button>
                <button className="wm-btn-primary" type="button">Open</button>
              </div>
            </div>
          ))}
        </div>
      </PageSection>
    </PageFrame>
  );
}
