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

$root = (Get-Location).Path
$discoveryPath = Join-Path $root "src\wingman2\pages\DiscoveryPage.tsx"
$handoffPath = Join-Path $root "src\wingman2\data\workflowHandoff.ts"
$cssPath = Join-Path $root "src\wingman2\styles\wingman-style-stack.css"

Write-Step "Checking files"

foreach ($path in @($discoveryPath, $handoffPath, $cssPath)) {
  if (-not (Test-Path $path)) {
    throw "Missing file: $path"
  }
}

foreach ($path in @($discoveryPath, $handoffPath, $cssPath)) {
  Backup-File $path
}

$discovery = Get-Content -LiteralPath $discoveryPath -Raw
$discovery = $discovery -replace "`r`n", "`n"

Write-Step "Adding signal standard / HDR field to Discovery state"

if ($discovery -notmatch "signalStandard: string;") {
  $discovery = $discovery.Replace(
    "  network: string;`n  usbOwnership: string;",
    "  network: string;`n  signalStandard: string;`n  usbOwnership: string;"
  )
}

if ($discovery -notmatch 'signalStandard: "",') {
  $discovery = $discovery.Replace(
    '  network: "",' + "`n" + '  usbOwnership: "",',
    '  network: "",' + "`n" + '  signalStandard: "",' + "`n" + '  usbOwnership: "",'
  )
}

Write-Step "Adding signal standard options"

if ($discovery -notmatch "const signalStandardOptions") {
  $signalOptions = @'

const signalStandardOptions: OptionCard[] = [
  {
    label: "4K60 4:4:4 HDR10 required",
    helper: "Use when Sky Q, premium streaming or high-quality 4K content must remain intact through the full signal path.",
    tags: ["18Gbps+", "HDR", "HDCP"],
  },
  {
    label: "4K60 SDR is acceptable",
    helper: "Use where 4K resolution matters but HDR is not customer-critical.",
    tags: ["4K60"],
  },
  {
    label: "1080p is acceptable",
    helper: "Use for legacy displays, lower-cost venue zones or simple monitoring.",
    tags: ["1080p"],
  },
  {
    label: "Not sure - validate downstream",
    helper: "Keep HDR, HDCP, EDID and display compatibility as validation items.",
    tags: ["Validate"],
  },
];
'@

  $discovery = $discovery.Replace("const audioPathOptions: OptionCard[] = [", $signalOptions + "`nconst audioPathOptions: OptionCard[] = [")
}

Write-Step "Adding smart HDR trigger logic"

if ($discovery -notmatch "function shouldAskSignalStandard") {
  $smartSignalHelpers = @'

function hasPremiumVideoSource(state: DiscoveryState) {
  return (
    state.devices.includes("Satellite decoder / Sky Q") ||
    state.devices.includes("Apple TV") ||
    state.devices.includes("ROKU player") ||
    state.devices.includes("Media player") ||
    state.devices.includes("Signage player")
  );
}

function shouldAskSignalStandard(state: DiscoveryState) {
  return (
    hasPremiumVideoSource(state) ||
    state.outcome === "Build video wall or signage display" ||
    state.outcome === "Route sources to multiple displays" ||
    ["5-8", "9-16", "17-32", "33-49", "50+"].includes(state.displayCount)
  );
}

function getSignalStandardSummary(state: DiscoveryState) {
  if (state.signalStandard) return state.signalStandard;

  if (state.devices.includes("Satellite decoder / Sky Q")) {
    return "Sky Q selected - confirm whether HDR / premium 4K must be preserved.";
  }

  if (hasPremiumVideoSource(state)) {
    return "Premium video source selected - confirm 4K/HDR requirement.";
  }

  return "Not triggered yet";
}

function getSignalStandardWarnings(state: DiscoveryState) {
  const warnings: string[] = [];

  if (state.signalStandard === "4K60 4:4:4 HDR10 required") {
    warnings.push("Treat the whole downstream chain as premium 4K/HDR: source, switcher, extender/AVoIP, receivers, displays, cable path and EDID/HDCP handling must all be validated.");
    warnings.push("Do not assume every '4K' product is suitable. Check HDMI bandwidth class, HDR10 support, HDCP 2.2/2.3, EDID management and any scaler/downsample behaviour.");
  }

  if (state.devices.includes("Satellite decoder / Sky Q") && !state.signalStandard) {
    warnings.push("Sky Q selected: ask whether HDR is important before selecting product family or cable/transport path.");
  }

  if (state.signalStandard === "4K60 4:4:4 HDR10 required" && ["35-70m", "70-100m", "100m+"].includes(state.cableRun)) {
    warnings.push("Premium 4K/HDR over distance: verify HDBaseT/AVoIP/fibre path supports the required HDMI bandwidth, HDR metadata, HDCP and display EDID behaviour.");
  }

  if (state.signalStandard === "4K60 4:4:4 HDR10 required" && ["9-16", "17-32", "33-49", "50+"].includes(state.displayCount)) {
    warnings.push("Large venue with premium 4K/HDR: every endpoint and zone may not need HDR. Confirm which displays/zones require full quality and where scaling/downconversion is acceptable.");
  }

  return warnings;
}

function getDownstreamQualityTags(state: DiscoveryState) {
  const tags: string[] = [];

  if (state.signalStandard === "4K60 4:4:4 HDR10 required") {
    tags.push("Require 4K60 4:4:4 HDR10-capable signal path");
    tags.push("Validate HDMI bandwidth / 18Gbps-class or better");
    tags.push("Validate HDCP 2.2/2.3");
    tags.push("Validate EDID management");
    tags.push("Validate scaler/downsample behaviour");
    tags.push("Validate display HDR capability");
  }

  if (state.signalStandard === "4K60 SDR is acceptable") {
    tags.push("Require 4K60-capable signal path");
    tags.push("HDR not critical");
  }

  if (state.signalStandard === "1080p is acceptable") {
    tags.push("1080p acceptable");
    tags.push("Do not over-specify premium 4K path unless future-proofing is required");
  }

  if (state.signalStandard === "Not sure - validate downstream") {
    tags.push("Keep resolution/HDR/HDCP/EDID as validation items");
  }

  return tags;
}
'@

  $discovery = $discovery.Replace("function getVenueAssumptions(state: DiscoveryState) {", $smartSignalHelpers + "`nfunction getVenueAssumptions(state: DiscoveryState) {")
}

