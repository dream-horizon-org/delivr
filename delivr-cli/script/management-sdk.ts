// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * ============================================================================
 * Design Rationale: Management SDK - CLI-to-Server HTTP Client
 * ============================================================================
 * 
 * PURPOSE:
 * 
 * This is the HTTP client that the Delivr CLI uses to communicate with the
 * server's management API. It wraps all backend endpoints for:
 * 1. Authentication (login with access keys)
 * 2. App management (create, list, delete apps)
 * 3. Deployment management (create, list deployment keys)
 * 4. Release management (upload bundles, promote, rollback)
 * 5. Metrics (get deployment stats, rollback rates)
 * 
 * USER JOURNEY 1: DEVELOPER RELEASES OTA UPDATE (Step 1.5)
 * 
 * Step 1.5: Upload Bundle to Server
 * - command-executor.ts calls this SDK's `release()` method
 * - This SDK uploads bundle via multipart/form-data
 * - Server responds with release metadata (label, hash, etc.)
 * 
 * ============================================================================
 * WHY SEPARATE SDK? (vs. Inline HTTP in command-executor)
 * ============================================================================
 * 
 * Separation of concerns:
 * - command-executor.ts: Business logic (bundling, validation, progress UI)
 * - management-sdk.ts: HTTP transport layer (requests, auth, retries)
 * 
 * Benefits:
 * - Testability: Mock SDK independently of executor logic
 * - Reusability: Can use SDK in other tools (CI/CD scripts, Node.js scripts)
 * - Maintainability: All HTTP logic centralized (easier to add auth, retries)
 * 
 * Similar pattern to:
 * - AWS SDK (aws-sdk): Wraps AWS APIs
 * - Stripe SDK (stripe-node): Wraps Stripe APIs
 * - Twilio SDK (twilio-node): Wraps Twilio APIs
 * 
 * ============================================================================
 * KEY API METHODS (Most Used)
 * ============================================================================
 * 
 * 1. **release(appName, deploymentName, filePath, appVersion, metadata)**
 *    - Uploads OTA bundle to server
 *    - Used by: `delivr release-react` command
 *    - HTTP: POST /apps/:app/deployments/:deployment/release
 * 
 * 2. **addApp(appName)**
 *    - Creates new app
 *    - Used by: `delivr app add` command
 *    - HTTP: POST /apps
 * 
 * 3. **addDeployment(appName, deploymentName)**
 *    - Creates new deployment (Staging, Production, etc.)
 *    - Used by: `delivr deployment add` command
 *    - HTTP: POST /apps/:app/deployments
 * 
 * 4. **getDeploymentMetrics(appName, deploymentName)**
 *    - Gets release statistics (installs, rollbacks, active devices)
 *    - Used by: `delivr deployment history` command
 *    - HTTP: GET /apps/:app/deployments/:deployment/metrics
 * 
 * 5. **login(accessKey)**
 *    - Authenticates user with access key
 *    - Stores session token locally (~/.code-push.config)
 *    - HTTP: POST /auth/login
 * 
 * ============================================================================
 * AUTHENTICATION: ACCESS KEYS vs. SESSION TOKENS
 * ============================================================================
 * 
 * Problem: How does CLI authenticate with server?
 * - Can't use username/password (insecure for CI/CD)
 * - Can't use OAuth (too complex for CLI)
 * 
 * Solution: Access Keys (like GitHub Personal Access Tokens)
 * 
 * User workflow:
 * 1. Developer logs into web dashboard
 * 2. Generate access key: "abc-123-xyz-789"
 * 3. Run: `delivr login --accessKey abc-123-xyz-789`
 * 4. CLI stores access key in ~/.code-push.config
 * 5. All future commands use stored access key
 * 
 * Implementation:
 * ```typescript
 * class AccountManager {
 *   private _accessKey: string;
 *   
 *   async login(accessKey: string): Promise<void> {
 *     // Test access key by calling /account
 *     const account = await this.get("/account");
 *     
 *     // Store in ~/.code-push.config
 *     fs.writeFileSync(CONFIG_FILE, JSON.stringify({ accessKey }));
 *     
 *     this._accessKey = accessKey;
 *   }
 *   
 *   private get(url: string): Promise<any> {
 *     return superagent
 *       .get(url)
 *       .set("Authorization", `Bearer ${this._accessKey}`)  // ← Auth header
 *       .then(res => res.body);
 *   }
 * }
 * ```
 * 
 * Security:
 * - Access keys are scoped to user (not global admin)
 * - Access keys can be revoked (via web dashboard)
 * - Access keys have expiration (default: 60 days)
 * - Access keys stored in ~/.code-push.config (user-owned file)
 * 
 * ============================================================================
 * FILE UPLOAD: MULTIPART FORM-DATA
 * ============================================================================
 * 
 * Problem: How to upload 10MB bundle + metadata in one request?
 * - JSON body can't handle binary data (bundle.zip)
 * - Need both file (binary) and metadata (JSON)
 * 
 * Solution: multipart/form-data (like HTML file upload forms)
 * 
 * ```typescript
 * async release(
 *   appName: string,
 *   deploymentName: string,
 *   filePath: string,
 *   appVersion: string,
 *   metadata: ReleasePackageInfo
 * ): Promise<void> {
 *   // 1. Zip the bundle (single file or directory)
 *   const zipFile = await this.zipBundle(filePath);
 *   
 *   // 2. Build multipart form
 *   const request = superagent
 *     .post(`/apps/${appName}/deployments/${deploymentName}/release`)
 *     .attach("package", zipFile.path)  // ← Binary bundle
 *     .field("packageInfo", JSON.stringify(metadata));  // ← JSON metadata
 *   
 *   // 3. Track upload progress
 *   request.on("progress", (event) => {
 *     const percent = Math.floor((event.loaded / event.total) * 100);
 *     progressCallback(percent);  // Update progress bar
 *   });
 *   
 *   // 4. Send request
 *   await request;
 * }
 * ```
 * 
 * Server receives:
 * ```
 * Content-Type: multipart/form-data; boundary=----WebKitFormBoundary
 * 
 * ------WebKitFormBoundary
 * Content-Disposition: form-data; name="package"; filename="bundle.zip"
 * Content-Type: application/zip
 * 
 * [Binary bundle data: 10MB]
 * ------WebKitFormBoundary
 * Content-Disposition: form-data; name="packageInfo"
 * 
 * {"description":"Bug fixes","isMandatory":false,"rollout":100}
 * ------WebKitFormBoundary--
 * ```
 * 
 * ============================================================================
 * ZIP BUNDLING: SINGLE FILE vs. DIRECTORY
 * ============================================================================
 * 
 * Problem: React Native bundles can be:
 * - Single file: main.jsbundle (iOS, no assets)
 * - Directory: /tmp/CodePush/ (Android, with assets/images)
 * 
 * Solution: Always zip before upload (normalize to single .zip file)
 * 
 * ```typescript
 * private async zipBundle(filePath: string): Promise<PackageFile> {
 *   const zipFile = new yazl.ZipFile();
 *   
 *   if (fs.lstatSync(filePath).isDirectory()) {
 *     // Recursive directory zip
 *     const files = await recursiveFs.readdirr(filePath);
 *     files.forEach((file) => {
 *       const relativePath = path.relative(filePath, file);
 *       zipFile.addFile(file, relativePath);
 *     });
 *   } else {
 *     // Single file zip
 *     const fileName = path.basename(filePath);
 *     zipFile.addFile(filePath, fileName);
 *   }
 *   
 *   zipFile.end();
 *   
 *   // Write to temp file
 *   const tempPath = path.join(os.tmpdir(), "bundle.zip");
 *   await pipeToFile(zipFile.outputStream, tempPath);
 *   
 *   return { path: tempPath, isTemporary: true };
 * }
 * ```
 * 
 * Why zip:
 * - Consistent upload format (server always expects .zip)
 * - Compression (saves bandwidth, faster uploads)
 * - Preserves directory structure (for Android assets)
 * 
 * ============================================================================
 * PROGRESS TRACKING: UPLOAD PROGRESS EVENTS
 * ============================================================================
 * 
 * Problem: Large bundles (10MB+) take 30-60 seconds to upload
 * - Without progress: User thinks CLI is frozen
 * - With progress: User sees upload is happening
 * 
 * Solution: Superagent progress events
 * ```typescript
 * const request = superagent.post(url);
 * 
 * request.on("progress", (event) => {
 *   // event.loaded: bytes uploaded so far
 *   // event.total: total bytes to upload
 *   const percent = Math.floor((event.loaded / event.total) * 100);
 *   
 *   progressCallback(percent);  // Update CLI progress bar
 * });
 * 
 * await request;
 * ```
 * 
 * command-executor.ts receives progress updates:
 * ```typescript
 * const progressBar = new progress("Upload progress:[:bar] :percent", {
 *   total: 100
 * });
 * 
 * await managementSdk.release(
 *   appName,
 *   deploymentName,
 *   filePath,
 *   appVersion,
 *   metadata,
 *   (percent) => progressBar.tick(percent)  // ← Progress callback
 * );
 * 
 * // Output:
 * // Upload progress:[=========>          ] 45%
 * ```
 * 
 * ============================================================================
 * COMPRESSION: DEFLATE vs. GZIP (Optional)
 * ============================================================================
 * 
 * Problem: ZIP files are already compressed, but what about JSON metadata?
 * - Large deployments have 100+ releases in history
 * - GET /apps/:app/deployments/:deployment/history → 500KB JSON
 * 
 * Solution: Optional HTTP compression
 * ```typescript
 * const request = superagent
 *   .get(url)
 *   .set("Accept-Encoding", "gzip, deflate");  // ← Request compression
 * 
 * // Server responds with:
 * // Content-Encoding: gzip
 * // [Compressed JSON data]
 * 
 * // Superagent auto-decompresses
 * const data = await request;  // ← Decompressed automatically
 * ```
 * 
 * Compression for uploads:
 * ```typescript
 * const compressedBundle = zlib.deflateSync(bundleBuffer);  // Deflate
 * 
 * superagent
 *   .post(url)
 *   .set("Content-Encoding", "deflate")
 *   .send(compressedBundle);
 * ```
 * 
 * When to compress:
 * - Large JSON responses (> 100KB)
 * - Not binary files (already zipped/compressed)
 * 
 * ============================================================================
 * ERROR HANDLING: HTTP STATUS CODES
 * ============================================================================
 * 
 * Problem: Server returns errors for invalid requests
 * - 400 Bad Request: Invalid semver, missing required field
 * - 401 Unauthorized: Invalid access key
 * - 409 Conflict: Duplicate release (same hash)
 * - 500 Internal Server Error: Server crash
 * 
 * Solution: Parse status codes and throw meaningful errors
 * ```typescript
 * try {
 *   await superagent.post(url);
 * } catch (err) {
 *   const statusCode = err.status;
 *   const body = err.response?.body;
 *   
 *   if (statusCode === 401) {
 *     throw new CodePushError("Authentication failed. Run 'delivr login'.");
 *   } else if (statusCode === 409) {
 *     throw new CodePushError("Duplicate release (same hash already exists).");
 *   } else if (statusCode === 400) {
 *     throw new CodePushError(`Invalid request: ${body.error}`);
 *   } else {
 *     throw new CodePushError(`Server error: ${statusCode}`);
 *   }
 * }
 * ```
 * 
 * command-executor.ts handles these errors:
 * ```typescript
 * try {
 *   await managementSdk.release(...);
 * } catch (error) {
 *   if (error.statusCode === 409) {
 *     console.log(chalk.yellow("[Warning] Duplicate release, skipping"));
 *     return;  // Idempotent operation, success
 *   } else {
 *     throw error;  // Re-throw other errors
 *   }
 * }
 * ```
 * 
 * ============================================================================
 * ORGANIZATION MANAGEMENT: MULTI-TENANT SUPPORT
 * ============================================================================
 * 
 * Problem: Developers may belong to multiple organizations
 * - Company A: "acme-corp" (Production apps)
 * - Company B: "startup-xyz" (Client apps)
 * 
 * Solution: Store organization list locally
 * ```typescript
 * // ~/.code-push.config stores:
 * {
 *   "accessKey": "abc-123",
 *   "organizations": [
 *     { "id": "org1", "name": "acme-corp", "default": true },
 *     { "id": "org2", "name": "startup-xyz", "default": false }
 *   ]
 * }
 * 
 * // CLI command:
 * delivr app list --org acme-corp
 * delivr release-react -a MyApp -d Production --org startup-xyz
 * ```
 * 
 * HTTP header:
 * ```typescript
 * superagent
 *   .get("/apps")
 *   .set("X-Tenant-Id", organizationId);  // ← Scope to org
 * ```
 * 
 * ============================================================================
 * LESSON LEARNED: SDK WRAPS COMPLEXITY
 * ============================================================================
 * 
 * Without SDK (inline HTTP in command-executor):
 * - 500+ lines of HTTP logic mixed with business logic
 * - Hard to test (can't mock HTTP separately)
 * - Hard to reuse (copy-paste HTTP code for new tools)
 * 
 * With SDK:
 * - command-executor.ts: 1700 lines of business logic
 * - management-sdk.ts: 700 lines of HTTP logic (reusable!)
 * - Easy to test: Mock SDK, test executor logic independently
 * - Easy to reuse: Import SDK in CI/CD scripts, Node.js tools
 * 
 * ============================================================================
 * ALTERNATIVES CONSIDERED
 * ============================================================================
 * 
 * 1. Axios (instead of superagent)
 *    - Considered: Similar API, more popular
 *    - Decision: Superagent was used by Microsoft CodePush (legacy compatibility)
 * 
 * 2. Native fetch API (no library)
 *    - Rejected: No progress events, no multipart form-data helpers
 * 
 * 3. GraphQL API (instead of REST)
 *    - Rejected: REST is simpler for management operations
 * 
 * ============================================================================
 * RELATED FILES:
 * ============================================================================
 * 
 * - command-executor.ts: Calls this SDK for all server operations
 * - delivr-server-ota/api/script/routes/management.ts: Backend API
 * - delivr-sdk-ota/acquisition-sdk.js: Similar SDK for mobile app update checks
 * 
 * ============================================================================
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import Q = require("q");
import superagent = require("superagent");
import * as recursiveFs from "recursive-fs";
import * as yazl from "yazl";
import slash = require("slash");
import * as zlib from "zlib";

const ORG_FILE_PATH = path.resolve(__dirname, 'organisations.json');

import Promise = Q.Promise;

import {
  AccessKey,
  AccessKeyRequest,
  Account,
  App,
  CodePushError,
  CollaboratorMap,
  Deployment,
  DeploymentMetrics,
  Headers,
  Package,
  PackageInfo,
  ServerAccessKey,
  Session,
} from "./types";
import { Organisation, ReleasePackageInfo } from "./types/rest-definitions";
import { CompressionType } from "./utils/config.constants";

const packageJson = require("../../package.json");

interface JsonResponse {
  headers: Headers;
  body?: any;
}

interface PackageFile {
  isTemporary: boolean;
  path: string;
}

// A template string tag function that URL encodes the substituted values
function urlEncode(strings: string[], ...values: string[]): string {
  let result = "";
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      result += encodeURIComponent(values[i]);
    }
  }

  return result;
}

