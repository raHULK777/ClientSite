import { describe, expect, it, vi } from "vitest";

import { signSession, verifySession } from "../src/lib/jwt";
import { requireRole } from "../src/middleware/auth";
import { featureGate } from "../src/middleware/feature-gate";
import { normalizeHost } from "../src/modules/tenant/tenant.middleware";

function run(handler: ReturnType<typeof requireRole>, role: string | null) {
  const next = vi.fn();
  handler({ user: role ? { role } : undefined } as never, {} as never, next);
  return next.mock.calls[0]?.[0] as { statusCode?: number } | undefined;
}

describe("host normalization", () => {
  it("strips ports, lowercases, and resolves localhost to the dev tenant", () => {
    expect(normalizeHost("Santos.Localhost:3000")).toBe("santos.localhost");
    expect(normalizeHost("santos.example.com:443")).toBe("santos.example.com");
    expect(normalizeHost("[::1]:4000")).toBe("santos.localhost");
    expect(normalizeHost("127.0.0.1")).toBe("santos.localhost");
  });

  it("takes the first forwarded host and rejects blanks", () => {
    expect(normalizeHost("one.example.com, proxy.local")).toBe("one.example.com");
    expect(normalizeHost(undefined)).toBe("");
    expect(normalizeHost("  ")).toBe("");
  });
});

describe("session tokens", () => {
  it("round-trips a valid session and rejects tampering", () => {
    const token = signSession({
      sub: "22222222-2222-4222-8222-222222222222",
      tenantId: "11111111-1111-4111-8111-111111111111",
      role: "admin",
    });
    expect(verifySession(token)).toMatchObject({ role: "admin" });
    expect(verifySession(`${token}tampered`)).toBeNull();
    expect(verifySession("not-a-token")).toBeNull();
  });
});

describe("RBAC matrix", () => {
  it("allows only the listed role", () => {
    expect(run(requireRole("admin"), "admin")).toBeUndefined();
    expect(run(requireRole("admin"), "field_staff")?.statusCode).toBe(403);
    expect(run(requireRole("admin"), "client")?.statusCode).toBe(403);
    expect(run(requireRole("admin", "field_staff"), "field_staff")).toBeUndefined();
    expect(run(requireRole("client"), "client")).toBeUndefined();
    expect(run(requireRole("client"), null)?.statusCode).toBe(401);
  });

  it("gates disabled tenant features", () => {
    const next = vi.fn();
    featureGate("changeOrders")(
      { tenant: { features: { changeOrders: false } } } as never,
      {} as never,
      next,
    );
    expect((next.mock.calls[0]?.[0] as { statusCode: number }).statusCode).toBe(403);
  });
});
