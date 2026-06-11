import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clipboard, Database, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { DiagramPreviewPanel } from "../components/DiagramPreviewPanel";
import { PageHero } from "../components/PageHero";
import { readProductWorkspaceHandoff, type ProductWorkspaceHandoff } from "../data/productWorkspaceHandoff";
import { writeSchematicWorkspaceHandoff } from "../data/schematicWorkspaceHandoff";
import { useProjectStore, type StoredProject } from "../data/projectStore";
import {
  DIAGRAM_TEMPLATES,
  diagramTemplateFor,
  generateDiagram,
  type DiagramGenerationResult,
  type DiagramTypeId,
} from "../lib/diagramTemplates";

type SchematicSourceId = "active" | "product-workspace" | "tbc" | string;

function projectCoverage(project?: StoredProject | null) {
  return [
    { label: "Discovery", ready: Boolean(project?.discoveryBrief || project?.requirements?.length || project?.ingest) },
    { label: "Products", ready: Boolean(project?.productSelections?.length || project?.proposal?.products?.length) },
    { label: "Compare", ready: Boolean(project?.compareRuns?.length) },
    { label: "Response pack", ready: Boolean(project?.proposal) },
  ];
}

function productCoverage(productHandoff: ProductWorkspaceHandoff | null) {
  return [
    { label: "Product", ready: Boolean(productHandoff?.sku) },
    { label: "Connection view", ready: Boolean(productHandoff?.diagramSource && productHandoff?.diagramOutput) },
    { label: "Room visual", ready: Boolean(productHandoff?.visualPrompt) },
    { label: "Checks", ready: Boolean(productHandoff?.checks?.length) },
  ];
}

function projectLabel(project: StoredProject) {
  const pieces = [project.name, project.stage, project.updated].filter(Boolean);
  return pieces.join(" - ");
}

