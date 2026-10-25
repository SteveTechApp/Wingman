#!/usr/bin/env node
// Fails a pull request whose description no longer describes the branch it is
// attached to.
//
// A PR body is written while the work behind it is still moving, and two
// kinds of claim go stale first. Both are checked against data GitHub already
// holds, so the gate needs no extra state of its own:
//
// 1. A failure claim ("still failing", "checks are red", "not passing") is
//    stale once every completed check run on the head has succeeded and at
//    least one of them actually ran. The body would keep sending a reader to a
//    red run that no longer exists.
// 2. An outstanding claim - an unticked checklist box, an item under a
//    Remaining / Still to do / TODO heading, or a line that says the work
//    "still needs" doing - is stale once the branch has closed it: the item
//    names a file this PR changes, or it is a checklist box on a non-draft PR
//    whose latest checks are green, which is the work the box was waiting on
//    having run and passed.
//
// Deliberately narrow, because a description gate that reads prose nobody
// expects it to read gets switched off:
// - only present-tense phrases are failure claims; "failed before this
//   change", "used to fail", "no failing tests" and quoted logs are not
// - fenced code blocks and quoted (`>`) lines are skipped, so a pasted failing
//   log is evidence a reader is being shown, not a claim about the head
// - queued and in-progress runs are ignored rather than counted as not green,
//   because this check is itself a run in progress while it reads the others
// - a genuinely open item is kept with an inline
//   `<!-- keep-outstanding: reason -->` marker, and a body that describes
//   another branch's state can opt out with `<!-- pr-description: skip -->`
//
// Usage (CI): GITHUB_REPOSITORY, PR_NUMBER and GITHUB_TOKEN in the
// environment, then `node tools/check-pr-description-freshness.mjs`.
// Usage (local): `GITHUB_REPOSITORY=... PR_NUMBER=... node
// tools/check-pr-description-freshness.mjs` reads the public API without a
// token; `--body-file <path>` [--checks-file <path>] instead assesses a saved
// body against a saved check-runs payload, and `--files-file <path>` adds the
// changed-file list. Without a PR number the tool skips with a note.

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

/** A body with this marker anywhere is not assessed at all. */
export const SKIP_MARKER = "<!-- pr-description: skip -->";
/** A claim carrying this marker keeps reporting itself as still open. */
export const KEEP_OUTSTANDING_MARKER = "<!-- keep-outstanding";

const FAILURE_CLAIMS = [
  /\bstill failing\b/i,
  /\bstill red\b/i,
  /\bchecks? (?:are|is) (?:still )?(?:red|failing)\b/i,
  /\bci (?:is|stays|remains) red\b/i,
  /\bred (?:on|in) ci\b/i,
  /\bfailing (?:on|in) ci\b/i,
  /\bnot passing\b/i,
  /\b\d+ (?:checks?|tests?) (?:are )?failing\b/i,
  /\btests? (?:are|is) failing\b/i,
];

// Words that turn a line into a report about something that already happened.
const NOT_A_CLAIM = [
  /\bno (?:failing|failed|red)\b/i,
  /\bnot failing\b/i,
  /\bnot red\b/i,
  /\bnothing (?:is )?failing\b/i,
  /\b(?:before|prior to) (?:this|the) (?:change|fix|commit|branch)\b/i,
  /\bpreviously\b/i,
  /\bused to (?:fail|be red|be failing)\b/i,
  /\bwas (?:still )?(?:failing|red)\b/i,
  /\bwere (?:still )?failing\b/i,
  /\bno outstanding\b/i,
  /\bnot outstanding\b/i,
  /\bfixed\b/i,
  /\bnow (?:green|passing|passes)\b/i,
];

// The marker has to open the heading: "## How to do it" is instructions, not a
// statement that work is undone, and a heading matched by keyword anywhere
// would turn its bullets into claims nobody made.
const OUTSTANDING_HEADING =
  /^#{1,6}\s*(remaining|still to do|still to be done|outstanding|not yet done|not done yet|todo|to do|unfinished|pending work)\b/i;

const OUTSTANDING_PROSE = [
  /\bstill needs?\b/i,
  /\bstill to (?:do|be done|be added|be wired|be written|be landed|land)\b/i,
  /\bnot yet (?:done|added|wired|written|implemented|landed|covered)\b/i,
  /\bremains? to be\b/i,
  /\bneeds? to be (?:done|added|wired|written|implemented|covered)\b/i,
  /\boutstanding (?:work|item|task|check|fix)\b/i,
];

const SUCCESS_CONCLUSIONS = new Set(["success"]);
const HARMLESS_CONCLUSIONS = new Set(["neutral", "skipped"]);
const FAILURE_CONCLUSIONS = new Set([
  "failure",
  "timed_out",
  "cancelled",
  "action_required",
  "startup_failure",
  "stale",
]);

