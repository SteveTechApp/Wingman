import { Building2, CircleHelp, GraduationCap, Martini, Network, PanelsTopLeft, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "meeting-room": Building2,
  classroom: GraduationCap,
  hospitality: Martini,
  "video-wall": PanelsTopLeft,
  "av-over-ip": Network,
  "not-sure": CircleHelp,
};

export function DiscoveryOpportunityGraphic({ option }: { option: string }) {
  const Icon = icons[option] ?? CircleHelp;
  return <span className="wm-discovery-option-graphic" aria-hidden="true"><Icon /></span>;
}
