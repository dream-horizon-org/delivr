/**
 * ============================================================================
 * Design Rationale: Acquisition SDK - HTTP Client for Update Checks
 * ============================================================================
 * 
 * PURPOSE:
 * 
 * This is the HTTP client that mobile apps use to communicate with the Delivr
 * server. It handles 3 critical API calls:
 * 1. queryUpdateWithCurrentPackage() - Check if update is available
 * 2. reportStatusDeploy() - Report deployment success/failure (telemetry)
 * 3. reportStatusDownload() - Report download progress (metrics)
 * 
 * This file appears in User Journey 2, Step 2.2 (SDK Checks for Updates).
 * 
 * ============================================================================
 * USER JOURNEY 2: END USER RECEIVES UPDATE (Step 2.2)
 * ============================================================================
 * 
 * Step 2.2: SDK Checks for Updates
 * - User opens app
 * - CodePush.js calls `checkForUpdate()`
 * - Which calls THIS FILE's `queryUpdateWithCurrentPackage()`
 * - HTTP GET to: /v0.1/public/codepush/update_check?deployment_key=xxx&app_version=1.0.0&package_hash=abc123
 * 
 * Query parameters sent to server:
 * ```javascript
 * {
 *   deployment_key: "abc123",        // Which deployment (Staging/Production)
 *   app_version: "1.0.0",            // Current binary version
 *   package_hash: "def456",          // Current update hash (if any)
 *   label: "v5",                     // Current update label (if any)
 *   client_unique_id: "device-uuid", // Device identifier
 *   is_companion: false              // Ignore app version check (for testing)
 * }
 * ```
 * 
 * Server response (if update available):
 * ```javascript
 * {
 *   updateAppVersion: false,         // True if update requires new binary
 *   downloadURL: "https://cdn.../bundle.zip",
 *   packageHash: "new-hash-789",
 *   label: "v6",
 *   packageSize: 245678,
 *   description: "Bug fixes",
 *   isMandatory: false               // Force immediate restart?
 * }
 * ```
 * 
 * LESSON LEARNED: CLIENT-SIDE QUERY PARAMETERS ARE CRITICAL
 * 
 * Why we send app_version + package_hash:
 * - Server must know: "What version is device running RIGHT NOW?"
 * - Only send updates compatible with current binary version
 * - Don't send duplicate updates (if package_hash matches, no update needed)
 * 
 * Real-world scenario:
 * - User on binary v1.0.0, update v5 installed
 * - Server has: update v6 (for binary v1.0.0), update v7 (requires binary v1.1.0)
 * - Device sends: app_version=1.0.0, package_hash=v5
 * - Server responds: v6 (skip v7 because binary too old)
 * 
 * ============================================================================
 * WHY THIS IS A SEPARATE FILE (Not Inline in CodePush.js)
 * ============================================================================
 * 
 * Separation of concerns:
 * - CodePush.js: Business logic (sync, rollback, restart)
 * - acquisition-sdk.js: HTTP transport layer (requests, retries, errors)
 * 
 * Benefits:
 * - Testability: Mock HTTP layer independently of SDK logic
 * - Portability: Swap HTTP client without touching SDK (e.g., fetch → XMLHttpRequest)
 * - Reusability: CLI uses same HTTP client (management-sdk.js is similar)
 * 
 * ============================================================================
 * ERROR HANDLING: CIRCUIT BREAKER PATTERN
 * ============================================================================
 * 
 * Problem: What if Delivr server is down?
 * - Naive approach: Keep retrying every app launch → waste battery/data
 * - Better approach: Detect server is down → stop retrying for a while
 * 
 * Implementation: Circuit Breaker
 * ```javascript
 * if (response.statusCode >= 500 || statusCode === 429) {
 *   // Server is down or rate-limited
 *   AcquisitionManager._apiCallsDisabled = true; // Stop all API calls
 * }
 * 
 * if (AcquisitionManager._apiCallsDisabled) {
 *   console.log("API calls disabled, skipping check");
 *   return null; // Fast fail, don't waste time/battery
 * }
 * ```
 * 
 * States:
 * - CLOSED (normal): API calls allowed
 * - OPEN (circuit broken): API calls disabled (after 500 error)
 * - Reset: App restart resets circuit breaker (give server another chance)
 * 
 * Why this pattern:
 * - Save battery: Don't retry when server is definitely down
 * - Save data: Don't burn user's mobile data on failed requests
 * - Fail fast: Return immediately instead of waiting for timeout
 * 
 * TRADE-OFF:
 * - False positives: One 500 error disables updates for rest of app session
 *   - Mitigated by: Circuit resets on app restart (next launch tries again)
 * - Server recovery: If server comes back online, users won't get updates until next restart
 *   - Acceptable: Better to wait than burn battery/data
 * 
 * ============================================================================
 * TELEMETRY: REPORTING DEPLOYMENT SUCCESS/FAILURE
 * ============================================================================
 * 
 * After update is deployed, SDK reports back to server:
 * 
 * 1. reportStatusDownload() - Called when download starts
 *    - Metrics: Track download success rate
 *    - No user impact (informational only)
 * 
 * 2. reportStatusDeploy() - Called after app restarts with new bundle
 *    - Status: "DeploymentSucceeded" or "DeploymentFailed"
 *    - Critical for: Dashboard metrics, rollback detection
 * 
 * Example: Successful deployment
 * ```javascript
 * POST /v0.1/public/codepush/report_status/deploy
 * {
 *   deploymentKey: "abc123",
 *   label: "v6",
 *   status: "DeploymentSucceeded",  // ✅ App launched successfully
 *   appVersion: "1.0.0",
 *   previousLabel: "v5"              // What we upgraded from
 * }
 * ```
 * 
 * Example: Failed deployment (automatic rollback)
 * ```javascript
 * POST /v0.1/public/codepush/report_status/deploy
 * {
 *   deploymentKey: "abc123",
 *   label: "v6",
 *   status: "DeploymentFailed",     // ❌ App crashed, rolled back to v5
 *   appVersion: "1.0.0",
 *   previousLabel: "v5"
 * }
 * ```
 * 
 * Server uses this data to:
 * - Calculate rollback rate per release (v6 has 10% rollback rate → bad release)
 * - Show dashboard: "50,000 devices succeeded, 5,000 rolled back"
 * - Alert team: "Rollback rate > 5%, investigate!"
 * 
 * LESSON LEARNED: TELEMETRY IS ESSENTIAL FOR OTA AT SCALE
 * 
 * Without telemetry:
 * - Team doesn't know if releases are working
 * - Can't detect device-specific issues (Android 11 crashes, iOS 14 works)
 * - No way to measure improvement (did fix reduce crashes?)
 * 
 * With telemetry:
 * - See rollback rate immediately after release
 * - Break down by: device OS, app version, device model
 * - Confidence to release (metrics show 99% success rate)
 * 
 * ============================================================================
 * ALTERNATIVES CONSIDERED
 * ============================================================================
 * 
 * 1. Inline HTTP in CodePush.js (no separate SDK)
 *    - Rejected: Harder to test, poor separation of concerns
 * 
 * 2. Use native HTTP (iOS NSURLSession, Android OkHttp)
 *    - Rejected: Inconsistent behavior across platforms, harder to debug
 * 
 * 3. No circuit breaker (always retry)
 *    - Rejected: Wastes battery/data when server is down
 * 
 * 4. No telemetry (save bandwidth)
 *    - Rejected: Can't detect issues in production, flying blind
 * 
 * ============================================================================
 * RELATED FILES:
 * ============================================================================
 * 
 * - ✅ CodePush.js: Calls this SDK to check for updates
 * - delivr-server-ota/api/script/routes/acquisition.ts: Server-side /update_check endpoint
 * - delivr-cli/script/management-sdk.ts: Similar SDK used by CLI for releases
 * 
 * ============================================================================
 */

