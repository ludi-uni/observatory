import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new ObservationServiceClient(config);
  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Failed to start Observatory MCP:", error);
  process.exit(1);
});
