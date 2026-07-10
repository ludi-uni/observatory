# Architecture

Observatory separates the agent-facing MCP protocol from the observation engine.

```text
LLM agent
  -> MCP Server (stdio, thin adapter)
  -> Observation Service (HTTP API)
       -> SearXNG (search)
       -> HTTP / Playwright providers (fetch)
       -> Mozilla Readability (extract)
       -> rule-based summarizer (summary, confidence, evidence)
       -> PostgreSQL (history and fetched-page cache)
```

The service can run in memory for local development. Docker Compose supplies PostgreSQL, Valkey, SearXNG, the service, and the on-demand MCP container.