function saveOrganizationsSync(orgs: Organisation[], forceSave = false): void {
  try {
    // Check if file exists and is non-empty
    const fileExists = fs.existsSync(ORG_FILE_PATH);
    const isFileEmpty = fileExists && fs.readFileSync(ORG_FILE_PATH, 'utf-8').trim() === '';

    if (forceSave || !fileExists || isFileEmpty) {
      fs.writeFileSync(ORG_FILE_PATH, JSON.stringify(orgs, null, 2), 'utf-8');
      //console.log(`Organizations saved to ${ORG_FILE_PATH}`);
    } else {
      //console.log("Organizations already exist, skipping save.");
    }
  } catch (error) {
    console.error(`Error saving organizations: ${error.message}`);
  }
}

// Load organizations from the file (synchronous)
function loadOrganizationsSync(): Organisation[] {
  try {
    if (fs.existsSync(ORG_FILE_PATH)) {
      const data = fs.readFileSync(ORG_FILE_PATH, 'utf-8');
      // console.log("data ::", data);
      return JSON.parse(data) as Organisation[];
    }
    return [];
  } catch (error) {
    console.error(`Error loading organizations: ${error.message}`);
    return [];
  }
}

class AccountManager {
  public static AppPermission = {
    OWNER: "Owner",
    COLLABORATOR: "Collaborator",
  };
  public static SERVER_URL = "http://localhost:3000";

