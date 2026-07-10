# Observatory

English README: [README.md](./README.md)

Observatory is not just a search wrapper.
It is an observation layer for LLM agents.

Instead of exposing low-level tools such as search, crawl, fetch, or scrape,
Observatory exposes a higher-level interface: `observe`.

It searches through SearXNG, fetches pages, extracts readable content, produces a concise evidence-backed summary, and stores observations for later recall. The MCP server is a thin adapter over the Observation Service.

## What Observatory is not

- Not a Google Search wrapper
- Not a generic web scraper
- Not a crawler-only tool
- Not a RAG database by itself

It is an observation layer: search, fetch, extract, summarize, store, and return evidence-backed observations as one agent-facing operation.

## Quick start with Docker Compose

Requirements: Docker Compose v2.

```bash
cp .env.example .env
docker compose up -d --build
curl http://localhost:52033/health
```

The service is available at `http://localhost:52033`; SearXNG is at `http://localhost:52034`. Try an observation:

```bash
curl -X POST http://localhost:52033/v1/observe \
  -H 'Content-Type: application/json' \
  -d '{"topic":"Oracle Cloud Backup"}'
```

Set `API_KEY` in `.env` before exposing the service outside a trusted network.

## MCP clients

The repository Compose file runs the MCP server through the `mcp` profile and connects it to the service over the internal network:

```json
{
  "mcpServers": {
    "observatory": {
      "command": "docker",
      "args": [
        "compose",
        "-f",
        "D:/path/to/observatory/docker-compose.yml",
        "--profile",
        "mcp",
        "run",
        "--rm",
        "-i",
        "mcp-server"
      ]
    }
  }
}
```

This stdio shape works for Cursor, Claude Desktop, Cline, Roo Code, Open WebUI, and LM Studio; see [docs/mcp-clients.md](./docs/mcp-clients.md) for client-specific notes.

## Architecture

```text
LLM agent -> MCP (stdio) -> Observation Service
                             -> SearXNG search
                             -> HTTP or Playwright fetch
                             -> Mozilla Readability extraction
                             -> rule-based summary + evidence
                             -> PostgreSQL cache/history
```

See [docs/architecture.md](./docs/architecture.md) and [docs/openapi.yaml](./docs/openapi.yaml).

## Security

The service blocks non-HTTP(S), localhost, private-network, and common metadata URLs, validates redirects, limits response size, and supports API-key authentication, rate limits, concurrency limits, and a configurable User-Agent. DNS rebinding is not completely solved; use an egress firewall and an allowlist in public deployments. Observatory is not intended for high-frequency crawling. See [SECURITY.md](./SECURITY.md).

## License

MIT. See [LICENSE](./LICENSE).
