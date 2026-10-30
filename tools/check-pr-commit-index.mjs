#!/usr/bin/env node
/**
 * Checks a description's commit index against the branch it describes.
 *
 * A long-lived branch makes a description carry a claim no person can check by
 * reading: a table saying which commit sits in which section of the story. The
 * claim is only worth printing while it is true, and it goes false in four
 * quiet ways — a commit listed under a section that never discusses it, a
 * section discussing a commit its row forgot, a row ordered by the author's
 * memory rather than by the history, and a commit listed under a theme the body
 * no longer has a heading for. Every one of those reads exactly like a correct
 * index, which is why this gate reads the branch instead of the prose.
 *
 * What the index promises is what is checked, and it is deliberately whole:
 *
 * - every commit between the base and the head appears in exactly one row, so a
 *   commit found by `git bisect` or `git blame` can be traced into the story;
 * - a row and its `### ` section name the same commits, because the row's job is
 *   to say where a reader should look;
 * - each row is oldest first, since that is what the row's own sentence says;
 * - every value is a commit on this branch, not a SHA from another PR.
 *
 * A description with no `| Theme | Commits |` table is not assessed at all.
 * Most pull requests have no index, and the gate exists to hold one that was
 * written rather than to demand one. A body that cannot be read — no pull
 * request in the environment, a git history too shallow to list the branch, a
 * failing API call — is skipped with a note rather than failed, because a gate
 * that cannot see must not guess.
 *
 * Usage (CI): GITHUB_REPOSITORY, PR_NUMBER and GITHUB_TOKEN in the environment,
 * then `node tools/check-pr-commit-index.mjs`. The workflow must check out the
 * pull request's head with full history: a shallow clone cannot list the
 * commits, and the merge ref would add a commit the index never lists.
 *
 * Usage (local): `--body-file <path>` assesses a saved body against the branch
 * in the current checkout, which is how a person checks an index before pushing:
 *
 *   gh pr view 291 --json body -q .body > /tmp/body.md
 *   node tools/check-pr-commit-index.mjs --body-file /tmp/body.md
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** The table this gate reads. A body without it is not assessed. */
export const INDEX_HEADER = "| Theme | Commits |";

/** A commit as an index names it: eight hex characters in backticks. */
const SHA_TOKEN = /`([0-9a-f]{8})`/g;

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

/** Every eight-character hex token in a piece of markdown, in order. */
export function shasIn(text) {
  return [...String(text).matchAll(SHA_TOKEN)].map((match) => match[1]);
}

/**
 * The index table, and the commits each row's section discusses.
 *
 * A row is read as `| theme | shas |`, where the theme is the exact text of a
 * `### ` heading below it. The section is scanned for every SHA it names, not
 * only its bullets, because a section that discusses a commit in a sentence has
 * said as much as one that lists it.
 *
 * @returns {{ rows: Array<{ theme: string, shas: string[], line: number }>, sections: Map<string, string[]> } | null}
 */
