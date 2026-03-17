Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

Write-Host "Wingman Topology Upgrade Starting"

############################################################
# Ensure folders exist
############################################################

$services = "src\services"
$discovery = "src\features\discovery"

if (!(Test-Path $services)) { New-Item -ItemType Directory $services | Out-Null }
if (!(Test-Path $discovery)) { New-Item -ItemType Directory $discovery | Out-Null }

############################################################
# 1. TOPOLOGY ENGINE
############################################################

$topologyPath = "src\services\topologyEngine.ts"

$topologyCode = @'
export type TopologyInput = {
  sources: number
  displays: number
  resolution?: string
}

export type TopologyResult = {
  transport: string
  encoders: number
  decoders: number
  bandwidthEstimate: string
  switchRecommendation: string
  architecture: string
  wyrestormProducts: string[]
}

function estimateBandwidth(resolution?: string): string {

  const r = (resolution || "").toLowerCase()

  if (r.includes("8k")) return "~80Gbps raw video"
  if (r.includes("4k")) return "~18Gbps raw video"
  if (r.includes("1080")) return "~6Gbps raw video"

  return "Unknown"
}

function detectTransport(sources:number, displays:number): string {

  if (displays > 4) return "AVoIP"
  if (sources > 4) return "AVoIP"

  return "HDBaseT Matrix"
}

function recommendSwitch(encoders:number, decoders:number): string {

  const endpoints = encoders + decoders

  if (endpoints <= 8) return "1Gb Managed Switch"
  if (endpoints <= 24) return "24-port Managed Switch"

  return "10Gb Core Switch"
}

function recommendWyreStormProducts(transport:string): string[] {

  if (transport === "AVoIP") {
    return [
      "NHD-500-TX",
      "NHD-500-RX",
      "NHD-CTL-PRO"
    ]
  }

  return [
    "WyreStorm HDBaseT Matrix",
    "HDBaseT Receivers"
  ]
}

export function buildTopology(input:TopologyInput):TopologyResult {

  const sources = input.sources || 0
  const displays = input.displays || 0

  const transport = detectTransport(sources, displays)

  const encoders = sources
  const decoders = displays

  const bandwidthEstimate = estimateBandwidth(input.resolution)

  const switchRecommendation = recommendSwitch(encoders, decoders)

  const wyrestormProducts = recommendWyreStormProducts(transport)

  const architecture =
    transport === "AVoIP"
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
'@

[System.IO.File]::WriteAllText($topologyPath,$topologyCode)

Write-Host "Topology Engine created"

############################################################
# 2. SIGNAL PATH GENERATOR (NEXT HIGH VALUE UPGRADE)
############################################################

$signalPath = "src\services\signalPathEngine.ts"

$signalCode = @'
export type SignalPathInput = {
  sources:number
  displays:number
  transport:string
}

export type SignalLink = {
  from:string
  to:string
}

export type SignalPathResult = {
  links:SignalLink[]
}

export function buildSignalPath(input:SignalPathInput):SignalPathResult {

  const links:SignalLink[] = []

  for (let s = 1; s <= input.sources; s++) {

    const encoder = "Encoder " + s

    links.push({
      from:"Source " + s,
      to:encoder
    })

    if (input.transport === "AVoIP") {

      links.push({
        from:encoder,
        to:"Network Switch"
      })

    }

    for (let d = 1; d <= input.displays; d++) {

      const decoder = "Decoder " + d

      if (input.transport === "AVoIP") {

        links.push({
          from:"Network Switch",
          to:decoder
        })

      }

      links.push({
        from:decoder,
        to:"Display " + d
      })
    }
  }

  return { links }
}
'@

[System.IO.File]::WriteAllText($signalPath,$signalCode)

Write-Host "Signal Path Engine created"

############################################################
# 3. ARCHITECTURE PREVIEW COMPONENT
############################################################

$previewPath = "src\features\discovery\SystemArchitecturePreview.tsx"

$previewCode = @'
import * as React from "react"
import { buildTopology } from "@/services/topologyEngine"
import { buildSignalPath } from "@/services/signalPathEngine"

type Props = {
  sources:number
  displays:number
  resolution?:string
}

export default function SystemArchitecturePreview(props:Props){

  const topology = buildTopology(props)

  const signal = buildSignalPath({
    sources:props.sources,
    displays:props.displays,
    transport:topology.transport
  })

  return (
    <div className="wm-architecture-preview">

      <h3>System Architecture Preview</h3>

      <div>Transport: {topology.transport}</div>
      <div>Encoders: {topology.encoders}</div>
      <div>Decoders: {topology.decoders}</div>
      <div>Bandwidth: {topology.bandwidthEstimate}</div>
      <div>Switch: {topology.switchRecommendation}</div>

      <div style={{marginTop:10}}>
        Recommended WyreStorm:
        {topology.wyrestormProducts.join(", ")}
      </div>

      <h4 style={{marginTop:20}}>Signal Path</h4>

      {signal.links.map((l,i)=>(
        <div key={i}>
          {l.from} → {l.to}
        </div>
      ))}

    </div>
  )
}
'@

[System.IO.File]::WriteAllText($previewPath,$previewCode)

Write-Host "Architecture Preview created"

############################################################
# 4. PATCH DISCOVERY WIZARD
############################################################

$wizardPath = "src\features\discovery\DiscoveryWizardPage.tsx"

if (Test-Path $wizardPath){

$t = Get-Content $wizardPath -Raw

if ($t -notmatch "SystemArchitecturePreview"){

$t = $t -replace 'import \* as React from "react";',
'import * as React from "react";
import SystemArchitecturePreview from "@/features/discovery/SystemArchitecturePreview";'

}

if ($t -notmatch "<SystemArchitecturePreview"){

$t = $t -replace "</form>",
"<SystemArchitecturePreview sources={sources} displays={displays} resolution={resolution} />
</form>"

}

[System.IO.File]::WriteAllText($wizardPath,$t)

Write-Host "Discovery Wizard patched"

}

############################################################

Write-Host ""
Write-Host "Topology Upgrade Complete"
Write-Host ""
