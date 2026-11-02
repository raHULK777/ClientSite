import { describe, expect, it } from "vitest";

import { isAllowedOrigin } from "../src/app";

describe("origin policy", () => {
  it("allows the configured web origin", () => {
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
  });

  it("allows local workspace subdomains with the same port", () => {
    expect(isAllowedOrigin("http://santos.localhost:3000")).toBe(true);
    expect(isAllowedOrigin("http://office.santos.localhost:3000")).toBe(true);
  });

  it("rejects other ports, schemes, and hosts", () => {
    expect(isAllowedOrigin("http://santos.localhost:3100")).toBe(false);
    expect(isAllowedOrigin("https://santos.localhost:3000")).toBe(false);
    expect(isAllowedOrigin("http://evil.example:3000")).toBe(false);
    expect(isAllowedOrigin("not a url")).toBe(false);
  });

  it("allows requests without an origin header", () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
  });
});
