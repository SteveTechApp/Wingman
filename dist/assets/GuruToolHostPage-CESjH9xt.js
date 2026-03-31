import{i as e,n as t,t as n}from"./jsx-runtime-xty2or4m.js";import{c as r,d as i,l as a}from"./dist-D-2W6x7k.js";import{t as o}from"./createLucideIcon-CYmL7zrO.js";import{d as s,f as c,o as l,s as u}from"./projectStore-BBfZRxur.js";import{c as d,d as f,l as p,n as m,u as h}from"./productIntelligenceService-C2-Pt6VO.js";import"./liveProductDataStore-BkWZf2jx.js";import{a as g,c as ee,o as _,s as v,u as y}from"./index-csqZ-K0K.js";import{_ as b,c as te,d as x,f as S,g as C,h as w,m as T,p as ne,v as re}from"./lookupService-ByFT2e9M.js";import{t as ie}from"./engine-Dn1UUNHx.js";var ae=o(`bot`,[[`path`,{d:`M12 8V4H8`,key:`hb8ula`}],[`rect`,{width:`16`,height:`12`,x:`4`,y:`8`,rx:`2`,key:`enze0r`}],[`path`,{d:`M2 14h2`,key:`vft8re`}],[`path`,{d:`M20 14h2`,key:`4cs60a`}],[`path`,{d:`M15 13v2`,key:`1xurst`}],[`path`,{d:`M9 13v2`,key:`rq6x2g`}]]),E=e(t(),1),oe=e(i(),1);function D(e){return String(e??``).trim()}function O(e,t=12){let n=[],r=new Set;for(let i of e){let e=D(i);if(!e)continue;let a=e.toLowerCase();if(!r.has(a)&&(r.add(a),n.push(e),n.length>=t))break}return n}function k(e,t){return(e||[]).map(e=>{let n=D(e.type),r=Math.max(0,Number(e.count)||0);return!n||r<=0?``:`${r}x ${n} ${t}`}).filter(Boolean)}function se(e){return e===`legacy`?`discontinued`:e===`active`?`current`:`unknown`}function ce(e){let t=[e.sku,e.name,e.family,e.category,e.subcategory,e.summary,...e.normalizedTags||[]].map(D).join(` `).toLowerCase();return t.includes(`matrix`)?`Matrix`:t.includes(`dongle`)?`Dongle`:t.includes(`controller`)?`Controller`:t.includes(`encoder`)||t.includes(`transmitter`)||/\btx\b/.test(t)?`TX`:t.includes(`decoder`)||t.includes(`receiver`)||/\brx\b/.test(t)?`RX`:t.includes(`endpoint`)?`Endpoint`:``}function le(e){return O([e.transport===`Unknown`?``:e.transport,e.video?.maxResolution,e.video?.hdr?`HDR`:``,...(e.inputs||[]).map(e=>e.type),...(e.outputs||[]).map(e=>e.type)])}function ue(e){let t=[e.transport,e.category,e.subcategory,...e.normalizedTags||[],...e.features||[]].map(D).join(` `).toLowerCase();return t.includes(`video wall`)||t.includes(`videowall`)?[`Control rooms`,`Video walls`,`Large-format display canvases`]:e.transport===`AVoIP`?[`Corporate AV`,`Education`,`Distributed AV systems`]:e.transport===`HDBaseT`?[`Meeting rooms`,`Classrooms`,`Digital signage`]:t.includes(`camera`)||t.includes(`ptz`)||t.includes(`videobar`)?[`Hybrid UC`,`Meeting rooms`,`Lecture capture`]:t.includes(`audio`)||t.includes(`microphone`)||t.includes(`dante`)?[`Boardrooms`,`Training rooms`,`Audio collaboration spaces`]:t.includes(`matrix`)||t.includes(`switcher`)?[`Boardrooms`,`Presentation spaces`,`Mixed-source rooms`]:[`Commercial AV`,`Room refresh projects`,`System upgrades`]}function A(e){return{sku:e.sku,name:D(e.name)||e.sku,family:D(e.family)||`WyreStorm`,category:D(e.subcategory)||D(e.category)||`Product`,role:ce(e),status:se(e.status),summary:D(e.summary)||D(e.notes)||D(e.name)||`${e.sku} reference product.`,io:O([...k(e.inputs,`input`),...k(e.outputs,`output`)]),connectivity:le(e),control:O(e.control||[]),features:O([...e.features||[],...e.normalizedTags||[]],16),bestFor:ue(e),sourceUrl:D(e.sourceUrl)||`https://www.wyrestorm.com/`}}function de(e){let t=`${e.family} ${e.category} ${e.description}`.toLowerCase();return{sku:e.sku,name:e.description,family:e.family,category:e.category,role:t.includes(`controller`)?`Controller`:t.includes(`matrix`)?`Matrix`:``,status:`unknown`,summary:e.description,io:[],connectivity:O([e.family,e.category]),control:t.includes(`control`)||t.includes(`controller`)?[`Control`]:[],features:O(e.searchText.split(`|`).map(e=>D(e)),10),bestFor:[`Commercial AV`,`System refresh projects`],sourceUrl:e.sourceUrl||`https://www.wyrestorm.com/`}}function fe(){let e=v();return e.length>0?e.map(A).sort((e,t)=>e.sku.localeCompare(t.sku)):g().map(de).sort((e,t)=>e.sku.localeCompare(t.sku))}fe();var j=120*1e3,pe=new Map,M=[{label:`Open Product Intelligence`,to:`/app/tools/product-intelligence`},{label:`Open Lookup Diagnostics`,to:`/app/tools/competitor-lookup-diagnostics`}];function N(e){return String(e??``).trim()}function P(e){return N(e).toLowerCase().replace(/[\s_\-/]+/g,``)}function me(e){return N(e).toUpperCase()}function F(e){return Math.max(0,Math.min(1,e))}function he(e){return e>=74?`High`:e>=52?`Medium`:`Low`}function I(e){return e.status===`approved`?1:e.status===`draft`?.78:.42}function ge(e){return e.sourceType===`live`?1:e.sourceType===`catalog`?.88:e.sourceType===`import`?.8:.7}function L(e){if(!e)return .58;let t=Date.parse(e);if(!Number.isFinite(t))return .58;let n=Math.max(0,(Date.now()-t)/(1440*60*1e3));return n<=30?1:n<=90?.86:n<=180?.7:n<=365?.56:.42}function _e(e){let t=Array.isArray(e.evidence)?e.evidence.length:0;return t>=4?1:t===3?.93:t===2?.84:t===1?.72:.56}function ve(e,t){if(!e)return{score:.44,notes:[`${t} intelligence record missing.`]};let n=F(Number(e.confidence)||.6)*.42+I(e)*.2+L(e.lastCapturedAt)*.16+_e(e)*.14+ge(e)*.08,r=[];return e.status!==`approved`&&r.push(`${t} status is ${e.status}.`),(e.evidence?.length??0)===0&&r.push(`${t} has no evidence entries.`),L(e.lastCapturedAt)<.7&&r.push(`${t} record is stale and should be recaptured.`),{score:F(n),notes:r}}function ye(e){return[e.vendorType,P(e.brand),me(e.sku),P(e.q)].join(`|`)}function be(e,t){if(e.length===0)return null;let n=me(t.sku),r=P(t.brand);return e.find(e=>{let t=n?me(e.sku)===n:!0,i=r?P(e.brand)===r:!0;return t&&i})||(n?e.find(e=>me(e.sku)===n):null)||(e[0]??null)}async function xe(e){let t=ye(e),n=pe.get(t);if(n&&n.expiresAt>Date.now())return n.value;let r=await m({vendorType:e.vendorType,brand:e.brand||void 0,sku:e.sku||void 0,q:e.q||void 0,limit:120}),i={record:be(r.records,e),warnings:r.warnings,available:r.available,mode:r.mode,fetchedAt:r.fetchedAt};return pe.set(t,{expiresAt:Date.now()+j,value:i}),i}function Se(e,t,n,r){return n?`Confidence ${e} (${t}/100). Escalation required: ${r[0]||`Evidence quality is below acceptance threshold.`}`:`Confidence ${e} (${t}/100). Product intelligence is sufficient for guided customer conversation.`}async function Ce(e){let[t,n]=await Promise.all([xe({vendorType:`competitor`,brand:e.competitorBrand,sku:e.competitorSku,q:e.query}),e.wyrestormSku?xe({vendorType:`wyrestorm`,brand:`WyreStorm`,sku:e.wyrestormSku,q:e.wyrestormSku}):Promise.resolve({record:null,warnings:[],available:!1,mode:`not-requested`,fetchedAt:new Date().toISOString()})]),r=ve(t.record,`Competitor`),i=ve(e.wyrestormSku?n.record:null,`WyreStorm`),a=F((Number(e.baselineScore)||58)/100),o=r.score;e.wyrestormSku&&(o=(r.score+i.score)/2);let s=Array.isArray(e.evidenceContext)?e.evidenceContext.map(e=>N(e)).filter(Boolean):[],c=a*.64+o*.36;s.length>0&&(c+=Math.min(.04,s.length*.0075)),t.record||(c=Math.min(c,.49)),e.wyrestormSku&&!n.record&&(c=Math.min(c,.54)),(t.record?.status===`expired`||n.record?.status===`expired`)&&(c=Math.min(c,.51));let l=Math.round(F(c)*100),u=he(l),d=[];d.push(...r.notes),d.push(...i.notes),u===`Low`&&d.push(`Combined evidence confidence is below threshold.`);let f=u===`Low`||!t.record||!!e.wyrestormSku&&!n.record||t.record?.status===`expired`||n.record?.status===`expired`,p=f?[`Validate both SKUs against latest manufacturer datasheets before customer commitment.`,`Capture additional I/O and positioning evidence in Product Intelligence.`,`Route uncertain outcomes through support diagnostics before proposal finalization.`]:[`Proceed with guided comparison and keep evidence links in the project notes.`,`Re-run lookup if scope changes or a different competitor SKU is introduced.`],m=[...t.warnings,...n.warnings];return s.length===0&&m.push(`No structured live evidence context provided for this comparison.`),{score:l,confidence:u,escalationRequired:f,escalationReasons:Array.from(new Set(d)).slice(0,6),recommendations:p,supportActions:M,warnings:m,summary:Se(u,l,f,d),evidenceContext:s,fetchedAt:new Date().toISOString(),competitorRecord:t.record,wyrestormRecord:e.wyrestormSku?n.record:null}}function R(e){let t=F(Number(e.confidence)||.6),n=I(e),r=_e(e),i=L(e.lastCapturedAt);return t*.45+n*.2+r*.18+i*.17}async function z(e){let t=N(e),n=await m({q:t||void 0,limit:12}),r=[...n.records].sort((e,t)=>R(t)-R(e)).slice(0,4),i=r.length>0?r.reduce((e,t)=>e+R(t),0)/r.length:.46,a=F(Math.min(1,r.length/3)),o=Math.round((i*.78+a*.22)*100),s=he(o),c=[];r.length===0&&c.push(`No matching product intelligence records found.`),r.some(e=>e.status===`expired`)&&c.push(`At least one matched record is expired.`),o<52&&c.push(`Available evidence is not sufficient for high-confidence guidance.`);let l=c.length>0||s===`Low`,u=r.length>0?r.slice(0,3).map(e=>`${e.brand} ${e.sku}: ${e.summary}`):[`Provide SKU or product family context to improve retrieval quality.`,`Use Product Intelligence to capture missing evidence before relying on automated guidance.`];return{question:t,score:o,confidence:s,escalationRequired:l,escalationReasons:Array.from(new Set(c)).slice(0,6),guidance:u,supportActions:M,warnings:n.warnings,records:r,available:n.available,mode:n.mode,fetchedAt:n.fetchedAt}}function we(e){return String(e??``).trim()}function Te(...e){return e.flatMap(e=>Array.isArray(e)?e:[e]).map(e=>we(e).toLowerCase()).filter(Boolean).join(` `).replace(/[^a-z0-9+./ -]+/g,` `).replace(/\s+/g,` `).trim()}function B(e,t){return t.test(e)}function Ee(e){let t=B(e,/\bencoder\b|\btx\b|\btransmitter\b/),n=B(e,/\bdecoder\b|\brx\b|\breceiver\b/),r=B(e,/\bcontroller\b|\bcontrol processor\b|\bcontrol gateway\b|\bmanagement controller\b/);return t&&n?`endpoint`:n?`decoder`:t?`encoder`:r?`controller`:`unknown`}function De(e){return B(e,/\bhdbaset\b/)?`hdbaset`:B(e,/\bnetworkhd\b|\bav over ip\b|\bavoip\b|\bsdvoe\b|\bdante av-a\b/)?`avoip`:B(e,/\busb extension\b/)?`usb-extension`:B(e,/\bwireless\b|\bairplay\b|\bmiracast\b|\bchromecast\b/)?`wireless`:B(e,/\blocal\b/)?`local`:`unknown`}function Oe(e){switch(String(e||``).trim().toLowerCase()){case`hdbaset`:return`hdbaset`;case`avoip`:return`avoip`;case`usb extension`:return`usb-extension`;case`local`:return`local`;default:return null}}function ke(e){return B(e,/\bsdvoe\b|\buncompressed\b/)?`sdvoe`:B(e,/\bjpeg[- ]?xs\b/)?`jpeg-xs`:B(e,/\bjpeg[- ]?2000\b/)?`jpeg2000`:B(e,/\bh\.?265\b/)?`h265`:B(e,/\bh\.?264\b/)?`h264`:B(e,/\bdante av-a\b/)?`dante-av`:`unknown`}function Ae(e){return/^NHD-600/i.test(e)?`sdvoe`:/^NHD-500/i.test(e)?`jpeg-xs`:/^NHD-400/i.test(e)?`jpeg2000`:/^NHD-1(10|20|50)/i.test(e)?`h264`:`unknown`}function je(e){return B(e,/\b10g\b|\b10gbe\b|\b10gb\b|\b10 gig\b|\b10-gig\b|\bsfp\+\b/)?`10g`:B(e,/\b2g\b|\b2gbe\b|\b2gb\b|\b2\.5g\b/)?`2g`:B(e,/\b1g\b|\b1gbe\b|\bone-gig\b|\bone gig\b|\bgigabit\b|\b1000base\b/)?`1g`:`unknown`}function Me(e){return B(e,/\bclass a\b/)?`class-a`:B(e,/\bclass b\b/)?`class-b`:B(e,/\bclass c\b/)?`class-c`:B(e,/\bclass d\b/)?`class-d`:`unknown`}function Ne(e){let t=[...(e.inputs??[]).map(e=>e.type),...(e.outputs??[]).map(e=>e.type)];return Te(e.sku,e.brand,e.family,e.name,e.category,e.subcategory,e.summary,e.transport,e.video?.maxResolution,e.video?.hdmi,Number.isFinite(e.video?.bandwidthGbps)?`${e.video?.bandwidthGbps}gbps`:``,e.latency,e.features,e.control,e.audio,t,e.distance?.notes)}function Pe(e){let t=Ne(e),n=we(e.sku).toUpperCase(),r=Ee(t),i=Oe(e.transport)||De(t),a=ke(t);return{role:r,transport:i,codec:a===`unknown`?Ae(n):a,networkClass:je(t),hdbasetClass:Me(t),isMultiview:B(t,/\bmultiview\b|\bmulti[- ]?view\b/),text:t}}function Fe(e,t){let n=[],r=[],i=[],a=0;if(e.transport!==`unknown`&&t.transport!==`unknown`&&e.transport!==t.transport&&i.push(`Transport mismatch (${e.transport} vs ${t.transport}).`),e.role===`decoder`&&t.role===`encoder`&&i.push(`Role mismatch: decoder request cannot be fulfilled by an encoder/TX endpoint.`),e.role===`encoder`&&t.role===`decoder`&&i.push(`Role mismatch: encoder request cannot be fulfilled by a decoder/RX endpoint.`),i.length>0)return{compatible:!1,scoreDelta:0,reasons:n,warnings:r,blockers:i};if(e.role!==`unknown`&&t.role!==`unknown`&&(e.role===t.role?(a+=14,n.push(`Role alignment (${t.role}).`)):(e.role===`decoder`||e.role===`encoder`)&&t.role===`endpoint`&&(a-=8,r.push(`Bidirectional endpoint selected against a single-role requirement.`))),e.transport===`avoip`&&t.transport===`avoip`){if(e.codec!==`unknown`&&t.codec!==`unknown`&&e.codec!==t.codec)return i.push(`AVoIP codec/chipset mismatch (${e.codec} vs ${t.codec}). AVoIP chipsets are proprietary and must not be mixed.`),{compatible:!1,scoreDelta:0,reasons:n,warnings:r,blockers:i};e.networkClass!==`unknown`&&t.networkClass!==`unknown`&&(e.networkClass===t.networkClass?(a+=5,n.push(`Network class alignment (${t.networkClass}).`)):(a-=14,r.push(`Network class mismatch (${e.networkClass} vs ${t.networkClass}).`))),!e.isMultiview&&t.isMultiview?(a-=12,r.push(`Candidate is multiview-focused while request is a standard endpoint.`)):e.isMultiview&&!t.isMultiview&&(a-=8,r.push(`Candidate lacks multiview capability requested by source profile.`))}return e.transport===`hdbaset`&&t.transport===`hdbaset`&&e.hdbasetClass!==`unknown`&&t.hdbasetClass!==`unknown`&&(e.hdbasetClass===t.hdbasetClass?(a+=6,n.push(`HDBaseT class alignment (${t.hdbasetClass}).`)):(a-=10,r.push(`HDBaseT class mismatch (${e.hdbasetClass} vs ${t.hdbasetClass}).`))),{compatible:!0,scoreDelta:a,reasons:n,warnings:r,blockers:i}}function Ie(e){return String(e??``).trim()}function V(e){return[e.brand,e.sku,e.name,e.family,e.category,e.subcategory,e.summary,e.transport,...e.features??[],...e.control??[],...e.audio??[]].map(e=>Ie(e).toLowerCase()).filter(Boolean).join(` `)}function Le(e,t,n,r,i,a,o){let s=e===`matrix`?{comparisonDomain:`MATRIX`,comparisonUseCase:`ROUTING`}:e===`presentation-switcher`?{comparisonDomain:`PRESENTATION`,comparisonUseCase:`COLLABORATION`}:e===`avoip`?{comparisonDomain:`AVOIP`,comparisonUseCase:`DISTRIBUTION`}:e===`extender`?{comparisonDomain:`EXTENDER`,comparisonUseCase:`EXTENSION`}:e===`wall-processor`?{comparisonDomain:`VIDEO_WALL`,comparisonUseCase:`WALL_PROCESSING`}:{comparisonDomain:`UNKNOWN`,comparisonUseCase:`UNKNOWN`};return{state:e,title:t,summary:n,recommendedFamilies:r,caveats:i,comparisonDomain:a??s.comparisonDomain,comparisonUseCase:o??s.comparisonUseCase}}function H(e){let t=V(e),n=[];(t.includes(`presentation`)||t.includes(`switcher`)||t.includes(`byod`))&&n.push(`Apollo`),t.includes(`matrix`)&&n.push(`Matrix`),(t.includes(`hdbaset`)||t.includes(`dtp`))&&n.push(`HDBaseT`),(t.includes(`avoip`)||t.includes(`networkhd`)||t.includes(`ip`))&&n.push(`AVoIP`),(t.includes(`multiview`)||t.includes(`windowall`)||t.includes(`video wall`))&&n.push(`Video Wall`),t.includes(`usb`)&&n.push(`USB Extension`);let r=Array.from(new Set(n));return Le(r.includes(`AVoIP`)?`avoip`:r.includes(`Matrix`)?`matrix`:r.includes(`Video Wall`)?`multiview`:r.includes(`HDBaseT`)?`extender`:r.includes(`Apollo`)?`presentation-switcher`:`generic`,`Generic AV signal chain`,`Use the product's actual topology, I/O, and transport before choosing a WyreStorm family.`,r.length>0?r:[`Apollo`],[`Check whether the product is a processor, matrix, endpoint, or extender before comparing it.`])}function Re(e,t,n=[`Matrix`],r=[]){return Le(`matrix`,e,t,n,r.length>0?r:[`Compare raw I/O, audio breakaway, scaling, and routing behavior.`])}function U(e,t,n=[`Apollo`],r=[]){return Le(`presentation-switcher`,e,t,n,r.length>0?r:[`Treat USB-C, scaling, BYOD, and room control as first-class requirements.`])}function ze(e,t,n=[`AVoIP`],r=[]){return Le(`avoip`,e,t,n,r.length>0?r:[`Use encoder, decoder, controller, bandwidth, and endpoint roles as the primary comparison inputs.`])}function Be(e,t,n=[`HDBaseT`],r=[]){return Le(`extender`,e,t,n,r.length>0?r:[`Compare one source to one display or transmitter/receiver distance rather than routing features.`])}function Ve(e,t,n=[`Video Wall`,`AVoIP`],r=[]){return Le(`wall-processor`,e,t,n,r.length>0?r:[`Treat multiview, wall-feed composition, and per-panel decoding as separate design states.`])}function He(e){let t=V(e);if(/\bnav\b/.test(t)){let e=/\b10g\b|\b10e\b|\b10sd\b/.test(t);return ze(e?`Extron NAV 10G distributed AVoIP`:`Extron NAV distributed AVoIP`,e?`NAV 10G should be treated as a high-bandwidth endpoint-based AV over IP ecosystem with encoder / decoder / controller roles, not as a fixed matrix.`:`NAV should be treated as an endpoint-based AV over IP ecosystem with encoder / decoder / controller roles, not as a fixed matrix.`,[`AVoIP`],[e?`Treat 10G bandwidth and fiber transport as a core decision point.`:`Use encoder / decoder counts and network speed when comparing NAV designs.`,`Distinguish controller, encoder, and decoder roles before mapping to WyreStorm.`])}return/\bmgp\b|\bwindowall\b/.test(t)?Ve(`Extron multiview processor`,`MGP and WindoWall behave like canvas processors for one-screen or one-wall compositions, not like simple switchers.`,[`Video Wall`,`Apollo`],[`Compare against wall processors and multiview workflows, not against plain matrices.`,`Treat windowing and scaling as first-class requirements.`]):/\bcrosspoint\b/.test(t)?Re(`Extron CrossPoint matrix`,`CrossPoint products are presentation matrices with scaling and extension layers, so they should be matched as matrix-led systems.`,[`Matrix`,`HDBaseT`],[`Separate the matrix core from any DTP extension endpoints when comparing BOMs.`,`Scaled outputs and audio/control features matter as much as raw I/O count.`]):/\bin\d{4}\b|\bdtp(?:3)?\s+t\s+usw\b/.test(t)?U(`Extron presentation switcher`,`IN-series and DTP USW products are room switchers with presentation staging and extension, which maps most closely to Apollo-style workflows.`,[`Apollo`,`HDBaseT`],[`Use input mix, scaling, USB-C, and extension behavior before calling it a matrix.`,`These are presentation workflows first, not generic source selectors.`]):/\bdtp(?:3)?\s+[tr]\b/.test(t)?Be(`Extron DTP extender`,`DTP transmitters and receivers should be handled as point-to-point HDBaseT extension, not as switching or wall-processing products.`,[`HDBaseT`],[`Compare distance, loop-through, and control passthrough rather than treating them as source switchers.`]):H(e)}function Ue(e){let t=V(e);return/\bairmedia\b|\bam-\d+/i.test(t)?U(`Crestron AirMedia collaboration`,`AirMedia is a wireless presentation and conferencing family, so compare it against collaboration workflows rather than fixed matrices.`,[`Apollo`],[`Wireless sharing, conferencing, and transmitter / receiver roles matter more than raw I/O.`,`Do not map AirMedia into an AVoIP wall architecture.`]):/\bdm-nvx\b/.test(t)?ze(`Crestron DM NVX distributed AVoIP`,`DM NVX is an enterprise AV-over-IP ecosystem with encoders, decoders, and management roles, so it should be compared on transport, director topology, and endpoint behavior.`,[`AVoIP`],[`Use encoder, decoder, and director roles when mapping the product.`,`Treat bandwidth, latency, and wall or room scaling as first-class decision points.`]):/\bhd-ps\b|\bdmps3\b/.test(t)?U(`Crestron presentation system`,`HD-PS and DMPS3 units are presentation systems with scaling, control, and room routing rather than plain matrices.`,[`Apollo`,`Matrix`],[`Audio, scaling, USB, and control integration should stay in the foreground.`,`Treat mirrored outputs and room staging as part of the design state.`]):/\bdm-md\d+x\d+\b/.test(t)?Re(`Crestron DigitalMedia matrix`,`DM-MD chassis products are modular matrix systems and should be compared like enterprise routing platforms.`,[`Matrix`],[`Use exact I/O, card layout, and control integration rather than fixed switcher assumptions.`,`Modularity matters as much as port count.`]):/\bnvx\b/.test(t)?ze(`Crestron NVX distributed AVoIP`,`NVX is Crestron's AV-over-IP ecosystem and should be compared on endpoint counts, transport performance, control, and scaling behavior.`,[`AVoIP`],[`Separate pure encoders / decoders from director and management roles.`,`USB, scaling, and video wall behavior can materially change the correct candidate.`]):H(e)}function We(e){let t=V(e);return/\bvia\b/.test(t)?U(`Kramer VIA collaboration`,`VIA is a wireless collaboration family, so compare it against BYOD and meeting-room workflows.`,[`Apollo`],[`Wireless sharing and conferencing are the primary differentiators.`]):/\bvs-\d+h2a\b/.test(t)?Re(`Kramer HDMI matrix`,`VS matrix products are fixed HDMI routing platforms and should be compared to matrix switchers, not to collaboration systems.`,[`Matrix`],[`Treat audio breakaway and EDID handling as key routing details.`]):/\bkds\b/.test(t)?ze(`Kramer KDS AVoIP`,`KDS is Kramer's AV-over-IP family and should be scored on encoder / decoder roles, transport, and endpoint features.`,[`AVoIP`],[`USB, IR, RS-232, and audio embedding should be captured when available.`]):/\btp-?\s?580t\b/.test(t)?Be(`Kramer HDBaseT extender`,`TP-580T is a point-to-point long-reach extender and should be treated as transport, not a routing core.`,[`HDBaseT`],[`Distance and signal class are the important comparison dimensions.`]):H(e)}function Ge(e){let t=V(e);return/\bucx\b/.test(t)?U(`Lightware UCX collaboration matrix`,`UCX is a collaboration matrix with USB-C, host switching, and optional audio/network integration, so it should compare as a premium meeting-space system.`,[`Apollo`],[`USB host/device routing and collaboration posture are first-class requirements.`,`Do not compare UCX as if it were a plain HDMI matrix.`]):/\bubex\b/.test(t)||/\bvinx\b/.test(t)?ze(`Lightware AV-over-IP family`,`UBEX and VINX are premium AVoIP families and should be compared using transport, endpoint type, and latency rather than matrix port counts.`,[`AVoIP`],[`Treat 10G or 1G transport class as a core decision point.`]):/\bmx2\b/.test(t)?Re(`Lightware matrix switching`,`MX2 is a standalone HDMI matrix family and should be compared against other fixed matrices.`,[`Matrix`],[`Use I/O count, audio breakaway, and scaling as the main criteria.`]):/\btpx\b|\btps\b/.test(t)?Be(`Lightware extender / transport`,`TPX and TPS are long-reach transport families and belong in the extender comparison set.`,[`HDBaseT`],[`Compare end-to-end reach, not matrix routing features.`]):H(e)}function Ke(e){let t=V(e);return/\bomni\b/.test(t)?ze(`Atlona OmniStream AVoIP`,`OmniStream is Atlona's AV-over-IP family and should be compared on endpoint density, codec family, and transport behavior.`,[`AVoIP`],[`Differentiate encoder, decoder, and multiview roles before choosing a WyreStorm family.`]):/\bome\b|\bomega\b/.test(t)?U(`Atlona OME presentation switcher`,`OME and Omega products are presentation systems with USB-C, BYOD, scaling, and room-control behavior, so they should compare as collaboration-first room solutions.`,[`Apollo`,`Matrix`],[`Treat collaboration and room staging as the core use case.`,`Do not compare OME products as if they were pure matrix chassis.`]):H(e)}function qe(e){let t=V(e);return/\bclickshare\b|\bvideo bar pro\b/.test(t)?U(`Barco ClickShare collaboration`,`ClickShare is a BYOD / conferencing family and belongs in the collaboration lane rather than in switching or AVoIP routing.`,[`Apollo`],[`Wireless sharing, conferencing, and room simplicity are the main comparison points.`,`Do not rank it against matrix products unless the room state is explicitly collaboration-first.`]):H(e)}function Je(e){let t=b(e),n=Ie(t.brand).toLowerCase();return n.includes(`extron`)?He(t):n.includes(`crestron`)?Ue(t):n.includes(`kramer`)?We(t):n.includes(`lightware`)?Ge(t):n.includes(`atlona`)?Ke(t):n.includes(`barco`)?qe(t):H(t)}T({summary:w().optional(),keyTakeaways:x(w()).optional(),inputs:x(T({type:w(),count:ne.number().optional()})).optional(),outputs:x(T({type:w(),count:ne.number().optional()})).optional(),connectivity:x(w()).optional(),control:x(w()).optional(),networkPorts:x(w()).optional(),wirelessCasting:S().optional(),sourceUrl:w().optional(),warnings:x(w()).optional()}).passthrough();function W(e){return String(e??``).trim()}function Ye(e){return W(e).toUpperCase()}function Xe(e,t){return t.test(e)}function Ze(e){let t=(e??[]).map(e=>{let t=W(e.type),n=Number(e.count??0);return t?`${t}${n>0?` x${n}`:``}`:``}).filter(Boolean);return t.length>0?t.join(`, `):`-`}function Qe(e){return(e??[]).reduce((e,t)=>e+Math.max(0,Number(t.count??0)),0)}function $e(e){let t=[...(e.inputs??[]).map(e=>W(e.type)),...(e.outputs??[]).map(e=>W(e.type)),...e.features??[],e.summary,e.transport,e.video?.maxResolution].map(e=>W(e).toLowerCase()).filter(Boolean),n=t.some(e=>Xe(e,/\blan\b|\brj45\b|\bethernet\b/)),r=t.some(e=>Xe(e,/\bsfp\+\b|\bsfp\b/)),i=t.some(e=>Xe(e,/\b10g\b|\b10gbe\b|\b10gb\b|\b10-gig\b/)),a=t.some(e=>Xe(e,/\b2g\b|\b2\.5g\b/)),o=t.some(e=>Xe(e,/\b1g\b|\bgigabit\b|\bone-gig\b/)),s=[];return n&&s.push(`Ethernet`),r&&s.push(`SFP`),i?s.push(`10Gb`):a?s.push(`2Gb/2.5Gb`):(o||n)&&s.push(`1Gb`),s.length>0?Array.from(new Set(s)).join(`, `):`-`}function et(e){let t=[...(e.inputs??[]).map(e=>W(e.type)),...(e.outputs??[]).map(e=>W(e.type)),e.transport].filter(Boolean).slice(0,8);return t.length>0?Array.from(new Set(t)).join(`, `):`-`}function tt(e){return Xe([...e.features??[],e.summary,e.name].map(e=>W(e).toLowerCase()).join(` `),/\bwireless casting\b|\bwireless presentation\b|\bairplay\b|\bmiracast\b|\bchromecast\b|\bclickshare\b/)}function nt(e,t=6){return Array.from(new Set(e.map(e=>W(e)).filter(Boolean))).slice(0,t)}function rt(e){let t=[],n=W(e.summary);n&&t.push(n);let r=`${Qe(e.inputs)} input(s), ${Qe(e.outputs)} output(s).`;t.push(r);let i=(e.control??[]).map(e=>W(e)).filter(Boolean);i.length>0&&t.push(`Control: ${i.slice(0,4).join(`, `)}.`);let a=(e.features??[]).map(e=>W(e)).filter(Boolean);return a.length>0&&t.push(`Key features: ${a.slice(0,5).join(`, `)}.`),nt(t,5)}function it(e){return{vendorType:e.vendorType,brand:W(e.brand)||(e.vendorType===`wyrestorm`?`WyreStorm`:`Unknown`),sku:Ye(e.sku)||`UNKNOWN`,name:W(e.name)||Ye(e.sku)||`Unknown product`,sourceUrl:W(e.sourceUrl)||void 0,summary:W(e.summary)||`No summary available.`,inputCount:Qe(e.inputs),outputCount:Qe(e.outputs),inputPorts:Ze(e.inputs),outputPorts:Ze(e.outputs),connectivity:et(e),controlPorts:(e.control??[]).map(e=>W(e)).filter(Boolean).join(`, `)||`-`,networkPorts:$e(e),wirelessCasting:tt(e),keyTakeaways:rt(e),fetchedAt:new Date().toISOString(),source:`catalog`,warnings:[]}}function at(e,t){let n=[];return e&&(n.push(`Competitor ${e.brand} ${e.sku}: inputs ${e.inputPorts}; outputs ${e.outputPorts}; connectivity ${e.connectivity}; network ${e.networkPorts}; control ${e.controlPorts}.`),e.keyTakeaways.length>0&&n.push(`Competitor takeaways: ${e.keyTakeaways.slice(0,3).join(` `)}`)),t&&(n.push(`WyreStorm ${t.sku}: inputs ${t.inputPorts}; outputs ${t.outputPorts}; connectivity ${t.connectivity}; network ${t.networkPorts}; control ${t.controlPorts}.`),t.keyTakeaways.length>0&&n.push(`WyreStorm takeaways: ${t.keyTakeaways.slice(0,3).join(` `)}`)),nt(n,8)}var ot=75,st=45;function G(e){return String(e??``).trim()}function K(e){return G(e).toLowerCase().replace(/[\s_\-/]+/g,``)}function q(e){return G(e).toUpperCase()}function ct(e,t=8){let n=[],r=new Set;for(let i of e){let e=G(i);if(!e)continue;let a=e.toLowerCase();if(!r.has(a)&&(r.add(a),n.push(e),n.length>=t))break}return n}function lt(e){return[e.family,e.category,e.subcategory].map(e=>G(e)).filter(Boolean).join(` / `)}function ut(e){return Math.max(0,Math.min(1,e))}function dt(e){let t=new Map;for(let n of e??[]){let e=K(n.type);e&&t.set(e,(t.get(e)??0)+Math.max(0,Number(n.count)||0))}return t}function ft(e){let t=0;for(let n of e.values())t+=n;return t}function pt(e,t,n,r,i){let a=ft(e);if(a===0)return i.push(`${n} I/O is missing on the competitor record.`),.15;let o=0,s=0;for(let[a,c]of e.entries()){let e=t.get(a)??0;o+=Math.min(c,e),e>=c?r.push(`${n} ${a.toUpperCase()} coverage (${e}/${c}).`):(i.push(`${n} ${a.toUpperCase()} shortfall (${e}/${c}).`),s+=1)}let c=ut(o/Math.max(1,a));return s===0?c:c*Math.max(.4,1-s*.12)}function mt(e,t){let n=new Set(e.map(e=>K(e)).filter(Boolean)),r=new Set(t.map(e=>K(e)).filter(Boolean));if(n.size===0)return 0;let i=0;return n.forEach(e=>{r.has(e)&&(i+=1)}),ut(i/n.size)}function ht(e){let t=G(e).toLowerCase();return t?t.includes(`8k`)?5:t.includes(`4k60`)&&t.includes(`444`)?4:t.includes(`4k60`)?3:t.includes(`4k30`)||t.includes(`4k`)?2:t.includes(`1080`)?1:0:0}function gt(e){return Number.isFinite(e)?Number(e):0}function _t(e){let t=G(e).toLowerCase();return t?t.startsWith(`2.1`)?4:t.startsWith(`2.0b`)?3:t.startsWith(`2.0`)?2:t.startsWith(`1.4`)?1:0:0}function vt(e){let t=G(e).toLowerCase();return t?t.includes(`zero`)?4:t.includes(`subframe`)||t.includes(`sub-frame`)?3:t.includes(`low`)?2:t.includes(`standard`)?1:0:0}var yt=[{key:`airplay`,label:`AirPlay`},{key:`miracast`,label:`Miracast`},{key:`googleCast`,label:`Google Cast`},{key:`wirelessPresentation`,label:`Wireless presentation`},{key:`wirelessConference`,label:`Wireless conference`},{key:`mst`,label:`MST`},{key:`byod`,label:`BYOD`},{key:`byom`,label:`BYOM`}],bt=[{key:`passthrough`,label:`USB passthrough`},{key:`usbCVideoInput`,label:`USB-C video input`},{key:`kvmSupport`,label:`KVM`},{key:`cameraSharing`,label:`Camera sharing`},{key:`peripheralSwitching`,label:`Peripheral switching`}],xt=[{key:`scaling`,label:`Scaling`},{key:`downscaling`,label:`Downscaling`},{key:`upscaling`,label:`Upscaling`},{key:`multiview`,label:`Multiview`},{key:`seamlessSwitching`,label:`Seamless switching`},{key:`dolbyVision`,label:`Dolby Vision`}],St=[{key:`rs232`,label:`RS-232`},{key:`ir`,label:`IR`},{key:`lanControl`,label:`LAN control`},{key:`webUi`,label:`Web UI`},{key:`api`,label:`API`},{key:`cec`,label:`CEC`},{key:`poe`,label:`PoE`},{key:`poePd`,label:`PoE PD`}];function Ct(e,t){return e?t.filter(t=>!!e[t.key]).map(e=>e.label):[]}function wt(e,t,n,r,i,a,o){let s=Ct(t,r);if(s.length===0)return 0;let c=new Set(Ct(n,r).map(e=>K(e))),l=s.filter(e=>c.has(K(e))),u=ut(l.length/s.length),d=Math.round(u*i);l.length>0&&a.push(`${e} coverage ${Math.round(u*100)}%.`);let f=s.filter(e=>!c.has(K(e)));return f.length>0&&o.push(`${e} gap: ${f.slice(0,3).join(`, `)}.`),d}function Tt(e,t,n,r,i,a,o=``){let s=Number(t)||0;if(s<=0)return 0;let c=Number(n)||0,l=o?` ${o}`:``;return c>=s?(i.push(`${e} aligns (${c}${l}).`),r):c>0?(a.push(`${e} below competitor baseline (${c}${l} vs ${s}${l}).`),Math.max(0,Math.round(c/s*r))):(a.push(`${e} is missing (${s}${l} required).`),0)}function Et(e){let t=G(e).toLowerCase();return t?t.startsWith(`2.3`)?4:t.startsWith(`2.2`)?3:t.startsWith(`2.1`)?2:t.startsWith(`1.4`)?1:0:0}function Dt(e){let t=G(e).toLowerCase();return t?t.includes(`10g`)?3:t.includes(`2.5g`)?2:t.includes(`1g`)?1:0:0}function Ot(e){let t=G(e).toLowerCase();return t?t.includes(`class a`)?2:t.includes(`class b`)?1:0:0}function kt(e,t,n,r,i,a,o,s){return t<=0?0:n>=t?(o.push(`${e} aligns (${G(i)||`supported`}).`),a):n>0?(s.push(`${e} below competitor baseline (${G(i)||`unknown`} vs ${G(r)||`required`}).`),Math.max(0,a-1)):(s.push(`${e} is missing (competitor: ${G(r)||`specified`}).`),0)}function At(e){let t=new Set,n=[e.family,e.category,e.subcategory,e.transport,e.summary,e.video?.maxResolution,e.video?.hdmi,Number.isFinite(e.video?.bandwidthGbps)?`${e.video?.bandwidthGbps}gbps`:``,e.latency,...e.features??[],...e.control??[],...e.audio??[],...(e.inputs??[]).map(e=>e.type),...(e.outputs??[]).map(e=>e.type),...e.normalizedTags??[]];for(let e of n){let n=K(e);n&&t.add(n)}return t}function jt(e){let t=new Set,n=f(e),r=[e.family,e.category,e.subcategory,e.summary,e.transport,...e.features??[]].join(` `).toLowerCase();return(n.group===`uc`||n.primaryType.startsWith(`uc-`)||r.includes(`apollo`))&&t.add(`Apollo`),(n.group===`extender`||r.includes(`hdbaset`))&&t.add(`HDBaseT`),(n.group===`avoip`||r.includes(`avoip`)||r.includes(`networkhd`))&&t.add(`AVoIP`),(n.group===`matrix`||r.includes(`matrix`))&&t.add(`Matrix`),(n.primaryType.includes(`usb`)||n.group===`extender`&&r.includes(`usb`)||r.includes(`usb extension`))&&t.add(`USB Extension`),(n.group===`videowall`||r.includes(`video wall`)||r.includes(`videowall`))&&t.add(`Video Wall`),Array.from(t)}function Mt(e){return[e.category,e.subcategory].map(e=>G(e)).filter(Boolean).join(` / `)||`Uncategorized`}function Nt(e){let t=[e.family,e.category,e.subcategory,e.summary,...e.features??[],...e.control??[]].join(` `).toLowerCase();return/\bvideo wall\b|\bvideowall\b|\bwall processor\b|\bwall feed\b/.test(t)?`VIDEO_WALL`:/\bmatrix\b|\bmodular matrix\b|\bmatrix switch\b|\bmatrix switching\b/.test(t)?`MATRIX`:/\bextender\b|\bpoint to point\b|\bhdbaset\b|\btps\b|\btpx\b/.test(t)?`EXTENDER`:/\bcontrol\b|\bcontroller\b|\bmanagement\b/.test(t)?`CONTROL`:/\bpresentation switcher\b|\bcollaboration\b|\bbyod\b|\bbyom\b|\bucx\b|\bdmps\b|\bhd-ps\b|\bomni\b|\bome\b/.test(t)?`PRESENTATION`:/\bnvx\b|\bnav\b|\bubex\b|\bvinx\b|\bnetworkhd\b|\bavoip\b|\bsdvoe\b|\bencoder\b|\bdecoder\b/.test(t)?`AVOIP`:`UNKNOWN`}function Pt(e,t){let n=[e.family,e.category,e.subcategory,e.summary,...e.features??[],...e.control??[],...e.audio??[]].join(` `).toLowerCase();return/\bmultiview\b|\bmulti-view\b|\bwindowing\b/.test(n)?`MULTIVIEW`:/\bvideo wall\b|\bvideowall\b|\bwall processor\b|\bwall feed\b/.test(n)?`WALL_PROCESSING`:/\bcollaboration\b|\bbyod\b|\bbyom\b|\busb-c\b|\bwireless presentation\b|\bhuddle\b/.test(n)?`COLLABORATION`:/\bextension\b|\bextender\b|\bpoint to point\b|\blong reach\b/.test(n)?`EXTENSION`:t===`MATRIX`?`ROUTING`:t===`AVOIP`?`DISTRIBUTION`:t===`EXTENDER`?`EXTENSION`:t===`VIDEO_WALL`?`WALL_PROCESSING`:t===`CONTROL`?`CONTROL`:`UNKNOWN`}function Ft(e){return e>=75?`High`:e>=60?`Medium`:`Low`}function It(e){return e>=85?8:e>=70?4:e>=55?1:-6}function Lt(e,t){let n=[],r=[],i=0,a=f(e),o=f(t);if(h(a,o))i+=12,n.push(`Type alignment (${o.label}).`);else return{product:t,score:0,reasons:[`Type mismatch`],notes:[`Rejected because ${t.sku} is ${o.label}, not ${a.label}.`],ioSummary:`I/O coverage 0%`};let s=Fe(Pe(e),Pe(t));if(!s.compatible)return{product:t,score:0,reasons:[`AV rule mismatch`],notes:s.blockers,ioSummary:`I/O coverage 0%`};i+=s.scoreDelta,n.push(...s.reasons),r.push(...s.warnings),K(e.family)===K(t.family)&&G(e.family)&&(i+=6,n.push(`Family alignment (${t.family}).`)),K(e.category)===K(t.category)&&G(e.category)&&(i+=4,n.push(`Category alignment (${t.category}).`)),K(e.transport)&&K(e.transport)===K(t.transport)?(i+=16,n.push(`Transport alignment (${t.transport}).`)):K(e.transport)&&r.push(`Transport differs (${e.transport||`unknown`} vs ${t.transport||`unknown`}).`);let c=At(e),l=At(t),u=0;c.forEach(e=>{l.has(e)&&(u+=1)});let d=ut(u/Math.max(1,c.size));i+=Math.round(d*8),n.push(`Feature overlap ${Math.round(d*100)}%.`);let p=ut((pt(dt(e.inputs),dt(t.inputs),`Input`,n,r)+pt(dt(e.outputs),dt(t.outputs),`Output`,n,r))/2);i+=Math.round(p*36),i+=wt(`Wireless / collaboration`,e.wireless,t.wireless,yt,4,n,r),i+=wt(`USB workflow`,e.usb,t.usb,bt,4,n,r),i+=wt(`Advanced video workflow`,e.video,t.video,xt,3,n,r),i+=wt(`Integration depth`,e.integration,t.integration,St,3,n,r),i+=Tt(`USB host ports`,e.usb?.hostPorts,t.usb?.hostPorts,2,n,r),i+=Tt(`USB device ports`,e.usb?.devicePorts,t.usb?.devicePorts,2,n,r),i+=Tt(`USB-C charging`,e.usb?.usbCChargingWatts,t.usb?.usbCChargingWatts,2,n,r,`W`),i+=Tt(`Relay count`,e.integration?.relayCount,t.integration?.relayCount,1,n,r),i+=Tt(`GPIO count`,e.integration?.gpioCount,t.integration?.gpioCount,1,n,r);let m=mt(e.control??[],t.control??[]);(e.control??[]).length>0&&(i+=Math.round(m*6),m>0?n.push(`Control overlap ${Math.round(m*100)}%.`):r.push(`Control interfaces do not clearly align.`));let g=mt(e.audio??[],t.audio??[]);(e.audio??[]).length>0&&(i+=Math.round(g*4),g>0?n.push(`Audio feature overlap ${Math.round(g*100)}%.`):r.push(`Audio connectivity does not clearly align.`));let ee=ht(e.video?.maxResolution),_=ht(t.video?.maxResolution);if(ee>0&&_>0)if(_>=ee)i+=6,n.push(`Video ceiling aligns (${t.video?.maxResolution||`N/A`}).`);else{let e=Math.min(5,Math.max(2,ee-_));i+=6-e,r.push(`Video ceiling below competitor baseline (${t.video?.maxResolution||`N/A`}).`)}else r.push(`Video specs incomplete; no score credit awarded.`);e.video?.hdr&&t.video?.hdr?(i+=2,n.push(`HDR support aligns.`)):e.video?.hdr&&!t.video?.hdr&&r.push(`Competitor lists HDR but candidate does not.`);let v=gt(e.video?.bandwidthGbps),y=gt(t.video?.bandwidthGbps);v>0&&y>0&&(y>=v?(i+=3,n.push(`Bandwidth class aligns (${y} Gbps).`)):r.push(`Bandwidth below competitor baseline (${y} vs ${v} Gbps).`));let b=_t(e.video?.hdmi),te=_t(t.video?.hdmi);b>0&&te>0&&(te>=b?(i+=3,n.push(`HDMI generation aligns (${t.video?.hdmi||`N/A`}).`)):r.push(`HDMI generation below competitor baseline (${t.video?.hdmi||`N/A`}).`)),i+=kt(`HDCP generation`,Et(e.video?.hdcpVersion),Et(t.video?.hdcpVersion),e.video?.hdcpVersion,t.video?.hdcpVersion,2,n,r),i+=kt(`AVoIP network speed`,Dt(e.distance?.networkSpeed),Dt(t.distance?.networkSpeed),e.distance?.networkSpeed,t.distance?.networkSpeed,2,n,r),i+=kt(`HDBaseT class`,Ot(e.distance?.hdbasetClass),Ot(t.distance?.hdbasetClass),e.distance?.hdbasetClass,t.distance?.hdbasetClass,2,n,r);let x=vt(e.latency),S=vt(t.latency);return x>0&&S>0&&(S>=x?(i+=2,n.push(`Latency class aligns (${t.latency}).`)):r.push(`Latency class trails competitor baseline (${t.latency||`N/A`}).`)),{product:t,score:Math.max(0,Math.min(100,i)),reasons:n.slice(0,6),notes:r.slice(0,6),ioSummary:`I/O coverage ${Math.round(p*100)}%`}}function Rt(e){let t=b(e),n=v(),r=f(t),i=C(t,n);return n.filter(e=>h(r,f(e))).map(e=>{let n=i.get(e.sku);if(!n||n.score<st)return null;let r=Lt(t,e);return{...r,score:Math.max(0,Math.min(100,r.score+It(n.score))),reasons:n.score>=70?r.reasons:ct([...r.reasons,`Structured comparison lane is only a fallback fit.`],6),notes:n.score<70?ct([...r.notes,...n.reasons.slice(0,2)],6):r.notes}}).filter(e=>!!e).filter(e=>e.score>=ot).sort((e,t)=>t.score-e.score||e.product.sku.localeCompare(t.product.sku))}function zt(e,t){return{mode:e,source:t.source,label:t.label,fetchedAt:t.fetchedAt??new Date().toISOString(),cacheHit:`cacheHit`in t?t.cacheHit:void 0,sourceUrl:t.sourceUrl}}function Bt(e,t,n){let r=t.reasons.length>0?t.reasons.join(` `):`Deterministic compatibility scoring.`,i=Je(e),a=i.comparisonDomain??Nt(e),o=i.comparisonUseCase??Pt(e,a);return{brand:G(e.brand)||`Unknown`,competitorSku:q(e.sku),competitorName:G(e.name)||void 0,category:Mt(e),comparisonDomain:a,comparisonUseCase:o,summary:G(e.summary)||`${G(e.name)||q(e.sku)} competitor reference for deterministic match scoring. ${i.summary}`,features:Array.isArray(e.features)?e.features.map(e=>G(e)).filter(Boolean):[],ioComparison:t.ioSummary,wyrestormSku:t.product.sku,wyrestormName:G(t.product.name)||void 0,wyrestormCategory:lt(t.product),wyrestormVerified:!0,confidence:Ft(t.score),matchScore:t.score,rationale:`Closest verified WyreStorm fit: ${t.product.sku} (${t.product.name}). ${r} ${i.summary}`,recommendedFamilies:jt(t.product),notes:[...i.caveats,...t.notes,`Validate against latest official datasheets for ${q(e.sku)} and ${t.product.sku}.`],provenance:n}}function Vt(e,t=3){let n=b(e);return qt({sku:n.sku,name:n.name,summary:n.summary,category:n.category,technology:n.technology,features:n.features},v().map(e=>({sku:e.sku,name:e.name,summary:e.summary,category:e.category,technology:e.technology,features:e.features}))).slice(0,t).map(e=>_(e.sku)).filter(e=>!!e)}function Ht(e,t,n){let r=Je(e),i=r.comparisonDomain??Nt(e),a=r.comparisonUseCase??Pt(e,i),o=Vt(e,3),s=o[0];return{brand:G(e.brand)||`Unknown`,competitorSku:q(e.sku),competitorName:G(e.name)||void 0,category:Mt(e),comparisonDomain:i,comparisonUseCase:a,summary:G(e.summary)||`${G(e.name)||q(e.sku)} is searchable, but the automatic compare library needs a manual review for the final replacement call.`,features:Array.isArray(e.features)?e.features.map(e=>G(e)).filter(Boolean):[],ioComparison:`Closest available options require manual review.`,wyrestormSku:s?.sku||`Manual review required`,wyrestormName:G(s?.name)||void 0,wyrestormCategory:s?lt(s):`Unverified / manual review`,wyrestormVerified:!1,confidence:`Low`,rationale:s?`No deterministic candidate cleared the automatic threshold. ${s.sku} is the closest structured starting point and should be checked in the comparison matrix before being presented as a replacement.`:`No deterministic candidate cleared the automatic threshold. Use the comparison matrix and manual review before presenting a replacement.`,recommendedFamilies:s?jt(s):r.recommendedFamilies,notes:Array.from(new Set([n,...r.caveats,o.length>0?`Closest structured suggestions: ${o.map(e=>e.sku).join(`, `)}.`:`No structured fallback suggestions were available from the current catalog.`,`Review competitor inputs, outputs, transport, and workflow details before confirming the final WyreStorm SKU.`])).slice(0,10),provenance:t}}function Ut(e){return{score:e.score,confidence:e.confidence,escalationRequired:e.escalationRequired,escalationReasons:e.escalationReasons,recommendations:e.recommendations,supportActions:e.supportActions,warnings:e.warnings,summary:e.summary,evidenceContext:e.evidenceContext,fetchedAt:e.fetchedAt,competitorStatus:e.competitorRecord?.status,wyrestormStatus:e.wyrestormRecord?.status}}async function Wt(e,t){try{let n=await Ce({competitorBrand:e.brand,competitorSku:e.competitorSku,wyrestormSku:e.wyrestormVerified===!1?void 0:e.wyrestormSku,query:t.query,baselineScore:t.baselineScore,evidenceContext:t.evidenceContext}),r=Ut(n);return{...e,confidence:n.confidence,matchScore:n.score,notes:Array.from(new Set([...e.notes,r.summary,...r.escalationReasons])).slice(0,10),intelligence:{...r,competitorEvidence:t.competitorEvidence,wyrestormEvidence:t.wyrestormEvidence}}}catch{return{...e,notes:Array.from(new Set([...e.notes,`Product intelligence assessment unavailable; using deterministic score only.`])).slice(0,10)}}}function Gt(e){let t=f({sku:e.sku,family:e.family,name:e.name,category:e.category,summary:e.summary,transport:e.transport,features:e.features,audio:e.audio,control:e.control});return{...p(d({sku:q(e.sku),name:G(e.name)||q(e.sku),family:G(e.family)||`Unknown`,category:t.category||G(e.category)||G(e.family)||`Uncategorized`,subcategory:t.label,status:`active`,summary:G(e.summary),inputs:Array.isArray(e.inputs)?e.inputs:[],outputs:Array.isArray(e.outputs)?e.outputs:[],control:Array.isArray(e.control)?e.control.map(e=>G(e)).filter(Boolean):[],audio:Array.isArray(e.audio)?e.audio.map(e=>G(e)).filter(Boolean):[],video:e.video,transport:G(e.transport),distance:typeof e.distanceMeters==`number`?{meters:e.distanceMeters}:void 0,features:Array.isArray(e.features)?e.features.map(e=>G(e)).filter(Boolean):[],notes:e.sourceUrl?`Source: ${e.sourceUrl}`:void 0})),brand:G(e.brand)||`Unknown`}}async function Kt(e){let t=await te(e);if(!t.record)return{lookup:t,records:[]};let n=Gt(t.record),r=Rt(n)[0];if(!r){let r=it({vendorType:`competitor`,brand:n.brand,sku:n.sku,name:n.name,sourceUrl:n.sourceUrl,summary:n.summary,inputs:n.inputs,outputs:n.outputs,features:n.features,control:n.control,transport:n.transport,audio:n.audio,video:n.video}),i=at(r,null),a=await Wt(Ht(n,zt(`lookup`,t.provenance),`Live lookup captured the competitor SKU, but no deterministic candidate cleared the automatic threshold.`),{query:e,baselineScore:24,evidenceContext:i,competitorEvidence:r});return{lookup:t,records:[t.warnings.length>0?{...a,notes:Array.from(new Set([...a.notes,...t.warnings])).slice(0,10)}:a]}}let i=Bt(n,r,zt(`lookup`,t.provenance)),a=it({vendorType:`competitor`,brand:n.brand,sku:n.sku,name:n.name,sourceUrl:n.sourceUrl,summary:n.summary,inputs:n.inputs,outputs:n.outputs,features:n.features,control:n.control,transport:n.transport,audio:n.audio,video:n.video}),o=it({vendorType:`wyrestorm`,brand:`WyreStorm`,sku:r.product.sku,name:r.product.name,sourceUrl:r.product.sourceUrl,summary:r.product.summary,inputs:r.product.inputs,outputs:r.product.outputs,features:r.product.features,control:r.product.control,transport:r.product.transport,audio:r.product.audio,video:r.product.video}),s=at(a,o),c=await Wt(i,{query:e,baselineScore:r.score,evidenceContext:s,competitorEvidence:a,wyrestormEvidence:o});return{lookup:t,records:[t.warnings.length>0?{...c,notes:Array.from(new Set([...c.notes,...t.warnings])).slice(0,10)}:c]}}function qt(e,t){return re(e,t)}function J(e,t){return{title:e,kind:`training`,to:t}}var Y=J(`Training Hub`,`/app/tools/training`),X=J(`Guided Project`,`/app/tools/discovery`),Jt=J(`Product Catalog`,`/app/tools/catalog`),Yt=J(`Competitor Compare`,`/app/tools/compare`),Xt=J(`Product Intelligence`,`/app/tools/product-intelligence`),Zt=J(`Video Wall Planner`,`/app/tools/video-wall`),Qt=J(`Proposal Builder`,`/app/tools/proposal`),$t=[{id:`wyrestorm-positioning`,title:`Positioning WyreStorm`,modes:[`ask`,`project-check`],keywords:[`position wyrestorm`,`positioning wyrestorm`,`larger av brands`,`larger brands`,`against larger brands`,`against bigger brands`,`why wyrestorm`,`differentiate wyrestorm`],opening:`Position WyreStorm as a commercially practical AV platform: strong on HDMI, HDBaseT, AVoIP, collaboration, and deployment speed rather than a heavyweight control-first ecosystem.`,points:[`Lead with application fit and workflow clarity: meeting rooms, presentation spaces, extension, switching, AVoIP, video wall, and BYOD/BYOM use cases.`,`Compare on topology choice, usability, deployment simplicity, and commercial value instead of only brand scale.`,`If the customer is standards-led around a third-party control ecosystem, qualify integration expectations early instead of overselling feature parity.`],qualify:[`Is this an outcome-led room sale, an enterprise standardisation project, or a competitor replacement?`,`How important are native control, fleet management, and incumbent ecosystem requirements?`,`Is the customer optimising for value and speed, or for deep standardisation around another platform?`],sources:[Yt,Xt,Y]},{id:`discovery-qualification`,title:`Discovery and qualification`,keywords:[`discovery answers`,`what should i ask`,`discovery call`,`qualify an av opportunity`,`missing information`,`before choosing wyrestorm`,`what matters most`,`sales call`],opening:`Before choosing products, capture the commercial objective, room workflow, physical topology, and control expectations. That usually narrows the correct WyreStorm family faster than jumping straight into SKUs.`,points:[`Get room type, source count, output count, transport distance, and whether the project is point-to-point, switched, mirrored, distributed, or video-wall led.`,`Confirm interface types at both ends: HDMI, USB-C, HDBaseT, AVoIP, USB, audio breakout, control, and any passthrough requirements.`,`Qualify user workflow early: presenter-led, BYOD, hybrid meeting, signage, operator control, or multi-zone routing.`],qualify:[`What is the intended room or application?`,`How many active sources and destinations are involved?`,`What are the longest transport distances and the installed cable types?`,`Are USB, audio, control, wireless casting, or future expansion part of the requirement?`],familyHints:[`Apollo`,`HDBaseT`,`AVoIP`,`Matrix`,`Video Wall`],sources:[X,Y,Xt]},{id:`apollo-vs-hdbaset`,title:`Apollo vs HDBaseT`,modes:[`ask`,`project-check`],keywords:[`apollo instead of hdbaset`,`apollo vs hdbaset`,`usb-c byod`,`byod meeting room`,`wireless presentation`,`small meeting room`,`teams room`],opening:`Use Apollo when presentation, BYOD/BYOM, USB-C, or wireless collaboration is central. Use HDBaseT when the job is primarily reliable point-to-point transport or room switching over category cable.`,points:[`Apollo is stronger when the user workflow matters as much as the transport: USB-C ingest, wireless casting, collaboration peripherals, and room-system behaviour.`,`HDBaseT is often the cleaner choice for deterministic extension and switching where the requirement is mainly HDMI plus known transport distance.`,`If the room is presenter-led with USB devices, wireless guests, or BYOM, Apollo usually deserves first consideration before a pure extender path.`],qualify:[`Is the room presentation-led or transport-led?`,`Do users need wireless casting, USB-C ingest, or BYOM access to room USB peripherals?`,`Is the transport one room/one display, or is there a broader switched workflow?`],familyHints:[`Apollo`,`HDBaseT`],sources:[X,Y,Jt]},{id:`hdbaset-vs-avoip`,title:`HDBaseT vs AVoIP`,keywords:[`hdbaset vs avoip`,`compare hdbaset and avoip`,`hdbaset and avoip`,`choose between hdbaset and avoip`,`networkhd`,`distributed av`,`ip stream`,`ip/stream`,`managed network`],opening:`Choose HDBaseT when the system is mainly point-to-point or small switched AV over known cable runs. Choose AVoIP when scale, flexibility, multicast distribution, or network-led architecture is the real driver.`,points:[`HDBaseT suits fixed-room transport and predictable extension where the signal path is closed and distances are known.`,`AVoIP suits systems that need easy scaling, many endpoints, multicast, video wall, or routing over existing managed network infrastructure.`,`The decision is not just distance. It is also about scalability, network readiness, latency expectations, and how often routing patterns will change.`],qualify:[`Is the project point-to-point, matrix-like, or many-to-many?`,`Is there a managed network available and acceptable for AV traffic?`,`Are low latency, multicast, video wall, or large endpoint counts required?`],familyHints:[`HDBaseT`,`AVoIP`],sources:[Y,X,Zt]},{id:`presentation-vs-matrix`,title:`Presentation switcher vs matrix switch`,modes:[`ask`,`project-check`],keywords:[`presentation switcher`,`matrix switch`,`switch between devices`,`switching workflow`,`multi-format inputs`,`usb-c presentation`,`matrix outputs`],opening:`First decide whether the room is presentation-led or routing-led. Presentation switchers prioritise user workflow and multi-format room integration. Matrix switchers prioritise scalable HDMI routing.`,points:[`Presentation switchers usually need multi-format inputs, USB-C, relays, control ports, audio breakout, Ethernet, wireless casting, AirPlay, Miracast, or MST-aware behaviour.`,`Matrix systems are more likely to stay HDMI-led on the input side and focus on output topology such as HDMI or HDBaseT class A/class B distribution.`,`If the customer talks about presenters, collaboration, USB-C laptops, or wireless guests, start with presentation workflow before matrix size.`],qualify:[`Is the primary problem user presentation workflow or source routing scale?`,`Do the inputs need to be multi-format, especially USB-C?`,`Are the outputs local HDMI, HDBaseT, or distributed elsewhere in the building?`],familyHints:[`Apollo`,`Matrix`,`HDBaseT`],sources:[X,Jt,Y]},{id:`extender-design`,title:`Extender design and distance`,modes:[`ask`,`project-check`],keywords:[`extend a signal`,`extender`,`longest cable run`,`cable run distance`,`cat6`,`cat6a`,`cat7`,`poh`,`ir passthrough`,`ethernet passthrough`,`usb 3.0 support`,`kvm usb 2.0`],opening:`For HDMI extension, practical reach depends on signal format, cable grade, and whether USB, control, audio breakout, power, or passthrough features are part of the transport requirement.`,points:[`Higher bandwidth formats such as 4K 60Hz 4:4:4, 5K, and 8K reduce practical distance on copper category cable compared with 1080p or lighter 4K envelopes.`,`Capture the distance band, cable type, and route complexity before you shortlist extenders. A simple same-room run behaves very differently from patched or cross-building infrastructure.`,`Treat USB/KVM, audio breakout, RS-232, IR, Ethernet passthrough, and one-way/two-way PoH as design-critical capabilities, not as afterthought add-ons.`],qualify:[`What signal formats must be supported: 1080p, 4K30 4:4:4, 4K60 4:4:4, 5K, or 8K?`,`What cable type is installed: Cat5e, Cat6, Cat6A, Cat7, or fibre?`,`Are USB, audio breakout, RS-232, IR, Ethernet passthrough, or PoH required?`],familyHints:[`HDBaseT`,`USB Extension`],sources:[X,Y,Jt]},{id:`duplicate-distribution`,title:`Duplicate signal and HDMI distribution`,modes:[`ask`,`project-check`],keywords:[`duplicate a signal`,`splitter`,`distribution amplifier`,`mirror one source`,`mirrored outputs`,`scaled output`,`mixed resolution output`],opening:`For duplicate-signal workflows, assume HDMI in and HDMI out first. Then decide whether the outputs are local copper, HAOC optical HDMI, or far enough away to justify a separate HDMI extender line item.`,points:[`Copper HDMI leads are usually 0.5m, 1m, 2m, 3m, 5m, or 10m. HAOC optical HDMI is the more natural step for 10m, 15m, 20m, or 30m output runs.`,`Cable capability matters. Qualify 5Gb, 10Gb, or 18Gb performance, plus ALLM, eARC, HDR, and multichannel audio when those features matter to the customer workflow.`,`Cable counts scale with the I/O count. A 1x2 splitter usually drives three HDMI runs total, a 1x4 drives five, and a 1x8 drives nine before accessories and contingencies.`],qualify:[`How many mirrored outputs are needed?`,`Are the outputs mixed-resolution or scaled, or are they true like-for-like mirrors?`,`Are the outputs local, long-HDMI, HAOC, or remote enough to need extender kits?`],familyHints:[`Matrix`,`HDBaseT`],sources:[X,Jt,Qt]},{id:`hdmi-cabling`,title:`HDMI cabling and HAOC`,keywords:[`hdmi cable`,`haoc`,`hdmi over fibre`,`optical hdmi`,`earc`,`allm`,`hdr`,`multichannel audio`,`18gb`,`10gb`,`5gb`],opening:`Do not treat HDMI cables as interchangeable. Length, bandwidth, and feature support directly affect whether the path will carry the required signal reliably.`,points:[`Short copper runs are fine for rack or local interconnects, but longer runs need a deliberate choice between certified copper, HAOC optical HDMI, or an extender architecture.`,`Match the cable to the signal envelope. 5Gb, 10Gb, and 18Gb capability, plus HDR, ALLM, eARC, and multichannel audio, should all be qualified when relevant.`,`HAOC is the normal term for active hybrid optical HDMI leads. It is useful when you need longer direct HDMI runs without switching to an extender topology.`],qualify:[`What is the actual source bandwidth and feature set?`,`Is the run local copper, long copper, or better served by HAOC or an extender?`,`Are the HDMI leads part of the core offer, or should Guru suggest them as add-on sales lines?`],sources:[Jt,Qt,Y]},{id:`signal-fundamentals`,title:`Signal fundamentals`,modes:[`ask`,`resources`,`project-check`],keywords:[`hdcp`,`edid`,`scaling`,`signal path`,`av fundamentals`,`explain hdcp`,`explain edid`,`explain scaling`],opening:`When an AV system behaves unpredictably, EDID, HDCP, and scaling are often the first three fundamentals to check because they determine what format the source sends and what the display path will accept.`,points:[`EDID is the capability conversation. It tells the source what resolutions and audio formats the downstream chain claims to support.`,`HDCP is the content-protection conversation. A mismatch anywhere in the chain can block or interrupt video.`,`Scaling is the format-conversion tool that helps unlike sources and displays coexist when native timings do not line up cleanly.`],qualify:[`Is the issue a design-choice question or a live fault symptom?`,`Are all sources and displays expected to run the same signal envelope?`,`Is there any HDCP-protected content or mixed-resolution display estate involved?`],sources:[Y,X]},{id:`troubleshooting-hdmi`,title:`Troubleshooting HDMI sync and image faults`,modes:[`ask`,`project-check`],keywords:[`hdmi sync`,`intermittent sync`,`no signal`,`flicker`,`drop out`,`dropout`,`hdcp fault`,`edid problem`,`video is missing`],opening:`For HDMI image faults, work from physical layer to handshake to format. Most recurring failures are cable integrity, HDCP/EDID negotiation, or an unsupported signal envelope for the route.`,points:[`Verify the cable path first: distance, connector quality, patch points, cable grade, and whether the current signal exceeds what the link can realistically carry.`,`Then check the handshake layer: EDID policy, HDCP behaviour, and whether a scaler or switch is forcing a timing that one endpoint rejects.`,`Finally check topology-specific issues such as extender mode, matrix routing, sink power-up order, or display-side deep-color/HDR settings.`],qualify:[`Is the fault constant or intermittent?`,`Does it happen on one source, one display, or one route only?`,`What resolution, refresh, and colour format is actually being transported?`],sources:[Y,Xt]},{id:`troubleshooting-usb`,title:`Troubleshooting USB and KVM`,modes:[`ask`,`project-check`],keywords:[`usb problem`,`usb devices fail`,`usb disconnect`,`camera not detected`,`mic not detected`,`kvm issue`,`usb extension`,`enumeration`],opening:`USB faults usually come down to host/device role confusion, unsupported USB bandwidth over the chosen transport, or devices reconnecting unpredictably across the path.`,points:[`Confirm the USB role model first: which endpoint is the host, which devices must enumerate remotely, and whether the path needs USB 2.0 only or high-speed USB 3.0 support.`,`Check bandwidth and topology. Cameras, speakerphones, and storage-class devices can behave very differently over the same transport.`,`If the system is KVM-led, validate that USB switching behaviour matches the video switching behaviour the user actually expects.`],qualify:[`Is the workflow basic USB 2.0 peripheral sharing or high-speed USB 3.0 transport?`,`Are devices failing to enumerate, dropping out, or staying connected to the wrong host?`,`Does the USB route follow fixed extension, matrix switching, or network transport?`],sources:[Y,X,Xt]},{id:`video-wall-planning`,title:`Video wall planning`,keywords:[`video wall`,`videowall`,`display canvas`,`processor strategy`,`multiview`,`lcd wall`,`led wall`],opening:`Video-wall projects should start with canvas strategy and processor role, not with generic room prompts. The real design variables are layout, source composition, control method, and content behaviour.`,points:[`Confirm wall geometry, panel or LED technology, bezel/canvas behaviour, and whether the user needs presets, windows, or operator-driven multiview changes.`,`Separate source transport from wall processing. The transport can be HDMI, HDBaseT, or AVoIP, but the processor strategy determines the wall experience.`,`Capture control expectations early because many video-wall jobs become operational workflow projects rather than simple AV transport jobs.`],qualify:[`Is this LCD, LED, or mixed-display architecture?`,`How many simultaneous windows, presets, or operator layouts are required?`,`Is the content local, switched, or distributed over the network?`],familyHints:[`Video Wall`,`AVoIP`],sources:[Zt,X,Y]}];function en(e){return e.toLowerCase().replace(/[^a-z0-9\s/-]/g,` `).replace(/\s+/g,` `).trim()}function tn(e){return new Set(en(e).split(` `).map(e=>e.trim()).filter(e=>e.length>=3))}function nn(e,t,n){let r=en(n);if(!r)return 0;if(e.includes(r))return r.includes(` `)?10:5;let i=r.split(` `).filter(e=>e.length>=3);return i.length>1&&i.every(e=>t.has(e))?4:i.length===1&&t.has(i[0])?2:0}function rn(e){let t=new Set,n=[];for(let r of e){let e=`${r.kind}|${r.to||r.url||``}|${r.title}`;t.has(e)||(t.add(e),n.push(r))}return n}function an(e){return e>=24?`high`:e>=12?`medium`:`low`}function on(){return{score:0,confidence:`low`,text:``,familyHints:[],matchedTopicIds:[],sources:[]}}function sn(e,t){let n=en(e),r=tn(e);if(!n)return on();let i=$t.map(e=>{let i=0;(!e.modes||e.modes.includes(t))&&(i+=3);for(let t of e.keywords)i+=nn(n,r,t);return{topic:e,score:i}}).filter(e=>e.score>=8).sort((e,t)=>t.score-e.score);if(i.length===0)return on();let a=i[0].topic,o=i[0].score,s=i[1]&&i[1].score>=o*.72?i[1].topic:null,c=[a.opening];a.points.length>0&&(c.push(``,`What matters most:`),c.push(...a.points.map(e=>`- ${e}`))),s&&(c.push(``,`Also consider: ${s.opening}`),c.push(...s.points.slice(0,2).map(e=>`- ${e}`)));let l=[...a.qualify??[],...s?.qualify??[]].slice(0,4);l.length>0&&(c.push(``,`Qualify before you commit:`),c.push(...l.map(e=>`- ${e}`)));let u=Array.from(new Set([...a.familyHints??[],...s?.familyHints??[]]));return u.length>0&&c.push(``,`Likely WyreStorm direction: ${u.join(`, `)}.`),{score:o,confidence:an(o),text:c.join(`
`),familyHints:u,matchedTopicIds:s?[a.id,s.id]:[a.id],sources:rn([...a.sources??[],...s?.sources??[]])}}var cn=null;function ln(e){return e===`high`?3:e===`medium`?2:1}function un(e,t){return ln(e)>=ln(t)?e:t}function dn(e,t=18){let n=[],r=new Set;for(let i of e){let e=i.trim();if(!e)continue;let a=e.toLowerCase();if(!r.has(a)&&(r.add(a),n.push(e),n.length>=t))break}return n}function fn(e){return e.replace(/<[^>]+>/g,` `).replace(/!\[[^\]]*]\([^)]*\)/g,` `).replace(/\[([^\]]+)\]\([^)]*\)/g,`$1`).replace(/`{1,3}/g,``).replace(/[*_>#]+/g,` `).replace(/&nbsp;/gi,` `).replace(/\r/g,``).replace(/\n+/g,` `).replace(/\s+/g,` `).trim()}function pn(e,t=2){let n=fn(e);return n?n.split(/(?<=[.!?])\s+/).map(e=>e.trim()).filter(Boolean).slice(0,t).join(` `):``}function mn(e,t,n=3){let r=e.replace(/\r/g,``).split(`
`).map(e=>e.trim()).filter(Boolean).filter(e=>/^[-*]\s+/.test(e)||/^\d+\.\s+/.test(e)||/^#{2,4}\s+/.test(e)).map(e=>fn(e.replace(/^[-*]\s+/,``).replace(/^\d+\.\s+/,``).replace(/^#{2,4}\s+/,``))).filter(Boolean);return r.length>0?dn(r,n):dn(fn(t).split(/(?<=[.!?])\s+/).map(e=>e.trim()).filter(Boolean),n)}function hn(...e){let t=e.map(e=>fn(e)).filter(Boolean),n=dn(t.flatMap(e=>Array.from(tn(e))),28);return dn([...t,...n],32)}function gn(e){let t=e.toLowerCase();if(t.includes(`troubleshoot`)||t.includes(`site survey`)||t.includes(`field guide`)||t.includes(`sales inquiry`)||t.includes(`bant`))return[`project-check`,`ask`];if(t.includes(`signals`)||t.includes(`terminology`)||t.includes(`network`)||t.includes(`hdbaset`)||t.includes(`avoip`)||t.includes(`datasheet`)||t.includes(`video wall`))return[`resources`,`ask`,`project-check`]}function _n(e){return e.flatMap(e=>e.contentPages.map((t,n)=>({id:`training:${e.id}:${n}`,title:`${e.title}: ${t.title}`,body:pn(t.content,3),raw:t.content,keywords:hn(e.title,t.title,t.content,t.asset?.title||``),modes:gn(`${e.title} ${t.title}`),sources:[Y]})))}function vn(e){return e.split(/\n##\s+/).map((e,t)=>{let n=t===0?e.replace(/^#.*\n?/,``).trim():e.trim();if(!n)return null;let[r,...i]=n.split(`
`);return{title:fn(r||``),body:i.join(`
`).trim()}}).filter(e=>!!(e?.title&&e.body))}function yn(e){let t=vn(e),n=[];return t.forEach((e,t)=>{n.push({id:`tech:${t}`,title:e.title,body:pn(e.body,3),raw:e.body,keywords:hn(e.title,e.body),modes:gn(e.title),sources:[Y]}),Array.from(e.body.matchAll(/-\s+\*\*([^*]+)\*\*:?\s*([\s\S]*?)(?=\n-\s+\*\*|\n##\s+|$)/g)).forEach((r,i)=>{let a=fn(r[1]||``),o=(r[2]||``).trim();!a||!o||n.push({id:`tech:${t}:bullet:${i}`,title:`${e.title}: ${a}`,body:pn(o,3),raw:o,keywords:hn(e.title,a,o),modes:gn(`${e.title} ${a}`),sources:[Y]})})}),n}async function bn(){if(cn)return cn;let[{TRAINING_MODULES:e},{TECHNICAL_DATABASE:t}]=await Promise.all([y(()=>import(`./trainingContent-BNXlgUjE.js`),[]),y(()=>import(`./technicalDatabase-BFn8Wz8V.js`),[])]);return cn=[..._n(e),...yn(t)],cn}function xn(e,t,n,r){let i=0;(!e.modes||e.modes.includes(r))&&(i+=3),i+=nn(t,n,e.title)*2;for(let r of e.keywords)i+=nn(t,n,r);let a=e.keywords.filter(e=>n.has(en(e))).length;return i+=Math.min(12,a*2),i}async function Sn(e,t){let n=en(e),r=tn(e);if(!n)return on();let i=(await bn()).map(e=>({entry:e,score:xn(e,n,r,t)})).filter(e=>e.score>=12).sort((e,t)=>t.score-e.score).slice(0,3);if(i.length===0)return on();let[a,o]=i,s=mn(a.entry.raw,a.entry.body,3),c=[`Reference guidance from ${a.entry.title}: ${a.entry.body}`];if(s.length>0&&(c.push(``,`Useful reference points:`),c.push(...s.map(e=>`- ${e}`))),o&&o.score>=a.score*.8){c.push(``,`Related reference: ${o.entry.title}.`);let e=mn(o.entry.raw,o.entry.body,2);c.push(...e.map(e=>`- ${e}`))}return{score:a.score,confidence:an(a.score),text:c.join(`
`),familyHints:[],matchedTopicIds:i.map(e=>e.entry.id),sources:rn(i.flatMap(e=>e.entry.sources))}}function Cn(e,t){if(!e.text)return t;if(!t.text)return e;let n=t.score>=e.score*.78||e.confidence===`low`?`${e.text}\n\nReference detail:\n${t.text}`:e.text;return{score:Math.max(e.score,t.score),confidence:un(e.confidence,t.confidence),text:n,familyHints:dn([...e.familyHints,...t.familyHints]),matchedTopicIds:dn([...e.matchedTopicIds,...t.matchedTopicIds],10),sources:rn([...e.sources,...t.sources])}}async function wn(e,t){return Cn(sn(e,t),await Sn(e,t))}var Tn=[`crestron`,`extron`,`atlona`,`kramer`,`lightware`,`blustream`,`zeevee`];function Z(e){return String(e??``).trim()}function En(e){return Z(e).length>0}function Dn(e){return Z(e).toUpperCase()}function On(e){return e===`High`?`high`:e===`Medium`?`medium`:`low`}function kn(e){let t=new Set,n=[];for(let r of e){let e=`${r.kind}|${r.to||r.url||``}|${r.title}`;t.has(e)||(t.add(e),n.push(r))}return n}function An(e){return e.map(e=>({title:e.label,kind:`training`,to:e.to}))}function jn(e){let t=e.toLowerCase();return t.includes(`competitor`)||t.includes(`replacement`)||t.includes(`cross-reference`)||Tn.some(e=>t.includes(e))?!0:/[a-z0-9]+[-_][a-z0-9-]+/i.test(e)&&/\b(compare|alternative|equivalent|cross-reference|cross reference|replace|replacement|versus|vs)\b/i.test(t)}function Mn(e){let t=e.toLowerCase(),n=[{title:`Product Intelligence`,kind:`training`,to:`/app/tools/product-intelligence`}];return(t.includes(`video wall`)||t.includes(`videowall`)||t.includes(`led`)||t.includes(`lcd`))&&n.push({title:`Video Wall Planner`,kind:`training`,to:`/app/tools/video-wall`}),(t.includes(`proposal`)||t.includes(`bom`))&&n.push({title:`Proposal Builder`,kind:`training`,to:`/app/tools/proposal`}),(t.includes(`price`)||t.includes(`pricing`))&&n.push({title:`Product Catalog`,kind:`training`,to:`/app/tools/catalog`}),jn(e)&&n.push({title:`Competitor Compare`,kind:`training`,to:`/app/tools/compare`}),n}function Nn(e){let t=[e.wyrestormVerified===!1?`No verified WyreStorm catalog SKU is currently confirmed. Manual review is required.`:`Closest verified WyreStorm SKU: ${e.wyrestormSku}${e.wyrestormName?` (${e.wyrestormName})`:``} (${e.wyrestormCategory}).`,`Confidence: ${e.confidence}${typeof e.matchScore==`number`?` (${e.matchScore}/100)`:``}.`,e.rationale];return e.ioComparison&&t.push(`I/O alignment: ${e.ioComparison}.`),e.intelligence?.escalationRequired&&t.push(`Escalation required: ${e.intelligence.summary}`),t.filter(Boolean).join(`
`)}function Pn(e,t){return t===`project-check`?`${e}\n\nAdvisor note: validate I/O counts, distance limits, control scope, and user workflow before final recommendation.`:e}function Fn(e){let t=[],n=new Set;for(let r of e){let e=Z(r.sku).toUpperCase();!e||n.has(e)||(n.add(e),t.push({sku:e,name:Z(r.name)||void 0,reason:Z(r.reason)||void 0}))}return t}function In(e){return Fn(e.filter(e=>Z(e.brand).toLowerCase().includes(`wyrestorm`)).map(e=>({sku:Z(e.sku),name:Z(e.summary),reason:`Matched from Guru product-intelligence guidance.`})))}function Ln(e){return e===`high`?3:e===`medium`?2:e===`low`?1:0}function Rn(...e){return e.reduce((e,t)=>Ln(t)>Ln(e)?t:e,void 0)??`low`}function zn(e){let t=e.toLowerCase(),n=/\bsku\b|\bmodel\b|\bfamily\b|\bproduct\b|\brecommend\b|\bsuggest\b|\bchoose\b|\bspecify\b/.test(t)||/\b(which|what)\b/.test(t)&&/\bsupport\b|\bsupports\b/.test(t)&&/\bswitcher\b|\bmatrix\b|\bextender\b|\bsplitter\b|\bpresentation\b|\bwireless\b/.test(t)||t.includes(`start with`)||t.includes(`which wyrestorm`),r=t.includes(`meeting room`)||t.includes(`boardroom`)||t.includes(`usb-c`)||t.includes(`byod`)||t.includes(`byom`),i=/\bneed\b|\blooking for\b|\bquote\b|\bproposal\b|\bshortlist\b/.test(t)&&/\bapollo\b|\bhdbaset\b|\bavoip\b|\bnetworkhd\b|\bmatrix\b|\bswitcher\b|\bsplitter\b|\bextender\b|\bvideo wall\b/.test(t);return n||r||i}function Bn(e,t,n){return t===`project-check`&&n!==`low`?!0:n!==`low`&&zn(e)}function Vn(e){let t=e.toLowerCase();return/\b(room|workflow|design|project|switch|switcher|matrix|extender|hdbaset|avoip|video wall|family|fit|recommend)\b/.test(t)}function Hn(e,t){if(t===`project-check`)return!0;let n=e.toLowerCase();return zn(e)||/\b(start with|start|family|direction|fit|recommend|recommendation|best option|best fit|what should i use|what family should i start with)\b/.test(n)}function Un(e){return[e.brand,e.sku,e.name,e.family,e.group,e.category,e.subcategory,e.summary,...e.features??[],...e.tags??[],e.notes].map(e=>Z(e).toLowerCase()).filter(Boolean).join(` `)}function Wn(e){let t=e.toLowerCase();if(!(/\b(which|what)\b/.test(t)&&/\bsupport\b|\bsupports\b/.test(t)))return null;let n=t.includes(`presentation switcher`)||t.includes(`presentation switchers`)?`presentation-switcher`:null,r=t.includes(`airplay`)?`airplay`:t.includes(`miracast`)?`miracast`:t.includes(`wireless casting`)||t.includes(`wireless presentation`)?`wireless-casting`:null;return!n||!r?null:{category:n,capability:r}}function Gn(e,t){let n=Un(e),r=n.includes(`presentation switcher`)||n.includes(`switcher`)&&n.includes(`presentation`);return t.category===`presentation-switcher`&&!r?!1:t.capability===`airplay`?n.includes(`airplay`)||n.includes(`wireless casting`)||Dn(e.sku).endsWith(`-W`):t.capability===`miracast`?n.includes(`miracast`)||n.includes(`wireless casting`)||Dn(e.sku).endsWith(`-W`):t.capability===`wireless-casting`?n.includes(`wireless casting`)||n.includes(`airplay`)||n.includes(`miracast`)||Dn(e.sku).endsWith(`-W`):!1}function Kn(e,t){let n=Wn(e);if(!n)return null;let r=t.filter(e=>Gn(e,n)).slice(0,4);if(r.length===0)return null;let i=r.map(e=>e.sku).join(`, `),a=[`WyreStorm presentation switchers with ${n.capability===`wireless-casting`?`wireless casting`:n.capability} support: ${i}.`,"In this dataset, the wireless `-W` variants are the native AirPlay / Miracast models."];return n.capability===`airplay`&&a.push(`AirPlay works when the Apple device and switcher are on the same IP subnet.`),{text:a.join(`
`),confidence:r.length>=2?`high`:`medium`,suggestedSkus:Fn(r.map(e=>({sku:e.sku,name:e.name,reason:`Matches the requested ${n.capability} capability.`}))),sources:kn([{title:`Product Intelligence`,kind:`training`,to:`/app/tools/product-intelligence`},{title:`Product Catalog`,kind:`training`,to:`/app/tools/catalog`}])}}function qn(e,t){if(!t.discovery)return null;let n=ie(t.discovery);if(!(t.mode===`project-check`||zn(e)||Vn(e)))return null;let r=Hn(e,t.mode),i=n.whyThisAnswer.slice(0,r?2:1),a=n.whatsMissing.slice(0,r?3:2),o=[r?`Likely direction: ${n.advice.focusCategory}, led by ${n.primaryFamily} (${n.confidenceLabel} confidence).`:`Current project direction: ${n.advice.focusCategory}, led by ${n.primaryFamily}.`];return i.length>0?(o.push(`Why this answer:`),o.push(...i.map(e=>`- ${e}`))):En(n.advice.workflowSummary)&&o.push(n.advice.workflowSummary),a.length>0&&(o.push(r?`What's still missing:`:`Still worth confirming:`),o.push(...a.map(e=>`- ${e}`))),{text:o.filter(Boolean).join(`
`),confidence:n.confidenceLabel,explanation:{headline:r?`${n.primaryFamily} is the lead WyreStorm direction for this brief.`:`Current lead family: ${n.primaryFamily}.`,why:i,whatsMissing:a,handoffItems:n.missingItems.slice(0,r?3:2).map(e=>({prompt:e.prompt,label:e.label,step:e.step,questionId:e.questionId}))},sources:[{title:`Guided Project`,kind:`training`,to:`/app/tools/discovery`},{title:`Product Catalog`,kind:`training`,to:`/app/tools/catalog`}]}}async function Jn(e,t){let n=Z(e);if(!n)return{text:`Ask a question to get started.`,confidence:`low`};let r=await wn(n,t.mode),i=qn(n,t);if(t.mode===`resources`)return r.text?{text:r.text,confidence:r.confidence,sources:kn([{title:`Training Hub`,kind:`training`,to:`/app/tools/training`},...r.sources])}:{text:`Use Product Intelligence first, then run Competitor Compare for replacement positioning, and finally validate any uncertainty through diagnostics.`,confidence:`high`,sources:[{title:`Product Intelligence`,kind:`training`,to:`/app/tools/product-intelligence`},{title:`Competitor Compare`,kind:`training`,to:`/app/tools/compare`},{title:`Lookup Diagnostics`,kind:`training`,to:`/app/tools/competitor-lookup-diagnostics`}]};let a=Mn(n);if(jn(n)){let e=(await Kt(n)).records[0];if(!e)return{text:Pn(`No competitor record was returned for that query. Provide brand + model (for example, 'Crestron DM-NVX-360') and rerun compare.`,t.mode),confidence:`low`,sources:kn([...a,{title:`Lookup Diagnostics`,kind:`training`,to:`/app/tools/competitor-lookup-diagnostics`}])};let r=e.intelligence?An(e.intelligence.supportActions):[];return{text:Pn(Nn(e),t.mode),confidence:e.intelligence?On(e.intelligence.confidence):On(e.confidence),sources:kn([...a,...r]),suggestedSkus:e.wyrestormVerified===!1?[]:Fn([{sku:e.wyrestormSku,name:e.wyrestormName||e.wyrestormCategory,reason:`Closest verified replacement for ${e.brand} ${e.competitorSku}.`}])}}let o=await z(n),s=o.records.slice(0,3),c=Kn(n,o.records);if(c)return c;let l=On(o.confidence),u=Bn(n,t.mode,l),d=u?In(s):[],f=!!i&&Hn(n,t.mode),p=!r.text||u||t.mode===`project-check`;if(!r.text&&s.length===0){let e=An(o.supportActions);return i?{text:Pn(i.text,t.mode),confidence:i.confidence,explanation:i.explanation,sources:kn([...a,...i.sources??[],...e]),suggestedSkus:[]}:{text:Pn([`No strong product matches were found for this question.`,`Add the intended room type, SKU, or product family to improve answer quality.`,o.escalationRequired?`Escalation: use Product Intelligence and diagnostics to capture missing evidence before customer commitment.`:``].filter(Boolean).join(`
`),t.mode),confidence:On(o.confidence),sources:kn([...a,...e]),suggestedSkus:[]}}let m=[];i&&m.push(i.text),r.text&&(!f||!i)&&(m.length>0&&m.push(``),m.push(r.text)),u&&s.length>0?(m.length>0&&m.push(``),m.push(`Best product starting points (${o.confidence} confidence, ${o.score}/100):`),m.push(...s.map(e=>`- ${e.brand} ${e.sku}: ${e.summary}`))):!r.text&&s.length>0&&(m.push(`Top product-intelligence matches (${o.confidence} confidence, ${o.score}/100):`),m.push(...s.map(e=>`- ${e.brand} ${e.sku}: ${e.summary}`))),o.escalationRequired&&p&&!i&&(r.text&&s.length===0?(t.mode===`project-check`||zn(n))&&(m.push(``),m.push(`To tighten this into exact product guidance:`),m.push(`- Add room type, source count, display/output count, transport distance, and control or USB requirements.`),m.push(`- If this is a competitor replacement, include brand and model so Guru can compare against verified records.`)):(m.push(``),m.push(r.text?`Checks before customer commitment:`:`Escalation required:`),m.push(...o.escalationReasons.map(e=>`- ${e}`))));let h=o.escalationRequired?An(o.supportActions):[];return{text:Pn(m.join(`
`),t.mode),confidence:Rn(r.confidence,l),explanation:i?.explanation,sources:kn([...a,...i?.sources??[],...r.sources,...h]),suggestedSkus:d}}var Yn=`Silver`,Xn=[{category:`Services`,patterns:[/\bservice\b/i,/\btraining\b/i,/\bcommission(?:ing)?\b/i,/\bprogram(?:ming)?\b/i,/\bsupport\b/i,/\binstall(?:ation)?\b/i,/\bsetup\b/i,/\blabou?r\b/i]},{category:`Cabling`,patterns:[/\bcable\b/i,/\bfiber\b/i,/\bfibre\b/i,/\bhdmi\b/i,/\busb\b/i,/\bcat(?:5|6|7)\b/i,/\bpatch\b/i,/\blead\b/i,/\bcord\b/i]},{category:`Accessories`,patterns:[/\bmount\b/i,/\bbracket\b/i,/\badapter\b/i,/\baccessor(?:y|ies)\b/i,/\bpower supply\b/i,/\bpsu\b/i,/\bremote\b/i,/\bplate\b/i,/\brack\b/i,/\bkit\b/i]},{category:`Endpoints`,patterns:[/\bdecoder\b/i,/\bencoder\b/i,/\breceiver\b/i,/\btransmitter\b/i,/\btouch(?:panel)?\b/i,/\bpanel\b/i,/\bdisplay\b/i,/\bcamera\b/i,/\bwallplate\b/i,/\btx\b/i,/\brx\b/i]},{category:`Core`,patterns:[/\bswitch(?:er)?\b/i,/\bmatrix\b/i,/\bcontroller\b/i,/\bprocessor\b/i,/\bhub\b/i,/\bgateway\b/i,/\bamplifier\b/i,/\bserver\b/i,/\brouter\b/i]}];function Zn(e){return Math.round((Number.isFinite(e)?e:0)*100)/100}function Qn(e){let t=Number(e);return!Number.isFinite(t)||t<=0?1:Math.max(1,Math.round(t))}function $n(e){if(e===`Core`||e===`Endpoints`||e===`Cabling`||e===`Services`||e===`Accessories`||e===`Other`)return e}function er(e){let t=e.trim();if(t){for(let e of Xn)if(e.patterns.some(e=>e.test(t)))return e.category}}function tr(e,t){return{currency:e,value:Zn(t)}}function nr(e,t=`USD`){return e===`GBP`||e===`EUR`||e===`USD`||e===`OTHER`?e:t}function rr(e){return e===`Bronze`||e===`Silver`||e===`Gold`?e:e===`Dealer`?`Silver`:e===`Distributor`||e===`MSRP`?`Gold`:Yn}function ir(e){let t=$n(e.category),n=er([e.sku,e.description,e.notes].filter(Boolean).join(` `));return t&&t!==`Core`?t:n||(t??`Core`)}function ar(e){let t=rr(e.meta.priceTier),n=nr(e.meta.currency,`USD`);return{...e,meta:{...e.meta,currency:n,priceTier:t},lines:e.lines.map(e=>({...e,qty:Qn(e.qty),category:ir(e),tier:t,unitCost:tr(n,0),unitSell:tr(n,0)}))}}var or=`wingman_proposal_v2`,sr=`wingman_proposal_v1`;function cr(e){return`${or}:${e||u()||`default`}`}function lr(e){try{let t=window.localStorage.getItem(cr(e))??window.localStorage.getItem(sr);return t?ar(JSON.parse(t)):null}catch{return null}}function ur(e,t){try{window.localStorage.setItem(cr(t),JSON.stringify(e,null,2))}catch{}}function dr(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}function fr(e,t){try{let n=lr(t),r=n?.meta?.currency??`USD`,i=n??{meta:{projectName:`New Proposal`,currency:r,priceTier:`Silver`},lines:[]},a=e.source?`Added from ${e.source}`:``,o={id:dr(),sku:e.sku??``,description:e.name??``,qty:e.qty??1,category:ir({category:e.category,sku:e.sku??``,description:e.name??``,notes:a}),tier:i.meta.priceTier??`Silver`,unitCost:tr(r,0),unitSell:tr(r,0),notes:a};ur(ar({...i,lines:[o,...i.lines??[]]}),t)}catch{}}var Q=n(),pr=`wm_guru_workspace_v3`,mr=`wm_guru_history_v1`,hr=`wm_guru_panel_layout_v1`,gr=`wm_guru_panel_position_v1`,_r=`wm_guru_launcher_position_v1`,vr={width:448,height:580},yr={width:720,height:680},br=320,xr=392,$=6,Sr=46,Cr=8,wr={general:{id:`general`,label:`General AV advice`,subtitle:`Broad AV guidance, terminology, workflows and best practice.`,placeholder:`Ask a general AV question, for example: What should I consider when specifying a meeting room signal path?`,persona:`You are Guru, an AV industry assistant. Give clear, commercially useful advice in plain English. Focus on practical audiovisual guidance, signal flow, room design logic and product-category reasoning.`,quickAsks:[`Explain the difference between matrix switching, extension and AVoIP.`,`What should I ask during an AV discovery call?`,`How do I choose between HDBaseT and AVoIP?`,`What are the key design considerations for a boardroom AV system?`]},wyrestorm:{id:`wyrestorm`,label:`WyreStorm guidance`,subtitle:`WyreStorm-focused product and application support.`,placeholder:`Ask a WyreStorm-specific question, for example: Which WyreStorm family fits a small Teams room with USB-C BYOD?`,persona:`You are Guru, a WyreStorm-focused AV assistant. Prioritise WyreStorm product families, application fit and plain-English guidance. State assumptions clearly when exact product detail is missing.`,quickAsks:[`Which WyreStorm family best suits a small meeting room?`,`When should I recommend Apollo instead of HDBaseT?`,`How would you position WyreStorm against larger AV brands?`,`What discovery answers matter most before choosing WyreStorm products?`]},design:{id:`design`,label:`Design support`,subtitle:`Signal paths, room planning and system architecture advice.`,placeholder:`Describe the room, sources, displays and constraints, then ask for a design recommendation.`,persona:`You are Guru, an AV design assistant. Help structure signal paths, room layouts, extension methods, switching logic, USB transport, audio integration, control considerations and design risks.`,quickAsks:[`Propose a signal path for a boardroom with two displays and three sources.`,`What inputs do I need before designing a divisible training space?`,`How should I structure USB, video and control in a meeting room?`,`What are the typical pitfalls in AV system design?`]},troubleshooting:{id:`troubleshooting`,label:`Troubleshooting`,subtitle:`Fault-finding for signal, USB, audio and control problems.`,placeholder:`Describe the fault symptoms, what is connected, and what has already been tested.`,persona:`You are Guru, an AV troubleshooting assistant. Help isolate likely causes, suggest ordered checks and separate symptoms from root causes. Keep answers structured and practical.`,quickAsks:[`Help me troubleshoot intermittent HDMI sync issues.`,`Why might USB devices fail over extension?`,`What should I check when audio is missing but video is present?`,`Create a structured AV fault-finding checklist.`]},training:{id:`training`,label:`Training and explainers`,subtitle:`Learning support, sales coaching and concept explainers.`,placeholder:`Ask Guru to explain a concept, teach a workflow, or simplify a technical topic.`,persona:`You are Guru, an AV trainer and explainer. Teach clearly, keep the language simple, and connect technical concepts to real sales and design decisions.`,quickAsks:[`Explain HDCP, EDID and scaling in simple terms.`,`Teach me how to qualify an AV opportunity.`,`What are the core AV concepts a salesperson should understand?`,`Summarise AVoIP for a non-technical audience.`]}};function Tr(){try{let e=localStorage.getItem(pr);if(!e)return{mode:`general`,question:``,context:``};let t=JSON.parse(e);return{mode:t.mode??`general`,question:t.question??``,context:t.context??``}}catch{return{mode:`general`,question:``,context:``}}}function Er(e){try{localStorage.setItem(pr,JSON.stringify(e))}catch{}}function Dr(e){return`${mr}:${e??`global`}`}function Or(e){try{let t=localStorage.getItem(Dr(e));if(!t)return[];let n=JSON.parse(t);return Array.isArray(n)?n.slice(0,8):[]}catch{return[]}}function kr(e,t){try{localStorage.setItem(Dr(e),JSON.stringify(t.slice(0,8)))}catch{}}function Ar(){return`guru_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}function jr(e,t){let n=e.trim(),r=t.trim();return r?`${n||`Use the following context to answer the request.`}\n\nContext:\n${r}`:n}function Mr(e){try{return JSON.stringify(e?.discovery??null)}catch{return``}}function Nr(e){return e===`training`?`resources`:e===`design`||e===`troubleshooting`?`project-check`:`ask`}function Pr(e){return e?e===`high`?`High`:e===`medium`?`Medium`:`Low`:`Unknown`}function Fr(e){return e===`high`?3:e===`medium`?2:e===`low`?1:0}function Ir(e,t){if(!e)return`Updated from the latest Discovery inputs.`;let n=[],r=Pr(e.confidence),i=Pr(t.confidence);e.confidence!==t.confidence&&n.push(`Confidence moved ${r} -> ${i}.`);let a=e.explanation?.headline?.trim()??``,o=t.explanation?.headline?.trim()??``;a&&o&&a!==o&&n.push(`Lead direction updated to ${o}`);let s=e.explanation?.whatsMissing?.length??0,c=t.explanation?.whatsMissing?.length??0;return s!==c&&(c<s?n.push(`Missing inputs reduced ${s} -> ${c}.`):n.push(`Missing inputs changed ${s} -> ${c}.`)),n.length===0&&Fr(t.confidence)>Fr(e.confidence)&&n.push(`Confidence improved to ${i}.`),n.length>0?`Updated from the latest Discovery inputs. ${n.join(` `)}`:`Updated from the latest Discovery inputs.`}function Lr(e){if(!e?.suggestedSkus||e.suggestedSkus.length===0)return[];let t=new Set,n=[];for(let r of e.suggestedSkus){let e=String(r.sku??``).trim().toUpperCase();!e||t.has(e)||(t.add(e),n.push({sku:e,name:r.name?.trim()||void 0,reason:r.reason?.trim()||void 0}))}return n}function Rr(){try{let e=localStorage.getItem(hr);if(!e)return vr;let t=JSON.parse(e),n=Number(t.width),r=Number(t.height);return{width:Number.isFinite(n)&&n>=br?n:vr.width,height:Number.isFinite(r)&&r>=xr?r:vr.height}}catch{return vr}}function zr(e){try{localStorage.setItem(hr,JSON.stringify(e))}catch{}}function Br(e){return typeof window>`u`?{left:16,top:84}:{left:window.innerWidth-e.width-16,top:window.innerHeight-e.height-84}}function Vr(e){return typeof window>`u`?{left:32,top:96}:{left:Math.max($,Math.round((window.innerWidth-e.width)/2)),top:Math.max(92,Math.round((window.innerHeight-e.height)/2))}}function Hr(e){try{let t=Br(e),n=localStorage.getItem(gr);if(!n)return t;let r=JSON.parse(n),i=Number(r.left),a=Number(r.top);return{left:Number.isFinite(i)?i:t.left,top:Number.isFinite(a)?a:t.top}}catch{return Br(e)}}function Ur(e){try{localStorage.setItem(gr,JSON.stringify(e))}catch{}}function Wr(){return typeof window>`u`?{left:16,top:16}:{left:window.innerWidth-Sr-16,top:window.innerHeight-Sr-16}}function Gr(e){if(typeof window>`u`)return e;let t=Math.max(Cr,window.innerWidth-Sr-Cr),n=Math.max(Cr,window.innerHeight-Sr-Cr);return{left:Math.min(t,Math.max(Cr,e.left)),top:Math.min(n,Math.max(Cr,e.top))}}function Kr(){try{let e=Wr(),t=localStorage.getItem(_r);if(!t)return e;let n=JSON.parse(t),r=Number(n.left),i=Number(n.top);return Gr({left:Number.isFinite(r)?r:e.left,top:Number.isFinite(i)?i:e.top})}catch{return Wr()}}function qr(e){try{localStorage.setItem(_r,JSON.stringify(e))}catch{}}var Jr=`
.wm-guru-float-page{
  position: relative;
  min-height: 0;
  padding: 0;
  overflow: visible;
  pointer-events: none;
}

.wm-guru-float-launcher{
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 6002;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 1px solid rgba(255, 196, 124, 0.62);
  background: linear-gradient(135deg, rgba(239, 133, 42, 0.96), rgba(208, 88, 25, 0.96));
  color: rgba(255, 247, 234, 0.98);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 0 0 1px rgba(255, 191, 118, 0.28) inset,
    0 0 30px rgba(236, 123, 39, 0.44),
    0 16px 36px rgba(4, 12, 24, 0.45);
  pointer-events: auto;
  touch-action: none;
}

.wm-guru-float-launcher.is-open{
  border-color: rgba(255, 220, 162, 0.76);
  background: linear-gradient(135deg, rgba(248, 146, 49, 0.98), rgba(219, 96, 28, 0.98));
  box-shadow:
    0 0 0 1px rgba(255, 212, 151, 0.36) inset,
    0 0 36px rgba(244, 136, 46, 0.58),
    0 18px 40px rgba(4, 12, 24, 0.48);
}

.wm-guru-float-launcher__icon{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 0 8px rgba(255, 230, 195, 0.44));
}

.wm-guru-float-panel{
  position: fixed;
  right: 16px;
  bottom: 84px;
  z-index: 6001;
  width: min(520px, calc(100vw - 24px));
  height: min(680px, calc(100dvh - 96px));
  min-width: min(360px, calc(100vw - 24px));
  min-height: min(420px, calc(100dvh - 24px));
  max-width: calc(100vw - 12px);
  max-height: calc(100dvh - 12px);
  border-radius: 18px;
  border: 1px solid rgba(255, 183, 118, 0.56);
  background: linear-gradient(180deg, rgb(30, 21, 15), rgb(16, 20, 28));
  opacity: 1;
  box-shadow:
    0 0 0 1px rgba(255, 177, 107, 0.18) inset,
    0 0 34px rgba(238, 128, 43, 0.28),
    0 28px 56px rgba(0, 0, 0, 0.52);
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  pointer-events: auto;
}

.wm-guru-float-panel.is-route{
  min-width: min(520px, calc(100vw - 32px));
  min-height: min(520px, calc(100dvh - 48px));
  max-width: calc(100vw - 40px);
  max-height: calc(100dvh - 48px);
}

.wm-guru-float-panel__head{
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 12px;
  border-bottom: 1px solid rgba(255, 194, 136, 0.2);
  background: linear-gradient(180deg, rgb(44, 26, 14), rgb(29, 26, 25));
}

.wm-guru-float-panel__dragzone{
  display: grid;
  gap: 4px;
  cursor: move;
  user-select: none;
  touch-action: none;
}

.wm-guru-float-panel__head-actions{
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.wm-guru-float-panel__title{
  margin: 0;
  font-size: 18px;
  color: rgba(247, 251, 255, 0.98);
}

.wm-guru-float-panel__sub{
  margin: 4px 0 0;
  color: rgba(201, 217, 236, 0.78);
  font-size: 12px;
}

.wm-guru-float-panel__body{
  overflow: auto;
  padding: 10px 12px 12px;
  display: grid;
  gap: 10px;
  background: linear-gradient(180deg, rgb(21, 24, 32), rgb(14, 18, 25));
}

.wm-guru-float-modes{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 6px;
}

.wm-guru-float-mode{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(228, 239, 251, 0.88);
  font-size: 12px;
  font-weight:600;
  line-height: 1.25;
  text-align: center;
  cursor: pointer;
}

.wm-guru-float-mode.is-active{
  border-color: rgba(120, 210, 186, 0.46);
  background: linear-gradient(90deg, rgba(38, 142, 89, 0.22), rgba(45, 108, 184, 0.2));
  color: rgba(236, 255, 248, 0.97);
}

.wm-guru-float-field{
  display: grid;
  gap: 6px;
}

.wm-guru-float-field label{
  color: rgba(218, 231, 246, 0.9);
  font-size: 12px;
  font-weight:600;
}

.wm-guru-float-promptHint{
  color: rgba(195, 214, 232, 0.78);
  font-size: 11px;
  line-height: 1.4;
}

.wm-guru-float-input{
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(7, 16, 27, 0.7);
  color: rgba(244, 249, 255, 0.96);
  padding: 10px 11px;
  outline: none;
  resize: vertical;
  font-size: 13px;
  line-height: 1.45;
}

.wm-guru-float-input:focus{
  border-color: rgba(126, 198, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(98, 167, 245, 0.18);
}

.wm-guru-float-quickasks{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 6px;
}

.wm-guru-float-chip{
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 30px;
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(220, 232, 246, 0.88);
  padding: 6px 10px;
  font-size: 11px;
  font-weight:600;
  line-height: 1.25;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.wm-guru-float-actions{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wm-guru-float-actions--primary{
  display: grid;
  gap: 8px;
}

.wm-guru-float-actions--support{
  display: grid;
  grid-template-columns: repeat(3, max-content) minmax(0, 1fr);
  align-items: center;
  gap: 6px 8px;
}

.wm-guru-float-actions--support .wm-guru-float-chip{
  width: auto;
}

.wm-guru-float-actions--support .wm-guru-float-muted{
  margin-left: 0;
  justify-self: end;
  text-align: right;
}

.wm-guru-float-actions .wm-btn{
  min-height: 34px;
}

.wm-guru-submit{
  width: 100%;
  min-height: 42px !important;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  color: #fff8ef !important;
  background: linear-gradient(135deg, #ef852a, #d05819) !important;
  text-shadow: 0 1px 0 rgba(86, 37, 9, 0.4);
  box-shadow: 0 10px 24px rgba(236, 123, 39, 0.24) !important;
}

.wm-guru-submit:disabled{
  color: rgba(255, 248, 239, 0.84) !important;
  background: linear-gradient(135deg, rgba(239, 133, 42, 0.72), rgba(208, 88, 25, 0.72)) !important;
  opacity: 0.78;
  cursor: not-allowed;
}

.wm-guru-float-answer{
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  padding: 11px;
  color: rgba(233, 242, 252, 0.92);
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 13px;
}

.wm-guru-float-explain{
  display: grid;
  gap: 8px;
}

.wm-guru-float-explain-grid{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.wm-guru-float-explain-card{
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(180deg, rgba(17, 29, 44, 0.92), rgba(11, 19, 31, 0.94));
  padding: 10px 11px;
  display: grid;
  gap: 6px;
}

.wm-guru-float-explain-card--confidence{
  border-color: rgba(115, 205, 176, 0.34);
  background: linear-gradient(180deg, rgba(19, 47, 48, 0.94), rgba(12, 23, 31, 0.96));
}

.wm-guru-float-explain-card--why{
  border-color: rgba(100, 176, 255, 0.3);
}

.wm-guru-float-explain-card--missing{
  border-color: rgba(255, 191, 114, 0.3);
}

.wm-guru-float-explain-label{
  color: rgba(191, 210, 233, 0.74);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wm-guru-float-explain-headline{
  color: rgba(243, 249, 255, 0.96);
  font-size: 14px;
  font-weight:600;
  line-height: 1.4;
}

.wm-guru-float-explain-list{
  margin: 0;
  padding-left: 16px;
  color: rgba(220, 232, 246, 0.9);
  font-size: 12px;
  line-height: 1.5;
}

.wm-guru-float-explain-list li + li{
  margin-top: 4px;
}

.wm-guru-float-explain-actions{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wm-guru-float-history{
  display: grid;
  gap: 8px;
}

.wm-guru-float-historyHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.wm-guru-float-historyList{
  display: grid;
  gap: 6px;
}

.wm-guru-float-historyItem{
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  padding: 9px 10px;
  text-align: left;
  display: grid;
  gap: 4px;
  cursor: pointer;
}

.wm-guru-float-historyItem:hover{
  border-color: rgba(117, 194, 255, 0.28);
  background: rgba(18, 32, 49, 0.68);
}

.wm-guru-float-historyMeta{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: rgba(190, 210, 233, 0.76);
  font-size: 11px;
  line-height: 1.4;
}

.wm-guru-float-historyQuestion{
  color: rgba(236, 244, 252, 0.94);
  font-size: 12px;
  font-weight:600;
  line-height: 1.45;
}

.wm-guru-float-historySummary{
  color: rgba(196, 214, 235, 0.8);
  font-size: 11px;
  line-height: 1.45;
}

.wm-guru-float-muted{
  color: rgba(195, 214, 232, 0.76);
  font-size: 12px;
  line-height: 1.45;
}

.wm-guru-float-panel__corner{
  position: absolute;
  width: 16px;
  height: 16px;
  border: 0;
  padding: 0;
  background: transparent;
  z-index: 2;
}

.wm-guru-float-panel__corner::after{
  content: "";
  position: absolute;
  inset: 4px;
  border-color: rgba(158, 207, 255, 0.74);
}

.wm-guru-float-panel__corner--tl{
  top: 0;
  left: 0;
  cursor: nwse-resize;
}

.wm-guru-float-panel__corner--tl::after{
  border-top: 1px solid rgba(158, 207, 255, 0.74);
  border-left: 1px solid rgba(158, 207, 255, 0.74);
}

.wm-guru-float-panel__corner--tr{
  top: 0;
  right: 0;
  cursor: nesw-resize;
}

.wm-guru-float-panel__corner--tr::after{
  border-top: 1px solid rgba(158, 207, 255, 0.74);
  border-right: 1px solid rgba(158, 207, 255, 0.74);
}

.wm-guru-float-panel__corner--bl{
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
}

.wm-guru-float-panel__corner--bl::after{
  border-bottom: 1px solid rgba(158, 207, 255, 0.74);
  border-left: 1px solid rgba(158, 207, 255, 0.74);
}

.wm-guru-float-panel__corner--br{
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
}

.wm-guru-float-panel__corner--br::after{
  border-bottom: 1px solid rgba(158, 207, 255, 0.74);
  border-right: 1px solid rgba(158, 207, 255, 0.74);
}

/* Modern density pass: slimmer, calmer assistant geometry. */
.wm-guru-float-page{
  --wm-guru-route-column: 64ch;
}

.wm-guru-float-launcher{
  width: 46px;
  height: 46px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(180deg, rgba(42, 48, 69, 0.96), rgba(20, 24, 35, 0.98));
  color: rgba(243, 247, 255, 0.94);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 16px 34px rgba(0, 0, 0, 0.28);
}

.wm-guru-float-launcher.is-open{
  border-color: rgba(132, 141, 255, 0.22);
  background: linear-gradient(180deg, rgba(69, 74, 117, 0.96), rgba(34, 38, 59, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 18px 36px rgba(42, 46, 94, 0.24);
}

.wm-guru-float-panel{
  width: min(460px, calc(100vw - 28px));
  height: min(600px, calc(100dvh - 92px));
  min-width: min(320px, calc(100vw - 28px));
  min-height: min(392px, calc(100dvh - 28px));
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(23, 24, 31, 0.98), rgba(13, 14, 19, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 24px 56px rgba(0, 0, 0, 0.32);
}

.wm-guru-float-panel.is-route{
  min-width: min(640px, calc(100vw - 56px));
  min-height: min(520px, calc(100dvh - 72px));
  max-width: calc(100vw - 48px);
  max-height: calc(100dvh - 72px);
}

.wm-guru-float-panel__head{
  gap: 10px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: linear-gradient(180deg, rgba(28, 30, 40, 0.98), rgba(18, 20, 28, 0.98));
}

.wm-guru-float-panel__dragzone{
  gap: 3px;
}

.wm-guru-float-panel__title{
  font-size: 16px;
  font-weight: 620;
  letter-spacing: -0.02em;
}

.wm-guru-float-panel__sub{
  margin-top: 2px;
  font-size: 11px;
  color: rgba(205, 212, 224, 0.68);
}

.wm-guru-float-panel__head-actions .wm-btn{
  min-height: 32px;
  padding-inline: 11px;
  border-radius: 999px;
  font-size: 11px;
}

.wm-guru-float-panel__body{
  gap: 12px;
  padding: 12px;
  background: linear-gradient(180deg, rgba(16, 17, 24, 0.98), rgba(12, 13, 18, 1));
}

.wm-guru-float-panel.is-route .wm-guru-float-panel__body{
  justify-items: start;
  padding-inline: 18px;
  padding-bottom: 18px;
}

.wm-guru-float-panel.is-route .wm-guru-float-panel__body > *{
  width: min(100%, var(--wm-guru-route-column));
}

.wm-guru-float-modes{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wm-guru-float-mode{
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(228, 239, 251, 0.8);
  font-size: 11px;
  font-weight: 600;
}

.wm-guru-float-mode.is-active{
  border-color: rgba(132, 141, 255, 0.3);
  background: linear-gradient(180deg, rgba(71, 74, 122, 0.74), rgba(43, 46, 82, 0.84));
  color: rgba(248, 250, 255, 0.96);
}

.wm-guru-float-field{
  gap: 5px;
}

.wm-guru-float-field label{
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(202, 207, 219, 0.76);
}

.wm-guru-float-promptHint,
.wm-guru-float-muted{
  font-size: 11px;
  line-height: 1.45;
  color: rgba(195, 201, 214, 0.72);
}

.wm-guru-float-field--question .wm-guru-float-promptHint{
  max-width: 54ch;
}

.wm-guru-float-input{
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.025);
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.45;
  resize: vertical;
}

.wm-guru-float-field--question .wm-guru-float-input{
  min-height: 74px;
}

.wm-guru-float-field--context .wm-guru-float-input{
  min-height: 92px;
}

.wm-guru-float-actions{
  gap: 8px;
}

.wm-guru-float-actions--primary{
  align-items: flex-start;
}

.wm-guru-float-actions--support{
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.wm-guru-float-actions--support .wm-guru-float-muted{
  width: 100%;
  margin-top: 2px;
  text-align: left;
}

.wm-guru-float-quickasks{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wm-guru-float-chip{
  min-height: 30px;
  width: auto;
  max-width: 100%;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
}

.wm-guru-submit{
  width: fit-content;
  min-width: 132px;
  min-height: 36px !important;
  padding-inline: 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(107, 97, 255, 0.92), rgba(88, 120, 255, 0.88)) !important;
  color: #f9f7ff !important;
  text-shadow: none;
  box-shadow: 0 12px 24px rgba(81, 92, 210, 0.22) !important;
}

.wm-guru-float-answer{
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.028);
  padding: 12px 13px;
  font-size: 13px;
}

.wm-guru-float-disclosure{
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.022);
  padding: 12px;
}

.wm-guru-float-disclosure__summary{
  list-style: none;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  cursor: pointer;
}

.wm-guru-float-disclosure__summary::-webkit-details-marker{
  display: none;
}

.wm-guru-float-disclosure__title{
  display: grid;
  gap: 2px;
}

.wm-guru-float-disclosure__label{
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(206, 212, 224, 0.78);
}

.wm-guru-float-disclosure__hint{
  font-size: 11px;
  line-height: 1.4;
  color: rgba(190, 197, 210, 0.68);
}

.wm-guru-float-disclosure__summary::after{
  content: "Expand";
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(243, 247, 255, 0.86);
  font-size: 11px;
  font-weight: 600;
}

.wm-guru-float-disclosure[open] .wm-guru-float-disclosure__summary::after{
  content: "Collapse";
}

.wm-guru-float-disclosure__body{
  margin-top: 10px;
  display: grid;
  gap: 10px;
}

.wm-guru-float-explain-grid{
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.wm-guru-float-explain-card{
  border-radius: 16px;
  padding: 10px;
}

.wm-guru-float-history{
  gap: 10px;
}

.wm-guru-float-historyItem{
  border-radius: 16px;
  padding: 10px 11px;
}

@media (max-width: 900px){
  .wm-guru-float-modes,
  .wm-guru-float-quickasks,
  .wm-guru-float-actions--support{
    grid-template-columns: 1fr;
  }

  .wm-guru-float-actions--support .wm-guru-float-muted{
    justify-self: start;
    text-align: left;
  }

  .wm-guru-float-page{
    padding: 0;
  }

  .wm-guru-float-panel{
    left: 12px;
    right: 12px;
    width: auto;
    height: min(72dvh, 560px);
    min-width: 0;
    min-height: 360px;
    max-width: none;
    bottom: 12px;
  }

  .wm-guru-float-panel__dragzone{
    cursor: default;
  }

  .wm-guru-float-panel__corner{
    display: none;
  }

  .wm-guru-float-panel.is-route{
    left: 12px;
    right: 12px;
    top: 78px;
    bottom: auto;
    width: auto;
    height: calc(100dvh - 96px);
    max-width: none;
    max-height: calc(100dvh - 84px);
    transform: none;
  }

  .wm-guru-float-panel.is-route .wm-guru-float-panel__body{
    padding-inline: 12px;
  }

  .wm-guru-float-panel.is-route .wm-guru-float-panel__body > *{
    width: 100%;
  }

  .wm-guru-submit{
    width: 100%;
  }

  .wm-guru-float-launcher{
    right: 12px;
    bottom: 12px;
  }
}
`;function Yr(){let e=r(),t=a(),n=e.pathname.startsWith(`/app/tools/guru`),i=E.useSyncExternalStore(s,()=>l()??null,()=>null),o=E.useCallback(e=>{if(typeof window>`u`)return e;let t=Math.max(280,window.innerWidth-24),n=Math.max(320,window.innerHeight-24),r=Math.min(br,t),i=Math.min(xr,n);return{width:Math.min(t,Math.max(r,e.width)),height:Math.min(n,Math.max(i,e.height))}},[]),u=E.useCallback((e,t)=>{if(typeof window>`u`)return e;let n=Math.max($,window.innerWidth-t.width-$),r=Math.max($,window.innerHeight-t.height-$);return{left:Math.min(n,Math.max($,e.left)),top:Math.min(r,Math.max($,e.top))}},[]),d=E.useCallback((e,t,n)=>{if(typeof window>`u`)return{layout:{width:e.startWidth,height:e.startHeight},position:{left:e.startLeft,top:e.startTop}};let r=(e,t,n)=>Math.min(Math.max(t,n),Math.max(t,e)),i=t-e.startX,a=n-e.startY,o=e.startLeft+e.startWidth,s=e.startTop+e.startHeight,c=window.innerWidth-$,l=window.innerHeight-$,u=Math.min(br,Math.max(280,window.innerWidth-$*2)),d=Math.min(xr,Math.max(320,window.innerHeight-$*2)),f=e.startLeft,p=e.startTop,m=e.startWidth,h=e.startHeight;if(e.corner===`bottom-right`){let t=r(o+i,e.startLeft+u,c),n=r(s+a,e.startTop+d,l);m=t-e.startLeft,h=n-e.startTop}else if(e.corner===`top-left`){let t=r(e.startLeft+i,$,o-u),n=r(e.startTop+a,$,s-d);f=t,p=n,m=o-t,h=s-n}else if(e.corner===`top-right`){let t=r(o+i,e.startLeft+u,c),n=r(e.startTop+a,$,s-d);p=n,m=t-e.startLeft,h=s-n}else{let t=r(e.startLeft+i,$,o-u),n=r(s+a,e.startTop+d,l);f=t,m=o-t,h=n-e.startTop}return{layout:{width:Math.round(m),height:Math.round(h)},position:{left:Math.round(f),top:Math.round(p)}}},[]),f=E.useMemo(()=>Tr(),[]),p=E.useMemo(()=>o(Rr()),[o]),[m,h]=E.useState(f.mode),[g,_]=E.useState(f.question),[v,y]=E.useState(f.context),[b,te]=E.useState(!1),[x,S]=E.useState(``),[C,w]=E.useState(null),[T,ne]=E.useState(``),[re,ie]=E.useState(``),[D,O]=E.useState(``),[k,se]=E.useState(null),[ce,le]=E.useState(()=>Or(i?.id??null)),[ue,A]=E.useState(!1),[de,fe]=E.useState(!1),[j,pe]=E.useState(p),[M,N]=E.useState(()=>u(Hr(p),p)),[P,me]=E.useState(()=>Kr()),[F,he]=E.useState(()=>typeof window<`u`?window.innerWidth<=900:!1),I=E.useRef(null),ge=E.useRef(null),L=E.useRef(null),_e=E.useRef(!1),ve=E.useRef(null);E.useEffect(()=>{ve.current=C},[C]),E.useEffect(()=>{Er({mode:m,question:g,context:v})},[m,g,v]),E.useEffect(()=>{le(Or(i?.id??null))},[i?.id]),E.useEffect(()=>{zr(j)},[j]),E.useEffect(()=>{Ur(M)},[M]),E.useEffect(()=>{qr(P)},[P]),E.useEffect(()=>{if(typeof window>`u`)return;let e=()=>{he(window.innerWidth<=900),pe(e=>{let t=o(e);return N(e=>u(e,t)),t}),me(e=>Gr(e))};return e(),window.addEventListener(`resize`,e),()=>window.removeEventListener(`resize`,e)},[o,u]),E.useEffect(()=>{if(!n||(A(!0),F))return;let e=o(yr);pe(e),N(u(Vr(e),e))},[o,u,F,n]),E.useEffect(()=>{if(typeof window>`u`)return;let e=e=>{if(!F&&L.current){let t=e.clientX-L.current.startX,n=e.clientY-L.current.startY;!L.current.moved&&(Math.abs(t)>3||Math.abs(n)>3)&&(L.current.moved=!0);let r=Gr({left:L.current.startLeft+t,top:L.current.startTop+n});me(e=>e.left===r.left&&e.top===r.top?e:r);return}if(!F){if(I.current){let t=e.clientX-I.current.startX,n=e.clientY-I.current.startY,r=u({left:I.current.startLeft+t,top:I.current.startTop+n},j);N(e=>e.left===r.left&&e.top===r.top?e:r);return}if(ge.current){let t=d(ge.current,e.clientX,e.clientY);pe(e=>e.width===t.layout.width&&e.height===t.layout.height?e:t.layout),N(e=>e.left===t.position.left&&e.top===t.position.top?e:t.position)}}},t=()=>{L.current?.moved&&(_e.current=!0),L.current=null,I.current=null,ge.current=null};return window.addEventListener(`pointermove`,e),window.addEventListener(`pointerup`,t),window.addEventListener(`pointercancel`,t),()=>{window.removeEventListener(`pointermove`,e),window.removeEventListener(`pointerup`,t),window.removeEventListener(`pointercancel`,t)}},[d,u,F,j]);let ye=E.useCallback(e=>{n||F||e.button!==0||(e.preventDefault(),e.stopPropagation(),L.current={startX:e.clientX,startY:e.clientY,startLeft:P.left,startTop:P.top,moved:!1})},[F,n,P.left,P.top]),be=E.useCallback(e=>{F||e.button!==0||(e.preventDefault(),e.stopPropagation(),I.current={startX:e.clientX,startY:e.clientY,startLeft:M.left,startTop:M.top})},[F,M.left,M.top]),xe=E.useCallback(e=>t=>{F||t.button!==0||(t.preventDefault(),t.stopPropagation(),ge.current={corner:e,startX:t.clientX,startY:t.clientY,startLeft:M.left,startTop:M.top,startWidth:j.width,startHeight:j.height})},[F,j.height,j.width,M.left,M.top]),Se=wr[m],Ce=g.trim().length>0||v.trim().length>0,R=E.useMemo(()=>Lr(C),[C]),z=C?.explanation??null,we=C?.sources??[],Te=!!(z||we.length>0||R.length>0),B=E.useMemo(()=>Mr(i),[i]),Ee=()=>{_(``),y(``),fe(!1),S(``),w(null),ne(``),ie(``),se(null),O(``)},De=E.useCallback(e=>{let t=e.projectId??null;le(n=>{let r=[{...e,id:Ar()},...n].slice(0,8);return kr(t,r),r})},[]),Oe=E.useCallback(e=>{h(e.mode),_(e.question),y(e.context),fe(!!e.context.trim()),w(e.answer),ne(e.answeredAt),ie(e.status),S(``),O(``),A(!0)},[]),ke=()=>{fe(!0),y(e=>e.trim()?e:[`Project or room type:`,`Customer goal:`,`Source devices:`,`Displays:`,`Distances:`,`Audio requirements:`,`Control requirements:`,`Budget band:`,`Constraints or risks:`].join(`
`))},Ae=E.useCallback(async e=>{if(!e.combinedQuestion.trim()){S(`Add a question or context before asking Guru.`),w(null),A(!0);return}A(!0),te(!0),e.autoRefresh||(S(``),O(``),ie(``));try{let t=await Jn(e.combinedQuestion,{mode:e.apiMode,notes:e.contextText||void 0,discovery:e.project?.discovery??null}),n=new Date().toLocaleTimeString([],{hour:`2-digit`,minute:`2-digit`}),r=e.autoRefresh?Ir(ve.current,t):``;w(t),ne(n),se({combinedQuestion:e.combinedQuestion,contextText:e.contextText,apiMode:e.apiMode,projectId:e.project?.id??null,discoverySignature:Mr(e.project),usedDiscovery:!!e.project?.discovery}),e.autoRefresh&&ie(r),De({projectId:e.project?.id??null,question:g,context:e.contextText,mode:m,answeredAt:n,status:r,answer:t})}catch{e.autoRefresh||(S(`Guru request failed. Retry, or open diagnostics if this persists.`),w(null))}finally{te(!1)}},[m,De,g]),je=E.useCallback(async()=>{let e=v.trim();await Ae({combinedQuestion:jr(g,e),contextText:e,apiMode:Nr(m),project:i})},[i,v,m,g,Ae]);E.useEffect(()=>{b||!k?.usedDiscovery||(i?.id??null)===k.projectId&&B!==k.discoverySignature&&jr(g,v).trim()===k.combinedQuestion.trim()&&Ae({combinedQuestion:k.combinedQuestion,contextText:k.contextText,apiMode:k.apiMode,project:i,autoRefresh:!0})},[B,i,b,v,k,g,Ae]);let Me=E.useCallback(e=>{(e.ctrlKey||e.metaKey)&&e.key===`Enter`&&!b&&(e.preventDefault(),je())},[b,je]),Ne=()=>{if(R.length===0){O(`No WyreStorm SKU suggestions found in this answer.`);return}let e=l();if(!e){O(`No active project found. Open a project first, then transfer SKUs.`);return}let t=Array.isArray(e.catalog?.skus)?e.catalog.skus:[],n=Array.from(new Set([...t,...R.map(e=>e.sku)]));c(e.id,{catalog:{...e.catalog??{},selectedBrand:`WyreStorm`,skus:n},stage:e.stage||`Specify`}),O(`Added ${R.length} SKU(s) to project catalog (${e.name}).`)},Pe=()=>{if(R.length===0){O(`No WyreStorm SKU suggestions found in this answer.`);return}R.forEach(e=>{fr({sku:e.sku,name:e.name||e.sku,qty:1,source:`guru`})}),O(`Added ${R.length} SKU(s) to Proposal BOM draft.`)},Fe=E.useCallback(e=>{t(ee.discovery,{state:{focusStep:e.step,focusQuestionId:e.questionId}})},[t]),Ie=E.useCallback(()=>{let e=o(n?yr:vr);pe(e),N(t=>u(n?Vr(e):t,e))},[o,u,n]);return typeof document>`u`?null:(0,oe.createPortal)((0,Q.jsxs)(`div`,{className:`wm-guru-float-page`,children:[(0,Q.jsx)(`style`,{children:Jr}),n?null:(0,Q.jsx)(`button`,{type:`button`,className:`wm-guru-float-launcher ${ue?`is-open`:``}`,onPointerDown:ye,onClick:()=>{if(_e.current){_e.current=!1;return}A(e=>!e)},"aria-label":ue?`Close Guru`:`Open Guru`,"aria-expanded":ue,title:ue?`Close Guru (drag to move)`:`Open Guru (drag to move)`,style:F?void 0:{left:P.left,top:P.top,right:`auto`,bottom:`auto`},children:(0,Q.jsx)(`span`,{className:`wm-guru-float-launcher__icon`,children:(0,Q.jsx)(ae,{size:20})})}),ue?(0,Q.jsxs)(`aside`,{className:`wm-guru-float-panel${n?` is-route`:``}`,role:`dialog`,"aria-label":`Guru helper`,"aria-modal":`false`,style:F?void 0:{left:M.left,top:M.top,right:`auto`,bottom:`auto`,width:j.width,height:j.height},children:[(0,Q.jsxs)(`div`,{className:`wm-guru-float-panel__head`,children:[(0,Q.jsxs)(`div`,{className:`wm-guru-float-panel__dragzone`,onPointerDown:be,children:[(0,Q.jsx)(`h2`,{className:`wm-guru-float-panel__title`,children:`Guru Assistant`}),(0,Q.jsxs)(`p`,{className:`wm-guru-float-panel__sub`,children:[Se.label,` | `,Se.subtitle]})]}),(0,Q.jsxs)(`div`,{className:`wm-guru-float-panel__head-actions`,children:[(0,Q.jsx)(`button`,{className:`wm-btn`,type:`button`,onClick:Ie,children:`Reset size`}),n?null:(0,Q.jsx)(Q.Fragment,{children:(0,Q.jsx)(`button`,{className:`wm-btn`,type:`button`,onClick:()=>A(!1),children:`Close`})})]})]}),(0,Q.jsxs)(`div`,{className:`wm-guru-float-panel__body`,children:[(0,Q.jsx)(`div`,{className:`wm-guru-float-modes`,children:Object.values(wr).map(e=>(0,Q.jsx)(`button`,{type:`button`,className:`wm-guru-float-mode ${e.id===m?`is-active`:``}`,onClick:()=>h(e.id),children:e.label},e.id))}),(0,Q.jsxs)(`div`,{className:`wm-guru-float-field wm-guru-float-field--question`,children:[(0,Q.jsx)(`label`,{children:`Ask Guru`}),(0,Q.jsx)(`textarea`,{className:`wm-guru-float-input`,value:g,rows:n?3:2,onChange:e=>_(e.target.value),onKeyDown:Me,placeholder:Se.placeholder}),(0,Q.jsx)(`div`,{className:`wm-guru-float-promptHint`,children:`Start with the main question. Add extra context only if it helps narrow the advice. Press Ctrl+Enter to ask.`})]}),(0,Q.jsxs)(`div`,{className:`wm-guru-float-actions wm-guru-float-actions--primary`,children:[(0,Q.jsx)(`button`,{className:`wm-btn wm-btn-primary wm-guru-submit`,type:`button`,onClick:je,disabled:!Ce||b,children:b?`Thinking...`:`Ask Guru`}),(0,Q.jsx)(`div`,{className:`wm-guru-float-muted`,children:b?`Guru is working through your question.`:T?`Last updated at ${T}.`:`Answer will appear below.`}),re?(0,Q.jsx)(`div`,{className:`wm-guru-float-muted`,children:re}):null]}),(0,Q.jsxs)(`div`,{className:`wm-guru-float-actions wm-guru-float-actions--support`,children:[(0,Q.jsx)(`button`,{className:`wm-guru-float-chip`,type:`button`,onClick:()=>fe(e=>!e),children:de?`Hide context`:`Add context`}),(0,Q.jsx)(`button`,{className:`wm-guru-float-chip`,type:`button`,onClick:ke,children:`Use context template`}),(0,Q.jsx)(`button`,{className:`wm-guru-float-chip`,type:`button`,onClick:Ee,children:`Clear`}),(0,Q.jsx)(`div`,{className:`wm-guru-float-muted`,children:`Keep it simple first, then add context if the answer needs tightening.`})]}),(0,Q.jsx)(`div`,{className:`wm-guru-float-quickasks`,children:Se.quickAsks.map(e=>(0,Q.jsx)(`button`,{type:`button`,className:`wm-guru-float-chip`,onClick:()=>_(e),children:e},e))}),de?(0,Q.jsxs)(`div`,{className:`wm-guru-float-field wm-guru-float-field--context`,children:[(0,Q.jsx)(`label`,{children:`Optional context`}),(0,Q.jsx)(`textarea`,{className:`wm-guru-float-input`,value:v,rows:4,onChange:e=>y(e.target.value),placeholder:`Paste room notes, customer requirements, constraints, existing kit, or other context.`})]}):null,(0,Q.jsx)(`div`,{className:`wm-guru-float-answer`,children:x?(0,Q.jsx)(`div`,{children:x}):C?(0,Q.jsxs)(Q.Fragment,{children:[(0,Q.jsx)(`div`,{children:C.text}),(0,Q.jsxs)(`div`,{className:`wm-guru-float-muted`,style:{marginTop:8},children:[`Confidence: `,Pr(C.confidence),T?` | Updated at ${T}`:``]})]}):`Ask Guru to generate an answer. It will appear here.`}),Te?(0,Q.jsxs)(`details`,{className:`wm-guru-float-disclosure`,children:[(0,Q.jsx)(`summary`,{className:`wm-guru-float-disclosure__summary`,children:(0,Q.jsxs)(`span`,{className:`wm-guru-float-disclosure__title`,children:[(0,Q.jsx)(`span`,{className:`wm-guru-float-disclosure__label`,children:`More information`}),(0,Q.jsx)(`span`,{className:`wm-guru-float-disclosure__hint`,children:`Supporting reasoning, follow-up links, and next-step actions.`})]})}),(0,Q.jsxs)(`div`,{className:`wm-guru-float-disclosure__body`,children:[C&&z?(0,Q.jsx)(`div`,{className:`wm-guru-float-explain`,children:(0,Q.jsxs)(`div`,{className:`wm-guru-float-explain-grid`,children:[(0,Q.jsxs)(`article`,{className:`wm-guru-float-explain-card wm-guru-float-explain-card--confidence`,children:[(0,Q.jsx)(`div`,{className:`wm-guru-float-explain-label`,children:`Confidence`}),(0,Q.jsx)(`div`,{className:`wm-guru-float-explain-headline`,children:Pr(C.confidence)}),z.headline?(0,Q.jsx)(`div`,{className:`wm-guru-float-muted`,children:z.headline}):null]}),z.why&&z.why.length>0?(0,Q.jsxs)(`article`,{className:`wm-guru-float-explain-card wm-guru-float-explain-card--why`,children:[(0,Q.jsx)(`div`,{className:`wm-guru-float-explain-label`,children:`Why This Answer`}),(0,Q.jsx)(`ul`,{className:`wm-guru-float-explain-list`,children:z.why.map(e=>(0,Q.jsx)(`li`,{children:e},e))})]}):null,z.whatsMissing&&z.whatsMissing.length>0?(0,Q.jsxs)(`article`,{className:`wm-guru-float-explain-card wm-guru-float-explain-card--missing`,children:[(0,Q.jsx)(`div`,{className:`wm-guru-float-explain-label`,children:`What's Still Missing`}),(0,Q.jsx)(`ul`,{className:`wm-guru-float-explain-list`,children:z.whatsMissing.map(e=>(0,Q.jsx)(`li`,{children:e},e))}),z.handoffItems&&z.handoffItems.length>0?(0,Q.jsx)(`div`,{className:`wm-guru-float-explain-actions`,children:z.handoffItems.map(e=>(0,Q.jsxs)(`button`,{type:`button`,className:`wm-guru-float-chip`,onClick:()=>Fe(e),children:[`Open Step `,e.step+1,`: `,e.label]},`${e.step}:${e.questionId}`))}):null]}):null]})}):null,we.length>0?(0,Q.jsxs)(`div`,{className:`wm-guru-float-field`,children:[(0,Q.jsx)(`label`,{children:`Supporting links`}),(0,Q.jsx)(`div`,{className:`wm-guru-float-quickasks`,children:we.map(e=>e.to?(0,Q.jsx)(`button`,{type:`button`,className:`wm-guru-float-chip`,onClick:()=>t(e.to||`/app/tools`),children:e.title},`${e.title}_${e.to}`):e.url?(0,Q.jsx)(`a`,{className:`wm-guru-float-chip`,href:e.url,target:`_blank`,rel:`noreferrer`,children:e.title},`${e.title}_${e.url}`):null)})]}):null,R.length>0?(0,Q.jsxs)(`div`,{className:`wm-guru-float-field`,children:[(0,Q.jsx)(`label`,{children:`Detected WyreStorm SKUs`}),(0,Q.jsx)(`div`,{className:`wm-guru-float-quickasks`,children:R.map(e=>(0,Q.jsx)(`span`,{className:`wm-guru-float-chip`,children:e.sku},e.sku))}),(0,Q.jsxs)(`div`,{className:`wm-guru-float-actions`,children:[(0,Q.jsx)(`button`,{type:`button`,className:`wm-btn wm-btn-primary`,onClick:Ne,children:`Send to active project`}),(0,Q.jsx)(`button`,{type:`button`,className:`wm-btn`,onClick:Pe,children:`Send to proposal BOM`})]})]}):null]})]}):null,D?(0,Q.jsx)(`div`,{className:`wm-guru-float-muted`,children:D}):null,ce.length>0?(0,Q.jsxs)(`details`,{className:`wm-guru-float-disclosure`,children:[(0,Q.jsx)(`summary`,{className:`wm-guru-float-disclosure__summary`,children:(0,Q.jsxs)(`span`,{className:`wm-guru-float-disclosure__title`,children:[(0,Q.jsx)(`span`,{className:`wm-guru-float-disclosure__label`,children:`Recent history`}),(0,Q.jsx)(`span`,{className:`wm-guru-float-disclosure__hint`,children:i?.name?`Project: ${i.name}`:`General context`})]})}),(0,Q.jsx)(`div`,{className:`wm-guru-float-disclosure__body`,children:(0,Q.jsx)(`div`,{className:`wm-guru-float-history`,children:(0,Q.jsx)(`div`,{className:`wm-guru-float-historyList`,children:ce.slice(0,5).map(e=>(0,Q.jsxs)(`button`,{type:`button`,className:`wm-guru-float-historyItem`,onClick:()=>Oe(e),children:[(0,Q.jsxs)(`div`,{className:`wm-guru-float-historyMeta`,children:[(0,Q.jsx)(`span`,{children:e.answeredAt}),(0,Q.jsx)(`span`,{children:Pr(e.answer.confidence)})]}),(0,Q.jsx)(`div`,{className:`wm-guru-float-historyQuestion`,children:e.question||`Context-led Guru answer`}),(0,Q.jsx)(`div`,{className:`wm-guru-float-historySummary`,children:e.status||e.answer.explanation?.headline||e.answer.text.split(`
`)[0]})]},e.id))})})})]}):null]}),(0,Q.jsxs)(Q.Fragment,{children:[(0,Q.jsx)(`button`,{type:`button`,tabIndex:-1,"aria-label":`Resize from top left`,className:`wm-guru-float-panel__corner wm-guru-float-panel__corner--tl`,onPointerDown:xe(`top-left`)}),(0,Q.jsx)(`button`,{type:`button`,tabIndex:-1,"aria-label":`Resize from top right`,className:`wm-guru-float-panel__corner wm-guru-float-panel__corner--tr`,onPointerDown:xe(`top-right`)}),(0,Q.jsx)(`button`,{type:`button`,tabIndex:-1,"aria-label":`Resize from bottom left`,className:`wm-guru-float-panel__corner wm-guru-float-panel__corner--bl`,onPointerDown:xe(`bottom-left`)}),(0,Q.jsx)(`button`,{type:`button`,tabIndex:-1,"aria-label":`Resize from bottom right`,className:`wm-guru-float-panel__corner wm-guru-float-panel__corner--br`,onPointerDown:xe(`bottom-right`)})]})]}):null]}),document.body)}export{Yr as default};