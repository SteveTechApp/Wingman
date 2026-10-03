import net from "node:net";

/**
 * Sync URL pre-flight for outbound fetch paths that cannot await DNS (the
 * compare-intelligence guard is async and post-DNS, this one is sync and
 * literal-only). A URL whose host is an IP literal in a special-purpose range
 * — in any documented spelling, including embedded-IPv4 forms like
 * 64:ff9b::7f00:1 — is refused before any request begins. Hostnames are left
 * to their path's own guard (allowlist, or the post-DNS classifier), because
 * refusing by name would block legitimate vendor hosts; the residual
 * DNS-rebinding window is inherent to sync guards and is closed post-DNS
 * wherever the path can await.
 */

/** Convert an IPv6 literal in any documented spelling to eight 16-bit numbers. */
function ipv6Groups(address) {
  try {
    // URL normalises every documented spelling (:: expansion, hex case,
    // embedded dotted-quad tails) so the classifier never re-implements it.
    const { hostname } = new URL(`http://[${address.toLowerCase()}]/`);
    const flat = hostname.replace(/^\[|\]$/g, "");
    let head = flat;
    let tail4 = "";
    const dotted = flat.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) {
      head = dotted[1];
      tail4 = dotted[2];
    }
    const halves = head.split("::");
    if (halves.length > 2) return null;
    const expand = (side) => (side === "" ? [] : side.split(":").filter(Boolean));
    let groups = expand(halves[0]);
    const right = halves.length === 2 ? expand(halves[1]) : [];
    if (halves.length === 2) {
      const fill = 8 - groups.length - right.length - (tail4 ? 2 : 0);
      if (fill < 0) return null;
      groups = groups.concat(Array(fill).fill("0"), right);
    }
    if (tail4) {
      const octets = tail4.split(".").map(Number);
      if (octets.length !== 4 || octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
      groups.push(((octets[0] << 8) | octets[1]).toString(16));
      groups[groups.length - 1] = ((octets[2] << 8) | octets[3]).toString(16);
    }
    if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
    return groups.map((g) => parseInt(g, 16));
  } catch {
    return null;
  }
}

const embeddedV4Dotted = (groups, offset) =>
  `${groups[offset] >> 8}.${groups[offset] & 255}.${groups[offset + 1] >> 8}.${groups[offset + 1] & 255}`;

export function isPrivateOrReservedIpv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b, c] = parts;

  // Loopback, unspecified, private, link-local, CGNAT, this-network.
  if (a === 0 || a === 127 || a === 10 || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127)) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  // 192.0.0.0/24 (IETF protocol assignments), 192.0.2.0/24 (TEST-NET-1),
  // 198.51.100.0/24 + 203.0.113.0/24 (TEST-NET-2/3), 198.18.0.0/15 (benchmarking),
  // 192.31.196.0/24 + 192.52.193.0/24 + 192.175.48.0/24 (AS112 anycast).
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100) || (b === 0 && c === 2))) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a === 192 && b === 31 && c === 196) return true;
  if (a === 192 && b === 52 && c === 193) return true;
  if (a === 192 && b === 175 && c === 48) return true;
  // Multicast / reserved / broadcast.
  if (a >= 224) return true;
  return false;
}

export function isPrivateOrReservedIpv6(address) {
  const groups = ipv6Groups(address);
  // Unparseable spellings are rejected, not trusted.
  if (!groups) return true;
  const [g0, g1, g2] = groups;

  // Unspecified (::/128) and loopback (::1/128) in any textual spelling.
  if (groups.every((g) => g === 0)) return true;
  if (groups[7] === 1 && groups.slice(0, 7).every((g) => g === 0)) return true;

  // Link-local (fe80::/10), unique-local (fc00::/7), multicast (ff00::/8).
  if ((g0 & 0xffc0) === 0xfe80 || (g0 & 0xfe00) === 0xfc00 || (g0 & 0xff00) === 0xff00) return true;

  // IPv4-mapped (::ffff:0:0/96) and IPv4-compatible (::/96): the trailing
  // 32 bits embed an IPv4 address whose own classification decides.
  const isMapped = groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff;
  const isCompatible = groups.slice(0, 6).every((g) => g === 0);
  if (isMapped || isCompatible) return isPrivateOrReservedIpv4(embeddedV4Dotted(groups, 6));

  // Well-known NAT64 (64:ff9b::/96): only the exact /96 placement decodes.
  if (g0 === 0x0064 && g1 === 0xff9b && g2 === 0 && groups.slice(3, 6).every((g) => g === 0)) {
    return isPrivateOrReservedIpv4(embeddedV4Dotted(groups, 6));
  }

  // 6to4 (2002::/16): the next 32 bits embed an IPv4 relay/endpoint address.
  if (g0 === 0x2002) return isPrivateOrReservedIpv4(embeddedV4Dotted(groups, 1));

  // Teredo (2001:0::/32): deprecated, embedded addresses are obfuscated.
  if (g0 === 0x2001 && g1 === 0x0000) return true;

  // Documentation (2001:db8::/32).
  if (g0 === 0x2001 && g1 === 0x0db8) return true;

  // NAT64 local-use (RFC 8215, 64:ff9b:1::/48): prefix-dependent embedding
  // offset — classify the whole range private.
  if (g0 === 0x0064 && g1 === 0xff9b && g2 === 0x0001) return true;

  return false;
}

/**
 * True when the URL is safe to fetch by literal classification: the host is
 * neither an IP literal in a special-purpose range nor a local name. Returns
 * { ok: true } or { ok: false, reason }.
 */
export function classifySyncFetchTarget(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { ok: false, reason: "invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "unsupported protocol" };
  }
  const hostname = parsed.hostname.toLowerCase();
  // Node keeps the brackets in URL.hostname for IPv6 hosts; strip them so the
  // literal branch actually fires.
  const bareHost = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  if (bareHost === "localhost" || bareHost.endsWith(".localhost") || bareHost.endsWith(".local") || bareHost.endsWith(".internal") || bareHost.endsWith(".home.arpa")) {
    return { ok: false, reason: "local hostname" };
  }
  const family = net.isIP(bareHost);
  if (family === 4) {
    if (isPrivateOrReservedIpv4(bareHost)) return { ok: false, reason: "private or reserved address" };
    return { ok: true };
  }
  if (family === 6) {
    if (isPrivateOrReservedIpv6(bareHost)) return { ok: false, reason: "private or reserved address" };
    return { ok: true };
  }
  // Hostname: pre-flight passes; the path's own guard (allowlist or post-DNS
  // classifier) decides.
  return { ok: true };
}

/** Throw-on-false wrapper for call sites that guard inline. */
export function assertSyncFetchTarget(urlString) {
  const verdict = classifySyncFetchTarget(urlString);
  if (!verdict.ok) {
    throw new Error(`Refusing to fetch: ${verdict.reason}`);
  }
}
