export const SERVICE_ERRORS = [
  "SEARCH_FAILED",
  "FETCH_FAILED",
  "EXTRACTION_FAILED",
  "TIMEOUT",
] as const;

export type ServiceErrorCode = (typeof SERVICE_ERRORS)[number];

export const MCP_ERRORS = [
  "SERVICE_UNAVAILABLE",
  "OBSERVATION_FAILED",
  "TIMEOUT",
] as const;

export type McpErrorCode = (typeof MCP_ERRORS)[number];

export interface ErrorResponse {
  success: false;
  error: ServiceErrorCode | McpErrorCode;
}

export interface Evidence {
  source: string;
  claim: string;
}

export interface Source {
  title: string;
  url: string;
}

export interface ObserveRequest {
  topic: string;
}

export interface ObserveResponse {
  summary: string;
  confidence: number;
  sources: Source[];
  evidence: Evidence[];
  observed_at: string;
}

export interface ObserveUrlRequest {
  url: string;
}

export interface ObserveUrlResponse {
  title: string;
  summary: string;
  content: string;
  evidence: Evidence[];
  observed_at: string;
}

export interface RecallObservationRequest {
  topic: string;
}

export interface ObservationHistoryEntry {
  summary: string;
  confidence: number;
  observed_at: string;
}

export interface RecallObservationResponse {
  history: ObservationHistoryEntry[];
}

export interface HealthResponse {
  status: "ok";
}

export const SERVICE_TO_MCP_ERROR: Record<ServiceErrorCode, McpErrorCode> = {
  SEARCH_FAILED: "OBSERVATION_FAILED",
  FETCH_FAILED: "OBSERVATION_FAILED",
  EXTRACTION_FAILED: "OBSERVATION_FAILED",
  TIMEOUT: "TIMEOUT",
};
