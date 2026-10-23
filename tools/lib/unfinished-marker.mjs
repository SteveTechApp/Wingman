/**
 * Explicit work markers or standalone placeholder copy, rather than ordinary
 * translated words, state identifiers or descriptive prose.
 */
export function hasUnfinishedMarker(line) {
  const task = /\b(?:TODO|FIXME|WIP)\b/;
  const commentTask = /(?:\/\/|\/\*+|^\s*\*)\s*(?:todo|fixme|wip)\b/i;
  const placeholder = /(?:["'`]\s*(?:not implemented|coming soon|under construction)\s*[.!]?\s*["'`]|(?:\/\/|\/\*+|^\s*\*)\s*(?:not implemented|coming soon|under construction)\b)/i;
  return task.test(line) || commentTask.test(line) || placeholder.test(line);
}
