// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * ============================================================================
 * Design Rationale: Package Matching Logic - "Which Update Should This Device Get?"
 * ============================================================================
 * 
 * PURPOSE:
 * 
 * This is THE CORE LOGIC that determines which OTA update (if any) a mobile device
 * should download. Called by routes/acquisition.ts on every /updateCheck request.
 * 
 * KEY RESPONSIBILITY:
 * Given:
 * - Device's current app version (e.g., "1.0.0")
 * - Device's current package label (e.g., "v5")
 * - Deployment's package history (list of all releases: v1, v2, v3, v4, v5, v6)
 * 
 * Return:
 * - The latest compatible update (e.g., v6) OR
 * - No update (device is already on latest) OR
 * - "Run binary version" (no updates compatible with device's app version)
 * 
 * ============================================================================
 * USER JOURNEY 2: END USER RECEIVES UPDATE (Step 2.3)
 * ============================================================================
 * 
 * Step 2.3: Server Determines Available Update
 * 
 * Server receives from SDK:
 * ```json
 * {
 *   "deployment_key": "abc123",
 *   "app_version": "1.0.0",       // Binary version from App Store
 *   "package_hash": "def456",     // Current OTA update hash (if any)
 *   "label": "v5",                // Current OTA update label (if any)
 *   "client_unique_id": "device-uuid"
 * }
 * ```
 * 
 * Server has package history:
 * ```javascript
 * [
 *   { label: "v1", appVersion: "1.0.0", packageHash: "aaa", isDisabled: false, isMandatory: false },
 *   { label: "v2", appVersion: "1.0.0", packageHash: "bbb", isDisabled: false, isMandatory: false },
 *   { label: "v3", appVersion: "~1.0.0", packageHash: "ccc", isDisabled: false, isMandatory: false },
 *   { label: "v4", appVersion: "~1.0.0", packageHash: "ddd", isDisabled: true, isMandatory: false },  // ← Disabled!
 *   { label: "v5", appVersion: "~1.0.0", packageHash: "def456", isDisabled: false, isMandatory: false }, // ← Device has this
 *   { label: "v6", appVersion: "~1.0.0", packageHash: "fff", isDisabled: false, isMandatory: false }, // ← Latest
 *   { label: "v7", appVersion: "^2.0.0", packageHash: "ggg", isDisabled: false, isMandatory: false }  // ← Requires newer binary
 * ]
 * ```
 * 
 * THIS FILE's getUpdatePackage() logic:
 * 1. Scan history BACKWARDS (newest first: v7 → v6 → v5 → ...)
 * 2. Skip disabled packages (v4)
 * 3. Find device's current package (v5) using label or hash match
 * 4. Find latest package AFTER current that matches semver (v6)
 * 5. Skip packages that require newer binary (v7 needs app v2.0.0, device has v1.0.0)
 * 
 * Server responds:
 * ```json
 * {
 *   "isAvailable": true,
 *   "downloadURL": "https://cdn.../v6.zip",
 *   "label": "v6",
 *   "packageHash": "fff",
 *   "isMandatory": false,
 *   "updateAppVersion": false,        // ← No binary upgrade needed
 *   "shouldRunBinaryVersion": false   // ← OTA update available
 * }
 * ```
 * 
 * ============================================================================
 * CRITICAL EDGE CASES HANDLED
 * ============================================================================
 * 
 * EDGE CASE 1: Device Sends No Label or Hash (First Launch)
 * 
 * Problem:
 * - User installs app from App Store (never received OTA update)
 * - Device doesn't know which OTA version it's on
 * - Request has: appVersion="1.0.0", but no label/hash
 * 
 * Solution:
 * ```typescript
 * foundRequestPackageInHistory =
 *   foundRequestPackageInHistory ||
 *   (!request.label && !request.packageHash) ||  // ← Treat as "never got OTA"
 *   (request.label && packageEntry.label === request.label) ||
 *   (!request.label && packageEntry.packageHash === request.packageHash);
 * ```
 * - If no label/hash: Assume device is on "binary bundle" (pre-OTA)
 * - Send latest OTA update that matches appVersion
 * 
 * EDGE CASE 2: Disabled Package (Developer Pulled Release)
 * 
 * Problem:
 * - Release v4 was deployed, but had a critical bug
 * - Developer disabled v4 via dashboard
 * - Some users still have v4 installed
 * - Should they get v5 (next release) or v3 (previous)?
 * 
 * Solution:
 * ```typescript
 * if (packageEntry.isDisabled || (ignoreRolloutPackages && isUnfinishedRollout(packageEntry.rollout))) {
 *   continue; // Skip disabled packages in scan
 * }
 * ```
 * - Disabled packages are invisible (never sent to devices)
 * - Devices on v4 → upgrade to v5 (latest non-disabled)
 * - Devices on v3 → stay on v3 (don't downgrade)
 * 
 * EDGE CASE 3: Binary Version Mismatch (Update Requires Newer App)
 * 
 * Problem:
 * - Device has app v1.0.0 from App Store
 * - Latest OTA update (v7) requires app v2.0.0 (uses new native API)
 * - Sending v7 to device → app crashes
 * 
 * Solution:
 * ```typescript
 * if (!request.isCompanion && !semver.satisfies(request.appVersion, packageEntry.appVersion)) {
 *   continue; // Skip packages that require newer binary
 * }
 * ```
 * - If device's appVersion doesn't satisfy release's semver range → skip
 * - Response: `updateAppVersion: true` → tells SDK "no OTA, upgrade binary from store"
 * 
 * EDGE CASE 4: Mandatory Update (Force Immediate Upgrade)
 * 
 * Problem:
 * - Release v3 was mandatory (critical security fix)
 * - Device is on v1 (skipped v2, v3)
 * - Should v6 also be mandatory? (Yes, to force v1 → v6 immediately)
 * 
 * Solution:
 * ```typescript
 * if (packageEntry.isMandatory) {
 *   shouldMakeUpdateMandatory = true; // Propagate mandatory flag
 *   break; // Stop scanning, we know enough
 * }
 * ```
 * - If ANY mandatory release exists between device's version and latest → make latest mandatory
 * - Ensures critical fixes are forced on all users
 * 
 * EDGE CASE 5: No Compatible Updates (Run Binary Bundle)
 * 
 * Problem:
 * - Device has app v3.0.0
 * - All OTA updates target v1.x.x or v2.x.x (old)
 * - No OTA updates compatible with v3.0.0
 * 
 * Solution:
 * ```typescript
 * updateDetails.shouldRunBinaryVersion = !latestSatisfyingEnabledPackage;
 * ```
 * - Response: `shouldRunBinaryVersion: true`
 * - SDK ignores OTA updates, runs bundle from App Store binary
 * - Prevents app from using old incompatible OTA updates
 * 
 * ============================================================================
 * ROLLOUT SUPPORT: GRADUAL RELEASES
 * ============================================================================
 * 
 * Problem: How do we release v6 to 10% of users, then 50%, then 100%?
 * 
 * Solution: Track TWO packages in cache response:
 * 
 * ```typescript
 * if (isUnfinishedRollout(updatePackage.rollout)) {
 *   const origUpdatePackage = getUpdatePackage(packageHistory, request, true); // Ignore rollout packages
 *   cacheResponse = {
 *     originalPackage: origUpdatePackage.response,  // v5 (100% rollout)
 *     rolloutPackage: updatePackage.response,       // v6 (10% rollout)
 *     rollout: 10                                    // Percentage
 *   };
 * }
 * ```
 * 
 * Rollout selection (routes/acquisition.ts):
 * ```typescript
 * const selectedPackage = rolloutSelector.selectRolloutPackage(
 *   cacheResponse.originalPackage,
 *   cacheResponse.rolloutPackage,
 *   cacheResponse.rollout,
 *   request.client_unique_id  // Deterministic hashing
 * );
 * ```
 * 
 * Device gets:
 * - 10% of users → v6 (rollout package)
 * - 90% of users → v5 (original package)
 * - Same device always gets same package (deterministic)
 * 
 * WHY TRACK TWO PACKAGES?
 * 
 * Without separate tracking:
 * - Cache key: deployment_key + appVersion → single package
 * - Can't support gradual rollouts (cache is binary: v5 OR v6)
 * 
 * With separate tracking:
 * - Cache stores BOTH packages + rollout percentage
 * - Rollout decision made AFTER cache lookup (per-device)
 * - Cache hit rate stays high (shared across all users)
 * 
 * ============================================================================
 * LABEL vs. HASH: CLIENT VERSION IDENTIFICATION
 * ============================================================================
 * 
 * Why track BOTH label and hash?
 * 
 * SCENARIO 1: Developer Releases Same Bundle Twice
 * - Release v5 (hash: abc123)
 * - Delete v5
 * - Release v5 again (same bundle, same hash: abc123, but new label in DB)
 * 
 * Problem with hash-only:
 * - Device reports: packageHash=abc123
 * - Server finds TWO packages with abc123 (deleted v5, new v5)
 * - Which one is the device running? Ambiguous!
 * 
 * Solution with label:
 * - Device reports: label="v5"
 * - Server uses label as primary key (more specific)
 * - Fallback to hash if label missing (older SDK versions)
 * 
 * Code:
 * ```typescript
 * foundRequestPackageInHistory =
 *   (request.label && packageEntry.label === request.label) ||        // ← Prefer label
 *   (!request.label && packageEntry.packageHash === request.packageHash); // ← Fallback to hash
 * ```
 * 
 * ============================================================================
 * BACKWARD SCANNING: WHY ITERATE HISTORY BACKWARDS?
 * ============================================================================
 * 
 * History array (oldest first):
 * ```
 * [v1, v2, v3, v4, v5, v6, v7]
 * ```
 * 
 * Could scan forward (v1 → v7), why scan backward (v7 → v1)?
 * 
 * REASON 1: Early Exit Optimization
 * ```typescript
 * for (let i = packageHistory.length - 1; i >= 0; i--) { // ← Start at v7
 *   if (foundRequestPackageInHistory) {
 *     break; // ← Stop scanning, all older packages are irrelevant
 *   }
 * }
 * ```
 * - Device is on v5 → scan v7, v6, v5 (found!) → STOP
 * - Don't waste time scanning v4, v3, v2, v1 (all older)
 * 
 * REASON 2: Latest Satisfying Package
 * - Need to find: "Latest package that matches device's appVersion"
 * - Scanning backward → first match is automatically latest
 * - No need to track "best so far" variable
 * 
 * Performance:
 * - Average case: O(2-3 iterations) (device usually on recent version)
 * - Worst case: O(n) (device on v1, need to scan entire history)
 * - Forward scan: Always O(n) (must scan entire history)
 * 
 * ============================================================================
 * LESSON LEARNED: PACKAGE MATCHING IS COMPLEX BUT CRITICAL
 * ============================================================================
 * 
 * Real-world bugs prevented by this logic:
 * 
 * BUG 1: "User stuck on old version forever"
 * - Cause: Server didn't handle disabled packages correctly
 * - Device on disabled v4 → server says "you're up to date" (wrong!)
 * - Fix: Skip disabled packages, send v5
 * 
 * BUG 2: "App crashes on launch after OTA update"
 * - Cause: Server sent v7 (requires app v2.0.0) to device with v1.0.0
 * - Fix: Strict semver validation, `updateAppVersion: true` response
 * 
 * BUG 3: "Users randomly switch between v5 and v6"
 * - Cause: Rollout logic was non-deterministic (random per request)
 * - Fix: Deterministic hashing based on client_unique_id
 * 
 * ============================================================================
 * ALTERNATIVES CONSIDERED
 * ============================================================================
 * 
 * 1. Simple "latest package" approach (no semver, no history scan)
 *    - Rejected: Can't handle binary version mismatches (crashes)
 * 
 * 2. Database query per device (no in-memory history scan)
 *    - Rejected: Too slow, can't scale to 1M requests/day
 * 
 * 3. Client-side package selection (server sends all packages)
 *    - Rejected: Security risk (client can pick any version)
 * 
 * 4. No disabled package support (delete from DB instead)
 *    - Rejected: Need to disable temporarily for investigation
 * 
 * ============================================================================
 * RELATED FILES:
 * ============================================================================
 * 
 * - routes/acquisition.ts: Calls this file's getUpdatePackageInfo()
 * - utils/rollout-selector.ts: Deterministic rollout selection
 * - delivr-sdk-ota/acquisition-sdk.js: Client-side HTTP call
 * - delivr-sdk-ota/CodePush.js: Handles updateAppVersion response
 * 
 * ============================================================================
 */

import * as semver from "semver";
import { UpdateCheckCacheResponse, UpdateCheckRequest, UpdateCheckResponse } from "../types/rest-definitions";
import { Package } from "../storage/storage";
import { isUnfinishedRollout } from "./rollout-selector";

interface UpdatePackage {
  response: UpdateCheckResponse;
  rollout?: number;
}

export function getUpdatePackageInfo(packageHistory: Package[], request: UpdateCheckRequest): UpdateCheckCacheResponse {
  const updatePackage: UpdatePackage = getUpdatePackage(packageHistory, request, /*ignoreRolloutPackages*/ false);
  let cacheResponse: UpdateCheckCacheResponse;

  if (isUnfinishedRollout(updatePackage.rollout)) {
    const origUpdatePackage: UpdatePackage = getUpdatePackage(packageHistory, request, /*ignoreRolloutPackages*/ true);
    cacheResponse = <UpdateCheckCacheResponse>{
      originalPackage: origUpdatePackage.response,
      rolloutPackage: updatePackage.response,
      rollout: updatePackage.rollout,
    };
  } else {
    cacheResponse = { originalPackage: updatePackage.response };
  }

  return cacheResponse;
}

function getUpdatePackage(packageHistory: Package[], request: UpdateCheckRequest, ignoreRolloutPackages?: boolean): UpdatePackage {
  const updateDetails: UpdateCheckResponse = {
    downloadURL: "",
    description: "",
    isAvailable: false,
    isMandatory: false,
    appVersion: "",
    packageHash: "",
    label: "",
    packageSize: 0,
    updateAppVersion: false,
    isBundlePatchingEnabled: false,
  };

  if (!packageHistory || packageHistory.length === 0) {
    updateDetails.shouldRunBinaryVersion = true;
    return { response: updateDetails };
  }

  let foundRequestPackageInHistory: boolean = false;
  let latestSatisfyingEnabledPackage: Package;
  let latestEnabledPackage: Package;
  let rollout: number = null;
  let shouldMakeUpdateMandatory: boolean = false;

  for (let i = packageHistory.length - 1; i >= 0; i--) {
    const packageEntry: Package = packageHistory[i];
    // Check if this packageEntry is the same as the one that the client is running.
    // Note that older client plugin versions do not send the release label. If the
    // label is supplied, we use label comparison, since developers can release the
    // same update twice. Otherwise, we fall back to hash comparison.
    // If request is missing both label and hash we take the latest package
    // as we cannot determine which one the client is running
    foundRequestPackageInHistory =
      foundRequestPackageInHistory ||
      (!request.label && !request.packageHash) ||
      (request.label && packageEntry.label === request.label) ||
      (!request.label && packageEntry.packageHash === request.packageHash);
    if (packageEntry.isDisabled || (ignoreRolloutPackages && isUnfinishedRollout(packageEntry.rollout))) {
      continue;
    }

    latestEnabledPackage = latestEnabledPackage || packageEntry;
    if (!request.isCompanion && !semver.satisfies(request.appVersion, packageEntry.appVersion)) {
      continue;
    }

    latestSatisfyingEnabledPackage = latestSatisfyingEnabledPackage || packageEntry;
    if (foundRequestPackageInHistory) {
      // All the releases further down the history are older than the one the
      // client is running, so we can stop the scan.
      break;
    } else if (packageEntry.isMandatory) {
      // If this release is mandatory, newer than the one the client is running,
      // and satifies the client's binary version, we should also make the
      // latest update mandatory. We got all the information we need from the
      // history, so stop the scan.
      shouldMakeUpdateMandatory = true;
      break;
    }
  }

  // If none of the enabled releases have a range that satisfies the client's binary
  // version, tell the client to run the version bundled in the binary.
  updateDetails.shouldRunBinaryVersion = !latestSatisfyingEnabledPackage;
  if (!latestEnabledPackage) {
    // None of the releases in this deployment are enabled, so return no update.
    return { response: updateDetails };
  } else if (updateDetails.shouldRunBinaryVersion || latestSatisfyingEnabledPackage.packageHash === request.packageHash) {
    // Either none of the releases in this deployment satisfy the client's binary
    // version, or the client already has the latest relevant update, so return no
    // update, but also tell the client what appVersion the latest release is on and
    // whether they should trigger a store update.
    if (semver.gtr(request.appVersion, latestEnabledPackage.appVersion)) {
      updateDetails.appVersion = latestEnabledPackage.appVersion;
    } else if (!semver.satisfies(request.appVersion, latestEnabledPackage.appVersion)) {
      updateDetails.updateAppVersion = true;
      updateDetails.appVersion = latestEnabledPackage.appVersion;
    }

    return { response: updateDetails };
  } else if (
    request.packageHash &&
    latestSatisfyingEnabledPackage.diffPackageMap &&
    latestSatisfyingEnabledPackage.diffPackageMap[request.packageHash]
  ) {
    updateDetails.downloadURL = latestSatisfyingEnabledPackage.diffPackageMap[request.packageHash].url;
    updateDetails.packageSize = latestSatisfyingEnabledPackage.diffPackageMap[request.packageHash].size;
    updateDetails.isBundlePatchingEnabled = latestSatisfyingEnabledPackage.isBundlePatchingEnabled;
  } else {
    updateDetails.downloadURL = latestSatisfyingEnabledPackage.blobUrl;
    updateDetails.packageSize = latestSatisfyingEnabledPackage.size;
    updateDetails.isBundlePatchingEnabled = latestSatisfyingEnabledPackage.isBundlePatchingEnabled;
  }

  updateDetails.description = latestSatisfyingEnabledPackage.description;
  updateDetails.isMandatory = shouldMakeUpdateMandatory || latestSatisfyingEnabledPackage.isMandatory;
  updateDetails.isAvailable = true;
  updateDetails.label = latestSatisfyingEnabledPackage.label;
  updateDetails.packageHash = latestSatisfyingEnabledPackage.packageHash;
  rollout = latestSatisfyingEnabledPackage.rollout;

  // Old plugins will only work with updates with app versions that are valid semver
  // (i.e. not a range), so we return the same version string as the requested one
  updateDetails.appVersion = request.appVersion;
  return { response: updateDetails, rollout: rollout };
}
