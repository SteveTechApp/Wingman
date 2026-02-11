param(
  [int]$MaxIterations = 25
)

$ErrorActionPreference = "Stop"
$Root = "C:\Users\steve\wingman"
Set-Location $Root

function Write-Utf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path $path -Parent
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

function Backup-File([string]$path) {
  if (!(Test-Path $path)) { return }
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  Copy-Item $path "$path.bak_$stamp" -Force
}

function Normalize-MissingPath([string]$absPath) {
  # Convert absolute missing file path into repo-relative path starting at src\
  $p = $absPath.Replace("/", "\")
  $idx = $p.ToLower().IndexOf("\src\")
  if ($idx -lt 0) { return $null }
  return $p.Substring($idx + 1) # drop leading "\"
}

function Guess-Extensions([string]$relNoExt) {
  return @("$relNoExt.tsx", "$relNoExt.ts", "$relNoExt.jsx", "$relNoExt.js")
}

function Has-AnyExtension([string]$p) {
  return $p -match "\.(ts|tsx|js|jsx)$"
}

function Find-CandidateByName([string]$moduleBaseName) {
  $targets = @("$moduleBaseName.tsx", "$moduleBaseName.ts", "$moduleBaseName.jsx", "$moduleBaseName.js")
  $cand = Get-ChildItem "$Root\src" -Recurse -File -Include $targets |
    Where-Object { $_.FullName -notmatch "\\node_modules\\" } |
    Select-Object -First 1
  return $cand
}

function Make-Shim([string]$shimAbsPath, [string]$targetFileAbs) {
  $srcRoot = Join-Path $Root "src"
  $relToSrc = $targetFileAbs.Substring($srcRoot.Length).TrimStart("\")
  $aliasPath = "@/" + ($relToSrc -replace "\\","/") -replace "\.(ts|tsx|js|jsx)$",""
  $shim = @"
export * from "$aliasPath";
export { default } from "$aliasPath";
"@
  Write-Utf8NoBom $shimAbsPath $shim
  return $aliasPath
}

function Make-GenericStub([string]$shimAbsPath, [string]$moduleName) {
  $isReact = $shimAbsPath -match "\.(tsx|jsx)$"
  if ($isReact) {
    $code = @"
import React from "react";

/**
 * AUTO-STUB: $moduleName
 * This placeholder exists to unblock builds; replace with real implementation.
 */
export default function $moduleName() {
  return (
    <div style={{
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.05)",
      padding: 14
    }}>
      <div style={{ fontWeight: 900, fontSize: 13 }}>$moduleName</div>
      <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
        Auto-generated stub (missing module).
      </div>
    </div>
  );
}
"@
    Write-Utf8NoBom $shimAbsPath $code
  } else {
    $code = @"
/**
 * AUTO-STUB: $moduleName
 * This placeholder exists to unblock builds; replace with real implementation.
 */

export default {};
"@
    Write-Utf8NoBom $shimAbsPath $code
  }
}

function Make-ImportPipelineStub([string]$shimAbsPath, [string]$moduleBase) {
  # Special-case: src/app/import/* modules
  $leaf = [IO.Path]::GetFileNameWithoutExtension($shimAbsPath)
  $rel = $shimAbsPath.Substring($Root.Length).TrimStart("\")
  if ($rel -notmatch "^src\\app\\import\\") { return $false }

  switch ($leaf) {
    "textExtractors" {
      $code = @"
export type ExtractorResult = { text: string; meta?: Record<string, any> };
export function extractPlainText(input: unknown): ExtractorResult {
  if (input == null) return { text: "" };
  if (typeof input === "string") return { text: input };
  if (Array.isArray(input)) return { text: input.map(x => extractPlainText(x).text).filter(Boolean).join("\n") };
  if (typeof input === "object") { try { return { text: JSON.stringify(input, null, 2), meta: { format: "json" } }; } catch { } }
  return { text: String(input) };
}
export function extractKeyValueLines(text: string): Record<string,string> {
  const out: Record<string,string> = {};
  (text||"").split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([^:]{2,50})\s*:\s*(.+)\s*$/);
    if (!m) return;
    out[m[1].trim()] = m[2].trim();
  });
  return out;
}
export const textExtractors = { extractPlainText, extractKeyValueLines };
export default textExtractors;
"@
      Write-Utf8NoBom $shimAbsPath $code
      return $true
    }
    "extractRequirements" {
      $code = @"
import { extractPlainText, extractKeyValueLines } from "./textExtractors";

export type Requirement = { key: string; value: string; confidence?: number };
export type RequirementsResult = { rawText: string; requirements: Requirement[]; kv?: Record<string,string>; meta?: Record<string,any> };

export function extractRequirements(input: unknown): RequirementsResult {
  const { text } = extractPlainText(input);
  const rawText = (text||"").trim();
  const kv = extractKeyValueLines(rawText);
  const requirements: Requirement[] = Object.keys(kv).map(k => ({ key: k, value: kv[k], confidence: 0.7 }));
  return { rawText, requirements, kv, meta: { extractor: "auto-stub" } };
}

export default extractRequirements;
"@
      Write-Utf8NoBom $shimAbsPath $code
      return $true
    }
  }

  return $false
}

