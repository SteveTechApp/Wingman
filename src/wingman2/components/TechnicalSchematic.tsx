import { useId, useRef } from "react";
import { DiagramViewport } from "./DiagramViewport";
import type { SchematicModel } from "../lib/schematic/schematicTypes";
import { technicalConnectionRoute, technicalDevicePorts, technicalDevicePosition, DRAWING_NODE_WIDTH, technicalDeviceLabelLines, technicalDevicePortOffset } from "../lib/schematic/technicalDrawingLayout";
import { downloadBlob } from "../lib/downloadBlob";


export function TechnicalSchematic({ model, onSaveAsset, onExportConceptVisio }: { model: SchematicModel; onSaveAsset?: (render: { svg: string; width: number; height: number }) => void; onExportConceptVisio?: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const arrowId = useId().replace(/:/g,"");
  const devices = model.nodes.filter(node => !node.metadata?.unresolvedScope);
  const scope = model.nodes.filter(node => node.metadata?.unresolvedScope);
  const notes = [...new Set([...model.assumptions, ...model.warnings.map(w => `${w.title}: ${w.message}`)])];
  const width = Math.max(1550,...devices.map(node => technicalDevicePosition(model,node).x + DRAWING_NODE_WIDTH + 50));
  const graphBottom = Math.max(360,...devices.map(node => {const position=technicalDevicePosition(model,node);return position.y+position.height+40;}));
  const scheduleY = graphBottom + 45;
  const scopeY = scheduleY + 64 + model.connections.length * 30;
  const notesY = scopeY + 55 + scope.length * 30;
  const height = notesY + notes.length * 44 + 125;
  const filename = model.id.replace(/[^a-z0-9-]/gi,"-");
  const svgBlob = () => new Blob([new XMLSerializer().serializeToString(svgRef.current!)], {type:"image/svg+xml"});
  const saveAsset = () => {
    const reader = new FileReader();
    reader.onload = () => onSaveAsset?.({ svg: String(reader.result), width, height });
    reader.readAsDataURL(svgBlob());
  };
  const exportPng = async () => {
    const url = URL.createObjectURL(svgBlob()); const image = new Image();
    try { image.src=url; await image.decode(); const canvas=document.createElement("canvas");canvas.width=width*2;canvas.height=height*2;const ctx=canvas.getContext("2d")!;ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{if(blob)downloadBlob(blob,`${filename}.png`);},"image/png"); }
    finally { URL.revokeObjectURL(url); }
  };
  const printDrawing = () => {
    const popup=window.open("","_blank");if(!popup)return;
    popup.document.write('<!doctype html><title>AV schematic</title><style>@page{size:A3 landscape;margin:10mm}body{margin:0}svg{width:100%;height:auto}</style>');
    popup.document.body.appendChild(svgRef.current!.cloneNode(true));popup.document.close();popup.focus();popup.print();
  };
  return <div className="wm-technical-schematic">
    <DiagramViewport title="Technical AV schematic" width={width} height={height} light actions={<div className="wm-technical-actions"><p>Design development · interface and installation checks remain open</p><button type="button" onClick={()=>downloadBlob(svgBlob(),`${filename}.svg`)}>Export SVG</button><button type="button" onClick={exportPng}>Export PNG</button><button type="button" onClick={printDrawing}>Print drawing</button>{onSaveAsset && <button type="button" onClick={saveAsset}>Save to project</button>}{onExportConceptVisio && <button type="button" onClick={onExportConceptVisio} title="Exports the equipment concept as editable Visio shapes; use SVG for this port-level technical drawing.">Export equipment concept (Visio)</button>}</div>}>

      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={`Technical AV schematic for ${model.title}`} style={{fontFamily:"Arial, sans-serif",background:"white",color:"#152b3c"}}>
        <rect width={width} height={height} fill="white"/>
        <defs><marker id={arrowId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#152b3c"/></marker></defs>
        <rect x="20" y="20" width={width-40} height={height-40} fill="none" stroke="#152b3c" strokeWidth="1.5"/>
        <text x="40" y="49" fontSize="13" fontWeight="700" fill="#152b3c">WYRESTORM WINGMAN · AV SYSTEM DESIGN</text><text x="40" y="77" fontSize="22" fontWeight="700" fill="#152b3c">{model.title}</text>
        <text x={width-40} y="48" textAnchor="end" fontSize="12" fill="#152b3c">AV-201 · Rev A · Design development</text>
        <text x={width-40} y="70" textAnchor="end" fontSize="12" fill="#152b3c">NOT FOR INSTALLATION · NTS</text>
        {[...new Set(devices.map(n=>n.column))].map(column=>{const group=devices.filter(n=>n.column===column);return <g key={column}><rect x={35+column*390} y="100" width="280" height={graphBottom-100} fill="none" stroke="#889ba9" strokeDasharray="8 5"/><text x={45+column*390} y="123" fontSize="13" fontWeight="700" fill="#334c60">{String(group[0]?.metadata?.location ?? (column===0 ? "SOURCE POSITIONS · confirm" : column===3 ? "DISPLAY POSITION · confirm" : "EQUIPMENT POSITION · confirm"))}</text></g>})}
        {model.connections.map((connection,index)=>{const points=technicalConnectionRoute(model,connection,index);return <g key={connection.id}><polyline points={points.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="#152b3c" strokeWidth="1.6" strokeDasharray={connection.evidence!=="manufacturer" ? "5 4" : undefined} markerEnd={connection.bidirectional ? undefined : `url(#${arrowId})`}/><rect x={points[0].x+6} y={points[0].y-21} width="47" height="17" fill="white"/><text x={points[0].x+9} y={points[0].y-8} fontSize="11" fill="#152b3c">{connection.cableId ?? `C-${String(index+1).padStart(3,"0")}`}</text></g>})}
        {devices.map((node,index)=>{const position=technicalDevicePosition(model,node);const ports=technicalDevicePorts(model,node);const portOffset=technicalDevicePortOffset(node);return <g key={node.id}><title>{node.label}: {node.proposalSafeNote}</title><rect x={position.x} y={position.y} width={DRAWING_NODE_WIDTH} height={position.height} fill="white" stroke="#152b3c" strokeWidth="1.5"/><text x={position.x+10} y={position.y+19} fontSize="11" fill="#334c60">{`DEV-${String(index+1).padStart(2,"0")}`}</text><text x={position.x+10} y={position.y+40} fontSize="15" fontWeight="700" fill="#152b3c">{technicalDeviceLabelLines(node.sku ?? node.label.replace(/ by others$/i,"")).map((line,i)=><tspan key={i} x={position.x+10} dy={i ? 16 : 0}>{line}</tspan>)}</text><text x={position.x+10} y={position.y+portOffset-21} fontSize="11" fill="#334c60">{String(node.metadata?.deviceRole ?? (node.sku ? "Equipment · verify interfaces" : "By others · model to confirm"))}</text>{ports.inputs.map((port,i)=><g key={port}><circle cx={position.x} cy={position.y+portOffset+i*30} r="3" fill="white" stroke="#152b3c"/><text x={position.x+8} y={position.y+portOffset+4+i*30} fontSize="11" fill="#152b3c">{port}</text></g>)}{ports.outputs.map((port,i)=><g key={port}><circle cx={position.x+DRAWING_NODE_WIDTH} cy={position.y+portOffset+i*30} r="3" fill="white" stroke="#152b3c"/><text x={position.x+DRAWING_NODE_WIDTH-8} y={position.y+portOffset+4+i*30} textAnchor="end" fontSize="11" fill="#152b3c">{port}</text></g>)}</g>})}
        <text x="40" y={scheduleY} fontSize="14" fontWeight="700" fill="#152b3c">CABLE / CONNECTION SCHEDULE</text>
        <text x="40" y={scheduleY+23} fontSize="11" fill="#334c60">Solid: manufacturer interface basis, proposed allocation. Dashed: unverified route. Cable lengths and termination details require site confirmation.</text>
        {model.connections.map((c,index)=><g key={c.id}><line x1="40" x2={width-40} y1={scheduleY+37+index*30} y2={scheduleY+37+index*30} stroke="#c5d0d8"/><text x="40" y={scheduleY+57+index*30} fontSize="12" fill="#152b3c">{c.cableId ?? `C-${String(index+1).padStart(3,"0")}`} · {c.label}</text><text x="570" y={scheduleY+57+index*30} fontSize="11" fill="#152b3c">{model.nodes.find(n=>n.id===c.from)?.sku ?? model.nodes.find(n=>n.id===c.from)?.label} [{c.fromPort ?? "PORT TBD"}] → {model.nodes.find(n=>n.id===c.to)?.sku ?? model.nodes.find(n=>n.id===c.to)?.label} [{c.toPort ?? "PORT TBD"}]</text></g>)}
        <text x="40" y={scopeY+10} fontSize="14" fontWeight="700" fill="#152b3c">UNRESOLVED EQUIPMENT / DELIVERY SCOPE · NO CONNECTIONS ISSUED</text>
        {scope.map((node,index)=><text key={node.id} x="40" y={scopeY+36+index*30} fontSize="12" fill="#152b3c">{String(node.metadata?.quantity ?? 1)} × {node.label}{node.sku ? ` · ${node.sku}` : " · supplier/model to confirm"}</text>)}
        <text x="40" y={notesY} fontSize="14" fontWeight="700" fill="#152b3c">DESIGN NOTES / OPEN ITEMS</text>
        {notes.map((note,index)=><text key={index} x="40" y={notesY+23+index*44} fontSize="12" fill="#152b3c">{[note.slice(0,180),note.slice(180)].filter(Boolean).map((line,i)=><tspan key={i} x="40" dy={i ? 17 : 0}>{line}</tspan>)}</text>)}
        <line x1="20" x2={width-20} y1={height-70} y2={height-70} stroke="#152b3c"/><text x="40" y={height-47} fontSize="12" fill="#152b3c">PREPARED BY: WyreStorm Wingman     CLIENT / PROJECT: to confirm     DRAWING: AV-201     ISSUE: Rev A</text><text x="40" y={height-30} fontSize="11" fill="#334c60">A complete installation drawing requires approved third-party models, port allocations, cable lengths, power and control design.</text>
      </svg>
    </DiagramViewport>
  </div>;
}
