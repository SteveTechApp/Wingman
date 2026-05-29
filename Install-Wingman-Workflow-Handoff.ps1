$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Save-Utf8NoBom {
  param([string]$Path, [string]$Content)
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Backup-File {
  param([string]$Path)
  if (Test-Path $Path) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item -LiteralPath $Path -Destination "$Path.bak-$stamp" -Force
    Write-Host "Backup created: $Path.bak-$stamp" -ForegroundColor DarkGray
  }
}

function Replace-Once {
  param(
    [string]$Content,
    [string]$Old,
    [string]$New,
    [string]$Label
  )
  if (-not $Content.Contains($Old)) {
    throw "Could not find expected block for $Label"
  }
  return $Content.Replace($Old, $New)
}

function Regex-Replace-Once {
  param(
    [string]$Content,
    [string]$Pattern,
    [string]$Replacement,
    [string]$Label
  )
  $next = [regex]::Replace($Content, $Pattern, $Replacement, 1)
  if ($next -eq $Content) {
    throw "Could not update $Label"
  }
  return $next
}

$root = (Get-Location).Path
$handoffPath = Join-Path $root "src\wingman2\data\workflowHandoff.ts"
$discoveryPath = Join-Path $root "src\wingman2\pages\DiscoveryPage.tsx"
$finderPath = Join-Path $root "src\wingman2\pages\FinderPage.tsx"
$proposalPath = Join-Path $root "src\wingman2\pages\ProposalPage.tsx"
$projectStorePath = Join-Path $root "src\wingman2\data\projectStore.ts"
$proposalExportPath = Join-Path $root "src\wingman2\lib\proposalExport.ts"

Write-Step "Checking files"

foreach ($path in @($discoveryPath, $finderPath, $proposalPath, $projectStorePath, $proposalExportPath)) {
  if (-not (Test-Path $path)) {
    throw "Missing file: $path"
  }
}

foreach ($path in @($handoffPath, $discoveryPath, $finderPath, $proposalPath, $projectStorePath, $proposalExportPath)) {
  Backup-File $path
}

Write-Step "Writing workflow handoff data model"

$handoff = @'
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  getCurrentWorkflowProject,
  readProjectStore,
  type StoredDiscoveryBrief,
} from "./projectStore";

export const DISCOVERY_BRIEF_KEY = "wingman-discovery-brief";
export const DISCOVERY_SNAPSHOT_KEY = "wingman-discovery-snapshot-v2";

export type DiscoverySnapshot = {
  activeStepIndex: number;
  state: Record<string, unknown>;
  brief: StoredDiscoveryBrief;
  savedAt: string;
};

export type FinderNeedDraft = {
  query: string;
  technicalRequirement: string;
  productPath: string;
  technologyType: string;
  signalType: string;
  sourceConnector: string;
  displayConnector: string;
  inputs: string;
  outputs: string;
  distance: string;
  resolution: string;
  usb: string;
  audio: string;
  network: string;
  processing: string;
  control: string;
};

