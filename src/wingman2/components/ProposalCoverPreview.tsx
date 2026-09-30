import { FileText } from "lucide-react";
import type { ProposalWizardDraft } from "../lib/proposalWizard";
import { projectPresentation } from "../lib/projectPresentation";

export function ProposalCoverPreview({ draft, company }: { draft: ProposalWizardDraft; company: string }) {
  const presentation = projectPresentation(draft.projectName);
  return <div className="wm-response-preview">
    <p className="wm-response-preview-label">Your customer document</p>
    <div className="wm-response-paper" aria-label="Live proposal cover preview">
      <div className="wm-response-paper-brand">{company || "Wingman"}<span>Solution proposal</span></div>
      <h2>{draft.projectName || "Your next project"}</h2>
      <p className="wm-response-paper-intro">{presentation.label} · Prepared around your requirements</p>
      <div className="wm-response-cover-image">
        {presentation.image ? <img src={presentation.image} alt={`${presentation.label} application illustration`} /> : <FileText aria-hidden="true" />}
      </div>
      {presentation.image && <small className="wm-response-image-caption">Illustrative application</small>}
      <div className="wm-response-paper-customer"><span>Prepared for</span><strong>{draft.customerName || "Your customer"}</strong>{draft.contactName && <small>{draft.contactName}</small>}</div>
      <footer><div><span>Prepared by</span><strong>{draft.preparedBy || "Your name"}</strong></div><span>Draft</span></footer>
    </div>
    <p className="wm-response-preview-note"><FileText size={16} aria-hidden="true" /> Cover concept · Editable Word export</p>
  </div>;
}
