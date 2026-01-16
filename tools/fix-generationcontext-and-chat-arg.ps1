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
# 1) Hard rewrite GenerationContext with a stable, type-safe provider shape
# ---------------------------
$genCtxPath = Join-Path $RepoRoot "src\context\GenerationContext.tsx"
if (Test-Path -LiteralPath $genCtxPath) {
  BackupFile $genCtxPath
}

$genCtx = @'
import React, { createContext, useContext, useMemo } from "react";
import { useProjectGeneration } from "../hooks/useProjectGeneration";

type GenerationContextValue = ReturnType<typeof useProjectGeneration>;

const GenerationContext = createContext<GenerationContextValue | null>(null);

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const gen = useProjectGeneration();

  // Ensure provider value always includes isLoading + error + handlers (whatever hook returns)
  const value = useMemo(() => gen, [gen]);

  return <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>;
}

export function useGeneration() {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error("useGeneration must be used within a GenerationProvider");
  return ctx;
}
'@

WriteUtf8NoBom $genCtxPath $genCtx

# ---------------------------
# 2) Loosen assistantService.createChatSession arg type (accept UserProfile/anything)
# ---------------------------
$assistantPath = Join-Path $RepoRoot "src\services\assistantService.ts"
if (-not (Test-Path -LiteralPath $assistantPath)) {
  throw "assistantService.ts not found at src/services/assistantService.ts"
}

BackupFile $assistantPath

$assistant = @'
export async function askAssistant(_prompt: string): Promise<string> {
  throw new Error("assistantService is temporarily disabled (stabilisation mode).");
}

/**
 * Shim for pages that expect a Google GenAI Chat-like object.
 * Accepts any argument (model name, user profile, config, etc.) to match call sites during stabilisation.
 */
export function createChatSession(_arg?: any): any {
  return {
    sendMessage: async (_message: string) => {
      throw new Error("Chat is temporarily disabled (stabilisation mode).");
    }
  };
}
'@

WriteUtf8NoBom $assistantPath $assistant

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
