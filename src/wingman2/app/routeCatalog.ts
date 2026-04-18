import type { LucideIcon } from "lucide-react";
import {
  Bot,
  ClipboardList,
  FileText,
  FileUp,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  Monitor,
  Scale,
  Search,
} from "lucide-react";
import routeManifest from "./route-manifest.json";

export type WingmanRouteKey =
  | "dashboard"
  | "projects"
  | "discovery"
  | "finder"
  | "compare"
  | "templates"
  | "videowall"
  | "salesHelper"
  | "callCards"
  | "ingest"
  | "proposal"
  | "support";

type RouteManifestEntry = {
  key: WingmanRouteKey;
  path: string;
  segment: string;
  label: string;
  navLabel: string;
  pageFile: string;
  summary: string;
};

export type WingmanRoute = RouteManifestEntry & {
  icon: LucideIcon;
};

const iconMap: Record<WingmanRouteKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  discovery: ClipboardList,
  finder: Search,
  compare: Scale,
  templates: LayoutTemplate,
  videowall: Monitor,
  salesHelper: Bot,
  callCards: ClipboardList,
  ingest: FileUp,
  proposal: FileText,
  support: LifeBuoy,
};

const manifest = routeManifest as RouteManifestEntry[];

export const routeCatalog: WingmanRoute[] = manifest.map((route) => ({
  ...route,
  icon: iconMap[route.key],
}));

export const routeCatalogByKey = Object.fromEntries(
  routeCatalog.map((route) => [route.key, route]),
) as Record<WingmanRouteKey, WingmanRoute>;

export function routeByPath(pathname: string) {
  return routeCatalog.find((route) => route.path === pathname);
}
