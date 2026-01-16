/**
 * ============================================================================
 * Design Rationale: Package Mixins - Download & Install Methods
 * ============================================================================
 * 
 * PURPOSE:
 * 
 * This file adds download() and install() methods to package objects, enabling
 * the SDK to:
 * 1. Download OTA updates from CDN
 * 2. Install updates (apply to app on restart)
 * 3. Track download progress (show progress bar to user)
 * 4. Report telemetry to server (download success/failure)
 * 
 * USER JOURNEY 2: END USER RECEIVES UPDATE (Steps 2.4, 2.6)
 * 
 * Step 2.4: SDK Downloads Update
 * - remotePackage.download(progressCallback)
 * - Native code (iOS/Android) downloads from CDN
 * - Progress events emitted to JavaScript
 * 
 * Step 2.6: SDK Installs Update
 * - localPackage.install(installMode)
 * - Native code copies bundle to app directory
 * - App restarts to apply update
 * 
 * ============================================================================
 * WHY "MIXINS"? (Object Augmentation Pattern)
 * ============================================================================
 * 
 * Problem: Server sends package metadata (JSON):
 * ```json
 * {
 *   "downloadURL": "https://cdn.../bundle.zip",
 *   "packageHash": "abc123",
 *   "label": "v6",
 *   "isMandatory": false
 * }
 * ```
 * 
 * But we need to ADD methods (download, install) to this object.
 * 
 * Naive approach (create new class):
 * ```javascript
 * class RemotePackage {
 *   constructor(metadata) {
 *     this.downloadURL = metadata.downloadURL;
 *     this.packageHash = metadata.packageHash;
 *     // ... copy all properties
 *   }
 *   
 *   async download() { ... }
 * }
 * 
 * const pkg = new RemotePackage(serverMetadata);
 * ```
 * 
 * Problem: Requires copying all properties (error-prone, verbose).
 * 
 * Mixin approach (chosen):
 * ```javascript
 * const remote = (reportStatusDownload) => ({
 *   async download() { ... },
 *   isPending: false
 * });
 * 
 * // Merge server metadata + methods
 * const remotePackage = { ...serverMetadata, ...remote(reportFn) };
 * ```
 * 
 * Benefits:
 * - No property copying (spread operator handles it)
 * - Clean separation: Data (from server) + Behavior (mixins)
 * - Easy to test (mock package objects)
 * 
 * ============================================================================
 * REMOTE PACKAGE: DOWNLOAD METHOD
 * ============================================================================
 * 
 * Usage (CodePush.js):
 * ```javascript
 * const remotePackage = await codePush.checkForUpdate();
 * 
 * // Download with progress tracking
 * const localPackage = await remotePackage.download((progress) => {
 *   console.log(`Downloaded ${progress.receivedBytes} / ${progress.totalBytes}`);
 * });
 * 
 * // Now install
 * await localPackage.install(InstallMode.ON_NEXT_RESTART);
 * ```
 * 
 * Implementation:
 * ```javascript
 * async download(downloadProgressCallback, downloadStatusCallback) {
 *   // 1. Subscribe to native progress events
 *   const codePushEventEmitter = new NativeEventEmitter(NativeCodePush);
 *   const subscription = codePushEventEmitter.addListener(
 *     "CodePushDownloadProgress",
 *     downloadProgressCallback
 *   );
 *   
 *   try {
 *     // 2. Call native code to download (iOS/Android)
 *     const downloadedPackage = await NativeCodePush.downloadUpdate(
 *       this,  // Package metadata (downloadURL, packageHash, etc.)
 *       true   // Report progress
 *     );
 *     
 *     // 3. Report to server (telemetry)
 *     await reportStatusDownload(this);
 *     
 *     // 4. Return localPackage (ready to install)
 *     return { ...downloadedPackage, ...local };
 *   } finally {
 *     // 5. Cleanup subscriptions
 *     subscription.remove();
 *   }
 * }
 * ```
 * 
 * Native download (iOS: CodePush.m, Android: CodePush.java):
 * - Downloads from CDN (downloadURL)
 * - Saves to temp directory
 * - Extracts .zip file
 * - Verifies signature (RSA-2048)
 * - Emits progress events to JavaScript
 * 
 * ============================================================================
 * DOWNLOAD PROGRESS: NATIVE → JAVASCRIPT EVENTS
 * ============================================================================
 * 
 * Problem: Download happens in native code (iOS/Android)
 * - JavaScript can't directly track download progress
 * - Need to bridge native progress to JavaScript
 * 
 * Solution: React Native Event Emitter
 * 
 * Native side (iOS example):
 * ```objective-c
 * // CodePush.m (iOS)
 * - (void)downloadUpdate:(NSDictionary *)updatePackage {
 *   NSURLSession *session = [NSURLSession sharedSession];
 *   NSURLSessionDownloadTask *task = [session downloadTaskWithURL:url];
 *   
 *   [task addObserver:self forKeyPath:@"progress" options:NSKeyValueObservingOptionNew context:nil];
 * }
 * 
 * - (void)observeValueForKeyPath:(NSString *)keyPath {
 *   // Emit progress event to JavaScript
 *   [self sendEventWithName:@"CodePushDownloadProgress" body:@{
 *     @"receivedBytes": @(progress.completedUnitCount),
 *     @"totalBytes": @(progress.totalUnitCount)
 *   }];
 * }
 * ```
 * 
 * JavaScript side (THIS FILE):
 * ```javascript
 * const codePushEventEmitter = new NativeEventEmitter(NativeCodePush);
 * codePushEventEmitter.addListener("CodePushDownloadProgress", (progress) => {
 *   downloadProgressCallback(progress);  // ← User's callback
 * });
 * ```
 * 
 * User callback receives:
 * ```javascript
 * {
 *   receivedBytes: 1048576,  // 1MB downloaded
 *   totalBytes: 10485760      // 10MB total
 * }
 * ```
 * 
 * ============================================================================
 * LOCAL PACKAGE: INSTALL METHOD
 * ============================================================================
 * 
 * Usage (CodePush.js):
 * ```javascript
 * const localPackage = await remotePackage.download();
 * 
 * // Install with different modes
 * await localPackage.install(InstallMode.ON_NEXT_RESTART);  // Default (safe)
 * await localPackage.install(InstallMode.IMMEDIATE);        // Restart now
 * await localPackage.install(InstallMode.ON_NEXT_RESUME, 60); // After 60s in background
 * ```
 * 
 * Implementation:
 * ```javascript
 * async install(installMode, minimumBackgroundDuration, updateInstalledCallback) {
 *   // 1. Call native code to install
 *   await NativeCodePush.installUpdate(
 *     this,  // Downloaded package (localPath, packageHash, etc.)
 *     installMode,
 *     minimumBackgroundDuration
 *   );
 *   
 *   // 2. Notify user (callback)
 *   updateInstalledCallback && updateInstalledCallback();
 *   
 *   // 3. Apply update based on install mode
 *   if (installMode === InstallMode.IMMEDIATE) {
 *     NativeCodePush.restartApp(false);  // Restart immediately
 *   } else {
 *     this.isPending = true;  // Mark as pending (apply on next restart)
 *   }
 * }
 * ```
 * 
 * Native install (iOS: CodePush.m, Android: CodePush.java):
 * - Copies bundle from temp directory to app directory
 * - Updates metadata (.codepushrelease file)
 * - Marks update as "pending" (for crash detection)
 * 
 * ============================================================================
 * INSTALL MODES: THREE STRATEGIES
 * ============================================================================
 * 
 * 1. **ON_NEXT_RESTART** (default, safest)
 * ```javascript
 * await localPackage.install(InstallMode.ON_NEXT_RESTART);
 * ```
 * - Update applied when user kills and relaunches app
 * - Non-disruptive (no forced restart)
 * - Best for: Most updates (non-critical)
 * 
 * 2. **IMMEDIATE** (disruptive, for critical fixes)
 * ```javascript
 * await localPackage.install(InstallMode.IMMEDIATE);
 * ```
 * - App restarts RIGHT NOW
 * - User loses current state (unsaved data lost)
 * - Best for: Critical security patches, breaking bugs
 * 
 * 3. **ON_NEXT_RESUME** (background update)
 * ```javascript
 * await localPackage.install(InstallMode.ON_NEXT_RESUME, 60);
 * ```
 * - Update applied when app comes back from background (after 60s minimum)
 * - Less disruptive than IMMEDIATE
 * - Best for: Updates that need to apply quickly but not immediately
 * 
 * ============================================================================
 * isPending FLAG: PENDING UPDATES
 * ============================================================================
 * 
 * Problem: User downloads update but hasn't restarted app yet
 * - Update is "pending" (installed but not applied)
 * - Need to track this state
 * 
 * Solution: isPending flag
 * ```javascript
 * const localPackage = { isPending: false };  // Initially false
 * 
 * await localPackage.install(InstallMode.ON_NEXT_RESTART);
 * localPackage.isPending = true;  // ← Set to true after install
 * 
 * // Later...
 * const pendingUpdate = await codePush.getUpdateMetadata(UpdateState.PENDING);
 * if (pendingUpdate) {
 *   console.log("Update will apply on next restart");
 * }
 * ```
 * 
 * Used by apps to:
 * - Show "Restart to apply update" button
 * - Auto-restart app when idle
 * - Notify user of pending update
 * 
 * ============================================================================
 * TELEMETRY: reportStatusDownload()
 * ============================================================================
 * 
 * Problem: Server doesn't know if downloads succeed or fail
 * - Need metrics: Download success rate, failure rate
 * 
 * Solution: Report download status to server
 * ```javascript
 * const downloadedPackage = await NativeCodePush.downloadUpdate(...);
 * 
 * // Report to server (via acquisition-sdk.js)
 * await reportStatusDownload(this);
 * // POST /reportStatus/download
 * // { packageHash: "abc123", label: "v6", deploymentKey: "xyz" }
 * ```
 * 
 * Server tracks:
 * - Total downloads
 * - Download failures (network issues, signature failures)
 * - Download speed (for CDN optimization)
 * 
 * ============================================================================
 * EVENT CLEANUP: MEMORY LEAK PREVENTION
 * ============================================================================
 * 
 * Problem: Event listeners not removed → memory leaks
 * - Every download adds listener
 * - 100 downloads → 100 listeners → memory bloat
 * 
 * Solution: Always remove listeners in finally block
 * ```javascript
 * let subscription;
 * try {
 *   subscription = codePushEventEmitter.addListener(...);
 *   await NativeCodePush.downloadUpdate(...);
 * } finally {
 *   subscription && subscription.remove();  // ← Always cleanup
 * }
 * ```
 * 
 * Why finally:
 * - Runs even if download fails (exception thrown)
 * - Prevents orphaned listeners
 * 
 * ============================================================================
 * LESSON LEARNED: KEEP IT SIMPLE
 * ============================================================================
 * 
 * This file is tiny (< 100 lines) but critical. Why so small?
 * 
 * Design principle: Delegate to native code
 * - JavaScript: High-level API (download, install)
 * - Native code: Heavy lifting (HTTP, file I/O, signature verification)
 * 
 * Benefits:
 * - JavaScript stays simple (easy to read/maintain)
 * - Native code is optimized (C/Objective-C/Java)
 * - Cross-platform: Same JavaScript API, platform-specific native code
 * 
 * ============================================================================
 * ALTERNATIVES CONSIDERED
 * ============================================================================
 * 
 * 1. Pure JavaScript download (using fetch API)
 *    - Rejected: Can't write to app directory from JavaScript (security)
 * 
 * 2. Class-based packages (instead of mixins)
 *    - Rejected: More verbose, requires property copying
 * 
 * 3. No progress tracking (silent downloads)
 *    - Rejected: Poor UX, users think app is frozen
 * 
 * 4. Synchronous install (block until restart)
 *    - Rejected: UI freezes, bad UX
 * 
 * ============================================================================
 * RELATED FILES:
 * ============================================================================
 * 
 * - CodePush.js: Calls remotePackage.download() and localPackage.install()
 * - acquisition-sdk.js: reportStatusDownload() HTTP client
 * - ios/CodePush/CodePush.m: Native iOS download/install
 * - android/src/.../CodePush.java: Native Android download/install
 * 
 * ============================================================================
 */