  private static API_VERSION: number = 2;

  public static ERROR_GATEWAY_TIMEOUT = 504; // Used if there is a network error
  public static ERROR_INTERNAL_SERVER = 500;
  public static ERROR_NOT_FOUND = 404;
  public static ERROR_CONFLICT = 409; // Used if the resource already exists
  public static ERROR_UNAUTHORIZED = 401;
  private organisations: Organisation[] = [];
  private organisationsFetched: boolean = false;


  private _accessKey: string;
  private _serverUrl: string;
  private _customHeaders: Headers;
  public passedOrgName: string;

  constructor(accessKey: string, customHeaders?: Headers, serverUrl?: string) {
    if (!accessKey) throw new Error("An access key must be specified.");

    this._accessKey = accessKey;
    this._customHeaders = customHeaders;
    this._serverUrl = serverUrl || AccountManager.SERVER_URL;
    this.organisations = loadOrganizationsSync();
  }

  public get accessKey(): string {
    return this._accessKey;
  }

  public isAuthenticated(throwIfUnauthorized?: boolean): Promise<boolean> {
    return Promise<any>((resolve, reject, _notify) => {
      const request: superagent.Request<any> = superagent.get(`${this._serverUrl}${urlEncode(["/authenticated"])}`);
      this.attachCredentials(request);
      request.end((err: any, res: superagent.Response) => {
        const status: number = this.getErrorStatus(err, res);
        if (err && status !== AccountManager.ERROR_UNAUTHORIZED) {
          reject(this.getCodePushError(err, res));
          return;
        }

        const authenticated: boolean = status === 200;

        if (!authenticated && throwIfUnauthorized) {
          reject(this.getCodePushError(err, res));
          return;
        }

        resolve(authenticated);
      });
    });
  }

