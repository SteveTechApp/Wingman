export type UcCompetitorProduct = {
  manufacturer: string;
  model: string;
  comparisonText: string;
};

const VIDEO_BAR = "USB UC video bar soundbar camera microphone speaker conferencing";
const ROOM_APPLIANCE = `${VIDEO_BAR} native Teams Zoom room appliance`;
const FIXED_CAMERA = "fixed conferencing camera";
const PTZ_CAMERA = "PTZ conferencing camera";
const MULTI_CAMERA = "multi-camera conferencing camera";

export const UC_COMPETITOR_PRODUCTS: UcCompetitorProduct[] = [
  { manufacturer: "HP Poly", model: "Studio R30", comparisonText: VIDEO_BAR },
  { manufacturer: "HP Poly", model: "Studio USB", comparisonText: VIDEO_BAR },
  { manufacturer: "HP Poly", model: "Studio V12", comparisonText: VIDEO_BAR },
  { manufacturer: "HP Poly", model: "Studio V52", comparisonText: VIDEO_BAR },
  { manufacturer: "HP Poly", model: "Studio X30", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "HP Poly", model: "Studio X52", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "HP Poly", model: "Studio X70", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "HP Poly", model: "Studio E70", comparisonText: FIXED_CAMERA },

  { manufacturer: "Logitech", model: "MeetUp 2", comparisonText: VIDEO_BAR },
  { manufacturer: "Logitech", model: "Rally Bar Huddle", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "Logitech", model: "Rally Bar Mini", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "Logitech", model: "Rally Bar", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "Logitech", model: "Rally Camera", comparisonText: PTZ_CAMERA },
  { manufacturer: "Logitech", model: "Sight", comparisonText: MULTI_CAMERA },

  { manufacturer: "Yealink", model: "MeetingBar A10", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "Yealink", model: "MeetingBar A20", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "Yealink", model: "MeetingBar A30", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "Yealink", model: "MeetingBar A40", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "Yealink", model: "MeetingBar A50", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "Yealink", model: "UVC34", comparisonText: VIDEO_BAR },
  { manufacturer: "Yealink", model: "UVC40", comparisonText: VIDEO_BAR },
  { manufacturer: "Yealink", model: "UVC84", comparisonText: PTZ_CAMERA },
  { manufacturer: "Yealink", model: "UVC86", comparisonText: PTZ_CAMERA },
  { manufacturer: "Yealink", model: "SmartVision 40", comparisonText: VIDEO_BAR },

  { manufacturer: "Huddly", model: "IQ", comparisonText: FIXED_CAMERA },
  { manufacturer: "Huddly", model: "S1", comparisonText: FIXED_CAMERA },
  { manufacturer: "Huddly", model: "L1", comparisonText: FIXED_CAMERA },
  { manufacturer: "Huddly", model: "Crew", comparisonText: MULTI_CAMERA },
  { manufacturer: "Huddly", model: "Canvas", comparisonText: "whiteboard content camera" },

  { manufacturer: "Jabra", model: "PanaCast 50", comparisonText: VIDEO_BAR },
  { manufacturer: "Jabra", model: "PanaCast 50 Video Bar System", comparisonText: ROOM_APPLIANCE },

  { manufacturer: "AVer", model: "VB342 Pro", comparisonText: VIDEO_BAR },
  { manufacturer: "AVer", model: "VB350", comparisonText: VIDEO_BAR },
  { manufacturer: "AVer", model: "VB370A", comparisonText: VIDEO_BAR },
  { manufacturer: "AVer", model: "CAM520 Pro", comparisonText: PTZ_CAMERA },
  { manufacturer: "AVer", model: "CAM550", comparisonText: PTZ_CAMERA },
  { manufacturer: "AVer", model: "CAM570", comparisonText: PTZ_CAMERA },

  { manufacturer: "Neat", model: "Neat Bar", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "Neat", model: "Neat Bar Pro", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "Cisco", model: "Room Bar", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "Cisco", model: "Room Bar Pro", comparisonText: ROOM_APPLIANCE },
  { manufacturer: "Bose Professional", model: "Videobar VB1", comparisonText: VIDEO_BAR },
  { manufacturer: "Bose Professional", model: "Videobar VB-S", comparisonText: VIDEO_BAR },
  { manufacturer: "Crestron", model: "Videobar 70", comparisonText: VIDEO_BAR },
  { manufacturer: "Q-SYS", model: "NC Series", comparisonText: PTZ_CAMERA },
];

function selectionKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function findUcCompetitorProduct(manufacturer: string, model: string): UcCompetitorProduct | null {
  const manufacturerKey = selectionKey(manufacturer);
  const modelKey = selectionKey(model);

  return UC_COMPETITOR_PRODUCTS.find(
    (product) =>
      selectionKey(product.manufacturer) === manufacturerKey &&
      selectionKey(product.model) === modelKey,
  ) ?? null;
}
