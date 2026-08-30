import { describe, expect, it } from "vitest";
import {
  applicationFromLegacyState,
  legacyStateToDiscoveryAnswers,
  legacyStateToDiscoveryNotes,
} from "./workflowHandoff";

describe("legacyStateToDiscoveryAnswers", () => {
  it("returns an empty answers object for empty state", () => {
    const answers = legacyStateToDiscoveryAnswers({});
    expect(Object.keys(answers)).toHaveLength(0);
  });

  it("maps outcome to the opportunity answer", () => {
    const answers = legacyStateToDiscoveryAnswers({ outcome: "Boardroom Teams room" });
    expect(answers.opportunity).toBe("Boardroom Teams room");
  });

  it("maps roomType to the scale answer", () => {
    const answers = legacyStateToDiscoveryAnswers({ roomType: "Large boardroom" });
    expect(answers.scale).toBe("Large boardroom");
  });

  it("maps device list to source count and source-device-workflows", () => {
    const answers = legacyStateToDiscoveryAnswers({
      devices: ["Laptop HDMI", "Room PC", "Signage player"],
    });
    expect(answers.sources).toBeDefined();
    expect(answers["source-device-workflows"]).toEqual(["Laptop HDMI", "Room PC", "Signage player"]);
  });

  it("filters microphones and speakers from source count but keeps NDI cameras", () => {
    const answers = legacyStateToDiscoveryAnswers({
      devices: ["Laptop HDMI", "Ceiling microphone", "NDI camera", "Table speaker"],
    });
    // Laptop HDMI (keep) + NDI camera (kept: camera matches but ndi also matches) = 2 sources
    // Ceiling microphone filtered (/microphone/), Table speaker filtered (/speaker/)
    expect(answers.sources).toBe("2");
  });

  it("maps technicalTags to source-connection", () => {
    const answers = legacyStateToDiscoveryAnswers({
      technicalTags: ["HDMI", "USB-C"],
    });
    expect(answers["source-connection"]).toEqual(["HDMI", "USB-C"]);
  });

  it("maps displayCount to displays", () => {
    const answers = legacyStateToDiscoveryAnswers({ displayCount: "2 displays" });
    expect(answers.displays).toBe("2 displays");
  });

  it("maps displayBehaviour to display-behaviour", () => {
    const answers = legacyStateToDiscoveryAnswers({ displayBehaviour: "Different content per display" });
    expect(answers["display-behaviour"]).toBe("Different content per display");
  });

  it("maps cableRun to locations-connections", () => {
    const answers = legacyStateToDiscoveryAnswers({ cableRun: "15 metres" });
    expect(answers["locations-connections"]).toBe("15 metres");
  });

  it("maps controlNeeds to control", () => {
    const answers = legacyStateToDiscoveryAnswers({ controlNeeds: ["Touch panel", "Third-party"] });
    expect(answers.control).toEqual(["Touch panel", "Third-party"]);
  });

  it("falls back to network for locations-connections when cableRun is absent", () => {
    const answers = legacyStateToDiscoveryAnswers({ network: "Existing LAN" });
    expect(answers["locations-connections"]).toBe("Existing LAN");
  });

  it("does not overwrite locations-connections from cableRun with network", () => {
    const answers = legacyStateToDiscoveryAnswers({ cableRun: "15m", network: "Existing LAN" });
    expect(answers["locations-connections"]).toBe("15m");
  });

  it("maps a full legacy state into multiple answers", () => {
    const answers = legacyStateToDiscoveryAnswers({
      outcome: "Hospitality bar TV distribution",
      roomType: "Sports bar",
      devices: ["Sky box", "Signage player", "HDMI laptop"],
      technicalTags: ["HDMI", "Cat6"],
      displayCount: "6 displays",
      displayBehaviour: "Independent routing per display",
      cableRun: "35 metres",
      controlNeeds: ["IR"],
      network: "Managed switch",
    });
    expect(answers.opportunity).toBe("Hospitality bar TV distribution");
    expect(answers.scale).toBe("Sports bar");
    expect(answers["source-device-workflows"]).toEqual(["Sky box", "Signage player", "HDMI laptop"]);
    expect(answers["source-connection"]).toEqual(["HDMI", "Cat6"]);
    expect(answers.displays).toBe("6 displays");
    expect(answers["display-behaviour"]).toBe("Independent routing per display");
    expect(answers["locations-connections"]).toBe("35 metres");
    expect(answers.control).toEqual(["IR"]);
  });

  it("treats empty-string values as absent", () => {
    const answers = legacyStateToDiscoveryAnswers({ outcome: "", devices: [], displayCount: "" });
    expect(Object.keys(answers)).toHaveLength(0);
  });

  it("handles non-array devices gracefully", () => {
    const answers = legacyStateToDiscoveryAnswers({ devices: "Two laptops" });
    // list() returns [] for non-array, so sources should not be set
    expect(answers.sources).toBeUndefined();
  });
});

