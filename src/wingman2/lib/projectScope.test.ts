import { describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";
import { completeProjectServiceRows, groupProjectScope, projectScopeSection } from "./projectScope";
import { templateBomRows, buildTemplateProject } from "./templateReviewProposal";
import { saveRoomTemplateCopy, getCustomRoomTemplates } from "./customRoomTemplates";

describe("project design and delivery schedule", () => {
  it("places every item in exactly one functional section without changing equipment quantities", () => {
    for (const template of roomTemplates) {
      const groups = groupProjectScope(template.bom);
      const rows = groups.flatMap(group => group.rows);
      expect(rows).toHaveLength(template.bom.length);
      expect(new Set(rows.map(row => row.id)).size).toBe(rows.length);
      expect(groups.find(group => group.id === "inputs")!.rows.length, template.id).toBeGreaterThan(0);
      expect(groups.find(group => group.id === "displays")!.rows.length, template.id).toBeGreaterThan(0);
      const services = groups.find(group => group.id === "engineering")!.rows;
      for (const key of ["FIRST-FIX", "SECOND-FIX", "RACK-BUILD", "SURVEY", "DRAWINGS", "PROGRAMMING", "COMMISSIONING", "TRAINING", "MANAGEMENT"]) {
        expect(services.some(row => row.sku === `BY-OTHERS-SERVICE-${key}`), `${template.id}: ${key}`).toBe(true);
      }
      expect(completeProjectServiceRows(template.bom, template.id)).toEqual(template.bom);
    }
  });
  it("keeps source encoders, camera bridges and route controllers in their correct sections", () => {
    const rows = roomTemplates.flatMap(template => template.bom);
    expect(rows.filter(row => /^NHD-CTL/.test(row.sku)).every(row => projectScopeSection(row) === "control")).toBe(true);
    expect(rows.filter(row => row.sku === "BY-OTHERS-ROOM-CONTROL").every(row => projectScopeSection(row) === "control")).toBe(true);
    expect(rows.filter(row => row.sku === "CAM-0402-NDI-BRG").every(row => projectScopeSection(row) === "distribution")).toBe(true);
    expect(rows.filter(row => row.role === "Source encoder").every(row => projectScopeSection(row) === "distribution")).toBe(true);
  });
  it("exports included services, omits unselected maintenance and preserves custom scope and units", () => {
    window.localStorage.clear();
    const template = roomTemplates[0];
    const maintenance = template.bom.find(row => row.scopeSection === "maintenance")!;
    expect(maintenance).toMatchObject({ type: "Optional", status: "excluded", unit: "allowance" });
    const firstFix = template.bom.find(row => row.sku === "BY-OTHERS-SERVICE-FIRST-FIX")!;
    const rows = template.bom.map(row => row.id === firstFix.id ? { ...row, qty: 2.5, unit: "days" as const, manufacturer: "Installation team" } : row);
    const bom = templateBomRows(template, rows);
    expect(bom.some(row => row.sku === maintenance.sku)).toBe(false);
    expect(bom.find(row => row.sku === firstFix.sku)).toMatchObject({ qty: 2.5, notes: expect.stringContaining("Unit: days") });
    const project = buildTemplateProject(template, rows);
    expect(project.proposal?.bomRows?.some(row => row.sku === firstFix.sku)).toBe(true);
    saveRoomTemplateCopy(template, rows);
    expect(getCustomRoomTemplates()[0].bom.find(row => row.id === firstFix.id)).toMatchObject({ qty: 2.5, unit: "days", scopeSection: "engineering", manufacturer: "Installation team" });
  });
  it("does not expand or overwrite a customer's existing combined service allowance", () => {
    const template = roomTemplates[0];
    const existing = { ...template.bom.find(row => row.scopeSection === "engineering")!, sku: "BY-OTHERS-LABOUR", id: "agreed-install", qty: 8, manufacturer: "Named installer", notes: "Agreed complete installation price" };
    const result = completeProjectServiceRows([existing], "custom");
    expect(result.find(row => row.id === existing.id)).toEqual(existing);
    expect(result.some(row => row.sku === "BY-OTHERS-SERVICE-FIRST-FIX")).toBe(false);
  });
});
