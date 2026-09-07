import { afterEach, describe, expect, it } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

// True crash-atomicity test for the two file-mode writers in
// competitor-lookup-server.mjs (product reports at WINGMAN_PRODUCT_REPORTS_FILE
// and competitor approvals at COMPETITOR_APPROVALS_FILE): a child process
// writes a small seed through the shared helper, then begins writing a ~55 MB
// dataset through the SAME helper to the SAME file path the writer uses. The
// parent watches the data directory, waits until the .tmp file is visibly
// being written, and hard-kills the child mid-write. Because the target is
// only ever replaced by the rename, the surviving file must be EITHER the old
// seed (kill before the rename) OR the complete new dataset (kill after) -
// never a truncated middle. The plain-writeFile controls prove the harness
// actually catches a torn write, so this suite would go red if either writer
// ever regressed to a non-atomic write.
//
// Windows note: killing must be FAST or the write finishes before the kill
// lands. Node's child.kill('SIGKILL') on Windows calls TerminateProcess
// directly, so it is used everywhere; the powershell fallback only fires if
// the process somehow survives the signal.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "fixtures", "wingman-reports-approvals-crash-writer.mjs");

// File names at the WINGMAN_DATA_DIR root, in lockstep with catalog/files.mjs.
const TARGETS = {
  reports: "wingman-product-reports.json",
  approvals: "competitor-approvals.json",
};

// Must stay in lockstep with the fixture's row constants.
const ROWS = 240_000;

const KILL_PARTIAL_MIN_BYTES = 1024 * 1024; // 1 MB into a ~55 MB write: safely mid-write

function makeDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wm-reports-approvals-crash-"));
}

function killProcess(child) {
  child.kill("SIGKILL");
  // Rare fallback for platforms where the signal did not terminate the child.
  const deadline = Date.now() + 3_000;
  const probe = setInterval(() => {
    if (child.exitCode !== null || Date.now() > deadline) {
      clearInterval(probe);
      if (child.exitCode === null && process.platform === "win32") {
        spawnSync("powershell", ["-NoProfile", "-Command", `Stop-Process -Id ${child.pid} -Force`], { stdio: "ignore" });
      }
    }
  }, 50);
}

function once(emitter, event, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`timed out after ${timeoutMs}ms waiting for '${event}' (child output: ${outputRef.current || "(none)"})`));
    }, timeoutMs);
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      clearTimeout(timer);
      emitter.off(event, onEvent);
    };
    emitter.once(event, onEvent);
  });
}

// The child's stdout, kept for diagnostics when a stage times out.
const outputRef = { current: "" };

async function runChild(dataDir, mode, kind) {
  const child = spawn(process.execPath, [FIXTURE, dataDir, mode], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      WINGMAN_DATA_DIR: dataDir,
      // Never let a stray local credential pull anything into Supabase mode.
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      VITE_SUPABASE_URL: "",
    },
  });
  outputRef.current = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    outputRef.current += chunk;
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const sawLine = async (text) => {
    if (outputRef.current.includes(text)) return;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        child.stdout.off("data", onData);
        reject(new Error(`child never printed '${text}' (stderr: ${stderr.slice(0, 800) || "(empty)"})`));
      }, 90_000);
      const onData = () => {
        if (outputRef.current.includes(text)) {
          clearTimeout(timer);
          child.stdout.off("data", onData);
          resolve();
        }
      };
      child.stdout.on("data", onData);
    });
  };

  const exited = once(child, "close", 20_000).catch(() => undefined);
  try {
    await sawLine("WRITING_BIG");
  } catch (error) {
    // A stage timeout must not leave the child writing in the background.
    child.kill("SIGKILL");
    await exited;
    throw error;
  }

  // Poll until the file under write is visibly partial, then kill mid-write.
  const targetName = TARGETS[kind];
  const targetPath = path.join(dataDir, targetName);
  const atomic = mode === "reports" || mode === "approvals";
  let partialSeen = false;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    let size = null;
    try {
      if (atomic) {
        const tmp = fs
          .readdirSync(dataDir)
          .map((name) => path.join(dataDir, name))
          .find((file) => path.basename(file).startsWith(targetName) && file.endsWith(".tmp"));
        if (tmp) size = fs.statSync(tmp).size;
      } else {
        size = fs.statSync(targetPath).size;
      }
    } catch {
      size = null;
    }
    if (size !== null && size >= KILL_PARTIAL_MIN_BYTES) {
      partialSeen = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  killProcess(child);
  await exited;

  return { targetPath, partialSeen, childErr: stderr };
}

