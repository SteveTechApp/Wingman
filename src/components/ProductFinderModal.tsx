import React from "react";
export default function ProductFinderModal({open}:{open:boolean}){
  if(!open) return null;
  return <div className="wm-card wm-card-pad">Product finder</div>;
}