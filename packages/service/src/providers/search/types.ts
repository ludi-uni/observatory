export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

export interface SearchProvider {
  search(query: string, limit: number): Promise<SearchResult[]>;
}
