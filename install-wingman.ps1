param(
    [string]$ProjectPath = ".\\wingman",
    [string]$OpenAIApiKey = "",
    [string]$OpenAIModel = "gpt-4.1-mini",
    [switch]$InstallPuppeteer
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Ensure-Command {
    param(
        [string]$CommandName,
        [string]$InstallHint
    )
    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "$CommandName is not installed or not on PATH. $InstallHint"
    }
}

function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )

    $directory = Split-Path -Parent $Path
    if ($directory -and -not (Test-Path $directory)) {
        New-Item -ItemType Directory -Force -Path $directory | Out-Null
    }

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

Write-Step "Checking prerequisites"
Ensure-Command -CommandName "node" -InstallHint "Install Node.js LTS from https://nodejs.org/"
Ensure-Command -CommandName "npm" -InstallHint "Install Node.js LTS from https://nodejs.org/"

Write-Step "Creating project folders"
New-Item -ItemType Directory -Force -Path $ProjectPath | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectPath "public") | Out-Null

Write-Step "Writing package.json"
Write-Utf8NoBom -Path (Join-Path $ProjectPath "package.json") -Content @'
{
  "name": "wingman-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "openai": "^4.56.0"
  }
}
'@

Write-Step "Writing server.js"
Write-Utf8NoBom -Path (Join-Path $ProjectPath "server.js") -Content @'
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", routes);

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Wingman running at http://localhost:${PORT}`);
});
'@

Write-Step "Writing ai.js"
Write-Utf8NoBom -Path (Join-Path $ProjectPath "ai.js") -Content @'
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY || "";
const client = apiKey ? new OpenAI({ apiKey }) : null;

export function hasOpenAI() {
  return Boolean(client);
}

export async function runAI(systemPrompt, userPrompt) {
  if (!client) {
    return null;
  }

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  return response.choices?.[0]?.message?.content?.trim() || "";
}
'@

Write-Step "Writing proposal.js"
Write-Utf8NoBom -Path (Join-Path $ProjectPath "proposal.js") -Content @'
export function buildBom(context) {
  const rows = [];
  const topology = context.topology || "AVoIP";
  const displays = Number(context.displayCount || 3);
  const sources = Number(context.sourceCount || 2);
  const usb = context.usbMode === "host-device";
  const audio = context.audioMode || "dsp";
  const control = context.controlMode !== "none";
  const switched = context.switchType !== "none";

  if (topology === "AVoIP") {
    rows.push(["WyreStorm Source Hub", "WyreStorm Apollo VX20", 1]);
    rows.push(["WyreStorm Encoder TX", "WyreStorm NHD-400-TX", sources]);
    rows.push(["WyreStorm Decoder RX", "WyreStorm NHD-400-RX", displays]);
    if (switched) rows.push(["Netgear AV Line Switch", "Netgear AV Line M4250 series", 1]);
  }

  if (topology === "Matrix") {
    rows.push(["WyreStorm Source Devices", "WyreStorm source family", sources]);
    rows.push(["WyreStorm Matrix Core", "WyreStorm matrix family", 1]);
  }

  if (topology === "Extender") {
    rows.push(["WyreStorm Source Hub", "WyreStorm Apollo VX20", 1]);
    rows.push(["WyreStorm Extender / TX-RX chain", "WyreStorm extender family", 1]);
    if (switched) rows.push(["Netgear AV Line Switch", "Netgear AV Line managed switch", 1]);
  }

  rows.push(["Hi-Sense Displays", "Hi-Sense display family", displays]);
  if (usb) rows.push(["WyreStorm USB-capable signal path", "WyreStorm USB-enabled AV endpoints", 1]);
  if (audio === "dsp") rows.push(["Generic DSP/Mixer", "Generic DSP/Mixer", 1]);
  if (audio === "amp") rows.push(["Generic 100V line amplifier", "4/6/8 channel 100V line amp", 1]);
  if (audio !== "embedded") rows.push(["Speaker Circuit", "100V line loudspeakers", 2]);
  if (control) rows.push(["3rd party control", "3rd party control", 1]);
  rows.push(["Structured cabling", "HDMI / CAT / USB to suit site conditions", Math.max(1, displays)]);

  return rows;
}

