import type { DecisionConstraint } from "./decisionConstraints";
import { evaluateDecisionConstraints } from "./decisionConstraints";

export type VideowallDecisionState = {
  wallType: "" | "led" | "lcd";
  led: {
    behaviour: string;
    windows: string;
    sourceLocation: string;
  };
  lcd: {
    screenCount: string;
    driveMethod: string;
    sourceCount: string;
    sourceLocation: string;
    behaviour: string;
  };
};

const constraints: DecisionConstraint<VideowallDecisionState>[] = [
  {
    id: "led-custom-window-capacity",
    severity: "blocking",
    fields: ["led.behaviour", "led.windows"],
    when: ({ wallType, led }) => wallType === "led" && led.behaviour === "custom-windows" && led.windows === "more-than-nine",
    title: "Custom-window capacity mismatch",
    detail: "Custom drag-and-drop layouts and more than 9 windows cannot be satisfied by the current multiview direction. NetworkHD 100 supports up to 6 floating/custom windows or up to 9 fixed windows.",
    resolution: "Reduce the requirement to up to 6 custom windows, choose a fixed-window layout, or validate a separate specialist wall processor with pre-sales.",
  },
  {
    id: "led-custom-versus-fixed-nine",
    severity: "blocking",
    fields: ["led.behaviour", "led.windows"],
    when: ({ wallType, led }) => wallType === "led" && led.behaviour === "custom-windows" && led.windows === "fixed-nine",
    title: "Window behaviour mismatch",
    detail: "The requirement asks for drag-and-drop windows but the selected capacity is the fixed 9-window mode.",
    resolution: "Choose up to 6 floating/custom windows, or change the wall behaviour to a fixed multiview layout.",
  },
  {
    id: "led-fixed-versus-floating",
    severity: "blocking",
    fields: ["led.behaviour", "led.windows"],
    when: ({ wallType, led }) => wallType === "led" && led.behaviour === "fixed-multiview" && led.windows === "floating-six",
    title: "Fixed and floating layouts conflict",
    detail: "A fixed multiview requirement conflicts with the floating/custom window mode.",
    resolution: "Choose a fixed-window capacity, or change the required behaviour to custom drag-and-drop windows.",
  },
  {
    id: "led-single-source-window-count",
    severity: "blocking",
    fields: ["led.behaviour", "led.windows"],
    when: ({ wallType, led }) => wallType === "led" && led.behaviour === "single-source" && !["", "one", "unsure"].includes(led.windows),
    title: "Single-source requirement conflicts with multiple windows",
    detail: "A single full-screen source cannot simultaneously require a multi-window canvas.",
    resolution: "Choose 1 source only, or change the wall behaviour to a multiview option.",
  },
  {
    id: "lcd-tile-independent-content",
    severity: "blocking",
    fields: ["lcd.driveMethod", "lcd.behaviour"],
    when: ({ wallType, lcd }) => wallType === "lcd" && lcd.driveMethod === "tile-mode" && lcd.behaviour === "different-per-display",
    title: "Tile mode cannot provide independent screen content",
    detail: "A single-input tile-mode wall divides one canvas across the displays; it does not provide an independent source to each screen.",
    resolution: "Choose direct drive / input per screen, or change the behaviour to one full image across the wall.",
  },
  {
    id: "lcd-one-source-independent-content",
    severity: "blocking",
    fields: ["lcd.sourceCount", "lcd.behaviour"],
    when: ({ wallType, lcd }) => wallType === "lcd" && lcd.sourceCount === "one" && lcd.behaviour === "different-per-display",
    title: "Independent display content needs additional sources",
    detail: "Different content per display cannot be delivered from a single source without a separately confirmed content-generation system.",
    resolution: "Increase the source count or change the behaviour to one full image across the wall.",
  },
  {
    id: "lcd-tile-multiview-processing",
    severity: "warning",
    fields: ["lcd.driveMethod", "lcd.behaviour"],
    when: ({ wallType, lcd }) => wallType === "lcd" && lcd.driveMethod === "tile-mode" && lcd.behaviour === "multiview",
    title: "Multiview requires processing before tile mode",
    detail: "Tile mode can split a composed canvas, but it cannot create the multiview canvas itself.",
    resolution: "Confirm a multiview processor upstream of the tile-mode display input.",
  },
];

export function evaluateVideowallDecisionConstraints(state: VideowallDecisionState) {
  return evaluateDecisionConstraints(state, constraints);
}
