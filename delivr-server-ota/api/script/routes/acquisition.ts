// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as express from "express";
import * as semver from "semver";

import * as utils from "../utils/common";
import * as acquisitionUtils from "../utils/acquisition";
import * as errorUtils from "../utils/rest-error-handling";
import * as redis from "../redis-manager";
import { MemcachedManager, CacheableResponse } from "../memcached-manager";
import * as restHeaders from "../utils/rest-headers";
import * as rolloutSelector from "../utils/rollout-selector";
import * as storageTypes from "../storage/storage";
import { UpdateCheckCacheResponse, UpdateCheckRequest, UpdateCheckResponse } from "../types/rest-definitions";
import * as validationUtils from "../utils/validation";

import * as queryString from "querystring";
import * as URL from "url";
import { sendErrorToDatadog } from "../utils/tracer";

const METRICS_BREAKING_VERSION = "1.5.2-beta";

export interface AcquisitionConfig {
  storage: storageTypes.Storage;
  redisManager: redis.RedisManager;
  memcachedManager?: MemcachedManager;
}

function getUrlKey(originalUrl: string): string {
  const obj: any = URL.parse(originalUrl, /*parseQueryString*/ true);
  delete obj.query.client_unique_id;
  
  // Sort query parameters to ensure consistent hashing
  const sortedQuery: any = {};
  Object.keys(obj.query).sort().forEach(key => {
    sortedQuery[key] = obj.query[key];
  });
  
  return obj.pathname + "?" + queryString.stringify(sortedQuery);
}

function createResponseUsingStorage(
  req: express.Request,
  res: express.Response,
  storage: storageTypes.Storage
): Promise<CacheableResponse> {
  const deploymentKey: string = String(req.query.deploymentKey || req.query.deployment_key);
  const appVersion: string = String(req.query.appVersion || req.query.app_version);
  const packageHash: string = String(req.query.packageHash || req.query.package_hash);
  const isCompanion: string = String(req.query.isCompanion || req.query.is_companion);

  const updateRequest: UpdateCheckRequest = {
    deploymentKey: deploymentKey,
    appVersion: appVersion,
    packageHash: packageHash,
    isCompanion: isCompanion && isCompanion.toLowerCase() === "true",
    label: String(req.query.label),
  };

  let originalAppVersion: string;

  // Make an exception to allow plain integer numbers e.g. "1", "2" etc.
  const isPlainIntegerNumber: boolean = /^\d+$/.test(updateRequest.appVersion);
  if (isPlainIntegerNumber) {
    originalAppVersion = updateRequest.appVersion;
    updateRequest.appVersion = originalAppVersion + ".0.0";
  }

  // Make an exception to allow missing patch versions e.g. "2.0" or "2.0-prerelease"
  const isMissingPatchVersion: boolean = /^\d+\.\d+([\+\-].*)?$/.test(updateRequest.appVersion);
  if (isMissingPatchVersion) {
    originalAppVersion = updateRequest.appVersion;
    const semverTagIndex = originalAppVersion.search(/[\+\-]/);
    if (semverTagIndex === -1) {
      updateRequest.appVersion += ".0";
    } else {
      updateRequest.appVersion = originalAppVersion.slice(0, semverTagIndex) + ".0" + originalAppVersion.slice(semverTagIndex);
    }
  }

  if (validationUtils.isValidUpdateCheckRequest(updateRequest)) {
    return storage.getPackageHistoryFromDeploymentKey(updateRequest.deploymentKey).then((packageHistory: storageTypes.Package[]) => {
      const updateObject: UpdateCheckCacheResponse = acquisitionUtils.getUpdatePackageInfo(packageHistory, updateRequest);
      if ((isMissingPatchVersion || isPlainIntegerNumber) && updateObject.originalPackage.appVersion === updateRequest.appVersion) {
        // Set the appVersion of the response to the original one with the missing patch version or plain number
        updateObject.originalPackage.appVersion = originalAppVersion;
        if (updateObject.rolloutPackage) {
          updateObject.rolloutPackage.appVersion = originalAppVersion;
        }
      }

      const cacheableResponse: CacheableResponse = {
        statusCode: 200,
        body: updateObject,
      };

      return Promise.resolve(cacheableResponse);
    });
  } else {
    if (!validationUtils.isValidKeyField(updateRequest.deploymentKey)) {
      errorUtils.sendMalformedRequestError(
        res,
        "An update check must include a valid deployment key - please check that your app has been " +
          "configured correctly. To view available deployment keys, run 'code-push-standalone deployment ls <appName> -k'."
      );
    } else if (!validationUtils.isValidAppVersionField(updateRequest.appVersion)) {
      errorUtils.sendMalformedRequestError(
        res,
        "An update check must include a binary version that conforms to the semver standard (e.g. '1.0.0'). " +
          "The binary version is normally inferred from the App Store/Play Store version configured with your app."
      );
    } else {
      errorUtils.sendMalformedRequestError(
        res,
        "An update check must include a valid deployment key and provide a semver-compliant app version."
      );
    }

    return Promise.resolve(<CacheableResponse>(null));
  }
}

