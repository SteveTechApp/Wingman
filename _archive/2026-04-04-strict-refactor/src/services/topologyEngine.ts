import { recommendSkusForTransport } from "@/catalog/serviceRecommendations";

export type TopologyInput = {
  sources:number
  displays:number
  resolution?:string
}

export type TopologyResult = {
  transport:string
  encoders:number
  decoders:number
  bandwidthEstimate:string
  switchRecommendation:string
  architecture:string
  wyrestormProducts:string[]
}

function estimateBandwidth(resolution?:string):string{

  const r=(resolution||"").toLowerCase()

  if(r.includes("8k")) return "~80Gbps raw video"
  if(r.includes("4k")) return "~18Gbps raw video"
  if(r.includes("1080")) return "~6Gbps raw video"

  return "Unknown"
}

function detectTransport(sources:number,displays:number):string{

  if(displays>4) return "AVoIP"
  if(sources>4) return "AVoIP"

  return "HDBaseT Matrix"
}

function recommendSwitch(encoders:number,decoders:number):string{

  const endpoints=encoders+decoders

  if(endpoints<=8) return "1Gb Managed Switch"
  if(endpoints<=24) return "24-port Managed Switch"

  return "10Gb Core Switch"
}

function recommendWyreStormProducts(transport:string):string[]{
  return recommendSkusForTransport(transport, 4)
}

export function buildTopology(input:TopologyInput):TopologyResult{

  const sources=input.sources||0
  const displays=input.displays||0

  const transport=detectTransport(sources,displays)

  const encoders=sources
  const decoders=displays

  const bandwidthEstimate=estimateBandwidth(input.resolution)

  const switchRecommendation=recommendSwitch(encoders,decoders)

  const wyrestormProducts=recommendWyreStormProducts(transport)

  const architecture =
    transport==="AVoIP"
      ? "NetworkHD AV-over-IP architecture"
      : "HDBaseT matrix distribution"

  return {
    transport,
    encoders,
    decoders,
    bandwidthEstimate,
    switchRecommendation,
    architecture,
    wyrestormProducts
  }
}
