import { useState } from "react";
import { useWallStartingPoints } from "../../data/wallStartingPoints";
import {
  wallStartPresetFacts,
  wallStartPresetGroups,
  type WallPresetTransport,
  type WallStartPreset,
} from "../../lib/videowallDecision";
import {
  EMPTY_WALL_PRESET_FILTER,
  filterWallStartPresetGroups,
  wallPresetFilterCount,
  wallPresetFilterIsSet,
  wallPresetFilterOptions,
  wallPresetTransportLabels,
  type WallPresetFilter,
} from "../../lib/wallStartPresetFilter";
import { removeWallStartingPoint, wallStartPresetGroupsWithSaved } from "../../lib/wallStartingPoints";
import type { WallRequirements } from "../../lib/videowallOptions";

/**
 * The opening question of the focused view: which wall is closest to the one
 * the customer needs. Presets are grouped by how the wall is built, and every
 * card carries the facts a rep compares — size, windows and the architecture
 * the answers reach — so nothing has to be opened just to compare it.
 *
 * A rep who knows the brief narrows the cards on those same facts: windows,
 * sources and the transport the wall lands on. Filtering only hides cards; the
 * families stay in their order and a chip is never offered that no wall carries.
 *
 * A wall the rep saved from their own answers appears first in its family,
 * beside the shipped walls it was adjusted from, and can be removed again.
 *
 * The card the answers started from stays marked once they have been adjusted:
 * a rep coming back to the start is asking which wall this design came from, not
 * only which card it happens to match exactly today.
 */
export function VideowallStartPresets({ requirements, startedKey, onPick }: {
  /** The current answers, so the expert view can show which preset is active. */
  requirements?: WallRequirements;
  /** The card this design started on, when the page remembers one. */
  startedKey?: string | null;
  onPick: (preset: WallStartPreset) => void;
}) {
  const saved = useWallStartingPoints();
  const groups = saved.length ? wallStartPresetGroupsWithSaved(saved) : wallStartPresetGroups;
  const savedKeys = new Set(saved.map((preset) => preset.key));
  const [filter, setFilter] = useState<WallPresetFilter>(EMPTY_WALL_PRESET_FILTER);
  const allPresets = groups.flatMap((group) => group.presets);
  const options = wallPresetFilterOptions(allPresets);
  const visible = filterWallStartPresetGroups(groups, filter);
  const matches = wallPresetFilterCount(visible);
  const narrowed = wallPresetFilterIsSet(filter);

  return (
    <div className="vw-preset-picker">
      <section className="vw-preset-filter" aria-label="Narrow the walls">
        <div className="vw-preset-filter-head">
          <p className="vw-preset-filter-summary" data-testid="videowall-preset-filter-summary" role="status">
            {narrowed ? `${matches} of ${allPresets.length} walls` : `${allPresets.length} walls`}
          </p>
          {narrowed ? (
            <button
              type="button"
              className="vw-preset-filter-clear"
              data-testid="videowall-preset-filter-clear"
              onClick={() => setFilter(EMPTY_WALL_PRESET_FILTER)}
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <FilterChips
          label="Windows"
          name="windows"
          selected={filter.windows === null ? "" : String(filter.windows)}
          options={options.windows.map((count) => ({ value: String(count), label: String(count) }))}
          onSelect={(value) => setFilter((current) => ({ ...current, windows: value ? Number(value) : null }))}
        />
        <FilterChips
          label="Sources"
          name="sources"
          selected={filter.sources === null ? "" : String(filter.sources)}
          options={options.sources.map((count) => ({ value: String(count), label: String(count) }))}
          onSelect={(value) => setFilter((current) => ({ ...current, sources: value ? Number(value) : null }))}
        />
        <FilterChips
          label="Transport"
          name="transport"
          selected={filter.transport ?? ""}
          options={options.transports.map((transport) => ({ value: transport, label: wallPresetTransportLabels[transport] }))}
          onSelect={(value) => setFilter((current) => ({ ...current, transport: (value || null) as WallPresetTransport | null }))}
        />
        <p className="vw-preset-filter-note">
          A wall stays when it can show at least that many windows from at least that many sources, and runs on that
          connection or a simpler one.
        </p>
      </section>

      {visible.length ? (
        <div className="vw-preset-groups">
          {visible.map((group) => (
            <section key={group.family} className="vw-preset-group" aria-label={group.label}>
              <p className="vw-preset-group-label">{group.label}</p>
              <div className="vw-preset-grid">
                {group.presets.map((preset) => {
                  // Two different facts, so two marks: pressed means the answers
                  // still match this card exactly, started means this is the card
                  // they came from — which a changed answer does not undo.
                  const started = Boolean(startedKey) && preset.key === startedKey;
                  return (
                    <div key={preset.key} className="vw-preset-item">
                      <button
                        type="button"
                        data-testid={`videowall-preset-${preset.key}`}
                        data-started={started ? "true" : undefined}
                        aria-pressed={requirements ? sameWall(requirements, preset.requirements) : undefined}
                        onClick={() => onPick(preset)}
                      >
                        <strong>{preset.label}</strong>
                        <span>{preset.detail}</span>
                        <small>
                          {started ? "Started here · " : ""}
                          {savedKeys.has(preset.key) ? "Saved · " : ""}
                          {wallStartPresetFacts(preset)}
                        </small>
                      </button>
                      {savedKeys.has(preset.key) ? (
                        <button
                          type="button"
                          className="vw-preset-remove"
                          aria-label={`Remove starting point ${preset.label}`}
                          onClick={() => removeWallStartingPoint(preset.key)}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="vw-preset-empty" role="status" data-testid="videowall-preset-empty">
          <p>No wall carries that combination. Widen one filter to see the walls again.</p>
          <button type="button" onClick={() => setFilter(EMPTY_WALL_PRESET_FILTER)}>Clear filters</button>
        </div>
      )}
    </div>
  );
}

function FilterChips({ label, name, options, selected, onSelect }: {
  label: string;
  /** Names the test ids, so each row is addressable on its own. */
  name: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  if (!options.length) return null;
  return (
    <div className="vw-preset-filter-row" role="group" aria-label={label}>
      <span className="vw-preset-filter-label">{label}</span>
      <div className="vw-preset-filter-chips">
        {[{ value: "", label: "All" }, ...options].map((option) => (
          <button
            key={option.value || "all"}
            type="button"
            data-testid={`videowall-preset-filter-${name}${option.value ? `-${option.value}` : ""}`}
            aria-pressed={selected === option.value}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function sameWall(a: WallRequirements, b: WallRequirements) {
  return JSON.stringify(a) === JSON.stringify(b);
}
