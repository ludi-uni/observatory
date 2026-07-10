export interface McpConfig {
  serviceUrl: string;
  apiKey?: string;
  timeoutMs: number;
  transport: "stdio" | "http";
  port: number;
  host: string;
  path: string;
}

export function loadConfig(): McpConfig {
  const serviceUrl = process.env.OBSERVATION_SERVICE_URL;
  if (!serviceUrl) {
    throw new Error("OBSERVATION_SERVICE_URL is required");
  }

  const apiKey = process.env.OBSERVATION_API_KEY || undefined;
  const timeoutMs = Number(process.env.OBSERVATION_TIMEOUT ?? "30") * 1000;
  const transport = process.env.MCP_TRANSPORT === "http" ? "http" : "stdio";
  const port = Number(process.env.MCP_PORT ?? process.env.PORT ?? "8080");
  const host = process.env.MCP_HOST ?? "0.0.0.0";
  const path = process.env.MCP_PATH ?? "/mcp";

  return {
    serviceUrl: serviceUrl.replace(/\/$/, ""),
    apiKey,
    timeoutMs,
    transport,
    port,
    host,
    path: path.startsWith("/") ? path : `/${path}`,
  };
}
