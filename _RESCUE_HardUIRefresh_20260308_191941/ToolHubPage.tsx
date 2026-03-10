import React from "react";
import { useNavigate } from "react-router-dom";
import { WINGMAN_FEATURES, WINGMAN_TOOLS } from "./toolFeatureModel";

export default function ToolHubPage(){
  const navigate = useNavigate();

  return (
    <div style={{
      display:"grid",
      gap:18,
      padding:"6px 8px",
      maxWidth:1400,
      margin:"0 auto"
    }}>

      {/* HERO (reduced height) */}
      <section style={{
        borderRadius:16,
        padding:"16px 18px",
        border:"1px solid rgba(101,232,255,0.14)",
        background:"linear-gradient(135deg, rgba(12,24,38,0.98), rgba(8,12,20,0.96))"
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:"#f6fbff"}}>
              Tools help you decide. Features help you build.
            </div>
            <div style={{fontSize:13,opacity:.8,maxWidth:720}}>
              Tools are utilities available at any time. Features create designs, BOMs and proposals.
            </div>
          </div>

          <button
            onClick={()=>navigate("/app/projects/new")}
            style={{
              border:"1px solid rgba(101,232,255,0.35)",
              background:"linear-gradient(90deg,#1aa58f,#1b8d78)",
              color:"#fff",
              borderRadius:10,
              padding:"10px 18px",
              fontWeight:700,
              cursor:"pointer"
            }}
          >
            Start New Project
          </button>
        </div>
      </section>

      {/* TOOLS */}
      <section>
        <div style={{fontWeight:800,fontSize:16,marginBottom:8}}>Tools</div>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",
          gap:14
        }}>
          {WINGMAN_TOOLS.map(tool=>(
            <div key={tool.id} style={{
              border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:14,
              padding:14,
              background:"rgba(10,20,30,.6)"
            }}>
              <div style={{fontWeight:700,fontSize:15}}>
                {tool.title}
              </div>

              <div style={{fontSize:13,opacity:.8,margin:"4px 0 10px"}}>
                {tool.description}
              </div>

              <button
                onClick={()=>navigate(tool.to)}
                style={{
                  border:"1px solid rgba(255,255,255,0.12)",
                  background:"rgba(255,255,255,.05)",
                  borderRadius:8,
                  padding:"6px 10px",
                  fontSize:12,
                  cursor:"pointer"
                }}
              >
                Open {tool.title}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section>
        <div style={{fontWeight:800,fontSize:16,marginBottom:8}}>Features</div>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",
          gap:14
        }}>
          {WINGMAN_FEATURES.map(feature=>(
            <div key={feature.id} style={{
              border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:14,
              padding:14,
              background:"rgba(10,20,30,.6)"
            }}>
              <div style={{fontWeight:700,fontSize:15}}>
                {feature.title}
              </div>

              <div style={{fontSize:13,opacity:.8,margin:"4px 0 10px"}}>
                {feature.description}
              </div>

              <button
                onClick={()=>navigate(feature.to)}
                style={{
                  border:"1px solid rgba(255,255,255,0.12)",
                  background:"rgba(255,255,255,.05)",
                  borderRadius:8,
                  padding:"6px 10px",
                  fontSize:12,
                  cursor:"pointer"
                }}
              >
                Open {feature.title}
              </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}