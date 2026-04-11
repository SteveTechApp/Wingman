Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

Get-ChildItem .\src -Recurse -File -Filter *Page.tsx |
  Where-Object { $_.FullName -notmatch "\\node_modules\\|\\dist\\|\\_RESCUE\\|\\_WORK\\|\\_QUARANTINE\\" } |
  ForEach-Object {
    $raw = Get-Content -LiteralPath $_.FullName -Raw

    [PSCustomObject]@{
      Page      = $_.FullName.Replace((Get-Location).Path + "\", "")
      UsesFrame = [bool]($raw -match "WingmanPageFrame")
      UsesSection = [bool]($raw -match "WingmanPageSection")
    }
  } |
  Sort-Object UsesFrame, Page |
  Format-Table -AutoSize