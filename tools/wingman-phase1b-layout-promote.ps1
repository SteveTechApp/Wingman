param(
    [switch]$Apply
)

Set-Location C:\Users\steve\wingman

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"

$rescue = "_RESCUE\LayoutPromote_$stamp"
$report = "_AUDITS\LayoutPromote_$stamp"

New-Item -ItemType Directory -Force $rescue | Out-Null
New-Item -ItemType Directory -Force $report | Out-Null

Write-Host "`n== Phase 1B Layout Consolidation ==" -ForegroundColor Cyan
Write-Host "Mode:" ($Apply ? "APPLY" : "DRY RUN")

# -------------------------------------------------
# Files to promote
# -------------------------------------------------

$layoutFiles = @(
"Header.tsx",
"Footer.tsx",
"Logo.tsx",
"PageShell.tsx",
"MobileNavMenu.tsx",
"NavDropdown.tsx"
)

foreach($f in $layoutFiles){

$src = "src\components\layout\$f"
$dst = "src\app\layout\$f"

if(Test-Path $src){

Write-Host "Promote: $f"

if($Apply){

New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null

Copy-Item $src "$rescue\$f.components.bak" -Force
if(Test-Path $dst){
Copy-Item $dst "$rescue\$f.app.bak" -Force
}

Copy-Item $src $dst -Force
}

}
else{
Write-Host "Missing source: $src" -ForegroundColor Yellow
}

}

# -------------------------------------------------
# Rewrite imports
# -------------------------------------------------

Write-Host "`n== Rewriting layout imports =="

$files = Get-ChildItem src -Recurse -Include *.ts,*.tsx

$rewriteLog = @()

foreach($file in $files){

$text = Get-Content $file.FullName -Raw

$new = $text `
-replace "@/components/layout/Header","@/app/layout/Header" `
-replace "@/components/layout/Footer","@/app/layout/Footer" `
-replace "@/components/layout/Logo","@/app/layout/Logo" `
-replace "@/components/layout/PageShell","@/app/layout/PageShell" `
-replace "@/components/layout/MobileNavMenu","@/app/layout/MobileNavMenu" `
-replace "@/components/layout/NavDropdown","@/app/layout/NavDropdown" `
-replace "\.\./layout/Header","../app/layout/Header" `
-replace "\.\./layout/Footer","../app/layout/Footer" `
-replace "\.\./layout/Logo","../app/layout/Logo" `
-replace "\.\./layout/PageShell","../app/layout/PageShell"

if($new -ne $text){

$rewriteLog += $file.FullName

if($Apply){
Copy-Item $file.FullName "$rescue\$(Split-Path $file.FullName -Leaf).bak" -Force
Set-Content $file.FullName $new
}

}

}

$rewriteLog | Out-File "$report\rewritten-files.txt"

Write-Host "`nFiles updated:" $rewriteLog.Count

Write-Host "`nNext run:"
Write-Host "npm run typecheck"
Write-Host "npm run dev"