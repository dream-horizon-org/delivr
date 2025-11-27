// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as crypto from "crypto";

// Using memcached library for Node.js
const Memcached = require('memcached');

export interface CacheableResponse {
  statusCode: number;
  body: any;
}

/**
 * Minimal Memcached Manager for updateCheck API caching only
 * Replaces Redis for updateCheck API responses
 */
export class MemcachedManager {
  private client: any;
  private setupPromise: Promise<void>;
  private keyPrefix: string;

  constructor() {
    const memcachedServers = process.env.MEMCACHED_SERVERS || 'localhost:11211';
    this.keyPrefix = process.env.MEMCACHED_KEY_PREFIX || 'codepush:';
    
    // Initialize Memcached client
    this.client = new Memcached(memcachedServers, {
      timeout: parseInt(process.env.MEMCACHED_TIMEOUT || '5000'),
      retries: parseInt(process.env.MEMCACHED_RETRIES || '3'),
      retry: parseInt(process.env.MEMCACHED_RETRY_DELAY || '1000'),
      failures: parseInt(process.env.MEMCACHED_MAX_FAILURES || '5'),
      keyCompression: false,
      maxKeySize: 250, // Memcached limit
      maxValue: 1048576 // 1MB limit
    });

    this.setupPromise = this.setup();
  }

  private async setup(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Test connection
      this.client.version((err: any, version: any) => {
        if (err) {
          console.warn('Memcached connection failed, will operate without cache:', err.message);
          resolve(); // Don't fail, just operate without cache
        } else {
          console.log('✅ Memcached connected successfully, version:', version);
          resolve();
        }
      });
    });
  }

  /**
   * Health check for Memcached connectivity
   */
  public async checkHealth(): Promise<void> {
    return this.setupPromise;
  }

  /**
   * Get cached response for updateCheck API
   */
  public async getCachedResponse(deploymentKey: string, urlKey: string): Promise<CacheableResponse | null> {
    await this.setupPromise;
    
    return new Promise((resolve) => {
      const key = this.createKey('cache', this.getDeploymentKeyHash(deploymentKey), this.hashString(urlKey, 16));
      
      this.client.get(key, (err: any, data: any) => {
        if (err || !data) {
          resolve(null);
          return;
        }

        try {
          resolve(JSON.parse(data));
        } catch (parseErr) {
          console.error('Failed to parse cached response:', parseErr);
          resolve(null);
        }
      });
    });
  }

  /**
   * Set cached response for updateCheck API
   */
  public async setCachedResponse(deploymentKey: string, urlKey: string, response: CacheableResponse, ttlSeconds?: number): Promise<void> {
    await this.setupPromise;
    
    const ttl = ttlSeconds || parseInt(process.env.CACHE_TTL_SECONDS || '3600'); // 1 hour default
    const key = this.createKey('cache', this.getDeploymentKeyHash(deploymentKey), this.hashString(urlKey, 16));
    const data = JSON.stringify(response);
    
    return new Promise((resolve) => {
      this.client.set(key, data, ttl, (err: any) => {
        if (err) {
          console.error('Failed to set cache:', err);
        }
        resolve(); // Don't fail the request if cache set fails
      });
    });
  }

  // ===== UTILITY METHODS =====

  private createKey(...parts: string[]): string {
    return this.keyPrefix + parts.filter(p => p).join(':');
  }

  /**
   * Get deployment key hash for consistent key generation
   */
  private getDeploymentKeyHash(deploymentKey: string): string {
    return crypto.createHash('sha256').update(deploymentKey).digest('hex').substring(0, 16);
  }

  /**
   * Hash any string to specified length
   */
  private hashString(input: string, length: number = 8): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, length);
  }
}