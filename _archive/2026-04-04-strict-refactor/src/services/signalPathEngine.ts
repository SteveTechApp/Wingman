export type SignalPathInput={
  sources:number
  displays:number
  transport:string
}

export type SignalLink={
  from:string
  to:string
}

export type SignalPathResult={
  links:SignalLink[]
}

export function buildSignalPath(input:SignalPathInput):SignalPathResult{

  const links:SignalLink[]=[]

  for(let s=1;s<=input.sources;s++){

    const encoder="Encoder "+s

    links.push({
      from:"Source "+s,
      to:encoder
    })

    if(input.transport==="AVoIP"){

      links.push({
        from:encoder,
        to:"Network Switch"
      })

    }

    for(let d=1;d<=input.displays;d++){

      const decoder="Decoder "+d

      if(input.transport==="AVoIP"){

        links.push({
          from:"Network Switch",
          to:decoder
        })

      }

      links.push({
        from:decoder,
        to:"Display "+d
      })
    }
  }

  return {links}
}