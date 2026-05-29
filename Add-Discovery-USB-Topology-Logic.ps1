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

Write-Step "Checking Discovery page"

if (-not (Test-Path $discoveryPath)) {
  throw "Missing file: $discoveryPath"
}

Backup-File $discoveryPath
Backup-File $handoffPath

$discovery = Get-Content -LiteralPath $discoveryPath -Raw
$discovery = $discovery -replace "`r`n", "`n"

Write-Step "Removing BYOM wording if still present"

$discovery = $discovery.Replace("BYOM needs", "BYOD and room UC needs")
$discovery = $discovery.Replace("BYOM conferencing", "BYOD device with room UC")
$discovery = $discovery.Replace("BYOM", "BYOD")
$discovery = $discovery.Replace("bring-your-own", "BYOD")

Write-Step "Adding USB host/peripheral topology logic"

$usbHelpers = @'

function sourceSelected(state: DiscoveryState, source: string) {
  return state.sourceTypes.includes(source);
}

function hasUcWorkflow(state: DiscoveryState) {
  return (
    state.displayBehaviour.includes("conferencing") ||
    state.usbNeed.includes("USB") ||
    state.usbNeed.includes("UC") ||
    state.usbNeed.includes("MTR") ||
    sourceSelected(state, "USB camera") ||
    sourceSelected(state, "Microphone / DSP") ||
    sourceSelected(state, "Microsoft Teams Room Device") ||
    sourceSelected(state, "Room PC")
  );
}

function getUsbTopology(state: DiscoveryState) {
  const hostCandidates: string[] = [];
  const fixedHosts: string[] = [];
  const byodHosts: string[] = [];
  const peripherals: string[] = [];
  const warnings: string[] = [];
  const designActions: string[] = [];

  const ucWorkflow = hasUcWorkflow(state);

  if (sourceSelected(state, "Room PC")) {
    hostCandidates.push("Room PC USB host");
    fixedHosts.push("Room PC");
  }

  if (sourceSelected(state, "Microsoft Teams Room Device")) {
    hostCandidates.push("MTR USB host");
    fixedHosts.push("Microsoft Teams Room Device");
  }

  if (sourceSelected(state, "Laptop USB-C") && ucWorkflow) {
    hostCandidates.push("Laptop USB-C BYOD host");
    byodHosts.push("Laptop USB-C");
  }

  if (sourceSelected(state, "Laptop HDMI") && ucWorkflow) {
    hostCandidates.push("Laptop HDMI BYOD host requires separate USB path");
    byodHosts.push("Laptop HDMI");
    warnings.push("Laptop HDMI does not carry USB. If the laptop must use room camera/audio, allow for a separate USB host path, USB-C alternative, or APO-DG2-style BYOD streaming/dongle workflow.");
  }

  if (sourceSelected(state, "USB camera")) {
    peripherals.push("USB camera");
  }

  if (sourceSelected(state, "Microphone / DSP")) {
    peripherals.push("Microphone / DSP or USB audio device");
  }

  if (sourceSelected(state, "PTZ camera")) {
    peripherals.push("PTZ camera - confirm USB, HDMI, NDI and control method");
  }

  if (state.audioNeed.includes("APO-VX20") || state.audioNeed.includes("APO-210-UC")) {
    peripherals.push("UC soundbar camera/audio endpoint");
  }

  if (state.audioNeed.includes("Dante")) {
    peripherals.push("Dante / AES67 audio path");
  }

  if (state.audioNeed.includes("AMP-2210")) {
    peripherals.push("Amplified room speaker path");
  }

  if (hostCandidates.length > 1) {
    warnings.push("Multiple possible USB hosts have been identified. Confirm whether the selected WyreStorm switcher/core supports USB host switching, or decide which host gets priority.");
  }

  if (fixedHosts.length > 0 && byodHosts.length > 0) {
    warnings.push("Fixed PC/MTR and BYOD laptop hosts are both present. Do not assume one switcher can serve every host at the same time.");
    designActions.push("Prioritise the fixed Room PC/MTR USB host when the room is mainly a Teams/Zoom room.");
    designActions.push("For BYOD laptop use, prefer USB-C where possible or consider APO-DG2-style dongle/streaming to avoid consuming the main USB host path.");
  }

  if (peripherals.length > 1) {
    warnings.push("More than one USB/audio peripheral path is present. Check USB bandwidth, hub requirements, camera/audio ownership and whether USB 2.0 is enough.");
  }

  if (!hostCandidates.length && peripherals.length) {
    warnings.push("USB peripherals have been selected but no clear USB host has been identified.");
    designActions.push("Ask which device owns the camera/audio: laptop, Room PC, Microsoft Teams Room device, or a dedicated UC soundbar/appliance.");
  }

  if (!designActions.length && hostCandidates.length) {
    designActions.push("Confirm USB host ownership, cable path and whether the host needs USB 2.0 or USB 3.x.");
  }

  if (!designActions.length) {
    designActions.push("No USB host conflict detected yet.");
  }

  const risk =
    warnings.length >= 2
      ? "High USB design risk"
      : warnings.length === 1
        ? "Medium USB design risk"
        : "Low USB design risk";

  const summary = hostCandidates.length
    ? `${hostCandidates.length} USB host candidate${hostCandidates.length === 1 ? "" : "s"} / ${peripherals.length} peripheral path${peripherals.length === 1 ? "" : "s"}`
    : peripherals.length
      ? `No host selected / ${peripherals.length} peripheral path${peripherals.length === 1 ? "" : "s"}`
      : "No USB topology requirement captured";

  return {
    hostCandidates,
    fixedHosts,
    byodHosts,
    peripherals,
    warnings,
    designActions,
    risk,
    summary,
  };
}

