import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import type { ServiceConfig } from "./config.js";
import { ObservationEngine } from "./engine.js";
import { ReadabilityExtractor } from "./extractor/readability.js";
import { RuleBasedSummarizer } from "./summarizer/rule-based.js";
import { MemoryStorage } from "./storage/memory.js";
import type { FetchProvider, FetchedPage } from "./providers/fetch/types.js";
import type { SearchProvider, SearchResult } from "./providers/search/types.js";

class StubSearch implements SearchProvider {
  async search(): Promise<SearchResult[]> {
    return [
      {
        title: "Test Article",
        url: "https://example.com/article",
      },
    ];
  }
}

class StubFetch implements FetchProvider {
  async fetch(url: string): Promise<FetchedPage> {
    return {
      url,
      title: "Test Article",
      html: `<html><head><title>Test Article</title></head><body><article><h1>Test Article</h1><p>Observatory integration test content. This sentence becomes evidence.</p></article></body></html>`,
    };
  }

  async close(): Promise<void> {
    // no-op
  }
}

const config: ServiceConfig = {
  port: 52033,
  fetchTimeoutMs: 5000,
  cacheTtlDays: 7,
  searchResultLimit: 5,
  fetchConcurrency: 3,
  usePlaywright: false,
  searxngUrl: "http://searxng:8080",
  userAgent: "ObservatoryTest/1.0",
  rateLimitWindowSec: 60,
  rateLimitMax: 30,
  maxConcurrentObservations: 3,
};

describe("Observation API", () => {
  it("observes a topic end-to-end with stub providers", async () => {
    const storage = new MemoryStorage();
    await storage.init();

    const engine = new ObservationEngine({
      config,
      storage,
      searchProvider: new StubSearch(),
      fetchProvider: new StubFetch(),
      extractor: new ReadabilityExtractor(),
      summarizer: new RuleBasedSummarizer(),
    });

    const app = createApp(config, engine);
    const response = await app.request("/v1/observe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "Oracle Cloud Backup" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary).toContain("Oracle Cloud Backup");
    expect(body.evidence.length).toBeGreaterThan(0);
    expect(body.sources[0].url).toBe("https://example.com/article");
    expect(body.topic).toBe("Oracle Cloud Backup");
    expect(body.source_count).toBe(1);
    expect(body.sources[0].content_hash).toMatch(/^sha256:/);

    const recall = await app.request("/v1/observation?topic=Oracle%20Cloud%20Backup");
    const recallBody = await recall.json();
    expect(recallBody.history).toHaveLength(1);

    await engine.close();
  });

  it("rejects observe-url for private network targets", async () => {
    const storage = new MemoryStorage();
    await storage.init();

    const engine = new ObservationEngine({
      config,
      storage,
      fetchProvider: new StubFetch(),
      extractor: new ReadabilityExtractor(),
      summarizer: new RuleBasedSummarizer(),
    });

    const app = createApp(config, engine);
    const response = await app.request("/v1/observe-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "http://127.0.0.1/admin" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("FETCH_FAILED");

    await engine.close();
  });
});
