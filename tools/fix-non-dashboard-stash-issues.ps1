$ErrorActionPreference = "Stop"

Write-Host "==> Fix non-dashboard stash review issues"

$Root = (Get-Location).Path
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-Text($Path) {
  if (!(Test-Path $Path)) {
    throw "Missing file: $Path"
  }

  return [System.IO.File]::ReadAllText((Resolve-Path $Path))
}

function Write-Text($Path, $Text) {
  [System.IO.File]::WriteAllText((Resolve-Path $Path), $Text, $Utf8NoBom)
}

function Replace-Required($Path, $Find, $Replace, $Label) {
  $Text = Read-Text $Path

  if ($Text.Contains($Replace)) {
    Write-Host "Already patched: $Label"
    return
  }

  if (!$Text.Contains($Find)) {
    throw "Could not find expected block for: $Label in $Path"
  }

  $Text = $Text.Replace($Find, $Replace)
  Write-Text $Path $Text
  Write-Host "Patched: $Label"
}

function Regex-Replace-Required($Path, $Pattern, $Replace, $Label) {
  $Text = Read-Text $Path
  $NewText = [System.Text.RegularExpressions.Regex]::Replace($Text, $Pattern, $Replace)

  if ($NewText -eq $Text) {
    Write-Host "No regex change made: $Label"
    return
  }

  Write-Text $Path $NewText
  Write-Host "Patched: $Label"
}

$TouchedFiles = @(
  "server/server/agents/prompts/guruPrompt.mjs",
  "src/__tests__/productPitchWorkflowRendered.test.tsx",
  "src/wingman2/components/CompareAutoIdentifyPanel.tsx",
  "src/wingman2/components/workflow/ProductStoryLanguageEnhancer.tsx",
  "src/wingman2/lib/compareAutoIdentify.ts",
  "src/wingman2/lib/productPitchGuidance.ts",
  "src/wingman2/pages/ComparePageNew.tsx",
  "src/wingman2/pages/ProductCallCardsPage.tsx",
  "src/wingman2/pages/ProductPitchPage.tsx",
  "src/wingman2/pages/productCallCards/ProductCallCardsProductPage.tsx",
  "src/wingman2/pages/productCallCards/ProductCallCardsResponsePage.tsx"
)

Write-Host "==> 1. Keep full Product Pitch discovery guidance"

$GuidancePath = "src/wingman2/lib/productPitchGuidance.ts"
$Text = Read-Text $GuidancePath
$Pattern = '(?s)(const discoveryQuestions = safeList\(\[\s*.*?\],\s*)1(\s*\);)'
$NewText = [System.Text.RegularExpressions.Regex]::Replace($Text, $Pattern, '${1}8${2}', 1)

if ($NewText -eq $Text) {
  Write-Host "No change made to discovery question limit. It may already be patched."
} else {
  Write-Text $GuidancePath $NewText
  Write-Host "Patched discoveryQuestions limit back to 8"
}

Write-Host "==> 2. Fix Product Pitch tests so they check retained guidance depth"

$TestPath = "src/__tests__/productPitchWorkflowRendered.test.tsx"
$Text = Read-Text $TestPath

$Text = $Text.Replace(
  "expect(ucGuidance.discoveryQuestions).toHaveLength(1);",
  "expect(ucGuidance.discoveryQuestions.length).toBeGreaterThanOrEqual(5);"
)

$Text = $Text.Replace(
  "expect(guidance.discoveryQuestions).toHaveLength(1);",
  "expect(guidance.discoveryQuestions.length).toBeGreaterThanOrEqual(5);"
)

Write-Text $TestPath $Text
Write-Host "Patched Product Pitch rendered workflow test expectations"

Write-Host "==> 3. Keep more detail available in Product Pitch UI details"

$PitchPagePath = "src/wingman2/pages/ProductPitchPage.tsx"
$Text = Read-Text $PitchPagePath

