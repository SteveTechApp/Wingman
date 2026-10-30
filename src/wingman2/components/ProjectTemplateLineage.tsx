import { Link } from "react-router-dom";
import { CheckCircle2, LayoutTemplate } from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
import { useCustomRoomTemplates } from "../lib/customRoomTemplates";
import { templatesSavedFromProject } from "../lib/templateLineage";
import { statusChipClassName, type StatusChipVariant } from "./StatusChip";
import { OpenTemplateLink } from "./OpenTemplateLink";

// The chip's class list comes from StatusChip's tokens, so this is a variant
// name rather than a class of its own.
const TEMPLATE_CHIP_VARIANT: StatusChipVariant = "neutral";

/**
 * The reverse of the template page's lineage line: a room that has been saved as
 * a template says so, and each template opens.
 *
 * It reads the stored templates rather than remembering the click that saved
 * one, so the fact survives a reload and a template saved from this room on an
 * earlier visit still appears. A room nobody has saved prints nothing, and a
 * template deleted from the library stops being listed instead of offering a
 * link that lands nowhere.
 */
export function ProjectTemplateLineage({ projectId }: { projectId: string }) {
  const templates = useCustomRoomTemplates();
  const saved = templatesSavedFromProject(projectId, templates);

  if (!saved.length) return null;

  return (
    <section
      className="wm-project-template-lineage rounded-2xl border text-sm wm-output-panel"
      data-project-template-lineage={saved.length}
      aria-label="Saved as a template"
    >
      <p className="wm-project-template-lineage__lead">
        <CheckCircle2 aria-hidden="true" />
        <span>
          {saved.length === 1 ? "Saved as a custom template." : `Saved as ${saved.length} custom templates.`}
        </span>
      </p>
      <ul className="wm-project-template-lineage__list">
        {saved.map((template) => (
          <li key={template.id}>
            {/* The row says what it does, in the words every surface uses.
                `OpenTemplateLink` owns that wording; this only gives it the row's
                shape. */}
            <OpenTemplateLink
              template={template}
              className="wm-project-template-lineage__link"
              labelClassName="wm-project-template-lineage__name"
              trailing={
                <span className="wm-project-template-lineage__arrow" aria-hidden="true">
                  →
                </span>
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The same fact on a gallery card, where there is room for a chip and not for a
 * list.
 *
 * A rep scanning the projects page is asking which rooms are already a starting
 * point, and opening each record to find out is the walk this saves. The count
 * rides on the chip because a room can produce more than one design — its own
 * template and the copies made from it — and the names travel in the accessible
 * name and the tooltip, so the chip is an answer rather than the same three
 * words on every card. The chip opens the first design the record lists, so the
 * two readings of the same fact never name different templates.
 *
 * A deleted template stops appearing here for the same reason it stops being
 * listed on the record: both read the stored templates. The list arrives already
 * read by the page (`useCustomRoomTemplates`), so a card does not subscribe to
 * the store per row.
 */
export function ProjectTemplateChip({
  projectId,
  templates,
}: {
  projectId: string;
  templates: readonly { id: string; name: string; sourceProjectId?: string }[];
}) {
  const saved = templatesSavedFromProject(projectId, templates);
  if (!saved.length) return null;

  const names = saved.map((template) => template.name).join(", ");
  return (
    <Link
      to={`${routeCatalogByKey.templates.path}/${saved[0].id}`}
      className={statusChipClassName(TEMPLATE_CHIP_VARIANT)}
      title={names}
      aria-label={saved.length === 1
        ? `Saved as a template: ${names}`
        : `Saved as ${saved.length} templates: ${names}`}
      data-project-template-flag={saved.length}
    >
      <LayoutTemplate className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="wm-status-chip-label">
        {saved.length === 1 ? "Saved as a template" : `Saved as ${saved.length} templates`}
      </span>
    </Link>
  );
}
