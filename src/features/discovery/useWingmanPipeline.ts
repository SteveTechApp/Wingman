import { buildDecision, type WingmanInputs, type WingmanDecision } from "@/app/logic/wingmanDecisionEngine";

export type WingmanBomLine = {
  sku: string;
  qty: number;
  role: "primary" | "supporting";
};

export type WingmanPipelineResult = {
  decision: WingmanDecision;
  bom: WingmanBomLine[];
};

export function runWingmanPipeline(input: WingmanInputs): WingmanPipelineResult {
  const decision = buildDecision(input);

  const bom: WingmanBomLine[] = [
    ...decision.primaryProducts.map((sku) => ({
      sku,
      qty: 1,
      role: "primary" as const,
    })),
    ...decision.supportingProducts.map((sku) => ({
      sku,
      qty: 1,
      role: "supporting" as const,
    })),
  ];

  return {
    decision,
    bom,
  };
}