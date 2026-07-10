import type { ServiceConfig } from "./config.js";
import { ObservationEngine } from "./engine.js";
import { ReadabilityExtractor } from "./extractor/readability.js";
import { HttpFetchProvider } from "./providers/fetch/http.js";
import { PlaywrightFetchProvider } from "./providers/fetch/playwright.js";
import type { FetchProvider } from "./providers/fetch/types.js";
import { SearxngSearchProvider } from "./providers/search/searxng.js";
import type { SearchProvider } from "./providers/search/types.js";
import { RuleBasedSummarizer } from "./summarizer/rule-based.js";
import { MemoryStorage } from "./storage/memory.js";
import { PostgresStorage } from "./storage/postgres.js";
import type { Storage } from "./storage/types.js";

export async function createObservationEngine(config: ServiceConfig): Promise<ObservationEngine> {
  const storage = await createStorage(config);
  const searchProvider = createSearchProvider(config);
  const fetchProvider = createFetchProvider(config);

  return new ObservationEngine({
    config,
    storage,
    searchProvider,
    fetchProvider,
    extractor: new ReadabilityExtractor(),
    summarizer: new RuleBasedSummarizer(),
  });
}

async function createStorage(config: ServiceConfig): Promise<Storage> {
  const storage = config.databaseUrl
    ? new PostgresStorage(config.databaseUrl)
    : new MemoryStorage();
  await storage.init();
  return storage;
}

function createSearchProvider(config: ServiceConfig): SearchProvider | undefined {
  if (!config.searxngUrl) {
    return undefined;
  }
  return new SearxngSearchProvider(config.searxngUrl, config.fetchTimeoutMs);
}

function createFetchProvider(config: ServiceConfig): FetchProvider {
  if (config.usePlaywright) {
    return new PlaywrightFetchProvider(config.fetchTimeoutMs, config.userAgent);
  }
  return new HttpFetchProvider(config.fetchTimeoutMs, config.userAgent);
}