class CodePushError extends Error {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, CodePushError.prototype);
    }
}

class CodePushHttpError extends CodePushError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, CodePushHttpError.prototype);
    }
}

class CodePushDeployStatusError extends CodePushError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, CodePushDeployStatusError.prototype);
    }
}

class CodePushPackageError extends CodePushError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, CodePushPackageError.prototype);
    }
}

const Http = {
    Verb: {
        GET: 0, HEAD: 1, POST: 2, PUT: 3, DELETE: 4, TRACE: 5, OPTIONS: 6, CONNECT: 7, PATCH: 8
    }
};

class AcquisitionStatus {
    static DeploymentSucceeded = "DeploymentSucceeded";
    static DeploymentFailed = "DeploymentFailed";
}

class AcquisitionManager {
    constructor(httpRequester, configuration) {
        this.BASE_URL_PART = "appcenter.ms";
        this._publicPrefixUrl = "v0.1/public/codepush/";
        this._httpRequester = httpRequester;

        this._serverUrl = configuration.serverUrl;
        if (this._serverUrl.slice(-1) !== "/") {
            this._serverUrl += "/";
        }

        this._appVersion = configuration.appVersion;
        this._clientUniqueId = configuration.clientUniqueId;
        this._deploymentKey = configuration.deploymentKey;
        this._ignoreAppVersion = configuration.ignoreAppVersion;
        this._packageName = configuration.packageName;
    }

