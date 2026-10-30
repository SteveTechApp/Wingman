# Drawing symbols and stencils

The narrative behind the invariants in `AGENTS.md`: each rule in full, why it
exists, and the probe that proved it. A number quoted here records the run that
decided the rule; `reports/browser-readings.md` is the current measurement.

- `stencils/wingman-av-symbols.vssx` is a real Visio stencil, built by
  `node tools/build-visio-stencil.mjs` from `tools/lib/av-symbols.mjs` through
  `tools/lib/visio-stencil.mjs`. Nothing needs Visio to produce it: from Visio
  2013 on a `.vssx` is an OPC/ZIP package of XML, so the symbols are data and the
  package is written by hand — `zipParts` is a small deterministic ZIP writer and
  `readZip` reads it back. What makes the archive a *stencil* rather than a
  drawing is one string: the document part is typed
  `application/vnd.ms-visio.stencil.main+xml`, where a drawing's is
  `…drawing.main+xml`. Copying content types from a drawing's package is the one
  mistake that would leave Visio opening it as a drawing, so `stencil.main+xml`
  is asserted rather than restated.
- Each symbol is one `Shape` in its own master part, not a group: several
  `Geometry` sections carry the body and the details drawn over it, and only
  whether a path takes the fill (`NoFill`) varies per section, because fill
  colour belongs to the shape. Every `X`/`Y` row carries both its value and a
  `Width*`/`Height*` formula, so a designer who resizes the dropped shape moves
  the drawing with it. The Shape Data fields a rep fills in are `Prop.<name>`
  rows in `Section N="Property"` (`Type` 0 is text, 1 is a number; `SortKey`
  fixes the order in the Shape Data window), and the four glue points are
  `Section N="Connection"` rows with `DirX`/`DirY` left at zero — a directionless
  point is what Visio's own equipment masters carry, and it lets a connector
  leave in whichever direction the layout needs.
- The stencil-pane icon is not a package part: it is base64 **BMP** data inline
  in the master's `<Icon>` beside `IconSize="1"`, which is how a distributed
  40-master stencil stores 16×16 tiles. `createIconCanvas` draws each one from the
  same geometry the symbol uses, so a new symbol cannot arrive in the pane as a
  blank square.
- Nothing here can open the file — there is no Visio on this machine — so
  `assertStencilPackage` checks the class of defect Visio answers with a repair
  prompt instead: a part no content type covers, a relationship to a part that is
  not there, a master the page instantiates but the index does not declare, a
  symbol that draws nothing, a field count the catalog and the shape disagree
  about, and a byte-for-byte round trip through the archive. It runs before the
  file is written, so a package that does not hold together is never produced.
  First use in Visio is the real test; quote any prompt back rather than assuming
  the package is right. `visio-stencil.test.mjs` pins each of those failures plus
  the catalog's own invariants (distinct `NameU`s, every point inside the drop
  box, four glue points, no duplicate field).
- The build is deterministic down to the byte — fixed part timestamps, one
  compression level, a fixed build stamp in `core.xml` — so rebuilding an
  unchanged symbol set produces an identical file and a diff means a symbol
  changed. A new symbol is an entry in `AV_SYMBOLS` and nothing else: the builder,
  the icon, the page instance and the spec all read that list. Do not add an
  `npm` script for it; `package.json` is a build input to the browser walk's
  fresh-build gate, so a new script would refuse a `dist/` that is still current.
