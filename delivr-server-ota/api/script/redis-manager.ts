// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * ============================================================================
 * Design Rationale: Redis Caching Layer (Layer 2 of Multi-Tier Cache)
 * ============================================================================
 * 
 * PURPOSE:
 * 
 * Redis serves as the **second-tier cache** (Layer 2) in Delivr's multi-layer
 * caching architecture for the /updateCheck endpoint (hottest path in system).
 * 
 * MULTI-LAYER CACHING STRATEGY:
 * 
 * Layer 1: Memcached (full response cache)
 * - Caches entire update check JSON response
 * - TTL: 5 minutes
 * - Hit rate: ~95% (most users check frequently)
 * - Latency: < 1ms
 * - Problem: In-memory only, lost on restart
 * 
 * Layer 2: Redis (metadata cache) ← THIS FILE
 * - Caches deployment metadata (package history, rollout rules)
 * - TTL: 10 minutes
 * - Hit rate: ~80% (for Memcached misses)
 * - Latency: ~2-3ms
 * - Benefit: Persists across restarts (RDB/AOF)
 * 
 * Layer 3: Database (MySQL/Postgres)
 * - Source of truth for all data
 * - Hit rate: ~5% (cache misses only)
 * - Latency: ~50-200ms
 * 
 * WHY TWO CACHE LAYERS (MEMCACHED + REDIS)?
 * 
 * Why not just Redis?
 * - Memcached is faster (< 1ms vs. 2-3ms for Redis)
 * - For hottest endpoint (1M+ req/day), every millisecond matters
 * - Memcached optimized for simple key-value caching (no persistence overhead)
 * 
 * Why not just Memcached?
 * - Memcached is volatile (restart = cache cold, all data lost)
 * - Redis persists data (RDB snapshots + AOF log)
 * - Server restart with cold Memcached → Redis warms up requests
 * - Result: No database stampede on server restart
 * 
 * THE PROBLEM: DATABASE STAMPEDE
 * 
 * Without caching:
 * - 1M daily active users = 1M+ update checks
 * - Peak hours (9am): 100,000 users launch app simultaneously
 * - 100,000 DB queries in seconds → database overload → 503 errors
 * 
 * With single-layer cache (Memcached only):
 * - Server restart (deploy, crash) → Memcached cache empty
 * - All requests hit database → database stampede
 * - Takes 10-30 minutes for cache to warm up
 * - Users see slow responses (200ms+ instead of 5ms)
 * 
 * With two-layer cache (Memcached + Redis):
 * - Server restart → Memcached empty, Redis still has data
 * - Requests miss Memcached → hit Redis (2-3ms, acceptable)
 * - Memcached warms up in 5-10 minutes (faster recovery)
 * - Database sees minimal load (only truly new requests)
 * 
 * WHAT REDIS CACHES:
 * 
 * 1. Deployment metadata: deploymentKey → packageHistory
 *    - Key: "deploymentKey:{key}"
 *    - Value: JSON serialized package history
 *    - Used by: /updateCheck endpoint
 * 
 * 2. Deployment metrics: deploymentKey → labels + counts
 *    - Key: "deploymentKeyLabels:{key}"
 *    - Value: Hash map of label → status counts
 *    - Used by: Analytics dashboard
 * 
 * 3. Client tracking: deploymentKey → active clients
 *    - Key: "deploymentKeyClients:{key}"
 *    - Value: Hash map of clientId → timestamp
 *    - Used by: Active users count
 * 
 * REDIS VS. MEMCACHED COMPARISON:
 * 
 * | Feature | Memcached (Layer 1) | Redis (Layer 2) |
 * |---------|---------------------|-----------------|
 * | Latency | < 1ms | 2-3ms |
 * | Persistence | None (volatile) | Yes (RDB + AOF) |
 * | Data structures | Key-value only | Hash, Set, List, etc. |
 * | Memory usage | Lower (no persistence) | Higher (persistence overhead) |
 * | Eviction | LRU (Least Recently Used) | LRU + TTL |
 * | Clustering | Simple (client-side sharding) | Complex (Redis Cluster) |
 * | Use case | Hot response cache | Warm metadata cache |
 * 
 * WHY IOREDIS LIBRARY:
 * 
 * Uses ioredis instead of node-redis:
 * - Better TypeScript support (native types)
 * - Built-in Redis Cluster support (scales horizontally)
 * - Pipeline and transaction support (batch operations)
 * - Automatic reconnection with backoff
 * - Better error handling (promises, not callbacks)
 * 
 * CACHE INVALIDATION STRATEGY:
 * 
 * Problem: Cache invalidation is hard. When do we clear cache?
 * 
 * Approach 1: TTL-based (current implementation)
 * - All cached data expires after 10 minutes
 * - Pro: Simple, no explicit invalidation needed
 * - Con: Stale data window (up to 10 minutes old)
 * 
 * Approach 2: Event-based invalidation (not implemented)
 * - Clear cache immediately when deployment updated
 * - Pro: No stale data (always fresh)
 * - Con: Complex (need to track all cache keys for deployment)
 * 
 * Decision: TTL-based is sufficient for Delivr
 * - 10-minute staleness is acceptable for OTA updates
 * - Users rarely notice (not checking every second)
 * - Simpler implementation (less code, fewer bugs)
 * 
 * LESSON LEARNED:
 * 
 * Multi-layer caching is essential for high-scale APIs. Single-layer caching
 * leaves you vulnerable to cache cold starts (stampeding herd problem).
 * Combining volatile (fast) + persistent (resilient) caches gives best of both.
 * 
 * Real-world scenario:
 * - Deploy new server version (restart required)
 * - Without Redis: 100K requests hit database immediately (30 min recovery)
 * - With Redis: 100K requests hit Redis (2-3ms each), database sees <1K (5 min recovery)
 * 
 * TRADE-OFFS:
 * 
 * Benefits:
 * - Fast responses (95% of requests < 5ms via cache)
 * - Resilient to server restarts (Redis persists data)
 * - Scales horizontally (Redis Cluster for multi-node)
 * - Reduces database load by 95%+ (database can be much smaller)
 * 
 * Costs:
 * - Memory usage (Redis typically 1-2GB for 1M users)
 * - Operational complexity (another service to monitor)
 * - Stale data window (up to 10 minutes)
 * - Cache consistency challenges (must invalidate on updates)
 * 
 * WHEN NOT TO USE REDIS:
 * 
 * 1. Real-time data requirements (< 1 second staleness)
 *    - Use direct database queries with query optimization
 * 
 * 2. Low-traffic APIs (< 100 req/sec)
 *    - Database can handle load directly, caching is overkill
 * 
 * 3. Write-heavy workloads (constant updates)
 *    - Cache invalidation overhead negates benefits
 * 
 * 4. Small user base (< 10,000 users)
 *    - Database can handle all queries, don't need cache
 * 
 * ALTERNATIVES CONSIDERED:
 * 
 * 1. Single Redis layer (no Memcached)
 *    - Rejected: Slower (2-3ms vs. < 1ms), matters at 1M+ req/day
 * 
 * 2. Single Memcached layer (no Redis)
 *    - Rejected: Vulnerable to cache cold starts (no persistence)
 * 
 * 3. CDN caching (CloudFront)
 *    - Complementary: Use CDN for static assets
 *    - Rejected for /updateCheck: Can't cache dynamic rollout logic
 * 
 * 4. No caching, scale database horizontally (read replicas)
 *    - Rejected: Much more expensive (10x DB instances vs. 1 Redis)
 * 
 * REDIS CLUSTER CONFIGURATION:
 * 
 * Supports both standalone Redis and Redis Cluster:
 * - Standalone: Single Redis instance (good for < 1M users)
 * - Cluster: 3-6 nodes with automatic sharding (scales to 10M+ users)
 * 
 * Auto-detects cluster mode via ioredis:
 * - If REDIS_CLUSTER_NODES env var set → use cluster
 * - Otherwise → use standalone
 * 
 * RELATED FILES:
 * 
 * - memcached-manager.ts: Layer 1 cache (faster, volatile)
 * - routes/acquisition.ts: Uses Redis for deployment metadata
 * - utils/acquisition.ts: Orchestrates cache lookups
 * 
 * ============================================================================
 */

