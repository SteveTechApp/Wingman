export type ExtractResult={text:string,meta?:any};

export function extractPlainText(input:unknown):ExtractResult{
  if(input==null) return {text:""};
  if(typeof input==="string") return {text:input};
  return {text:"",meta:{note:"Unsupported"}};
}

export default {extractPlainText};