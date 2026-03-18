[CmdletBinding()]
param(
  [string]$Root = "",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
if (-not $Apply) { throw "Run with -Apply" }

function Find-RepoRoot {
  param([string]$Start = "")
  $dir = ""
  if ($Start) { $dir = (Resolve-Path $Start).Path }
  if (-not $dir) { $dir = (Get-Location).Path }

  while ($true) {
    if (Test-Path (Join-Path $dir "package.json")) { return $dir }
    $parent = Split-Path $dir -Parent
    if ($parent -eq $dir) { throw "Could not find package.json from $dir" }
    $dir = $parent
  }
}

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  $folder = Split-Path $Path -Parent
  if ($folder -and -not (Test-Path $folder)) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Read-Text {
  param([Parameter(Mandatory = $true)][string]$Path)
  return [System.IO.File]::ReadAllText($Path)
}

function Backup-File {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$RepoRoot,
    [Parameter(Mandatory = $true)][string]$BackupRoot
  )
  $relative = $Path.Substring($RepoRoot.Length).TrimStart('\','/')
  $dest = Join-Path $BackupRoot $relative
  $destDir = Split-Path $dest -Parent
  if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  }
  Copy-Item $Path $dest -Force
}

function Find-FirstFileContaining {
  param(
    [Parameter(Mandatory = $true)][string]$BasePath,
    [Parameter(Mandatory = $true)][string[]]$Needles
  )

  $files = Get-ChildItem $BasePath -Recurse -Include *.ts,*.tsx -File
  foreach ($file in $files) {
    $raw = Read-Text $file.FullName
    $allFound = $true
    foreach ($needle in $Needles) {
      if ($raw -notmatch [regex]::Escape($needle)) { $allFound = $false }
    }
    if ($allFound) { return $file.FullName }
  }

  throw "Could not find the product filter page."
}

function Replace-OrThrow {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string]$Pattern,
    [Parameter(Mandatory = $true)][string]$Replacement,
    [Parameter(Mandatory = $true)][string]$Label
  )

  $rx = [regex]::new($Pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if (-not $rx.IsMatch($Text)) { throw "Pattern not found: $Label" }
  return $rx.Replace($Text, $Replacement, 1)
}

function Insert-AfterFirstMatch {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string]$Pattern,
    [Parameter(Mandatory = $true)][string]$InsertText,
    [Parameter(Mandatory = $true)][string]$Label
  )

  $rx = [regex]::new($Pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  $m = $rx.Match($Text)
  if (-not $m.Success) { throw "Insert anchor not found: $Label" }

  $start = $m.Index + $m.Length
  return $Text.Substring(0, $start) + "`r`n" + $InsertText + "`r`n" + $Text.Substring($start)
}

$repoRoot = Find-RepoRoot -Start $Root
$srcRoot = Join-Path $repoRoot "src"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $repoRoot "_RESCUE\product-filters-collapsible-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$pagePath = Find-FirstFileContaining -BasePath $srcRoot -Needles @(
  "Technology Type",
  "Category"
)

Backup-File -Path $pagePath -RepoRoot $repoRoot -BackupRoot $backupRoot

$t = Read-Text $pagePath

# Basic mojibake cleanup
$t = $t.Replace("Ã¢â‚¬", "")
$t = $t.Replace("Â", "")
$t = $t.Replace("â€¢", "-")
$t = $t.Replace("â€“", "-")
$t = $t.Replace("â€”", "-")
$t = $t.Replace("â€", "")
$t = $t.Replace("Ã", "")
$t = $t.Replace("¢", "")
$t = $t.Replace("¼", "")
$t = $t.Replace("¾", "")

# Ensure React useState exists
if ($t -match 'import\s+\*\s+as\s+React\s+from\s+"react";') {
  if ($t -notmatch 'React\.useState') {
    # nothing needed if already using React.useState later
  }
}