function nowIso() {
  return new Date().toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, fallback = "") {
  const valueText = String(value ?? "").trim();
  return valueText || fallback;
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function arrayText(value: unknown) {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

function containsAny(value: string, terms: string[]) {
  const haystack = value.toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function countBand(count: number) {
  if (!Number.isFinite(count) || count <= 0) return "Unknown";
  if (count === 1) return "1";
  if (count === 2) return "2";
  if (count <= 4) return "3-4";
  if (count <= 8) return "5-8";
  return "9+";
}

function sourceCountBand(roomModel: Record<string, unknown>) {
  const sourceTypes = arrayText(roomModel.sourceTypes);
  return countBand(sourceTypes.length);
}

function displayCountBand(roomModel: Record<string, unknown>) {
  const arrangement = lower(roomModel.displayArrangement);
  const behaviour = lower(roomModel.displayBehaviour);

  if (containsAny(arrangement, ["single", "projector"])) return "1";
  if (containsAny(arrangement, ["dual", "content display + conferencing"])) return "2";
  if (containsAny(arrangement, ["lcd wall", "led wall", "wall"])) return "3-4";
  if (containsAny(arrangement, ["distributed", "multi-zone"]) || containsAny(behaviour, ["per display", "future expansion"])) return "5-8";
  return "Unknown";
}

function mapDistance(value: unknown) {
  const run = lower(value);
  if (containsAny(run, ["under 5m"])) return "Local <5m";
  if (containsAny(run, ["5-10m"])) return "Short 5-10m";
  if (containsAny(run, ["10-35m"])) return "Medium 10-35m";
  if (containsAny(run, ["35-70m"])) return "Long 35-70m";
  if (containsAny(run, ["70-100m", "100m+"])) return "Very long 70-100m";
  return "";
}

function mapSourceConnector(roomModel: Record<string, unknown>) {
  const blob = [
    roomModel.sourceConnection,
    ...arrayText(roomModel.sourceTypes),
    ...arrayText(roomModel.sourceLocations),
  ].join(" ");

  if (containsAny(blob, ["usb-c", "usb c"])) return "USB-C";
  if (containsAny(blob, ["ndi", "network"])) return "RJ45 / network";
  if (containsAny(blob, ["hdmi"])) return "HDMI";
  if (containsAny(blob, ["wireless"])) return "RJ45 / network";
  return "";
}

function mapSignalType(roomModel: Record<string, unknown>) {
  const blob = [
    roomModel.sourceConnection,
    roomModel.displayBehaviour,
    roomModel.designDirection,
    ...arrayText(roomModel.sourceTypes),
  ].join(" ");

  if (containsAny(blob, ["ndi"])) return "NDI / network video";
  if (containsAny(blob, ["usb-c", "usb c"])) return "USB-C video";
  if (containsAny(blob, ["usb", "byom", "camera", "conferencing"])) return "HDMI + USB";
  if (containsAny(blob, ["distributed", "network", "avoip", "multi-zone"])) return "Mixed AV system";
  if (containsAny(blob, ["audio"])) return "Audio only";
  return "HDMI video";
}

function mapUsb(roomModel: Record<string, unknown>) {
  const blob = [roomModel.usbNeed, roomModel.displayBehaviour, roomModel.designDirection, ...arrayText(roomModel.sourceTypes)].join(" ");
  if (containsAny(blob, ["usb 3", "3.x"])) return "USB 3.x required";
  if (containsAny(blob, ["camera"])) return "USB camera";
  if (containsAny(blob, ["speakerphone"])) return "Speakerphone / audio USB";
  if (containsAny(blob, ["touch"])) return "Touch return";
  if (containsAny(blob, ["byom", "mtr", "conferencing", "usb", "room pc"])) return "USB 2.0 enough";
  if (containsAny(blob, ["no usb"])) return "No USB";
  return "";
}

function mapAudio(roomModel: Record<string, unknown>) {
  const blob = [roomModel.audioNeed, ...arrayText(roomModel.sourceTypes)].join(" ");
  if (containsAny(blob, ["dante", "aes67"])) return "Dante / AES67";
  if (containsAny(blob, ["dsp"])) return "DSP integration";
  if (containsAny(blob, ["microphone", "mic", "speakerphone"])) return "Mic / speakerphone";
  if (containsAny(blob, ["de-embed", "de embed"])) return "Audio de-embed";
  if (containsAny(blob, ["speaker"])) return "Amplifier / speakers";
  return "";
}

function mapNetwork(roomModel: Record<string, unknown>) {
  const blob = [roomModel.network, roomModel.designDirection, ...arrayText(roomModel.sourceTypes)].join(" ");
  if (containsAny(blob, ["ndi"])) return "NDI source present";
  if (containsAny(blob, ["10g"])) return "10G network";
  if (containsAny(blob, ["dedicated av", "managed switch"])) return "Dedicated AV network";
  if (containsAny(blob, ["existing it"])) return "Existing LAN";
  return "";
}

function mapControl(roomModel: Record<string, unknown>) {
  const blob = [roomModel.controlNeed].join(" ");
  if (containsAny(blob, ["rs-232", "rs232"])) return "RS-232";
  if (containsAny(blob, ["ir"])) return "IR";
  if (containsAny(blob, ["touch panel"])) return "Touch panel";
  if (containsAny(blob, ["web ui"])) return "Web UI";
  if (containsAny(blob, ["third-party"])) return "Third-party control";
  if (containsAny(blob, ["display power"])) return "Display power control";
  return "";
}

function mapProcessing(roomModel: Record<string, unknown>) {
  const blob = [roomModel.displayArrangement, roomModel.displayBehaviour, roomModel.designDirection].join(" ");
  if (containsAny(blob, ["video wall", "lcd wall", "led wall", "wall processing"])) return "Video wall processing";
  if (containsAny(blob, ["multiview", "multi view"])) return "Multiview";
  if (containsAny(blob, ["seamless"])) return "Seamless switching";
  if (containsAny(blob, ["scaling"])) return "Scaling";
  if (containsAny(blob, ["routing", "choose source per display", "matrix"])) return "Matrix routing";
  if (containsAny(blob, ["avoip", "network"])) return "AVoIP routing";
  return "";
}

function mapRequirement(roomModel: Record<string, unknown>) {
  const blob = [
    roomModel.roomType,
    roomModel.displayArrangement,
    roomModel.displayBehaviour,
    roomModel.usbNeed,
    roomModel.cableRun,
    roomModel.network,
    roomModel.designDirection,
    ...arrayText(roomModel.sourceTypes),
  ].join(" ");

  if (containsAny(blob, ["led wall"])) return "Feed LED wall processor";
  if (containsAny(blob, ["lcd wall", "video wall"])) return "Build LCD video wall";
  if (containsAny(blob, ["multiview", "multi view"])) return "Create multiview layout";
  if (containsAny(blob, ["ndi"])) return "Bring NDI camera into AV system";
  if (containsAny(blob, ["distributed", "multi-zone", "site-wide", "avoip", "networkhd"])) return "Distribute AV over network";
  if (containsAny(blob, ["dual independent", "dual mirrored", "mst", "dual display"])) return "Dual display / MST";
  if (containsAny(blob, ["byom", "mtr", "conferencing", "camera", "speakerphone"])) return "BYOD / BYOM conferencing";
  if (containsAny(blob, ["usb-c", "usb c"])) return "Connect USB-C laptop";
  if (containsAny(blob, ["35-70m", "70-100m", "100m+"])) {
    return containsAny(blob, ["usb"]) ? "Extend HDMI and USB together" : "Extend HDMI over distance";
  }
  return "Connect USB-C laptop";
}

function mapProductPath(requirement: string, roomModel: Record<string, unknown>) {
  if (requirement === "Build LCD video wall" || requirement === "Feed LED wall processor") return "Video wall";
  if (requirement === "Bring NDI camera into AV system") return "NDI / camera";
  if (requirement === "Distribute AV over network") return "AVoIP";
  if (requirement === "Dual display / MST" || requirement === "Connect USB-C laptop" || requirement === "BYOD / BYOM conferencing") return "Presentation switcher";
  if (requirement === "Extend HDMI and USB together") return "HDMI / USB extender";
  if (requirement === "Extend HDMI over distance") return "HDBaseT extender";

  const blob = [roomModel.displayArrangement, roomModel.displayBehaviour, roomModel.designDirection].join(" ");
  if (containsAny(blob, ["choose source per display", "matrix"])) return "Matrix / routing";
  return "Presentation switcher";
}

function mapTechnologyType(productPath: string) {
  if (productPath === "AVoIP") return "AVoIP";
  if (productPath === "Matrix / routing") return "Matrix";
  if (productPath === "Presentation switcher") return "Presentation / Room Core";
  if (productPath === "HDMI / USB extender" || productPath === "HDBaseT extender") return "Extender / HDBaseT";
  if (productPath === "UC / conferencing") return "Unified Comms";
  if (productPath === "NDI / camera") return "Camera / Capture";
  if (productPath === "Video wall") return "Video Wall / Multiview";
  return "Core hardware first";
}

function queryFromRoom(roomModel: Record<string, unknown>, requirement: string) {
  return [
    text(roomModel.roomType),
    text(roomModel.displayArrangement),
    text(roomModel.displayBehaviour),
    requirement,
    arrayText(roomModel.sourceTypes).join(" "),
    text(roomModel.usbNeed),
    text(roomModel.notes),
  ]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 260);
}

export function buildDiscoveryBriefFromState(
  state: Record<string, unknown>,
  meta: {
    designDirection: string;
    confidence: string;
    missingItems: string[];
    capturedPercent: number;
    returnRoute?: string;
  },
): StoredDiscoveryBrief {
  const timestamp = nowIso();
  const sourceTypes = arrayText(state.sourceTypes);
  const sourceLocations = arrayText(state.sourceLocations);
  const roomModel = {
    ...state,
    designDirection: meta.designDirection,
    sourceCount: countBand(sourceTypes.length),
    displayCount: displayCountBand(state),
    longestRun: text(state.cableRun),
    sourceConnections: [text(state.sourceConnection)].filter(Boolean),
    sourceLocations,
    sourceTypes,
    usbNeeds: [text(state.usbNeed)].filter(Boolean),
    usbTransport: text(state.usbNeed),
    audioNeeds: [text(state.audioNeed)].filter(Boolean),
    controlNeeds: [text(state.controlNeed)].filter(Boolean),
    networkAvailability: text(state.network),
    budgetStyle: "Not confirmed",
  };

  return {
    savedAt: timestamp,
    roomModel,
    inference: {
      architecture: meta.designDirection,
      summary: `${text(state.roomType, "Room")} requirement. ${meta.designDirection}.`,
      confidence: meta.confidence,
      missing: meta.missingItems,
      risks: meta.missingItems,
      productDirection: [],
      avoid: [],
    },
    capturedPercent: meta.capturedPercent,
    returnRoute: meta.returnRoute ?? routeCatalogByKey.discovery.path,
  };
}

export function writeLatestDiscoverySnapshot(snapshot: DiscoverySnapshot) {
  if (typeof window === "undefined") return;

  const payload = {
    ...snapshot,
    savedAt: nowIso(),
  };

  window.localStorage.setItem(DISCOVERY_SNAPSHOT_KEY, JSON.stringify(payload));
  window.localStorage.setItem(DISCOVERY_BRIEF_KEY, JSON.stringify(payload.brief));
  window.dispatchEvent(new CustomEvent("wingman:discovery-handoff-updated"));
}

export function readLatestDiscoverySnapshot(): DiscoverySnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DISCOVERY_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiscoverySnapshot;
    if (!parsed || typeof parsed !== "object" || !parsed.brief) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readLatestDiscoveryBrief(): StoredDiscoveryBrief | null {
  if (typeof window === "undefined") return null;

  const projectBrief = getCurrentWorkflowProject(readProjectStore())?.discoveryBrief;
  if (projectBrief) return projectBrief;

  const snapshotBrief = readLatestDiscoverySnapshot()?.brief;
  if (snapshotBrief) return snapshotBrief;

  try {
    const raw = window.localStorage.getItem(DISCOVERY_BRIEF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDiscoveryBrief;
    return parsed?.roomModel ? parsed : null;
  } catch {
    return null;
  }
}

export function discoveryBriefToFinderNeed(brief: StoredDiscoveryBrief | null): Partial<FinderNeedDraft> | null {
  if (!brief?.roomModel) return null;

  const roomModel = asRecord(brief.roomModel);
  const technicalRequirement = mapRequirement(roomModel);
  const productPath = mapProductPath(technicalRequirement, roomModel);
  const technologyType = mapTechnologyType(productPath);
  const sourceConnector = mapSourceConnector(roomModel);
  const displayConnector = productPath.includes("Extender") ? "HDBaseT" : "";
  const usb = mapUsb(roomModel);
  const network = mapNetwork(roomModel);
  const processing = mapProcessing(roomModel);

  return {
    query: queryFromRoom(roomModel, technicalRequirement),
    technicalRequirement,
    productPath,
    technologyType,
    signalType: mapSignalType(roomModel),
    sourceConnector,
    displayConnector,
    inputs: sourceCountBand(roomModel),
    outputs: displayCountBand(roomModel),
    distance: mapDistance(roomModel.cableRun ?? roomModel.longestRun),
    resolution: "Unknown",
    usb,
    audio: mapAudio(roomModel),
    network,
    processing,
    control: mapControl(roomModel),
  };
}
'@

Save-Utf8NoBom -Path $handoffPath -Content $handoff

Write-Step "Patching Discovery workflow autosave and navigation handoff"

$discovery = Get-Content -LiteralPath $discoveryPath -Raw
$discovery = $discovery -replace "`r`n", "`n"

$discovery = $discovery.Replace('import { useMemo, useState } from "react";', 'import { useEffect, useMemo, useState } from "react";')

if ($discovery -notmatch "workflowHandoff") {
  $discovery = $discovery.Replace(
    'import { saveDiscoveryBriefToProject } from "../data/projectStore";',
    'import { saveDiscoveryBriefToProject } from "../data/projectStore";' + "`n" +
    'import {' + "`n" +
    '  buildDiscoveryBriefFromState,' + "`n" +
    '  readLatestDiscoverySnapshot,' + "`n" +
    '  writeLatestDiscoverySnapshot,' + "`n" +
    '} from "../data/workflowHandoff";'
  )
}

$discovery = $discovery.Replace(
@'
  const navigate = useNavigate();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [state, setState] = useState<DiscoveryState>(initialState);
  const [fullModelOpen, setFullModelOpen] = useState(false);
'@,
@'
  const navigate = useNavigate();
  const restoredDiscovery = readLatestDiscoverySnapshot();
  const [activeStepIndex, setActiveStepIndex] = useState(() => restoredDiscovery?.activeStepIndex ?? 0);
  const [state, setState] = useState<DiscoveryState>(() => ({ ...initialState, ...(restoredDiscovery?.state ?? {}) }));
  const [fullModelOpen, setFullModelOpen] = useState(false);
'@
)

$oldSave = @'
  function saveDiscoveryBrief() {
    const brief = {
      savedAt: new Date().toISOString(),
      roomModel: { ...state, designDirection },
      inference: {
        architecture: designDirection,
        confidence,
        missing: missingItems,
        risks: [],
        productDirection: [],
        avoid: [],
      },
      capturedPercent: Math.max(10, Math.round(((8 - Math.min(missingItems.length, 8)) / 8) * 100)),
      returnRoute: routeCatalogByKey.discovery.path,
    };

    window.localStorage.setItem("wingman-discovery-brief", JSON.stringify(brief));
    saveDiscoveryBriefToProject(brief);
  }
'@

$newSave = @'
  function currentDiscoveryBrief() {
    return buildDiscoveryBriefFromState(state, {
      designDirection,
      confidence,
      missingItems,
      capturedPercent: Math.max(10, Math.round(((8 - Math.min(missingItems.length, 8)) / 8) * 100)),
      returnRoute: routeCatalogByKey.discovery.path,
    });
  }

  function saveDiscoveryBrief() {
    const brief = currentDiscoveryBrief();

    writeLatestDiscoverySnapshot({
      activeStepIndex,
      state,
      brief,
      savedAt: brief.savedAt ?? new Date().toISOString(),
    });

    return saveDiscoveryBriefToProject(brief);
  }

  function persistLatestDiscoveryOnly(nextStepIndex = activeStepIndex) {
    const brief = currentDiscoveryBrief();

    writeLatestDiscoverySnapshot({
      activeStepIndex: nextStepIndex,
      state,
      brief,
      savedAt: brief.savedAt ?? new Date().toISOString(),
    });

    return brief;
  }

  function goToStep(index: number) {
    const nextIndex = Math.max(0, Math.min(steps.length - 1, index));
    saveDiscoveryBrief();
    setActiveStepIndex(nextIndex);
  }

  function goBack() {
    goToStep(activeStepIndex - 1);
  }

  function goNext() {
    goToStep(activeStepIndex + 1);
  }

  function openCallCards() {
    saveDiscoveryBrief();
    navigate(routeCatalogByKey.callCards.path);
  }

  function openFinderFromDiscovery() {
    saveDiscoveryBrief();
    navigate(routeCatalogByKey.finder.path);
  }

  function startProposalFromDiscovery() {
    saveDiscoveryBrief();
    navigate(routeCatalogByKey.proposal.path);
  }

  useEffect(() => {
    persistLatestDiscoveryOnly(activeStepIndex);
  }, [activeStepIndex, state, designDirection, confidence, missingItems]);
'@

if ($discovery.Contains($oldSave)) {
  $discovery = $discovery.Replace($oldSave, $newSave)
} else {
  throw "Could not replace saveDiscoveryBrief block in DiscoveryPage."
}

$discovery = $discovery.Replace('onClick={() => setActiveStepIndex(index)}', 'onClick={() => goToStep(index)}')
$discovery = $discovery.Replace('onClick={() => setActiveStepIndex((current) => Math.max(0, current - 1))}', 'onClick={goBack}')
$discovery = $discovery.Replace('onClick={() => navigate(routeCatalogByKey.callCards.path)}', 'onClick={openCallCards}')
$discovery = $discovery.Replace('onClick={saveDiscoveryBrief}', 'onClick={startProposalFromDiscovery}')
$discovery = $discovery.Replace('Save to project', 'Save to project / proposal')
$discovery = $discovery.Replace(
@'
                    onClick={() => {
                      saveDiscoveryBrief();
                      navigate(routeCatalogByKey.finder.path);
                    }}
'@,
@'
                    onClick={openFinderFromDiscovery}
'@
)
$discovery = $discovery.Replace('onClick={() => setActiveStepIndex((current) => Math.min(steps.length - 1, current + 1))}', 'onClick={goNext}')

Save-Utf8NoBom -Path $discoveryPath -Content $discovery

Write-Step "Patching Finder to automatically load Discovery handoff"

$finder = Get-Content -LiteralPath $finderPath -Raw
$finder = $finder -replace "`r`n", "`n"

$finder = $finder.Replace('import { useEffect, useMemo, useState } from "react";', 'import { useEffect, useMemo, useRef, useState } from "react";')

if ($finder -notmatch "workflowHandoff") {
  $finder = $finder.Replace(
    'import { SectionCard } from "../components/SectionCard";',
    'import { SectionCard } from "../components/SectionCard";' + "`n" +
    'import { discoveryBriefToFinderNeed, readLatestDiscoveryBrief } from "../data/workflowHandoff";'
  )
}

$finder = $finder.Replace(
@'
export function FinderPage() {
  useEffect(() => {
    document.body.classList.add("wm-product-finder-active");
    return () => document.body.classList.remove("wm-product-finder-active");
  }, []);

  const { projects, activeProjectId } = useProjectStore();
'@,
@'
export function FinderPage() {
  const discoveryHandoffAppliedRef = useRef(false);

  useEffect(() => {
    document.body.classList.add("wm-product-finder-active");
    return () => document.body.classList.remove("wm-product-finder-active");
  }, []);

  const { projects, activeProjectId } = useProjectStore();
'@
)

$finder = $finder.Replace(
@'
  }, []);
'@,
@'
  }, []);

  useEffect(() => {
    if (discoveryHandoffAppliedRef.current) return;

    const draftNeed = discoveryBriefToFinderNeed(readLatestDiscoveryBrief());
    if (!draftNeed) return;

    discoveryHandoffAppliedRef.current = true;
    setNeed((current) => ({
      ...current,
      ...draftNeed,
    }));
    setMessage("Discovery brief automatically loaded into Finder. Results now reflect the collected room requirement.");
  }, []);
'@
)

$oldApplyDiscovery = @'
  function applyDiscoveryBrief() {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem("wingman-discovery-brief");

    if (!raw) {
      setMessage("No saved Discovery brief found yet.");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { roomModel?: Record<string, unknown> };
      const roomModel = parsed.roomModel ?? {};
      const sourceConnections = Array.isArray(roomModel.sourceConnections) ? roomModel.sourceConnections.join(" ") : "";
      const usbNeeds = Array.isArray(roomModel.usbNeeds) ? roomModel.usbNeeds.join(" ") : "";

      setNeed((current) => ({
        ...current,
        inputs: valueAsString(roomModel.sourceCount),
        outputs: valueAsString(roomModel.displayCount),
        distance: valueAsString(roomModel.longestRun),
        sourceConnector: sourceConnections.includes("USB-C")
          ? "USB-C"
          : sourceConnections.includes("HDMI")
            ? "HDMI"
            : current.sourceConnector,
        usb: usbNeeds.includes("USB 3")
          ? "USB 3.x required"
          : usbNeeds.includes("USB")
            ? "USB 2.0 enough"
            : current.usb,
        network: sourceConnections.includes("NDI") ? "NDI source present" : current.network,
        processing: valueAsString(roomModel.wallLayout) ? "Video wall processing" : current.processing,
      }));

      setMessage("Discovery brief loaded into technical Finder filters.");
    } catch {
      setMessage("Discovery brief exists, but Finder could not read it.");
    }
  }
'@

$newApplyDiscovery = @'
  function applyDiscoveryBrief() {
    const draftNeed = discoveryBriefToFinderNeed(readLatestDiscoveryBrief());

    if (!draftNeed) {
      setMessage("No Discovery brief found yet. Complete Discovery or open a project with a saved Discovery brief.");
      return;
    }

    setNeed((current) => ({
      ...current,
      ...draftNeed,
    }));

    setMessage("Discovery brief loaded into technical Finder filters.");
  }
'@

if ($finder.Contains($oldApplyDiscovery)) {
  $finder = $finder.Replace($oldApplyDiscovery, $newApplyDiscovery)
} else {
  throw "Could not replace applyDiscoveryBrief function in FinderPage."
}

Save-Utf8NoBom -Path $finderPath -Content $finder

Write-Step "Adding proposal profile fields to project store"

$projectStore = Get-Content -LiteralPath $projectStorePath -Raw
$projectStore = $projectStore -replace "`r`n", "`n"

if ($projectStore -notmatch "companyName\?: string") {
  $projectStore = $projectStore.Replace(
@'
  readinessScore?: number;
  updatedAt: string;
};
'@,
@'
  readinessScore?: number;
  companyName?: string;
  preparedBy?: string;
  proposalFooter?: string;
  companyLogoDataUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  updatedAt: string;
};
'@
  )
}

