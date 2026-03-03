import React from "react";

export default function AppFooter(){
  return (
    <footer className="wm-footer">
      <div className="wm-container" style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
        <div>© {new Date().getFullYear()} WyreStorm</div>
        <div>Wingman Pre-Sales Toolkit</div>
      </div>
    </footer>
  );
}