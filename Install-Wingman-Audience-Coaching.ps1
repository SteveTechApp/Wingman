#requires -version 5.1
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==> Installing Wingman audience-aware coaching upgrade" -ForegroundColor Cyan
Write-Host ""

$Root = Get-Location
$PackageJson = Join-Path $Root "package.json"

if (!(Test-Path $PackageJson)) {
    Write-Host "ERROR: package.json was not found. Run this script from the Wingman project root folder." -ForegroundColor Red
    exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $Root "backups\audience-coaching-$Stamp"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

function Backup-File {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path
    )

    if (!(Test-Path $Path)) {
        return
    }

    $resolved = Resolve-Path $Path
    $relative = $resolved.Path.Substring($Root.Path.Length).TrimStart('\')
    $backupPath = Join-Path $BackupDir $relative
    $backupFolder = Split-Path $backupPath -Parent

    New-Item -ItemType Directory -Force -Path $backupFolder | Out-Null
    Copy-Item -Path $Path -Destination $backupPath -Force
}

function Save-Utf8NoBom {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Content
    )

    $folder = Split-Path $Path -Parent
    New-Item -ItemType Directory -Force -Path $folder | Out-Null

    Backup-File -Path $Path

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Append-TextIfMissing {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Needle,

        [Parameter(Mandatory = $true)]
        [string] $AppendText
    )

    if (!(Test-Path $Path)) {
        return
    }

    $content = Get-Content -Path $Path -Raw

    if ($content.Contains($Needle)) {
        return
    }

    Backup-File -Path $Path

    $updated = $content.TrimEnd() + "`r`n`r`n" + $AppendText.Trim() + "`r`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $updated, $utf8NoBom)
}

