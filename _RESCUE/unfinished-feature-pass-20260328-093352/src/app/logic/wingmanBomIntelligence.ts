import type { WingmanActiveProjectSnapshot } from "@/app/logic/wingmanProjectState";

export type WingmanBomLine = {
  sku: string;
  qty: number;
  role: string;
  description: string;
  group: "Core" | "Supporting" | "Accessories";
  unitPrice: number;
  extPrice: number;
  marginNote: string;
};

function getPlaceholderUnitPrice(line: { sku: string; role: string }): number {
  const sku = String(line.sku || "").toUpperCase();

  if (sku.includes("MX-0812") || line.role.includes("processor")) return 4200;
  if (sku.includes("SW-0206")) return 1650;
  if (sku.includes("APO")) return 950;
  if (sku.includes("CAM")) return 780;
  if (sku.includes("SYN")) return 420;
  if (sku.includes("RX") || sku.includes("TX")) return 520;
  return 350;
}

function buildDescription(line: { role: string }): string {
  if (line.role.includes("encoder")) {
    return "Encodes source signals onto the AV distribution network.";
  }

  if (line.role.includes("decoder")) {
    return "Decodes AV signals for display or multiview output.";
  }

  if (line.role.includes("control")) {
    return "Provides system control and user interface integration.";
  }

  if (line.role.includes("processor")) {
    return "Handles video wall processing and visual layout control.";
  }

  return "Supporting system component within the AV architecture.";
}

function buildMarginNote(unitPrice: number): string {
  if (unitPrice >= 2000) return "High-value core line. Validate project discount and install scope.";
  if (unitPrice >= 750) return "Mid-value system line. Check bundle or package positioning.";
  return "Accessory/supporting line. Useful for package completeness and upsell.";
}

export function buildWingmanBom(snapshot: WingmanActiveProjectSnapshot): WingmanBomLine[] {
  const base = snapshot.pipeline.bom || [];

  return base.map((line) => {
    let group: WingmanBomLine["group"] = "Accessories";

    if (line.role.includes("encoder") || line.role.includes("decoder")) {
      group = "Core";
    }

    if (line.role.includes("control") || line.role.includes("switch") || line.role.includes("primary")) {
      group = "Supporting";
    }

    const unitPrice = getPlaceholderUnitPrice(line);
    const extPrice = unitPrice * Number(line.qty || 0);

    return {
      sku: line.sku,
      qty: line.qty,
      role: line.role,
      group,
      description: buildDescription(line),
      unitPrice,
      extPrice,
      marginNote: buildMarginNote(unitPrice),
    };
  });
}