param(
  [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Write-Ok($message) {
  Write-Host "✔ $message" -ForegroundColor Green
}

function Write-Warn($message) {
  Write-Host "⚠ $message" -ForegroundColor Yellow
}

function Fail($message) {
  throw $message
}

function Resolve-ProjectPath($relativePath) {
  return [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot $relativePath))
}

function Ensure-FileExists($path) {
  if (-not (Test-Path $path)) {
    Fail "Required file not found: $path"
  }
}

function Ensure-DirectoryExists($path) {
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
  }
}

function Read-FileUtf8($path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.UTF8Encoding]::new($false))
}

function Write-FileUtf8($path, $content) {
  [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
}

function Backup-File($path) {
  $backupPath = "$path.bak"
  Copy-Item $path $backupPath -Force
  return $backupPath
}

function Restore-File($backupPath, $originalPath) {
  if (Test-Path $backupPath) {
    Copy-Item $backupPath $originalPath -Force
  }
}

function Insert-ImportIfMissing {
  param(
    [string]$Content,
    [string]$ImportLine
  )

  if ($Content.Contains($ImportLine)) {
    return $Content
  }

  $lines = $Content -split "`r?`n"
  $importIndexes = @()

  for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '^\s*import\s+') {
      $importIndexes += $i
    }
  }

  if ($importIndexes.Count -gt 0) {
    $insertAt = ($importIndexes | Measure-Object -Maximum).Maximum + 1
    $newLines = @()
    $newLines += $lines[0..($insertAt - 1)]
    $newLines += $ImportLine
    if ($insertAt -le $lines.Length - 1) {
      $newLines += $lines[$insertAt..($lines.Length - 1)]
    }
    return ($newLines -join "`r`n")
  }

  return "$ImportLine`r`n$Content"
}

function Replace-ExactOnce {
  param(
    [string]$Content,
    [string]$OldText,
    [string]$NewText,
    [string]$Label
  )

  $count = ([regex]::Matches($Content, [regex]::Escape($OldText))).Count
  if ($count -eq 0) {
    Fail "Could not find expected block for: $Label"
  }
  if ($count -gt 1) {
    Fail "Found multiple matches for: $Label. Refusing unsafe patch."
  }

  return $Content.Replace($OldText, $NewText)
}

function Add-AfterAnchorOnce {
  param(
    [string]$Content,
    [string]$Anchor,
    [string]$Insertion,
    [string]$Label
  )

  $count = ([regex]::Matches($Content, [regex]::Escape($Anchor))).Count
  if ($count -eq 0) {
    Fail "Could not find anchor for: $Label"
  }
  if ($count -gt 1) {
    Fail "Found multiple anchors for: $Label. Refusing unsafe patch."
  }

  return $Content.Replace($Anchor, "$Anchor`r`n$Insertion")
}

function Add-BeforeAnchorOnce {
  param(
    [string]$Content,
    [string]$Anchor,
    [string]$Insertion,
    [string]$Label
  )

  $count = ([regex]::Matches($Content, [regex]::Escape($Anchor))).Count
  if ($count -eq 0) {
    Fail "Could not find anchor for: $Label"
  }
  if ($count -gt 1) {
    Fail "Found multiple anchors for: $Label. Refusing unsafe patch."
  }

  return $Content.Replace($Anchor, "$Insertion`r`n$Anchor")
}

function Ensure-Contains {
  param(
    [string]$Content,
    [string]$Needle,
    [string]$Label
  )

  if (-not $Content.Contains($Needle)) {
    Fail "Validation failed: missing expected content for $Label"
  }
}

$providerDir = Resolve-ProjectPath "src/core/wingman/commandPalette"
$providerFile = Resolve-ProjectPath "src/core/wingman/commandPalette/CommandPaletteProvider.tsx"
$discoveryFile = Resolve-ProjectPath "src/features/wingmanUx/WingmanDiscoveryPage.tsx"
$shellFile = Resolve-ProjectPath "src/features/wingmanUx/WingmanWorkflowShell.tsx"

$appCandidates = @(
  (Resolve-ProjectPath "src/App.tsx"),
  (Resolve-ProjectPath "src/main.tsx"),
  (Resolve-ProjectPath "src/app/App.tsx")
)

$appFile = $null
foreach ($candidate in $appCandidates) {
  if (Test-Path $candidate) {
    $appFile = $candidate
    break
  }
}

Ensure-FileExists $discoveryFile
Ensure-FileExists $shellFile
if (-not $appFile) {
  Fail "Could not locate App.tsx or main.tsx"
}

$modifiedFiles = @()
$backups = @{}

