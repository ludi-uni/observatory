import { ObservationError } from "../../errors.js";
import type { SearchProvider, SearchResult } from "./types.js";

interface SearxngResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
  }>;
}

export class SearxngSearchProvider implements SearchProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {}

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const url = new URL("/search", this.baseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new ObservationError("SEARCH_FAILED");
      }

      const body = (await response.json()) as SearxngResponse;
      const results = (body.results ?? []).slice(0, limit).flatMap((item) =>
        item.url && item.title
          ? [
              {
                title: item.title,
                url: item.url,
                snippet: item.content,
              },
            ]
          : [],
      );

      if (results.length === 0) {
        throw new ObservationError("SEARCH_FAILED");
      }

      return results;
    } catch (error) {
      if (error instanceof ObservationError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new ObservationError("TIMEOUT");
      }
      throw new ObservationError("SEARCH_FAILED");
    } finally {
      clearTimeout(timeout);
    }
  }
}
