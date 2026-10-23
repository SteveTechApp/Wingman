import type { ReactNode } from "react";
import { SectionCard } from "../../components/SectionCard";
import { CopyPanelLink } from "./CopyPanelLink";

/**
 * A project panel: the shared section card, plus the address of that panel.
 *
 * Project panels are rendered through this rather than through `SectionCard`
 * directly so a panel cannot reach the page without a way to share it. The
 * action is derived from the same `anchorId` that makes the panel a landing
 * target, which is also what keeps the two from disagreeing: a panel that can
 * be landed on can be sent, and a panel the registry does not name gets a card
 * with no action rather than a link that would land somewhere else.
 */
export function ProjectPanel({ projectId, anchorId, title, subtitle, children }: {
  projectId: string;
  anchorId: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <SectionCard
      anchorId={anchorId}
      title={title}
      subtitle={subtitle}
      rightSlot={<CopyPanelLink projectId={projectId} anchorId={anchorId} />}
    >
      {children}
    </SectionCard>
  );
}
