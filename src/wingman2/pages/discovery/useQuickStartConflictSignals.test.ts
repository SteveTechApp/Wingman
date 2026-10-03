// The seed provenance powers the application-drift flag (a quick-started room
// whose answers no longer belong to the current application's profile). These
// tests pin the caller-owned persistence contract: the hook reads the seed
// from its `seedProvenance` option, publishes new seeds through
// `onSeedProvenanceChange`, and never keeps its own copy — so a page that
// persists the published value (DiscoveryPage stores it in the discovery
// draft) keeps the drift flag alive across a page reload mid-session.
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  readQuickStartSeedRecord,
  useQuickStartConflictSignals,
} from "./useQuickStartConflictSignals";
import {
  baseDiscoveryQuestions,
  canonicalDiscoveryQuestions,
} from "./discoveryQuestions";
import { applyRoomTypeSmartDefaults } from "./discoveryQuickStart";
import { wmDiscoveryAnswerToText } from "./discoveryAnswerUtils";
import type { DiscoveryAnswers } from "./discoveryTypes";

const lectureHallSeed = applyRoomTypeSmartDefaults("lecture-hall", {});

function makeHarness(
  { seedProvenance = null }: { seedProvenance?: { application: string; answers: DiscoveryAnswers } | null } = {},
) {
  const onAppliedDefaultsChange = vi.fn();
  const onSeedProvenanceChange = vi.fn();
  const harness = renderHook(() =>
    useQuickStartConflictSignals({
      discoveryQuestions: canonicalDiscoveryQuestions,
      modeQuestions: baseDiscoveryQuestions,
      progressiveMode: "expert",
      answers: {},
      setAnswers: vi.fn(),
      appliedDefaults: {},
      onAppliedDefaultsChange,
      seedProvenance,
      onSeedProvenanceChange,
      setActiveIndex: vi.fn(),
      setIsReviewingAnswers: vi.fn(),
      setPendingEscalation: vi.fn(),
    }),
  );
  return { harness, onAppliedDefaultsChange, onSeedProvenanceChange };
}

describe("quick-start seed provenance persistence contract", () => {
  it("publishes the seed provenance when a quick start is applied", () => {
    const { harness, onSeedProvenanceChange } = makeHarness();
    act(() => {
      harness.result.current.applyQuickStartSeeded(lectureHallSeed);
    });
    expect(onSeedProvenanceChange).toHaveBeenCalledTimes(1);
    const published = onSeedProvenanceChange.mock.calls[0][0];
    expect(published.application).toBe(wmDiscoveryAnswerToText(lectureHallSeed.opportunity));
    expect(published.answers).toBe(lectureHallSeed);
  });

  it("derives drift from the injected seed, not hook-internal state (reload survival)", () => {
    // A page re-mounting after a reload passes the persisted seed back in;
    // the drift flag must come straight back to life.
    const seed = { application: "classroom", answers: lectureHallSeed };
    const sameApplication = makeHarness({ seedProvenance: seed });
    expect(sameApplication.harness.result.current.quickStartDrift).toBeNull();

    const drifted = renderHook(() =>
      useQuickStartConflictSignals({
        discoveryQuestions: canonicalDiscoveryQuestions,
        modeQuestions: baseDiscoveryQuestions,
        progressiveMode: "expert",
        answers: { ...lectureHallSeed, opportunity: "corporate" } as DiscoveryAnswers,
        setAnswers: vi.fn(),
        appliedDefaults: {},
        onAppliedDefaultsChange: vi.fn(),
        seedProvenance: seed,
        onSeedProvenanceChange: vi.fn(),
        setActiveIndex: vi.fn(),
        setIsReviewingAnswers: vi.fn(),
        setPendingEscalation: vi.fn(),
      }),
    );
    expect(drifted.result.current.quickStartDrift).not.toBeNull();
    expect(drifted.result.current.quickStartDrift?.previousApplication).toBe("classroom");
    expect(drifted.result.current.quickStartDrift?.application).toBe("corporate");
  });

  it("reports no drift when no seed provenance exists (never quick-started / fresh draft)", () => {
    const { harness } = makeHarness({ seedProvenance: null });
    expect(harness.result.current.quickStartDrift).toBeNull();
    expect(harness.result.current.strandedQuickStart).toEqual([]);
  });

  it("restores a persisted seed through the draft-record narrow and rejects junk", () => {
    const persisted = { application: "classroom", answers: lectureHallSeed };
    expect(readQuickStartSeedRecord(persisted)).toEqual(persisted);
    // Round-trip through JSON like the localStorage draft does.
    expect(readQuickStartSeedRecord(JSON.parse(JSON.stringify(persisted)))).toEqual(persisted);
    expect(readQuickStartSeedRecord(null)).toBeNull();
    expect(readQuickStartSeedRecord(undefined)).toBeNull();
    expect(readQuickStartSeedRecord("classroom")).toBeNull();
    expect(readQuickStartSeedRecord({ answers: {} })).toBeNull();
    expect(readQuickStartSeedRecord({ application: 42, answers: {} })).toBeNull();
    expect(readQuickStartSeedRecord([])).toBeNull();
  });
});

