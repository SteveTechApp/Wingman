$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Save-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Content
  )

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Backup-File {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupPath = "$Path.bak-$stamp"
  Copy-Item -LiteralPath $Path -Destination $backupPath -Force
  Write-Host "Backup created: $backupPath" -ForegroundColor DarkGray
}

$root = (Get-Location).Path

$dataPath = Join-Path $root "src\wingman2\data\productIntelligenceAdmin.ts"
$pagePath = Join-Path $root "src\wingman2\pages\IntelligencePage.tsx"
$routeCatalogPath = Join-Path $root "src\wingman2\app\routeCatalog.ts"
$routeManifestPath = Join-Path $root "src\wingman2\app\route-manifest.json"
$routesPath = Join-Path $root "src\wingman2\app\routes.tsx"
$cssPath = Join-Path $root "src\wingman2\styles\wingman-style-stack.css"

Write-Step "Checking Wingman files"

foreach ($path in @($routeCatalogPath, $routeManifestPath, $routesPath, $cssPath)) {
  if (-not (Test-Path $path)) {
    throw "Missing file: $path"
  }
}

foreach ($path in @($dataPath, $pagePath, $routeCatalogPath, $routeManifestPath, $routesPath, $cssPath)) {
  Backup-File $path
}

Write-Step "Writing Product Intelligence Admin data store"

$data = @'
import { useEffect, useMemo, useState } from "react";

export type IntelligenceSourceType = "wyrestorm" | "competitor";
export type IntelligenceReviewStatus = "draft" | "needs-review" | "approved" | "rejected";
export type IntelligenceSurface = "finder" | "compare" | "proposal" | "pitch";

export type IntelligenceConnection = {
  id: string;
  side: "input" | "output" | "bidirectional" | "control" | "audio" | "network" | "usb";
  label: string;
  connector: string;
  count: number;
  notes: string;
};

export type IntelligenceFeatureSet = {
  mst: boolean;
  wirelessCasting: boolean;
  ndi: boolean;
  dante: boolean;
  multiview: boolean;
  videoWall: boolean;
  scaling: boolean;
  seamless: boolean;
  hdbaset: boolean;
  hdbasetClass: string;
  avoip: boolean;
  networkSpeed: string;
  usb2: boolean;
  usb3: boolean;
  usbHostCount: number;
  usbPeripheralCount: number;
  kvm: boolean;
  audioDeEmbed: boolean;
  audioEmbed: boolean;
  audioDsp: boolean;
  micInputs: number;
  phantomPower: boolean;
  ir: boolean;
  rs232: boolean;
  telnet: boolean;
  ipControl: boolean;
  relays: number;
};

export type IntelligenceRelationship = {
  id: string;
  relationshipType: "works-with" | "requires" | "alternative-to" | "replaced-by" | "accessory-for" | "source-side" | "display-side";
  brand: string;
  sku: string;
  notes: string;
};

export type IntelligenceEvidence = {
  id: string;
  sourceType: "manual-entry" | "manufacturer-page" | "datasheet" | "manual" | "distributor-page" | "search-result" | "user-note";
  title: string;
  url: string;
  notes: string;
};

