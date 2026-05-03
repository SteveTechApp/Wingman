$ErrorActionPreference = "Stop"

Set-Location C:\Users\steve\wingman

node .\tools\wingman-ui-marker-check.mjs
node .\tools\product-intelligence-audit.mjs
npm run typecheck
npm run verify
git restore -- public\product-intelligence-index.json 2>$null

Write-Host "Wingman stabilisation checks completed." -ForegroundColor Green