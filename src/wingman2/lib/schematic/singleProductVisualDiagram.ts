import type { VisualDiagramModel, VisualNodeKind } from "../visualStudioTypes";

export interface SingleProductVisualSource {
  sku: string;
  name?: string;
  family?: string;
  category?: string;
  description?: string;
  connectors?: string[];
}

function productKind(product: SingleProductVisualSource): VisualNodeKind {
  const text = `${product.category ?? ""} ${product.name ?? ""} ${product.family ?? ""}`.toLowerCase();
  if (/audio|amplifier|speaker|microphone/.test(text)) return "audio";
  if (/camera/.test(text)) return "camera";
  if (/controller|control/.test(text)) return "controller";
  if (/network|avoip|ip encoder|ip decoder/.test(text)) return "transport";
  if (/cable|extender|transmitter|receiver/.test(text)) return "transport";
  if (/display|monitor|projector/.test(text)) return "display";
  if (/usb/.test(text)) return "usb";
  return "switching";
}

export function buildSingleProductVisualDiagram(product: SingleProductVisualSource): VisualDiagramModel {
  const sku = product.sku.trim().toUpperCase();
  const title = `${sku} product context`;
  const connectors = (product.connectors ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 6);
  const productDetails = [product.name, product.category, product.family].filter(Boolean).join(" · ");
  const knownInterfaces = connectors.length
    ? `Known interfaces: ${connectors.join(", ")}.`
    : "Connector details are not available in the current product summary.";

  return {
    id: "single-product-context",
    title,
    subtitle: `Product context built from the catalogue entry for ${sku}.`,
    kind: "product-connection",
    customerSummary: `${sku} is the selected product. Confirm the application and connected equipment before treating it as a complete system design.`,
    technicalSummary: `${knownInterfaces} This product-only view does not claim port direction, connected devices, cable routes, or room requirements.`,
    nodes: [
      {
        id: "selected-product",
        label: sku,
        subtitle: [productDetails, knownInterfaces].filter(Boolean).join("\n"),
        kind: productKind(product),
        status: "recommended",
        emphasis: "primary",
        column: 0,
        row: 0,
      },
      {
        id: "design-context-check",
        label: "Confirm the application",
        subtitle: "Add the source or signal, destination, quantity, and any required control or audio needs to build a system diagram.",
        kind: "warning",
        status: "missing",
        emphasis: "support",
        column: 1,
        row: 0,
      },
    ],
    edges: [],
    assumptions: ["Only the selected product is specified. No customer equipment or signal path has been assumed."],
    missingInformation: ["Application, connected equipment, quantities, and required signal path."],
    quoteRisks: [],
    nextActions: ["Confirm what the customer is connecting and what outcome they need."],
  };
}
