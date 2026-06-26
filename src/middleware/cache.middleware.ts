import type { Context, MiddlewareHandler } from "hono";
import { cacheService, type CacheService } from "../lib/cache.js";

export type CacheKeyFactory = (c: Context) => string | Promise<string>;

export type CacheMiddlewareOptions = {
  key: string | CacheKeyFactory;
  ttl?: number;
  cache?: CacheService;
};

const getCacheKey = async (c: Context, key: string | CacheKeyFactory) => {
  return typeof key === "function" ? key(c) : key;
};

const isJsonResponse = (response: Response) => {
  return response.headers.get("content-type")?.includes("application/json");
};

export const cacheMiddleware = (
  options: CacheMiddlewareOptions
): MiddlewareHandler => {
  const cache = options.cache ?? cacheService;

  return async (c, next) => {

    if (c.req.method !== "GET") {
      await next();
      return;
    }

    const key = await getCacheKey(c, options.key);
    const cachedResponse = await cache.get<unknown>(key);

    if (cachedResponse !== null) {
      return c.json(cachedResponse);
    }

    await next();

    if (!c.res.ok || !isJsonResponse(c.res)) {
      return;
    }

    try {
      const responseBody = await c.res.clone().json();
      await cache.set(key, responseBody, options.ttl);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("CACHE ERROR", {
          operation: "middleware.set",
          key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };
};
