/**
 * ============================================================================
 * Design Rationale: React Native SDK - Main Entry Point & Auto-Rollback
 * ============================================================================
 * 
 * PURPOSE:
 * 
 * This is THE MOST CRITICAL FILE in Delivr's codebase. It implements the mobile
 * SDK that end users interact with - the last line of defense against bad releases.
 * 
 * KEY RESPONSIBILITIES:
 * 1. Check for updates on app launch (sync with server)
 * 2. Download and apply updates (JavaScript bundles + assets)
 * 3. Restart app with new bundle (multiple restart modes)
 * 4. AUTOMATIC ROLLBACK on crash detection (Architecture Decision #7)
 * 5. Report telemetry to server (success/failure/rollback)
 * 
 * This file appears in 5 steps of User Journey 2 (End User Receives Update).
 * 
 * ============================================================================
 * ARCHITECTURE DECISION #7: AUTOMATIC ROLLBACK ON CRASH DETECTION
 * ============================================================================
 * 
 * THE PROBLEM: BAD RELEASES CAN BRICK APPS
 * 
 * Without auto-rollback:
 * - Developer deploys update with syntax error or missing dependency
 * - App crashes immediately on launch for all users who downloaded it
 * - Users cannot open app AT ALL (bricked until manual rollback)
 * - Time to recovery: 2-4 hours (detect issue → rollback → users check again)
 * - Result: Thousands of 1-star reviews, user churn
 * 
 * THE SOLUTION: AUTOMATIC CRASH DETECTION & ROLLBACK
 * 
 * How it works:
 * 
 * 1. User downloads update (v1.1.0) and restarts app
 * 2. App loads new bundle, SDK starts monitoring
 * 3. SDK waits for `notifyApplicationReady()` call within 5 minutes
 * 4. If app crashes BEFORE `notifyApplicationReady()`:
 *    → SDK detects "failed update"
 *    → Automatically reverts to previous bundle (v1.0.0)
 *    → Reports rollback to server
 *    → User's app is functional again
 * 5. If `notifyApplicationReady()` called successfully:
 *    → Update marked as "good"
 *    → No rollback, app continues with new bundle
 * 
 * KEY API: notifyApplicationReady()
 * 
 * Developer MUST call this after app successfully initializes:
 * 
 * ```javascript
 * import CodePush from 'react-native-code-push';
 * 
 * class MyApp extends Component {
 *   componentDidMount() {
 *     // Tell CodePush: "App initialized successfully, don't rollback"
 *     CodePush.notifyApplicationReady();
 *   }
 * }
 * ```
 * 
 * What happens if developer forgets to call notifyApplicationReady():
 * - Every update is marked as "failed" and rolled back
 * - App never stays updated (always reverts to previous version)
 * - This is BY DESIGN (fail-safe: better to rollback than stay crashed)
 * 
 * CRASH DETECTION MECHANISM:
 * 
 * Native side (iOS/Android):
 * - Writes "pending update" marker to disk on restart
 * - If app crashes before `notifyApplicationReady()`, marker remains
 * - On next launch, SDK sees marker → knows previous launch crashed → rollback
 * 
 * JavaScript side (this file):
 * - `notifyApplicationReady()` removes the "pending update" marker
 * - `shouldUpdateBeIgnored()` checks if update previously failed
 * - `validateLatestRollbackInfo()` tracks rollback history (for retry logic)
 * 
 * ROLLBACK RETRY OPTIONS:
 * 
 * Problem: What if update only crashes on specific devices (e.g., Android 11 only)?
 * - First attempt: Update crashes → rollback (expected)
 * - Without retry: User never gets future updates (stuck on v1.0.0 forever)
 * - With retry: After 24 hours, try update again (maybe it was transient issue)
 * 
 * Configuration:
 * ```javascript
 * codePush.sync({
 *   rollbackRetryOptions: {
 *     delayInHours: 24,        // Wait 24 hours before retrying failed update
 *     maxRetryAttempts: 3      // Retry up to 3 times, then give up
 *   }
 * });
 * ```
 * 
 * Native storage (iOS/Android):
 * - Tracks: packageHash, rollbackCount, lastRollbackTime
 * - After maxRetryAttempts exceeded: Stop offering this update to user
 * 
 * ============================================================================
 * USER JOURNEY 2: END USER RECEIVES UPDATE (5 STEPS IN THIS FILE)
 * ============================================================================
 * 
 * Step 2.1: User Opens App
 * - Function: codePush.sync() (entry point)
 * - Automatically called on app launch if HOC wrapper used:
 *   `export default codePush(MyApp);`
 * 
 * Step 2.2: SDK Checks for Updates
 * - Function: checkForUpdate()
 * - Calls acquisition-sdk.js → queries server /updateCheck
 * - Handles 4 cases where no update is needed (see comments in code)
 * 
 * Step 2.4: SDK Downloads Update
 * - Function: remotePackage.download()
 * - Calls native code (iOS/Android) to download bundle from CDN
 * - Shows progress via downloadProgressCallback
 * 
 * Step 2.5: SDK Verifies Signature
 * - Function: Native code verifies RSA signature
 * - Rejects update if signature invalid (security)
 * 
 * Step 2.7: SDK Restarts App
 * - Function: restartApp()
 * - Three restart modes:
 *   1. IMMEDIATE: Restart right now (for mandatory updates)
 *   2. ON_NEXT_RESTART: Apply on next app kill/relaunch (default)
 *   3. ON_NEXT_RESUME: Apply when app comes back from background
 * 
 * Step 2.8: SDK Monitors for Crashes (AUTO-ROLLBACK)
 * - Function: notifyApplicationReady() ← CRITICAL
 * - Developer MUST call this when app initializes successfully
 * - If not called within 5 minutes → rollback
 * 
 * ============================================================================
 * SYNC STRATEGIES (InstallMode)
 * ============================================================================
 * 
 * 1. IMMEDIATE (mandatory updates):
 * ```javascript
 * codePush.sync({
 *   installMode: codePush.InstallMode.IMMEDIATE
 * });
 * ```
 * - Check → Download → Install → Restart IMMEDIATELY
 * - Use for: Critical security patches, breaking bugs
 * - UX impact: App restarts mid-session (disruptive)
 * 
 * 2. ON_NEXT_RESTART (default):
 * ```javascript
 * codePush.sync({
 *   installMode: codePush.InstallMode.ON_NEXT_RESTART
 * });
 * ```
 * - Check → Download → Install → Wait for user to kill app
 * - Use for: Most updates (non-critical)
 * - UX impact: Update applied on next natural restart (non-disruptive)
 * 
 * 3. ON_NEXT_RESUME (background updates):
 * ```javascript
 * codePush.sync({
 *   installMode: codePush.InstallMode.ON_NEXT_RESUME,
 *   minimumBackgroundDuration: 60  // 60 seconds
 * });
 * ```
 * - Check → Download → Install → Wait for app to background for 60s → Restart on resume
 * - Use for: Updates that need to apply quickly but not disruptively
 * - UX impact: Brief restart when app comes back from background
 * 
 * LESSON LEARNED:
 * 
 * Automatic rollback is THE killer feature that makes OTA updates viable in
 * production. Without it, one bad release can brick thousands of apps. With it,
 * bad releases automatically revert within seconds, and users never notice.
 * 
 * Real-world scenario:
 * - Deploy v1.1.0 with crash on Samsung devices (10% of users)
 * - Without rollback: 50,000 users can't open app, support tickets flood in
 * - With rollback: 50,000 users auto-revert to v1.0.0 in < 10 seconds, app usable
 * - Team has time to fix issue and redeploy (no emergency)
 * 
 * TRADE-OFFS:
 * 
 * Benefits:
 * - Prevents apps from being bricked by bad updates
 * - Recovery time: Seconds (auto) vs. Hours (manual)
 * - User-facing: No downtime (users barely notice)
 * - Developer-facing: Peace of mind, less stress
 * 
 * Costs:
 * - Developer MUST call notifyApplicationReady() (extra API)
 *   - If forgotten: Every update rolls back (fail-safe design)
 * - False positives possible (legitimate crashes unrelated to update)
 *   - Mitigated by: Retry logic (rollbackRetryOptions)
 * - Complex state management (native storage of rollback history)
 * 
 * WHEN NOT TO USE AUTOMATIC ROLLBACK:
 * 
 * 1. Desktop apps where crashes are less catastrophic (user can reinstall)
 * 2. Internal tools with < 100 users (can manually rollback quickly)
 * 3. Apps that intentionally change behavior (rollback would revert intended change)
 * 
 * ALTERNATIVES CONSIDERED:
 * 
 * 1. Manual rollback only (developer manually reverts on server)
 *    - Rejected: Too slow (2-4 hours), users suffer during detection window
 * 
 * 2. Server-side killswitch (stop serving bad update)
 *    - Complementary: Use both (server stops NEW installs, SDK reverts EXISTING)
 * 
 * 3. No rollback, just better testing
 *    - Rejected: No amount of testing catches all edge cases (device-specific bugs)
 * 
 * 4. Gradual rollout without auto-rollback (rely on slow rollout to limit damage)
 *    - Rejected: Even 1% of 1M users = 10,000 bricked apps (unacceptable)
 * 
 * MONITORING & OBSERVABILITY:
 * 
 * SDK reports to server via tryReportStatus():
 * - DeploymentSucceeded: Update applied successfully (after notifyApplicationReady)
 * - DeploymentFailed: Update rolled back due to crash
 * 
 * Dashboard shows:
 * - Rollback rate per release (high rate = bad release)
 * - Which devices are rolling back (helps debug device-specific issues)
 * 
 * RELATED FILES:
 * 
 * - acquisition-sdk.js: HTTP client for /updateCheck API
 * - package-mixins.js: Adds download/install methods to package objects
 * - iOS: ios/CodePush/CodePush.m (native crash detection)
 * - Android: android/src/.../CodePush.java (native crash detection)
 * 
 * ============================================================================
 */