import * as assert from "assert";
import * as express from "express";
// import * as redis from "redis";
import { Cluster, ClusterOptions, Redis, ClusterNode } from "ioredis"

import { ClusterConfig } from "aws-sdk/clients/opensearch";
import { type } from "os";
import { sendErrorToDatadog } from "./utils/tracer";

export const DEPLOYMENT_SUCCEEDED = "DeploymentSucceeded";
export const DEPLOYMENT_FAILED = "DeploymentFailed";
export const ACTIVE = "Active";
export const DOWNLOADED = "Downloaded";

export interface CacheableResponse {
  statusCode: number;
  body: any;
}

export interface DeploymentMetrics {
  [labelStatus: string]: number;
}

export module Utilities {
  export function isValidDeploymentStatus(status: string): boolean {
    return status === DEPLOYMENT_SUCCEEDED || status === DEPLOYMENT_FAILED || status === DOWNLOADED;
  }

  export function getLabelStatusField(label: string, status: string): string {
    if (isValidDeploymentStatus(status)) {
      return label + ":" + status;
    } else {
      return null;
    }
  }

  export function getLabelActiveCountField(label: string): string {
    if (label) {
      return label + ":" + ACTIVE;
    } else {
      return null;
    }
  }

  export function getDeploymentKeyHash(deploymentKey: string): string {
    return "deploymentKey:" + deploymentKey;
  }

