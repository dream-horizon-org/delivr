// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/no-unused-vars */
import { S3, SecretsManager } from "aws-sdk"; // Amazon S3
import { Response } from "express";
import * as api from "./api";
import { fileUploadMiddleware, initializeFileUploadManager } from "./file-upload-manager";
import { MemcachedManager } from "./memcached-manager";
import { RedisManager } from "./redis-manager";
import { JsonStorage } from "./storage/json-storage";
import { Storage } from "./storage/storage";
import { initializeStorage } from "./storage/storage-instance";
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "<your-s3-bucket-name>";
const RDS_DB_INSTANCE_IDENTIFIER = process.env.RDS_DB_INSTANCE_IDENTIFIER || "<your-rds-instance>";
const SECRETS_MANAGER_SECRET_ID = process.env.SECRETS_MANAGER_SECRET_ID || "<your-secret-id>";

const s3 = new S3(); // Create an S3 instance
const secretsManager = new SecretsManager(); // Secrets Manager instance for fetching credentials

import * as bodyParser from "body-parser";
import * as express from "express";
import { S3Storage } from "./storage/aws-storage";
import { createWorkflowPollingRoutes } from "./routes/workflow-polling.routes";
import { createCronWebhookRoutes } from "~routes/release/cron-webhook.routes";
import { createStoreProductionStateRoute } from "./routes/store-integrations";
const domain = require("express-domain-middleware");
const csrf = require('lusca').csrf;

interface Secret {
  id: string;
  value: string;
}

function bodyParserErrorHandler(err: any, req: express.Request, res: express.Response, next: Function): void {
  if (err) {
    if (err.message === "invalid json" || (err.name === "SyntaxError" && ~err.stack.indexOf("body-parser"))) {
      req.body = null;
      next();
    } else {
      next(err);
    }
  } else {
    next();
  }
}

