// Pure, side-effect-free helpers for the Wingman size-budget ratchet.
//
// The CLI wrapper (tools/check-size-budgets.mjs) reads the filesystem and
// injects plain data into these functions so the comparison logic can be unit
// tested without a build on disk. Keep this module free of `fs`/`process`
// access so it stays trivially testable.

/**
 * The set of artefacts the ratchet tracks. The script owns *what* is measured
 * and *how*; the baseline JSON (tools/wingman-size-budgets.json) owns only the
 * numeric limits, keyed by `id`. To relax or tighten a budget, edit the number
 * in the JSON — never edit these definitions to make a red build pass.
 *
 * `kind`:
 *   - "chunk"    match emitted JS chunks whose filename starts with
 *                `${match}-` (stable named groups from vite.config.ts).
 *   - "totalJs"  sum of every emitted .js file.
 *   - "totalCss" sum of every emitted .css file.
 *   - "source"   a single source file measured by its byte size on disk.
 */
export const TRACKED_ENTRIES = [
  {
    id: "chunk:compare-engine",
    kind: "chunk",
    match: "wm-compare-engine",
    label: "Compare engine chunk",
    remediation:
      "Split Compare domain/lib modules (Phase 4/5) so ranking, competitor data and evidence load on demand.",
  },
  {
    id: "chunk:competitor-registry",
    kind: "chunk",
    match: "wm-competitor-registry",
    label: "Competitor registry chunk",
    remediation:
      "Load a manufacturer's competitor data on demand instead of bundling the whole registry (Phase 5).",
  },
  {
    id: "chunk:project-workflow",
    kind: "chunk",
    match: "wm-project-workflow",
    label: "Project workflow chunk",
    remediation:
      "Keep project/proposal/template code behind its route and split large helpers into lazily-loaded modules.",
  },
  {
    id: "total:js",
    kind: "totalJs",
    label: "Total emitted JavaScript",
    remediation:
      "Prefer dynamic import() for action-specific libraries and keep heavy features off the initial graph (Phase 2).",
  },
  {
    id: "total:css",
    kind: "totalCss",
    label: "Total emitted CSS",
    remediation:
      "Remove dead route overrides and consolidate duplicate rules once the stylesheet is layered (Phase 8).",
  },
  {
    id: "source:compare-advanced",
    kind: "source",
    path: "src/wingman2/pages/ComparePageNew.advanced.tsx",
    label: "ComparePageNew.advanced.tsx",
    remediation:
      "Extract cohesive Compare sections/hooks into src/wingman2/pages/compare/ (Phase 4).",
  },
  {
    id: "source:discovery-page",
    kind: "source",
    path: "src/wingman2/pages/DiscoveryPage.tsx",
    label: "DiscoveryPage.tsx",
    remediation:
      "Extract Discovery steps, reducer and validation into src/wingman2/pages/discovery/ (Phase 6).",
  },
  {
    id: "source:product-call-cards",
    kind: "source",
    path: "src/wingman2/pages/ProductCallCardsPage.tsx",
    label: "ProductCallCardsPage.tsx",
    remediation:
      "Extract search/filter, card list and detail view into cohesive components (Phase 7).",
  },
  {
    id: "source:project-detail",
    kind: "source",
    path: "src/wingman2/pages/ProjectDetailPage.tsx",
    label: "ProjectDetailPage.tsx",
    remediation:
      "Extract blockers, requirements, evidence and action panels into components (Phase 7).",
  },
  {
    id: "source:style-stack-css",
    kind: "source",
    path: "src/wingman2/styles/wingman-style-stack.css",
    label: "wingman-style-stack.css",
    remediation:
      "Layer the stylesheet into ordered responsibility files behind the single entry (Phase 8).",
  },
];

/**
 * Does an emitted JS filename belong to a named chunk group?
 *
 * Named groups emit `${name}-${hash}.js`; the trailing `-hash` keeps the name
 * stable across builds even though the hash changes. Matching requires the
 * separator so `wm-compare-engine` never swallows `wm-compare-ui`.
 */