export type ProductIntelligenceRecord = {
  id: string;
  sourceType: IntelligenceSourceType;
  brand: string;
  sku: string;
  productName: string;
  productClass: string;
  productRole: string;
  purpose: string;
  family: string;
  confidence: number;
  reviewStatus: IntelligenceReviewStatus;
  approvedFor: Record<IntelligenceSurface, boolean>;
  physicalConnections: IntelligenceConnection[];
  softwareConnections: string[];
  features: IntelligenceFeatureSet;
  relationships: IntelligenceRelationship[];
  evidence: IntelligenceEvidence[];
  reviewNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductIntelligenceDraftInput = {
  sourceType: IntelligenceSourceType;
  brand: string;
  sku: string;
  productName?: string;
};

const storageKey = "wingman.product-intelligence-admin.v1";
const changedEvent = "wingman:product-intelligence-admin-changed";

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = "wia") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function normalise(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function defaultFeatures(): IntelligenceFeatureSet {
  return {
    mst: false,
    wirelessCasting: false,
    ndi: false,
    dante: false,
    multiview: false,
    videoWall: false,
    scaling: false,
    seamless: false,
    hdbaset: false,
    hdbasetClass: "",
    avoip: false,
    networkSpeed: "",
    usb2: false,
    usb3: false,
    usbHostCount: 0,
    usbPeripheralCount: 0,
    kvm: false,
    audioDeEmbed: false,
    audioEmbed: false,
    audioDsp: false,
    micInputs: 0,
    phantomPower: false,
    ir: false,
    rs232: false,
    telnet: false,
    ipControl: false,
    relays: 0,
  };
}

function approvedDefaults(): Record<IntelligenceSurface, boolean> {
  return {
    finder: false,
    compare: false,
    proposal: false,
    pitch: false,
  };
}

function inferClassFromSku(brand: string, sku: string) {
  const upperSku = sku.toUpperCase();
  const lowerBrand = normalise(brand);

  if (upperSku.startsWith("SP-")) return "distribution-amplifier";
  if (upperSku.startsWith("EX-")) return "signal-extender-kit";
  if (upperSku.startsWith("TX-")) return "transmitter";
  if (upperSku.startsWith("RX-")) return "receiver";
  if (upperSku.startsWith("MX-")) return "matrix-or-presentation-switch";
  if (upperSku.startsWith("SW-")) return "switcher-or-processor";
  if (upperSku.startsWith("UC-") || upperSku.startsWith("APO-")) return "unified-comms";
  if (upperSku.startsWith("CAM-")) return "camera-or-camera-bridge";
  if (upperSku.startsWith("CAB-") || upperSku.includes("HAOC")) return "cable";
  if (upperSku.startsWith("NHD-") && upperSku.includes("-TX")) return "avoip-encoder";
  if (upperSku.startsWith("NHD-") && upperSku.includes("-RX")) return "avoip-decoder";
  if (upperSku.startsWith("NHD-") && upperSku.includes("-TRX")) return "avoip-transceiver";
  if (upperSku.includes("-MV")) return "multiview-processor";
  if (upperSku.includes("-VW")) return "video-wall-processor";
  if (lowerBrand && lowerBrand !== "wyrestorm") return "competitor-unclassified";

  return "unclassified";
}

function inferPurposeFromClass(productClass: string) {
  if (productClass === "distribution-amplifier") return "Duplicates one source to multiple outputs. Also called splitter by lower-knowledge users.";
  if (productClass === "signal-extender-kit") return "Moves one signal path from source side to display side over distance.";
  if (productClass === "transmitter") return "Source-side signal transport endpoint.";
  if (productClass === "receiver") return "Display-side signal transport endpoint.";
  if (productClass === "avoip-encoder") return "Source-side AV-over-IP endpoint that places a source onto the AV network.";
  if (productClass === "avoip-decoder") return "Display-side AV-over-IP endpoint that receives a network stream.";
  if (productClass === "avoip-transceiver") return "Flexible AV-over-IP endpoint that may operate source-side or display-side depending on configuration.";
  if (productClass === "matrix-or-presentation-switch") return "Requires review. MX prefix may indicate matrix switching or presentation/MST room workflow.";
  if (productClass === "switcher-or-processor") return "Requires review. SW prefix may indicate HDMI switcher, presentation switcher, wireless, multiview or video wall processor.";
  if (productClass === "unified-comms") return "Unified communications or room collaboration product.";
  if (productClass === "camera-or-camera-bridge") return "Camera, PTZ, capture or camera bridge workflow.";
  if (productClass === "cable") return "Signal cable or active optical cable. Not an active switching/routing processor.";

  return "Requires manual review before Finder, Compare or Proposal can trust this record.";
}

function inferSeedConnections(sku: string, productClass: string): IntelligenceConnection[] {
  const upperSku = sku.toUpperCase();
  const items: IntelligenceConnection[] = [];

  function add(side: IntelligenceConnection["side"], label: string, connector: string, count: number, notes: string) {
    items.push({
      id: uid("conn"),
      side,
      label,
      connector,
      count,
      notes,
    });
  }

  if (productClass === "distribution-amplifier") {
    add("input", "Source input", "HDMI", 1, "Confirm exact source connector and bandwidth.");
    add("output", "Duplicated outputs", "HDMI", 2, "Update count from datasheet. All outputs normally show the same source.");
  }

  if (productClass === "signal-extender-kit") {
    add("input", "Source-side input", "HDMI", 1, "Confirm USB/audio/control support.");
    add("output", "Display-side output", "HDMI", 1, "Confirm receiver output and supported resolution.");
    add("network", "Extension path", "Category cable / HDBaseT", 1, "Confirm distance, class and cable standard.");
  }

  if (productClass === "avoip-encoder") {
    add("input", "Source input", "HDMI", 1, "Confirm source connector, resolution and audio handling.");
    add("network", "AV network", "RJ45 / network", 1, "Confirm NetworkHD family and network speed.");
  }

  if (productClass === "avoip-decoder") {
    add("network", "AV network", "RJ45 / network", 1, "Receives stream from AV network.");
    add("output", "Display output", "HDMI", 1, "Confirm resolution, scaling, wall and USB requirements.");
  }

  if (productClass === "matrix-or-presentation-switch" || upperSku.includes("0402") || upperSku.includes("0403")) {
    add("input", "Presentation inputs", "HDMI / USB-C", 4, "Review exact connector mix from datasheet.");
    add("output", "Room outputs", "HDMI", upperSku.includes("0403") ? 3 : upperSku.includes("0402") ? 2 : 1, "For MST products, review room display and MTR output behaviour.");
  }

  return items;
}

function inferFeaturesFromSku(sku: string, productClass: string): IntelligenceFeatureSet {
  const features = defaultFeatures();
  const upperSku = sku.toUpperCase();

  if (upperSku.includes("-MST")) features.mst = true;
  if (upperSku.endsWith("-W")) features.wirelessCasting = true;
  if (upperSku.includes("NDI")) features.ndi = true;
  if (upperSku.includes("DNT")) features.dante = true;
  if (upperSku.includes("-MV")) features.multiview = true;
  if (upperSku.includes("-VW")) features.videoWall = true;

  if (productClass.includes("avoip")) {
    features.avoip = true;
    features.networkSpeed = upperSku.includes("600") ? "10G" : "1G";
  }

  if (productClass === "signal-extender-kit") {
    features.hdbaset = true;
  }

  if (upperSku.includes("USB3")) {
    features.usb3 = true;
    features.usbHostCount = 1;
    features.usbPeripheralCount = 1;
  }

  if (upperSku.includes("KVM")) {
    features.kvm = true;
    features.usb2 = true;
    features.usbHostCount = 1;
    features.usbPeripheralCount = 1;
  }

  if (upperSku.includes("0402-MST") || upperSku.includes("0403") || upperSku.includes("MST")) {
    features.usb2 = true;
    features.scaling = true;
  }

  return features;
}

export function createIntelligenceRecord(input: ProductIntelligenceDraftInput): ProductIntelligenceRecord {
  const sku = input.sku.trim();
  const brand = input.brand.trim() || (input.sourceType === "wyrestorm" ? "WyreStorm" : "");
  const productClass = inferClassFromSku(brand, sku);
  const createdAt = nowIso();

  return {
    id: uid("intel"),
    sourceType: input.sourceType,
    brand,
    sku,
    productName: input.productName?.trim() || "",
    productClass,
    productRole:
      productClass.includes("encoder") || productClass.includes("decoder") || productClass.includes("transceiver")
        ? "endpoint"
        : productClass === "cable"
          ? "cable"
          : "primary-hardware",
    purpose: inferPurposeFromClass(productClass),
    family: "",
    confidence: productClass === "unclassified" || productClass === "competitor-unclassified" ? 30 : 60,
    reviewStatus: "draft",
    approvedFor: approvedDefaults(),
    physicalConnections: inferSeedConnections(sku, productClass),
    softwareConnections: [],
    features: inferFeaturesFromSku(sku, productClass),
    relationships: [],
    evidence: [
      {
        id: uid("ev"),
        sourceType: "manual-entry",
        title: "Manual seed record",
        url: "",
        notes: "Created in Wingman Product Intelligence Admin. Add datasheet/manual/manufacturer/distributor evidence before approval.",
      },
    ],
    reviewNotes: "",
    createdAt,
    updatedAt: createdAt,
  };
}

function seedRecords(): ProductIntelligenceRecord[] {
  const mx0402 = createIntelligenceRecord({
    sourceType: "wyrestorm",
    brand: "WyreStorm",
    sku: "MX-0402-MST",
    productName: "MST presentation switcher",
  });

  mx0402.productClass = "presentation-switcher";
  mx0402.productRole = "primary-hardware";
  mx0402.purpose = "Mixed-use presentation switcher for meeting-room workflows. Review MST, USB and room display topology before approval.";
  mx0402.family = "Presentation / MST";
  mx0402.confidence = 72;
  mx0402.reviewStatus = "needs-review";
  mx0402.reviewNotes = "Important mixed-use product. Model must capture dual-output and Microsoft Teams Room feed use case accurately.";
  mx0402.features.mst = true;
  mx0402.features.usb2 = true;
  mx0402.features.scaling = true;
  mx0402.relationships.push({
    id: uid("rel"),
    relationshipType: "works-with",
    brand: "Microsoft",
    sku: "Teams Room / MTR",
    notes: "User note: third output is relevant to MTR feed workflow. Confirm and document from trusted source.",
  });

  const mx0403 = createIntelligenceRecord({
    sourceType: "wyrestorm",
    brand: "WyreStorm",
    sku: "MX-0403-H3-MST",
    productName: "MST presentation switcher with MTR output consideration",
  });

  mx0403.productClass = "presentation-switcher";
  mx0403.productRole = "primary-hardware";
  mx0403.purpose = "Mixed-use room presentation product. Requires granular modelling of display outputs, MTR feed, USB and MST behaviour.";
  mx0403.family = "Presentation / MST";
  mx0403.confidence = 72;
  mx0403.reviewStatus = "needs-review";
  mx0403.reviewNotes = "Treat as priority enrichment example. Capture third-output purpose, MTR workflow, dual display and USB topology.";
  mx0403.features.mst = true;
  mx0403.features.usb2 = true;
  mx0403.features.scaling = true;
  mx0403.relationships.push({
    id: uid("rel"),
    relationshipType: "works-with",
    brand: "Microsoft",
    sku: "Teams Room / MTR",
    notes: "User note: third output designed to feed Microsoft MTR. Verify and document evidence.",
  });

  const cameraApp = createIntelligenceRecord({
    sourceType: "wyrestorm",
    brand: "WyreStorm",
    sku: "Teams Camera Control App",
    productName: "Teams-certified camera control app",
  });

  cameraApp.productClass = "software-capability";
  cameraApp.productRole = "software";
  cameraApp.purpose = "Software capability for Teams-certified camera control, multi-camera management and composited single-camera output workflow.";
  cameraApp.family = "Unified Comms / Camera Control";
  cameraApp.confidence = 45;
  cameraApp.reviewStatus = "needs-review";
  cameraApp.reviewNotes = "User-reported new WyreStorm app. Needs trusted evidence before being used in Product Pitch, Call Cards, Discovery or Proposal.";
  cameraApp.softwareConnections = ["Microsoft Teams", "camera control", "multi-camera management", "single composed camera feed"];
  cameraApp.relationships.push({
    id: uid("rel"),
    relationshipType: "works-with",
    brand: "WyreStorm",
    sku: "Compatible WyreStorm cameras / camera bridges",
    notes: "Define compatible SKUs once confirmed.",
  });

  return [mx0402, mx0403, cameraApp];
}

function readRecords(): ProductIntelligenceRecord[] {
  if (typeof window === "undefined") {
    return seedRecords();
  }

  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    const seeds = seedRecords();
    window.localStorage.setItem(storageKey, JSON.stringify(seeds));
    return seeds;
  }

  try {
    const parsed = JSON.parse(raw) as ProductIntelligenceRecord[];
    return Array.isArray(parsed) ? parsed : seedRecords();
  } catch {
    return seedRecords();
  }
}

