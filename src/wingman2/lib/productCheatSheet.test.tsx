import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RoomSchematicDiagram } from "../components/RoomSchematicDiagram";
import { buildProductCheatSheetHtml } from "./productCheatSheet";
import type { ProductNarrative, ProductSpec } from "./productStoryEngine";
import { buildProductTopologyProfile } from "./productTopology";

const product: ProductSpec = {
  sku: "MX-TEST-01",
  name: "Meeting Room Matrix <Demo>",
  family: "Synergy & Control",
  category: "Video",
  productType: "Matrix switcher",
  description: "A representative test product.",
  purpose: "Route room sources.",
  summary: "Four sources to two displays.",
  keyFeatures: ["4K60 & HDR", "  Independent   outputs  ", "Not yet confirmed"],
  applications: ["Meeting rooms", "Training rooms"],
  ioSummary: ["4 HDMI inputs", "2 HDMI outputs"],
  video: ["4K60"],
  audio: ["HDMI audio"],
  usb: [],
  network: [],
  control: ["API"],
  power: ["AC"],
  physical: ["Rack mount"],
  checks: [],
  related: [],
};

const narrative: ProductNarrative = {
  role: "matrix",
  headline: "Simple room routing",
  whatItIs: "A compact matrix switcher.",
  whereItSits: "In the room rack.",
  familyFit: "The entry point in the matrix family.",
  customerChallenge: "Several sources must reach different displays.",
  whyItHelps: "It routes each source independently.",
  whyCustomerCares: "Users can change content without moving cables.",
  useWhen: "The room needs predictable source routing.",
  avoidIf: "The design requires AV-over-IP scale.",
  suggestedWording: "This gives each display the source it needs.",
  demoPrompt: "Show independent output switching.",
  askNow: ["How many independent displays?"],
  diagramSource: "Room sources",
  diagramOutput: "Displays",
  visualPrompt: "A meeting room.",
  confidence: "medium",
  reviewNote: "Confirm the current I/O before quoting.",
};

describe("buildProductCheatSheetHtml", () => {
  it("builds a self-contained, escaped sales sheet with review evidence", () => {
    const html = buildProductCheatSheetHtml({
      product,
      narrative,
      imageUrl: "https://example.test/product?a=1&b=2",
      generatedOn: "4 August 2026",
    });

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Meeting Room Matrix &lt;Demo&gt;");
    expect(html).toContain("https://example.test/product?a=1&amp;b=2");
    expect(html).toContain("Confirm the current I/O before quoting.");
    expect(html).toContain("How it relates to the rest of the family");
    expect(html).toContain("Generated 4 August 2026");
    expect(html).toContain("Independent outputs");
    expect(html).not.toContain("Not yet confirmed</li>");
    expect(html).toContain("Room connectivity");
  });

  it("renders safe fallbacks when optional evidence is absent", () => {
    const html = buildProductCheatSheetHtml({
      product: { ...product, keyFeatures: [], applications: [], checks: [] },
      narrative: { ...narrative, familyFit: "", confidence: "high", reviewNote: undefined },
    });

    expect(html).toContain("Product image not yet indexed");
    expect(html).toContain("To be confirmed from the current datasheet.");
    expect(html).not.toContain("How it relates to the rest of the family");
    expect(html).not.toContain('class="review');
  });
});

describe("RoomSchematicDiagram", () => {
  it("renders product-aware guidance and downloads the generated SVG", () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => "blob:room-schematic");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const linkClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<RoomSchematicDiagram product={product} narrative={narrative} />);

    expect(screen.getByRole("heading", { name: "Product-aware connectivity schematic" })).not.toBeNull();
    expect(screen.getByRole("img", { name: /MX-TEST-01 product-aware room schematic/i }).getAttribute("src"))
      .toContain("data:image/svg+xml");
    expect(screen.getByText("Checks before this diagram is used in a proposal")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Download diagram (SVG)" }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(linkClick).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:room-schematic");

    linkClick.mockRestore();
    vi.useRealTimers();
  });

  it.each([
    ["verified", "Verified topology"],
    ["review-required", "Review required"],
  ] as const)("labels %s topology evidence", (confidence, label) => {
    const profile = { ...buildProductTopologyProfile(product, narrative), confidence };
    render(<RoomSchematicDiagram product={product} narrative={narrative} profile={profile} />);
    expect(screen.getByText(label)).not.toBeNull();
  });
});