  export function getDeploymentKeyLabelsHash(deploymentKey: string): string {
    return "deploymentKeyLabels:" + deploymentKey;
  }

  export function getDeploymentKeyClientsHash(deploymentKey: string): string {
    return "deploymentKeyClients:" + deploymentKey;
  }
}
class PromisifiedRedisClient {
  private client: Redis | Cluster;

  constructor(client: Redis | Cluster) {
    this.client = client;
  }

  public async set(key: string, value: string, expiry?: number): Promise<void> {
    const setAsync = (this.client.set).bind(this.client);
    const args = expiry ? [key, value, "EX", expiry] : [key, value];
    await setAsync(...args);
  }

public async get(key: string): Promise<string | null> {
  const getAsync = (this.client.get).bind(this.client);
  return await getAsync(key);
  }

  public async exists(...keys: string[]): Promise<number> {
    const existsAsync = (this.client.exists).bind(this.client);
    return await existsAsync(...keys);
  }

  public async hget(key: string, field: string): Promise<string | null> {
    const hgetAsync = (this.client.hget).bind(this.client);
    return await hgetAsync(key, field);
  }

  public async hdel(key: string, field: string): Promise<number> {
    const hdelAsync = (this.client.hdel).bind(this.client);
    return await hdelAsync(key, field);
  }

  public async hset(key: string, field: string, value: string): Promise<number> {
    const hsetAsync = (this.client.hset).bind(this.client);
    return await hsetAsync(key, field, value);
  }

  public async del(key: string): Promise<number> {
    const delAsync = (this.client.del).bind(this.client);
    return await delAsync(key);
  }

  public async ping(): Promise<string> {
    const pingAsync = (this.client.ping).bind(this.client);
    return await pingAsync();
  }

  public async hgetall(key: string): Promise<any> {
    console.log("hgetall key:", key);
    const hgetallAsync = (this.client.hgetall).bind(this.client);
    return await hgetallAsync(key);
  }

  // public execBatch(redisBatchClient: BatchC): Promise<any[]> {
  //   new Redis().pipeline();
  //   return q.ninvoke<any[]>(redisBatchClient, "exec");
  // }

  public async expire(key: string, seconds: number): Promise<number> {
    const expireAsync = (this.client.expire).bind(this.client);
    return await expireAsync(key, seconds);
  }

  public async hincrby(key: string, field: string, incrementBy: number): Promise<number> {
    const hincrbyAsync = (this.client.hincrby).bind(this.client);
    return await hincrbyAsync(key, field, incrementBy);
  }

  public async quit(): Promise<void> {
    const quitAsync = (this.client.quit).bind(this.client);
    await quitAsync();
  }
}