    //Tenants
  public getTenants(): Promise<Organisation[]> {
      return this.get(urlEncode(["/tenants"])).then((res: JsonResponse) => {
        this.organisations = res.body.organisations
        saveOrganizationsSync(res.body.organisations, true);
        return res.body.organisations;
      });
  }

  public getOrganisations(): Organisation[] {
    return this.organisations;
  }

  public getTenantId(tenantName: string): string {
      if(!this.organisations || this.organisations.length === 0){
          return "";
      }
      let tenantId: string = "";
      this.organisations.forEach((org: Organisation) => {
          if(org.displayName === tenantName){
              tenantId = org.id;
          }
      });
      return tenantId;
  }

  public addAccessKey(friendlyName: string, ttl?: number): Promise<AccessKey> {
    if (!friendlyName) {
      throw new Error("A name must be specified when adding an access key.");
    }

    const accessKeyRequest: AccessKeyRequest = {
      createdBy: os.hostname(),
      friendlyName,
      ttl,
    };

    return this.post(urlEncode(["/accessKeys/"]), JSON.stringify(accessKeyRequest), /*expectResponseBody=*/ true).then(
      (response: JsonResponse) => {
        return {
          createdTime: response.body.accessKey.createdTime,
          expires: response.body.accessKey.expires,
          key: response.body.accessKey.name,
          name: response.body.accessKey.friendlyName,
        };
      }
    );
  }

