import { describe, expect, it } from "vitest";

import { assertSyncFetchTarget, classifySyncFetchTarget, isPrivateOrReservedIpv4, isPrivateOrReservedIpv6 } from "./safe-fetch-target.mjs";

describe("safe-fetch-target literal classification", () => {
  it("refuses every special-purpose IPv4 range the outbound guard must cover", () => {
    const blocked = [
      "0.0.0.0", "0.1.2.3", "10.0.0.1", "127.0.0.1", "169.254.169.254",
      "100.64.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1",
      "192.0.0.8", "192.0.2.1", "198.51.100.7", "203.0.113.9", "198.18.0.1",
      "192.31.196.1", "192.52.193.1", "192.175.48.1",
      "224.0.0.1", "255.255.255.255",
    ];
    for (const address of blocked) {
      expect(isPrivateOrReservedIpv4(address), address).toBe(true);
    }
  });

  it("keeps public IPv4 addresses fetchable", () => {
    const allowed = ["8.8.8.8", "1.1.1.1", "172.32.0.1", "198.20.0.1", "203.0.114.1", "100.128.0.1"];
    for (const address of allowed) {
      expect(isPrivateOrReservedIpv4(address), address).toBe(false);
    }
  });

  it("refuses loopback and unspecified IPv6 in every documented spelling", () => {
    const blocked = ["::", "::1", "0:0:0:0:0:0:0:1", "::0.0.0.0", "::ffff:0:0", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:169.254.169.254"];
    for (const address of blocked) {
      expect(isPrivateOrReservedIpv6(address), address).toBe(true);
    }
  });

  it("decodes embedded IPv4 inside mapped, compatible and well-known NAT64 prefixes", () => {
    const blocked = [
      "64:ff9b::7f00:1", "64:ff9b::0a00:1", "64:ff9b::169.254.169.254",
      "::ffff:0a00:1", "2002:7f00:1::", "2002:a9fe:a9fe::",
    ];
    for (const address of blocked) {
      expect(isPrivateOrReservedIpv6(address), address).toBe(true);
    }
    // Public values inside the same prefixes stay fetchable.
    expect(isPrivateOrReservedIpv6("::ffff:8.8.8.8")).toBe(false);
    expect(isPrivateOrReservedIpv6("64:ff9b::808:808")).toBe(false);
    expect(isPrivateOrReservedIpv6("2002:c058:6301::")).toBe(false);
  });

  it("classifies the remaining special-purpose IPv6 ranges", () => {
    const blocked = [
      "fe80::1", "fe80:0000:0000:0000:0000:0000:0000:0001", "fd00::1", "fc00::1",
      "ff02::1", "2001:db8::1", "2001:0::1", "64:ff9b:1::a9fe:a9fe", "64:ff9b:1:0:0:0:0:1",
    ];
    for (const address of blocked) {
      expect(isPrivateOrReservedIpv6(address), address).toBe(true);
    }
    const allowed = ["2606:4700::1111", "2a00:1450:4009:81f::200e", "64:ff9b:2::1", "2001:db9::1"];
    for (const address of allowed) {
      expect(isPrivateOrReservedIpv6(address), address).toBe(false);
    }
  });

  it("rejects malformed IPv6 spellings instead of trusting them", () => {
    const blocked = ["1:2:3:4:5:6:7:8:9", "gggg::1", "12345::"];
    for (const address of blocked) {
      expect(isPrivateOrReservedIpv6(address), address).toBe(true);
    }
  });

  it("classifies whole URLs by protocol, local names and IP literals", () => {
    expect(classifySyncFetchTarget("http://169.254.169.254/latest/meta-data/")).toMatchObject({ ok: false });
    expect(classifySyncFetchTarget("http://[64:ff9b:1::a9fe:a9fe]/")).toMatchObject({ ok: false });
    expect(classifySyncFetchTarget("http://[0:0:0:0:0:0:0:1]:8080/")).toMatchObject({ ok: false });
    expect(classifySyncFetchTarget("http://metadata.google.internal/")).toMatchObject({ ok: false });
    expect(classifySyncFetchTarget("file:///etc/passwd")).toMatchObject({ ok: false });
    expect(classifySyncFetchTarget("not a url")).toMatchObject({ ok: false });
    expect(classifySyncFetchTarget("https://www.wyrestorm.com/product/x")).toMatchObject({ ok: true });
    expect(classifySyncFetchTarget("https://8.8.8.8/dns-query")).toMatchObject({ ok: true });
    expect(classifySyncFetchTarget("https://[2606:4700::1111]/")).toMatchObject({ ok: true });
  });

  it("throws through assertSyncFetchTarget with the refusal reason", () => {
    expect(() => assertSyncFetchTarget("http://127.0.0.1:8787/")).toThrow(/private or reserved/);
    expect(() => assertSyncFetchTarget("https://[fe80::1]/")).toThrow(/private or reserved/);
    expect(() => assertSyncFetchTarget("https://example.com/")).not.toThrow();
  });
});
