import type {
  SchematicConnection,
  SchematicNode,
  SchematicNodeKind,
  SchematicSignalKind,
  SchematicTransportKind,
} from "./schematicTypes";

/** A connection before the layout engine has routed it between two nodes. */
export type DraftConnection = Omit<SchematicConnection, "points">;

/**
 * The one place a schematic node is built, so a node added by the engine and a
 * node added by the programme-audio drawing carry the same fields — including
 * the zeroed position the layout engine overwrites.
 */
export function makeSchematicNode(
  id: string,
  label: string,
  kind: SchematicNodeKind,
  column: number,
  lane: number,
  options: {
    sku?: string;
    required?: boolean;
    note?: string;
  } = {},
): SchematicNode {
  return {
    id,
    label,
    kind,
    sku: options.sku,
    column,
    lane,
    x: 0,
    y: 0,
    required: options.required ?? true,
    proposalSafeNote: options.note,
  };
}

/**
 * A labelled connection. The id is derived from its ends and signal so two
 * callers that draw the same path produce one connection, which is what lets
 * the engine dedupe afterwards.
 */
export function makeSchematicConnection(
  from: SchematicNode,
  to: SchematicNode,
  signal: SchematicSignalKind,
  transport: SchematicTransportKind,
  label: string,
): DraftConnection {
  return {
    id: `${from.id}__${signal}__${to.id}`,
    from: from.id,
    to: to.id,
    signal,
    transport,
    label,
    required: true,
    proposalSafeNote: transport === "unknown" ? "Transport must be confirmed before quoting." : undefined,
  };
}
