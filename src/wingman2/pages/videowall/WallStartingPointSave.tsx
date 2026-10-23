import { useEffect, useState } from "react";
import { saveWallStartingPoint } from "../../lib/wallStartingPoints";
import type { WallRequirements } from "../../lib/videowallOptions";

/**
 * Saves the wall the rep is looking at as a starting point. The picker reads the
 * same store, so the card is already beside the shipped walls when they return
 * to it; a wall with no recommendation cannot be kept as a starting point.
 */
export function SaveWallStartingPoint({ requirements, disabled, label }: {
  requirements: WallRequirements;
  disabled?: boolean;
  label: string;
}) {
  const [note, setNote] = useState("");
  // Changing an answer makes an earlier confirmation describe a wall that is no
  // longer on screen.
  useEffect(() => {
    setNote("");
  }, [requirements]);

  return (
    <>
      <button
        type="button"
        data-testid="videowall-save-starting-point"
        disabled={disabled}
        onClick={() => {
          saveWallStartingPoint(requirements);
          setNote("Saved as a starting point. It now sits beside the shipped walls.");
        }}
      >
        {label}
      </button>
      {note ? <p role="status">{note}</p> : null}
    </>
  );
}
