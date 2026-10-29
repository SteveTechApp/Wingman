/**
 * Which surface each of the browser walk's readings belongs to.
 *
 * The walk prints one sentence per pass, and those sentences are the evidence a
 * layout promise is kept. Frozen into one flat list they are only a transcript:
 * a doc note saying "the gallery holds its action rows" has no way to point at
 * the line that says how many rows, at which widths, with how much room left.
 * So every reading is filed under the surface it is about, the report prints one
 * section per surface, and a doc note links to that section's anchor.
 *
 * The table is the index, held here rather than in the report, because two files
 * read it: the freeze tool that writes the sections, and the documentation
 * contract that refuses a doc link to a section that does not exist. A table
 * copied into each would be one more thing to keep in step.
 *
 * Filing fails closed. A reading that matches no section is not appended
 * unindexed — it would be invisible to every doc note — and a reading that
 * matches two is refused as well, because the second section would print it
 * twice or the first would silently win. Both failures name the reading, so
 * rewording a pass is a change to this table rather than a reading that quietly
 * leaves the index.
 *
 * Matchers are written against the sentence a pass prints, not against its
 * numbers: a count or a pixel width that moves is the reading, and a matcher
 * that pinned one would stop filing the line it was written for.
 */
export const BROWSER_READINGS_REPORT = "reports/browser-readings.md";

/**
 * One entry per surface a doc note can point at: the anchor it is linked by, the
 * heading the report prints, and the sentences its readings open with.
 */
export const READING_SECTIONS = [
  {
    id: "the-run",
    title: "The run",
    match: [/^Reading the build/, /^Verified built app pages/],
  },
  {
    id: "project-gallery",
    title: "Project gallery",
    match: [
      /gallery card row states/,
      /^The store line above the cards/,
      /design entry prints at least/,
      /^By width, the longest-named/,
    ],
  },
  {
    id: "guided-home-recent-strip",
    title: "Guided Home recent strip",
    match: [/^The guided Home's three recent cards/],
  },
  {
    id: "journey-strip",
    title: "Journey strip",
    match: [/^The journey strip's/],
  },
  {
    id: "crm-send-history",
    title: "CRM send history",
    match: [
      /CRM send-history rows/,
      /^Every shape in the send history/,
      /^A send dropped/,
      /^The dropped-sends note/,
    ],
  },
  {
    id: "browser-storage-reclaim",
    title: "Browser storage reclaim",
    match: [/^A load that found a retired/],
  },
  {
    id: "response-builder-step-cards",
    title: "Response builder step cards",
    match: [/response-builder step cards/],
  },
  {
    id: "settings-hero",
    title: "Settings hero",
    match: [/^The Settings hero/],
  },
  {
    id: "sales-helper-hero",
    title: "Sales Helper hero",
    match: [/^The Sales Helper hero/],
  },
  {
    id: "guided-wall-start-step",
    title: "Guided wall start step",
    match: [/^The guided wall wizard's start step/],
  },
  {
    id: "template-save-notice",
    title: "Template save notice",
    match: [/^The template save notice/],
  },
  {
    id: "routes-and-shell",
    title: "Routes and shell",
    match: [/^All \d+ routes in the manifest/],
  },
];

export const READING_SECTION_IDS = new Set(READING_SECTIONS.map((section) => section.id));

/**
 * The readings, grouped, plus the ones that could not be placed.
 *
 * Sections keep the table's order rather than a reading's order, so the report's
 * index reads the same way every run and a section with nothing in it is visible
 * as empty instead of vanishing.
 */
export function fileReadings(lines = []) {
  const sections = READING_SECTIONS.map((section) => ({ ...section, readings: [] }));
  const unplaced = [];
  const ambiguous = [];

  for (const line of lines) {
    const hits = sections.filter((section) => section.match.some((pattern) => pattern.test(line)));
    if (hits.length === 1) hits[0].readings.push(line);
    else if (hits.length === 0) unplaced.push(line);
    else ambiguous.push({ line, ids: hits.map((section) => section.id) });
  }

  return { sections, unplaced, ambiguous };
}

/** The sentence a top-level anchor is reached by, for a report or a doc link. */
export function sectionAnchor(id) {
  return `#${id}`;
}

/**
 * The report text: the run around the readings, an index, then one section each.
 *
 * The index is built from the same table the sections are, so a link in it always
 * lands on a heading — a hand-written index would be the first thing to drift.
 * A section with no reading still prints, saying so: a surface that dropped out of
 * the walk is exactly what a reader comparing two reports needs to see, and a
 * missing heading would turn every doc note pointing at it into a dead anchor.
 *
 * `problems` is the filing failure, returned rather than thrown so a failing walk
 * still writes its report — the failure is the most useful reading of the day —
 * and the caller decides the exit code.
 */
export function buildReadingsReport({
  lines = [],
  exit = 0,
  build = "The walk printed no build stamp.",
  commit = "unknown",
  dirty = false,
  captured = new Date().toISOString(),
} = {}) {
  const { sections, unplaced, ambiguous } = fileReadings(lines);
  const placed = sections.filter((section) => section.readings.length > 0);
  const count = (value) => `${value} reading${value === 1 ? "" : "s"}`;

  // Filing is a ratchet, not a best effort. An unplaced reading is a number no doc
  // note can point at, and a doubly placed one would print twice or lose its second
  // section; both are the index going stale, which is what this report prevents.
  const problems = [
    ...unplaced.map((line) => `no section claims this reading: ${line.slice(0, 160)}`),
    ...ambiguous.map((entry) => `two sections claim this reading (${entry.ids.join(", ")}): ${entry.line.slice(0, 160)}`),
  ];

  const text = [
    "# Browser readings",
    "",
    "Generated by `npm run readings:freeze` from one run of the browser walk. Do not edit",
    "by hand: every line below is what `tools/browser-smoke-check.mjs` printed, and a",
    "hand edit would be a number no run produced.",
    "",
    `- Command: \`node tools/browser-smoke-check.mjs\` (exit ${exit})`,
    `- Build: ${build}`,
    `- Commit: \`${commit}\`${dirty ? " with uncommitted changes in the tree" : ", clean tree"}`,
    `- Captured: ${captured}`,
    "",
    lines.length
      ? `${count(lines.length)} in ${placed.length} of ${sections.length} sections. A doc note links to the
section carrying its surface, so a section with no reading is a surface this run did not
measure.`
      : "The walk printed no readings, which means it failed before the first pass reported — read its own output.",
    "",
    ...(problems.length
      ? [
        "## Unfiled readings",
        "",
        "The index does not know which surface these belong to, so no note can point at them:",
        "",
        ...problems.map((problem) => `- ${problem}`),
        "",
      ]
      : []),
    "## Index",
    "",
    ...sections.map((section) => `- [${section.title}](${sectionAnchor(section.id)}) — ${count(section.readings.length)}`),
    "",
    ...sections.flatMap((section) => [
      `## ${section.title}`,
      "",
      ...(section.readings.length
        ? section.readings.map((line) => `- ${line}`)
        : ["- Nothing measured this run."]),
      "",
    ]),
  ].join("\n");

  return { text, problems, sections, placed };
}
