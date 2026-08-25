/**
 * CompareInputs — Manufacturer selection and SKU lookup components.
 *
 * Extracted from ComparePageNew.advanced.tsx for maintainability.
 * These are the two input controls at the top of the Compare page.
 */
import { useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uniqueSkuOptions(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const upper = value.toUpperCase();
    if (!seen.has(upper)) {
      seen.add(upper);
      result.push(value);
    }
  }
  return result;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompareInputsProps = {
  brands: string[];
  selectedBrand: string;
  skuValue: string;
  knownSkus: string[];
  suggestions: string[];
  onBrandSelect: (brand: string) => void;
  onSkuInputChange: (value: string) => void;
  onSkuSelect: (sku: string) => void;
};

// ─── ManufacturerCombobox ─────────────────────────────────────────────────────

function CompareManufacturerCombobox(props: {
  brands: string[];
  selectedBrand: string;
  onBrandSelect: (brand: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = props.selectedBrand.trim().toLowerCase();
  const visibleBrands = props.brands
    .filter((brand) => !query || brand.toLowerCase().includes(query));

  const chooseBrand = (brand: string): void => {
    props.onBrandSelect(brand);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <section className="wm-ui-card p-4 compare-inline-combobox-field" data-wingman-inline-combobox="manufacturer">
      <label className="compare-native-label wm-ui-kicker" htmlFor="compare-manufacturer">Manufacturer</label>
      <div className="compare-inline-combobox">
        <input
          id="compare-manufacturer"
          className="compare-native-input wm-ui-input"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open && visibleBrands.length > 0}
          aria-controls="compare-manufacturer-options"
          value={props.selectedBrand}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            props.onBrandSelect(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.min(current + 1, Math.max(visibleBrands.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && activeIndex >= 0 && visibleBrands[activeIndex]) {
              event.preventDefault();
              chooseBrand(visibleBrands[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder="Type competitor manufacturer"
          autoComplete="off"
        />
        {open && visibleBrands.length > 0 ? (
          <div id="compare-manufacturer-options" className="compare-inline-options" role="listbox" aria-label="Manufacturer suggestions">
            {visibleBrands.map((brand, index) => (
              <button
                key={brand}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`compare-inline-option${index === activeIndex ? " is-active" : ""}`}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseBrand(brand)}
              >
                {brand}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─── ProductLookupInput ───────────────────────────────────────────────────────

function CompareProductLookupInput(props: {
  value: string;
  knownSkus: string[];
  suggestions: string[];
  onInputChange: (value: string) => void;
  onSkuSelect: (sku: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const options = uniqueSkuOptions([...props.knownSkus, ...props.suggestions]).slice(0, 120);
  const query = props.value.trim().toUpperCase();
  const visibleOptions = options
    .filter((skuOption) => !query || skuOption.toUpperCase().includes(query));

  const chooseSku = (sku: string): void => {
    props.onInputChange(sku);
    setOpen(false);
    setActiveIndex(-1);
    props.onSkuSelect(sku);
  };

  return (
    <section className="wm-ui-card p-4 compare-inline-combobox-field" data-wingman-inline-combobox="sku">
      <label className="compare-native-label wm-ui-kicker" htmlFor="compare-sku-input">Competitor product</label>
      <div className="compare-inline-combobox">
        <input
          id="compare-sku-input"
          className="compare-native-input wm-ui-input"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open && visibleOptions.length > 0}
          aria-controls="compare-sku-options"
          value={props.value}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            props.onInputChange(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.min(current + 1, Math.max(visibleOptions.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && activeIndex >= 0 && visibleOptions[activeIndex]) {
              event.preventDefault();
              chooseSku(visibleOptions[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder="Type or select a competitor SKU"
          autoComplete="off"
          data-wingman-compare-auto-advance="true"
        />
        {open && visibleOptions.length > 0 ? (
          <div id="compare-sku-options" className="compare-inline-options" role="listbox" aria-label="SKU suggestions">
            {visibleOptions.slice(0, 50).map((sku, index) => (
              <button
                key={sku}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`compare-inline-option${index === activeIndex ? " is-active" : ""}`}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSku(sku)}
              >
                {sku}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─── Combined Export ──────────────────────────────────────────────────────────

export function CompareInputs({
  brands,
  selectedBrand,
  skuValue,
  knownSkus,
  suggestions,
  onBrandSelect,
  onSkuInputChange,
  onSkuSelect,
}: CompareInputsProps) {
  return (
    <div className="compare-inputs" data-wingman-compare-inputs="true">
      <CompareManufacturerCombobox
        brands={brands}
        selectedBrand={selectedBrand}
        onBrandSelect={onBrandSelect}
      />
      <CompareProductLookupInput
        value={skuValue}
        knownSkus={knownSkus}
        suggestions={suggestions}
        onInputChange={onSkuInputChange}
        onSkuSelect={onSkuSelect}
      />
    </div>
  );
}

export { CompareManufacturerCombobox, CompareProductLookupInput };