'@

if ($discovery -notmatch "function getUsbTopology") {
  if ($discovery -match "function getQuestionStrategy") {
    $discovery = $discovery.Replace("function getQuestionStrategy(stepId: StepId, state: DiscoveryState): QuestionStrategy {", $usbHelpers + "function getQuestionStrategy(stepId: StepId, state: DiscoveryState): QuestionStrategy {")
  } else {
    throw "Could not find getQuestionStrategy insertion point."
  }
}

Write-Step "Updating source selection behaviour so HDMI laptop can create USB risk"

$togglePattern = '(?s)function toggleMulti\(key: "sourceTypes" \| "sourceLocations", value: string\) \{\s*setState\(\(current\) => \{\s*const existing = current\[key\];\s*const next = existing\.includes\(value\)\s*\?\s*existing\.filter\(\(item\) => item !== value\)\s*:\s*\[\.\.\.existing, value\];\s*return \{ \.\.\.current, \[key\]: next \};\s*\}\);\s*\}'

$toggleReplacement = @'
function toggleMulti(key: "sourceTypes" | "sourceLocations", value: string) {
    setState((current) => {
      const existing = current[key];
      const next = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value];

      const updated = { ...current, [key]: next } as DiscoveryState;

      if (key === "sourceTypes") {
        const ucTriggered =
          next.includes("Room PC") ||
          next.includes("Microsoft Teams Room Device") ||
          next.includes("USB camera") ||
          next.includes("Microphone / DSP");

        return {
          ...updated,
          usbNeed: current.usbNeed || (ucTriggered ? "Room PC / MTR conferencing" : current.usbNeed),
          audioNeed: current.audioNeed || (ucTriggered ? "APO-VX20 / APO-210-UC soundbar" : current.audioNeed),
        };
      }

      return updated;
    });
  }
'@

if ($discovery -match $togglePattern) {
  $discovery = [regex]::Replace($discovery, $togglePattern, $toggleReplacement, 1)
}

Write-Step "Adding USB topology panel to USB / Conferencing step"

