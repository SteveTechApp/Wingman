import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import type { CustomRoomTemplate } from "../lib/customRoomTemplates";
import { createProjectFromTemplate } from "../lib/projectFromTemplate";

/**
 * The "From template" dialog the projects page opens from its toolbar.
 *
 * It creates the project from the chosen template and hands the new id back, so
 * the page keeps ownership of where a project opens and of closing the dialog.
 * A workspace with no saved templates explains how to make one instead of
 * showing an empty picker.
 */
export function TemplatePickerDialog({
  templates,
  onClose,
  onOpenProject,
}: {
  templates: CustomRoomTemplate[];
  onClose: () => void;
  onOpenProject: (projectId: string) => void;
}) {
  return (
    <div className="wm-template-picker-backdrop" role="button" aria-label="Close template picker" tabIndex={-1} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={(event) => { if (event.key === "Escape" || event.key === "Enter" || event.key === " ") onClose(); }}>
      <section className="wm-template-picker-dialog wm-ui-card" role="dialog" aria-modal="true" aria-labelledby="template-picker-title">
        <header className="flex items-center justify-between mb-4">
          <div>
            <p className="wm-ui-kicker">Create from template</p>
            <h2 id="template-picker-title" className="wm-ui-title text-lg font-black">Choose a room template</h2>
            <p className="text-xs opacity-60">Select a template to pre-fill discovery answers and product selections in a new project.</p>
          </div>
          <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {templates.length === 0 ? (
          <p className="text-sm opacity-60 py-4 text-center">No custom templates saved yet. Save a project as a template first.</p>
        ) : (
          <div className="grid gap-2 max-h-80 overflow-y-auto">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className="wm-template-picker-item text-left rounded-xl border border-[#29465e] bg-[#0d2133] p-3 transition hover:border-cyan-400/40"
                onClick={() => onOpenProject(createProjectFromTemplate(template))}
              >
                <p className="font-bold text-sm">{template.name}</p>
                <p className="text-xs opacity-60 mt-0.5">
                  {template.vertical} · {template.application}
                  {template.bom?.length ? ` · ${template.bom.length} products` : ""}
                </p>
                {template.summary && (
                  <p className="text-xs opacity-40 mt-1 line-clamp-2">{template.summary}</p>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Link to={routeCatalogByKey.templates.path} className="text-xs text-cyan-400 hover:underline">
            Manage templates →
          </Link>
        </div>
      </section>
    </div>
  );
}
