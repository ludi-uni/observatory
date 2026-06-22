import { ObservationError } from "../../errors.js";
import {
  assertFetchableResolvedUrl,
  assertFetchableUrl,
  MAX_BODY_BYTES,
  MAX_REDIRECTS,
} from "../../security/url-policy.js";
import type { FetchProvider, FetchedPage } from "./types.js";

export class HttpFetchProvider implements FetchProvider {
  constructor(private readonly timeoutMs: number) {}

  async fetch(url: string): Promise<FetchedPage> {
    assertFetchableUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      let currentUrl = url;
      let response: Response | undefined;

      for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
        response = await fetch(currentUrl, {
          signal: controller.signal,
          redirect: "manual",
          headers: {
            "User-Agent": "Observatory/0.1 (+https://github.com/observatory)",
            Accept: "text/html,application/xhtml+xml",
          },
        });

        if (response.status >= 300 && response.status < 400) {
          if (redirectCount === MAX_REDIRECTS) {
            throw new ObservationError("FETCH_FAILED");
          }
          const location = response.headers.get("location");
          if (!location) {
            throw new ObservationError("FETCH_FAILED");
          }
          currentUrl = new URL(location, currentUrl).toString();
          assertFetchableResolvedUrl(currentUrl);
          continue;
        }

        break;
      }

      if (!response?.ok) {
        throw new ObservationError("FETCH_FAILED");
      }

      const html = await readLimitedText(response);
      const title = extractTitle(html) ?? currentUrl;

      return { url: currentUrl, title, html };
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

async function readLimitedText(response: Response): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    throw new ObservationError("FETCH_FAILED");
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_BODY_BYTES) {
    throw new ObservationError("FETCH_FAILED");
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim();
}
