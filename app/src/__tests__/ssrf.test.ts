import { describe, it, expect } from "vitest";
import { isBlockedHostname } from "@/lib/utils/extract-url";

describe("isBlockedHostname (SSRF protection)", () => {
  it("blocks localhost", () => {
    expect(isBlockedHostname("localhost")).toBe(true);
    expect(isBlockedHostname("LOCALHOST")).toBe(true);
  });

  it("blocks 127.x.x.x loopback addresses", () => {
    expect(isBlockedHostname("127.0.0.1")).toBe(true);
    expect(isBlockedHostname("127.0.0.2")).toBe(true);
    expect(isBlockedHostname("127.255.255.255")).toBe(true);
  });

  it("blocks 10.x.x.x private addresses", () => {
    expect(isBlockedHostname("10.0.0.1")).toBe(true);
    expect(isBlockedHostname("10.255.255.255")).toBe(true);
  });

  it("blocks 172.16-31.x.x private addresses", () => {
    expect(isBlockedHostname("172.16.0.1")).toBe(true);
    expect(isBlockedHostname("172.31.255.255")).toBe(true);
    // 172.32.x.x is NOT private
    expect(isBlockedHostname("172.32.0.1")).toBe(false);
  });

  it("blocks 192.168.x.x private addresses", () => {
    expect(isBlockedHostname("192.168.0.1")).toBe(true);
    expect(isBlockedHostname("192.168.1.1")).toBe(true);
  });

  it("blocks AWS/cloud metadata endpoint 169.254.x.x", () => {
    expect(isBlockedHostname("169.254.169.254")).toBe(true);
    expect(isBlockedHostname("169.254.0.1")).toBe(true);
  });

  it("blocks 0.x.x.x addresses", () => {
    expect(isBlockedHostname("0.0.0.0")).toBe(true);
    expect(isBlockedHostname("0.1.2.3")).toBe(true);
  });

  it("blocks IPv6 loopback", () => {
    expect(isBlockedHostname("[::1]")).toBe(true);
  });

  it("blocks IPv6 private ranges", () => {
    expect(isBlockedHostname("[fc00::1]")).toBe(true);
    expect(isBlockedHostname("[fd00::1]")).toBe(true);
    expect(isBlockedHostname("[fe80::1]")).toBe(true);
  });

  it("blocks .local, .internal, .corp, .home domains", () => {
    expect(isBlockedHostname("myserver.local")).toBe(true);
    expect(isBlockedHostname("api.internal")).toBe(true);
    expect(isBlockedHostname("dashboard.corp")).toBe(true);
    expect(isBlockedHostname("printer.home")).toBe(true);
  });

  it("allows legitimate public domains", () => {
    expect(isBlockedHostname("example.com")).toBe(false);
    expect(isBlockedHostname("en.wikipedia.org")).toBe(false);
    expect(isBlockedHostname("www.bbc.com")).toBe(false);
    expect(isBlockedHostname("8.8.8.8")).toBe(false);
    expect(isBlockedHostname("1.1.1.1")).toBe(false);
  });

  it("allows external IPs that look similar to private ranges", () => {
    expect(isBlockedHostname("172.32.0.1")).toBe(false);
    expect(isBlockedHostname("11.0.0.1")).toBe(false);
    expect(isBlockedHostname("192.169.0.1")).toBe(false);
  });
});
