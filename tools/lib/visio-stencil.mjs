import { deflateRawSync, inflateRawSync } from "node:zlib";

/**
 * A Visio stencil (`.vssx`) built as an OPC package.
 *
 * A `.vssx` is not a proprietary blob: from Visio 2013 on it is an OPC/ZIP
 * package of XML parts, so a stencil can be generated without Visio and without
 * COM automation. What cannot be generated away is the risk that Visio refuses a
 * package whose parts are subtly wrong — it answers with a repair prompt rather
 * than a schema error — so this file follows the shape of packages Visio already
 * opens rather than inventing one:
 *
 *   - the stencil's main document part is typed
 *     `application/vnd.ms-visio.stencil.main+xml` (a drawing's is `…drawing….`),
 *     which is the single difference that makes the package a stencil;
 *   - the master index (`visio/masters/masters.xml`) names each master and points
 *     at its own part through a relationship, and each master part holds one
 *     `Shape` inside `MasterContents` — the smallest shape that renders is a
 *     `Type="Shape"` with a `Geometry` section, no group needed;
 *   - connection points are rows in `Section N="Connection"`, and the fields a
 *     designer edits after dropping the shape are rows in `Section N="Property"`
 *     named `Prop.<Field>`;
 *   - the stencil-pane icon is not a package part of its own: it is base64 BMP
 *     data inline in the master's `<Icon>`, next to `IconSize` (both copied from a
 *     distributed stencil that stores 16×16 icons this way).
 *
 * Nothing here is verified against Visio itself — there is none on this machine —
 * so `assertStencilPackage` checks the things an archive can prove: every part is
 * typed, every relationship resolves, every master the page names exists, each
 * master declares the fields and connection points it says it does, and the ZIP
 * round-trips byte for byte.
 */

const VISIO_NS = "http://schemas.microsoft.com/office/visio/2012/main";
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const CONTENT_TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types";

/** The part content types, as Visio's own packages spell them. */
export const CONTENT_TYPES = {
  document: "application/vnd.ms-visio.stencil.main+xml",
  masters: "application/vnd.ms-visio.masters+xml",
  master: "application/vnd.ms-visio.master+xml",
  pages: "application/vnd.ms-visio.pages+xml",
  page: "application/vnd.ms-visio.page+xml",
  windows: "application/vnd.ms-visio.windows+xml",
  core: "application/vnd.openxmlformats-package.core-properties+xml",
  app: "application/vnd.openxmlformats-officedocument.extended-properties+xml",
  rels: "application/vnd.openxmlformats-package.relationships+xml",
  xml: "application/xml",
};

/** The relationship types the package uses. */
export const RELATIONSHIPS = {
  document: "http://schemas.microsoft.com/visio/2010/relationships/document",
  masters: "http://schemas.microsoft.com/visio/2010/relationships/masters",
  master: "http://schemas.microsoft.com/visio/2010/relationships/master",
  pages: "http://schemas.microsoft.com/visio/2010/relationships/pages",
  page: "http://schemas.microsoft.com/visio/2010/relationships/page",
  windows: "http://schemas.microsoft.com/visio/2010/relationships/windows",
  core: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
  app: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties",
};

const DECLARATION = '<?xml version="1.0" encoding="utf-8" ?>';

export function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * A ShapeSheet number.
 *
 * Visio stores lengths in inches as decimal text, and a value that arrives as
 * `1e-7` or `-0` is the sort of thing a strict reader complains about, so this
 * rounds to six places and never prints a negative zero.
 */
