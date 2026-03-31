export const WM_ROUTES = {
  discovery: "/wingman/discovery",
  dashboard: "/wingman/dashboard",
  projects: "/wingman/projects",
  projectLauncher: "/wingman/projects/new",
  tools: "/wingman/tools",
  sales: "/wingman/sales",
  training: "/wingman/training",
  guru: "/wingman/guru",
  templates: "/wingman/templates",
  importIntake: "/wingman/import-intake",
  roomDesigner: "/wingman/room-designer",
  catalog: "/wingman/catalog",
  catalogue: "/wingman/catalog",
  compare: "/wingman/compare",
  competitorCompare: "/wingman/competitor-compare",
  navigator: "/wingman/navigator",
  videoWall: "/wingman/video-wall",
  videowall: "/wingman/video-wall",
  proposal: "/wingman/proposal",
  proposals: "/wingman/proposal",
} as const;

export type WingmanRouteKey = keyof typeof WM_ROUTES;
export type WingmanRoute = (typeof WM_ROUTES)[WingmanRouteKey];