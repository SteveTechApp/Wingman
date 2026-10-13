import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";
import type { CustomRoomTemplate } from "./customRoomTemplates";
import { buildDiscoveryHandoffFromTemplate } from "./discoveryTemplateHandoff";
import { normaliseProjectTopology } from "./projectTopology";
import { isWyreStormManufacturer } from "./equipmentLibrary";

export function templateRoomBuilderHandoff(template: RoomTemplate | CustomRoomTemplate, rows: TemplateBomRow[]) {
  const handoff = buildDiscoveryHandoffFromTemplate(template);
  const topology = normaliseProjectTopology(handoff.topology);
  if (!topology.locations.length) topology.locations = [{ id: "template-room", name: "Room — positions to confirm", type: "unknown" }];
  topology.devices = rows.filter(row => row.qty > 0 && row.status !== "excluded").map(row => {
    const previous = topology.devices.find(device => device.id === row.id);
    const thirdParty = row.sku.startsWith("BY-OTHERS") || Boolean(row.manufacturer && !isWyreStormManufacturer(row.manufacturer));
    return { ...previous, id: row.id, name: row.description, category: row.role,
      locationId: previous?.locationId || topology.locations[0].id,
      manufacturer: row.manufacturer || (thirdParty ? "" : "WyreStorm"), sku: row.model || row.sku,
      quantity: row.qty, thirdParty, status: "assumed" as const, notes: row.notes };
  });
  const ids = new Set(topology.devices.map(device => device.id));
  topology.connections = topology.connections.filter(connection => ids.has(connection.fromDeviceId) && ids.has(connection.toDeviceId));
  return { ...handoff, topology };
}