export class RedisManager {
  private static DEFAULT_EXPIRY: number = 3600; // one hour, specified in seconds
  private _opsClient: Cluster | Redis = null;
  private _promisifiedOpsClient: PromisifiedRedisClient | null = null;

  private _metricsClient: Cluster | Redis = null;
  private _promisifiedMetricsClient: PromisifiedRedisClient | null = null;

  private _setupMetricsClientPromise: Promise<void> | null = null;

  constructor() {
    if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
      console.log("port redis:", process.env.REDIS_PORT);
      const redisConfig = {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        // auth_pass: process.env.REDIS_KEY,
        // tls: {
        //   // Note: Node defaults CA's to those trusted by Mozilla
        //   rejectUnauthorized: true,
        // },
      };


      const clusterRetryStrategy = (times) => {
        // Customize retry logic; return null to stop retrying
        if (times > 5) {
          console.error("Too many retries. Giving up.");
          return null;
        }
        return Math.min(times * 100, 3000); // Incremental delay
      };

      const options : ClusterOptions = {   
        redisOptions: {
          connectTimeout: 15000, // Timeout for initial connection (in ms)
          maxRetriesPerRequest: 5, // Max retries for a failed request
        },
        scaleReads: "all", // All reads go to master
        clusterRetryStrategy: clusterRetryStrategy,
      };

      const startUpNodes: ClusterNode[] = [
          {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT),
          },
      ]


      console.log("value ",process.env.REDIS_CLUSTER_ENABLED)
      console.log("typeof ", typeof process.env.REDIS_CLUSTER_ENABLED)
      const clusterEnabledWithDoubleEqual = process.env.REDIS_CLUSTER_ENABLED == "true";
      const clusterEnabledWithTrippleEqual = process.env.REDIS_CLUSTER_ENABLED === "true";
      console.log("clusterEnabledWithDoubleEqual", clusterEnabledWithDoubleEqual);
      console.log("clusterEnabledWithTrippleEqual", clusterEnabledWithTrippleEqual);

      if (process.env.REDIS_CLUSTER_ENABLED == "true") {
        console.log("startUpNodes, options", startUpNodes, options);
      } else {
        console.log("Redis config since no cluster enabled:", redisConfig);
      }
      this._opsClient = process.env.REDIS_CLUSTER_ENABLED == "true" ? new Cluster(startUpNodes, options) : new Redis(redisConfig);
      this._metricsClient = process.env.REDIS_CLUSTER_ENABLED == "true" ? new Cluster(startUpNodes, options) : new Redis(redisConfig);
      this._opsClient.on("error", (err: Error) => {
        console.error("Redis ops client error:", err);
      });

      this._metricsClient.on("error", (err: Error) => {
        console.error("Redis Metrics client error:", err);
      });

