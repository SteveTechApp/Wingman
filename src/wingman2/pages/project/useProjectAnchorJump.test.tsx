import { render, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ProjectSectionId } from "../../lib/projectAnchors";
import { useProjectAnchorJump } from "./useProjectAnchorJump";

/**
 * A page shaped like the project page: one section on screen at a time, and a
 * panel that only exists while its section is.
 */
function Host({
  openSection,
  delayMs = 0,
  initialSection = "audit",
  withRow = false,
}: {
  openSection: (section: ProjectSectionId) => void;
  delayMs?: number;
  initialSection?: ProjectSectionId;
  /** A review panel that lists one row, like the survey photo review. */
  withRow?: boolean;
}) {
  const [section, setSection] = useState<ProjectSectionId>(initialSection);
  useProjectAnchorJump(section, (next) => {
    openSection(next);
    setSection(next);
  });
  const [shown, setShown] = useState(delayMs === 0);
  useEffect(() => {
    if (delayMs === 0) return;
    const timer = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);
  return (
    <div>
      <span data-testid="section">{section}</span>
      {section === "confirm" && shown ? (
        <section id="project-requirements" tabIndex={-1} aria-label="Requirements" />
      ) : null}
      {section === "confirm" && shown && withRow ? (
        <div id="wall-survey-review" tabIndex={-1} aria-label="Site survey photo review">
          <table>
            <tbody>
              <tr id="wall-survey-review-row-display-2">
                <th>Panel 2</th>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function renderHost(
  path: string,
  openSection: (section: ProjectSectionId) => void = vi.fn(),
  {
    delayMs = 0,
    initialSection = "audit",
    withRow = false,
  }: { delayMs?: number; initialSection?: ProjectSectionId; withRow?: boolean } = {},
) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Host openSection={openSection} delayMs={delayMs} initialSection={initialSection} withRow={withRow} />
    </MemoryRouter>,
  );
  return openSection;
}

describe("useProjectAnchorJump", () => {
  it("opens the section a panel anchor names and focuses the panel", async () => {
    const openSection = renderHost("/wingman/projects/p1?view=audit#project-requirements");

    expect(openSection).toHaveBeenCalledWith("confirm");
    await waitFor(() => expect(document.activeElement?.id).toBe("project-requirements"));
  });

  it("does not write the section the address already names", async () => {
    // The address and the link agree, so landing adds no history entry.
    const openSection = renderHost("/wingman/projects/p1?view=confirm#project-requirements", vi.fn(), {
      initialSection: "confirm",
    });

    await waitFor(() => expect(document.activeElement?.id).toBe("project-requirements"));
    expect(openSection).not.toHaveBeenCalled();
  });

  it("waits for a panel that renders after the address asks for it", async () => {
    // The panel can arrive with data the page is still loading; the landing is
    // held rather than dropped because the section rendered first.
    renderHost("/wingman/projects/p1?view=audit#project-requirements", vi.fn(), { delayMs: 20 });

    await waitFor(() => expect(document.activeElement?.id).toBe("project-requirements"));
  });

  /**
   * jsdom has no scrolling, so the landing's scroll is recorded by hand: which
   * element the hook asked to bring into view is the thing being tested.
   */
  function recordScrolls() {
    const scrolled: string[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoView(this: Element) {
      scrolled.push(this.id);
    };
    return {
      scrolled,
      restore() {
        if (original) Element.prototype.scrollIntoView = original;
        else delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
      },
    };
  }

  it("lands a row hash on the row, and puts focus in the panel that holds it", async () => {
    const scroll = recordScrolls();
    try {
      const openSection = renderHost("/wingman/projects/p1?view=audit#wall-survey-review-row-display-2", vi.fn(), {
        withRow: true,
      });

      await waitFor(() => expect(document.activeElement?.id).toBe("wall-survey-review"));
      // The row is what the reader is taken to; the panel is what takes focus,
      // because a table row cannot hold it.
      expect(scroll.scrolled.at(-1)).toBe("wall-survey-review-row-display-2");
      expect(openSection).toHaveBeenCalledWith("confirm");
    } finally {
      scroll.restore();
    }
  });

  it("lands on the panel when the row a hash named is gone", async () => {
    const scroll = recordScrolls();
    try {
      // The review was replaced since the link was copied: the panel is still
      // the right place to be, so the landing falls back rather than failing.
      const openSection = renderHost("/wingman/projects/p1?view=audit#wall-survey-review-row-display-9", vi.fn(), {
        withRow: true,
      });

      await waitFor(() => expect(document.activeElement?.id).toBe("wall-survey-review"));
      expect(scroll.scrolled.at(-1)).toBe("wall-survey-review");
      expect(openSection).toHaveBeenCalledWith("confirm");
    } finally {
      scroll.restore();
    }
  });

  it("leaves a hash it does not render alone", async () => {
    const openSection = renderHost("/wingman/projects/p1?view=audit#somewhere-else");

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(openSection).not.toHaveBeenCalled();
    expect(document.activeElement?.id ?? "").toBe("");
  });
});
