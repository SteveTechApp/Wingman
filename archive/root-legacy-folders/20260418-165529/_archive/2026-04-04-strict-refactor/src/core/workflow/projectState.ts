export type WingmanProjectState = {
  name: string;
  stage: string;
  customer?: string;
  roomType?: string;
  application?: string;
  displayCount?: number;
  sourceCount?: number;
  distanceM?: number;
  budgetBand?: string;
  notes?: string;
  avGuide?: {
    control?: string;
    usb?: string;
    audio?: string;
  };
  videoWall?: {
    wallType?: string;
    layout?: string;
    processor?: string;
    sources?: string;
    notes?: string;
  };
  bom?: Array<{
    sku: string;
    desc: string;
    qty: number;
    role: string;
  }>;
};

const STORAGE_KEY = "wm_active_project";

export function emptyProjectState(): WingmanProjectState {
  return {
    name: "New Wingman Project",
    stage: "Discovery",
    customer: "",
    roomType: "",
    application: "",
    displayCount: 0,
    sourceCount: 0,
    distanceM: 0,
    budgetBand: "",
    notes: "",
    avGuide: {
      control: "",
      usb: "",
      audio: "",
    },
    videoWall: {
      wallType: "LCD",
      layout: "2x2",
      processor: "",
      sources: "",
      notes: "",
    },
    bom: [],
  };
}

export function loadProjectState(): WingmanProjectState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProjectState();

    const parsed = JSON.parse(raw) as WingmanProjectState;
    return {
      ...emptyProjectState(),
      ...parsed,
      avGuide: {
        ...emptyProjectState().avGuide,
        ...(parsed.avGuide ?? {}),
      },
      videoWall: {
        ...emptyProjectState().videoWall,
        ...(parsed.videoWall ?? {}),
      },
      bom: Array.isArray(parsed.bom) ? parsed.bom : [],
    };
  } catch {
    return emptyProjectState();
  }
}

export function saveProjectState(state: WingmanProjectState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function updateProjectState(
  patch: Partial<WingmanProjectState>
): WingmanProjectState {
  const current = loadProjectState();
  const next: WingmanProjectState = {
    ...current,
    ...patch,
    avGuide: {
      ...(current.avGuide ?? {}),
      ...(patch.avGuide ?? {}),
    },
    videoWall: {
      ...(current.videoWall ?? {}),
      ...(patch.videoWall ?? {}),
    },
    bom: patch.bom ?? current.bom ?? [],
  };

  saveProjectState(next);
  return next;
}