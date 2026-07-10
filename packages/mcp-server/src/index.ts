import { randomUUID } from "node:crypto";
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import {
  formatMcpError,
  McpServiceError,
  ObservationServiceClient,
} from "./client/observation-service.js";
import { loadConfig } from "./config.js";

export function createServer(client: ObservationServiceClient): McpServer {
  const server = new McpServer({
    name: "observatory",
    version: "0.1.0",
  });

  server.registerTool(
    "observe",
    {
      description: "トピックを観測し、要約・信頼度・証拠を返す",
      inputSchema: {
        topic: z.string().min(1).describe("観測したいトピック"),
      },
    },
    async ({ topic }) => {
      try {
        const result = await client.observe({ topic });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const code = error instanceof McpServiceError ? error.code : "OBSERVATION_FAILED";
        if (!(error instanceof McpServiceError)) {
          console.error("observe failed:", error);
        }
        return {
          content: [{ type: "text", text: formatMcpError(code) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "observe_url",
    {
      description: "URL を直接観測し、タイトル・要約・本文・証拠を返す",
      inputSchema: {
        url: z.string().url().describe("観測したい URL"),
      },
    },
    async ({ url }) => {
      try {
        const result = await client.observeUrl({ url });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const code = error instanceof McpServiceError ? error.code : "OBSERVATION_FAILED";
        if (!(error instanceof McpServiceError)) {
          console.error("observe_url failed:", error);
        }
        return {
          content: [{ type: "text", text: formatMcpError(code) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "recall_observation",
    {
      description: "過去の観測履歴をトピックで検索する",
      inputSchema: {
        topic: z.string().min(1).describe("検索するトピック"),
      },
    },
    async ({ topic }) => {
      try {
        const result = await client.recallObservation(topic);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const code = error instanceof McpServiceError ? error.code : "OBSERVATION_FAILED";
        if (!(error instanceof McpServiceError)) {
          console.error("recall_observation failed:", error);
        }
        return {
          content: [{ type: "text", text: formatMcpError(code) }],
          isError: true,
        };
      }
    },
  );

  return server;
}

type HttpSession = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

export function createHttpMcpServer(config: ReturnType<typeof loadConfig>, client: ObservationServiceClient) {
  const sessions = new Map<string, HttpSession>();

  return createHttpServer(async (req, res) => {
    const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (requestUrl.pathname === "/health" && req.method === "GET") {
      json(res, 200, { status: "ok", transport: "streamable-http" });
      return;
    }

    if (requestUrl.pathname !== config.path) {
      json(res, 404, { error: "NOT_FOUND" });
      return;
    }

    if (config.apiKey && req.headers.authorization !== `Bearer ${config.apiKey}`) {
      res.setHeader("WWW-Authenticate", "Bearer");
      json(res, 401, { error: "UNAUTHORIZED" });
      return;
    }

    const requestedSessionId = req.headers["mcp-session-id"];
    const sessionId = typeof requestedSessionId === "string" ? requestedSessionId : undefined;
    let session = sessionId ? sessions.get(sessionId) : undefined;

    if (!session && req.method === "POST" && !sessionId) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
        onsessioninitialized: (initializedSessionId) => {
          sessions.set(initializedSessionId, { server, transport });
        },
      });
      const server = createServer(client);
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
      session = { server, transport };
      await server.connect(transport);
    }

    if (!session) {
      json(res, 400, { error: "MCP_SESSION_REQUIRED" });
      return;
    }

    try {
      const body = req.method === "POST" ? await readJsonBody(req) : undefined;
      await session.transport.handleRequest(req, res, body);
    } catch (error) {
      console.error("MCP HTTP request failed:", error);
      if (!res.headersSent) json(res, 500, { error: "MCP_REQUEST_FAILED" });
    }
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new ObservationServiceClient(config);

  if (config.transport === "http") {
    const httpServer = createHttpMcpServer(config, client);
    httpServer.listen(config.port, config.host, () => {
      console.error(`Observatory MCP listening on http://${config.host}:${config.port}${config.path}`);
    });
    return;
  }

  const server = createServer(client);
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error("Failed to start Observatory MCP:", error);
  process.exit(1);
});
