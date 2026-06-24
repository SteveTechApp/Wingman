import { describe, expect, it } from "vitest";

import {
  getWyreStormSupersession,
  resolveProductLifecycle,
} from "./wyrestormProductLifecycle";

describe("wyrestorm product lifecycle", () => {
  it("treats a current SKU as recommendable", () => {
    const life = resolveProductLifecycle("CAM-210-NDI-PTZ");
    expect(life.status).toBe("active");
    expect(life.recommendable).toBe(true);
    expect(life.supersededBy).toBeUndefined();
  });

  it("blocks a discontinued SKU from being recommendable", () => {
    const life = resolveProductLifecycle("CAM-200-PTZ");
    expect(life.status).toBe("discontinued");
    expect(life.recommendable).toBe(false);
  });

  it("blocks a do-not-spec SKU from being recommendable", () => {
    const life = resolveProductLifecycle("APO-DG1");
    expect(life.status).toBe("do-not-spec");
    expect(life.recommendable).toBe(false);
  });

  it("identifies a superseded SKU and names its current replacement", () => {
    const supersession = getWyreStormSupersession("SYN-TOUCH10");
    expect(supersession?.successor).toBe("SYN-TOUCH10-V2");

    const life = resolveProductLifecycle("SYN-TOUCH10");
    expect(life.supersededBy).toBe("SYN-TOUCH10-V2");
    expect(life.recommendable).toBe(false);
    expect(life.note).toMatch(/SYN-TOUCH10-V2/);
  });

  it("treats the successor itself as current and recommendable", () => {
    const life = resolveProductLifecycle("SYN-TOUCH10-V2");
    expect(life.status).toBe("active");
    expect(life.recommendable).toBe(true);
    expect(life.supersededBy).toBeUndefined();
  });
});
