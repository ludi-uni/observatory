CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY,
    topic TEXT NOT NULL,
    summary TEXT,
    confidence REAL,
    evidence JSONB,
    observed_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS observation_sources (
    id UUID PRIMARY KEY,
    observation_id UUID NOT NULL REFERENCES observations(id),
    title TEXT,
    url TEXT NOT NULL,
    content TEXT,
    fetched_at TIMESTAMP NOT NULL
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
