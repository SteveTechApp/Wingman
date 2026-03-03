import { ProductCapability } from "../models/ProductCapability";
import { ValidationResult } from "../models/ValidationTypes";

export type RecommendationLine={
  sku:string;
  quantity:number;
};

export type Recommendation={
  lines:RecommendationLine[];
  rationale:string[];
};

function confidence(result:ValidationResult):ValidationResult{
  if(result.blockers.length>0) return {...result,valid:false,confidence:"low"};
  if(result.warnings.length>0) return {...result,valid:true,confidence:"medium"};
  return {...result,valid:true,confidence:"high"};
}

export function validateRecommendation(
  recommendation:Recommendation,
  catalog:Record<string,ProductCapability>,
  requiredBandwidth:number,
  requiredDistance:number
):ValidationResult{

  const warnings:string[]=[];
  const blockers:string[]=[];

  for(const line of recommendation.lines){

    const p=catalog[line.sku];
    if(!p){
      blockers.push(`Unknown SKU ${line.sku}`);
      continue;
    }

    if(p.lifecycle==="eol"){
      blockers.push(`EOL product recommended: ${p.sku}`);
    }

    if(p.lifecycle==="nrnd"){
      warnings.push(`NRND product used: ${p.sku}`);
    }

    if(line.quantity<=0){
      blockers.push(`Invalid quantity for ${p.sku}`);
    }

    if(p.video && p.video.maxBandwidthGbps<requiredBandwidth){
      blockers.push(`Bandwidth insufficient for ${p.sku}`);
    }

    if(p.transmission?.maxDistanceMeters &&
       requiredDistance>p.transmission.maxDistanceMeters){
      blockers.push(`Distance exceeds ${p.sku} capability`);
    }

  }

  return confidence({
    valid:blockers.length===0,
    warnings,
    blockers,
    confidence:"medium"
  });
}