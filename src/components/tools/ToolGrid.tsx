import * as React from "react";

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