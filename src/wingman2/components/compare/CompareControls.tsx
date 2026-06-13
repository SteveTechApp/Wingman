import { useId, useMemo, useState, type Dispatch, type FocusEvent, type SetStateAction } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type CompareSelectOption = {
  value: string;
  label: string;
};

function closeOnBlur(
  event: FocusEvent<HTMLDivElement>,
  setOpen: Dispatch<SetStateAction<boolean>>,
) {
  const nextTarget = event.relatedTarget;
  if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
  setOpen(false);
}

export function CompareManufacturerCombobox({
  value,
  options,
  onChange,
}: {
  value: string;
  options: CompareSelectOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative grid gap-2" onBlur={(event) => closeOnBlur(event, setOpen)} data-wingman-manufacturer-combobox="true">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Manufacturer</span>
      <button
        type="button"
        aria-label="Choose competitor manufacturer"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#29465e] bg-[#0d2133] px-4 text-left text-sm font-semibold text-white outline-none transition hover:border-cyan-400/70 focus:border-cyan-300"
      >
        <span className={selected.value ? "text-white" : "text-white/65"}>{selected.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-cyan-200 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Choose competitor manufacturer"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-[#29465e] bg-[#071522] p-1 shadow-2xl shadow-black/40"
        >
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value || "auto"}
                type="button"
                role="option"
                aria-selected={active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                  active ? "bg-cyan-300 text-slate-950" : "text-white hover:bg-[#0d2133]"
                }`}
              >
                <span>{option.label}</span>
                {active ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function CompareProductLookupInput({
  value,
  suggestions,
  onChange,
  placeholder,
  maxVisibleSuggestions = 40,
}: {
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
  placeholder: string;
  maxVisibleSuggestions?: number;
}) {
  const [open, setOpen] = useState(false);
  const listboxId = useId();
  const visibleSuggestions = useMemo(() => suggestions.slice(0, 10), [maxVisibleSuggestions, suggestions]);

  return (
    <div className="relative grid gap-2" onBlur={(event) => closeOnBlur(event, setOpen)}>
      <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Competitor product</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-200/70" aria-hidden="true" />
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          role="combobox"
          aria-label="Competitor product"
          aria-expanded={open && visibleSuggestions.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="min-h-12 w-full rounded-2xl border border-[#29465e] bg-[#0d2133] px-11 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300"
          autoFocus
        />
      </div>

      {open && visibleSuggestions.length ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Competitor SKU suggestions"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[28rem] overflow-y-auto rounded-2xl border border-[#29465e] bg-[#071522] p-1 shadow-2xl shadow-black/40"
        >
          {visibleSuggestions.map((sku) => (
            <button
              key={`compare-sku-${sku}`}
              type="button"
              role="option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(sku);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-[#0d2133]"
            >
              <span>{sku}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
