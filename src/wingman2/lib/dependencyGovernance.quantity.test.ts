import { describe, expect, it } from "vitest";
import { buildGovernedDependencies } from "./dependencyGovernance";
import type { StoredProductSelection } from "../data/projectStore";

function selection(partial: Partial<StoredProductSelection>): StoredProductSelection {
  return {
    sku: "SW-130-TX",
    title: "HDBaseT transmitter",
    category: "Transmitter",
    source: "test",
    status: "recommended",
    quantity: undefined,
    ...partial,
  };
}

const DISCOVERY = {
  projectTitle: "Training room",
  summary: "4 sources to 4 displays",
  roomSize: "Training room",
  displays: "4x displays",
  displayCount: "4",
  displayBehaviour: "Independent",
  sourceCount: "4",
  usb: "USB camera",
  distance: "25m",
  network: "No",
  audio: "Audio to DSP",
  control: "Touch panel",
  budget: "Not confirmed",
};

function receiverRows(dependencies: ReturnType<typeof buildGovernedDependencies>) {
  return dependencies.filter((item) => item.role.includes("receiver") && item.governanceKind === "Exact");
}

describe("governed dependency quantities follow selected source units", () => {
  it("sizes RX3-100 per SW-120-TX3 unit when an explicit quantity is captured", () => {
    const dependencies = buildGovernedDependencies({
      products: [selection({ sku: "SW-120-TX3", quantity: 2 })],
      discovery: DISCOVERY,
      assumptions: [],
    });

    const receiver = receiverRows(dependencies).find((item) => item.sku === "RX3-100");
    expect(receiver?.qty).toBe(2);
    expect(receiver?.confidence).toBe("High");
  });

  it("sizes RX3-100 from the discovery source count when no explicit quantity exists", () => {
    const dependencies = buildGovernedDependencies({
      products: [selection({ sku: "SW-120-TX3" })],
      discovery: DISCOVERY,
      assumptions: [],
    });

    expect(receiverRows(dependencies).find((item) => item.sku === "RX3-100")?.qty).toBe(4);
  });

  it("stays at one receiver when no quantity basis exists and flags confidence Low", () => {
    const dependencies = buildGovernedDependencies({
      products: [selection({ sku: "SW-120-TX3" })],
      discovery: { ...DISCOVERY, sourceCount: "Not confirmed" },
      assumptions: [],
    });

    const receiver = receiverRows(dependencies).find((item) => item.sku === "RX3-100");
    expect(receiver?.qty).toBe(1);
    expect(receiver?.confidence).toBe("Low");
  });

  it("keeps the SW-130 distance split and sizes the chosen receiver per unit", () => {
    const shortRun = buildGovernedDependencies({
      products: [selection({ sku: "SW-130-TX", quantity: 3 })],
      discovery: { ...DISCOVERY, distance: "20m" },
      assumptions: [],
    });
    expect(receiverRows(shortRun).map((item) => `${item.sku}x${item.qty}`)).toEqual(["RX-500x3"]);

    const longRun = buildGovernedDependencies({
      products: [selection({ sku: "SW-130-TX", quantity: 2 })],
      discovery: { ...DISCOVERY, distance: "40m" },
      assumptions: [],
    });
    expect(receiverRows(longRun).map((item) => `${item.sku}x${item.qty}`)).toEqual(["RX-700x2"]);
  });
});
