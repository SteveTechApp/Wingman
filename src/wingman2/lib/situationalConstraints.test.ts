import { describe, expect, it } from "vitest";

import {
  optionRelevance,
  suggestedDefaultOption,
  hasSituationalOpinion,
  optionUnlikelyReason,
  finderProductPathRelevance,
  opportunityFromLabel,
  type DiscoveryAnswers,
} from "./situationalConstraints";

const rel = (q: string, v: string, a: DiscoveryAnswers) => optionRelevance(q, v, a);

describe("situational option constraints", () => {
  it("has no opinion before any application is chosen", () => {
    expect(hasSituationalOpinion("displays", {})).toBe(false);
    expect(rel("displays", "one-display", {})).toBe("neutral");
    expect(rel("displays", "nine-plus-displays", {})).toBe("neutral");
  });

  it("a sports bar (hospitality) steers away from single-display, mirrored, single-source", () => {
    const a: DiscoveryAnswers = { opportunity: "hospitality" };
    // displays: single/dual are unlikely, many are recommended
    expect(rel("displays", "one-display", a)).toBe("unlikely");
    expect(rel("displays", "two-displays", a)).toBe("unlikely");
    expect(rel("displays", "three-eight-displays", a)).toBe("recommended");
    expect(rel("displays", "nine-plus-displays", a)).toBe("recommended");
    // behaviour: mirrored unlikely, independent routing recommended
    expect(rel("display-behaviour", "same-content-all-displays", a)).toBe("unlikely");
    expect(rel("display-behaviour", "independent-routing-per-display", a)).toBe("recommended");
    // sources: single source unlikely
    expect(rel("sources", "one-source", a)).toBe("unlikely");
    // scale: a single small room is unlikely
    expect(rel("scale", "single-small-room", a)).toBe("unlikely");
    // and a plain-language reason is available for a de-emphasised option
    expect(optionUnlikelyReason("displays", "one-display", a)).toMatch(/bar|venue|zones|screens/i);
  });

  it("an AV-over-IP design steers away from single source/display local jobs", () => {
    const a: DiscoveryAnswers = { opportunity: "av-over-ip" };
    expect(rel("sources", "one-source", a)).toBe("unlikely");
    expect(rel("displays", "one-display", a)).toBe("unlikely");
    expect(rel("scale", "single-small-room", a)).toBe("unlikely");
    expect(rel("display-behaviour", "independent-routing-per-display", a)).toBe("recommended");
    expect(rel("infrastructure", "managed-network", a)).toBe("recommended");
  });

  it("a meeting room steers away from many displays and video walls", () => {
    const a: DiscoveryAnswers = { opportunity: "meeting-room" };
    expect(rel("displays", "nine-plus-displays", a)).toBe("unlikely");
    expect(rel("displays", "video-wall-output", a)).toBe("unlikely");
    expect(rel("displays", "one-display", a)).toBe("recommended");
    expect(rel("sources", "nine-plus-sources", a)).toBe("unlikely");
    expect(rel("usb", "byod-byom", a)).toBe("recommended");
  });

  it("is cumulative: choosing one display makes independent routing impossible", () => {
    // Even in a hospitality job, if they then say there is only one display, routing
    // independently is no longer a sensible option.
    const a: DiscoveryAnswers = { opportunity: "hospitality", displays: "one-display" };
    expect(rel("display-behaviour", "independent-routing-per-display", a)).toBe("unlikely");
    expect(rel("display-behaviour", "same-content-all-displays", a)).toBe("recommended");
  });

  it("is cumulative: one source rules out multiview", () => {
    const a: DiscoveryAnswers = { opportunity: "video-wall", sources: "one-source" };
    expect(rel("display-behaviour", "multiview-on-one-output", a)).toBe("unlikely");
  });

  it("is cumulative: 9+ displays drops 'same content on all' regardless of application", () => {
    const a: DiscoveryAnswers = { opportunity: "not-sure", displays: "nine-plus-displays" };
    expect(rel("display-behaviour", "same-content-all-displays", a)).toBe("unlikely");
    expect(rel("scale", "single-small-room", a)).toBe("unlikely");
  });

  it("recommend wins over unlikely when rules disagree", () => {
    // video-wall application marks 'independent-routing' unlikely, but choosing the
    // video-wall-output display also recommends the wall/multiview behaviours - the
    // explicit recommend must win for those.
    const a: DiscoveryAnswers = { opportunity: "video-wall", displays: "video-wall-output" };
    expect(rel("display-behaviour", "video-wall-or-processor-feed", a)).toBe("recommended");
    expect(rel("display-behaviour", "multiview-on-one-output", a)).toBe("recommended");
  });

  it("offers a suggested default where the context is strong", () => {
    expect(suggestedDefaultOption("displays", { opportunity: "hospitality" })).toBe("three-eight-displays");
    expect(suggestedDefaultOption("display-behaviour", { opportunity: "hospitality" })).toBe("independent-routing-per-display");
    expect(suggestedDefaultOption("displays", { opportunity: "video-wall" })).toBe("video-wall-output");
    // no strong default before an application is chosen
    expect(suggestedDefaultOption("displays", {})).toBeUndefined();
  });
});

describe("finder architecture relevance", () => {
  it("maps a brief room-type label back to an opportunity", () => {
    expect(opportunityFromLabel("Hospitality / bar / venue")).toBe("hospitality");
    expect(opportunityFromLabel("Distributed AV / AV-over-IP")).toBe("av-over-ip");
    expect(opportunityFromLabel("A sports bar with lots of TVs")).toBe("hospitality");
    expect(opportunityFromLabel(undefined)).toBeUndefined();
  });

  it("steers Finder product paths to fit the captured application", () => {
    // Sports bar: matrix/AVoIP fit, presentation switcher and wireless do not.
    expect(finderProductPathRelevance("hospitality", "Matrix / routing")).toBe("recommended");
    expect(finderProductPathRelevance("hospitality", "AVoIP")).toBe("recommended");
    expect(finderProductPathRelevance("hospitality", "Presentation switcher")).toBe("unlikely");
    expect(finderProductPathRelevance("hospitality", "Wireless presentation")).toBe("unlikely");
    // AV-over-IP: AVoIP fit, single-room extenders do not.
    expect(finderProductPathRelevance("av-over-ip", "AVoIP")).toBe("recommended");
    expect(finderProductPathRelevance("av-over-ip", "HDBaseT extender")).toBe("unlikely");
    // Meeting room: presentation/UC fit, matrix/AVoIP do not.
    expect(finderProductPathRelevance("meeting-room", "Presentation switcher")).toBe("recommended");
    expect(finderProductPathRelevance("meeting-room", "AVoIP")).toBe("unlikely");
    // No application captured -> no opinion.
    expect(finderProductPathRelevance(undefined, "AVoIP")).toBe("neutral");
  });
});
