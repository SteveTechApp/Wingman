import { describe, expect, it } from "vitest";
import { UI_MODE_PRESENTATION, type WingmanUiMode } from "./uiMode";
import {
  DISCOVERY_CAPTURE_PRESENTATION,
  DISCOVERY_DEPTH_PRESENTATION,
  type DiscoveryMode,
} from "../pages/discovery/discoveryProgressiveDisclosure";

describe("customer-facing terminology", () => {
  it("maps stable interface values to the canonical labels", () => {
    const storedModes: WingmanUiMode[] = ["guided", "unguided"];
    expect(storedModes.map((mode) => UI_MODE_PRESENTATION[mode].label)).toEqual(["Focused view", "Full workspace"]);
  });

  it("maps stable discovery values to the canonical labels", () => {
    const storedDepths: DiscoveryMode[] = ["basic", "expert"];
    expect(storedDepths.map((mode) => DISCOVERY_DEPTH_PRESENTATION[mode].label)).toEqual(["Essential", "Detailed"]);
  });

  it("names conversational capture Voice interview", () => {
    expect(DISCOVERY_CAPTURE_PRESENTATION.label).toBe("Voice interview");
  });
});