export function matchesChunk(fileName, matchPrefix) {
  return fileName.endsWith(".js") && fileName.startsWith(`${matchPrefix}-`);
}

/**
 * Measure a single tracked entry from injected build data.
 *
 * @param entry one of TRACKED_ENTRIES
 * @param data  { jsFiles: [{name, bytes}], cssFiles: [{name, bytes}],
 *                sourceSizes: { [path]: bytes } }
 * @returns { bytes, matched } — `matched` lists the files that contributed,
 *          for actionable output. `bytes` is null when nothing was found.
 */
export function measureEntry(entry, data) {
  switch (entry.kind) {
    case "chunk": {
      const matched = data.jsFiles.filter((file) => matchesChunk(file.name, entry.match));
      if (matched.length === 0) {
        return { bytes: null, matched: [] };
      }
      const bytes = matched.reduce((sum, file) => sum + file.bytes, 0);
      return { bytes, matched: matched.map((file) => file.name) };
    }
    case "totalJs": {
      const bytes = data.jsFiles.reduce((sum, file) => sum + file.bytes, 0);
      return { bytes, matched: [`${data.jsFiles.length} files`] };
    }
    case "totalCss": {
      const bytes = data.cssFiles.reduce((sum, file) => sum + file.bytes, 0);
      return { bytes, matched: [`${data.cssFiles.length} files`] };
    }
    case "source": {
      const bytes = data.sourceSizes[entry.path];
      return { bytes: typeof bytes === "number" ? bytes : null, matched: [entry.path] };
    }
    default:
      return { bytes: null, matched: [] };
  }
}

/**
 * The allowed ceiling for a limit, widened by the tolerance so trivial,
 * environment-dependent minification noise does not fail the build. Tolerance
 * is a small percentage; a regression must clear it to count as growth.
 */
export function allowedBytes(limitBytes, tolerancePct) {
  return Math.floor(limitBytes * (1 + tolerancePct / 100));
}

/**
 * Compare measured sizes against the stored limits.
 *
 * @returns { results, failures, missingLimits, missingMeasurements }
 *   results: one row per tracked entry with status "ok" | "fail" | "missing".
 *   failures: rows that grew beyond the allowed ceiling.
 */
export function evaluateBudgets(entries, data, baseline) {
  const tolerancePct = Number(baseline.tolerancePct ?? 0);
  const limits = baseline.limits ?? {};
  const results = [];
  const failures = [];
  const missingLimits = [];
  const missingMeasurements = [];

  for (const entry of entries) {
    const { bytes, matched } = measureEntry(entry, data);
    const limit = limits[entry.id];

    if (typeof limit !== "number") {
      missingLimits.push(entry.id);
      results.push({ entry, measured: bytes, limit: null, allowed: null, diff: null, status: "missing", matched });
      continue;
    }

    if (bytes === null) {
      missingMeasurements.push(entry.id);
      results.push({ entry, measured: null, limit, allowed: allowedBytes(limit, tolerancePct), diff: null, status: "missing", matched });
      continue;
    }

    const allowed = allowedBytes(limit, tolerancePct);
    const diff = bytes - limit;
    const status = bytes > allowed ? "fail" : "ok";
    const row = { entry, measured: bytes, limit, allowed, diff, status, matched };
    results.push(row);
    if (status === "fail") {
      failures.push(row);
    }
  }

  return { results, failures, missingLimits, missingMeasurements, tolerancePct };
}

export function formatKb(bytes) {
  if (bytes === null || bytes === undefined) {
    return "n/a";
  }
  return `${(bytes / 1024).toFixed(2)} KB`;
}

export function formatDiff(diff) {
  if (diff === null || diff === undefined) {
    return "n/a";
  }
  const sign = diff > 0 ? "+" : "";
  return `${sign}${(diff / 1024).toFixed(2)} KB`;
}
