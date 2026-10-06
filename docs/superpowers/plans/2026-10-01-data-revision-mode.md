# Data Revision Mode Implementation Plan

> **For agentic workers:** Execute inline in the existing worktree; the user has authorized implementation.

**Goal:** Run Wingman without Supabase and suspend catalogue acceptance gates while data is revised.

**Architecture:** Default to file persistence, retain explicit remote modes, and preserve strict verification commands as opt-in. Catalogue generation consumes tracked sources without automatic repairs. Comparison eligibility and evidence rules remain active.

**Tech Stack:** Node.js, React, TypeScript, Vitest, GitHub Actions.

**Spec:** The user's October 1 request in this chat.

## Global Constraints

- Preserve the main checkout's existing package changes.
- Keep core comparison safeguards and storage concurrency tests.
- Retain strict checks for later use; no catalogue baseline rewrites.
- Sync edited files to the main checkout and verify their hashes.

### Task 1: Optional remote persistence

- [x] Default storage to file and remove production-only remote requirements.
- [x] Keep fail-closed behaviour for explicitly configured remote storage.
- [x] Test production startup without credentials and local persistence.
- [x] Update the environment template and deployment defaults.

### Task 2: Suspend catalogue gates

- [x] Preserve the former verification chains as `:strict` commands.
- [x] Make default verification exercise comparison behaviour without catalogue acceptance gates.
- [x] Move catalogue baseline suites into an opt-in Vitest configuration.
- [x] Disable automatic data and Supabase workflow gates with explicit repository-variable switches.
- [x] Document generation and restoration commands.

### Task 3: Verify and sync

- [x] Run comparison tests, storage tests, strict TypeScript checking and build.
- [x] Review the diff, preserve user changes, and verify synced file hashes.
