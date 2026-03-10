# Wingman Catalogue Binding Prep

Generated: 20260308_204450

## Candidate catalogue source files

### _ARCHIVE\Dedupe_20260305_185814\src\features\misc\ProductCatalogPage.tsx
- `import { addToCart } from "@/proposal/QuoteCartService";`
- `import { listAll, isSelectable } from "@/catalog/CatalogService";`
- `import type { Product } from "@/catalog/model";`
- `return (<div className="wm-page">`
- `<span className="wm-chip" style={{ marginRight: 8 }}>`
- `export default function ProductCatalogPage() {`
- `const [family, setFamily] = React.useState<string>("All");`
- `const set = new Set(all.map(p => p.family).filter(Boolean) as string[]);`
- `.filter(p => (family === "All" ? true : p.family === family))`
- `p.sku.toLowerCase().includes(qq) ||`
- `p.name.toLowerCase().includes(qq) ||`
- `(p.category || "").toLowerCase().includes(qq) ||`
- `.sort((a, b) => a.sku.localeCompare(b.sku));`
- `}, [all, q, family]);`
- `<div className="wm-page wm-container">`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-card-title">Product Catalog</div>`
- `<div className="wm-muted" style={{ marginTop: 6 }}>`
- `Seed dataset (Phase 2). Next: replace with real Wingman catalog.`
- `onChange={(e) => setQ(e.target.value)}`
- `placeholder="Search SKU / name / category / role…"`
- `<select value={family} onChange={(e) => setFamily(e.target.value)} style={{ padding: 10 }}>`
- `<th style={{ padding: "10px 8px" }}>SKU</th>`
- `<th style={{ padding: "10px 8px" }}>Name</th>`
- `<tr key={p.sku} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>`

### _ARCHIVE\Dedupe_20260305_185814\src\features\tools\ProductCatalogPage.tsx
- `// src/features/tools/ProductCatalogPage.tsx`
- `getActiveProject,`
- `updateProjectCatalogSelection,`
- `import type { DiscoveryProductFamily } from "@/features/discovery/DiscoveryWizardPage";`
- `type CatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: DiscoveryProductFamily;`
- `const SEED_ITEMS: CatalogItem[] = [`
- `{ sku: "APO-100-TX", name: "Apollo Transmitter", family: "Apollo", notes: "Collaboration / BYOD workflows" },`
- `{ sku: "APO-100-RX", name: "Apollo Receiver", family: "Apollo", notes: "Room-side endpoint" },`
- `{ sku: "HDB-200-TX", name: "HDBaseT TX", family: "HDBaseT", notes: "Point-to-point extension" },`
- `{ sku: "HDB-200-RX", name: "HDBaseT RX", family: "HDBaseT", notes: "Receiver endpoint" },`
- `{ sku: "NHD-400-TX", name: "AVoIP Encoder", family: "AVoIP", notes: "Scalable networked AV" },`
- `{ sku: "NHD-400-RX", name: "AVoIP Decoder", family: "AVoIP", notes: "Distributed endpoint" },`
- `{ sku: "MAT-44", name: "4x4 Matrix", family: "Matrix", notes: "Fixed I/O switching" },`
- `{ sku: "USB-EXT-01", name: "USB Extender", family: "USB Extension", notes: "Peripheral extension" },`
- `{ sku: "VWP-CTRL-01", name: "Video Wall Controller", family: "Video Wall", notes: "Wall processing and control" },`
- `export default function ProductCatalogPage() {`
- `const activeProject = getActiveProject();`
- `const [selectedSkus, setSelectedSkus] = React.useState<string[]>(`
- `Array.isArray(activeProject?.catalog?.skus) ? activeProject!.catalog!.skus : []`
- `(recommendedFamilies as DiscoveryProductFamily[]).includes(item.family)`
- `function toggleSku(sku: string) {`
- `setSelectedSkus((prev) =>`

### _RESCUE_CatalogNavFix_20260308_184121\src__features__catalog__catalogIntelligence.ts
- `export type CatalogRecommendation = {`
- `family: string;`
- `sku: string;`
- `name: string;`
- `export type CatalogIntelligence = {`
- `primaryFamily: string;`
- `sku: string;`
- `name: string;`
- `{ sku: "APO-210-UC", name: "Apollo UC Switcher", role: "Room hub / collaboration" },`
- `{ sku: "APO-100-TX", name: "Apollo Input Transmitter", role: "Local source input" },`
- `{ sku: "APO-100-RX", name: "Apollo Receiver", role: "Display endpoint" },`
- `{ sku: "EX-70-H2", name: "HDBaseT Extender Set", role: "Point-to-point transport" },`
- `{ sku: "MX-0402-HDBT", name: "HDBaseT Matrix", role: "Switching and extension" },`
- `{ sku: "RX-HDBT-SCALER", name: "Scaled HDBaseT Receiver", role: "Display endpoint" },`
- `{ sku: "NHD-500-TX", name: "NetworkHD Encoder", role: "Source encoder" },`
- `{ sku: "NHD-500-RX", name: "NetworkHD Decoder", role: "Display decoder" },`
- `{ sku: "NHD-CTL-PRO", name: "NetworkHD Controller", role: "System orchestration" },`
- `{ sku: "VW-PROC-4K", name: "Video Wall Processor", role: "Wall processing" },`
- `{ sku: "NHD-DEC-WALL", name: "Wall Display Decoder", role: "Wall endpoint" },`
- `{ sku: "CTRL-WALL-TOUCH", name: "Wall Control Interface", role: "Control layer" },`
- `{ sku: "SW-0401-H2", name: "4x1 Switcher", role: "Core switching" },`
- `{ sku: "DA-14-H2", name: "1x4 Distribution Amplifier", role: "Signal distribution" },`
- `{ sku: "EXT-USB-H2", name: "USB / HDMI Extension", role: "Extension support" },`
- `export function buildCatalogIntelligence(state: WingmanProjectState): CatalogIntelligence {`
- `let primaryFamily = "Core AV Switching";`

### _RESCUE_DataWiring_20260308_111200\src_features_catalog_ProductCatalogPage.tsx
- `type CatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: string;`
- `const ITEMS: CatalogItem[] = [`
- `{ sku: "APO-210-UC", name: "Apollo UC Switcher", family: "Apollo", role: "BYOD / meeting room", fit: "Simple room systems" },`
- `{ sku: "MX-0402-MST-H2A", name: "Presentation Matrix", family: "Matrix", role: "Switching", fit: "Multi-source rooms" },`
- `{ sku: "NHD-110-RX", name: "AVoIP Decoder", family: "AVoIP", role: "Endpoint", fit: "Scalable IP distribution" },`
- `{ sku: "NHD-140-TX", name: "AVoIP Encoder", family: "AVoIP", role: "Endpoint", fit: "Source ingest" },`
- `{ sku: "EX-70-H2", name: "HDBaseT Extender Set", family: "HDBaseT", role: "Extension", fit: "Point-to-point extension" },`
- `{ sku: "SW-640L-TX-W", name: "Wallplate Transmitter", family: "HDBaseT", role: "Input plate", fit: "Table / wall input" },`
- `export default function ProductCatalogPage() {`
- `const [family, setFamily] = React.useState("All");`
- `const familyOk = family === "All" || item.family === family;`
- `item.sku.toLowerCase().includes(q) ||`
- `item.name.toLowerCase().includes(q) ||`
- `return familyOk && queryOk;`
- `}, [family, query]);`
- `title="Product Catalog"`
- `subtitle="Browse WyreStorm products with clearer filtering and a shortlist-first workflow."`
- `<div className="wm-toolbar">`
- `<button className="wm-btn-secondary" type="button">Export List</button>`
- `<button className="wm-btn-primary" type="button">Add Selected to Project</button>`
- `<div className="wm-hero">`
- `<div className="wm-heroCard">`

### _RESCUE_LiveProjectBinding_20260308_204136\ProductCatalogPage.tsx
- `import { addProjectSku } from "@/state/wingmanProjectStore";`
- `type CatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: string;`
- `const ITEMS: CatalogItem[] = [`
- `{ sku: "APO-210-UC", name: "Apollo UC Switcher", family: "Apollo", role: "Room hub", fit: "Meeting rooms" },`
- `{ sku: "NHD-110-RX", name: "AVoIP Decoder", family: "AVoIP", role: "Endpoint", fit: "IP distribution" },`
- `{ sku: "NHD-140-TX", name: "AVoIP Encoder", family: "AVoIP", role: "Source ingest", fit: "IP distribution" },`
- `{ sku: "EX-70-H2", name: "HDBaseT Extender", family: "HDBaseT", role: "Extension", fit: "Point-to-point extension" }`
- `export default function ProductCatalogPage() {`
- `function add(item: CatalogItem){`
- `addProjectSku({`
- `sku: item.sku,`
- `name: item.name,`
- `alert(item.sku + " added to project BOM");`
- `title="Product Catalog"`
- `subtitle="Select WyreStorm products and add them to the project BOM."`
- `<PageSection title="Catalog">`
- `<div className="wm-list">`
- `<div key={item.sku} className="wm-listItem">`
- `<div className="wm-listItem__body">`
- `<div className="wm-listItem__title">{item.sku} — {item.name}</div>`
- `<div className="wm-listItem__meta">{item.role} · {item.fit}</div>`
- `<div className="wm-right">`

### _RESCUE_NextPass_WorkspacePages_20260308_110907\src_features_catalog_ProductCatalogPage.tsx
- `export default function ProductCatalogPage() {`
- `title="Product Catalog"`
- `subtitle="Browse WyreStorm products with cleaner filtering and a more focused shortlist flow."`
- `<div className="wm-hero">`
- `<div className="wm-heroCard">`
- `<span className="wm-kicker">Focused Layout</span>`
- `<h3>Product Catalog</h3>`
- `<p>The catalog should be selection-led, not just a long list of products.</p>`
- `<div className="wm-heroCard">`
- `<span className="wm-kicker">Wingman Guidance</span>`
- `title="Catalog View"`
- `subtitle="Browse WyreStorm products with cleaner filtering and a more focused shortlist flow."`
- `<div className="wm-tool-grid">`
- `<div className="wm-tool">`
- `<span className="wm-tool__tag">Primary</span>`
- `<h4>Catalog View</h4>`
- `<p>Prioritise fit-for-purpose products, product-family filters, and clear add-to-project actions.</p>`
- `<div className="wm-tool">`
- `<span className="wm-tool__tag">Support</span>`
- `<p>Surface product family, role, range, and suitability before deep technical detail.</p>`

