import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiscoveryRoomWizard } from "./DiscoveryRoomWizard";
import { baseDiscoveryQuestions } from "./discoveryQuestions";
import { createBlankProjectTopology } from "../../lib/projectTopology";

const question = baseDiscoveryQuestions.find(row => row.id === "display-behaviour")!;
const props = () => ({ questions: [question], answers: {}, notes: {}, activeIndex: 0, onActiveIndexChange: vi.fn(), onAnswersChange: vi.fn(), onNotesChange: vi.fn(), onConfirm: vi.fn(), onConfirmCaptureSuggestion: vi.fn(), topology: createBlankProjectTopology(), onTopologyChange: vi.fn(), onSave: vi.fn(), onExport: vi.fn(), onComplete: vi.fn(), savedMessage: "", designDirection: "Local switching under review" });
describe("focused room wizard", () => {
  it("keeps uncertain answers open and advances without inventing a routing choice", () => {
    const callbacks = props();
    render(<DiscoveryRoomWizard {...callbacks} />);
    expect(screen.getByRole("heading", { name: "What should people see on each screen?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /I'm not sure/ }));
    const updater = callbacks.onAnswersChange.mock.calls[0][0];
    expect(updater({})).toMatchObject({ "display-behaviour": "unknown-display-behaviour" });
    expect(callbacks.onConfirm).toHaveBeenCalledWith("display-behaviour", false);
    expect(screen.getByRole("heading", { name: "What equipment do you already use?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Review room brief" }));
    fireEvent.click(screen.getByRole("button", { name: "Export completion brief" }));
    expect(callbacks.onExport).toHaveBeenCalled();
  });
});
