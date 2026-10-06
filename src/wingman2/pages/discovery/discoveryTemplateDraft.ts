import type { DiscoverySnapshot } from "../../data/workflowHandoff";

function draftKey(templateId?: string) { return `wingman:template-builder-draft:${templateId || "new"}`; }
export function readTemplateBuilderDraft(templateId?: string): DiscoverySnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(draftKey(templateId));
    const value = raw ? JSON.parse(raw) : null;
    return value?.state && value?.brief ? value : null;
  } catch { return null; }
}
export function writeTemplateBuilderDraft(snapshot: DiscoverySnapshot, templateId?: string) {
  window.sessionStorage.setItem(draftKey(templateId), JSON.stringify(snapshot));
}
export function clearTemplateBuilderDraft(templateId?: string) {
  window.sessionStorage.removeItem(draftKey(templateId));
}