try {
  Write-Step "Creating provider directory"
  Ensure-DirectoryExists $providerDir
  Write-Ok "Directory ready"

  Write-Step "Writing CommandPaletteProvider.tsx"
  $providerContent = @'
import * as React from "react";
import { useNavigate } from "react-router-dom";

export type CommandItem = {
  id: string;
  label: string;
  subtitle?: string;
  group?: string;
  route?: string;
  action?: () => void;
  keywords?: string[];
  shortcut?: string;
  pinned?: boolean;
};

type ContextType = {
  open: () => void;
  close: () => void;
  registerCommands: (items: CommandItem[]) => void;
};

const CommandPaletteContext = React.createContext<ContextType | null>(null);

export function useCommandPalette() {
  const ctx = React.useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  }
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const [commands, setCommands] = React.useState<CommandItem[]>([]);

  const registerCommands = React.useCallback((items: CommandItem[]) => {
    setCommands(items);
  }, []);

  const run = React.useCallback(
    (item: CommandItem) => {
      if (item.route) {
        navigate(item.route);
      } else {
        item.action?.();
      }
      setIsOpen(false);
    },
    [navigate]
  );

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMeta = event.metaKey || event.ctrlKey;
      if (isMeta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <CommandPaletteContext.Provider
      value={{
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        registerCommands,
      }}
    >
      {children}
      {isOpen ? <CommandPaletteUI commands={commands} onClose={() => setIsOpen(false)} onRun={run} /> : null}
    </CommandPaletteContext.Provider>
  );
}