export function parseCommitIndex(body = "") {
  const lines = String(body).split(/\r?\n/);
  const headerAt = lines.findIndex((line) => line.trim() === INDEX_HEADER);
  if (headerAt < 0) return null;

  const rows = [];
  // The separator row follows the header; rows run until the table ends.
  for (let i = headerAt + 2; i < lines.length && lines[i].trim().startsWith("|"); i++) {
    const cells = lines[i].split("|").map((cell) => cell.trim());
    if (cells.length < 3) continue;
    rows.push({ theme: cells[1], shas: shasIn(lines[i]), line: i + 1 });
  }

  // Each section runs from its `### ` heading to the next heading of any level.
  const sections = new Map();
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(/^###\s+(.+?)\s*$/);
    if (!heading) continue;
    const theme = heading[1];
    const block = [];
    for (let j = i + 1; j < lines.length && !/^#{2,3}\s/.test(lines[j]); j++) block.push(lines[j]);
    sections.set(theme, shasIn(block.join("\n")));
  }

  return { rows, sections };
}

/**
 * The problems an index has against a branch's commits.
 *
 * `commits` is oldest first and full-length, so a listed short SHA is resolved
 * by prefix rather than by comparing lengths: git's abbreviation is not a
 * constant of this repository, and an index written at eight characters must
 * still read a branch that prints nine.
 *
 * @param {{ body: string, commits: string[] }} input
 * @returns {{ skipped: boolean, reason?: string, problems: string[] }}
 */
export function checkCommitIndex({ body = "", commits = [] }) {
  const parsed = parseCommitIndex(body);
  if (!parsed) {
    return {
      skipped: true,
      reason: `no \`${INDEX_HEADER}\` table in the description - nothing to check.`,
      problems: [],
    };
  }
  if (parsed.rows.length === 0) {
    return { skipped: false, problems: [`the index has ${INDEX_HEADER} but no rows under it.`] };
  }

  const order = new Map(commits.map((sha, index) => [sha, index]));
  const resolve = (short) => commits.find((sha) => sha.startsWith(short)) ?? null;
  const position = (short) => {
    const full = resolve(short);
    return full === null ? -1 : order.get(full);
  };

  const problems = [];
  const seen = new Map();

  for (const row of parsed.rows) {
    if (!parsed.sections.has(row.theme)) {
      problems.push(`row "${row.theme}" names a section the description does not have as an \`### \` heading.`);
      continue;
    }
    const sectionShas = parsed.sections.get(row.theme);

    for (const sha of row.shas) {
      if (resolve(sha) === null) {
        problems.push(`row "${row.theme}" lists \`${sha}\`, which is not a commit between the base and the head.`);
        continue;
      }
      if (seen.has(sha)) {
        problems.push(`\`${sha}\` is listed in both "${seen.get(sha)}" and "${row.theme}"; a commit belongs to one section.`);
      } else {
        seen.set(sha, row.theme);
      }
    }

    // The row is where a reader is sent, so it has to name what its section says.
    for (const sha of row.shas) {
      if (resolve(sha) !== null && !sectionShas.includes(sha)) {
        problems.push(`row "${row.theme}" lists \`${sha}\`, but its section never discusses it - a reader following the row lands nowhere.`);
      }
    }
    for (const sha of sectionShas) {
      if (!row.shas.includes(sha) && resolve(sha) !== null) {
        problems.push(`the "${row.theme}" section discusses \`${sha}\`, which its row omits.`);
      }
    }

    const positions = row.shas.map(position).filter((value) => value >= 0);
    const sorted = [...positions].sort((a, b) => a - b);
    if (positions.join() !== sorted.join()) {
      problems.push(`row "${row.theme}" is not oldest first, and its own sentence says it is.`);
    }
  }

  for (const [index, sha] of commits.entries()) {
    const short = sha.slice(0, 8);
    if (!seen.has(short)) {
      problems.push(`the branch's commit ${index + 1} (\`${short}\`) is in no row, so nothing in the description explains it.`);
    }
  }

  return { skipped: false, problems };
}

/**
 * The commits between a base and HEAD, oldest first, at full length.
 *
 * Merges are excluded because of how the workflow checks out: a `pull_request`
 * event hands a job GitHub's merge of the branch into its base, so `HEAD` is a
 * commit that exists only for the run and belongs in no story. A merge commit
 * inside the branch is plumbing for the same reason — the index names the work,
 * not the joins.
 */
export function branchCommits(base = "origin/main") {
  const log = (args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  return log(["log", "--reverse", "--no-merges", "--format=%H", `${base}..HEAD`])
    .split("\n")
    .filter(Boolean);
}

/** The description as GitHub holds it, for the pull request this run is about. */
export async function fetchDescription({ repository, pullNumber, token = "", apiUrl = "https://api.github.com" }) {
  const response = await fetch(`${apiUrl}/repos/${repository}/pulls/${pullNumber}`, {
    headers: {
      accept: "application/vnd.github+json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub answered ${response.status} reading pull request #${pullNumber}`);
  return (await response.json()).body ?? "";
}

function skip(reason) {
  console.log(`[pr-index] Skipped: ${reason}`);
  process.exitCode = 0;
}

export async function main() {
  const bodyFile = argument("--body-file");
  const base = argument("--base") ?? "origin/main";
  const repository = process.env.GITHUB_REPOSITORY ?? argument("--repository");
  const pullNumber = process.env.PR_NUMBER ?? argument("--pull");
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";

  let body;
  if (bodyFile) {
    body = readFileSync(bodyFile, "utf8");
  } else if (repository && pullNumber) {
    try {
      body = await fetchDescription({ repository, pullNumber, token });
    } catch (error) {
      return skip(`could not read the description (${error.message}) - skipping rather than guessing.`);
    }
  } else {
    return skip("no description to read (pass --body-file, or set GITHUB_REPOSITORY and PR_NUMBER).");
  }

  let commits;
  try {
    commits = branchCommits(base);
  } catch (error) {
    return skip(`could not list the branch (${error.message}) - skipping rather than guessing.`);
  }
  if (commits.length === 0) {
    return skip(`\`${base}..HEAD\` is empty, so there is no branch to check the index against.`);
  }

  const { skipped, reason, problems } = checkCommitIndex({ body, commits });
  if (skipped) return skip(reason);

  if (problems.length === 0) {
    console.log(
      `[pr-index] OK: the description's index covers all ${commits.length} commits over \`${base}\`, ` +
        "one section each, oldest first.",
    );
    return;
  }

  console.error(`[pr-index] The description's commit index no longer matches \`${base}..HEAD\`:`);
  for (const problem of problems) {
    console.error(`::error::${problem}`);
    console.error(`- ${problem}`);
  }
  console.error("");
  console.error("Fix the index or the section it points at; this check reruns when the description is edited.");
  process.exitCode = 1;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  await main();
}
