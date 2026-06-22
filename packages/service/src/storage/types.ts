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
}

export interface SaveObservationInput {
  topic: string;
  summary: string;
  confidence: number;
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
