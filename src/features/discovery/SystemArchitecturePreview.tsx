import * as React from "react"
import {buildTopology} from "@/services/topologyEngine"
import {buildSignalPath} from "@/services/signalPathEngine"
import {calculateNetworkCapacity} from "@/services/networkCapacityEngine"

type Props={
  sources:number
  displays:number
  resolution?:string
}

export default function SystemArchitecturePreview(props:Props){

  const topology=buildTopology(props)

  const capacity = calculateNetworkCapacity({
    sources:props.sources,
    displays:props.displays,
    resolution:props.resolution
  })

  const signal=buildSignalPath({
    sources:props.sources,
    displays:props.displays,
    transport:topology.transport
  })

  return(
    <div className="wm-architecture-preview">

      <h3>System Architecture Preview</h3>

      <div>Transport: {topology.transport}</div>
      <div>Encoders: {topology.encoders}</div>
      <div>Decoders: {topology.decoders}</div>
      <div>Bandwidth: {topology.bandwidthEstimate}</div>
      <div>Switch: {topology.switchRecommendation}</div>

      <div style={{marginTop:10}}>
        Recommended WyreStorm: {topology.wyrestormProducts.join(", ")}
      </div>

      <h4 style={{marginTop:20}}>Signal Path</h4>

      {signal.links.map((l,i)=>(
        <div key={i}>{l.from} �?????T {l.to}</div>
      ))}

    <h4 style={{marginTop:20}}>Network Capacity</h4>

<div>Per Stream: {capacity.perStreamMbps} Mbps</div>
<div>Total Traffic: {capacity.totalStreamMbps} Mbps</div>
<div>Switch Class: {capacity.recommendedSwitchBackplane}</div>
<div>Uplink: {capacity.uplinkRecommendation}</div>
<div>Estimated PoE: {capacity.poeEstimateWatts} W</div>

</div>
  )
}