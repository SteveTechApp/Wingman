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
  | "callCoach"
  | "products"
  | "documents"
  | "responsePack"
  | "learn"
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
  | "productCallCards"
  | "ingest"
  | "proposal"
  | "support"
  | "intelligence"
  | "profile" | "visualStudio";

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
  callCoach: Bot,
  products: PackageCheck,
  documents: FileUp,
  responsePack: FileText,
  learn: BookOpen,
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
  productCallCards: PackageCheck,
  ingest: FileUp,
  proposal: FileText,
  support: LifeBuoy,
  intelligence: Database,
  profile: Settings,
  visualStudio: Workflow,
};

const manifest = routeManifest as RouteManifestEntry[];

export const routeCatalog: WingmanRoute[] = manifest.map((route) => ({
  ...route,
  icon: iconMap[route.key],
}));

export const routeCatalogByKey = Object.fromEntries(
  routeCatalog.map((route) => [route.key, route]),
) as Record<WingmanRouteKey, WingmanRoute>;

export const consolidatedPrimaryNavKeys = [
  "dashboard",
  "callCoach",
  "products",
  "compare",
  "documents",
  "responsePack",
  "projects",
  "learn",
  "profile",
] as const satisfies readonly WingmanRouteKey[];

export const consolidatedRouteGroups = {
  callCoach: ["callCards", "productCallCards", "discovery", "salesHelper", "support"],
  products: ["finder", "productFamilies", "productCallCards", "productPitch", "videowall", "proposal"],
  documents: ["ingest", "templates", "compare", "proposal"],
  responsePack: ["proposal", "support", "visualDesign", "templates"],
  learn: ["glossary", "intelligence", "support", "productFamilies"],
} as const satisfies Partial<Record<WingmanRouteKey, readonly WingmanRouteKey[]>>;

export function routeByPath(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/wingman";

  if (normalizedPath === "/wingman") {
    return routeCatalogByKey.dashboard;
  }

  if (pathname.startsWith("/wingman/projects/")) {
    return routeCatalogByKey.projects;
  }

  if (pathname.startsWith("/wingman/templates/")) {
    return routeCatalogByKey.templates;
  }

  if (normalizedPath === "/wingman/profile") {
    return routeCatalogByKey.profile;
  }

  return routeCatalog.find((route) => route.path === normalizedPath || `/wingman/${route.segment}` === normalizedPath);
}
