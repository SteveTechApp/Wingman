import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { useProjectStore } from "../features/projects";
import { useCustomRoomTemplates } from "../lib/customRoomTemplates";
import { roomTemplates, type RoomTemplate } from "../lib/roomTemplates";
import { templateLineageRecord } from "../lib/templateLineage";

/**
 * Where this design came from, named and linked.
 *
 * A source is shown only while this browser still holds it, because the point of
 * the line is that a rep can go and read that room or that design. A deleted
 * project or template leaves no line rather than a name with nowhere to go, and
 * the two halves resolve on their own, so a copy whose project was deleted still
 * says which design it was made from.
 */
export function TemplateLineageNote({
  template,
}: {
  template: RoomTemplate & { sourceTemplateId?: string; sourceProjectId?: string };
}) {
  const { projects } = useProjectStore();
  const customTemplates = useCustomRoomTemplates();
  const lineage = templateLineageRecord(template, projects, [...customTemplates, ...roomTemplates]);

  if (!lineage.project && !lineage.template) return null;

  return (
    <p className="wm-template-lineage" data-template-lineage="true">
      {lineage.project ? (
        <span>
          Saved from{" "}
          <Link to={`${routeCatalogByKey.projects.path}/${lineage.project.id}`}>{lineage.project.name}</Link>
        </span>
      ) : null}
      {lineage.template ? (
        <span>
          Copied from{" "}
          <Link to={`${routeCatalogByKey.templates.path}/${lineage.template.id}`}>{lineage.template.name}</Link>
        </span>
      ) : null}
    </p>
  );
}