export function start(done: (err?: any, server?: express.Express, storage?: Storage) => void, useJsonStorage: boolean=false): void {
  let storage: Storage;
  let isSecretsManagerConfigured: boolean;
  let secretValue: any;

  Promise.resolve(<void>(null))
    .then(async () => {
      if (!useJsonStorage) {
        //storage = new JsonStorage();
        const s3Storage = new S3Storage();
        storage = s3Storage;
        
        // Wait for S3Storage async initialization to complete before using services
        // This ensures all repositories and services (SCM, CI/CD, Slack, Test Management)
        // are fully initialized before routes are mounted
        await s3Storage.setupPromise;
        console.log('[Storage] S3Storage setup completed');
      } else {
        storage = new JsonStorage();
      }
      
      // Initialize storage singleton for global access
      initializeStorage(storage);
      console.log('[Storage] Storage singleton initialized');
      
      // Wait for storage setup to complete (especially for S3Storage services)
      console.log('[Storage] Waiting for storage setup to complete...');
      await storage.checkHealth();
      console.log('[Storage] Storage setup completed successfully');

      // Initialize file upload manager (multer) at server startup
      initializeFileUploadManager();
    })
    .then(() => {
      const app = express();
      // Trust a specific number of proxy hops (safer than boolean true).
      // Configure via TRUST_PROXY_HOPS; default to 1 when sitting behind a single proxy/ELB.
      const trustProxyHops = parseInt(process.env.TRUST_PROXY_HOPS || "1", 10);
      app.set("trust proxy", trustProxyHops);
      console.log(`Trust proxy hops: ${trustProxyHops}`);
      const auth = api.auth({ storage: storage });
      const redisManager = new RedisManager();
      const memcachedManager = new MemcachedManager();

      // First, to wrap all requests and catch all exceptions.
      app.use(domain);

      // Monkey-patch res.send and res.setHeader to no-op after the first call and prevent "already sent" errors.
      app.use((req: express.Request, res: express.Response, next: (err?: any) => void): any => {
        const originalSend = res.send;
        const originalSetHeader = res.setHeader;
        // req.user = {
        //   id: "default",
        // }
        res.setHeader = (name: string, value: string | number | readonly string[]): Response => {
          if (!res.headersSent) {
            originalSetHeader.apply(res, [name, value]);
          }

          return {} as Response;
        };

        res.send = (body: any) => {
          if (res.headersSent) {
            return res;
          }

          return originalSend.apply(res, [body]);
        };

        next();
      });

      if (process.env.LOGGING) {
        app.use((req: express.Request, res: express.Response, next: (err?: any) => void): any => {
          console.log(); // Newline to mark new request
          console.log(`[REST] Received ${req.method} request at ${req.originalUrl}`);
          next();
        });
      }

      // Enforce a timeout on all requests.
      app.use(api.requestTimeoutHandler());

      // Before other middleware which may use request data that this middleware modifies.
      app.use(api.inputSanitizer());

      //app.use(csrf());

      // body-parser must be before the Application Insights router.
      app.use(bodyParser.urlencoded({ extended: true }));
      const jsonOptions: any = { limit: "10kb", strict: true };
      if (process.env.LOG_INVALID_JSON_REQUESTS === "true") {
        jsonOptions.verify = (req: express.Request, res: express.Response, buf: Buffer, encoding: string) => {
          if (buf && buf.length) {
            (<any>req).rawBody = buf.toString();
          }
        };
      }

      app.use(bodyParser.json(jsonOptions));

      // If body-parser throws an error, catch it and set the request body to null.
      app.use(bodyParserErrorHandler);

      // Before all other middleware to ensure all requests are tracked.
      // app.use(appInsights.router());

      app.get("/", (req: express.Request, res: express.Response, next: (err?: Error) => void): any => {
        res.send("Welcome to the CodePush REST API!");
      });

      app.set("etag", false);
      app.set("views", __dirname + "/views");
      app.set("view engine", "ejs");
      app.use("/auth/images/", express.static(__dirname + "/views/images"));
      app.use(api.headers({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" }));
      app.use(api.health({ storage: storage, redisManager: redisManager, memcachedManager: memcachedManager }));

      // Rate limiting removed: relying on CloudFront + WAF for request throttling

      if (process.env.DISABLE_ACQUISITION !== "true") {
        app.use(api.acquisition({ storage: storage, redisManager: redisManager, memcachedManager: memcachedManager }));
      }

      // ============================================================================
      // INTERNAL CRON ROUTES (Cronicle webhooks - NO user auth required)
      // Mount at root level BEFORE auth middleware so they only use cronicleAuthMiddleware
      // ============================================================================
      const workflowPollingRoutes = createWorkflowPollingRoutes(storage);
      app.use(workflowPollingRoutes);
      console.log('[Server] Workflow Polling routes mounted (internal, no user auth)');

      // Cronicle Webhook Routes (internal, no /api/v1 prefix)
      const cronicleRoutes = api.cronicle(storage);
      app.use(cronicleRoutes);
      console.log('[Server] Cronicle webhook routes mounted (internal, no user auth)');

      const releaseOrchestrationRoutes = createCronWebhookRoutes(storage);
      app.use(releaseOrchestrationRoutes);
      console.log('[Server] Release Orchestration routes mounted (internal, no user auth)');

      // Store Production State Route (internal, uses cronicleAuthMiddleware only)
      // Mounted with /api/v1 prefix but WITHOUT auth.authenticate middleware
      const storeProductionStateRoute = createStoreProductionStateRoute(storage);
      app.use('/api/v1', storeProductionStateRoute);
      console.log('[Server] Store production state route mounted (internal, no user auth)');

      if (process.env.DISABLE_MANAGEMENT !== "true") {
        if (process.env.DEBUG_DISABLE_AUTH === "true") {
          app.use((req, res, next) => {
            let userId: string = "default";
            if (process.env.DEBUG_USER_ID) {
              userId = process.env.DEBUG_USER_ID;
            } else {
              console.log("No DEBUG_USER_ID environment variable configured. Using 'default' as user id");
            }

            req.user = {
              id: userId,
            };

            next();
          });
          
          // Release Management Routes (releases, builds, integrations) - NO AUTH in debug mode
          // IMPORTANT: Mount BEFORE management routes since management uses fileUploadMiddleware
          // which would consume multipart bodies for ALL routes if mounted first
          app.use(api.releaseManagement({ storage: storage }));
          
          // DOTA Management Routes (deployments, apps, packages) - NO AUTH in debug mode
          app.use(fileUploadMiddleware, api.management({ storage: storage, redisManager: redisManager }));
          
          // Release Management Routes (releases, builds, integrations) - NO AUTH in debug mode

          app.use('/api/v1', api.releaseManagement({ storage: storage }));
          
          // Distribution Routes (submissions, rollout) - NO AUTH in debug mode
          app.use('/api/v1', api.distribution({ storage: storage }));
        } else {
          app.use(auth.router());
        }
        // Release Management Routes (releases, builds, integrations)
        app.use('/api/v1', auth.authenticate, api.releaseManagement({ storage: storage }));
        // Distribution Routes (submissions, rollout)
        app.use('/api/v1', auth.authenticate, api.distribution({ storage: storage }));
        // DOTA Management Routes (deployments, apps, packages)
        // to do :move the fileupload middleware to the routes that are using file upload
        app.use(auth.authenticate, fileUploadMiddleware, api.management({ storage: storage, redisManager: redisManager }));
        
      } else {
        app.use(auth.router());
      }

      done(null, app, storage);
    })
    .catch((error) => {
      console.error("Error starting server:", error);
      done(error);
    });
}
