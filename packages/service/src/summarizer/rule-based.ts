import type { ArticleInput, Summarizer, SummarizerResult } from "./types.js";

const OFFICIAL_HOST_PATTERNS = [
  /^docs\./i,
  /\.gov$/i,
  /\.oracle\.com$/i,
  /^learn\.microsoft\.com$/i,
];

export class RuleBasedSummarizer implements Summarizer {
  summarizeTopic(
    topic: string,
    articles: ArticleInput[],
    attemptedCount: number,
  ): SummarizerResult {
    const evidence = articles.map((article) => ({
      source: article.url,
      claim: firstSentence(article.content, 200),
    }));

    const summaryParts = articles.slice(0, 3).map((article) => {
      const excerpt = firstSentence(article.content, 160);
      return `${article.title}: ${excerpt}`;
    });

    const summary =
      summaryParts.length > 0
        ? `「${topic}」について、${articles.length} 件のソースから観測しました。${summaryParts.join(" ")}`
        : `「${topic}」について観測できませんでした。`;

    return {
      summary: truncate(summary, 1200),
      confidence: calculateConfidence(articles, attemptedCount),
      evidence,
    };
  }

  summarizeUrl(url: string, article: ArticleInput): SummarizerResult {
    const claim = firstSentence(article.content, 240);
    return {
      summary: truncate(`${article.title}: ${firstSentence(article.content, 400)}`, 800),
      confidence: calculateConfidence([article], 1),
      evidence: [{ source: url, claim }],
    };
  }
}

function calculateConfidence(articles: ArticleInput[], attemptedCount: number): number {
  if (articles.length === 0) {
    return 0;
  }

  let confidence = 0.45;
  const successRate = articles.length / Math.max(attemptedCount, 1);
  confidence += successRate * 0.2;

  if (articles.length >= 3) {
    confidence += 0.1;
  }

  const domains = new Set(
    articles.map((article) => {
      try {
        return new URL(article.url).hostname;
      } catch {
        return article.url;
      }
    }),
  );

  if (domains.size >= 2) {
    confidence += 0.1;
  }

  if ([...domains].some((host) => OFFICIAL_HOST_PATTERNS.some((pattern) => pattern.test(host)))) {
    confidence += 0.2;
  }

  const failedCount = Math.max(attemptedCount - articles.length, 0);
  confidence -= failedCount * 0.1;

  return Math.round(Math.min(1, Math.max(0.1, confidence)) * 100) / 100;
}

function firstSentence(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(.+?[.!?。！？])(?:\s|$)/);
  const sentence = match?.[1] ?? normalized;
  return truncate(sentence, maxLength);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}