describe("removeQuickStartDrift", () => {
  function makeDriftHarness(answers: DiscoveryAnswers) {
    const setAnswers = vi.fn();
    const onAppliedDefaultsChange = vi.fn();
    const seedProvenance = {
      application: "hospitality",
      answers: {
        opportunity: "hospitality",
        sources: "five-eight-sources",
        displays: "three-eight-displays",
        "display-behaviour": "independent-routing-per-display",
      } as DiscoveryAnswers,
    };
    const harness = renderHook(() =>
      useQuickStartConflictSignals({
        discoveryQuestions: canonicalDiscoveryQuestions,
        modeQuestions: baseDiscoveryQuestions,
        progressiveMode: "expert",
        answers,
        setAnswers,
        appliedDefaults: { sources: "five-eight-sources", displays: "three-eight-displays" },
        onAppliedDefaultsChange,
        seedProvenance,
        onSeedProvenanceChange: vi.fn(),
        setActiveIndex: vi.fn(),
        setIsReviewingAnswers: vi.fn(),
        setPendingEscalation: vi.fn(),
      }),
    );
    return { harness, setAnswers, onAppliedDefaultsChange, seedProvenance };
  }

  it("clears untouched drifted answers and their provenance records", () => {
    const { harness, setAnswers, onAppliedDefaultsChange } = makeDriftHarness({
      opportunity: "classroom",
      sources: "five-eight-sources",
      displays: "three-eight-displays",
    });
    expect(harness.result.current.quickStartDrift).not.toBeNull();
    act(() => {
      harness.result.current.removeQuickStartDrift();
    });
    // Both drifted questions must be removed from the answers.
    const updater = setAnswers.mock.calls[0][0] as (previous: DiscoveryAnswers) => DiscoveryAnswers;
    const next = updater({ opportunity: "classroom", sources: "five-eight-sources", displays: "three-eight-displays" });
    expect(next.sources).toBeUndefined();
    expect(next.displays).toBeUndefined();
    expect(next.opportunity).toBe("classroom");
    // Provenance records for the removed questions are dropped (updater form).
    expect(onAppliedDefaultsChange).toHaveBeenCalledTimes(1);
    const record = onAppliedDefaultsChange.mock.calls[0][0] as Record<string, string | string[]>;
    expect(record.sources).toBeUndefined();
    expect(record.displays).toBeUndefined();
    expect(record["display-behaviour"]).toBeUndefined();
  });

  it("does nothing when there is no drift", () => {
    const { harness, setAnswers, onAppliedDefaultsChange } = makeDriftHarness({
      opportunity: "hospitality",
      sources: "five-eight-sources",
      displays: "three-eight-displays",
      "display-behaviour": "independent-routing-per-display",
    });
    expect(harness.result.current.quickStartDrift).toBeNull();
    act(() => {
      harness.result.current.removeQuickStartDrift();
    });
    expect(setAnswers).not.toHaveBeenCalled();
    expect(onAppliedDefaultsChange).not.toHaveBeenCalled();
  });
});
