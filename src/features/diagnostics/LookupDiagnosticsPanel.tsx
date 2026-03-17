import * as React from "react"

const ENDPOINT = String(import.meta.env.VITE_COMPETITOR_LOOKUP_ENDPOINT ?? "").trim()

function diagnosticsEndpoint() {
  if (!ENDPOINT) return ""
  try {
    const parsed = new URL(ENDPOINT)
    const clean = parsed.pathname.replace(/\/$/, "")
    if (clean.endsWith("/api/competitor-lookup")) {
      parsed.pathname = clean.replace("/api/competitor-lookup","/api/competitor-lookup/diagnostics")
    } else {
      parsed.pathname = clean + "/diagnostics"
    }
    return parsed.toString()
  } catch {
    return ""
  }
}

export default function LookupDiagnosticsPanel() {

  const [events,setEvents] = React.useState<any[]>([])
  const [warnings,setWarnings] = React.useState<string[]>([])
  const [endpoint,setEndpoint] = React.useState("")

  async function load() {

    const url = diagnosticsEndpoint()
    setEndpoint(url)

    if (!url) return

    const res = await fetch(url)
    const json = await res.json()

    setEvents(json.events ?? [])
    setWarnings(json.warnings ?? [])
  }

  React.useEffect(()=>{ load() },[])

  return (
    <div style={{padding:20}}>

      <h2>Lookup Diagnostics</h2>

      <div style={{fontSize:12,opacity:0.7}}>
        endpoint: {endpoint || "not configured"}
      </div>

      {warnings.length>0 && (
        <div style={{marginTop:10,color:"orange"}}>
          {warnings.map((w,i)=>(<div key={i}>{w}</div>))}
        </div>
      )}

      <div style={{marginTop:20}}>

        {events.map((e,i)=>(
          <div key={i} style={{
            border:"1px solid #333",
            padding:10,
            marginBottom:8,
            borderRadius:6
          }}>

            <div style={{fontWeight:600}}>
              {e.brand} {e.sku}
            </div>

            <div style={{fontSize:12}}>
              {e.message}
            </div>

            <div style={{fontSize:11,opacity:0.6}}>
              {e.timestamp}
            </div>

          </div>
        ))}

      </div>

    </div>
  )
}