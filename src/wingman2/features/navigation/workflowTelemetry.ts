import { canonicalWorkflowRoutes, type WingmanRouteKey } from "../../app/routeCatalog";

export const canonicalWorkflowIds = [
  "sales-conversation",
  "response-authoring",
] as const;

export type CanonicalWorkflowId = (typeof canonicalWorkflowIds)[number];
export type WorkflowEventKind =
  | "workflow_started"
  | "workflow_completed"
  | "workflow_abandoned"
  | "handoff_selected";

type SafeMetadataValue = string | number | boolean;
export type WorkflowMetadata = Record<string, SafeMetadataValue | undefined>;

export type WorkflowTelemetryEvent = {
  kind: WorkflowEventKind;
  workflowId: CanonicalWorkflowId;
  timestamp: string;
  elapsedMs?: number;
  metadata?: Record<string, SafeMetadataValue>;
};

type WorkflowTransport = {
  publish: (event: WorkflowTelemetryEvent) => void;
  publishOnUnload: (event: WorkflowTelemetryEvent) => boolean;
};

const TELEMETRY_ENDPOINT = "/api/wingman/telemetry";
const MAX_METADATA_VALUE_LENGTH = 64;
const allowedMetadata = new Set([
  "entryRoute",
  "destinationRoute",
  "source",
  "completion",
  "outcome",
]);

export function canonicalWorkflowForRoute(routeKey: WingmanRouteKey): CanonicalWorkflowId | undefined {
  return canonicalWorkflowIds.find((workflowId) =>
    (canonicalWorkflowRoutes[workflowId] as readonly WingmanRouteKey[]).includes(routeKey),
  );
}

export function sanitizeWorkflowMetadata(metadata: WorkflowMetadata = {}): Record<string, SafeMetadataValue> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key, value]) => allowedMetadata.has(key) && value !== undefined)
      .filter(([, value]) => typeof value !== "string" || value.length <= MAX_METADATA_VALUE_LENGTH)
      .slice(0, 5) as Array<[string, SafeMetadataValue]>,
  );
}

function eventBody(event: WorkflowTelemetryEvent): string {
  return JSON.stringify({ kind: "analytics_batch", events: [event] });
}

const browserTransport: WorkflowTransport = {
  publish(event) {
    try {
      void fetch(TELEMETRY_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: eventBody(event),
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // Measurement must never interrupt a sales workflow.
    }
  },
  publishOnUnload(event) {
    try {
      return navigator.sendBeacon?.(
        TELEMETRY_ENDPOINT,
        new Blob([eventBody(event)], { type: "application/json" }),
      ) ?? false;
    } catch {
      return false;
    }
  },
};

export function createWorkflowTelemetry(transport: WorkflowTransport = browserTransport) {
  let active: { workflowId: CanonicalWorkflowId; startedAt: number; metadata: Record<string, SafeMetadataValue> } | undefined;

  function buildEvent(
    kind: WorkflowEventKind,
    workflowId: CanonicalWorkflowId,
    metadata?: WorkflowMetadata,
  ): WorkflowTelemetryEvent {
    return {
      kind,
      workflowId,
      timestamp: new Date().toISOString(),
      ...(active?.workflowId === workflowId ? { elapsedMs: Date.now() - active.startedAt } : {}),
      ...(metadata ? { metadata: sanitizeWorkflowMetadata(metadata) } : {}),
    };
  }

  return {
    start(workflowId: CanonicalWorkflowId, metadata?: WorkflowMetadata) {
      active = { workflowId, startedAt: Date.now(), metadata: sanitizeWorkflowMetadata(metadata) };
      transport.publish(buildEvent("workflow_started", workflowId, metadata));
    },
    handoff(workflowId: CanonicalWorkflowId, metadata?: WorkflowMetadata) {
      transport.publish(buildEvent("handoff_selected", workflowId, metadata));
    },
    complete(workflowId: CanonicalWorkflowId, metadata?: WorkflowMetadata) {
      transport.publish(buildEvent("workflow_completed", workflowId, metadata));
      if (active?.workflowId === workflowId) active = undefined;
    },
    abandonOnUnload() {
      if (!active) return;
      const event = buildEvent("workflow_abandoned", active.workflowId, active.metadata);
      if (!transport.publishOnUnload(event)) transport.publish(event);
      active = undefined;
    },
  };
}

export const workflowTelemetry = createWorkflowTelemetry();

let unloadTrackingInstalled = false;

export function installWorkflowAbandonmentTracking(): void {
  if (unloadTrackingInstalled || typeof window === "undefined") return;
  unloadTrackingInstalled = true;
  window.addEventListener("pagehide", () => workflowTelemetry.abandonOnUnload());
}
