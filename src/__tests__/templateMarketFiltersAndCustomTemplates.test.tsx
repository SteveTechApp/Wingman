import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import {
  getCustomRoomTemplates,
  saveCustomRoomTemplate,
  createBlankCustomRoomTemplate,
  CUSTOM_ROOM_TEMPLATE_SCHEMA_VERSION,
} from "@/wingman2/lib/customRoomTemplates";
import { roomTemplates } from "@/wingman2/lib/roomTemplates";
import { DiscoveryPage } from "@/wingman2/pages/DiscoveryPage";
import { TemplatesPage } from "@/wingman2/pages/TemplatesPage";
import { TemplateReviewPage } from "@/wingman2/pages/TemplateReviewPage";

const CUSTOM_ROOM_TEMPLATE_KEY = "wingman-custom-room-templates-v1";

function renderApp(initialPath = "/wingman/templates") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/wingman/templates" element={<TemplatesPage />} />
        <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
        <Route path="/wingman/discovery" element={<DiscoveryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function seedCorporateCustomTemplate() {
  const draft = createBlankCustomRoomTemplate({
    name: "Council Chamber Hybrid",
    vertical: "Corporate",
    application: "Meeting room / boardroom",
    scale: "Single large room",
    summary: "A hybrid council chamber meeting room.",
    discoveryAnswers: { opportunity: "meeting-room" },
    discoveryNotes: { opportunity: "Council chamber, hybrid meetings." },
  });

  return saveCustomRoomTemplate(draft);
}

describe("Templates market filters", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("shows all built-in and custom templates under the All filter, with the count reflecting the result", () => {
    seedCorporateCustomTemplate();
    renderApp();

    expect(screen.getByText(`${roomTemplates.length + 1} templates`)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Council Chamber Hybrid" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: roomTemplates[0].name })).toBeInTheDocument();
  });

  it("limits results to Corporate templates and updates the count when that filter is selected", () => {
    seedCorporateCustomTemplate();
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Corporate" }));

    const expectedCorporate = roomTemplates.filter((template) => template.vertical === "Corporate").length + 1;
    expect(screen.getByText(`${expectedCorporate} templates`)).toBeInTheDocument();

    // Every remaining card must actually be Corporate market.
    const badges = screen.getAllByText("Corporate", { selector: ".wm-badge" });
    expect(badges.length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: /Education Classroom/i })).not.toBeInTheDocument();
  });

  it("limits results to only user-created templates under the Custom filter", () => {
    seedCorporateCustomTemplate();
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));

    expect(screen.getByText("1 templates")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Council Chamber Hybrid" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: roomTemplates[0].name })).not.toBeInTheDocument();
  });

  it("built-in template cards offer no Edit or Delete actions", () => {
    renderApp();

    const card = screen.getByRole("heading", { name: roomTemplates[0].name }).closest("article");
    expect(card).not.toBeNull();
    expect(within(card!).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(within(card!).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});

describe("New Custom Template creation via Discovery", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("launches Discovery in template-creation mode from the Templates toolbar", () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "+ New Custom Template" }));

    expect(screen.getByText("Creating a new custom template")).toBeInTheDocument();
  });

  it("saves a valid custom template and shows it immediately in the library", () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "+ New Custom Template" }));

    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Divisible Training Room" } });
    fireEvent.click(screen.getByRole("button", { name: /Meeting room \/ boardroom/i }));

    fireEvent.click(screen.getByRole("button", { name: "Save Custom Template" }));

    const heading = screen.getByRole("heading", { name: "Divisible Training Room" });
    expect(heading).toBeInTheDocument();
    const card = heading.closest("article")!;
    expect(card.querySelector(".wm-template-custom-badge")).toHaveTextContent("Custom");

    const stored = getCustomRoomTemplates();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("Divisible Training Room");
    expect(stored[0].discoveryAnswers.opportunity).toBe("meeting-room");
  });

  it("requires a template name and application before Save Custom Template is enabled", () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "+ New Custom Template" }));

    expect(screen.getByRole("button", { name: "Save Custom Template" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Unfinished Room" } });
    expect(screen.getByRole("button", { name: "Save Custom Template" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Meeting room \/ boardroom/i }));
    expect(screen.getByRole("button", { name: "Save Custom Template" })).toBeEnabled();
  });
});

