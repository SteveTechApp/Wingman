$ErrorActionPreference="Stop"
Set-Location C:\Users\steve\wingman

Write-Host "=== Wingman Global String Repair ===" -ForegroundColor Cyan

$files = Get-ChildItem src -Recurse -Include *.ts,*.tsx -File

$fixCount=0
$fileCount=0

foreach($f in $files){

    $txt = Get-Content $f.FullName -Raw
    $orig = $txt

    # 1. Fix (something || ")
    $txt = $txt -replace '\|\|\s*"\)', '|| "")'

    # 2. Fix useState("
    $txt = $txt -replace 'useState\("', 'useState("")'

    # 3. Fix className = "
    $txt = $txt -replace 'className\s*=\s*"\s*$', 'className=""'

    # 4. Fix JSX attr endings
    $txt = $txt -replace ':\s*"\)', ': "")'

    # 5. Fix trim/lowercase broken calls
    $txt = $txt -replace '\(\s*"\s*\)\.toLowerCase', '("").toLowerCase'
    $txt = $txt -replace '\(\s*"\s*\)\.trim', '("").trim'

    # 6. Fix return { text: "
    $txt = $txt -replace 'text:\s*"\s*}', 'text: "" }'

    # 7. Fix default string assignments
    $txt = $txt -replace '=\s*"\s*;', '= "";'

    if($txt -ne $orig){
        Copy-Item $f.FullName "$($f.FullName).bak" -Force
        [System.IO.File]::WriteAllText($f.FullName,$txt,$enc)
        $fileCount++
    }
}

Write-Host "Files repaired:" $fileCount -ForegroundColor Green
Write-Host "Backups saved as .bak"
Write-Host "Run typecheck again next."