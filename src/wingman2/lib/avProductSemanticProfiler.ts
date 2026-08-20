import registryJson from "../../../data/governance/av-product-semantics-registry.json";
import type {
  AvOutputBehaviour,
  AvProductSemanticProfile,
  AvSemanticPort,
  AvSignalDirection,
  AvTopologyModel,
} from "../types/avProductSemantics";

type LooseRecord = Record<string, any>;
type Rule = {
  id: string;
  test: RegExp;
  priority: number;
  domain?: string;
  role: string;
  direction: AvSignalDirection;
  outputBehaviour: AvOutputBehaviour;
};

const REGISTRY = registryJson as {
  productArchetypes: Array<{
    id: string;
    name: string;
    purpose: string;
    topologyModel: AvTopologyModel;
    typicalDependencies?: string[];
  }>;
};

const RULES = ([
  { id:"casting-accessory", test:/\b(clickshare\s+button|airmedia\s+connect\s+adapter|casting\s+dongle|wireless\s+(?:presentation\s+)?dongle)\b/i, priority:140, domain:"WIRELESS_PRESENTATION", role:"wireless presentation accessory", direction:"support", outputBehaviour:"encoded-network" },
  { id:"uc-video-bar", test:/\b(video\s*bar|conference\s*bar|conferencing\s*bar|speakerphone|all[- ]in[- ]one.*(?:camera|microphone|speaker))\b/i, priority:139, domain:"UC", role:"uc room endpoint", direction:"room-core", outputBehaviour:"unknown" },
  { id:"ndi-camera", test:/\b(ndi(?:\s+hx)?\s+(?:ptz\s+)?camera|ndi\s+camera|ndi\s+ptz)\b/i, priority:138, domain:"NDI_CAMERA", role:"ndi camera", direction:"source-side", outputBehaviour:"encoded-network" },
  { id:"camera-bridge", test:/\b(camera\s+bridge|usb\s+camera\s+bridge|multi[- ]camera\s+bridge|uvc\s+bridge)\b/i, priority:137, domain:"UC", role:"camera bridge", direction:"processing", outputBehaviour:"decoded-local" },
  { id:"ptz-camera", test:/\b(ptz\s+(?:conference\s+)?camera|pan[- ]tilt[- ]zoom|visca|pelco[- ]d)\b/i, priority:136, domain:"PTZ_CAMERA", role:"ptz camera", direction:"source-side", outputBehaviour:"decoded-local" },
  { id:"multiview-processor", test:/\b(multiview|multi[- ]view|quad\s+viewer|quad[- ]view|picture[- ]by[- ]picture|windowing\s+processor)\b/i, priority:135, domain:"MULTIVIEW", role:"multiview processor", direction:"processing", outputBehaviour:"composited" },
  { id:"video-wall-processor", test:/\b(video\s*wall\s+(?:processor|controller)|videowall\s+(?:processor|controller)|wall\s+processor)\b/i, priority:134, domain:"VIDEO_WALL", role:"video wall processor", direction:"processing", outputBehaviour:"routed" },
  { id:"distribution-amplifier", test:/\b(distribution\s+amplifier|distribution\s+amp|hdmi\s+splitter|video\s+splitter|splitter)\b/i, priority:133, domain:"DISTRIBUTION", role:"distribution amplifier", direction:"processing", outputBehaviour:"mirrored" },
  { id:"seamless-matrix", test:/\b(seamless\s+matrix|matrix.*seamless|seamless.*matrix)\b/i, priority:132, domain:"MATRIX", role:"matrix", direction:"processing", outputBehaviour:"routed" },
  { id:"matrix-switcher", test:/\b(matrix\s+(?:switcher|switch|router)|\d{1,2}\s*[x×]\s*\d{1,2}\s+matrix)\b/i, priority:131, domain:"MATRIX", role:"matrix", direction:"processing", outputBehaviour:"routed" },
  { id:"wireless-presentation-hub", test:/\b(wireless\s+(?:presentation|collaboration|screen\s+sharing)\s+(?:hub|gateway|receiver|system)|clickshare\s+cx|mersive\s+solstice|airmedia\s+(?:receiver|presentation))\b/i, priority:130, domain:"WIRELESS_PRESENTATION", role:"wireless presentation", direction:"room-core", outputBehaviour:"selected" },
  { id:"presentation-switcher", test:/\b(presentation\s+switcher|room\s+core|collaboration\s+switcher|usb-c.*switcher|switcher.*usb-c)\b/i, priority:129, domain:"PRESENTATION", role:"presentation switcher", direction:"room-core", outputBehaviour:"selected" },
  { id:"avoip-transceiver", test:/\b(av[- ]?over[- ]?ip|avoip|networkhd|omnistream|dm\s*nvx|zyper|nav)\b.*\b(transceiver|trx)\b|\b(transceiver|trx)\b.*\b(av[- ]?over[- ]?ip|avoip|networkhd)\b/i, priority:128, domain:"AVOIP", role:"transceiver", direction:"bidirectional", outputBehaviour:"encoded-network" },
  { id:"avoip-encoder", test:/\b(av[- ]?over[- ]?ip|avoip|networkhd|omnistream|dm\s*nvx|zyper|nav)\b.*\b(encoder|transmitter|tx)\b|\b(encoder|transmitter)\b.*\b(av[- ]?over[- ]?ip|avoip|networkhd)\b/i, priority:127, domain:"AVOIP", role:"encoder", direction:"source-side", outputBehaviour:"encoded-network" },
  { id:"avoip-decoder", test:/\b(av[- ]?over[- ]?ip|avoip|networkhd|omnistream|dm\s*nvx|zyper|nav)\b.*\b(decoder|receiver|rx)\b|\b(decoder|receiver)\b.*\b(av[- ]?over[- ]?ip|avoip|networkhd)\b/i, priority:127, domain:"AVOIP", role:"decoder", direction:"destination-side", outputBehaviour:"decoded-local" },
  { id:"avoip-controller", test:/\b(av[- ]?over[- ]?ip|networkhd|avoip).*\b(controller|control\s+appliance)\b|\bnhd-ctl\b/i, priority:126, domain:"CONTROL", role:"avoip controller", direction:"support", outputBehaviour:"control" },
  { id:"hdbaset-extender-kit", test:/\b(hdbaset|hdbt).*\b(extender\s+kit|tx\/rx|transmitter.*receiver)\b|\bextender\s+kit\b.*\bhdbaset\b/i, priority:125, domain:"HDBASET", role:"tx/rx extender kit", direction:"bidirectional", outputBehaviour:"decoded-local" },
  { id:"hdbaset-transmitter", test:/\b(hdbaset|hdbt).*\b(transmitter|tx)\b|\b(transmitter|tx)\b.*\b(hdbaset|hdbt)\b/i, priority:124, domain:"HDBASET", role:"transmitter", direction:"source-side", outputBehaviour:"encoded-network" },
  { id:"hdbaset-receiver", test:/\b(hdbaset|hdbt).*\b(receiver|rx)\b|\b(receiver|rx)\b.*\b(hdbaset|hdbt)\b/i, priority:124, domain:"HDBASET", role:"receiver", direction:"destination-side", outputBehaviour:"decoded-local" },
  { id:"kvm-extender", test:/\bkvm\s+extender|keyboard.*video.*mouse.*extender/i, priority:123, domain:"HDBASET", role:"kvm extender", direction:"bidirectional", outputBehaviour:"decoded-local" },
  { id:"usb-extender", test:/\busb(?:\s*[23](?:\.\d)?)?\s+extender|usb\s+over\s+(?:cat|ethernet|fiber|fibre)/i, priority:122, domain:"HDBASET", role:"usb extender", direction:"bidirectional", outputBehaviour:"decoded-local" },
  { id:"capture-recorder", test:/\b(capture\s+(?:device|card)|recorder|streaming\s+encoder|streamer)\b/i, priority:121, domain:"CAPTURE", role:"capture device", direction:"destination-side", outputBehaviour:"encoded-network" },
  { id:"scaler-converter", test:/\b(format\s+converter|video\s+converter|scaler|scaling\s+converter)\b/i, priority:120, domain:"PROCESSING", role:"converter", direction:"processing", outputBehaviour:"selected" },
  { id:"audio-embedder", test:/\b(audio\s+(?:de[- ]?embedder|embedder|extractor)|audio\s+de[- ]?embedding)\b/i, priority:119, domain:"AUDIO", role:"audio bridge", direction:"processing", outputBehaviour:"selected" },
  { id:"audio-dsp", test:/\b(audio\s+dsp|digital\s+signal\s+processor|conference\s+dsp|aec\s+processor)\b/i, priority:118, domain:"AUDIO", role:"audio processor", direction:"processing", outputBehaviour:"routed" },
  { id:"audio-mixer", test:/\b(audio\s+mixer|mixing\s+console|digital\s+mixer)\b/i, priority:117, domain:"AUDIO", role:"mixer", direction:"processing", outputBehaviour:"routed" },
  { id:"power-amplifier", test:/\b(power\s+amplifier|speaker\s+amplifier|\d+\s*w.*amplifier)\b/i, priority:116, domain:"AUDIO", role:"power amplifier", direction:"destination-side", outputBehaviour:"powered-audio" },
  { id:"network-audio-interface", test:/\b(dante|aes67).*\b(interface|adapter|bridge)\b|\bnetwork\s+audio\s+(?:interface|bridge)\b/i, priority:115, domain:"AUDIO", role:"network audio interface", direction:"bidirectional", outputBehaviour:"encoded-network" },
  { id:"microphone", test:/\b(microphone|mic\s+array|beamforming\s+mic)\b/i, priority:100, domain:"AUDIO", role:"microphone", direction:"source-side", outputBehaviour:"encoded-network" },
  { id:"speaker", test:/\b(loudspeaker|ceiling\s+speaker|surface\s+speaker)\b/i, priority:99, domain:"AUDIO", role:"speaker", direction:"destination-side", outputBehaviour:"none" },
  { id:"control-processor", test:/\b(control\s+processor|automation\s+controller|control\s+system)\b/i, priority:98, domain:"CONTROL", role:"control processor", direction:"support", outputBehaviour:"control" },
  { id:"touch-panel", test:/\b(touch\s+panel|touchscreen\s+controller|control\s+panel)\b/i, priority:97, domain:"CONTROL", role:"touch panel", direction:"support", outputBehaviour:"control" },
  { id:"gpio-relay", test:/\b(gpio|relay|contact\s+closure).*\b(interface|controller|module)\b/i, priority:96, domain:"CONTROL", role:"gpio relay interface", direction:"support", outputBehaviour:"control" },
  { id:"projector", test:/\bprojector\b/i, priority:95, domain:"DISPLAY", role:"projector", direction:"destination-side", outputBehaviour:"none" },
  { id:"display", test:/\b(interactive\s+display|signage\s+display|monitor|display)\b/i, priority:94, domain:"DISPLAY", role:"display", direction:"destination-side", outputBehaviour:"none" },
  { id:"led-processor", test:/\b(led\s+(?:display\s+)?processor|led\s+controller|sending\s+card)\b/i, priority:93, domain:"VIDEO_WALL", role:"led processor", direction:"processing", outputBehaviour:"routed" },
  { id:"network-switch", test:/\b(managed\s+)?(?:ethernet|network)\s+switch\b|\bpoe\s+switch\b/i, priority:92, domain:"NETWORK", role:"network switch", direction:"support", outputBehaviour:"none" },
  { id:"power-accessory", test:/\b(power\s+supply|psu|poe\s+injector|pdu|power\s+distribution\s+unit)\b/i, priority:91, domain:"POWER", role:"power accessory", direction:"support", outputBehaviour:"none" },
  { id:"mounting-accessory", test:/\b(mount|bracket|rack\s+ear|rack\s+mount|vesa)\b/i, priority:90, domain:"ACCESSORY", role:"mounting accessory", direction:"support", outputBehaviour:"none" },
  { id:"cable-adapter", test:/\b(cable|patch\s+lead|adapter|adaptor)\b/i, priority:60, domain:"ACCESSORY", role:"cable adapter", direction:"support", outputBehaviour:"none" },
  { id:"basic-switcher", test:/\b(?:hdmi|video|av)\s+switcher|\bswitcher\b/i, priority:50, domain:"PRESENTATION", role:"switcher", direction:"processing", outputBehaviour:"selected" },
  { id:"fixed-camera", test:/\b(conference\s+camera|usb\s+camera|webcam|camera)\b/i, priority:40, domain:"PTZ_CAMERA", role:"camera", direction:"source-side", outputBehaviour:"decoded-local" },
] satisfies Rule[]).sort((a,b) => b.priority - a.priority);