Write-Step "Adding signal quality assumptions"

if ($discovery -notmatch "Premium 4K/HDR selected") {
  $discovery = $discovery.Replace(
    '  if (state.devices.includes("Satellite decoder / Sky Q")) {' + "`n" +
    '    assumptions.push("Sky/Satellite source: confirm number of decoders, legal viewing zones, HDCP handling and whether each zone needs independent channel selection.");' + "`n" +
    '  }',
    '  if (state.devices.includes("Satellite decoder / Sky Q")) {' + "`n" +
    '    assumptions.push("Sky/Satellite source: confirm number of decoders, legal viewing zones, HDCP handling and whether each zone needs independent channel selection.");' + "`n" +
    '  }' + "`n`n" +
    '  if (state.signalStandard === "4K60 4:4:4 HDR10 required") {' + "`n" +
    '    assumptions.push("Premium 4K/HDR selected: every downstream device must be validated for the required HDMI standard, HDR10, HDCP and EDID behaviour.");' + "`n" +
    '  }'
  )
}

Write-Step "Updating question gating to include signal standard only when relevant"

$oldNetworkBlock = @'
        <div className="wm-simple-two-col">
          {shouldAskNetwork(state) ? (
            <PillGroup
              title="Network availability"
              helper="Only shown where AVoIP, NDI, streaming, large display counts or network control may matter."
              options={networkOptions}
              value={state.network}
              onSelect={(value) => setField("network", value)}
            />
          ) : null}

          {shouldAskControl(state) ? (
            <PillGroup
              title="Control needs"
              helper="Only shown where display control, source routing, venue operation or third-party integration may matter."
              options={controlOptions}
              values={state.controlNeeds}
              onSelect={(value) => toggleList("controlNeeds", value)}
              multi
            />
          ) : null}
        </div>
'@

