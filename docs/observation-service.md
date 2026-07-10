# Observation Service

The service combines search, fetching, extraction, summarization, evidence generation, caching, and history storage.

Endpoints are namespaced under `/v1` except health:

- `GET /health`
- `POST /v1/observe`
- `POST /v1/observe-url`
- `GET /v1/observation?topic=...`

Responses include observation metadata (`topic`, `query`, `observed_at`, `cache_hit`, `confidence`, `source_count`) and source metadata such as timestamps, SHA-256 content hashes, extractor name, search rank, and snippets. Authentication is an optional Bearer API key; configure it for production.

The PostgreSQL implementation stores observation history, source metadata, and fetched-page content cache. Without `DATABASE_URL`, the service uses in-memory storage for development and tests.