const PATH_TOKEN =
  /(?:^|[`\s("'])((?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.(?:mjs|cjs|js|ts|tsx|json|ya?ml|css|md|csv))|(?:^|[`\s("'])([A-Za-z0-9_-]+\.(?:mjs|cjs|js|ts|tsx|json|ya?ml|css|md|csv))\b/g;

/**
 * The claims a description makes about its own branch, in the order they
 * appear. An item a person annotated as genuinely open never appears here: it
 * is dropped rather than reported.
 *
 * @param {string} body pull request description
 * @returns {Array<{ kind: "failure" | "outstanding", source: string, text: string, line: number, phrase: string }>}
 */
export function extractDescriptionClaims(body = "") {
  const lines = String(body).split(/\r?\n/);
  const claims = [];
  let inFence = false;
  /** The nearest heading at or above the current line, when it claims open work. */
  let section = null;

  const keepFor = (lineNumber) => {
    const own = lines[lineNumber - 1] ?? "";
    if (own.includes(KEEP_OUTSTANDING_MARKER)) return true;
    if (section?.outstanding && (lines[section.line - 1] ?? "").includes(KEEP_OUTSTANDING_MARKER)) return true;
    return false;
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    if (/^\s*>/.test(line)) return;

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      if (!section || level <= section.level) {
        section = { level, line: lineNumber, outstanding: OUTSTANDING_HEADING.test(line) };
      }
      return;
    }

    const box = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*\S)\s*$/);
    if (box) {
      if (box[1] === " " && !keepFor(lineNumber)) {
        claims.push({ kind: "outstanding", source: "checkbox", text: box[2], line: lineNumber, phrase: "- [ ]" });
      }
      return;
    }

    if (section?.outstanding && /^\s*(?:[-*+]|\d+\.)\s+\S/.test(line) && !keepFor(lineNumber)) {
      claims.push({
        kind: "outstanding",
        source: "section",
        text: line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, "").trim(),
        line: lineNumber,
        phrase: "under a remaining-work heading",
      });
      return;
    }

    if (NOT_A_CLAIM.some((pattern) => pattern.test(line))) return;

    const failure = FAILURE_CLAIMS.find((pattern) => pattern.test(line));
    if (failure) {
      claims.push({
        kind: "failure",
        source: "prose",
        text: line.trim(),
        line: lineNumber,
        phrase: line.match(failure)[0],
      });
      return;
    }

    if (section?.outstanding) return;
    const open = OUTSTANDING_PROSE.find((pattern) => pattern.test(line));
    if (open && !keepFor(lineNumber)) {
      claims.push({
        kind: "outstanding",
        source: "prose",
        text: line.trim(),
        line: lineNumber,
        phrase: line.match(open)[0],
      });
    }
  });

  return claims;
}

/**
 * What the head's checks say, in the terms the gate needs: whether anything
 * completed and failed, whether something actually succeeded, and how many
 * runs were still in flight when the description was read.
 *
 * @param {Array<{ name?: string, status?: string, conclusion?: string }>} runs
 */
export function summariseChecks(runs = []) {
  const list = Array.isArray(runs) ? runs : [];
  const completed = list.filter((run) => run?.status === "completed");
  const failed = completed.filter((run) => FAILURE_CONCLUSIONS.has(String(run.conclusion)));
  const succeeded = completed.filter((run) => SUCCESS_CONCLUSIONS.has(String(run.conclusion)));
  const tolerated = completed.filter((run) => HARMLESS_CONCLUSIONS.has(String(run.conclusion)));
  const running = list.filter((run) => run?.status !== "completed");

  // Green means something ran and passed, and nothing that finished failed.
  // A run still in flight is not evidence either way, and neither are the
  // skipped jobs a documentation-only change produces.
  const verdict = list.length === 0 ? "unknown" : failed.length > 0 ? "red" : succeeded.length > 0 ? "green" : "unknown";

  return {
    verdict,
    total: list.length,
    succeeded: succeeded.map((run) => String(run.name ?? "unnamed")),
    failed: failed.map((run) => `${run.name ?? "unnamed"} (${run.conclusion})`),
    tolerated: tolerated.map((run) => `${run.name ?? "unnamed"} (${run.conclusion})`),
    running: running.map((run) => String(run.name ?? "unnamed")),
  };
}

/** File paths a claim names, in the order it names them. */
export function claimPaths(text = "") {
  const paths = [];
  for (const match of String(text).matchAll(PATH_TOKEN)) {
    const token = match[1] ?? match[2];
    if (token && !paths.includes(token)) paths.push(token);
  }
  return paths;
}

/**
 * The file a claim names that this pull request already changes, or null. A
 * bare filename is credited only when exactly one changed file carries it, so
 * a claim cannot be closed by a same-named file elsewhere in the tree.
 */
