import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TemplateProposalPanel } from "../wingman2/components/TemplateProposalPanel";
import type { ExportValidationBlocker, ExportValidationResult } from "../wingman2/lib/proposalExportValidation";
import { roomTemplates } from "../wingman2/lib/roomTemplates";
import { templatePreIssueStageStorageKey } from "../wingman2/lib/templatePreIssuePass";
import { templateBomRows } from "../wingman2/lib/templateReviewProposal";

const template = { ...roomTemplates[0], validationItems: ["Confirm lift access", "Confirm screen size"] };
const bomRows = templateBomRows(template, template.bom);
const allowed: ExportValidationResult = { allowed: true, blockers: [], warnings: [], summary: "All technical checks passed" };
const blocker: ExportValidationBlocker = { id: "reach-long-run", domain: "reach", severity: "blocker", message: "Confirm the display run is within receiver range.", fix: "Measure or schedule a repeater." };
const blocked: ExportValidationResult = { allowed: false, blockers: [blocker], warnings: [], summary: "1 blocker" };

function AddressProbe() {
  const location = useLocation();
  return <output data-testid="address">{`${location.pathname}${location.search}`}</output>;
}

function panel(validation = allowed, entry = "/wingman/templates?tab=proposal") {
  const actions = { create: vi.fn(), export: vi.fn(), schedule: vi.fn(), saveProject: vi.fn(), saveTemplate: vi.fn() };
  const rendered = render(<MemoryRouter initialEntries={[entry]}>
    <TemplateProposalPanel template={template} validation={validation} readinessScore={72} surveyGaps={[]} onRecordSurveyDetail={null} onScheduleDisplayRunSpans={null} bomRows={bomRows} installation={null} onCreateProposal={actions.create} onExportProposal={actions.export} onExportSchedule={actions.schedule} onSaveProject={actions.saveProject} onSaveTemplate={actions.saveTemplate} />
    <AddressProbe />
  </MemoryRouter>);
  return { ...actions, unmount: rendered.unmount };
}

function visible(testId: string) { return !screen.getByTestId(testId).hasAttribute("hidden"); }

describe("template system proposal review", () => {
  beforeEach(() => window.localStorage.clear());

  it("opens on assumptions and shows the equipment quantities", () => {
    panel();
    expect(visible("template-preissue-panel-assumptions")).toBe(true);
    expect(visible("template-preissue-panel-blockers")).toBe(false);
    expect(screen.getByText("Confirm lift access")).toBeTruthy();
    expect(screen.getByText("Equipment schedule")).toBeTruthy();
    expect(screen.queryByText(/price|currency|rate card/i)).toBeNull();
  });

  it("opens technical blockers first and holds proposal actions until clear", () => {
    const actions = panel(blocked);
    expect(visible("template-preissue-panel-blockers")).toBe(true);
    expect(screen.getByRole("button", { name: "Create proposal" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export proposal" })).toBeDisabled();
    expect(screen.getByTestId("template-preissue-status").textContent).toContain("1 blocker must clear");
    expect(actions.create).not.toHaveBeenCalled();
  });

  it("moves through assumptions and issue while keeping equipment export available", () => {
    const actions = panel();
    fireEvent.click(screen.getByTestId("template-preissue-issue"));
    expect(visible("template-preissue-panel-issue")).toBe(true);
    expect(screen.getByTestId("template-preissue-issue-summary").textContent).toContain("2 assumptions labelled");
    fireEvent.click(screen.getByTestId("template-preissue-assumptions"));
    expect(visible("template-preissue-panel-assumptions")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Export equipment schedule" }));
    expect(actions.schedule).toHaveBeenCalledOnce();
  });

  it("writes and resumes the selected review stage", () => {
    const first = panel();
    fireEvent.click(screen.getByTestId("template-preissue-issue"));
    expect(window.localStorage.getItem(templatePreIssueStageStorageKey(template.id))).toBe("issue");
    first.unmount();
    window.localStorage.setItem(templatePreIssueStageStorageKey(template.id), "issue");
    render(<MemoryRouter initialEntries={["/wingman/templates?tab=proposal"]}>
      <TemplateProposalPanel template={template} validation={allowed} readinessScore={72} surveyGaps={[]} onRecordSurveyDetail={null} onScheduleDisplayRunSpans={null} bomRows={bomRows} installation={null} onCreateProposal={vi.fn()} onExportProposal={vi.fn()} onExportSchedule={vi.fn()} onSaveProject={vi.fn()} onSaveTemplate={vi.fn()} />
    </MemoryRouter>);
    expect(visible("template-preissue-panel-issue")).toBe(true);
  });
});
