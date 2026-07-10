# Observatory MCP

The MCP server is a thin adapter. It does not search or scrape directly; it calls `OBSERVATION_SERVICE_URL`. It supports stdio for IDE compatibility and Streamable HTTP for long-running host applications.

## Tools

- `observe({ topic })`: search, fetch, extract, summarize, store, and return an observation.
- `observe_url({ url })`: observe one URL directly.
- `recall_observation({ topic })`: retrieve stored observation history.

Environment variables:

```env
OBSERVATION_SERVICE_URL=http://localhost:52033
OBSERVATION_API_KEY=
OBSERVATION_TIMEOUT=30
MCP_TRANSPORT=http
MCP_PORT=52036
MCP_PATH=/mcp
```

For the resident HTTP server, use `http://127.0.0.1:52036/mcp` locally or the internal Compose URL in production. `/health` is unauthenticated for container health checks; `/mcp` uses the same Bearer key as the observation service when `OBSERVATION_API_KEY` is set.

Errors are returned as MCP tool errors with stable codes such as `SERVICE_UNAVAILABLE`, `OBSERVATION_FAILED`, `TIMEOUT`, and `RATE_LIMITED`.

The future npm package candidate is `@ludi-uni/observatory-mcp`; its intended entrypoint is `npx @ludi-uni/observatory-mcp`, using the same environment variables as Docker.