function readTarget(targetPath) {
  const raw = fs.readFileSync(targetPath, "utf8");
  if (raw.length === 0) throw new Error("target file is empty after the kill");
  return { raw, parsed: JSON.parse(raw) };
}

describe("product-reports / approvals file-mode crash atomicity (process kill mid-write)", () => {
  const dirs = [];
  afterEach(() => {
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
    dirs.length = 0;
  });

  for (const [kind, mode] of [
    ["reports", "reports"],
    ["approvals", "approvals"],
  ]) {
    it(
      `${kind}: recovers to the old seed or the complete new dataset, never a truncated one`,
      { timeout: 240_000 },
      async () => {
        let caughtMidWrite = false;
        const label = kind === "approvals" ? "approval" : "report";
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          const dataDir = makeDataDir();
          dirs.push(dataDir);
          const { targetPath, partialSeen, childErr } = await runChild(dataDir, mode, kind);

          if (partialSeen) caughtMidWrite = true;
          let parsed;
          try {
            ({ parsed } = readTarget(targetPath));
          } catch (error) {
            expect.fail(`recovered file did not parse after the kill (attempt ${attempt}): ${error.message}${childErr ? ` | child stderr: ${childErr.slice(0, 500)}` : ""}`);
          }

          // Old seed: kill landed before the rename -> the single seed record.
          // New dataset: kill landed after the rename -> the complete big write.
          if (parsed.length === 1 && parsed[0].marker === "A") {
            expect(parsed[0].id).toBe("seed");
          } else {
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBe(ROWS);
            expect(parsed[0].id).toBe(`${label}-0`);
            expect(typeof parsed[0].sku).toBe("string");
          }

          if (caughtMidWrite) break;
        }
        // The kill must have landed while the .tmp file was being written at
        // least once - otherwise the suite could go green vacuously (e.g. if
        // the machine finished the write before the poll noticed).
        expect(caughtMidWrite).toBe(true);
      },
    );
  }

  for (const [kind, mode] of [
    ["reports", "plain-reports"],
    ["approvals", "plain-approvals"],
  ]) {
    it(
      `control: the harness catches a torn ${kind} write from a plain non-atomic writer`,
      { timeout: 240_000 },
      async () => {
        let sawTruncated = false;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          const dataDir = makeDataDir();
          dirs.push(dataDir);
          const { targetPath, partialSeen, childErr } = await runChild(dataDir, mode, kind);
          if (!partialSeen) continue; // write finished before the kill - inconclusive attempt

          let parseError = null;
          try {
            JSON.parse(fs.readFileSync(targetPath, "utf8"));
          } catch (error) {
            parseError = error;
          }
          if (parseError) {
            sawTruncated = true;
            break;
          }
          // A plain writer's target size stays >= 1 MB after the write
          // finishes, so an observation can also fire post-completion; a
          // parseable result is inconclusive (kill landed after the last
          // byte), not a failure.
          void childErr;
        }
        expect(sawTruncated).toBe(true);
      },
    );
  }
});

// Source pins: the two real writers in competitor-lookup-server.mjs must keep
// routing through the shared atomic helper to those exact file paths. The
// kill-mid-write tests above exercise the helper; these pins keep the CALL
// SITES honest, so a regression to a plain fs.writeFile in the route handlers
// is caught without needing to boot the server.
const SERVER_SOURCE_PATH = path.join(__dirname, "competitor-lookup-server.mjs");

describe("competitor-lookup-server writers stay on writeJsonFileAtomic", () => {
  const source = readFileSync(SERVER_SOURCE_PATH, "utf8");

  it("product-reports handler writes through the shared atomic helper", () => {
    expect(source).toContain("await writeJsonFileAtomic(WINGMAN_PRODUCT_REPORTS_FILE, reports);");
  });

  it("approvals handler writes through the shared atomic helper", () => {
    expect(source).toContain("await writeJsonFileAtomic(COMPETITOR_APPROVALS_FILE, approvals);");
  });

  it("no plain writeFile targets either dataset path", () => {
    // A plain write to either file would bypass the temp+rename entirely.
    for (const line of source.split("\n")) {
      if (line.includes("writeFile") && !line.includes("writeJsonFileAtomic") && !line.trim().startsWith("//")) {
        expect(line).not.toMatch(/WINGMAN_PRODUCT_REPORTS_FILE|COMPETITOR_APPROVALS_FILE/);
      }
    }
  });
});
