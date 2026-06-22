import type { Evidence } from "@observatory/types";

export interface ArticleInput {
  url: string;
  title: string;
  content: string;
}

export interface SummarizerResult {
  summary: string;
  confidence: number;
  evidence: Evidence[];
}

export interface Summarizer {
  summarizeTopic(topic: string, articles: ArticleInput[], attemptedCount: number): SummarizerResult;
  summarizeUrl(url: string, article: ArticleInput): SummarizerResult;
}
