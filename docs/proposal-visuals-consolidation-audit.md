# Proposal Visuals consolidation audit

## Objective

Create one Wingman feature for producing proposal-supporting visuals and explaining complex concepts. The unified feature should support:

1. simple customer-safe block diagrams;
2. exact technical schematics with device-to-device cable routing, references, labels and a legend/key;
3. photorealistic room/application concepts;
4. saving, revising and inserting the resulting visual into a proposal.

## Features audited

| Surface | Route | Current strength | Main limitation |
| --- | --- | --- | --- |
| Visual Studio | `/wingman/visual-studio` | Strong interactive React Flow canvas, project/product inputs, technical/customer modes, PNG/SVG/Visio/print export | No persistent proposal asset; sample-led UI; no cable schedule or room-render workflow |
| Visual Design | `/wingman/visual-design` | Broad project/product/template input, native schematic previews, topology checks, deployment concept, Mermaid generation | Duplicates schematic presentation; large mixed-purpose page; hand-off stored only in local storage |
| Native schematic engine | Internal `lib/schematic` modules | Best governed source of device nodes, transports, warnings, BOM hints and project-derived topology | Renderer is basic; routing/ports/cable IDs are not yet installation-document grade |
| Proposal visuals | Proposal model/export | Already reserves `visualBlocks` and renders a Supporting visuals section | Stores descriptions only; no image/SVG/model/revision or insertion lifecycle |
| Product visual prompts | Product story/workspace hand-off | Existing prompts describe representative room/application scenes | No actual image-generation service or governed project asset output |
| Vision attachment analysis | Ingest/API | Can classify and analyse room photos and schematic diagrams | Input analysis only; not an output-generation workflow |

## Key findings

### 1. Two front ends are presenting overlapping capabilities

Visual Studio and Visual Design both create system diagrams from project/product context. They use different intermediate models and renderers, which creates duplicated controls, naming, assumptions, legends and navigation.

The split is visible in Response Pack, which currently offers both **Visual Studio** and **Schematic Builder** as separate actions. A user should choose the required output, not choose between competing implementations.

### 2. The strongest foundations should be retained

- Keep the native schematic engine as the governed technical source of truth.
- Keep the React Flow canvas and its PNG, SVG, VSDX and print exporters.
- Keep `roomSchematicEngine` for proposal cable schedules.
- Keep product/project adapters such as `wholeProjectVisualDiagram`.
- Keep the existing product `visualPrompt` data as seed context for room concepts.

The consolidation should replace duplicate page orchestration, not discard these working engines.

### 3. The proposal integration is metadata-only

`StoredProposalVisualBlock` contains a title, summary, proposal use and export label, but no generated artifact. Proposal HTML therefore displays a descriptive card rather than the actual visual.

This is the principal architectural gap. Exporting a PNG to the Downloads folder is not the same as adding a governed visual to a project or proposal.

### 4. Technical schematics need a richer connection model

The current engines generally know node-to-node signal relationships. An XTEN-style drawing requires the connection itself to become a first-class record containing:

- source device and source port;
- destination device and destination port;
- signal family and transport;
- cable specification, cable ID and optional length;
- direction and route points;
- termination/connector notes;
- confirmed, assumed or by-others status;
- cross-reference into the legend and cable schedule.

Auto-routing can create the first pass, but users must be able to reposition devices and route orthogonal cable paths without losing semantic connection data.

### 5. Photorealistic output is feasible but must be explicitly conceptual

Product stories already provide useful scene prompts, and project discovery contains room/application context. A generated scene can materially improve a proposal, but it must not imply exact dimensions, verified installation positions or a guaranteed final appearance.

Every generated room image should carry:

- a **Concept visual** label;
- the source project and revision;
- an editable brief;
- a note that dimensions, finishes and installation positions require confirmation.

## Recommended unified feature

### Name and route

Use **Proposal Visuals** at `/wingman/proposal-visuals`.

Retain redirects from `/wingman/visual-studio` and `/wingman/visual-design` during migration. Response Pack, Product Positioning and Project Detail should all enter the same workspace with context parameters rather than linking to different tools.

### Start screen

Present three output choices:

1. **Block diagram** — simplified customer-safe explanation with minimal technical detail.
2. **Technical schematic** — exact products, ports, cable IDs, routes, legend and schedule.
3. **Room concept** — photorealistic or illustrative application scene.

Then select the source:

- active project;
- selected product;
- existing proposal/BOM;
- template;
- blank canvas.

### Shared workflow

1. **Choose visual type and purpose** — proposal, technical review, customer explanation or internal handover.
2. **Build first draft** — derive from the native project/schematic model.
3. **Edit and validate** — devices, labels, ports, cable routes, legend, assumptions and room brief.
4. **Review** — show missing information, risks, by-others scope and concept disclaimers.
5. **Save to project** — create a versioned visual asset.
6. **Add to proposal** — select placement, caption and customer-facing description.
7. **Export** — SVG, PNG, PDF/print and VSDX where appropriate.

## Canonical data model

Replace metadata-only proposal visual blocks with project-level assets. A proposal should reference asset IDs rather than own disconnected copies.

