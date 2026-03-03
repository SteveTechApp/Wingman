Set-Location C:\Users\steve\wingman
$ErrorActionPreference="Stop"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"

function ForceWrite($path,$text){
    if(Test-Path $path){
        Copy-Item $path "$path.bak_FORCE_$stamp" -Force
        Remove-Item $path -Force
    }
    $dir = Split-Path $path -Parent
    if(!(Test-Path $dir)){ New-Item -ItemType Directory -Path $dir | Out-Null }
    [System.IO.File]::WriteAllText($path,$text,[System.Text.UTF8Encoding]::new($false))
}

Write-Host "FORCE RESET OF CORRUPTED FILES"

# ToolGrid wrapper
ForceWrite "src/components/app/tools/ToolGrid.tsx" @"
export { default } from "@/components/tools/ToolGrid";
export * from "@/components/tools/ToolGrid";
"@

# Core ToolGrid
ForceWrite "src/components/tools/ToolGrid.tsx" @"
import React from "react";
import { Link } from "react-router-dom";

export default function ToolGrid({items=[]}:{items:any[]}) {
  return (
    <div style={{display:"grid",gap:12}}>
      {items.map((t,i)=>(
        <Link key={i} to={t.path||"/"} style={{textDecoration:"none"}}>
          <div className="wm-card wm-card-pad">
            <h3>{t.label}</h3>
            <p>{t.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
"@

# Competitor finder
ForceWrite "src/components/competitor/CompetitorMatchFinderPanel.tsx" @"
import React from "react";
export default function CompetitorMatchFinderPanel(){
  return <div className="wm-card wm-card-pad">Competitor finder placeholder</div>;
}
"@

# Product finder modal
ForceWrite "src/components/ProductFinderModal.tsx" @"
import React from "react";
export default function ProductFinderModal({open}:{open:boolean}){
  if(!open) return null;
  return <div className="wm-card wm-card-pad">Product finder</div>;
}
"@

# Value engineering
ForceWrite "src/components/workspace/configurator/ValueEngineeringPanel.tsx" @"
import React from "react";
export default function ValueEngineeringPanel(){
  return <div className="wm-card wm-card-pad">Value engineering panel</div>;
}
"@

# Guru FAB
ForceWrite "src/guru/GuruFab.tsx" @"
import React from "react";
export default function GuruFab(){
  return <button className="wm-fab">Guru</button>;
}
"@

# Text extractors
ForceWrite "src/import/textExtractors.ts" @"
export async function extractTextFromFile(file:File){
  return { text:"", meta:["Extractor reset"] };
}
"@

# Workspace home
ForceWrite "src/pages/WorkspaceHomePage.tsx" @"
import React from "react";
export default function WorkspaceHomePage(){
  return <div className="wm-page">Workspace Home</div>;
}
"@

# Competitor compare service
ForceWrite "src/services/app/tools/competitor-compareComparisonService.ts" @"
export function compareCompetitor(){
  return { matches:[] };
}
"@

Write-Host "RESET COMPLETE. RUN TYPECHECK."