### _RESCUE_Wingman_LayoutAndGuru_20260308_102129\src_features_catalog_ProductCatalogPage.tsx
- `export default function ProductCatalogPage() {`
- `title="Product Catalog"`
- `subtitle="Browse WyreStorm products with cleaner filtering and a more focused shortlist flow."`
- `<div className="wm-hero">`
- `<div className="wm-heroCard">`
- `<span className="wm-kicker">Focused Layout</span>`
- `<h3>Product Catalog</h3>`
- `<p>The catalog should be selection-led, not just a long list of products.</p>`
- `<div className="wm-heroCard">`
- `<span className="wm-kicker">Wingman Guidance</span>`
- `title="Catalog View"`
- `subtitle="Browse WyreStorm products with cleaner filtering and a more focused shortlist flow."`
- `<div className="wm-tool-grid">`
- `<div className="wm-tool">`
- `<span className="wm-tool__tag">Primary</span>`
- `<h4>Catalog View</h4>`
- `<p>Prioritise fit-for-purpose products, product-family filters, and clear add-to-project actions.</p>`
- `<div className="wm-tool">`
- `<span className="wm-tool__tag">Support</span>`
- `<p>Surface product family, role, range, and suitability before deep technical detail.</p>`

### _RESCUE\Bundle03_Persistence_20260304_195947\src\features\tools\ProductCatalogPage.tsx
- `// src/features/tools/ProductCatalogPage.tsx`
- `getActiveProject,`
- `updateProjectCatalogSelection,`
- `import type { DiscoveryProductFamily } from "@/features/discovery/DiscoveryWizardPage";`
- `type CatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: DiscoveryProductFamily;`
- `const SEED_ITEMS: CatalogItem[] = [`
- `{ sku: "APO-100-TX", name: "Apollo Transmitter", family: "Apollo", notes: "Collaboration / BYOD workflows" },`
- `{ sku: "APO-100-RX", name: "Apollo Receiver", family: "Apollo", notes: "Room-side endpoint" },`
- `{ sku: "HDB-200-TX", name: "HDBaseT TX", family: "HDBaseT", notes: "Point-to-point extension" },`
- `{ sku: "HDB-200-RX", name: "HDBaseT RX", family: "HDBaseT", notes: "Receiver endpoint" },`
- `{ sku: "NHD-400-TX", name: "AVoIP Encoder", family: "AVoIP", notes: "Scalable networked AV" },`
- `{ sku: "NHD-400-RX", name: "AVoIP Decoder", family: "AVoIP", notes: "Distributed endpoint" },`
- `{ sku: "MAT-44", name: "4x4 Matrix", family: "Matrix", notes: "Fixed I/O switching" },`
- `{ sku: "USB-EXT-01", name: "USB Extender", family: "USB Extension", notes: "Peripheral extension" },`
- `{ sku: "VWP-CTRL-01", name: "Video Wall Controller", family: "Video Wall", notes: "Wall processing and control" },`
- `export default function ProductCatalogPage() {`
- `const activeProject = getActiveProject();`
- `const [selectedSkus, setSelectedSkus] = useState<string[]>(`
- `Array.isArray(activeProject?.catalog?.skus) ? activeProject!.catalog!.skus : []`
- `(recommendedFamilies as DiscoveryProductFamily[]).includes(item.family)`
- `function toggleSku(sku: string) {`
- `setSelectedSkus((prev) =>`

### _RESCUE\CatalogFixType_20260304_164123\ProductCatalogPage.tsx
- `// src/features/tools/ProductCatalogPage.tsx`
- `import { getActiveProject } from "@/features/projects/projectStore";`
- `import type { DiscoveryProductFamily } from "@/features/discovery/DiscoveryWizardPage";`
- `type CatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: DiscoveryProductFamily | "Other";`
- `const SEED_ITEMS: CatalogItem[] = [`
- `{ sku: "APO-100-TX", name: "Apollo Transmitter", family: "Apollo", notes: "Collaboration / BYOD workflows" },`
- `{ sku: "APO-100-RX", name: "Apollo Receiver", family: "Apollo", notes: "Room-side endpoint" },`
- `{ sku: "HDB-200-TX", name: "HDBaseT TX", family: "HDBaseT", notes: "Point-to-point extension" },`
- `{ sku: "HDB-200-RX", name: "HDBaseT RX", family: "HDBaseT", notes: "Receiver endpoint" },`
- `{ sku: "NHD-400-TX", name: "AVoIP Encoder", family: "AVoIP", notes: "Scalable networked AV" },`
- `{ sku: "NHD-400-RX", name: "AVoIP Decoder", family: "AVoIP", notes: "Distributed endpoint" },`
- `{ sku: "MAT-44", name: "4x4 Matrix", family: "Matrix", notes: "Fixed I/O switching" },`
- `{ sku: "USB-EXT-01", name: "USB Extender", family: "USB Extension", notes: "Peripheral extension" },`
- `{ sku: "VWP-CTRL-01", name: "Video Wall Controller", family: "Video Wall", notes: "Wall processing and control" },`
- `export default function ProductCatalogPage() {`
- `const activeProject = getActiveProject();`
- `return SEED_ITEMS.filter((item) => recommendedFamilies.includes(item.family));`
- `<div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>Product Catalog</div>`
- `<Chip>Project: {activeProject?.name || "No active project"}</Chip>`
- `key={item.sku}`
- `<div style={{ fontWeight: 800 }}>{item.name}</div>`
- `<div style={{ opacity: 0.7, fontSize: 12 }}>{item.sku}</div>`

### _RESCUE\CatalogSaveSelection_20260304_173207\ProductCatalogPage.tsx
- `// src/features/tools/ProductCatalogPage.tsx`
- `import { getActiveProject } from "@/features/projects/projectStore";`
- `import type { DiscoveryProductFamily } from "@/features/discovery/DiscoveryWizardPage";`
- `type CatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: DiscoveryProductFamily;`
- `const SEED_ITEMS: CatalogItem[] = [`
- `{ sku: "APO-100-TX", name: "Apollo Transmitter", family: "Apollo", notes: "Collaboration / BYOD workflows" },`
- `{ sku: "APO-100-RX", name: "Apollo Receiver", family: "Apollo", notes: "Room-side endpoint" },`
- `{ sku: "HDB-200-TX", name: "HDBaseT TX", family: "HDBaseT", notes: "Point-to-point extension" },`
- `{ sku: "HDB-200-RX", name: "HDBaseT RX", family: "HDBaseT", notes: "Receiver endpoint" },`
- `{ sku: "NHD-400-TX", name: "AVoIP Encoder", family: "AVoIP", notes: "Scalable networked AV" },`
- `{ sku: "NHD-400-RX", name: "AVoIP Decoder", family: "AVoIP", notes: "Distributed endpoint" },`
- `{ sku: "MAT-44", name: "4x4 Matrix", family: "Matrix", notes: "Fixed I/O switching" },`
- `{ sku: "USB-EXT-01", name: "USB Extender", family: "USB Extension", notes: "Peripheral extension" },`
- `{ sku: "VWP-CTRL-01", name: "Video Wall Controller", family: "Video Wall", notes: "Wall processing and control" },`
- `export default function ProductCatalogPage() {`
- `const activeProject = getActiveProject();`
- `return SEED_ITEMS.filter((item) => (recommendedFamilies as DiscoveryProductFamily[]).includes(item.family));`
- `<div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>Product Catalog</div>`
- `<Chip>Project: {activeProject?.name || "No active project"}</Chip>`
- `key={item.sku}`
- `<div style={{ fontWeight: 800 }}>{item.name}</div>`
- `<div style={{ opacity: 0.7, fontSize: 12 }}>{item.sku}</div>`

### _RESCUE\CatalogSaveSelection_20260304_173235\ProductCatalogPage.tsx
- `// src/features/tools/ProductCatalogPage.tsx`
- `getActiveProject,`
- `updateProjectCatalogSelection,`
- `import type { DiscoveryProductFamily } from "@/features/discovery/DiscoveryWizardPage";`
- `type CatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: DiscoveryProductFamily;`
- `const SEED_ITEMS: CatalogItem[] = [`
- `{ sku: "APO-100-TX", name: "Apollo Transmitter", family: "Apollo", notes: "Collaboration / BYOD workflows" },`
- `{ sku: "APO-100-RX", name: "Apollo Receiver", family: "Apollo", notes: "Room-side endpoint" },`
- `{ sku: "HDB-200-TX", name: "HDBaseT TX", family: "HDBaseT", notes: "Point-to-point extension" },`
- `{ sku: "HDB-200-RX", name: "HDBaseT RX", family: "HDBaseT", notes: "Receiver endpoint" },`
- `{ sku: "NHD-400-TX", name: "AVoIP Encoder", family: "AVoIP", notes: "Scalable networked AV" },`
- `{ sku: "NHD-400-RX", name: "AVoIP Decoder", family: "AVoIP", notes: "Distributed endpoint" },`
- `{ sku: "MAT-44", name: "4x4 Matrix", family: "Matrix", notes: "Fixed I/O switching" },`
- `{ sku: "USB-EXT-01", name: "USB Extender", family: "USB Extension", notes: "Peripheral extension" },`
- `{ sku: "VWP-CTRL-01", name: "Video Wall Controller", family: "Video Wall", notes: "Wall processing and control" },`
- `export default function ProductCatalogPage() {`
- `const activeProject = getActiveProject();`
- `const [selectedSkus, setSelectedSkus] = useState<string[]>(`
- `Array.isArray(activeProject?.catalog?.skus) ? activeProject!.catalog!.skus : []`
- `(recommendedFamilies as DiscoveryProductFamily[]).includes(item.family)`
- `function toggleSku(sku: string) {`
- `setSelectedSkus((prev) =>`