$usbPanel = @'
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">USB host / peripheral topology check</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Wingman checks whether the selected sources create competing USB hosts. This is where HDMI laptop, USB-C laptop, Room PC and MTR priorities must be confirmed.
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                getUsbTopology(state).risk.includes("High")
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : getUsbTopology(state).risk.includes("Medium")
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}>
                {getUsbTopology(state).risk}
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-sky-100 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Host candidates</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {getUsbTopology(state).hostCandidates.length ? (
                    getUsbTopology(state).hostCandidates.map((item) => <li key={item}>- {item}</li>)
                  ) : (
                    <li>- None selected yet</li>
                  )}
                </ul>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Peripherals / audio</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {getUsbTopology(state).peripherals.length ? (
                    getUsbTopology(state).peripherals.map((item) => <li key={item}>- {item}</li>)
                  ) : (
                    <li>- None selected yet</li>
                  )}
                </ul>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Design action</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {getUsbTopology(state).designActions.map((item) => <li key={item}>- {item}</li>)}
                </ul>
              </div>
            </div>

            {getUsbTopology(state).warnings.length ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">USB logic warnings</p>
                <ul className="mt-2 space-y-1 text-sm text-amber-950">
                  {getUsbTopology(state).warnings.map((item) => <li key={item}>- {item}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
'@

if ($discovery -notmatch "USB host / peripheral topology check") {
  $audioBlock = @'
          <ChipGroup
            title="Audio requirement"
            options={audioOptions}
            value={state.audioNeed}
            onSelect={(value) => setField("audioNeed", value)}
          />
'@

  if ($discovery.Contains($audioBlock)) {
    $discovery = $discovery.Replace($audioBlock, $audioBlock + "`n" + $usbPanel)
  } else {
    throw "Could not find Audio requirement block to insert USB topology panel."
  }
}

Write-Step "Adding USB topology to discovery brief save"

$saveOld = 'roomModel: { ...state, designDirection },'
$saveNew = 'roomModel: { ...state, usbTopology: getUsbTopology(state), usbTopologySummary: getUsbTopology(state).summary, usbTopologyRisk: getUsbTopology(state).risk, designDirection },'

if ($discovery.Contains($saveOld)) {
  $discovery = $discovery.Replace($saveOld, $saveNew)
}

Write-Step "Adding USB topology to current model panel"

if ($discovery -notmatch 'label="USB topology"') {
  $discovery = $discovery.Replace(
    '<ValueLine label="Cable run" value={state.cableRun} />',
    '<ValueLine label="Cable run" value={state.cableRun} />' + "`n" + '              <ValueLine label="USB topology" value={getUsbTopology(state).summary} />' + "`n" + '              <ValueLine label="USB risk" value={getUsbTopology(state).risk} />'
  )
}

if ($discovery -notmatch "USB host / peripheral topology check") {
  throw "USB topology panel was not added."
}

Save-Utf8NoBom -Path $discoveryPath -Content $discovery

Write-Step "Updating workflow handoff if present"

if (Test-Path $handoffPath) {
  $handoff = Get-Content -LiteralPath $handoffPath -Raw
  $handoff = $handoff -replace "`r`n", "`n"
  $handoff = $handoff.Replace("BYOM", "BYOD")

  if ($handoff -notmatch "usbTopologyRisk") {
    $handoff = $handoff.Replace(
      "usbTransport: text(state.usbNeed),",
      "usbTransport: text(state.usbNeed),`n    usbTopologyRisk: text((state as Record<string, unknown>).usbTopologyRisk),`n    usbTopologySummary: text((state as Record<string, unknown>).usbTopologySummary),"
    )
  }

  Save-Utf8NoBom -Path $handoffPath -Content $handoff
}

Write-Step "Running validation"

npm run typecheck
npm run build

Write-Host ""
Write-Host "USB host/peripheral topology checks added." -ForegroundColor Green
Write-Host ""
Write-Host "Expected behaviour:"
Write-Host "- Laptop HDMI + UC peripherals warns that HDMI does not carry USB"
Write-Host "- Laptop USB-C / Room PC / MTR are treated as competing host candidates when relevant"
Write-Host "- Fixed PC/MTR can be prioritised over BYOD USB"
Write-Host "- APO-DG2-style BYOD/dongle route is suggested when BYOD USB would consume host capacity"
