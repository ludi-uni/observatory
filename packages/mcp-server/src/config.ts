export interface McpConfig {
  serviceUrl: string;
  apiKey?: string;
  timeoutMs: number;
}

export function loadConfig(): McpConfig {
  const serviceUrl = process.env.OBSERVATION_SERVICE_URL;
  if (!serviceUrl) {
    throw new Error("OBSERVATION_SERVICE_URL is required");
  }

  const apiKey = process.env.OBSERVATION_API_KEY || undefined;
  const timeoutMs = Number(process.env.OBSERVATION_TIMEOUT ?? "30") * 1000;

  return {
    serviceUrl: serviceUrl.replace(/\/$/, ""),
    apiKey,
    timeoutMs,
  };
}
