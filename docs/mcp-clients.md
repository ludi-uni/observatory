# MCP client setup

The repository Compose setup is the source of truth. Start the backend with `docker compose up -d`, then use the MCP profile with a stdio client:

```json
{
  "mcpServers": {
    "observatory": {
      "command": "docker",
      "args": [
        "compose",
        "-f",
        "D:/path/to/observatory/docker-compose.yml",
        "--profile",
        "mcp",
        "run",
        "--rm",
        "-i",
        "mcp-server"
      ]
    }
  }
}
```

Replace the path with an absolute path on the client machine. This JSON shape can be used in Cursor, Claude Desktop, Cline, Roo Code, Open WebUI, and LM Studio where stdio MCP servers are supported. Configure `API_KEY` in `.env`; the Compose MCP container receives it as `OBSERVATION_API_KEY`.

For a future standalone npm launch, the planned command is `npx @ludi-uni/observatory-mcp` with `OBSERVATION_SERVICE_URL` and `OBSERVATION_API_KEY`.
