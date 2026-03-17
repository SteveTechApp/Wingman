export type CapacityInput = {
  sources:number
  displays:number
  resolution?:string
  codec?:string
}

export type CapacityResult = {
  perStreamMbps:number
  totalStreamMbps:number
  recommendedSwitchBackplane:string
  uplinkRecommendation:string
  poeEstimateWatts:number
}

function streamBandwidth(resolution?:string, codec?:string):number{

  const r=(resolution||"").toLowerCase()
  const c=(codec||"").toLowerCase()

  if(c.includes("h264")) return 25
  if(c.includes("h265")) return 20
  if(c.includes("jpeg")) return 600
  if(c.includes("uncompressed")) return 12000

  if(r.includes("4k")) return 600
  if(r.includes("1080")) return 200

  return 300
}

export function calculateNetworkCapacity(input:CapacityInput):CapacityResult{

  const streams = input.sources * input.displays

  const perStreamMbps = streamBandwidth(input.resolution,input.codec)

  const totalStreamMbps = perStreamMbps * streams

  let recommendedSwitchBackplane = "1Gb Managed Switch"

  if(totalStreamMbps > 8000) recommendedSwitchBackplane = "10Gb AV Core Switch"

  let uplinkRecommendation = "1Gb uplink acceptable"

  if(totalStreamMbps > 2000) uplinkRecommendation = "10Gb uplink recommended"

  const poeEstimateWatts = (input.sources + input.displays) * 12

  return {
    perStreamMbps,
    totalStreamMbps,
    recommendedSwitchBackplane,
    uplinkRecommendation,
    poeEstimateWatts
  }
}