### _RESCUE\Dedupe_20260305_185814\src\features\misc\ProductCatalogPage.tsx
- `import { addToCart } from "@/proposal/QuoteCartService";`
- `import { listAll, isSelectable } from "@/catalog/CatalogService";`
- `import type { Product } from "@/catalog/model";`
- `return (<div className="wm-page">`
- `<span className="wm-chip" style={{ marginRight: 8 }}>`
- `export default function ProductCatalogPage() {`
- `const [family, setFamily] = React.useState<string>("All");`
- `const set = new Set(all.map(p => p.family).filter(Boolean) as string[]);`
- `.filter(p => (family === "All" ? true : p.family === family))`
- `p.sku.toLowerCase().includes(qq) ||`
- `p.name.toLowerCase().includes(qq) ||`
- `(p.category || "").toLowerCase().includes(qq) ||`
- `.sort((a, b) => a.sku.localeCompare(b.sku));`
- `}, [all, q, family]);`
- `<div className="wm-page wm-container">`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-card-title">Product Catalog</div>`
- `<div className="wm-muted" style={{ marginTop: 6 }}>`
- `Seed dataset (Phase 2). Next: replace with real Wingman catalog.`
- `onChange={(e) => setQ(e.target.value)}`
- `placeholder="Search SKU / name / category / role…"`
- `<select value={family} onChange={(e) => setFamily(e.target.value)} style={{ padding: 10 }}>`
- `<th style={{ padding: "10px 8px" }}>SKU</th>`
- `<th style={{ padding: "10px 8px" }}>Name</th>`
- `<tr key={p.sku} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>`

### _RESCUE\Dedupe_20260305_185814\src\features\tools\ProductCatalogPage.tsx
- `// src/features/tools/ProductCatalogPage.tsx`
- `getActiveProject,`
- `updateProjectCatalogSelection,`
- `import type { DiscoveryProductFamily } from "@/features/discovery/DiscoveryWizardPage";`
- `type CatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: DiscoveryProductFamily;`
- `const SEED_ITEMS: CatalogItem[] = [`
- `{ sku: "APO-100-TX", name: "Apollo Transmitter", family: "Apollo", notes: "Collaboration / BYOD workflows" },`
- `{ sku: "APO-100-RX", name: "Apollo Receiver", family: "Apollo", notes: "Room-side endpoint" },`
- `{ sku: "HDB-200-TX", name: "HDBaseT TX", family: "HDBaseT", notes: "Point-to-point extension" },`
- `{ sku: "HDB-200-RX", name: "HDBaseT RX", family: "HDBaseT", notes: "Receiver endpoint" },`
- `{ sku: "NHD-400-TX", name: "AVoIP Encoder", family: "AVoIP", notes: "Scalable networked AV" },`
- `{ sku: "NHD-400-RX", name: "AVoIP Decoder", family: "AVoIP", notes: "Distributed endpoint" },`
- `{ sku: "MAT-44", name: "4x4 Matrix", family: "Matrix", notes: "Fixed I/O switching" },`
- `{ sku: "USB-EXT-01", name: "USB Extender", family: "USB Extension", notes: "Peripheral extension" },`
- `{ sku: "VWP-CTRL-01", name: "Video Wall Controller", family: "Video Wall", notes: "Wall processing and control" },`
- `export default function ProductCatalogPage() {`
- `const activeProject = getActiveProject();`
- `const [selectedSkus, setSelectedSkus] = React.useState<string[]>(`
- `Array.isArray(activeProject?.catalog?.skus) ? activeProject!.catalog!.skus : []`
- `(recommendedFamilies as DiscoveryProductFamily[]).includes(item.family)`
- `function toggleSku(sku: string) {`
- `setSelectedSkus((prev) =>`

### _RESCUE\EncodingFix_20260305_210016\src\catalog\CatalogRepository.ts
- `import type { Product } from "./model";`
- `import data from "@/data/catalog.wyrestorm.json";`
- `const CATALOG = (data as any as Product[]).map(p => ({`
- `export function listAll(): Product[] {`
- `return CATALOG;`
- `export function bySku(sku: string): Product | undefined {`
- `const s = (sku || "").trim();`
- `return CATALOG.find(p => p.sku === s);`
- `export function isSelectable(p: Product): boolean {`

### _RESCUE\EncodingFix_20260305_210016\src\catalog\CatalogService.ts
- `import { listAll, bySku, isSelectable } from "./CatalogRepository";`
- `export { listAll, bySku, isSelectable };`

### _RESCUE\EncodingFix_20260305_210016\src\data\wyrestormSkuCatalog.2026.ts
- `export * from "@/services/sku/wyrestormSkuCatalog.2026";`
- `import * as all from "@/services/sku/wyrestormSkuCatalog.2026";`
- `export default all;`

### _RESCUE\EncodingFix_20260305_210016\src\features\catalog\CatalogPage.tsx
- `import { CATALOG_SEED, type CatalogEntry } from "./catalogSeed";`
- `item: CatalogEntry;`
- `className="wm-hover-lift"`
- `<div style={{ fontWeight: 900, fontSize: 15 }}>{item.name}</div>`
- `{item.family}`
- `className="wm-btn"`
- `title,`
- `title: string;`
- `className="wm-hover-lift"`
- `{title}`
- `className="wm-btn"`
- `export default function CatalogPage() {`
- `const [family, setFamily] = React.useState("All");`
- `return ["All", ...Array.from(new Set(CATALOG_SEED.map((x) => x.family)))];`
- `return CATALOG_SEED.filter((item) => {`
- `const familyMatch = family === "All" || item.family === family;`
- `if (!familyMatch) return false;`
- `item.name,`
- `item.family,`
- `}, [query, family]);`
- `className="wm-page wm-animate-in"`
- `<div className="wm-page-eyebrow">PRODUCTS</div>`
- `<h1 className="wm-page-title" style={{ marginBottom: 8 }}>`
- `Product Catalog`
- `Find the right product family first, then move into the best next tool.`

### _RESCUE\EncodingFix_20260305_210016\src\features\catalog\catalogSeed.ts
- `export type CatalogEntry = {`
- `name: string;`
- `family: string;`
- `export const CATALOG_SEED: CatalogEntry[] = [`
- `name: "AV over IP",`
- `family: "NetworkHD / AVoIP",`
- `name: "Point-to-point extension",`
- `family: "HDBaseT / Extension",`
- `name: "Matrix switching",`
- `family: "Switching / Matrix",`
- `name: "BYOD room systems",`
- `family: "Collaboration / Room Systems",`
- `name: "Competitor replacement",`
- `family: "Migration / Cross-reference",`
- `summary: "Best when the conversation starts with a competitor SKU or an installed-base reference point.",`
- `name: "Video wall and multiview",`
- `family: "Processing / Video Wall",`
- `name: "Sales guidance",`
- `family: "Advisory / Assisted Selection",`
- `name: "Training and reference",`
- `family: "Enablement / Knowledge",`