export function getHealthRouter(config: AcquisitionConfig): express.Router {
  const storage: storageTypes.Storage = config.storage;
  const redisManager: redis.RedisManager = config.redisManager;
  const memcachedManager: MemcachedManager = config.memcachedManager;
  const router: express.Router = express.Router();

  router.get("/healthcheck", (req: express.Request, res: express.Response, next: (err?: any) => void): any => {
      // Either Storage OR Redis must be healthy (at least one)
      const storageOrRedis = Promise.any([
        storage.checkHealth(),
        Promise.race([
          redisManager.checkHealth(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Redis timeout after 30ms")), 30)
          )
        ])
      ]);

      const healthChecks: Promise<any>[] = [storageOrRedis];

      // Memcached health check with timeout (REQUIRED if memcachedManager exists)
      if (memcachedManager) {
        healthChecks.push(
          Promise.race([
            memcachedManager.checkHealth(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Memcached timeout after 30ms")), 30)
            )
          ])
        );
      }

      // Storage/Redis (at least one) AND Memcached (if configured) must be healthy
      Promise.all(healthChecks)
        .then(() => res.status(200).send("Healthy"))
        .catch((error: Error) => {
          errorUtils.sendUnknownError(res, error, next);
          sendErrorToDatadog(error);
        });
    }
  );

  return router;
}

