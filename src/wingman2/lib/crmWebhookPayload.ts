/**
 * The CRM send payload, kept out of `crmWebhook.ts` because of what building one
 * carries.
 *
 * Composing a payload renders the discovery brief to HTML and base64-encodes it,
 * and that document builder is not small. A payload exists only when a rep sends
 * or retries a send, while `crmWebhook.ts` is on the boot path: `main.tsx` sweeps
 * the stored send history on every load, so everything that module imports is in
 * the entry's preload set. Its import of the brief builder put the whole export
 * graph in `wm-app-core`, and the eager-JS budget measured it there — for a
 * function the first paint never calls. The storage module stays eager; the
 * document it posts is built in the chunk that offers the send.
 *
 * `CrmWebhookPayload` stays declared in `crmWebhook.ts`, because the stored
 * history keeps the payload of a failed send: the shape belongs to the record
 * rather than to its builder. Only the type is read back from there, so this
 * module adds no runtime edge from the boot chain.
 */

import type { DiscoveryConversationItem } from "../data/projectStore";
import type { CrmWebhookPayload } from "./crmWebhook";
import { buildDiscoveryBriefHtml, fileBaseName } from "./discoveryBriefExport";
import { productDataRevision } from "./productDataRevision";

/**
 * Build the webhook payload from a StoredProject.
 */
export function buildWebhookPayload(project: {
  id: string;
  name: string;
  owner: string;
  stage: string;
  dealOutcome?: string;
  dealOutcomeWhy?: string;
  discoveryBrief?: {
    roomModel?: Record<string, unknown>;
    discoveryConversation?: DiscoveryConversationItem[];
  };
  productSelections?: Array<{
    sku: string;
    title?: string;
    quantity?: number;
    family?: string;
    category?: string;
    status?: string;
    evidence?: string[];
  }>;
  proposal?: {
    title?: string;
    summary?: string;
    preparedBy?: string;
    companyName?: string;
    bomRows?: Array<{
      sku: string;
      description: string;
      role: string;
      qty: number;
      notes?: string;
    }>;
  };
}): CrmWebhookPayload {
  const roomModel = project.discoveryBrief?.roomModel ?? {};
  const getString = (key: string) =>
    typeof roomModel[key] === "string" ? String(roomModel[key]) : "";

  const payload: CrmWebhookPayload = {
    projectId: project.id,
    projectName: project.name || "Untitled Opportunity",
    customer: getString("clientName") || project.owner || "",
    site: getString("siteName") || "",
    stage: project.stage || "Discovery",
    dealOutcome: project.dealOutcome || undefined,
    dealOutcomeWhy: project.dealOutcomeWhy || undefined,
    roomModel: roomModel as Record<string, unknown>,
    discoveryConversation: project.discoveryBrief?.discoveryConversation,
    products: (project.productSelections ?? []).map((p) => ({
      sku: p.sku,
      title: p.title,
      quantity: p.quantity ?? 1,
      family: p.family,
      category: p.category,
      status: p.status,
      evidence: p.evidence,
    })),
    proposalTitle: project.proposal?.title,
    proposalSummary: project.proposal?.summary,
    bomRows: project.proposal?.bomRows?.map((row) => ({
      sku: row.sku,
      description: row.description,
      role: row.role,
      qty: row.qty,
      notes: row.notes,
    })),
    generatedAt: new Date().toISOString(),
    productDataRevision: (() => {
      const revision = productDataRevision();
      return {
        manifestHash: revision.manifestHash,
        generatedAt: revision.generatedAt,
        buildCommit: revision.buildCommit,
      };
    })(),
    source: "wingman",
  };

  // Attach the discovery brief HTML (full Q&A trail) when a conversation
  // exists, so the CRM receives the same document the rep can export — a
  // base64 attachment is the standard webhook delivery shape for ZoHo/
  // Salesforce-style endpoints.
  const brief = project.discoveryBrief;
  const conversation = brief?.discoveryConversation;
  if (brief && conversation && conversation.length > 0) {
    const html = buildDiscoveryBriefHtml(brief, {
      projectName: project.name || "Untitled Opportunity",
      preparedBy: project.proposal?.preparedBy,
      companyName: project.proposal?.companyName,
    });
    payload.discoveryBriefAttachment = {
      filename: `wingman-discovery-brief-${fileBaseName(project.name || "project")}.html`,
      mimeType: "text/html;charset=utf-8",
      content: toBase64Utf8(html),
    };
  }

  return payload;
}

function toBase64Utf8(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }
  // Browser: btoa only handles Latin-1, so encode UTF-8 bytes first.
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