export function closedByThisPullRequest(claim, changedFiles = []) {
  const live = (Array.isArray(changedFiles) ? changedFiles : []).filter((file) => file?.status !== "removed");
  const names = new Set(live.map((file) => String(file.filename)));
  const byBase = new Map();
  for (const file of live) {
    const key = basename(String(file.filename));
    byBase.set(key, [...(byBase.get(key) ?? []), String(file.filename)]);
  }

  for (const token of claimPaths(claim.text)) {
    if (names.has(token)) return token;
    if (!token.includes("/")) {
      const matches = byBase.get(token) ?? [];
      if (matches.length === 1) return matches[0];
    }
  }
  return null;
}

/**
 * The verdict for one description.
 *
 * @param {{ body?: string, checks?: Array, changedFiles?: Array, draft?: boolean }} input
 * @returns {{ skipped: boolean, summary: object, claims: Array, problems: Array<{ claim: object, reason: string, detail: string }> }}
 */
export function assessDescriptionFreshness({ body = "", checks = [], changedFiles = [], draft = false } = {}) {
  const text = String(body ?? "");
  const summary = summariseChecks(checks);
  if (text.includes(SKIP_MARKER)) {
    return { skipped: true, summary, claims: [], problems: [] };
  }

  const claims = extractDescriptionClaims(text);
  const problems = [];

  for (const claim of claims) {
    if (claim.kind === "failure") {
      if (summary.verdict !== "green") continue;
      problems.push({
        claim,
        reason: "reports failing checks the head no longer has",
        detail: greenDetail(summary),
      });
      continue;
    }

    const closedBy = closedByThisPullRequest(claim, changedFiles);
    if (closedBy) {
      problems.push({
        claim,
        reason: "describes work this branch has already done",
        detail: `this PR changes ${closedBy}`,
      });
      continue;
    }

    if (claim.source === "checkbox" && summary.verdict === "green" && !draft) {
      problems.push({
        claim,
        reason: "leaves a checklist box open on a branch whose checks all pass",
        detail: greenDetail(summary),
      });
    }
  }

  return { skipped: false, summary, claims, problems };
}

function greenDetail(summary) {
  const count = summary.succeeded.length;
  const names = summary.succeeded.slice(0, 4).join(", ");
  const more = count > 4 ? `, and ${count - 4} more` : "";
  return `${count} completed check ${count === 1 ? "run" : "runs"} passed on the head (${names}${more})`;
}

/**
 * Whether a failed read should fail the job or skip with a note.
 *
 * A token that cannot see the pull request is a wiring problem - the workflow
 * asks for `pull-requests: read` and `checks: read`, so a 401 or a 404 with a
 * token means the gate is not actually running, and passing quietly would hide
 * that. Without a token the same 404 is just a private repository read
 * anonymously, which is a legitimate local case, and a 403 is usually a rate
 * limit or a fork's restricted token: neither is evidence about the branch.
 *
 * @param {{ status?: number, authenticated?: boolean }} input
 * @returns {"fail" | "skip"}
 */
export function readFailureVerdict({ status, authenticated = false } = {}) {
  if (status === 401 || status === 422) return "fail";
  if (status === 404) return authenticated ? "fail" : "skip";
  return "skip";
}

/** Renders the problems as the lines the tool prints. */
export function describeProblems(problems) {
  return problems.map((problem) => {
    const { claim } = problem;
    const label = claim.kind === "failure" ? "failure claim" : "open item";
    return `- ${label} at line ${claim.line}: "${claim.text}" - ${problem.reason}: ${problem.detail}.`;
  });
}

/* ------------------------------------------------------------------ */
/* GitHub access                                                       */
/* ------------------------------------------------------------------ */

const API_VERSION = "2022-11-28";

function nextPage(linkHeader) {
  if (!linkHeader) return null;
  const part = linkHeader.split(",").find((entry) => /rel="next"/.test(entry));
  if (!part) return null;
  const match = part.match(/<([^>]+)>/);
  return match ? match[1] : null;
}

async function githubJSON(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": API_VERSION,
      "User-Agent": "wingman-pr-description-check",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(`GitHub ${response.status} for ${url}: ${body.slice(0, 200)}`);
    error.status = response.status;
    throw error;
  }
  return { json: await response.json(), next: nextPage(response.headers.get("link")) };
}

async function paginate(url, token) {
  const items = [];
  let next = url;
  while (next) {
    const page = await githubJSON(next, token);
    const data = page.json;
    items.push(...(Array.isArray(data) ? data : data.check_runs ?? []));
    next = page.next;
  }
  return items;
}

/**
 * Everything the verdict needs about one pull request. The head's check runs
 * are read with `filter=latest`, so a superseded red run on an earlier push
 * cannot make a green head look broken.
 */
