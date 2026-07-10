import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import type {
  ErrorResponse,
  HealthResponse,
  ObserveRequest,
  ObserveUrlRequest,
} from "@observatory/types";
import type { ServiceConfig } from "./config.js";
import type { ObservationEngine } from "./engine.js";
import { ObservationError } from "./errors.js";
import { assertFetchableUrl } from "./security/url-policy.js";
import { FixedWindowRateLimiter, ObservationConcurrencyLimiter } from "./security/rate-limit.js";

export function createApp(config: ServiceConfig, engine: ObservationEngine): Hono {
  const app = new Hono();

  if (config.apiKey) {
    app.use("/v1/*", bearerAuth({ token: config.apiKey }));
  }

  const rateLimiter = new FixedWindowRateLimiter(
    config.rateLimitWindowSec * 1000,
    config.rateLimitMax,
  );
  const concurrencyLimiter = new ObservationConcurrencyLimiter(config.maxConcurrentObservations);
  app.use("/v1/*", async (c, next) => {
    const authorization = c.req.header("Authorization") ?? "";
    const apiKey = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;
    const forwarded = c.req.header("X-Forwarded-For")?.split(",")[0]?.trim();
    const clientKey = apiKey
      ? `api:${apiKey}`
      : `ip:${forwarded || c.req.header("X-Real-IP") || "unknown"}`;
    if (!rateLimiter.allow(clientKey)) {
      return c.json({ success: false, error: "RATE_LIMITED" }, 429, {
        "Retry-After": String(Math.max(1, config.rateLimitWindowSec)),
      });
    }
    if (
      c.req.method !== "POST" ||
      (!c.req.path.endsWith("/observe") && !c.req.path.endsWith("/observe-url"))
    ) {
      return next();
    }
    return concurrencyLimiter.run(next);
  });

  app.get("/health", (c) => {
    const body: HealthResponse = { status: "ok" };
    return c.json(body);
  });

  app.post("/v1/observe", async (c) => {
    const body = await c.req.json<ObserveRequest>();
    if (!body.topic?.trim()) {
      return serviceError(c, "SEARCH_FAILED", 400);
    }

    try {
      const result = await engine.observeTopic(body);
      return c.json(result);
    } catch (error) {
      return handleObservationError(c, error);
    }
  });

  app.post("/v1/observe-url", async (c) => {
    const body = await c.req.json<ObserveUrlRequest>();
    if (!body.url?.trim()) {
      return serviceError(c, "FETCH_FAILED", 400);
    }

    try {
      assertFetchableUrl(body.url.trim());
    } catch (error) {
      if (error instanceof ObservationError) {
        return serviceError(c, error.code, 400);
      }
      return serviceError(c, "FETCH_FAILED", 400);
    }

    try {
      const result = await engine.observeUrl(body);
      return c.json(result);
    } catch (error) {
      return handleObservationError(c, error);
    }
  });

  app.get("/v1/observation", async (c) => {
    const topic = c.req.query("topic");
    if (!topic?.trim()) {
      return serviceError(c, "SEARCH_FAILED", 400);
    }

    try {
      const result = await engine.recallObservation(topic);
      return c.json(result);
    } catch (error) {
      return handleObservationError(c, error);
    }
  });

  return app;
}

function serviceError(
  c: { json: (data: ErrorResponse, status?: number) => Response },
  error: ErrorResponse["error"],
  status = 500,
) {
  return c.json({ success: false, error }, status);
}

function handleObservationError(
  c: { json: (data: ErrorResponse, status?: number) => Response },
  error: unknown,
) {
  if (error instanceof ObservationError) {
    const status = error.code === "TIMEOUT" ? 504 : 502;
    return serviceError(c, error.code, status);
  }

  console.error("Unhandled observation error:", error);
  return serviceError(c, "EXTRACTION_FAILED", 500);
}
