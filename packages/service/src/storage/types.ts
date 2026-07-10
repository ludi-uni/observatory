import type { Evidence, ObservationHistoryEntry } from "@observatory/types";

export interface CachedPageRecord {
  url: string;
  title: string;
  content: string;
  contentHash: string;
  fetchedAt: Date;
  lastVerifiedAt: Date;
}

export interface StoredSource {
  title: string;
  url: string;
  content: string;
  fetchedAt: Date;
  contentHash: string;
  extractor: string;
  searchRank?: number;
  snippet?: string;
  cacheHit?: boolean;
}

export interface SaveObservationInput {
  topic: string;
  query: string;
  summary: string;
  confidence: number;
  cacheHit: boolean;
  sourceCount: number;
  evidence: Evidence[];
  observedAt: Date;
  sources: StoredSource[];
}

export interface Storage {
  init(): Promise<void>;
  close(): Promise<void>;
  getCachedPage(url: string, ttlDays: number): Promise<CachedPageRecord | null>;
  upsertFetchedPage(input: {
    url: string;
    title: string;
    content: string;
    contentHash: string;
    fetchedAt: Date;
  }): Promise<void>;
  saveObservation(input: SaveObservationInput): Promise<void>;
  recallObservations(topic: string): Promise<ObservationHistoryEntry[]>;
}
