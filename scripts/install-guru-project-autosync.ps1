Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $fullPath = Join-Path (Get-Location).Path $Path
  $dir = Split-Path $fullPath -Parent

  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8)
}

function Backup-File {
  param([string]$Path)

  $fullPath = Join-Path (Get-Location).Path $Path
  if (!(Test-Path $fullPath)) { return }

  $backupDir = Join-Path (Get-Location).Path "_RESCUE\guru-project-autosync"
  if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  }

  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $name = Split-Path $Path -Leaf
  Copy-Item $fullPath (Join-Path $backupDir "$stamp-$name.bak") -Force
}

$helper = @'
export const GURU_ACTIVE_PROJECT_KEY = "wingman.currentProject";

export function saveGuruActiveProject(project: unknown): void {
  if (typeof window === "undefined") return;

  try {
    if (project == null) {
      window.sessionStorage.removeItem(GURU_ACTIVE_PROJECT_KEY);
      return;
    }

    window.sessionStorage.setItem(
      GURU_ACTIVE_PROJECT_KEY,
      JSON.stringify(project),
    );
  } catch {
    // ignore storage issues
  }
}

export function clearGuruActiveProject(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(GURU_ACTIVE_PROJECT_KEY);
  } catch {
    // ignore storage issues
  }
}
'@

Save-Utf8NoBom "src\features\ai\guru\projectSnapshotSync.ts" $helper
Write-Host "Created: src\features\ai\guru\projectSnapshotSync.ts"

$projectContextPath = "src\context\ProjectContext.tsx"

if (Test-Path $projectContextPath) {
  Backup-File $projectContextPath

  $t = Get-Content $projectContextPath -Raw
  $original = $t

  if ($t -notmatch 'saveGuruActiveProject') {
    if ($t -match 'from\s+["''][^"'']+["''];') {
      $t = $t -replace '(import\s+.*?;\s*)', "`$1import { saveGuruActiveProject } from `"@/features/ai/guru/projectSnapshotSync`";`r`n"
    } else {
      $t = 'import { saveGuruActiveProject } from "@/features/ai/guru/projectSnapshotSync";' + "`r`n" + $t
    }
  }

  $needsUseEffect = $false
  if ($t -notmatch '\buseEffect\b') {
    $needsUseEffect = $true
  }

  if ($needsUseEffect) {
    $t = $t -replace 'import\s*\{\s*([^}]+)\s*\}\s*from\s*["'']react["''];', {
      param($m)
      $inside = $m.Groups[1].Value
      if ($inside -notmatch '\buseEffect\b') {
        $inside = $inside.Trim() + ', useEffect'
      }
      'import { ' + $inside + ' } from "react";'
    }
  }

  if ($t -match 'const\s*\[\s*currentProject\s*,\s*setCurrentProject\s*\]') {
    if ($t -notmatch 'saveGuruActiveProject\(currentProject\)') {
      $insert = @'

  useEffect(() => {
    saveGuruActiveProject(currentProject);
  }, [currentProject]);

'@
      $t = $t -replace '(const\s*\[\s*currentProject\s*,\s*setCurrentProject\s*\][\s\S]*?;\s*)', "`$1$insert"
      Write-Host "Patched currentProject autosync in ProjectContext.tsx"
    }
  } elseif ($t -match 'const\s*\[\s*activeProject\s*,\s*setActiveProject\s*\]') {
    if ($t -notmatch 'saveGuruActiveProject\(activeProject\)') {
      $insert = @'

  useEffect(() => {
    saveGuruActiveProject(activeProject);
  }, [activeProject]);

'@
      $t = $t -replace '(const\s*\[\s*activeProject\s*,\s*setActiveProject\s*\][\s\S]*?;\s*)', "`$1$insert"
      Write-Host "Patched activeProject autosync in ProjectContext.tsx"
    }
  } else {
    Write-Host "No currentProject/activeProject state pattern found in ProjectContext.tsx"
  }

  if ($t -ne $original) {
    Save-Utf8NoBom $projectContextPath $t
    Write-Host "Updated: $projectContextPath"
  } else {
    Write-Host "No changes needed in: $projectContextPath"
  }
} else {
  Write-Host "Skipped: src\context\ProjectContext.tsx not found"
}

$projectProviderPath = "src\app\providers\WingmanProviders.tsx"
if (Test-Path $projectProviderPath) {
  Write-Host "Found provider shell: $projectProviderPath"
}

Write-Host ""
Write-Host "Next:"
Write-Host "1. npm run typecheck"
Write-Host "2. npm run dev"
Write-Host "3. Open a project, then open /app/tools/guru"