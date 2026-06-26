export const PAPER_PREFIX = "paper:";
export const PAPERS_LIST_PREFIX = "papers:";
export const SEARCH_PREFIX = "search:";
export const TRENDING_KEY = "trending";
export const AUTHOR_PREFIX = "author:";
export const DATASET_PREFIX = "dataset:";
export const MODEL_PREFIX = "model:";

const normalizeSegment = (value: string) => {
  return value.trim().toLowerCase();
};

export const paperKey = (slug: string) => {
  return `${PAPER_PREFIX}${normalizeSegment(slug)}`;
};

export const papersListKey = (page: number | string, limit: number | string) => {
  return `${PAPERS_LIST_PREFIX}page=${page}:limit=${limit}`;
};

export const searchKey = (query: string) => {
  return `${SEARCH_PREFIX}${normalizeSegment(query)}`;
};

export const trendingKey = () => {
  return TRENDING_KEY;
};

export const authorKey = (slug: string) => {
  return `${AUTHOR_PREFIX}${normalizeSegment(slug)}`;
};

export const datasetKey = (slug: string) => {
  return `${DATASET_PREFIX}${normalizeSegment(slug)}`;
};

export const modelKey = (slug: string) => {
  return `${MODEL_PREFIX}${normalizeSegment(slug)}`;
};
