import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import type { ContentExtractor, ExtractedContent } from "./types.js";

export class ReadabilityExtractor implements ContentExtractor {
  extract(html: string, url: string): ExtractedContent | null {
    const { document } = parseHTML(html);
    const canonicalUrl = url;
    const base = document.createElement("base");
    base.setAttribute("href", canonicalUrl);
    document.head.appendChild(base);

    const article = new Readability(document).parse();
    if (!article?.textContent?.trim()) {
      return null;
    }

    return {
      title: article.title?.trim() || url,
      content: normalizeWhitespace(article.textContent),
    };
  }
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
