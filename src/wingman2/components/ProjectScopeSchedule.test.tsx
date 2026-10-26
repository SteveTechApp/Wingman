import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectScopeSchedule } from "./ProjectScopeSchedule";
import { roomTemplates } from "../lib/roomTemplates";

afterEach(cleanup);
describe("functional room schedule", () => {
  it("leads with ALL, shows the section it is given and edits the original item", () => {
    const template = roomTemplates[0];
    const onQuantity = vi.fn();
    const onEdit = vi.fn();
    render(<ProjectScopeSchedule template={template} rows={template.bom} sectionId="inputs" library={null} onQuantity={onQuantity} onEdit={onEdit} onToggle={vi.fn()} onAdd={vi.fn()} />);
    expect((screen.getByRole("combobox", { name: "Schedule items" }) as HTMLSelectElement).value).toBe("all");
    expect(screen.getByRole("heading", { name: "Input sources" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Installation and engineering services" })).toBeNull();
    const input = template.bom.find(row => row.sku.startsWith("BY-OTHERS-SOURCE-"))!;
    fireEvent.change(screen.getByRole("spinbutton", { name: `Quantity for ${input.sku}` }), { target: { value: "3" } });
    expect(onQuantity).toHaveBeenCalledWith(input.id, 3);
    fireEvent.click(screen.getByRole("button", { name: `Edit ${input.description}` }));
    expect(onEdit).toHaveBeenCalledWith(input);
  });
  it("shows the section the page chose, not the first one", () => {
    const template = roomTemplates[0];
    render(<ProjectScopeSchedule template={template} rows={template.bom} sectionId="maintenance" library={null} onQuantity={vi.fn()} onEdit={vi.fn()} onToggle={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.queryByRole("heading", { name: "Input sources" })).toBeNull();
    const maintenance = screen.getByLabelText("Include Optional maintenance and support agreement") as HTMLInputElement;
    expect(maintenance.checked).toBe(false);
  });
});