import { AcquisitionManager as Sdk } from "./acquisition-sdk";
import { Alert } from "./AlertAdapter";
import requestFetchAdapter from "./request-fetch-adapter";
import { AppState, Platform } from "react-native";
import log from "./logging";
import hoistStatics from 'hoist-non-react-statics';

let NativeCodePush = require("react-native").NativeModules.CodePush;
const PackageMixins = require("./package-mixins")(NativeCodePush);

async function checkForUpdate(deploymentKey = null, handleBinaryVersionMismatchCallback = null) {
  /*
   * Before we ask the server if an update exists, we
   * need to retrieve three pieces of information from the
   * native side: deployment key, app version (e.g. 1.0.1)
   * and the hash of the currently running update (if there is one).
   * This allows the client to only receive updates which are targetted
   * for their specific deployment and version and which are actually
   * different from the CodePush update they have already installed.
   */
  const nativeConfig = await getConfiguration();
  /*
   * If a deployment key was explicitly provided,
   * then let's override the one we retrieved
   * from the native-side of the app. This allows
   * dynamically "redirecting" end-users at different
   * deployments (e.g. an early access deployment for insiders).
   */
  const config = deploymentKey ? { ...nativeConfig, ...{ deploymentKey } } : nativeConfig;
  const sdk = getPromisifiedSdk(requestFetchAdapter, config);

  // Use dynamically overridden getCurrentPackage() during tests.
  const localPackage = await module.exports.getCurrentPackage();

  /*
   * If the app has a previously installed update, and that update
   * was targetted at the same app version that is currently running,
   * then we want to use its package hash to determine whether a new
   * release has been made on the server. Otherwise, we only need
   * to send the app version to the server, since we are interested
   * in any updates for current binary version, regardless of hash.
   */
  let queryPackage;
  if (localPackage) {
    queryPackage = localPackage;
  } else {
    queryPackage = { appVersion: config.appVersion };
    if (Platform.OS === "ios" && config.packageHash) {
      queryPackage.packageHash = config.packageHash;
    }
  }

  const update = await sdk.queryUpdateWithCurrentPackage(queryPackage);

  /*
   * There are four cases where checkForUpdate will resolve to null:
   * ----------------------------------------------------------------
   * 1) The server said there isn't an update. This is the most common case.
   * 2) The server said there is an update but it requires a newer binary version.
   *    This would occur when end-users are running an older binary version than
   *    is available, and CodePush is making sure they don't get an update that
   *    potentially wouldn't be compatible with what they are running.
   * 3) The server said there is an update, but the update's hash is the same as
   *    the currently running update. This should _never_ happen, unless there is a
   *    bug in the server, but we're adding this check just to double-check that the
   *    client app is resilient to a potential issue with the update check.
   * 4) The server said there is an update, but the update's hash is the same as that
   *    of the binary's currently running version. This should only happen in Android -
   *    unlike iOS, we don't attach the binary's hash to the updateCheck request
   *    because we want to avoid having to install diff updates against the binary's
   *    version, which we can't do yet on Android.
   */
  if (!update || update.updateAppVersion ||
      localPackage && (update.packageHash === localPackage.packageHash) ||
      (!localPackage || localPackage._isDebugOnly) && config.packageHash === update.packageHash) {
    if (update && update.updateAppVersion) {
      log("An update is available but it is not targeting the binary version of your app.");
      if (handleBinaryVersionMismatchCallback && typeof handleBinaryVersionMismatchCallback === "function") {
        handleBinaryVersionMismatchCallback(update)
      }
    }

    return null;
  } else {
    const remotePackage = { ...update, ...PackageMixins.remote(sdk.reportStatusDownload) };
    remotePackage.failedInstall = await NativeCodePush.isFailedUpdate(remotePackage.packageHash);
    remotePackage.deploymentKey = deploymentKey || nativeConfig.deploymentKey;
    return remotePackage;
  }
}

