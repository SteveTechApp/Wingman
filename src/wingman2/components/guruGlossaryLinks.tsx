import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { AV_GLOSSARY_TERMS, type AvGlossaryTerm } from "../data/avGlossary";
import { cleanText } from "../lib/productCallCardText";

// Guru glossary linking for Product Call Cards: detects known technical terms
// in free text and links them to the Guru glossary. Extracted verbatim from
// ProductCallCardsPage.tsx (term data, matcher and renderer).

type GuruTechnicalTerm = {
  label: string;
  aliases: string[];
  plainEnglish: string;
};

const GURU_TECHNICAL_TERMS: GuruTechnicalTerm[] = [
  {
    label: "Low Z",
    aliases: ["Low Z", "Low-Z", "Low impedance", "low-impedance"],
    plainEnglish: "Low impedance speaker wiring, normally used for shorter speaker runs and direct amplifier-to-speaker connections.",
  },
  {
    label: "High Z",
    aliases: ["High Z", "High-Z", "70V", "100V", "constant voltage"],
    plainEnglish: "High impedance / constant-voltage speaker systems, normally used for longer cable runs or multiple speakers across a zone.",
  },
  {
    label: "Dante",
    aliases: ["Dante"],
    plainEnglish: "Networked digital audio over standard IP networks, often used to route audio between DSPs, amplifiers and audio devices.",
  },
  {
    label: "AES67",
    aliases: ["AES67"],
    plainEnglish: "An audio-over-IP interoperability standard used to help different network audio systems pass audio between each other.",
  },
  {
    label: "DSP",
    aliases: ["DSP"],
    plainEnglish: "Digital signal processing for audio, used for EQ, mixing, routing, echo cancellation, limiting and room tuning.",
  },
  {
    label: "GPIO",
    aliases: ["GPIO"],
    plainEnglish: "General purpose input/output ports used for simple triggers, contact closures or control integration.",
  },
  {
    label: "RS-232",
    aliases: ["RS-232", "RS232"],
    plainEnglish: "Serial control used to send commands to displays, switchers, projectors and other AV devices.",
  },
  {
    label: "IR",
    aliases: ["IR", "infrared"],
    plainEnglish: "Infrared control, usually used to control source devices or displays in the same way as a handheld remote.",
  },
  {
    label: "HDBaseT",
    aliases: ["HDBaseT", "HDBT"],
    plainEnglish: "AV extension technology that can carry HDMI video, control and sometimes power over category cable.",
  },
  {
    label: "PoE",
    aliases: ["PoE", "Power over Ethernet"],
    plainEnglish: "Power over Ethernet, allowing a network cable to provide power as well as data.",
  },
  {
    label: "PoH",
    aliases: ["PoH", "Power over HDBaseT"],
    plainEnglish: "Power over HDBaseT, allowing a transmitter or receiver to be powered through the HDBaseT cable path.",
  },
  {
    label: "ARC/eARC",
    aliases: ["ARC", "eARC"],
    plainEnglish: "Audio return from a display back into the AV system, commonly used to send TV/display audio to an amplifier or sound system.",
  },
  {
    label: "EDID",
    aliases: ["EDID"],
    plainEnglish: "Display information used by a source to understand supported resolution, audio and format capabilities.",
  },
  {
    label: "HDCP",
    aliases: ["HDCP"],
    plainEnglish: "Copy protection used on HDMI video signals. Version mismatch can stop protected content from displaying correctly.",
  },
  {
    label: "4:4:4",
    aliases: ["4:4:4"],
    plainEnglish: "Full colour sampling, useful for sharp PC text, spreadsheets, CAD and detailed graphics.",
  },
  {
    label: "HDR",
    aliases: ["HDR", "Dolby Vision"],
    plainEnglish: "High dynamic range video for improved brightness, contrast and colour when the full signal chain supports it.",
  },
  {
    label: "CEC",
    aliases: ["CEC"],
    plainEnglish: "HDMI control signalling, often used for basic power/input control between connected HDMI devices.",
  },
  {
    label: "USB-C",
    aliases: ["USB-C"],
    plainEnglish: "Modern reversible connector that may carry video, USB data and laptop charging depending on the device.",
  },
  {
    label: "USB 3.0",
    aliases: ["USB 3.0", "USB3"],
    plainEnglish: "Higher-bandwidth USB, often important for cameras and conferencing devices.",
  },
  {
    label: "BYOD",
    aliases: ["BYOD"],
    plainEnglish: "Bring Your Own Device. A participant brings their own laptop or device to present or join a call.",
  },
  {
    label: "BYOM",
    aliases: ["BYOM"],
    plainEnglish: "Bring Your Own Meeting. A participant runs the meeting from their own laptop while using the room camera, microphone and speakers.",
  },
  {
    label: "Multiview",
    aliases: ["Multiview", "multi-view"],
    plainEnglish: "Showing more than one source at the same time on a single output canvas.",
  },
  {
    label: "H.265",
    aliases: ["H.265", "HEVC"],
    plainEnglish: "Efficient video compression used to reduce network bandwidth in some AV-over-IP systems.",
  },
  {
    label: "H.264",
    aliases: ["H.264"],
    plainEnglish: "Common video compression format used for compatibility and lower-bandwidth video transport.",
  },
  {
    label: "JPEG XS",
    aliases: ["JPEG XS", "JPEG-XS"],
    plainEnglish: "Low-latency, high-quality compression used in premium AV-over-IP systems.",
  },
  {
    label: "SDVoE",
    aliases: ["SDVoE"],
    plainEnglish: "10G AV-over-IP technology used for very high-performance video distribution with extremely low latency.",
  },
  {
    label: "NDI",
    aliases: ["NDI"],
    plainEnglish: "Network Device Interface, commonly used for video production and camera workflows over IP networks.",
  },
  {
    label: "MST",
    aliases: ["MST", "Multi-Stream Transport"],
    plainEnglish: "DisplayPort/USB-C feature that can support multiple display streams from one connection.",
  },
  {
    label: "Line level",
    aliases: ["line level", "line-level"],
    plainEnglish: "An audio signal level used between AV/audio devices before amplification to speakers.",
  },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const GURU_TERM_LOOKUP = new Map<string, GuruTechnicalTerm>();

GURU_TECHNICAL_TERMS.forEach((term) => {
  term.aliases.forEach((alias) => {
    GURU_TERM_LOOKUP.set(alias.toLowerCase(), term);
  });
});

const GURU_TERM_PATTERN = new RegExp(
  `(^|[^A-Za-z0-9])(${GURU_TECHNICAL_TERMS.flatMap((term) => term.aliases).sort((a, b) => b.length - a.length).map(escapeRegex).join("|")})(?=$|[^A-Za-z0-9])`,
  "gi",
);

function findGuruTerm(value: string): GuruTechnicalTerm | undefined {
  return GURU_TERM_LOOKUP.get(value.toLowerCase());
}

function normaliseGuruTerm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findGlossaryTerm(guruTerm: GuruTechnicalTerm): AvGlossaryTerm | undefined {
  const candidates = [guruTerm.label, ...guruTerm.aliases].map(normaliseGuruTerm);

  return AV_GLOSSARY_TERMS.find((term) =>
    [term.id, term.term, term.acronym ?? "", ...term.aliases]
      .map(normaliseGuruTerm)
      .some((candidate) => candidates.includes(candidate)),
  );
}

export function renderGuruGlossaryLinks(text: string, highlightsEnabled = true): ReactNode {
  const source = cleanText(text);

  if (!source) {
    return null;
  }

  if (!highlightsEnabled) {
    return source;
  }

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  GURU_TERM_PATTERN.lastIndex = 0;

  let match = GURU_TERM_PATTERN.exec(source);

  while (match) {
    const prefix = match[1] || "";
    const matchedTerm = match[2] || "";
    const termStart = match.index + prefix.length;

    if (termStart > lastIndex) {
      nodes.push(source.slice(lastIndex, termStart));
    }

    const guruTerm = findGuruTerm(matchedTerm);
    const glossaryTerm = guruTerm ? findGlossaryTerm(guruTerm) : undefined;

    if (guruTerm && glossaryTerm) {
      nodes.push(
        <Link
          key={`${matchedTerm}-${termStart}`}
          className="wm-pcc-guru-term"
          to={`${routeCatalogByKey.glossary.path}?term=${encodeURIComponent(glossaryTerm.id)}`}
          title={`Open ${glossaryTerm.term} in the Guru glossary`}
          aria-label={`${matchedTerm}: open ${glossaryTerm.term} in the Guru glossary`}
        >
          {matchedTerm}
        </Link>,
      );
    }

    if (!guruTerm || !glossaryTerm) {
      nodes.push(matchedTerm);
    }

    lastIndex = termStart + matchedTerm.length;
    match = GURU_TERM_PATTERN.exec(source);
  }

  if (lastIndex < source.length) {
    nodes.push(source.slice(lastIndex));
  }

  return <>{nodes}</>;
}
