import { buildReactFlowModel } from "./visualStudioDiagramFactory";
import { chooseSchematicPrintLayout } from "./visualStudioPrintLayout";
import type { VisualDiagramModel, VisualNodeEmphasis } from "./visualStudioTypes";

/**
 * Builds a genuine, Visio-openable .vsdx file from a VisualDiagramModel.
 *
 * .vsdx is an OOXML (zip) package, structurally similar to .docx/.xlsx. No
 * actively-maintained npm package writes .vsdx from scratch reliably as of
 * this writing - the only package named "vsdx" does not exist on the npm
 * registry at all (`npm view vsdx` returns 404), and the closest match,
 * "vsdx-js", is explicitly a *parser* ("parse a Visio (.vsdx) file into a
 * javascript object"), not a writer. So this hand-constructs the minimal
 * required OOXML parts directly, using jszip (already a project dependency,
 * used elsewhere in this repo for reading .xlsx in documentExtract.ts) to
 * zip them.
 *
 * Every node becomes a plain rectangle Shape (no master/stencil - these are
 * generic, not official WyreStorm stencil shapes, see the caveat in the
 * export button's tooltip) and every edge becomes a plain two-point line
 * Shape with the cable/transport label as its text. Both use the same
 * column/row -> pixel positions the on-screen canvas uses
 * (buildReactFlowModel), converted to inches at 96px = 1in, then flipped
 * from the canvas's top-left/Y-down coordinate space into Visio's
 * bottom-left/Y-up page coordinate space.
 */

const PX_PER_IN = 96;
const MM_PER_IN = 25.4;

