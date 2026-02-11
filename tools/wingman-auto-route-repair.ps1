# ================================
# Wingman FULL Route Repair Script
# HARD-LOCKED to C:\Users\steve\wingman
# ================================

$WingmanRoot = "C:\Users\steve\wingman"
$ErrorActionPreference = "Stop"

# Force correct working directory
if ((Get-Location).Path -ne $WingmanRoot) {
    Write-Host "Switching to Wingman root..."
    Set-Location $WingmanRoot
}

if (!(Test-Path "$WingmanRoot\src")) {
    throw "Wingman src folder not found at $WingmanRoot"
}

# Backup folder
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = "$WingmanRoot\tools\_routeBackup_$stamp"
New-Item $backup -ItemType Directory -Force | Out-Null

# Safe write helper (fixes your WriteAllText error permanently)
function Write-UTF8NoBOM($path, $content) {
    $dir = Split-Path $path -Parent
    if (!(Test-Path $dir)) {
        New-Item $dir -ItemType Directory -Force | Out-Null
    }
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $content, $utf8)
}

# Backup helper
function Backup-File($file) {
    if (Test-Path $file) {
        $dest = Join-Path $backup ([IO.Path]::GetFileName($file))
        Copy-Item $file $dest -Force
    }
}

Write-Host "Scanning Wingman routes..."

# Canonical route replacements
$routeMap = @{
    "/dashboard" = "/app/dashboard"
    "/projects" = "/app/projects"
    "/import" = "/app/import"
    "/toolhub" = "/app/toolhub"
    "/tools/" = "/app/tools/"
}

# Scan TS/TSX files
Get-ChildItem "$WingmanRoot\src" -Recurse -Include *.ts,*.tsx | ForEach-Object {

    $file = $_.FullName
    $txt = Get-Content $file -Raw

    $new = $txt

    foreach ($k in $routeMap.Keys) {
        $new = $new.Replace($k, $routeMap[$k])
    }

    if ($new -ne $txt) {
        Backup-File $file
        Write-UTF8NoBOM $file $new
        Write-Host "Updated: $file"
    }
}

Write-Host ""
Write-Host "Injecting redirect safety routes..."

$appRoutes = "$WingmanRoot\src\AppRoutes.tsx"

if (Test-Path $appRoutes) {

    Backup-File $appRoutes

    $txt = Get-Content $appRoutes -Raw

    if ($txt -notmatch "Wingman Auto Redirects") {

        $redirectBlock = @'

{/* Wingman Auto Redirects */}
<Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
<Route path="/projects" element={<Navigate to="/app/projects" replace />} />
<Route path="/import" element={<Navigate to="/app/import" replace />} />
<Route path="/toolhub" element={<Navigate to="/app/toolhub" replace />} />
<Route path="/tools/*" element={<Navigate to="/app/toolhub" replace />} />

'@

        $txt = $txt -replace "<Routes>", "<Routes>`r`n$redirectBlock"

        Write-UTF8NoBOM $appRoutes $txt
        Write-Host "Redirects added to AppRoutes.tsx"
    }
}

Write-Host ""
Write-Host "✔ Wingman route repair complete"
Write-Host "Backup created at:"
Write-Host $backup
