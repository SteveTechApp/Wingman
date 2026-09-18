import { roomTemplates } from "./roomTemplates";
import { getTemplateApplicationProfile } from "./templateApplicationProfiles";

export const publishedTemplateAuditRecords = roomTemplates.map((template) => ({
  ...template,
  applicationProfile: getTemplateApplicationProfile(template),
}));
