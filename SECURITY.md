# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a Vulnerability

Please report security issues privately via GitHub Security Advisories or repository maintainer contact. Do not open public issues for exploitable vulnerabilities.

## Deployment Guidance

Observatory fetches arbitrary URLs when `observe_url` is called or when topic observation follows search results. Treat the Observation Service as a **server-side request tool** with SSRF risk if exposed to untrusted callers.

### Required for production

1. Set `API_KEY` and configure MCP with `OBSERVATION_API_KEY` so `/v1/*` requires Bearer authentication.
2. Do not expose Observation Service ports to the public internet without authentication.
3. Change SearXNG `secret_key` in `deploy/searxng/settings.yml` from the development default.
4. Use strong PostgreSQL credentials (replace docker-compose defaults).

### Built-in protections (v0.1)

- Only `http:` / `https:` URLs are allowed
- Private IP ranges, localhost, and common internal host suffixes are blocked
- Redirect targets are validated
- Response bodies are limited to 5 MiB

### Known limitations

- Hostname-based blocking does not resolve DNS rebinding attacks
- No per-client rate limiting yet
- Rule-based summarizer only; no content moderation

## Dependency Updates

Run `pnpm audit` periodically and rebuild Docker images after dependency updates.
