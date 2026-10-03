import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractDocumentText } from "./documentExtract";
import { analyzeMultiSkuCompetitorDocument } from "./documentIngest/multiSkuCompetitorIngest";

describe("document XLSX extraction", () => {
  it("turns worksheet grids into table-like text for SKU triage", async () => {
    const zip = new JSZip();
    zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8"?>
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <sheetData>
          <row r="1">
            <c r="A1" t="inlineStr"><is><t>Brand</t></is></c>
            <c r="B1" t="inlineStr"><is><t>SKU</t></is></c>
            <c r="C1" t="inlineStr"><is><t>Description</t></is></c>
          </row>
          <row r="2">
            <c r="A2" t="inlineStr"><is><t>Blustream</t></is></c>
            <c r="B2" t="inlineStr"><is><t>HEX100CS-KIT</t></is></c>
            <c r="C2" t="inlineStr"><is><t>HDBaseT extender kit</t></is></c>
          </row>
          <row r="3">
            <c r="A3" t="inlineStr"><is><t>Samsung</t></is></c>
            <c r="B3" t="inlineStr"><is><t>QM55B</t></is></c>
            <c r="C3" t="inlineStr"><is><t>Commercial display</t></is></c>
          </row>
        </sheetData>
      </worksheet>`);
    const workbook = await zip.generateAsync({ type: "arraybuffer" });
    const file = {
      name: "sku-grid.xlsx",
      arrayBuffer: async () => workbook,
    } as File;

    const extracted = await extractDocumentText(file);

    expect(extracted.warnings).toEqual([]);
    expect(extracted.text).toContain("Brand\tSKU\tDescription");
    expect(extracted.text).toContain("Blustream\tHEX100CS-KIT\tHDBaseT extender kit");
    expect(extracted.text).toContain("Samsung\tQM55B\tCommercial display");

    const triage = analyzeMultiSkuCompetitorDocument(extracted.text).triage;
    expect(triage.rows.find((row) => row.sku === "HEX100CS-KIT")?.status).toBe("wyrestorm_candidate");
    expect(triage.rows.find((row) => row.sku === "QM55B")?.status).toBe("not_wyrestorm_addressable");
  });
});