export function getAcquisitionRouter(config: AcquisitionConfig): express.Router {
  const storage: storageTypes.Storage = config.storage;
  const redisManager: redis.RedisManager = config.redisManager;
  const memcachedManager: MemcachedManager = config.memcachedManager;
  const router: express.Router = express.Router();
  const REDIS_TIMEOUT = 100;
  const REDIS_TIMEOUT_MS = parseInt(process.env.REDIS_TIMEOUT) || REDIS_TIMEOUT;
  const MEMCACHED_TIMEOUT_MS = parseInt(process.env.MEMCACHED_TIMEOUT) || 100;
  const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS) || 60; // 1 minute default 

  function redisWithTimeout<T>(redisPromise: Promise<T>): Promise<T> {
    return Promise.race([
      redisPromise,
      new Promise<T>((_resolve, reject) => {
        setTimeout(() => reject(new Error("Redis request timed out. Redis might be down")), REDIS_TIMEOUT_MS);
      }),
    ]);
  }

  function memcachedWithTimeout<T>(memcachedPromise: Promise<T>): Promise<T> {
    return Promise.race([
      memcachedPromise,
      new Promise<T>((_resolve, reject) => {
        setTimeout(() => reject(new Error("Memcached request timed out. Memcached might be down")), MEMCACHED_TIMEOUT_MS);
      }),
    ]);
  }

  const updateCheck = function (newApi: boolean) {
    return function (req: express.Request, res: express.Response, next: (err?: any) => void) {
      const deploymentKey: string = String(req.query.deploymentKey || req.query.deployment_key);
      const clientUniqueId: string = String(req.query.clientUniqueId || req.query.client_unique_id);
      const url: string = getUrlKey(req.originalUrl);

      let fromCache = true;
      let cacheError: Error | null = null;

      // Use Memcached if available, otherwise skip cache entirely
      const cachePromise = memcachedManager 
        ? memcachedWithTimeout<CacheableResponse>(memcachedManager.getCachedResponse(deploymentKey, url))
        : Promise.resolve(null); // No cache if Memcached not available

      cachePromise
        .catch((error: Error) => {
          // If cache is down/slow, we store the error for logging but return null
          // so we can continue with DB lookups.
          cacheError = error;
          return null; // triggers fallback to DB
        })
        .then((cachedResponse: CacheableResponse | null) => {
          fromCache = !!cachedResponse;

          // If we got nothing from cache, we use the DB storage approach.
          return cachedResponse || createResponseUsingStorage(req, res, storage);
        })
        .then((response: CacheableResponse) => {
          if (!response) {
            // If we still have no response, something else has gone wrong.
            // Possibly return next() with an error or handle differently.
            return Promise.resolve();
          }

          const cachedResponseObject = response.body as UpdateCheckCacheResponse;
          let giveRolloutPackage = false;

          // Decide if we should serve the "rolloutPackage" or the original package
          if (cachedResponseObject.rolloutPackage && clientUniqueId) {
            const releaseSpecificString: string =
              cachedResponseObject.rolloutPackage.label ||
              cachedResponseObject.rolloutPackage.packageHash;

            giveRolloutPackage = rolloutSelector.isSelectedForRollout(
              clientUniqueId,
              cachedResponseObject.rollout,
              releaseSpecificString
            );
          }

          const updateCheckBody: { updateInfo: UpdateCheckResponse } = {
            updateInfo: giveRolloutPackage
              ? cachedResponseObject.rolloutPackage
              : cachedResponseObject.originalPackage,
          };

          // In the new API, we overwrite "target_binary_range"
          updateCheckBody.updateInfo.target_binary_range = updateCheckBody.updateInfo.appVersion;

          // Send the final response
          res.locals.fromCache = fromCache;
          res
            .status(response.statusCode)
            .send(newApi ? utils.convertObjectToSnakeCase(updateCheckBody) : updateCheckBody);

          // Update cache AFTER sending response, if we didn't have a cache hit
          if (!fromCache && memcachedManager) {
            // Only cache in Memcached for updateCheck API
            memcachedManager.setCachedResponse(deploymentKey, url, response, CACHE_TTL_SECONDS).catch((err) => {
              // Log the error, but don't block the request (which is already done).
              console.error("Failed while setting cached response in Memcached:", err);
              sendErrorToDatadog(err);
            });
          }
        })
        .then(() => {
          // If there was a cache error, log it (e.g., to Datadog) and optionally throw
          if (cacheError) {
            sendErrorToDatadog(cacheError);
            console.error("Memcached cache error:", cacheError);
          }
        })
        .catch((error: storageTypes.StorageError) => {
          // If DB storage also failed or some other error
          errorUtils.restErrorHandler(res, error, next);
        });
    };
  };


  const reportStatusDeploy = function (req: express.Request, res: express.Response, next: (err?: any) => void) {
    const deploymentKey = req.body.deploymentKey || req.body.deployment_key;
    const appVersion = req.body.appVersion || req.body.app_version;
    const previousDeploymentKey = req.body.previousDeploymentKey || req.body.previous_deployment_key || deploymentKey;
    const previousLabelOrAppVersion = req.body.previousLabelOrAppVersion || req.body.previous_label_or_app_version;
    const clientUniqueId = req.body.clientUniqueId || req.body.client_unique_id;

    if (!deploymentKey || !appVersion) {
      return errorUtils.sendMalformedRequestError(res, "A deploy status report must contain a valid appVersion and deploymentKey.");
    } else if (req.body.label) {
      if (!req.body.status) {
        return errorUtils.sendMalformedRequestError(res, "A deploy status report for a labelled package must contain a valid status.");
      } else if (!redis.Utilities.isValidDeploymentStatus(req.body.status)) {
        return errorUtils.sendMalformedRequestError(res, "Invalid status: " + req.body.status);
      }
    }

    const rawSdkVersion = restHeaders.getSdkVersion(req);
    const sdkVersion = rawSdkVersion ? rawSdkVersion.replace(/[^0-9.]/g, '') : null;
    if (semver.valid(sdkVersion) && semver.gte(sdkVersion, METRICS_BREAKING_VERSION)) {
      // If previousDeploymentKey not provided, assume it is the same deployment key.
      let redisUpdatePromise: Promise<void>;

      if (req.body.label && req.body.status === redis.DEPLOYMENT_FAILED) {
        redisUpdatePromise = 
          redisWithTimeout(redisManager.incrementLabelStatusCount(deploymentKey, req.body.label, req.body.status));
      } else {
        const labelOrAppVersion: string = req.body.label || appVersion;
        redisUpdatePromise = 
          redisWithTimeout(redisManager.recordUpdate(deploymentKey, labelOrAppVersion, previousDeploymentKey, previousLabelOrAppVersion));
      }

      redisUpdatePromise
        .then(() => {
          res.sendStatus(200);
          if (clientUniqueId) {
            // This cleanup call is fire-and-forget; errors are logged but don't affect the response.
            redisWithTimeout(
              redisManager.removeDeploymentKeyClientActiveLabel(previousDeploymentKey, clientUniqueId)
            ).catch((err) => {
              sendErrorToDatadog(err);
              console.error("Error or timeout on removeDeploymentKeyClientActiveLabel:", err);
            });
          }
        })
        .catch((error: any) => {
          errorUtils.sendUnknownError(res, error, next)
          sendErrorToDatadog(error);
        })
    } else {
      if (!clientUniqueId) {
        return errorUtils.sendMalformedRequestError(
          res,
          "A deploy status report must contain a valid appVersion, clientUniqueId and deploymentKey."
        );
      }
      redisWithTimeout(
        redisManager.getCurrentActiveLabel(deploymentKey, clientUniqueId
      ))
        .then((currentVersionLabel: string) => {
          if (req.body.label && req.body.label !== currentVersionLabel) {
            return redisWithTimeout(
              redisManager.incrementLabelStatusCount(deploymentKey, req.body.label, req.body.status)
            ).then(() => {
              if (req.body.status === redis.DEPLOYMENT_SUCCEEDED) {
                return redisWithTimeout(
                  redisManager.updateActiveAppForClient(deploymentKey, clientUniqueId, req.body.label, currentVersionLabel)
                );
              }
            });
          } else if (!req.body.label && appVersion !== currentVersionLabel) {
            return redisWithTimeout(
              redisManager.updateActiveAppForClient(deploymentKey, clientUniqueId, appVersion, appVersion)
            );
          }
        })
        .then(() => {
          res.sendStatus(200);
        })
        .catch((error: any) => {
          errorUtils.sendUnknownError(res, error, next)
          sendErrorToDatadog(error);
        })
    }
  };

  const reportStatusDownload = function (req: express.Request, res: express.Response, next: (err?: any) => void) {
    const deploymentKey = req.body.deploymentKey || req.body.deployment_key;
    if (!req.body || !deploymentKey || !req.body.label) {
      return errorUtils.sendMalformedRequestError(
        res,
        "A download status report must contain a valid deploymentKey and package label."
      );
    }
    return redisWithTimeout(redisManager
      .incrementLabelStatusCount(deploymentKey, req.body.label, redis.DOWNLOADED)
      ).then(() => {
        res.sendStatus(200);
      })
      .catch((error: any) => errorUtils.sendUnknownError(res, error, next))
  };

  router.get("/updateCheck", updateCheck(false));
  router.get("/v0.1/public/codepush/update_check", updateCheck(true));

  router.post("/reportStatus/deploy", reportStatusDeploy);
  router.post("/v0.1/public/codepush/report_status/deploy", reportStatusDeploy);

  router.post("/reportStatus/download", reportStatusDownload);
  router.post("/v0.1/public/codepush/report_status/download", reportStatusDownload);

  return router;
}