import type { ProjectTopology } from "./projectTopology";

export const EQUIPMENT_ROLES = ["Display", "Projector", "Speaker", "Microphone", "Audio processor", "Amplifier", "Camera", "Control", "Network switch", "AV over IP encoder", "AV over IP decoder", "Video processor", "Cable", "Mount", "Rack", "Power", "Other"] as const;
export type EquipmentRole = typeof EQUIPMENT_ROLES[number];
export type EquipmentRelationship = "competitor" | "complementary";
export type LibraryEquipment = {
  id: string; manufacturer: string; model: string; role: EquipmentRole;
  relationship: EquipmentRelationship;
  description: string; connections: string; specifications: string; accessories: string;
  sourceUrl: string; checkedOn: string; notes: string; preferred: boolean;
};
export const EQUIPMENT_LIBRARY_KEY = "wingman-equipment-library-v1";
export const EQUIPMENT_LIBRARY_EVENT = "wingman:equipment-library-changed";

export function isWyreStormManufacturer(manufacturer: string | undefined): boolean {
  const normalized = String(manufacturer || "").replace(/wyre[\s-]?storm/gi, "wyre storm").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return /^wyre storm(?: technologies| av| limited| ltd| inc| incorporated| llc| corp| corporation| international| group| systems){0,3}$/.test(normalized);
}

export function canonicalManufacturerName(manufacturer: string): string {
  return isWyreStormManufacturer(manufacturer) ? "WyreStorm" : manufacturer.trim();
}

export function readEquipmentLibrary(): LibraryEquipment[] {
  try {
    const rows: unknown = JSON.parse(window.localStorage.getItem(EQUIPMENT_LIBRARY_KEY) || "[]");
    if (!Array.isArray(rows)) return [];
    return rows.filter((row): row is LibraryEquipment => Boolean(row && typeof row === "object" &&
      typeof row.id === "string" && typeof row.manufacturer === "string" && typeof row.model === "string" &&
      EQUIPMENT_ROLES.includes(row.role))).map(row => ({
      ...row, manufacturer: canonicalManufacturerName(row.manufacturer), relationship: row.relationship === "competitor" ? "competitor" : "complementary",
        description: String(row.description || ""), connections: String(row.connections || ""), specifications: String(row.specifications || ""),
        accessories: String(row.accessories || ""), sourceUrl: String(row.sourceUrl || ""),
        checkedOn: String(row.checkedOn || ""), notes: String(row.notes || ""), preferred: Boolean(row.preferred),
      }));
  } catch { return []; }
}

export function saveLibraryEquipment(input: Omit<LibraryEquipment, "id"> & { id?: string }): LibraryEquipment {
  if (!input.manufacturer.trim() || !input.model.trim()) throw new Error("Enter the manufacturer and exact model / SKU.");
  if (input.sourceUrl && !/^https?:\/\//i.test(input.sourceUrl)) throw new Error("Use an http or https datasheet link.");
  const manufacturer = canonicalManufacturerName(input.manufacturer);
  const relationship: EquipmentRelationship = !isWyreStormManufacturer(manufacturer) && input.relationship === "competitor" ? "competitor" : "complementary";
  const rows = readEquipmentLibrary();
  const existing = rows.find(row => row.id === input.id ||
    (row.manufacturer.toLowerCase() === manufacturer.toLowerCase() && row.model.toLowerCase() === input.model.trim().toLowerCase()));
  const item = { ...input, manufacturer, relationship, model: input.model.trim(), id: existing?.id || crypto.randomUUID() };
  window.localStorage.setItem(EQUIPMENT_LIBRARY_KEY, JSON.stringify([...rows.filter(row => row.id !== item.id), item]));
  window.dispatchEvent(new Event(EQUIPMENT_LIBRARY_EVENT));
  return item;
}

export function removeLibraryEquipment(id: string) {
  window.localStorage.setItem(EQUIPMENT_LIBRARY_KEY, JSON.stringify(readEquipmentLibrary().filter(row => row.id !== id)));
  window.dispatchEvent(new Event(EQUIPMENT_LIBRARY_EVENT));
}

export function addEquipmentToRoom(topology: ProjectTopology, item: LibraryEquipment, locationId: string, quantity: number): ProjectTopology {
  if (!topology.locations.some(location => location.id === locationId)) throw new Error("Choose a room location first.");
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Enter a whole-number quantity of at least one.");
  const category = item.role.toLowerCase().replaceAll(" ", "-");
  const placeholder = topology.devices.find(device => device.locationId === locationId && device.category.toLowerCase() === category && !device.sku && device.status !== "confirmed");
  const device = {
    id: placeholder?.id || crypto.randomUUID(), name: `${item.manufacturer} ${item.model}`, category,
    locationId, manufacturer: canonicalManufacturerName(item.manufacturer), sku: item.model, quantity, thirdParty: !isWyreStormManufacturer(item.manufacturer),
    status: "assumed" as const, notes: ["Selected from equipment library; suitability and connections need review.",
      item.description && `Product description: ${item.description}`,
      item.connections && `Connections: ${item.connections}`, item.specifications && `Recorded specifications: ${item.specifications}`,
      item.accessories && `Accessories / dependencies: ${item.accessories}`, item.sourceUrl && `Source: ${item.sourceUrl}`,
      item.checkedOn && `Last checked: ${item.checkedOn}`, item.notes].filter(Boolean).join("\n"),
  };
  return { ...topology, updatedAt: new Date().toISOString(), devices: placeholder
    ? topology.devices.map(row => row.id === placeholder.id ? device : row)
    : [...topology.devices, device] };
}
