import Redis from "ioredis";

import type { TenantContext } from "./tenant.types";

type Entry = { value: TenantContext; expiresAt: number };

export class TenantCache {
  private readonly memory = new Map<string, Entry>();
  private redis: Redis | null = null;
  private redisUnavailable = false;

  constructor(
    private readonly ttlSeconds: number,
    redisUrl?: string,
  ) {
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        enableOfflineQueue: false,
      });
      this.redis.on("error", () => {
        this.redisUnavailable = true;
      });
    }
  }

  async get(key: string): Promise<TenantContext | null> {
    const now = Date.now();
    const local = this.memory.get(key);
    if (local && local.expiresAt > now) return local.value;
    if (local) this.memory.delete(key);

    if (!this.redis || this.redisUnavailable) return null;
    try {
      if (this.redis.status === "wait") await this.redis.connect();
      const raw = await this.redis.get(`tenant:${key}`);
      if (!raw) return null;
      const value = JSON.parse(raw) as TenantContext;
      this.remember(key, value);
      return value;
    } catch {
      this.redisUnavailable = true;
      return null;
    }
  }

  async set(key: string, value: TenantContext): Promise<void> {
    this.remember(key, value);
    if (!this.redis || this.redisUnavailable) return;
    try {
      if (this.redis.status === "wait") await this.redis.connect();
      await this.redis.set(`tenant:${key}`, JSON.stringify(value), "EX", this.ttlSeconds);
    } catch {
      this.redisUnavailable = true;
    }
  }

  async clear(key: string): Promise<void> {
    this.memory.delete(key);
    if (!this.redis || this.redisUnavailable) return;
    try {
      await this.redis.del(`tenant:${key}`);
    } catch {
      this.redisUnavailable = true;
    }
  }

  async close(): Promise<void> {
    if (this.redis) await this.redis.quit().catch(() => undefined);
  }

  private remember(key: string, value: TenantContext): void {
    this.memory.set(key, { value, expiresAt: Date.now() + this.ttlSeconds * 1000 });
  }
}