export function num(value) {
  const rounded = Math.round(value * 1e6) / 1e6;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

/** `<Cell N="Width" V="2" F="Width*0.5"/>`, with the formula only when it is one. */
export function cell(name, value, { formula, unit } = {}) {
  const formulaAttr = formula === undefined ? "" : ` F="${escapeXml(formula)}"`;
  const unitAttr = unit === undefined ? "" : ` U="${escapeXml(unit)}"`;
  return `<Cell N="${escapeXml(name)}" V="${escapeXml(num(value))}"${formulaAttr}${unitAttr}/>`;
}

/** A raw cell whose value is not a number — a colour, a string, a boolean flag. */
export function textCell(name, value) {
  return `<Cell N="${escapeXml(name)}" V="${escapeXml(value)}"/>`;
}

/** A geometry row: a move or a line, positioned in the shape's own inches. */
export function geometryRow(type, index, { x, y }, { width, height }) {
  const fx = num(x / width);
  const fy = num(y / height);
  return `<Row T="${type}" IX="${index}"><Cell N="X" V="${num(x)}" F="Width*${fx}"/><Cell N="Y" V="${num(y)}" F="Height*${fy}"/></Row>`;
}

/**
 * One closed path as a `Geometry` section.
 *
 * `filled` and `stroked` become the section's own `NoFill` / `NoLine` flags, so a
 * symbol can be a filled body with an unfilled ring drawn over it without needing
 * a group — the fill colour is the shape's, and only whether a path takes it
 * varies per section.
 */
export function geometrySection(index, { points, width, height, filled = true, stroked = true }) {
  if (points.length < 2) throw new Error(`Geometry section ${index} needs at least two points.`);
  const flags = [
    textCell("NoFill", filled ? "0" : "1"),
    textCell("NoLine", stroked ? "0" : "1"),
    textCell("NoShow", "0"),
    textCell("NoSnap", "0"),
    textCell("NoQuickDrag", "0"),
  ].join("");
  const rows = points
    .map((point, position) => geometryRow(position === 0 ? "MoveTo" : "LineTo", position + 1, point, { width, height }))
    .join("");
  return `<Section N="Geometry" IX="${index}">${flags}${rows}</Section>`;
}

/**
 * The connection points a dropped shape offers, as rows of one `Connection`
 * section.
 *
 * `DirX`/`DirY` stay zero on purpose: a directionless point is what Visio's own
 * equipment masters carry, and it lets a dynamic connector leave the point in
 * whichever direction the layout needs instead of pinning the route to a fixed
 * side. `Type="0"` is inward.
 */
export function connectionSection(points, { width, height }) {
  if (!points.length) return "";
  const rows = points
    .map((point, index) => `<Row T="Connection" IX="${index}">`
      + `<Cell N="X" V="${num(point.x)}" F="Width*${num(point.x / width)}"/>`
      + `<Cell N="Y" V="${num(point.y)}" F="Height*${num(point.y / height)}"/>`
      + '<Cell N="DirX" V="0"/><Cell N="DirY" V="0"/><Cell N="Type" V="0"/>'
      + '<Cell N="AutoGen" V="0"/><Cell N="Prompt" V=""/>'
      + "</Row>")
    .join("");
  return `<Section N="Connection">${rows}</Section>`;
}

/**
 * The Shape Data fields a designer edits after dropping the shape.
 *
 * `Type` is Visio's field-kind enum — 0 string, 1 number, 2 boolean, 3 fixed
 * list, 4 variable list — and `SortKey` is what fixes the order the fields appear
 * in the Shape Data window, so the fields read in the order they are declared
 * rather than alphabetically.
 */
export function propertySection(properties) {
  if (!properties.length) return "";
  const rows = properties
    .map((property, index) => {
      const row = `<Row N="Prop.${escapeXml(property.name)}">`
        + `<Cell N="Label" V="${escapeXml(property.label)}"/>`
        + `<Cell N="Prompt" V="${escapeXml(property.prompt ?? "")}"/>`
        + `<Cell N="Type" V="${num(property.type ?? 0)}"/>`
        + `<Cell N="Format" V="${escapeXml(property.format ?? "")}"/>`
        + `<Cell N="SortKey" V="${num(index)}"/>`
        + '<Cell N="Invisible" V="0"/>'
        + `<Cell N="Value" V="${escapeXml(property.value ?? "")}"/>`
        + "</Row>";
      return row;
    })
    .join("");
  return `<Section N="Property">${rows}</Section>`;
}

const SHAPE_FLAGS = '<Cell N="Angle" V="0"/><Cell N="FlipX" V="0"/><Cell N="FlipY" V="0"/><Cell N="ResizeMode" V="0"/>';

/**
 * One master part: `MasterContents` holding a single shape.
 *
 * Everything a dropped copy can vary is a cell on this shape — its pin, its size,
 * its line and fill — so a designer resizing the symbol on their own drawing
 * moves the geometry with it: every `X`/`Y` row carries a `Width*`/`Height*`
 * formula as well as its value.
 */
export function masterPart(master) {
  const { width, height } = master;
  const cells = [
    cell("PinX", width / 2),
    cell("PinY", height / 2),
    cell("Width", width),
    cell("Height", height),
    cell("LocPinX", width / 2, { formula: "Width*0.5" }),
    cell("LocPinY", height / 2, { formula: "Height*0.5" }),
    SHAPE_FLAGS,
    cell("LineWeight", master.lineWeight ?? 0.0125),
    textCell("LineColor", master.lineColor ?? "#1F2937"),
    cell("LineColorTrans", 0),
    cell("LinePattern", 1),
    cell("Rounding", 0),
    textCell("FillForegnd", master.fillColor ?? "#EEF2F7"),
    textCell("FillBkgnd", "#FFFFFF"),
    cell("FillPattern", 1),
    cell("FillForegndTrans", 0),
    cell("FillBkgndTrans", 0),
  ].join("");
  const geometry = master.paths
    .map((path, index) => geometrySection(index, {
      points: path.points.map(([x, y]) => ({ x, y })),
      width,
      height,
      filled: path.filled ?? index === 0,
      stroked: path.stroked ?? true,
    }))
    .join("");
  return `${DECLARATION}
<MasterContents xmlns="${VISIO_NS}" xmlns:r="${REL_NS}" xml:space="preserve"><Shapes><Shape ID="1" Type="Shape">${cells}${geometry}${connectionSection(master.connections ?? [], { width, height })}${propertySection(master.properties ?? [])}</Shape></Shapes></MasterContents>`;
}

/** The master index: one `Master` per part, each pointing at its part. */
export function mastersPart(masters) {
  const entries = masters
    .map((master, index) => {
      const attributes = [
        `ID="${index + 1}"`,
        `NameU="${escapeXml(master.nameU)}"`,
        'IsCustomNameU="1"',
        `Name="${escapeXml(master.name)}"`,
        'IsCustomName="1"',
        `Prompt="${escapeXml(master.prompt ?? "")}"`,
        'IconSize="1"',
        'IconUpdate="1"',
        'MatchByName="0"',
        'Hidden="0"',
      ].join(" ");
      const icon = master.icon ? `<Icon>${master.icon}</Icon>` : "";
      return `<Master ${attributes}><PageSheet><Cell N="PageWidth" V="8.5"/><Cell N="PageHeight" V="11"/><Cell N="DrawingScale" V="1"/><Cell N="PageScale" V="1"/></PageSheet>${icon}<Rel r:id="rId${index + 1}"/></Master>`;
    })
    .join("");
  return `${DECLARATION}
<Masters xmlns="${VISIO_NS}" xmlns:r="${REL_NS}" xml:space="preserve">${entries}</Masters>`;
}

/** The page part: one instance of each master, so the stencil page shows them. */
export function pagePart(masters, { width = 8.5, height = 11 } = {}) {
  // Evenly across the page rather than at a fixed step, so a catalog that grows
  // still puts every instance inside the page instead of running off its edge.
  const step = width / (masters.length + 1);
  const shapes = masters
    .map((master, index) => `<Shape ID="${index + 1}" Type="Shape" Master="${index + 1}">`
      + `<Cell N="PinX" V="${num(step * (index + 1))}"/>`
      + `<Cell N="PinY" V="${num(height - 2)}"/>`
      + "</Shape>")
    .join("");
  return `${DECLARATION}
<PageContents xmlns="${VISIO_NS}" xmlns:r="${REL_NS}" xml:space="preserve"><Shapes>${shapes}</Shapes></PageContents>`;
}

export function pagesPart({ width = 8.5, height = 11 } = {}) {
  const cells = [
    cell("PageWidth", width),
    cell("PageHeight", height),
    cell("ShdwOffsetX", 0.125),
    cell("ShdwOffsetY", -0.125),
    cell("PageScale", 1, { unit: "IN_F" }),
    cell("DrawingScale", 1, { unit: "IN_F" }),
    cell("DrawingSizeType", 0),
    cell("DrawingScaleType", 0),
    cell("InhibitSnap", 0),
    cell("PageLockReplace", 0, { unit: "BOOL" }),
    cell("PageLockDuplicate", 0, { unit: "BOOL" }),
    cell("UIVisibility", 0),
    cell("ShdwType", 0),
    cell("ShdwObliqueAngle", 0),
    cell("ShdwScaleFactor", 1),
    cell("DrawingResizeType", 1),
    cell("PageShapeSplit", 1),
  ].join("");
  return `${DECLARATION}
<Pages xmlns="${VISIO_NS}" xmlns:r="${REL_NS}" xml:space="preserve"><Page ID="0" NameU="Page-1" Name="Page-1" ViewScale="-1" ViewCenterX="${num(width / 2)}" ViewCenterY="${num(height / 2)}"><PageSheet LineStyle="0" FillStyle="0" TextStyle="0">${cells}</PageSheet><Rel r:id="rId1"/></Page></Pages>`;
}

/**
 * The document part.
 *
 * No `DefaultTextStyle` / `DefaultLineStyle` attributes: those name style-sheet
 * IDs, and a symbol that carries its own line and fill cells needs none of them.
 * The one style sheet here is ID 0, which every `LineStyle="0"` in the package
 * points at — an empty style table would leave those references dangling.
 */
export function documentPart() {
  const settings = [
    "<GlueSettings>9</GlueSettings>",
    "<SnapSettings>295</SnapSettings>",
    "<SnapExtensions>34</SnapExtensions>",
    "<DynamicGridEnabled>0</DynamicGridEnabled>",
    "<ProtectStyles>0</ProtectStyles>",
    "<ProtectShapes>0</ProtectShapes>",
    "<ProtectMasters>0</ProtectMasters>",
    "<ProtectBkgnds>0</ProtectBkgnds>",
  ].join("");
  const style = [
    textCell("EnableLineProps", "1"),
    textCell("EnableFillProps", "1"),
    textCell("EnableTextProps", "1"),
    textCell("HideForApply", "0"),
    cell("LineWeight", 0.01),
    textCell("LineColor", "#000000"),
    cell("LinePattern", 1),
    cell("Rounding", 0),
    textCell("FillForegnd", "#FFFFFF"),
    textCell("FillBkgnd", "#000000"),
    cell("FillPattern", 1),
    cell("LeftMargin", 0),
    cell("RightMargin", 0),
    cell("TopMargin", 0),
    cell("BottomMargin", 0),
    cell("VerticalAlign", 1),
  ].join("");
  const character = '<Section N="Character"><Row IX="0">'
    + '<Cell N="Font" V="Arial"/><Cell N="Color" V="#1F2937"/><Cell N="Size" V="0.1388888888888889"/>'
    + '<Cell N="FontScale" V="1"/><Cell N="Style" V="0"/><Cell N="Case" V="0"/><Cell N="Pos" V="0"/>'
    + "</Row></Section>";
  const faceNames = '<FaceNames><FaceName NameU="Arial" UnicodeRanges="-536859905 -1073711037 9 0" '
    + 'CharSets="1073742335 -65536" Panose="2 11 6 4 2 2 2 2 2 4" Flags="325"/></FaceNames>';
  return `${DECLARATION}
<VisioDocument xmlns="${VISIO_NS}" xmlns:r="${REL_NS}" xml:space="preserve"><DocumentSettings TopPage="0">${settings}</DocumentSettings>${faceNames}<StyleSheets><StyleSheet ID="0" NameU="No Style" IsCustomNameU="1" Name="No Style" IsCustomName="1">${style}${character}</StyleSheet></StyleSheets></VisioDocument>`;
}

/** The window layout part. A stencil has no saved window state of its own. */
export function windowsPart() {
  return `${DECLARATION}
<Windows ClientWidth="0" ClientHeight="0" xmlns="${VISIO_NS}" xmlns:r="${REL_NS}" xml:space="preserve"/>`;
}

/** `[Content_Types].xml` for the parts actually written. */
export function contentTypesPart(paths) {
  const defaults = [
    `<Default Extension="rels" ContentType="${CONTENT_TYPES.rels}"/>`,
    `<Default Extension="xml" ContentType="${CONTENT_TYPES.xml}"/>`,
  ].join("");
  const overrides = paths
    .filter((part) => part.contentType)
    .map(({ path, contentType }) => `<Override PartName="/${path}" ContentType="${contentType}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="utf-8"?><Types xmlns="${CONTENT_TYPES_NS}">${defaults}${overrides}</Types>`;
}

export function relsPart(relationships) {
  const entries = relationships
    .map(({ id, type, target }, index) => `<Relationship Id="${id ?? `rId${index + 1}`}" Type="${type}" Target="${escapeXml(target)}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="${PACKAGE_REL_NS}">${entries}</Relationships>`;
}

export function corePropertiesPart({ title, description, now }) {
  const stamp = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  return `<?xml version="1.0" encoding="utf-8"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dc:subject>${escapeXml(description)}</dc:subject><dc:creator>Wingman</dc:creator><cp:lastModifiedBy>Wingman</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified></cp:coreProperties>`;
}

export function appPropertiesPart({ title }) {
  return `<?xml version="1.0" encoding="utf-8"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Wingman</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><Template>Stencil</Template><TitlesOfParts><vt:lpstr>${escapeXml(title)}</vt:lpstr></TitlesOfParts></Properties>`;
}

/**
 * Every part of a stencil package, in the order they are written.
 *
 * `[Content_Types].xml` comes first because it is the part a reader looks for
 * before anything else, and the content type of each part is declared here rather
 * than derived from its path — a drawing's document type and a stencil's differ by
 * one word, and that word is the whole file kind.
 */
export function buildStencilParts({ masters, title, description = "", now = new Date() }) {
  if (!masters.length) throw new Error("A stencil needs at least one master.");
  const seen = new Set();
  for (const master of masters) {
    if (seen.has(master.nameU)) throw new Error(`Two masters share the name ${master.nameU}; Visio matches on it.`);
    seen.add(master.nameU);
  }

  const masterParts = masters.map((master, index) => ({
    path: `visio/masters/master${index + 1}.xml`,
    contentType: CONTENT_TYPES.master,
    data: masterPart(master),
  }));
  const masterRels = relsPart(masters.map((_master, index) => ({
    type: RELATIONSHIPS.master,
    target: `master${index + 1}.xml`,
  })));
  const pageRels = relsPart(masters.map((_master, index) => ({
    type: RELATIONSHIPS.master,
    target: `../masters/master${index + 1}.xml`,
  })));

  const parts = [
    { path: "docProps/core.xml", contentType: CONTENT_TYPES.core, data: corePropertiesPart({ title, description, now }) },
    { path: "docProps/app.xml", contentType: CONTENT_TYPES.app, data: appPropertiesPart({ title }) },
    { path: "visio/document.xml", contentType: CONTENT_TYPES.document, data: documentPart() },
    { path: "visio/windows.xml", contentType: CONTENT_TYPES.windows, data: windowsPart() },
    { path: "visio/masters/masters.xml", contentType: CONTENT_TYPES.masters, data: mastersPart(masters) },
    { path: "visio/masters/_rels/masters.xml.rels", contentType: null, data: masterRels },
    ...masterParts,
    { path: "visio/pages/pages.xml", contentType: CONTENT_TYPES.pages, data: pagesPart() },
    { path: "visio/pages/_rels/pages.xml.rels", contentType: null, data: relsPart([{ type: RELATIONSHIPS.page, target: "page1.xml" }]) },
    { path: "visio/pages/page1.xml", contentType: CONTENT_TYPES.page, data: pagePart(masters) },
    { path: "visio/pages/_rels/page1.xml.rels", contentType: null, data: pageRels },
    {
      path: "_rels/.rels",
      contentType: null,
      data: relsPart([
        { type: RELATIONSHIPS.document, target: "visio/document.xml" },
        { type: RELATIONSHIPS.core, target: "docProps/core.xml" },
        { type: RELATIONSHIPS.app, target: "docProps/app.xml" },
      ]),
    },
    {
      path: "visio/_rels/document.xml.rels",
      contentType: null,
      data: relsPart([
        { type: RELATIONSHIPS.masters, target: "masters/masters.xml" },
        { type: RELATIONSHIPS.pages, target: "pages/pages.xml" },
        { type: RELATIONSHIPS.windows, target: "windows.xml" },
      ]),
    },
  ];
  const contentTypes = { path: "[Content_Types].xml", contentType: null, data: "" };
  contentTypes.data = contentTypesPart(parts.map(({ path, contentType }) => ({ path, contentType })));
  return [contentTypes, ...parts];
}

/* ------------------------------------------------------------------ ZIP ---- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * The parts as a ZIP archive, written by hand so the bytes are reproducible.
 *
 * A fixed 1980-01-01 timestamp and one compression level mean rebuilding an
 * unchanged stencil produces an identical file, which is what lets a diff say
 * whether a symbol changed or only the clock did. Names are ASCII, so no UTF-8
 * flag is needed.
 */
export function zipParts(parts) {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;
  for (const part of parts) {
    const name = Buffer.from(part.path, "utf8");
    const data = Buffer.isBuffer(part.data) ? part.data : Buffer.from(part.data, "utf8");
    const deflated = deflateRawSync(data, { level: 9 });
    const stored = deflated.length >= data.length;
    const body = stored ? data : deflated;
    const method = stored ? 0 : 8;
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x0021, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localChunks.push(local, name, body);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0, 8);
    entry.writeUInt16LE(method, 10);
    entry.writeUInt16LE(0, 12);
    entry.writeUInt16LE(0x0021, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(body.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt16LE(0, 30);
    entry.writeUInt16LE(0, 32);
    entry.writeUInt16LE(0, 34);
    entry.writeUInt16LE(0, 36);
    entry.writeUInt32LE(0, 38);
    entry.writeUInt32LE(offset, 42);
    centralChunks.push(entry, name);

    offset += local.length + name.length + body.length;
  }
  const central = Buffer.concat(centralChunks);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(parts.length, 8);
  end.writeUInt16LE(parts.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localChunks, central, end]);
}

/** Read an archive back, so a build can prove what it wrote is a valid ZIP. */
export function readZip(buffer) {
  const endOffset = (() => {
    for (let position = buffer.length - 22; position >= 0; position -= 1) {
      if (buffer.readUInt32LE(position) === 0x06054b50) return position;
    }
    throw new Error("Not a ZIP archive: no end-of-central-directory record.");
  })();
  const count = buffer.readUInt16LE(endOffset + 10);
  let cursor = buffer.readUInt32LE(endOffset + 16);
  const entries = new Map();
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Corrupt ZIP central directory.");
    const method = buffer.readUInt16LE(cursor + 10);
    const crc = buffer.readUInt32LE(cursor + 16);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const body = buffer.subarray(start, start + compressedSize);
    const data = method === 0 ? body : inflateRawSync(body);
    if (crc32(data) !== crc) throw new Error(`CRC mismatch on ${name}.`);
    entries.set(name, data);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/* ----------------------------------------------------------------- icon ---- */

/** A tiny raster surface, because a stencil-pane icon is a 16×16 bitmap. */
export function createIconCanvas(size = 16) {
  const pixels = new Uint8Array(size * size * 3).fill(255);
  const put = (x, y, colour) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= size || py >= size) return;
    const index = (py * size + px) * 3;
    pixels[index] = colour[0];
    pixels[index + 1] = colour[1];
    pixels[index + 2] = colour[2];
  };
  return {
    size,
    put,
    fillRect(x1, y1, x2, y2, colour) {
      for (let y = y1; y <= y2; y += 1) for (let x = x1; x <= x2; x += 1) put(x, y, colour);
    },
    strokeRect(x1, y1, x2, y2, colour) {
      for (let x = x1; x <= x2; x += 1) {
        put(x, y1, colour);
        put(x, y2, colour);
      }
      for (let y = y1; y <= y2; y += 1) {
        put(x1, y, colour);
        put(x2, y, colour);
      }
    },
    circle(cx, cy, radius, colour, { filled = false } = {}) {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const distance = Math.hypot(x - cx, y - cy);
          if (distance > radius) continue;
          const inside = distance <= Math.max(0, radius - 1.1);
          if (filled || !inside) put(x, y, colour);
        }
      }
    },
    toBmp() {
      const rowBytes = Math.ceil((size * 3) / 4) * 4;
      const pixelBytes = rowBytes * size;
      const buffer = Buffer.alloc(54 + pixelBytes);
      buffer.write("BM", 0, "ascii");
      buffer.writeUInt32LE(54 + pixelBytes, 2);
      buffer.writeUInt32LE(54, 10);
      buffer.writeUInt32LE(40, 14);
      buffer.writeInt32LE(size, 18);
      buffer.writeInt32LE(size, 22);
      buffer.writeUInt16LE(1, 26);
      buffer.writeUInt16LE(24, 28);
      buffer.writeUInt32LE(pixelBytes, 34);
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const source = ((size - 1 - y) * size + x) * 3;
          const target = 54 + y * rowBytes + x * 3;
          buffer[target] = pixels[source + 2];
          buffer[target + 1] = pixels[source + 1];
          buffer[target + 2] = pixels[source];
        }
      }
      return buffer;
    },
  };
}

