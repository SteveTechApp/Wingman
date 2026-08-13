import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveProductSelectionToCurrentProject } from "@/wingman2/data/projectStore";
import { readProductWorkspaceHandoff, writeProductWorkspaceHandoff } from "@/wingman2/data/productWorkspaceHandoff";
import { loadProductIntelligenceIndex } from "@/wingman2/lib/productIntelligenceIndexCache";
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
    vi.mocked(loadProductIntelligenceIndex).mockReset();
    vi.mocked(loadProductIntelligenceIndex).mockRejectedValue(new Error("offline test fallback"));
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
      "The customer outcome",
      "Why it matters",
      "Best fit",
      "Top benefits",
    ].forEach((heading) => {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    });

    const technicalDetail = screen.getByText("Technical and quote detail").closest("details");
    expect(technicalDetail).not.toHaveAttribute("open");

    fireEvent.click(screen.getByRole("tab", { name: /^Features$/i }));

    expect(await screen.findByText("Confirm before promising")).toBeInTheDocument();
    expect(
      screen.getByText(/Is that correct\?/i),
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

  it("empty search does not render the general catalogue list", async () => {
    vi.mocked(loadProductIntelligenceIndex).mockResolvedValue({
      products: [
        makeProduct("MXV-0404-H2A-KIT", {
          name: "4x4 HDBaseT Matrix Kit",
          family: "MXV",
          category: "Matrix / HDBaseT",
          productType: "Matrix switcher",
          applications: ["Meeting room", "matrix switching"],
        }),
        makeProduct("CAB-HAOC-10M", {
          name: "Active optical HDMI cable",
          family: "Cables",
          category: "Cable",
          productType: "Cable",
        }),
        makeProduct("APO-COM-MIC", {
          name: "Apollo companion microphone",
          family: "Apollo",
          category: "Accessory",
          productType: "Companion microphone accessory",
        }),
      ],
    });

    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Suggested from current project")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /Product results/i })).not.toBeInTheDocument();
    expect(screen.queryByText("CAB-HAOC-10M")).not.toBeInTheDocument();
    expect(screen.queryByText("APO-COM-MIC")).not.toBeInTheDocument();
  });

  it("two-character search activates results while hiding cables and accessories by default", async () => {
    vi.mocked(loadProductIntelligenceIndex).mockResolvedValue({
      products: [
        makeProduct("MXV-0404-H2A-KIT", {
          name: "4x4 HDBaseT Matrix Kit",
          family: "MXV",
          category: "Matrix / HDBaseT",
          productType: "Matrix switcher",
          applications: ["Meeting room", "matrix switching"],
        }),
        makeProduct("CAB-HAOC-10M", {
          name: "Active optical HDMI cable",
          family: "Cables",
          category: "Cable",
          productType: "Cable",
        }),
        makeProduct("APO-COM-MIC", {
          name: "Apollo companion microphone",
          family: "Apollo",
          category: "Accessory",
          productType: "Companion microphone accessory",
        }),
      ],
    });

    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByRole("searchbox"), { target: { value: "MX" } });

    expect(await screen.findByRole("list", { name: /Product results/i })).toBeInTheDocument();
    expect(screen.getByText("MXV-0404-H2A-KIT")).toBeInTheDocument();
    expect(screen.queryByText("CAB-HAOC-10M")).not.toBeInTheDocument();
    expect(screen.queryByText("APO-COM-MIC")).not.toBeInTheDocument();
  });

  it("supports direct and partial SKU search with separated result metadata", async () => {
    vi.mocked(loadProductIntelligenceIndex).mockResolvedValue({
      products: [
        makeProduct("MXV-0404-H2A-KIT", {
          name: "4x4 HDBaseT Matrix Kit",
          family: "MXV",
          category: "Matrix / HDBaseT",
          productType: "Matrix switcher",
        }),
        makeProduct("NHD-600-TRXF", {
          name: "NetworkHD 600 Series Fiber Transceiver",
          family: "NetworkHD 600",
          category: "AVoIP",
          productType: "10GbE SDVoE fiber transceiver",
        }),
      ],
    });

    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    const search = await screen.findByRole("searchbox");
    fireEvent.change(search, { target: { value: "MXV-0404-H2A-KIT" } });

    const exactResult = await screen.findByRole("button", { name: /MXV-0404-H2A-KIT/i });
    expect(exactResult.querySelector(".wm-product-pitch-result-sku")).toHaveTextContent("MXV-0404-H2A-KIT");
    expect(exactResult.querySelector(".wm-product-pitch-result-name")).toHaveTextContent("4x4 HDBaseT Matrix Kit");
    expect(exactResult.querySelector(".wm-product-pitch-result-family")).toHaveTextContent("Matrix / HDBaseT / MXV");
    expect(exactResult.querySelector(".wm-product-pitch-result-status")).toHaveTextContent(/Active|Needs verification/i);
    expect(exactResult).not.toHaveTextContent(/SKU:|Name:|Category:|Status:/i);

    fireEvent.change(search, { target: { value: "600-TRXF" } });
    expect(await screen.findByRole("button", { name: /NHD-600-TRXF/i })).toBeInTheDocument();
  });

  it("renders project suggestions and recently viewed before general results", async () => {
    const projectProduct = makeProduct("CAM-210-NDI-PTZ", {
      name: "1080p60 PTZ Camera",
      family: "Camera",
      category: "NDI / camera",
      productType: "PTZ camera",
    });
    const recentProduct = makeProduct("NHD-600-TRXF", {
      name: "NetworkHD 600 Series Fiber Transceiver",
      family: "NetworkHD 600",
      category: "AVoIP",
      productType: "10GbE SDVoE fiber transceiver",
    });
    vi.mocked(loadProductIntelligenceIndex).mockResolvedValue({
      products: [
        projectProduct,
        recentProduct,
        makeProduct("SW-740-TX", {
          name: "Presentation Switcher",
          family: "Presentation",
          category: "Switching",
          productType: "Presentation switcher",
        }),
      ],
    });
    saveProductSelectionToCurrentProject({ sku: projectProduct.sku, title: projectProduct.name });
    writeProductWorkspaceHandoff(recentProduct, makeNarrative("avoip"));

    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    const suggested = await screen.findByRole("heading", { name: "Suggested from current project" });
    const recent = screen.getByRole("heading", { name: "Recently viewed" });
    expect(suggested.compareDocumentPosition(recent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Browse all/i }));

    const resultSuggested = await screen.findByRole("heading", { name: "Suggested from current project" });
    const resultRecent = screen.getByRole("heading", { name: "Recently viewed" });
    const results = await screen.findByRole("list", { name: /Product results/i });
    expect(resultSuggested.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(resultRecent.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not use discontinued products as current project suggestions but keeps them in recently viewed", async () => {
    const discontinued = makeProduct("SYN-TOUCH10", {
      name: "Legacy Touch Panel",
      family: "Synergy",
      category: "Control",
      productType: "Touch panel",
    });
    vi.mocked(loadProductIntelligenceIndex).mockResolvedValue({
      products: [discontinued],
    });
    saveProductSelectionToCurrentProject({ sku: discontinued.sku, title: discontinued.name });
    writeProductWorkspaceHandoff(discontinued, makeNarrative("general"));

    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    const suggestedPanel = (await screen.findByRole("heading", { name: "Suggested from current project" })).closest(".wm-ui-card");
    const recentPanel = screen.getByRole("heading", { name: "Recently viewed" }).closest(".wm-ui-card");

    expect(suggestedPanel).not.toHaveTextContent("SYN-TOUCH10");
    expect(recentPanel).toHaveTextContent("SYN-TOUCH10");
    expect(recentPanel).toHaveTextContent(/Discontinued/i);
  });

  it("opens the workspace when a result is selected and lets the rep change product", async () => {
    vi.mocked(loadProductIntelligenceIndex).mockResolvedValue({
      products: [
        makeProduct("NHD-600-TRXF", {
          name: "NetworkHD 600 Series Fiber Transceiver",
          family: "NetworkHD 600",
          category: "AVoIP",
          productType: "10GbE SDVoE fiber transceiver",
        }),
      ],
    });

    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByRole("searchbox"), { target: { value: "NHD" } });
    fireEvent.click(await screen.findByRole("button", { name: /NHD-600-TRXF/i }));

    expect(await screen.findByRole("heading", { name: "NHD-600-TRXF", level: 1 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Change product/i }));

    expect(await screen.findByRole("heading", { name: /Find the right product workspace/i })).toBeInTheDocument();
  });

  it("opens a supplied SKU directly without rendering the selector first", async () => {
    vi.mocked(loadProductIntelligenceIndex).mockResolvedValue({
      products: [
        makeProduct("NHD-600-TRXF", {
          name: "NetworkHD 600 Series Fiber Transceiver",
          family: "NetworkHD 600",
          category: "AVoIP",
          productType: "10GbE SDVoE fiber transceiver",
        }),
      ],
    });

    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch?sku=NHD-600-TRXF"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "NHD-600-TRXF", level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("limits initial rendered catalogue results and show more reveals additional products", async () => {
    vi.mocked(loadProductIntelligenceIndex).mockResolvedValue({
      products: Array.from({ length: 24 }, (_, index) => makeProduct(`MX-9${String(index).padStart(3, "0")}-SCL`, {
        name: `Matrix result ${index}`,
        family: "MX",
        category: "Matrix / routing",
        productType: "Matrix switcher",
        applications: ["matrix switching", "video distribution"],
      })),
    });

    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Browse all/i }));

    const results = screen.getByRole("list", { name: /Product results/i });
    expect(results.querySelectorAll(".wm-product-pitch-result-card")).toHaveLength(12);
    expect(screen.getByRole("button", { name: /Show more/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Show more/i }));

    expect(results.querySelectorAll(".wm-product-pitch-result-card")).toHaveLength(24);
  });
});
