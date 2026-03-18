export const CATEGORY_ACCENTS = {
  avoip:{rgb:"34,211,238",border:"rgba(34,211,238,0.22)",chipBg:"rgba(34,211,238,0.12)",chipText:"#a5f3fc"},
  hdbaset:{rgb:"96,165,250",border:"rgba(96,165,250,0.22)",chipBg:"rgba(96,165,250,0.12)",chipText:"#bfdbfe"},
  matrix:{rgb:"167,139,250",border:"rgba(167,139,250,0.22)",chipBg:"rgba(167,139,250,0.12)",chipText:"#ddd6fe"},
  uc:{rgb:"52,211,153",border:"rgba(52,211,153,0.22)",chipBg:"rgba(52,211,153,0.12)",chipText:"#bbf7d0"},
  videowall:{rgb:"251,191,36",border:"rgba(251,191,36,0.22)",chipBg:"rgba(251,191,36,0.12)",chipText:"#fde68a"},
  audio:{rgb:"251,146,60",border:"rgba(251,146,60,0.22)",chipBg:"rgba(251,146,60,0.12)",chipText:"#fdba74"},
  accessories:{rgb:"148,163,184",border:"rgba(148,163,184,0.20)",chipBg:"rgba(148,163,184,0.10)",chipText:"#e2e8f0"},
  default:{rgb:"125,140,160",border:"rgba(148,163,184,0.16)",chipBg:"rgba(148,163,184,0.08)",chipText:"#cbd5e1"}
};

export function getAccentKey(v:string){
  v = String(v||"").toLowerCase();
  if(v.includes("ip")||v.includes("avoip")) return "avoip";
  if(v.includes("hdbaset")||v.includes("extender")) return "hdbaset";
  if(v.includes("matrix")||v.includes("switch")) return "matrix";
  if(v.includes("uc")||v.includes("apollo")||v.includes("presentation")) return "uc";
  if(v.includes("wall")) return "videowall";
  if(v.includes("audio")||v.includes("dante")) return "audio";
  if(v.includes("access")) return "accessories";
  return "default";
}

export function getAccent(v:string){
  return CATEGORY_ACCENTS[getAccentKey(v)] || CATEGORY_ACCENTS.default;
}