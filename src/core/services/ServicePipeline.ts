import { validateRecommendation, Recommendation } from "./ValidationEngine";
import { ProductCapability } from "../models/ProductCapability";

export function buildProposal(
  recommendation:Recommendation,
  catalog:Record<string,ProductCapability>,
  requiredBandwidth:number,
  requiredDistance:number
){

  const validation = validateRecommendation(
    recommendation,
    catalog,
    requiredBandwidth,
    requiredDistance
  );

  const billOfMaterials = recommendation.lines.map(l=>{
    const p=catalog[l.sku];
    return {
      sku:l.sku,
      name:p?.name ?? l.sku,
      quantity:l.quantity
    };
  });

  return {
    billOfMaterials,
    validation,
    generatedAt:new Date().toISOString()
  };
}