const ARCHETYPE_BY_ID = new Map(REGISTRY.productArchetypes.map((entry) => [entry.id, entry]));

function clean(v: unknown): string { return String(v ?? "").trim(); }
function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const m = clean(v).match(/\d+/); return m ? Number(m[0]) : undefined;
}
function firstNum(...values: unknown[]): number | undefined {
  for (const v of values) { const n = num(v); if (n !== undefined) return n; }
  return undefined;
}
function flatten(value: unknown, seen = new Set<unknown>()): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value !== "object" || seen.has(value)) return "";
  seen.add(value);
  if (Array.isArray(value)) return value.map((v) => flatten(v, seen)).join(" ");
  return Object.entries(value as LooseRecord)
    .filter(([k]) => !/sourceUrl|sourceReferences|evidenceUrl/i.test(k))
    .map(([,v]) => flatten(v, seen)).join(" ");
}
function sizeFrom(text: string, sku: string): {inputs?:number; outputs?:number} {
  const m = text.replace(/[×]/g,"x").match(/(?:^|[^0-9])(\d{1,2})\s*x\s*(\d{1,2})(?:[^0-9]|$)/i);
  if (m) return {inputs:Number(m[1]), outputs:Number(m[2])};
  const compact = sku.toUpperCase().replace(/[^A-Z0-9]/g,"");
  const s = compact.match(/(?:MXV|MMX|HMX|MX|VS|C|ACMX|EXPSP|SP)(\d{2})(\d{2})/);
  return s ? {inputs:Number(s[1]), outputs:Number(s[2])} : {};
}
function connector(raw: string): string {
  const t = raw.toLowerCase();
  if (/usb\s*(?:type\s*)?[- ]?c|usb-c/.test(t)) return "USB-C";
  if (/usb\s*(?:type\s*)?[- ]?a|usb-a/.test(t)) return "USB-A";
  if (/usb\s*(?:type\s*)?[- ]?b|usb-b/.test(t)) return "USB-B";
  if (/\bhdmi\b/.test(t)) return "HDMI";
  if (/hdbaset|hdbt/.test(t)) return "HDBaseT";
  if (/displayport|\bdp\b/.test(t)) return "DisplayPort";
  if (/\bsdi\b/.test(t)) return "SDI";
  if (/rj-?45|ethernet|\blan\b/.test(t)) return "RJ45/Ethernet";
  if (/\bsfp\b|fibre|fiber/.test(t)) return "Fibre/SFP";
  if (/\bxlr\b/.test(t)) return "XLR";
  if (/phoenix|euroblock|terminal block/.test(t)) return "Phoenix/Euroblock";
  if (/3\.5mm|\brca\b/.test(t)) return "3.5mm/RCA";
  if (/toslink|optical audio/.test(t)) return "TOSLINK";
  if (/rs-?232/.test(t)) return "RS-232";
  if (/\bir\b|infrared/.test(t)) return "IR";
  if (/gpio|relay|contact closure/.test(t)) return "GPIO/Relay";
  return clean(raw);
}
function asPort(p: LooseRecord): AvSemanticPort | null {
  const raw = [p.connector,p.detail,p.evidence,p.category,p.direction].filter(Boolean).join(" ");
  const c = connector(raw); if (!c) return null;
  const d0 = clean(p.direction).toLowerCase();
  const direction: AvSemanticPort["direction"] =
    d0==="input"?"input":d0==="output"?"output":/bidirectional|in\/out|i\/o/.test(d0)?"bidirectional":"unspecified";
  const l = raw.toLowerCase();
  const signalFamily: AvSemanticPort["signalFamily"] =
    /usb/.test(l)?"usb-data":/dante|aes67/.test(l)?"network-audio":
    /ethernet|rj-?45|ndi|avoip|networkhd|sdvoe/.test(l)?"network-av":
    /audio|xlr|speaker|mic|line|toslink|spdif/.test(l)?"audio":
    /rs-?232|\bir\b|cec|gpio|relay|control/.test(l)?"control":
    /power|poe|poh|poc|dc|ac\b/.test(l)?"power":
    /hdmi|hdbaset|displayport|\bsdi\b|usb-c/.test(l)?"video":"other";
  const logicalFunction: AvSemanticPort["logicalFunction"] =
    direction==="input"?"source-input":
    /mirror|duplicate|duplicat|parallel/.test(l)?"mirrored-output":
    /\bloop\b|cascade|daisy/.test(l)?"loop-output":
    /local monitor|monitor out|preview/.test(l)?"monitor-output":
    /\bhost\b|upstream/.test(l)?"host-port":
    /\bdevice\b|client|peripheral|downstream/.test(l)?"device-port":
    /ethernet|rj-?45|ndi|avoip|networkhd|sdvoe/.test(l)?"network-stream":
    direction==="output"?"routed-output":
    /control|rs-?232|\bir\b|cec|gpio|relay/.test(l)?"control":
    /power|poe|poh|poc/.test(l)?"power":"other";
  return {connector:c,direction,signalFamily,count:Math.max(1,num(p.count)??1),logicalFunction,evidence:clean(p.evidence||p.detail||p.connector)||undefined};
}
function portsOf(r: LooseRecord): AvSemanticPort[] {
  const io = r?.technicalProfile?.io ?? {};
  const raw = ["ports","video","audio","usb","network","control"].flatMap((k) => Array.isArray(io[k]) ? io[k] : []);
  const by = new Map<string,AvSemanticPort>();
  for (const x of raw) {
    if (!x || typeof x!=="object") continue;
    const p = asPort(x); if (!p) continue;
    const key=[p.connector,p.direction,p.logicalFunction,p.evidence??""].join("|");
    const old=by.get(key); if (!old || old.count<p.count) by.set(key,p);
  }
  return [...by.values()];
}
function features(text:string): string[] {
  const defs:Array<[RegExp,string]> = [
    [/\bseamless\b/i,"seamless switching"],[/\bscal(?:e|er|ing)\b/i,"scaling"],
    [/\bmultiview|multi-view\b/i,"multiview"],[/\bvideo\s*wall|videowall\b/i,"video wall"],
    [/\bedid\b/i,"EDID"],[/\bhdcp\b/i,"HDCP"],[/\busb\b/i,"USB"],[/\bkvm\b/i,"KVM"],
    [/\bdante\b/i,"Dante"],[/\baes67\b/i,"AES67"],[/\baec\b/i,"AEC"],
    [/\bpoe\b/i,"PoE"],[/\bpoh\b/i,"PoH"],[/\bpoc\b/i,"PoC"],
    [/\bptz\b/i,"PTZ"],[/\btracking\b|auto[- ]framing/i,"tracking"],
    [/\bbyom\b/i,"BYOM"],[/\bwireless\b/i,"wireless"],[/\brs-?232\b/i,"RS-232"],
    [/\bir\b|infrared/i,"IR"],[/\bcec\b/i,"CEC"],[/\bredundan/i,"redundancy"]
  ];
  return defs.filter(([re])=>re.test(text)).map(([,n])=>n);
}

