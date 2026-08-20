param(
    [string]$RepoRoot = "C:\Users\steve\wingman"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Step([string]$Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}
function Ok([string]$Text) {
    Write-Host "    $Text" -ForegroundColor Green
}
function Fail([string]$Text) {
    throw $Text
}

function Get-ListeningProcessInfo([int]$Port) {
    $connections = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    $results = @()

    foreach ($connection in $connections) {
        $pidValue = [int]$connection.OwningProcess
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $pidValue" -ErrorAction SilentlyContinue

        $results += [pscustomobject]@{
            Port = $Port
            Pid = $pidValue
            Name = $proc.Name
            CommandLine = $proc.CommandLine
        }
    }

    return $results
}

$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
$worktree = Join-Path $RepoRoot ".wingman-work\av-product-semantics"
$branch = "feature/av-product-semantics"

if (-not (Test-Path -LiteralPath $worktree)) {
    Fail "Semantic worktree not found: $worktree"
}

Set-Location $worktree

Step "Confirming semantic worktree"

$currentBranch = (& git branch --show-current).Trim()
if ($currentBranch -ne $branch) {
    Fail "Expected '$branch', found '$currentBranch'."
}

$head = (& git rev-parse --short HEAD).Trim()
Ok "Branch: $branch"
Ok "HEAD:   $head"

Step "Checking which Wingman instance currently owns ports 3000 and 8787"

$listeners = @()
$listeners += Get-ListeningProcessInfo 3000
$listeners += Get-ListeningProcessInfo 8787

if ($listeners.Count -eq 0) {
    Ok "No existing Wingman listeners found"
}
else {
    foreach ($listener in $listeners) {
        Write-Host ""
        Write-Host "    Port $($listener.Port)  PID $($listener.Pid)" -ForegroundColor Yellow
        Write-Host "    $($listener.CommandLine)" -ForegroundColor DarkGray
    }

    $repoMarker = $RepoRoot.ToLowerInvariant()
    $semanticMarker = $worktree.ToLowerInvariant()

    $foreign = @(
        $listeners | Where-Object {
            $cmd = String($_.CommandLine).ToLowerInvariant()
            -not $cmd.Contains($repoMarker)
        }
    )

    if ($foreign.Count -gt 0) {
        Write-Host ""
        Write-Host "One of the required ports is owned by a process outside Wingman." -ForegroundColor Yellow
        $foreign | ForEach-Object {
            Write-Host "    Port $($_.Port), PID $($_.Pid): $($_.CommandLine)" -ForegroundColor Yellow
        }
        Fail "Refusing to stop a non-Wingman process automatically."
    }

    $semanticAlreadyRunning = @(
        $listeners | Where-Object {
            String($_.CommandLine).ToLowerInvariant().Contains($semanticMarker)
        }
    )

    if ($semanticAlreadyRunning.Count -eq $listeners.Count -and $listeners.Count -ge 2) {
        Write-Host ""
        Write-Host "The semantic worktree already appears to own the Wingman ports." -ForegroundColor Green
        Write-Host "Refresh http://127.0.0.1:3000/wingman/compare in the browser." -ForegroundColor Green
        exit 0
    }

    Step "Stopping the older Wingman dev instance"

    $pids = @($listeners | Select-Object -ExpandProperty Pid -Unique)
    foreach ($pidValue in $pids) {
        try {
            Stop-Process -Id $pidValue -Force -ErrorAction Stop
            Ok "Stopped Wingman process $pidValue"
        }
        catch {
            Write-Host "    Could not stop PID ${pidValue}: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    Start-Sleep -Seconds 2

    $remaining = @()
    $remaining += Get-ListeningProcessInfo 3000
    $remaining += Get-ListeningProcessInfo 8787

    if ($remaining.Count -gt 0) {
        Write-Host ""
        $remaining | ForEach-Object {
            Write-Host "    Port $($_.Port) still owned by PID $($_.Pid): $($_.CommandLine)" -ForegroundColor Yellow
        }
        Fail "Ports 3000/8787 are still occupied."
    }

    Ok "Ports 3000 and 8787 are free"
}

Step "Ensuring this worktree has its own dependency tree"

$localVite = Join-Path $worktree "node_modules\vite\bin\vite.js"
$localPdfWorker = Join-Path $worktree "node_modules\pdfjs-dist\legacy\build\pdf.worker.mjs"

if (-not (Test-Path -LiteralPath $localVite) -or -not (Test-Path -LiteralPath $localPdfWorker)) {
    Write-Host "    Installing worktree-local dependencies..." -ForegroundColor Gray
    npm ci --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Fail "npm ci failed."
    }
}

if (-not (Test-Path -LiteralPath $localVite)) {
    Fail "Worktree-local Vite was not installed."
}
if (-not (Test-Path -LiteralPath $localPdfWorker)) {
    Fail "Worktree-local pdfjs worker was not installed."
}

Ok "Vite and pdfjs-dist resolve inside the semantic worktree"

Step "Starting Wingman from feature/av-product-semantics"

Write-Host ""
Write-Host "IMPORTANT" -ForegroundColor Yellow
Write-Host "  The terminal will remain attached to the Wingman dev server." -ForegroundColor Gray
Write-Host "  Open/refresh: http://127.0.0.1:3000/wingman/compare" -ForegroundColor Gray
Write-Host "  Press Ctrl+C in this terminal when you want to stop it." -ForegroundColor Gray
Write-Host ""
Write-Host "  Test AT-HDDA-2 again after the server reports both services started." -ForegroundColor Cyan
Write-Host ""

npm run dev