function Patch-WingmanPage {
    param(
        [Parameter(Mandatory = $true)]
        [string] $RelativePath,

        [Parameter(Mandatory = $true)]
        [string] $PageContext
    )

    $path = Join-Path $Root $RelativePath

    if (!(Test-Path $path)) {
        Write-Host "Skipped missing page: $RelativePath" -ForegroundColor DarkYellow
        return
    }

    $content = Get-Content -Path $path -Raw

    if ($content.Contains("AudienceAwareCoachingPanel")) {
        Write-Host "Already patched: $RelativePath" -ForegroundColor DarkGray
        return
    }

    if (!($content -match "<main\b")) {
        Write-Host "Skipped page without <main>: $RelativePath" -ForegroundColor DarkYellow
        return
    }

    Backup-File -Path $path

    $importLine = 'import AudienceAwareCoachingPanel from "../components/AudienceAwareCoachingPanel";'
    $updated = $importLine + "`r`n" + $content

    $injection = '$1' + "`r`n      <AudienceAwareCoachingPanel pageContext=`"$PageContext`" compact />"
    $updated = [regex]::Replace($updated, '(<main\b[^>]*>)', $injection, 1)

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $updated, $utf8NoBom)

    Write-Host "Patched: $RelativePath" -ForegroundColor Green
}

$AudienceProfilesPath = Join-Path $Root "src\wingman2\lib\audienceProfiles.ts"
$AudienceHookPath = Join-Path $Root "src\wingman2\hooks\useWingmanAudience.ts"
$AudienceSelectorPath = Join-Path $Root "src\wingman2\components\AudienceSelector.tsx"
$AudiencePanelPath = Join-Path $Root "src\wingman2\components\AudienceAwareCoachingPanel.tsx"

Write-Host "==> Writing audience profile model" -ForegroundColor Cyan

Save-Utf8NoBom -Path $AudienceProfilesPath -Content @'
export type WingmanAudienceMode = "dealer" | "technicalConsultant" | "endUser";

export type WingmanCoachingPageContext =
  | "dashboard"
  | "discovery"
  | "finder"
  | "productPitch"
  | "compare"
  | "proposal"
  | "visualStudio"
  | "general";

export interface WingmanAudienceProfile {
  id: WingmanAudienceMode;
  label: string;
  shortLabel: string;
  description: string;
  tone: string[];
  avoid: string[];
}

export interface WingmanAudienceCoaching {
  headline: string;
  framing: string;
  askThisNext: string;
  keepVisible: string;
  avoid: string;
}

export const defaultAudienceMode: WingmanAudienceMode = "dealer";

export const wingmanAudienceProfiles: WingmanAudienceProfile[] = [
  {
    id: "dealer",
    label: "Dealer / distributor",
    shortLabel: "Dealer",
    description:
      "Use practical sales coaching for distributor or dealer conversations. Focus on what to ask next and how to recognise the opportunity.",
    tone: [
      "Commercial",
      "Practical",
      "Confidence-building",
      "Plain English",
      "Question-led"
    ],
    avoid: [
      "Deep protocol explanations unless needed",
      "Overly technical warnings",
      "Internal engineering detail that could slow the conversation",
      "Long SKU-first explanations"
    ]
  },
  {
    id: "technicalConsultant",
    label: "Technical consultant / integrator",
    shortLabel: "Consultant",
    description:
      "Use architecture-led language for technically aware users. Focus on validation, dependencies, risk and design evidence.",
    tone: [
      "Precise",
      "Architecture-led",
      "Dependency-aware",
      "Direct about risk",
      "Suitable for pre-sales review"
    ],
    avoid: [
      "Oversimplified sales phrasing",
      "Benefit claims without design evidence",
      "Vague future-proofing language",
      "Hiding assumptions or quote blockers"
    ]
  },
  {
    id: "endUser",
    label: "End-user / customer",
    shortLabel: "End-user",
    description:
      "Use customer-safe language. Focus on outcomes, usability, business value and what still needs to be confirmed.",
    tone: [
      "Outcome-led",
      "Non-jargon",
      "Customer-safe",
      "Benefits first",
      "Careful with assumptions"
    ],
    avoid: [
      "Internal sales coaching language",
      "Too many part numbers",
      "Unnecessary engineering warnings",
      "Competitor positioning unless specifically requested"
    ]
  }
];

export function isWingmanAudienceMode(value: unknown): value is WingmanAudienceMode {
  return value === "dealer" || value === "technicalConsultant" || value === "endUser";
}

export function getAudienceProfile(mode: WingmanAudienceMode): WingmanAudienceProfile {
  const match = wingmanAudienceProfiles.find((profile) => profile.id === mode);

  if (match) {
    return match;
  }

  return wingmanAudienceProfiles[0];
}

const dealerCoaching: Record<WingmanCoachingPageContext, WingmanAudienceCoaching> = {
  dashboard: {
    headline: "Coach the next sales move",
    framing:
      "Frame this as a guided opportunity conversation. Help the salesperson decide what to ask next before jumping to products.",
    askThisNext:
      "Ask what the customer is trying to achieve in the room and whether they need simple presentation, conferencing, distribution, video wall, or flexible routing.",
    keepVisible:
      "Keep missing information visible so the salesperson knows what must be checked before a quote.",
    avoid:
      "Avoid heavy technical explanations before the salesperson has qualified the application."
  },
  discovery: {
    headline: "Ask the next useful question",
    framing:
      "Use the customer's wording to uncover the application, room type, source/display count, USB needs, audio needs and control expectations.",
    askThisNext:
      "Ask: what does the customer need people to be able to do in this space when the system is working properly?",
    keepVisible:
      "Show the salesperson what has been captured and what is still unknown.",
    avoid:
      "Avoid turning discovery into a long technical form."
  },
  finder: {
    headline: "Turn requirements into product direction",
    framing:
      "Help the salesperson recognise whether this is a matrix, HDBaseT, NetworkHD, UC, presentation switcher, video wall or USB opportunity.",
    askThisNext:
      "Ask whether the customer needs fixed routing, flexible routing, conferencing, or future expansion.",
    keepVisible:
      "Show why a product family is suggested and what must be confirmed before quoting.",
    avoid:
      "Avoid SKU dumping before the architecture is understood."
  },
  productPitch: {
    headline: "Make the product easier to explain",
    framing:
      "Translate product facts into a practical customer conversation, with a clear reason why the product may fit.",
    askThisNext:
      "Ask what problem the customer is trying to solve and which feature would make the difference in the sale.",
    keepVisible:
      "Keep alternatives and do-not-quote-yet warnings visible.",
    avoid:
      "Avoid reading the datasheet back to the salesperson."
  },
  compare: {
    headline: "Use comparison as qualification",
    framing:
      "Help the dealer understand the competitor product class first, then qualify whether WyreStorm has the right direction.",
    askThisNext:
      "Ask what the competitor product is being used for, not just what ports it has.",
    keepVisible:
      "Keep direct-equivalent risk and missing public data visible.",
    avoid:
      "Avoid claiming a direct equivalent unless the product purpose and dependencies are clear."
  },
  proposal: {
    headline: "Keep the proposal safe",
    framing:
      "Use simple wording that helps the salesperson explain the proposed direction without overpromising.",
    askThisNext:
      "Ask what still needs confirmation before this can move from proposal starter to quote-ready.",
    keepVisible:
      "Keep required items, optional items, assumptions and quote blockers separated.",
    avoid:
      "Avoid making an incomplete requirement sound like a final design."
  },
  visualStudio: {
    headline: "Explain the system visually",
    framing:
      "Use the visual to help the salesperson explain source-to-display flow, USB ownership, network dependency and control needs.",
    askThisNext:
      "Ask whether the diagram matches how the customer expects the room or venue to operate.",
    keepVisible:
      "Keep assumptions and missing information beside the diagram.",
    avoid:
      "Avoid making the graphic look like a final engineering drawing unless all details are confirmed."
  },
  general: {
    headline: "Guide the conversation",
    framing:
      "Use practical sales language that helps the user ask better questions and avoid premature product selection.",
    askThisNext:
      "Ask the simplest question that reduces the biggest uncertainty.",
    keepVisible:
      "Keep risk, assumptions and missing information visible.",
    avoid:
      "Avoid jargon unless the audience needs it."
  }
};

const consultantCoaching: Record<WingmanCoachingPageContext, WingmanAudienceCoaching> = {
  dashboard: {
    headline: "Validate the design evidence",
    framing:
      "Frame the opportunity by application, signal path, endpoint count, USB ownership, audio path, control method and infrastructure.",
    askThisNext:
      "Confirm the functional requirement, endpoint topology, distances and required user workflows.",
    keepVisible:
      "Keep assumptions, dependencies and quote blockers visible for pre-sales review.",
    avoid:
      "Avoid commercial shortcuts that bypass design validation."
  },
  discovery: {
    headline: "Capture structured design evidence",
    framing:
      "Separate customer outcome from technical assumption. Capture source, display, USB, audio, control, distance and infrastructure data.",
    askThisNext:
      "Confirm source count, display count, signal distance, USB requirement, audio path, control requirement and network ownership.",
    keepVisible:
      "Show which system paths are confirmed and which remain assumed.",
    avoid:
      "Avoid treating a vague application description as a complete design brief."
  },
  finder: {
    headline: "Select architecture before product",
    framing:
      "Use the captured requirement to choose the architecture class before recommending a specific product.",
    askThisNext:
      "Confirm whether the requirement is fixed I/O switching, point-to-point extension, AV-over-IP, UC switching, wall processing or USB transport.",
    keepVisible:
      "Show required dependencies such as receivers, controllers, network switches, USB paths and control interfaces.",
    avoid:
      "Avoid recommending HDMI-only architecture where USB, camera or microphone workflows are required."
  },
  productPitch: {
    headline: "Check product fit and limitations",
    framing:
      "Explain why the product fits, where it does not fit, and what evidence is needed before quotation.",
    askThisNext:
      "Confirm the product is being matched to the correct application and signal workflow.",
    keepVisible:
      "Show alternatives, dependencies, interface assumptions and validation warnings.",
    avoid:
      "Avoid using product benefits without matching them to project evidence."
  },
  compare: {
    headline: "Compare product class and workflow",
    framing:
      "Identify product purpose, transport method, resolution class, USB/audio/control support and deployment model before comparing.",
    askThisNext:
      "Confirm whether the competitor item is acting as a switcher, extender, encoder, decoder, processor, UC device or control endpoint.",
    keepVisible:
      "Show confidence, evidence and missing public data.",
    avoid:
      "Avoid comparing encoders to decoders or port counts without workflow context."
  },
  proposal: {
    headline: "Protect quote safety",
    framing:
      "Keep the proposal architecture-led and show required validation before it becomes quote-ready.",
    askThisNext:
      "Confirm quantities, endpoints, cable paths, network design, USB requirements, audio handling and control method.",
    keepVisible:
      "Separate required items, optional items, assumptions, risks and dependencies.",
    avoid:
      "Avoid presenting a proposal starter as a final engineering design."
  },
  visualStudio: {
    headline: "Use the visual as design evidence",
    framing:
      "Read the diagram as a system topology: source path, transport layer, control layer, audio/USB paths and endpoints.",
    askThisNext:
      "Confirm whether every node and edge on the diagram maps to a real device, cable path or network dependency.",
    keepVisible:
      "Show unconfirmed network, USB, control and endpoint assumptions.",
    avoid:
      "Avoid hiding unresolved paths to make the schematic look cleaner."
  },
  general: {
    headline: "Validate before recommending",
    framing:
      "Use technical framing that preserves accuracy, dependencies and design risk.",
    askThisNext:
      "Ask the question that closes the highest-risk design assumption.",
    keepVisible:
      "Keep technical dependencies and missing information visible.",
    avoid:
      "Avoid vague claims or unsupported equivalence."
  }
};

const endUserCoaching: Record<WingmanCoachingPageContext, WingmanAudienceCoaching> = {
  dashboard: {
    headline: "Explain the outcome clearly",
    framing:
      "Frame the discussion around what the customer needs the space to do and what will make it easier for users.",
    askThisNext:
      "Ask what the room, venue or system needs to achieve day to day.",
    keepVisible:
      "Keep assumptions simple and explain what still needs to be confirmed.",
    avoid:
      "Avoid internal sales terms, product-heavy wording or unnecessary technical detail."
  },
  discovery: {
    headline: "Understand the customer need",
    framing:
      "Use plain language to understand how people will use the space, what content they need to show and how simple the system needs to be.",
    askThisNext:
      "Ask: what do users need to do in this room without needing technical help?",
    keepVisible:
      "Show a simple summary of what has been captured and what still needs checking.",
    avoid:
      "Avoid making the customer answer engineering questions too early."
  },
  finder: {
    headline: "Explain the system direction",
    framing:
      "Describe the recommended approach by outcome, not by part number.",
    askThisNext:
      "Ask whether the customer needs a simple fixed system or more flexibility for different content and future changes.",
    keepVisible:
      "Explain why the direction is being suggested and what still needs confirmation.",
    avoid:
      "Avoid SKU dumping or internal product-family language without explanation."
  },
  productPitch: {
    headline: "Turn product facts into customer value",
    framing:
      "Explain what the product or system direction helps the customer do and why it suits the application.",
    askThisNext:
      "Ask which user outcome matters most: simplicity, flexibility, conferencing, image quality, expansion or control.",
    keepVisible:
      "Keep final checks visible without making the solution sound uncertain.",
    avoid:
      "Avoid too many technical specifications unless the customer asks for them."
  },
  compare: {
    headline: "Compare in customer terms",
    framing:
      "Explain the difference in terms of use case, reliability, flexibility, user experience and support.",
    askThisNext:
      "Ask what the customer likes about the alternative product and what problem they need it to solve.",
    keepVisible:
      "Keep any uncertainty polite and customer-safe.",
    avoid:
      "Avoid aggressive competitor language or unsupported replacement claims."
  },
  proposal: {
    headline: "Use proposal-safe wording",
    framing:
      "Present the solution as a clear recommended approach with benefits, assumptions and next steps.",
    askThisNext:
      "Ask what needs to be confirmed before final quotation and installation planning.",
    keepVisible:
      "Show assumptions and dependencies in plain language.",
    avoid:
      "Avoid internal notes, quote-risk jargon or unnecessary SKU detail."
  },
  visualStudio: {
    headline: "Use the diagram to simplify the idea",
    framing:
      "Use the visual to show how content, devices and displays work together in a way the customer can understand.",
    askThisNext:
      "Ask whether the diagram reflects how users expect the space to work.",
    keepVisible:
      "Keep simple next checks beside the diagram.",
    avoid:
      "Avoid making the customer-facing visual look like a complex engineering schematic."
  },
  general: {
    headline: "Keep it customer-safe",
    framing:
      "Use outcome-led language that explains the recommendation without unnecessary jargon.",
    askThisNext:
      "Ask the question that helps the customer explain the desired outcome.",
    keepVisible:
      "Keep assumptions and next steps clear.",
    avoid:
      "Avoid internal sales or engineering language."
  }
};

export function getAudienceCoaching(
  mode: WingmanAudienceMode,
  context: WingmanCoachingPageContext
): WingmanAudienceCoaching {
  if (mode === "technicalConsultant") {
    return consultantCoaching[context];
  }

  if (mode === "endUser") {
    return endUserCoaching[context];
  }

  return dealerCoaching[context];
}
'@

Write-Host "==> Writing audience hook" -ForegroundColor Cyan

Save-Utf8NoBom -Path $AudienceHookPath -Content @'
import { useEffect, useState } from "react";
import {
  defaultAudienceMode,
  isWingmanAudienceMode,
  type WingmanAudienceMode
} from "../lib/audienceProfiles";

const storageKey = "wingman.audienceMode";

function readInitialAudienceMode(): WingmanAudienceMode {
  if (typeof window === "undefined") {
    return defaultAudienceMode;
  }

  const stored = window.localStorage.getItem(storageKey);

  if (isWingmanAudienceMode(stored)) {
    return stored;
  }

  return defaultAudienceMode;
}

export function useWingmanAudience() {
  const [audienceMode, setAudienceMode] = useState<WingmanAudienceMode>(readInitialAudienceMode);

  useEffect(() => {
    window.localStorage.setItem(storageKey, audienceMode);
  }, [audienceMode]);

  return {
    audienceMode,
    setAudienceMode
  };
}
'@

Write-Host "==> Writing audience selector component" -ForegroundColor Cyan

Save-Utf8NoBom -Path $AudienceSelectorPath -Content @'
import {
  getAudienceProfile,
  type WingmanAudienceMode,
  wingmanAudienceProfiles
} from "../lib/audienceProfiles";
import { useWingmanAudience } from "../hooks/useWingmanAudience";

interface AudienceSelectorProps {
  value?: WingmanAudienceMode;
  onChange?: (mode: WingmanAudienceMode) => void;
  compact?: boolean;
}

export default function AudienceSelector({ value, onChange, compact = false }: AudienceSelectorProps) {
  const internalAudience = useWingmanAudience();
  const selectedMode = value ?? internalAudience.audienceMode;
  const setSelectedMode = onChange ?? internalAudience.setAudienceMode;
  const profile = getAudienceProfile(selectedMode);

  return (
    <section className={`wm-audience-selector ${compact ? "wm-audience-selector-compact" : ""}`}>
      <div className="wm-audience-selector-heading">
        <p className="wm-audience-eyebrow">Coaching context</p>
        <h2>Who are you talking with?</h2>
        <p>{profile.description}</p>
      </div>

      <div className="wm-audience-options" role="radiogroup" aria-label="Who are you talking with?">
        {wingmanAudienceProfiles.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`wm-audience-option ${selectedMode === option.id ? "is-active" : ""}`}
            onClick={() => setSelectedMode(option.id)}
            role="radio"
            aria-checked={selectedMode === option.id}
          >
            <span className="wm-audience-radio" aria-hidden="true" />
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
'@

Write-Host "==> Writing audience-aware coaching panel" -ForegroundColor Cyan

Save-Utf8NoBom -Path $AudiencePanelPath -Content @'
import AudienceSelector from "./AudienceSelector";
import {
  getAudienceCoaching,
  getAudienceProfile,
  type WingmanCoachingPageContext
} from "../lib/audienceProfiles";
import { useWingmanAudience } from "../hooks/useWingmanAudience";

interface AudienceAwareCoachingPanelProps {
  pageContext?: WingmanCoachingPageContext;
  compact?: boolean;
}

const pageContextLabel: Record<WingmanCoachingPageContext, string> = {
  dashboard: "Opportunity Navigator",
  discovery: "Discovery",
  finder: "Product Finder",
  productPitch: "Product Pitch",
  compare: "Competitor Compare",
  proposal: "Proposal",
  visualStudio: "Visual Studio",
  general: "Wingman coaching"
};

export default function AudienceAwareCoachingPanel({
  pageContext = "general",
  compact = false
}: AudienceAwareCoachingPanelProps) {
  const { audienceMode, setAudienceMode } = useWingmanAudience();
  const profile = getAudienceProfile(audienceMode);
  const coaching = getAudienceCoaching(audienceMode, pageContext);

  return (
    <section className={`wm-audience-coaching-panel ${compact ? "wm-audience-coaching-panel-compact" : ""}`}>
      <AudienceSelector value={audienceMode} onChange={setAudienceMode} compact />

      <div className="wm-audience-coaching-copy">
        <div>
          <p className="wm-audience-eyebrow">{pageContextLabel[pageContext]} framing</p>
          <h2>{coaching.headline}</h2>
          <p>{coaching.framing}</p>
        </div>

        <div className="wm-audience-coaching-grid">
          <article>
            <span>Ask this next</span>
            <p>{coaching.askThisNext}</p>
          </article>
          <article>
            <span>Keep visible</span>
            <p>{coaching.keepVisible}</p>
          </article>
          <article>
            <span>Avoid in this mode</span>
            <p>{coaching.avoid}</p>
          </article>
        </div>

        <div className="wm-audience-tone-strip" aria-label="Selected audience tone">
          {profile.tone.map((tone) => (
            <span key={tone}>{tone}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
'@

Write-Host "==> Updating shared CSS" -ForegroundColor Cyan

$CssCandidates = @(
    "src\wingman2\styles\wingman.css",
    "src\wingman2\styles\wingman2.css",
    "src\index.css",
    "src\main.css",
    "src\App.css"
)

$CssPath = $null

foreach ($candidate in $CssCandidates) {
    $full = Join-Path $Root $candidate

    if (Test-Path $full) {
        $CssPath = $full
        break
    }
}

if ($null -eq $CssPath) {
    $CssPath = Join-Path $Root "src\wingman2\styles\wingman.css"
    New-Item -ItemType Directory -Force -Path (Split-Path $CssPath -Parent) | Out-Null
    Set-Content -Path $CssPath -Value "" -Encoding UTF8
}

Append-TextIfMissing -Path $CssPath -Needle "/* WINGMAN AUDIENCE COACHING START */" -AppendText @'
/* WINGMAN AUDIENCE COACHING START */

.wm-audience-coaching-panel {
  display: grid;
  grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
  margin: 0 0 18px;
  padding: 14px;
  border: 1px solid rgba(20, 30, 45, 0.1);
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(0, 133, 116, 0.08), transparent 34%),
    rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 50px rgba(20, 30, 45, 0.08);
}

.wm-audience-coaching-panel-compact {
  margin-top: 0;
}

.wm-audience-selector {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(20, 30, 45, 0.08);
  border-radius: 20px;
  background: #ffffff;
}

.wm-audience-selector-heading h2,
.wm-audience-coaching-copy h2 {
  margin: 0;
  color: #17202a;
  font-size: 1.05rem;
  letter-spacing: -0.02em;
}

.wm-audience-selector-heading p,
.wm-audience-coaching-copy p {
  margin: 7px 0 0;
  color: #5c6673;
  font-size: 0.92rem;
  line-height: 1.48;
}

.wm-audience-eyebrow {
  margin: 0 0 6px !important;
  color: #007a68 !important;
  font-size: 0.68rem !important;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.wm-audience-options {
  display: grid;
  gap: 8px;
}

.wm-audience-option {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  width: 100%;
  padding: 11px;
  border: 1px solid rgba(20, 30, 45, 0.1);
  border-radius: 16px;
  background: #f8fafc;
  color: #17202a;
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease, background 160ms ease;
}

.wm-audience-option:hover {
  transform: translateY(-1px);
  border-color: rgba(0, 133, 116, 0.35);
  box-shadow: 0 12px 26px rgba(20, 30, 45, 0.08);
}

.wm-audience-option.is-active {
  border-color: rgba(0, 133, 116, 0.68);
  background: #f2fbf9;
  box-shadow: inset 0 0 0 1px rgba(0, 133, 116, 0.22);
}

.wm-audience-radio {
  width: 16px;
  height: 16px;
  margin-top: 1px;
  border: 1px solid rgba(20, 30, 45, 0.28);
  border-radius: 999px;
  background: #ffffff;
}

.wm-audience-option.is-active .wm-audience-radio {
  border: 5px solid #008574;
}

.wm-audience-option strong {
  display: block;
  color: #17202a;
  font-size: 0.88rem;
  line-height: 1.2;
}

.wm-audience-option small {
  display: block;
  margin-top: 4px;
  color: #667282;
  font-size: 0.76rem;
  line-height: 1.35;
}

.wm-audience-coaching-copy {
  display: grid;
  gap: 14px;
  padding: 14px;
  border: 1px solid rgba(20, 30, 45, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
}

.wm-audience-coaching-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.wm-audience-coaching-grid article {
  padding: 12px;
  border: 1px solid rgba(20, 30, 45, 0.08);
  border-radius: 16px;
  background: #ffffff;
}

.wm-audience-coaching-grid article span {
  display: block;
  color: #007a68;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wm-audience-coaching-grid article p {
  margin-top: 7px;
  font-size: 0.86rem;
}

.wm-audience-tone-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wm-audience-tone-strip span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 9px;
  border: 1px solid rgba(0, 133, 116, 0.18);
  border-radius: 999px;
  background: #eef8f6;
  color: #006d5f;
  font-size: 0.76rem;
  font-weight: 600;
}

@media (max-width: 1180px) {
  .wm-audience-coaching-panel {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .wm-audience-coaching-grid {
    grid-template-columns: 1fr;
  }
}

/* WINGMAN AUDIENCE COACHING END */
'@

Write-Host "==> Patching likely Wingman pages" -ForegroundColor Cyan

Patch-WingmanPage -RelativePath "src\wingman2\pages\DashboardPage.tsx" -PageContext "dashboard"
Patch-WingmanPage -RelativePath "src\wingman2\pages\DiscoveryPage.tsx" -PageContext "discovery"
Patch-WingmanPage -RelativePath "src\wingman2\pages\ProductFinderPage.tsx" -PageContext "finder"
Patch-WingmanPage -RelativePath "src\wingman2\pages\FinderPage.tsx" -PageContext "finder"
Patch-WingmanPage -RelativePath "src\wingman2\pages\ProductPitchPage.tsx" -PageContext "productPitch"
Patch-WingmanPage -RelativePath "src\wingman2\pages\ComparePage.tsx" -PageContext "compare"
Patch-WingmanPage -RelativePath "src\wingman2\pages\CompetitorComparePage.tsx" -PageContext "compare"
Patch-WingmanPage -RelativePath "src\wingman2\pages\ProposalPage.tsx" -PageContext "proposal"
Patch-WingmanPage -RelativePath "src\wingman2\pages\VisualStudioPage.tsx" -PageContext "visualStudio"

Write-Host ""
Write-Host "==> Running typecheck" -ForegroundColor Cyan
npm run typecheck

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Typecheck failed. Backups are here:" -ForegroundColor Yellow
    Write-Host $BackupDir -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Most likely cause: one of the patched pages has a non-standard import/layout structure." -ForegroundColor Yellow
    Write-Host "Send me the error output and I will give you a targeted repair script." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==> Running build" -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed. Backups are here:" -ForegroundColor Yellow
    Write-Host $BackupDir -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==> Wingman audience-aware coaching upgrade installed successfully" -ForegroundColor Green
Write-Host ""
Write-Host "What changed:" -ForegroundColor Cyan
Write-Host "- Added audience profiles for Dealer / Distributor, Technical Consultant / Integrator, and End-user / Customer."
Write-Host "- Added a shared Who are you talking with? selector."
Write-Host "- Added audience-aware coaching panels to pages that could be safely patched."
Write-Host "- The selected audience is saved in browser local storage."
Write-Host ""
Write-Host "Backups saved to:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""