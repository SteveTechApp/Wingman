import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readProductWorkspaceHandoff } from "@/wingman2/data/productWorkspaceHandoff";
import { buildProductPitchSalesGuidance } from "@/wingman2/lib/productPitchGuidance";
import type { ProductNarrative, ProductSpec } from "@/wingman2/lib/productStoryEngine";
import ProductPitchPage from "@/wingman2/pages/ProductPitchPage";

vi.mock("@/wingman2/lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockRejectedValue(new Error("offline test fallback")),
}));

vi.mock("@/wingman2/data/productMedia", () => ({
  loadProductMediaIndex: vi.fn().mockResolvedValue(null),
  getProductMediaBySku: vi.fn().mockReturnValue(null),
}));

function makeProduct(sku: string, overrides: Partial<ProductSpec> = {}): ProductSpec {
  return {
    sku,
    name: `${sku} product`,
    family: "WyreStorm",
    category: "AV product",
    productType: "AV product",
    description: "Product record for sales-guidance testing.",
    purpose: "Use only after the project requirement is qualified.",
    summary: "Confirm the complete system before quoting.",
    keyFeatures: [],
    applications: ["Commercial AV projects"],
    ioSummary: [],
    video: [],
    audio: [],
    usb: [],
    network: [],
    control: [],
    power: [],
    physical: [],
    checks: ["Confirm the exact product variant."],
    related: [],
    ...overrides,
  };
}

function makeNarrative(role: ProductNarrative["role"]): ProductNarrative {
  return {
    role,
    headline: "Qualified product direction",
    whatItIs: "A product whose exact role must be confirmed from the current record.",
    whereItSits: "Confirm the system position.",
    familyFit: "Confirm the product family.",
    customerChallenge: "The customer needs an AV requirement solved without unsupported assumptions.",
    whyItHelps: "It addresses the confirmed requirement.",
    whyCustomerCares: "The system must perform the required job.",
    useWhen: "Use when the requirement matches the product role.",
    avoidIf: "Avoid when the architecture is not confirmed.",
    suggestedWording: "This product may suit the requirement, subject to confirmation of the exact design.",
    demoPrompt: "Confirm the evaluation plan.",
    askNow: ["What is the required job?"],
    diagramSource: "Confirmed source",
    diagramOutput: "Confirmed destination",
    visualPrompt: "Show the product in a representative AV system.",
    confidence: "medium",
    reviewNote: "Check the current datasheet before quoting.",
  };
}

function guidanceText(guidance: ReturnType<typeof buildProductPitchSalesGuidance>): string {
  return Object.values(guidance).flat().join(" ");
}

