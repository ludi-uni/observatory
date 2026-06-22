import type {
  ObserveRequest,
  ObserveResponse,
  ObserveUrlRequest,
  ObserveUrlResponse,
  RecallObservationResponse,
} from "@observatory/types";
import type { ServiceConfig } from "./config.js";
import type { ContentExtractor } from "./extractor/types.js";
import { ObservationError } from "./errors.js";
import type { FetchProvider } from "./providers/fetch/types.js";
import type { SearchProvider } from "./providers/search/types.js";
import { assertFetchableUrl } from "./security/url-policy.js";
import type { Summarizer } from "./summarizer/types.js";
import { hashContent } from "./storage/memory.js";
import type { Storage, StoredSource } from "./storage/types.js";
import { runWithConcurrency } from "./utils/concurrency.js";

export interface ObservationEngineDeps {
  config: ServiceConfig;
  storage: Storage;
  searchProvider?: SearchProvider;
  fetchProvider: FetchProvider;
  extractor: ContentExtractor;
  summarizer: Summarizer;
}

export class ObservationEngine {
  constructor(private readonly deps: ObservationEngineDeps) {}

  async observeTopic(request: ObserveRequest): Promise<ObserveResponse> {
    const topic = request.topic.trim();
    if (!this.deps.searchProvider) {
      throw new ObservationError("SEARCH_FAILED");
    }

    const searchResults = await this.deps.searchProvider.search(
      topic,
      this.deps.config.searchResultLimit,
    );

    const articles: StoredSource[] = [];
    const attemptedCount = searchResults.length;

    await runWithConcurrency(
      searchResults,
      this.deps.config.fetchConcurrency,
      async (result) => {
        try {
          assertFetchableUrl(result.url);
          const article = await this.fetchAndExtract(result.url, result.title);
          if (!article) {
            return;
          }
          articles.push({
            title: article.title,
            url: result.url,
            content: article.content,
            fetchedAt: new Date(),
          });
        } catch (error) {
          console.error(`Source fetch failed for ${result.url}:`, error);
        }
      },
    );

    if (articles.length === 0) {
      throw new ObservationError("EXTRACTION_FAILED");
    }

    const summarized = this.deps.summarizer.summarizeTopic(
      topic,
      articles.map((article) => ({
        url: article.url,
        title: article.title,
        content: article.content,
      })),
      attemptedCount,
    );

    const observedAt = new Date();
    const response: ObserveResponse = {
      summary: summarized.summary,
      confidence: summarized.confidence,
      sources: articles.map((article) => ({
        title: article.title,
        url: article.url,
      })),
      evidence: summarized.evidence,
      observed_at: observedAt.toISOString(),
    };

    await this.deps.storage.saveObservation({
      topic,
      summary: response.summary,
      confidence: response.confidence,
      evidence: response.evidence,
      observedAt,
      sources: articles,
    });

    return response;
  }

  async observeUrl(request: ObserveUrlRequest): Promise<ObserveUrlResponse> {
    const url = request.url.trim();
    assertFetchableUrl(url);

    const article = await this.fetchAndExtract(url);

    if (!article) {
      throw new ObservationError("EXTRACTION_FAILED");
    }

    const summarized = this.deps.summarizer.summarizeUrl(url, {
      url,
      title: article.title,
      content: article.content,
    });
    const observedAt = new Date();

    return {
      title: article.title,
      summary: summarized.summary,
      content: article.content,
      evidence: summarized.evidence,
      observed_at: observedAt.toISOString(),
    };
  }

  async recallObservation(topic: string): Promise<RecallObservationResponse> {
    const history = await this.deps.storage.recallObservations(topic);
    return { history };
  }

  async close(): Promise<void> {
    await this.deps.fetchProvider.close();
    await this.deps.storage.close();
  }

  private async fetchAndExtract(
    url: string,
    fallbackTitle?: string,
  ): Promise<{ title: string; content: string } | null> {
    assertFetchableUrl(url);

    const cached = await this.deps.storage.getCachedPage(
      url,
      this.deps.config.cacheTtlDays,
    );

    if (cached) {
      return {
        title: cached.title,
        content: cached.content,
      };
    }

    const fetched = await this.deps.fetchProvider.fetch(url);
    const extracted = this.deps.extractor.extract(fetched.html, fetched.url);

    if (!extracted?.content) {
      return null;
    }

    const title = extracted.title || fallbackTitle || fetched.title;
    const contentHash = hashContent(extracted.content);
    const fetchedAt = new Date();

    await this.deps.storage.upsertFetchedPage({
      url: fetched.url,
      title,
      content: extracted.content,
      contentHash,
      fetchedAt,
    });

    return { title, content: extracted.content };
  }
}