export function validateContext(context) {
  const issues = [];
  const topology = context.topology || "AVoIP";
  const distance = Number(context.distance || 0);
  const video = context.videoFormat || "4k60-444";

  if (topology === "AVoIP" && context.switchType !== "poe-managed") {
    issues.push({
      level: "error",
      title: "AVoIP requires managed switching",
      detail: "Wingman expects Netgear AV Line managed switching for multicast, VLAN, and QoS stability."
    });
  }

  if (topology === "Extender" && video === "4k60-444" && distance > 40) {
    issues.push({
      level: "warn",
      title: "Long-distance 4K60 4:4:4 risk",
      detail: "At longer copper distances, compression, DSC, reduced chroma, or alternate transport may be needed."
    });
  }

  if (topology === "Extender" && distance > 100) {
    issues.push({
      level: "error",
      title: "Copper distance exceeds 100m guideline",
      detail: `Current distance is ${distance}m.`
    });
  }

  if (topology === "Matrix" && context.usbMode === "host-device") {
    issues.push({
      level: "warn",
      title: "USB path needs separate architecture",
      detail: "HDMI matrix switching alone does not guarantee host/device USB workflow."
    });
  }

  if ((topology === "AVoIP" || topology === "Matrix") && context.controlMode === "none") {
    issues.push({
      level: "warn",
      title: "No control layer selected",
      detail: "Large rooms often still need control orchestration for displays, switching, or automation."
    });
  }

  if (!issues.length) {
    issues.push({
      level: "ok",
      title: "No major conflicts detected",
      detail: "Current configuration is internally consistent under Wingman prototype rules."
    });
  }

  return issues;
}

export function generateProposalText(context) {
  const topology = context.topology || "AVoIP";
  const competitor = context.competitor || "Blustream";
  const roomName = context.roomName || "Primary Room";

  const usbLine =
    context.usbMode === "host-device"
      ? "USB host/device support is included where required."
      : "USB transport is not part of the current brief.";

  const audioLine =
    context.audioMode === "embedded"
      ? "Audio is retained as embedded programme audio only."
      : context.audioMode === "amp"
        ? "Audio is distributed via a generic 100V line amplifier and loudspeaker circuit."
        : "Audio is processed via a Generic DSP/Mixer before distribution to the speaker circuit.";

  return `${roomName} is designed around a ${topology} architecture using a WyreStorm-first AV backbone, Netgear AV Line switching where network transport is required, Hi-Sense display technology, and an open control strategy through 3rd party control.

Design intent
This proposal is structured as a design and BOM solution rather than a price-led response. The system is intended to deliver a consistent, manufacturer-backed AV workflow without unnecessarily locking the project into a control-first ecosystem. ${usbLine} ${audioLine}

Why WyreStorm
WyreStorm is positioned here as the true AV transport manufacturer at the core of the solution. Rather than forcing a single ecosystem to own every layer of the room, Wingman keeps the AV backbone on WyreStorm, the switching layer on Netgear AV Line, the display layer on Hi-Sense, and control intentionally open.

Competitive positioning against ${competitor}
The comparison should be framed by transport role, endpoint behaviour, USB expectations, deployment complexity, and support accountability — not by badge familiarity alone.

Deliverable scope
The generated BOM is restricted to approved delivery brands and categories only: WyreStorm for core AV, Netgear AV Line for switching, Hi-Sense for display, Generic DSP/Mixer or Generic 100V line amplifier for audio, and 3rd party control.`;
}
'@

Write-Step "Writing copilot.js"
Write-Utf8NoBom -Path (Join-Path $ProjectPath "copilot.js") -Content @'
export function generateCopilotResponse(context, objection) {
  const competitor = (context.competitor || "Competitor").toLowerCase();
  const text = (objection || "").toLowerCase();

  if (text.includes("crestron") || competitor === "crestron") {
    return {
      response: "That makes sense if the discussion is really about the control layer. The next step is to confirm whether the client is standardising control, AV transport, or both.",
      questions: [
        "Is the requirement driven by control ecosystem preference or by AV signal transport outcomes?",
        "Do you actually need enterprise control depth, or do you need a reliable and scalable AV backbone?",
        "Would the customer accept WyreStorm as the AV transport layer while leaving control open through 3rd party control?"
      ],
      positioning: "Position WyreStorm as the AV backbone and avoid pretending it is a direct control-ecosystem substitute."
    };
  }

  if (text.includes("cost") || text.includes("cheap") || text.includes("price")) {
    return {
      response: "Cost can be optimised, but the right question is whether the customer wants the lowest upfront line item or the cleanest long-term AV standard.",
      questions: [
        "Are they comparing upfront acquisition only, or lifecycle reliability and supportability as well?",
        "What would cause the system to be redesigned in phase two?",
        "Would a more consistent WyreStorm-first standard reduce future variation across rooms?"
      ],
      positioning: "Reframe toward design repeatability, support clarity, and avoiding hidden technical compromise."
    };
  }

  if (text.includes("nvx") || text.includes("specified") || text.includes("already")) {
    return {
      response: "Understood. The safest move is to ask which specific functional requirements made that specification appear necessary.",
      questions: [
        "Is the requirement about transport method, USB behaviour, scaling, or ecosystem compatibility?",
        "Which feature is non-negotiable and which is just familiar specification language?",
        "Would a WyreStorm-first architecture satisfy the actual signal-chain requirement without overscoping the control layer?"
      ],
      positioning: "Validate the requirement first, then show like-for-like transport capability and explain where WyreStorm is commercially cleaner or operationally simpler."
    };
  }

  return {
    response: "The next move is to isolate whether the objection is technical, operational, commercial, or simply brand familiarity.",
    questions: [
      "What is the exact system outcome the client is trying to protect?",
      "Which layer are they really talking about: control, switching, transport, USB, or display?",
      "If WyreStorm matches the required role, what still makes the alternative feel safer to them?"
    ],
    positioning: "Keep the conversation anchored to actual requirement, signal path, deployment fit, and support accountability."
  };
}
'@

