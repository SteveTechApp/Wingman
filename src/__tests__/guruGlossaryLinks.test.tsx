import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { GlossaryPage } from "../wingman2/pages/GlossaryPage";
import { renderGuruGlossaryLinks } from "../wingman2/pages/ProductCallCardsPage";
import {
  GLOSSARY_HIGHLIGHTS_CHANGE_EVENT,
  GLOSSARY_HIGHLIGHTS_STORAGE_KEY,
  readGlossaryHighlightsEnabled,
  writeGlossaryHighlightsEnabled,
} from "../wingman2/lib/glossaryHighlightPreference";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("Guru glossary keyword links", () => {
  it("links the highlighted sales terms to their canonical glossary entries", () => {
    render(
      <MemoryRouter>
        <p>
          {renderGuruGlossaryLinks("HDBaseT multiview HDCP EDID 4:4:4 HDR CEC")}
        </p>
      </MemoryRouter>,
    );

    const expectedTargets: Record<string, string> = {
      HDBaseT: "hdbaset",
      multiview: "multiview",
      HDCP: "hdcp",
      EDID: "edid",
      "4:4:4": "four-four-four",
      HDR: "hdr",
      CEC: "cec",
    };

    for (const [label, termId] of Object.entries(expectedTargets)) {
      expect(screen.getByText(label, { exact: true }).closest("a"))
        .toHaveAttribute("href", `/wingman/glossary?term=${termId}`);
    }
  });

  it("returns normal prose when highlighting is disabled", () => {
    render(
      <MemoryRouter>
        <p>{renderGuruGlossaryLinks("Confirm HDBaseT and EDID handling.", false)}</p>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Confirm HDBaseT and EDID handling.")).toBeInTheDocument();
  });

  it("opens a deep-linked glossary term", () => {
    render(
      <MemoryRouter initialEntries={["/wingman/glossary?term=hdbaset"]}>
        <GlossaryPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "HDBaseT", level: 2 })).toBeInTheDocument();
  });

  it("stores and broadcasts the shared highlight preference", () => {
    let changedTo: boolean | undefined;
    window.addEventListener(GLOSSARY_HIGHLIGHTS_CHANGE_EVENT, ((event: CustomEvent<boolean>) => {
      changedTo = event.detail;
    }) as EventListener, { once: true });

    writeGlossaryHighlightsEnabled(false);

    expect(window.localStorage.getItem(GLOSSARY_HIGHLIGHTS_STORAGE_KEY)).toBe("false");
    expect(readGlossaryHighlightsEnabled()).toBe(false);
    expect(changedTo).toBe(false);
  });
});
