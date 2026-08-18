import type { LucideIcon } from "lucide-react";
import {
  Bot,
  BookOpen,
  Boxes,
  ClipboardList,
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
  | "recommendations"
  | "productFamilies"
  | "productPitch"
  | "catalogBrowser"
  | "compare"
  | "templates"
  | "videowall"
  | "salesHelper"
  | "glossary"
  | "callCards"
  | "productCallCards"
  | "ingest"
  | "proposal"
  | "support"
  | "profile" | "proposalVisuals";

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
  recommendations: Search,
  productFamilies: LayoutTemplate,
  productPitch: PackageCheck,
  catalogBrowser: Boxes,
  compare: Scale,
  templates: LayoutTemplate,
  videowall: Monitor,
  salesHelper: Bot,
  glossary: BookOpen,
  callCards: ClipboardList,
  productCallCards: PackageCheck,
  ingest: FileUp,
  proposal: FileText,
  support: LifeBuoy,
  profile: Settings,
  proposalVisuals: Workflow,
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
  "templates",
  "compare",
  "documents",
  "responsePack",
  "projects",
  "learn",
  "profile",
] as const satisfies readonly WingmanRouteKey[];

export const consolidatedRouteGroups = {
  callCoach: ["callCards", "productCallCards", "discovery", "salesHelper", "support"],
  products: ["productFamilies", "catalogBrowser", "productCallCards", "productPitch", "videowall", "proposal"],
  documents: ["ingest", "templates", "compare", "proposal"],
  responsePack: ["proposal", "support", "proposalVisuals", "templates"],
  learn: ["glossary", "support", "productFamilies"],
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

  if (pathname.startsWith("/wingman/product-call-cards/")) {
    return routeCatalogByKey.productCallCards;
  }

  if (pathname.startsWith("/wingman/product-families/")) {
    return routeCatalogByKey.productFamilies;
  }

  if (normalizedPath === "/wingman/profile") {
    return routeCatalogByKey.profile;
  }

  return routeCatalog.find((route) => route.path === normalizedPath || `/wingman/${route.segment}` === normalizedPath);
}
