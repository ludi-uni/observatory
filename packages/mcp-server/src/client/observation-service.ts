import {
  SERVICE_ERRORS,
  SERVICE_TO_MCP_ERROR,
  type ErrorResponse,
  type McpErrorCode,
  type ObserveRequest,
  type ObserveResponse,
  type ObserveUrlRequest,
  type ObserveUrlResponse,
  type RecallObservationResponse,
} from "@observatory/types";
import type { McpConfig } from "../config.js";

export class ObservationServiceClient {
  constructor(private readonly config: McpConfig) {}

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.serviceUrl}${path}`, {
        ...init,
        headers: {
          ...this.headers(),
          ...(init?.headers ?? {}),
        },
        signal: controller.signal,
      });

      const body = (await response.json()) as T | ErrorResponse;

      if (!response.ok) {
        if (isServiceError(body)) {
          throw new McpServiceError(mapServiceError(body.error));
        }
        throw new McpServiceError("OBSERVATION_FAILED");
      }

      if (isServiceError(body)) {
        throw new McpServiceError(mapServiceError(body.error));
      }

      return body;
    } catch (error) {
      if (error instanceof McpServiceError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new McpServiceError("TIMEOUT");
      }
      throw new McpServiceError("SERVICE_UNAVAILABLE", error);
    } finally {
      clearTimeout(timeout);
    }
  }

  observe(request: ObserveRequest): Promise<ObserveResponse> {
    return this.request<ObserveResponse>("/v1/observe", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  observeUrl(request: ObserveUrlRequest): Promise<ObserveUrlResponse> {
    return this.request<ObserveUrlResponse>("/v1/observe-url", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  recallObservation(topic: string): Promise<RecallObservationResponse> {
    const query = new URLSearchParams({ topic });
    return this.request<RecallObservationResponse>(`/v1/observation?${query}`);
  }
}

export class McpServiceError extends Error {
  constructor(
    readonly code: McpErrorCode,
    cause?: unknown,
  ) {
    super(code);
    this.name = "McpServiceError";
    if (cause) {
      this.cause = cause;
    }
  }
}

function isServiceError(body: unknown): body is ErrorResponse {
  return (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    (body as ErrorResponse).success === false &&
    "error" in body
  );
}

function mapServiceError(error: string): McpErrorCode {
  if (SERVICE_ERRORS.includes(error as (typeof SERVICE_ERRORS)[number])) {
    return SERVICE_TO_MCP_ERROR[error as (typeof SERVICE_ERRORS)[number]];
  }
  return "OBSERVATION_FAILED";
}

export function formatMcpError(code: McpErrorCode): string {
  return JSON.stringify({ success: false, error: code }, null, 2);
}
