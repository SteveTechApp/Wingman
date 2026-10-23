import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProposalWallGate } from "./ProposalWallGate";
import { defaultWallRequirements } from "../lib/videowallOptions";
import { wallTransportPlan } from "../lib/videowallTransport";

it("hands the typed install cells to the wall only when the rep records them", () => {
  const onRecordDetail = vi.fn((_linkDetails: Record<string, { enclosure?: string; entry?: string; termination?: string }>) => true);
  render(<ProposalWallGate transport={null} survey={{ gaps: [{ id: "display-1", link: "Panel 1", group: "display", missing: ["enclosure", "termination"] }], text: "Survey incomplete" }} onRecordDetail={onRecordDetail} />);
  fireEvent.change(screen.getByLabelText("Display housing for Panel 1"), { target: { value: "Back box" } });
  fireEvent.change(screen.getByLabelText("Termination for Panel 1"), { target: { value: "HDMI plate" } });
  expect(onRecordDetail).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Record on the wall"));
  expect(onRecordDetail.mock.calls[0][0]).toEqual({
    "display-1": { enclosure: "Back box", termination: "HDMI plate" },
  });
});

it("points at the wall builder instead of offering cells no wall can take", () => {
  render(<ProposalWallGate transport={null} survey={{ gaps: [{ id: "display-1", link: "Panel 1", group: "display", missing: ["enclosure"] }], text: "Survey incomplete" }} />);
  expect(screen.queryByLabelText("Display housing for Panel 1")).toBeNull();
  expect(screen.queryByText("Record on the wall")).toBeNull();
  expect(screen.getByText(/Record the display housing, run entry and termination for each link/)).toBeTruthy();
});

it("offers a design update for an over-limit cable", () => {
  const requirements = { ...defaultWallRequirements, measuredRuns: { "display-1": 100 } };
  const plan = wallTransportPlan(requirements);
  const onSave = vi.fn();
  render(<ProposalWallGate transport={plan} survey={null} requirements={requirements} onRequirementsChange={onSave} />);
  fireEvent.click(screen.getAllByText("Use fibre extender")[0]);
  expect(wallTransportPlan(onSave.mock.calls[0][0]).counts.limit).toBe(0);
});
