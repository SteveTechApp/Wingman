import type { RoomTemplate } from "./roomTemplates";
import { getTemplateApplicationProfile } from "./templateApplicationProfiles";

function publicAssetPath(directory: string, fileName: string): string {
  const base = String(import.meta.env.BASE_URL || "/");
  return `${base.endsWith("/") ? base : `${base}/`}${directory}/${fileName}`;
}

const templatePhotoOverrides: Record<string, string> = {
  "government-control-room-networkhd600": "government-briefing-room-v1.png",
  "government-security-command-nhd100-bridge": "emergency-dispatch-centre-v1.png",
  "government-situation-control-room-nhd600": "emergency-situation-control-v1.png",
  "control-room-security-operations-networkhd600": "security-operations-cctv-v1.png",
};

export function templateImageFor(template: RoomTemplate): string {
  if (templatePhotoOverrides[template.id]) {
    return publicAssetPath("template-photos", templatePhotoOverrides[template.id]);
  }
  if (template.customTemplate && !template.applicationProfile?.imageKey) {
    return publicAssetPath("template-visuals", "vertical-all.jpg");
  }
  return publicAssetPath("template-photos", getTemplateApplicationProfile(template).imageKey);
}