if ($projectStore -notmatch "companyName: stringValue\(record.companyName") {
  $projectStore = $projectStore.Replace(
@'
    readinessScore: Number.isFinite(Number(record.readinessScore)) ? Number(record.readinessScore) : undefined,
    updatedAt: stringValue(record.updatedAt, nowIso()),
  };
'@,
@'
    readinessScore: Number.isFinite(Number(record.readinessScore)) ? Number(record.readinessScore) : undefined,
    companyName: stringValue(record.companyName, undefined),
    preparedBy: stringValue(record.preparedBy, undefined),
    proposalFooter: stringValue(record.proposalFooter, undefined),
    companyLogoDataUrl: stringValue(record.companyLogoDataUrl, undefined),
    contactEmail: stringValue(record.contactEmail, undefined),
    contactPhone: stringValue(record.contactPhone, undefined),
    updatedAt: stringValue(record.updatedAt, nowIso()),
  };
'@
  )
}

Save-Utf8NoBom -Path $projectStorePath -Content $projectStore

Write-Step "Patching Proposal Builder to use local profile"

$proposal = Get-Content -LiteralPath $proposalPath -Raw
$proposal = $proposal -replace "`r`n", "`n"

if ($proposal -notmatch "wingmanProfile") {
  $proposal = $proposal.Replace(
    'import { buildSalesReadinessPackage, type SalesBomRow, type SalesBomType } from "../lib/salesReadiness";',
    'import { buildSalesReadinessPackage, type SalesBomRow, type SalesBomType } from "../lib/salesReadiness";' + "`n" +
    'import { getStoredWingmanProfile } from "../data/wingmanProfile";'
  )
}

