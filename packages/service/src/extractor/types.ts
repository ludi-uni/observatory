export interface ExtractedContent {
  title: string;
  content: string;
}

export interface ContentExtractor {
  extract(html: string, url: string): ExtractedContent | null;
}
