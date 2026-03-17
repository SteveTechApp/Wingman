Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Convert-FromCp1252Utf8IfNeeded {
  param(
    [Parameter(Mandatory = $true)][string]$Text
  )

  $markers = @([char]0x00C2, [char]0x00C3, [char]0x00E2)
  $needsRepair = $false
  foreach ($marker in $markers) {
    if ($Text.Contains([string]$marker)) {
      $needsRepair = $true
      break
    }
  }

  if (-not $needsRepair) {
    return $Text
  }

  $cp1252 = [System.Text.Encoding]::GetEncoding(1252)
  $utf8 = [System.Text.Encoding]::UTF8
  $current = $Text

  for ($i = 0; $i -lt 2; $i++) {
    $candidate = $utf8.GetString($cp1252.GetBytes($current))
    if ($candidate -eq $current) {
      break
    }

    $currentNoise = ([regex]::Matches($current, '[\uFFFD\u00C2\u00C3\u00E2]')).Count
    $candidateNoise = ([regex]::Matches($candidate, '[\uFFFD\u00C2\u00C3\u00E2]')).Count
    if ($candidateNoise -gt $currentNoise) {
      break
    }

    $current = $candidate
  }

  return $current
}

$file = "C:\Users\steve\wingman\src\data\templates\templates.seed.json"
if (-not (Test-Path $file)) {
  throw "File not found: $file"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "C:\Users\steve\wingman\_RESCUE"
if (-not (Test-Path $backupDir)) {
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
}
$backup = Join-Path $backupDir "templates.seed.$stamp.bak.json"
Copy-Item $file $backup -Force

$t = [System.IO.File]::ReadAllText($file)
$t = Convert-FromCp1252Utf8IfNeeded -Text $t

# Normalize the broken separator token that currently appears as U+FFFD + '?,???o'.
$t = [regex]::Replace($t, '\uFFFD\?,\?\?\?o', '-')

# Clean up the half-fixed displayName values created by earlier repair attempts.
$t = [regex]::Replace(
  $t,
  '("displayName"\s*:\s*"(?:Bronze|Silver|Gold))\s*-\s*o\s+',
  '$1 - '
)

# Normalize smart punctuation to ASCII so the seed stays shell-safe.
$asciiPunctuation = @(
  @{ Source = [string][char]0x2022; Target = '-' },
  @{ Source = [string][char]0x2013; Target = '-' },
  @{ Source = [string][char]0x2014; Target = '-' },
  @{ Source = [string][char]0x2018; Target = "'" },
  @{ Source = [string][char]0x2019; Target = "'" },
  @{ Source = [string][char]0x201C; Target = '"' },
  @{ Source = [string][char]0x201D; Target = '"' },
  @{ Source = [string][char]0x00A0; Target = ' ' },
  @{ Source = [string][char]0x00C2; Target = '' }
)

foreach ($rule in $asciiPunctuation) {
  $t = $t.Replace($rule.Source, $rule.Target)
}

Save-Utf8NoBom -Path $file -Content $t

Write-Host ""
Write-Host "Patched file:" -ForegroundColor Green
Write-Host $file
Write-Host ""
Write-Host "Backup file:" -ForegroundColor Yellow
Write-Host $backup
Write-Host ""
Write-Host "Check result:" -ForegroundColor Cyan

Get-Content $file | Select-String -Pattern '"displayName"\s*:'
