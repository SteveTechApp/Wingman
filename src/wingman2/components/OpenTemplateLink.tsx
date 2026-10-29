import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";

/**
 * The one link the app offers to a saved template.
 *
 * Five surfaces print it — Home's recent card, the gallery card's action row, the
 * project's action menu, the lineage strip and the project page's save
 * confirmation — and they had drifted: the save confirmation said nothing where
 * the others said the verb, and one surface's accessible name kept a verb its
 * visible label dropped at phone width. So the wording, the destination and the
 * accessible name live here, and a surface only decides how the link looks where
 * it sits.
 *
 * "Open template: <name>" rather than the name alone, because a name under a
 * count sentence ("Saved as 2 custom templates.") does not say that the name is
 * the way in — and a bare name is not an action when it is read out.
 */
const TEMPLATE_OPEN_VERB = "Open template: ";

/** What the link says, and what it is called: one string, one meaning. */
function openTemplateLabel(name: string): string {
  return `${TEMPLATE_OPEN_VERB}${name}`;
}

/** Where a saved template lives in the template library. */
function templatePath(templateId: string): string {
  return `${routeCatalogByKey.templates.path}/${templateId}`;
}

type OpenTemplateLinkProps = {
  /** The stored design this link opens. */
  template: { id: string; name: string };
  className?: string;
  /**
   * Class of the element carrying the wording, where a surface bounds that rather
   * than the link: a gallery card has less room than a design name, so the label
   * ellipses inside its pill instead of pushing the row's other actions off.
   */
  labelClassName?: string;
  /**
   * Class of the verb's own element. Setting it splits the verb from the name so a
   * narrow column can drop the verb — Home's recent cards do, at phone width —
   * while the accessible name keeps it at every width. A surface that does not
   * split leaves this unset and prints the whole wording in one element.
   */
  verbClassName?: string;
  /** A mark in front of the wording, where the surface has one. */
  icon?: ReactNode;
  /** Something after the wording, such as the lineage row's arrow. */
  trailing?: ReactNode;
  /** The tooltip, for a surface whose visible label can be truncated. */
  title?: string;
} & Omit<ComponentProps<typeof Link>, "to" | "children" | "className" | "title" | "aria-label">;

export function OpenTemplateLink({
  template,
  className,
  labelClassName,
  verbClassName,
  icon,
  trailing,
  title,
  ...rest
}: OpenTemplateLinkProps) {
  // The accessible name is the whole wording at every width, so a phone that drops
  // the verb for space still announces which action the name opens.
  const label = openTemplateLabel(template.name);

  return (
    <Link
      {...rest}
      to={templatePath(template.id)}
      className={className}
      title={title}
      aria-label={label}
    >
      {icon}
      {verbClassName ? (
        <>
          <span className={verbClassName}>{TEMPLATE_OPEN_VERB}</span>
          {template.name}
        </>
      ) : (
        <span className={labelClassName}>{label}</span>
      )}
      {trailing}
    </Link>
  );
}
