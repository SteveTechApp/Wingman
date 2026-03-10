import {
  loadProjectState,
  updateProjectState,
  type WingmanProjectState,
} from "@/core/workflow/projectState";

export function getAvGuideSeed(): WingmanProjectState {
  return loadProjectState();
}

export function saveAvGuideSeed(input: {
  customer?: string;
  roomType?: string;
  application?: string;
  displayCount?: number;
  sourceCount?: number;
  distanceM?: number;
  budgetBand?: string;
  control?: string;
  usb?: string;
  audio?: string;
  notes?: string;
}): WingmanProjectState {
  return updateProjectState({
    stage: "Discovery",
    customer: input.customer ?? "",
    roomType: input.roomType ?? "",
    application: input.application ?? "",
    displayCount: input.displayCount ?? 0,
    sourceCount: input.sourceCount ?? 0,
    distanceM: input.distanceM ?? 0,
    budgetBand: input.budgetBand ?? "",
    notes: input.notes ?? "",
    avGuide: {
      control: input.control ?? "",
      usb: input.usb ?? "",
      audio: input.audio ?? "",
    },
  });
}