import { describe, expect, it } from "vitest";
import { checkCommitIndex, parseCommitIndex, shasIn } from "./check-pr-commit-index.mjs";

/**
 * Four commits, oldest first, full length as `branchCommits` returns them: the
 * index names eight characters, so the resolver's prefix matching is the thing
 * under test rather than a shared abbreviation.
 */
const SHORT = ["1111111a", "2222222b", "3333333c", "4444444d"];
const COMMITS = SHORT.map((short) => short + "0".repeat(32));

function body({ index, sections }) {
  return [
    "## What this is",
    "",
    "A description.",
    "",
    "## Which commit sits in which theme",
    "",
    "| Theme | Commits |",
    "|---|---|",
    ...index,
    "",
    ...sections.flatMap(([theme, text]) => [`### ${theme}`, "", text, ""]),
  ].join("\n");
}

const CORRECT = body({
  index: [
    `| Styling | \`${SHORT[0]}\` \`${SHORT[1]}\` |`,
    `| The walk | \`${SHORT[2]}\` \`${SHORT[3]}\` |`,
  ],
  sections: [
    ["Styling", `- \`${SHORT[0]}\` moves a rule.\n- \`${SHORT[1]}\` compares two orders.`],
    ["The walk", `- \`${SHORT[2]}\` lands the harness.\n- \`${SHORT[3]}\` reads a card.`],
  ],
});

describe("shasIn", () => {
  it("reads only eight-character hex in backticks, in order", () => {
    expect(shasIn("`11111111` then `deadbeef` and a `1234567890` run and `nothex1`")).toEqual([
      "11111111",
      "deadbeef",
    ]);
  });
});

describe("parseCommitIndex", () => {
  it("returns null for a description with no index", () => {
    expect(parseCommitIndex("## What this is\n\nNo table here.\n")).toBeNull();
  });

  it("reads a row's theme as the exact text of a heading below it", () => {
    const parsed = parseCommitIndex(CORRECT);
    expect(parsed.rows.map((row) => row.theme)).toEqual(["Styling", "The walk"]);
    expect(parsed.sections.get("The walk")).toEqual([SHORT[2], SHORT[3]]);
  });

  it("stops a row at the table's end rather than at the next blank line only", () => {
    const parsed = parseCommitIndex(
      body({ index: [`| Styling | \`${SHORT[0]}\` |`], sections: [["Styling", `- \`${SHORT[0]}\``]] }),
    );
    expect(parsed.rows).toHaveLength(1);
  });
});

