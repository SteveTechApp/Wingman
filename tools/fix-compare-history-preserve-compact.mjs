import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-history-preserve-compact-${stamp}`);
const touched = [];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(relativePath) {
  const file = path.join(repoRoot, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function write(relativePath, content) {
  const file = path.join(repoRoot, relativePath);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

function backup(relativePath) {
  const source = path.join(repoRoot, relativePath);

  if (!fs.existsSync(source)) {
    return;
  }

  const target = path.join(backupRoot, relativePath);
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function save(relativePath, content) {
  const current = read(relativePath);

  if (current === content) {
    return;
  }

  backup(relativePath);
  write(relativePath, content);
  touched.push(relativePath);
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build", "_RECOVERY", ".git"].includes(entry.name)) {
        continue;
      }

      walk(full, files);
      continue;
    }

    if (/\.(ts|tsx|js|mjs)$/i.test(entry.name)) {
      files.push(full);
    }
  }

  return files;
}

function patchProjectClearStorage() {
  const sourceRoot = path.join(repoRoot, "src");
  const files = walk(sourceRoot);

  for (const file of files) {
    const relative = path.relative(repoRoot, file);
    let text = read(relative);

    if (!text.includes("Clear current project") && !text.includes("clear current project") && !text.includes("current project")) {
      continue;
    }

    let next = text;

    if (!next.includes("function clearProjectStoragePreservingCompareHistory")) {
      const helper = `
function clearProjectStoragePreservingCompareHistory() {
  if (typeof window === "undefined") {
    return;
  }

  const preservedCompareHistory = new Map();

  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("wingman.compare.inputHistory."))
    .forEach((key) => {
      preservedCompareHistory.set(key, window.localStorage.getItem(key));
    });

  window.localStorage.clear();

  preservedCompareHistory.forEach((value, key) => {
    if (value !== null) {
      window.localStorage.setItem(key, value);
    }
  });
}

`;
      next = helper + next;
    }

    next = next.replaceAll("window.localStorage.clear();", "clearProjectStoragePreservingCompareHistory();");
    next = next.replaceAll("localStorage.clear();", "clearProjectStoragePreservingCompareHistory();");

    next = next.replace(
      /filter\(\(key\) => key\.startsWith\("wingman\."\)\)/g,
      'filter((key) => key.startsWith("wingman.") && !key.startsWith("wingman.compare.inputHistory."))',
    );

    next = next.replace(
      /filter\(\(key\) => key\.startsWith\('wingman\.'\)\)/g,
      "filter((key) => key.startsWith('wingman.') && !key.startsWith('wingman.compare.inputHistory.'))",
    );

    next = next.replace(
      /filter\(\(key\) => key\.startsWith\("wingman"\)\)/g,
      'filter((key) => key.startsWith("wingman") && !key.startsWith("wingman.compare.inputHistory."))',
    );

    next = next.replace(
      /filter\(\(key\) => key\.startsWith\('wingman'\)\)/g,
      "filter((key) => key.startsWith('wingman') && !key.startsWith('wingman.compare.inputHistory.'))",
    );

    save(relative, next);
  }
}

function patchCompareHistoryRows() {
  const relative = path.join("src", "wingman2", "pages", "ComparePage.tsx");
  let text = read(relative);

  if (!text) {
    throw new Error(`Missing ${relative}`);
  }

  text = text.replace(
    /const HISTORY_KEY = "wingman\.compare\.inputHistory\.v\d+";/,
    'const HISTORY_KEY = "wingman.compare.inputHistory.v11";',
  );

  const legacyBlock = `const LEGACY_HISTORY_KEYS = [
  "wingman.compare.inputHistory.v1",
  "wingman.compare.inputHistory.v2",
  "wingman.compare.inputHistory.v3",
  "wingman.compare.inputHistory.v4",
  "wingman.compare.inputHistory.v5",
  "wingman.compare.inputHistory.v6",
  "wingman.compare.inputHistory.v7",
  "wingman.compare.inputHistory.v8",
  "wingman.compare.inputHistory.v9",
  "wingman.compare.inputHistory.v10",
];`;

  if (/const LEGACY_HISTORY_KEYS = \[[\s\S]*?\];/.test(text)) {
    text = text.replace(/const LEGACY_HISTORY_KEYS = \[[\s\S]*?\];/, legacyBlock);
  }

  const lastSectionStart = text.lastIndexOf('        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">');
  const pageEndMarker = "\n      </section>\n    </main>";

  if (lastSectionStart < 0) {
    throw new Error("Could not find the Compare recent history section start.");
  }

  const pageEnd = text.indexOf(pageEndMarker, lastSectionStart);

  if (pageEnd < 0) {
    throw new Error("Could not find the Compare recent history section end.");
  }

  const compactHistorySection = `        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Recent competitor checks
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Simple recall list. Re-use or remove individual checks without affecting the current project.
              </p>
            </div>

            <button
              type="button"
              onClick={clearHistory}
              disabled={history.length === 0}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear recent checks
            </button>
          </div>

          {history.length ? (
            <div className="mt-4 flex flex-col gap-2">
              {history.map((item) => (
                <article
                  key={item.id}
                  className="grid items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm sm:grid-cols-[1fr_auto_auto]"
                >
                  <button
                    type="button"
                    onClick={() => loadHistoryItem(item)}
                    className="min-w-0 text-left"
                    title="Reload this previous competitor check"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="truncate font-bold text-white">
                        {[displaySafe(item.brand), displaySafe(item.sku)].filter(Boolean).join(" - ") || "Untitled lookup"}
                      </span>

                      {item.productName ? (
                        <span className="truncate text-xs text-slate-300">
                          {displaySafe(item.productName)}
                        </span>
                      ) : null}

                      {item.categoryLabel ? (
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                          {displaySafe(item.categoryLabel)}
                        </span>
                      ) : null}

                      {item.matchStatus ? (
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                          {statusLabel(item.matchStatus)}
                        </span>
                      ) : null}

                      {item.savedAt ? (
                        <span className="text-xs text-slate-500">
                          {formatSavedDate(item.savedAt)}
                        </span>
                      ) : null}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => loadHistoryItem(item)}
                    className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100 hover:bg-cyan-300/20"
                  >
                    Use
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteHistoryItem(item.id)}
                    className="rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-1.5 text-xs font-bold text-red-100 hover:bg-red-300/20"
                  >
                    Remove
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
              No recent competitor checks yet. Completed checks will appear here automatically.
            </div>
          )}
        </section>`;

  text = text.slice(0, lastSectionStart) + compactHistorySection + text.slice(pageEnd);

  save(relative, text);
}

patchProjectClearStorage();
patchCompareHistoryRows();

console.log("");
console.log("Compare history preservation and compact rows installed.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}