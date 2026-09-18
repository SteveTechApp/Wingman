import { FilePenLine, MoreHorizontal } from "lucide-react";
import type { RoomTemplate } from "../lib/roomTemplates";
import { getTemplateApplicationProfile, templateDesignFacts } from "../lib/templateApplicationProfiles";
import { templateImageFor } from "../lib/templateImages";

export type TemplateLibraryCardProps = {
  template: RoomTemplate;
  onReview: () => void;
  onPersonalise: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onCancelDelete?: () => void;
  deletePending?: boolean;
};

function marketTone(market: string) {
  const value = market.toLowerCase();
  if (value.includes("education")) return "blue";
  if (value.includes("retail") || value.includes("hospitality")) return "amber";
  if (value.includes("health") || value.includes("residential")) return "green";
  if (value.includes("government") || value.includes("control") || value.includes("transport")) return "violet";
  if (value.includes("broadcast") || value.includes("media") || value.includes("venue")) return "magenta";
  return "aqua";
}

export function TemplateLibraryCard({ template, onReview, onPersonalise, onEdit, onDuplicate, onDelete, onCancelDelete, deletePending = false }: TemplateLibraryCardProps) {
  const profile = getTemplateApplicationProfile(template);
  const facts = templateDesignFacts(template);
  const reviewLabel = profile.reviewStatus === "reviewed" ? "Reviewed design" : "Needs review";

  return <article className="wm-solution-card wm-template-library-card" data-template-tone={marketTone(profile.canonicalMarket)} data-custom-template={template.customTemplate ? "true" : undefined}>
    <figure className="wm-template-library-card__visual wm-solution-card-visual">
      <button className="wm-template-library-card__open" type="button" aria-label={template.name} onClick={onReview}>
        <img src={templateImageFor(template)} alt={`${template.name} application`} loading="lazy" width="640" height="360" />
        <span className="wm-template-library-card__caption"><span className="wm-badge">{profile.canonicalMarket}</span><span className={`wm-status is-${profile.reviewStatus === "reviewed" ? "confirmed" : "assumed"}`}>{reviewLabel}</span></span>
      </button>
    </figure>
    <div className="wm-template-library-card__body">
      <div className="wm-template-library-card__heading"><h3 className="wm-card-title">{template.name}</h3><span>{template.scale}</span></div>
      <p className="wm-template-library-card__summary">{template.summary}</p>
      <dl className="wm-template-library-card__facts">
        <div><dt>Architecture</dt><dd>{facts.architectureFamily}</dd></div>
        <div><dt>Core design</dt><dd>{facts.requiredSkuCount} required {facts.requiredSkuCount === 1 ? "SKU" : "SKUs"}</dd></div>
        <div><dt>Endpoints</dt><dd>{facts.sourceEndpointCount} in · {facts.outputEndpointCount} out</dd></div>
      </dl>
      <div className="wm-template-actions"><button className="wm-button wm-button-primary" type="button" onClick={onReview}>Review design</button><button className="wm-button wm-button-secondary" type="button" onClick={onPersonalise}><FilePenLine aria-hidden="true" /> Personalise</button></div>
      {template.customTemplate && onEdit && onDuplicate && onDelete ? <details className="wm-template-manage"><summary aria-label={`Manage ${template.name}`}><MoreHorizontal aria-hidden="true" /> <span>Manage custom template</span></summary><div className="wm-template-manage-actions"><button type="button" onClick={onEdit}>Edit</button><button type="button" onClick={onDuplicate}>Duplicate</button><button type="button" onClick={onDelete}>{deletePending ? "Confirm delete?" : "Delete"}</button>{deletePending && onCancelDelete ? <button type="button" onClick={onCancelDelete}>Keep template</button> : null}</div></details> : null}
    </div>
  </article>;
}
