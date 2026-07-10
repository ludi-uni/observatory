# MCP client setup

The repository Compose setup is the source of truth. Start the resident HTTP MCP with `docker compose up -d --build` and configure an HTTP MCP client with:

```text
http://127.0.0.1:52036/mcp
```

For OCI, use the service URL on the shared Docker network, for example `http://mcp-server-http:8080/mcp`.

The existing stdio profile remains available for IDEs that do not support HTTP:

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
