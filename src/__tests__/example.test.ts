import { describe, it, expect } from "vitest";

describe("Example test suite", () => {
  it("should perform basic arithmetic", () => {
    expect(1 + 1).toBe(2);
  });

  it("should handle string operations", () => {
    const greeting = "Hello, Wingman!";
    expect(greeting).toContain("Wingman");
    expect(greeting.length).toBeGreaterThan(0);
  });

  it("should work with arrays", () => {
    const items = ["react", "typescript", "vite"];
    expect(items).toHaveLength(3);
    expect(items).toContain("react");
  });

  it("should handle objects", () => {
    const config = { name: "wingman", version: "0.1.0" };
    expect(config).toHaveProperty("name");
    expect(config.name).toBe("wingman");
  });
});
