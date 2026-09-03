/**
 * Shared "download this blob as a file" helper.
 *
 * Every exporter in the app used to re-implement the same anchor sequence:
 *   create a blob URL, build an <a download>, append it to the document,
 *   click, detach, then revoke the URL. Two details matter and are easy to get
 *   wrong in a copy:
 *
 *   1. The anchor must be IN the document for some browsers (Firefox) to even
 *      start the download - detach it only after the click is dispatched.
 *   2. The revoke must be deferred to a LATER task: an immediate revoke after
 *      click() is racy, because the browser can resolve the URL after the
 *      revoke and abort the download as a failed blob fetch.
 *
 * `revokeDelayMs` lets a caller keep a deliberate longer leash (some exporters
 * revoke after 1000ms); the default 0 defers to the next task, which is all
 * the download fetch needs.
 */
export function downloadBlob(blob: Blob, fileName: string, options?: { revokeDelayMs?: number }): void {
  if (typeof window === "undefined") return;
  const { revokeDelayMs = 0 } = options ?? {};
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), revokeDelayMs);
}
