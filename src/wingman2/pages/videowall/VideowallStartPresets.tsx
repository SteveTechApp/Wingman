import { useState } from "react";
import { usePinnedWallPresets } from "../../data/wallPinnedPresets";
import { useWallStartingPoints } from "../../data/wallStartingPoints";
import {
  wallStartPresetGroups,
  wallStartPresetShortlist,
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
import { togglePinnedWallPreset, wallStartPresetGroupsWithPins } from "../../lib/wallPinnedPresets";
import type { WallRequirements } from "../../lib/videowallOptions";
import { VideowallStartPresetRow } from "./VideowallStartPresetRow";

/**
 * The opening question of both readings: which wall is closest to the one the
 * customer needs.
 *
 * Every wall is a row that can be recognised before it is read: a small drawing
 * of its panels and windows, its name with the brief under it, and the three
 * facts a rep compares as chips in their own column — the array, the pictures
 * it carries and the architecture the answers reach. Twenty rows of prose read
 * as twenty sentences of equal weight; a drawing, a name and three aligned
 * chips let two walls be compared down a column without reading either twice.
 *
 * The walls stay grouped by how they are built, with the family's count on its
 * band, so the list reads as three short lists rather than one long one.
 *
 * A rep who knows the brief narrows on the same facts: windows, sources and the
 * transport the wall lands on. The chips sit above the walls rather than behind
 * a disclosure — a narrowing nobody can see is a narrowing nobody uses — and
 * they only hide rows: the families keep their order and a chip is never
 * offered that no wall carries. The count and the way back out of a narrowed
 * list sit on the line with them.
 *
 * A wall the rep saved from their own answers appears first in its family,
 * beside the shipped walls it was adjusted from, and can be removed again. The
 * wall the answers started from stays marked once they have been adjusted: a
 * rep coming back to the start is asking which wall this design came from, not
 * only which one it happens to match exactly today.
 *
 * `showFilter` is off in the guided wizard's first step, where the next four
 * questions are the narrowing and a filter panel above them would be a second
 * way to answer the same thing.
 *
 * `shortlist` folds that same step to the curated walls — one per job a rep
 * starts from, covering every family — plus any wall this browser saved. The
 * questions are the guided reading's real narrowing, so its walls are the
 * common jobs rather than a catalogue a rep has to scroll before the first
 * question; the rest stay one tap away, and the expert reading is still the
 * whole list.
 *
 * A rep whose rooms repeat three walls can pin them there. A pin is a key on
 * the curated card, so the wall keeps following the shipped brief, and it only
 * reorders the rows: the pinned walls lead their family band and stay on screen
 * while the list is folded, which is the whole point of pinning the walls the
 * rep quotes every week. The expert reading offers no pin control and keeps the
 * catalogue's order, because its list is not folded and a pin there would
 * reorder a list nobody pinned from.
 */
export function VideowallStartPresets({ requirements, startedKey, showFilter = true, shortlist = false, onPick }: {
  /** The current answers, so the expert view can show which preset is active. */
  requirements?: WallRequirements;
  /** The card this design started on, when the page remembers one. */
  startedKey?: string | null;
  /** Off where the picker is one step of a wizard that already asks these. */
  showFilter?: boolean;
  /** The curated walls (plus saved ones), with the rest behind `Show all`. */
  shortlist?: boolean;
  onPick: (preset: WallStartPreset) => void;
}) {
  const saved = useWallStartingPoints();
  const pinned = usePinnedWallPresets();
  const pinnedKeys = new Set(pinned);
  // Pins order the guided step's shipped walls only — the expert reading is the
  // catalogue in the catalogue's order, and a pin there would reorder a list
  // that never offers one. A saved wall still leads its family, since it is the
  // rep's own brief rather than a catalogue wall they keep quoting.
  const orderedGroups = shortlist ? wallStartPresetGroupsWithPins(wallStartPresetGroups, pinned) : wallStartPresetGroups;
  const groups = saved.length ? wallStartPresetGroupsWithSaved(saved, orderedGroups) : orderedGroups;
  const savedKeys = new Set(saved.map((preset) => preset.key));
  const curatedKeys = new Set(wallStartPresetShortlist.map((preset) => preset.key));
  const [filter, setFilter] = useState<WallPresetFilter>(EMPTY_WALL_PRESET_FILTER);
  const [expanded, setExpanded] = useState(false);
  const allPresets = groups.flatMap((group) => group.presets);
  const options = wallPresetFilterOptions(allPresets);
  const visible = filterWallStartPresetGroups(groups, filter);
  const matches = wallPresetFilterCount(visible);
  const narrowed = wallPresetFilterIsSet(filter);
  // Folded to the curated walls. A saved wall stays too: it is the rep's own
  // starting point, so hiding it until they ask for the catalogue would hide
  // the wall they came back for. A pinned wall stays for the same reason, and
  // even if the curated set moves on without it — a pin a rep set is not the
  // catalogue's to withdraw.
  const folded = shortlist && !expanded;
  const foldedPresets = (group: { presets: WallStartPreset[] }) =>
    group.presets.filter(
      (preset) => curatedKeys.has(preset.key) || savedKeys.has(preset.key) || pinnedKeys.has(preset.key),
    );

  return (
    <div className="vw-preset-picker">
      {showFilter ? (
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
          <div className="vw-preset-filter-bar">
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
          </div>
          {narrowed ? (
            <p className="vw-preset-filter-note">
              A wall stays when it can show at least that many windows from at least that many sources, and runs on that
              connection or a simpler one.
            </p>
          ) : null}
        </section>
      ) : null}

      {visible.length ? (
        <div className="vw-preset-groups">
          {visible.map((group) => (
            <section key={group.family} className="vw-preset-group" aria-label={group.label}>
              <p className="vw-preset-group-label">
                {group.label}
                <span className="vw-preset-group-count">{group.presets.length}</span>
              </p>
              <ul className="vw-preset-list">
                {(folded ? foldedPresets(group) : group.presets).map((preset) => (
                  <VideowallStartPresetRow
                    key={preset.key}
                    preset={preset}
                    saved={savedKeys.has(preset.key)}
                    // Two different facts, so two marks: pressed means the answers
                    // still match this card exactly, started means this is the card
                    // they came from — which a changed answer does not undo.
                    started={Boolean(startedKey) && preset.key === startedKey}
                    pinned={pinnedKeys.has(preset.key)}
                    // Only the shortlist offers a pin: the expert reading's order
                    // is the catalogue's, so a pin there would reorder nothing.
                    pinnable={shortlist && curatedKeys.has(preset.key)}
                    pressed={requirements ? sameWall(requirements, preset.requirements) : null}
                    onPick={onPick}
                    onRemove={removeWallStartingPoint}
                    onTogglePin={togglePinnedWallPreset}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="vw-preset-empty" role="status" data-testid="videowall-preset-empty">
          <p>No wall carries that combination. Widen one filter to see the walls again.</p>
          <button type="button" onClick={() => setFilter(EMPTY_WALL_PRESET_FILTER)}>Clear filters</button>
        </div>
      )}

      {shortlist ? (
        <button
          type="button"
          className="vw-preset-more"
          data-testid="videowall-preset-show-all"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show fewer walls" : `Show all ${matches} walls`}
        </button>
      ) : null}
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
