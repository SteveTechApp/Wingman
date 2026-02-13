$ErrorActionPreference = "Stop"
$Root = "C:\Users\steve\wingman"
Set-Location $Root

function Write-Utf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path $path -Parent
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

$target = Join-Path $Root "src\app\import\textExtractors.ts"
if (Test-Path $target) {
  Write-Host "✔ Already exists: $target"
  exit 0
}

$code = @"
export type ExtractorResult = {
  text: string;
  meta?: Record<string, any>;
};

export type TextExtractor = (input: unknown) => ExtractorResult;

/**
 * Best-effort normalize various intake inputs into a single plain-text string.
 * This is intentionally minimal to unblock the build; enhance later as needed.
 */
export function extractPlainText(input: unknown): ExtractorResult {
  if (input == null) return { text: "" };

  // Strings
  if (typeof input === "string") return { text: input };

  // File / Blob
  if (typeof Blob !== "undefined" && input instanceof Blob) {
    return { text: "", meta: { note: "Blob provided; use extractFromBlobAsync() for async read." } };
  }

  // Arrays
  if (Array.isArray(input)) {
    const joined = input.map(x => extractPlainText(x).text).filter(Boolean).join("\n");
    return { text: joined };
  }

  // Objects
  if (typeof input === "object") {
    try {
      return { text: JSON.stringify(input, null, 2), meta: { format: "json" } };
    } catch {
      return { text: String(input) };
    }
  }

  // Numbers / booleans / fallback
  return { text: String(input) };
}

/**
 * Async helper to read a Blob/File as text.
 */
export async function extractFromBlobAsync(blob: Blob): Promise<ExtractorResult> {
  const text = await blob.text();
  return { text, meta: { format: "blobText" } };
}

/**
 * Very lightweight heuristics to extract "key: value" lines from text.
 */
export function extractKeyValueLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  (text || "").split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([^:]{2,50})\s*:\s*(.+)\s*$/);
    if (!m) return;
    const key = m[1].trim();
    const val = m[2].trim();
    if (key && val) out[key] = val;
  });
  return out;
}

/**
 * Export a small registry (common pattern) so existing code can select extractors.
 */
export const textExtractors = {
  extractPlainText,
  extractFromBlobAsync,
  extractKeyValueLines
};

export default textExtractors;
"@

Write-Utf8NoBom $target $code
Write-Host "✔ Created: src/app/import/textExtractors.ts"
Write-Host "Next: npm run build"
