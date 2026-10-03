/* ==========================================================================
   Shared hub-card illustrations
   Bespoke line-art used as decorative background art on the icon-led choice
   cards (Sales Helper, Call Coach, Products, Documents, Response Pack,
   Learn, Home). Originally built only for Sales Helper; extracted here and
   extended so every hub page can use the same illustrated card treatment
   instead of a plain repeated icon watermark.
   ========================================================================== */

export type HubCardArtKind =
  | "room"
  | "display"
  | "cable"
  | "camera"
  | "competitor"
  | "growth"
  | "proposal"
  | "discovery"
  | "templates"
  | "projects"
  | "call-card"
  | "conversation"
  | "support"
  | "finder"
  | "families"
  | "dashboard"
  | "videowall"
  | "decode"
  | "studio"
  | "schematic"
  | "glossary";

export function HubCardArt({ kind }: { kind: HubCardArtKind }) {
  if (kind === "room") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 24h175l25 98H43L20 24Z" opacity="0.42" />
        <path d="M20 24 43 122M195 24l25 98M64 24v25m66-25v25" opacity="0.35" />
        <rect x="140" y="43" width="43" height="27" rx="3" fill="currentColor" opacity="0.08" />
        <rect x="140" y="43" width="43" height="27" rx="3" />
        <path d="M79 79h61l18 19H62l17-19Z" fill="currentColor" opacity="0.08" />
        <path d="M79 79h61l18 19H62l17-19Zm-8 19-5 20m83-20 6 20" />
        <path d="M52 68h20v28H47V77c0-5 2-9 5-9Zm116 7h18v25h-23V84c0-5 2-9 5-9Z" opacity="0.72" />
        <path d="M91 48h35M34 113h166" opacity="0.28" />
      </svg>
    );
  }

  if (kind === "display") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M45 28 211 17v99L45 126V28Z" fill="currentColor" opacity="0.055" />
        <path d="M45 28 211 17v99L45 126V28Z" />
        <path d="M86 25v98m42-101v98m42-101v98M45 60l166-8M45 92l166-9" opacity="0.82" />
        <path d="m54 49 23-11 17 12 24-16 25 19 23-16 37 17" opacity="0.5" />
        <path d="M25 131h196" opacity="0.25" />
        <path d="M71 112 53 126m79-19-12 14m66-18-18 14" opacity="0.35" />
      </svg>
    );
  }

  if (kind === "cable") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 112c45-51 74-18 104-51 22-24 37-36 83-27" opacity="0.48" />
        <path d="M22 111c43-42 74-12 103-46 25-29 42-37 81-27" opacity="0.2" />
        <g transform="translate(24 78) rotate(-18)">
          <rect width="58" height="31" rx="5" fill="currentColor" opacity="0.08" />
          <rect width="58" height="31" rx="5" />
          <path d="M58 8h17v15H58M12 10h21m-21 7h15" />
        </g>
        <g transform="translate(142 26) rotate(12)">
          <rect width="57" height="32" rx="5" fill="currentColor" opacity="0.08" />
          <rect width="57" height="32" rx="5" />
          <path d="M57 8h18v16H57M13 10h20m-20 8h13" />
        </g>
        <path d="M31 125h167" opacity="0.22" />
      </svg>
    );
  }

  if (kind === "camera") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="42" y="30" width="75" height="62" rx="15" fill="currentColor" opacity="0.07" />
        <rect x="42" y="30" width="75" height="62" rx="15" />
        <circle cx="80" cy="60" r="20" fill="currentColor" opacity="0.08" />
        <circle cx="80" cy="60" r="20" />
        <circle cx="80" cy="60" r="8" />
        <path d="M64 93v14h33V93m-47 29h61" />
        <rect x="145" y="22" width="43" height="94" rx="7" fill="currentColor" opacity="0.06" />
        <rect x="145" y="22" width="43" height="94" rx="7" />
        <path d="M157 40h19m-19 15h19m-19 15h19m-19 15h19" opacity="0.62" />
        <rect x="126" y="99" width="78" height="24" rx="6" />
        <path d="M142 111h26m10 0h10" />
      </svg>
    );
  }

  if (kind === "competitor") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M121 19 184 40v39c0 31-20 48-63 62-43-14-63-31-63-62V40l63-21Z" fill="currentColor" opacity="0.055" />
        <path d="M121 19 184 40v39c0 31-20 48-63 62-43-14-63-31-63-62V40l63-21Z" />
        <path d="M121 45v56m-27-36h54M99 65 84 91h30L99 65Zm44 0-15 26h30l-15-26ZM105 107h32" />
        <path d="m83 43 38-13 39 13" opacity="0.35" />
      </svg>
    );
  }

  if (kind === "growth") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M35 124h180" opacity="0.3" />
        <rect x="50" y="91" width="21" height="33" rx="3" fill="currentColor" opacity="0.08" />
        <rect x="84" y="76" width="21" height="48" rx="3" fill="currentColor" opacity="0.08" />
        <rect x="118" y="58" width="21" height="66" rx="3" fill="currentColor" opacity="0.08" />
        <rect x="152" y="39" width="21" height="85" rx="3" fill="currentColor" opacity="0.08" />
        <rect x="186" y="21" width="21" height="103" rx="3" fill="currentColor" opacity="0.08" />
        <path d="M50 91h21v33H50V91Zm34-15h21v48H84V76Zm34-18h21v66h-21V58Zm34-19h21v85h-21V39Zm34-18h21v103h-21V21Z" />
        <path d="m45 89 38-20 31 5 39-27 46-24" />
        <path d="m190 22 14-3-4 14" />
      </svg>
    );
  }

  if (kind === "proposal") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="66" y="23" width="108" height="116" rx="10" fill="currentColor" opacity="0.055" />
        <rect x="66" y="23" width="108" height="116" rx="10" />
        <path d="M96 23v-8h48v8m-55 30h56" />
        <path d="m86 74 7 7 12-15m-19 37 7 7 12-15" />
        <path d="M117 75h37m-37 29h37M84 125h70" opacity="0.75" />
        <path d="m160 111 22-22 12 12-22 22-17 5 5-17Z" fill="currentColor" opacity="0.07" />
        <path d="m160 111 22-22 12 12-22 22-17 5 5-17Z" />
      </svg>
    );
  }

  if (kind === "discovery") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="54" y="20" width="94" height="118" rx="10" fill="currentColor" opacity="0.055" />
        <rect x="54" y="20" width="94" height="118" rx="10" />
        <path d="M82 20v-9h38v9" />
        <path d="M74 55h50M74 55l6 6 10-12M74 79h50m-50 0 6 6 10-12M74 103h34" opacity="0.8" />
        <circle cx="168" cy="96" r="28" fill="currentColor" opacity="0.06" />
        <circle cx="168" cy="96" r="28" />
        <path d="m188 116 20 20" strokeWidth="1.4" />
      </svg>
    );
  }

  if (kind === "templates") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="24" y="22" width="92" height="56" rx="8" fill="currentColor" opacity="0.07" />
        <rect x="24" y="22" width="92" height="56" rx="8" />
        <rect x="126" y="22" width="90" height="56" rx="8" fill="currentColor" opacity="0.055" />
        <rect x="126" y="22" width="90" height="56" rx="8" />
        <rect x="24" y="90" width="90" height="48" rx="8" fill="currentColor" opacity="0.055" />
        <rect x="24" y="90" width="90" height="48" rx="8" />
        <rect x="124" y="90" width="92" height="48" rx="8" fill="currentColor" opacity="0.07" />
        <rect x="124" y="90" width="92" height="48" rx="8" />
        <path d="M38 40h50M38 52h34M140 40h50M140 52h34M38 108h48M38 120h30M138 106h52M138 118h36" opacity="0.6" />
      </svg>
    );
  }

  if (kind === "projects") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 42c0-6 5-11 11-11h47l14 16h113c6 0 11 5 11 11v67c0 6-5 11-11 11H33c-6 0-11-5-11-11V42Z" fill="currentColor" opacity="0.06" />
        <path d="M22 42c0-6 5-11 11-11h47l14 16h113c6 0 11 5 11 11v67c0 6-5 11-11 11H33c-6 0-11-5-11-11V42Z" />
        <rect x="46" y="70" width="46" height="34" rx="5" fill="currentColor" opacity="0.09" />
        <rect x="46" y="70" width="46" height="34" rx="5" />
        <rect x="103" y="58" width="46" height="46" rx="5" fill="currentColor" opacity="0.09" />
        <rect x="103" y="58" width="46" height="46" rx="5" />
        <rect x="160" y="78" width="46" height="26" rx="5" fill="currentColor" opacity="0.09" />
        <rect x="160" y="78" width="46" height="26" rx="5" />
        <path d="m54 88 9 8 15-16m52 4 9 8 15-16" opacity="0.75" />
      </svg>
    );
  }

  if (kind === "call-card") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="38" y="35" width="164" height="98" rx="12" fill="currentColor" opacity="0.055" />
        <rect x="38" y="35" width="164" height="98" rx="12" />
        <circle cx="76" cy="66" r="17" fill="currentColor" opacity="0.09" />
        <circle cx="76" cy="66" r="17" />
        <path d="M69 66h14m-7-7v14" />
        <path d="M110 58h64m-64 16h64m-64 16h40" opacity="0.7" />
        <path d="M52 110h136" opacity="0.3" />
        <path d="m168 100 8 8 14-16" opacity="0.85" />
      </svg>
    );
  }

  if (kind === "conversation") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M26 30h122a12 12 0 0 1 12 12v42a12 12 0 0 1-12 12H96l-28 22v-22H26a12 12 0 0 1-12-12V42a12 12 0 0 1 12-12Z" fill="currentColor" opacity="0.06" />
        <path d="M26 30h122a12 12 0 0 1 12 12v42a12 12 0 0 1-12 12H96l-28 22v-22H26a12 12 0 0 1-12-12V42a12 12 0 0 1 12-12Z" />
        <path d="M40 58h84m-84 18h60" opacity="0.7" />
        <path d="M132 46h66a10 10 0 0 1 10 10v34a10 10 0 0 1-10 10h-8v18l-24-18h-34a10 10 0 0 1-10-10v-6" fill="currentColor" opacity="0.05" />
        <path d="M132 46h66a10 10 0 0 1 10 10v34a10 10 0 0 1-10 10h-8v18l-24-18h-34a10 10 0 0 1-10-10v-6" opacity="0.8" />
        <path d="M152 76h44m-44-14h30" opacity="0.55" />
      </svg>
    );
  }

  if (kind === "support") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M120 18 176 38v40c0 33-22 51-56 63-34-12-56-30-56-63V38l56-20Z" fill="currentColor" opacity="0.055" />
        <path d="M120 18 176 38v40c0 33-22 51-56 63-34-12-56-30-56-63V38l56-20Z" />
        <path d="M97 78c0-13 10-22 23-22s23 9 23 22c0 10-6 15-13 19-4 2-7 5-7 10" />
        <circle cx="120" cy="119" r="2.6" fill="currentColor" />
        <path d="m88 47 32-12 32 12" opacity="0.4" />
      </svg>
    );
  }

  if (kind === "finder") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="30" y="52" width="80" height="62" rx="8" fill="currentColor" opacity="0.07" />
        <rect x="30" y="52" width="80" height="62" rx="8" />
        <path d="M44 70h52m-52 14h52m-52 14h32" opacity="0.65" />
        <circle cx="152" cy="88" r="38" fill="currentColor" opacity="0.06" />
        <circle cx="152" cy="88" r="38" />
        <circle cx="152" cy="88" r="24" opacity="0.55" />
        <path d="m180 116 26 26" strokeWidth="1.6" />
      </svg>
    );
  }

  if (kind === "families") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="99" y="18" width="42" height="30" rx="6" fill="currentColor" opacity="0.09" />
        <rect x="99" y="18" width="42" height="30" rx="6" />
        <rect x="30" y="98" width="42" height="30" rx="6" fill="currentColor" opacity="0.07" />
        <rect x="30" y="98" width="42" height="30" rx="6" />
        <rect x="99" y="98" width="42" height="30" rx="6" fill="currentColor" opacity="0.07" />
        <rect x="99" y="98" width="42" height="30" rx="6" />
        <rect x="168" y="98" width="42" height="30" rx="6" fill="currentColor" opacity="0.07" />
        <rect x="168" y="98" width="42" height="30" rx="6" />
        <path d="M120 48v26m0-13H51v13m69-13h69v13" opacity="0.75" />
      </svg>
    );
  }

  if (kind === "dashboard") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="26" y="24" width="188" height="102" rx="12" fill="currentColor" opacity="0.05" />
        <rect x="26" y="24" width="188" height="102" rx="12" />
        <circle cx="76" cy="80" r="30" opacity="0.65" />
        <path d="M76 80 60 64" />
        <path d="M50 108a30 30 0 0 1 52-22" opacity="0.35" />
        <rect x="130" y="52" width="18" height="46" rx="3" fill="currentColor" opacity="0.09" />
        <rect x="130" y="52" width="18" height="46" rx="3" />
        <rect x="156" y="66" width="18" height="32" rx="3" fill="currentColor" opacity="0.09" />
        <rect x="156" y="66" width="18" height="32" rx="3" />
        <rect x="182" y="40" width="18" height="58" rx="3" fill="currentColor" opacity="0.09" />
        <rect x="182" y="40" width="18" height="58" rx="3" />
      </svg>
    );
  }

  if (kind === "videowall") {
    return (
      <svg
        className="wm-hub-art-videowall"
        viewBox="0 0 240 150"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <g opacity="0.32" strokeWidth="1">
          <rect x="78" y="40" width="106" height="68" rx="5" />
          <path d="M113 108v12m36-12v12M98 120h66" opacity="0.72" />
          <path d="M131 40v68" opacity="0.36" />
          <path d="M78 74h106" opacity="0.36" />
        </g>
      </svg>
    );
  }
  if (kind === "decode") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="28" y="34" width="132" height="90" rx="10" fill="currentColor" opacity="0.055" />
        <path d="M28 42 94 88l38-46M28 34h132a10 10 0 0 1 10 10v70a10 10 0 0 1-10 10H38a10 10 0 0 1-10-10V44a10 10 0 0 1 10-10Z" />
        <path d="M182 62h40m-40 18h40m-40 18h26" opacity="0.7" />
        <path d="m190 108 12 12 20-22" opacity="0.85" />
      </svg>
    );
  }

  if (kind === "studio") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="30" y="30" width="120" height="86" rx="8" fill="currentColor" opacity="0.055" />
        <rect x="30" y="30" width="120" height="86" rx="8" />
        <path d="M52 96 78 62l16 14 26-32" opacity="0.7" />
        <circle cx="52" cy="96" r="4" fill="currentColor" />
        <circle cx="78" cy="62" r="4" fill="currentColor" />
        <circle cx="94" cy="76" r="4" fill="currentColor" />
        <circle cx="120" cy="44" r="4" fill="currentColor" />
        <path d="m164 108 40-52 12 9-40 52-16 5 4-14Z" fill="currentColor" opacity="0.07" />
        <path d="m164 108 40-52 12 9-40 52-16 5 4-14Z" />
      </svg>
    );
  }

  if (kind === "schematic") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="24" y="60" width="34" height="26" rx="5" fill="currentColor" opacity="0.09" />
        <rect x="24" y="60" width="34" height="26" rx="5" />
        <rect x="103" y="20" width="34" height="26" rx="5" fill="currentColor" opacity="0.09" />
        <rect x="103" y="20" width="34" height="26" rx="5" />
        <rect x="103" y="100" width="34" height="26" rx="5" fill="currentColor" opacity="0.09" />
        <rect x="103" y="100" width="34" height="26" rx="5" />
        <rect x="182" y="60" width="34" height="26" rx="5" fill="currentColor" opacity="0.09" />
        <rect x="182" y="60" width="34" height="26" rx="5" />
        <path d="M58 73h45m0-40v27m0 13v27m0-40h45M137 73h45" opacity="0.75" />
        <circle cx="103" cy="73" r="3.4" fill="currentColor" />
      </svg>
    );
  }

  if (kind === "glossary") {
    return (
      <svg viewBox="0 0 240 150" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M120 34c-14-9-46-11-70-4v82c24-7 56-5 70 4 14-9 46-11 70-4V30c-24-7-56-5-70 4Z" fill="currentColor" opacity="0.055" />
        <path d="M120 34c-14-9-46-11-70-4v82c24-7 56-5 70 4 14-9 46-11 70-4V30c-24-7-56-5-70 4Z" />
        <path d="M120 34v82" opacity="0.5" />
        <path d="M66 48c18-5 38-4 50 3m-50 19c18-5 38-4 50 3m-50 19c18-5 38-4 50 3" opacity="0.55" />
        <path d="M174 48c-18-5-38-4-50 3m50 16c-18-5-38-4-50 3m50 19c-18-5-38-4-50 3" opacity="0.35" />
        <path d="M150 16v26l9-8 9 8V16" fill="currentColor" opacity="0.09" />
        <path d="M150 16v26l9-8 9 8V16" />
      </svg>
    );
  }

  return null;
}

export default HubCardArt;
