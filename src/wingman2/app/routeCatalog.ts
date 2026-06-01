import type { LucideIcon } from "lucide-react";
import {
  Bot,
  BookOpen,
  ClipboardList,
  Database,
  FileText,
  FileUp,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  Monitor,
  PackageCheck,
  Scale,
  Search,
  Settings,
  Workflow,
} from "lucide-react";
import routeManifest from "./route-manifest.json";

export type WingmanRouteKey =
  | "dashboard"
  | "projects"
  | "discovery"
  | "finder"
  | "productFamilies"
  | "productPitch"
  | "compare"
  | "templates"
  | "videowall"
  | "salesHelper"
  | "visualDesign"
  | "glossary"
  | "callCards"
  | "ingest"
  | "proposal"
  | "support"
  | "intelligence"
  | "profile";

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
  productFamilies: LayoutTemplate,
  productPitch: PackageCheck,
  compare: Scale,
  templates: LayoutTemplate,
  videowall: Monitor,
  salesHelper: Bot,
  visualDesign: Workflow,
  glossary: BookOpen,
  callCards: ClipboardList,
  ingest: FileUp,
  proposal: FileText,
  support: LifeBuoy,
  intelligence: Database,
  profile: Settings,
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
  if (pathname.startsWith("/wingman/projects/")) {
    return routeCatalogByKey.projects;
  }

  if (pathname.startsWith("/wingman/templates/")) {
    return routeCatalogByKey.templates;
  }

  return routeCatalog.find((route) => route.path === pathname);
}