if ($proposal -notmatch "const profile = getStoredWingmanProfile") {
  $proposal = $proposal.Replace(
@'
    const project = getCurrentWorkflowProject(readProjectStore());
    const discovery = readDiscoveryBrief(project);
'@,
@'
    const project = getCurrentWorkflowProject(readProjectStore());
    const profile = getStoredWingmanProfile();
    const discovery = readDiscoveryBrief(project);
'@
  )
}

if ($proposal -notmatch "profile,") {
  $proposal = $proposal.Replace(
@'
      products,
      ingest: project?.ingest,
'@,
@'
      products,
      profile,
      ingest: project?.ingest,
'@
  )
}

if ($proposal -notmatch "companyName: context.profile.companyName") {
  $proposal = $proposal.Replace(
@'
      readinessScore: salesReadiness.readinessScore,
      updatedAt: new Date().toISOString(),
    }),
'@,
@'
      readinessScore: salesReadiness.readinessScore,
      companyName: context.profile.companyName,
      preparedBy: context.profile.reportPreparedBy || context.profile.userName,
      proposalFooter: context.profile.proposalFooter,
      companyLogoDataUrl: context.profile.companyLogoDataUrl,
      contactEmail: context.profile.email,
      contactPhone: context.profile.phone,
      updatedAt: new Date().toISOString(),
    }),
