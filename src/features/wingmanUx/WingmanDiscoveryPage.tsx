import * as React from "react";
import { useNavigate } from "react-router-dom";
import { WingmanWorkflowShell } from "./WingmanWorkflowShell";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  useCommandPalette,
  type CommandItem,
} from "@/core/wingman/commandPalette/CommandPaletteProvider";

type DiscoveryIntent = "meeting" | "distribution" | "expansion";
type CommandGroup = "Pages" | "Actions" | "Pinned" | "Recent";

type DiscoveryCommandItem = CommandItem & {
  group?: CommandGroup;
  pinned?: boolean;
};

const COMMAND_HISTORY_KEY = "wingman-command-history";

export function WingmanDiscoveryPage() {
  const navigate = useNavigate();
  const { open, registerCommands } = useCommandPalette();

  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [selectedIntent, setSelectedIntent] =
    React.useState<DiscoveryIntent>("meeting");

  const [displays, setDisplays] = React.useState("3");
  const [sources, setSources] = React.useState("2");
  const [distanceM, setDistanceM] = React.useState("36");
  const [usbMode, setUsbMode] = React.useState("possible");
  const [networkMode, setNetworkMode] = React.useState("basic");
  const [expansionMode, setExpansionMode] = React.useState("optional");
  const [projectNotes, setProjectNotes] = React.useState(
    "Client requires a compact, switching-led solution for several meeting spaces with moderate cable runs."
  );

  const handleSave = React.useCallback(() => {
    console.log("Save draft");
  }, []);

  function openCommandPalette() {
    open();
  }

  function closeCommandPalette() {
    setCommandPaletteOpen(false);
  }

  const parsedDisplays = Number(displays) || 0;
  const parsedSources = Number(sources) || 0;
  const parsedDistance = Number(distanceM) || 0;

  const recommendedPath =
    selectedIntent === "distribution"
      ? "Distributed video architecture is the strongest fit."
      : selectedIntent === "expansion"
      ? "Installed-system expansion path is the strongest fit."
      : "Switching-led meeting architecture is the strongest fit.";

  const transportGuidance =
    parsedDistance > 70
      ? "Long-distance signal transport required."
      : parsedDistance > 30
      ? "Standard extension range."
      : "Short-run direct connection likely sufficient.";

  const complexity =
    parsedDisplays > 3 || parsedSources > 2 || expansionMode === "required"
      ? "Moderate"
      : "Low";

  const completeness = calculateCompleteness({
    displays,
    sources,
    distanceM,
    usbMode,
    networkMode,
    expansionMode,
    projectNotes,
  });

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
        shortcut: "Ctrl+S",
        pinned: true,
      },
      {
        id: "intent-meeting",
        label: "Set Intent: Meeting Rooms",
        subtitle: "Switch to meeting-room workflow",
        group: "Actions",
        action: () => setSelectedIntent("meeting"),
        keywords: ["meeting", "intent", "rooms"],
      },
      {
        id: "intent-distribution",
        label: "Set Intent: Distribution",
        subtitle: "Switch to distribution workflow",
        group: "Actions",
        action: () => setSelectedIntent("distribution"),
        keywords: ["distribution", "intent", "routing"],
      },
      {
        id: "intent-expansion",
        label: "Set Intent: Expansion",
        subtitle: "Switch to installed-system expansion workflow",
        group: "Actions",
        action: () => setSelectedIntent("expansion"),
        keywords: ["expansion", "retrofit", "intent"],
      },
    ] satisfies DiscoveryCommandItem[]);
  }, [registerCommands, handleSave]);

  const commandItems = React.useMemo<DiscoveryCommandItem[]>(
    () => [
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
        shortcut: "Ctrl+S",
        pinned: true,
      },
      {
        id: "intent-meeting",
        label: "Set Intent: Meeting Rooms",
        subtitle: "Switch to meeting-room workflow",
        group: "Actions",
        action: () => setSelectedIntent("meeting"),
        keywords: ["meeting", "intent", "rooms"],
      },
      {
        id: "intent-distribution",
        label: "Set Intent: Distribution",
        subtitle: "Switch to distribution workflow",
        group: "Actions",
        action: () => setSelectedIntent("distribution"),
        keywords: ["distribution", "intent", "routing"],
      },
      {
        id: "intent-expansion",
        label: "Set Intent: Expansion",
        subtitle: "Switch to installed-system expansion workflow",
        group: "Actions",
        action: () => setSelectedIntent("expansion"),
        keywords: ["expansion", "retrofit", "intent"],
      },
    ],
    [handleSave]
  );

  return (
    <>
      <WingmanWorkflowShell
        activeStage="discovery"
        projectName="Acme HQ Refresh"
        sourceCount={parsedSources}
        displayCount={parsedDisplays}
        distanceM={parsedDistance}
        systemType={intentToSystemType(selectedIntent)}
        onSave={handleSave}
        onOpenCommandPalette={openCommandPalette}
        onOpenHistory={() => console.log("history")}
        onOpenNotifications={() => console.log("notifications")}
        onOpenSettings={() => console.log("settings")}
        rightRail={
          <div className="wmx-right-panel">
            <div className="wmx-right-title">Decision Rail</div>

            <div className="wmx-alert-list">
              <Alert type="good" title="Recommended path" copy={recommendedPath} />
              <Alert type="info" title="Transport guidance" copy={transportGuidance} />
              <Alert
                type="warn"
                title="Watch item"
                copy="Confirm USB and control requirements early."
              />
            </div>

            <Metric label="Discovery completeness" value={`${completeness}%`} />
            <Metric label="Estimated complexity" value={complexity} />
          </div>
        }
      >
        <section className="wmx-section">
          <div className="wmx-section-header">
            <h1>Discovery</h1>
            <p>Define inputs to drive architecture and product selection.</p>
          </div>

          <div className="wmx-card-row">
            <IntentCard
              active={selectedIntent === "meeting"}
              title="Meeting Rooms"
              subtitle="Switching-led"
              onClick={() => setSelectedIntent("meeting")}
            />

            <IntentCard
              active={selectedIntent === "distribution"}
              title="Distribution"
              subtitle="Multi-display routing"
              onClick={() => setSelectedIntent("distribution")}
            />

            <IntentCard
              active={selectedIntent === "expansion"}
              title="Expansion"
              subtitle="Installed system"
              onClick={() => setSelectedIntent("expansion")}
            />
          </div>

          <section className="wmx-data-panel">
            <div className="wmx-panel-title">Discovery Inputs</div>

            <div className="wmx-form-grid">
              <input
                className="wm-input-dark"
                value={displays}
                onChange={(e) => setDisplays(e.target.value)}
                placeholder="Displays"
              />
              <input
                className="wm-input-dark"
                value={sources}
                onChange={(e) => setSources(e.target.value)}
                placeholder="Sources"
              />
              <input
                className="wm-input-dark"
                value={distanceM}
                onChange={(e) => setDistanceM(e.target.value)}
                placeholder="Distance (m)"
              />

              <select
                className="wm-select-dark"
                value={usbMode}
                onChange={(e) => setUsbMode(e.target.value)}
              >
                <option value="possible">USB possible</option>
                <option value="required">USB required</option>
                <option value="none">No USB</option>
              </select>

              <select
                className="wm-select-dark"
                value={networkMode}
                onChange={(e) => setNetworkMode(e.target.value)}
              >
                <option value="basic">Basic network</option>
                <option value="managed">Managed AV network</option>
              </select>

              <select
                className="wm-select-dark"
                value={expansionMode}
                onChange={(e) => setExpansionMode(e.target.value)}
              >
                <option value="optional">Expansion optional</option>
                <option value="required">Expansion required</option>
              </select>
            </div>

            <textarea
              className="wm-textarea-dark"
              value={projectNotes}
              onChange={(e) => setProjectNotes(e.target.value)}
              placeholder="Project notes"
            />
          </section>
        </section>
      </WingmanWorkflowShell>

      {commandPaletteOpen ? (
        <ProCommandPalette
          items={commandItems}
          onClose={closeCommandPalette}
          onNavigate={(route) => {
            closeCommandPalette();
            navigate(route);
          }}
        />
      ) : null}
    </>
  );
}

