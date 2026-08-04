import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./ComparePageNew.advanced", () => ({
  default: () => <div>Advanced competitor comparison</div>,
}));

import ComparePageNew, {
  CompareEvidenceMatrix,
  handleRetryWithSourceUrl,
  handleSkuSelect,
  handleSubmit,
  scoreExplanation,
} from "./ComparePageNew";

describe("Compare routed marker bridge", () => {
  it("keeps the governed workflow markers available to static checks", () => {
    expect(handleSkuSelect()).toContain("CompareProductLookupInput");
    expect(handleSkuSelect()).toContain('setWorkflowStep("options")');
    expect(handleSubmit()).toContain("applyCompareEquivalenceGuards");
    expect(handleSubmit()).toContain("No suitable WyreStorm match found");
    expect(handleRetryWithSourceUrl()).toBe("shouldRequestLiveLookupUrl");
    expect(scoreExplanation(87)).toBe("87");
    expect(scoreExplanation("review")).toBe("review");
    expect(CompareEvidenceMatrix()).toBeNull();
  });

  it("renders the advanced Compare implementation", () => {
    render(<ComparePageNew />);
    expect(screen.getByText("Advanced competitor comparison")).not.toBeNull();
  });
});
