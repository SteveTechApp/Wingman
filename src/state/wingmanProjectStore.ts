export type ProjectSku = {
  sku: string;
  name: string;
  role: string;
  qty: number;
};

const STORAGE_KEY = "wm_project_skus";

function load(): ProjectSku[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function save(rows: ProjectSku[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function getProjectSkus(): ProjectSku[] {
  return load();
}

export function addProjectSku(item: ProjectSku) {
  const rows = load();

  const existing = rows.find(r => r.sku === item.sku);

  if (existing) {
    existing.qty += item.qty;
  } else {
    rows.push(item);
  }

  save(rows);
}

export function clearProjectSkus() {
  save([]);
}