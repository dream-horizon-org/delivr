// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * ============================================================================
 * Design Rationale: Server Initialization and Middleware Stack
 * ============================================================================
 * 
 * PURPOSE:
 * 
 * This module initializes the Express server and configures the middleware
 * pipeline for Delivr's backend API. Middleware order is CRITICAL for
 * security, performance, and correctness.
 * 
 * MIDDLEWARE ORDER (AND WHY IT MATTERS):
 * 
 * 1. Domain Middleware (first)
 *    - Why: Catches ALL exceptions, even from other middleware
 *    - Must be first to wrap entire request lifecycle
 * 
 * 2. Response Monkey-Patching (second)
 *    - Why: Prevents "Can't set headers after they are sent" crashes
 *    - Edge case: Multiple error handlers try to send responses
 * 
 * 3. Request Timeout Handler (early)
 *    - Why: Enforces timeouts before expensive middleware runs
 *    - Default: 30 seconds to prevent hung connections
 * 
 * 4. Input Sanitizer (before body parsing)
 *    - Why: Sanitizes query params/headers before they're used
 *    - Security: Prevents injection attacks via query strings
 * 
 * 5. Body Parser (middle)
 *    - Why: Parses JSON/form data BEFORE routes need it
 *    - Note: 10KB limit to prevent DoS via large payloads
 * 
 * 6. CORS Headers (before routes)
 *    - Why: Browsers check CORS before making cross-origin requests
 *    - Allows web dashboard at different origin to call API
 * 
 * 7. Health Check (before auth)
 *    - Why: Load balancers need to check health without authentication
 *    - Path: /health (no auth required)
 * 
 * 8. Acquisition Routes (before auth)
 *    - Why: Mobile apps call /updateCheck on every launch (high scale)
 *    - Auth: deploymentKey in query string, not OAuth (mobile can't do OAuth)
 * 
 * 9. Authentication Middleware (before management)
 *    - Why: Management routes require user identity (create apps, deploy releases)
 *    - OAuth provider: Google, GitHub, Microsoft
 * 
 * 10. Management Routes (last)
 *     - Why: Require authenticated user from previous middleware
 *     - Paths: /apps, /deployments, /releases
 * 
 * KEY DESIGN DECISIONS:
 * 
 * 1. Trust Proxy Configuration
 *    - Why: Delivr runs behind load balancers (ELB, CloudFront, ALB)
 *    - Must trust X-Forwarded-For headers to get real client IP
 *    - Configurable via TRUST_PROXY_HOPS (default: 1 hop)
 *    - Risk: Trusting too many hops allows IP spoofing
 * 
 * 2. Rate Limiting Removed
 *    - Original: express-rate-limit middleware in application
 *    - Current: Relies on CloudFront + AWS WAF for throttling
 *    - Why: Rate limiting at CDN layer is more effective and scalable
 *    - Trade-off: Less fine-grained control, but better performance
 * 
 * 3. CSRF Protection Disabled (Commented Out)
 *    - Original: lusca.csrf() middleware enabled
 *    - Current: Disabled for API server (not a traditional web app)
 *    - Why: Mobile apps can't handle CSRF tokens, API uses bearer tokens instead
 *    - Note: Web dashboard handles CSRF separately
 * 
 * 4. Optional Acquisition/Management Routes
 *    - Can disable via DISABLE_ACQUISITION or DISABLE_MANAGEMENT env vars
 *    - Why: Allows testing, maintenance, or dedicated server roles
 *    - Example: Dedicated acquisition server (no management routes)
 * 
 * 5. Debug Auth Bypass
 *    - When DEBUG_DISABLE_AUTH=true, skips OAuth authentication
 *    - Why: Local development without OAuth provider setup
 *    - Risk: NEVER enable in production (security bypass)
 * 
 * STORAGE BACKEND SELECTION:
 * 
 * - useJsonStorage flag determines storage implementation
 * - Production: S3Storage (AWS S3 + MySQL)
 * - Development/Testing: JsonStorage (local files)
 * - Future: Could add Azure, GCP, or other storage backends
 * 
 * ERROR HANDLING STRATEGY:
 * 
 * - Domain middleware catches sync + async errors
 * - Monkey-patched res.send prevents double-send errors
 * - Body parser errors are caught and set req.body = null (fail gracefully)
 * 
 * ALTERNATIVES CONSIDERED:
 * 
 * 1. No middleware, handle everything in routes
 *    - Rejected: Duplicates logic, error-prone
 * 
 * 2. Rate limiting in application (express-rate-limit)
 *    - Rejected: CloudFront + WAF is more scalable
 * 
 * 3. CSRF tokens for API (like traditional web apps)
 *    - Rejected: Mobile apps can't handle CSRF, use bearer tokens instead
 * 
 * RELATED FILES:
 * 
 * - api.ts: Route handlers for acquisition, management, health
 * - file-upload-manager.ts: Handles multipart file uploads (for .ipa/.apk)
 * - redis-manager.ts: Redis connection pool
 * - memcached-manager.ts: Memcached connection pool
 * 
 * ============================================================================
 */

import * as api from "./api";
import { S3 } from "aws-sdk"; // Amazon S3
import { SecretsManager } from "aws-sdk";
import * as awsRDS from "aws-sdk/clients/rds";
import { AzureStorage } from "./storage/azure-storage";
import { fileUploadMiddleware } from "./file-upload-manager";
import { JsonStorage } from "./storage/json-storage";
import { RedisManager } from "./redis-manager";
import { MemcachedManager } from "./memcached-manager";
import { Storage } from "./storage/storage";
import { Response } from "express";
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "<your-s3-bucket-name>";
const RDS_DB_INSTANCE_IDENTIFIER = process.env.RDS_DB_INSTANCE_IDENTIFIER || "<your-rds-instance>";
const SECRETS_MANAGER_SECRET_ID = process.env.SECRETS_MANAGER_SECRET_ID || "<your-secret-id>";

const s3 = new S3(); // Create an S3 instance
const secretsManager = new SecretsManager(); // Secrets Manager instance for fetching credentials

import * as bodyParser from "body-parser";
const domain = require("express-domain-middleware");
import * as express from "express";
const csrf = require('lusca').csrf;
import { S3Storage } from "./storage/aws-storage";

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
        storage = new S3Storage();
      } else {
        storage = new JsonStorage();
      }
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
      app.use(api.headers({ origin: process.env.CORS_ORIGIN || "http://localhost:4000" }));
      app.use(api.health({ storage: storage, redisManager: redisManager, memcachedManager: memcachedManager }));

      // Rate limiting removed: relying on CloudFront + WAF for request throttling

      if (process.env.DISABLE_ACQUISITION !== "true") {
        app.use(api.acquisition({ storage: storage, redisManager: redisManager, memcachedManager: memcachedManager }));
      }

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
        } else {
          app.use(auth.router());
        }
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
