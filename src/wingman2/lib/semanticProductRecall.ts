import { buildAvProductSemanticProfile } from "./avProductSemanticProfiler";
import type { AvProductSemanticProfile, SemanticRecallCandidate } from "../types/avProductSemantics";

type LooseRecord = Record<string, any>;
const key = (v:string) => v.toUpperCase().replace(/[^A-Z0-9]/g,"");
const skuOf = (p:LooseRecord) => String(p?.sku??p?.model??p?.partNumber??"").trim();

function hardDirection(a:AvProductSemanticProfile,b:AvProductSemanticProfile):boolean {
  const s=new Set(["source-side","destination-side"]);
  return s.has(a.direction)&&s.has(b.direction)&&a.direction!==b.direction;
}
function hardSupport(a:AvProductSemanticProfile,b:AvProductSemanticProfile):boolean {
  return (a.topologyModel==="support-only")!==(b.topologyModel==="support-only");
}
function hardTopology(a:AvProductSemanticProfile,b:AvProductSemanticProfile):boolean {
  if (a.topologyModel==="unknown"||b.topologyModel==="unknown"||a.topologyModel===b.topologyModel) return false;
  const soft=new Set(["many-to-one-selected|room-core","room-core|many-to-one-selected","point-to-point|bridge","bridge|point-to-point"]);
  return !soft.has(`${a.topologyModel}|${b.topologyModel}`);
}
function overlap(a:string[],b:string[]):number {
  const s=new Set(b.map(x=>x.toLowerCase())); return a.filter(x=>s.has(x.toLowerCase())).length;
}

export function scoreSemanticCompatibility(a:AvProductSemanticProfile,b:AvProductSemanticProfile) {
  const reasons:string[]=[], blockers:string[]=[]; let score=0;
  if (hardSupport(a,b)) blockers.push("Support/accessory role mismatch.");
  if (hardDirection(a,b)) blockers.push(`Endpoint direction mismatch: ${a.direction} vs ${b.direction}.`);
  if (hardTopology(a,b)) blockers.push(`Topology mismatch: ${a.topologyModel} vs ${b.topologyModel}.`);
  if (blockers.length) return {score:-1000,reasons,blockers};

  if (a.archetypeId!=="unknown"&&a.archetypeId===b.archetypeId){score+=100;reasons.push(`Same archetype: ${a.archetypeName}.`);}
  if (a.topologyModel!=="unknown"&&a.topologyModel===b.topologyModel){score+=70;reasons.push(`Same topology: ${a.topologyModel}.`);}
  if (a.compareDomain&&a.compareDomain===b.compareDomain){score+=45;reasons.push(`Same domain: ${a.compareDomain}.`);}
  if (a.canonicalRole!=="unknown"&&a.canonicalRole.toLowerCase()===b.canonicalRole.toLowerCase()){score+=45;reasons.push(`Same role: ${a.canonicalRole}.`);}
  if (a.primaryOutputBehaviour!=="unknown"&&a.primaryOutputBehaviour===b.primaryOutputBehaviour){score+=55;reasons.push(`Same output behaviour: ${a.primaryOutputBehaviour}.`);}

  if (a.logicalInputCount&&b.logicalInputCount){
    if (b.logicalInputCount<a.logicalInputCount) blockers.push(`Insufficient inputs: ${b.logicalInputCount} < ${a.logicalInputCount}.`);
    else {score+=b.logicalInputCount===a.logicalInputCount?35:Math.max(5,25-(b.logicalInputCount-a.logicalInputCount)*3);reasons.push("Input capacity covers requirement.");}
  }
  if (a.logicalOutputCount&&b.logicalOutputCount){
    if (b.logicalOutputCount<a.logicalOutputCount) blockers.push(`Insufficient outputs: ${b.logicalOutputCount} < ${a.logicalOutputCount}.`);
    else {score+=b.logicalOutputCount===a.logicalOutputCount?45:Math.max(5,30-(b.logicalOutputCount-a.logicalOutputCount)*4);reasons.push("Output capacity covers requirement.");}
  }
  if (blockers.length) return {score:-1000,reasons,blockers};

  const i=overlap(a.inputConnectors,b.inputConnectors), o=overlap(a.outputConnectors,b.outputConnectors);
  if(i){score+=Math.min(30,i*12);reasons.push(`${i} input connector family match(es).`);}
  if(o){score+=Math.min(30,o*12);reasons.push(`${o} output connector family match(es).`);}
  const shared=a.specialistFeatures.filter(f=>b.specialistFeatures.includes(f));
  if(shared.length){score+=Math.min(30,shared.length*5);reasons.push(`Shared specialist features: ${shared.join(", ")}.`);}
  return {score,reasons,blockers};
}

export function recallSemanticCandidates(params:{competitor:unknown;products:readonly LooseRecord[];limit?:number;}):SemanticRecallCandidate[] {
  const competitor=buildAvProductSemanticProfile(params.competitor), out:SemanticRecallCandidate[]=[];
  for(const product of params.products){
    const sku=skuOf(product); if(!sku) continue;
    const semanticProfile=buildAvProductSemanticProfile(product);
    const fit=scoreSemanticCompatibility(competitor,semanticProfile);
    if(fit.blockers.length||fit.score<=0) continue;
    out.push({
      sku,name:String(product.name??product.title??sku),
      family:String(product.family??product.productFamily??product.category??"WyreStorm"),
      score:Math.min(100,Math.round(fit.score/3)),
      cautions:semanticProfile.unknowns.slice(0,3),semanticReasons:fit.reasons,semanticProfile
    });
  }
  return out.sort((a,b)=>b.score-a.score||a.sku.localeCompare(b.sku)).slice(0,params.limit??40);
}

export function mergeSemanticRecallWithHeuristicMatches(
  heuristic:readonly LooseRecord[], semantic:readonly SemanticRecallCandidate[], limit=50
):LooseRecord[] {
  const by=new Map<string,LooseRecord>();
  for(const m of heuristic){const k=key(String(m.sku??m.model??""));if(k)by.set(k,{...m});}
  for(const m of semantic){
    const k=key(m.sku);if(!k)continue;const old=by.get(k);
    by.set(k,old?{
      ...old,score:Math.max(Number(old.score??0),m.score),
      cautions:Array.from(new Set([...(Array.isArray(old.cautions)?old.cautions:[]),...m.cautions])),
      semanticReasons:m.semanticReasons,semanticProfile:m.semanticProfile
    }:{
      sku:m.sku,name:m.name,family:m.family,score:m.score,cautions:m.cautions,
      semanticReasons:m.semanticReasons,semanticProfile:m.semanticProfile
    });
  }
  return [...by.values()].sort((a,b)=>Number(b.score??0)-Number(a.score??0)).slice(0,limit);
}