```ts
type ProposalVisualAsset = {
  id: string;
  projectId: string;
  kind: "block-diagram" | "technical-schematic" | "room-concept";
  title: string;
  purpose: "proposal" | "customer-explanation" | "technical-review" | "handover";
  status: "draft" | "review-required" | "approved";
  revision: number;
  source: {
    projectRevision?: string;
    productSkus: string[];
    templateId?: string;
  };
  model?: ProposalVisualModel;
  render: {
    svg?: string;
    pngDataUrl?: string;
    thumbnailDataUrl?: string;
    width: number;
    height: number;
  };
  caption: string;
  assumptions: string[];
  warnings: string[];
  createdAt: string;
  updatedAt: string;
};

type ProposalVisualConnection = {
  id: string;
  fromNodeId: string;
  fromPortId?: string;
  toNodeId: string;
  toPortId?: string;
  signal: "video" | "audio" | "control" | "network" | "usb" | "power";
  transport: string;
  cableId?: string;
  cableSpecification?: string;
  estimatedLengthM?: number;
  route: Array<{ x: number; y: number }>;
  status: "confirmed" | "assumed" | "by-others" | "review";
};
```

Store large raster assets in backend object storage rather than local storage. Store the semantic model and asset metadata with the project so visuals can be regenerated and revised.

## Output requirements

### Block diagram

- automatic left-to-right or top-to-bottom layout;
- simplified device/application labels;
- optional numbered walkthrough;
- customer-safe legend;
- hide ports, cable IDs and validation detail by default;
- SVG and PNG export.

### Technical schematic

- real product SKUs and third-party/by-others nodes;
- visible named ports where product evidence exists;
- orthogonal cable routing with manual control points;
- cable IDs on every route;
- colour/symbol coding that remains understandable in monochrome;
- legend/key containing signal type, line style, cable specification and status;
- cable schedule generated from the same connection records;
- drawing title block with project, drawing number, revision, author and date;
- A3/A2 print layouts, SVG, PNG, PDF and VSDX export;
- explicit review state when port or topology evidence is incomplete.

### Room concept

- prompt assembled from project application, room type, products, displays, placement and desired style;
- optional room/reference-image input;
- photorealistic and clean illustration modes;
- editable prompt/brief and variant generation;
- concept watermark/disclaimer;
- save selected variant to the project and proposal.

## UX consolidation

- Remove separate Visual Studio and Schematic Builder cards from Response Pack.
- Add one **Create proposal visual** action.
- Inside the unified feature, use a mode switcher for Block diagram, Technical schematic and Room concept.
- Use one persistent project/source bar and one review/export rail across all modes.
- Show progressive detail: canvas first, validation and advanced routing only when required.
- Never present sample diagrams ahead of an available active project; samples belong under “Start from template.”

## Implementation phases

### Phase 1 — consolidate navigation and persistence

- Create the Proposal Visuals route and shell.
- Move both current renderers behind the unified mode selector.
- Add project-level visual assets and real proposal asset references.
- Save SVG/PNG outputs into the project and render the actual asset in proposal exports.
- Redirect legacy routes.

### Phase 2 — customer block diagrams

- Add simplified node/edge presentation using the same canonical model.
- Provide auto-layout, captions and numbered walkthroughs.
- Add reusable application templates.

### Phase 3 — installation-grade schematic workflow

- Add product port evidence and explicit port-to-port connections.
- Add orthogonal route editing, cable IDs and route validation.
- Build the legend and cable schedule from the connection model.
- Add drawing revisions, title blocks and PDF output.

### Phase 4 — photorealistic concepts

- Add an image-generation service with project-aware prompt composition.
- Support reference room images and constrained product/application prompts.
- Store variants, approval state and disclaimers as project assets.

## Risks and controls

- **False precision:** never invent ports, cable types or lengths; mark missing evidence for review.
- **Proposal drift:** pin each asset to a project/product revision and warn when the BOM changes.
- **Raster storage:** use object storage and thumbnails, not local storage payloads.
- **Brand/product accuracy:** photorealistic concepts should not fabricate detailed branded hardware where no approved product image/reference is available.
- **Print accessibility:** legends must use text/line patterns as well as colour.
- **Over-complex UI:** progressive disclosure is essential; customer block diagrams should not expose installation controls.

## Acceptance criteria

The consolidation is complete when a user can:

1. open one visual workspace from a project or proposal;
2. choose block diagram, technical schematic or room concept;
3. generate a draft from current project data;
4. edit and review it without leaving the workspace;
5. save a revision to the project;
6. insert the actual visual into the proposal;
7. export it in the appropriate format;
8. see warnings if the project/BOM changes after the visual was approved.

## Recommendation

Proceed with the consolidation. Visual Studio should supply the primary interactive/export canvas, the native schematic engine should supply governed system truth, and Visual Design should be retired as a separate destination after its project adapters, validation panels and deployment brief are moved into Proposal Visuals.

Do not begin with photorealistic generation. First solve the canonical asset/persistence gap and unify the two diagram paths; otherwise a third generator will deepen the current fragmentation.
