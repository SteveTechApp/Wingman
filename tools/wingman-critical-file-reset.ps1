$ErrorActionPreference="Stop"
Set-Location C:\Users\steve\wingman

Write-Host "=== Wingman Critical File Reset ===" -ForegroundColor Cyan

function WriteUtf8NoBom($path,$txt){
  $dir=Split-Path $path -Parent
  if(!(Test-Path $dir)){New-Item -ItemType Directory -Path $dir|Out-Null}
  [System.IO.File]::WriteAllText($path,$txt,(New-Object System.Text.UTF8Encoding($false)))
}

# ---------- SAFE BASELINE FILES ----------

WriteUtf8NoBom "src/app/navigation/SideNav.tsx" @"
export default function navClass(isActive:boolean){
  return "wm-snav-item" + (isActive ? " wm-snav-item-active" : "");
}
"@

WriteUtf8NoBom "src/components/brand/LogoLockup.tsx" @"
export default function LogoLockup({className=""}:{className?:string}){
  return <div className={className}>Wingman</div>;
}
"@

WriteUtf8NoBom "src/components/branding/WingmanBrand.tsx" @"
export default function WingmanBrand({className=""}:{className?:string}){
  return <span className={className}>Wingman</span>;
}
"@

WriteUtf8NoBom "src/components/ui/ToggleSwitch.tsx" @"
export default function ToggleSwitch({className=""}:{className?:string}){
  return <button className={className}>Toggle</button>;
}
"@

WriteUtf8NoBom "src/pages/SignupPage.tsx" @"
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SignupPage(){
  const nav=useNavigate();
  const [email,setEmail]=useState("");
  const [name,setName]=useState("");
  const [company,setCompany]=useState("");

  const onSubmit=(e:any)=>{
    e.preventDefault();
    localStorage.setItem("wingman_user_email",email||"");
    localStorage.setItem("wingman_user_company",company||"");
    nav("/app/dashboard",{replace:true});
  };

  return (
    <form onSubmit={onSubmit}>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/>
      <button type="submit">Continue</button>
    </form>
  );
}
"@

WriteUtf8NoBom "src/app/import/textExtractors.ts" @"
export type ExtractResult={text:string,meta?:any};

export function extractPlainText(input:unknown):ExtractResult{
  if(input==null) return {text:""};
  if(typeof input==="string") return {text:input};
  return {text:"",meta:{note:"Unsupported"}};
}

export default {extractPlainText};
"@

WriteUtf8NoBom "src/services/prompts/designRoom/productConsolidation.ts" @"
export default [
  "Task:",
  "Consolidate AV products.",
  "Rules:",
  "Return JSON only."
];
"@

Write-Host "Core corrupted files reset." -ForegroundColor Green
Write-Host "Now run: npm run typecheck" -ForegroundColor Yellow