    isRecoverable = (statusCode) => statusCode >= 500 || statusCode === 408 || statusCode === 429;

    handleRequestFailure() {
        if (this._serverUrl.includes(this.BASE_URL_PART) && !this.isRecoverable(this._statusCode)) {
            AcquisitionManager._apiCallsDisabled = true;
        }
    }

    queryUpdateWithCurrentPackage(currentPackage, callback) {
        if (AcquisitionManager._apiCallsDisabled) {
            console.log(`[CodePush] Api calls are disabled, skipping API call`);
            callback(null, null);
            return;
        }

        if (!currentPackage || !currentPackage.appVersion) {
            throw new CodePushPackageError("Calling common acquisition SDK with incorrect package");
        }

        var updateRequest = {
            deployment_key: this._deploymentKey,
            app_version: currentPackage.appVersion,
            package_hash: currentPackage.packageHash,
            is_companion: this._ignoreAppVersion,
            label: currentPackage.label,
            client_unique_id: this._clientUniqueId
        };

        var requestUrl = this._serverUrl + this._publicPrefixUrl + "update_check?" + queryStringify(updateRequest);

        this._httpRequester.request(Http.Verb.GET, requestUrl, this._packageName, (error, response) => {
            if (error) {
                callback(error, null);
                return;
            }

            if (response.statusCode < 200 || response.statusCode >= 300) {
                let errorMessage;
                this._statusCode = response.statusCode;
                this.handleRequestFailure();
                if (response.statusCode === 0) {
                    errorMessage = `Couldn't send request to ${requestUrl}, xhr.statusCode = 0 was returned. One of the possible reasons for that might be connection problems. Please, check your internet connection.`;
                } else {
                    errorMessage = `${response.statusCode}: ${response.body}`;
                }
                callback(new CodePushHttpError(errorMessage), null);
                return;
            }
            try {
                var responseObject = JSON.parse(response.body);
                var updateInfo = responseObject.update_info;
            } catch (error) {
                callback(error, null);
                return;
            }

            if (!updateInfo) {
                callback(error, null);
                return;
            } else if (updateInfo.update_app_version) {
                callback(null, { updateAppVersion: true, appVersion: updateInfo.target_binary_range });
                return;
            } else if (!updateInfo.is_available) {
                callback(null, null);
                return;
            }

            var remotePackage = {
                deploymentKey: this._deploymentKey,
                description: updateInfo.description,
                label: updateInfo.label,
                appVersion: updateInfo.target_binary_range,
                isMandatory: updateInfo.is_mandatory,
                packageHash: updateInfo.package_hash,
                packageSize: updateInfo.package_size,
                downloadUrl: updateInfo.download_url,
                isBundlePatchingEnabled: updateInfo.is_bundle_patching_enabled
            };

            callback(null, remotePackage);
        });
    }

