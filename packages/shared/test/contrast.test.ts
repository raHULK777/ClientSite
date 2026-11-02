import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  evaluatePalette,
  parseHex,
  pickForeground,
  relativeLuminance,
} from "../src/contrast";

describe("parseHex", () => {
  it("parses six-digit values", () => {
    expect(parseHex("#C2410C")).toEqual({ r: 194, g: 65, b: 12 });
  });

  it("expands three-digit values", () => {
    expect(parseHex("fff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("rejects malformed values", () => {
    expect(parseHex("#12345")).toBeNull();
    expect(parseHex("navy")).toBeNull();
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#15202B", "#F8F9F9")).toBeCloseTo(
      contrastRatio("#F8F9F9", "#15202B"),
      5,
    );
  });
});

describe("pickForeground", () => {
  it("picks white on the demo orange", () => {
    expect(pickForeground("#C2410C")).toBe("#FFFFFF");
  });

  it("picks ink on a light surface", () => {
    expect(pickForeground("#F6F3ED")).toBe("#15202B");
  });
});

describe("relativeLuminance", () => {
  it("puts white at one and black at zero", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
  });
});

describe("evaluatePalette", () => {
  it("passes the pinned Santos palette", () => {
    const result = evaluatePalette({
      primary: "#0B1220",
      secondary: "#C2410C",
      background: "#F6F3ED",
      surface: "#FFFFFF",
    });
    expect(result.ok).toBe(true);
    expect(result.foreground.primary).toBe("#FFFFFF");
  });

  it("fails a low-contrast secondary mark", () => {
    const result = evaluatePalette({
      primary: "#0B1220",
      secondary: "#EEEEEE",
      background: "#F8F9F9",
      surface: "#FFFFFF",
    });
    expect(result.ok).toBe(false);
    expect(result.checks.find((item) => item.name.includes("Secondary"))?.pass).toBe(false);
  });
});
