import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const page = readFileSync(resolve(root, "src/wingman2/pages/ComparePageNew.advanced.tsx"), "utf8");
const css = readFileSync(resolve(root, "src/wingman2/styles/wingman-workflow-theme.css"), "utf8");

describe("Compare inline dropdown contract", () => {
  it("keeps manufacturer and SKU option menus inside the Wingman DOM", () => {
    expect(page).toContain('data-wingman-inline-combobox="manufacturer"');
    expect(page).toContain('data-wingman-inline-combobox="sku"');
    expect(page).toContain('role="combobox"');
    expect(page).toContain('role="listbox"');
    expect(page).toContain('role="option"');

    expect(page).not.toContain('list="compare-manufacturer-options"');
    expect(page).not.toContain('list="compare-competitor-sku-options"');
    expect(page).not.toContain('<datalist id="compare-manufacturer-options">');
    expect(page).not.toContain('<datalist id="compare-competitor-sku-options">');
  });

  it("does not truncate manufacturer or SKU suggestions to the first few entries", () => {
    expect(page).not.toMatch(/visibleBrands[\s\S]{0,180}\.slice\(0,\s*(12|14)\)/);
    expect(page).not.toMatch(/visibleOptions[\s\S]{0,180}\.slice\(0,\s*(12|14)\)/);
  });

  it("keeps the dropdown compact and internally scrollable", () => {
    expect(css).toContain("WINGMAN_COMPARE_INLINE_DROPDOWNS_V3");
    expect(css).toContain('data-wingman-inline-combobox="manufacturer"');
    expect(css).toContain("width: min(440px, 100%)");
    expect(css).toContain('data-wingman-inline-combobox="sku"');
    expect(css).toContain("width: 100%");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(css).toContain("max-height: min(520px, 58vh)");
    expect(css).toContain("max-height: min(300px, 38vh)");
    expect(css).toContain("overflow-y: auto");
  });
});
