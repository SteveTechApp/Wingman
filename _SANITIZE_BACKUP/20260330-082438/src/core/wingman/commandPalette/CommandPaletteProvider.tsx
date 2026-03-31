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

type CommandPaletteContextValue = {
  open: () => void;
  close: () => void;
  registerCommands: (items: CommandItem[]) => void;
};

const CommandPaletteContext =
  React.createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  const ctx = React.useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      "useCommandPalette must be used inside CommandPaletteProvider"
    );
  }
  return ctx;
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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
      {isOpen ? (
        <CommandPaletteUI
          commands={commands}
          onClose={() => setIsOpen(false)}
          onRun={run}
        />
      ) : null}
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
        setActiveIndex(
          (prev) => (prev - 1 + filtered.length) % filtered.length
        );
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
          <div className="wmx-command-hint">
            Up/Down navigate, Enter run, Esc close
          </div>
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
                  className={
                    "wmx-command-item " + (index === activeIndex ? "is-active" : "")
                  }
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => onRun(item)}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}