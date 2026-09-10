import {
  Building2,
  Cable,
  Camera,
  CircleHelp,
  GraduationCap,
  Gauge,
  Hash,
  Laptop,
  Martini,
  Mic2,
  Monitor,
  Network,
  PanelsTopLeft,
  Route,
  SlidersHorizontal,
  Speaker,
  Usb,
  Wifi,
  type LucideIcon,
} from "lucide-react";

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

export function DiscoveryOptionGraphic({ option, step, label }: { option: string; step: string; label: string }) {
  if (step === "opportunity") return <DiscoveryOpportunityGraphic option={option} />;

  const meaning = `${option} ${label}`.toLowerCase();
  let Icon: LucideIcon = Hash;

  if (/unknown|not sure|not yet/.test(meaning)) Icon = CircleHelp;
  else if (/video.?wall|led processor|multiview/.test(meaning)) Icon = PanelsTopLeft;
  else if (/camera/.test(meaning)) Icon = Camera;
  else if (/microphone|\bmic\b/.test(meaning)) Icon = Mic2;
  else if (/audio|speaker|amplif/.test(meaning)) Icon = Speaker;
  else if (/control|touch|automation/.test(meaning)) Icon = SlidersHorizontal;
  else if (/usb/.test(meaning)) Icon = Usb;
  else if (/wireless|wi-?fi/.test(meaning)) Icon = Wifi;
  else if (/cable|distance|connection|location/.test(meaning)) Icon = Cable;
  else if (/network|av-over-ip|campus|building|multi-room/.test(meaning)) Icon = Network;
  else if (/route|matrix|independent/.test(meaning)) Icon = Route;
  else if (/display|output|projector|mirror/.test(meaning)) Icon = Monitor;
  else if (/source|laptop|hdmi|player/.test(meaning)) Icon = Laptop;
  else if (/quality|resolution|4k|1080|bandwidth|performance/.test(meaning)) Icon = Gauge;
  else if (/classroom|teaching/.test(meaning)) Icon = GraduationCap;
  else if (/hospitality|bar|venue/.test(meaning)) Icon = Martini;
  else if (/room|space|zone/.test(meaning)) Icon = Building2;
  else if (/camera/.test(step)) Icon = Camera;
  else if (/microphone/.test(step)) Icon = Mic2;
  else if (/audio/.test(step)) Icon = Speaker;
  else if (/control/.test(step)) Icon = SlidersHorizontal;
  else if (/display/.test(step)) Icon = Monitor;
  else if (/source/.test(step)) Icon = Laptop;

  return <span className="wm-discovery-option-graphic" aria-hidden="true"><Icon /></span>;
}