describe("legacyStateToDiscoveryNotes", () => {
  it("returns an empty notes object for empty state", () => {
    const notes = legacyStateToDiscoveryNotes({});
    expect(Object.keys(notes)).toHaveLength(0);
  });

  it("maps state.notes to the opportunity note", () => {
    const notes = legacyStateToDiscoveryNotes({ notes: "Customer wants dual-screen Teams" });
    expect(notes.opportunity).toBe("Customer wants dual-screen Teams");
  });

  it("ignores whitespace-only notes", () => {
    const notes = legacyStateToDiscoveryNotes({ notes: "   " });
    expect(Object.keys(notes)).toHaveLength(0);
  });

  it("does not set notes for non-opportunity fields", () => {
    const notes = legacyStateToDiscoveryNotes({ outcome: "Meeting room", roomType: "Small" });
    expect(Object.keys(notes)).toHaveLength(0);
  });
});

describe("applicationFromLegacyState", () => {
  it("returns not-sure for empty state", () => {
    expect(applicationFromLegacyState({})).toBe("not-sure");
  });

  it("detects video-wall from outcome", () => {
    expect(applicationFromLegacyState({ outcome: "Video wall for reception" })).toBe("video-wall");
  });

  it("detects video-wall from roomType", () => {
    expect(applicationFromLegacyState({ roomType: "LED signage wall" })).toBe("video-wall");
  });

  it("detects av-over-ip from outcome", () => {
    expect(applicationFromLegacyState({ outcome: "Distributed video across campus" })).toBe("av-over-ip");
  });

  it("detects av-over-ip from roomType mentioning NetworkHD", () => {
    expect(applicationFromLegacyState({ roomType: "NetworkHD multi-room" })).toBe("av-over-ip");
  });

  it("detects classroom from outcome", () => {
    expect(applicationFromLegacyState({ outcome: "Teaching space with lectern" })).toBe("classroom");
  });

  it("detects classroom from roomType", () => {
    expect(applicationFromLegacyState({ roomType: "Lecture theatre" })).toBe("classroom");
  });

  it("detects hospitality from outcome", () => {
    expect(applicationFromLegacyState({ outcome: "Sports bar TV distribution" })).toBe("hospitality");
  });

  it("detects hospitality from roomType", () => {
    expect(applicationFromLegacyState({ roomType: "Function venue" })).toBe("hospitality");
  });

  it("detects meeting-room from outcome", () => {
    expect(applicationFromLegacyState({ outcome: "Boardroom with Teams" })).toBe("meeting-room");
  });

  it("detects meeting-room from roomType", () => {
    expect(applicationFromLegacyState({ roomType: "Executive boardroom" })).toBe("meeting-room");
  });

  it("detects meeting-room from Zoom keyword", () => {
    expect(applicationFromLegacyState({ outcome: "Zoom huddle room" })).toBe("meeting-room");
  });

  it("returns not-sure for unrecognised keywords", () => {
    expect(applicationFromLegacyState({ outcome: "Install some screens", roomType: "Utility cupboard" })).toBe("not-sure");
  });

  it("checks both outcome and roomType", () => {
    expect(applicationFromLegacyState({ outcome: "Something vague", roomType: "Video wall control room" })).toBe("video-wall");
  });
});

