import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

export const API_PORT = Number(process.env.AGENT_API_PORT ?? 4200);
export const WEB_PORT = Number(process.env.AGENT_WEB_PORT ?? 3200);
export const API_URL = `http://localhost:${API_PORT}`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;

const API_ENV = {
  ...process.env,
  NODE_ENV: "development",
  API_PORT: String(API_PORT),
  WEB_ORIGIN: WEB_URL,
  DATABASE_URL: "",
  REDIS_URL: "",
  JWT_SECRET: "",
  COOKIE_SECURE: "false",
  RATE_LIMIT_DISABLED: "true",
  DEV_TENANT_HOST: "santos.localhost",
  PGLITE_DATA_DIR: `${ROOT}constructops-core/.data/pglite-agent`,
};

const WEB_ENV = {
  ...process.env,
  NODE_ENV: "development",
  NEXT_PUBLIC_API_URL: API_URL,
  API_INTERNAL_URL: API_URL,
  NEXT_PUBLIC_ROOT_DOMAIN: `localhost:${WEB_PORT}`,
};

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function waitFor(url, label, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await delay(500);
      continue;
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${label} at ${url}`);
}

const children = [];

function start(name, command, args, options) {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    ...options,
  });
  const log = [];
  const capture = (chunk) => {
    const text = chunk.toString();
    log.push(text);
    if (log.length > 200) log.shift();
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  children.push({ name, child, log });
  child.on("exit", () => {
    const index = children.findIndex((entry) => entry.child === child);
    if (index >= 0) children.splice(index, 1);
  });
  return child;
}

export async function startServers() {
  await run("npm", ["run", "db:migrate", "-w", "@constructops/core"], { cwd: ROOT, env: API_ENV });
  await run("npm", ["run", "db:seed", "-w", "@constructops/core"], { cwd: ROOT, env: API_ENV });

  start("api", "npm", ["run", "start:e2e", "-w", "@constructops/core"], { cwd: ROOT, env: API_ENV });
  await waitFor(`${API_URL}/health`, "api");

  start("web", "npm", ["run", "dev:e2e", "-w", "@constructops/web", "--", "--port", String(WEB_PORT)], {
    cwd: ROOT,
    env: WEB_ENV,
  });
  await waitFor(WEB_URL, "web");
}

export async function stopServers() {
  for (const entry of children.splice(0)) {
    try {
      entry.child.kill("SIGTERM");
    } catch {
      continue;
    }
  }
  await delay(1500);
  for (const entry of children.splice(0)) {
    try {
      entry.child.kill("SIGKILL");
    } catch {
      continue;
    }
  }
}

export function serverLogs() {
  return children.map((entry) => ({ name: entry.name, log: entry.log.join("") }));
}
