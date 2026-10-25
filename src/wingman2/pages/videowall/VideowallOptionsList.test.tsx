import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { decideVideowall } from "../../lib/videowallDecision";
import {
  assessVideowallOptions,
  defaultWallRequirements,
  type WallOption,
  type WallRequirements,
} from "../../lib/videowallOptions";
import { wallOptionWithVariant } from "../../lib/wallVariants";
import { VideowallOptionsList } from "./VideowallOptionsList";

/** The page owns the design and the build; the harness does the same. */
function Harness({ requirements = defaultWallRequirements }: { requirements?: WallRequirements }) {
  const options = assessVideowallOptions(requirements);
  const decision = decideVideowall(requirements);
  const [selectedId, setSelectedId] = useState("nhd500");
  const [variantId, setVariantId] = useState("");
  const chosen: WallOption | null = options.find((option) => option.id === selectedId) ?? null;
  return (
    <VideowallOptionsList
      decision={decision}
      options={options}
      selected={chosen ? wallOptionWithVariant(chosen, variantId) : null}
      recommendedId={decision.recommended?.option.id ?? null}
      variantId={variantId}
      onSelect={(id) => {
        setSelectedId(id);
        setVariantId("");
      }}
      onVariant={setVariantId}
    />
  );
}

describe("VideowallOptionsList", () => {
  it("lists every design the answers were tested against, the recommendation first", () => {
    const options = assessVideowallOptions(defaultWallRequirements);
    const decision = decideVideowall(defaultWallRequirements);
    render(<Harness />);

    const rows = screen.getByRole("group", { name: "WyreStorm architecture options" }).children;
    expect(rows).toHaveLength(options.length);
    expect(rows[0].textContent).toContain(decision.recommended?.option.title ?? "");
    expect(screen.getByTestId("videowall-option-nhd600")).toBeTruthy();
  });

  it("keeps the range key on screen, saying what each range is for", () => {
    render(<Harness />);

    const key = screen.getByRole("list", { name: "Product ranges" });
    expect(key.textContent).toContain("500 series");
    expect(key.textContent).toContain("600 series");
    // The reason a range exists, in the room's terms rather than a SKU.
    expect(key.textContent).toContain("4K60 4:4:4");
  });

  it("offers the 500 as the full or Lite pair and follows the choice", () => {
    render(<Harness />);

    const full = screen.getByTestId("videowall-build-base");
    const lite = screen.getByTestId("videowall-build-lite");
    expect(full.getAttribute("aria-pressed")).toBe("true");
    expect(lite.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(lite);

    expect(screen.getByTestId("videowall-build-lite").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("videowall-builds").textContent).toContain("NHD-500-E-TX/RX");
  });

  it("gives a design that ships one way no build chips", () => {
    render(<Harness />);

    fireEvent.click(screen.getByTestId("videowall-option-mx-0404-scl"));

    expect(screen.queryByTestId("videowall-builds")).toBeNull();
  });
});
