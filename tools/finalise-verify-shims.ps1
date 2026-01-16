[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function EnsureDir([string]$p) { if (-not (Test-Path -LiteralPath $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }
function BackupFile([string]$p) {
  if (Test-Path -LiteralPath $p) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item -LiteralPath $p -Destination ($p + ".bak_" + $stamp) -Force
    Write-Host ("Backup: {0}.bak_{1}" -f $p, $stamp) -ForegroundColor DarkYellow
  }
}
function WriteUtf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path -Parent $path
  if ($dir) { EnsureDir $dir }
  [IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("Wrote: {0}" -f $path) -ForegroundColor Green
}

$RepoRoot = (Get-Item -LiteralPath $RepoRoot).FullName

# ---------------------------
# 1) Fix GenerationContext provider value shape (add isLoading + error)
# ---------------------------
$genCtxPath = Join-Path $RepoRoot "src\context\GenerationContext.tsx"
if (Test-Path -LiteralPath $genCtxPath) {
  BackupFile $genCtxPath
  $src = Get-Content -LiteralPath $genCtxPath -Raw

  # Best-effort patch: ensure the provider value includes isLoading/error.
  # Replace: value={{ handleAgentSubmit: ..., ... }}
  # With:    value={{ isLoading, error, handleAgentSubmit: ..., ... }}
  $patched = [Text.RegularExpressions.Regex]::Replace(
    $src,
    '(value=\{\{\s*)(handleAgentSubmit\s*:)',
    '$1isLoading, error, $2',
    1
  )

  if ($patched -eq $src) {
    # If pattern didn't match, do a second attempt: insert after "value={{"
    $patched = [Text.RegularExpressions.Regex]::Replace(
      $src,
      '(value=\{\{)',
      '$1 isLoading, error,',
      1
    )
  }

  WriteUtf8NoBom $genCtxPath $patched
} else {
  Write-Host "WARN: src/context/GenerationContext.tsx not found; skipped." -ForegroundColor Yellow
}

# ---------------------------
# 2) assistantService: createChatSession(model?) returns any (matches Chat expectations)
# ---------------------------
$assistantPath = Join-Path $RepoRoot "src\services\assistantService.ts"
BackupFile $assistantPath

$assistant = @'
export async function askAssistant(_prompt: string): Promise<string> {
  throw new Error("assistantService is temporarily disabled (stabilisation mode).");
}

/**
 * Shim for pages that expect a Google GenAI Chat-like object.
 * We deliberately return `any` to avoid coupling to the GenAI SDK types while stabilising.
 */
export function createChatSession(_model?: string): any {
  return {
    sendMessage: async (_message: string) => {
      throw new Error("Chat is temporarily disabled (stabilisation mode).");
    }
  };
}
'@
WriteUtf8NoBom $assistantPath $assistant

# ---------------------------
# 3) videoService: generateProductVideo(prompt, opts?) returns string URL
# ---------------------------
$videoPath = Join-Path $RepoRoot "src\services\videoService.ts"
BackupFile $videoPath

$video = @'
export async function generateVideo(_input: unknown): Promise<unknown> {
  throw new Error("videoService is temporarily disabled (stabilisation mode).");
}

/**
 * Shim used by VideoGeneratorPage.
 * Returns a string URL placeholder so setState(string) remains type-safe.
 */
export async function generateProductVideo(_prompt: string, _options?: any): Promise<string> {
  // In stabilisation mode we return a deterministic placeholder.
  return "about:blank";
}
'@
WriteUtf8NoBom $videoPath $video

# ---------------------------
# Run verify
# ---------------------------
Write-Host ""
Write-Host "== Running: npm run verify ==" -ForegroundColor Cyan
Push-Location $RepoRoot
try {
  npm run verify | Out-Host
} finally {
  Pop-Location
}
