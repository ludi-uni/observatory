import { chromium, type Browser } from "playwright";
import { ObservationError } from "../../errors.js";
import { assertFetchableResolvedUrl, assertFetchableUrl } from "../../security/url-policy.js";
import type { FetchProvider, FetchedPage } from "./types.js";

export class PlaywrightFetchProvider implements FetchProvider {
  private browser: Browser | null = null;

  constructor(
    private readonly timeoutMs: number,
    private readonly userAgent: string,
  ) {}

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  async fetch(url: string): Promise<FetchedPage> {
    assertFetchableUrl(url);

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "User-Agent": this.userAgent });

    try {
      const response = await page.goto(url, {
        timeout: this.timeoutMs,
        waitUntil: "domcontentloaded",
      });

      const finalUrl = page.url();
      assertFetchableResolvedUrl(finalUrl);

      if (response && !response.ok()) {
        throw new ObservationError("FETCH_FAILED");
      }

      const html = await page.content();
      const title = await page.title();

      return { url: finalUrl, title, html };
    } catch (error) {
      if (error instanceof ObservationError) {
        throw error;
      }
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new ObservationError("TIMEOUT");
      }
      throw new ObservationError("FETCH_FAILED");
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
