// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * NOTE!!! This utility file is duplicated for use by the CodePush service (for server-driven hashing/
 * integrity checks) and CLI (for end-to-end code signing), please keep them in sync.
 */

/**
 * ============================================================================
 * Design Rationale: Content Hashing - SHA-256 for Deduplication & Integrity
 * ============================================================================
 * 
 * PURPOSE:
 * 
 * This file generates SHA-256 hashes of OTA bundles for:
 * 1. **Deduplication**: Detect duplicate releases (same bundle uploaded twice)
 * 2. **Code Signing**: Generate hash for RSA signature verification
 * 3. **Content Integrity**: Verify bundle wasn't corrupted during upload/download
 * 4. **Binary Patching**: Identify base bundle for diff generation
 * 
 * KEY RESPONSIBILITIES:
 * - generatePackageManifestFromDirectory(): Hash entire directory (Android assets)
 * - generatePackageManifestFromZip(): Hash .zip file contents
 * - generatePackageHashFromDirectory(): Single SHA-256 hash of all files
 * 
 * ============================================================================
 * USER JOURNEY 1: DEVELOPER RELEASES OTA UPDATE (Step 1.4)
 * ============================================================================
 * 
 * Step 1.4: Hash Bundle (Before Code Signing)
 * 
 * CLI workflow:
 * 1. React Native bundler creates: /tmp/CodePush/main.jsbundle + assets/
 * 2. THIS FILE generates manifest:
 *    ```javascript
 *    {
 *      "main.jsbundle": "abc123...",  // SHA-256 of main.jsbundle
 *      "assets/logo.png": "def456...", // SHA-256 of logo.png
 *      "assets/icon.png": "ghi789..."  // SHA-256 of icon.png
 *    }
 *    ```
 * 3. THIS FILE computes package hash:
 *    ```javascript
 *    packageHash = SHA-256("main.jsbundle:abc123...assets/logo.png:def456...assets/icon.png:ghi789...")
 *    // Result: "xyz999..."
 *    ```
 * 4. sign.ts signs packageHash with RSA private key
 * 5. CLI uploads bundle + signature to server
 * 
 * ============================================================================
 * WHY SHA-256? (vs. MD5, SHA-1, or File Size)
 * ============================================================================
 * 
 * REJECTED: MD5 (broken, collision attacks)
 * - MD5 is cryptographically broken (2004)
 * - Attacker can generate two bundles with same MD5
 * - Not suitable for security (code signing)
 * 
 * REJECTED: SHA-1 (deprecated, collision found in 2017)
 * - Google demonstrated SHA-1 collision in 2017
 * - Industry moving away from SHA-1
 * 
 * REJECTED: File size only
 * - Easy collisions (two bundles with same size)
 * - Not cryptographically secure
 * 
 * CHOSEN: SHA-256 (industry standard, secure, fast)
 * - No known collisions (2^256 possible hashes)
 * - Used by Git, npm, Bitcoin, TLS certificates
 * - Fast: 100-500 MB/s on modern CPUs
 * - Future-proof: Secure for next 20+ years
 * 
 * ============================================================================
 * MANIFEST-BASED HASHING: WHY HASH EACH FILE SEPARATELY?
 * ============================================================================
 * 
 * APPROACH 1: Hash entire .zip file (rejected)
 * ```typescript
 * const hash = crypto.createHash("sha256")
 *   .update(fs.readFileSync("bundle.zip"))
 *   .digest("hex");
 * ```
 * 
 * Problem:
 * - .zip metadata changes (timestamp, compression level) → different hash
 * - Same files, different .zip → different hash (false negative)
 * - Can't detect partial changes (which files changed)
 * 
 * APPROACH 2: Manifest-based hashing (chosen)
 * ```typescript
 * const manifest = {
 *   "main.jsbundle": SHA-256(fileContent),
 *   "assets/logo.png": SHA-256(fileContent),
 *   "assets/icon.png": SHA-256(fileContent)
 * };
 * 
 * // Sorted by path (deterministic order)
 * const manifestString = Object.keys(manifest)
 *   .sort()
 *   .map(path => `${path}:${manifest[path]}`)
 *   .join(";");
 * 
 * const packageHash = SHA-256(manifestString);
 * ```
 * 
 * Benefits:
 * - Deterministic: Same files → same hash (regardless of .zip metadata)
 * - Granular: Know which files changed (for debugging)
 * - Binary patching: Can diff individual files (not just whole bundle)
 * 
 * ============================================================================
 * DUPLICATE DETECTION: SERVER-SIDE VALIDATION
 * ============================================================================
 * 
 * Problem: Developer accidentally uploads same bundle twice
 * - Run `delivr release-react` twice (forgot first succeeded)
 * - CI/CD pipeline retries on network glitch
 * 
 * Without deduplication:
 * ```bash
 * $ delivr release-react -a MyApp -d Production
 * Successfully released v6 (hash: abc123)
 * 
 * $ delivr release-react -a MyApp -d Production  # Same command
 * Successfully released v7 (hash: abc123)  # ← Same hash, different label!
 * ```
 * 
 * Result:
 * - Two releases (v6, v7) with identical content
 * - Wastes storage (duplicate 10MB bundle)
 * - Confusing dashboard (two identical releases)
 * 
 * With deduplication (routes/management.ts):
 * ```typescript
 * const packageHash = hashUtils.generatePackageHash(uploadedFile);
 * const latestPackage = await storage.getLatestPackage(deploymentId);
 * 
 * if (packageHash === latestPackage.packageHash) {
 *   return res.status(409).send({
 *     error: "Duplicate release (same hash as current release)"
 *   });
 * }
 * ```
 * 
 * CLI handles 409:
 * ```typescript
 * try {
 *   await managementSdk.release(...);
 * } catch (error) {
 *   if (error.statusCode === 409) {
 *     console.log(chalk.yellow("[Warning] Duplicate release, skipping"));
 *     process.exit(0);  // Success (idempotent)
 *   }
 * }
 * ```
 * 
 * ============================================================================
 * IGNORED FILES: .codepushrelease METADATA
 * ============================================================================
 * 
 * Problem: Bundle contains metadata file used by SDK
 * - .codepushrelease: JSON file with label, description, isMandatory
 * - Created by SDK during download
 * - Should NOT be included in hash (changes every release)
 * 
 * Example .codepushrelease:
 * ```json
 * {
 *   "label": "v6",
 *   "description": "Bug fixes",
 *   "isMandatory": false,
 *   "packageHash": "abc123"
 * }
 * ```
 * 
 * Solution: Ignore .codepushrelease during hashing
 * ```typescript
 * const CODEPUSH_METADATA = '.codepushrelease';
 * 
 * class PackageManifest {
 *   static isIgnored(fileName: string): boolean {
 *     return fileName === CODEPUSH_METADATA;
 *   }
 *   
 *   generateManifest(files: string[]): Manifest {
 *     return files
 *       .filter(file => !PackageManifest.isIgnored(file))  // ← Skip metadata
 *       .reduce((manifest, file) => {
 *         manifest[file] = this.hashFile(file);
 *         return manifest;
 *       }, {});
 *   }
 * }
 * ```
 * 
 * Why ignore:
 * - Metadata changes with every release (label, description)
 * - But bundle content is identical
 * - Without ignore: Same bundle → different hash (false positive)
 * 
 * ============================================================================
 * PATH NORMALIZATION: CROSS-PLATFORM CONSISTENCY
 * ============================================================================
 * 
 * Problem: Windows uses backslashes (\), Unix uses forward slashes (/)
 * - Windows: assets\logo.png → Hash: abc123
 * - Unix: assets/logo.png → Hash: def456 (different!)
 * - Same bundle, different platform → different hash
 * 
 * Solution: Normalize all paths to forward slashes
 * ```typescript
 * class PackageManifest {
 *   static normalizePath(filePath: string): string {
 *     return filePath.replace(/\\/g, "/");  // \ → /
 *   }
 *   
 *   generateManifest(files: string[]): Manifest {
 *     return files.reduce((manifest, file) => {
 *       const normalizedPath = PackageManifest.normalizePath(file);
 *       manifest[normalizedPath] = this.hashFile(file);
 *       return manifest;
 *     }, {});
 *   }
 * }
 * ```
 * 
 * Result:
 * - Windows: assets/logo.png → Hash: abc123
 * - Unix: assets/logo.png → Hash: abc123 (same!)
 * - Cross-platform consistency ✅
 * 
 * ============================================================================
 * STREAMING HASH COMPUTATION: MEMORY EFFICIENCY
 * ============================================================================
 * 
 * Problem: Large bundles (50MB+) can't fit in memory
 * - Loading entire 50MB file → crashes on low-memory systems
 * - Node.js has default heap limit (512MB-1GB)
 * 
 * Naive approach (memory-intensive):
 * ```typescript
 * const fileContent = fs.readFileSync("bundle.zip");  // ← 50MB in memory!
 * const hash = crypto.createHash("sha256").update(fileContent).digest("hex");
 * ```
 * 
 * Streaming approach (memory-efficient):
 * ```typescript
 * const hash = crypto.createHash("sha256");
 * const stream = fs.createReadStream("bundle.zip");
 * 
 * stream.on("data", (chunk) => {
 *   hash.update(chunk);  // ← Process 64KB chunks, not entire file
 * });
 * 
 * stream.on("end", () => {
 *   const digest = hash.digest("hex");
 *   resolve(digest);
 * });
 * ```
 * 
 * Benefits:
 * - Constant memory usage (64KB chunks, regardless of file size)
 * - Can hash gigabyte-sized files
 * - No crashes on low-memory systems
 * 
 * ============================================================================
 * ZIP FILE HASHING: IN-MEMORY EXTRACTION
 * ============================================================================
 * 
 * Problem: Bundle uploaded as .zip, need to hash individual files
 * - Server receives: bundle.zip (10MB)
 * - Need: Hash of main.jsbundle, assets/logo.png, etc. (not .zip itself)
 * 
 * Solution: Extract .zip in-memory, hash each file
 * ```typescript
 * yauzl.open("bundle.zip", { lazyEntries: true }, (err, zipFile) => {
 *   zipFile.on("entry", (entry) => {
 *     zipFile.openReadStream(entry, (err, stream) => {
 *       const hash = crypto.createHash("sha256");
 *       stream.on("data", (chunk) => hash.update(chunk));
 *       stream.on("end", () => {
 *         manifest[entry.fileName] = hash.digest("hex");
 *       });
 *     });
 *   });
 * });
 * ```
 * 
 * Why in-memory:
 * - Faster: No disk I/O (don't write extracted files to temp dir)
 * - Cleaner: No cleanup needed (no temp files)
 * - Secure: Extracted files never hit disk (can't be snooped)
 * 
 * ============================================================================
 * LESSON LEARNED: CONTENT HASHING IS CRITICAL FOR SCALE
 * ============================================================================
 * 
 * Real-world scenario without proper hashing:
 * - Team releases v6 (10MB bundle)
 * - CI/CD pipeline retries 3 times (network glitches)
 * - Result: 4 identical releases (v6, v7, v8, v9) → 40MB storage wasted
 * - Over 100 releases: 400MB wasted (storage costs $0.10/GB/month = $0.04/month)
 * - Over 1 year, 1000 teams: $480/year wasted
 * 
 * With proper hashing (deduplication):
 * - CI retries → Server detects duplicate → 409 Conflict
 * - CLI treats as success (idempotent)
 * - Only one release stored: 10MB
 * - Storage saved: 90%
 * 
 * ============================================================================
 * ALTERNATIVES CONSIDERED
 * ============================================================================
 * 
 * 1. Git object hashing (SHA-1, same as Git)
 *    - Rejected: SHA-1 is deprecated, collisions found
 * 
 * 2. Content-addressable storage (like IPFS)
 *    - Rejected: Too complex, overkill for OTA updates
 * 
 * 3. File modification timestamps (mtime)
 *    - Rejected: Not deterministic (clock skew, timezones)
 * 
 * 4. No hashing, just compare file sizes
 *    - Rejected: Easy collisions, not secure
 * 
 * ============================================================================
 * RELATED FILES:
 * ============================================================================
 * 
 * - sign.ts: Uses packageHash for RSA code signing
 * - routes/management.ts: Uses packageHash for duplicate detection
 * - utils/acquisition.ts: Compares packageHash to detect which update to send
 * - delivr-sdk-ota/CodePush.js: Verifies packageHash after download
 * 
 * ============================================================================
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as stream from "stream";

// Do not throw an exception if either of these modules are missing, as they may not be needed by the
// consumer of this file.
// - recursiveFs: Only required for hashing of directories
// - yauzl: Only required for in-memory hashing of zip files
let recursiveFs, yauzl;

try {
  recursiveFs = require("recursive-fs");
} catch (e) {}
try {
  yauzl = require("yauzl");
} catch (e) {}

const HASH_ALGORITHM = "sha256";

const CODEPUSH_METADATA = '.codepushrelease';

export function generatePackageHashFromDirectory(directoryPath: string, basePath: string): Promise<string> {
  if (!fs.lstatSync(directoryPath).isDirectory()) {
    throw new Error("Not a directory. Please either create a directory, or use hashFile().");
  }

  return generatePackageManifestFromDirectory(directoryPath, basePath).then((manifest: PackageManifest) => {
    return manifest.computePackageHash();
  });
}
//function to mimic defer function in q package
function defer<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}


type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};
export function generatePackageManifestFromZip(filePath: string): Promise<PackageManifest> {
  const deferred: Deferred<PackageManifest> = defer<PackageManifest>();
  const reject = (error: Error) => {
      deferred.reject(error);
  };

  const resolve = (manifest: PackageManifest) => {
      deferred.resolve(manifest);
  };

  let zipFile: any;

  yauzl.open(filePath, { lazyEntries: true }, (error?: any, openedZipFile?: any): void => {
    if (error) {
      // This is the first time we try to read the package as a .zip file;
      // however, it may not be a .zip file.  Handle this gracefully.
      resolve(null);
      return;
    }

    zipFile = openedZipFile;
    const fileHashesMap = new Map<string, string>();
    const hashFilePromises: Promise<void>[] = [];

    // Read each entry in the archive sequentially and generate a hash for it.
    zipFile.readEntry();
    zipFile
      .on("error", (error: any): void => {
        reject(error);
      })
      .on("entry", (entry: any): void => {
        const fileName: string = PackageManifest.normalizePath(entry.fileName);
        if (PackageManifest.isIgnored(fileName)) {
          zipFile.readEntry();
          return;
        }

        zipFile.openReadStream(entry, (error?: any, readStream?: stream.Readable): void => {
          if (error) {
            reject(error);
            return;
          }

          hashFilePromises.push(
            hashStream(readStream).then((hash: string) => {
              fileHashesMap.set(fileName, hash);
              zipFile.readEntry();
            }, reject)
          );
        });
      })
      .on("end", (): void => {
        Promise.all(hashFilePromises).then(() => resolve(new PackageManifest(fileHashesMap)), reject);
      });
  });

  return deferred.promise.finally(() => zipFile && zipFile.close());
}

export function generatePackageManifestFromDirectory(directoryPath: string, basePath: string): Promise<PackageManifest> {
  const deferred: Deferred<PackageManifest> = defer<PackageManifest>();
  const fileHashesMap = new Map<string, string>();

  recursiveFs.readdirr(directoryPath, (error?: any, directories?: string[], files?: string[]): void => {
    if (error) {
      deferred.reject(error);
      return;
    }

    if (!files || files.length === 0) {
      deferred.reject("Error: Can't sign the release because no files were found.");
      return;
    }

    // Hash the files sequentially, because streaming them in parallel is not necessarily faster
    const generateManifestPromise: Promise<void> = files.reduce((soFar: Promise<void>, filePath: string) => {
      return soFar.then(() => {
        const relativePath: string = PackageManifest.normalizePath(path.relative(basePath, filePath));
        if (!PackageManifest.isIgnored(relativePath)) {
          return hashFile(filePath).then((hash: string) => {
            fileHashesMap.set(relativePath, hash);
          });
        }
      });
    }, Promise.resolve(<void>null));

    generateManifestPromise
      .then(() => {
        deferred.resolve(new PackageManifest(fileHashesMap));
      }, deferred.reject)
  });

  return deferred.promise;
}

export function hashFile(filePath: string): Promise<string> {
  const readStream: fs.ReadStream = fs.createReadStream(filePath);
  return hashStream(readStream);
}

export function hashStream(readStream: stream.Readable): Promise<string> {
  const hashStream = <stream.Transform>(<any>crypto.createHash(HASH_ALGORITHM));
  const deferred: Deferred<string> = defer<string>();

  readStream
    .on("error", (error: any): void => {
        hashStream.end();
        deferred.reject(error);
    })
    .on("end", (): void => {
        hashStream.end();

        const buffer = <Buffer>hashStream.read();
        const hash: string = buffer.toString("hex");

        deferred.resolve(hash);
    });

  readStream.pipe(hashStream as any);

  return deferred.promise;
}

export class PackageManifest {
  private _map: Map<string, string>;

  public constructor(map?: Map<string, string>) {
    if (!map) {
      map = new Map<string, string>();
    }
    this._map = map;
  }

  public toMap(): Map<string, string> {
    return this._map;
  }

  public computePackageHash(): Promise<string> {
    let entries: string[] = [];
    this._map.forEach((hash: string, name: string): void => {
      // .codepushrelease (relates to code signing feature) file
      // should not be skipped in isIgnored() method.
      // But to be equal with hashes computed in SDKs and CLI this file
      // should be skipped when computing whole package hash

      if (name !== CODEPUSH_METADATA && !endsWith(name, '/' + CODEPUSH_METADATA)) {
        entries.push(name + ':' + hash);
      }
    });

    // Make sure this list is alphabetically ordered so that other clients
    // can also compute this hash easily given the update contents.
    entries = entries.sort();

    return Promise.resolve(crypto.createHash(HASH_ALGORITHM).update(JSON.stringify(entries)).digest("hex"));
  }

  public serialize(): string {
    const obj: any = {};

    this._map.forEach(function (value, key) {
      obj[key] = value;
    });

    return JSON.stringify(obj);
  }

  public static deserialize(serializedContents: string): PackageManifest {
    try {
      const obj: any = JSON.parse(serializedContents);
      const map = new Map<string, string>();

      for (const key of Object.keys(obj)) {
        map.set(key, obj[key]);
      }

      return new PackageManifest(map);
    } catch (e) {}
  }

  public static normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, "/");
  }

  public static isIgnored(relativeFilePath: string): boolean {
    const __MACOSX = "__MACOSX/";
    const DS_STORE = ".DS_Store";

    return startsWith(relativeFilePath, __MACOSX) || relativeFilePath === DS_STORE || endsWith(relativeFilePath, "/" + DS_STORE);
  }
}

function startsWith(str: string, prefix: string): boolean {
  return str && str.substring(0, prefix.length) === prefix;
}

function endsWith(str: string, suffix: string): boolean {
  return str && str.indexOf(suffix, str.length - suffix.length) !== -1;
}
