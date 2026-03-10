import * as React from "react";

import { useNavigate } from "react-router-dom";
import { createProject } from "@/features/projects/projectStore";

export default function ProjectNewPage() {
  const nav = useNavigate();
  const [name, setName] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [site, setSite] = React.useState("");

  function create() {
    const p = createProject({
      name: name.trim() || "New Project",
      customer: customer.trim(),
      site: site.trim(),
    });
    nav("/app/tools/discovery");
    return p;
  }

  return (
    <div className="wm-page wm-project-new-page">
      <section className="wm-hero">
        <div className="wm-grid wm-project-new-page__hero">
          <div className="wm-kicker">Projects</div>
          <div className="wm-title-xl">Start New Project</div>
          <div className="wm-body-sm wm-page-subtitle-muted">
            Create the workspace first, then complete discovery and generate a proposal-ready draft.
          </div>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Project details</h2>
            <p>Capture core commercial context before launching Discovery.</p>
          </div>
        </div>

        <div className="wm-project-new-page__form">
          <label className="wm-form-field">
            <span className="wm-form-label">Project name</span>
            <input
              className="wm-form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Boardroom Upgrade"
            />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Customer</span>
            <input
              className="wm-form-input"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="e.g. Acme Ltd"
            />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Site</span>
            <input
              className="wm-form-input"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="e.g. London HQ"
            />
          </label>

          <div className="wm-actions-row">
            <button type="button" className="wm-btn" onClick={() => nav("/app/projects")}>
              Cancel
            </button>
            <button type="button" className="wm-btn wm-btn-primary" onClick={create}>
              Create and Open Discovery
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
