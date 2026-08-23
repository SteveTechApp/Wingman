import type { StoredProductSelection } from "../data/projectStore";
import type { DesignAssuranceItem } from "./productAssurance";
import { normaliseProjectTopology } from "./projectTopology";

export type NetworkInfrastructureAssuranceInput = {
  products: StoredProductSelection[];
  /** The captured project topology, when available. */
  topology?: unknown;
  /** Requirement text used to detect network language (managed switch, VLAN, 10G). */
  requirementText?: string;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function networkHdFamily(sku: string): string | null {
  const match = sku.match(/^NHD-(1(?:20|24|28|50)|5(?:00|10)|6(?:00|10))/);
  if (!match) return null;
  const series = match[1];
  if (series.startsWith("1")) return "100";
  if (series.startsWith("5")) return "500";
  if (series.startsWith("6")) return "600";
  return null;
}

/**
 * AV-over-IP infrastructure awareness. The topology captures cables and
 * distances, but the moment NetworkHD / AVoIP endpoints are selected the
 * network itself becomes part of the signal path - and a governed endpoint
 * profile says nothing about the customer's switch. These checks make the
 * network an explicit design item:
 *
 * - Every NetworkHD design needs a managed switch with multicast/IGMP
 *   snooping and a VLAN plan. Unproven infrastructure is a blocker until the
 *   switch class is evidenced.
 * - NetworkHD 600 is a 10GbE system; a 1GbE-only assumption must be flagged.
 * - Endpoint count x per-stream bandwidth needs a sanity check against a
 *   typical 1GbE backbone.
 */
export function buildNetworkInfrastructureAssurance(input: NetworkInfrastructureAssuranceInput): DesignAssuranceItem[] {
  const items: DesignAssuranceItem[] = [];
  const families = new Set<string>();
  let endpointCount = 0;

  for (const product of input.products) {
    const family = networkHdFamily(text(product.sku).toUpperCase());
    if (family) {
      families.add(family);
      const quantity = Number(product.quantity);
      endpointCount += Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    }
  }

  if (!families.size) {
    // No AV-over-IP endpoints selected - nothing to check at the network layer.
    const topology = normaliseProjectTopology(input.topology);
    const hasAvoipTransport = topology.connections.some(
      (connection) => connection.transport === "ip-av-vlan" || connection.transport === "shared-ip-network",
    );
    if (!hasAvoipTransport) return items;
  }

  const requirementText = (input.requirementText ?? "").toLowerCase();
  const networkProven = /\bmanaged\s*switch\b|managed network|av vlan|10g|10gb|10gbe|igmp|multicast|dedicated av network/.test(requirementText);
  const topology = normaliseProjectTopology(input.topology);
  const topologyNetworkProven = topology.connections.some(
    (connection) => connection.transport === "ip-av-vlan" && Boolean(connection.networkSegmentId),
  );

  if (!networkProven && !topologyNetworkProven) {
    items.push({
      id: "network-igmp-switch-unproven",
      severity: "blocker",
      domain: "network",
      message: "This design includes AV-over-IP endpoints, but the network infrastructure is not proven. Confirm a managed switch with IGMP snooping, a dedicated AV VLAN (or governed multicast policy), and sufficient bandwidth before quoting.",
    });
  }

  const uses600 = families.has("600");
  const tenGigProven = /10g|10gb|10gbe|10 gig/.test(requirementText) || topologyNetworkProven;
  if (uses600 && !tenGigProven) {
    items.push({
      id: "network-nhd600-ten-gig",
      severity: "blocker",
      domain: "network",
      message: "NetworkHD 600 is a 10GbE AV-over-IP system. Confirm the switching and cabling plan is 10GbE (or the architecture genuinely uses the fibre/10G transceiver path) before quoting.",
    });
  }

  // Bandwidth sanity: a 1GbE backbone carries a handful of 4K streams; the
  // exact per-stream figure depends on codec, so this stays a warning that
  // forces the switch-capacity conversation rather than a hard number.
  if (endpointCount > 8 && !tenGigProven) {
    items.push({
      id: "network-bandwidth-endpoint-count",
      severity: "warning",
      domain: "network",
      message: `${endpointCount} AV-over-IP endpoints are selected. Validate the switch backplane and uplink capacity against the per-stream bandwidth for the chosen codec before quoting.`,
    });
  }

  return items;
}