describe("Product Pitch rendered workflow", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders a useful NDI camera story and writes product handoff evidence for the next workflow", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch?sku=CAM-210-NDI-PTZ"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "CAM-210-NDI-PTZ", level: 1 });

    await waitFor(() => {
      const handoff = readProductWorkspaceHandoff();
      expect(handoff?.sku).toBe("CAM-210-NDI-PTZ");
      expect(handoff?.headline.length).toBeGreaterThan(10);
      expect(handoff?.diagramSource.length).toBeGreaterThan(5);
      expect(handoff?.diagramOutput.length).toBeGreaterThan(5);
      expect(handoff?.visualPrompt.toLowerCase()).toContain("camera");
      expect(handoff?.checks.join(" ").toLowerCase()).toMatch(/ndi|camera|usb/);
    });

    [
      "What it does",
      "How it fits this application",
      "Say it like this",
      "Confirm this",
      "Customer problem it solves",
      "Best-fit applications",
      "Poor fit / avoid leading with this",
      "Discovery questions",
      "Quote checks",
      "What not to promise",
      "Attach / companion products",
      "Alternatives inside WyreStorm",
      "Customer-safe wording",
      "Internal sales notes",
    ].forEach((heading) => {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Sales Cards/i }));

    expect(await screen.findByText("Do not oversell")).toBeInTheDocument();
    expect(
      screen.getByText(/Do not promise unverified I\/O, distance, USB, network, audio or control behaviour until checked/i),
    ).toBeInTheDocument();
  });

  it("keeps named Product Pitch safety rules explicit without turning cautions into claims", () => {
    const multiview = buildProductPitchSalesGuidance(
      makeProduct("NHD-0401-MV", { productType: "HDMI multiview processor" }),
      makeNarrative("multiview"),
    );
    const networkHd100 = buildProductPitchSalesGuidance(
      makeProduct("NHD-150-RX", { family: "NetworkHD 100", productType: "AVoIP receiver" }),
      makeNarrative("avoip"),
    );
    const networkHd600 = buildProductPitchSalesGuidance(
      makeProduct("NHD-600-TRX", { family: "NetworkHD 600", productType: "10GbE SDVoE transceiver" }),
      makeNarrative("avoip"),
    );

    expect(multiview.productRole).toMatch(/multiview processor/i);
    expect(multiview.productRole).not.toMatch(/matrix replacement/i);
    expect(multiview.customerSafeWording).not.toMatch(/matrix replacement/i);
    expect(multiview.poorFitApplications.join(" ")).toMatch(/do not present.*matrix replacement/i);

    expect(networkHd100.productRole).toMatch(/inside a compatible NetworkHD 100 system/i);
    expect(networkHd100.productRole).not.toMatch(/standalone HDMI quad viewer/i);
    expect(networkHd100.doNotPromise.join(" ")).toMatch(/do not promise standalone HDMI multiview/i);

    expect(networkHd600.productRole).toMatch(/10GbE SDVoE/i);
    expect(networkHd600.poorFitApplications.join(" ")).toMatch(/do not lead.*simple, low-cost local switching/i);
    expect(networkHd600.quoteChecks.join(" ")).toMatch(/10GbE network design|10GbE switching/i);
  });

  it("removes banned filler and does not imply unsupported Teams certification for UC products", () => {
    const ucGuidance = buildProductPitchSalesGuidance(
      makeProduct("APO-TEST-UC", {
        family: "Apollo UC",
        productType: "BYOD and BYOM room product",
        summary: "A future-proof robust solution for a seamless experience.",
      }),
      makeNarrative("presentation"),
    );
    const allGuidance = guidanceText(ucGuidance);

    expect(allGuidance).not.toMatch(/robust solution|seamless experience|future-proof|best-in-class/i);
    expect(ucGuidance.customerSafeWording).not.toMatch(/Teams(?: Rooms?)? certified/i);
    expect(ucGuidance.doNotPromise.join(" ")).toMatch(/unless that certification is explicitly confirmed/i);
    expect(ucGuidance.discoveryQuestions.length).toBeGreaterThanOrEqual(5);
    expect(ucGuidance.confirmationQuestion).toMatch(/Is that correct\?/i);
    expect(ucGuidance.quoteChecks.length).toBeGreaterThan(0);
    expect(ucGuidance.alternatives.length).toBeGreaterThan(0);
    expect(ucGuidance.attachProducts.length).toBeGreaterThan(0);
  });

  it("applies saved room context and asks for one simple confirmation", () => {
    const guidance = buildProductPitchSalesGuidance(
      makeProduct("MX-TEST", { applications: ["Meeting rooms"] }),
      makeNarrative("matrix"),
      { roomType: "Sports bar", application: "Route live sport to each screen" },
    );

    expect(guidance.scenarioFit).toBe(
      "For Sports bar - Route live sport to each screen, use it to switch fixed sources to the required displays.",
    );
    expect(guidance.confirmationQuestion).toMatch(/^I'm treating this as Sports bar - Route live sport to each screen/);
    expect(guidance.confirmationQuestion).toMatch(/Is that correct\?$/);
    expect(guidance.discoveryQuestions.length).toBeGreaterThanOrEqual(5);
  });
});