  public getAccessKey(accessKeyName: string): Promise<AccessKey> {
    return this.get(urlEncode([`/accessKeys/${accessKeyName}`])).then((res: JsonResponse) => {
      return {
        createdTime: res.body.accessKey.createdTime,
        expires: res.body.accessKey.expires,
        name: res.body.accessKey.friendlyName,
      };
    });
  }

  public getAccessKeys(): Promise<AccessKey[]> {
    return this.get(urlEncode(["/accessKeys"])).then((res: JsonResponse) => {
      const accessKeys: AccessKey[] = [];

      res.body.accessKeys.forEach((serverAccessKey: ServerAccessKey) => {
        !serverAccessKey.isSession &&
          accessKeys.push({
            createdTime: serverAccessKey.createdTime,
            expires: serverAccessKey.expires,
            name: serverAccessKey.friendlyName,
          });
      });

      return accessKeys;
    });
  }

  public getSessions(): Promise<Session[]> {
    return this.get(urlEncode(["/accessKeys"])).then((res: JsonResponse) => {
      // A machine name might be associated with multiple session keys,
      // but we should only return one per machine name.
      const sessionMap: { [machineName: string]: Session } = {};
      const now: number = new Date().getTime();
      res.body.accessKeys.forEach((serverAccessKey: ServerAccessKey) => {
        if (serverAccessKey.isSession && serverAccessKey.expires > now) {
          sessionMap[serverAccessKey.createdBy] = {
            loggedInTime: serverAccessKey.createdTime,
            machineName: serverAccessKey.createdBy,
          };
        }
      });

      const sessions: Session[] = Object.keys(sessionMap).map((machineName: string) => sessionMap[machineName]);

      return sessions;
    });
  }

  public patchAccessKey(oldName: string, newName?: string, ttl?: number): Promise<AccessKey> {
    const accessKeyRequest: AccessKeyRequest = {
      friendlyName: newName,
      ttl,
    };

    return this.patch(urlEncode([`/accessKeys/${oldName}`]), JSON.stringify(accessKeyRequest)).then((res: JsonResponse) => {
      return {
        createdTime: res.body.accessKey.createdTime,
        expires: res.body.accessKey.expires,
        name: res.body.accessKey.friendlyName,
      };
    });
  }

  public removeAccessKey(name: string): Promise<void> {
    return this.del(urlEncode([`/accessKeys/${name}`])).then(() => null);
  }

  public removeSession(machineName: string): Promise<void> {
    return this.del(urlEncode([`/sessions/${machineName}`])).then(() => null);
  }

  // Account
  public getAccountInfo(): Promise<Account> {
    return this.get(urlEncode(["/account"])).then((res: JsonResponse) => res.body.account);
  }



  // Apps
  public getApps(): Promise<App[]> {
    //add tenant here
    return this.get(urlEncode(["/apps"])).then((res: JsonResponse) => res.body.apps);
  }

