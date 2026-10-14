import { useParams } from "react-router-dom";
import { getCustomRoomTemplates } from "../lib/customRoomTemplates";
import { DiscoveryPage } from "./DiscoveryPage";
import { createCustomTemplateEditHandoff, type DiscoveryHandoff } from "../lib/discoveryTemplateHandoff";

export function TemplateBuilderPage() {
  const { templateId } = useParams();
  const template = templateId ? getCustomRoomTemplates().find(item => item.id === templateId) : undefined;
  if (templateId && !template) return <p>Custom template not found.</p>;
  const handoff: DiscoveryHandoff = template ? createCustomTemplateEditHandoff(template) : { mode: "template-create" };
  return <DiscoveryPage key={templateId || "new-template"} roomBuilder templateHandoff={handoff} />;
}