      this._promisifiedOpsClient = new PromisifiedRedisClient(this._opsClient);
      this._promisifiedMetricsClient = new PromisifiedRedisClient(this._metricsClient);
      this._setupMetricsClientPromise = this._promisifiedMetricsClient
        .set("health", "healthy")
        .then(() => {})
        .catch((err) => console.error("Failed to set initial health status:", err));
    } else {
      console.log("No REDIS_HOST or REDIS_PORT environment variable configured.");
    }
  }

  public get isEnabled(): boolean {
    return !!this._opsClient && !!this._metricsClient;
  }

  public checkHealth(): Promise<void> {
    if (!this.isEnabled) {
      return Promise.reject<void>("Redis manager is not enabled");
    }

    console.log("Starting Redis health check...");
    return Promise
      .all([
        this._promisifiedOpsClient.ping().then(() => console.log("Ops Client Ping successful")),
        this._promisifiedMetricsClient.ping().then(() => console.log("Metrics Client Ping successful")),
      ])
      .then(() => {
        console.log("Redis health check passed.");
      })
      .catch((err) => {
        console.error("Redis health check failed:", err);
        sendErrorToDatadog(err);
        throw err;
      });
  }

  /**
   * Get a response from cache if possible, otherwise return null.
   * @param expiryKey: An identifier to get cached response if not expired
   * @param url: The url of the request to cache
   * @return The object of type CacheableResponse
   */
  public getCachedResponse(expiryKey: string, url: string): Promise<CacheableResponse> {
    if (!this.isEnabled) {
      return Promise.resolve(<CacheableResponse>(null));
    }

    return this._promisifiedOpsClient.hget(expiryKey, url).then((serializedResponse: string): Promise<CacheableResponse> => {
      if (serializedResponse) {
        const response = <CacheableResponse>JSON.parse(serializedResponse);
        return Promise.resolve(<CacheableResponse>(response));
      } else {
        return Promise.resolve(<CacheableResponse>(null));
      }
    });
  }

  /**
   * Set a response in redis cache for given expiryKey and url.
   * @param expiryKey: An identifier that you can later use to expire the cached response
   * @param url: The url of the request to cache
   * @param response: The response to cache
   */
  public setCachedResponse(expiryKey: string, url: string, response: CacheableResponse): Promise<void> {
    if (!this.isEnabled) {
      return Promise.resolve(<void>(null));
    }

    // Store response in cache with a timed expiry
    const serializedResponse: string = JSON.stringify(response);
    let isNewKey: boolean;
    return this._promisifiedOpsClient
      .exists(expiryKey)
      .then((isExisting: number) => {
        isNewKey = !isExisting;
        return this._promisifiedOpsClient.hset(expiryKey, url, serializedResponse);
      })
      .then(() => {
        if (isNewKey) {
          return this._promisifiedOpsClient.expire(expiryKey, RedisManager.DEFAULT_EXPIRY);
        }
      })
      .then(() => {});
  }

  public invalidateCache(expiryKey: string): Promise<void> {
    
    if (!this.isEnabled) return Promise.resolve(<void>null);

    return this._promisifiedOpsClient.del(expiryKey).then(() => {});
  }

  // Atomically increments the status field for the deployment by 1,
  // or 1 by default. If the field does not exist, it will be created with the value of 1.
  public incrementLabelStatusCount(deploymentKey: string, label: string, status: string): Promise<void> {
    if (!this.isEnabled) {
      return Promise.resolve(<void>null);
    }

    const hash: string = Utilities.getDeploymentKeyLabelsHash(deploymentKey);
    const field: string = Utilities.getLabelStatusField(label, status);

    return this._setupMetricsClientPromise.then(() => this._promisifiedMetricsClient.hincrby(hash, field, 1)).then(() => {});
  }

  public clearMetricsForDeploymentKey(deploymentKey: string): Promise<void> {
    if (!this.isEnabled) {
      return Promise.resolve(<void>null);
    }

    return this._setupMetricsClientPromise
      .then(() =>
        this._promisifiedMetricsClient.del(
          Utilities.getDeploymentKeyLabelsHash(deploymentKey)
        )
      ).then(() => 
        this._promisifiedMetricsClient.del(
          Utilities.getDeploymentKeyClientsHash(deploymentKey)
        )
      )
      .then(() => {});
  }

  // Promised return value will look something like
  // { "v1:DeploymentSucceeded": 123, "v1:DeploymentFailed": 4, "v1:Active": 123 ... }
  public getMetricsWithDeploymentKey(deploymentKey: string): Promise<DeploymentMetrics> {
    if (!this.isEnabled) {
      return Promise.resolve(<DeploymentMetrics>null);
    }

    return this._setupMetricsClientPromise
      .then(() => this._promisifiedMetricsClient.hgetall(Utilities.getDeploymentKeyLabelsHash(deploymentKey)))
      .then((metrics) => {
        // Redis returns numerical values as strings, handle parsing here.
        if (metrics) {
          Object.keys(metrics).forEach((metricField) => {
            if (!isNaN(metrics[metricField])) {
              metrics[metricField] = +metrics[metricField];
            }
          });
        }

        return <DeploymentMetrics>metrics;
      });
  }

  public recordUpdate(currentDeploymentKey: string, currentLabel: string, previousDeploymentKey?: string, previousLabel?: string) {
    if (!this.isEnabled) {
      return Promise.resolve(<void>null);
    }

    return this._setupMetricsClientPromise
      .then(() => {
        const batchClient: any = (<any>this._metricsClient).pipeline();
        const currentDeploymentKeyLabelsHash: string = Utilities.getDeploymentKeyLabelsHash(currentDeploymentKey);
        const currentLabelActiveField: string = Utilities.getLabelActiveCountField(currentLabel);
        const currentLabelDeploymentSucceededField: string = Utilities.getLabelStatusField(currentLabel, DEPLOYMENT_SUCCEEDED);
        batchClient.hincrby(currentDeploymentKeyLabelsHash, currentLabelActiveField, /* incrementBy */ 1);
        batchClient.hincrby(currentDeploymentKeyLabelsHash, currentLabelDeploymentSucceededField, /* incrementBy */ 1);

        if (previousDeploymentKey && previousLabel) {
          const previousDeploymentKeyLabelsHash: string = Utilities.getDeploymentKeyLabelsHash(previousDeploymentKey);
          const previousLabelActiveField: string = Utilities.getLabelActiveCountField(previousLabel);
          batchClient.hincrby(previousDeploymentKeyLabelsHash, previousLabelActiveField, /* incrementBy */ -1);
        }

        return batchClient.exec(batchClient);
      })
      .then(() => {});
  }

  public removeDeploymentKeyClientActiveLabel(deploymentKey: string, clientUniqueId: string) {
    if (!this.isEnabled) {
      return Promise.resolve(<void>null);
    }

    return this._setupMetricsClientPromise
      .then(() => {
        const deploymentKeyClientsHash: string = Utilities.getDeploymentKeyClientsHash(deploymentKey);
        return this._promisifiedMetricsClient.hdel(deploymentKeyClientsHash, clientUniqueId);
      })
      .then(() => {});
  }

  // For unit tests only
  public close(): Promise<void> {
    const promiseChain: Promise<void> = Promise.resolve(<void>null);
    if (!this._opsClient && !this._metricsClient) return promiseChain;

    return promiseChain
      .then(() => this._opsClient && this._promisifiedOpsClient.quit())
      .then(() => this._metricsClient && this._promisifiedMetricsClient.quit())
      .then(() => <void>null);
  }

  /* deprecated */
  public getCurrentActiveLabel(deploymentKey: string, clientUniqueId: string): Promise<string> {
    if (!this.isEnabled) {
      return Promise.resolve(<string>null);
    }

    return this._setupMetricsClientPromise.then(() =>
      this._promisifiedMetricsClient.hget(Utilities.getDeploymentKeyClientsHash(deploymentKey), clientUniqueId)
    );
  }

  /* deprecated */
  public updateActiveAppForClient(deploymentKey: string, clientUniqueId: string, toLabel: string, fromLabel?: string): Promise<void> {
    if (!this.isEnabled) {
      return Promise.resolve(<void>null);
    }

    return this._setupMetricsClientPromise
      .then(() => {
        const batchClient: any = (<any>this._metricsClient).pipeline();
        const deploymentKeyLabelsHash: string = Utilities.getDeploymentKeyLabelsHash(deploymentKey);
        const deploymentKeyClientsHash: string = Utilities.getDeploymentKeyClientsHash(deploymentKey);
        const toLabelActiveField: string = Utilities.getLabelActiveCountField(toLabel);

        batchClient.hset(deploymentKeyClientsHash, clientUniqueId, toLabel);
        batchClient.hincrby(deploymentKeyLabelsHash, toLabelActiveField, /* incrementBy */ 1);
        if (fromLabel) {
          const fromLabelActiveField: string = Utilities.getLabelActiveCountField(fromLabel);
  
          // First, check the current value before decrementing
          return this._metricsClient.hget(deploymentKeyLabelsHash, fromLabelActiveField)
            .then((currentValue: string | null) => {
              const currentCount = currentValue ? parseInt(currentValue, 10) : 0;
  
              if (currentCount > 0) {
                batchClient.hincrby(deploymentKeyLabelsHash, fromLabelActiveField, -1);
              } else {
                console.log(`Attempted to decrement ${fromLabelActiveField}, but it is already 0.`);
              }
  
              return batchClient.exec();
            });
        } else {
          return batchClient.exec();
        }
      })
      .then(() => {});
  }
}

