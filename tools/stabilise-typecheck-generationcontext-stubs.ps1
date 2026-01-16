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
# 1) useProjectGeneration: return expected handler names
# ---------------------------
$useGenPath = Join-Path $RepoRoot "src\hooks\useProjectGeneration.ts"
BackupFile $useGenPath

$useGen = @'
type DisabledResult = { ok: false; message: string };

async function disabled<T = unknown>(_name: string): Promise<T> {
  throw new Error("Project generation is temporarily disabled (stabilisation mode).");
}

export function useProjectGeneration() {
  return {
    isLoading: false,
    error: null as unknown,

    // Legacy handler names expected by GenerationContext/pages
    handleAgentSubmit: async (..._args: unknown[]) => disabled("handleAgentSubmit"),
    handleProjectSetupSubmit: async (..._args: unknown[]) => disabled("handleProjectSetupSubmit"),
    handleSurveyImport: async (..._args: unknown[]) => disabled("handleSurveyImport"),
    handleStartFromTemplate: async (..._args: unknown[]) => disabled("handleStartFromTemplate"),
    handleDesignRoom: async (..._args: unknown[]) => disabled("handleDesignRoom"),
    handleGenerateDiagram: async (..._args: unknown[]) => disabled("handleGenerateDiagram"),
    handleGenerateProposal: async (..._args: unknown[]) => disabled("handleGenerateProposal"),
    handleValueEngineerRoom: async (..._args: unknown[]) => disabled("handleValueEngineerRoom")
  };
}
'@

WriteUtf8NoBom $useGenPath $useGen

# ---------------------------
# 2) assistantService: add createChatSession export
# ---------------------------
$assistantPath = Join-Path $RepoRoot "src\services\assistantService.ts"
BackupFile $assistantPath

$assistant = @'
export type ChatSession = {
  id: string;
  send: (message: string) => Promise<string>;
};

export async function askAssistant(_prompt: string): Promise<string> {
  throw new Error("assistantService is temporarily disabled (stabilisation mode).");
}

export function createChatSession(): ChatSession {
  return {
    id: "disabled",
    send: async (_message: string) => {
      throw new Error("Chat session is temporarily disabled (stabilisation mode).");
    }
  };
}
'@
WriteUtf8NoBom $assistantPath $assistant

# ---------------------------
# 3) videoService: add generateProductVideo export
# ---------------------------
$videoPath = Join-Path $RepoRoot "src\services\videoService.ts"
BackupFile $videoPath

$video = @'
export async function generateVideo(_input: unknown): Promise<unknown> {
  throw new Error("videoService is temporarily disabled (stabilisation mode).");
}

export async function generateProductVideo(_input: unknown): Promise<unknown> {
  throw new Error("generateProductVideo is temporarily disabled (stabilisation mode).");
}
'@
WriteUtf8NoBom $videoPath $video

# ---------------------------
# 4) AnalyticsDashboard placeholder: accept props.projects
# ---------------------------
$analyticsDash = Join-Path $RepoRoot "src\components\AnalyticsDashboard.tsx"
if (Test-Path -LiteralPath $analyticsDash) {
  BackupFile $analyticsDash
  $ad = @'
import React from "react";

type Props = {
  projects?: unknown[];
};

export default function AnalyticsDashboard(_props: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
      <div className="font-medium">Analytics Dashboard</div>
      <div className="mt-1 opacity-80">
        Temporarily disabled for stabilisation (types out of sync).
      </div>
    </div>
  );
}
'@
  WriteUtf8NoBom $analyticsDash $ad
}

# ---------------------------
# 5) SystemDiagram placeholder: accept diagram prop (used by ProposalDisplay)
# ---------------------------
$sysDiagram = Join-Path $RepoRoot "src\components\SystemDiagram.tsx"
if (Test-Path -LiteralPath $sysDiagram) {
  BackupFile $sysDiagram
  $sd = @'
import React from "react";

type Props = {
  diagram?: unknown;
};

export default function SystemDiagram(_props: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
      <div className="font-medium">System Diagram</div>
      <div className="mt-1 opacity-80">
        Temporarily disabled for stabilisation (diagram component interface out of sync).
      </div>
    </div>
  );
}
'@
  WriteUtf8NoBom $sysDiagram $sd
}

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
