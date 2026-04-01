export const routeMap = {
  public: {
    landing: "/",
    login: "/login",
    signup: "/signup",
  },
  app: {
    dashboard: "/app/dashboard",
    projects: "/app/projects",
    projectNew: "/app/projects/new",

    tools: "/app/tools",
    discovery: "/app/tools/discovery",
    catalog: "/app/tools/catalog",
    catalogue: "/app/tools/catalog",
    proposal: "/app/tools/proposal?stage=proposal",
    proposals: "/app/tools/proposal?stage=proposal",
    architecture: "/app/tools/proposal?stage=architecture",
    bom: "/app/tools/proposal?stage=bom",
    navigator: "/app/tools/navigator",
    compare: "/app/tools/compare",
    competitorCompare: "/app/tools/compare",
    training: "/app/tools/training",
    templates: "/app/tools/templates",
    importIntake: "/app/tools/import-intake",
    videoWall: "/app/tools/video-wall",
    videowall: "/app/tools/video-wall",
    guru: "/app/tools/guru",
    sales: "/app/tools/sales",
    productIntelligence: "/app/tools/product-intelligence",
    roomDesigner: "/app/tools/room-wizard",
    roomWizard: "/app/tools/room-wizard",
    projectLauncher: "/app/projects/new",
  },
} as const;

export type RouteMap = typeof routeMap;

export type AppRouteValue =
  | (typeof routeMap.public)[keyof typeof routeMap.public]
  | (typeof routeMap.app)[keyof typeof routeMap.app];

const legacyRouteRedirects: Record<string, AppRouteValue> = {
  "/app/tools/proposal": routeMap.app.architecture,
  "/app/tools/proposal?tab=bom": routeMap.app.bom,
  "/wingman/dashboard": routeMap.app.dashboard,
  "/wingman/projects": routeMap.app.projects,
  "/wingman/project-launcher": routeMap.app.projectLauncher,
  "/wingman/tools": routeMap.app.tools,
  "/wingman/discovery": routeMap.app.discovery,
  "/wingman/catalog": routeMap.app.catalog,
  "/wingman/catalogue": routeMap.app.catalogue,
  "/wingman/proposal": routeMap.app.proposal,
  "/wingman/proposals": routeMap.app.proposals,
  "/wingman/architecture": routeMap.app.architecture,
  "/wingman/bom": routeMap.app.bom,
  "/wingman/navigator": routeMap.app.navigator,
  "/wingman/compare": routeMap.app.compare,
  "/wingman/competitor-compare": routeMap.app.competitorCompare,
  "/wingman/training": routeMap.app.training,
  "/wingman/templates": routeMap.app.templates,
  "/wingman/import-intake": routeMap.app.importIntake,
  "/wingman/video-wall": routeMap.app.videoWall,
  "/wingman/videowall": routeMap.app.videowall,
  "/wingman/guru": routeMap.app.guru,
  "/wingman/sales": routeMap.app.sales,
  "/wingman/product-intelligence": routeMap.app.productIntelligence,
  "/wingman/room-designer": routeMap.app.roomDesigner,
  "/wingman/room-wizard": routeMap.app.roomWizard,
};

export function normalizeAppRoute(input?: string | null): AppRouteValue {
  if (!input) return routeMap.app.dashboard;

  if (input in legacyRouteRedirects) {
    return legacyRouteRedirects[input];
  }

  const allRoutes = [
    ...Object.values(routeMap.public),
    ...Object.values(routeMap.app),
  ];

  if (allRoutes.includes(input as AppRouteValue)) {
    return input as AppRouteValue;
  }

  return routeMap.app.dashboard;
}

/**
 * Backward compatibility export.
 * Supports both the old lowercase access pattern and the newer uppercase constants.
 */
export const WM_ROUTES = {
  LANDING: routeMap.public.landing,
  LOGIN: routeMap.public.login,
  SIGNUP: routeMap.public.signup,

  DASHBOARD: routeMap.app.dashboard,
  PROJECTS: routeMap.app.projects,
  PROJECT_NEW: routeMap.app.projectNew,
  PROJECT_LAUNCHER: routeMap.app.projectLauncher,

  TOOLS: routeMap.app.tools,
  DISCOVERY: routeMap.app.discovery,
  CATALOG: routeMap.app.catalog,
  CATALOGUE: routeMap.app.catalogue,
  PROPOSAL: routeMap.app.proposal,
  PROPOSALS: routeMap.app.proposals,
  ARCHITECTURE: routeMap.app.architecture,
  BOM: routeMap.app.bom,
  NAVIGATOR: routeMap.app.navigator,
  COMPARE: routeMap.app.compare,
  COMPETITOR_COMPARE: routeMap.app.competitorCompare,
  TRAINING: routeMap.app.training,
  TEMPLATES: routeMap.app.templates,
  IMPORT_INTAKE: routeMap.app.importIntake,
  VIDEO_WALL: routeMap.app.videoWall,
  GURU: routeMap.app.guru,
  SALES: routeMap.app.sales,
  PRODUCT_INTELLIGENCE: routeMap.app.productIntelligence,
  ROOM_DESIGNER: routeMap.app.roomDesigner,
  ROOM_WIZARD: routeMap.app.roomWizard,

  landing: routeMap.public.landing,
  login: routeMap.public.login,
  signup: routeMap.public.signup,

  dashboard: routeMap.app.dashboard,
  projects: routeMap.app.projects,
  projectNew: routeMap.app.projectNew,
  projectLauncher: routeMap.app.projectLauncher,

  tools: routeMap.app.tools,
  discovery: routeMap.app.discovery,
  catalog: routeMap.app.catalog,
  catalogue: routeMap.app.catalogue,
  proposal: routeMap.app.proposal,
  proposals: routeMap.app.proposals,
  architecture: routeMap.app.architecture,
  bom: routeMap.app.bom,
  navigator: routeMap.app.navigator,
  compare: routeMap.app.compare,
  competitorCompare: routeMap.app.competitorCompare,
  training: routeMap.app.training,
  templates: routeMap.app.templates,
  importIntake: routeMap.app.importIntake,
  videoWall: routeMap.app.videoWall,
  videowall: routeMap.app.videowall,
  guru: routeMap.app.guru,
  sales: routeMap.app.sales,
  productIntelligence: routeMap.app.productIntelligence,
  roomDesigner: routeMap.app.roomDesigner,
  roomWizard: routeMap.app.roomWizard,
} as const;
