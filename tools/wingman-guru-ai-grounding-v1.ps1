[CmdletBinding()]
param(
  [string]$Root = "C:\Users\steve\wingman",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
if(-not $Apply){ throw "Run with -Apply" }

function Find-RepoRoot {
  param([string]$Start)
  $d = if($Start -and (Test-Path $Start)){ (Resolve-Path $Start).Path } else { (Get-Location).Path }
  while($true){
    if(Test-Path (Join-Path $d "package.json")){ return $d }
    $p = Split-Path $d -Parent
    if([string]::IsNullOrWhiteSpace($p) -or $p -eq $d){
      throw "Could not locate repo root."
    }
    $d = $p
  }
}

function Write-Text([string]$Path,[string]$Text){
  $dir = Split-Path $Path -Parent
  if($dir -and !(Test-Path $dir)){
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  [System.IO.File]::WriteAllText($Path,$Text,[System.Text.UTF8Encoding]::new($false))
}

function Backup-File([string]$Path,[string]$RescueRoot,[string]$RepoRoot){
  if(!(Test-Path $Path)){ return }
  $rel = $Path.Substring($RepoRoot.Length).TrimStart("\","/")
  $dest = Join-Path $RescueRoot $rel
  $dir = Split-Path $dest -Parent
  if(!(Test-Path $dir)){
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  Copy-Item -Force -Path $Path -Destination $dest
}

$repo = Find-RepoRoot -Start $Root
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $repo "_RESCUE\GuruAiGrounding_$stamp"
New-Item -ItemType Directory -Force -Path $rescue | Out-Null

$catalogSeedPath      = Join-Path $repo "src\features\guru\guruCatalog.seed.ts"
$catalogGeneratedPath = Join-Path $repo "src\features\guru\guruCatalog.generated.ts"
$guruServicePath      = Join-Path $repo "src\features\guru\guruService.ts"
$guruPagePath         = Join-Path $repo "src\features\guru\GuruPage.tsx"
$proposalPagePath     = Join-Path $repo "src\features\proposals\ProposalBuilderPage.tsx"
$syncToolPath         = Join-Path $repo "tools\wingman-sync-wyrestorm-catalog.mjs"

foreach($p in @($guruPagePath,$proposalPagePath)){
  if(!(Test-Path $p)){ throw "Missing: $p" }
}
foreach($p in @($guruPagePath,$proposalPagePath,$catalogSeedPath,$catalogGeneratedPath,$guruServicePath,$syncToolPath)){
  Backup-File -Path $p -RescueRoot $rescue -RepoRoot $repo
}

$catalogSeed = @'
export type GuruCatalogItem = {
  sku: string;
  name: string;
  family: string;
  category: string;
  role?: string;
  status: "current" | "discontinued" | "unknown";
  summary: string;
  io: string[];
  connectivity: string[];
  control: string[];
  features: string[];
  bestFor: string[];
  sourceUrl: string;
};

export const WYRESTORM_CATALOG_SEED: GuruCatalogItem[] = [
  {
    sku: "SW-640L-TX-W",
    name: "4-Input 4K Presentation Switcher with USB C 60W PD and Matrix Outputs, USB 3.0, Multiview & Wireless Casting",
    family: "Synergy",
    category: "Presentation Switcher",
    role: "TX",
    status: "current",
    summary:
      "Wireless presentation and conferencing switcher for modern meeting spaces with two USB-C inputs supporting 60W PD and MST, plus multiview and wireless casting.",
    io: [
      "4 inputs total",
      "2x USB-C inputs (60W PD)",
      "Matrix outputs",
      "USB 3.0 integration",
    ],
    connectivity: [
      "USB-C",
      "Wireless casting",
      "Matrix switching",
      "4K video",
    ],
    control: [
      "App / system-level switching workflow",
    ],
    features: [
      "MST",
      "Multiview",
      "Wireless casting",
      "Meeting-room workflow",
    ],
    bestFor: [
      "BYOD meeting rooms",
      "Wireless presentation rooms",
      "Hybrid collaboration spaces",
    ],
    sourceUrl: "https://www.wyrestorm.com/product/sw-640l-tx-w/",
  },
  {
    sku: "EX-100-KVM-IP",
    name: "4K@30Hz IP-Based KVM Extender",
    family: "Extender Solutions",
    category: "KVM Extender",
    role: "Kit",
    status: "current",
    summary:
      "IP-based KVM extender designed for 4K30 HDMI and USB extension with near-zero latency across a 1G network.",
    io: [
      "HDMI transport",
      "USB transport",
      "Single Cat cable style deployment",
    ],
    connectivity: [
      "IP-based extension",
      "1G network",
      "KVM signal extension",
      "4K30",
    ],
    control: [
      "Network-based deployment",
    ],
    features: [
      "Near-zero latency",
      "Long-range extension",
      "Server / control-room fit",
    ],
    bestFor: [
      "Control rooms",
      "Remote server access",
      "Operator-to-rack workflows",
    ],
    sourceUrl: "https://www.wyrestorm.com/product/ex-100-kvm-ip/",
  },
  {
    sku: "COM-MIC-HUB",
    name: "Microphone Hub",
    family: "Audio",
    category: "Audio Hub",
    role: "Hub",
    status: "current",
    summary:
      "Audio hub with built-in DSP, support for ceiling and wireless microphones, external speaker integration, Web-UI control, and RS-232 control.",
    io: [
      "1x USB-B host",
      "Ceiling mic input",
      "Wireless receiver support",
      "Line out for external amplification",
    ],
    connectivity: [
      "USB host",
      "Audio I/O",
      "External speaker integration",
    ],
    control: [
      "Web-UI",
      "RS-232",
    ],
    features: [
      "Built-in audio DSP",
      "AEC",
      "Noise reduction",
      "AGC",
      "Supports ceiling microphones",
      "Supports wireless microphones",
    ],
    bestFor: [
      "Lecture halls",
      "Training rooms",
      "Boardrooms",
      "Audio collaboration spaces",
    ],
    sourceUrl: "https://www.wyrestorm.com/product/com-mic-hub/",
  },
  {
    sku: "APO-DG2",
    name: "Apollo USB-C Wireless Casting Dongle",
    family: "Apollo",
    category: "Wireless Casting",
    role: "Dongle",
    status: "current",
    summary:
      "USB-C casting dongle compatible with Apollo and presentation-switcher workflows, including SW-640L-TX-W, designed for quick one-touch wireless sharing.",
    io: [
      "Single USB-C connection",
    ],
    connectivity: [
      "USB-C",
      "Wireless casting trigger",
    ],
    control: [
      "Press-to-cast hardware workflow",
    ],
    features: [
      "4K30 casting support",
      "Simple one-touch sharing",
    ],
    bestFor: [
      "Guest presenter workflows",
      "Wireless content sharing",
      "Meeting-room casting add-ons",
    ],
    sourceUrl: "https://www.wyrestorm.com/product/apo-dg2/",
  },
  {
    sku: "MX-0808-H2A-MK2",
    name: "8x8 HDMI Matrix Switches for Ultimate Control",
    family: "Matrix Solutions",
    category: "HDMI Matrix Switcher",
    role: "Matrix",
    status: "current",
    summary:
      "8x8 HDMI matrix with 5K and 1080p output downscaling, ARC support on all outputs, and analog / S-PDIF audio de-embed for mixed-resolution installations.",
    io: [
      "8x8 HDMI matrix",
      "8 HDMI outputs with scaling",
      "Balanced analog audio outputs",
      "Digital S/PDIF audio output",
    ],
    connectivity: [
      "HDMI",
      "ARC",
      "Audio de-embed",
    ],
    control: [
      "CEC passthrough",
      "RS-232 passthrough",
      "IR passthrough",
      "Ethernet passthrough",
    ],
    features: [
      "5K / 1080p downscalers",
      "ARC",
      "Audio de-embed",
      "Mixed-resolution support",
    ],
    bestFor: [
      "Pure HDMI matrix switching",
      "Mixed display resolutions",
      "Smart TV audio return workflows",
    ],
    sourceUrl: "https://www.wyrestorm.com/product/mx-0808-h2a-mk2/",
  },
];

export default WYRESTORM_CATALOG_SEED;
'@

$catalogGenerated = @'
import { WYRESTORM_CATALOG_SEED, type GuruCatalogItem } from "./guruCatalog.seed";

export const WYRESTORM_CATALOG: GuruCatalogItem[] = WYRESTORM_CATALOG_SEED;

export default WYRESTORM_CATALOG;
'@

$guruService = @'
import WYRESTORM_CATALOG, { type GuruCatalogItem } from "./guruCatalog.generated";

export type GuruResponse = {
  question: string;
  productStartingPoint: string;
  skuSuggestions: string[];
  matchedProducts: GuruCatalogItem[];
  qualificationQuestions: string[];
  guidanceNotes: string[];
};

function normalise(value: string): string {
  return value.toLowerCase().trim();
}

function tokensFor(text: string): string[] {
  return normalise(text)
    .replace(/[^a-z0-9\s\-\/]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreProduct(question: string, product: GuruCatalogItem): number {
  const q = normalise(question);
  const t = tokensFor(question);

  const bag = [
    product.sku,
    product.name,
    product.family,
    product.category,
    ...(product.io || []),
    ...(product.connectivity || []),
    ...(product.control || []),
    ...(product.features || []),
    ...(product.bestFor || []),
    product.summary,
  ]
    .join(" | ")
    .toLowerCase();

  let score = 0;

  for (const token of t) {
    if (token.length < 3) continue;
    if (bag.includes(token)) score += 2;
  }

  if (q.includes("meeting room") && product.bestFor.some(x => /meeting|boardroom|collaboration/i.test(x))) score += 5;
  if (q.includes("byod") && /USB-C|wireless|presentation/i.test([product.name, ...product.features].join(" "))) score += 6;
  if ((q.includes("video wall") || q.includes("multiview")) && /video wall|multiview|matrix/i.test([product.name, ...product.features].join(" "))) score += 5;
  if ((q.includes("kvm") || q.includes("control room") || q.includes("server")) && /kvm/i.test([product.name, product.category, ...product.features].join(" "))) score += 7;
  if ((q.includes("microphone") || q.includes("audio")) && /audio|microphone/i.test([product.name, product.category, ...product.features].join(" "))) score += 6;
  if ((q.includes("matrix") || q.includes("4 sources") || q.includes("8x8")) && /matrix/i.test([product.name, product.category].join(" "))) score += 7;
  if ((q.includes("wireless casting") || q.includes("casting")) && /casting/i.test([product.name, ...product.features].join(" "))) score += 7;

  return score;
}

function getTopMatches(question: string, limit = 3): GuruCatalogItem[] {
  return [...WYRESTORM_CATALOG]
    .map((item) => ({ item, score: scoreProduct(question, item) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}

function buildQualificationQuestions(question: string, matches: GuruCatalogItem[]): string[] {
  const q = normalise(question);
  const questions: string[] = [];

  if (!q.includes("room")) questions.push("What is the room type or application?");
  if (!q.includes("display")) questions.push("How many displays are required?");
  if (!q.includes("source")) questions.push("How many active source inputs are required?");
  if (!/\b\d+m\b|\bmeters?\b|\bmetres?\b|\bft\b|\bfeet\b/.test(q)) questions.push("What are the longest cable distances in the system?");
  if (!q.includes("control")) questions.push("Are RS-232, IR, Web-UI, or network control requirements involved?");
  if (!q.includes("audio")) questions.push("Are microphone, DSP, audio de-embed, or external speaker requirements involved?");
  if (matches.some(m => /wireless/i.test([m.name, ...m.features].join(" "))) && !q.includes("wireless")) {
    questions.push("Is wireless casting required, and if so, do guests need one-touch sharing?");
  }
  if (matches.some(m => /kvm/i.test([m.name, m.category].join(" "))) && !q.includes("usb")) {
    questions.push("Do you need USB host/device extension as part of the design?");
  }
  if (matches.some(m => /matrix/i.test([m.name, m.category].join(" "))) && !q.includes("multiview")) {
    questions.push("Is multiview needed, or is the requirement source switching only?");
  }

  return Array.from(new Set(questions)).slice(0, 6);
}

function buildGuidance(matches: GuruCatalogItem[]): string[] {
  const notes: string[] = [
    "Treat the first recommendation as a product starting point, not the final engineered design.",
    "Validate source count, display count, cable distance, and user workflow before finalising the BOM.",
  ];

  if (matches.some(m => /matrix/i.test([m.name, m.category].join(" ")))) {
    notes.push("If the requirement is simple switching, keep the solution matrix-led; if collaboration is central, consider a room-system path instead.");
  }
  if (matches.some(m => /wireless|presentation/i.test([m.name, ...m.features].join(" ")))) {
    notes.push("For presentation spaces, confirm the presenter workflow first, then decide whether wireless casting is optional or core.");
  }
  if (matches.some(m => /audio|microphone/i.test([m.name, m.category].join(" ")))) {
    notes.push("For audio-led spaces, confirm microphone type, room pickup expectations, and whether external amplification is needed.");
  }
  if (matches.some(m => /kvm/i.test([m.name, m.category].join(" ")))) {
    notes.push("For KVM workflows, confirm whether the requirement is point-to-point or routed over an existing managed network.");
  }

  return notes.slice(0, 5);
}

function buildLocalResponse(question: string): GuruResponse {
  const q = question.trim();
  const matches = getTopMatches(q, 3);

  if (!q) {
    return {
      question: "",
      productStartingPoint:
        "Describe the room, use case, source count, display count, cable distances, and any competitor reference so Guru can suggest a WyreStorm starting point.",
      skuSuggestions: [],
      matchedProducts: [],
      qualificationQuestions: [
        "What is the room type or application?",
        "How many sources and displays are involved?",
        "What are the required cable distances?",
        "Is this a new design, an upgrade, or a competitor replacement?",
      ],
      guidanceNotes: [
        "Guru works best when the question includes the commercial objective and the core technical constraints.",
      ],
    };
  }

  const skuSuggestions = matches.map((m) => m.sku);
  const first = matches[0];

  const productStartingPoint = first
    ? `Start with ${first.sku} (${first.name}) as the first WyreStorm direction for this requirement. ${first.summary}`
    : "Start with a workflow-led path: use Templates for known room types, Room Wizard for constraint-led design, then move into Proposal Builder once the core requirement is qualified.";

  return {
    question: q,
    productStartingPoint,
    skuSuggestions,
    matchedProducts: matches,
    qualificationQuestions: buildQualificationQuestions(q, matches),
    guidanceNotes: buildGuidance(matches),
  };
}

export async function askGuru(question: string): Promise<GuruResponse> {
  const q = question.trim();
  const local = buildLocalResponse(q);
  const apiUrl = (import.meta as any)?.env?.VITE_GURU_API_URL as string | undefined;

  if (!apiUrl) {
    return local;
  }

  try {
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: q,
        localCatalog: local.matchedProducts,
        allCatalogCount: WYRESTORM_CATALOG.length,
      }),
    });

    if (!resp.ok) {
      return local;
    }

    const data = await resp.json();

    return {
      question: q,
      productStartingPoint: data?.productStartingPoint || local.productStartingPoint,
      skuSuggestions: Array.isArray(data?.skuSuggestions) && data.skuSuggestions.length
        ? data.skuSuggestions
        : local.skuSuggestions,
      matchedProducts: local.matchedProducts,
      qualificationQuestions: Array.isArray(data?.qualificationQuestions) && data.qualificationQuestions.length
        ? data.qualificationQuestions
        : local.qualificationQuestions,
      guidanceNotes: Array.isArray(data?.guidanceNotes) && data.guidanceNotes.length
        ? data.guidanceNotes
        : local.guidanceNotes,
    };
  } catch {
    return local;
  }
}
'@

$guruPage = @'
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { askGuru, type GuruResponse } from "./guruService";

const SUGGESTIONS = [
  "Recommend a WyreStorm starting point for a BYOD meeting room with 2 displays, USB-C and wireless casting",
  "Suggest a WyreStorm KVM starting point for a control room with 4K30 and USB extension",
  "What WyreStorm product should I start with for a 4-input presentation space with multiview?",
  "Recommend a starting SKU for an audio collaboration room with ceiling mics and external speakers",
  "Suggest a like-for-like WyreStorm starting point for a competitor replacement matrix requirement",
];

const EMPTY_RESPONSE: GuruResponse = {
  question: "",
  productStartingPoint:
    "Describe the room, use case, source count, display count, cable distances, and any competitor reference so Guru can suggest a WyreStorm starting point.",
  skuSuggestions: [],
  matchedProducts: [],
  qualificationQuestions: [
    "What is the room type or application?",
    "How many sources and displays are involved?",
    "What are the required cable distances?",
    "Is this a new design, an upgrade, or a competitor replacement?",
  ],
  guidanceNotes: [
    "Guru works best when the question includes the commercial objective and the core technical constraints.",
  ],
};

function SectionCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.80)", lineHeight: 1.45 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}

function SuggestionChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wm-hover-lift"
      style={{
        textAlign: "left",
        width: "100%",
        borderRadius: 12,
        border: "1px solid rgba(168,85,247,0.22)",
        background: "linear-gradient(180deg, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0.06) 100%)",
        padding: "12px 14px",
        color: "rgba(255,255,255,0.94)",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{label}</div>
    </button>
  );
}

function BulletList({
  items,
  accentRgb,
}: {
  items: string[];
  accentRgb?: string;
}) {
  const rgb = accentRgb || "255,255,255";

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "10px 1fr",
            gap: 10,
            alignItems: "start",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              marginTop: 6,
              background: `rgba(${rgb},0.92)`,
            }}
          />
          <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.90)" }}>
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GuruPage() {
  const nav = useNavigate();
  const [draftQuestion, setDraftQuestion] = useState(SUGGESTIONS[0]);
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [result, setResult] = useState<GuruResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => draftQuestion.trim().length > 0, [draftQuestion]);
  const hasSkuSuggestions = result.skuSuggestions.length > 0;

  async function submitQuestion() {
    const next = draftQuestion.trim();
    if (!next) return;

    setLoading(true);
    try {
      const response = await askGuru(next);
      setSubmittedQuestion(next);
      setResult(response);
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setDraftQuestion("");
    setSubmittedQuestion("");
    setResult(EMPTY_RESPONSE);
  }

  function buildProposal() {
    try {
      localStorage.setItem(
        "wm_guru_proposal_seed",
        JSON.stringify({
          source: "guru",
          question: submittedQuestion,
          productStartingPoint: result.productStartingPoint,
          skuSuggestions: result.skuSuggestions,
          qualificationQuestions: result.qualificationQuestions,
          guidanceNotes: result.guidanceNotes,
          matchedProducts: result.matchedProducts,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {}

    nav("/app/tools/proposal");
  }

  return (
    <div className="wm-page wm-animate-in" style={{ width: "100%", maxWidth: "none", margin: 0 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">GUIDED ASSISTANCE</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>Wingman Guru</h1>
          <div style={{ maxWidth: 940, fontSize: 14, color: "rgba(255,255,255,0.88)", lineHeight: 1.5 }}>
            Guru now gives a product starting point first, then follow-up qualification questions, and finally a proposal handoff when SKU suggestions are available.
          </div>
        </div>

        <SectionCard
          title="Ask a question"
          subtitle="Describe the requirement clearly, then use Submit question to commit it."
          right={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="wm-btn" style={{ height: 36, padding: "0 12px" }} onClick={clearAll}>
                Clear
              </button>
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                style={{
                  height: 36,
                  padding: "0 14px",
                  opacity: canSubmit && !loading ? 1 : 0.65,
                  cursor: canSubmit && !loading ? "pointer" : "not-allowed",
                }}
                disabled={!canSubmit || loading}
                onClick={submitQuestion}
              >
                {loading ? "Working..." : "Submit question"}
              </button>
            </div>
          }
        >
          <textarea
            value={draftQuestion}
            onChange={(e) => setDraftQuestion(e.target.value)}
            placeholder="Describe the room, source count, display count, cable distances, user workflow, or competitor reference."
            style={{
              width: "100%",
              minHeight: 110,
              resize: "vertical",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
              padding: 14,
              color: "rgba(255,255,255,0.96)",
              fontSize: 14,
              lineHeight: 1.5,
              boxSizing: "border-box",
            }}
          />
        </SectionCard>

        <SectionCard
          title="Suggested inputs"
          subtitle="Selecting one loads it into the question box."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {SUGGESTIONS.map((item) => (
              <SuggestionChip key={item} label={item} onClick={() => setDraftQuestion(item)} />
            ))}
          </div>
        </SectionCard>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
          <SectionCard title="Current question" subtitle="The last committed question.">
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                padding: 14,
                minHeight: 120,
                fontSize: 14,
                lineHeight: 1.55,
                color: "rgba(255,255,255,0.94)",
                whiteSpace: "pre-wrap",
              }}
            >
              {submittedQuestion || "No question submitted yet."}
            </div>
          </SectionCard>

          <SectionCard
            title="Product starting point"
            subtitle="Guru should always suggest a practical starting direction first."
            right={
              hasSkuSuggestions ? (
                <span
                  className="wm-btn"
                  style={{
                    height: 30,
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0 10px",
                    borderColor: "rgba(168,85,247,0.28)",
                    background: "rgba(168,85,247,0.12)",
                    color: "rgba(255,255,255,0.94)",
                  }}
                >
                  SKU-aware
                </span>
              ) : null
            }
          >
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(168,85,247,0.20)",
                background: "linear-gradient(180deg, rgba(168,85,247,0.10) 0%, rgba(168,85,247,0.05) 100%)",
                padding: 14,
                minHeight: 120,
                fontSize: 14,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.94)",
              }}
            >
              {result.productStartingPoint}
            </div>
          </SectionCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
          <SectionCard
            title="Suggested SKU starting point"
            subtitle="Provisional SKUs only — confirm fit after qualification."
            right={
              hasSkuSuggestions ? (
                <button type="button" className="wm-btn wm-btn-primary" style={{ height: 34, padding: "0 14px" }} onClick={buildProposal}>
                  Build proposal around this response
                </button>
              ) : null
            }
          >
            {hasSkuSuggestions ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.skuSuggestions.map((sku) => (
                    <span
                      key={sku}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(251,191,36,0.24)",
                        background: "rgba(251,191,36,0.10)",
                        color: "rgba(255,245,214,0.96)",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {sku}
                    </span>
                  ))}
                </div>

                {result.matchedProducts.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {result.matchedProducts.map((item) => (
                      <div
                        key={item.sku}
                        style={{
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(255,255,255,0.04)",
                          padding: 12,
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: 13 }}>{item.sku} — {item.name}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
                          {item.summary}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  padding: 14,
                  minHeight: 120,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.82)",
                  lineHeight: 1.55,
                }}
              >
                No SKU suggestions yet. Add more detail about the room, distances, sources, displays, or workflow and submit again.
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Further qualification"
            subtitle="Questions that help build out the original requirement."
          >
            <BulletList items={result.qualificationQuestions} accentRgb="94,234,212" />
          </SectionCard>
        </div>

        <SectionCard title="Guided notes" subtitle="Additional guidance to support the original request.">
          <BulletList items={result.guidanceNotes} accentRgb="125,211,252" />
        </SectionCard>
      </div>
    </div>
  );
}
'@

$proposalPage = @'
import React, { useEffect, useMemo, useState } from "react";

type GuruSeed = {
  source?: string;
  question?: string;
  productStartingPoint?: string;
  skuSuggestions?: string[];
  qualificationQuestions?: string[];
  guidanceNotes?: string[];
  matchedProducts?: Array<{ sku: string; name: string; summary?: string }>;
  savedAt?: string;
};

function SectionCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.80)", lineHeight: 1.45 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}

function BulletList({
  items,
}: {
  items: string[];
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "10px 1fr",
            gap: 10,
            alignItems: "start",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              marginTop: 6,
              background: "rgba(251,191,36,0.92)",
            }}
          />
          <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.90)" }}>
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProposalBuilderPage() {
  const [seed, setSeed] = useState<GuruSeed | null>(null);
  const [opportunityName, setOpportunityName] = useState("Untitled opportunity");
  const [proposalSummary, setProposalSummary] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wm_guru_proposal_seed");
      if (!raw) return;
      const parsed = JSON.parse(raw) as GuruSeed;
      setSeed(parsed);
      setProposalSummary(parsed.productStartingPoint || "");
    } catch {}
  }, []);

  const skus = useMemo(() => seed?.skuSuggestions || [], [seed]);

  function clearGuruSeed() {
    try {
      localStorage.removeItem("wm_guru_proposal_seed");
    } catch {}
    setSeed(null);
  }

  return (
    <div className="wm-page wm-animate-in" style={{ width: "100%", maxWidth: "none", margin: 0 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">COMMERCIAL HANDOFF</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>Proposal Builder</h1>
          <div style={{ maxWidth: 960, fontSize: 14, color: "rgba(255,255,255,0.88)", lineHeight: 1.5 }}>
            Build a proposal around the current recommendation. If you came from Guru, the recommendation seed is loaded below.
          </div>
        </div>

        {seed ? (
          <SectionCard
            title="Guru recommendation imported"
            subtitle="This proposal is seeded from the most recent Guru response."
            right={
              <button type="button" className="wm-btn" style={{ height: 34, padding: "0 12px" }} onClick={clearGuruSeed}>
                Clear Guru seed
              </button>
            }
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(168,85,247,0.20)",
                  background: "linear-gradient(180deg, rgba(168,85,247,0.10) 0%, rgba(168,85,247,0.05) 100%)",
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Product starting point
                </div>
                <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.94)" }}>
                  {seed.productStartingPoint || "No Guru starting point available."}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    padding: 14,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Recommended SKUs</div>
                  {skus.length ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {skus.map((sku) => (
                        <span
                          key={sku}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 999,
                            border: "1px solid rgba(251,191,36,0.24)",
                            background: "rgba(251,191,36,0.10)",
                            color: "rgba(255,245,214,0.96)",
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          {sku}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                      No SKU suggestions were provided by Guru.
                    </div>
                  )}
                </div>

                <div
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    padding: 14,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Outstanding qualification items</div>
                  <BulletList items={seed.qualificationQuestions || ["Confirm source count, display count, distances, and user workflow."]} />
                </div>
              </div>
            </div>
          </SectionCard>
        ) : null}

        <SectionCard title="Proposal summary" subtitle="Use this as the commercial narrative starting point.">
          <div style={{ display: "grid", gap: 12 }}>
            <input
              value={opportunityName}
              onChange={(e) => setOpportunityName(e.target.value)}
              placeholder="Opportunity name"
              style={{
                width: "100%",
                height: 42,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                padding: "0 12px",
                color: "rgba(255,255,255,0.96)",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />

            <textarea
              value={proposalSummary}
              onChange={(e) => setProposalSummary(e.target.value)}
              placeholder="Summarise the recommended solution, commercial position, and assumptions."
              style={{
                width: "100%",
                minHeight: 140,
                resize: "vertical",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                padding: 14,
                color: "rgba(255,255,255,0.96)",
                fontSize: 14,
                lineHeight: 1.5,
                boxSizing: "border-box",
              }}
            />
          </div>
        </SectionCard>

        <SectionCard title="Recommended commercial structure" subtitle="A simple quote-pack skeleton to speed up handoff.">
          <div style={{ display: "grid", gap: 12 }}>
            <div className="wm-card" style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>1. Requirement summary</div>
              <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
                Confirm the room type, use case, source count, display count, and operational objective.
              </div>
            </div>
            <div className="wm-card" style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>2. Recommended starting products</div>
              <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
                Present the initial SKU path and explain why it is the correct commercial starting point.
              </div>
            </div>
            <div className="wm-card" style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>3. Assumptions and exclusions</div>
              <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
                Record any assumptions that still need confirmation before the final BOM is issued.
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
'@

$syncTool = @'
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PRODUCT_URLS = [
  "https://www.wyrestorm.com/product/sw-640l-tx-w/",
  "https://www.wyrestorm.com/product/ex-100-kvm-ip/",
  "https://www.wyrestorm.com/product/com-mic-hub/",
  "https://www.wyrestorm.com/product/apo-dg2/",
  "https://www.wyrestorm.com/product/mx-0808-h2a-mk2/",
];

function cleanText(value = "") {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function matchOne(html, regex) {
  const m = html.match(regex);
  return m?.[1] ? cleanText(m[1]) : "";
}

function collectTagSection(html, heading) {
  const safe = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(`####\\s*${safe}[\\s\\S]*?(?=####|##|Product categories)`, "i");
  const m = html.match(rx);
  if (!m) return [];
  const text = cleanText(m[0]);
  return text
    .replace(new RegExp(`^${heading}`, "i"), "")
    .split(" ")
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 16);
}

async function fetchProduct(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "WingmanCatalogSync/1.0 (+local dev)",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed ${res.status} for ${url}`);
  }

  const html = await res.text();

  const name =
    matchOne(html, /<h1[^>]*>\s*([^<]+?)\s*<\/h1>/i) ||
    matchOne(html, /<title[^>]*>\s*([^<]+?)\s*<\/title>/i) ||
    "Unknown Product";

  const sku =
    matchOne(html, /SKU:\s*([^<\n\r]+)/i) ||
    matchOne(html, /MODEL:\s*([^<\n\r]+)/i) ||
    "UNKNOWN";

  const summary =
    matchOne(html, /Login as a partner to view prices[\s\S]*?<p[^>]*>\s*([^<].*?)<\//i) ||
    matchOne(html, /Contact Sales for Price[\s\S]*?<p[^>]*>\s*([^<].*?)<\//i) ||
    "";

  const supportedResolution = collectTagSection(html, "Supported Resolution");
  const transmissionTechnology = collectTagSection(html, "Transmission Technology");
  const features = collectTagSection(html, "Features");
  const control = collectTagSection(html, "Control");

  return {
    sku,
    name,
    family: "WyreStorm",
    category: "Imported",
    role: "",
    status: "unknown",
    summary,
    io: [],
    connectivity: transmissionTechnology,
    control,
    features: [...supportedResolution, ...features].filter((v, i, a) => a.indexOf(v) === i),
    bestFor: [],
    sourceUrl: url,
  };
}

async function main() {
  const imported = [];

  for (const url of PRODUCT_URLS) {
    try {
      const item = await fetchProduct(url);
      imported.push(item);
      console.log(`Imported ${item.sku}`);
    } catch (err) {
      console.warn(`Skip ${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const out = `import type { GuruCatalogItem } from "./guruCatalog.seed";

export const WYRESTORM_CATALOG: GuruCatalogItem[] = ${JSON.stringify(imported, null, 2)};

export default WYRESTORM_CATALOG;
`;

  const here = path.dirname(fileURLToPath(import.meta.url));
  const target = path.resolve(here, "../src/features/guru/guruCatalog.generated.ts");
  await writeFile(target, out, "utf8");

  console.log(`Wrote ${target}`);
  console.log(`Imported ${imported.length} product entries`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
'@

Write-Text -Path $catalogSeedPath -Text $catalogSeed
Write-Text -Path $catalogGeneratedPath -Text $catalogGenerated
Write-Text -Path $guruServicePath -Text $guruService
Write-Text -Path $guruPagePath -Text $guruPage
Write-Text -Path $proposalPagePath -Text $proposalPage
Write-Text -Path $syncToolPath -Text $syncTool

Write-Host ""
Write-Host "== Guru AI grounding + proposal handoff applied ==" -ForegroundColor Cyan
Write-Host "Repo:   $repo"
Write-Host "Backup: $rescue"
Write-Host ""
Write-Host "Created / updated:"
Write-Host " - $catalogSeedPath"
Write-Host " - $catalogGeneratedPath"
Write-Host " - $guruServicePath"
Write-Host " - $guruPagePath"
Write-Host " - $proposalPagePath"
Write-Host " - $syncToolPath"
Write-Host ""
Write-Host "What changed:"
Write-Host " - Guru now returns product starting point first"
Write-Host " - Guru asks follow-up qualification questions separately"
Write-Host " - Guru shows SKU starting points when available"
Write-Host " - Proposal Builder now reads the Guru seed from localStorage"
Write-Host " - Added local grounding catalog + optional real API endpoint via VITE_GURU_API_URL"
Write-Host " - Added Node sync tool to refresh the Guru catalog from official product pages"
Write-Host ""
Write-Host "Run next:"
Write-Host "1. node .\tools\wingman-sync-wyrestorm-catalog.mjs"
Write-Host "2. npm run typecheck"
Write-Host "3. npm run dev"
Write-Host ""
Write-Host "Optional AI endpoint:"
Write-Host " - Set VITE_GURU_API_URL to a backend route that accepts:"
Write-Host '   { "question": "...", "localCatalog": [...], "allCatalogCount": number }'
Write-Host " - Return:"
Write-Host '   { "productStartingPoint": "...", "skuSuggestions": [...], "qualificationQuestions": [...], "guidanceNotes": [...] }'
