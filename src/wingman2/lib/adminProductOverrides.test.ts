import { describe, expect, it } from "vitest";
import { getAdminProductOverride, isSkuAdminBlocked } from "./adminProductOverrides";

describe("admin product overrides", () => {
  it("blocks a SKU the admin has marked doNotUse", () => {
    expect(isSkuAdminBlocked("SW-740-TX")).toBe(true);
    expect(getAdminProductOverride("SW-740-TX")?.statusOverride).toBe("do-not-use");
  });

  it("does not block a SKU the admin has explicitly marked live", () => {
    expect(isSkuAdminBlocked("APO-VX20-UC-V2")).toBe(false);
    expect(getAdminProductOverride("APO-VX20-UC-V2")?.statusOverride).toBe("live");
  });

  it("resolves an alias to its canonical SKU's override record", () => {
    // APO-VX20-UC-V2 has a "live" override record; the bare legacy alias
    // APO-VX20-UC has no record of its own, so it should inherit the canonical
    // SKU's (non-blocking) override rather than being treated as unlisted.
    expect(getAdminProductOverride("APO-VX20-UC")?.sku).toBe("APO-VX20-UC-V2");
    expect(isSkuAdminBlocked("APO-VX20-UC")).toBe(false);
  });

  it("returns null/false for a SKU with no override record", () => {
    expect(getAdminProductOverride("NHD-500-TX")).toBeNull();
    expect(isSkuAdminBlocked("NHD-500-TX")).toBe(false);
  });

  it("returns false for an empty SKU", () => {
    expect(isSkuAdminBlocked("")).toBe(false);
  });
});
