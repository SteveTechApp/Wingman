import type {
  SchematicAudioRoute,
  SchematicNode,
  SchematicNodeKind,
  SchematicTransportKind,
} from "./schematicTypes";
import { makeSchematicConnection, makeSchematicNode, type DraftConnection } from "./schematicElements";

/**
 * The programme-audio route, drawn as audio connections.
 *
 * Discovery already records both ends of the path — where the sound leaves the
 * video route and everywhere it has to arrive — so the schematic can show the
 * de-embed point and its destinations instead of only warning that audio needs
 * designing. The drawing is deliberately thin: it names the device the sound is
 * taken from, one node per destination, and the audio connection between them,
 * because the interfaces, levels and cable types are still to be confirmed.
 *
 * The extraction point decides the anchor, and the anchor is a device the
 * engineer already knows: the matrix/switcher that de-embeds the selected
 * source, each source's own audio output, or a display's output. That is why
 * one leg per destination is drawn from the real node rather than from an
 * invented "audio box" — a reader can see which device has to give the sound up.
 *
 * Adding a discovery destination means adding its drawing here as well: the
 * label is the diagram's own vocabulary (short, node-sized) while the sentence
 * in `DESTINATION_PHRASES` is the rep-facing phrase, and a spec fails if a
 * recorded value has no diagram entry.
 */
export const AUDIO_ROUTE_EXTRACTIONS: Record<string, { anchor: "source" | "switcher" | "display"; label: string }> = {
  "extract-at-source": { anchor: "source", label: "Source audio out" },
  "extract-at-switcher": { anchor: "switcher", label: "Audio de-embed at the matrix" },
  "extract-at-display": { anchor: "display", label: "Display audio out" },
};

export const AUDIO_ROUTE_DESTINATIONS: Record<
  string,
  { label: string; kind: SchematicNodeKind; transport: SchematicTransportKind }
> = {
  "route-to-room-amplifier": { label: "Room amplifier / DSP", kind: "audio-device", transport: "analogue-audio" },
  "route-to-uc-host": { label: "UC host USB audio", kind: "usb-bridge", transport: "usb" },
  "route-to-recorder": { label: "Recorder / stream", kind: "audio-device", transport: "unknown" },
  "route-to-dante": { label: "Dante / AES67 audio network", kind: "audio-device", transport: "dante" },
  "route-to-display-speakers": { label: "Display speakers", kind: "display", transport: "analogue-audio" },
};

/**
 * Draws the recorded route and reports whether anything was drawn, so the
 * caller keeps its "audio routing requires design" warning for a route that is
 * recorded but still missing an end.
 */
export function wireAudioRoute(args: {
  route: SchematicAudioRoute | undefined;
  nodes: SchematicNode[];
  connections: DraftConnection[];
  assumptions: string[];
}): boolean {
  const route = args.route;
  if (!route) return false;

  const destinations = route.destinations.filter((value) => value in AUDIO_ROUTE_DESTINATIONS);
  if (!destinations.length) {
    args.assumptions.push(
      "Programme audio is recorded as a requirement; where it must arrive is not recorded yet, so no audio path is drawn.",
    );
    return false;
  }

  const extraction = route.extraction ? AUDIO_ROUTE_EXTRACTIONS[route.extraction] : undefined;
  if (!extraction) {
    args.assumptions.push(
      "Programme audio destinations are recorded, but where the sound is taken from is not, so the audio path is not drawn.",
    );
    return false;
  }

  const anchors = anchorsFor(extraction.anchor, args.nodes);
  if (!anchors.length) {
    args.assumptions.push(
      `The recorded programme-audio route starts at ${extraction.label.toLowerCase()}, which no scheduled device provides, so it is not drawn.`,
    );
    return false;
  }

  const wire = (target: SchematicNode, destination: (typeof AUDIO_ROUTE_DESTINATIONS)[string]) => {
    for (const anchor of anchors) {
      // A display playing its own audio needs no line to itself; the video feed
      // already carries the sound when the display is the de-embed point.
      if (anchor.id === target.id) continue;
      const connection = makeSchematicConnection(
        anchor,
        target,
        "audio",
        destination.transport,
        `${extraction.label} to ${destination.label}`,
      );
      connection.fromPort = "AUDIO OUT (confirm)";
      connection.toPort = "AUDIO IN (confirm)";
      connection.evidence = "unresolved";
      args.connections.push(connection);
    }
  };

  let created = 0;
  for (const value of destinations) {
    const destination = AUDIO_ROUTE_DESTINATIONS[value];
    if (value === "route-to-display-speakers") {
      // The display's own speakers are a property of a display already on the
      // drawing, so the leg lands on that node instead of adding a second box.
      const displays = args.nodes.filter((node) => node.kind === "display");
      if (!displays.length) {
        args.assumptions.push(
          "The display's own speakers are recorded as the programme destination, but no display is scheduled, so that leg is not drawn.",
        );
        continue;
      }
      displays.forEach((display) => wire(display, destination));
      continue;
    }

    const node = audioDestinationNode(destination, anchors, created, args.nodes);
    created += 1;
    args.nodes.push(node);
    wire(node, destination);
  }

  args.assumptions.push(
    "Programme audio is drawn from the recorded discovery route. Confirm the interface, level and cable at each destination before ordering.",
  );

  return true;
}

function anchorsFor(anchor: "source" | "switcher" | "display", nodes: SchematicNode[]): SchematicNode[] {
  if (anchor === "switcher") {
    const switching = nodes.find((node) => node.kind === "matrix")
      ?? nodes.find((node) => node.kind === "switcher")
      ?? nodes.find((node) => node.kind === "video-wall-processor");
    return switching ? [switching] : [];
  }

  return nodes.filter((node) => node.kind === anchor);
}

/**
 * One node per destination, placed one column right of the device giving the
 * sound up and below whatever already sits in that column, so a leg is a short
 * right-hand run rather than a line across the drawing.
 */
function audioDestinationNode(
  destination: { label: string; kind: SchematicNodeKind },
  anchors: SchematicNode[],
  index: number,
  nodes: SchematicNode[],
): SchematicNode {
  const column = Math.max(...anchors.map((anchor) => anchor.column)) + 1;
  const lanesInColumn = nodes.filter((node) => node.column === column).map((node) => node.lane);
  const lane = (lanesInColumn.length ? Math.max(...lanesInColumn) : -1) + 1 + index;

  const node = makeSchematicNode(
    `audio-${destination.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    destination.label,
    destination.kind,
    column,
    lane,
    {
      required: true,
      note: "Programme-audio destination recorded in discovery. Confirm the interface, level and cable before ordering.",
    },
  );
  // The drawing names this box for what it is: without the mark two audio
  // destinations would both read as a generic "audio system — by others".
  node.metadata = { audioRouteDestination: true };
  return node;
}