const NODE_HEIGHT_BY_EMPHASIS: Record<VisualNodeEmphasis, number> = {
  primary: 132,
  support: 122,
  compact: 108,
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function roundIn(value: number): number {
  return Math.round(value * 10000) / 10000;
}

interface PositionedShape {
  id: string;
  label: string;
  xIn: number;
  yIn: number;
  widthIn: number;
  heightIn: number;
}

function nodeWidthPx(styleWidth: unknown): number {
  if (typeof styleWidth === "number") {
    return styleWidth;
  }

  if (typeof styleWidth === "string") {
    const parsed = Number.parseFloat(styleWidth);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 246;
}

function buildPositionedShapes(model: VisualDiagramModel): PositionedShape[] {
  const flow = buildReactFlowModel(model, "customer");
  const byId = new Map(flow.nodes.map((node) => [node.id, node]));

  return model.nodes.map((node) => {
    const flowNode = byId.get(node.id);
    const xPx = flowNode?.position.x ?? node.column * 245;
    const yPx = flowNode?.position.y ?? node.row * 138;
    const widthPx = nodeWidthPx(flowNode?.style?.width);
    const heightPx = NODE_HEIGHT_BY_EMPHASIS[node.emphasis ?? "support"];

    return {
      id: node.id,
      label: node.label,
      xIn: xPx / PX_PER_IN,
      yIn: yPx / PX_PER_IN,
      widthIn: widthPx / PX_PER_IN,
      heightIn: heightPx / PX_PER_IN,
    };
  });
}

function rectangleShapeXml(
  shape: PositionedShape,
  shapeId: number,
  pageWidthIn: number,
  pageHeightIn: number,
): string {
  const x1 = roundIn(shape.xIn);
  const x2 = roundIn(shape.xIn + shape.widthIn);
  // Visio page space is bottom-left origin, Y increasing upward; the canvas
  // is top-left origin, Y increasing downward - flip here.
  const visioYBottom = roundIn(pageHeightIn - (shape.yIn + shape.heightIn));
  const visioYTop = roundIn(pageHeightIn - shape.yIn);

  return `    <Shape ID="${shapeId}" Type="Shape">
      <Cell N="PinX" V="0"/>
      <Cell N="PinY" V="0"/>
      <Cell N="Width" V="${roundIn(pageWidthIn)}"/>
      <Cell N="Height" V="${roundIn(pageHeightIn)}"/>
      <Cell N="LocPinX" V="0"/>
      <Cell N="LocPinY" V="0"/>
      <Cell N="Angle" V="0"/>
      <Cell N="FillForegnd" V="#FFFFFF"/>
      <Cell N="FillPattern" V="1"/>
      <Cell N="LineColor" V="#1F2937"/>
      <Cell N="LinePattern" V="1"/>
      <Cell N="LineWeight" V="0.01"/>
      <Section N="Geometry" IX="0">
        <Row T="MoveTo" IX="1"><Cell N="X" V="${x1}"/><Cell N="Y" V="${visioYBottom}"/></Row>
        <Row T="LineTo" IX="2"><Cell N="X" V="${x2}"/><Cell N="Y" V="${visioYBottom}"/></Row>
        <Row T="LineTo" IX="3"><Cell N="X" V="${x2}"/><Cell N="Y" V="${visioYTop}"/></Row>
        <Row T="LineTo" IX="4"><Cell N="X" V="${x1}"/><Cell N="Y" V="${visioYTop}"/></Row>
        <Row T="LineTo" IX="5"><Cell N="X" V="${x1}"/><Cell N="Y" V="${visioYBottom}"/></Row>
      </Section>
      <Text>${escapeXml(shape.label)}</Text>
    </Shape>`;
}

function connectorShapeXml(
  from: { xIn: number; yIn: number },
  to: { xIn: number; yIn: number },
  label: string,
  shapeId: number,
  pageWidthIn: number,
  pageHeightIn: number,
): string {
  const fromX = roundIn(from.xIn);
  const fromY = roundIn(pageHeightIn - from.yIn);
  const toX = roundIn(to.xIn);
  const toY = roundIn(pageHeightIn - to.yIn);

  return `    <Shape ID="${shapeId}" Type="Shape">
      <Cell N="PinX" V="0"/>
      <Cell N="PinY" V="0"/>
      <Cell N="Width" V="${roundIn(pageWidthIn)}"/>
      <Cell N="Height" V="${roundIn(pageHeightIn)}"/>
      <Cell N="LocPinX" V="0"/>
      <Cell N="LocPinY" V="0"/>
      <Cell N="Angle" V="0"/>
      <Cell N="FillPattern" V="0"/>
      <Cell N="LineColor" V="#2563EB"/>
      <Cell N="LinePattern" V="1"/>
      <Cell N="LineWeight" V="0.015"/>
      <Section N="Geometry" IX="0">
        <Row T="MoveTo" IX="1"><Cell N="X" V="${fromX}"/><Cell N="Y" V="${fromY}"/></Row>
        <Row T="LineTo" IX="2"><Cell N="X" V="${toX}"/><Cell N="Y" V="${toY}"/></Row>
      </Section>
      <Text>${escapeXml(label)}</Text>
    </Shape>`;
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/>
  <Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>
  <Override PartName="/visio/pages/page1.xml" ContentType="application/vnd.ms-visio.page+xml"/>
  <Override PartName="/visio/masters/masters.xml" ContentType="application/vnd.ms-visio.masters+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/document" Target="visio/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const APP_PROPS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>WyreStorm Wingman</Application>
  <AppVersion>16.0000</AppVersion>
</Properties>`;

const DOCUMENT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<VisioDocument xmlns="http://schemas.microsoft.com/office/visio/2012/main" xml:space="preserve">
  <DocumentSettings TopPage="0" DefaultTextStyle="0" DefaultLineStyle="0" DefaultFillStyle="0" DefaultGuideStyle="0"/>
</VisioDocument>`;

const DOCUMENT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/pages" Target="pages/pages.xml"/>
  <Relationship Id="rId2" Type="http://schemas.microsoft.com/visio/2010/relationships/masters" Target="masters/masters.xml"/>
</Relationships>`;

// Zero masters is schema-valid - every shape in this export is a plain,
// no-master shape (see the module doc comment above).
const MASTERS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Masters xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>`;

const PAGES_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/page" Target="page1.xml"/>
</Relationships>`;

function buildCorePropsXml(title: string): string {
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>WyreStorm Wingman</dc:creator>
  <cp:lastModifiedBy>WyreStorm Wingman</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function buildPagesXml(pageWidthIn: number, pageHeightIn: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Pages xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xml:space="preserve">
  <Page ID="0" Name="Page-1">
    <PageSheet>
      <Cell N="PageWidth" V="${roundIn(pageWidthIn)}"/>
      <Cell N="PageHeight" V="${roundIn(pageHeightIn)}"/>
      <Cell N="PageLeftMargin" V="0.25"/>
      <Cell N="PageRightMargin" V="0.25"/>
      <Cell N="PageTopMargin" V="0.25"/>
      <Cell N="PageBottomMargin" V="0.25"/>
    </PageSheet>
    <Rel r:id="rId1"/>
  </Page>
</Pages>`;
}

function buildPage1Xml(shapesXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<PageContents xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xml:space="preserve">
  <Shapes>
${shapesXml}
  </Shapes>
</PageContents>`;
}

export async function buildVsdxBlob(model: VisualDiagramModel): Promise<Blob> {
  const { default: JSZip } = await import("jszip");

  const shapes = buildPositionedShapes(model);
  const shapeById = new Map(shapes.map((shape) => [shape.id, shape]));

  const printLayout = chooseSchematicPrintLayout(buildReactFlowModel(model, "customer").nodes);
  const pageWidthIn = printLayout.pageWidthMm / MM_PER_IN;
  const pageHeightIn = printLayout.pageHeightMm / MM_PER_IN;

  let shapeId = 1;
  const rectangleXml = shapes
    .map((shape) => rectangleShapeXml(shape, shapeId++, pageWidthIn, pageHeightIn))
    .join("\n");

  const connectorXml = model.edges
    .map((edge) => {
      const from = shapeById.get(edge.source);
      const to = shapeById.get(edge.target);

      if (!from || !to) {
        return "";
      }

      const fromCenter = { xIn: from.xIn + from.widthIn / 2, yIn: from.yIn + from.heightIn / 2 };
      const toCenter = { xIn: to.xIn + to.widthIn / 2, yIn: to.yIn + to.heightIn / 2 };

      return connectorShapeXml(fromCenter, toCenter, edge.label ?? "", shapeId++, pageWidthIn, pageHeightIn);
    })
    .filter((xml) => xml.length > 0)
    .join("\n");

  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES_XML);
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("docProps/core.xml", buildCorePropsXml(model.title));
  zip.file("docProps/app.xml", APP_PROPS_XML);
  zip.file("visio/document.xml", DOCUMENT_XML);
  zip.file("visio/_rels/document.xml.rels", DOCUMENT_RELS_XML);
  zip.file("visio/masters/masters.xml", MASTERS_XML);
  zip.file("visio/pages/pages.xml", buildPagesXml(pageWidthIn, pageHeightIn));
  zip.file("visio/pages/_rels/pages.xml.rels", PAGES_RELS_XML);
  zip.file("visio/pages/page1.xml", buildPage1Xml(`${rectangleXml}\n${connectorXml}`));

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.ms-visio.drawing.main+xml",
  });
}
