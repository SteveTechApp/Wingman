$ErrorActionPreference = "Stop"

$Root = "C:\Users\steve\wingman"
if (!(Test-Path "$Root\package.json")) { throw "Not in Wingman root: $Root" }
Set-Location $Root

function Write-Utf8($path, $text) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $text, $enc)
}

function Run($cmd) {
  cmd /c $cmd 2>&1 | Out-String
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportDir = Join-Path $Root ("_AUDITS\Wingman_Audit_" + $stamp)
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

# env
$envTxt = ""
$envTxt += "PWD: " + (Get-Location).Path + "`r`n"
$envTxt += "node: " + (Run "node -v")
$envTxt += "npm: "  + (Run "npm -v")
$envTxt += "git: "  + (Run "git --version")
Write-Utf8 (Join-Path $reportDir "env.txt") $envTxt

# git
$gitTxt  = Run "git branch --show-current"
$gitTxt += Run "git status --porcelain"
$gitTxt += Run "git log -1 --oneline --decorate"
Write-Utf8 (Join-Path $reportDir "git.txt") $gitTxt

# pages
$pages = Get-ChildItem (Join-Path $Root "src\pages") -File -Filter *.tsx -ErrorAction SilentlyContinue |
  Sort-Object Name |
  ForEach-Object { $_.FullName.Substring($Root.Length+1) }
Write-Utf8 (Join-Path $reportDir "pages.txt") (($pages) -join "`r`n")

# routes (simple extract)
$routesFile = Join-Path $Root "src\AppRoutes.tsx"
if (!(Test-Path $routesFile)) { throw "Missing: src\AppRoutes.tsx" }
$routesSrc = Get-Content $routesFile -Raw
$rx = [regex]'path\s*=\s*(?:"([^"]+)"|\x27([^\x27]+)\x27|\{\s*"([^"]+)"\s*\}|\{\s*\x27([^\x27]+)\x27\s*\})'
$found = @()
foreach ($m in $rx.Matches($routesSrc)) {
  $p = @($m.Groups[1].Value,$m.Groups[2].Value,$m.Groups[3].Value,$m.Groups[4].Value) | Where-Object { $_ } | Select-Object -First 1
  if ($p) { $found += $p.Trim() }
}
$found = $found | Sort-Object -Unique
Write-Utf8 (Join-Path $reportDir "routes.txt") (($found) -join "`r`n")

# build readiness
$buildTxt  = "== npm ci ==`r`n" + (Run "npm ci")
$buildTxt += "`r`n== npm run typecheck ==`r`n" + (Run "npm run -s typecheck")
$buildTxt += "`r`n== npm run build ==`r`n" + (Run "npm run -s build")
Write-Utf8 (Join-Path $reportDir "build.txt") $buildTxt

Write-Utf8 (Join-Path $reportDir "SUMMARY.txt") ("Report: " + $reportDir + "`r`n")
Write-Host "DONE. Open: $reportDir"