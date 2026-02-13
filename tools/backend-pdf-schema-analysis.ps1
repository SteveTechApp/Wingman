# tools/backend-pdf-schema-analysis.ps1
$ErrorActionPreference = "Stop"

function Backup($p) {
  if (Test-Path -LiteralPath $p) {
    Copy-Item -LiteralPath $p -Destination ($p + ".bak_" + (Get-Date -Format "yyyyMMdd_HHmmss")) -Force
    Write-Host "Backup: $p"
  }
}

function WriteUtf8NoBom($p, $c) {
  $d = Split-Path -Parent $p
  if ($d -and !(Test-Path -LiteralPath $d)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
  [IO.File]::WriteAllText($p, $c, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "Wrote: $p"
}

$B = "C:\Users\steve\wingman\backend"
$server = Join-Path $B "src\server.ts"
$pdfMod = Join-Path $B "src\geminiPdf.ts"

if (!(Test-Path -LiteralPath $server)) { throw "Missing: $server" }

Backup $server
Backup $pdfMod

# 1) Write/replace src/geminiPdf.ts
# - Upload PDF via Files API
# - Send candidate list + instruction to output JSON only
# - Parse JSON and return object (validation happens in server via AnalysisSchema)
$geminiPdf = @'
import { GoogleGenAI } from "@google/genai";
import type { WyreStormSku } from "./sku/catalog";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function modelName(): string {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

function compactCandidates(candidates: WyreStormSku[], max = 60) {
  return candidates.slice(0, max).map(c => ({
    sku: c.sku,
    category: c.category,
    description: (c.description || "").slice(0, 220),
  }));
}

function buildPdfJsonPrompt(extraText: string, candidates: WyreStormSku[]): string {
  const c = compactCandidates(candidates);

  return [
    "You are Wingman, an expert AV pre-sales assistant specialised in WyreStorm.",
    "You are analysing a customer tender/brief provided as a PDF.",
    "",
    "CRITICAL CONSTRAINT:",
    "You may ONLY recommend WyreStorm SKUs from the provided CANDIDATE LIST.",
    "If none are suitable, return an empty recommended_skus array.",
    "",
    "Return ONLY valid JSON in this shape (no markdown):",
    `{"executive_summary":"...","requirements":["..."],"risks":["..."],"questions":["..."],"detected_skus":["..."],"recommended_skus":[{"sku":"...","confidence":"high|medium|low","reason":"..."}]}`,
    "",
    "CANDIDATE LIST:",
    JSON.stringify(c, null, 2),
    "",
    "Rules:",
    "- Be conservative; if anything is unclear, ask clarification questions.",
    "- Include any SKUs you see in the PDF (WyreStorm or competitor) in detected_skus.",
    "- recommended_skus MUST be chosen only from the candidate list.",
    "- Keep executive_summary concise (5–10 lines).",
    "",
    extraText ? "Extra context provided by user:\n" + extraText : "",
  ].filter(Boolean).join("\n");
}

export async function analyzePdfToJson(
  fileName: string,
  pdfBytes: Buffer,
  extraText: string,
  candidates: WyreStormSku[]
): Promise<any> {
  const ai = new GoogleGenAI({ apiKey: mustEnv("GEMINI_API_KEY") });

  // Upload PDF (stored ~48 hours)
  const uploaded = await ai.files.upload({
    // Node 18+ has global Blob. Node 22 definitely does.
    file: new Blob([pdfBytes], { type: "application/pdf" }) as any,
    config: { mimeType: "application/pdf", displayName: fileName } as any,
  } as any);

  const prompt = buildPdfJsonPrompt(extraText, candidates);

  const resp = await ai.models.generateContent({
    model: modelName(),
    contents: [uploaded, prompt],
    config: {
      temperature: 0.2,
      maxOutputTokens: 1800,
    },
  } as any);

  const txt = String((resp as any).text || (resp as any).response?.text || "").trim();

  const start = txt.indexOf("{");
  const end = txt.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) throw new Error("Gemini PDF analysis did not return JSON.");

  return JSON.parse(txt.slice(start, end + 1));
}
'@
WriteUtf8NoBom $pdfMod $geminiPdf

# 2) Patch server.ts to use analyzePdfToJson AND return the same envelope as analyzeText()
$raw = Get-Content -LiteralPath $server -Raw

$inject = @'
import "dotenv/config";
import { analyzePdfToJson } from "./geminiPdf";
'@

if ($raw -match 'import\s+"dotenv/config";') {
  $raw = [regex]::Replace(
    $raw,
    'import\s+"dotenv/config";',
    $inject
  )
}
else {
  $raw = $inject + "`n" + $raw
}

# We need candidates + schema + post-validation pipeline
# Ensure these imports exist:
$needImports = @(
  'import { AnalysisSchema } from "./analysis/gemini";',
  'import { getCandidateSkus } from "./sku/retrieval";',
  'import { loadWyreStormCatalog, findSkuExact } from "./sku/catalog";',
  'import { inferRequirements, validateSkuAgainstRequirements } from "./sku/constraints";'
)

foreach ($imp in $needImports) {
  if ($raw -notmatch [regex]::Escape($imp)) {
    # insert after last import line
    $lines = $raw -split "`r?`n"
    $last = -1
    for ($i=0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '^\s*import\s') { $last = $i } }
    if ($last -ge 0) {
      $out = New-Object System.Collections.Generic.List[string]
      for ($i=0; $i -lt $lines.Count; $i++) {
        $out.Add($lines[$i])
        if ($i -eq $last) { $out.Add($imp) }
      }
      $raw = ($out -join "`n")
    } else {
      $raw = $imp + "`n" + $raw
    }
  }
}

# Insert PDF handling inside /api/analyze try block.
# We'll locate 'const files = ...' if present, otherwise insert near top of handler.
if ($raw -notmatch 'const files\s*=\s*\(req\.files') {
  # Insert files declaration inside handler after try {
  $raw = [regex]::Replace(
    $raw,
    '(app\.post\("/api/analyze"[\s\S]*?=>\s*\{\s*try\s*\{\s*)',
    '$1' + "const files = (req.files || []) as Express.Multer.File[];`n",
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

# Insert pastedText extraction if missing
if ($raw -notmatch 'const pastedText\s*=') {
  $raw = [regex]::Replace
    $raw,
    '(const files\s*=\s*\(req\.files[\s\S]*?\);\s*)',
    '$1' + "const pastedText = typeof (req as any).body?.pastedText === \"string\" ? (req as any).body.pastedText : \"\";`n",
}
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  


# Add PDF-first branch (before existing combined-text extraction)
$branchMarker = '/*PDF_SCHEMA_BRANCH*/'
if ($raw -notmatch [regex]::Escape($branchMarker)) {
  $pdfBranch = @'
/*PDF_SCHEMA_BRANCH*/
const pdf = files.find(f => (f.mimetype || "").toLowerCase() === "application/pdf" || f.originalname.toLowerCase().endsWith(".pdf"));
if (pdf) {
  // Ensure catalogue loaded (category inference happens here)
  loadWyreStormCatalog();

  // Candidate selection uses the pastedText as hints (if present)
  const candidates = getCandidateSkus(pastedText || "", 60);

  // Gemini processes the PDF directly and returns JSON (grounded to candidates)
  const rawJson = await analyzePdfToJson(pdf.originalname, pdf.buffer, pastedText || "", candidates);

  // Validate schema (hard fail if malformed)
  const parsed = AnalysisSchema.parse(rawJson);

  // Apply the same constraint validation and link enrichment as the text pipeline
  const req = inferRequirements(pastedText || "");
  const kept: any[] = [];
  const removed: any[] = [];
  const softWarnings: any[] = [];
  const nextRecs: any[] = [];

  for (const rec of (parsed.recommended_skus || [])) {
    const sku = (rec.sku || "").trim().toUpperCase();
    const entry = findSkuExact(sku);

    if (!entry) { removed.push({ sku, reason: "Not found in catalogue." }); continue; }

    const v = validateSkuAgainstRequirements(entry, req);
    if (!v.ok) { removed.push({ sku, reasons: v.reasons, confidence: rec.confidence, geminiReason: rec.reason }); continue; }

    const hadSoft = (v.reasons || []).length > 0;
    let conf: "high" | "medium" | "low" = rec.confidence;
    if (hadSoft) {
      if (conf === "high") conf = "medium";
      else if (conf === "medium") conf = "low";
      softWarnings.push({ sku, warnings: v.reasons });
    }

    nextRecs.push({ ...rec, sku, confidence: conf });
    kept.push({ sku, confidence: conf });
  }

  parsed.recommended_skus = nextRecs;

  const uniq = (arr: string[]) => Array.from(new Set(arr));
  const productLink = (sku: string) => `https://www.wyrestorm.com/products/${encodeURIComponent((sku || "").trim())}`;
  const links = uniq((parsed.recommended_skus || []).map((r: any) => r.sku)).map((sku) => ({ sku, url: productLink(sku) }));

  return res.json({
    ok: true,
    result: {
      ...parsed,
      wyrestorm_links: links,
      recommendation_validation: { kept, removed, softWarnings }
    }
  });
}
'@

  # Insert right after pastedText definition
  $raw = [regex]::Replace(
    $raw,
    '(const pastedText[\s\S]*?;\s*)',
    '$1' + "`n" + $pdfBranch + "`n",
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

WriteUtf8NoBom $server $raw

Write-Host ""
Write-Host "== Done =="
Write-Host "Restart backend:"
Write-Host "  cd C:\Users\steve\wingman\backend"
Write-Host "  npm run dev"
Write-Host ""
Write-Host "Test PDF (multipart):"
Write-Host "  (Upload a PDF via your Guru Analyse Document UI or via curl/Postman)"
Write-Host ""
Write-Host "Test text (JSON):"
Write-Host '  $body = @{ pastedText = "Need AVoIP, 4K60 HDR, multiview and Dante. BYOD USB-C preferred." } | ConvertTo-Json'
Write-Host "  Invoke-RestMethod -Uri http://localhost:5055/api/analyze -Method Post -ContentType ""application/json"" -Body `$body"