describe("legacyStateToDiscoveryAnswers edge cases", () => {
  it("treats 'Unknown' displayCount as present (non-empty)", () => {
    const answers = legacyStateToDiscoveryAnswers({ displayCount: "Unknown" });
    expect(answers.displays).toBe("Unknown");
  });

  it("treats 'Not confirmed' outcome as present (non-empty)", () => {
    const answers = legacyStateToDiscoveryAnswers({ outcome: "Not confirmed" });
    expect(answers.opportunity).toBe("Not confirmed");
  });

  it("handles devices as a single string wrapped in array", () => {
    const answers = legacyStateToDiscoveryAnswers({ devices: ["NDI camera"] });
    expect(answers.sources).toBeDefined();
    expect(answers["source-device-workflows"]).toEqual(["NDI camera"]);
  });

  it("handles devices with mix of filtered and kept items", () => {
    const answers = legacyStateToDiscoveryAnswers({
      devices: ["Laptop HDMI", "Ceiling microphone", "Room PC", "Table speaker", "NDI PTZ camera"],
    });
    // Kept: Laptop HDMI, Room PC, NDI PTZ camera (camera match but ndi+ptz also match)
    // Filtered: Ceiling microphone, Table speaker
    expect(answers.sources).toBe("3-4");
  });

  it("returns empty object when all values are empty arrays or empty strings", () => {
    const answers = legacyStateToDiscoveryAnswers({
      outcome: "",
      devices: [],
      technicalTags: [],
      displayCount: "",
      displayBehaviour: "",
      cableRun: "",
      controlNeeds: [],
      network: "",
    });
    expect(Object.keys(answers)).toHaveLength(0);
  });

  it("handles numeric values in devices array", () => {
    const answers = legacyStateToDiscoveryAnswers({ devices: [42, "HDMI laptop"] });
    expect(answers["source-device-workflows"]).toEqual(["42", "HDMI laptop"]);
  });

  it("handles network when cableRun is empty string", () => {
    const answers = legacyStateToDiscoveryAnswers({ cableRun: "", network: "Existing LAN" });
    expect(answers["locations-connections"]).toBe("Existing LAN");
  });

  it("handles state with only controlNeeds", () => {
    const answers = legacyStateToDiscoveryAnswers({ controlNeeds: ["Touch panel"] });
    expect(answers.control).toEqual(["Touch panel"]);
    expect(Object.keys(answers)).toHaveLength(1);
  });
});

describe("legacyStateToDiscoveryNotes edge cases", () => {
  it("trims whitespace from notes before deciding presence", () => {
    const notes = legacyStateToDiscoveryNotes({ notes: "  Teams room details  " });
    expect(notes.opportunity).toBe("Teams room details");
  });

  it("handles notes that are only newlines", () => {
    const notes = legacyStateToDiscoveryNotes({ notes: "\n\n" });
    expect(Object.keys(notes)).toHaveLength(0);
  });

  it("preserves multi-line notes", () => {
    const notes = legacyStateToDiscoveryNotes({ notes: "Line 1\nLine 2\nLine 3" });
    expect(notes.opportunity).toBe("Line 1\nLine 2\nLine 3");
  });

  it("ignores notes when state has no notes key", () => {
    const notes = legacyStateToDiscoveryNotes({ outcome: "Something" });
    expect(Object.keys(notes)).toHaveLength(0);
  });
});

describe("applicationFromLegacyState edge cases", () => {
  it("is case-insensitive for keyword matching", () => {
    expect(applicationFromLegacyState({ outcome: "VIDEO WALL install" })).toBe("video-wall");
  });

  it("detects av-over-ip from roomType mentioning many rooms", () => {
    expect(applicationFromLegacyState({ roomType: "Many rooms across building" })).toBe("av-over-ip");
  });

  it("detects hospitality from outcome mentioning venue", () => {
    expect(applicationFromLegacyState({ outcome: "Event venue setup" })).toBe("hospitality");
  });

  it("handles null-like values gracefully", () => {
    expect(applicationFromLegacyState({ outcome: null, roomType: undefined })).toBe("not-sure");
  });

  it("handles numeric values in outcome", () => {
    expect(applicationFromLegacyState({ outcome: 42 })).toBe("not-sure");
  });
});