function Ensure-ModuleFile([string]$missingAbsNoExt) {
  $rel = Normalize-MissingPath $missingAbsNoExt
  if (-not $rel) { throw "Could not normalize missing path: $missingAbsNoExt" }

  # If Vite gave path without extension, try create .ts/.tsx depending on name/location
  $relNoExt = $rel
  if (Has-AnyExtension $relNoExt) {
    $candidates = @($relNoExt)
  } else {
    $candidates = Guess-Extensions $relNoExt
  }

  # If any already exists, no action
  foreach ($c in $candidates) {
    $abs = Join-Path $Root $c
    if (Test-Path $abs) { return @{ created = $false; path = $abs; kind = "exists" } }
  }

  # Choose a target extension:
  # - If path includes \components\ or name is PascalCase -> tsx
  $baseName = [IO.Path]::GetFileName($relNoExt)
  $chooseTsx = ($relNoExt -match "\\components\\") -or ($baseName -match "^[A-Z]")

  $targetRel = if (Has-AnyExtension $relNoExt) { $relNoExt } else { if ($chooseTsx) { "$relNoExt.tsx" } else { "$relNoExt.ts" } }
  $targetAbs = Join-Path $Root $targetRel

  # Try to find a candidate with same leaf filename elsewhere
  $leaf = [IO.Path]::GetFileName($relNoExt)
  $cand = Find-CandidateByName $leaf

  if ($cand) {
    $alias = Make-Shim $targetAbs $cand.FullName
    return @{ created = $true; path = $targetAbs; kind = "shim"; target = $alias }
  }

  # Special-case import pipeline
  $made = Make-ImportPipelineStub $targetAbs $leaf
  if ($made) {
    return @{ created = $true; path = $targetAbs; kind = "stub(import)" }
  }

  # Otherwise generic stub
  $moduleName = ($leaf -replace "[^a-zA-Z0-9_]", "_")
  if ($moduleName -match "^\d") { $moduleName = "Module_$moduleName" }
  Make-GenericStub $targetAbs $moduleName
  return @{ created = $true; path = $targetAbs; kind = "stub" }
}

function Run-BuildAndCapture {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "cmd.exe"
  $psi.Arguments = "/c npm run build"
  $psi.WorkingDirectory = $Root
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError  = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true

  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  [void]$p.Start()
  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()
  $p.WaitForExit()

  return @{
    code = $p.ExitCode
    out  = $stdout + "`n" + $stderr
  }
}

$logDir = "$Root\tools\_reports"
if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$sessionLog = Join-Path $logDir "heal_missing_modules_$stamp.log"

"=== Heal Missing Modules Session $stamp ===`r`n" | Out-File -FilePath $sessionLog -Encoding utf8

for ($i=1; $i -le $MaxIterations; $i++) {
  Write-Host "== Iteration $i/$MaxIterations =="
  $res = Run-BuildAndCapture
  Add-Content -Path $sessionLog -Value ("`r`n--- Iteration $i build output ---`r`n" + $res.out)

  if ($res.code -eq 0) {
    Write-Host "✔ Build succeeded."
    Write-Host "Log: $sessionLog"
    exit 0
  }

  # Parse missing module error
  $m = [regex]::Match($res.out, 'Could not load\s+([A-Za-z]:\\[^(\r\n]+)\s+\(imported by\s+([^)]+)\)')
  if (!$m.Success) {
    Write-Host "✗ Build failed, but not due to a missing module path that this healer can auto-fix."
    Write-Host "Log: $sessionLog"
    Write-Host "Next step: paste the FIRST 30 lines around the error from the log."
    exit 1
  }

  $missingAbs = $m.Groups[1].Value.Trim()
  $importedBy = $m.Groups[2].Value.Trim()

  Write-Host "Missing: $missingAbs"
  Write-Host "Imported by: $importedBy"

  $fix = Ensure-ModuleFile $missingAbs
  Write-Host ("Applied: " + ($fix.kind) + " -> " + $fix.path + ($(if($fix.target){" (target " + $fix.target + ")"}else{""})))

  # continue loop
}

Write-Host "✗ Reached MaxIterations=$MaxIterations without a successful build."
Write-Host "Log: $sessionLog"
exit 2
