import { fireEvent, render, screen } from "@testing-library/react";
import { useMemo, useState } from "react";
import { describe, expect, it } from "vitest";

import {
  CompareManufacturerCombobox,
  CompareProductLookupInput,
  type CompareSelectOption,
} from "./CompareControls";

const options: CompareSelectOption[] = [
  { value: "Crestron", label: "Crestron" },
  { value: "Extron", label: "Extron" },
];

function CompareControlsHarness() {
  const [brand, setBrand] = useState("Crestron");
  const [sku, setSku] = useState("");
  const [selectedSku, setSelectedSku] = useState("");

  const suggestions = useMemo(
    () => (brand === "Crestron" ? ["DM-NVX-350", "DM-NVX-360"] : ["NAV E 121", "NAV D 121"]),
    [brand],
  );

  return (
    <div>
      <CompareManufacturerCombobox value={brand} options={options} onChange={setBrand} />
      <CompareProductLookupInput
        value={sku}
        suggestions={suggestions.filter((item) => item.toLowerCase().includes(sku.toLowerCase()))}
        onChange={setSku}
        onSelectSuggestion={setSelectedSku}
        placeholder="Search competitor products"
      />
      <output data-testid="brand-value">{brand}</output>
      <output data-testid="selected-sku">{selectedSku}</output>
    </div>
  );
}

describe("Compare controls", () => {
  it("renders custom combobox controls and applies suggestion selection without native select or datalist elements", () => {
    const { container } = render(<CompareControlsHarness />);

    expect(container.querySelector("select")).toBeNull();
    expect(container.querySelector("datalist")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /choose competitor manufacturer/i }));
    fireEvent.click(screen.getByRole("option", { name: "Extron" }));

    expect(screen.getByTestId("brand-value").textContent).toBe("Extron");

    const input = screen.getByRole("combobox", { name: /competitor product/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "NAV" } });

    expect(screen.getByRole("listbox", { name: /competitor sku suggestions/i })).not.toBeNull();

    fireEvent.click(screen.getByRole("option", { name: "NAV E 121" }));

    expect(screen.getByDisplayValue("NAV E 121")).not.toBeNull();
    expect(screen.getByTestId("selected-sku").textContent).toBe("NAV E 121");
  });
});
