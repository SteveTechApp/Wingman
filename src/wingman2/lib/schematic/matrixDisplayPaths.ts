import type { SchematicConnection, SchematicNode, SchematicWarning } from "./schematicTypes";
// Interface basis: wyrestorm.com/product/mx-0808-kit-v2/, mx-0404-kit/, ex-70-h2/.
export function expandMatrixDisplayPaths(nodes: SchematicNode[], connections: Omit<SchematicConnection,"points">[], warnings: SchematicWarning[]) {
  const core=nodes.find(n=>n.sku==="MX-0808-KIT-V2" || n.sku==="MX-0404-KIT" || n.sku==="MX-0404-HDMI" || n.sku==="MX-1007-HYB");
  if(!core)return;
  const hybrid = core.sku === "MX-1007-HYB";
  const capacity=core.sku==="MX-0808-KIT-V2" ? 8 : hybrid ? 6 : 4;
  const inputCapacity=hybrid ? 7 : capacity;
  let input=0;
  for(const connection of [...connections]) if(connection.to===core.id && connection.signal==="video") {
    if(++input>inputCapacity){connections.splice(connections.indexOf(connection),1);warnings.push({severity:"blocker",title:"Matrix input capacity exceeded",message:"Specify another matrix or a confirmed upstream switching path."});continue;}
    connection.transport="hdmi"; connection.fromPort="SOURCE OUTPUT (confirm)"; connection.toPort=`HDMI IN ${input}`;
  }
  const hybridReceivers=nodes.filter(n=>n.sku==="RX3-100");
  const inputExtenders=nodes.filter(n=>n.sku==="EX-70-H2" && /remote source|source-to-rack/i.test(n.label + " " + String(n.metadata?.equipmentRole ?? "")));
  const extenderNodes=nodes.filter(n=>n.sku==="EX-70-H2" && !inputExtenders.includes(n));
  const outputConnections=connections.filter(c=>c.from===core.id && c.signal==="video");
  const wire=(from:SchematicNode,fromPort:string,to:SchematicNode,toPort:string,transport:SchematicConnection["transport"],label:string,limit=35)=>connections.push({id:`${from.id}-${to.id}`,from:from.id,to:to.id,fromPort,toPort,signal:"video",transport,label,required:true,evidence:fromPort.includes("confirm") || toPort.includes("confirm") ? "unresolved" : "manufacturer",maxLengthM:transport==="hdbaset" ? limit : undefined,proposalSafeNote:transport==="hdbaset" ? `${limit}m design allowance; verify the exact model revision, resolution and installed cable.` : undefined});
  const endpoint=(id:string,label:string,column:number,lane:number,sku?:string):SchematicNode=>{const node:SchematicNode={id,label,column,lane,sku,kind:"accessory",required:true,x:0,y:0,metadata:{deviceRole:label}};nodes.push(node);return node;};
  if(inputExtenders.length) {
    core.column=3;
    const feeds=connections.filter(c=>c.to===core.id && c.signal==="video");
    let remote=0;
    for(const connection of [...feeds].sort((a,b)=>{
      const score=(id:string)=>/team|remote|table|guest/i.test(nodes.find(n=>n.id===id)?.label ?? "") ? 0 : 1;
      return score(a.from)-score(b.from);
    })) {
      const kit=inputExtenders[remote];if(!kit)break;
      const source=nodes.find(n=>n.id===connection.from)!;
      connections.splice(connections.indexOf(connection),1);
      const transmitter=endpoint(`input-extender-tx-${remote+1}`,`EX-70-H2 source transmitter ${remote+1}`,1,remote,"EX-70-H2 TX");
      const receiver=endpoint(`input-extender-rx-${remote+1}`,`EX-70-H2 rack receiver ${remote+1}`,2,remote,"EX-70-H2 RX");
      wire(source,"SOURCE OUTPUT (confirm)",transmitter,"HDMI IN","hdmi","Remote source HDMI to extender");
      wire(transmitter,"HDBT OUT",receiver,"HDBT IN","hdbaset","Remote source HDBaseT extension");
      wire(receiver,"HDMI OUT",core,connection.toPort ?? "INPUT (confirm)","hdmi","Rack receiver HDMI to matrix");
      nodes.splice(nodes.indexOf(kit),1);remote++;
    }
    warnings.push({severity:"info",title:"Remote source pairing",message:"Remote extender sets are allocated to source feeds as a proposed arrangement. Confirm physical source locations and matrix input mapping."});
  }
  outputConnections.forEach((connection,index)=>{
    const display=nodes.find(n=>n.id===connection.to)!; connections.splice(connections.indexOf(connection),1);
    display.column=(core.sku==="MX-0404-HDMI" || hybrid) && extenderNodes.length ? 4 : 3;
    if(index>=capacity){warnings.push({severity:"blocker",title:"Matrix output capacity exceeded",message:`${display.label} has no independent matrix output. Mirrored outputs do not add independent routes.`});return;}
    const port=index+1;
    if(core.sku==="MX-0808-KIT-V2" || (core.sku==="MX-0404-KIT" && port<=3)) {
      const receiver=endpoint(`kit-rx-${port}`,`Included kit receiver ${port}`,core.column+1,index);
      wire(core,`HDBT OUT ${port}`,receiver,"HDBT IN","hdbaset","HDBaseT · included receiver");
      wire(receiver,"HDMI OUT",display,"DISPLAY INPUT (confirm)","hdmi","Receiver HDMI to display");
    } else if((core.sku==="MX-0404-HDMI" || (hybrid && port<=4)) && extenderNodes[index]) {
      const transmitter=endpoint(`extender-tx-${port}`,`EX-70-H2 transmitter ${port}`,core.column+1,index,"EX-70-H2 TX");
      const receiver=endpoint(`extender-rx-${port}`,`EX-70-H2 receiver ${port}`,core.column+2,index,"EX-70-H2 RX");
      wire(core,`HDMI OUT ${port}`,transmitter,"HDMI IN","hdmi","Matrix HDMI to extender");
      wire(transmitter,"HDBT OUT",receiver,"HDBT IN","hdbaset","HDBaseT · paired extender set");
      wire(receiver,"HDMI OUT",display,"DISPLAY INPUT (confirm)","hdmi","Receiver HDMI to display");
      nodes.splice(nodes.indexOf(extenderNodes[index]),1);
    } else if(hybrid && port>4) {
      const receiver=hybridReceivers[port-5];
      if(!receiver){warnings.push({severity:"blocker",title:"Hybrid receiver required",message:`${display.label} needs a confirmed compatible HDBaseT 3.0 receiver.`});return;}
      receiver.column=core.column+1; receiver.lane=index; receiver.metadata={deviceRole:"HDBaseT 3.0 receiver"};display.column=core.column+2;
      wire(core,`HDBT OUT ${port-4}`,receiver,"HDBT IN","hdbaset","Native HDBaseT 3.0 to receiver",100);
      wire(receiver,"HDMI OUT",display,"DISPLAY INPUT (confirm)","hdmi","Receiver HDMI to display");
    } else wire(core,`HDMI OUT ${port}`,display,"DISPLAY INPUT (confirm)","hdmi","Local HDMI · extension not specified");
  });
  if(hybrid) warnings.push({severity:"info",title:"Hybrid local video allocation",message:"This sheet uses local HDMI inputs, four HDMI outputs and two native HDBaseT outputs only. USB-C, NetworkHD, audio and control require separate interface allocation."});
  if(inputExtenders.length) for(const connection of outputConnections) {const display=nodes.find(n=>n.id===connection.to);if(display)display.column=core.column+2;}
  warnings.push({severity:"info",title:"Matrix installation checks",message:"Confirm supplied receiver model/revision, source and output allocation, signal format, cable runs and power. Kit receivers are included, not additional purchases."});
}