$newNetworkBlock = @'
        <div className="wm-simple-two-col">
          {shouldAskSignalStandard(state) ? (
            <div className="wm-simple-option-section wm-smart-question">
              <p>{state.devices.includes("Satellite decoder / Sky Q") ? "Sky Q: is HDR / premium 4K important?" : "What signal quality must be preserved?"}</p>
              <div className="wm-simple-discovery-grid compact">
                {signalStandardOptions.map((option) => (
                  <OptionButton
                    key={option.label}
                    option={option}
                    active={state.signalStandard === option.label}
                    onClick={() => setField("signalStandard", option.label)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {shouldAskNetwork(state) ? (
            <PillGroup
              title="Network availability"
              helper="Only shown where AVoIP, NDI, streaming, large display counts or network control may matter."
              options={networkOptions}
              value={state.network}
              onSelect={(value) => setField("network", value)}
            />
          ) : null}

          {shouldAskControl(state) ? (
            <PillGroup
              title="Control needs"
              helper="Only shown where display control, source routing, venue operation or third-party integration may matter."
              options={controlOptions}
              values={state.controlNeeds}
              onSelect={(value) => toggleList("controlNeeds", value)}
              multi
            />
          ) : null}
        </div>
'@

if ($discovery.Contains($oldNetworkBlock)) {
  $discovery = $discovery.Replace($oldNetworkBlock, $newNetworkBlock)
}

Write-Step "Adding active downstream quality warning panel"

$oldNoExtraCheck = @'
        {!shouldAskUsbOwnership(state) && !shouldAskAudioPath(state) && !shouldAskNetwork(state) && !shouldAskControl(state) ? (
          <div className="wm-simple-inference-panel">
            <p>No extra checks needed yet</p>
            <div>
              <span>Wingman has hidden USB, audio, network and control questions because the current answers do not make them design-critical.</span>
            </div>
          </div>
        ) : null}
'@

$newNoExtraCheck = @'
        {getSignalStandardWarnings(state).length ? (
          <div className="wm-simple-inference-panel wm-signal-warning-panel">
            <p>Downstream signal standard check</p>
            <div>
              {getSignalStandardWarnings(state).map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
        ) : null}

        {getDownstreamQualityTags(state).length ? (
          <div className="wm-simple-inference-panel wm-signal-quality-tags">
            <p>Required downstream capability</p>
            <div>
              {getDownstreamQualityTags(state).map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
        ) : null}

        {!shouldAskUsbOwnership(state) && !shouldAskAudioPath(state) && !shouldAskSignalStandard(state) && !shouldAskNetwork(state) && !shouldAskControl(state) ? (
          <div className="wm-simple-inference-panel">
            <p>No extra checks needed yet</p>
            <div>
              <span>Wingman has hidden USB, audio, signal quality, network and control questions because the current answers do not make them design-critical.</span>
            </div>
          </div>
        ) : null}
'@

if ($discovery.Contains($oldNoExtraCheck)) {
  $discovery = $discovery.Replace($oldNoExtraCheck, $newNoExtraCheck)
}

Write-Step "Updating missing items and triggered checks"

if ($discovery -notmatch 'missing.push\("Sky Q HDR / signal standard"\)') {
  $discovery = $discovery.Replace(
    '  if (shouldAskAudioPath(state) && !state.audioPath) {' + "`n" +
    '    missing.push("UC audio path");' + "`n" +
    '  }',
    '  if (shouldAskAudioPath(state) && !state.audioPath) {' + "`n" +
    '    missing.push("UC audio path");' + "`n" +
    '  }' + "`n`n" +
    '  if (state.devices.includes("Satellite decoder / Sky Q") && !state.signalStandard) {' + "`n" +
    '    missing.push("Sky Q HDR / signal standard");' + "`n" +
    '  }'
  )
}

if ($discovery -notmatch 'checks.push\("Premium 4K / HDR signal path"\)') {
  $discovery = $discovery.Replace(
    '  if (state.network.includes("10G")) checks.push("10G network / NHD-600 consideration");',
    '  if (state.network.includes("10G")) checks.push("10G network / NHD-600 consideration");' + "`n" +
    '  if (state.signalStandard === "4K60 4:4:4 HDR10 required") checks.push("Premium 4K / HDR signal path");'
  )
}

Write-Step "Saving signal quality into Discovery brief"

$oldBriefState = @'
        technicalTags: inputModel.tags,
        usbTopology,
        usbTopologyRisk: usbTopology.risk,
        usbTopologySummary: usbTopology.summary,
        triggeredChecks,
        recommendedProductPath: designDirection,
'@

$newBriefState = @'
        technicalTags: [...inputModel.tags, ...getDownstreamQualityTags(state)],
        usbTopology,
        usbTopologyRisk: usbTopology.risk,
        usbTopologySummary: usbTopology.summary,
        signalStandard: state.signalStandard,
        signalStandardSummary: getSignalStandardSummary(state),
        downstreamQualityTags: getDownstreamQualityTags(state),
        signalStandardWarnings: getSignalStandardWarnings(state),
        triggeredChecks,
        venueAssumptions: getVenueAssumptions(state),
        recommendedProductPath: designDirection,
'@

if ($discovery.Contains($oldBriefState)) {
  $discovery = $discovery.Replace($oldBriefState, $newBriefState)
}

Write-Step "Showing signal standard in current model and review"

if ($discovery -notmatch 'label="Signal standard"') {
  $discovery = $discovery.Replace(
    '<ValueLine label="Cable run" value={state.cableRun} />',
    '<ValueLine label="Cable run" value={state.cableRun} />' + "`n" +
    '              <ValueLine label="Signal standard" value={getSignalStandardSummary(state)} />'
  )
}

if ($discovery -notmatch "Required downstream capability") {
  Write-Host "Warning: downstream capability panel was not inserted. Continuing because file may already differ." -ForegroundColor Yellow
}

Save-Utf8NoBom -Path $discoveryPath -Content $discovery

Write-Step "Updating Finder handoff resolution mapping"

$handoff = Get-Content -LiteralPath $handoffPath -Raw
$handoff = $handoff -replace "`r`n", "`n"

if ($handoff -notmatch "function resolutionFromBrief") {
  $resolutionHelper = @'

function resolutionFromBrief(roomModel: Record<string, unknown>) {
  const signal = lower(roomModel.signalStandard ?? roomModel.signalStandardSummary);
  const tags = list(roomModel.downstreamQualityTags).join(" ").toLowerCase();

  if (signal.includes("hdr10") || tags.includes("hdr10")) return "4K60 HDR";
  if (signal.includes("4k60")) return "4K60";
  if (signal.includes("1080p")) return "1080p";
  return "Unknown";
}

function signalStandardAssumptions(roomModel: Record<string, unknown>) {
  const signal = lower(roomModel.signalStandard ?? roomModel.signalStandardSummary);
  const tags = list(roomModel.downstreamQualityTags);

  if (signal.includes("hdr10")) {
    return [
      ...tags,
      "Validate HDMI bandwidth / 18Gbps-class or better",
      "Validate HDCP 2.2/2.3",
      "Validate EDID management",
      "Validate display HDR capability",
    ];
  }

  return tags;
}
'@

  $handoff = $handoff.Replace("function sourceConnectorFromDevices(devices: string[]) {", $resolutionHelper + "`nfunction sourceConnectorFromDevices(devices: string[]) {")
}

$handoff = $handoff.Replace(
  'resolution: "Unknown",',
  'resolution: resolutionFromBrief(roomModel),'
)

if ($handoff -notmatch "signalStandardAssumptions") {
  Write-Host "Warning: signalStandardAssumptions helper was not added." -ForegroundColor Yellow
}

Save-Utf8NoBom -Path $handoffPath -Content $handoff

Write-Step "Adding CSS for smart signal checks"

$css = Get-Content -LiteralPath $cssPath -Raw
$css = $css -replace "`r`n", "`n"

$block = @'

/* WINGMAN-DISCOVERY-SMART-SIGNAL-CHECKS-START */
.wm-smart-question {
  border-color: rgba(245, 158, 11, 0.36) !important;
  background: #fff7ed !important;
}

.wm-signal-warning-panel {
  border-color: rgba(245, 158, 11, 0.42) !important;
  background: #fffbeb !important;
}

.wm-signal-warning-panel span {
  background: #ffffff !important;
  border: 1px solid rgba(245, 158, 11, 0.26) !important;
  color: #7c2d12 !important;
}

.wm-signal-quality-tags {
  border-color: rgba(14, 165, 233, 0.26) !important;
  background: #f0f9ff !important;
}

.wm-signal-quality-tags span {
  background: #ffffff !important;
  border: 1px solid rgba(14, 165, 233, 0.18) !important;
  color: #075985 !important;
}
/* WINGMAN-DISCOVERY-SMART-SIGNAL-CHECKS-END */
'@

if ($css -match "/\* WINGMAN-DISCOVERY-SMART-SIGNAL-CHECKS-START \*/[\s\S]*?/\* WINGMAN-DISCOVERY-SMART-SIGNAL-CHECKS-END \*/") {
  $css = [regex]::Replace(
    $css,
    "/\* WINGMAN-DISCOVERY-SMART-SIGNAL-CHECKS-START \*/[\s\S]*?/\* WINGMAN-DISCOVERY-SMART-SIGNAL-CHECKS-END \*/",
    $block.Trim(),
    1
  )
} else {
  $css = $css.TrimEnd() + "`n" + $block + "`n"
}

Save-Utf8NoBom -Path $cssPath -Content $css

Write-Step "Done"

Write-Host ""
Write-Host "Smart Sky Q / HDR downstream signal checks installed." -ForegroundColor Green
Write-Host ""
Write-Host "Next:"
Write-Host "npm run dev"
Write-Host ""
Write-Host "Test path:"
Write-Host "1. Open /wingman/discovery"
Write-Host "2. Select Satellite decoder / Sky Q"
Write-Host "3. Go to Checks"
Write-Host "4. Confirm the HDR / premium 4K question appears"
Write-Host ""
Write-Host "Note: if you want validation now, run npm run typecheck after any pending ComparePage JSX repair has been completed."
