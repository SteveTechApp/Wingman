import { describe, expect, it } from "vitest";
import {
  EXCLUSIVE_SCOPE_CONTRADICTIONS,
  evaluateDiscoveryDecisionIntegrity,
  exclusiveScopeValues,
} from "./discoveryDecisionIntegrity";
import { canonicalDiscoveryQuestions, getVisibleDiscoveryQuestions } from "../pages/discovery/discoveryQuestions";
import type { DiscoveryAnswers, DiscoveryQuestion } from "../pages/discovery/discoveryTypes";

const question = (id: string, required = true): DiscoveryQuestion => ({
  id,
  shortLabel: id,
  section: "Test",
  question: `What is the ${id}?`,
  prompt: "Choose",
  why: "Test",
  required,
  capturePlaceholder: "",
  options: [],
});

describe("evaluateDiscoveryDecisionIntegrity", () => {
  it("flags mutually exclusive UC answers", () => {
    const result = evaluateDiscoveryDecisionIntegrity(
      [question("uc-purpose")],
      { "uc-purpose": ["no-uc", "video-conferencing"] },
    );
    expect(result.contradictions[0]?.title).toBe("Conflicting communications scope");
    expect(result.canProceedToRecommendation).toBe(false);
  });

  it("flags a missing required answer and supplies a targeted question", () => {
    const result = evaluateDiscoveryDecisionIntegrity([question("signal-standard")], {}, {});
    expect(result.underspecified).toHaveLength(1);
    expect(result.underspecified[0]?.followUpQuestion).toContain("signal-standard");
    expect(result.canProceedToRecommendation).toBe(false);
  });

  it("allows a complete, internally consistent answer set", () => {
    const result = evaluateDiscoveryDecisionIntegrity(
      [question("usb"), question("display-behaviour")],
      { usb: ["no-usb"], "display-behaviour": ["same-content-all-displays"] },
    );
    expect(result.issues).toEqual([]);
    expect(result.canProceedToRecommendation).toBe(true);
  });

  it("flags one display paired with independent per-display routing", () => {
    const result = evaluateDiscoveryDecisionIntegrity([], {
      displays: "one-display",
      "display-behaviour": ["independent-routing-per-display"],
    });
    expect(result.contradictions).toHaveLength(1);
    expect(result.contradictions[0]?.questionIds).toEqual(["displays", "display-behaviour"]);
    expect(result.contradictions[0]?.title).toBe("Display count contradicts display behaviour");
    expect(result.canProceedToRecommendation).toBe(false);
  });

  it("flags one display paired with a video-wall processor feed", () => {
    const result = evaluateDiscoveryDecisionIntegrity([], {
      displays: "one-display",
      "display-behaviour": ["video-wall-or-processor-feed"],
    });
    expect(result.contradictions).toHaveLength(1);
    expect(result.canProceedToRecommendation).toBe(false);
  });

  it("allows the legitimate single-display behaviours", () => {
    // Multiview on the single output stays visible in the interview for a
    // one-display room, so it must not be flagged as a contradiction.
    for (const behaviour of ["same-content-all-displays", "multiview-on-one-output"]) {
      const result = evaluateDiscoveryDecisionIntegrity([], {
        displays: "one-display",
        "display-behaviour": [behaviour],
      });
      expect(result.contradictions, behaviour).toEqual([]);
      expect(result.canProceedToRecommendation).toBe(true);
    }
  });

  it("allows independent routing once the room has more than one display", () => {
    const result = evaluateDiscoveryDecisionIntegrity([], {
      displays: "two-displays",
      "display-behaviour": ["independent-routing-per-display"],
    });
    expect(result.contradictions).toEqual([]);
    expect(result.canProceedToRecommendation).toBe(true);
  });

  it("flags a quick-start default the interview hides after a later answer", () => {
    // Lecture hall seeds independent routing; answering one display hides that
    // option. The full visible set exposes the strand as a distinct issue.
    const answers: DiscoveryAnswers = {
      opportunity: "classroom",
      displays: "one-display",
      "display-behaviour": "independent-routing-per-display",
    };
    const visible = getVisibleDiscoveryQuestions("classroom", answers);
    const result = evaluateDiscoveryDecisionIntegrity(visible, answers);

    expect(result.stranded).toHaveLength(1);
    expect(result.stranded[0]?.kind).toBe("stranded");
    expect(result.stranded[0]?.questionIds).toEqual(["display-behaviour"]);
    expect(result.stranded[0]?.title).toBe("Pre-filled Display behaviour answer no longer fits");
    expect(result.canProceedToRecommendation).toBe(false);
  });

  it("names a rep-typed stranded answer as the rep's own, not a quick-start default", () => {
    // Provenance decides the wording: when the recorded applied default no
    // longer matches the stored value, the strand is the rep's own answer and
    // must not be described as a leftover quick-start pre-fill.
    const answers: DiscoveryAnswers = {
      opportunity: "classroom",
      displays: "one-display",
      "display-behaviour": "video-wall-or-processor-feed",
    };
    const visible = getVisibleDiscoveryQuestions("classroom", answers);
    const appliedDefaults: DiscoveryAnswers = {
      opportunity: "classroom",
      displays: "two-displays",
      "display-behaviour": "independent-routing-per-display",
    };
    const result = evaluateDiscoveryDecisionIntegrity(visible, answers, {}, visible, appliedDefaults);

    expect(result.stranded).toHaveLength(1);
    expect(result.stranded[0]?.title).toBe("Display behaviour answer no longer fits");
    expect(result.stranded[0]?.detail).toContain("Video wall or LED processor feed");
    expect(result.stranded[0]?.detail).not.toContain("quick-start");
    expect(result.canProceedToRecommendation).toBe(false);
  });

  it("flags a hidden option that is NOT a known contradiction, so the class earns its keep", () => {
    // A multi-camera NDI path is viewed only when an NDI camera is present; a
    // fixed USB camera hides it while the stored answer still names it. No
    // existing contradiction rule covers this pair — only the stranded check.
    const answers: DiscoveryAnswers = {
      opportunity: "meeting-room",
      "uc-purpose": ["video-conferencing"],
      "uc-camera": ["fixed-usb-camera"],
      "uc-camera-count": "two-cameras",
      "uc-multi-camera-path": "multi-camera-ndi",
    };
    const visible = getVisibleDiscoveryQuestions("meeting-room", answers);
    const result = evaluateDiscoveryDecisionIntegrity(visible, answers);

    expect(result.contradictions).toEqual([]);
    expect(result.stranded).toHaveLength(1);
    expect(result.stranded[0]?.questionIds).toEqual(["uc-multi-camera-path"]);
    expect(result.canProceedToRecommendation).toBe(false);
  });

  it("keeps a visible option clean even when the owning question is outside the current mode", () => {
    // Basic mode gates integrity on its six questions, but a strand on an
    // expert-level question must still block quote safety when the FULL
    // visible set is supplied as the stranded scan source.
    const answers: DiscoveryAnswers = {
      opportunity: "meeting-room",
      "uc-purpose": ["video-conferencing"],
      "uc-camera": ["fixed-usb-camera"],
      "uc-camera-count": "two-cameras",
      "uc-multi-camera-path": "multi-camera-ndi",
    };
    const visible = getVisibleDiscoveryQuestions("meeting-room", answers);
    const basicOnly = visible.filter((step) => step.id === "opportunity" || step.id === "displays");
    const result = evaluateDiscoveryDecisionIntegrity(basicOnly, answers, {}, visible);

    expect(result.stranded).toHaveLength(1);
    expect(result.canProceedToRecommendation).toBe(false);
    // The mode-limited question scan alone would have missed it.
    expect(evaluateDiscoveryDecisionIntegrity(basicOnly, answers).stranded).toEqual([]);
  });

  it("produces no strand when the stored option is still visible", () => {
    const answers: DiscoveryAnswers = {
      opportunity: "meeting-room",
      "uc-purpose": ["video-conferencing"],
      "uc-camera": ["ndi-network-camera"],
      "uc-camera-count": "two-cameras",
      "uc-multi-camera-path": "multi-camera-ndi",
    };
    const visible = getVisibleDiscoveryQuestions("meeting-room", answers);
    const result = evaluateDiscoveryDecisionIntegrity(visible, answers);
    // The NDI path stays visible, so no strand — other integrity classes may
    // still flag the (intentionally sparse) answer set, which is correct.
    expect(result.stranded).toEqual([]);
    expect(result.contradictions).toEqual([]);
  });
});

