export interface ServiceConfig {
  port: number;
  apiKey?: string;
  fetchTimeoutMs: number;
  searxngUrl?: string;
  databaseUrl?: string;
  cacheTtlDays: number;
  searchResultLimit: number;
  fetchConcurrency: number;
  usePlaywright: boolean;
}

export function loadConfig(): ServiceConfig {
  const port = Number(process.env.PORT ?? "52033");
  const apiKey = process.env.API_KEY || undefined;
  const fetchTimeoutMs = Number(process.env.FETCH_TIMEOUT ?? "30") * 1000;
  const searxngUrl = process.env.SEARXNG_URL?.replace(/\/$/, "") || undefined;
  const databaseUrl = process.env.DATABASE_URL || undefined;
  const cacheTtlDays = Number(process.env.CACHE_TTL_DAYS ?? "7");
  const searchResultLimit = Number(process.env.SEARCH_RESULT_LIMIT ?? "5");
  const fetchConcurrency = Number(process.env.FETCH_CONCURRENCY ?? "3");
  const usePlaywright = process.env.USE_PLAYWRIGHT !== "false";

  return {
    port,
    apiKey,
    fetchTimeoutMs,
    searxngUrl,
    databaseUrl,
    cacheTtlDays,
    searchResultLimit,
    fetchConcurrency,
    usePlaywright,
  };
}
