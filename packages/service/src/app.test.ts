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
  port: 8080,
  fetchTimeoutMs: 5000,
  cacheTtlDays: 7,
  searchResultLimit: 5,
  usePlaywright: false,
  searxngUrl: "http://searxng:8080",
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

    const recall = await app.request("/v1/observation?topic=Oracle%20Cloud%20Backup");
    const recallBody = await recall.json();
    expect(recallBody.history).toHaveLength(1);

    await engine.close();
  });
});