function writeRecords(records: ProductIntelligenceRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(records));
  window.dispatchEvent(new CustomEvent(changedEvent));
}

export function getProductIntelligenceRecords() {
  return readRecords();
}

export function saveProductIntelligenceRecord(record: ProductIntelligenceRecord) {
  const records = readRecords();
  const updatedRecord = {
    ...record,
    updatedAt: nowIso(),
  };

  const existingIndex = records.findIndex((item) => item.id === record.id);

  if (existingIndex >= 0) {
    records[existingIndex] = updatedRecord;
  } else {
    records.unshift(updatedRecord);
  }

  writeRecords(records);
  return updatedRecord;
}

export function deleteProductIntelligenceRecord(id: string) {
  writeRecords(readRecords().filter((item) => item.id !== id));
}

export function useProductIntelligenceAdmin() {
  const [records, setRecords] = useState<ProductIntelligenceRecord[]>(() => readRecords());

  useEffect(() => {
    function handleChange() {
      setRecords(readRecords());
    }

    window.addEventListener(changedEvent, handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener(changedEvent, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const stats = useMemo(() => {
    const total = records.length;
    const needsReview = records.filter((item) => item.reviewStatus === "needs-review" || item.reviewStatus === "draft").length;
    const approved = records.filter((item) => item.reviewStatus === "approved").length;
    const competitors = records.filter((item) => item.sourceType === "competitor").length;
    const wyrestorm = records.filter((item) => item.sourceType === "wyrestorm").length;

    return { total, needsReview, approved, competitors, wyrestorm };
  }, [records]);

  function upsert(record: ProductIntelligenceRecord) {
    const saved = saveProductIntelligenceRecord(record);
    setRecords(readRecords());
    return saved;
  }

  function addDraft(input: ProductIntelligenceDraftInput) {
    const saved = saveProductIntelligenceRecord(createIntelligenceRecord(input));
    setRecords(readRecords());
    return saved;
  }

  function remove(id: string) {
    deleteProductIntelligenceRecord(id);
    setRecords(readRecords());
  }

  return {
    records,
    stats,
    upsert,
    addDraft,
    remove,
  };
}
'@

Save-Utf8NoBom -Path $dataPath -Content $data

Write-Step "Writing Product Intelligence Admin page"

$page = @'
import { useMemo, useState } from "react";
import {
  createIntelligenceRecord,
  type IntelligenceConnection,
  type IntelligenceEvidence,
  type IntelligenceRelationship,
  type ProductIntelligenceRecord,
  useProductIntelligenceAdmin,
} from "../data/productIntelligenceAdmin";

type IntelligenceTab = "review" | "builder" | "classification" | "relationships" | "governance";

const productClassOptions = [
  "unclassified",
  "distribution-amplifier",
  "signal-extender-kit",
  "transmitter",
  "receiver",
  "avoip-encoder",
  "avoip-decoder",
  "avoip-transceiver",
  "matrix-switch",
  "presentation-switcher",
  "hdmi-switcher",
  "uc-room-core",
  "wireless-presentation",
  "camera",
  "camera-bridge",
  "video-wall-processor",
  "multiview-processor",
  "software-capability",
  "audio-amplifier",
  "audio-dsp",
  "control-interface",
  "cable",
  "accessory",
  "competitor-unclassified",
];

function cloneRecord(record: ProductIntelligenceRecord): ProductIntelligenceRecord {
  return JSON.parse(JSON.stringify(record)) as ProductIntelligenceRecord;
}

function uid(prefix = "row") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function SurfaceToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="wm-intel-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="wm-intel-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="wm-intel-field wm-intel-field-wide">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function RecordStatusPill({ record }: { record: ProductIntelligenceRecord }) {
  return (
    <span className="wm-intel-status-pill" data-status={record.reviewStatus}>
      {record.reviewStatus.replace("-", " ")}
    </span>
  );
}

function ConnectionEditor({
  connections,
  onChange,
}: {
  connections: IntelligenceConnection[];
  onChange: (connections: IntelligenceConnection[]) => void;
}) {
  const update = (id: string, patch: Partial<IntelligenceConnection>) => {
    onChange(connections.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const add = () => {
    onChange([
      ...connections,
      {
        id: uid("conn"),
        side: "input",
        label: "New connection",
        connector: "HDMI",
        count: 1,
        notes: "",
      },
    ]);
  };

  return (
    <section className="wm-intel-subsection">
      <div className="wm-intel-subsection-head">
        <div>
          <h3>Physical connections</h3>
          <p>Model the real connectors, direction and count. This is what stops Finder showing the wrong product class.</p>
        </div>
        <button type="button" onClick={add}>Add connection</button>
      </div>

      <div className="wm-intel-connection-list">
        {connections.map((connection) => (
          <article key={connection.id}>
            <select value={connection.side} onChange={(event) => update(connection.id, { side: event.target.value as IntelligenceConnection["side"] })}>
              <option value="input">Input</option>
              <option value="output">Output</option>
              <option value="bidirectional">Bidirectional</option>
              <option value="usb">USB</option>
              <option value="audio">Audio</option>
              <option value="control">Control</option>
              <option value="network">Network</option>
            </select>

            <input value={connection.label} onChange={(event) => update(connection.id, { label: event.target.value })} placeholder="Label" />
            <input value={connection.connector} onChange={(event) => update(connection.id, { connector: event.target.value })} placeholder="Connector" />
            <input
              type="number"
              min={0}
              value={connection.count}
              onChange={(event) => update(connection.id, { count: Number(event.target.value || 0) })}
              placeholder="Count"
            />
            <input value={connection.notes} onChange={(event) => update(connection.id, { notes: event.target.value })} placeholder="Notes" />

            <button type="button" onClick={() => onChange(connections.filter((item) => item.id !== connection.id))}>Remove</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function RelationshipEditor({
  relationships,
  onChange,
}: {
  relationships: IntelligenceRelationship[];
  onChange: (relationships: IntelligenceRelationship[]) => void;
}) {
  const update = (id: string, patch: Partial<IntelligenceRelationship>) => {
    onChange(relationships.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const add = () => {
    onChange([
      ...relationships,
      {
        id: uid("rel"),
        relationshipType: "works-with",
        brand: "",
        sku: "",
        notes: "",
      },
    ]);
  };

  return (
    <section className="wm-intel-subsection">
      <div className="wm-intel-subsection-head">
        <div>
          <h3>Compatibility relationships</h3>
          <p>Capture products that work together, require each other, replace each other or should be compared.</p>
        </div>
        <button type="button" onClick={add}>Add relationship</button>
      </div>

      <div className="wm-intel-relationship-list">
        {relationships.map((relationship) => (
          <article key={relationship.id}>
            <select value={relationship.relationshipType} onChange={(event) => update(relationship.id, { relationshipType: event.target.value as IntelligenceRelationship["relationshipType"] })}>
              <option value="works-with">Works with</option>
              <option value="requires">Requires</option>
              <option value="alternative-to">Alternative to</option>
              <option value="replaced-by">Replaced by</option>
              <option value="accessory-for">Accessory for</option>
              <option value="source-side">Source side</option>
              <option value="display-side">Display side</option>
            </select>

            <input value={relationship.brand} onChange={(event) => update(relationship.id, { brand: event.target.value })} placeholder="Brand" />
            <input value={relationship.sku} onChange={(event) => update(relationship.id, { sku: event.target.value })} placeholder="SKU / product" />
            <input value={relationship.notes} onChange={(event) => update(relationship.id, { notes: event.target.value })} placeholder="Notes" />

            <button type="button" onClick={() => onChange(relationships.filter((item) => item.id !== relationship.id))}>Remove</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function EvidenceEditor({
  evidence,
  onChange,
}: {
  evidence: IntelligenceEvidence[];
  onChange: (evidence: IntelligenceEvidence[]) => void;
}) {
  const update = (id: string, patch: Partial<IntelligenceEvidence>) => {
    onChange(evidence.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const add = () => {
    onChange([
      ...evidence,
      {
        id: uid("ev"),
        sourceType: "user-note",
        title: "",
        url: "",
        notes: "",
      },
    ]);
  };

  return (
    <section className="wm-intel-subsection">
      <div className="wm-intel-subsection-head">
        <div>
          <h3>Evidence and source notes</h3>
          <p>Trusted product intelligence should have a source trail before it is approved for customer-facing use.</p>
        </div>
        <button type="button" onClick={add}>Add evidence</button>
      </div>

      <div className="wm-intel-evidence-list">
        {evidence.map((item) => (
          <article key={item.id}>
            <select value={item.sourceType} onChange={(event) => update(item.id, { sourceType: event.target.value as IntelligenceEvidence["sourceType"] })}>
              <option value="manual-entry">Manual entry</option>
              <option value="manufacturer-page">Manufacturer page</option>
              <option value="datasheet">Datasheet</option>
              <option value="manual">Manual</option>
              <option value="distributor-page">Distributor page</option>
              <option value="search-result">Search result</option>
              <option value="user-note">User note</option>
            </select>

            <input value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} placeholder="Evidence title" />
            <input value={item.url} onChange={(event) => update(item.id, { url: event.target.value })} placeholder="URL / source reference" />
            <textarea value={item.notes} onChange={(event) => update(item.id, { notes: event.target.value })} placeholder="Evidence notes" />

            <button type="button" onClick={() => onChange(evidence.filter((entry) => entry.id !== item.id))}>Remove</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function FeatureEditor({
  record,
  onChange,
}: {
  record: ProductIntelligenceRecord;
  onChange: (record: ProductIntelligenceRecord) => void;
}) {
  const updateFeature = <K extends keyof ProductIntelligenceRecord["features"]>(key: K, value: ProductIntelligenceRecord["features"][K]) => {
    onChange({
      ...record,
      features: {
        ...record.features,
        [key]: value,
      },
    });
  };

  const booleanFeatures: Array<[keyof ProductIntelligenceRecord["features"], string]> = [
    ["mst", "MST / dual display"],
    ["wirelessCasting", "Wireless casting"],
    ["ndi", "NDI"],
    ["dante", "Dante / AES67"],
    ["multiview", "Multiview"],
    ["videoWall", "Video wall"],
    ["scaling", "Scaling"],
    ["seamless", "Seamless"],
    ["hdbaset", "HDBaseT"],
    ["avoip", "AV-over-IP"],
    ["usb2", "USB 2.0"],
    ["usb3", "USB 3.x"],
    ["kvm", "KVM"],
    ["audioDeEmbed", "Audio de-embed"],
    ["audioEmbed", "Audio embed"],
    ["audioDsp", "Audio DSP"],
    ["phantomPower", "Phantom power"],
    ["ir", "IR"],
    ["rs232", "RS-232"],
    ["telnet", "Telnet"],
    ["ipControl", "IP control"],
  ];

  return (
    <section className="wm-intel-subsection">
      <div className="wm-intel-subsection-head">
        <div>
          <h3>Feature flags</h3>
          <p>Use these flags to describe capabilities that are not obvious from the SKU alone.</p>
        </div>
      </div>

      <div className="wm-intel-feature-grid">
        {booleanFeatures.map(([key, label]) => (
          <SurfaceToggle
            key={String(key)}
            label={label}
            checked={Boolean(record.features[key])}
            onChange={(checked) => updateFeature(key, checked as never)}
          />
        ))}
      </div>

      <div className="wm-intel-form-grid">
        <Field label="HDBaseT class" value={record.features.hdbasetClass} onChange={(value) => updateFeature("hdbasetClass", value)} />
        <Field label="Network speed" value={record.features.networkSpeed} onChange={(value) => updateFeature("networkSpeed", value)} />
        <Field label="USB host count" value={String(record.features.usbHostCount)} onChange={(value) => updateFeature("usbHostCount", Number(value || 0))} />
        <Field label="USB peripheral count" value={String(record.features.usbPeripheralCount)} onChange={(value) => updateFeature("usbPeripheralCount", Number(value || 0))} />
        <Field label="Mic inputs" value={String(record.features.micInputs)} onChange={(value) => updateFeature("micInputs", Number(value || 0))} />
        <Field label="Relays" value={String(record.features.relays)} onChange={(value) => updateFeature("relays", Number(value || 0))} />
      </div>
    </section>
  );
}

export function IntelligencePage() {
  const { records, stats, upsert, addDraft, remove } = useProductIntelligenceAdmin();
  const [activeTab, setActiveTab] = useState<IntelligenceTab>("review");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? "");
  const [draftBrand, setDraftBrand] = useState("");
  const [draftSku, setDraftSku] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftSourceType, setDraftSourceType] = useState<"wyrestorm" | "competitor">("competitor");

  const selectedRecord = useMemo(() => {
    const match = records.find((item) => item.id === selectedId);
    return match ? cloneRecord(match) : records[0] ? cloneRecord(records[0]) : null;
  }, [records, selectedId]);

  const filteredRecords = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    if (!normalisedQuery) {
      return records;
    }

    return records.filter((record) =>
      [
        record.brand,
        record.sku,
        record.productName,
        record.productClass,
        record.productRole,
        record.purpose,
        record.reviewStatus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalisedQuery),
    );
  }, [records, query]);

  const saveSelected = (record: ProductIntelligenceRecord) => {
    const saved = upsert(record);
    setSelectedId(saved.id);
  };

  const createDraft = () => {
    if (!draftSku.trim()) {
      return;
    }

    const created = addDraft({
      sourceType: draftSourceType,
      brand: draftBrand.trim() || (draftSourceType === "wyrestorm" ? "WyreStorm" : ""),
      sku: draftSku.trim(),
      productName: draftName.trim(),
    });

    setDraftSku("");
    setDraftName("");
    setSelectedId(created.id);
    setActiveTab("classification");
  };

  const stageWyreStormSweepItems = () => {
    const seeds = [
      createIntelligenceRecord({ sourceType: "wyrestorm", brand: "WyreStorm", sku: "MX-0402-MST", productName: "MST presentation switcher" }),
      createIntelligenceRecord({ sourceType: "wyrestorm", brand: "WyreStorm", sku: "MX-0403-H3-MST", productName: "MST presentation switcher / MTR feed workflow" }),
      createIntelligenceRecord({ sourceType: "wyrestorm", brand: "WyreStorm", sku: "Teams Camera Control App", productName: "Teams-certified camera control app" }),
    ];

    seeds.forEach((seed) => {
      if (!records.some((record) => record.sku.toLowerCase() === seed.sku.toLowerCase())) {
        upsert({
          ...seed,
          reviewStatus: "needs-review",
          confidence: seed.sku.includes("Teams") ? 45 : 70,
          reviewNotes: "Staged from Wingman sweep seed. Add trusted evidence before approval.",
        });
      }
    });
  };

  return (
    <main className="wm-intel-page">
      <section className="wm-intel-hero">
        <div>
          <p>Wingman intelligence</p>
          <h1>Product Intelligence Admin</h1>
          <span>
            Review WyreStorm and competitor product data before Finder, Compare, Product Pitch or Proposal use it as trusted intelligence.
          </span>
        </div>

        <button type="button" onClick={stageWyreStormSweepItems}>
          Stage WyreStorm sweep seeds
        </button>
      </section>

      <section className="wm-intel-stats">
        <article>
          <span>Total records</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Needs review</span>
          <strong>{stats.needsReview}</strong>
        </article>
        <article>
          <span>Approved</span>
          <strong>{stats.approved}</strong>
        </article>
        <article>
          <span>Competitor records</span>
          <strong>{stats.competitors}</strong>
        </article>
        <article>
          <span>WyreStorm records</span>
          <strong>{stats.wyrestorm}</strong>
        </article>
      </section>

      <section className="wm-intel-tabs">
        {[
          ["review", "Review queue"],
          ["builder", "Competitor builder"],
          ["classification", "Classification editor"],
          ["relationships", "Relationships"],
          ["governance", "Governance"],
        ].map(([id, label]) => (
          <button key={id} type="button" className={activeTab === id ? "is-active" : ""} onClick={() => setActiveTab(id as IntelligenceTab)}>
            {label}
          </button>
        ))}
      </section>

      <section className="wm-intel-workspace">
        <aside className="wm-intel-record-list">
          <label>
            Search records
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Brand, SKU, class, status..." />
          </label>

          <div>
            {filteredRecords.map((record) => (
              <button
                key={record.id}
                type="button"
                className={record.id === selectedId ? "is-selected" : ""}
                onClick={() => setSelectedId(record.id)}
              >
                <span>{record.brand || "Unknown brand"}</span>
                <strong>{record.sku}</strong>
                <small>{record.productClass}</small>
                <RecordStatusPill record={record} />
              </button>
            ))}
          </div>
        </aside>

        <section className="wm-intel-editor">
          {activeTab === "builder" ? (
            <section className="wm-intel-panel">
              <div className="wm-intel-panel-head">
                <div>
                  <p>Builder</p>
                  <h2>Create competitor or WyreStorm draft</h2>
                  <span>Start with brand and SKU. Wingman creates a structured draft that must be reviewed before approval.</span>
                </div>
              </div>

              <div className="wm-intel-form-grid">
                <label className="wm-intel-field">
                  <span>Source type</span>
                  <select value={draftSourceType} onChange={(event) => setDraftSourceType(event.target.value as "wyrestorm" | "competitor")}>
                    <option value="competitor">Competitor</option>
                    <option value="wyrestorm">WyreStorm</option>
                  </select>
                </label>

                <Field label="Brand" value={draftBrand} onChange={setDraftBrand} placeholder="e.g. Kramer, Blustream, Just Add Power" />
                <Field label="SKU" value={draftSku} onChange={setDraftSku} placeholder="Exact competitor or WyreStorm SKU" />
                <Field label="Product name" value={draftName} onChange={setDraftName} placeholder="Optional" />
              </div>

              <button type="button" className="wm-intel-primary-button" onClick={createDraft}>
                Create intelligence draft
              </button>

              <article className="wm-intel-guidance">
                <h3>Competitor record rule</h3>
                <p>
                  Do not approve a competitor record from brand and SKU alone. Add evidence from datasheets, manuals, manufacturer pages, distributor pages or user-supplied documents first.
                </p>
              </article>
            </section>
          ) : null}

          {selectedRecord && activeTab !== "builder" ? (
            <section className="wm-intel-panel">
              <div className="wm-intel-panel-head">
                <div>
                  <p>{selectedRecord.sourceType === "wyrestorm" ? "WyreStorm record" : "Competitor record"}</p>
                  <h2>{selectedRecord.sku || "New product intelligence"}</h2>
                  <span>{selectedRecord.brand} - {selectedRecord.productClass}</span>
                </div>

                <RecordStatusPill record={selectedRecord} />
              </div>

              {activeTab === "review" ? (
                <>
                  <div className="wm-intel-form-grid">
                    <Field label="Brand" value={selectedRecord.brand} onChange={(value) => saveSelected({ ...selectedRecord, brand: value })} />
                    <Field label="SKU" value={selectedRecord.sku} onChange={(value) => saveSelected({ ...selectedRecord, sku: value })} />
                    <Field label="Product name" value={selectedRecord.productName} onChange={(value) => saveSelected({ ...selectedRecord, productName: value })} />

                    <label className="wm-intel-field">
                      <span>Review status</span>
                      <select value={selectedRecord.reviewStatus} onChange={(event) => saveSelected({ ...selectedRecord, reviewStatus: event.target.value as ProductIntelligenceRecord["reviewStatus"] })}>
                        <option value="draft">Draft</option>
                        <option value="needs-review">Needs review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </label>

                    <label className="wm-intel-field">
                      <span>Confidence</span>
                      <input type="number" min={0} max={100} value={selectedRecord.confidence} onChange={(event) => saveSelected({ ...selectedRecord, confidence: Number(event.target.value || 0) })} />
                    </label>
                  </div>

                  <TextAreaField label="Purpose" value={selectedRecord.purpose} onChange={(value) => saveSelected({ ...selectedRecord, purpose: value })} />
                  <TextAreaField label="Review notes" value={selectedRecord.reviewNotes} onChange={(value) => saveSelected({ ...selectedRecord, reviewNotes: value })} />

                  <section className="wm-intel-approval-box">
                    <h3>Approved for customer-facing use</h3>
                    <div className="wm-intel-feature-grid">
                      <SurfaceToggle label="Finder" checked={selectedRecord.approvedFor.finder} onChange={(checked) => saveSelected({ ...selectedRecord, approvedFor: { ...selectedRecord.approvedFor, finder: checked } })} />
                      <SurfaceToggle label="Compare" checked={selectedRecord.approvedFor.compare} onChange={(checked) => saveSelected({ ...selectedRecord, approvedFor: { ...selectedRecord.approvedFor, compare: checked } })} />
                      <SurfaceToggle label="Proposal" checked={selectedRecord.approvedFor.proposal} onChange={(checked) => saveSelected({ ...selectedRecord, approvedFor: { ...selectedRecord.approvedFor, proposal: checked } })} />
                      <SurfaceToggle label="Product Pitch" checked={selectedRecord.approvedFor.pitch} onChange={(checked) => saveSelected({ ...selectedRecord, approvedFor: { ...selectedRecord.approvedFor, pitch: checked } })} />
                    </div>
                  </section>

                  <EvidenceEditor evidence={selectedRecord.evidence} onChange={(evidence) => saveSelected({ ...selectedRecord, evidence })} />
                </>
              ) : null}

              {activeTab === "classification" ? (
                <>
                  <div className="wm-intel-form-grid">
                    <label className="wm-intel-field">
                      <span>Product class</span>
                      <select value={selectedRecord.productClass} onChange={(event) => saveSelected({ ...selectedRecord, productClass: event.target.value })}>
                        {productClassOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>

                    <Field label="Product role" value={selectedRecord.productRole} onChange={(value) => saveSelected({ ...selectedRecord, productRole: value })} />
                    <Field label="Family" value={selectedRecord.family} onChange={(value) => saveSelected({ ...selectedRecord, family: value })} />
                    <Field
                      label="Software / built-in connections"
                      value={selectedRecord.softwareConnections.join(", ")}
                      onChange={(value) => saveSelected({ ...selectedRecord, softwareConnections: value.split(",").map((item) => item.trim()).filter(Boolean) })}
                      placeholder="NDI, AirPlay, Miracast, Teams, Dante..."
                    />
                  </div>

                  <ConnectionEditor connections={selectedRecord.physicalConnections} onChange={(physicalConnections) => saveSelected({ ...selectedRecord, physicalConnections })} />
                  <FeatureEditor record={selectedRecord} onChange={saveSelected} />
                </>
              ) : null}

              {activeTab === "relationships" ? (
                <RelationshipEditor relationships={selectedRecord.relationships} onChange={(relationships) => saveSelected({ ...selectedRecord, relationships })} />
              ) : null}

              {activeTab === "governance" ? (
                <section className="wm-intel-governance">
                  <article>
                    <h3>Approval rule</h3>
                    <p>Draft or needs-review records must not influence Finder, Compare or Proposal as trusted results. They can be visible only inside this admin workspace.</p>
                  </article>

                  <article>
                    <h3>Evidence rule</h3>
                    <p>Competitor data should be supported by at least one useful evidence source. Manufacturer pages are best, but manuals, datasheets, distributor pages and user-supplied files are also valuable.</p>
                  </article>

                  <article>
                    <h3>Classification rule</h3>
                    <p>Classify by product purpose first, not shared connector words. HDMI presence alone must never make a cable, extender, switcher and matrix equivalent.</p>
                  </article>

                  <article>
                    <h3>USB rule</h3>
                    <p>Track host side, peripheral side, USB speed and device count. A viable USB design must work end-to-end, especially for BYOM, cameras, speakerphones and touch displays.</p>
                  </article>
                </section>
              ) : null}

              <div className="wm-intel-danger-row">
                <button type="button" onClick={() => remove(selectedRecord.id)}>Delete record</button>
              </div>
            </section>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default IntelligencePage;
'@

Save-Utf8NoBom -Path $pagePath -Content $page

Write-Step "Patching route catalog"

$routeCatalog = Get-Content -LiteralPath $routeCatalogPath -Raw
$routeCatalog = $routeCatalog -replace "`r`n", "`n"

if ($routeCatalog -notmatch "Database") {
  $routeCatalog = $routeCatalog.Replace(
    "  ClipboardList,`n",
    "  ClipboardList,`n  Database,`n"
  )
}

if ($routeCatalog -notmatch '\| "intelligence"') {
  $routeCatalog = $routeCatalog.Replace(
    '  | "support"',
    '  | "support"' + "`n" + '  | "intelligence"'
  )
}

if ($routeCatalog -notmatch 'intelligence: Database') {
  $routeCatalog = $routeCatalog.Replace(
    "  support: LifeBuoy,`n",
    "  support: LifeBuoy,`n  intelligence: Database,`n"
  )
}

Save-Utf8NoBom -Path $routeCatalogPath -Content $routeCatalog

Write-Step "Patching route registry"

$routes = Get-Content -LiteralPath $routesPath -Raw
$routes = $routes -replace "`r`n", "`n"

if ($routes -notmatch 'intelligence: lazy') {
  $routes = $routes.Replace(
    '  support: lazy(fromNamedExport(() => import("../pages/SupportPage"), "SupportPage")),',
    '  support: lazy(fromNamedExport(() => import("../pages/SupportPage"), "SupportPage")),' + "`n" + '  intelligence: lazy(fromNamedExport(() => import("../pages/IntelligencePage"), "IntelligencePage")),'
  )
}

Save-Utf8NoBom -Path $routesPath -Content $routes

Write-Step "Writing route manifest with Product Intelligence and Profile"

$manifest = @'
[
  {
    "key": "dashboard",
    "path": "/wingman/dashboard",
    "segment": "dashboard",
    "label": "Dashboard",
    "navLabel": "Dashboard",
    "pageFile": "DashboardPage.tsx",
    "summary": "Route the user into the right sales motion quickly."
  },
  {
    "key": "projects",
    "path": "/wingman/projects",
    "segment": "projects",
    "label": "Project Management",
    "navLabel": "Project Management",
    "pageFile": "ProjectsPage.tsx",
    "summary": "Resume active opportunities and keep stage progress visible."
  },
  {
    "key": "discovery",
    "path": "/wingman/discovery",
    "segment": "discovery",
    "label": "Discovery",
    "navLabel": "Discovery",
    "pageFile": "DiscoveryPage.tsx",
    "summary": "Turn vague customer requests into a structured brief."
  },
  {
    "key": "finder",
    "path": "/wingman/finder",
    "segment": "finder",
    "label": "Product Finder",
    "navLabel": "Product Finder",
    "pageFile": "FinderPage.tsx",
    "summary": "Match the brief to the right WyreStorm direction."
  },
  {
    "key": "productFamilies",
    "path": "/wingman/product-families",
    "segment": "product-families",
    "label": "Product Families",
    "navLabel": "Product Families",
    "pageFile": "ProductFamilyPage.tsx",
    "summary": "Explain each WyreStorm product family in practical sales language."
  },
  {
    "key": "productPitch",
    "path": "/wingman/product-pitch",
    "segment": "product-pitch",
    "label": "Product Pitch",
    "navLabel": "Product Pitch",
    "pageFile": "ProductPitchPage.tsx",
    "summary": "Create a one-page sales overview from any WyreStorm SKU."
  },
  {
    "key": "compare",
    "path": "/wingman/compare",
    "segment": "compare",
    "label": "Competitor Product Check",
    "navLabel": "Competitor Product Check",
    "pageFile": "ComparePage.tsx",
    "summary": "Understand the competitor product and position a credible WyreStorm option."
  },
  {
    "key": "templates",
    "path": "/wingman/templates",
    "segment": "templates",
    "label": "Room Templates",
    "navLabel": "Room Templates",
    "pageFile": "TemplatesPage.tsx",
    "summary": "Start from a known room archetype and pre-fill the workflow."
  },
  {
    "key": "videowall",
    "path": "/wingman/videowall",
    "segment": "videowall",
    "label": "Videowall Builder",
    "navLabel": "Videowall Builder",
    "pageFile": "VideowallBuilderPage.tsx",
    "summary": "Visualise LED or LCD wall signal flow and shape the design direction."
  },
  {
    "key": "salesHelper",
    "path": "/wingman/sales-helper",
    "segment": "sales-helper",
    "label": "Sales Strategy",
    "navLabel": "Sales Strategy",
    "pageFile": "SalesHelperPage.tsx",
    "summary": "Turn technical findings into rep-friendly positioning."
  },
  {
    "key": "callCards",
    "path": "/wingman/call-cards",
    "segment": "call-cards",
    "label": "Live Call Cards",
    "navLabel": "Live Call Cards",
    "pageFile": "CallCardsPage.tsx",
    "summary": "Give reps live-call prompts for common AV conversations."
  },
  {
    "key": "ingest",
    "path": "/wingman/ingest",
    "segment": "ingest",
    "label": "Document Ingest",
    "navLabel": "Document Ingest",
    "pageFile": "IngestPage.tsx",
    "summary": "Convert customer documents into a structured brief."
  },
  {
    "key": "proposal",
    "path": "/wingman/proposal",
    "segment": "proposal",
    "label": "Proposal Builder",
    "navLabel": "Proposal Builder",
    "pageFile": "ProposalPage.tsx",
    "summary": "Package the recommendation into customer-safe output."
  },
  {
    "key": "intelligence",
    "path": "/wingman/intelligence",
    "segment": "intelligence",
    "label": "Product Intelligence",
    "navLabel": "Product Intelligence",
    "pageFile": "IntelligencePage.tsx",
    "summary": "Review, classify and approve WyreStorm and competitor product intelligence."
  },
  {
    "key": "profile",
    "path": "/wingman/profile",
    "segment": "profile",
    "label": "Profile / Admin",
    "navLabel": "Profile / Admin",
    "pageFile": "ProfilePage.tsx",
    "summary": "Store local user, company, language and proposal branding settings."
  },
  {
    "key": "support",
    "path": "/wingman/support",
    "segment": "support",
    "label": "Support",
    "navLabel": "Support",
    "pageFile": "SupportPage.tsx",
    "summary": "Escalate risk, request review, and track completion gaps."
  }
]
'@

Save-Utf8NoBom -Path $routeManifestPath -Content $manifest

Write-Step "Adding Product Intelligence Admin CSS"

$css = Get-Content -LiteralPath $cssPath -Raw
$css = $css -replace "`r`n", "`n"

$block = @'

/* WINGMAN-PRODUCT-INTELLIGENCE-ADMIN-START */
.wm-intel-page {
  min-height: calc(100vh - var(--wm-topbar-height) - 24px) !important;
  display: grid !important;
  grid-template-rows: auto auto auto minmax(0, 1fr) !important;
  gap: 12px !important;
  overflow: hidden !important;
}

.wm-intel-hero,
.wm-intel-stats,
.wm-intel-tabs,
.wm-intel-record-list,
.wm-intel-panel {
  border: 1px solid rgba(148, 163, 184, 0.26) !important;
  background: #ffffff !important;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08) !important;
}

.wm-intel-hero {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 16px !important;
  border-radius: 24px !important;
  padding: 16px 18px !important;
  background: radial-gradient(circle at top right, rgba(246, 163, 64, 0.12), transparent 26rem), #ffffff !important;
}

.wm-intel-hero p,
.wm-intel-panel-head p {
  margin: 0 !important;
  color: #b45309 !important;
  font-size: 0.68rem !important;
  font-weight: 850 !important;
  letter-spacing: 0.14em !important;
  text-transform: uppercase !important;
}

.wm-intel-hero h1 {
  margin: 4px 0 0 !important;
  color: #0f172a !important;
  font-size: clamp(1.5rem, 2.6vw, 2.35rem) !important;
  line-height: 1.02 !important;
  font-weight: 850 !important;
  letter-spacing: -0.045em !important;
}

.wm-intel-hero span,
.wm-intel-panel-head span,
.wm-intel-subsection-head p,
.wm-intel-guidance p,
.wm-intel-governance p {
  display: block !important;
  margin-top: 6px !important;
  color: #64748b !important;
  font-size: 0.84rem !important;
  line-height: 1.42 !important;
}

.wm-intel-hero button,
.wm-intel-primary-button,
.wm-intel-subsection-head button,
.wm-intel-danger-row button {
  min-height: 36px !important;
  border: 1px solid rgba(148, 163, 184, 0.34) !important;
  border-radius: 999px !important;
  background: #0f172a !important;
  color: #ffffff !important;
  padding: 0 14px !important;
  font-size: 0.78rem !important;
  font-weight: 850 !important;
  cursor: pointer !important;
}

.wm-intel-stats {
  display: grid !important;
  grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
  gap: 1px !important;
  overflow: hidden !important;
  border-radius: 20px !important;
}

.wm-intel-stats article {
  padding: 12px 14px !important;
  background: #f8fafc !important;
}

.wm-intel-stats span {
  display: block !important;
  color: #64748b !important;
  font-size: 0.68rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.1em !important;
  text-transform: uppercase !important;
}

.wm-intel-stats strong {
  display: block !important;
  margin-top: 4px !important;
  color: #0f172a !important;
  font-size: 1.45rem !important;
  line-height: 1 !important;
  font-weight: 850 !important;
}

.wm-intel-tabs {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  border-radius: 20px !important;
  padding: 10px !important;
}

.wm-intel-tabs button {
  min-height: 34px !important;
  border: 1px solid rgba(148, 163, 184, 0.28) !important;
  border-radius: 999px !important;
  background: #f8fafc !important;
  color: #334155 !important;
  padding: 0 12px !important;
  font-size: 0.78rem !important;
  font-weight: 800 !important;
  cursor: pointer !important;
}

.wm-intel-tabs button.is-active {
  border-color: rgba(246, 163, 64, 0.85) !important;
  background: #fff7ed !important;
  color: #0f172a !important;
}

.wm-intel-workspace {
  min-height: 0 !important;
  display: grid !important;
  grid-template-columns: 320px minmax(0, 1fr) !important;
  gap: 12px !important;
  overflow: hidden !important;
}

.wm-intel-record-list,
.wm-intel-editor {
  min-height: 0 !important;
  overflow-y: auto !important;
}

.wm-intel-record-list {
  display: grid !important;
  align-content: start !important;
  gap: 10px !important;
  border-radius: 22px !important;
  padding: 12px !important;
}

.wm-intel-record-list label,
.wm-intel-field {
  display: grid !important;
  gap: 6px !important;
  color: #64748b !important;
  font-size: 0.68rem !important;
  font-weight: 850 !important;
  letter-spacing: 0.1em !important;
  text-transform: uppercase !important;
}

.wm-intel-record-list input,
.wm-intel-field input,
.wm-intel-field select,
.wm-intel-field textarea,
.wm-intel-connection-list input,
.wm-intel-connection-list select,
.wm-intel-relationship-list input,
.wm-intel-relationship-list select,
.wm-intel-evidence-list input,
.wm-intel-evidence-list select,
.wm-intel-evidence-list textarea {
  width: 100% !important;
  border: 1px solid rgba(148, 163, 184, 0.34) !important;
  border-radius: 12px !important;
  background: #ffffff !important;
  color: #0f172a !important;
  font-size: 0.82rem !important;
  font-weight: 600 !important;
  outline: none !important;
}

.wm-intel-record-list input,
.wm-intel-field input,
.wm-intel-field select,
.wm-intel-connection-list input,
.wm-intel-connection-list select,
.wm-intel-relationship-list input,
.wm-intel-relationship-list select,
.wm-intel-evidence-list input,
.wm-intel-evidence-list select {
  min-height: 36px !important;
  padding: 0 10px !important;
}

.wm-intel-field textarea,
.wm-intel-evidence-list textarea {
  min-height: 90px !important;
  padding: 10px !important;
  line-height: 1.42 !important;
  resize: vertical !important;
}

.wm-intel-record-list > div {
  display: grid !important;
  gap: 8px !important;
}

.wm-intel-record-list button {
  display: grid !important;
  gap: 4px !important;
  border: 1px solid rgba(148, 163, 184, 0.26) !important;
  border-radius: 16px !important;
  background: #f8fafc !important;
  padding: 10px !important;
  text-align: left !important;
  cursor: pointer !important;
}

.wm-intel-record-list button.is-selected {
  border-color: rgba(246, 163, 64, 0.75) !important;
  background: #fff7ed !important;
  box-shadow: inset 4px 0 0 #f59e0b !important;
}

.wm-intel-record-list button span,
.wm-intel-record-list button small {
  color: #64748b !important;
  font-size: 0.72rem !important;
  line-height: 1.25 !important;
}

.wm-intel-record-list button strong {
  color: #0f172a !important;
  font-size: 0.94rem !important;
  line-height: 1.15 !important;
}

.wm-intel-panel {
  display: grid !important;
  gap: 14px !important;
  border-radius: 22px !important;
  padding: 16px !important;
}

.wm-intel-panel-head {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 14px !important;
}

.wm-intel-panel-head h2 {
  margin: 4px 0 0 !important;
  color: #0f172a !important;
  font-size: clamp(1.3rem, 2vw, 1.9rem) !important;
  line-height: 1.05 !important;
  font-weight: 850 !important;
  letter-spacing: -0.04em !important;
}

.wm-intel-status-pill {
  width: fit-content !important;
  border-radius: 999px !important;
  padding: 5px 8px !important;
  color: #334155 !important;
  background: #e2e8f0 !important;
  font-size: 0.66rem !important;
  font-weight: 850 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
}

.wm-intel-status-pill[data-status="approved"] {
  color: #14532d !important;
  background: #dcfce7 !important;
}

.wm-intel-status-pill[data-status="needs-review"] {
  color: #7c2d12 !important;
  background: #ffedd5 !important;
}

.wm-intel-status-pill[data-status="rejected"] {
  color: #7f1d1d !important;
  background: #fee2e2 !important;
}

.wm-intel-form-grid,
.wm-intel-feature-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)) !important;
  gap: 10px !important;
}

.wm-intel-field-wide {
  grid-column: 1 / -1 !important;
}

.wm-intel-subsection,
.wm-intel-approval-box,
.wm-intel-guidance,
.wm-intel-governance article {
  display: grid !important;
  gap: 12px !important;
  border: 1px solid rgba(148, 163, 184, 0.22) !important;
  border-radius: 18px !important;
  background: #f8fafc !important;
  padding: 14px !important;
}

.wm-intel-subsection-head {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 12px !important;
}

.wm-intel-subsection h3,
.wm-intel-approval-box h3,
.wm-intel-guidance h3,
.wm-intel-governance h3 {
  margin: 0 !important;
  color: #0f172a !important;
  font-size: 0.96rem !important;
  line-height: 1.2 !important;
  font-weight: 850 !important;
}

.wm-intel-toggle {
  min-height: 38px !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  border: 1px solid rgba(148, 163, 184, 0.24) !important;
  border-radius: 14px !important;
  background: #ffffff !important;
  padding: 8px 10px !important;
  color: #334155 !important;
  font-size: 0.8rem !important;
  font-weight: 760 !important;
}

.wm-intel-toggle input {
  width: 16px !important;
  height: 16px !important;
}

.wm-intel-connection-list,
.wm-intel-relationship-list,
.wm-intel-evidence-list,
.wm-intel-governance {
  display: grid !important;
  gap: 10px !important;
}

.wm-intel-connection-list article {
  display: grid !important;
  grid-template-columns: 130px 1fr 1fr 80px 1.4fr auto !important;
  gap: 8px !important;
}

.wm-intel-relationship-list article {
  display: grid !important;
  grid-template-columns: 150px 1fr 1fr 1.4fr auto !important;
  gap: 8px !important;
}

.wm-intel-evidence-list article {
  display: grid !important;
  grid-template-columns: 150px 1fr 1.2fr auto !important;
  gap: 8px !important;
}

.wm-intel-evidence-list textarea {
  grid-column: 1 / -2 !important;
}

.wm-intel-connection-list button,
.wm-intel-relationship-list button,
.wm-intel-evidence-list button {
  min-height: 36px !important;
  border: 1px solid rgba(239, 68, 68, 0.28) !important;
  border-radius: 12px !important;
  background: #fff1f2 !important;
  color: #991b1b !important;
  padding: 0 10px !important;
  font-size: 0.76rem !important;
  font-weight: 850 !important;
}

.wm-intel-danger-row {
  display: flex !important;
  justify-content: flex-end !important;
}

.wm-intel-danger-row button {
  background: #991b1b !important;
}

@media (max-width: 1180px) {
  .wm-intel-page {
    height: auto !important;
    overflow: visible !important;
  }

  .wm-intel-workspace,
  .wm-intel-stats {
    grid-template-columns: 1fr !important;
  }

  .wm-intel-record-list,
  .wm-intel-editor {
    overflow: visible !important;
  }

  .wm-intel-connection-list article,
  .wm-intel-relationship-list article,
  .wm-intel-evidence-list article {
    grid-template-columns: 1fr !important;
  }

  .wm-intel-evidence-list textarea {
    grid-column: auto !important;
  }
}

@media (max-width: 720px) {
  .wm-intel-hero,
  .wm-intel-panel-head,
  .wm-intel-subsection-head {
    display: grid !important;
  }

  .wm-intel-form-grid,
  .wm-intel-feature-grid {
    grid-template-columns: 1fr !important;
  }
}
/* WINGMAN-PRODUCT-INTELLIGENCE-ADMIN-END */
'@

if ($css -match "/\* WINGMAN-PRODUCT-INTELLIGENCE-ADMIN-START \*/[\s\S]*?/\* WINGMAN-PRODUCT-INTELLIGENCE-ADMIN-END \*/") {
  $css = [regex]::Replace(
    $css,
    "/\* WINGMAN-PRODUCT-INTELLIGENCE-ADMIN-START \*/[\s\S]*?/\* WINGMAN-PRODUCT-INTELLIGENCE-ADMIN-END \*/",
    $block.Trim()
  )
}

if ($css -notmatch "WINGMAN-PRODUCT-INTELLIGENCE-ADMIN-START") {
  $css = $css.TrimEnd() + "`n" + $block + "`n"
}

Save-Utf8NoBom -Path $cssPath -Content $css

Write-Step "Running validation"

npm run typecheck

Write-Host ""
Write-Host "Product Intelligence Admin created at /wingman/intelligence." -ForegroundColor Green
Write-Host ""
Write-Host "Now run:"
Write-Host "npm run build"
Write-Host "npm run dev"