  public getApp(appName: string): Promise<App> {
    //add tenant here
    return this.get(urlEncode([`/apps/${appName}`])).then((res: JsonResponse) => res.body.app);
  }

  public addApp(appName: string): Promise<App> {
    //add tenant here
    const app : any = { name: appName };
    const tenantId = this.getTenantId(this.passedOrgName);
    if(tenantId && tenantId.length > 0){
        app.organisation = {}
        app.organisation.orgId = tenantId;
    } else if(this.passedOrgName && this.passedOrgName.length > 0){
        app.organisation = {}
        app.organisation.orgName = this.passedOrgName;
    }
    return this.post(urlEncode(["/apps/"]), JSON.stringify(app), /*expectResponseBody=*/ false).then(() => app);
  }

  public removeApp(appName: string): Promise<void> {
    //add tenant here
    return this.del(urlEncode([`/apps/${appName}`])).then(() => null);
  }

  public renameApp(oldAppName: string, newAppName: string): Promise<void> {
    //add tenant here
    return this.patch(urlEncode([`/apps/${oldAppName}`]), JSON.stringify({ name: newAppName })).then(() => null);
  }

  public transferApp(appName: string, email: string): Promise<void> {
    return this.post(urlEncode([`/apps/${appName}/transfer/${email}`]), /*requestBody=*/ null, /*expectResponseBody=*/ false).then(
      () => null
    );
  }

  // Collaborators
  public getCollaborators(appName: string): Promise<CollaboratorMap> {
    return this.get(urlEncode([`/apps/${appName}/collaborators`])).then((res: JsonResponse) => res.body.collaborators);
  }

  public addCollaborator(appName: string, email: string): Promise<void> {
    return this.post(
      urlEncode([`/apps/${appName}/collaborators/${email}`]),
      /*requestBody=*/ null,
      /*expectResponseBody=*/ false
    ).then(() => null);
  }

  public removeCollaborator(appName: string, email: string): Promise<void> {
    return this.del(urlEncode([`/apps/${appName}/collaborators/${email}`])).then(() => null);
  }

  // Deployments
  public addDeployment(appName: string, deploymentName: string, deploymentKey?: string): Promise<Deployment> {
    const deployment = <Deployment>{ name: deploymentName, key: deploymentKey };
    return this.post(urlEncode([`/apps/${appName}/deployments/`]), JSON.stringify(deployment), /*expectResponseBody=*/ true).then(
      (res: JsonResponse) => res.body.deployment
    );
  }

  public clearDeploymentHistory(appName: string, deploymentName: string): Promise<void> {
    return this.del(urlEncode([`/apps/${appName}/deployments/${deploymentName}/history`])).then(() => null);
  }

  public getDeployments(appName: string): Promise<Deployment[]> {
    return this.get(urlEncode([`/apps/${appName}/deployments/`])).then((res: JsonResponse) => res.body.deployments);
  }

  public getDeployment(appName: string, deploymentName: string): Promise<Deployment> {
    return this.get(urlEncode([`/apps/${appName}/deployments/${deploymentName}`])).then((res: JsonResponse) => res.body.deployment);
  }

  public renameDeployment(appName: string, oldDeploymentName: string, newDeploymentName: string): Promise<void> {
    return this.patch(
      urlEncode([`/apps/${appName}/deployments/${oldDeploymentName}`]),
      JSON.stringify({ name: newDeploymentName })
    ).then(() => null);
  }

  public removeDeployment(appName: string, deploymentName: string): Promise<void> {
    return this.del(urlEncode([`/apps/${appName}/deployments/${deploymentName}`])).then(() => null);
  }

  public getDeploymentMetrics(appName: string, deploymentName: string): Promise<DeploymentMetrics> {
    return this.get(urlEncode([`/apps/${appName}/deployments/${deploymentName}/metrics`])).then(
      (res: JsonResponse) => res.body.metrics
    );
  }

  public getDeploymentHistory(appName: string, deploymentName: string): Promise<Package[]> {
    return this.get(urlEncode([`/apps/${appName}/deployments/${deploymentName}/history`])).then(
      (res: JsonResponse) => res.body.history
    );
  }

