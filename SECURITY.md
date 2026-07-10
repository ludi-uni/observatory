# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
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
- Redirect destinations are checked with the same URL policy
- Configurable fixed-window rate limiting and observation concurrency limits

### Known limitations

- Hostname-based blocking does not completely prevent DNS rebinding attacks; deploy behind network egress controls as well
- Redirect destinations must always be validated; the built-in HTTP and Playwright providers do this, but custom providers are responsible for it
- Private networks, localhost, and cloud metadata endpoints must remain blocked. For production, use an explicit destination allowlist where possible
- Rule-based summarizer only; no content moderation

### Rate limits and quotas

The service includes a simple fixed-window limiter. It prefers the authenticated API key as the client identity and falls back to `X-Forwarded-For`, `X-Real-IP`, or an anonymous bucket. It also limits concurrent observations globally.

```env
OBSERVATORY_RATE_LIMIT_WINDOW_SEC=60
OBSERVATORY_RATE_LIMIT_MAX=30
OBSERVATORY_MAX_CONCURRENT_OBSERVATIONS=3
```

This is intentionally a small in-process guard, not a distributed quota system. Use an API gateway or reverse proxy for multi-instance deployments.

### User-Agent and robots.txt

Observatory retrieves web pages. Set a descriptive User-Agent in public deployments and do not use it for high-frequency crawling. robots.txt respect is planned for a future release.

```env
OBSERVATORY_USER_AGENT="ObservatoryBot/0.1 (+https://github.com/ludi-uni/observatory)"
```

## Dependency Updates

Run `pnpm audit` periodically and rebuild Docker images after dependency updates.