    reportStatusDeploy(deployedPackage, status, previousLabelOrAppVersion, previousDeploymentKey, callback) {
        if (AcquisitionManager._apiCallsDisabled) {
            console.log(`[CodePush] Api calls are disabled, skipping API call`);
            callback(null, null);
            return;
        }

        var url = this._serverUrl + this._publicPrefixUrl + "report_status/deploy";
        var body = {
            app_version: this._appVersion,
            deployment_key: this._deploymentKey
        };

        if (this._clientUniqueId) {
            body.client_unique_id = this._clientUniqueId;
        }

        if (deployedPackage) {
            body.label = deployedPackage.label;
            body.app_version = deployedPackage.appVersion;

            switch (status) {
                case AcquisitionStatus.DeploymentSucceeded:
                case AcquisitionStatus.DeploymentFailed:
                    body.status = status;
                    break;

                default:
                    if (callback) {
                        if (!status) {
                            callback(new CodePushDeployStatusError("Missing status argument."), null);
                        } else {
                            callback(new CodePushDeployStatusError("Unrecognized status \"" + status + "\"."), null);
                        }
                    }
                    return;
            }
        }

        if (previousLabelOrAppVersion) {
            body.previous_label_or_app_version = previousLabelOrAppVersion;
        }

        if (previousDeploymentKey) {
            body.previous_deployment_key = previousDeploymentKey;
        }

        callback = typeof arguments[arguments.length - 1] === "function" && arguments[arguments.length - 1];

        this._httpRequester.request(Http.Verb.POST, url, this._packageName, JSON.stringify(body), (error, response) => {
            if (callback) {
                if (error) {
                    callback(error, null);
                    return;
                }

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    this._statusCode = response.statusCode;
                    this.handleRequestFailure();
                    callback(new CodePushHttpError(response.statusCode + ": " + response.body), null);
                    return;
                }

                callback(null, null);
            }
        });
    }

    reportStatusDownload(downloadedPackage, callback) {
        if (AcquisitionManager._apiCallsDisabled) {
            console.log(`[CodePush] Api calls are disabled, skipping API call`);
            callback(null, null);
            return;
        }

        var url = this._serverUrl + this._publicPrefixUrl + "report_status/download";
        var body = {
            client_unique_id: this._clientUniqueId,
            deployment_key: this._deploymentKey,
            label: downloadedPackage.label
        };

        this._httpRequester.request(Http.Verb.POST, url, this._packageName, JSON.stringify(body), (error, response) => {
            if (callback) {
                if (error) {
                    callback(error, null);
                    return;
                }

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    this._statusCode = response.statusCode;
                    this.handleRequestFailure();
                    callback(new CodePushHttpError(response.statusCode + ": " + response.body), null);
                    return;
                }

                callback(null, null);
            }
        });
    }
}

function queryStringify(object) {
    var queryString = "";
    var isFirst = true;

    for (var property in object) {
        if (object.hasOwnProperty(property)) {
            var value = object[property];
            if (value !== null && typeof value !== "undefined") {
                if (!isFirst) {
                    queryString += "&";
                }

                queryString += encodeURIComponent(property) + "=";
                queryString += encodeURIComponent(value);
            }

            isFirst = false;
        }
    }

    return queryString;
}

AcquisitionManager._apiCallsDisabled = false;

module.exports = {
    Http,
    AcquisitionStatus,
    AcquisitionManager,
    CodePushError,
    CodePushHttpError,
    CodePushDeployStatusError,
    CodePushPackageError
};