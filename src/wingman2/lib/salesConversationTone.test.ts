import { describe, expect, it } from "vitest";

import {
  buildSalesConversationToneCopy,
  normalizeSalesConversationToneId,
  type SalesConversationContext,
} from "./salesConversationTone";

describe("sales conversation tone", () => {
  it.each([
    ["warm", "trade"],
    ["problem", "trade"],
    ["value", "user"],
    ["expert", "consultant"],
    ["handoff", "consultant"],
    ["user", "user"],
    ["unknown", "trade"],
    [undefined, "trade"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeSalesConversationToneId(input)).toBe(expected);
  });

  it.each<SalesConversationContext>([
    "salesHelper",
    "callCards",
    "discovery",
    "finder",
    "compare",
    "productPitch",
    "productFamilies",
    "templates",
    "videowall",
  ])("builds useful trade guidance for %s", (context) => {
    const copy = buildSalesConversationToneCopy(context, "trade");
    expect(copy.title).toBe("Frame the dealer or installer route.");
    expect(copy.opener).toContain("what would help the dealer");
    expect(copy.handoff).toContain("then move to");
  });

  it("builds distinct end-user and consultant guidance", () => {
    const user = buildSalesConversationToneCopy("templates", "user");
    const consultant = buildSalesConversationToneCopy("compare", "consultant");

    expect(user.title).toBe("Frame the user experience.");
    expect(user.opener).toContain("without thinking about the technology");
    expect(user.handoff).toContain("Template review or Proposal");
    expect(consultant.title).toBe("Frame the design logic.");
    expect(consultant.followUp).toContain("required I/O");
    expect(consultant.handoff).toContain("WyreStorm experts");
  });
});