export function buildAvProductSemanticProfile(input: unknown): AvProductSemanticProfile {
  const r:LooseRecord = input && typeof input==="object" && !Array.isArray(input) ? input as LooseRecord : {rawText:String(input??"")};
  const sku=clean(r.sku??r.model??r.partNumber), manufacturer=clean(r.manufacturer??r.brand), name=clean(r.name??r.title??r.summary);
  const text=[sku,manufacturer,name,flatten(r.rawText),flatten(r.domain),flatten(r.role),flatten(r.productClass),flatten(r.category),flatten(r.family),flatten(r.productFamily),flatten(r.primarySystemFamily),flatten(r.description),flatten(r.summary),flatten(r.features),flatten(r.tags),flatten(r.technologies),flatten(r.specs),flatten(r.productTruth)].filter(Boolean).join(" ");
  const rule=RULES.find((x)=>x.test.test(text));
  const archetype=rule?ARCHETYPE_BY_ID.get(rule.id):undefined;
  const topologyModel=archetype?.topologyModel??"unknown";
  const size=sizeFrom(text,sku), ports=portsOf(r);
  const ins=[...new Set(ports.filter(p=>p.direction==="input"||p.direction==="bidirectional").map(p=>p.connector))];
  const outs=[...new Set(ports.filter(p=>p.direction==="output"||p.direction==="bidirectional").map(p=>p.connector))];
  const physicalIn=ports.filter(p=>p.direction==="input"||p.direction==="bidirectional").reduce((s,p)=>s+p.count,0)||undefined;
  const physicalOut=ports.filter(p=>p.direction==="output"||p.direction==="bidirectional").reduce((s,p)=>s+p.count,0)||undefined;
  const truth=r.productTruth??{}, specs=r.specs??{};
  const explicitIn=firstNum(r.inputCount,r.inputs,specs.inputCount,specs.hdmiInputs,truth.videoInput?.quantity);
  const explicitOut=firstNum(r.outputCount,r.outputs,specs.outputCount,specs.hdmiOutputs,truth.videoOutput?.routedQuantity);
  const mirrorPorts=ports.filter(p=>p.logicalFunction==="mirrored-output").reduce((s,p)=>s+p.count,0)||undefined;
  const loopPorts=ports.filter(p=>p.logicalFunction==="loop-output").reduce((s,p)=>s+p.count,0)||undefined;
  const monitorPorts=ports.filter(p=>p.logicalFunction==="monitor-output").reduce((s,p)=>s+p.count,0)||undefined;
  const mirroredOutputCount=firstNum(truth.videoOutput?.mirroredHdmiQuantity,r.mirroredOutputCount,mirrorPorts,rule?.outputBehaviour==="mirrored"?size.outputs:undefined);
  const routedOutputCount=firstNum(truth.videoOutput?.routedQuantity,r.routedOutputCount,rule?.outputBehaviour==="routed"?size.outputs:undefined,rule?.outputBehaviour==="routed"?explicitOut:undefined);
  const loopOutputCount=firstNum(truth.videoOutput?.loopQuantity,r.loopOutputCount,loopPorts);
  const localMonitorOutputCount=firstNum(truth.videoOutput?.localMonitorQuantity,r.localMonitorOutputCount,monitorPorts);
  const logicalInputCount=firstNum(explicitIn,size.inputs,physicalIn);
  const logicalOutputCount =
    rule?.outputBehaviour==="mirrored" ? firstNum(mirroredOutputCount,size.outputs,explicitOut,physicalOut) :
    rule?.outputBehaviour==="routed" ? firstNum(routedOutputCount,size.outputs,explicitOut) :
    rule?.outputBehaviour==="composited" ? firstNum(r.compositedOutputCount,explicitOut,1) :
    firstNum(explicitOut,size.outputs,physicalOut);
  const unknowns:string[]=[];
  if (!rule) unknowns.push("Product purpose/archetype unresolved.");
  if (!logicalInputCount && !["endpoint-destination","support-only"].includes(topologyModel)) unknowns.push("Logical input quantity unresolved.");
  if (!logicalOutputCount && !["endpoint-source","support-only"].includes(topologyModel)) unknowns.push("Logical output quantity unresolved.");
  if (!ins.length && !outs.length) unknowns.push("Connector directions unresolved.");
  return {
    manufacturer:manufacturer||undefined, sku:sku||undefined, name:name||undefined,
    archetypeId:rule?.id??"unknown", archetypeName:archetype?.name??"Unknown AV product",
    productFamily:clean(r.family??r.productFamily??r.primarySystemFamily)||undefined,
    practicalPurpose:archetype?.purpose??"Purpose requires classification.",
    topologyModel, canonicalRole: rule?.role ?? (clean(r.role) || "unknown"), direction: rule?.direction ?? "unknown",
    compareDomain:rule?.domain, logicalInputCount, logicalOutputCount,
    physicalInputConnectorCount:physicalIn, physicalOutputConnectorCount:physicalOut,
    routedOutputCount, mirroredOutputCount, loopOutputCount, localMonitorOutputCount,
    compositedOutputCount:rule?.outputBehaviour==="composited"?logicalOutputCount:undefined,
    networkStreamInputCount:topologyModel==="network-routed"&&rule?.direction==="destination-side"?1:undefined,
    networkStreamOutputCount:topologyModel==="network-routed"&&rule?.direction==="source-side"?1:undefined,
    inputConnectors:ins, outputConnectors:outs, primaryOutputBehaviour:rule?.outputBehaviour??"unknown",
    ports, specialistFeatures:features(text), dependencies:archetype?.typicalDependencies??[],
    confidence:rule?(ports.length||size.inputs||size.outputs?"high":"medium"):"requires-review",
    evidence:[rule?`Archetype recognised as ${rule.id}.`:"",size.inputs||size.outputs?`Topology size ${size.inputs??"?"}x${size.outputs??"?"}.`:"",ports.length?`${ports.length} structured ports interpreted.`:""].filter(Boolean),
    unknowns
  };
}

export function semanticCompareBackfill(profile: AvProductSemanticProfile): {
  domain?:string; role?:string; inputCount?:number; outputCount?:number;
} {
  return {
    domain:profile.compareDomain,
    role:profile.canonicalRole!=="unknown"?profile.canonicalRole:undefined,
    inputCount:profile.logicalInputCount,
    outputCount:profile.logicalOutputCount,
  };
}
