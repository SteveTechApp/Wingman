$ErrorActionPreference = "Stop"
Set-Location "C:\Users\steve\wingman"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Backup-File {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (Test-Path $Path) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item $Path "$Path.bak.$stamp" -Force
  }
}

function Add-PropertyAfter {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string]$AnchorPattern,
    [Parameter(Mandatory = $true)][string]$PropertyLine
  )

  if ($Text.Contains($PropertyLine.Trim())) { return $Text }

  return [regex]::Replace(
    $Text,
    $AnchorPattern,
    ('$0' + [Environment]::NewLine + $PropertyLine),
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

$publicLandingPath = "C:\Users\steve\wingman\src\pages\PublicLandingPage.tsx"
$appShellPath      = "C:\Users\steve\wingman\src\app\shell\AppShell.tsx"
$topBarPath        = "C:\Users\steve\wingman\src\app\navigation\TopBar.tsx"

Backup-File $publicLandingPath
Backup-File $appShellPath
Backup-File $topBarPath

# ------------------------------------------------------------
# PublicLandingPage.tsx
# ------------------------------------------------------------
if (Test-Path $publicLandingPath) {
  $t = Get-Content $publicLandingPath -Raw

  $t = [regex]::Replace(
    $t,
    'minHeight:\s*"100vh",\s*',
    '',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  $t = [regex]::Replace(
    $t,
    'height:\s*"100vh",\s*overflow:\s*"hidden",',
    'height: "100vh",' + [Environment]::NewLine +
    '        overflow: "hidden",' + [Environment]::NewLine +
    '        maxHeight: "100vh",',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  $t = [regex]::Replace(
    $t,
    '(<main\s+style=\{\{.*?height:\s*"100%",\s*)',
    '$1maxHeight: "100vh",' + [Environment]::NewLine +
    '          overflow: "hidden",' + [Environment]::NewLine,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  $t = [regex]::Replace(
    $t,
    'height:\s*"min\(840px,\s*calc\(100vh\s*-\s*40px\)\)",',
    'height: "100%",' + [Environment]::NewLine +
    '            maxHeight: "100%",',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  $t = [regex]::Replace($t, 'padding:\s*"32px\s+34px"', 'padding: "24px 26px"')
  $t = [regex]::Replace($t, 'gap:\s*18,', 'gap: 14,')
  $t = [regex]::Replace($t, 'padding:\s*"24px"', 'padding: "20px"')
  $t = [regex]::Replace($t, 'padding:\s*"18px\s+18px\s+16px"', 'padding: "14px 14px 12px"')
  $t = [regex]::Replace($t, 'padding:\s*"16px"', 'padding: "12px"')

  Save-Utf8NoBom -Path $publicLandingPath -Content $t
  Write-Host "Patched PublicLandingPage.tsx"
}
else {
  Write-Warning "PublicLandingPage.tsx not found."
}

# ------------------------------------------------------------
# AppShell.tsx
# ------------------------------------------------------------
if (Test-Path $appShellPath) {
  $t = Get-Content $appShellPath -Raw

  $t = [regex]::Replace(
    $t,
    'height:\s*"100vh",',
    'height: "100vh",' + [Environment]::NewLine +
    '        maxHeight: "100vh",',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  if ($t -notmatch 'minHeight:\s*0') {
    $t = Add-PropertyAfter -Text $t -AnchorPattern 'overflow:\s*"hidden",' -PropertyLine '        minHeight: 0,'
  }

  if ($t -notmatch 'maxHeight:\s*"100vh"') {
    $t = Add-PropertyAfter -Text $t -AnchorPattern 'height:\s*"100vh",' -PropertyLine '        maxHeight: "100vh",'
  }

  if ($t -notmatch 'className="wm-shell-content"') {
    $t = [regex]::Replace(
      $t,
      '<TopBar\s*/>\s*<div\s+style=\{\{',
      '<TopBar />' + [Environment]::NewLine +
      '<div className="wm-shell-content" style={{',
      [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
  }

  if ($t -match 'className="wm-shell-content"\s+style=\{\{') {
    if ($t -notmatch 'className="wm-shell-content"\s+style=\{\{[^}]*minHeight:\s*0,') {
      $t = [regex]::Replace(
        $t,
        '(className="wm-shell-content"\s+style=\{\{)',
        '$1' + [Environment]::NewLine +
        '        flex: 1,' + [Environment]::NewLine +
        '        minHeight: 0,' + [Environment]::NewLine +
        '        minWidth: 0,' + [Environment]::NewLine +
        '        overflow: "hidden",' + [Environment]::NewLine,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
      )
    }
  }
  else {
    $t = [regex]::Replace(
      $t,
      '(<TopBar\s*/>\s*)',
      '$1' + [Environment]::NewLine +
      '<div className="wm-shell-content" style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden", display: "flex", width: "100%" }}>' + [Environment]::NewLine,
      [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    $t = [regex]::Replace(
      $t,
      '(\s*<Outlet\s*/>\s*)(</div>\s*</div>\s*$)',
      '$1' + [Environment]::NewLine + '</div>$2',
      [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
  }

  Save-Utf8NoBom -Path $appShellPath -Content $t
  Write-Host "Patched AppShell.tsx"
}
else {
  Write-Warning "AppShell.tsx not found."
}

# ------------------------------------------------------------
# TopBar.tsx
# ------------------------------------------------------------
if (Test-Path $topBarPath) {
  $t = Get-Content $topBarPath -Raw

  if ($t -match 'style=\{\{') {
    if ($t -notmatch 'flex:\s*"0 0 auto"') {
      $t = [regex]::Replace(
        $t,
        '(style=\{\{)',
        '$1' + [Environment]::NewLine +
        '        flex: "0 0 auto",' + [Environment]::NewLine +
        '        minHeight: 76,' + [Environment]::NewLine +
        '        overflow: "hidden",' + [Environment]::NewLine,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
      )
    }

    $t = [regex]::Replace(
      $t,
      'height:\s*([0-9]+|"[^"]+"),',
      'minHeight: $1,',
      [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
  }
  elseif ($t -match 'className="[^"]*topbar[^"]*"') {
    $t = [regex]::Replace(
      $t,
      '(className="[^"]*topbar[^"]*")',
      '$1 style={{ flex: "0 0 auto", minHeight: 76, overflow: "hidden" }}',
      [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
  }

  Save-Utf8NoBom -Path $topBarPath -Content $t
  Write-Host "Patched TopBar.tsx"
}
else {
  Write-Warning "TopBar.tsx not found."
}

Write-Host ""
Write-Host "Done."
Write-Host "Run:"
Write-Host "npm run typecheck"
Write-Host "npm run dev"