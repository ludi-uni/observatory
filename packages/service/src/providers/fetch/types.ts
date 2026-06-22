export interface FetchedPage {
  url: string;
  title: string;
  html: string;
}

export interface FetchProvider {
  fetch(url: string): Promise<FetchedPage>;
  close(): Promise<void>;
}
