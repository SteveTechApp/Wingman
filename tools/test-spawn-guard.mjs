// Shared transient-spawn guard for tools tests.
//
// Under the pre-commit suite's parallel load, registering child processes can
// fail transiently at the libuv level (resource-pressure errno codes:
// EAGAIN/EMFILE/ENFILE/ENOMEM/EIO) even though the command itself is fine.
// Tools tests here spawn real CLIs (gates, generators, npm drills), so a
// transient spawn failure would otherwise be a one-for-two flake whose usual
// response - rerun until it passes - absorbs it.
//
// What is safe to retry: the spawn never registered (no child process ran),
// so a retried run of a deterministic command re-produces the same verdict.
// What is NEVER retried: a child that actually RAN and exited nonzero, or was
// killed by a signal - those are genuine gate signals.
//
// Error-shape contract (Node child_process):
//   - execFileSync: a nonzero child exit THROWS with a numeric error.status
//     and output attached; a libuv spawn failure throws with error.code set
//     to the bare errno string (EAGAIN...) and NO numeric status.
//   - spawnSync:    returns an object whose `error` field carries the libuv
//     failure (errno string in .code) while a nonzero child exit leaves
//     error undefined and fills `status`.
//   - spawn (evented): a libuv spawn failure emits an "error" event on the
//     child carrying the errno string; a child that ran closes with "close".
//
// Same provenance as the guard first written inline in
// tools/build-canonical-only.test.mjs: single retry, loud warning, strict
// classification.

import { execFileSync, spawnSync } from "node:child_process";

const TRANSIENT_SPAWN_CODES = new Set(["EAGAIN", "EMFILE", "ENFILE", "ENOMEM", "EIO"]);

function isTransientCode(code) {
  return (
    typeof code === "string" &&
    TRANSIENT_SPAWN_CODES.has(code) &&
    !code.startsWith("SIG")
  );
}

// execFileSync-style: returns stdout, throws on child failure (not retried),
// retries once on a transient spawn failure.
export function runToolOnce(command, args, options) {
  return execFileSync(command, args, { maxBuffer: 16 * 1024 * 1024, ...options });
}

export function runTool(command, args, label, options) {
  try {
    return runToolOnce(command, args, options);
  } catch (error) {
    // Distinguish: a libuv spawn failure carries the bare errno string in
    // error.code and no numeric status; a child that ran and failed carries a
    // numeric status (or a signal). Never retry those signals.
    const transient =
      isTransientCode(error.code) && typeof error.status !== "number" && !error.signal;
    if (!transient) throw error;
    console.warn(`[${label}] transient spawn failure (${error.code}); retrying once: ${command} ${args.join(" ")}`);
    return runToolOnce(command, args, options);
  }
}

// spawnSync-style: returns the result object unchanged (nonzero child exits
// are not errors here); on result.error with a transient errno, retries once
// and returns the fresh result. The caller still inspects result.status.
export function runToolBare(command, args, label, options) {
  const result = spawnSync(command, args, {
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
  if (!result.error) return result;
  const transient = isTransientCode(result.error.code) && typeof result.status !== "number" && !result.signal;
  if (!transient) return result;
  console.warn(`[${label}] transient spawn failure (${result.error.code}); retrying once: ${command} ${args.join(" ")}`);
  return spawnSync(command, args, { maxBuffer: 16 * 1024 * 1024, ...options });
}

// Evented spawn wrapper for tests that drive child.stdout/stderr streams:
// same transient classification, same single retry. `makeChild(onClose)` must
// spawn the child, register the caller's own close/settlement logic, and
// return the child; it calls onClose(result) exactly once when settled. The
// guard owns ONLY the "error" event: a resource-pressure errno is retried
// once (a fresh makeChild call), any other error event is rethrown, and a
// child that ran and closed settles through onClose - never retried.
export function runToolEvented(makeChild, label) {
  const attempt = (isRetry) =>
    new Promise((resolve, reject) => {
      let resolved = false;
      let abandoned = false;
      let child;
      try {
        child = makeChild((result) => {
          if (abandoned) return;
          resolved = true;
          resolve(result);
        });
      } catch (error) {
        reject(error);
        return;
      }
      child.on("error", (error) => {
        if (resolved || abandoned) return;
        abandoned = true;
        const transient = isTransientCode(error?.code);
        if (transient && !isRetry) {
          console.warn(`[${label}] transient spawn failure (${error.code}); retrying once`);
          attempt(true).then(resolve, reject);
        } else {
          reject(error); // non-transient spawn error: a real defect surfaces
        }
      });
      child.on("close", (code, signal) => {
        // A close the caller never settles and no error event means the
        // settlement plumbing failed - reject instead of hanging the suite.
        if (!resolved && !abandoned) {
          reject(
            new Error(`[${label}] child closed without settlement (code=${code}, signal=${signal ?? "none"})`),
          );
        }
      });
    });
  return attempt(false);
}