'@
  )
}

$proposal = $proposal.Replace(
  '[bomRows, context.assumptions, context.discovery.projectTitle, context.discovery.summary, context.products, salesReadiness, sections],',
  '[bomRows, context.assumptions, context.discovery.projectTitle, context.discovery.summary, context.products, context.profile, salesReadiness, sections],'
)

Save-Utf8NoBom -Path $proposalPath -Content $proposal

Write-Step "Patching proposal HTML export to include profile branding"

$export = Get-Content -LiteralPath $proposalExportPath -Raw
$export = $export -replace "`r`n", "`n"

if ($export -notmatch "preparedBy =") {
  $export = $export.Replace(
@'
export function buildProposalHtml(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  const assumptions = proposal.assumptions.length
'@,
@'
export function buildProposalHtml(proposal: StoredProjectProposal, bomRows: BomRow[]) {
  const preparedBy = proposal.preparedBy || "";
  const companyName = proposal.companyName || "WyreStorm Wingman";
  const contactLine = [proposal.contactEmail, proposal.contactPhone].filter(Boolean).join(" | ");
  const footer = proposal.proposalFooter || "Prepared using WyreStorm Wingman.";
  const logoHtml = proposal.companyLogoDataUrl
    ? `<img src="${escapeHtml(proposal.companyLogoDataUrl)}" alt="${escapeHtml(companyName)} logo" style="max-height:64px;max-width:220px;object-fit:contain;margin-bottom:16px;" />`
    : "";

  const assumptions = proposal.assumptions.length
'@
  )
}

$export = $export.Replace(
@'
  <p class="meta">WyreStorm Wingman proposal draft</p>
  <h1>${escapeHtml(proposal.title)}</h1>
  <p>${escapeHtml(proposal.summary)}</p>
'@,
@'
  ${logoHtml}
  <p class="meta">${escapeHtml(companyName)} proposal draft${preparedBy ? ` | Prepared by ${escapeHtml(preparedBy)}` : ""}</p>
  <h1>${escapeHtml(proposal.title)}</h1>
  <p>${escapeHtml(proposal.summary)}</p>
  ${contactLine ? `<p class="meta">${escapeHtml(contactLine)}</p>` : ""}
'@
)

$export = $export.Replace(
@'
  <div class="notice">Competitor products are excluded from this proposal and BOM unless a comparison-only output is explicitly requested.</div>
'@,
@'
  <div class="notice">Competitor products are excluded from this proposal and BOM unless a comparison-only output is explicitly requested.</div>
  <p class="meta">${escapeHtml(footer)}</p>
'@
)

Save-Utf8NoBom -Path $proposalExportPath -Content $export

Write-Step "Running validation"

npm run typecheck
npm run build

Write-Host ""
Write-Host "Discovery-to-Finder-to-Proposal handoff installed." -ForegroundColor Green
Write-Host ""
Write-Host "Test flow:"
Write-Host "1. npm run dev"
Write-Host "2. Open /wingman/discovery"
Write-Host "3. Change a few choices, press Next and Back"
Write-Host "4. Open /wingman/finder and confirm the filters are pre-filled"
Write-Host "5. Click Save to project / proposal from Discovery and confirm Proposal opens with the active project"
