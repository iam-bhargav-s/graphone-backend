import NodeCache from "node-cache";

export const DEFAULT_CACHE_TTL_SECONDS = 300;

type CacheLogEvent = "CACHE HIT" | "CACHE MISS" | "CACHE SET" | "CACHE DELETE";

export interface CacheService {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  flush(): Promise<void>;
}

export interface PrefixInvalidatingCacheService extends CacheService {
  delByPrefix(prefix: string): Promise<void>;
}

export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list?(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>;
}

export type CacheLogger = (
  event: CacheLogEvent,
  key: string,
  metadata?: Record<string, unknown>
) => void;

const shouldLogCache = () => process.env.NODE_ENV !== "production";

const defaultLogger: CacheLogger = (event, key, metadata) => {
  if (!shouldLogCache()) {
    return;
  }

  const suffix = metadata ? ` ${JSON.stringify(metadata)}` : "";
  console.log(`${event} ${key}${suffix}`);
};

export class NodeCacheService implements PrefixInvalidatingCacheService {
  private readonly cache: NodeCache;
  private readonly logger: CacheLogger;
  private readonly defaultTtl: number;

  constructor(options?: {
    defaultTtl?: number;
    logger?: CacheLogger;
    cache?: NodeCache;
  }) {
    this.defaultTtl = options?.defaultTtl ?? DEFAULT_CACHE_TTL_SECONDS;
    this.logger = options?.logger ?? defaultLogger;
    this.cache =
      options?.cache ??
      new NodeCache({
        stdTTL: this.defaultTtl,
        checkperiod: Math.max(60, Math.floor(this.defaultTtl / 2)),
        useClones: true,
        deleteOnExpire: true,
      });
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = this.cache.get<T>(key);

      if (value === undefined) {
        this.logger("CACHE MISS", key);
        return null;
      }

      this.logger("CACHE HIT", key);
      return value;
    } catch (error) {
      this.logError("get", key, error);
      return null;
    }
  }

  async set<T = unknown>(
    key: string,
    value: T,
    ttl = this.defaultTtl
  ): Promise<void> {
    try {
      this.cache.set(key, value, ttl);
      this.logger("CACHE SET", key, { ttl });
    } catch (error) {
      this.logError("set", key, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      this.cache.del(key);
      this.logger("CACHE DELETE", key);
    } catch (error) {
      this.logError("del", key, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return this.cache.has(key);
    } catch (error) {
      this.logError("exists", key, error);
      return false;
    }
  }

  async flush(): Promise<void> {
    try {
      this.cache.flushAll();
      this.logger("CACHE DELETE", "*");
    } catch (error) {
      this.logError("flush", "*", error);
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    try {
      const keys = this.cache.keys().filter((key) => key.startsWith(prefix));

      if (keys.length > 0) {
        this.cache.del(keys);
      }

      this.logger("CACHE DELETE", `${prefix}*`, { count: keys.length });
    } catch (error) {
      this.logError("delByPrefix", prefix, error);
    }
  }

  private logError(operation: string, key: string, error: unknown) {
    if (!shouldLogCache()) {
      return;
    }

    console.error("CACHE ERROR", {
      operation,
      key,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export class CloudflareKVCacheService implements PrefixInvalidatingCacheService {
  private readonly kv: KVNamespaceLike;
  private readonly logger: CacheLogger;
  private readonly defaultTtl: number;

  constructor(
    kv: KVNamespaceLike,
    options?: { defaultTtl?: number; logger?: CacheLogger }
  ) {
    this.kv = kv;
    this.defaultTtl = options?.defaultTtl ?? DEFAULT_CACHE_TTL_SECONDS;
    this.logger = options?.logger ?? defaultLogger;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const rawValue = await this.kv.get(key);

      if (rawValue === null) {
        this.logger("CACHE MISS", key);
        return null;
      }

      this.logger("CACHE HIT", key);
      return JSON.parse(rawValue) as T;
    } catch (error) {
      this.logError("get", key, error);
      return null;
    }
  }

  async set<T = unknown>(
    key: string,
    value: T,
    ttl = this.defaultTtl
  ): Promise<void> {
    try {
      await this.kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
      this.logger("CACHE SET", key, { ttl });
    } catch (error) {
      this.logError("set", key, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
      this.logger("CACHE DELETE", key);
    } catch (error) {
      this.logError("del", key, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async flush(): Promise<void> {
    if (!this.kv.list) {
      throw new Error("KV list() is required to flush cache");
    }

    const result = await this.kv.list();
    await Promise.all(result.keys.map((key) => this.kv.delete(key.name)));
    this.logger("CACHE DELETE", "*", { count: result.keys.length });
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (!this.kv.list) {
      throw new Error("KV list() is required for prefix invalidation");
    }

    const result = await this.kv.list({ prefix });
    await Promise.all(result.keys.map((key) => this.kv.delete(key.name)));
    this.logger("CACHE DELETE", `${prefix}*`, { count: result.keys.length });
  }

  private logError(operation: string, key: string, error: unknown) {
    if (!shouldLogCache()) {
      return;
    }

    console.error("CACHE ERROR", {
      operation,
      key,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Local development default. In Workers, construct CloudflareKVCacheService with env.CACHE_KV.
export const cacheService: PrefixInvalidatingCacheService =
  new NodeCacheService();
