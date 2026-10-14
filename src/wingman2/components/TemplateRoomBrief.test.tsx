import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TemplateRoomBrief, TemplateDesignReview } from "./TemplateRoomBrief";
import { roomTemplates, type RoomTemplate } from "../lib/roomTemplates";
import { buildTemplateProject } from "../lib/templateReviewProposal";
import { getCustomRoomTemplates, saveRoomTemplateCopy } from "../lib/customRoomTemplates";

afterEach(cleanup);
describe("room review data flow", () => {
  it("carries edited requirements, physical room and evidence-backed checks into saved output", () => {
    window.localStorage.clear();
    let latest = { ...roomTemplates[0], validationItems: ["Confirm room access"] };
    function Harness() {
      const [template, setTemplate] = useState<RoomTemplate>(latest);
      latest = template;
      const update = (patch: Partial<RoomTemplate>) => setTemplate(current => ({ ...current, ...patch }));
      return <><TemplateRoomBrief template={template} onChange={update} /><TemplateDesignReview template={template} onChange={update} /></>;
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Edit room brief" }));
    fireEvent.change(screen.getByLabelText("Customer requirement and room use"), { target: { value: "Visitors share content locally; no remote calls are required." } });
    fireEvent.change(screen.getByLabelText("Room dimensions and layout"), { target: { value: "Surveyed 5m by 4m meeting room" } });
    expect((screen.getByRole("button", { name: "Record confirmation" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Confirmation evidence"), { target: { value: "Site survey 6 October: approved access route" } });
    fireEvent.click(screen.getByRole("button", { name: "Record confirmation" }));
    expect(screen.getByRole("heading", { name: "0 checks remaining" })).toBeTruthy();
    const adjustedRows = latest.bom.map(row => row.sku.startsWith("BY-OTHERS-SOURCE-") ? { ...row, qty: 3 } : row);
    const proposal = buildTemplateProject(latest, adjustedRows).proposal!;
    expect(proposal.summary).toContain("Visitors share content locally");
    expect(proposal.applicationProposal?.customerNeed).toContain("Visitors share content locally");
    expect(proposal.applicationProposal?.technicalFacts).toContain("Room dimensions and layout: Surveyed 5m by 4m meeting room");
    expect(proposal.governanceWarnings).toEqual([]);
    expect(proposal.validationNotes?.join(" ")).toContain("Site survey 6 October");
    expect(proposal.validationNotes?.find(note => note.startsWith("Source schedule:"))).toContain("3 ×");
    saveRoomTemplateCopy(latest, latest.bom);
    const restored = getCustomRoomTemplates()[0];
    expect(restored.validationItems).toEqual([]);
    expect(restored.customerNarrative).toBe(latest.customerNarrative);
    expect(restored.concept?.environment).toBe("Surveyed 5m by 4m meeting room");
    fireEvent.click(screen.getByRole("button", { name: "Reopen check" }));
    expect(screen.getByRole("heading", { name: "1 checks remaining" })).toBeTruthy();
  });
});