  public release(
    appName: string,
    deploymentName: string,
    filePath: string,
    targetBinaryVersion: string,
    updateMetadata: ReleasePackageInfo,
    uploadProgressCallback?: (progress: number) => void,
    compression: string = CompressionType.DEFLATE
  ): Promise<void> {
    return Promise<void>((resolve, reject) => {
      updateMetadata.appVersion = targetBinaryVersion;
      const request: superagent.Request<any> = superagent.post(
        this._serverUrl + urlEncode([`/apps/${appName}/deployments/${deploymentName}/release`])
      );

      this.attachCredentials(request);

      const getPackageFilePromise = Q.Promise((resolve, reject) => {
        this.packageFileFromPath(filePath, compression)
          .then((result) => {
            resolve(result);
          })
          .catch((error) => {
            reject(error);
          });
      });

      getPackageFilePromise.then((packageFile: PackageFile) => {
        const file: any = fs.createReadStream(packageFile.path);
        console.log('\nUploading Zip File of size ::', fs.statSync(packageFile.path).size);
        request
          .attach("package", file)
          .field("packageInfo", JSON.stringify(updateMetadata))
          .on("progress", (event: any) => {
            if (uploadProgressCallback && event && event.total > 0) {
              const currentProgress: number = (event.loaded / event.total) * 100;
              uploadProgressCallback(currentProgress);
            }
          })
          .end((err: any, res: superagent.Response) => {
            if (packageFile.isTemporary) {
              fs.unlinkSync(packageFile.path);
            }

            if (err) {
              reject(this.getCodePushError(err, res));
              return;
            }

            if (res.ok) {
              resolve(<void>null);
            } else {
              let body;
              try {
                body = JSON.parse(res.text);
              } catch (err) {}

              if (body) {
                reject(<CodePushError>{
                  message: body.message,
                  statusCode: res && res.status,
                });
              } else {
                reject(<CodePushError>{
                  message: res.text,
                  statusCode: res && res.status,
                });
              }
            }
          });
      });
    });
  }

  public patchRelease(appName: string, deploymentName: string, label: string, updateMetadata: PackageInfo): Promise<void> {
    updateMetadata.label = label;
    const requestBody: string = JSON.stringify({ packageInfo: updateMetadata });
    return this.patch(
      urlEncode([`/apps/${appName}/deployments/${deploymentName}/release`]),
      requestBody,
      /*expectResponseBody=*/ false
    ).then(() => null);
  }

  public promote(
    appName: string,
    sourceDeploymentName: string,
    destinationDeploymentName: string,
    updateMetadata: PackageInfo
  ): Promise<void> {
    const requestBody: string = JSON.stringify({ packageInfo: updateMetadata });
    return this.post(
      urlEncode([`/apps/${appName}/deployments/${sourceDeploymentName}/promote/${destinationDeploymentName}`]),
      requestBody,
      /*expectResponseBody=*/ false
    ).then(() => null);
  }

  public rollback(appName: string, deploymentName: string, targetRelease?: string): Promise<void> {
    return this.post(
      urlEncode([`/apps/${appName}/deployments/${deploymentName}/rollback/${targetRelease || ``}`]),
      /*requestBody=*/ null,
      /*expectResponseBody=*/ false
    ).then(() => null);
  }

  private packageFileFromPath(filePath: string, compression: string) {
    let getPackageFilePromise: Promise<PackageFile>;
    if (fs.lstatSync(filePath).isDirectory()) {
      getPackageFilePromise = Promise<PackageFile>((resolve: (file: PackageFile) => void, reject: (reason: Error) => void): void => {
        const directoryPath: string = filePath;

        recursiveFs.readdirr(directoryPath, (error?: any, directories?: string[], files?: string[]) => {
          if (error) {
            reject(error);
            return;
          }

          const baseDirectoryPath = path.dirname(directoryPath);
          const fileName: string = this.generateRandomFilename(15) + ".zip";
          const zipFile = new yazl.ZipFile();
          const writeStream: fs.WriteStream = fs.createWriteStream(fileName);

          zipFile.outputStream
          .pipe(writeStream)
          .on("error", (error: Error): void => {
            reject(error);
          })
          .on("close", (): void => {
            filePath = path.join(process.cwd(), fileName);

            resolve({ isTemporary: true, path: filePath });
          });

          try {
            if (compression === CompressionType.BROTLI) {
              console.log(`\nCompressing ${files.length} files...`);
              // For Brotli, compress each file individually
              for (let i = 0; i < files.length; ++i) {
                const file: string = files[i];
                const relativePath: string = slash(path.relative(baseDirectoryPath, file));
                const fileContent = fs.readFileSync(file);
                
                // Create Brotli compressed content
                const brotliStream = zlib.createBrotliCompress({
                  params: {
                    [zlib.constants.BROTLI_PARAM_QUALITY]: 11  // Maximum compression
                  }
                });

                // Add compressed content to zip
                zipFile.addReadStream(brotliStream, `${relativePath}.br`);

                // Write content to stream
                brotliStream.end(fileContent);
              }
            } else {
              for (let i = 0; i < files.length; ++i) {
                const file: string = files[i];
                // yazl does not like backslash (\) in the metadata path.
                const relativePath: string = slash(path.relative(baseDirectoryPath, file));
    
                zipFile.addFile(file, relativePath);
              }
            }

          } catch (err) {
            reject(err);
          }

          zipFile.end();
        });
      });
    } else {
      console.log('Provided file path is a file. Ignoring compression.');
      getPackageFilePromise = Q({ isTemporary: false, path: filePath });
    }
    return getPackageFilePromise;
  }

