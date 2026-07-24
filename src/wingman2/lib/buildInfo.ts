// Build identity, surfaced in the UI so a user can say which build they are on.
//
// Dockerfile and docker-compose.yml have always passed VITE_APP_VERSION and
// VITE_APP_COMMIT as build args, but nothing in the client ever read them - so
// a bug report could never be tied to a specific build. With 891 commits and
// no release tags, "it's broken" was unanswerable.
//
// Both values are baked in at build time by Vite. They are intentionally
// forgiving: a local `npm run dev` build has neither, and should still render
// something honest rather than empty.

const rawVersion = String(import.meta.env.VITE_APP_VERSION ?? "").trim();
const rawCommit = String(import.meta.env.VITE_APP_COMMIT ?? "").trim();

export const appVersion = rawVersion || "dev";
export const appCommit = rawCommit ? rawCommit.slice(0, 7) : "local";

// e.g. "0.9.0 (a1b2c3d)" in a real build, "dev (local)" from `npm run dev`.
export const buildLabel = `${appVersion} (${appCommit})`;

export function getBuildInfo() {
  return { version: appVersion, commit: appCommit, label: buildLabel };
}