Write-Step "Writing export.js"
Write-Utf8NoBom -Path (Join-Path $ProjectPath "export.js") -Content @'
export function generateProposalHtml(context, proposalText, bom, validation) {
  const bomRows = bom.map(row => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`).join("");
  const validationRows = validation.map(v => `<li><strong>${v.title}</strong>: ${v.detail}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Wingman Proposal Export</title>
<style>
body{font-family:Arial,sans-serif;margin:40px;color:#142033}
h1,h2{color:#17345f}
table{width:100%;border-collapse:collapse;margin-top:16px}
th,td{border:1px solid #c9d6ee;padding:10px;text-align:left}
th{background:#eef4ff}
section{margin-bottom:28px}
ul{padding-left:20px}
.meta{color:#51627c}
</style>
</head>
<body>
<section>
<h1>Wingman Design Proposal</h1>
<div class="meta">Topology: ${context.topology || "AVoIP"} • Competitor context: ${context.competitor || "Blustream"} • Room: ${context.roomName || "Primary Room"}</div>
</section>
<section>
<h2>Proposal Narrative</h2>
<p>${proposalText.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>
</section>
<section>
<h2>Validation Notes</h2>
<ul>${validationRows}</ul>
</section>
<section>
<h2>Bill of Materials</h2>
<table>
<thead><tr><th>Item</th><th>Model</th><th>Qty</th></tr></thead>
<tbody>${bomRows}</tbody>
</table>
</section>
</body>
</html>`;
}
'@

Write-Step "Writing routes.js"
Write-Utf8NoBom -Path (Join-Path $ProjectPath "routes.js") -Content @'
import express from "express";
import { runAI, hasOpenAI } from "./ai.js";
import { buildBom, validateContext, generateProposalText } from "./proposal.js";
import { generateCopilotResponse } from "./copilot.js";
import { generateProposalHtml } from "./export.js";

const router = express.Router();

router.post("/proposal", async (req, res) => {
  const context = req.body || {};
  const bom = buildBom(context);
  const validation = validateContext(context);

  let proposal = generateProposalText(context);

  if (hasOpenAI()) {
    try {
      const aiText = await runAI(
        "You are a professional AV pre-sales and proposal writing assistant. Keep the proposal commercially disciplined, technically credible, and aligned to a WyreStorm-first delivery model.",
        `Write a concise client-facing AV proposal based on this JSON context:\n${JSON.stringify(context, null, 2)}`
      );
      if (aiText) proposal = aiText;
    } catch (err) {
      console.warn("OpenAI proposal fallback used:", err.message);
    }
  }

  res.json({ proposal, bom, validation });
});

router.post("/copilot", async (req, res) => {
  const { context = {}, objection = "" } = req.body || {};
  let output = generateCopilotResponse(context, objection);

  if (hasOpenAI()) {
    try {
      const aiText = await runAI(
        "You are a live AV sales copilot. Respond with short, useful call support. Include a response line, 2-3 questions to ask, and a positioning note. Stay honest. Never invent features.",
        `Context:\n${JSON.stringify(context, null, 2)}\n\nCustomer objection:\n${objection}`
      );

      if (aiText) {
        output = {
          response: aiText,
          questions: [],
          positioning: "AI-generated live sales guidance"
        };
      }
    } catch (err) {
      console.warn("OpenAI copilot fallback used:", err.message);
    }
  }

  res.json(output);
});

router.post("/export/proposal", async (req, res) => {
  const context = req.body || {};
  const bom = buildBom(context);
  const validation = validateContext(context);

  let proposal = generateProposalText(context);

  if (hasOpenAI()) {
    try {
      const aiText = await runAI(
        "You are a professional AV proposal writer. Produce a polished but concise client-facing proposal aligned to a WyreStorm-first AV design.",
        `Generate a proposal from this JSON context:\n${JSON.stringify(context, null, 2)}`
      );
      if (aiText) proposal = aiText;
    } catch (err) {
      console.warn("OpenAI export fallback used:", err.message);
    }
  }

  const html = generateProposalHtml(context, proposal, bom, validation);
  res.json({ filename: "wingman-proposal.html", html });
});

export default router;
'@

Write-Step "Writing public/index.html"
Write-Utf8NoBom -Path (Join-Path $ProjectPath "public\\index.html") -Content @'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Wingman – Backend AI + Export Engine</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css">
  <style>
    :root{--bg:#09111f;--panel:#121b31;--line:rgba(255,255,255,.08);--muted:#9fb3d9}
    body{background:linear-gradient(180deg,#101a31,#09111f);color:#eef3ff}
    main.container{max-width:1400px;padding-top:1.5rem}
    .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:1rem;margin-bottom:1rem}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem}
    .muted{color:var(--muted)}
    textarea{min-height:140px}
    pre{white-space:pre-wrap;background:#0d1528;padding:1rem;border-radius:12px;border:1px solid rgba(255,255,255,.06)}
    table{font-size:.92rem}
    .brand{display:flex;align-items:center;gap:.7rem}
    .brand-mark{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(180deg,#244b92,#13274c);border:1px solid rgba(255,255,255,.12);font-weight:700}
    @media (max-width:900px){.grid2,.grid3{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <nav class="container-fluid">
    <ul>
      <li>
        <div class="brand">
          <div class="brand-mark">W</div>
          <strong>Wingman</strong>
        </div>
      </li>
    </ul>
    <ul>
      <li><a href="#proposal">Proposal</a></li>
      <li><a href="#copilot">Copilot</a></li>
      <li><a href="#" role="button" id="exportBtn">Export Proposal</a></li>
    </ul>
  </nav>

  <main class="container">
    <div class="card">
      <hgroup>
        <h2>Backend AI + Export Engine</h2>
        <h3>Dynamic proposal generation, sales copilot responses, and export output driven by live design context</h3>
      </hgroup>
      <p class="muted">This uses a working backend rules engine now, with a built-in OpenAI integration path. If OPENAI_API_KEY is present, proposal and copilot routes can use the OpenAI service automatically.</p>
    </div>

    <div class="card">
      <div class="grid3">
        <label>Room name<input id="roomName" value="Room A" /></label>
        <label>Topology<select id="topology"><option>AVoIP</option><option>Matrix</option><option>Extender</option></select></label>
        <label>Competitor<select id="competitor"><option>Blustream</option><option>Crestron</option><option>Extron</option><option>Control4</option><option>RTI</option></select></label>
        <label>Video format<select id="videoFormat"><option>4k60-444</option><option>4k60-420</option><option>1080p60</option></select></label>
        <label>Distance (m)<input id="distance" type="number" value="112" /></label>
        <label>USB<select id="usbMode"><option value="host-device">Host + camera / touch</option><option value="none">No USB</option></select></label>
        <label>Audio<select id="audioMode"><option value="dsp">Generic DSP/Mixer + speakers</option><option value="amp">Generic 100V line amplifier + speakers</option><option value="embedded">Embedded only</option></select></label>
        <label>Control<select id="controlMode"><option value="third-party-control">3rd party control</option><option value="none">None</option></select></label>
        <label>Switch<select id="switchType"><option value="poe-managed">Netgear AV Line managed switch</option><option value="unmanaged">Unmanaged switch</option><option value="none">No switch</option></select></label>
        <label>Source count<input id="sourceCount" type="number" value="2" min="1" /></label>
        <label>Display count<input id="displayCount" type="number" value="3" min="1" /></label>
      </div>
    </div>

    <div class="grid2">
      <section id="proposal">
        <div class="card">
          <div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap">
            <strong>Proposal Generator</strong>
            <button id="proposalBtn">Generate Proposal</button>
          </div>
          <pre id="proposalOut">Generate a proposal to see the system narrative.</pre>
        </div>

        <div class="card">
          <strong>Validation</strong>
          <div id="validationOut" class="muted">Validation notes will appear here.</div>
        </div>

        <div class="card">
          <strong>Bill of Materials</strong>
          <table role="grid">
            <thead><tr><th>Item</th><th>Model</th><th>Qty</th></tr></thead>
            <tbody id="bomBody"></tbody>
          </table>
        </div>
      </section>

      <section id="copilot">
        <div class="card">
          <strong>Live AI Copilot</strong>
          <textarea id="objection" placeholder="Type a live customer objection or question..."></textarea>
          <button id="copilotBtn" style="margin-top:.75rem;">Get Response</button>
        </div>

        <div class="card">
          <strong>Copilot Response</strong>
          <pre id="copilotResponse">Ask a question to get positioning support.</pre>
        </div>
      </section>
    </div>
  </main>

  <section aria-label="Subscribe example">
    <div class="container">
      <article>
        <hgroup><h2>Stay on the prototype review loop</h2><h3>Track backend AI and export improvements</h3></hgroup>
        <form class="grid">
          <input type="text" id="firstname" name="firstname" placeholder="Your name" aria-label="Your name" required />
          <input type="email" id="email" name="email" placeholder="Email address" aria-label="Email address" required />
          <button type="submit" onclick="event.preventDefault()">Subscribe</button>
        </form>
      </article>
    </div>
  </section>

  <footer class="container"><small><a href="#">Wingman prototype</a> • <a href="#">Backend AI + export engine</a></small></footer>

  <script>
    function getContext() {
      return {
        roomName: document.getElementById('roomName').value,
        topology: document.getElementById('topology').value,
        competitor: document.getElementById('competitor').value,
        videoFormat: document.getElementById('videoFormat').value,
        distance: Number(document.getElementById('distance').value || 0),
        usbMode: document.getElementById('usbMode').value,
        audioMode: document.getElementById('audioMode').value,
        controlMode: document.getElementById('controlMode').value,
        switchType: document.getElementById('switchType').value,
        sourceCount: Number(document.getElementById('sourceCount').value || 1),
        displayCount: Number(document.getElementById('displayCount').value || 1)
      };
    }

    function renderBom(rows) {
      document.getElementById('bomBody').innerHTML = rows
        .map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`)
        .join('');
    }

    function renderValidation(items) {
      document.getElementById('validationOut').innerHTML = items
        .map(v => `<p><strong>${v.title}</strong><br>${v.detail}</p>`)
        .join('');
    }

    document.getElementById('proposalBtn').addEventListener('click', async () => {
      const res = await fetch('/api/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getContext())
      });
      const data = await res.json();
      document.getElementById('proposalOut').textContent = data.proposal;
      renderBom(data.bom);
      renderValidation(data.validation);
    });

    document.getElementById('copilotBtn').addEventListener('click', async () => {
      const objection = document.getElementById('objection').value;
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: getContext(), objection })
      });
      const data = await res.json();

      const output = [
        `Response: ${data.response}`,
        '',
        ...(data.questions?.length ? ['Questions:', ...data.questions.map(q => `- ${q}`), ''] : []),
        `Positioning: ${data.positioning}`
      ].join('\n');

      document.getElementById('copilotResponse').textContent = output;
    });

    document.getElementById('exportBtn').addEventListener('click', async (e) => {
      e.preventDefault();
      const res = await fetch('/api/export/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getContext())
      });
      const data = await res.json();
      const blob = new Blob([data.html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  </script>
</body>
</html>
'@

Write-Step "Writing .env"
Write-Utf8NoBom -Path (Join-Path $ProjectPath ".env") -Content @"
OPENAI_API_KEY=$OpenAIApiKey
OPENAI_MODEL=$OpenAIModel
PORT=3000
"@

Write-Step "Installing npm dependencies"
Push-Location $ProjectPath
npm install

if ($InstallPuppeteer) {
    Write-Step "Installing Puppeteer"
    npm install puppeteer
}
Pop-Location

Write-Step "Installation complete"
Write-Host "Project created at: $ProjectPath" -ForegroundColor Green
Write-Host "Run it with:" -ForegroundColor Yellow
Write-Host "  cd $ProjectPath"
Write-Host "  npm start"
Write-Host "  open http://localhost:3000"
Write-Host ""
Write-Host "If OpenAI was not supplied during install, edit .env and add OPENAI_API_KEY." -ForegroundColor Yellow