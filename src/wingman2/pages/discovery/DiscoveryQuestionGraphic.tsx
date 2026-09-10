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

type DiscoveryQuestionIntroProps = {
  section: string;
  shortLabel: string;
  question: string;
  prompt: string;
  showMultiSelectNote: boolean;
  conflictAlert: ReactNode;
};

export function DiscoveryQuestionGraphic({ section }: { section: string }) {
  const { tone, Icon } = sectionGraphics[section] ?? sectionGraphics["About the space"];

  return (
    <span className={`wm-discovery-question-graphic is-${tone}`} aria-hidden="true">
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
