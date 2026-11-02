/**
 * Reads `docs/USER_GUIDE.md` into the blocks the Help page renders.
 *
 * The guide file is the only copy of this text. The Help page imports it raw and
 * this module turns it into headings, paragraphs, lists and tables, so a section
 * added to the guide becomes a section the page shows without a code change.
 * Hand-writing the page's copy would be a second copy of a document a rep
 * already has, and the two would disagree the first time a section moved.
 *
 * Links are reduced to their text: the guide's links point at other Markdown
 * files, which are not addresses this app serves, and printing a path a rep
 * cannot open would read as a broken link.
 *
 * A `##` heading is a section, which is the unit the page reads one of at a
 * time. The number a heading opens with is dropped from the section's label
 * because the rail already numbers its bands, and `3 3. Compare` is two
 * numbers arguing about the same thing.
 */

/** One run of text in a paragraph, list item or table cell. */
export type GuideInline = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
};

export type GuideBlock =
  | { kind: "heading"; level: 3; id: string; text: string }
  | { kind: "paragraph"; spans: GuideInline[] }
  | { kind: "list"; ordered: boolean; items: GuideInline[][] }
  | { kind: "table"; head: GuideInline[][]; rows: GuideInline[][][] };

/** One `##` section: what the rail offers, and what its panel prints. */
export type GuideSection = {
  key: string;
  label: string;
  blocks: GuideBlock[];
};

export type ParsedGuide = {
  title: string;
  lead: GuideBlock[];
  sections: GuideSection[];
};

const LINK = /\[([^\]]+)\]\([^)]*\)/g;
const INLINE_TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;

/**
 * Splits one line of Markdown into its plain, bold, italic and code runs.
 *
 * The guide uses only these four, so a full inline parser would be machinery no
 * page in this app needs. An unmatched delimiter stays in the text rather than
 * disappearing, because a stray asterisk reads as a typo and a dropped one reads
 * as a missing word.
 */
export function guideInline(text: string): GuideInline[] {
  const plain = text.replace(LINK, "$1");
  const spans: GuideInline[] = [];
  let last = 0;

  for (const match of plain.matchAll(INLINE_TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) spans.push({ text: plain.slice(last, index) });
    const token = match[0];
    if (token.startsWith("**")) {
      spans.push({ text: token.slice(2, -2), bold: true });
    } else if (token.startsWith("`")) {
      spans.push({ text: token.slice(1, -1), code: true });
    } else {
      spans.push({ text: token.slice(1, -1), italic: true });
    }
    last = index + token.length;
  }

  if (last < plain.length) spans.push({ text: plain.slice(last) });

  return spans.filter((span) => span.text.length > 0);
}

/** A heading's stable address fragment, unique within one document. */
function slug(text: string, used: Set<string>): string {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

/** A section's name without the number it opens with. */
export function guideSectionLabel(heading: string): string {
  return heading.replace(/^\d+\.\s*/, "").trim();
}

const TABLE_CELL_SEPARATOR = /^\|[\s:|-]+\|$/;

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

/** Parses the guide into its title, its opening blocks and its sections. */
export function parseGuide(markdown: string): ParsedGuide {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const used = new Set<string>();
  const lead: GuideBlock[] = [];
  const sections: GuideSection[] = [];
  let title = "Wingman user guide";
  let section: GuideSection | null = null;
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let table: { head: string[]; rows: string[][] } | null = null;

  const target = () => section?.blocks ?? lead;

  function flushParagraph() {
    if (paragraph.length > 0) {
      target().push({ kind: "paragraph", spans: guideInline(paragraph.join(" ")) });
      paragraph = [];
    }
  }

  function flushList() {
    if (!list) return;
    target().push({ kind: "list", ordered: list.ordered, items: list.items.map(guideInline) });
    list = null;
  }

  function flushTable() {
    if (!table) return;
    target().push({
      kind: "table",
      head: table.head.map(guideInline),
      rows: table.rows.map((row) => row.map(guideInline)),
    });
    table = null;
  }

  function flush() {
    flushParagraph();
    flushList();
    flushTable();
  }

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");

    if (!line.trim()) {
      flush();
      continue;
    }

    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }

    if (line.startsWith("## ")) {
      flush();
      const label = guideSectionLabel(line.slice(3));
      section = { key: slug(label, used), label, blocks: [] };
      sections.push(section);
      continue;
    }

    if (line.startsWith("### ")) {
      flush();
      const text = line.slice(4).trim();
      target().push({ kind: "heading", level: 3, id: slug(text, used), text });
      continue;
    }

    if (line.trim().startsWith("|")) {
      flushParagraph();
      flushList();
      if (TABLE_CELL_SEPARATOR.test(line.trim())) continue;
      const cells = tableCells(line);
      if (!table) table = { head: cells, rows: [] };
      else table.rows.push(cells);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);

    if (bullet || numbered) {
      flushParagraph();
      flushTable();
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet?.[1] ?? numbered?.[1] ?? "").trim());
      continue;
    }

    // A wrapped line continues the thing above it: the guide wraps its bullets
    // and its paragraphs at the same width, so the indent is what separates a
    // second bullet from the rest of the first.
    if (list && list.items.length > 0 && /^\s{2,}/.test(raw)) {
      list.items[list.items.length - 1] = `${list.items[list.items.length - 1]} ${line.trim()}`;
      continue;
    }

    flushTable();
    paragraph.push(line.trim());
  }

  flush();

  return { title, lead, sections };
}
