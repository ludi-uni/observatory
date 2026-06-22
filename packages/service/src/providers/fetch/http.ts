import { ObservationError } from "../../errors.js";
import type { FetchProvider, FetchedPage } from "./types.js";

export class HttpFetchProvider implements FetchProvider {
  constructor(private readonly timeoutMs: number) {}

  async fetch(url: string): Promise<FetchedPage> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Observatory/0.1 (+https://github.com/observatory)",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      if (!response.ok) {
        throw new ObservationError("FETCH_FAILED");
      }

      const html = await response.text();
      const title = extractTitle(html) ?? url;

      return { url, title, html };
    } catch (error) {
      if (error instanceof ObservationError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new ObservationError("TIMEOUT");
      }
      throw new ObservationError("FETCH_FAILED");
    } finally {
      clearTimeout(timeout);
    }
  }

  async close(): Promise<void> {
    // no-op
  }
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim();
}
