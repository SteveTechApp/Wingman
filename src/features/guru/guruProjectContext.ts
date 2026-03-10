export type GuruProjectContext = {
  projectName?: string;
  stage?: string;
  skuCount?: number;
};

function safeParse(raw: string | null): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function countSkus(data: any): number {
  if (!data) return 0;

  if (Array.isArray(data.skus)) return data.skus.length;
  if (Array.isArray(data.products)) return data.products.length;
  if (Array.isArray(data.bom)) return data.bom.length;
  if (Array.isArray(data.items)) return data.items.length;

  return 0;
}

export function getProjectContext(): GuruProjectContext {
  try {
    const activeProject =
      safeParse(localStorage.getItem("wm_active_project")) ??
      safeParse(localStorage.getItem("wm_activeProject")) ??
      safeParse(localStorage.getItem("wingman_active_project"));

    if (activeProject) {
      return {
        projectName:
          activeProject?.name ??
          activeProject?.projectName ??
          activeProject?.title,
        stage:
          activeProject?.stage ??
          activeProject?.projectStage ??
          activeProject?.status,
        skuCount: countSkus(activeProject),
      };
    }

    const projectSkus =
      safeParse(localStorage.getItem("wm_project_skus")) ??
      safeParse(localStorage.getItem("wm_projectSkus")) ??
      [];

    return {
      projectName: undefined,
      stage: undefined,
      skuCount: Array.isArray(projectSkus) ? projectSkus.length : 0,
    };
  } catch {
    return {};
  }
}