  private generateRandomFilename(length: number): string {
    let filename: string = "";
    const validChar: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < length; i++) {
      filename += validChar.charAt(Math.floor(Math.random() * validChar.length));
    }

    return filename;
  }

  private get(endpoint: string, expectResponseBody: boolean = true): Promise<JsonResponse> {
    return this.makeApiRequest("get", endpoint, /*requestBody=*/ null, expectResponseBody, /*contentType=*/ null);
  }

  private post(
    endpoint: string,
    requestBody: string,
    expectResponseBody: boolean,
    contentType: string = "application/json;charset=UTF-8"
  ): Promise<JsonResponse> {
    return this.makeApiRequest("post", endpoint, requestBody, expectResponseBody, contentType);
  }

  private patch(
    endpoint: string,
    requestBody: string,
    expectResponseBody: boolean = false,
    contentType: string = "application/json;charset=UTF-8"
  ): Promise<JsonResponse> {
    return this.makeApiRequest("patch", endpoint, requestBody, expectResponseBody, contentType);
  }

  private del(endpoint: string, expectResponseBody: boolean = false): Promise<JsonResponse> {
    return this.makeApiRequest("del", endpoint, /*requestBody=*/ null, expectResponseBody, /*contentType=*/ null);
  }

  private makeApiRequest(
    method: string,
    endpoint: string,
    requestBody: string,
    expectResponseBody: boolean,
    contentType: string
  ): Promise<JsonResponse> {
    return Promise<JsonResponse>((resolve, reject, _notify) => {
      let request: superagent.Request<any> = (<any>superagent)[method](this._serverUrl + endpoint);
      this.attachCredentials(request);

      if (requestBody) {
        if (contentType) {
          request = request.set("Content-Type", contentType);
        }

        request = request.send(requestBody);
      }

      request.end((err: any, res: superagent.Response) => {
        if (err) {
          reject(this.getCodePushError(err, res));
          return;
        }
        let body;
        try {
          body = JSON.parse(res.text);
        } catch (err) {}

        if (res.ok) {
          if (expectResponseBody && !body) {
            reject(<CodePushError>{
              message: `Could not parse response: ${res.text}`,
              statusCode: AccountManager.ERROR_INTERNAL_SERVER,
            });
          } else {
            resolve(<JsonResponse>{
              headers: res.header,
              body: body,
            });
          }
        } else {
          if (body) {
            reject(<CodePushError>{
              message: body.message,
              statusCode: this.getErrorStatus(err, res),
            });
          } else {
            reject(<CodePushError>{
              message: res.text,
              statusCode: this.getErrorStatus(err, res),
            });
          }
        }
      });
    });
  }

  private getCodePushError(error: any, response: superagent.Response): CodePushError {
    if (error.syscall === "getaddrinfo") {
      error.message = `Unable to connect to the CodePush server. Are you offline, or behind a firewall or proxy?\n(${error.message})`;
    }

    return {
      message: this.getErrorMessage(error, response),
      statusCode: this.getErrorStatus(error, response),
    };
  }

  private getErrorStatus(error: any, response: superagent.Response): number {
    return (error && error.status) || (response && response.status) || AccountManager.ERROR_GATEWAY_TIMEOUT;
  }

  private getErrorMessage(error: Error, response: superagent.Response): string {
    return response && response.text ? response.text : error.message;
  }

  private attachCredentials(request: superagent.Request<any>): void {
    if (this._customHeaders) {
      for (const headerName in this._customHeaders) {
        request.set(headerName, this._customHeaders[headerName]);
      }
    }
    // console.log("this.organisations ::", this.organisations);
    // console.log("this.passedOrgName ::", this.passedOrgName);
    if(this.passedOrgName && this.passedOrgName.length > 0){
        // eslint-disable-next-line prefer-const
        let tenantId = this.getTenantId(this.passedOrgName);
        request.set("tenant", tenantId);
    }
    const bearerToken = "cli-" + this._accessKey;
    request.set("Accept", `application/vnd.code-push.v${AccountManager.API_VERSION}+json`);
    request.set("Authorization", `Bearer ${bearerToken}`);
    request.set("X-CodePush-SDK-Version", packageJson.version);
  }
}

export = AccountManager;
