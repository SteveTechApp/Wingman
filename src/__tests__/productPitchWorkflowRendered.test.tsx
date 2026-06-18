import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readProductWorkspaceHandoff } from "@/wingman2/data/productWorkspaceHandoff";
import ProductPitchPage from "@/wingman2/pages/ProductPitchPage";

vi.mock("@/wingman2/lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockRejectedValue(new Error("offline test fallback")),
}));

vi.mock("@/wingman2/data/productMedia", () => ({
  loadProductMediaIndex: vi.fn().mockResolvedValue(null),
  getProductMediaBySku: vi.fn().mockReturnValue(null),
}));

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

    fireEvent.click(screen.getByRole("button", { name: /Sales Cards/i }));

    expect(await screen.findByText("Do not oversell")).toBeInTheDocument();
    expect(
      screen.getByText(/Do not promise unverified I\/O, distance, USB, network, audio or control behaviour until checked/i),
    ).toBeInTheDocument();
  });
});