function escapeMermaidLabel(value: string) {
  return value
    .replace(/"/g, "'")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/\|/g, "-")
    .trim();
}

function tbcNode(label: string) {
  return `${label} TBC`;
}

function buildProductHandoffDiagram(
  productHandoff: ProductWorkspaceHandoff,
  diagramType: DiagramTypeId
): DiagramGenerationResult {
  const sourceLabel = escapeMermaidLabel(productHandoff.diagramSource || tbcNode("Source / input"));
  const productLabel = escapeMermaidLabel(`${productHandoff.sku} - ${productHandoff.productType || productHandoff.name}`);
  const destinationLabel = escapeMermaidLabel(productHandoff.diagramOutput || tbcNode("Destination / output"));
  const checks = productHandoff.checks?.length
    ? productHandoff.checks.slice(0, 5)
    : ["Confirm source, destination, cable path, control and wider system requirements before customer issue."];

  const checkLines = checks
    .map((check, index) => `  product --> check_${index + 1}["${escapeMermaidLabel(check)}"]`)
    .join("\n");

  const mermaid = [
    "flowchart LR",
    `  source["${sourceLabel}"]`,
    `  product["${productLabel}"]`,
    `  destination["${destinationLabel}"]`,
    '  tbc_audio["Audio path TBC"]',
    '  tbc_control["Control path TBC"]',
    '  tbc_network["Network path TBC"]',
    "  source --> product",
    "  product --> destination",
    "  product -.-> tbc_audio",
    "  product -.-> tbc_control",
    "  product -.-> tbc_network",
    checkLines,
  ].filter(Boolean).join("\n");

  return {
    diagramType,
    title: `${productHandoff.sku} product schematic`,
    summary: productHandoff.headline || productHandoff.summary || "Product connection view from Product Workspace handoff.",
    sourceLabel: "Product Workspace",
    mermaid,
    blockers: checks,
    assumptions: [
      "This schematic is product-led. Use Discovery or Projects to add full room context.",
      "TBC blocks should remain visible until the source, destination, audio, network and control paths are confirmed.",
      productHandoff.purpose || "Confirm product purpose before customer issue.",
    ].filter(Boolean),
    stats: [
      { label: "Product", value: productHandoff.sku },
      { label: "Context", value: "Product handoff" },
      { label: "Open checks", value: String(checks.length) },
    ],
  };
}

function buildTbcDiagram(diagramType: DiagramTypeId): DiagramGenerationResult {
  return {
    diagramType,
    title: "TBC schematic scaffold",
    summary: "Start here when no active project or product handoff exists. Replace TBC blocks as Discovery, Product Finder and Product Workspace add real context.",
    sourceLabel: "TBC scaffold",
    mermaid: [
      "flowchart LR",
      '  source["Source / input TBC"]',
      '  wyrestorm["WyreStorm product path TBC"]',
      '  destination["Display / destination TBC"]',
      '  usb["USB devices / host TBC"]',
      '  audio["Audio path TBC"]',
      '  network["Network / control TBC"]',
      "  source --> wyrestorm",
      "  wyrestorm --> destination",
      "  usb -.-> wyrestorm",
      "  audio -.-> wyrestorm",
      "  network -.-> wyrestorm",
    ].join("\n"),
    blockers: [
      "No project or product handoff selected.",
      "Confirm source count, display count, USB, audio, control, network and distance.",
    ],
    assumptions: [
      "Use this scaffold only as a starting point.",
      "Do not issue as a final design until real products and room context are added.",
    ],
    stats: [
      { label: "Products", value: "TBC" },
      { label: "Sources", value: "TBC" },
      { label: "Blockers", value: "2" },
    ],
  };
}

export function VisualDesignStudioPage() {
  const { projects, activeProjectId, activeProject } = useProjectStore();
  const [productHandoff, setProductHandoff] = useState<ProductWorkspaceHandoff | null>(() => readProductWorkspaceHandoff());
  const [diagramType, setDiagramType] = useState<DiagramTypeId>("signal-flow");
  const [selectedSourceId, setSelectedSourceId] = useState<SchematicSourceId>(() => {
    if (activeProjectId) return "active";
    if (readProductWorkspaceHandoff()) return "product-workspace";
    if (projects[0]?.id) return projects[0].id;
    return "tbc";
  });
  const [visualPromptCopied, setVisualPromptCopied] = useState(false);

  useEffect(() => {
    const syncProductHandoff = () => {
      const next = readProductWorkspaceHandoff();
      setProductHandoff(next);

      if (next && selectedSourceId === "tbc") {
        setSelectedSourceId("product-workspace");
      }
    };

    window.addEventListener("storage", syncProductHandoff);
    window.addEventListener("wingman:product-workspace-handoff-updated", syncProductHandoff);

    return () => {
      window.removeEventListener("storage", syncProductHandoff);
      window.removeEventListener("wingman:product-workspace-handoff-updated", syncProductHandoff);
    };
  }, [selectedSourceId]);

  const selectedProject = useMemo(() => {
    if (selectedSourceId === "active") return activeProject;
    if (selectedSourceId === "product-workspace" || selectedSourceId === "tbc") return null;
    return projects.find((project) => project.id === selectedSourceId) ?? null;
  }, [activeProject, projects, selectedSourceId]);

  const generated = useMemo(() => {
    if (selectedSourceId === "product-workspace" && productHandoff) {
      return buildProductHandoffDiagram(productHandoff, diagramType);
    }

    if (selectedSourceId === "tbc") {
      return buildTbcDiagram(diagramType);
    }

    return generateDiagram({ diagramType, project: selectedProject });
  }, [diagramType, productHandoff, selectedProject, selectedSourceId]);

  useEffect(() => {
    writeSchematicWorkspaceHandoff({
      title: generated.title,
      summary: generated.summary,
      sourceLabel: generated.sourceLabel,
      mermaid: generated.mermaid,
      blockers: generated.blockers,
      assumptions: generated.assumptions,
      stats: generated.stats,
      productSku: productHandoff?.sku,
      visualPrompt: productHandoff?.visualPrompt,
    });
  }, [generated, productHandoff]);
  const activeTemplate = diagramTemplateFor(diagramType);
  const coverage = selectedSourceId === "product-workspace" ? productCoverage(productHandoff) : projectCoverage(selectedProject);

  const copyVisualPrompt = () => {
    if (!productHandoff?.visualPrompt || !navigator.clipboard) return;

    void navigator.clipboard.writeText(productHandoff.visualPrompt).then(() => {
      setVisualPromptCopied(true);
      window.setTimeout(() => setVisualPromptCopied(false), 1500);
    });
  };

  return (
    <main className="wm-visual-design-page" data-wingman-schematic-builder="true">
      <PageHero
        eyebrow="Schematic Builder"
        title="Create an end-to-end AV schematic with WyreStorm devices and TBC products."
        purpose="Use this to visualise how the complete system connects: customer sources, WyreStorm products, displays, USB devices, audio, control, network and any unknown products that still need specifying."
        nextMove="Choose the source data, pick a schematic purpose, then use the blockers as the next customer questions before the response pack is issued."
        actions={[
          { label: "Open Product Workspace", to: routeCatalogByKey.productPitch.path },
          { label: "Open Response Pack", to: routeCatalogByKey.responsePack.path, variant: "secondary" },
        ]}
      />

      <section className="wm-diagram-studio-shell">
        <aside className="wm-diagram-control-panel">
          <section className="wm-diagram-card">
            <div className="wm-diagram-card-head">
              <Database className="h-4 w-4" />
              <div>
                <p>1. Choose source data</p>
                <span>Use an active project, product handoff or TBC scaffold.</span>
              </div>
            </div>

            <label className="wm-diagram-select-label">
              Schematic source
              <select value={selectedSourceId} onChange={(event) => setSelectedSourceId(event.target.value)}>
                {activeProject ? <option value="active">Active project - {activeProject.name}</option> : null}
                {productHandoff ? <option value="product-workspace">Product Workspace - {productHandoff.sku}</option> : null}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {projectLabel(project)}
                  </option>
                ))}
                <option value="tbc">TBC scaffold - build from missing information</option>
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

          <section className="wm-diagram-card">
            <div className="wm-diagram-card-head">
              <Workflow className="h-4 w-4" />
              <div>
                <p>2. Choose schematic purpose</p>
                <span>Start from what the salesperson needs to explain.</span>
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

          {productHandoff ? (
            <section className="wm-diagram-card">
              <div className="wm-diagram-card-head">
                <Clipboard className="h-4 w-4" />
                <div>
                  <p>Product visual context</p>
                  <span>Stored from Product Workspace.</span>
                </div>
              </div>

              <div>
                <strong>{productHandoff.sku}</strong>
                <p>{productHandoff.headline}</p>
              </div>

              <button type="button" className="wm-button-secondary" onClick={copyVisualPrompt}>
                {visualPromptCopied ? "Copied" : "Copy room visual prompt"}
              </button>
            </section>
          ) : null}

          <section className="wm-diagram-card wm-diagram-next-action">
            <div className="wm-diagram-card-head">
              <Clipboard className="h-4 w-4" />
              <div>
                <p>3. Output</p>
                <span>Copy the Mermaid while the visual editor is being developed.</span>
              </div>
            </div>

            <div>
              <strong>{activeTemplate.title}</strong>
              <p>{activeTemplate.bestFor}</p>
            </div>

            <Link className="wm-button-secondary" to={routeCatalogByKey.responsePack.path}>
              Add schematic to response pack
            </Link>
          </section>
        </aside>

        <DiagramPreviewPanel
          title={generated.title}
          summary={`${generated.summary} Source: ${generated.sourceLabel}. Keep TBC blocks visible until specified.`}
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