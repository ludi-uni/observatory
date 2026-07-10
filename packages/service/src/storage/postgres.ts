import { randomUUID } from "node:crypto";
import pg from "pg";
import type { ObservationHistoryEntry } from "@observatory/types";
import type { CachedPageRecord, SaveObservationInput, Storage } from "./types.js";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY,
    topic TEXT NOT NULL,
    summary TEXT,
    confidence REAL,
    evidence JSONB,
    query TEXT NOT NULL DEFAULT '',
    cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
    source_count INTEGER NOT NULL DEFAULT 0,
    observed_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS observation_sources (
    id UUID PRIMARY KEY,
    observation_id UUID NOT NULL REFERENCES observations(id),
    title TEXT,
    url TEXT NOT NULL,
    content TEXT,
    fetched_at TIMESTAMP NOT NULL
    ,content_hash TEXT
    ,extractor TEXT
    ,search_rank INTEGER
    ,snippet TEXT
);

CREATE TABLE IF NOT EXISTS fetched_pages (
    id UUID PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    title TEXT,
    content TEXT,
    content_hash TEXT,
    fetched_at TIMESTAMP NOT NULL,
    last_verified_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS search_queries (
    id UUID PRIMARY KEY,
    query TEXT NOT NULL,
    query_hash TEXT NOT NULL,
    searched_at TIMESTAMP NOT NULL
);

ALTER TABLE observations ADD COLUMN IF NOT EXISTS query TEXT NOT NULL DEFAULT '';
ALTER TABLE observations ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS source_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE observation_sources ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE observation_sources ADD COLUMN IF NOT EXISTS extractor TEXT;
ALTER TABLE observation_sources ADD COLUMN IF NOT EXISTS search_rank INTEGER;
ALTER TABLE observation_sources ADD COLUMN IF NOT EXISTS snippet TEXT;
`;

export class PostgresStorage implements Storage {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({ connectionString: databaseUrl });
  }

  async init(): Promise<void> {
    await this.pool.query(SCHEMA_SQL);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getCachedPage(url: string, ttlDays: number): Promise<CachedPageRecord | null> {
    const result = await this.pool.query<{
      url: string;
      title: string | null;
      content: string | null;
      content_hash: string | null;
      fetched_at: Date;
      last_verified_at: Date;
    }>(
      `SELECT url, title, content, content_hash, fetched_at, last_verified_at
       FROM fetched_pages
       WHERE url = $1
         AND last_verified_at >= NOW() - ($2::int * INTERVAL '1 day')`,
      [url, ttlDays],
    );

    const row = result.rows[0];
    if (!row?.content) {
      return null;
    }

    return {
      url: row.url,
      title: row.title ?? row.url,
      content: row.content,
      contentHash: row.content_hash ?? "",
      fetchedAt: row.fetched_at,
      lastVerifiedAt: row.last_verified_at,
    };
  }

  async upsertFetchedPage(input: {
    url: string;
    title: string;
    content: string;
    contentHash: string;
    fetchedAt: Date;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO fetched_pages (id, url, title, content, content_hash, fetched_at, last_verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       ON CONFLICT (url) DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         content_hash = EXCLUDED.content_hash,
         fetched_at = EXCLUDED.fetched_at,
         last_verified_at = EXCLUDED.last_verified_at`,
      [randomUUID(), input.url, input.title, input.content, input.contentHash, input.fetchedAt],
    );
  }

  async saveObservation(input: SaveObservationInput): Promise<void> {
    const observationId = randomUUID();
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO observations (id, topic, query, summary, confidence, cache_hit, source_count, evidence, observed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          observationId,
          input.topic,
          input.query,
          input.summary,
          input.confidence,
          input.cacheHit,
          input.sourceCount,
          serializeJsonb(input.evidence),
          input.observedAt,
        ],
      );

      for (const source of input.sources) {
        await client.query(
          `INSERT INTO observation_sources (id, observation_id, title, url, content, fetched_at, content_hash, extractor, search_rank, snippet)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            randomUUID(),
            observationId,
            source.title,
            source.url,
            source.content,
            source.fetchedAt,
            source.contentHash,
            source.extractor,
            source.searchRank ?? null,
            source.snippet ?? null,
          ],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async recallObservations(topic: string): Promise<ObservationHistoryEntry[]> {
    const result = await this.pool.query<{
      summary: string | null;
      confidence: number | null;
      observed_at: Date;
    }>(
      `SELECT summary, confidence, observed_at
       FROM observations
       WHERE lower(topic) = lower($1)
       ORDER BY observed_at DESC
       LIMIT 20`,
      [topic.trim()],
    );

    return result.rows.map((row) => ({
      summary: row.summary ?? "",
      confidence: row.confidence ?? 0,
      observed_at: row.observed_at.toISOString(),
    }));
  }
}

export function serializeJsonb(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError("JSONB value must be JSON-serializable");
  }
  return serialized;
}