function CommandPaletteUI({
  commands,
  onClose,
  onRun,
}: {
  commands: CommandItem[];
  onClose: () => void;
  onRun: (item: CommandItem) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;

    return commands.filter((item) => {
      const haystack = [
        item.label,
        item.subtitle ?? "",
        ...(item.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [commands, query]);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (!filtered.length) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filtered.length);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      }

      if (event.key === "Enter") {
        event.preventDefault();
        onRun(filtered[activeIndex]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered, activeIndex, onClose, onRun]);

  return (
    <div className="wmx-command-overlay" onClick={onClose}>
      <div
        className="wmx-command"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="wmx-command-head">
          <div className="wmx-command-title">Command Palette</div>
          <div className="wmx-command-hint">↑ ↓ navigate • Enter run • Esc close</div>
        </div>

        <input
          ref={inputRef}
          className="wm-input-dark"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search pages, actions, tools..."
        />

        <div className="wmx-command-body">
          {filtered.length === 0 ? (
            <div className="wmx-command-empty">No matching commands.</div>
          ) : (
            <div className="wmx-command-list">
              {filtered.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`wmx-command-item ${index === activeIndex ? "is-active" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => onRun(item)}
                >
                  <div className="wmx-command-itemMain">
                    <div className="wmx-command-itemLabel">{item.label}</div>
                    <div className="wmx-command-itemSubtitle">{item.subtitle}</div>
                  </div>
                  <div className="wmx-command-itemMetaWrap">
                    {item.shortcut ? <span className="wmx-command-shortcut">{item.shortcut}</span> : null}
                    <span className="wmx-command-itemMeta">{item.route ? "Page" : "Action"}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
'@
  Write-FileUtf8 $providerFile $providerContent
  Write-Ok "Provider written"

  Write-Step "Patching WingmanDiscoveryPage.tsx"
  $backups[$discoveryFile] = Backup-File $discoveryFile
  $modifiedFiles += $discoveryFile
  $discovery = Read-FileUtf8 $discoveryFile

  $discovery = Insert-ImportIfMissing $discovery 'import { useCommandPalette, type CommandItem } from "@/core/wingman/commandPalette/CommandPaletteProvider";'

  Ensure-Contains $discovery 'export function WingmanDiscoveryPage()' "Discovery export"
  if (-not $discovery.Contains('const { open, registerCommands } = useCommandPalette();')) {
    $discovery = Replace-ExactOnce `
      -Content $discovery `
      -OldText 'export function WingmanDiscoveryPage() {' `
      -NewText "export function WingmanDiscoveryPage() {`r`n  const { open, registerCommands } = useCommandPalette();" `
      -Label "Inject useCommandPalette hook"
  }

  if ($discovery.Contains('function openCommandPalette()')) {
    $discovery = Replace-ExactOnce `
      -Content $discovery `
      -OldText @'
  function openCommandPalette() {
    setCommandPaletteOpen(true);
  }
'@ `
      -NewText @'
  function openCommandPalette() {
    open();
  }
'@ `
      -Label "Replace local openCommandPalette"
  }

  if (-not $discovery.Contains('React.useEffect(() => {') -or -not $discovery.Contains('registerCommands([')) {
    $commandRegistration = @'
  React.useEffect(() => {
    registerCommands([
      {
        id: "go-discovery",
        label: "Go to Discovery",
        subtitle: "Open discovery intake",
        group: "Pages",
        route: WM_ROUTES.discovery,
        keywords: ["discovery", "intake", "requirements", "brief"],
        shortcut: "G D",
        pinned: true,
      },
      {
        id: "go-catalog",
        label: "Go to Product Selection",
        subtitle: "Open catalog and product selection",
        group: "Pages",
        route: WM_ROUTES.catalog,
        keywords: ["catalog", "catalogue", "products", "selection"],
        shortcut: "G P",
        pinned: true,
      },
      {
        id: "go-compare",
        label: "Go to Compare",
        subtitle: "Compare product options",
        group: "Pages",
        route: WM_ROUTES.compare,
        keywords: ["compare", "comparison", "options"],
        shortcut: "G C",
      },
      {
        id: "go-proposal",
        label: "Open Proposal",
        subtitle: "Review proposal output",
        group: "Pages",
        route: WM_ROUTES.proposal,
        keywords: ["proposal", "quote", "pricing", "bom"],
        shortcut: "G O",
        pinned: true,
      },
      {
        id: "go-videowall",
        label: "Open Video Wall",
        subtitle: "Launch video wall workflow",
        group: "Pages",
        route: WM_ROUTES.videoWall,
        keywords: ["video wall", "videowall", "wall"],
      },
      {
        id: "go-navigator",
        label: "Open Navigator",
        subtitle: "Open solution navigator",
        group: "Pages",
        route: WM_ROUTES.navigator,
        keywords: ["navigator", "route", "path"],
      },
      {
        id: "save-draft",
        label: "Save Draft",
        subtitle: "Persist current progress",
        group: "Actions",
        action: handleSave,
        keywords: ["save", "draft", "persist"],
        shortcut: "⌘S",
        pinned: true,
      },
    ] satisfies CommandItem[]);
  }, [registerCommands, handleSave]);
'@
    $discovery = Add-AfterAnchorOnce `
      -Content $discovery `
      -Anchor @'
  const completeness = calculateCompleteness({
    displays,
    sources,
    distanceM,
    usbMode,
    networkMode,
    expansionMode,
    projectNotes,
  });
'@ `
      -Insertion $commandRegistration `
      -Label "Insert command registration"
  }

  Write-FileUtf8 $discoveryFile $discovery
  Write-Ok "Discovery patched"

  Write-Step "Patching WingmanWorkflowShell.tsx"
  $backups[$shellFile] = Backup-File $shellFile
  $modifiedFiles += $shellFile
  $shell = Read-FileUtf8 $shellFile

  $shell = Insert-ImportIfMissing $shell 'import { useCommandPalette } from "@/core/wingman/commandPalette/CommandPaletteProvider";'

  if (-not $shell.Contains('const { open } = useCommandPalette();')) {
    $shell = Replace-ExactOnce `
      -Content $shell `
      -OldText '  const navigate = useNavigate();' `
      -NewText "  const navigate = useNavigate();`r`n  const { open } = useCommandPalette();" `
      -Label "Inject useCommandPalette into shell"
  }

  if ($shell.Contains('onClick={onOpenCommandPalette}')) {
    $shell = Replace-ExactOnce `
      -Content $shell `
      -OldText '            onClick={onOpenCommandPalette}' `
      -NewText '            onClick={open}' `
      -Label "Wire shell button to global palette"
  }

  Write-FileUtf8 $shellFile $shell
  Write-Ok "Shell patched"

  Write-Step "Patching app root"
  $backups[$appFile] = Backup-File $appFile
  $modifiedFiles += $appFile
  $app = Read-FileUtf8 $appFile

  $app = Insert-ImportIfMissing $app 'import { CommandPaletteProvider } from "@/core/wingman/commandPalette/CommandPaletteProvider";'

  if ($app.Contains('<CommandPaletteProvider>')) {
    Write-Warn "App already wrapped with CommandPaletteProvider"
  }
  elseif ($app.Contains('<App />')) {
    $app = Replace-ExactOnce `
      -Content $app `
      -OldText '<App />' `
      -NewText '<CommandPaletteProvider><App /></CommandPaletteProvider>' `
      -Label "Wrap App element"
  }
  elseif ($app.Contains('{children}')) {
    $app = Replace-ExactOnce `
      -Content $app `
      -OldText '{children}' `
      -NewText '<CommandPaletteProvider>{children}</CommandPaletteProvider>' `
      -Label "Wrap children with provider"
  }
  else {
    Fail "Could not safely determine where to wrap CommandPaletteProvider in $appFile"
  }

  Write-FileUtf8 $appFile $app
  Write-Ok "App root patched"

  Write-Step "Validating results"
  Ensure-Contains (Read-FileUtf8 $providerFile) 'export function CommandPaletteProvider' "Provider export"
  Ensure-Contains (Read-FileUtf8 $discoveryFile) 'useCommandPalette' "Discovery hook import"
  Ensure-Contains (Read-FileUtf8 $shellFile) 'const { open } = useCommandPalette();' "Shell hook usage"
  Ensure-Contains (Read-FileUtf8 $appFile) 'CommandPaletteProvider' "App provider wrap"
  Write-Ok "Validation complete"

  Write-Host ""
  Write-Host "Global command palette installed successfully." -ForegroundColor Green
  Write-Host "Backups created as *.bak files beside modified files." -ForegroundColor DarkGray
}
catch {
  Write-Host ""
  Write-Host "Installation failed. Rolling back changes..." -ForegroundColor Red

  foreach ($file in $modifiedFiles) {
    if ($backups.ContainsKey($file)) {
      Restore-File $backups[$file] $file
      Write-Warn "Restored $file"
    }
  }

  Write-Host ""
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}