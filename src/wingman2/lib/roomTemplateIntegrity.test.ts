import { describe, expect, it } from "vitest";

import { roomTemplates } from "./roomTemplates";
import { assessRoomTemplateIntegrity } from "./roomTemplateIntegrity";

describe("verified room-template integrity", () => {
  it("publishes every built-in template as a complete VERIFIED baseline", () => {
    expect(roomTemplates.length).toBeGreaterThan(0);

    for (const template of roomTemplates) {
      expect(template.verification?.status).toBe("VERIFIED");
      expect(template.verification?.baseline.length).toBeGreaterThan(0);
      expect(template.assumptions).toEqual([]);
      expect(template.validationItems).toEqual([]);
      expect(template.bom.some((row) => row.type === "Validate")).toBe(false);

      const result = assessRoomTemplateIntegrity(
        template,
        template.bom.map((row) => ({ ...row })),
      );

      expect(result.status, template.id).toBe("VERIFIED");
      expect(result.issues, template.id).toEqual([]);
    }
  });

  it("removes VERIFIED status when a required item is excluded", () => {
    const template = roomTemplates[0];
    const required = template.bom.find((row) => row.type === "Required");
    expect(required).toBeTruthy();

    const rows = template.bom.map((row) =>
      row.id === required?.id ? { ...row, qty: 0, status: "excluded" } : { ...row },
    );

    const result = assessRoomTemplateIntegrity(template, rows);

    expect(result.status).toBe("NOT VERIFIED");
    expect(result.issues.some((issue) => issue.code === "REQUIRED_ITEM_REMOVED")).toBe(true);
  });

  it("removes VERIFIED status when a required SKU is changed", () => {
    const template = roomTemplates[0];
    const required = template.bom.find((row) => row.type === "Required");
    expect(required).toBeTruthy();

    const rows = template.bom.map((row) =>
      row.id === required?.id ? { ...row, sku: "UNREVIEWED-REPLACEMENT" } : { ...row },
    );

    const result = assessRoomTemplateIntegrity(template, rows);

    expect(result.status).toBe("NOT VERIFIED");
    expect(result.issues.some((issue) => issue.code === "REQUIRED_SKU_CHANGED")).toBe(true);
  });

  it("allows an authored optional row to be excluded without breaking the required baseline", () => {
    const template = roomTemplates.find((item) =>
      item.bom.some((row) => row.type === "Optional"),
    );
    expect(template).toBeTruthy();

    const optional = template?.bom.find((row) => row.type === "Optional");
    const rows =
      template?.bom.map((row) =>
        row.id === optional?.id ? { ...row, qty: 0, status: "excluded" } : { ...row },
      ) ?? [];

    const result = assessRoomTemplateIntegrity(template!, rows);

    expect(result.status).toBe("VERIFIED");
  });
});