import { NativeEventEmitter } from "react-native";
import log from "./logging";

// This function is used to augment remote and local
// package objects with additional functionality/properties
// beyond what is included in the metadata sent by the server.
module.exports = (NativeCodePush) => {
  const remote = (reportStatusDownload) => {
    return {
      async download(downloadProgressCallback, downloadStatusCallback) {
        if (!this.downloadUrl) {
          throw new Error("Cannot download an update without a download url");
        }

        let downloadProgressSubscription;
        const codePushEventEmitter = new NativeEventEmitter(NativeCodePush);
        if (downloadProgressCallback) {
          // Use event subscription to obtain download progress.
          downloadProgressSubscription = codePushEventEmitter.addListener(
            "CodePushDownloadProgress",
            downloadProgressCallback
          );
        }
        let downloadStatusSubscription;
        if (downloadStatusCallback) { // Use event subscription to obtain download status.
        downloadStatusSubscription = codePushEventEmitter.addListener(
          "CodePushDownloadStatus",
            downloadStatusCallback
          );
        }

        // Use the downloaded package info. Native code will save the package info
        // so that the client knows what the current package version is.
        try {
          const updatePackageCopy = Object.assign({}, this);
          Object.keys(updatePackageCopy).forEach((key) => (typeof updatePackageCopy[key] === 'function') && delete updatePackageCopy[key]);

          const downloadedPackage = await NativeCodePush.downloadUpdate(updatePackageCopy, !!downloadProgressCallback);

          if (reportStatusDownload) {
            reportStatusDownload(this)
            .catch((err) => {
              log(`Report download status failed: ${err}`);
            });
          }

          return { ...downloadedPackage, ...local };
        } finally {
          downloadProgressSubscription && downloadProgressSubscription.remove();
          downloadStatusSubscription && downloadStatusSubscription.remove();
        }
      },

      isPending: false // A remote package could never be in a pending state
    };
  };

  const local = {
    async install(installMode = NativeCodePush.codePushInstallModeOnNextRestart, minimumBackgroundDuration = 0, updateInstalledCallback) {
      const localPackage = this;
      const localPackageCopy = Object.assign({}, localPackage); // In dev mode, React Native deep freezes any object queued over the bridge
      await NativeCodePush.installUpdate(localPackageCopy, installMode, minimumBackgroundDuration);
      updateInstalledCallback && updateInstalledCallback();
      if (installMode == NativeCodePush.codePushInstallModeImmediate) {
        NativeCodePush.restartApp(false);
      } else {
        NativeCodePush.clearPendingRestart();
        localPackage.isPending = true; // Mark the package as pending since it hasn't been applied yet
      }
    },

    isPending: false // A local package wouldn't be pending until it was installed
  };

  return { local, remote };
};