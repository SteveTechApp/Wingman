$ErrorActionPreference = "Stop"

$target = ".\src\wingman2\components\discovery\SourceDeviceCollator.tsx"

if (-not (Test-Path $target)) {
    throw "Cannot find SourceDeviceCollator.tsx at: $target"
}

$resolvedTarget = (Resolve-Path $target).Path
$backupDir = ".\_backups\source-device-collator-corruption-fix-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$backupPath = Join-Path $backupDir "SourceDeviceCollator.tsx"
Copy-Item $resolvedTarget $backupPath -Force

$tempPath = "$resolvedTarget.cleaning"

if (Test-Path $tempPath) {
    Remove-Item $tempPath -Force
}

$readEncoding = [System.Text.Encoding]::UTF8
$writeEncoding = New-Object System.Text.UTF8Encoding($false)

$reader = $null
$writer = $null
$lineNumber = 0
$replaced = New-Object System.Collections.Generic.List[int]

try {
    $reader = [System.IO.StreamReader]::new($resolvedTarget, $readEncoding, $true, 1048576)
    $writer = [System.IO.StreamWriter]::new($tempPath, $false, $writeEncoding, 1048576)

    while ($true) {
        $line = $reader.ReadLine()

        if ($null -eq $line) {
            break
        }

        $lineNumber++
        $replacement = $line

        if ($lineNumber -eq 2404) {
            $replacement = '            <p>Describe the schematic line: source location to connection method to destination. This keeps the signal flow clear enough for review and proposal hand-off.</p>'
            $replaced.Add($lineNumber)
        }

        if ($lineNumber -eq 2452) {
            $replacement = '                    <b>Signal path:</b>'
            $replaced.Add($lineNumber)
        }

        if ($lineNumber -eq 2457) {
            $replacement = '                    <b>Design note:</b>'
            $replaced.Add($lineNumber)
        }

        if ($lineNumber -eq 2569) {
            $replacement = '            <span>Room: {optionLabel(roomSizes, brief.roomSize)} / Outputs: {outputs.length} / Source paths: {sourcePaths.length}</span>'
            $replaced.Add($lineNumber)
        }

        $writer.WriteLine($replacement)
    }
}
finally {
    if ($null -ne $writer) {
        $writer.Close()
        $writer.Dispose()
    }

    if ($null -ne $reader) {
        $reader.Close()
        $reader.Dispose()
    }
}

if (-not (Test-Path $tempPath)) {
    throw "The cleaned temp file was not created. Original file was not changed."
}

Move-Item $tempPath $resolvedTarget -Force

Write-Host ""
Write-Host "Backed up original file to:" -ForegroundColor Yellow
Write-Host $backupPath -ForegroundColor Yellow

Write-Host ""
Write-Host "Replaced corrupted lines:" -ForegroundColor Green
Write-Host ($replaced -join ", ") -ForegroundColor Green

Write-Host ""
Write-Host "New file size:" -ForegroundColor Cyan
Get-Item $resolvedTarget | Select-Object FullName, Length, LastWriteTime | Format-List

Write-Host ""
Write-Host "Checking remaining oversized lines..." -ForegroundColor Cyan

$lineNumber = 0
$oversized = Get-Content $resolvedTarget | ForEach-Object {
    $lineNumber++

    if ($_.Length -gt 1000) {
        [PSCustomObject]@{
            Line = $lineNumber
            Length = $_.Length
            Preview = $_.Substring(0, [Math]::Min($_.Length, 180))
        }
    }
}

if ($oversized) {
    $oversized | Sort-Object Length -Descending | Format-Table -Wrap
}

if (-not $oversized) {
    Write-Host "No oversized lines found." -ForegroundColor Green
}
