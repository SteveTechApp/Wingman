import * as React from "react";

export type DiscoveryProductFamily =
  | "Apollo"
  | "HDBaseT"
  | "AVoIP"
  | "Matrix"
  | "USB Extension"
  | "Video Wall";

export type DiscoveryRecord = {
  customer: string;
  site: string;
  roomName: string;
  applicationType: string;
  roomLengthM: string;
  roomWidthM: string;
  roomHeightM: string;
  displayLocation: string;
  sourceLocation: string;
  rackLocation: string;
  cableDistanceM: string;
  displayCount: string;
  sourceCount: string;
  usbNeeds: string;
  audioNeeds: string;
  controlNeeds: string;
  budgetBand: string;
  urgency: string;
  notes: string;
  recommendedFamilies: DiscoveryProductFamily[];
  recommendedNextTool: string;
  createdAt: string;
};

const STORAGE_KEY = "wm_discovery_seed";

export function emptyDiscoveryRecord(): DiscoveryRecord {
  return {
    customer: "",
    site: "",
    roomName: "",
    applicationType: "",
    roomLengthM: "",
    roomWidthM: "",
    roomHeightM: "",
    displayLocation: "",
    sourceLocation: "",
    rackLocation: "",
    cableDistanceM: "",
    displayCount: "",
    sourceCount: "",
    usbNeeds: "",
    audioNeeds: "",
    controlNeeds: "",
    budgetBand: "",
    urgency: "",
    notes: "",
    recommendedFamilies: [],
    recommendedNextTool: "/app/tools/catalog",
    createdAt: "",
  };
}

export function saveDiscoveryRecord(record: DiscoveryRecord): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record, null, 2));
  } catch {}
}

export function loadDiscoveryRecord(): DiscoveryRecord | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DiscoveryRecord;
  } catch {
    return null;
  }
}

export function clearDiscoveryRecord(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function recommendFamilies(input: {
  applicationType: string;
  displayCount: string;
  cableDistanceM: string;
  usbNeeds: string;
  controlNeeds: string;
}): {
  families: DiscoveryProductFamily[];
  nextTool: string;
} {
  const text = [
    input.applicationType,
    input.displayCount,
    input.cableDistanceM,
    input.usbNeeds,
    input.controlNeeds,
  ]
    .join(" ")
    .toLowerCase();

  const families: DiscoveryProductFamily[] = [];

  const displayCountNum = parseInt((input.displayCount || "").replace(/[^\d]/g, ""), 10);
  const cableDistanceNum = parseInt((input.cableDistanceM || "").replace(/[^\d]/g, ""), 10);

  if (text.includes("video wall") || text.includes("led") || text.includes("lcd wall")) {
    families.push("Video Wall");
  }

  if (text.includes("usb") || text.includes("camera") || text.includes("byod")) {
    families.push("Apollo");
    families.push("USB Extension");
  }

  if (!Number.isNaN(cableDistanceNum) && cableDistanceNum >= 30) {
    families.push("HDBaseT");
  }

  if (!Number.isNaN(displayCountNum) && displayCountNum >= 3) {
    families.push("Matrix");
  }

  if (text.includes("multi room") || text.includes("campus") || text.includes("distribution")) {
    families.push("AVoIP");
  }

  if (families.length === 0) {
    families.push("Apollo");
    families.push("HDBaseT");
  }

  const unique = Array.from(new Set(families));

  let nextTool = "/app/tools/catalog";
  if (unique.includes("Video Wall")) {
    nextTool = "/app/tools/videowall";
  } else if (unique.includes("Matrix") || unique.includes("AVoIP")) {
    nextTool = "/app/tools/proposal";
  } else if (unique.includes("Apollo")) {
    nextTool = "/app/tools/room";
  }

  return { families: unique, nextTool };
}
