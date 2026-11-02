import type { NextRequest } from "next/server";

import { coreRequest, type CoreResponse } from "@/lib/core-request";

export const dynamic = "force-dynamic";

const HOP_BY_HOP = new Set([
  "connection",
  "content-length",
  "expect",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "accept-encoding",
]);

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const tenantHost = forwardedHost || request.headers.get("host") || "";

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    if (lower === "x-tenant-host") return;
    headers[key] = value;
  });

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? Buffer.from(await request.arrayBuffer()) : undefined;

  let upstream: CoreResponse;
  try {
    upstream = await coreRequest({
      path: `/api/v1/${path.join("/")}${request.nextUrl.search}`,
      method: request.method,
      headers,
      body,
      tenantHost: tenantHost || undefined,
    });
  } catch {
    return Response.json(
      { success: false, error: "The workspace service is not responding." },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  for (const [key, value] of Object.entries(upstream.headers)) {
    if (value === undefined) continue;
    const lower = key.toLowerCase();
    if (lower === "set-cookie") continue;
    if (lower === "content-encoding") continue;
    if (lower === "content-length") continue;
    if (lower === "transfer-encoding") continue;
    if (Array.isArray(value)) {
      for (const item of value) responseHeaders.append(key, item);
    } else {
      responseHeaders.set(key, value);
    }
  }

  for (const cookie of upstream.headers["set-cookie"] ?? []) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new Response(new Uint8Array(upstream.body), {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export {
  forward as GET,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
  forward as OPTIONS,
  forward as HEAD,
};
