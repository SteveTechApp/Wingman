param(
    [string]$RepoRoot = (Get-Location).Path,
    [switch]$Apply,
    [switch]$IncludeReports
)
$ErrorActionPreference = "Stop"
function Step([string]$Text){Write-Host "";Write-Host "============================================================" -ForegroundColor DarkCyan;Write-Host $Text -ForegroundColor Cyan;Write-Host "============================================================" -ForegroundColor DarkCyan}
function Get-DirSizeBytes([string]$Path){if(-not(Test-Path -LiteralPath $Path)){return 0L};$sum=0L;Get-ChildItem -LiteralPath $Path -Recurse -Force -File -ErrorAction SilentlyContinue|ForEach-Object{$sum+=$_.Length};return $sum}
function Format-MB([long]$Bytes){[math]::Round($Bytes/1MB,2)}
$RepoRoot=(Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location -LiteralPath $RepoRoot
if(-not(Test-Path -LiteralPath (Join-Path $RepoRoot "package.json"))){throw "package.json not found."}
Step "1. Safety checks"
$branch=(& git branch --show-current 2>$null)
if(-not $branch){throw "Could not determine current Git branch."}
Write-Host "Repository: $RepoRoot";Write-Host "Branch:     $branch"
$status=(& git status --short)
if($status){Write-Host "";Write-Host "Current working tree has changes:" -ForegroundColor Yellow;$status|ForEach-Object{Write-Host "  $_"}}
Step "2. Building cleanup plan"
$targets=@()
foreach($rel in @("archive","backups",".wingman-backups","_backups")){
    $full=Join-Path $RepoRoot $rel
    if(Test-Path -LiteralPath $full){$targets+=[pscustomobject]@{Type="Directory";Path=$full;Relative=$rel;Bytes=Get-DirSizeBytes $full;Reason="Repository backup/archive area"}}
}
$wmWorkBackups=Join-Path $RepoRoot ".wingman-work\backups"
if(Test-Path -LiteralPath $wmWorkBackups){$targets+=[pscustomobject]@{Type="Directory";Path=$wmWorkBackups;Relative=".wingman-work\backups";Bytes=Get-DirSizeBytes $wmWorkBackups;Reason="Wingman work snapshots"}}
$backupFiles=Get-ChildItem -LiteralPath $RepoRoot -Recurse -Force -File -ErrorAction SilentlyContinue|Where-Object{
    $_.FullName -notmatch '[\\/]node_modules[\\/]' -and $_.FullName -notmatch '[\\/]\.git[\\/]' -and ($_.Name -match '\.\d{8}-\d{6}\.bak$' -or $_.Name -match '\.bak$' -or $_.Name -match '\.old$' -or $_.Name -match '\.orig$')
}
foreach($f in $backupFiles){
    $covered=$false
    foreach($t in $targets){if($t.Type -eq "Directory" -and $f.FullName.StartsWith($t.Path,[System.StringComparison]::OrdinalIgnoreCase)){$covered=$true;break}}
    if(-not $covered){$targets+=[pscustomobject]@{Type="File";Path=$f.FullName;Relative=$f.FullName.Substring($RepoRoot.Length).TrimStart('\','/');Bytes=$f.Length;Reason="Backup file"}}
}
if($IncludeReports){
    $reports=Join-Path $RepoRoot "reports"
    if(Test-Path -LiteralPath $reports){$targets+=[pscustomobject]@{Type="Directory";Path=$reports;Relative="reports";Bytes=Get-DirSizeBytes $reports;Reason="Generated reports (explicitly included)"}}
}
$targets=$targets|Sort-Object Relative -Unique
$totalBytes=0L;foreach($t in $targets){$totalBytes+=[long]$t.Bytes}
Write-Host "";Write-Host "Planned removals:" -ForegroundColor Cyan
foreach($t in $targets){("{0,-10} {1,10} MB  {2}" -f $t.Type,(Format-MB $t.Bytes),$t.Relative)|Write-Host}
Write-Host "";Write-Host ("Total reclaimable: {0} MB ({1} GB)" -f (Format-MB $totalBytes),[math]::Round($totalBytes/1GB,2)) -ForegroundColor Green
Step "3. Writing cleanup manifest"
$manifestDir=Join-Path $RepoRoot "docs\repo-audit";New-Item -ItemType Directory -Path $manifestDir -Force|Out-Null
$manifest=Join-Path $manifestDir ("cleanup-manifest-"+(Get-Date -Format "yyyyMMdd-HHmmss")+".csv")
$targets|Select-Object Type,Relative,Bytes,Reason|Export-Csv -LiteralPath $manifest -NoTypeInformation -Encoding UTF8
Write-Host "Manifest: $manifest"
if(-not $Apply){
    Step "4. DRY RUN complete"
    Write-Host "Nothing was deleted." -ForegroundColor Green
    Write-Host "Run again with -Apply to perform the cleanup."
    Write-Host "reports is NOT removed by default; use -IncludeReports only if you explicitly want that."
    exit 0
}
Step "4. Applying cleanup"
foreach($t in $targets){
    if(-not(Test-Path -LiteralPath $t.Path)){continue}
    Write-Host "Removing $($t.Relative)..." -ForegroundColor Yellow
    if($t.Type -eq "Directory"){Remove-Item -LiteralPath $t.Path -Recurse -Force}else{Remove-Item -LiteralPath $t.Path -Force}
}
Step "5. Verifying repository"
& git status --short
& npm run typecheck
if($LASTEXITCODE -ne 0){throw "Typecheck failed after cleanup."}
& npm run build
if($LASTEXITCODE -ne 0){throw "Build failed after cleanup."}
Step "6. Complete"
Write-Host ("Removed approximately {0} GB of backup/archive material." -f [math]::Round($totalBytes/1GB,2)) -ForegroundColor Green
Write-Host "Typecheck and build passed."