### _RESCUE\EncodingFix_20260305_210016\src\features\guru\guruCatalog.generated.ts
- `import type { GuruCatalogItem } from "./guruCatalog.seed";`
- `export const WYRESTORM_CATALOG: GuruCatalogItem[] = [`
- `"sku": "SW-640L-TX-W",`
- `"name": "4-Input 4K Presentation Switcher with USB C 60W PD and Matrix Outputs, USB 3.0, Multiview &#038; Wireless Casting",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"summary": "The SW-640L-TX-W is an advanced wireless presentation and conferencing system, tailored to meet the dynamic requirements of modern meeting spaces and conference rooms. This upgraded model boasts significant enhancements. Key improvements include two USB-C inputs with 60W PD, now featuring Multi Stream Transport (MST) support to unlock advanced connectivity and multi-display workflows. The switcher also includes an upgraded USB 3.0 switcher, further enriched by the support for a wireless host through the APO-DG2/APO-DG2-PRO. This addition allows for more flexible and convenient connections.",`
- `"sku": "EX-100-KVM-IP",`
- `"name": "4K@30Hz IP-Based KVM Extender",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"sku": "COM-MIC-HUB",`
- `"name": "Microphone Hub",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"sku": "APO-DG2",`
- `"name": "Apollo USB-C Wireless Casting Dongle",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"sku": "MX-0808-H2A-MK2",`
- `"name": "8&#215;8 HDMI Matrix Switches for Ultimate Control",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `export default WYRESTORM_CATALOG;`

### _RESCUE\EncodingFix_20260305_210016\src\features\guru\guruCatalog.seed.ts
- `export type GuruCatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: string;`
- `category: string;`
- `export const WYRESTORM_CATALOG_SEED: GuruCatalogItem[] = [`
- `sku: "SW-640L-TX-W",`
- `name: "4-Input 4K Presentation Switcher with USB C 60W PD and Matrix Outputs, USB 3.0, Multiview & Wireless Casting",`
- `family: "Synergy",`
- `category: "Presentation Switcher",`
- `sku: "EX-100-KVM-IP",`
- `name: "4K@30Hz IP-Based KVM Extender",`
- `family: "Extender Solutions",`
- `category: "KVM Extender",`
- `sku: "COM-MIC-HUB",`
- `name: "Microphone Hub",`
- `family: "Audio",`
- `category: "Audio Hub",`
- `sku: "APO-DG2",`
- `name: "Apollo USB-C Wireless Casting Dongle",`
- `family: "Apollo",`
- `category: "Wireless Casting",`
- `sku: "MX-0808-H2A-MK2",`
- `name: "8x8 HDMI Matrix Switches for Ultimate Control",`
- `family: "Matrix Solutions",`

### _RESCUE\EncodingFix_20260305_210016\src\pages\tools\ProductCatalogPage.tsx
- `export default function ProductCatalogPage() {`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-h2">Product Catalog</div>`
- `<div className="wm-p" style={{ marginTop: 8 }}>Loaded {PRODUCT_DATABASE.length} products.</div>`

### _RESCUE\EncodingFix_20260305_210016\src\services\sku\wyrestormSkuCatalog.2026.ts
- `export type WyreStormSkuItem = { sku: string; description: string; family: string; tier: string };`
- `export type WyreStormSkuCatalog = { version: string; source: string; generatedAt: string; count: number; items: WyreStormSkuItem[] };`
- `const catalog: WyreStormSkuCatalog = {`
- `"source": "2026 Wyrestorm SKU (1).xlsx",`
- `"sku": "AMP-260-DNT",`
- `"family": "AMP",`
- `"sku": "APO-210-UC",`
- `"family": "APO",`
- `"sku": "APO-COM-MIC",`
- `"family": "APO",`
- `"sku": "APO-DG-DOCK",`
- `"family": "APO",`
- `"sku": "APO-DG-HDMI",`
- `"family": "APO",`
- `"sku": "APO-DG1",`
- `"family": "APO",`
- `"sku": "APO-DG2",`
- `"family": "APO",`
- `"sku": "APO-DG2-PRO",`
- `"family": "APO",`
- `"sku": "APO-MIC-EXT",`
- `"family": "APO",`
- `"sku": "APO-SKY-MIC",`
- `"family": "APO",`
- `"sku": "APO-VX20-MNT",`

### _RESCUE\EncodingFix_20260305_210211\src\catalog\CatalogRepository.ts
- `import type { Product } from "./model";`
- `import data from "@/data/catalog.wyrestorm.json";`
- `const CATALOG = (data as any as Product[]).map(p => ({`
- `export function listAll(): Product[] {`
- `return CATALOG;`
- `export function bySku(sku: string): Product | undefined {`
- `const s = (sku || "").trim();`
- `return CATALOG.find(p => p.sku === s);`
- `export function isSelectable(p: Product): boolean {`

### _RESCUE\EncodingFix_20260305_210211\src\catalog\CatalogService.ts
- `import { listAll, bySku, isSelectable } from "./CatalogRepository";`
- `export { listAll, bySku, isSelectable };`

### _RESCUE\EncodingFix_20260305_210211\src\data\wyrestormSkuCatalog.2026.ts
- `export * from "@/services/sku/wyrestormSkuCatalog.2026";`
- `import * as all from "@/services/sku/wyrestormSkuCatalog.2026";`
- `export default all;`

### _RESCUE\EncodingFix_20260305_210211\src\features\catalog\CatalogPage.tsx
- `import { CATALOG_SEED, type CatalogEntry } from "./catalogSeed";`
- `item: CatalogEntry;`
- `className="wm-hover-lift"`
- `<div style={{ fontWeight: 900, fontSize: 15 }}>{item.name}</div>`
- `{item.family}`
- `className="wm-btn"`
- `title,`
- `title: string;`
- `className="wm-hover-lift"`
- `{title}`
- `className="wm-btn"`
- `export default function CatalogPage() {`
- `const [family, setFamily] = React.useState("All");`
- `return ["All", ...Array.from(new Set(CATALOG_SEED.map((x) => x.family)))];`
- `return CATALOG_SEED.filter((item) => {`
- `const familyMatch = family === "All" || item.family === family;`
- `if (!familyMatch) return false;`
- `item.name,`
- `item.family,`
- `}, [query, family]);`
- `className="wm-page wm-animate-in"`
- `<div className="wm-page-eyebrow">PRODUCTS</div>`
- `<h1 className="wm-page-title" style={{ marginBottom: 8 }}>`
- `Product Catalog`
- `Find the right product family first, then move into the best next tool.`

### _RESCUE\EncodingFix_20260305_210211\src\features\catalog\catalogSeed.ts
- `export type CatalogEntry = {`
- `name: string;`
- `family: string;`
- `export const CATALOG_SEED: CatalogEntry[] = [`
- `name: "AV over IP",`
- `family: "NetworkHD / AVoIP",`
- `name: "Point-to-point extension",`
- `family: "HDBaseT / Extension",`
- `name: "Matrix switching",`
- `family: "Switching / Matrix",`
- `name: "BYOD room systems",`
- `family: "Collaboration / Room Systems",`
- `name: "Competitor replacement",`
- `family: "Migration / Cross-reference",`
- `summary: "Best when the conversation starts with a competitor SKU or an installed-base reference point.",`
- `name: "Video wall and multiview",`
- `family: "Processing / Video Wall",`
- `name: "Sales guidance",`
- `family: "Advisory / Assisted Selection",`
- `name: "Training and reference",`
- `family: "Enablement / Knowledge",`

### _RESCUE\EncodingFix_20260305_210211\src\features\guru\guruCatalog.generated.ts
- `import type { GuruCatalogItem } from "./guruCatalog.seed";`
- `export const WYRESTORM_CATALOG: GuruCatalogItem[] = [`
- `"sku": "SW-640L-TX-W",`
- `"name": "4-Input 4K Presentation Switcher with USB C 60W PD and Matrix Outputs, USB 3.0, Multiview &#038; Wireless Casting",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"summary": "The SW-640L-TX-W is an advanced wireless presentation and conferencing system, tailored to meet the dynamic requirements of modern meeting spaces and conference rooms. This upgraded model boasts significant enhancements. Key improvements include two USB-C inputs with 60W PD, now featuring Multi Stream Transport (MST) support to unlock advanced connectivity and multi-display workflows. The switcher also includes an upgraded USB 3.0 switcher, further enriched by the support for a wireless host through the APO-DG2/APO-DG2-PRO. This addition allows for more flexible and convenient connections.",`
- `"sku": "EX-100-KVM-IP",`
- `"name": "4K@30Hz IP-Based KVM Extender",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"sku": "COM-MIC-HUB",`
- `"name": "Microphone Hub",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"sku": "APO-DG2",`
- `"name": "Apollo USB-C Wireless Casting Dongle",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"sku": "MX-0808-H2A-MK2",`
- `"name": "8&#215;8 HDMI Matrix Switches for Ultimate Control",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `export default WYRESTORM_CATALOG;`

### _RESCUE\EncodingFix_20260305_210211\src\features\guru\guruCatalog.seed.ts
- `export type GuruCatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: string;`
- `category: string;`
- `export const WYRESTORM_CATALOG_SEED: GuruCatalogItem[] = [`
- `sku: "SW-640L-TX-W",`
- `name: "4-Input 4K Presentation Switcher with USB C 60W PD and Matrix Outputs, USB 3.0, Multiview & Wireless Casting",`
- `family: "Synergy",`
- `category: "Presentation Switcher",`
- `sku: "EX-100-KVM-IP",`
- `name: "4K@30Hz IP-Based KVM Extender",`
- `family: "Extender Solutions",`
- `category: "KVM Extender",`
- `sku: "COM-MIC-HUB",`
- `name: "Microphone Hub",`
- `family: "Audio",`
- `category: "Audio Hub",`
- `sku: "APO-DG2",`
- `name: "Apollo USB-C Wireless Casting Dongle",`
- `family: "Apollo",`
- `category: "Wireless Casting",`
- `sku: "MX-0808-H2A-MK2",`
- `name: "8x8 HDMI Matrix Switches for Ultimate Control",`
- `family: "Matrix Solutions",`

### _RESCUE\EncodingFix_20260305_210211\src\pages\tools\ProductCatalogPage.tsx
- `export default function ProductCatalogPage() {`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-h2">Product Catalog</div>`
- `<div className="wm-p" style={{ marginTop: 8 }}>Loaded {PRODUCT_DATABASE.length} products.</div>`

### _RESCUE\EncodingFix_20260305_210211\src\services\sku\wyrestormSkuCatalog.2026.ts
- `export type WyreStormSkuItem = { sku: string; description: string; family: string; tier: string };`
- `export type WyreStormSkuCatalog = { version: string; source: string; generatedAt: string; count: number; items: WyreStormSkuItem[] };`
- `const catalog: WyreStormSkuCatalog = {`
- `"source": "2026 Wyrestorm SKU (1).xlsx",`
- `"sku": "AMP-260-DNT",`
- `"family": "AMP",`
- `"sku": "APO-210-UC",`
- `"family": "APO",`
- `"sku": "APO-COM-MIC",`
- `"family": "APO",`
- `"sku": "APO-DG-DOCK",`
- `"family": "APO",`
- `"sku": "APO-DG-HDMI",`
- `"family": "APO",`
- `"sku": "APO-DG1",`
- `"family": "APO",`
- `"sku": "APO-DG2",`
- `"family": "APO",`
- `"sku": "APO-DG2-PRO",`
- `"family": "APO",`
- `"sku": "APO-MIC-EXT",`
- `"family": "APO",`
- `"sku": "APO-SKY-MIC",`
- `"family": "APO",`
- `"sku": "APO-VX20-MNT",`

### _RESCUE\PhaseNextBundle06_20260304_193349\ProductCatalogPage.tsx
- `// src/features/tools/ProductCatalogPage.tsx`
- `getActiveProject,`
- `updateProjectCatalogSelection,`
- `import type { DiscoveryProductFamily } from "@/features/discovery/DiscoveryWizardPage";`
- `type CatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: DiscoveryProductFamily;`
- `const SEED_ITEMS: CatalogItem[] = [`
- `{ sku: "APO-100-TX", name: "Apollo Transmitter", family: "Apollo", notes: "Collaboration / BYOD workflows" },`
- `{ sku: "APO-100-RX", name: "Apollo Receiver", family: "Apollo", notes: "Room-side endpoint" },`
- `{ sku: "HDB-200-TX", name: "HDBaseT TX", family: "HDBaseT", notes: "Point-to-point extension" },`
- `{ sku: "HDB-200-RX", name: "HDBaseT RX", family: "HDBaseT", notes: "Receiver endpoint" },`
- `{ sku: "NHD-400-TX", name: "AVoIP Encoder", family: "AVoIP", notes: "Scalable networked AV" },`
- `{ sku: "NHD-400-RX", name: "AVoIP Decoder", family: "AVoIP", notes: "Distributed endpoint" },`
- `{ sku: "MAT-44", name: "4x4 Matrix", family: "Matrix", notes: "Fixed I/O switching" },`
- `{ sku: "USB-EXT-01", name: "USB Extender", family: "USB Extension", notes: "Peripheral extension" },`
- `{ sku: "VWP-CTRL-01", name: "Video Wall Controller", family: "Video Wall", notes: "Wall processing and control" },`
- `export default function ProductCatalogPage() {`
- `const activeProject = getActiveProject();`
- `const [selectedSkus, setSelectedSkus] = useState<string[]>(`
- `Array.isArray(activeProject?.catalog?.skus) ? activeProject!.catalog!.skus : []`
- `(recommendedFamilies as DiscoveryProductFamily[]).includes(item.family)`
- `function toggleSku(sku: string) {`
- `setSelectedSkus((prev) =>`

### _RESCUE\ReactImportNormalize_20260305_151548\src\catalog\CatalogRepository.ts
- `import type { Product } from "./model";`
- `import data from "@/data/catalog.wyrestorm.json";`
- `const CATALOG = (data as any as Product[]).map(p => ({`
- `export function listAll(): Product[] {`
- `return CATALOG;`
- `export function bySku(sku: string): Product | undefined {`
- `const s = (sku || "").trim();`
- `return CATALOG.find(p => p.sku === s);`
- `export function isSelectable(p: Product): boolean {`

### _RESCUE\ReactImportNormalize_20260305_151548\src\catalog\CatalogService.ts
- `import { listAll, bySku, isSelectable } from "./CatalogRepository";`
- `export { listAll, bySku, isSelectable };`

### _RESCUE\ReactImportNormalize_20260305_151548\src\data\wyrestormSkuCatalog.2026.ts
- `export * from "@/services/sku/wyrestormSkuCatalog.2026";`
- `import * as all from "@/services/sku/wyrestormSkuCatalog.2026";`
- `export default all;`

### _RESCUE\ReactImportNormalize_20260305_151548\src\features\catalog\CatalogPage.tsx
- `import { CATALOG_SEED, type CatalogEntry } from "./catalogSeed";`
- `item: CatalogEntry;`
- `className="wm-hover-lift"`
- `<div style={{ fontWeight: 900, fontSize: 15 }}>{item.name}</div>`
- `{item.family}`
- `className="wm-btn"`
- `title,`
- `title: string;`
- `className="wm-hover-lift"`
- `{title}`
- `className="wm-btn"`
- `export default function CatalogPage() {`
- `const [family, setFamily] = useState("All");`
- `return ["All", ...Array.from(new Set(CATALOG_SEED.map((x) => x.family)))];`
- `return CATALOG_SEED.filter((item) => {`
- `const familyMatch = family === "All" || item.family === family;`
- `if (!familyMatch) return false;`
- `item.name,`
- `item.family,`
- `}, [query, family]);`
- `className="wm-page wm-animate-in"`
- `<div className="wm-page-eyebrow">PRODUCTS</div>`
- `<h1 className="wm-page-title" style={{ marginBottom: 8 }}>`
- `Product Catalog`
- `Find the right product family first, then move into the best next tool.`

### _RESCUE\ReactImportNormalize_20260305_151548\src\features\catalog\catalogSeed.ts
- `export type CatalogEntry = {`
- `name: string;`
- `family: string;`
- `export const CATALOG_SEED: CatalogEntry[] = [`
- `name: "AV over IP",`
- `family: "NetworkHD / AVoIP",`
- `name: "Point-to-point extension",`
- `family: "HDBaseT / Extension",`
- `name: "Matrix switching",`
- `family: "Switching / Matrix",`
- `name: "BYOD room systems",`
- `family: "Collaboration / Room Systems",`
- `name: "Competitor replacement",`
- `family: "Migration / Cross-reference",`
- `summary: "Best when the conversation starts with a competitor SKU or an installed-base reference point.",`
- `name: "Video wall and multiview",`
- `family: "Processing / Video Wall",`
- `name: "Sales guidance",`
- `family: "Advisory / Assisted Selection",`
- `name: "Training and reference",`
- `family: "Enablement / Knowledge",`

### _RESCUE\ReactImportNormalize_20260305_151548\src\features\guru\guruCatalog.generated.ts
- `import type { GuruCatalogItem } from "./guruCatalog.seed";`
- `export const WYRESTORM_CATALOG: GuruCatalogItem[] = [`
- `"sku": "SW-640L-TX-W",`
- `"name": "4-Input 4K Presentation Switcher with USB C 60W PD and Matrix Outputs, USB 3.0, Multiview &#038; Wireless Casting",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"summary": "The SW-640L-TX-W is an advanced wireless presentation and conferencing system, tailored to meet the dynamic requirements of modern meeting spaces and conference rooms. This upgraded model boasts significant enhancements. Key improvements include two USB-C inputs with 60W PD, now featuring Multi Stream Transport (MST) support to unlock advanced connectivity and multi-display workflows. The switcher also includes an upgraded USB 3.0 switcher, further enriched by the support for a wireless host through the APO-DG2/APO-DG2-PRO. This addition allows for more flexible and convenient connections.",`
- `"sku": "EX-100-KVM-IP",`
- `"name": "4K@30Hz IP-Based KVM Extender",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"sku": "COM-MIC-HUB",`
- `"name": "Microphone Hub",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"sku": "APO-DG2",`
- `"name": "Apollo USB-C Wireless Casting Dongle",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"sku": "MX-0808-H2A-MK2",`
- `"name": "8&#215;8 HDMI Matrix Switches for Ultimate Control",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `export default WYRESTORM_CATALOG;`

### _RESCUE\ReactImportNormalize_20260305_151548\src\features\guru\guruCatalog.seed.ts
- `export type GuruCatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: string;`
- `category: string;`
- `export const WYRESTORM_CATALOG_SEED: GuruCatalogItem[] = [`
- `sku: "SW-640L-TX-W",`
- `name: "4-Input 4K Presentation Switcher with USB C 60W PD and Matrix Outputs, USB 3.0, Multiview & Wireless Casting",`
- `family: "Synergy",`
- `category: "Presentation Switcher",`
- `sku: "EX-100-KVM-IP",`
- `name: "4K@30Hz IP-Based KVM Extender",`
- `family: "Extender Solutions",`
- `category: "KVM Extender",`
- `sku: "COM-MIC-HUB",`
- `name: "Microphone Hub",`
- `family: "Audio",`
- `category: "Audio Hub",`
- `sku: "APO-DG2",`
- `name: "Apollo USB-C Wireless Casting Dongle",`
- `family: "Apollo",`
- `category: "Wireless Casting",`
- `sku: "MX-0808-H2A-MK2",`
- `name: "8x8 HDMI Matrix Switches for Ultimate Control",`
- `family: "Matrix Solutions",`

### _RESCUE\ReactImportNormalize_20260305_151548\src\features\misc\ProductCatalogPage.tsx
- `import { addToCart } from "@/proposal/QuoteCartService";`
- `import { listAll, isSelectable } from "@/catalog/CatalogService";`
- `import type { Product } from "@/catalog/model";`
- `return (<div className="wm-page">`
- `<span className="wm-chip" style={{ marginRight: 8 }}>`
- `export default function ProductCatalogPage() {`
- `const [family, setFamily] = useState<string>("All");`
- `const set = new Set(all.map(p => p.family).filter(Boolean) as string[]);`
- `.filter(p => (family === "All" ? true : p.family === family))`
- `p.sku.toLowerCase().includes(qq) ||`
- `p.name.toLowerCase().includes(qq) ||`
- `(p.category || "").toLowerCase().includes(qq) ||`
- `.sort((a, b) => a.sku.localeCompare(b.sku));`
- `}, [all, q, family]);`
- `<div className="wm-page wm-container">`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-card-title">Product Catalog</div>`
- `<div className="wm-muted" style={{ marginTop: 6 }}>`
- `Seed dataset (Phase 2). Next: replace with real Wingman catalog.`
- `onChange={(e) => setQ(e.target.value)}`
- `placeholder="Search SKU / name / category / role…"`
- `<select value={family} onChange={(e) => setFamily(e.target.value)} style={{ padding: 10 }}>`
- `<th style={{ padding: "10px 8px" }}>SKU</th>`
- `<th style={{ padding: "10px 8px" }}>Name</th>`
- `<tr key={p.sku} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>`

### _RESCUE\ReactImportNormalize_20260305_151548\src\features\tools\ProductCatalogPage.tsx
- `// src/features/tools/ProductCatalogPage.tsx`
- `getActiveProject,`
- `updateProjectCatalogSelection,`
- `import type { DiscoveryProductFamily } from "@/features/discovery/DiscoveryWizardPage";`
- `type CatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: DiscoveryProductFamily;`
- `const SEED_ITEMS: CatalogItem[] = [`
- `{ sku: "APO-100-TX", name: "Apollo Transmitter", family: "Apollo", notes: "Collaboration / BYOD workflows" },`
- `{ sku: "APO-100-RX", name: "Apollo Receiver", family: "Apollo", notes: "Room-side endpoint" },`
- `{ sku: "HDB-200-TX", name: "HDBaseT TX", family: "HDBaseT", notes: "Point-to-point extension" },`
- `{ sku: "HDB-200-RX", name: "HDBaseT RX", family: "HDBaseT", notes: "Receiver endpoint" },`
- `{ sku: "NHD-400-TX", name: "AVoIP Encoder", family: "AVoIP", notes: "Scalable networked AV" },`
- `{ sku: "NHD-400-RX", name: "AVoIP Decoder", family: "AVoIP", notes: "Distributed endpoint" },`
- `{ sku: "MAT-44", name: "4x4 Matrix", family: "Matrix", notes: "Fixed I/O switching" },`
- `{ sku: "USB-EXT-01", name: "USB Extender", family: "USB Extension", notes: "Peripheral extension" },`
- `{ sku: "VWP-CTRL-01", name: "Video Wall Controller", family: "Video Wall", notes: "Wall processing and control" },`
- `export default function ProductCatalogPage() {`
- `const activeProject = getActiveProject();`
- `const [selectedSkus, setSelectedSkus] = useState<string[]>(`
- `Array.isArray(activeProject?.catalog?.skus) ? activeProject!.catalog!.skus : []`
- `(recommendedFamilies as DiscoveryProductFamily[]).includes(item.family)`
- `function toggleSku(sku: string) {`
- `setSelectedSkus((prev) =>`

### _RESCUE\ReactImportNormalize_20260305_151548\src\pages\tools\ProductCatalogPage.tsx
- `export default function ProductCatalogPage() {`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-h2">Product Catalog</div>`
- `<div className="wm-p" style={{ marginTop: 8 }}>Loaded {PRODUCT_DATABASE.length} products.</div>`

### _RESCUE\ReactImportNormalize_20260305_151548\src\services\sku\wyrestormSkuCatalog.2026.ts
- `export type WyreStormSkuItem = { sku: string; description: string; family: string; tier: string };`
- `export type WyreStormSkuCatalog = { version: string; source: string; generatedAt: string; count: number; items: WyreStormSkuItem[] };`
- `const catalog: WyreStormSkuCatalog = {`
- `"source": "2026 Wyrestorm SKU (1).xlsx",`
- `"sku": "AMP-260-DNT",`
- `"family": "AMP",`
- `"sku": "APO-210-UC",`
- `"family": "APO",`
- `"sku": "APO-COM-MIC",`
- `"family": "APO",`
- `"sku": "APO-DG-DOCK",`
- `"family": "APO",`
- `"sku": "APO-DG-HDMI",`
- `"family": "APO",`
- `"sku": "APO-DG1",`
- `"family": "APO",`
- `"sku": "APO-DG2",`
- `"family": "APO",`
- `"sku": "APO-DG2-PRO",`
- `"family": "APO",`
- `"sku": "APO-MIC-EXT",`
- `"family": "APO",`
- `"sku": "APO-SKY-MIC",`
- `"family": "APO",`
- `"sku": "APO-VX20-MNT",`

### _RESCUE\ReactImportRepair_20260305_145427\src__features__catalog__CatalogPage.tsx
- `import { CATALOG_SEED, type CatalogEntry } from "./catalogSeed";`
- `item: CatalogEntry;`
- `className="wm-hover-lift"`
- `<div style={{ fontWeight: 900, fontSize: 15 }}>{item.name}</div>`
- `{item.family}`
- `className="wm-btn"`
- `title,`
- `title: string;`
- `className="wm-hover-lift"`
- `{title}`
- `className="wm-btn"`
- `export default function CatalogPage() {`
- `const [family, setFamily] = useState("All");`
- `return ["All", ...Array.from(new Set(CATALOG_SEED.map((x) => x.family)))];`
- `return CATALOG_SEED.filter((item) => {`
- `const familyMatch = family === "All" || item.family === family;`
- `if (!familyMatch) return false;`
- `item.name,`
- `item.family,`
- `}, [query, family]);`
- `className="wm-page wm-animate-in"`
- `<div className="wm-page-eyebrow">PRODUCTS</div>`
- `<h1 className="wm-page-title" style={{ marginBottom: 8 }}>`
- `Product Catalog`
- `Find the right product family first, then move into the best next tool.`

### _RESCUE\ReactImportRepair_20260305_145427\src__features__misc__ProductCatalogPage.tsx
- `import { addToCart } from "@/proposal/QuoteCartService";`
- `import { listAll, isSelectable } from "@/catalog/CatalogService";`
- `import type { Product } from "@/catalog/model";`
- `return (<div className="wm-page">`
- `<span className="wm-chip" style={{ marginRight: 8 }}>`
- `export default function ProductCatalogPage() {`
- `const [family, setFamily] = useState<string>("All");`
- `const set = new Set(all.map(p => p.family).filter(Boolean) as string[]);`
- `.filter(p => (family === "All" ? true : p.family === family))`
- `p.sku.toLowerCase().includes(qq) ||`
- `p.name.toLowerCase().includes(qq) ||`
- `(p.category || "").toLowerCase().includes(qq) ||`
- `.sort((a, b) => a.sku.localeCompare(b.sku));`
- `}, [all, q, family]);`
- `<div className="wm-page wm-container">`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-card-title">Product Catalog</div>`
- `<div className="wm-muted" style={{ marginTop: 6 }}>`
- `Seed dataset (Phase 2). Next: replace with real Wingman catalog.`
- `onChange={(e) => setQ(e.target.value)}`
- `placeholder="Search SKU / name / category / role…"`
- `<select value={family} onChange={(e) => setFamily(e.target.value)} style={{ padding: 10 }}>`
- `<th style={{ padding: "10px 8px" }}>SKU</th>`
- `<th style={{ padding: "10px 8px" }}>Name</th>`
- `<tr key={p.sku} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>`

### _RESCUE\ReactImportRepair_20260305_145427\src__features__tools__ProductCatalogPage.tsx
- `// src/features/tools/ProductCatalogPage.tsx`
- `getActiveProject,`
- `updateProjectCatalogSelection,`
- `import type { DiscoveryProductFamily } from "@/features/discovery/DiscoveryWizardPage";`
- `type CatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: DiscoveryProductFamily;`
- `const SEED_ITEMS: CatalogItem[] = [`
- `{ sku: "APO-100-TX", name: "Apollo Transmitter", family: "Apollo", notes: "Collaboration / BYOD workflows" },`
- `{ sku: "APO-100-RX", name: "Apollo Receiver", family: "Apollo", notes: "Room-side endpoint" },`
- `{ sku: "HDB-200-TX", name: "HDBaseT TX", family: "HDBaseT", notes: "Point-to-point extension" },`
- `{ sku: "HDB-200-RX", name: "HDBaseT RX", family: "HDBaseT", notes: "Receiver endpoint" },`
- `{ sku: "NHD-400-TX", name: "AVoIP Encoder", family: "AVoIP", notes: "Scalable networked AV" },`
- `{ sku: "NHD-400-RX", name: "AVoIP Decoder", family: "AVoIP", notes: "Distributed endpoint" },`
- `{ sku: "MAT-44", name: "4x4 Matrix", family: "Matrix", notes: "Fixed I/O switching" },`
- `{ sku: "USB-EXT-01", name: "USB Extender", family: "USB Extension", notes: "Peripheral extension" },`
- `{ sku: "VWP-CTRL-01", name: "Video Wall Controller", family: "Video Wall", notes: "Wall processing and control" },`
- `export default function ProductCatalogPage() {`
- `const activeProject = getActiveProject();`
- `const [selectedSkus, setSelectedSkus] = useState<string[]>(`
- `Array.isArray(activeProject?.catalog?.skus) ? activeProject!.catalog!.skus : []`
- `(recommendedFamilies as DiscoveryProductFamily[]).includes(item.family)`
- `function toggleSku(sku: string) {`
- `setSelectedSkus((prev) =>`

### _RESCUE\ReactImportRepair_20260305_145427\src__pages__tools__ProductCatalogPage.tsx
- `export default function ProductCatalogPage() {`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-h2">Product Catalog</div>`
- `<div className="wm-p" style={{ marginTop: 8 }}>Loaded {PRODUCT_DATABASE.length} products.</div>`

### _RESCUE\RouterFix_20260305_144953\CatalogPage.tsx
- `import { CATALOG_SEED, type CatalogEntry } from "./catalogSeed";`
- `item: CatalogEntry;`
- `className="wm-hover-lift"`
- `<div style={{ fontWeight: 900, fontSize: 15 }}>{item.name}</div>`
- `{item.family}`
- `className="wm-btn"`
- `title,`
- `title: string;`
- `className="wm-hover-lift"`
- `{title}`
- `className="wm-btn"`
- `export default function CatalogPage() {`
- `const [family, setFamily] = useState("All");`
- `return ["All", ...Array.from(new Set(CATALOG_SEED.map((x) => x.family)))];`
- `return CATALOG_SEED.filter((item) => {`
- `const familyMatch = family === "All" || item.family === family;`
- `if (!familyMatch) return false;`
- `item.name,`
- `item.family,`
- `}, [query, family]);`
- `className="wm-page wm-animate-in"`
- `<div className="wm-page-eyebrow">PRODUCTS</div>`
- `<h1 className="wm-page-title" style={{ marginBottom: 8 }}>`
- `Product Catalog`
- `Find the right product family first, then move into the best next tool.`

### _RESCUE\RouterFix_20260305_144953\ProductCatalogPage.tsx
- `export default function ProductCatalogPage() {`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-h2">Product Catalog</div>`
- `<div className="wm-p" style={{ marginTop: 8 }}>Loaded {PRODUCT_DATABASE.length} products.</div>`

### _RESCUE\TypecheckFixPack_20260305_152052\src\features\catalog\CatalogPage.tsx
- `import { CATALOG_SEED, type CatalogEntry } from "./catalogSeed";`
- `item: CatalogEntry;`
- `className="wm-hover-lift"`
- `<div style={{ fontWeight: 900, fontSize: 15 }}>{item.name}</div>`
- `{item.family}`
- `className="wm-btn"`
- `title,`
- `title: string;`
- `className="wm-hover-lift"`
- `{title}`
- `className="wm-btn"`
- `export default function CatalogPage() {`
- `const [family, setFamily] = React.useState("All");`
- `return ["All", ...Array.from(new Set(CATALOG_SEED.map((x) => x.family)))];`
- `return CATALOG_SEED.filter((item) => {`
- `const familyMatch = family === "All" || item.family === family;`
- `if (!familyMatch) return false;`
- `item.name,`
- `item.family,`
- `}, [query, family]);`
- `className="wm-page wm-animate-in"`
- `<div className="wm-page-eyebrow">PRODUCTS</div>`
- `<h1 className="wm-page-title" style={{ marginBottom: 8 }}>`
- `Product Catalog`
- `Find the right product family first, then move into the best next tool.`

### _RESCUE\TypecheckFixPack_20260305_152052\src\features\misc\ProductCatalogPage.tsx
- `import { addToCart } from "@/proposal/QuoteCartService";`
- `import { listAll, isSelectable } from "@/catalog/CatalogService";`
- `import type { Product } from "@/catalog/model";`
- `return (<div className="wm-page">`
- `<span className="wm-chip" style={{ marginRight: 8 }}>`
- `export default function ProductCatalogPage() {`
- `const [family, setFamily] = React.useState<string>("All");`
- `const set = new Set(all.map(p => p.family).filter(Boolean) as string[]);`
- `.filter(p => (family === "All" ? true : p.family === family))`
- `p.sku.toLowerCase().includes(qq) ||`
- `p.name.toLowerCase().includes(qq) ||`
- `(p.category || "").toLowerCase().includes(qq) ||`
- `.sort((a, b) => a.sku.localeCompare(b.sku));`
- `}, [all, q, family]);`
- `<div className="wm-page wm-container">`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-card-title">Product Catalog</div>`
- `<div className="wm-muted" style={{ marginTop: 6 }}>`
- `Seed dataset (Phase 2). Next: replace with real Wingman catalog.`
- `onChange={(e) => setQ(e.target.value)}`
- `placeholder="Search SKU / name / category / role…"`
- `<select value={family} onChange={(e) => setFamily(e.target.value)} style={{ padding: 10 }}>`
- `<th style={{ padding: "10px 8px" }}>SKU</th>`
- `<th style={{ padding: "10px 8px" }}>Name</th>`
- `<tr key={p.sku} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>`

### _RESCUE\TypecheckFixPack_20260305_152052\src\features\tools\ProductCatalogPage.tsx
- `// src/features/tools/ProductCatalogPage.tsx`
- `getActiveProject,`
- `updateProjectCatalogSelection,`
- `import type { DiscoveryProductFamily } from "@/features/discovery/DiscoveryWizardPage";`
- `type CatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: DiscoveryProductFamily;`
- `const SEED_ITEMS: CatalogItem[] = [`
- `{ sku: "APO-100-TX", name: "Apollo Transmitter", family: "Apollo", notes: "Collaboration / BYOD workflows" },`
- `{ sku: "APO-100-RX", name: "Apollo Receiver", family: "Apollo", notes: "Room-side endpoint" },`
- `{ sku: "HDB-200-TX", name: "HDBaseT TX", family: "HDBaseT", notes: "Point-to-point extension" },`
- `{ sku: "HDB-200-RX", name: "HDBaseT RX", family: "HDBaseT", notes: "Receiver endpoint" },`
- `{ sku: "NHD-400-TX", name: "AVoIP Encoder", family: "AVoIP", notes: "Scalable networked AV" },`
- `{ sku: "NHD-400-RX", name: "AVoIP Decoder", family: "AVoIP", notes: "Distributed endpoint" },`
- `{ sku: "MAT-44", name: "4x4 Matrix", family: "Matrix", notes: "Fixed I/O switching" },`
- `{ sku: "USB-EXT-01", name: "USB Extender", family: "USB Extension", notes: "Peripheral extension" },`
- `{ sku: "VWP-CTRL-01", name: "Video Wall Controller", family: "Video Wall", notes: "Wall processing and control" },`
- `export default function ProductCatalogPage() {`
- `const activeProject = getActiveProject();`
- `const [selectedSkus, setSelectedSkus] = React.useState<string[]>(`
- `Array.isArray(activeProject?.catalog?.skus) ? activeProject!.catalog!.skus : []`
- `(recommendedFamilies as DiscoveryProductFamily[]).includes(item.family)`
- `function toggleSku(sku: string) {`
- `setSelectedSkus((prev) =>`

### _RESCUE\WingmanCatalogPhase2_20260306_121534\src\features\catalog\CatalogPage.tsx
- `import { CATALOG_SEED, type CatalogEntry } from "./catalogSeed";`
- `item: CatalogEntry;`
- `className="wm-hover-lift"`
- `<div style={{ fontWeight: 900, fontSize: 15 }}>{item.name}</div>`
- `{item.family}`
- `className="wm-btn"`
- `title,`
- `title: string;`
- `className="wm-hover-lift"`
- `{title}`
- `className="wm-btn"`
- `export default function CatalogPage() {`
- `const [family, setFamily] = React.useState("All");`
- `return ["All", ...Array.from(new Set(CATALOG_SEED.map((x) => x.family)))];`
- `return CATALOG_SEED.filter((item) => {`
- `const familyMatch = family === "All" || item.family === family;`
- `if (!familyMatch) return false;`
- `item.name,`
- `item.family,`
- `}, [query, family]);`
- `className="wm-page wm-animate-in"`
- `<div className="wm-page-eyebrow">PRODUCTS</div>`
- `<h1 className="wm-page-title" style={{ marginBottom: 8 }}>`
- `Product Catalog`
- `Find the right product family first, then move into the best next tool.`

### _RESCUE\WingmanCatalogPhase2_20260306_121549\src\features\catalog\CatalogPage.tsx
- `import { getCatalogCategories, getCatalogFamilies, queryCatalogProducts } from "@/catalog/repository";`
- `export default function CatalogPage() {`
- `const [family, setFamily] = React.useState("All");`
- `const [category, setCategory] = React.useState("All");`
- `const families = React.useMemo(() => ["All", ...getCatalogFamilies()], []);`
- `const categories = React.useMemo(() => ["All", ...getCatalogCategories()], []);`
- `return queryCatalogProducts({`
- `family,`
- `category,`
- `}, [q, family, category]);`
- `<div className="wm-page" style={{ padding: 16 }}>`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-h1">WyreStorm Catalog</div>`
- `<p className="wm-p" style={{ marginTop: 8 }}>`
- `Phase 2 validated starter catalog.`
- `onChange={(e) => setQ(e.target.value)}`
- `placeholder="Search SKU, family, category, feature"`
- `<select value={family} onChange={(e) => setFamily(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>`
- `<select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>`
- `<div key={p.sku} className="wm-card" style={{ padding: 12 }}>`
- `{p.sku} - {p.name}`
- `{p.family} / {p.category} / {p.transport}`

### _RESCUE\WingmanCatalogPhase3_20260306_122101\src\features\catalog\CatalogPage.tsx
- `import { getCatalogCategories, getCatalogFamilies, queryCatalogProducts } from "@/catalog/repository";`
- `export default function CatalogPage() {`
- `const [family, setFamily] = React.useState("All");`
- `const [category, setCategory] = React.useState("All");`
- `const families = React.useMemo(() => ["All", ...getCatalogFamilies()], []);`
- `const categories = React.useMemo(() => ["All", ...getCatalogCategories()], []);`
- `return queryCatalogProducts({`
- `family,`
- `category,`
- `}, [q, family, category]);`
- `<div className="wm-page" style={{ padding: 16 }}>`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-h1">WyreStorm Catalog</div>`
- `<p className="wm-p" style={{ marginTop: 8 }}>`
- `Phase 2 validated starter catalog.`
- `onChange={(e) => setQ(e.target.value)}`
- `placeholder="Search SKU, family, category, feature"`
- `<select value={family} onChange={(e) => setFamily(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>`
- `<select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>`
- `<div key={p.sku} className="wm-card" style={{ padding: 12 }}>`
- `{p.sku} - {p.name}`
- `{p.family} / {p.category} / {p.transport}`

### _RESCUE\WingmanCatalogPhase3_20260306_122122\src\features\catalog\CatalogPage.tsx
- `getCatalogCategories,`
- `getCatalogFamilies,`
- `getCatalogFeatures,`
- `queryCatalogProducts`
- `} from "@/catalog";`
- `export default function CatalogPage() {`
- `const [family, setFamily] = React.useState("All");`
- `const [category, setCategory] = React.useState("All");`
- `const families = React.useMemo(() => ["All", ...getCatalogFamilies()], []);`
- `const categories = React.useMemo(() => ["All", ...getCatalogCategories()], []);`
- `const features = React.useMemo(() => ["All", ...getCatalogFeatures()], []);`
- `return queryCatalogProducts({`
- `family,`
- `category,`
- `}, [q, family, category, feature]);`
- `<div className="wm-page" style={{ padding: 16 }}>`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-h1">WyreStorm Catalog</div>`
- `<p className="wm-p" style={{ marginTop: 8 }}>`
- `Phase 3 enriched catalog with normalized filtering.`
- `onChange={(e) => setQ(e.target.value)}`
- `placeholder="Search SKU, family, category, feature"`
- `<select value={family} onChange={(e) => setFamily(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>`
- `<select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>`
- `<select value={feature} onChange={(e) => setFeature(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>`

### _RESCUE\WingmanCatalogPhase3_20260306_122132\src\features\catalog\CatalogPage.tsx
- `getCatalogCategories,`
- `getCatalogFamilies,`
- `getCatalogFeatures,`
- `queryCatalogProducts`
- `} from "@/catalog";`
- `export default function CatalogPage() {`
- `const [family, setFamily] = React.useState("All");`
- `const [category, setCategory] = React.useState("All");`
- `const families = React.useMemo(() => ["All", ...getCatalogFamilies()], []);`
- `const categories = React.useMemo(() => ["All", ...getCatalogCategories()], []);`
- `const features = React.useMemo(() => ["All", ...getCatalogFeatures()], []);`
- `return queryCatalogProducts({`
- `family,`
- `category,`
- `}, [q, family, category, feature]);`
- `<div className="wm-page" style={{ padding: 16 }}>`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-h1">WyreStorm Catalog</div>`
- `<p className="wm-p" style={{ marginTop: 8 }}>`
- `Phase 3 enriched catalog with normalized filtering.`
- `onChange={(e) => setQ(e.target.value)}`
- `placeholder="Search SKU, family, category, feature"`
- `<select value={family} onChange={(e) => setFamily(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>`
- `<select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>`
- `<select value={feature} onChange={(e) => setFeature(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>`

### src\catalog\CatalogRepository.ts
- `import type { Product } from "./model";`
- `import data from "@/data/catalog.wyrestorm.json";`
- `const CATALOG = (data as any as Product[]).map(p => ({`
- `export function listAll(): Product[] {`
- `return CATALOG;`
- `export function bySku(sku: string): Product | undefined {`
- `const s = (sku || "").trim();`
- `return CATALOG.find(p => p.sku === s);`
- `export function isSelectable(p: Product): boolean {`

### src\catalog\CatalogService.ts
- `import { listAll, bySku, isSelectable } from "./CatalogRepository";`
- `export { listAll, bySku, isSelectable };`

### src\data\wyrestormSkuCatalog.2026.ts
- `export * from "@/services/sku/wyrestormSkuCatalog.2026";`
- `import * as all from "@/services/sku/wyrestormSkuCatalog.2026";`
- `export default all;`

### src\features\catalog\catalogIntelligence.ts
- `export type CatalogRecommendation = {`
- `family: string;`
- `sku: string;`
- `name: string;`
- `export type CatalogIntelligence = {`
- `primaryFamily: string;`
- `sku: string;`
- `name: string;`
- `{ sku: "APO-210-UC", name: "Apollo UC Switcher", role: "Room hub / collaboration" },`
- `{ sku: "APO-100-TX", name: "Apollo Input Transmitter", role: "Local source input" },`
- `{ sku: "APO-100-RX", name: "Apollo Receiver", role: "Display endpoint" },`
- `{ sku: "EX-70-H2", name: "HDBaseT Extender Set", role: "Point-to-point transport" },`
- `{ sku: "MX-0402-HDBT", name: "HDBaseT Matrix", role: "Switching and extension" },`
- `{ sku: "RX-HDBT-SCALER", name: "Scaled HDBaseT Receiver", role: "Display endpoint" },`
- `{ sku: "NHD-500-TX", name: "NetworkHD Encoder", role: "Source encoder" },`
- `{ sku: "NHD-500-RX", name: "NetworkHD Decoder", role: "Display decoder" },`
- `{ sku: "NHD-CTL-PRO", name: "NetworkHD Controller", role: "System orchestration" },`
- `{ sku: "VW-PROC-4K", name: "Video Wall Processor", role: "Wall processing" },`
- `{ sku: "NHD-DEC-WALL", name: "Wall Display Decoder", role: "Wall endpoint" },`
- `{ sku: "CTRL-WALL-TOUCH", name: "Wall Control Interface", role: "Control layer" },`
- `{ sku: "SW-0401-H2", name: "4x1 Switcher", role: "Core switching" },`
- `{ sku: "DA-14-H2", name: "1x4 Distribution Amplifier", role: "Signal distribution" },`
- `{ sku: "EXT-USB-H2", name: "USB / HDMI Extension", role: "Extension support" },`
- `export function buildCatalogIntelligence(state: WingmanProjectState): CatalogIntelligence {`
- `let primaryFamily = "Core AV Switching";`

### src\features\catalog\CatalogPage.tsx
- `getCatalogCategories,`
- `getCatalogFamilies,`
- `getCatalogFeatures,`
- `queryCatalogProducts`
- `} from "@/catalog";`
- `export default function CatalogPage() {`
- `const [family, setFamily] = React.useState("All");`
- `const [category, setCategory] = React.useState("All");`
- `const families = React.useMemo(() => ["All", ...getCatalogFamilies()], []);`
- `const categories = React.useMemo(() => ["All", ...getCatalogCategories()], []);`
- `const features = React.useMemo(() => ["All", ...getCatalogFeatures()], []);`
- `return queryCatalogProducts({`
- `family,`
- `category,`
- `}, [q, family, category, feature]);`
- `<div className="wm-page" style={{ padding: 16 }}>`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-h1">WyreStorm Catalog</div>`
- `<p className="wm-p" style={{ marginTop: 8 }}>`
- `Phase 3 enriched catalog with normalized filtering.`
- `onChange={(e) => setQ(e.target.value)}`
- `placeholder="Search SKU, family, category, feature"`
- `<select value={family} onChange={(e) => setFamily(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>`
- `<select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>`
- `<select value={feature} onChange={(e) => setFeature(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>`

### src\features\catalog\catalogSeed.ts
- `export type CatalogEntry = {`
- `name: string;`
- `family: string;`
- `export const CATALOG_SEED: CatalogEntry[] = [`
- `name: "AV over IP",`
- `family: "NetworkHD / AVoIP",`
- `name: "Point-to-point extension",`
- `family: "HDBaseT / Extension",`
- `name: "Matrix switching",`
- `family: "Switching / Matrix",`
- `name: "BYOD room systems",`
- `family: "Collaboration / Room Systems",`
- `name: "Competitor replacement",`
- `family: "Migration / Cross-reference",`
- `summary: "Best when the conversation starts with a competitor SKU or an installed-base reference point.",`
- `name: "Video wall and multiview",`
- `family: "Processing / Video Wall",`
- `name: "Sales guidance",`
- `family: "Advisory / Assisted Selection",`
- `name: "Training and reference",`
- `family: "Enablement / Knowledge",`

### src\features\catalog\ProductCatalogPage.tsx
- `import { getBoundCatalogue } from "@/core/wingman/storeBridge";`
- `export default function ProductCatalogPage() {`
- `const items = getBoundCatalogue();`
- `<div className="wm-page">`
- `<section className="wm-hero">`
- `<div className="wm-title-xl">Product Catalogue</div>`
- `<div className="wm-body-sm" style={{ marginTop: 2 }}>`
- `Live project binding is active. Catalogue remains on fallback data until the real SKU source is confirmed.`
- `<button type="button" className="wm-btn">Filter</button>`
- `<button type="button" className="wm-btn wm-btn-primary">Compare Products</button>`
- `<section className="wm-panel" style={{ padding: 12 }}>`
- `<div className="wm-body-sm">SKU</div>`
- `<div className="wm-body-sm">Family</div>`
- `<div className="wm-body-sm">Title</div>`
- `<div className="wm-body-sm">Notes</div>`
- `<div className="wm-grid" style={{ gap: 8 }}>`
- `key={item.sku}`
- `className="wm-card"`
- `<div className="wm-title-lg">{item.sku}</div>`
- `<div><span className="wm-tag">{item.family}</span></div>`
- `<div className="wm-body">{item.title}</div>`
- `<div className="wm-body">{item.note}</div>`

### src\features\guru\guruCatalog.generated.ts
- `import type { GuruCatalogItem } from "./guruCatalog.seed";`
- `export const WYRESTORM_CATALOG: GuruCatalogItem[] = [`
- `"sku": "SW-640L-TX-W",`
- `"name": "4-Input 4K Presentation Switcher with USB C 60W PD and Matrix Outputs, USB 3.0, Multiview &#038; Wireless Casting",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"summary": "The SW-640L-TX-W is an advanced wireless presentation and conferencing system, tailored to meet the dynamic requirements of modern meeting spaces and conference rooms. This upgraded model boasts significant enhancements. Key improvements include two USB-C inputs with 60W PD, now featuring Multi Stream Transport (MST) support to unlock advanced connectivity and multi-display workflows. The switcher also includes an upgraded USB 3.0 switcher, further enriched by the support for a wireless host through the APO-DG2/APO-DG2-PRO. This addition allows for more flexible and convenient connections.",`
- `"sku": "EX-100-KVM-IP",`
- `"name": "4K@30Hz IP-Based KVM Extender",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"sku": "COM-MIC-HUB",`
- `"name": "Microphone Hub",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"sku": "APO-DG2",`
- `"name": "Apollo USB-C Wireless Casting Dongle",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `"sku": "MX-0808-H2A-MK2",`
- `"name": "8&#215;8 HDMI Matrix Switches for Ultimate Control",`
- `"family": "WyreStorm",`
- `"category": "Imported",`
- `export default WYRESTORM_CATALOG;`

### src\features\guru\guruCatalog.seed.ts
- `export type GuruCatalogItem = {`
- `sku: string;`
- `name: string;`
- `family: string;`
- `category: string;`
- `export const WYRESTORM_CATALOG_SEED: GuruCatalogItem[] = [`
- `sku: "SW-640L-TX-W",`
- `name: "4-Input 4K Presentation Switcher with USB C 60W PD and Matrix Outputs, USB 3.0, Multiview & Wireless Casting",`
- `family: "Synergy",`
- `category: "Presentation Switcher",`
- `sku: "EX-100-KVM-IP",`
- `name: "4K@30Hz IP-Based KVM Extender",`
- `family: "Extender Solutions",`
- `category: "KVM Extender",`
- `sku: "COM-MIC-HUB",`
- `name: "Microphone Hub",`
- `family: "Audio",`
- `category: "Audio Hub",`
- `sku: "APO-DG2",`
- `name: "Apollo USB-C Wireless Casting Dongle",`
- `family: "Apollo",`
- `category: "Wireless Casting",`
- `sku: "MX-0808-H2A-MK2",`
- `name: "8x8 HDMI Matrix Switches for Ultimate Control",`
- `family: "Matrix Solutions",`

### src\pages\tools\ProductCatalogPage.tsx
- `export default function ProductCatalogPage() {`
- `<div className="wm-card wm-card-pad">`
- `<div className="wm-h2">Product Catalog</div>`
- `<div className="wm-p" style={{ marginTop: 8 }}>Loaded {PRODUCT_DATABASE.length} products.</div>`

### src\services\sku\wyrestormSkuCatalog.2026.ts
- `export type WyreStormSkuItem = { sku: string; description: string; family: string; tier: string };`
- `export type WyreStormSkuCatalog = { version: string; source: string; generatedAt: string; count: number; items: WyreStormSkuItem[] };`
- `const catalog: WyreStormSkuCatalog = {`
- `"source": "2026 Wyrestorm SKU (1).xlsx",`
- `"sku": "AMP-260-DNT",`
- `"family": "AMP",`
- `"sku": "APO-210-UC",`
- `"family": "APO",`
- `"sku": "APO-COM-MIC",`
- `"family": "APO",`
- `"sku": "APO-DG-DOCK",`
- `"family": "APO",`
- `"sku": "APO-DG-HDMI",`
- `"family": "APO",`
- `"sku": "APO-DG1",`
- `"family": "APO",`
- `"sku": "APO-DG2",`
- `"family": "APO",`
- `"sku": "APO-DG2-PRO",`
- `"family": "APO",`
- `"sku": "APO-MIC-EXT",`
- `"family": "APO",`
- `"sku": "APO-SKY-MIC",`
- `"family": "APO",`
- `"sku": "APO-VX20-MNT",`

## Recommended binding target

Prefer a direct data-source file over UI pages.
Best candidates will usually be one of:
- src\data\wyrestormSkuCatalog.2026.ts
- src\catalog\CatalogRepository.ts
- src\catalog\CatalogService.ts
- src\features\catalog\catalogSeed.ts

## Created bridge file

- src\core\wingman\catalogBridge.ts

