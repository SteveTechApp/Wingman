[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function BackupFile([string]$p) {
  if (Test-Path -LiteralPath $p) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item -LiteralPath $p -Destination ($p + ".bak_" + $stamp) -Force
    Write-Host ("Backup: {0}.bak_{1}" -f $p, $stamp) -ForegroundColor DarkYellow
  }
}
function WriteUtf8NoBom([string]$path, [string]$content) {
  [IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("Wrote: {0}" -f $path) -ForegroundColor Green
}

$RepoRoot = (Get-Item -LiteralPath $RepoRoot).FullName
$genCtxPath = Join-Path $RepoRoot "src\context\GenerationContext.tsx"
if (-not (Test-Path -LiteralPath $genCtxPath)) { throw "Missing: src/context/GenerationContext.tsx" }

BackupFile $genCtxPath
$txt = Get-Content -LiteralPath $genCtxPath -Raw

if ($txt -notmatch "useGenerationContext") {
  # Add alias just before the end
  $txt2 = $txt.TrimEnd() + "`r`n`r`n" + 'export const useGenerationContext = useGeneration;' + "`r`n"
  WriteUtf8NoBom $genCtxPath $txt2
} else {
  Write-Host "OK: useGenerationContext already exists." -ForegroundColor Green
}

Write-Host ""
Write-Host "== Running: npm run verify ==" -ForegroundColor Cyan
Push-Location $RepoRoot
try {
  npm run verify | Out-Host
} finally {
  Pop-Location
}
