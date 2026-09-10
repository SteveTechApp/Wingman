import {
  Cable,
  LayoutPanelTop,
  Mic2,
  MonitorUp,
  Network,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

type SectionGraphic = {
  tone: string;
  Icon: LucideIcon;
};

const sectionGraphics: Record<string, SectionGraphic> = {
  "About the space": { tone: "aqua", Icon: LayoutPanelTop },
  "Sources & displays": { tone: "blue", Icon: MonitorUp },
  "Unified Communications": { tone: "purple", Icon: Mic2 },
  "Audio, control & conferencing": { tone: "green", Icon: SlidersHorizontal },
  "Room layout & cabling": { tone: "amber", Icon: Cable },
  "Video wall intent": { tone: "rose", Icon: Network },
};

export function getDiscoverySectionTone(section: string) {
  return sectionGraphics[section]?.tone ?? sectionGraphics["About the space"].tone;
}

type DiscoveryQuestionIntroProps = {
  section: string;
  shortLabel: string;
  question: string;
  prompt: string;
  showMultiSelectNote: boolean;
  conflictAlert: ReactNode;
};

export function DiscoveryQuestionGraphic({ section }: { section: string }) {
  const graphic = sectionGraphics[section] ?? sectionGraphics["About the space"];
  const { Icon } = graphic;

  return (
    <span className={`wm-discovery-question-graphic is-${graphic.tone}`} aria-hidden="true">
      <Icon />
    </span>
  );
}

export function DiscoveryQuestionIntro({
  section,
  shortLabel,
  question,
  prompt,
  showMultiSelectNote,
  conflictAlert,
}: DiscoveryQuestionIntroProps) {
  return (
    <div className="wm-discovery-question-intro">
      <DiscoveryQuestionGraphic section={section} />
      <div className="wm-discovery-question-heading wm-ui-title">
        <span>{shortLabel}</span>
        <h2 className="wm-ui-title">{question}</h2>
        <p className="wm-ui-copy">{prompt}</p>
        {showMultiSelectNote && (
          <small className="wm-discovery-multi-select-note">
            Select one or more options, then choose Continue.
          </small>
        )}
        {conflictAlert}
      </div>
    </div>
  );
}
