param(
    [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function Step([string]$Text) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkCyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor DarkCyan
}

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location -LiteralPath $RepoRoot

$outDir = Join-Path $RepoRoot "docs\repo-audit"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$out = Join-Path $outDir "videowall-card-diagnostic.txt"

Step "1. Searching source for Videowall Builder"

$patterns = @(
    "Videowall Builder",
    'art:\s*"videowall"',
    'kind\s*===\s*"videowall"',
    "wm-polish-card-art",
    "wm-hub-art-videowall"
)

$lines = New-Object System.Collections.Generic.List[string]

foreach ($pattern in $patterns) {
    $lines.Add("")
    $lines.Add("### PATTERN: $pattern")

    $matches = Get-ChildItem -LiteralPath (Join-Path $RepoRoot "src") -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { @(".ts",".tsx",".js",".jsx",".css") -contains $_.Extension.ToLowerInvariant() } |
        Select-String -Pattern $pattern -AllMatches -ErrorAction SilentlyContinue

    if (-not $matches) {
        $lines.Add("NO MATCHES")
        continue
    }

    foreach ($m in $matches) {
        $rel = $m.Path.Substring($RepoRoot.Length).TrimStart('\','/')
        $lines.Add(("{0}:{1}: {2}" -f $rel, $m.LineNumber, $m.Line.Trim()))
    }
}

Step "2. Capturing relevant HubCardArt source"

$artPath = Join-Path $RepoRoot "src\wingman2\components\HubCardArt.tsx"
if (Test-Path -LiteralPath $artPath) {
    $text = [System.IO.File]::ReadAllText($artPath)
    $m = [regex]::Match($text, '(?s)if\s*\(\s*kind\s*===\s*"videowall"\s*\).*?(?=\n\s*if\s*\(\s*kind\s*===|\n\s*return\s*\()')
    $lines.Add("")
    $lines.Add("### CURRENT VIDEOWALL BLOCK")
    if ($m.Success) {
        $lines.Add($m.Value)
    } else {
        $lines.Add("Could not isolate block.")
    }
}

Step "3. Checking whether old CSS override blocks exist"

$cssPath = Join-Path $RepoRoot "src\wingman2\styles\wingman-style-stack.css"
if (Test-Path -LiteralPath $cssPath) {
    $cssText = [System.IO.File]::ReadAllText($cssPath)
    $lines.Add("")
    $lines.Add("### CSS MARKERS")
    foreach ($marker in @(
        "WINGMAN VIDEOWALL HUB ART - LIGHTWEIGHT",
        "wm-hub-art-videowall"
    )) {
        $count = ([regex]::Matches($cssText, [regex]::Escape($marker))).Count
        $lines.Add("$marker = $count")
    }
}

Step "4. Writing diagnostic"

[System.IO.File]::WriteAllLines($out, $lines, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Diagnostic written to:" -ForegroundColor Green
Write-Host "  $out" -ForegroundColor Cyan
Write-Host ""
Write-Host "Paste the contents here. This will tell us exactly which local component and CSS are rendering the heavy rectangle."
