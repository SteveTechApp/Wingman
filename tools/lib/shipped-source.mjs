import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * The files git would ship from `root`, POSIX-separated and relative to it:
 * tracked files plus untracked files no ignore rule covers.
 *
 * Both CSS gates ask "what does the app ship?" — one for the source that can
 * name a class, the other for the stylesheets that can answer one. They used to
 * answer by walking the tree past a hand-kept skip list, so an ignored copy of a
 * retired component counted as evidence: it kept a dead rule alive locally while
 * the same branch failed on a clean checkout.
 *
 * `--exclude-standard` is what lets a checkout answer for itself — `.gitignore`,
 * `.git/info/exclude` and global excludes all apply — while a component someone
 * is still writing counts until it is either committed or ignored.
 *
 * Null when `root` is not a checkout (a test sandbox, an unpacked tarball), so
 * the caller can fall back to walking the tree.
 */
export function gitListedFiles(root) {
  try {
    const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
    return listed.split("\0").filter(Boolean).map((entry) => entry.split("\\").join("/"));
  } catch {
    return null;
  }
}

/** `files` narrowed to what git would ship; unchanged when `root` is not a checkout. */
export function shippedFiles(root, files) {
  const listed = gitListedFiles(root);
  if (!listed) return files;
  const shipped = new Set(listed);
  return files.filter((file) => shipped.has(path.relative(root, file).split(path.sep).join("/")));
}
