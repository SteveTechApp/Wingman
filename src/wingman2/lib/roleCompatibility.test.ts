import { describe, expect, it } from "vitest";
import {
  classifyProduct,
  checkRoleCompatibility,
  expectedRoleDescription,
  knownPlaceholderRoles,
} from "./roleCompatibility";

describe("role compatibility", () => {
  describe("classifyProduct", () => {
    it("classifies an AVoIP encoder", () => {
      const tags = classifyProduct({
        classificationPath: ["NetworkHD 100", "Encoder", "AVoIP endpoint"],
        category: "AV-over-IP",
      });
      expect(tags).toContain("encoder");
    });

    it("classifies an AVoIP decoder", () => {
      const tags = classifyProduct({
        classificationPath: ["NetworkHD 100", "Decoder", "AVoIP endpoint"],
        category: "AV-over-IP",
      });
      expect(tags).toContain("decoder");
    });

    it("classifies a camera", () => {
      const tags = classifyProduct({
        classificationPath: ["Camera / capture"],
        category: "Camera / capture",
      });
      expect(tags).toContain("camera");
    });

    it("classifies a matrix", () => {
      const tags = classifyProduct({
        classificationPath: ["Matrix switching"],
        category: "Matrix switching",
      });
      expect(tags).toContain("matrix");
    });

    it("classifies a network switch", () => {
      const tags = classifyProduct({
        classificationPath: ["Network", "Managed switch"],
        category: "Network",
        description: "24-port managed PoE switch",
      });
      expect(tags).toContain("network-switch");
    });

    it("classifies a DSP", () => {
      const tags = classifyProduct({
        classificationPath: ["Audio", "DSP"],
        category: "Audio",
        description: "Audio DSP processor",
      });
      expect(tags).toContain("dsp");
    });

    it("returns accessory for unclassified products", () => {
      const tags = classifyProduct({
        classificationPath: [],
        category: "Cable / accessory",
      });
      expect(tags).toContain("accessory");
    });
  });

  describe("checkRoleCompatibility", () => {
    it("rejects encoder for display placeholder", () => {
      const result = checkRoleCompatibility("Visual outputs by others", ["encoder"]);
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe("error");
      expect(result.message).toContain("does not match");
    });

    it("accepts decoder for display placeholder", () => {
      const result = checkRoleCompatibility("Visual outputs by others", ["decoder"]);
      expect(result.compatible).toBe(true);
      expect(result.severity).toBe("ok");
    });

    it("accepts display for display placeholder", () => {
      const result = checkRoleCompatibility("Visual outputs by others", ["display"]);
      expect(result.compatible).toBe(true);
    });

    it("accepts projector for display placeholder", () => {
      const result = checkRoleCompatibility("Visual outputs by others", ["projector"]);
      expect(result.compatible).toBe(true);
    });

    it("rejects speaker for display placeholder", () => {
      const result = checkRoleCompatibility("Visual outputs by others", ["speaker"]);
      expect(result.compatible).toBe(false);
    });

    it("accepts DSP for audio placeholder", () => {
      const result = checkRoleCompatibility("Audio I/O and processing by others", ["dsp"]);
      expect(result.compatible).toBe(true);
    });

    it("accepts camera for audio capture placeholder", () => {
      const result = checkRoleCompatibility("Audio capture by others", ["camera"]);
      expect(result.compatible).toBe(true);
    });

    it("accepts microphone for audio capture placeholder", () => {
      const result = checkRoleCompatibility("Audio capture by others", ["microphone"]);
      expect(result.compatible).toBe(true);
    });

    it("rejects encoder for audio capture placeholder", () => {
      const result = checkRoleCompatibility("Audio capture by others", ["encoder"]);
      expect(result.compatible).toBe(false);
    });

    it("accepts network-switch for network placeholder", () => {
      const result = checkRoleCompatibility("Network infrastructure by others", ["network-switch"]);
      expect(result.compatible).toBe(true);
    });

    it("wildcard roles always accept any product", () => {
      const result = checkRoleCompatibility("Installation labour by others", ["encoder", "matrix"]);
      expect(result.compatible).toBe(true);
    });

    it("unknown roles return ok with caution message", () => {
      const result = checkRoleCompatibility("Some unknown role", ["encoder"]);
      expect(result.compatible).toBe(true);
      expect(result.message).toContain("not in the compatibility database");
    });
  });

  describe("expectedRoleDescription", () => {
    it("returns description for known roles", () => {
      expect(expectedRoleDescription("Visual outputs by others")).toContain("decoders");
    });

    it("returns null for unknown roles", () => {
      expect(expectedRoleDescription("Unknown role")).toBeNull();
    });
  });

  describe("knownPlaceholderRoles", () => {
    it("returns all known roles", () => {
      const roles = knownPlaceholderRoles();
      expect(roles).toContain("Visual outputs by others");
      expect(roles).toContain("Audio I/O and processing by others");
      expect(roles).toContain("Network infrastructure by others");
      expect(roles.length).toBeGreaterThanOrEqual(10);
    });
  });
});
