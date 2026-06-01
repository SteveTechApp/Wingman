import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clipboard, Database, Workflow } from "lucide-react";
import { DiagramPreviewPanel } from "../components/DiagramPreviewPanel";
import { PageHero } from "../components/PageHero";
import { useProjectStore, type StoredProject } from "../data/projectStore";
import {
  DIAGRAM_TEMPLATES,
  diagramTemplateFor,
  generateDiagram,
  type DiagramTypeId,
} from "../lib/diagramTemplates";

function projectCoverage(project?: StoredProject | null) {
  return [
    { label: "Discovery", ready: Boolean(project?.discoveryBrief || project?.requirements?.length || project?.ingest) },
    { label: "Finder", ready: Boolean(project?.productSelections?.length) },
    { label: "Compare", ready: Boolean(project?.compareRuns?.length) },
    { label: "Proposal", ready: Boolean(project?.proposal) },
  ];
}

function projectLabel(project: StoredProject) {
  const pieces = [project.name, project.stage, project.updated].filter(Boolean);
  return pieces.join(" - ");
}

export function VisualDesignStudioPage() {
  const { projects, activeProjectId, activeProject } = useProjectStore();
  const [diagramType, setDiagramType] = useState<DiagramTypeId>("signal-flow");
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjectId ?? projects[0]?.id ?? "sample");

  const selectedProject = useMemo(() => {
    if (selectedProjectId === "active") return activeProject;
    if (selectedProjectId === "sample") return null;
    return projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [activeProject, projects, selectedProjectId]);

  const generated = useMemo(
    () => generateDiagram({ diagramType, project: selectedProject }),
    [diagramType, selectedProject],
  );

  const activeTemplate = diagramTemplateFor(diagramType);
  const coverage = projectCoverage(selectedProject);

  return (
    <main className="wm-visual-design-page">
      <PageHero
        eyebrow="Visual Design Studio"
        title="Generate editable Mermaid diagrams for Whimsical."
        purpose="Turn Wingman project, discovery, product, comparison and proposal context into simple diagrams that can be pasted into Whimsical as editable Mermaid."
        nextMove="Pick a diagram type, choose the project source, review blockers, then copy Mermaid into a Whimsical board."
      />

      <section className="wm-diagram-studio-shell">
        <aside className="wm-diagram-control-panel">
          <section className="wm-diagram-card">
            <div className="wm-diagram-card-head">
              <Workflow className="h-4 w-4" />
              <div>
                <p>1. Choose diagram type</p>
                <span>Start with the sales question, not a blank canvas.</span>
              </div>
            </div>

            <div className="wm-diagram-template-list">
              {DIAGRAM_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={diagramType === template.id ? "is-active" : ""}
                  onClick={() => setDiagramType(template.id)}
                >
                  <strong>{template.shortTitle}</strong>
                  <span>{template.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="wm-diagram-card">
            <div className="wm-diagram-card-head">
              <Database className="h-4 w-4" />
              <div>
                <p>2. Choose source data</p>
                <span>Wingman uses what exists and shows what is missing.</span>
              </div>
            </div>

            <label className="wm-diagram-select-label">
              Project source
              <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                <option value="sample">Sample scaffold with blockers</option>
                {activeProject ? <option value="active">Active project - {activeProject.name}</option> : null}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {projectLabel(project)}
                  </option>
                ))}
              </select>
            </label>

            <div className="wm-diagram-coverage-grid">
              {coverage.map((item) => (
                <div key={item.label} data-ready={item.ready ? "true" : "false"}>
                  {item.ready ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="wm-diagram-card wm-diagram-next-action">
            <div className="wm-diagram-card-head">
              <Clipboard className="h-4 w-4" />
              <div>
                <p>3. Copy into Whimsical</p>
                <span>Use Mermaid paste first. No Whimsical API connection is used yet.</span>
              </div>
            </div>
            <div>
              <strong>{activeTemplate.title}</strong>
              <p>{activeTemplate.bestFor}</p>
            </div>
          </section>
        </aside>

        <DiagramPreviewPanel
          title={generated.title}
          summary={`${generated.summary} Source: ${generated.sourceLabel}.`}
          mermaid={generated.mermaid}
          blockers={generated.blockers}
          assumptions={generated.assumptions}
          stats={generated.stats}
        />
      </section>
    </main>
  );
}

export default VisualDesignStudioPage;
