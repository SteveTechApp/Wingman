export function recommendAccessories(product){
  if(product.role==="Transmitter"){
    return ["HDMI Cable","Mount Kit"];
  }
  return [];
}

export function validateCompatibility(a,b){
  return a.family===b.family;
}

export function suggestUpgrade(product){
  if(product.lifecycle==="EOL"){
    return "Suggest replacement model.";
  }
}