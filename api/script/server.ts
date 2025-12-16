// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Register module aliases for path resolution at runtime
import 'module-alias/register';

import * as express from "express";
import * as defaultServer from "./default-server";
import { sendErrorToDatadog } from "./utils/tracer";
import { initializeScheduler, shutdownScheduler } from "./services/release/cron-job/scheduler-factory";
import { getStorage } from "./storage/storage-instance";

const https = require("https");
const fs = require("fs");

defaultServer.start(function (err: Error, app: express.Express) {
  if (err) {
    sendErrorToDatadog(err);
    throw err;
  }

  const httpsEnabled: boolean = Boolean(process.env.HTTPS) || false;
  const defaultPort: number = httpsEnabled ? 8443 : 3000;

  const port: number = Number(process.env.API_PORT) || Number(process.env.PORT) || defaultPort;
  let server: any;

  if (httpsEnabled) {
    const options = {
      key: fs.readFileSync("./certs/cert.key", "utf8"),
      cert: fs.readFileSync("./certs/cert.crt", "utf8"),
    };

    server = https.createServer(options, app).listen(port, function () {
      console.log("API host listening at https://localhost:" + port);
      // Initialize scheduler after server is ready
      initializeSchedulerIfEnabled();
    });
  } else {
    server = app.listen(port, function () {
      console.log(`API listening at http://localhost:${port}`);
      // Initialize scheduler after server is ready
      initializeSchedulerIfEnabled();
    });
  }

  server.setTimeout(0);

  // Graceful shutdown handlers
  const gracefulShutdown = (signal: string) => {
    console.log(`[Server] Received ${signal}, shutting down gracefully...`);
    
    // Stop the scheduler first
    shutdownScheduler();
    
    // Close the server
    server.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('[Server] Forcefully shutting down after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
});

/**
 * Initialize scheduler if storage is available
 * Called after server starts listening
 */
async function initializeSchedulerIfEnabled(): Promise<void> {
  try {
    const storage = getStorage();
    if (storage) {
      await initializeScheduler(storage);
    } else {
      console.warn('[Server] Storage not available, scheduler not started');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Server] Failed to initialize scheduler:', errorMessage);
    // Don't crash the server if scheduler fails to start
  }
}
