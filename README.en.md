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

## Local resident deployment

Requirements: Docker Compose v2.

```bash
cp .env.example .env
docker compose up -d --build
curl http://localhost:52033/health
curl http://localhost:52036/health
```

The service is available at `http://localhost:52033`; SearXNG is at `http://localhost:52034`. Try an observation:

```bash
curl -X POST http://localhost:52033/v1/observe \
  -H 'Content-Type: application/json' \
  -d '{"topic":"recent changes in a software library"}'
```

Set `API_KEY` in `.env` before exposing the service outside a trusted network.

The resident MCP endpoint is `http://127.0.0.1:52036/mcp`. It is included in the default Compose startup. The `mcp-server` profile remains available as a stdio compatibility adapter for IDEs that do not support HTTP.

## OCI deployment

Copy `.env.oci.example` to `.env.oci`, set a long random `API_KEY`, create the shared network, and start the isolated stack:

```bash
docker network create doll_runtime || true
docker compose --env-file .env.oci -f infra/oci/docker-compose.observatory.yml up -d --build
```

The internal MCP endpoint is `http://mcp-server-http:8080/mcp`; host debug ports are localhost-only.

### Use from LM Studio

In LM Studio, open the `Program` tab and choose `Install` → `Edit mcp.json`. Set `API_KEY` in `.env` before starting Observatory, then add:

```json
{
  "mcpServers": {
    "observatory": {
      "url": "http://127.0.0.1:52036/mcp",
      "headers": {
        "Authorization": "Bearer <API_KEY from .env>"
      }
    }
  }
}
```

Restart LM Studio and use a tool-capable model. For example:

```text
Check the latest support status for this software library.
```

If LM Studio and Observatory run on different hosts or containers, replace `127.0.0.1` with a hostname or IP address reachable from LM Studio.

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
        "/path/to/observatory/docker-compose.yml",
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
