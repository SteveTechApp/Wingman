import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RequirementAnswerInput } from "./RequirementAnswerInput";
import { getFullDiscoveryOptions } from "../discovery/discoveryQuestions";
import type { StoredRequirementRecord } from "../../data/projectStore";
function Editor({ value = "Not confirmed" }: { value?: string }) {
  const [item, setItem] = useState<StoredRequirementRecord>({ id: "display-count", label: "Display/output count", value, status: "unknown", category: "Displays", source: "Discovery", whyItMatters: "", updatedAt: "2026-10-05" });
  return <RequirementAnswerInput item={item} onUpdate={(_, patch) => setItem({ ...item, ...patch })} />;
}
describe("Requirement answer choices", () => {
  it("uses the original Discovery options and supports switching to custom and back", () => {
    render(<Editor />);
    const choice = getFullDiscoveryOptions("displays")[0];
    const dropdown = screen.getByRole("combobox", { name: "Display/output count" });
    expect(screen.getByRole("option", { name: choice.label })).toBeTruthy();
    fireEvent.change(dropdown, { target: { value: choice.value } });
    expect((dropdown as HTMLSelectElement).value).toBe(choice.value);
    fireEvent.change(dropdown, { target: { value: "__custom" } });
    const input = screen.getByRole("textbox", { name: "Custom answer for Display/output count" });
    fireEvent.change(input, { target: { value: "Six portrait displays" } });
    expect((input as HTMLTextAreaElement).value).toBe("Six portrait displays");
    fireEvent.change(dropdown, { target: { value: choice.value } });
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it("preserves existing custom answers", () => {
    render(<Editor value="Six portrait displays" />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Six portrait displays");
  });
});