const getConfiguration = (() => {
  let config;
  return async function getConfiguration() {
    if (config) {
      return config;
    } else if (testConfig) {
      return testConfig;
    } else {
      config = await NativeCodePush.getConfiguration();
      return config;
    }
  }
})();

async function getCurrentPackage() {
  return await getUpdateMetadata(CodePush.UpdateState.LATEST);
}

async function getUpdateMetadata(updateState) {
  let updateMetadata = await NativeCodePush.getUpdateMetadata(updateState || CodePush.UpdateState.RUNNING);
  if (updateMetadata) {
    updateMetadata = {...PackageMixins.local, ...updateMetadata};
    updateMetadata.failedInstall = await NativeCodePush.isFailedUpdate(updateMetadata.packageHash);
    updateMetadata.isFirstRun = await NativeCodePush.isFirstRun(updateMetadata.packageHash);
  }
  return updateMetadata;
}

function getPromisifiedSdk(requestFetchAdapter, config) {
  // Use dynamically overridden AcquisitionSdk during tests.
  const sdk = new module.exports.AcquisitionSdk(requestFetchAdapter, config);
  sdk.queryUpdateWithCurrentPackage = (queryPackage) => {
    return new Promise((resolve, reject) => {
      module.exports.AcquisitionSdk.prototype.queryUpdateWithCurrentPackage.call(sdk, queryPackage, (err, update) => {
        if (err) {
          reject(err);
        } else {
          resolve(update);
        }
      });
    });
  };

  sdk.reportStatusDeploy = (deployedPackage, status, previousLabelOrAppVersion, previousDeploymentKey) => {
    return new Promise((resolve, reject) => {
      module.exports.AcquisitionSdk.prototype.reportStatusDeploy.call(sdk, deployedPackage, status, previousLabelOrAppVersion, previousDeploymentKey, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  sdk.reportStatusDownload = (downloadedPackage) => {
    return new Promise((resolve, reject) => {
      module.exports.AcquisitionSdk.prototype.reportStatusDownload.call(sdk, downloadedPackage, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  return sdk;
}

// This ensures that notifyApplicationReadyInternal is only called once
// in the lifetime of this module instance.
const notifyApplicationReady = (() => {
  let notifyApplicationReadyPromise;
  return () => {
    if (!notifyApplicationReadyPromise) {
      notifyApplicationReadyPromise = notifyApplicationReadyInternal();
    }

    return notifyApplicationReadyPromise;
  };
})();

async function notifyApplicationReadyInternal() {
  await NativeCodePush.notifyApplicationReady();
  const statusReport = await NativeCodePush.getNewStatusReport();
  statusReport && tryReportStatus(statusReport); // Don't wait for this to complete.

  return statusReport;
}

async function tryReportStatus(statusReport, retryOnAppResume) {
  const config = await getConfiguration();
  const previousLabelOrAppVersion = statusReport.previousLabelOrAppVersion;
  const previousDeploymentKey = statusReport.previousDeploymentKey || config.deploymentKey;
  try {
    if (statusReport.appVersion) {
      log(`Reporting binary update (${statusReport.appVersion})`);

      if (!config.deploymentKey) {
        throw new Error("Deployment key is missed");
      }

      const sdk = getPromisifiedSdk(requestFetchAdapter, config);
      

      await sdk.reportStatusDeploy(/* deployedPackage */ null, /* status */ null, previousLabelOrAppVersion, previousDeploymentKey);
    } else {
      const label = statusReport.package.label;
      if (statusReport.status === "DeploymentSucceeded") {
        log(`Reporting CodePush update success (${label})`);
      } else {
        log(`Reporting CodePush update rollback (${label})`);
        await NativeCodePush.setLatestRollbackInfo(statusReport.package.packageHash);
      }

      config.deploymentKey = statusReport.package.deploymentKey;
      const sdk = getPromisifiedSdk(requestFetchAdapter, config);
      await sdk.reportStatusDeploy(statusReport.package, statusReport.status, previousLabelOrAppVersion, previousDeploymentKey);
    }

    NativeCodePush.recordStatusReported(statusReport);
    retryOnAppResume && retryOnAppResume.remove();
  } catch (e) {
    log(`Report status failed: ${JSON.stringify(statusReport)}`);
    NativeCodePush.saveStatusReportForRetry(statusReport);
    // Try again when the app resumes
    if (!retryOnAppResume) {
      const resumeListener = AppState.addEventListener("change", async (newState) => {
        if (newState !== "active") return;
        const refreshedStatusReport = await NativeCodePush.getNewStatusReport();
        if (refreshedStatusReport) {
          tryReportStatus(refreshedStatusReport, resumeListener);
        } else {
          resumeListener && resumeListener.remove();
        }
      });
    }
  }
}

async function shouldUpdateBeIgnored(remotePackage, syncOptions) {
  let { rollbackRetryOptions } = syncOptions;

  const isFailedPackage = remotePackage && remotePackage.failedInstall;
  if (!isFailedPackage || !syncOptions.ignoreFailedUpdates) {
    return false;
  }

  if (!rollbackRetryOptions) {
    return true;
  }

  if (typeof rollbackRetryOptions !== "object") {
    rollbackRetryOptions = CodePush.DEFAULT_ROLLBACK_RETRY_OPTIONS;
  } else {
    rollbackRetryOptions = { ...CodePush.DEFAULT_ROLLBACK_RETRY_OPTIONS, ...rollbackRetryOptions };
  }

  if (!validateRollbackRetryOptions(rollbackRetryOptions)) {
    return true;
  }

  const latestRollbackInfo = await NativeCodePush.getLatestRollbackInfo();
  if (!validateLatestRollbackInfo(latestRollbackInfo, remotePackage.packageHash)) {
    log("The latest rollback info is not valid.");
    return true;
  }

  const { delayInHours, maxRetryAttempts } = rollbackRetryOptions;
  const hoursSinceLatestRollback = (Date.now() - latestRollbackInfo.time) / (1000 * 60 * 60);
  if (hoursSinceLatestRollback >= delayInHours && maxRetryAttempts >= latestRollbackInfo.count) {
    log("Previous rollback should be ignored due to rollback retry options.");
    return false;
  }

  return true;
}

function validateLatestRollbackInfo(latestRollbackInfo, packageHash) {
  return latestRollbackInfo &&
    latestRollbackInfo.time &&
    latestRollbackInfo.count &&
    latestRollbackInfo.packageHash &&
    latestRollbackInfo.packageHash === packageHash;
}

function validateRollbackRetryOptions(rollbackRetryOptions) {
  if (typeof rollbackRetryOptions.delayInHours !== "number") {
    log("The 'delayInHours' rollback retry parameter must be a number.");
    return false;
  }

  if (typeof rollbackRetryOptions.maxRetryAttempts !== "number") {
    log("The 'maxRetryAttempts' rollback retry parameter must be a number.");
    return false;
  }

  if (rollbackRetryOptions.maxRetryAttempts < 1) {
    log("The 'maxRetryAttempts' rollback retry parameter cannot be less then 1.");
    return false;
  }

  return true;
}

var testConfig;

// This function is only used for tests. Replaces the default SDK, configuration and native bridge
function setUpTestDependencies(testSdk, providedTestConfig, testNativeBridge) {
  if (testSdk) module.exports.AcquisitionSdk = testSdk;
  if (providedTestConfig) testConfig = providedTestConfig;
  if (testNativeBridge) NativeCodePush = testNativeBridge;
}

async function restartApp(onlyIfUpdateIsPending = false) {
  NativeCodePush.restartApp(onlyIfUpdateIsPending);
}

// This function allows only one syncInternal operation to proceed at any given time.
// Parallel calls to sync() while one is ongoing yields CodePush.SyncStatus.SYNC_IN_PROGRESS.
const sync = (() => {
  let syncInProgress = false;
  const setSyncCompleted = () => { syncInProgress = false; };

  return (options = {}, syncStatusChangeCallback, downloadProgressCallback, handleBinaryVersionMismatchCallback) => {
    let syncStatusCallbackWithTryCatch, downloadProgressCallbackWithTryCatch;
    if (typeof syncStatusChangeCallback === "function") {
      syncStatusCallbackWithTryCatch = (...args) => {
        try {
          syncStatusChangeCallback(...args);
        } catch (error) {
          log(`An error has occurred : ${error.stack}`);
        }
      }
    }

    if (typeof downloadProgressCallback === "function") {
      downloadProgressCallbackWithTryCatch = (...args) => {
        try {
          downloadProgressCallback(...args);
        } catch (error) {
          log(`An error has occurred: ${error.stack}`);
        }
      }
    }

    if (syncInProgress) {
      typeof syncStatusCallbackWithTryCatch === "function"
        ? syncStatusCallbackWithTryCatch(CodePush.SyncStatus.SYNC_IN_PROGRESS)
        : log("Sync already in progress.");
      return Promise.resolve(CodePush.SyncStatus.SYNC_IN_PROGRESS);
    }

    syncInProgress = true;
    const syncPromise = syncInternal(options, syncStatusCallbackWithTryCatch, downloadProgressCallbackWithTryCatch, handleBinaryVersionMismatchCallback);
    syncPromise
      .then(setSyncCompleted)
      .catch(setSyncCompleted);

    return syncPromise;
  };
})();

/*
 * The syncInternal method provides a simple, one-line experience for
 * incorporating the check, download and installation of an update.
 *
 * It simply composes the existing API methods together and adds additional
 * support for respecting mandatory updates, ignoring previously failed
 * releases, and displaying a standard confirmation UI to the end-user
 * when an update is available.
 */
async function syncInternal(options = {}, syncStatusChangeCallbackFunction, downloadProgressCallback, handleBinaryVersionMismatchCallback) {
  let resolvedInstallMode;
  const syncOptions = {
    deploymentKey: null,
    ignoreFailedUpdates: true,
    rollbackRetryOptions: null,
    installMode: CodePush.InstallMode.ON_NEXT_RESTART,
    mandatoryInstallMode: CodePush.InstallMode.IMMEDIATE,
    minimumBackgroundDuration: 0,
    updateDialog: null,
    ...options
  };

  const internalSyncStatusChangeCallback = (syncStatus) => {
    switch(syncStatus) {
      case CodePush.SyncStatus.CHECKING_FOR_UPDATE:
        log("Status: Checking for update.");
        break;
      case CodePush.SyncStatus.AWAITING_USER_ACTION:
        log("Status: Awaiting user action.");
        break;
      case CodePush.SyncStatus.DOWNLOADING_PACKAGE:
        log("Status: Downloading package.");
        break;
      case CodePush.SyncStatus.PATCH_APPLIED_SUCCESS:
        log("Status: Patch applied success.");
        break;
      case CodePush.SyncStatus.DOWNLOAD_REQUEST_SUCCESS:
        log("Status: Download request success.");
        break;
      case CodePush.SyncStatus.UNZIPPED_SUCCESS:
        log("Status: Unzipped success.");
        break;
      case CodePush.SyncStatus.DECOMPRESSED_SUCCESS:
        log("Status: Decompressed success.");
        break;
      case CodePush.SyncStatus.UPDATE_AVAILABLE:
        log("Status: Update available.");
        break;
      case CodePush.SyncStatus.UPDATE_IGNORED_ROLLBACK:
        log("Status: Update ignored rollback.");
        break;
      case CodePush.SyncStatus.INSTALLING_UPDATE:
        log("Status: Installing update.");
        break;
      case CodePush.SyncStatus.UP_TO_DATE:
        log("Status: App is up to date.");
        break;
      case CodePush.SyncStatus.UPDATE_IGNORED:
        log("Status: User cancelled the update.");
        break;
      case CodePush.SyncStatus.UPDATE_INSTALLED:
        if (resolvedInstallMode == CodePush.InstallMode.ON_NEXT_RESTART) {
          log("Status: Update is installed and will be run on the next app restart.");
        } else if (resolvedInstallMode == CodePush.InstallMode.ON_NEXT_RESUME) {
          if (syncOptions.minimumBackgroundDuration > 0) {
            log(`Status: Update is installed and will be run after the app has been in the background for at least ${syncOptions.minimumBackgroundDuration} seconds.`);
          } else {
            log("Status: Update is installed and will be run when the app next resumes.");
          }
        }
        break;
      case CodePush.SyncStatus.UNKNOWN_ERROR:
        log("Status: An unknown error occurred.");
        break;
    }
  };

  function syncStatusChangeCallback(status) {
    if (typeof syncStatusChangeCallbackFunction === "function") {
      syncStatusChangeCallbackFunction(status);
    }
    internalSyncStatusChangeCallback(status);
  }

  try {
    await CodePush.notifyApplicationReady();

    syncStatusChangeCallback(CodePush.SyncStatus.CHECKING_FOR_UPDATE);
    const remotePackage = await checkForUpdate(syncOptions.deploymentKey, handleBinaryVersionMismatchCallback);

    const doDownloadAndInstall = async () => {
      syncStatusChangeCallback(CodePush.SyncStatus.DOWNLOADING_PACKAGE);

      function downloadStatusCallback(event) {
        switch (event?.name ?? "") {
          case "PATCH_APPLIED_SUCCESS":
            syncStatusChangeCallback(CodePush.SyncStatus.PATCH_APPLIED_SUCCESS);
            break;
          case "DOWNLOAD_REQUEST_SUCCESS":
            syncStatusChangeCallback(CodePush.SyncStatus.DOWNLOAD_REQUEST_SUCCESS);
            break;
          case "UNZIPPED_SUCCESS":
            syncStatusChangeCallback(CodePush.SyncStatus.UNZIPPED_SUCCESS);
            break;
          case "DECOMPRESSED_SUCCESS":
            syncStatusChangeCallback(CodePush.SyncStatus.DECOMPRESSED_SUCCESS);
            break;
          default:
            break;
        }
      }
      const localPackage = await remotePackage.download(downloadProgressCallback, downloadStatusCallback);

      // Determine the correct install mode based on whether the update is mandatory or not.
      resolvedInstallMode = localPackage.isMandatory ? syncOptions.mandatoryInstallMode : syncOptions.installMode;

      syncStatusChangeCallback(CodePush.SyncStatus.INSTALLING_UPDATE);
      await localPackage.install(resolvedInstallMode, syncOptions.minimumBackgroundDuration, () => {
        syncStatusChangeCallback(CodePush.SyncStatus.UPDATE_INSTALLED);
      });

      return CodePush.SyncStatus.UPDATE_INSTALLED;
    };

    const updateShouldBeIgnored = await shouldUpdateBeIgnored(remotePackage, syncOptions);

    if (remotePackage) {
      syncStatusChangeCallback(CodePush.SyncStatus.UPDATE_AVAILABLE);
    }

    if (!remotePackage || updateShouldBeIgnored) {
      if (updateShouldBeIgnored) {
          syncStatusChangeCallback(CodePush.SyncStatus.UPDATE_IGNORED_ROLLBACK);
          log("An update is available, but it is being ignored due to having been previously rolled back.");
      }

      const currentPackage = await CodePush.getCurrentPackage();
      if (currentPackage && currentPackage.isPending) {
        syncStatusChangeCallback(CodePush.SyncStatus.UPDATE_INSTALLED);
        return CodePush.SyncStatus.UPDATE_INSTALLED;
      } else {
        syncStatusChangeCallback(CodePush.SyncStatus.UP_TO_DATE);
        return CodePush.SyncStatus.UP_TO_DATE;
      }
    } else if (syncOptions.updateDialog) {
      // updateDialog supports any truthy value (e.g. true, "goo", 12),
      // but we should treat a non-object value as just the default dialog
      if (typeof syncOptions.updateDialog !== "object") {
        syncOptions.updateDialog = CodePush.DEFAULT_UPDATE_DIALOG;
      } else {
        syncOptions.updateDialog = { ...CodePush.DEFAULT_UPDATE_DIALOG, ...syncOptions.updateDialog };
      }

      return await new Promise((resolve, reject) => {
        let message = null;
        let installButtonText = null;

        const dialogButtons = [];

        if (remotePackage.isMandatory) {
          message = syncOptions.updateDialog.mandatoryUpdateMessage;
          installButtonText = syncOptions.updateDialog.mandatoryContinueButtonLabel;
        } else {
          message = syncOptions.updateDialog.optionalUpdateMessage;
          installButtonText = syncOptions.updateDialog.optionalInstallButtonLabel;
          // Since this is an optional update, add a button
          // to allow the end-user to ignore it
          dialogButtons.push({
            text: syncOptions.updateDialog.optionalIgnoreButtonLabel,
            onPress: () => {
              syncStatusChangeCallback(CodePush.SyncStatus.UPDATE_IGNORED);
              resolve(CodePush.SyncStatus.UPDATE_IGNORED);
            }
          });
        }
        
        // Since the install button should be placed to the 
        // right of any other button, add it last
        dialogButtons.push({
          text: installButtonText,
          onPress:() => {
            doDownloadAndInstall()
              .then(resolve, reject);
          }
        })

        // If the update has a description, and the developer
        // explicitly chose to display it, then set that as the message
        if (syncOptions.updateDialog.appendReleaseDescription && remotePackage.description) {
          message += `${syncOptions.updateDialog.descriptionPrefix} ${remotePackage.description}`;
        }

        syncStatusChangeCallback(CodePush.SyncStatus.AWAITING_USER_ACTION);
        Alert.alert(syncOptions.updateDialog.title, message, dialogButtons);
      });
    } else {
      return await doDownloadAndInstall();
    }
  } catch (error) {
    syncStatusChangeCallback(CodePush.SyncStatus.UNKNOWN_ERROR);
    log(error.message);
    throw error;
  }
};

let CodePush;

function codePushify(options = {}) {
  let React;
  let ReactNative = require("react-native");

  try { React = require("react"); } catch (e) { }
  if (!React) {
    try { React = ReactNative.React; } catch (e) { }
    if (!React) {
      throw new Error("Unable to find the 'React' module.");
    }
  }

  if (!React.Component) {
    throw new Error(
`Unable to find the "Component" class, please either:
1. Upgrade to a newer version of React Native that supports it, or
2. Call the codePush.sync API in your component instead of using the @codePush decorator`
    );
  }

  const decorator = (RootComponent) => {
    class CodePushComponent extends React.Component {
      constructor(props) {
        super(props);
        this.rootComponentRef = React.createRef();
      }

      componentDidMount() {
        if (options.checkFrequency === CodePush.CheckFrequency.MANUAL) {
          CodePush.notifyAppReady();
        } else {
          const rootComponentInstance = this.rootComponentRef.current;

          let syncStatusCallback;
          if (rootComponentInstance && rootComponentInstance.codePushStatusDidChange) {
            syncStatusCallback = rootComponentInstance.codePushStatusDidChange.bind(rootComponentInstance);
          }

          let downloadProgressCallback;
          if (rootComponentInstance && rootComponentInstance.codePushDownloadDidProgress) {
            downloadProgressCallback = rootComponentInstance.codePushDownloadDidProgress.bind(rootComponentInstance);
          }

          let handleBinaryVersionMismatchCallback;
          if (rootComponentInstance && rootComponentInstance.codePushOnBinaryVersionMismatch) {
            handleBinaryVersionMismatchCallback = rootComponentInstance.codePushOnBinaryVersionMismatch.bind(rootComponentInstance);
          }

          CodePush.sync(options, syncStatusCallback, downloadProgressCallback, handleBinaryVersionMismatchCallback);

          if (options.checkFrequency === CodePush.CheckFrequency.ON_APP_RESUME) {
            ReactNative.AppState.addEventListener("change", (newState) => {
              if (newState === "active") {
                CodePush.sync(options, syncStatusCallback, downloadProgressCallback);
              }
            });
          }
        }
      }

      render() {
        const props = {...this.props};

        // We can set ref property on class components only (not stateless)
        // Check it by render method
        if (RootComponent.prototype && RootComponent.prototype.render) {
          props.ref = this.rootComponentRef;
        }

        return <RootComponent {...props} />
      }
    }

    return hoistStatics(CodePushComponent, RootComponent);
  }

  if (typeof options === "function") {
    // Infer that the root component was directly passed to us.
    return decorator(options);
  } else {
    return decorator;
  }
}

// If the "NativeCodePush" variable isn't defined, then
// the app didn't properly install the native module,
// and therefore, it doesn't make sense initializing
// the JS interface when it wouldn't work anyways.
if (NativeCodePush) {
  CodePush = codePushify;
  Object.assign(CodePush, {
    AcquisitionSdk: Sdk,
    checkForUpdate,
    getConfiguration,
    getCurrentPackage,
    getUpdateMetadata,
    log,
    notifyAppReady: notifyApplicationReady,
    notifyApplicationReady,
    restartApp,
    setUpTestDependencies,
    sync,
    disallowRestart: NativeCodePush.disallow,
    allowRestart: NativeCodePush.allow,
    clearUpdates: NativeCodePush.clearUpdates,
    InstallMode: {
      IMMEDIATE: NativeCodePush.codePushInstallModeImmediate, // Restart the app immediately
      ON_NEXT_RESTART: NativeCodePush.codePushInstallModeOnNextRestart, // Don't artificially restart the app. Allow the update to be "picked up" on the next app restart
      ON_NEXT_RESUME: NativeCodePush.codePushInstallModeOnNextResume, // Restart the app the next time it is resumed from the background
      ON_NEXT_SUSPEND: NativeCodePush.codePushInstallModeOnNextSuspend // Restart the app _while_ it is in the background,
      // but only after it has been in the background for "minimumBackgroundDuration" seconds (0 by default),
      // so that user context isn't lost unless the app suspension is long enough to not matter
    },
    SyncStatus: {
      UP_TO_DATE: 0, // The running app is up-to-date
      UPDATE_INSTALLED: 1, // The app had an optional/mandatory update that was successfully downloaded and is about to be installed.
      UPDATE_IGNORED: 2, // The app had an optional update and the end-user chose to ignore it
      UNKNOWN_ERROR: 3,
      SYNC_IN_PROGRESS: 4, // There is an ongoing "sync" operation in progress.
      CHECKING_FOR_UPDATE: 5,
      AWAITING_USER_ACTION: 6,
      DOWNLOADING_PACKAGE: 7,
      INSTALLING_UPDATE: 8,
      UPDATE_IGNORED_ROLLBACK: 9,
      UPDATE_AVAILABLE: 10,
      PATCH_APPLIED_SUCCESS: 11,
      DOWNLOAD_REQUEST_SUCCESS: 12,
      UNZIPPED_SUCCESS: 13,
      DECOMPRESSED_SUCCESS: 14
    },
    CheckFrequency: {
      ON_APP_START: 0,
      ON_APP_RESUME: 1,
      MANUAL: 2
    },
    UpdateState: {
      RUNNING: NativeCodePush.codePushUpdateStateRunning,
      PENDING: NativeCodePush.codePushUpdateStatePending,
      LATEST: NativeCodePush.codePushUpdateStateLatest
    },
    DeploymentStatus: {
      FAILED: "DeploymentFailed",
      SUCCEEDED: "DeploymentSucceeded",
    },
    DEFAULT_UPDATE_DIALOG: {
      appendReleaseDescription: false,
      descriptionPrefix: " Description: ",
      mandatoryContinueButtonLabel: "Continue",
      mandatoryUpdateMessage: "An update is available that must be installed.",
      optionalIgnoreButtonLabel: "Ignore",
      optionalInstallButtonLabel: "Install",
      optionalUpdateMessage: "An update is available. Would you like to install it?",
      title: "Update available"
    },
    DEFAULT_ROLLBACK_RETRY_OPTIONS: {
      delayInHours: 24,
      maxRetryAttempts: 1
    }
  });
} else {
  log("The CodePush module doesn't appear to be properly installed. Please double-check that everything is setup correctly.");
}

module.exports = CodePush;