export async function fetchPullRequestContext({ repository, pullNumber, token, apiUrl = "https://api.github.com" }) {
  const root = apiUrl.replace(/\/$/, "");
  const repo = `${root}/repos/${repository}`;
  const pull = (await githubJSON(`${repo}/pulls/${pullNumber}`, token)).json;
  const sha = pull.head?.sha;

  let runs = await paginate(`${repo}/commits/${sha}/check-runs?per_page=100&filter=latest`, token);
  if (runs.length === 0) {
    // A branch checked only by legacy commit statuses still reports a state.
    const status = (await githubJSON(`${repo}/commits/${sha}/status`, token)).json;
    runs = (status.statuses ?? []).map((entry) => ({
      name: entry.context,
      status: entry.state === "pending" ? "in_progress" : "completed",
      conclusion: entry.state === "success" ? "success" : entry.state === "pending" ? null : "failure",
    }));
  }

  const files = await paginate(`${repo}/pulls/${pullNumber}/files?per_page=100`, token);

  return {
    number: pull.number,
    title: pull.title,
    body: pull.body ?? "",
    draft: Boolean(pull.draft),
    headSha: sha,
    headRef: pull.head?.ref,
    checks: runs,
    changedFiles: files.map((file) => ({ filename: file.filename, status: file.status })),
  };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

function readJSONFile(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function skip(message) {
  console.log(`[pr-description] ${message}`);
  process.exitCode = 0;
}

export async function main() {
  const bodyFile = argument("--body-file");
  const checksFile = argument("--checks-file");
  const filesFile = argument("--files-file");
  const repository = process.env.GITHUB_REPOSITORY ?? argument("--repository");
  const pullNumber = process.env.PR_NUMBER ?? argument("--pull");
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
  const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";

  let context;

  if (bodyFile) {
    // Offline: assess a saved body against saved payloads. Used by the tests
    // and by a person checking a description before pushing.
    context = {
      number: pullNumber ? Number(pullNumber) : null,
      title: "",
      body: readFileSync(bodyFile, "utf8"),
      draft: false,
      headSha: "local",
      checks: checksFile ? readJSONFile(checksFile) : [],
      changedFiles: filesFile ? readJSONFile(filesFile) : [],
    };
  } else {
    if (!repository || !pullNumber) {
      return skip("no pull request in this environment (GITHUB_REPOSITORY / PR_NUMBER unset) - nothing to assess.");
    }
    if (!token) {
      // A public repository can be read anonymously, which is what lets a
      // person check a description before pushing. A private one answers 404
      // below, and the gate then says it could not read rather than guessing.
      console.log("[pr-description] No GITHUB_TOKEN in the environment - reading the public API anonymously.");
    }
    try {
      context = await fetchPullRequestContext({ repository, pullNumber, token, apiUrl });
    } catch (error) {
      if (readFailureVerdict({ status: error?.status, authenticated: Boolean(token) }) === "fail") {
        console.error(`[pr-description] Cannot read this pull request: ${error.message}`);
        console.error(
          "The gate reads the pull request, its head's check runs and its changed files; the workflow must keep `pull-requests: read` and `checks: read`.",
        );
        process.exitCode = 1;
        return;
      }
      // A gate that cannot see the checks (fork PR, API hiccup, insufficient
      // token scope) must not guess: it says so and passes, so a description
      // is never blocked by a read it could not perform.
      return skip(`could not read the pull request (${error?.message ?? error}) - skipping rather than guessing.`);
    }
  }

  const assessment = assessDescriptionFreshness({
    body: context.body,
    checks: context.checks,
    changedFiles: context.changedFiles,
    draft: context.draft,
  });

  const label = context.number ? `#${context.number}` : "this description";
  const { summary } = assessment;

  if (assessment.skipped) {
    return skip(`${label} carries ${SKIP_MARKER} - the description is deliberately not assessed.`);
  }

  if (assessment.problems.length === 0) {
    const green = summary.verdict === "green" ? `${summary.succeeded.length} passed` : summary.verdict;
    console.log(
      `[pr-description] OK: ${label} describes its head - ${assessment.claims.length} claim(s) checked against ${summary.total} check run(s) (${green}${summary.running.length ? `, ${summary.running.length} in progress` : ""}).`,
    );
    return;
  }

  console.error(`[pr-description] ${label} no longer describes its head:`);
  for (const line of describeProblems(assessment.problems)) {
    console.error(`::error::${line.replace(/^-\s*/, "")}`);
    console.error(line);
  }
  console.error("");
  console.error("Update the description to match the branch - this check reruns when the body is edited.");
  console.error(
    `If an item is genuinely still open (manual QA, work that lands in a later PR), keep it and append ${KEEP_OUTSTANDING_MARKER}: reason --> on that line.`,
  );
  process.exitCode = 1;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  await main();
}
