import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DatasetPlaceholder, isImportExportTab } from "./DataManagerPage";

describe("DatasetPlaceholder", () => {
  it("is rendered only for the Import / Export tab", () => {
    expect(isImportExportTab("Import / Export")).toBe(true);
    expect(isImportExportTab("Governed Profiles")).toBe(false);
  });

  it("returns to the governed profiles view when Cancel is selected", () => {
    const onCancel = vi.fn();

    render(<DatasetPlaceholder tab="Import / Export" records={[]} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
