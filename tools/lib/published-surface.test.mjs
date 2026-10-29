import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { authoredCopies, listPublishedFiles, scanPublishedSurface } from "./published-surface.mjs";
import { runPublishedSurfaceGate } from "../check-published-surface.mjs";

const roots = [];

afterEach(() => {
  while (roots.length) rmSync(roots.pop(), { recursive: true, force: true });
});

/** A throwaway site: `public/` sources, and the `dist/` a build leaves behind. */
function scratchSite({ files = {}, publicFiles = {} } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "wm-published-"));
  roots.push(root);

  for (const [relative, contents] of Object.entries(publicFiles)) {
    const absolute = path.join(root, "public", relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents);
  }
  for (const [relative, contents] of Object.entries(files)) {
    const absolute = path.join(root, "dist", relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents);
  }
  return root;
}

/** The gate's verdict for a scratch site, without touching the console. */
function gate(root) {
  const lines = [];
  const errors = [];
  const code = runPublishedSurfaceGate({
    root,
    log: (line) => lines.push(line),
    error: (line) => errors.push(line),
  });
  return { code, lines, errors };
}

describe("the published surface", () => {
  it("reports a source module a build wrote into a chunk", () => {
    const root = scratchSite({
      files: {
        "assets/backlog-abc.js": 'var t={warnAfterDays:14,note:`Shared by tools/check-wyrestorm-technical-data.mjs and src/wingman2/lib/governedConfirmationBacklog.ts.`};\n',
      },
    });

    const scan = scanPublishedSurface(root);
    expect(scan.matches.map((match) => match.text)).toEqual([
      "tools/check-wyrestorm-technical-data.mjs",
      "src/wingman2/lib/governedConfirmationBacklog.ts",
    ]);
    expect(scan.matches[0]).toMatchObject({ file: "assets/backlog-abc.js", line: 1, kind: "source-module" });
  });

  it("reports an absolute path from the machine that built it", () => {
    const root = scratchSite({
      files: {
        "assets/app.js": 'console.log("C:\\\\Users\\\\steve\\\\wingman\\\\src\\\\main.tsx");',
        "index.html": '<script type="module" src="/assets/app.js"></script>\n<!-- /home/steve/wingman/dist -->',
      },
    });

    const kinds = scanPublishedSurface(root).matches.map((match) => `${match.kind}:${match.file}`);
    expect(kinds).toEqual(["absolute-windows:assets/app.js", "absolute-posix:index.html"]);
  });

  it("leaves a data citation alone, which is content rather than a build artefact", () => {
    // Shipped product data cites where a claim came from: `#N` is a row, not a
    // module. A gate that failed on this would be asking the data to stop saying
    // where it came from.
    const root = scratchSite({
      files: {
        "assets/products.js": 'var p={notes:"src/competitor/competitors.json#7 merged into deployed competitor catalog. | data/product-intelligence-db.json#67"};\n',
      },
    });

    expect(scanPublishedSurface(root).matches).toEqual([]);
  });

  it("does not read a directory word and a slash as a path", () => {
    const root = scratchSite({
      files: {
        "assets/rooms.js": 'var r={uc:`Specify privacy mute, consent, public/private sessions and hearing assistance.`};\n',
      },
    });

    expect(scanPublishedSurface(root).matches).toEqual([]);
  });

  it("skips a file public/ was copied into, and checks one that was edited after the copy", () => {
    const authored = "`TEMPLATE_IMAGE_KEYS` in `src/wingman2/lib/templateApplicationProfiles.ts` is the mapping.\n";
    const root = scratchSite({
      publicFiles: { "template-photos/README.md": authored },
      files: {
        "template-photos/README.md": authored,
        "template-photos/EDITED.md": `${authored}And a build step appended src/wingman2/lib/extra.ts.\n`,
      },
    });

    const scan = scanPublishedSurface(root);
    expect(authoredCopies(root).has("template-photos/README.md")).toBe(true);
    // The edited file is no longer a copy, so it is build output and asked whole:
    // the authored sentence it kept is reported with the path it added.
    expect(scan.matches.map((match) => `${match.file}:${match.text}`)).toEqual([
      "template-photos/EDITED.md:src/wingman2/lib/templateApplicationProfiles.ts",
      "template-photos/EDITED.md:src/wingman2/lib/extra.ts",
    ]);
  });

  it("does not read a binary as text", () => {
    const root = scratchSite();
    mkdirSync(path.join(root, "dist"), { recursive: true });
    // A byte sequence is not a sentence a reader follows; the file is published
    // and still not asked this question.
    writeFileSync(path.join(root, "dist", "guru-bot.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0x0d, 0x73, 0x72, 0x63, 0x2f]));

    const scan = scanPublishedSurface(root);
    expect(scan.binary).toBe(1);
    expect(scan.matches).toEqual([]);
  });

  it("lists the output, and says there is none rather than reading nothing", () => {
    expect(listPublishedFiles(mkdtempSync(path.join(tmpdir(), "wm-no-dist-")), "dist")).toBeNull();

    const missing = gate(scratchSite());
    expect(missing.code).toBe(1);
    expect(missing.errors.join("\n")).toContain("run `npm run build`");
  });

  it("fails the gate with the file, the position and the path, and passes a clean output", () => {
    const leaky = scratchSite({
      files: { "assets/leak.js": "\n\nvar a=1;\nvar shared='server/rate-card.mjs';\n" },
    });
    const failed = gate(leaky);
    expect(failed.code).toBe(1);
    expect(failed.errors.join("\n")).toContain("dist/assets/leak.js:4");
    expect(failed.errors.join("\n")).toContain("server/rate-card.mjs");
    expect(failed.errors.join("\n")).toContain("readable by anyone who asks for it");

    const clean = scratchSite({ files: { "assets/app.js": "var a=1;\n", "index.html": "<div id=\"root\"></div>\n" } });
    const passed = gate(clean);
    expect(passed.code).toBe(0);
    expect(passed.lines.join("\n")).toMatch(/OK\. 2 build-written files of 2 in dist\/ name no repository paths/);
  });
});