describe("exclusive-scope contradiction rules stay keyed to live exclusiveValues", () => {
  const stepFor = (questionId: string) => canonicalDiscoveryQuestions.find((question) => question.id === questionId)!;

  it("every rule's question declares at least one exclusive of the rule's scope", () => {
    // A renamed exclusive flows into the check automatically, but a REMOVED
    // one would silently disable the rule (no trigger values). This pin fails
    // the moment a rule has no live trigger in its question's exclusiveValues.
    const dead: string[] = [];
    for (const rule of EXCLUSIVE_SCOPE_CONTRADICTIONS) {
      if (exclusiveScopeValues(rule.questionId, rule.scope).length === 0) {
        dead.push(`${rule.questionId} (${rule.scope})`);
      }
    }
    expect(dead).toEqual([]);
  });

  it("every canonical exclusiveValues entry still resolves to an option value", () => {
    const dangling: string[] = [];
    for (const step of canonicalDiscoveryQuestions) {
      const optionValues = new Set(step.options.map((option) => option.value));
      for (const exclusive of step.exclusiveValues ?? []) {
        if (!optionValues.has(exclusive)) {
          dangling.push(`${step.id}: exclusiveValues "${exclusive}" is not an option`);
        }
      }
    }
    expect(dangling).toEqual([]);
  });

  it("each rule still fires when its live exclusive is combined with a concrete value", () => {
    // Behavioral smoke test built from the CANONICAL option set: if the
    // data-driven loop regresses, or a rule references a question the evaluator
    // can no longer resolve, the expected contradiction disappears.
    for (const rule of EXCLUSIVE_SCOPE_CONTRADICTIONS) {
      const step = stepFor(rule.questionId);
      const exclusives = new Set(step.exclusiveValues ?? []);
      const trigger = exclusiveScopeValues(rule.questionId, rule.scope)[0];
      const concrete = step.options.find((option) => !exclusives.has(option.value))!.value;
      const result = evaluateDiscoveryDecisionIntegrity([], {
        [rule.questionId]: [trigger, concrete],
      } as DiscoveryAnswers);
      expect(
        result.contradictions.map((issue) => issue.title),
        `${rule.questionId} (${rule.scope}) should flag "${trigger}" + "${concrete}"`,
      ).toContain(rule.title);
    }
  });

  it("a rule never fires for the exclusive value alone", () => {
    // Guard against over-firing: the exclusive by itself is a legitimate
    // (if sparse) answer and must not be flagged as contradictory.
    for (const rule of EXCLUSIVE_SCOPE_CONTRADICTIONS) {
      const trigger = exclusiveScopeValues(rule.questionId, rule.scope)[0];
      const result = evaluateDiscoveryDecisionIntegrity([], {
        [rule.questionId]: [trigger],
      } as DiscoveryAnswers);
      expect(
        result.contradictions.some((issue) => issue.title === rule.title),
        `${rule.questionId}: exclusive alone must not fire "${rule.title}"`,
      ).toBe(false);
    }
  });
});
