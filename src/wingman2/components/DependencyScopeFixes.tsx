import { useState } from "react";
import type { DependencyPrompt } from "../lib/dependencyScope";

/**
 * The one-tap answer for a dependency prompt the quotation cannot carry.
 *
 * A `TBC-` dependency is an open question with no catalogue part behind it, so
 * the export holds until someone decides what the document says about it. The
 * gate is where the rep sees that, so the decision is offered here rather than
 * in another workflow: recording a prompt keeps its question in the document's
 * dependency list and takes the unpriced line out of the BOM.
 *
 * Each prompt is its own button, named after the dependency. These are separate
 * scope decisions — one room can leave the network to the customer's IT and
 * still have to choose the endpoints itself — so a single "clear all" would
 * record answers nobody gave.
 *
 * Both surfaces that carry a prompt render this: the completion wizard's export
 * gate, where the blocker is read, and the project record, where the response
 * itself is read. They pass the same rows, so one place cannot offer a decision
 * the other would not. A template's own export gate mounts it too, with a
 * sentence of its own: the decision there is kept where that document prints it.
 */
export function DependencyScopeFixes({
  dependencies,
  onRecord,
  explanation = " A dependency prompt has no catalogue part behind it, so it cannot be priced. Recording one keeps the question in the document's dependencies and takes the unpriced line out of the quotation.",
}: {
  /** The prompts still carried as BOM placeholders. */
  dependencies: readonly DependencyPrompt[];
  /** Records one as a documented dependency; false when the project could not take it. */
  onRecord: (sku: string) => boolean;
  /** What recording one does on this surface, in that surface's own terms. */
  explanation?: string;
}) {
  const [message, setMessage] = useState("");
  if (!dependencies.length) return null;

  function record(sku: string) {
    setMessage(
      onRecord(sku)
        ? ""
        : "This project could not be updated here; record the dependency on the project instead.",
    );
  }

  return (
    <div className="mt-3 grid gap-2 col-span-full" data-dependency-scope-fix="true">
      <p className="wm-proposal-validation-fix">{explanation}</p>
      {dependencies.map((dependency) => (
        <div
          key={dependency.sku}
          className="flex flex-wrap items-center gap-2"
          data-dependency-scope-row={dependency.sku}
        >
          <span className="wm-proposal-validation-message">{dependency.label}</span>
          {dependency.question ? (
            <span className="wm-proposal-validation-fix">{dependency.question}</span>
          ) : null}
          <button
            type="button"
            className="wm-ui-button wm-ui-button-secondary"
            onClick={() => record(dependency.sku)}
          >
            Record {dependency.label} as a documented dependency
          </button>
        </div>
      ))}
      {message ? (
        <p role="status" className="wm-proposal-validation-fix" data-testid="dependency-scope-fix-status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
