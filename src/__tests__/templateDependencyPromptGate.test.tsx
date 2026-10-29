import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { saveCustomRoomTemplate } from "../wingman2/lib/customRoomTemplates";
import type { TemplateBomRow } from "../wingman2/lib/roomTemplates";
import { roomTemplates } from "../wingman2/lib/roomTemplates";
import { TemplateReviewPage } from "../wingman2/pages/TemplateReviewPage";

/**
 * A stored template can carry a `TBC-` placeholder: one saved from a project
 * before a save stopped quoting another room's open question, or a store a rep
 * edited by hand. That placeholder reaches the template page's export gate, so
 * the page that holds the document is the page that has to be able to answer
 * it — the question has no catalogue part behind it, and the rep reading this
 * gate has no other screen to clear it on.
 */
function templateFromProject() {
  const bom: TemplateBomRow[] = [
    {
      id: "row-matrix",
      sku: "MX-0404-HDMI",
      description: "Presentation matrix",
      role: "Switching",
      qty: 1,
      type: "Required",
      status: "included",
      evidence: "Saved from project.",
      notes: "",
      scopeSection: "distribution",
    },
    {
      id: "row-network",
      sku: "TBC-AV-NETWORK",
      description: "AV network readiness",
      role: "Network infrastructure",
      qty: 1,
      type: "Validate",
      status: "validate",
      evidence: "Saved from project.",
      notes: "Dependency prompt requiring design validation.",
      scopeSection: "distribution",
    },
  ];
  return saveCustomRoomTemplate({
    id: "boardroom-from-project",
    name: "Boardroom saved from a project",
    vertical: "Corporate",
    application: "Meeting room / boardroom",
    scale: "12 seats",
    summary: "A boardroom room design reused from a finished project.",
    customerNarrative: "A boardroom room design reused from a finished project.",
    architecture: "Local matrix switching to a single display.",
    designNotes: [],
    assumptions: [],
    validationItems: ["Confirm the display height at survey."],
    upgradePaths: [],
    bom,
  });
}

function renderTemplate(templateId: string) {
  render(
    <MemoryRouter initialEntries={[`/wingman/templates/${templateId}`]}>
      <Routes>
        <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const exportAction = () => screen.getByRole("button", { name: "Export proposal" }) as HTMLButtonElement;

describe("template dependency prompt gate", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("holds the document on a placeholder the template inherited from a project", () => {
    const template = templateFromProject();
    renderTemplate(template.id);
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));

    expect(screen.getByText(/BOM row\(s\) are still placeholders \(TBC\)/)).toBeTruthy();
    expect(exportAction().disabled).toBe(true);
    // The action is offered here, where the blocker is read.
    expect(
      screen.getByRole("button", { name: "Record AV network readiness as a documented dependency" }),
    ).toBeTruthy();
    // The dependency the row stands for is named before the click, so the rep
    // knows which open question the decision is about.
    expect(document.querySelector('[data-dependency-scope-row="TBC-AV-NETWORK"]')?.textContent)
      .toContain("AV network readiness");
  });

  it("clears the block in one action and keeps the question with the document", () => {
    const template = templateFromProject();
    renderTemplate(template.id);
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));

    fireEvent.click(
      screen.getByRole("button", { name: "Record AV network readiness as a documented dependency" }),
    );

    // The document is released, and the block is gone rather than restated.
    expect(screen.queryByText(/BOM row\(s\) are still placeholders \(TBC\)/)).toBeNull();
    expect(exportAction().disabled).toBe(false);

    // The question survives the click: it joins the room's unresolved items,
    // which the proposal prints as an unverified assumption.
    const assumptions = within(screen.getByTestId("template-preissue-panel-assumptions"));
    expect(assumptions.getByText("AV network readiness")).toBeTruthy();
    expect(assumptions.getByText("Confirm the display height at survey.")).toBeTruthy();
  });

  it("takes the placeholder out of the schedule without hiding the line", () => {
    const template = templateFromProject();
    renderTemplate(template.id);
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Record AV network readiness as a documented dependency" }),
    );

    // The decision is visible on the schedule the decision was taken on: the row
    // is still there, and it is no longer quoted.
    fireEvent.click(screen.getByRole("tab", { name: /^Room design/ }));
    fireEvent.change(screen.getByLabelText("Room design step"), { target: { value: "schedule" } });
    fireEvent.click(screen.getByRole("tab", { name: /Distribution and switching/ }));

    expect((screen.getByLabelText("Include AV network readiness") as HTMLInputElement).checked).toBe(false);
    // The named part beside it is untouched.
    expect((screen.getByLabelText("Include Presentation matrix") as HTMLInputElement).checked).toBe(true);
  });

  it("offers no dependency action on a template that carries no placeholder", () => {
    renderTemplate(roomTemplates[0].id);
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));

    expect(document.querySelector("[data-dependency-scope-fix]")).toBeNull();
  });
});
