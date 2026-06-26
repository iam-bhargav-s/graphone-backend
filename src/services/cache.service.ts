import { cacheService } from "../lib/cache.js";
import {
  PAPER_PREFIX,
  PAPERS_LIST_PREFIX,
  TRENDING_KEY,
  paperKey,
} from "../lib/cache-keys.js";

export const FIVE_MINUTES = 5 * 60;
export const TWO_MINUTES = 2 * 60;
export const TEN_MINUTES = 10 * 60;

export const getCachedValue = async <T>(key: string) => {
  return cacheService.get<T>(key);
};

export const setCachedValue = async <T>(
  key: string,
  value: T,
  ttl?: number
) => {
  await cacheService.set(key, value, ttl);
};

export const deleteCachedValue = async (key: string) => {
  await cacheService.del(key);
};

export const invalidatePaper = async (slug: string) => {
  await cacheService.del(paperKey(slug));
};

export const invalidatePapersList = async () => {
  await cacheService.delByPrefix(PAPERS_LIST_PREFIX);
};

export const invalidateTrending = async () => {
  await cacheService.del(TRENDING_KEY);
};

export const invalidatePaperReads = async (slug: string) => {
  await Promise.all([
    cacheService.del(paperKey(slug)),
    cacheService.delByPrefix(PAPERS_LIST_PREFIX),
    cacheService.del(TRENDING_KEY),
  ]);
};

export const invalidateAllPaperDetails = async () => {
  await cacheService.delByPrefix(PAPER_PREFIX);
};
