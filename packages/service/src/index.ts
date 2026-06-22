#!/usr/bin/env node
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createObservationEngine } from "./bootstrap.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const engine = await createObservationEngine(config);
const app = createApp(config, engine);

const shutdown = async () => {
  await engine.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.error(`Observation Service listening on http://localhost:${info.port}`);
    console.error(
      `Mode: storage=${config.databaseUrl ? "postgres" : "memory"}, search=${config.searxngUrl ? "searxng" : "disabled"}, fetch=${config.usePlaywright ? "playwright" : "http"}`,
    );
  },
);