/** The stencil-pane icon as the master index stores it: base64 BMP, inline. */
export function iconBase64(drawIcon) {
  const canvas = createIconCanvas(16);
  drawIcon(canvas);
  return canvas.toBmp().toString("base64");
}

/* ------------------------------------------------------ package checking ---- */

const partPath = (base, target) => {
  const parts = `${base}/${target}`.split("/");
  const resolved = [];
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  return resolved.join("/");
};

/**
 * What an archive can prove about a package it cannot open in Visio.
 *
 * The failures Visio answers with a repair prompt are exactly the ones a package
 * can check for itself: a part nothing types, a relationship pointing at a part
 * that is not there, a master the page names but the index does not, a field whose
 * `Prop.` name Visio cannot match, a geometry path with one point. The archive is
 * round-tripped through `readZip` as well, so a broken central directory or a bad
 * CRC fails here rather than in Visio's repair dialog.
 */
export function assertStencilPackage({ archive, masters, expectProperties = {}, expectConnections = {} }) {
  const entries = readZip(archive);
  const problems = [];
  const has = (path) => entries.has(path);

  const contentTypes = entries.get("[Content_Types].xml")?.toString("utf8") ?? "";
  if (!contentTypes) problems.push("The package has no [Content_Types].xml part.");
  if (!contentTypes.includes(`ContentType="${CONTENT_TYPES.document}"`)) {
    problems.push("The document part is not typed as a stencil, so Visio would open it as a drawing.");
  }
  const overrides = [...contentTypes.matchAll(/PartName="\/([^"]+)"/g)].map((match) => match[1]);
  for (const part of overrides) {
    if (!has(part)) problems.push(`[Content_Types].xml types ${part}, which the package does not contain.`);
  }

  for (const [name, data] of entries) {
    if (!name.endsWith(".rels")) continue;
    const text = data.toString("utf8");
    const base = name.replace(/_rels\/[^/]+$/, "").replace(/\/$/, "");
    for (const match of text.matchAll(/Target="([^"]+)"/g)) {
      const target = match[1];
      if (/^https?:/.test(target)) continue;
      const resolved = target.startsWith("/") ? target.slice(1) : partPath(base, target);
      if (!has(resolved)) problems.push(`${name} points at ${target}, which resolves to ${resolved} and is not in the package.`);
    }
  }

  for (const name of entries.keys()) {
    if (!name.endsWith(".xml") || name === "[Content_Types].xml") continue;
    const text = entries.get(name).toString("utf8");
    if (!text.startsWith("<?xml")) problems.push(`${name} does not start with an XML declaration.`);
    if ((text.match(/</g) ?? []).length !== (text.match(/>/g) ?? []).length) {
      problems.push(`${name} has unbalanced angle brackets.`);
    }
  }

  const mastersXml = entries.get("visio/masters/masters.xml")?.toString("utf8") ?? "";
  const pageXml = entries.get("visio/pages/page1.xml")?.toString("utf8") ?? "";
  const declaredMasters = [...mastersXml.matchAll(/<Master ID="(\d+)" NameU="([^"]+)"/g)]
    .map((match) => ({ id: Number(match[1]), nameU: match[2] }));
  if (declaredMasters.length !== masters.length) {
    problems.push(`The index declares ${declaredMasters.length} masters; the catalog has ${masters.length}.`);
  }
  for (const master of masters) {
    if (!declaredMasters.some((declared) => declared.nameU === master.nameU)) {
      problems.push(`The index does not declare ${master.nameU}.`);
    }
  }
  const pageMasters = [...pageXml.matchAll(/Master="(\d+)"/g)].map((match) => Number(match[1]));
  for (const id of pageMasters) {
    if (!declaredMasters.some((declared) => declared.id === id)) {
      problems.push(`The stencil page instantiates master ${id}, which the index does not declare.`);
    }
  }

  /** One `<Master …>` element, so a symbol cannot borrow the next one's icon. */
  const masterElement = (nameU) => {
    const match = mastersXml.match(new RegExp(`<Master [^>]*NameU="${nameU.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>[\\s\\S]*?</Master>`));
    return match?.[0] ?? "";
  };

  for (const [index, master] of masters.entries()) {
    const partName = `visio/masters/master${index + 1}.xml`;
    const text = entries.get(partName)?.toString("utf8") ?? "";
    if (!text) {
      problems.push(`${partName} is missing.`);
      continue;
    }
    if (!text.includes("<MasterContents")) problems.push(`${partName} has no MasterContents root.`);
    if (!text.includes('Type="Shape"')) problems.push(`${partName} declares no shape to drop.`);
    if (!/<Section N="Geometry"/.test(text)) problems.push(`${partName} draws nothing: no geometry section.`);
    const properties = (text.match(/<Row N="Prop\./g) ?? []).length;
    const connections = (text.match(/<Row T="Connection"/g) ?? []).length;
    const expectedProperties = expectProperties[master.nameU] ?? master.properties?.length ?? 0;
    const expectedConnections = expectConnections[master.nameU] ?? master.connections?.length ?? 0;
    if (properties !== expectedProperties) {
      problems.push(`${partName} declares ${properties} Shape Data fields; ${master.nameU} is described with ${expectedProperties}.`);
    }
    if (connections !== expectedConnections) {
      problems.push(`${partName} declares ${connections} connection points; ${master.nameU} is described with ${expectedConnections}.`);
    }
    if (!/<Icon>[A-Za-z0-9+/=]+<\/Icon>/.test(masterElement(master.nameU))) {
      problems.push(`${master.nameU} carries no stencil-pane icon, so its tile in the pane would be blank.`);
    }
  }

  return problems;
}
