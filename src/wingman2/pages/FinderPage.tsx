import { useMemo, useState } from "react";
import { Check, FolderPlus, Plus, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  readProjectStore,
  useProjectStore,
  writeProjectStore,
  type StoredProject,
} from "../data/projectStore";
import { PageHero } from "../components/PageHero";
import { RecommendationCard } from "../components/RecommendationCard";
import { SectionCard } from "../components/SectionCard";
import { StatusChip } from "../components/StatusChip";

type FinderProduct = {
  sku: string;
  title: string;
  status: "recommended" | "alternative" | "caution";
  tags: string[];
  description: string;
  rationale: string[];
  caution?: string;
};

type ProductSelection = {
  sku: string;
  title: string;
  status: FinderProduct["status"];
  tags: string[];
  addedAt: string;
  source: "Product Finder";
};

const PRODUCT_SELECTION_STORE_KEY = "wingman-project-product-selections-v1";

const products: FinderProduct[] = [
  {
    sku: "SW-640L-TX-W",
    title: "4x1 Presentation Switcher",
    status: "recommended",
    tags: ["Meeting room", "USB-C", "4K", "Presentation switch"],
    description:
      "Strong fit for small meeting environments that need simple source selection, familiar cabling, and fast rep-friendly positioning.",
    rationale: [
      "Matches small-to-medium meeting room switching needs.",
      "Supports a simple USB-C and HDMI presentation story.",
      "Good standalone product path when a full project has not been opened yet.",
    ],
    caution: "Validate whether receiver, USB peripherals, and accessory set should be included.",
  },
  {
    sku: "SW-510W-TX",
    title: "Wireless / wired collaboration TX",
    status: "alternative",
    tags: ["Meeting room", "USB-C", "Wireless", "Collaboration"],
    description:
      "Useful when the requirement includes a stronger collaboration story around wired and wireless presentation workflows.",
    rationale: [
      "Useful alternative where wireless presentation is part of the brief.",
      "Keeps the Product Finder useful without forcing a project workflow.",
      "Can be added to a project later if the opportunity becomes live.",
    ],
    caution: "Confirm wireless expectations and conferencing path before proposal.",
  },
  {
    sku: "MX-0402-MST",
    title: "Matrix option for expanded routing",
    status: "caution",
    tags: ["Dual display", "MST", "Routing", "Presentation"],
    description:
      "Consider when the conversation moves beyond simple source selection into dual-screen routing or MST-style behaviour.",
    rationale: [
      "Potential fit where dual display behaviour is required.",
      "Better treated as a system architecture choice rather than a quick single-SKU add.",
      "Useful as a comparison path during early qualification.",
    ],
    caution: "Validate MST, display mode, source compatibility, and receiver/output requirements.",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readProductSelections(): Record<string, ProductSelection[]> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(PRODUCT_SELECTION_STORE_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, ProductSelection[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeProductSelections(selections: Record<string, ProductSelection[]>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PRODUCT_SELECTION_STORE_KEY, JSON.stringify(selections));
  window.dispatchEvent(new CustomEvent("wingman:project-product-selections-updated"));
}

function productToSelection(product: FinderProduct): ProductSelection {
  return {
    sku: product.sku,
    title: product.title,
    status: product.status,
    tags: product.tags,
    addedAt: nowIso(),
    source: "Product Finder",
  };
}

function addProductToProject(projectId: string, product: FinderProduct) {
  const selections = readProductSelections();
  const existing = selections[projectId] ?? [];
  const withoutDuplicate = existing.filter((item) => item.sku !== product.sku);

  writeProductSelections({
    ...selections,
    [projectId]: [productToSelection(product), ...withoutDuplicate],
  });

  const snapshot = readProjectStore();
  const projects = snapshot.projects.map((project) =>
    project.id === projectId
      ? {
          ...project,
          stage: "Finder" as const,
          status: product.status,
          resumeTo: routeCatalogByKey.finder.path,
          updated: "Just now",
          updatedAt: nowIso(),
        }
      : project,
  );

  writeProjectStore({
    ...snapshot,
    projects,
  });
}

function createProjectFromProduct(projectName: string, owner: string, product: FinderProduct) {
  const snapshot = readProjectStore();
  const timestamp = nowIso();
  const id = createId("finder-project");

  const project: StoredProject = {
    id,
    name: projectName.trim() || `${product.sku} Product Selection`,
    owner: owner.trim() || "Finder user",
    stage: "Finder",
    status: product.status,
    updated: "Just now",
    resumeTo: routeCatalogByKey.finder.path,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeProjectStore({
    ...snapshot,
    projects: [project, ...snapshot.projects],
  });

  addProductToProject(id, product);

  return project;
}

export function FinderPage() {
  const { projects } = useProjectStore();
  const [selectedProduct, setSelectedProduct] = useState<FinderProduct | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectOwner, setNewProjectOwner] = useState("Steve");
  const [message, setMessage] = useState("");

  const bestMatch = products[0];

  const activeProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  function openAddPanel(product: FinderProduct) {
    setSelectedProduct(product);
    setSelectedProjectId(projects[0]?.id ?? "");
    setNewProjectName(`${product.sku} Selection`);
    setMessage("");
  }

  function closeAddPanel() {
    setSelectedProduct(null);
    setSelectedProjectId("");
    setMessage("");
  }

  function addToExistingProject() {
    if (!selectedProduct || !selectedProjectId) {
      return;
    }

    addProductToProject(selectedProjectId, selectedProduct);
    setMessage(`Added ${selectedProduct.sku} to ${activeProject?.name ?? "selected project"}.`);
  }

  function addToNewProject() {
    if (!selectedProduct) {
      return;
    }

    const project = createProjectFromProduct(newProjectName, newProjectOwner, selectedProduct);
    setSelectedProjectId(project.id);
    setMessage(`Created ${project.name} and added ${selectedProduct.sku}.`);
  }

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Product Finder"
        title="Find a product first. Attach it to a project only when needed."
        purpose="Product Finder is a standalone selection workspace for quick product direction. It does not assume an active project, but any shortlisted product can be added to a new or existing project when the opportunity becomes real."
        nextMove="Search or review the best-fit path, then optionally attach the selected product to a project, compare page, or proposal workflow."
        actions={[
          { label: "Open compare", to: routeCatalogByKey.compare.path },
          { label: "Open projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Standalone finder workspace"
        subtitle="Use this page independently for fast product direction. Project linking is optional and explicit."
      >
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-amber-950">Standalone mode</p>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                No project is required to use Product Finder. Use <strong>Add to project</strong> only when you want to save a
                selected product against an opportunity.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-black text-amber-800">
              <Search className="h-3.5 w-3.5" />
              Project optional
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[250px_1fr_360px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Finder filters</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              These are standalone selection cues, not project ownership fields.
            </p>

            <div className="mt-4 space-y-4 text-sm">
              {[
                "Application: Meeting room",
                "Inputs: 2",
                "Display outputs: 1",
                "USB-C: Required",
                "Cable type: HDMI + USB-C",
                "Control: Basic room control",
              ].map((line) => (
                <div key={line} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-700">
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.sku} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{product.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{product.sku}</p>
                  </div>

                  <StatusChip
                    label={
                      product.status === "recommended"
                        ? "Recommended"
                        : product.status === "alternative"
                          ? "Alternative"
                          : "Caution"
                    }
                    variant={product.status}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {product.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="mt-4 text-sm text-slate-700">{product.description}</p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to={routeCatalogByKey.compare.path}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Compare fit
                  </Link>

                  <button
                    type="button"
                    onClick={() => openAddPanel(product)}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Add to project
                  </button>
                </div>
              </div>
            ))}
          </div>

          <RecommendationCard
            title="Best Match"
            sku={bestMatch.sku}
            status={bestMatch.status}
            confidence={89}
            rationale={bestMatch.rationale}
            caution={bestMatch.caution}
            actionTo={routeCatalogByKey.compare.path}
          />
        </div>
      </SectionCard>

      {selectedProduct ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-5 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Add product to project</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">{selectedProduct.sku}</h2>
                <p className="mt-1 text-sm text-slate-300">{selectedProduct.title}</p>
              </div>

              <button
                type="button"
                onClick={closeAddPanel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                aria-label="Close add to project panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-black">Add to existing project</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Select an existing opportunity and attach this product to it.
                </p>

                <select
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-amber-400"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={addToExistingProject}
                  disabled={!selectedProjectId}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  Add to existing project
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-black">Create new project</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Start a new Finder-stage project with this product attached.
                </p>

                <input
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                  placeholder="Project name"
                  className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-amber-400"
                />

                <input
                  value={newProjectOwner}
                  onChange={(event) => setNewProjectOwner(event.target.value)}
                  placeholder="Owner"
                  className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-amber-400"
                />

                <button
                  type="button"
                  onClick={addToNewProject}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-slate-100"
                >
                  <FolderPlus className="h-4 w-4" />
                  Create project and add
                </button>
              </div>
            </div>

            {message ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
                <Check className="h-4 w-4" />
                {message}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Link
                to={routeCatalogByKey.projects.path}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-black text-slate-200 transition hover:bg-white/10"
              >
                Open projects
              </Link>

              <Link
                to={routeCatalogByKey.proposal.path}
                className="rounded-full bg-slate-200 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-white"
              >
                Continue to proposal
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default FinderPage;