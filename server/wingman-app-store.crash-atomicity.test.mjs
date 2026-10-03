import { afterEach, describe, expect, it } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// True crash-atomicity test for the file-mode app-store write: a child process
// writes a small snapshot, then begins writing a ~65 MB snapshot through the
// store's real file-mode path (writeDb -> writeJsonFile's temp+rename). The
// parent watches the data directory, waits until the .tmp file is visibly
// being written, and hard-kills the child mid-write. Because the target is
// only ever replaced by the rename, the surviving file must be EITHER the old
// snapshot (kill before the rename) OR the complete new one (kill after) -
// never a truncated middle. The plain-writeFile control proves the harness
// actually catches a torn write, so this suite would go red if the store ever
// regressed to a non-atomic writer.
//
// Windows note: killing must be FAST or the write finishes before the kill
// lands. Node's child.kill('SIGKILL') on Windows calls TerminateProcess
// directly (the repo's "powershell Stop-Process" rule applies to Git Bash's
// `kill` command, not the Node API), so it is used everywhere; the powershell
// fallback only fires if the process somehow survives the signal.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "fixtures", "wingman-app-store-crash-writer.mjs");
const TARGET_REL = path.join("runtime", "wingman-app-db.json");

// Must stay in lockstep with the fixture's row constants.
const ROWS = 240_000;

const KILL_PARTIAL_MIN_BYTES = 1024 * 1024; // 1 MB into a ~65 MB write: safely mid-write

function makeDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wm-appstore-crash-"));
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

async function runChild(dataDir, mode) {
  const child = spawn(process.execPath, [FIXTURE, dataDir, mode], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      WINGMAN_DATA_DIR: dataDir,
      WINGMAN_STORAGE_MODE: "file",
      // Never let a stray local credential pull the child into Supabase mode.
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
  const targetPath = path.join(dataDir, TARGET_REL);
  let partialSeen = false;
  const deadline = Date.now() + 90_000;
  const runtimeDir = path.join(dataDir, "runtime");
  while (Date.now() < deadline) {
    let size = null;
    try {
      if (mode === "plain") {
        size = fs.statSync(targetPath).size;
      } else {
        const entries = fs.readdirSync(runtimeDir);
        const tmp = entries.map((name) => path.join(runtimeDir, name)).find((file) => file.endsWith(".tmp"));
        if (tmp) size = fs.statSync(tmp).size;
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

describe("wingman-app-store file-mode crash atomicity (process kill mid-write)", () => {
  const dirs = [];
  afterEach(() => {
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
    dirs.length = 0;
  });

  it(
    "recovers to the old or the complete new snapshot, never a truncated one",
    { timeout: 240_000 },
    async () => {
      let caughtMidWrite = false;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const dataDir = makeDataDir();
        dirs.push(dataDir);
        const { targetPath, partialSeen, childErr } = await runChild(dataDir, "atomic");

        if (partialSeen) caughtMidWrite = true;
        let parsed;
        try {
          ({ parsed } = readTarget(targetPath));
        } catch (error) {
          expect.fail(`recovered file did not parse after the kill (attempt ${attempt}): ${error.message}${childErr ? ` | child stderr: ${childErr.slice(0, 500)}` : ""}`);
        }

        // Old snapshot: kill landed before the rename -> no bigContent.
        // New snapshot: kill landed after the rename -> the complete big write.
        expect(parsed.smallContent).toBe("A");
        if (parsed.bigContent === undefined) {
          expect(parsed.users).toEqual({});
        } else {
          expect(parsed.bigContent.label).toBe("B");
          expect(Array.isArray(parsed.bigContent.rows)).toBe(true);
          expect(parsed.bigContent.rows.length).toBe(ROWS);
        }

        if (caughtMidWrite) break;
      }
      // The kill must have landed while the .tmp file was being written at
      // least once - otherwise the suite could go green vacuously (e.g. if the
      // machine finished the write before the poll noticed).
      expect(caughtMidWrite).toBe(true);
    },
  );

  it(
    "control: the harness catches a torn write from a plain non-atomic writer",
    { timeout: 240_000 },
    async () => {
      let sawTruncated = false;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const dataDir = makeDataDir();
        dirs.push(dataDir);
        const { targetPath, partialSeen, childErr } = await runChild(dataDir, "plain");
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
        // A plain writer's target size stays >= 1 MB after the write finishes,
        // so an observation can also fire post-completion; a parseable result
        // is inconclusive (kill landed after the last byte), not a failure.
        void childErr;
      }
      expect(sawTruncated).toBe(true);
    },
  );
});
