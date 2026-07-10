import { createHash } from "node:crypto";
import type { ObservationHistoryEntry } from "@observatory/types";
import type { CachedPageRecord, SaveObservationInput, Storage } from "./types.js";

interface MemoryObservation extends ObservationHistoryEntry {
  topicKey: string;
  evidence: SaveObservationInput["evidence"];
  sources: SaveObservationInput["sources"];
}

export class MemoryStorage implements Storage {
  private readonly pages = new Map<string, CachedPageRecord>();
  private readonly observations: MemoryObservation[] = [];

  async init(): Promise<void> {
    // no-op
  }

  async close(): Promise<void> {
    // no-op
  }

  async getCachedPage(url: string, ttlDays: number): Promise<CachedPageRecord | null> {
    const record = this.pages.get(url);
    if (!record) {
      return null;
    }

    const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
    if (Date.now() - record.lastVerifiedAt.getTime() > ttlMs) {
      return null;
    }

    return record;
  }

  async upsertFetchedPage(input: {
    url: string;
    title: string;
    content: string;
    contentHash: string;
    fetchedAt: Date;
  }): Promise<void> {
    this.pages.set(input.url, {
      url: input.url,
      title: input.title,
      content: input.content,
      contentHash: input.contentHash,
      fetchedAt: input.fetchedAt,
      lastVerifiedAt: input.fetchedAt,
    });
  }

  async saveObservation(input: SaveObservationInput): Promise<void> {
    this.observations.unshift({
      topicKey: input.topic.trim().toLowerCase(),
      summary: input.summary,
      confidence: input.confidence,
      observed_at: input.observedAt.toISOString(),
      evidence: input.evidence,
      sources: input.sources,
    });
  }

  async recallObservations(topic: string): Promise<ObservationHistoryEntry[]> {
    const key = topic.trim().toLowerCase();
    return this.observations
      .filter((entry) => entry.topicKey === key)
      .map((entry) => ({
        summary: entry.summary,
        confidence: entry.confidence,
        observed_at: entry.observed_at,
      }));
  }
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