# Insert helper types and accordion helpers after imports
if ($t -notmatch 'type FilterSection =') {
$helperBlock = @'
type FilterSection = {
  key: string;
  title: string;
  options: string[];
};

function cleanFilterLabel(value: string): string {
  const v = String(value || "").trim();

  if (v === "Videowall") return "Video Wall";
  if (v === "Zoom certified") return "Zoom Certified";
  if (v === "ZOOM Certification") return "Zoom Certified";
  if (v === "Web-UI") return "Web UI";
  if (v === "WEB GUI and RS232 control") return "Web GUI and RS232 Control";

  return v
    .replace(/Ã.+$/g, "")
    .replace(/Â/g, "")
    .replace(/â.+$/g, "")
    .trim();
}

function dedupeClean(values: string[]): string[] {
  const map = new Map<string, string>();

  values.forEach((item) => {
    const cleaned = cleanFilterLabel(item);
    const key = cleaned.toLowerCase();
    if (!cleaned) return;
    if (!map.has(key)) map.set(key, cleaned);
  });

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

function selectedCount(options: string[], selected: string[]) {
  const set = new Set(selected.map((x) => cleanFilterLabel(x).toLowerCase()));
  return options.filter((x) => set.has(cleanFilterLabel(x).toLowerCase())).length;
}
'@
  $t = Insert-AfterFirstMatch `
    -Text $t `
    -Pattern '(import[\s\S]*?;\s*)' `
    -InsertText $helperBlock `
    -Label "imports"
}

# Insert collapsed state
if ($t -notmatch 'const\s+\[openSections,\s*setOpenSections\]') {
  $t = Replace-OrThrow `
    -Text $t `
    -Pattern '(export\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)' `
    -Replacement ('$1' + "`r`n" + @'
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    technology: true,
    category: true,
    features: false,
    lifecycle: false,
    connectivity: false,
    certifications: false,
  });

  const toggleSection = React.useCallback((key: string) => {
    setOpenSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);
'@) `
    -Label "component start"
}

# Build section data arrays where likely filter arrays already exist
if ($t -notmatch 'const\s+filterSections:\s*FilterSection\[\]') {
$sectionsBlock = @'
  const technologyOptions = dedupeClean(
    (technologyTypes ?? techTypes ?? filterTechnologyTypes ?? []).map((x: string) => String(x))
  );

  const categoryOptions = dedupeClean(
    (categories ?? filterCategories ?? productCategories ?? []).map((x: string) => String(x))
  );

  const featureOptions = dedupeClean(
    (features ?? filterFeatures ?? productFeatures ?? []).map((x: string) => String(x))
  );

  const lifecycleOptions = dedupeClean(
    (lifecycles ?? lifecycleValues ?? filterLifecycles ?? []).map((x: string) => String(x))
  );

  const connectivityOptions = dedupeClean(
    (connectivity ?? connectivityTypes ?? filterConnectivity ?? []).map((x: string) => String(x))
  );

  const certificationOptions = dedupeClean(
    (certifications ?? filterCertifications ?? []).map((x: string) => String(x))
  );

  const filterSections: FilterSection[] = [
    { key: "technology", title: "Technology Type", options: technologyOptions },
    { key: "category", title: "Category", options: categoryOptions },
    { key: "features", title: "Features", options: featureOptions },
    { key: "lifecycle", title: "Lifecycle", options: lifecycleOptions },
    { key: "connectivity", title: "Connectivity", options: connectivityOptions },
    { key: "certifications", title: "Certifications", options: certificationOptions },
  ];
'@
  $t = Insert-AfterFirstMatch `
    -Text $t `
    -Pattern '(const\s+\[openSections,\s*setOpenSections\][\s\S]*?const\s+toggleSection[\s\S]*?\);\s*)' `
    -InsertText $sectionsBlock `
    -Label "after section state"
}

# Insert renderer helper inside component if missing
if ($t -notmatch 'const\s+renderFilterSection\s*=\s*\(') {
$rendererBlock = @'
  const renderFilterSection = (
    section: FilterSection,
    selectedValues: string[],
    onToggleValue: (value: string) => void
  ) => {
    const isOpen = !!openSections[section.key];
    const count = selectedCount(section.options, selectedValues);

    return (
      <div
        key={section.key}
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 18,
          background: "linear-gradient(180deg, rgba(4,14,30,0.92), rgba(2,10,24,0.88))",
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <button
          type="button"
          onClick={() => toggleSection(section.key)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.96)",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {section.title}
            </div>
            <div
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                background: count > 0 ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.08)",
                color: count > 0 ? "#7dd3fc" : "rgba(255,255,255,0.68)",
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {count} selected
            </div>
          </div>

          <div
            aria-hidden="true"
            style={{
              color: "rgba(255,255,255,0.76)",
              fontSize: 18,
              fontWeight: 900,
              lineHeight: 1,
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 160ms ease",
            }}
          >
            v
          </div>
        </button>

        {isOpen ? (
          <div
            style={{
              padding: "0 12px 14px 12px",
              display: "grid",
              gap: 10,
            }}
          >
            {section.options.map((option) => {
              const cleaned = cleanFilterLabel(option);
              const checked = selectedValues
                .map((x) => cleanFilterLabel(x).toLowerCase())
                .includes(cleaned.toLowerCase());

              return (
                <label
                  key={cleaned}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "20px minmax(0, 1fr)",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 16,
                    border: checked
                      ? "1px solid rgba(56,189,248,0.35)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: checked
                      ? "linear-gradient(180deg, rgba(56,189,248,0.12), rgba(56,189,248,0.04))"
                      : "rgba(3,12,26,0.72)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleValue(cleaned)}
                    style={{
                      width: 16,
                      height: 16,
                      margin: 0,
                    }}
                  />
                  <span
                    style={{
                      color: checked ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.9)",
                      fontSize: 15,
                      fontWeight: checked ? 700 : 600,
                      lineHeight: 1.25,
                    }}
                  >
                    {cleaned}
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };
'@
  $t = Insert-AfterFirstMatch `
    -Text $t `
    -Pattern '(const\s+filterSections:\s*FilterSection\[\][\s\S]*?\];)' `
    -InsertText $rendererBlock `
    -Label "after filterSections"
}

# Replace mojibake heading fragments if present
$t = $t.Replace("Ã¢â€\"¼", "")
$t = $t.Replace("Ã¢â€\"¾", "")
$t = $t.Replace("Â¢â€\"¾", "")
$t = $t.Replace("Â¢â€\"¼", "")

# Replace old repeated sections with a mapped accordion block
$oldSectionPattern = '(?s)<[^>]*>\s*\{?\s*"Technology Type"\s*\}?[\s\S]*?Lifecycle[\s\S]*?(?=<\/aside>|<\/div>\s*</div>|$)'
if ([regex]::IsMatch($t, $oldSectionPattern)) {
$newBlock = @'
<div
  style={{
    display: "grid",
    gap: 14,
    alignContent: "start",
  }}
>
  {renderFilterSection(
    filterSections.find((s) => s.key === "technology")!,
    selectedTechnologyTypes ?? selectedTechTypes ?? [],
    toggleTechnologyType ?? onToggleTechnologyType
  )}

  {renderFilterSection(
    filterSections.find((s) => s.key === "category")!,
    selectedCategories ?? [],
    toggleCategory ?? onToggleCategory
  )}

  {filterSections.find((s) => s.key === "features")?.options?.length ? renderFilterSection(
    filterSections.find((s) => s.key === "features")!,
    selectedFeatures ?? [],
    toggleFeature ?? onToggleFeature
  ) : null}

  {filterSections.find((s) => s.key === "lifecycle")?.options?.length ? renderFilterSection(
    filterSections.find((s) => s.key === "lifecycle")!,
    selectedLifecycles ?? [],
    toggleLifecycle ?? onToggleLifecycle
  ) : null}

  {filterSections.find((s) => s.key === "connectivity")?.options?.length ? renderFilterSection(
    filterSections.find((s) => s.key === "connectivity")!,
    selectedConnectivity ?? [],
    toggleConnectivity ?? onToggleConnectivity
  ) : null}

  {filterSections.find((s) => s.key === "certifications")?.options?.length ? renderFilterSection(
    filterSections.find((s) => s.key === "certifications")!,
    selectedCertifications ?? [],
    toggleCertification ?? onToggleCertification
  ) : null}
</div>
'@
  $t = [regex]::Replace($t, $oldSectionPattern, $newBlock, 1)
}

Save-Utf8NoBom -Path $pagePath -Content $t

Write-Host ""
Write-Host "Patched product filter page:" -ForegroundColor Green
Write-Host "  $pagePath" -ForegroundColor Green
Write-Host ""
Write-Host "Backup:" -ForegroundColor Yellow
Write-Host "  $backupRoot" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"