import { describe, expect, it } from "vitest";

import { __compareIntelligenceTest } from "./compare-intelligence.mjs";

const { isPrivateOrReservedIp } = __compareIntelligenceTest;

// The outbound fetch guard (assertSafeFetchTarget) runs before every web
// lookup and on every redirect hop, classifying resolved addresses so a
// competitor-model fetch can never be redirected at loopback, private or
// cloud-metadata infrastructure. The IPv4-mapped and well-known NAT64 forms
// were already covered by the decoded-IPv4 path; the local-use NAT64 range
// (RFC 8215, 64:ff9b:1::/48) must be rejected as a range, because the
// embedded IPv4 address sits at a prefix-dependent offset and the guard can
// never know which prefix length the operator deployed. Addresses paraphrase
// the GHSA-2vr4-cq9g-pvrc advisory table.
describe("outbound fetch guard address classification", () => {
  it("rejects every IPv4 form the guard has always covered", () => {
    for (const address of [
      "127.0.0.1",          // loopback
      "10.0.0.1",           // private
      "172.16.0.1",         // private
      "192.168.1.1",        // private
      "169.254.169.254",    // link-local / cloud metadata
      "100.64.0.1",         // CGNAT
      "0.0.0.0",            // unspecified
      "224.0.0.1",          // multicast
      "198.18.0.1",         // benchmarking
      "192.0.0.9",          // NAT64 translation endpoint
    ]) {
      expect(isPrivateOrReservedIp(address, 4), address).toBe(true);
    }
    expect(isPrivateOrReservedIp("93.184.216.34", 4)).toBe(false);
  });

  it("rejects the documented IPv6 special ranges and loopback", () => {
    for (const address of ["::1", "::", "fe80::1", "fc00::1", "fd12:3456::1"]) {
      expect(isPrivateOrReservedIp(address, 6), address).toBe(true);
    }
  });

  it("classifies IPv4-mapped and well-known NAT64 forms by their embedded IPv4 address", () => {
    expect(isPrivateOrReservedIp("::ffff:127.0.0.1", 6)).toBe(true);
    expect(isPrivateOrReservedIp("::ffff:169.254.169.254", 6)).toBe(true);
    expect(isPrivateOrReservedIp("64:ff9b::7f00:1", 6)).toBe(true);
    expect(isPrivateOrReservedIp("64:ff9b::a9fe:a9fe", 6)).toBe(true);
    // The well-known prefix can also carry globally-routable IPv4, which must
    // stay fetchable: only the embedded address decides.
    expect(isPrivateOrReservedIp("64:ff9b::5db8:d822", 6)).toBe(false);
  });

  it("rejects the whole NAT64 local-use range regardless of prefix length or spelling", () => {
    for (const address of [
      "64:ff9b:1::",                       // network base
      "64:ff9b:1:0:0:0:0:1",               // spelled-long form just past the base
      "64:ff9b:1:7f00:0:100::",            // /48 form embedding 127.0.0.1
      "64:ff9b:1:a9fe:a9:fe00::",          // /48 form embedding 169.254.169.254
      "64:ff9b:1::7f00:1",                 // /96 form embedding 127.0.0.1
      "64:ff9b:1:0:7f00:1::",              // /56-ish placement, still in the range
      "64:FF9B:1:A9FE:A9:FE00::",          // uppercase spelling
    ]) {
      expect(isPrivateOrReservedIp(address.toLowerCase(), 6), address).toBe(true);
    }
  });

  it("keeps genuinely global IPv6 destinations fetchable", () => {
    for (const address of ["2606:2800:220:1:248:1893:25c8:1946", "2001:4860:4860::8888"]) {
      expect(isPrivateOrReservedIp(address, 6), address).toBe(false);
    }
    // The neighbouring well-known NAT64 range (64:ff9b::/96) is not the
    // local-use range: 64:ff9b:2:: and friends are unrelated global space.
    expect(isPrivateOrReservedIp("64:ff9b:2::1", 6)).toBe(false);
    // 64:ff9b:: with an all-zero tail embeds 0.0.0.0 (this-network) and is
    // refused; a public embedded address inside the same prefix stays global.
    expect(isPrivateOrReservedIp("64:ff9b::", 6)).toBe(true);
    expect(isPrivateOrReservedIp("64:ff9b::808:808", 6)).toBe(false);
  });
});