$Text = $Text.Replace(
  '<DisplayList items={guidance.discoveryQuestions} max={1} />',
  '<DisplayList items={guidance.discoveryQuestions} max={6} />'
)

Write-Text $PitchPagePath $Text
Write-Host "Patched Product Pitch detail drawer to show richer discovery questions"

Write-Host "==> 4. Fix Compare grammar and restore visible competitor detail"

$ComparePanelPath = "src/wingman2/components/CompareAutoIdentifyPanel.tsx"
$Text = Read-Text $ComparePanelPath

if ($Text -notmatch "function articleForProductType") {
  $InsertAfter = @'
function applicationUse(result: CompareAutoIdentifyResult, application: string): string {
'@

  $ArticleFunction = @'
function articleForProductType(productType: string): "a" | "an" {
  const value = productType.trim();

  if (/^(?:uc|usb|uhd|hdmi|hdbaset|ndii?)\b/i.test(value)) {
    return "a";
  }

  return /^[aeiou]/i.test(value) ? "an" : "a";
}

function applicationUse(result: CompareAutoIdentifyResult, application: string): string {
'@

  $Text = $Text.Replace($InsertAfter, $ArticleFunction)
}

$Text = $Text.Replace(
  'const article = /^[aeiou]/i.test(productType) ? "an" : "a";',
  'const article = articleForProductType(productType);'
)

$OldCompetitorBlock = @'
              <h3>What it does</h3>
              <p>{result.competitorSummary.purpose}</p>
              <p><strong>Product type:</strong> {result.competitorSummary.productType}</p>
'@

$NewCompetitorBlock = @'
              <h3>What it does</h3>
              <p>{result.competitorSummary.purpose}</p>

              <dl>
                <div>
                  <dt>Brand</dt>
                  <dd>{result.competitorSummary.manufacturer}</dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>{result.competitorSummary.model}</dd>
                </div>
                <div>
                  <dt>Product type</dt>
                  <dd>{result.competitorSummary.productType}</dd>
                </div>
              </dl>

              <h3>Key technical points</h3>
              <ul>
                {result.competitorSummary.keyTechnicalPoints.slice(0, 3).map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
'@

if ($Text.Contains($OldCompetitorBlock)) {
  $Text = $Text.Replace($OldCompetitorBlock, $NewCompetitorBlock)
} else {
  Write-Host "Competitor visible detail block not found or already patched"
}

Write-Text $ComparePanelPath $Text
Write-Host "Patched Compare visible detail and article grammar"

Write-Host "==> 5. Restore richer auto-identify plain-English summary"

$CompareLibPath = "src/wingman2/lib/compareAutoIdentify.ts"
$Text = Read-Text $CompareLibPath

$OldSummary = @'
  return [
    detection,
    match.candidates.length > 0 ? `Closest WyreStorm direction: ${match.candidates.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
'@

$NewSummary = @'
  return [
    detection,
    `Product type: ${competitor.productType}.`,
    `Purpose: ${competitor.purpose}`,
    `WyreStorm comparison lane: ${match.lane}.`,
    match.candidates.length > 0 ? `Closest WyreStorm direction: ${match.candidates.join(", ")}.` : "",
    match.warnings.length > 0 ? `Warning: ${match.warnings[0]}` : "",
  ]
    .filter(Boolean)
    .join(" ");
'@

if ($Text.Contains($OldSummary)) {
  $Text = $Text.Replace($OldSummary, $NewSummary)
} else {
  Write-Host "Auto-identify summary block not found or already patched"
}

Write-Text $CompareLibPath $Text
Write-Host "Patched auto-identify summary detail"

Write-Host "==> 6. Restore amplifier examples inside Product Call Cards details and remove marker-only comment"

$CallCardsPath = "src/wingman2/pages/ProductCallCardsPage.tsx"
$Text = Read-Text $CallCardsPath

$MarkerPattern = '(?s)\r?\n/\*\s*\* Product-positioning audit markers retained.*?Create response wording\s*\*/\s*$'
$Text = [System.Text.RegularExpressions.Regex]::Replace($Text, $MarkerPattern, "`r`n")

$ConfirmBlock = @'
                  <p className="wm-pcc-response-subhead wm-ui-copy">Confirm this</p>
                  <p className="wm-pcc-response-copy wm-ui-copy">
                    {renderWithGuruLinks(selectedProduct.questions[0] || productChecks[0], selectedProduct)}
                  </p>
'@

$AmplifierBlock = @'
                  <p className="wm-pcc-response-subhead wm-ui-copy">Confirm this</p>
                  <p className="wm-pcc-response-copy wm-ui-copy">
                    {renderWithGuruLinks(selectedProduct.questions[0] || productChecks[0], selectedProduct)}
                  </p>

                  {(selectedProduct.sku.toUpperCase().startsWith("AMP-") ||
                    `${selectedProduct.family} ${selectedProduct.category}`.toLowerCase().includes("audio") ||
                    `${selectedProduct.family} ${selectedProduct.category}`.toLowerCase().includes("amplifier")) && (
                    <details className="wm-pcc-response-list wm-ui-card">
                      <summary className="wm-pcc-response-subhead wm-ui-copy">Example system shapes</summary>
                      <div className="wm-pcc-example-grid">
                        {[
                          {
                            title: "100V / High Z distributed speaker zone",
                            body:
                              "One amplifier channel can feed several 100V ceiling or wall speakers across a zone. Each speaker is set to a wattage tap, for example 3W, 6W or 10W. Add the taps together and leave amplifier headroom. This suits background audio, classrooms, corridors, retail areas and larger distributed zones.",
                          },
                          {
                            title: "Low impedance stereo room",
                            body:
                              "Two amplifier channels can drive left and right low-impedance speakers, typically 4 ohm or 8 ohm. This suits a local room where stereo playback, clearer music reproduction or a pair of front speakers is required. Check speaker impedance, cable run, channel load and amplifier power per channel.",
                          },
                        ].map((example) => (
                          <article key={example.title} className="wm-pcc-example-card wm-ui-card wm-ui-title">
                            <h4 className="wm-pcc-example-title wm-ui-title">{example.title}</h4>
                            <p className="wm-pcc-example-body wm-ui-copy">
                              {renderWithGuruLinks(example.body, selectedProduct)}
                            </p>
                          </article>
                        ))}
                      </div>
                    </details>
                  )}
'@

if ($Text.Contains($ConfirmBlock) -and $Text -notmatch "100V / High Z distributed speaker zone") {
  $Text = $Text.Replace($ConfirmBlock, $AmplifierBlock)
} else {
  Write-Host "Amplifier example block not inserted. It may already exist or the target block changed."
}

Write-Text $CallCardsPath $Text
Write-Host "Patched Product Call Cards amplifier examples and marker-only comment"

Write-Host "==> 7. Restore useful quote checks in Product Call Cards response output"

$ResponsePath = "src/wingman2/pages/productCallCards/ProductCallCardsResponsePage.tsx"
$Text = Read-Text $ResponsePath

$OldGeneratedTail = @'
Confirm this:
I'm treating this as ${environment}. Can you confirm ${confirmation}?`;
'@

$NewGeneratedTail = @'
Confirm this:
I'm treating this as ${environment}. Can you confirm ${confirmation}?

Check before recommending:
${product.checks.slice(0, 4).map((item) => `- ${item}`).join("\n")}

Useful follow-up:
${product.followUp}`;
'@

if ($Text.Contains($OldGeneratedTail)) {
  $Text = $Text.Replace($OldGeneratedTail, $NewGeneratedTail)
} else {
  Write-Host "Generated response tail not found or already patched"
}

Write-Text $ResponsePath $Text
Write-Host "Patched response output detail"

Write-Host "==> 8. Soften Guru prompt rigidity"

$GuruPath = "server/server/agents/prompts/guruPrompt.mjs"
$Text = Read-Text $GuruPath

$Text = $Text.Replace(
  "- Do not provide a reasoning section, a qualification checklist or a list of next actions.",
  "- Do not provide a reasoning section. Keep qualification checks short and tied to the quote or technical decision."
)

$Text = $Text.Replace(
  "- Do not ask several questions at once.",
  "- Ask one main confirmation question first. Add further checks only when they are needed for quoting or technical fit."
)

Write-Text $GuruPath $Text
Write-Host "Patched Guru prompt rigidity"

Write-Host "==> 9. Clean common mojibake in touched files"

# ASCII-safe mojibake cleanup.
# Do not paste mojibake characters directly into this script.
# Build problematic sequences from Unicode code points so PowerShell can parse reliably.

$MojibakeReplacements = New-Object "System.Collections.Generic.Dictionary[string,string]"

# Common UTF-8/Windows-1252 artefacts seen in repo diffs.
$MojibakeReplacements.Add((-join ([char[]](0x0393, 0x00C7, 0x00F6))), " - ") # em dash artefact
$MojibakeReplacements.Add((-join ([char[]](0x0393, 0x00C7, 0x00F4))), " - ") # en dash artefact
$MojibakeReplacements.Add((-join ([char[]](0x0393, 0x00C7, 0x00A3))), '"')   # left double quote artefact
$MojibakeReplacements.Add((-join ([char[]](0x0393, 0x00C7, 0x00A5))), '"')   # right double quote artefact
$MojibakeReplacements.Add((-join ([char[]](0x0393, 0x00C7, 0x00D6))), "'")   # apostrophe artefact
$MojibakeReplacements.Add((-join ([char[]](0x0393, 0x00C7, 0x00DC))), "'")   # apostrophe artefact
$MojibakeReplacements.Add((-join ([char[]](0x252C, 0x00E1))), " ")          # non-breaking space artefact
$MojibakeReplacements.Add((-join ([char[]](0x2229, 0x2557, 0x2510))), "")   # BOM artefact seen in console
$MojibakeReplacements.Add((-join ([char[]](0x00EF, 0x00BB, 0x00BF))), "")   # BOM artefact alternative
$MojibakeReplacements.Add(([string][char]0xFEFF), "")                      # real BOM char

foreach ($File in $TouchedFiles) {
  if (Test-Path $File) {
    $Text = Read-Text $File

    foreach ($Key in $MojibakeReplacements.Keys) {
      $Text = $Text.Replace($Key, $MojibakeReplacements[$Key])
    }

    Write-Text $File $Text
  }
}
Write-Host "==> Remaining mojibake scan"

# ASCII-safe scan. Patterns are built from character codes to avoid PowerShell parsing pasted mojibake.
$ScanPatterns = @(
  (-join ([char[]](0x0393, 0x00C7))),
  (-join ([char[]](0x251C))),
  (-join ([char[]](0x2229))),
  (-join ([char[]](0x2557))),
  (-join ([char[]](0x2510))),
  (-join ([char[]](0x256C))),
  (-join ([char[]](0x252C))),
  ([string][char]0xFFFD)
)

$Findings = @()

foreach ($Pattern in $ScanPatterns) {
  $Matches = Select-String -Path $TouchedFiles -Pattern ([regex]::Escape($Pattern)) -ErrorAction SilentlyContinue

  if ($Matches) {
    $Findings += $Matches
  }
}

if ($Findings.Count -gt 0) {
  $Findings | Select-Object Path, LineNumber, Line | Format-Table -AutoSize
} else {
  Write-Host "No remaining mojibake markers found in touched files."
}
Write-Host "==> Changed files"
git status --short

Write-Host "==> Done. Run checks next."