function ProCommandPalette({
  items,
  onClose,
  onNavigate,
}: {
  items: DiscoveryCommandItem[];
  onClose: () => void;
  onNavigate: (route: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [recentIds, setRecentIds] = React.useState<string[]>(loadRecentCommands);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const pinnedItems = React.useMemo(
    () => items.filter((item) => item.pinned),
    [items]
  );

  const recentItems = React.useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    return recentIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, 5) as DiscoveryCommandItem[];
  }, [items, recentIds]);

  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      return dedupeCommands([
        ...pinnedItems.map((item) => ({
          ...item,
          displayGroup: "Pinned" as CommandGroup,
        })),
        ...recentItems.map((item) => ({
          ...item,
          displayGroup: "Recent" as CommandGroup,
        })),
        ...items.map((item) => ({
          ...item,
          displayGroup: (item.group ?? "Actions") as CommandGroup,
        })),
      ]);
    }

    return items
      .map((item) => ({
        ...item,
        displayGroup: (item.group ?? "Actions") as CommandGroup,
        score: getCommandScore(item, q),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [items, pinnedItems, query, recentItems]);

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

      if (!filteredItems.length) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredItems.length);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex(
          (prev) => (prev - 1 + filteredItems.length) % filteredItems.length
        );
      }

      if (event.key === "Enter") {
        event.preventDefault();
        runCommand(filteredItems[activeIndex]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredItems, activeIndex, onClose]);

  function runCommand(item: DiscoveryCommandItem) {
    rememberCommand(item.id, setRecentIds);

    if (item.route) {
      onNavigate(item.route);
      return;
    }

    item.action?.();
    onClose();
  }

  const grouped = groupCommands(filteredItems);

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
          <div className="wmx-command-hint">
            Up/Down navigate, Enter run, Esc close
          </div>
        </div>

        <input
          ref={inputRef}
          className="wm-input-dark"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages, actions, tools..."
        />

        <div className="wmx-command-body">
          {filteredItems.length === 0 ? (
            <div className="wmx-command-empty">No matching commands.</div>
          ) : (
            Object.entries(grouped).map(([group, groupItems]) => (
              <div key={group} className="wmx-command-group">
                <div className="wmx-command-groupLabel">{group}</div>

                <div className="wmx-command-list">
                  {groupItems.map((item) => {
                    const globalIndex = filteredItems.findIndex(
                      (entry) => entry.id === item.id
                    );
                    const active = globalIndex === activeIndex;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`wmx-command-item ${active ? "is-active" : ""}`}
                        onMouseEnter={() => setActiveIndex(globalIndex)}
                        onClick={() => runCommand(item)}
                      >
                        <div className="wmx-command-itemMain">
                          <div className="wmx-command-itemLabel">{item.label}</div>
                          <div className="wmx-command-itemSubtitle">
                            {item.subtitle}
                          </div>
                        </div>

                        <div className="wmx-command-itemMetaWrap">
                          {item.shortcut ? (
                            <span className="wmx-command-shortcut">
                              {item.shortcut}
                            </span>
                          ) : null}
                          <span className="wmx-command-itemMeta">
                            {item.route ? "Page" : "Action"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function groupCommands(
  items: Array<DiscoveryCommandItem & { displayGroup?: CommandGroup }>
) {
  return items.reduce<
    Record<string, Array<DiscoveryCommandItem & { displayGroup?: CommandGroup }>>
  >((acc, item) => {
    const key = item.displayGroup ?? item.group ?? "Actions";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function getCommandScore(item: DiscoveryCommandItem, query: string) {
  let score = 0;

  const label = item.label.toLowerCase();
  const subtitle = (item.subtitle ?? "").toLowerCase();
  const keywords = (item.keywords ?? []).join(" ").toLowerCase();
  const queryParts = query.split(/\s+/).filter(Boolean);

  if (label === query) score += 200;
  if (label.startsWith(query)) score += 120;
  if (label.includes(query)) score += 80;
  if (subtitle.includes(query)) score += 35;
  if (keywords.includes(query)) score += 45;

  for (const part of queryParts) {
    if (label.startsWith(part)) score += 40;
    else if (label.includes(part)) score += 24;

    if (subtitle.includes(part)) score += 10;
    if (keywords.includes(part)) score += 14;
  }

  if (item.pinned) score += 8;

  return score;
}

function dedupeCommands<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function loadRecentCommands(): string[] {
  try {
    const raw = localStorage.getItem(COMMAND_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function rememberCommand(
  id: string,
  setRecentIds: React.Dispatch<React.SetStateAction<string[]>>
) {
  setRecentIds((prev) => {
    const next = [id, ...prev.filter((item) => item !== id)].slice(0, 10);
    try {
      localStorage.setItem(COMMAND_HISTORY_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    return next;
  });
}

function IntentCard({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <article
      className={`wmx-config-card ${active ? "is-selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="wmx-config-title">{title}</div>
      <div className="wmx-config-subtitle">{subtitle}</div>
    </article>
  );
}

function Alert({
  type,
  title,
  copy,
}: {
  type: "good" | "info" | "warn";
  title: string;
  copy: string;
}) {
  return (
    <div className="wmx-alert-item">
      <div className={`wmx-alert-dot wmx-alert-dot--${type}`} />
      <div className="wmx-alert-copy">
        <strong>{title}</strong>
        <span>{copy}</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="wmx-summary-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function intentToSystemType(intent: DiscoveryIntent) {
  if (intent === "distribution") return "Distributed AV";
  if (intent === "expansion") return "Expansion system";
  return "Meeting room AV";
}

function calculateCompleteness(input: {
  displays: string;
  sources: string;
  distanceM: string;
  usbMode: string;
  networkMode: string;
  expansionMode: string;
  projectNotes: string;
}) {
  const checks = Object.values(input).map(
    (value) => String(value).trim().length > 0
  );
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}