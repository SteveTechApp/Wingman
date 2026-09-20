import type { RoomTemplate } from "./roomTemplates";
import { getTemplateApplicationProfile } from "./templateApplicationProfiles";

function publicAssetPath(directory: string, fileName: string): string {
  const base = String(import.meta.env.BASE_URL || "/");
  return `${base.endsWith("/") ? base : `${base}/`}${directory}/${fileName}`;
}

export function templateImageFor(template: RoomTemplate): string {
  if (template.customTemplate && !template.applicationProfile?.imageKey) {
    return publicAssetPath("template-visuals", "vertical-all.jpg");
  }
  return publicAssetPath("template-photos", getTemplateApplicationProfile(template).imageKey);
}