describe("checkCommitIndex", () => {
  it("skips a description with no index rather than demanding one", () => {
    const verdict = checkCommitIndex({ body: "## What this is\n\nNothing indexed.\n", commits: COMMITS });
    expect(verdict.skipped).toBe(true);
    expect(verdict.problems).toEqual([]);
  });

  it("passes an index whose rows and sections agree, oldest first", () => {
    expect(checkCommitIndex({ body: CORRECT, commits: COMMITS }).problems).toEqual([]);
  });

  it("fails a row ordered by memory rather than by the history", () => {
    const wrong = body({
      index: [
        `| Styling | \`${SHORT[1]}\` \`${SHORT[0]}\` |`,
        `| The walk | \`${SHORT[2]}\` \`${SHORT[3]}\` |`,
      ],
      sections: [
        ["Styling", `- \`${SHORT[0]}\` moves a rule.\n- \`${SHORT[1]}\` compares two orders.`],
        ["The walk", `- \`${SHORT[2]}\` lands the harness.\n- \`${SHORT[3]}\` reads a card.`],
      ],
    });
    const { problems } = checkCommitIndex({ body: wrong, commits: COMMITS });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('row "Styling" is not oldest first');
  });

  it("fails a SHA that is not on the branch", () => {
    const invented = body({
      index: [`| Styling | \`${SHORT[0]}\` \`abcdef12\` |`, `| The walk | \`${SHORT[1]}\` \`${SHORT[2]}\` \`${SHORT[3]}\` |`],
      sections: [
        ["Styling", `- \`${SHORT[0]}\` moves a rule.`],
        ["The walk", `- \`${SHORT[1]}\` a.\n- \`${SHORT[2]}\` b.\n- \`${SHORT[3]}\` c.`],
      ],
    });
    const { problems } = checkCommitIndex({ body: invented, commits: COMMITS });
    expect(problems.some((problem) => problem.includes("`abcdef12`, which is not a commit"))).toBe(true);
  });

  it("fails a commit no row accounts for", () => {
    const short = body({
      index: [`| Styling | \`${SHORT[0]}\` \`${SHORT[1]}\` |`, `| The walk | \`${SHORT[2]}\` |`],
      sections: [
        ["Styling", `- \`${SHORT[0]}\` a.\n- \`${SHORT[1]}\` b.`],
        ["The walk", `- \`${SHORT[2]}\` c.`],
      ],
    });
    const { problems } = checkCommitIndex({ body: short, commits: COMMITS });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`\`${SHORT[3]}\`) is in no row`);
  });

  it("fails a row that lists a commit its section never discusses", () => {
    const drifted = body({
      index: [
        `| Styling | \`${SHORT[0]}\` \`${SHORT[1]}\` |`,
        `| The walk | \`${SHORT[2]}\` \`${SHORT[3]}\` |`,
      ],
      sections: [
        // the row will list SHORT[1], which this section never names
        ["Styling", `- \`${SHORT[0]}\` moves a rule.`],
        ["The walk", `- \`${SHORT[2]}\` c.\n- \`${SHORT[3]}\` d.`],
      ],
    });
    const { problems } = checkCommitIndex({ body: drifted, commits: COMMITS });
    expect(problems.some((problem) => problem.includes(`row "Styling" lists \`${SHORT[1]}\``))).toBe(true);
  });

  it("fails a section that discusses a commit its row omits", () => {
    const drifted = body({
      index: [
        `| Styling | \`${SHORT[0]}\` |`,
        `| The walk | \`${SHORT[1]}\` \`${SHORT[2]}\` \`${SHORT[3]}\` |`,
      ],
      sections: [
        ["Styling", `- \`${SHORT[0]}\` moves a rule, and \`${SHORT[1]}\` moves another.`],
        ["The walk", `- \`${SHORT[2]}\` c.\n- \`${SHORT[3]}\` d.`],
      ],
    });
    const { problems } = checkCommitIndex({ body: drifted, commits: COMMITS });
    expect(problems.some((problem) => problem.includes(`which its row omits`))).toBe(true);
  });

  it("fails a row naming a section the description does not have", () => {
    const renamed = body({
      index: [
        `| Styling | \`${SHORT[0]}\` \`${SHORT[1]}\` |`,
        `| The walk | \`${SHORT[2]}\` \`${SHORT[3]}\` |`,
        "| The gone theme | |",
      ],
      sections: [
        ["Styling", `- \`${SHORT[0]}\` a.\n- \`${SHORT[1]}\` b.`],
        ["The walk", `- \`${SHORT[2]}\` c.\n- \`${SHORT[3]}\` d.`],
      ],
    });
    const { problems } = checkCommitIndex({ body: renamed, commits: COMMITS });
    expect(problems.some((problem) => problem.includes('row "The gone theme" names a section'))).toBe(true);
  });

  it("fails a commit listed in two rows", () => {
    const twice = body({
      index: [
        `| Styling | \`${SHORT[0]}\` \`${SHORT[1]}\` |`,
        `| The walk | \`${SHORT[2]}\` \`${SHORT[3]}\` \`${SHORT[1]}\` |`,
      ],
      sections: [
        ["Styling", `- \`${SHORT[0]}\` a.\n- \`${SHORT[1]}\` b.`],
        ["The walk", `- \`${SHORT[2]}\` c.\n- \`${SHORT[3]}\` d.\n- \`${SHORT[1]}\` b again.`],
      ],
    });
    const { problems } = checkCommitIndex({ body: twice, commits: COMMITS });
    expect(problems.some((problem) => problem.includes("is listed in both"))).toBe(true);
  });

  it("reads an index written at eight characters against a branch printing nine", () => {
    // The resolver compares by prefix, because git's abbreviation is not a
    // constant of the repository and `%h` has returned nine here before.
    const wide = COMMITS.map((sha) => sha.slice(0, 9));
    expect(checkCommitIndex({ body: CORRECT, commits: wide }).problems).toEqual([]);
  });
});
