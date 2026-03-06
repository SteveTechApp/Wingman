import * as React from "react";
import { addProductToProposal } from "@/proposal/bom/QuoteCartAdapter";

export function generateProposalFromRoom(summary){

  if(summary.signal==="USB-C"){
    addProductToProposal({
      sku:"SW-620-TX-W",
      name:"Presentation Switcher",
      qty:1
    });
  }

  if(summary.outputs==="Dual Display"){
    addProductToProposal({
      sku:"NHD-200-RX",
      name:"Decoder",
      qty:2
    });
  }
}