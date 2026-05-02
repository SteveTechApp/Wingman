import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

type WorkflowActionCardProps = {
  title: string;
  summary: string;
  Icon: LucideIcon;
  onClick: () => void;
};

export function WorkflowActionCard({ title, summary, Icon, onClick }: WorkflowActionCardProps) {
  return (
    <button type="button" onClick={onClick} className="wm-dashboard-action-card wm-workflow-action-card">
      <span className="wm-dashboard-action-icon" aria-hidden="true">
        <Icon size={28} strokeWidth={2.2} />
      </span>

      <span className="wm-dashboard-action-copy">
        <strong>{title}</strong>
        <span>{summary}</span>
      </span>

      <span className="wm-dashboard-action-arrow" aria-hidden="true">
        <ArrowRight size={24} strokeWidth={2.35} />
      </span>
    </button>
  );
}