describe("Custom template edit, duplicate and delete", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("edits update the existing template instead of creating a second record", () => {
    const original = seedCorporateCustomTemplate();
    renderApp();

    const card = screen.getByRole("heading", { name: original.name }).closest("article");
    fireEvent.click(within(card!).getByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText("Template name")).toHaveValue(original.name);

    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Council Chamber Hybrid v2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Custom Template" }));

    const stored = getCustomRoomTemplates();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(original.id);
    expect(stored[0].name).toBe("Council Chamber Hybrid v2");
  });

  it("duplicates a template with a new stable ID and a Copy suffix", () => {
    const original = seedCorporateCustomTemplate();
    renderApp();

    const card = screen.getByRole("heading", { name: original.name }).closest("article");
    fireEvent.click(within(card!).getByRole("button", { name: "Duplicate" }));

    const stored = getCustomRoomTemplates();
    expect(stored).toHaveLength(2);
    const copy = stored.find((template) => template.id !== original.id);
    expect(copy).toBeDefined();
    expect(copy!.name).toBe(`${original.name} Copy`);
    expect(copy!.id).not.toBe(original.id);
  });

  it("requires confirmation before deleting a custom template", () => {
    const original = seedCorporateCustomTemplate();
    renderApp();

    const card = screen.getByRole("heading", { name: original.name }).closest("article");
    fireEvent.click(within(card!).getByRole("button", { name: "Delete" }));

    expect(getCustomRoomTemplates()).toHaveLength(1);
    expect(within(card!).getByRole("button", { name: "Confirm delete?" })).toBeInTheDocument();

    fireEvent.click(within(card!).getByRole("button", { name: "Keep template" }));
    expect(getCustomRoomTemplates()).toHaveLength(1);
    expect(within(card!).getByRole("button", { name: "Delete" })).toBeInTheDocument();

    fireEvent.click(within(card!).getByRole("button", { name: "Delete" }));
    fireEvent.click(within(card!).getByRole("button", { name: "Confirm delete?" }));
    expect(getCustomRoomTemplates()).toHaveLength(0);
  });
});

describe("Template-to-summary handoff", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("opens the editable BOM summary when a custom template is used", () => {
    const original = seedCorporateCustomTemplate();
    renderApp();

    const card = screen.getByRole("heading", { name: original.name }).closest("article");
    fireEvent.click(within(card!).getByRole("button", { name: "Use template" }));

    expect(screen.getByRole("heading", { name: original.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Equipment" })).toBeInTheDocument();
    expect(screen.queryByText(/Pre-populated from template:/)).not.toBeInTheDocument();
  });

  it("opens a built-in template summary without restarting Discovery", () => {
    renderApp();

    const template = roomTemplates[0];
    const card = screen.getByRole("heading", { name: template.name }).closest("article");
    fireEvent.click(within(card!).getByRole("button", { name: "Use template" }));

    expect(screen.getByRole("heading", { name: template.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to proposal" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /customer wording/i })).not.toBeInTheDocument();
  });
});

describe("Custom template persistence and normalisation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("survives a simulated reload by re-reading from localStorage", () => {
    const saved = seedCorporateCustomTemplate();

    // Simulate a browser restart: nothing but localStorage persists.
    const rawAfterReload = window.localStorage.getItem(CUSTOM_ROOM_TEMPLATE_KEY);
    expect(rawAfterReload).toContain(saved.id);

    const reloaded = getCustomRoomTemplates();
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].id).toBe(saved.id);
    expect(reloaded[0].schemaVersion).toBe(CUSTOM_ROOM_TEMPLATE_SCHEMA_VERSION);
  });

  it("normalises an older saved record that is missing newly added fields", () => {
    const legacyRecord = {
      id: "custom-legacy-room",
      name: "Legacy Room",
      vertical: "Corporate",
      application: "Old-style application",
      scale: "Custom",
      summary: "Saved before schemaVersion, discoveryAnswers and discoveryNotes existed.",
      customerNarrative: "Legacy narrative.",
      architecture: "Legacy architecture.",
      bom: [],
      designNotes: [],
      assumptions: [],
      validationItems: [],
      upgradePaths: [],
      customTemplate: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      // schemaVersion, discoveryAnswers, discoveryNotes intentionally omitted.
    };

    window.localStorage.setItem(CUSTOM_ROOM_TEMPLATE_KEY, JSON.stringify([legacyRecord]));

    const loaded = getCustomRoomTemplates();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].schemaVersion).toBe(1);
    expect(loaded[0].discoveryAnswers).toEqual({});
    expect(loaded[0].discoveryNotes).toEqual({});
    expect(loaded[0].name).toBe("Legacy Room");

    // And the page renders this legacy record without crashing.
    renderApp();
    expect(screen.getByRole("heading", { name: "Legacy Room" })).toBeInTheDocument();
  });
});
