import http from "node:http";
import https from "node:https";

export function coreApiBase(): string {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  ).replace(/\/$/, "");
}

export type CoreRequestInit = {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: Buffer | string;
  tenantHost?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type CoreResponse = {
  status: number;
  statusText: string;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
};

export function coreRequest(init: CoreRequestInit): Promise<CoreResponse> {
  const base = new URL(coreApiBase());
  const secure = base.protocol === "https:";
  const transport = secure ? https : http;
  const basePath = base.pathname.replace(/\/$/, "");

  const headers: Record<string, string> = { ...init.headers };
  if (init.tenantHost) headers["Host"] = init.tenantHost;

  const timeout = AbortSignal.timeout(init.timeoutMs ?? 8000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;

  return new Promise<CoreResponse>((resolve, reject) => {
    const request = transport.request(
      {
        protocol: base.protocol,
        hostname: base.hostname,
        port: base.port || (secure ? 443 : 80),
        path: `${basePath}${init.path}`,
        method: init.method ?? "GET",
        headers,
        signal,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("error", reject);
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 502,
            statusText: response.statusMessage ?? "",
            headers: response.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );

    request.on("error", reject);
    if (init.body !== undefined) request.write(init.body);
    request.end();
  });
}

export function readJson(response: CoreResponse): unknown {
  const contentType = response.headers["content-type"] ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return JSON.parse(response.body.toString("utf8"));
  } catch {
    return null;
  }
}
