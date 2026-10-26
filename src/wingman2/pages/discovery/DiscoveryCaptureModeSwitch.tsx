import { useId } from "react";
import { LayoutGrid, ListChecks } from "lucide-react";

// Room builder and Detailed questions are two readings of the same room, so
// they are offered as two cards in the capture language rather than a pair of
// buttons: each carries its own tile, name and the one line that says how it
// reads. The voice interview below is the third way in and already announces
// itself as a card, so this sits beside it instead of above a divider.
export type DiscoveryCaptureMode = "room-builder" | "detailed" | null;

const CAPTURE_MODES = [
  {
    id: "room-builder" as const,
    label: "Room builder",
    detail: "One section at a time, with the room summary kept alongside",
    icon: LayoutGrid,
    testId: "discovery-room-builder-toggle",
  },
  {
    id: "detailed" as const,
    label: "Detailed questions",
    detail: "The full question set in long form, on one page",
    icon: ListChecks,
    testId: "discovery-detailed-toggle",
  },
];

export function DiscoveryCaptureModeSwitch({
  active,
  onSelect,
}: {
  /** The reading on screen, or null while the essential or voice capture is open. */
  active: DiscoveryCaptureMode;
  onSelect: (mode: Exclude<DiscoveryCaptureMode, null>) => void;
}) {
  const id = useId();
  return (
    <div className="wm-capture-mode" role="group" aria-label="Room capture mode" data-capture-mode={active ?? "none"}>
      {CAPTURE_MODES.map((mode) => {
        const Icon = mode.icon;
        const detailId = `${id}-${mode.id}-detail`;
        return (
          <button
            key={mode.id}
            type="button"
            className="wm-capture-mode-option"
            // The card carries the sentence under its name, so the name alone is
            // the label and the sentence is the description: a caller asking for
            // the button by name still gets "Room builder", not the whole card.
            aria-label={mode.label}
            aria-describedby={detailId}
            aria-pressed={active === mode.id}
            onClick={() => onSelect(mode.id)}
            data-testid={mode.testId}
          >
            <span className="wm-capture-mode-icon" aria-hidden="true"><Icon /></span>
            <span className="wm-capture-mode-copy">
              <strong aria-hidden="true">{mode.label}</strong>
              <small id={detailId}>{mode.detail}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
