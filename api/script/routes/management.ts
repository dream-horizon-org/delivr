// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { createTempFileFromBuffer, getFileWithField } from "../file-upload-manager";
import { getIpAddress } from "../utils/rest-headers";
import { isUnfinishedRollout } from "../utils/rollout-selector";
import * as packageDiffing from "../utils/package-diffing";
import * as converterUtils from "../utils/converter";
import * as diffErrorUtils from "../utils/diff-error-handling";
import * as error from "../error";
import * as errorUtils from "../utils/rest-error-handling";
import { Request, Response, Router } from "express";
import * as fs from "fs";
import * as hashUtils from "../utils/hash-utils";
import * as redis from "../redis-manager";
import * as restTypes from "../types/rest-definitions";
import * as security from "../utils/security";
import * as semver from "semver";
import * as stream from "stream";
import * as streamifier from "streamifier";
import * as storageTypes from "../storage/storage";
import * as validationUtils from "../utils/validation";
import PackageDiffer = packageDiffing.PackageDiffer;
import NameResolver = storageTypes.NameResolver;
import PackageManifest = hashUtils.PackageManifest;
import tryJSON = require("try-json");
import rateLimit from "express-rate-limit";
import { isPrototypePollutionKey } from "../storage/storage";
import * as tenantPermissions from "../middleware/tenant-permissions";
import * as appPermissions from "../middleware/app-permissions";
import { SCM_PROVIDERS } from "../controllers/integrations/scm/providers.constants";
import { CICD_PROVIDERS } from "../controllers/integrations/ci-cd/providers.constants";
import { TEST_MANAGEMENT_PROVIDERS } from "../controllers/integrations/test-management/project-integration/project-integration.constants";

const DEFAULT_ACCESS_KEY_EXPIRY = 1000 * 60 * 60 * 24 * 60; // 60 days
const ACCESS_KEY_MASKING_STRING = "(hidden)";

export interface ManagementConfig {
  storage: storageTypes.Storage;
  redisManager: redis.RedisManager;
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

export function getManagementRouter(config: ManagementConfig): Router {
  const redisManager: redis.RedisManager = config.redisManager;
  const storage: storageTypes.Storage = config.storage;
  const packageDiffing = new PackageDiffer(storage, parseInt(process.env.DIFF_PACKAGE_COUNT) || 5);
  const router: Router = Router();
  const nameResolver: NameResolver = new NameResolver(config.storage);

  // ============================================================================
  // SYSTEM METADATA ENDPOINT
  // Returns available integrations, platforms, release types, etc.
  // This is static configuration - not stored in database
  // ============================================================================
  router.get("/system/metadata", async (req: Request, res: Response): Promise<any> => {
    try {
      // Build integrations from provider constants
      // Return all providers with isAvailable flag
      const SOURCE_CONTROL = SCM_PROVIDERS
        .map(p => ({ 
          id: p.id, 
          name: p.name, 
          requiresOAuth: p.requiresOAuth,
          isAvailable: p.enabled 
        }));
      
      const CI_CD = CICD_PROVIDERS
        .map(p => ({ 
          id: p.id, 
          name: p.name, 
          requiresOAuth: p.requiresOAuth,
          isAvailable: p.enabled 
        }));
      
      const TEST_MANAGEMENT = TEST_MANAGEMENT_PROVIDERS
        .map(p => ({ 
          id: p.type, 
          name: p.name, 
          requiresOAuth: false,
          isAvailable: p.enabled 
        }));
      
      // Hardcoded for unimplemented services
      const COMMUNICATION = [
        { id: "slack", name: "Slack", requiresOAuth: true, isAvailable: true },
        { id: "teams", name: "Microsoft Teams", requiresOAuth: true, isAvailable: false },
        { id: "discord", name: "Discord", requiresOAuth: true, isAvailable: false },
      ];
      
      const PROJECT_MANAGEMENT = [
        { id: "jira", name: "Jira", requiresOAuth: true, isAvailable: false },
        { id: "linear", name: "Linear", requiresOAuth: true, isAvailable: false },
        { id: "asana", name: "Asana", requiresOAuth: true, isAvailable: false },
      ];
      
      const APP_DISTRIBUTION = [
        { id: "appstore", name: "App Store", requiresOAuth: false, isAvailable: false },
        { id: "playstore", name: "Play Store", requiresOAuth: false, isAvailable: false },
        { id: "firebase", name: "Firebase App Distribution", requiresOAuth: true, isAvailable: false },
      ];

      const metadata = {
        releaseManagement: {
          integrations: {
            SOURCE_CONTROL,
            COMMUNICATION,
            CI_CD,
            TEST_MANAGEMENT,
            PROJECT_MANAGEMENT,
            APP_DISTRIBUTION,
          },
          platforms: [
            { id: "ANDROID", name: "Android", applicableTargets: ["PLAY_STORE"] },
            { id: "IOS", name: "iOS", applicableTargets: ["APP_STORE"] },
          ],
          targets: [
            { id: "PLAY_STORE", name: "Play Store" },
            { id: "APP_STORE", name: "App Store" },
          ],
          releaseTypes: [
            { id: "PLANNED", name: "Planned" },
            { id: "HOTFIX", name: "Hotfix" },
            { id: "EMERGENCY", name: "Emergency" },
          ],
          releaseStages: [
            { id: "PRE_KICKOFF", name: "Pre-Kickoff", order: 1 },
            { id: "KICKOFF", name: "Kickoff", order: 2 },
            { id: "REGRESSION", name: "Regression", order: 3 },
            { id: "READY_FOR_RELEASE", name: "Ready for Release", order: 4 },
            { id: "RELEASED", name: "Released", order: 5 },
          ],
          releaseStatuses: [
            { id: "PLANNED", name: "Planned", stage: "PRE_KICKOFF" },
            { id: "IN_PROGRESS", name: "In Progress", stage: "KICKOFF" },
            { id: "TESTING", name: "Testing", stage: "REGRESSION" },
            { id: "READY", name: "Ready", stage: "READY_FOR_RELEASE" },
            { id: "RELEASED", name: "Released", stage: "RELEASED" },
            { id: "BLOCKED", name: "Blocked", stage: null },
            { id: "CANCELLED", name: "Cancelled", stage: null },
          ],
          buildEnvironments: [
            { id: "STAGING", name: "Staging", order: 1, applicablePlatforms: ["ANDROID", "IOS"] },
            { id: "PRODUCTION", name: "Production", order: 2, applicablePlatforms: ["ANDROID", "IOS"] },
            { id: "AUTOMATION", name: "Automation", order: 3, applicablePlatforms: ["ANDROID", "IOS"] },
            { id: "CUSTOM", name: "Custom", order: 4, applicablePlatforms: ["ANDROID", "IOS"] },
          ],
        },
        system: {
          version: "1.0.0",
          features: {
            releaseManagement: true,
            integrations: true,
          },
        },
      };

      return res.status(200).json(metadata);
    } catch (error: any) {
      console.error("Error fetching system metadata:", error);
      return res.status(500).json({ 
        error: "Failed to fetch system metadata",
        details: error.message 
      });
    }
  });

  router.get("/account", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    storage
      .getAccount(accountId)
      .then((storageAccount: storageTypes.Account) => {
        const restAccount: restTypes.Account = converterUtils.toRestAccount(storageAccount);
        res.send({ account: restAccount });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.post("/account", (req: Request, res: Response, next: (err?: any) => void): any => {
    const account = req.body.account;
    //validate blah blah
    storage
      .addAccount(account)
      .then((accountId: string) => {
        //MARK: TODO issueAccessKey(accountId);
        // const restAccount: restTypes.Account = converterUtils.toRestAccount(storageAccount);
        console.log("accounId created");
        res.send({ account: accountId });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.get("/accessKeys", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;

    storage
      .getAccessKeys(accountId)
      .then((accessKeys: storageTypes.AccessKey[]): void => {
        accessKeys.sort((first: storageTypes.AccessKey, second: storageTypes.AccessKey) => {
          const firstTime = first.createdTime || 0;
          const secondTime = second.createdTime || 0;
          return firstTime - secondTime;
        });

        // Hide the actual key string and replace it with a message for legacy CLIs (up to 1.11.0-beta) that still try to display it
        accessKeys.forEach((accessKey: restTypes.AccessKey) => {
          accessKey.name = ACCESS_KEY_MASKING_STRING;
        });

        res.send({ accessKeys: accessKeys });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.post("/accessKeys", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    const accessKeyRequest: restTypes.AccessKeyRequest = converterUtils.accessKeyRequestFromBody(req.body);
    if (!accessKeyRequest.name) {
      accessKeyRequest.name = security.generateSecureKey(accountId);
    }

    if (!accessKeyRequest.createdBy) {
      accessKeyRequest.createdBy = getIpAddress(req);
    }

    const validationErrors: validationUtils.ValidationError[] = validationUtils.validateAccessKeyRequest(
      accessKeyRequest,
      /*isUpdate=*/ false
    );

    if (validationErrors.length) {
      res.status(400).send(validationErrors);
      return;
    }

    const accessKey: restTypes.AccessKey = <restTypes.AccessKey>(<restTypes.AccessKey>accessKeyRequest);

    accessKey.createdTime = new Date().getTime();
    accessKey.expires = accessKey.createdTime + (accessKeyRequest.ttl || DEFAULT_ACCESS_KEY_EXPIRY);
    delete accessKeyRequest.ttl;

    storage
      .getAccessKeys(accountId)
      .then((accessKeys: storageTypes.AccessKey[]): void | Promise<void> => {
        if (NameResolver.isDuplicate(accessKeys, accessKey.name)) {
          errorUtils.sendConflictError(res, `The access key "${accessKey.name}" already exists.`);
          return;
        } else if (NameResolver.isDuplicate(accessKeys, accessKey.friendlyName)) {
          errorUtils.sendConflictError(res, `The access key "${accessKey.friendlyName}" already exists.`);
          return;
        }

        const storageAccessKey: storageTypes.AccessKey = converterUtils.toStorageAccessKey(accessKey);
        return storage.addAccessKey(accountId, storageAccessKey).then((id: string): void => {
          res.setHeader("Location", urlEncode([`/accessKeys/${accessKey.friendlyName}`]));
          res.status(201).send({ accessKey: accessKey });
        });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.get("/accessKeys/:accessKeyName", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accessKeyName: string = req.params.accessKeyName;
    const accountId: string = req.user.id;

    nameResolver
      .resolveAccessKey(accountId, accessKeyName)
      .then((accessKey: storageTypes.AccessKey): void => {
        delete accessKey.name;
        res.send({ accessKey: accessKey });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.get("/accountByaccessKeyName", (req: Request, res: Response, next: (err?: any) => void): any => { 
    const accessKeyName = Array.isArray(req.headers.accesskeyname) ? req.headers.accesskeyname[0] : req.headers.accesskeyname;
    //validate accessKeyName
    if(!accessKeyName) {
      res.status(400).send("Access key name is required");
      return;
    }
    storage.getUserFromAccessKey(accessKeyName)
      .then((storageAccount: storageTypes.Account): void => {
        res.send({ user: storageAccount });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });



  router.patch("/accessKeys/:accessKeyName", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    const accessKeyName: string = req.params.accessKeyName;
    const accessKeyRequest: restTypes.AccessKeyRequest = converterUtils.accessKeyRequestFromBody(req.body);

    const validationErrors: validationUtils.ValidationError[] = validationUtils.validateAccessKeyRequest(
      accessKeyRequest,
      /*isUpdate=*/ true
    );
    if (validationErrors.length) {
      res.status(400).send(validationErrors);
      return;
    }

    let updatedAccessKey: storageTypes.AccessKey;
    storage
      .getAccessKeys(accountId)
      .then((accessKeys: storageTypes.AccessKey[]): Promise<void> => {
        updatedAccessKey = NameResolver.findByName(accessKeys, accessKeyName);
        if (!updatedAccessKey) {
          throw errorUtils.restError(errorUtils.ErrorCode.NotFound, `The access key "${accessKeyName}" does not exist.`);
        }

        updatedAccessKey.description = accessKeyRequest.description;
        if (accessKeyRequest.friendlyName) {
          if (NameResolver.isDuplicate(accessKeys, accessKeyRequest.friendlyName)) {
            throw errorUtils.restError(
              errorUtils.ErrorCode.Conflict,
              `The access key "${accessKeyRequest.friendlyName}" already exists.`
            );
          }

          updatedAccessKey.friendlyName = accessKeyRequest.friendlyName;
          updatedAccessKey.description = updatedAccessKey.friendlyName;
        }
        updatedAccessKey.scope = accessKeyRequest.scope;

        if (accessKeyRequest.ttl !== undefined) {
          updatedAccessKey.expires = new Date().getTime() + accessKeyRequest.ttl;
        }

        return storage.updateAccessKey(accountId, updatedAccessKey);
      })
      .then((): void => {
        delete updatedAccessKey.name;
        res.send({ accessKey: updatedAccessKey });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.delete("/accessKeys/:accessKeyName", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    const accessKeyName: string = req.params.accessKeyName;

    nameResolver
      .resolveAccessKey(accountId, accessKeyName)
      .then((accessKey: storageTypes.AccessKey): Promise<void> => {
        return storage.removeAccessKey(accountId, accessKey.id);
      })
      .then((): void => {
        //send message that it is deleted successfully.
        res.status(200).send("Access key deleted successfully");
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.delete("/sessions/:createdBy", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    const createdBy: string = req.params.createdBy;

    storage
      .getAccessKeys(accountId)
      .then((accessKeys: storageTypes.AccessKey[]) => {
        const accessKeyDeletionPromises: Promise<void>[] = [];
        accessKeys.forEach((accessKey: storageTypes.AccessKey) => {
          if (accessKey.isSession && accessKey.createdBy === createdBy) {
            accessKeyDeletionPromises.push(storage.removeAccessKey(accountId, accessKey.id));
          }
        });

        if (accessKeyDeletionPromises.length) {
          return Promise.all(accessKeyDeletionPromises);
        } else {
          throw errorUtils.restError(errorUtils.ErrorCode.NotFound, `There are no sessions associated with "${createdBy}."`);
        }
      })
      .then((): void => {
        res.sendStatus(204);
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.get("/tenants", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;

    storage
      .getTenants(accountId)
      .then((tenants: storageTypes.Organization[]) => {
        res.send({ organisations: tenants });
      })
      .catch((error: any) => {
        next(error);
      });
  });

  router.post("/tenants", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    const tenant = req.body;

    if (!tenant.displayName) {
      return res.status(400).send({ error: "displayName is required" });
    }

    storage
      .addTenant(accountId, tenant)
      .then((createdTenant: storageTypes.Organization) => {
        res.status(201).send({ organisation: createdTenant });
      })
      .catch((error: any) => {
        console.error("Error creating tenant:", error);
        next(error);
      });
  });

  // Get tenant info with release setup status and integrations
  // IMPORTANT: No caching - always returns fresh data for release management
  router.get("/tenants/:tenantId", tenantPermissions.requireOwner({ storage }), async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
    const tenantId: string = req.params.tenantId;
    
    // Set no-cache headers to prevent stale data issues
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    try {
      // Get tenant details
      const accountId: string = req.user.id;
      const tenants = await storage.getTenants(accountId);
      const tenant = tenants.find((t: storageTypes.Organization) => t.id === tenantId);
      
      if (!tenant) {
        return res.status(404).send({ error: "Tenant not found" });
      }

      // Get all integrations for this tenant
      const scmController = (storage as any).scmController;
      const slackController = (storage as any).slackController;
      const cicdController = (storage as any).cicdController;
      
      // SCM integrations (GitHub, GitLab, Bitbucket)
      const scmIntegrations = await scmController.findAll({ tenantId, isActive: true });
      
      // Slack integrations
      const slackIntegration = await slackController.findByTenant(tenantId);

      // CI CD integrations (Jenkins, Github Actions, Circle CI, GitLab CI, etc.)
      const cicdIntegrations = await cicdController.findAll({ tenantId });
      
      // Test Management integrations (Checkmate, TestRail, etc.) - project-level
      // Note: Using tenantId as projectId (tenant = project in our system)
      let testManagementIntegrations: any[] = [];
      if ((storage as any).testManagementIntegrationService) {
        try {
          testManagementIntegrations = await (storage as any).testManagementIntegrationService.listProjectIntegrations(tenantId);
          console.log(`[TenantInfo] Found ${testManagementIntegrations.length} test management integrations for tenant ${tenantId}`);
        } catch (error) {
          console.error('[TenantInfo] Error fetching test management integrations:', error);
        }
      }
      
      // TODO: Get other integrations when implemented
      // const targetPlatforms = await storage.getTenantTargetPlatforms(tenantId);
      // const pipelines = await storage.getTenantPipelines(tenantId);
      
      // Build unified integrations array with type field
      const integrations: any[] = [];
      
      // Add SCM integrations (sanitize - remove sensitive tokens)
      scmIntegrations.forEach((integration: any) => {
        integrations.push({
          type: 'scm',
          id: integration.id,
          scmType: integration.scmType,
          displayName: integration.displayName,
          owner: integration.owner,
          repo: integration.repo,
          repositoryUrl: integration.repositoryUrl,
          defaultBranch: integration.defaultBranch,
          isActive: integration.isActive,
          verificationStatus: integration.verificationStatus,
          lastVerifiedAt: integration.lastVerifiedAt,
          createdAt: integration.createdAt,
          updatedAt: integration.updatedAt
          // Note: accessToken, webhookSecret are intentionally excluded
        });
      });
      
      // Add Slack integration (already sanitized by controller)
      if (slackIntegration) {
        integrations.push({
          type: 'communication',
          communicationType: 'SLACK',
          id: slackIntegration.id,
          workspaceName: slackIntegration.slackWorkspaceName,
          workspaceId: slackIntegration.slackWorkspaceId,
          botUserId: slackIntegration.slackBotUserId,
          verificationStatus: slackIntegration.verificationStatus,
          hasValidToken: slackIntegration.verificationStatus === 'VALID',
          slackChannels: slackIntegration.slackChannels || [],
          channelsCount: slackIntegration.slackChannels ? slackIntegration.slackChannels.length : 0,
          createdAt: slackIntegration.createdAt,
          updatedAt: slackIntegration.updatedAt
          // Note: slackBotToken is intentionally excluded (never sent to client)
        });
      }

      // Add CI CD integrations (Jenkins, Github Actions, Circle CI, GitLab CI, etc.)
      cicdIntegrations.forEach((integration: any) => {
        integrations.push({
          type: 'cicd',
          id: integration.id,
          providerType: integration.providerType,
          displayName: integration.displayName,
          hostUrl: integration.hostUrl,
          authType: integration.authType,
          username: integration.username,
          headerName: integration.headerName,
          providerConfig: integration.providerConfig,
          verificationStatus: integration.verificationStatus,
          verificationError: integration.verificationError,
          lastVerifiedAt: integration.lastVerifiedAt,
          createdAt: integration.createdAt,
          updatedAt: integration.updatedAt
          // Note: apiToken, headerValue are intentionally excluded (never sent to client)
        });
      });

      // Add Test Management integrations (Checkmate, TestRail, etc.)
      testManagementIntegrations.forEach((integration: any) => {
        integrations.push({
          type: 'test_management',
          id: integration.id,
          providerType: integration.providerType,
          name: integration.name,
          projectId: integration.projectId,
          createdAt: integration.createdAt,
          updatedAt: integration.updatedAt
          // Note: config (including authToken) is intentionally excluded (never sent to client)
        });
      });
      
      // TODO: Add other integration types when implemented

      // targetPlatforms.forEach(tp => integrations.push({ type: 'targetPlatform', ...tp }));
      // pipelines.forEach(p => integrations.push({ type: 'pipeline', ...p }));
      // const communicationIntegrations = await storage.getCommunicationIntegrations(tenantId);
      // const cicdIntegrations = await storage.getCICDIntegrations(tenantId);
      // const testManagementIntegrations = await storage.getTestManagementIntegrations(tenantId);
      
      // Calculate setup completion
      // Setup is complete when ALL REQUIRED steps are done:
      // - SCM Integration: REQUIRED
      // - Target Platforms: REQUIRED (not implemented yet)
      // - Pipelines: OPTIONAL
      // - Communication: OPTIONAL
      const hasRequiredSCM = scmIntegrations.length > 0;
      const hasRequiredTargetPlatforms = false; // TODO: Check actual target platforms when implemented
      
      // Setup is complete ONLY when BOTH required steps are done
      // Since target platforms are not yet implemented, setupComplete will always be FALSE
      // Once target platforms are implemented, change line below to:
      // const hasRequiredTargetPlatforms = targetPlatforms.length > 0;
      const releaseSetupComplete = hasRequiredSCM && hasRequiredTargetPlatforms;
      
      // Build tenant-specific configuration
      // This tells the frontend what this tenant has enabled/connected
      const tenantConfig = {
        connectedIntegrations: {
          SOURCE_CONTROL: scmIntegrations.map((i: any) => ({
            id: i.id,
            providerId: i.scmType.toLowerCase(),
            name: i.displayName,
            status: i.isActive ? 'CONNECTED' : 'DISCONNECTED',
            config: {
              owner: i.owner,
              repo: i.repo,
              defaultBranch: i.defaultBranch,
              repositoryUrl: i.repositoryUrl,
            },
            verificationStatus: i.verificationStatus || 'UNKNOWN',
            connectedAt: i.createdAt,
            connectedBy: i.createdByAccountId || 'System',
          })),
          COMMUNICATION: slackIntegration ? [{
            id: slackIntegration.id,
            providerId: 'slack',
            name: slackIntegration.slackWorkspaceName || 'Slack Workspace',
            status: slackIntegration.verificationStatus === 'VALID' ? 'CONNECTED' : 'DISCONNECTED',
            config: {
              workspaceId: slackIntegration.slackWorkspaceId,
              workspaceName: slackIntegration.slackWorkspaceName,
              botUserId: slackIntegration.slackBotUserId,
              channels: slackIntegration.slackChannels || [],
            },
            verificationStatus: slackIntegration.verificationStatus || 'UNKNOWN',
            connectedAt: slackIntegration.createdAt,
            connectedBy: slackIntegration.createdByAccountId || 'System',
          }] : [],
          CI_CD: cicdIntegrations.map((i: any) => ({
            id: i.id,
            providerId: i.providerType.toLowerCase(),
            name: i.displayName,
            status: i.verificationStatus === 'VALID' ? 'CONNECTED' : 'DISCONNECTED',
            config: {
              hostUrl: i.hostUrl,
              authType: i.authType,
              username: i.username,
              providerConfig: i.providerConfig,
            },
            verificationStatus: i.verificationStatus || 'UNKNOWN',
            connectedAt: i.createdAt,
            connectedBy: i.createdByAccountId || 'System',
          })),
          TEST_MANAGEMENT: testManagementIntegrations.map((i: any) => ({
            id: i.id,
            providerId: i.providerType.toLowerCase(),
            name: i.name,
            status: 'CONNECTED',  // If it exists in DB, it's connected
            config: {
              providerType: i.providerType,
              projectId: i.projectId,
              // Include non-sensitive config fields
              baseUrl: i.config?.baseUrl,
              orgId: i.config?.orgId,
              // Don't expose sensitive config data (like authToken)
            },
            connectedAt: i.createdAt,
            connectedBy: i.createdByAccountId || 'System',
          })),
          PROJECT_MANAGEMENT: [], // TODO: Add project management integrations when implemented
          APP_DISTRIBUTION: [],   // TODO: Add app distribution integrations when implemented
        },
        enabledPlatforms: ["ANDROID", "IOS"], // TODO: Make this dynamic based on tenant settings
        enabledTargets: ["APP_STORE", "PLAY_STORE", "WEB"], // TODO: Make this dynamic
        allowedReleaseTypes: ["PLANNED", "HOTFIX", "EMERGENCY"], // TODO: Make this dynamic
        customSettings: {
          defaultKickoffLeadDays: 2,
          workingDays: [1, 2, 3, 4, 5],
          timezone: "UTC",
          versioningScheme: "SEMVER",
        },
      };
      
      return res.status(200).send({
        organisation: {
          ...tenant,
          releaseManagement: {
            setupComplete: releaseSetupComplete,
            setupSteps: {
              scmIntegration: scmIntegrations.length > 0,
              targetPlatforms: false,  // TODO: Implement target platforms
              pipelines: false,        // TODO: Implement (optional)
              communication: !!slackIntegration
            },
            config: tenantConfig  // Structured config with connected integrations
          }
        }
      });
    } catch (error: any) {
      console.error("Error fetching tenant info:", error);
      return next(error);
    }
  });

  // Get tenant collaborators (Owner only)
  router.get("/tenants/:tenantId/collaborators", tenantPermissions.requireOwner({ storage }), async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
    console.log("Getting collaborators for tenant:", req.params.tenantId);
    const tenantId: string = req.params.tenantId;
    
    try {
      const collaborators = await storage.getTenantCollaborators(tenantId);
      return res.status(200).send({ collaborators });
    } catch (error: any) {
      console.error("Error fetching tenant collaborators:", error);
      return next(error);
    }
  });

  // Add tenant collaborator (Owner only)
  router.post("/tenants/:tenantId/collaborators", tenantPermissions.requireOwner({ storage }), async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
    const tenantId: string = req.params.tenantId;
    const { email, permission } = req.body;

    if (!email) {
      return res.status(400).send({ error: "email is required" });
    }

    if (!permission || !['Editor', 'Viewer'].includes(permission)) {
      return res.status(400).send({ error: "permission must be either 'Editor' or 'Viewer'" });
    }

    try {
      await storage.addTenantCollaborator(tenantId, email, permission);
      return res.status(201).send({ message: "Collaborator added successfully" });
    } catch (error: any) {
      console.error("Error adding tenant collaborator:", error);
      return next(error);
    }
  });

  // Update tenant collaborator permission (Owner only)
  router.patch("/tenants/:tenantId/collaborators/:email", tenantPermissions.requireOwner({ storage }), async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
    const tenantId: string = req.params.tenantId;
    const email: string = req.params.email;
    const { permission } = req.body;

    if (!permission || !['Editor', 'Viewer'].includes(permission)) {
      return res.status(400).send({ error: "permission must be either 'Editor' or 'Viewer'" });
    }

    try {
      await storage.updateTenantCollaborator(tenantId, email, permission);
      return res.status(200).send({ message: "Collaborator updated successfully" });
    } catch (error: any) {
      console.error("Error updating tenant collaborator:", error);
      return next(error);
    }
  });

  // Remove tenant collaborator (Owner only)
  router.delete("/tenants/:tenantId/collaborators/:email", tenantPermissions.requireOwner({ storage }), async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
    const tenantId: string = req.params.tenantId;
    const email: string = req.params.email;

    try {
      await storage.removeTenantCollaborator(tenantId, email);
      return res.status(200).send({ message: "Collaborator removed successfully" });
    } catch (error: any) {
      console.error("Error removing tenant collaborator:", error);
      return next(error);
    }
  });

  router.delete("/tenants/:tenantId", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    const tenantId: string = req.params.tenantId;

    storage
      .removeTenant(accountId, tenantId) // Calls the storage method we'll define next
      .then(() => {
        res.status(200).send("Org deleted successfully");
      })
      .catch((error: any) => {
        next(error); // Forward error to error handler
      });
  });

  router.get("/apps", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    const tenant: string = Array.isArray(req.headers.tenant) ? req.headers.tenant[0] : req.headers.tenant;
    storage
      .getApps(accountId)
      .then((apps: storageTypes.App[]) => {
        const restAppPromises: Promise<restTypes.App>[] = apps
          .filter((app) => !tenant || app.tenantId === tenant)
          .map((app: storageTypes.App) => {
            return storage.getDeployments(accountId, app.id).then((deployments: storageTypes.Deployment[]) => {
              const deploymentNames: string[] = deployments.map((deployment: storageTypes.Deployment) => deployment.name);
              return converterUtils.toRestApp(app, app.name, deploymentNames);
            });
          });

        return Promise.all(restAppPromises);
      })
      .then((restApps: restTypes.App[]) => {
        res.send({ apps: converterUtils.sortAndUpdateDisplayNameOfRestAppsList(restApps) });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.post("/apps", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    const appRequest: restTypes.AppCreationRequest = converterUtils.appCreationRequestFromBody(req.body);

    const validationErrors = validationUtils.validateApp(appRequest, /*isUpdate=*/ false);
    if (validationErrors.length) {
      errorUtils.sendMalformedRequestError(res, JSON.stringify(validationErrors));
    } else {
      storage
        .getApps(accountId)
        .then((apps: storageTypes.App[]): void | Promise<void> => {
          if (NameResolver.isDuplicateApp(apps, appRequest)) {
            errorUtils.sendConflictError(res, "An app named '" + appRequest.name + "' already exists.");
            return;
          }

          let storageApp: storageTypes.App = converterUtils.toStorageApp(appRequest, new Date().getTime());

          return storage
            .addApp(accountId, storageApp)
            .then((app: storageTypes.App): Promise<string[]> => {
              storageApp = app;
              if (!appRequest.manuallyProvisionDeployments) {
                const defaultDeployments: string[] = ["Production", "Staging"];
                const deploymentPromises: Promise<string>[] = defaultDeployments.map((deploymentName: string) => {
                  const deployment: storageTypes.Deployment = {
                    createdTime: new Date().getTime(),
                    name: deploymentName,
                    key: security.generateSecureKey(accountId),
                  };

                  return storage.addDeployment(accountId, storageApp.id, deployment).then(() => {
                    return deployment.name;
                  });
                });

                return Promise.all(deploymentPromises);
              }
            })
            .then((deploymentNames: string[]): void => {
              res.setHeader("Location", urlEncode([`/apps/${storageApp.name}`]));
              res.status(201).send({ app: converterUtils.toRestApp(storageApp, /*displayName=*/ storageApp.name, deploymentNames) });
            });
        })
        .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
    }
  });

  router.get("/apps/:appName", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    const appName: string = req.params.appName;
    const tenantId: string = Array.isArray(req.headers.tenant) ? req.headers.tenant[0] : req.headers.tenant;
    let storageApp: storageTypes.App;
    nameResolver
      .resolveApp(accountId, appName, tenantId)
      .then((app: storageTypes.App) => {
        storageApp = app;
        return storage.getDeployments(accountId, app.id);
      })
      .then((deployments: storageTypes.Deployment[]) => {
        const deploymentNames: string[] = deployments.map((deployment) => deployment.name);
        res.send({ app: converterUtils.toRestApp(storageApp, /*displayName=*/ appName, deploymentNames) });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.delete("/apps/:appName", 
    appPermissions.requireAppDeletePermission({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const app: storageTypes.App = (req as any).app;  // Already resolved by middleware
      const appId: string = app.id;
      let invalidationError: Error;
      
      storage.getDeployments(accountId, appId)
      .then((deployments: storageTypes.Deployment[]) => {
        const invalidationPromises: Promise<void>[] = deployments.map((deployment: storageTypes.Deployment) => {
          return invalidateCachedPackage(deployment.key);
        });

        return Promise.all(invalidationPromises).catch((error: Error) => {
          invalidationError = error; // Do not block app deletion on cache invalidation
        });
      })
      .then(() => {
        return storage.removeApp(accountId, appId);
      })
      .then(() => {
        res.status(200).send("App deleted successfully");
        if (invalidationError) throw invalidationError;
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.patch("/apps/:appName", 
    appPermissions.requireAppEditor({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const existingApp: storageTypes.App = (req as any).app;  // Already resolved by middleware
      const app: restTypes.App = converterUtils.appFromBody(req.body);

      storage
        .getApps(accountId)
        .then(async (apps: storageTypes.App[]): Promise<void> => {
          // Name change validation
          if ((app.name || app.name === "") && app.name !== existingApp.name) {
            if (NameResolver.isDuplicate(apps, app.name)) {
              errorUtils.sendConflictError(res, "An app named '" + app.name + "' already exists.");
              return;
            }

            existingApp.name = app.name;
          }

        const validationErrors = validationUtils.validateApp(existingApp, /*isUpdate=*/ true);
        if (validationErrors.length) {
          errorUtils.sendMalformedRequestError(res, JSON.stringify(validationErrors));
        } else {
          return storage
            .updateApp(accountId, existingApp)
            .then(() => {
              return storage.getDeployments(accountId, existingApp.id).then((deployments: storageTypes.Deployment[]) => {
                const deploymentNames: string[] = deployments.map((deployment: storageTypes.Deployment) => {
                  return deployment.name;
                });
                return converterUtils.toRestApp(existingApp, existingApp.name, deploymentNames);
              });
            })
            .then((restApp: restTypes.App) => {
              res.send({ app: restApp });
            });
        }
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.post("/apps/:appName/transfer/:email", 
    appPermissions.requireAppOwner({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const app: storageTypes.App = (req as any).app;  // Already resolved by middleware
      const email: string = req.params.email;
      
      if (isPrototypePollutionKey(email)) {
        return res.status(400).send("Invalid email parameter");
      }

      storage.transferApp(accountId, app.id, email)
        .then(() => {
          res.sendStatus(201);
        })
        .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
    });

  router.post("/apps/:appName/collaborators/:email", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    const appName: string = req.params.appName;
    const email: string = req.params.email;
    const tenantId: string = Array.isArray(req.headers.tenant) ? req.headers.tenant[0] : req.headers.tenant;
    if (isPrototypePollutionKey(email)) {
      return res.status(400).send("Invalid email parameter");
    }

    nameResolver
      .resolveApp(accountId, appName, tenantId)
      .then((app: storageTypes.App) => {
        throwIfInvalidPermissions(app, storageTypes.Permissions.Owner);
        return storage.addCollaborator(accountId, app.id, email);
      })
      .then(() => {
        res.sendStatus(201);
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.get("/apps/:appName/collaborators", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    const appName: string = req.params.appName;
    const tenantId: string = Array.isArray(req.headers.tenant) ? req.headers.tenant[0] : req.headers.tenant;
    console.log("Getting collaborators for app:", appName, "tenantId:", tenantId);
    nameResolver
      .resolveApp(accountId, appName, tenantId)
      .then((app: storageTypes.App) => {
        throwIfInvalidPermissions(app, storageTypes.Permissions.Editor);
        return storage.getCollaborators(accountId, app.id);
      })
      .then((retrievedMap: storageTypes.CollaboratorMap) => {
        res.send({ collaborators: converterUtils.toRestCollaboratorMap(retrievedMap) });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.delete("/apps/:appName/collaborators/:email", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    const appName: string = req.params.appName;
    const email: string = req.params.email;
    const tenantId: string = Array.isArray(req.headers.tenant) ? req.headers.tenant[0] : req.headers.tenant;
    if (isPrototypePollutionKey(email)) {
      return res.status(400).send("Invalid email parameter");
    }

    nameResolver
      .resolveApp(accountId, appName, tenantId)
      .then((app: storageTypes.App) => {
        const isAttemptingToRemoveSelf: boolean =
          app.collaborators && email && app.collaborators[email] && app.collaborators[email].isCurrentAccount;
        throwIfInvalidPermissions(
          app,
          isAttemptingToRemoveSelf ? storageTypes.Permissions.Editor : storageTypes.Permissions.Owner
        );
        return storage.removeCollaborator(accountId, app.id, email);
      })
      .then(() => {
        res.status(200).send("Collaborator removed successfully");
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.patch("/apps/:appName/collaborators/:email", (req: Request, res: Response, next: (err?: any) => void): any => {
    const accountId: string = req.user.id;
    const appName: string = req.params.appName;
    const email: string = req.params.email;
    const tenantId: string = Array.isArray(req.headers.tenant) ? req.headers.tenant[0] : req.headers.tenant;
    let role: string = "Viewer";
    if(req.body.role !== undefined) {
      role = req.body.role;
    }

    if (isPrototypePollutionKey(email)) {
      return res.status(400).send("Invalid email parameter");
    }

    nameResolver
      .resolveApp(accountId, appName, tenantId)
      .then((app: storageTypes.App) => {
          throwIfInvalidPermissions(app, storageTypes.Permissions.Owner);
        
        // Prevent the app creator from demoting themselves from Owner
        const collaboratorBeingModified = app.collaborators[email];
        if (collaboratorBeingModified) {
          const collaboratorUserId = collaboratorBeingModified.accountId;
          const appCreatorUserId = (app as any).accountId;
          if (collaboratorUserId === appCreatorUserId && role !== "Owner") {
            throw errorUtils.restError(errorUtils.ErrorCode.Conflict,"The app creator permission cannot be changed from Owner to a non-Owner role.");
          }
        }
        
        return storage.updateCollaborators(accountId, app.id, email, role);
      })
      .then(() => {
        res.sendStatus(200);
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.get("/apps/:appName/deployments",
    appPermissions.requireDeploymentPermission({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const app: storageTypes.App = (req as any).app;
      const appId: string = app.id;

      storage.getDeployments(accountId, appId)
      .then(async (deployments: storageTypes.Deployment[]) => {
        deployments.sort((first: restTypes.Deployment, second: restTypes.Deployment) => {
            return first.name.localeCompare(second.name);
        });

        if (redisManager.isEnabled) {
            for (const deployment of deployments) {
                const metrics = await redisManager.getMetricsWithDeploymentKey(deployment.key);
                const deploymentMetrics = converterUtils.toRestDeploymentMetrics(metrics);
                let totalActiveCount : number = 0;
                Object.keys(deploymentMetrics).forEach((label) => {
                    const metrics = deploymentMetrics[label];
                    if (metrics.active < 0) metrics.active = 0;
                    totalActiveCount += metrics.active;
                });

                if (deployment.packageHistory) {
                  deployment.packageHistory.forEach((pkg) => {
                      if (deploymentMetrics[pkg.label]) {
                          const pkgMetrics = deploymentMetrics[pkg.label];
                          pkg.active = pkgMetrics.active || 0;
                          pkg.downloaded = pkgMetrics.downloaded || 0;
                          pkg.failed = pkgMetrics.failed || 0;
                          pkg.installed = pkgMetrics.installed || 0;
                          pkg.totalActive = totalActiveCount;
                      }
                  });
                }
            }
        }

        res.send({ deployments: deployments });
    })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.post("/apps/:appName/deployments", 
    appPermissions.requireDeploymentStructurePermission({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const app: storageTypes.App = (req as any).app;
      const appId: string = app.id;
      const appName: string = req.params.appName;
      let restDeployment: restTypes.Deployment = converterUtils.deploymentFromBody(req.body);

      const validationErrors = validationUtils.validateDeployment(restDeployment, /*isUpdate=*/ false);
      if (validationErrors.length) {
        errorUtils.sendMalformedRequestError(res, JSON.stringify(validationErrors));
        return;
      }

      const storageDeployment: storageTypes.Deployment = converterUtils.toStorageDeployment(restDeployment, new Date().getTime());
      
      storage.getDeployments(accountId, appId)
      .then((deployments: storageTypes.Deployment[]): void | Promise<void> => {
        if (NameResolver.isDuplicate(deployments, restDeployment.name)) {
          errorUtils.sendConflictError(res, "A deployment named '" + restDeployment.name + "' already exists.");
          return;
        }

        // Allow the deployment key to be specified on creation, if desired
        storageDeployment.key = restDeployment.key || security.generateSecureKey(accountId);

        return storage.addDeployment(accountId, appId, storageDeployment).then((deploymentId: string): void => {
          restDeployment = converterUtils.toRestDeployment(storageDeployment);
          res.setHeader("Location", urlEncode([`/apps/${appName}/deployments/${restDeployment.name}`]));
          res.status(201).send({ deployment: restDeployment });
        });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.get("/apps/:appName/deployments/:deploymentName",
    appPermissions.requireDeploymentPermission({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const app: storageTypes.App = (req as any).app;
      const appId: string = app.id;
      const deploymentName: string = req.params.deploymentName;

      nameResolver.resolveDeployment(accountId, appId, deploymentName)
      .then(async (deployment: storageTypes.Deployment) => {
          const metrics = await redisManager.getMetricsWithDeploymentKey(deployment.key);
          const deploymentMetrics = converterUtils.toRestDeploymentMetrics(metrics);

          let totalActiveCount : number = 0;
          Object.keys(deploymentMetrics).forEach((label) => {
            const metrics = deploymentMetrics[label];
            if (metrics.active < 0) {
              metrics.active = 0;
            }
            totalActiveCount += metrics.active;
          });

          if (deployment.packageHistory) {
            deployment.packageHistory.forEach((pkg) => {
                if (deploymentMetrics[pkg.label]) {
                  const pkgMetrics = deploymentMetrics[pkg.label];
                  pkg.active = pkgMetrics.active || 0;
                  pkg.downloaded = pkgMetrics.downloaded || 0;
                  pkg.failed = pkgMetrics.failed || 0;
                  pkg.installed = pkgMetrics.installed || 0;
                  pkg.totalActive = totalActiveCount;
                }
            });
          }
          const restDeployment: restTypes.Deployment = converterUtils.toRestDeployment(deployment);
          res.send({ deployment: restDeployment });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.delete("/apps/:appName/deployments/:deploymentName",
    appPermissions.requireDeploymentStructurePermission({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const app: storageTypes.App = (req as any).app;
      const appId: string = app.id;
      const deploymentName: string = req.params.deploymentName;
      let deploymentId: string;

      nameResolver.resolveDeployment(accountId, appId, deploymentName)
      .then((deployment: storageTypes.Deployment) => {
        deploymentId = deployment.id;
        return invalidateCachedPackage(deployment.key);
      })
      .then(() => {
        return storage.removeDeployment(accountId, appId, deploymentId);
      })
      .then(() => {
        res.status(200).send("Deployment deleted successfully");
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.patch("/apps/:appName/deployments/:deploymentName",
    appPermissions.requireDeploymentStructurePermission({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const app: storageTypes.App = (req as any).app;
      const appId: string = app.id;
      const appName: string = req.params.appName;
      const deploymentName: string = req.params.deploymentName;
      let restDeployment: restTypes.Deployment = converterUtils.deploymentFromBody(req.body);

      const validationErrors = validationUtils.validateDeployment(restDeployment, /*isUpdate=*/ true);
      if (validationErrors.length) {
        errorUtils.sendMalformedRequestError(res, JSON.stringify(validationErrors));
        return;
      }

      storage.getDeployments(accountId, appId)
      .then((storageDeployments: storageTypes.Deployment[]): void | Promise<void> => {
        const storageDeployment: storageTypes.Deployment = NameResolver.findByName(storageDeployments, deploymentName);

        if (!storageDeployment) {
          errorUtils.sendNotFoundError(res, `Deployment "${deploymentName}" does not exist.`);
          return;
        }

        if ((restDeployment.name || restDeployment.name === "") && restDeployment.name !== storageDeployment.name) {
          if (NameResolver.isDuplicate(storageDeployments, restDeployment.name)) {
            errorUtils.sendConflictError(res, "A deployment named '" + restDeployment.name + "' already exists.");
            return;
          }
          storageDeployment.name = restDeployment.name;
        }

        restDeployment = converterUtils.toRestDeployment(storageDeployment);
        return storage.updateDeployment(accountId, appId, storageDeployment).then(() => {
          res.send({ deployment: restDeployment });
        });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.patch("/apps/:appName/deployments/:deploymentName/release",
    appPermissions.requireDeploymentPermission({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const app: storageTypes.App = (req as any).app;
      const appId: string = app.id;
      const deploymentName: string = req.params.deploymentName;
      const info: restTypes.PackageInfo = req.body.packageInfo || {};
      const validationErrors: validationUtils.ValidationError[] = validationUtils.validatePackageInfo(info, /*allOptional*/ true);
      if (validationErrors.length) {
        errorUtils.sendMalformedRequestError(res, JSON.stringify(validationErrors));
        return;
      }

      let updateRelease: boolean = false;
      let storageDeployment: storageTypes.Deployment;

      storage.getDeployments(accountId, appId)
      .then((storageDeployments: storageTypes.Deployment[]) => {
        storageDeployment = NameResolver.findByName(storageDeployments, deploymentName);

        if (!storageDeployment) {
          throw errorUtils.restError(errorUtils.ErrorCode.NotFound, `Deployment "${deploymentName}" does not exist.`);
        }

        return storage.getPackageHistory(accountId, appId, storageDeployment.id);
      })
      .then((packageHistory: storageTypes.Package[]) => {
        if (!packageHistory.length) {
          throw errorUtils.restError(errorUtils.ErrorCode.NotFound, "Deployment has no releases.");
        }

        const packageToUpdate: storageTypes.Package = info.label
          ? getPackageFromLabel(packageHistory, info.label)
          : packageHistory[packageHistory.length - 1];

        if (!packageToUpdate) {
          throw errorUtils.restError(errorUtils.ErrorCode.NotFound, "Release not found for given label.");
        }

        const newIsDisabled: boolean = info.isDisabled;
        if (validationUtils.isDefined(newIsDisabled) && packageToUpdate.isDisabled !== newIsDisabled) {
          packageToUpdate.isDisabled = newIsDisabled;
          updateRelease = true;
        }

        const newIsMandatory: boolean = info.isMandatory;
        if (validationUtils.isDefined(newIsMandatory) && packageToUpdate.isMandatory !== newIsMandatory) {
          packageToUpdate.isMandatory = newIsMandatory;
          updateRelease = true;
        }

        if (info.description && packageToUpdate.description !== info.description) {
          packageToUpdate.description = info.description;
          updateRelease = true;
        }

        const newAppVersion: string = info.appVersion;
        if (newAppVersion && packageToUpdate.appVersion !== newAppVersion) {
          packageToUpdate.appVersion = newAppVersion;
          updateRelease = true;
        }

        const newRolloutValue: number = info.rollout;
        if (validationUtils.isDefined(newRolloutValue)) {
          let errorMessage: string;
          if (!isUnfinishedRollout(packageToUpdate.rollout) && !updateRelease) {
            errorMessage = "Cannot update rollout value for a completed rollout release.";
          } else if (packageToUpdate.rollout > newRolloutValue && newRolloutValue !== 100) {
            errorMessage = `Rollout value must be greater than "${packageToUpdate.rollout}", the existing value.`;
          }

          if (errorMessage) {
            throw errorUtils.restError(errorUtils.ErrorCode.Conflict, errorMessage);
          }

          packageToUpdate.rollout = newRolloutValue === 100 ? 100 : newRolloutValue;
          updateRelease = true;
        }

        if (updateRelease) {
          //MARK TODO: TEST THIS
          return storage.updatePackageHistory(accountId, appId, storageDeployment.id, packageHistory).then(() => {
            res.send({ package: converterUtils.toRestPackage(packageToUpdate) });
            return invalidateCachedPackage(storageDeployment.key);
          });
        } else {
          res.sendStatus(204);
        }
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  const releaseRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  });

  router.post(
    "/apps/:appName/deployments/:deploymentName/release",
    appPermissions.requireDeploymentPermission({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const app: storageTypes.App = (req as any).app;
      const appId: string = app.id;
      const appName: string = req.params.appName;
      const deploymentName: string = req.params.deploymentName;
      const file: any = getFileWithField(req, "package");

      if (!file || !file.buffer) {
        errorUtils.sendMalformedRequestError(res, "A deployment package must include a file.");
        return;
      }

      const filePath: string = createTempFileFromBuffer(file.buffer);
      const restPackage: restTypes.Package = tryJSON(req.body.packageInfo) || {};
      const validationErrors: validationUtils.ValidationError[] = validationUtils.validatePackageInfo(
        restPackage,
        /*allOptional*/ false
      );
      if (validationErrors.length) {
        errorUtils.sendMalformedRequestError(res, JSON.stringify(validationErrors));
        return;
      }

      fs.stat(filePath, (err: NodeJS.ErrnoException, stats: fs.Stats): void => {
        if (err) {
          errorUtils.sendUnknownError(res, err, next);
          return;
        }

        // These variables are for hoisting promise results and flattening the following promise chain.
        let deploymentToReleaseTo: storageTypes.Deployment;
        let storagePackage: storageTypes.Package;
        let lastPackageHashWithSameAppVersion: string;
        let newManifest: PackageManifest;

        nameResolver.resolveDeployment(accountId, appId, deploymentName)
          .then((deployment: storageTypes.Deployment) => {
            deploymentToReleaseTo = deployment;
            const existingPackage: storageTypes.Package = deployment.package;
            if (existingPackage && isUnfinishedRollout(existingPackage.rollout) && !existingPackage.isDisabled) {
              throw errorUtils.restError(
                errorUtils.ErrorCode.Conflict,
                "Please update the previous release to 100% rollout before releasing a new package."
              );
            }

            return storage.getPackageHistory(accountId, appId, deploymentToReleaseTo.id);
          })
          .then((history: storageTypes.Package[]) => {
            lastPackageHashWithSameAppVersion = getLastPackageHashWithSameAppVersion(history, restPackage.appVersion);
            return hashUtils.generatePackageManifestFromZip(filePath);
          })
          .then((manifest?: PackageManifest) => {
            if (manifest) {
              newManifest = manifest;
              // If update is a zip, generate a packageHash using the manifest, since
              // that more accurately represents the contents of each file in the zip.
              return newManifest.computePackageHash();
            } else {
              // Update is not a zip (flat file), generate the packageHash over the
              // entire file contents.
              return hashUtils.hashFile(filePath);
            }
          })
          .then((packageHash: string) => {
            restPackage.packageHash = packageHash;
            if (restPackage.packageHash === lastPackageHashWithSameAppVersion) {
              throw errorUtils.restError(
                errorUtils.ErrorCode.Conflict,
                "The uploaded package was not released because it is identical to the contents of the specified deployment's current release."
              );
            }

            return storage.addBlob(security.generateSecureKey(accountId), fs.createReadStream(filePath), stats.size);
          })
          .then((blobId: string) => storage.getBlobUrl(blobId))
          .then((blobUrl: string) => {
            restPackage.blobUrl = blobUrl;
            restPackage.size = stats.size;

            // If newManifest is null/undefined, then the package is not a valid ZIP file.
            if (newManifest) {
              const json: string = newManifest.serialize();
              const readStream: stream.Readable = streamifier.createReadStream(json);

              return storage.addBlob(security.generateSecureKey(accountId), readStream, json.length);
            }

            return Promise.resolve(<string>null);
          })
          .then((blobId?: string) => {
            if (blobId) {
              return storage.getBlobUrl(blobId);
            }

            return Promise.resolve(<string>null);
          })
          .then((manifestBlobUrl?: string) => {
            storagePackage = converterUtils.toStoragePackage(restPackage);
            if (manifestBlobUrl) {
              storagePackage.manifestBlobUrl = manifestBlobUrl;
            }

            storagePackage.releaseMethod = storageTypes.ReleaseMethod.Upload;
            storagePackage.uploadTime = new Date().getTime();
            return storage.commitPackage(accountId, appId, deploymentToReleaseTo.id, storagePackage);
          })
          .then((committedPackage: storageTypes.Package): Promise<void> => {
            storagePackage.label = committedPackage.label;
            const restPackage: restTypes.Package = converterUtils.toRestPackage(committedPackage);

            res.setHeader("Location", urlEncode([`/apps/${appName}/deployments/${deploymentName}`]));
            res.status(201).send({ package: restPackage }); // Send response without blocking on cleanup

            return invalidateCachedPackage(deploymentToReleaseTo.key);
          })
          .then(() => processDiff(accountId, appId, deploymentToReleaseTo.id, storagePackage))
          .finally((): void => {
            // Cleanup; any errors before this point will still pass to the catch() block
            fs.unlink(filePath, (err: NodeJS.ErrnoException): void => {
              if (err) {
                errorUtils.sendUnknownError(res, err, next);
              }
            });
          })
          .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
      });
    }
  );

  router.delete(
    "/apps/:appName/deployments/:deploymentName/history",
    appPermissions.requireDeploymentStructurePermission({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const app: storageTypes.App = (req as any).app;
      const appId: string = app.id;
      const deploymentName: string = req.params.deploymentName;
      let deploymentToGetHistoryOf: storageTypes.Deployment;

      nameResolver.resolveDeployment(accountId, appId, deploymentName)
        .then((deployment: storageTypes.Deployment): Promise<void> => {
          deploymentToGetHistoryOf = deployment;
          return storage.clearPackageHistory(accountId, appId, deploymentToGetHistoryOf.id);
        })
        .then(() => {
          if (redisManager.isEnabled) {
            return redisManager.clearMetricsForDeploymentKey(deploymentToGetHistoryOf.key);
          } else {
            return Promise.resolve(<void>null);
          }
        })
        .then(() => {
          res.status(200).send("Deployment History deleted successfully");
          return invalidateCachedPackage(deploymentToGetHistoryOf.key);
        })
        .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
    }
  );

  router.get("/apps/:appName/deployments/:deploymentName/history",
    appPermissions.requireDeploymentPermission({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const app: storageTypes.App = (req as any).app;
      const appId: string = app.id;
      const deploymentName: string = req.params.deploymentName;

      nameResolver.resolveDeployment(accountId, appId, deploymentName)
      .then((deployment: storageTypes.Deployment): Promise<storageTypes.Package[]> => {
        return storage.getPackageHistory(accountId, appId, deployment.id);
      })
      .then((packageHistory: storageTypes.Package[]) => {
        res.send({ history: packageHistory });
      })
      .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
  });

  router.get("/apps/:appName/deployments/:deploymentName/metrics",
    appPermissions.requireDeploymentPermission({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      if (!redisManager.isEnabled) {
        res.send({ metrics: {} });
      } else {
        const accountId: string = req.user.id;
        const app: storageTypes.App = (req as any).app;
        const appId: string = app.id;
        const deploymentName: string = req.params.deploymentName;

        nameResolver.resolveDeployment(accountId, appId, deploymentName)
        .then((deployment: storageTypes.Deployment): Promise<redis.DeploymentMetrics> => {
          return redisManager.getMetricsWithDeploymentKey(deployment.key);
        })
        .then((metrics: redis.DeploymentMetrics) => {
          const deploymentMetrics: restTypes.DeploymentMetrics = converterUtils.toRestDeploymentMetrics(metrics);
          res.send({ metrics: deploymentMetrics });
        })
        .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
    }
  });

  router.post(
    "/apps/:appName/deployments/:sourceDeploymentName/promote/:destDeploymentName",
    appPermissions.requireDeploymentPermission({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const app: storageTypes.App = (req as any).app;
      const appId: string = app.id;
      const appName: string = req.params.appName;
      const sourceDeploymentName: string = req.params.sourceDeploymentName;
      const destDeploymentName: string = req.params.destDeploymentName;
      const info: restTypes.PackageInfo = req.body.packageInfo || {};
      const validationErrors: validationUtils.ValidationError[] = validationUtils.validatePackageInfo(info, /*allOptional*/ true);
      if (validationErrors.length) {
        errorUtils.sendMalformedRequestError(res, JSON.stringify(validationErrors));
        return;
      }

      let destDeployment: storageTypes.Deployment;
      let sourcePackage: storageTypes.Package;

      // Get source and dest manifests in parallel.
      Promise.all([
        nameResolver.resolveDeployment(accountId, appId, sourceDeploymentName),
        nameResolver.resolveDeployment(accountId, appId, destDeploymentName),
      ])
        .then(([sourceDeployment,destinationDeployment]:[storageTypes.Deployment,storageTypes.Deployment]) => {
          destDeployment = destinationDeployment;

          if (info.label) {
            return storage.getPackageHistory(accountId, appId, sourceDeployment.id).then((sourceHistory: storageTypes.Package[]) => {
              sourcePackage = getPackageFromLabel(sourceHistory, info.label);
            });
          } else {
            sourcePackage = sourceDeployment.package;
          }
        })
        .then(() => {
          const destPackage: storageTypes.Package = destDeployment.package;

          if (!sourcePackage) {
            throw errorUtils.restError(errorUtils.ErrorCode.NotFound, "Cannot promote from a deployment with no enabled releases.");
          } else if (validationUtils.isDefined(info.rollout) && !validationUtils.isValidRolloutField(info.rollout)) {
            throw errorUtils.restError(
              errorUtils.ErrorCode.MalformedRequest,
              "Rollout value must be an integer between 1 and 100, inclusive."
            );
          } else if (destPackage && isUnfinishedRollout(destPackage.rollout) && !destPackage.isDisabled) {
            throw errorUtils.restError(
              errorUtils.ErrorCode.Conflict,
              "Cannot promote to an unfinished rollout release unless it is already disabled."
            );
          }

          return storage.getPackageHistory(accountId, appId, destDeployment.id);
        })
        .then((destHistory: storageTypes.Package[]) => {
          if (sourcePackage.packageHash === getLastPackageHashWithSameAppVersion(destHistory, sourcePackage.appVersion)) {
            throw errorUtils.restError(
              errorUtils.ErrorCode.Conflict,
              "The uploaded package was not promoted because it is identical to the contents of the targeted deployment's current release."
            );
          }

          const isMandatory: boolean = validationUtils.isDefined(info.isMandatory) ? info.isMandatory : sourcePackage.isMandatory;
          const newPackage: storageTypes.Package = {
            appVersion: info.appVersion ? info.appVersion : sourcePackage.appVersion,
            blobUrl: sourcePackage.blobUrl,
            description: info.description || sourcePackage.description,
            isDisabled: validationUtils.isDefined(info.isDisabled) ? info.isDisabled : sourcePackage.isDisabled,
            isMandatory: isMandatory,
            manifestBlobUrl: sourcePackage.manifestBlobUrl,
            packageHash: sourcePackage.packageHash,
            rollout: info.rollout || null,
            size: sourcePackage.size,
            uploadTime: new Date().getTime(),
            isBundlePatchingEnabled: sourcePackage.isBundlePatchingEnabled,
            releaseMethod: storageTypes.ReleaseMethod.Promote,
            originalLabel: sourcePackage.label,
            originalDeployment: sourceDeploymentName,
          };

          return storage
            .commitPackage(accountId, appId, destDeployment.id, newPackage)
            .then((committedPackage: storageTypes.Package): Promise<void> => {
              sourcePackage.label = committedPackage.label;
              const restPackage: restTypes.Package = converterUtils.toRestPackage(committedPackage);
              res.setHeader("Location", urlEncode([`/apps/${appName}/deployments/${destDeploymentName}`]));
              res.status(201).send({ package: restPackage });
              return invalidateCachedPackage(destDeployment.key);
            })
            .then(() => processDiff(accountId, appId, destDeployment.id, sourcePackage));
        })
        .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
    }
  );

  router.post(
    "/apps/:appName/deployments/:deploymentName/rollback/:targetRelease?",
    appPermissions.requireDeploymentPermission({ storage }),
    (req: Request, res: Response, next: (err?: any) => void): any => {
      const accountId: string = req.user.id;
      const app: storageTypes.App = (req as any).app;
      const appId: string = app.id;
      const appName: string = req.params.appName;
      const deploymentName: string = req.params.deploymentName;
      let deploymentToRollback: storageTypes.Deployment;
      const targetRelease: string = req.params.targetRelease;
      let destinationPackage: storageTypes.Package;

      nameResolver.resolveDeployment(accountId, appId, deploymentName)
        .then((deployment: storageTypes.Deployment): Promise<storageTypes.Package[]> => {
          deploymentToRollback = deployment;
          return storage.getPackageHistory(accountId, appId, deployment.id);
        })
        .then((packageHistory: storageTypes.Package[]) => {
          const sourcePackage: storageTypes.Package =
            packageHistory && packageHistory.length ? packageHistory[packageHistory.length - 1] : null;
          if (!sourcePackage) {
            errorUtils.sendNotFoundError(res, "Cannot perform rollback because there are no releases on this deployment.");
            return;
          }

          if (!targetRelease) {
            destinationPackage = packageHistory[packageHistory.length - 2];

            if (!destinationPackage) {
              errorUtils.sendNotFoundError(res, "Cannot perform rollback because there are no prior releases to rollback to.");
              return;
            }
          } else {
            if (targetRelease === sourcePackage.label) {
              errorUtils.sendConflictError(
                res,
                `Cannot perform rollback because the target release (${targetRelease}) is already the latest release.`
              );
              return;
            }

            packageHistory.forEach((packageEntry: storageTypes.Package) => {
              if (packageEntry.label === targetRelease) {
                destinationPackage = packageEntry;
              }
            });

            if (!destinationPackage) {
              errorUtils.sendNotFoundError(
                res,
                `Cannot perform rollback because the target release (${targetRelease}) could not be found in the deployment history.`
              );
              return;
            }
          }

          if (sourcePackage.appVersion !== destinationPackage.appVersion) {
            errorUtils.sendConflictError(
              res,
              "Cannot perform rollback to a different app version. Please perform a new release with the desired replacement package."
            );
            return;
          }

          const newPackage: storageTypes.Package = {
            appVersion: destinationPackage.appVersion,
            blobUrl: destinationPackage.blobUrl,
            description: destinationPackage.description,
            diffPackageMap: destinationPackage.diffPackageMap,
            isDisabled: destinationPackage.isDisabled,
            isMandatory: destinationPackage.isMandatory,
            manifestBlobUrl: destinationPackage.manifestBlobUrl,
            packageHash: destinationPackage.packageHash,
            size: destinationPackage.size,
            uploadTime: new Date().getTime(),
            isBundlePatchingEnabled: destinationPackage.isBundlePatchingEnabled,
            releaseMethod: storageTypes.ReleaseMethod.Rollback,
            originalLabel: destinationPackage.label,
          };

          return storage.commitPackage(accountId, appId, deploymentToRollback.id, newPackage).then((): Promise<void> => {
            const restPackage: restTypes.Package = converterUtils.toRestPackage(newPackage);
            res.setHeader("Location", urlEncode([`/apps/${appName}/deployments/${deploymentName}`]));
            res.status(201).send({ package: restPackage });
            return invalidateCachedPackage(deploymentToRollback.key);
          });
        })
        .catch((error: error.CodePushError) => errorUtils.restErrorHandler(res, error, next))
    }
  );

  function invalidateCachedPackage(deploymentKey: string): Promise<void> {
    return redisManager.invalidateCache(redis.Utilities.getDeploymentKeyHash(deploymentKey));
  }

  function throwIfInvalidPermissions(app: storageTypes.App, requiredPermission: string): boolean {
    const collaboratorsMap: storageTypes.CollaboratorMap = app.collaborators;

    let isPermitted: boolean = false;
    let userPermission: string = null;

    // Find current user's permission
    if (collaboratorsMap) {
      for (const email of Object.keys(collaboratorsMap)) {
        if ((<storageTypes.CollaboratorProperties>collaboratorsMap[email]).isCurrentAccount) {
          userPermission = collaboratorsMap[email].permission;
          break;
        }
      }
    }

    // Check permission hierarchy
    // Owner > Editor > Viewer
    if (userPermission) {
      if (requiredPermission === storageTypes.Permissions.Owner) {
        // Only Owner can do this
        isPermitted = userPermission === storageTypes.Permissions.Owner;
      } else if (requiredPermission === storageTypes.Permissions.Editor) {
        // Owner or Editor can do this
        isPermitted = 
          userPermission === storageTypes.Permissions.Owner || 
          userPermission === storageTypes.Permissions.Editor;
      } else if (requiredPermission === storageTypes.Permissions.Viewer) {
        // Anyone (Owner, Editor, Viewer) can do this
        isPermitted = 
          userPermission === storageTypes.Permissions.Owner || 
          userPermission === storageTypes.Permissions.Editor ||
          userPermission === storageTypes.Permissions.Viewer;
      }
    }

    if (!isPermitted)
      throw errorUtils.restError(
        errorUtils.ErrorCode.Unauthorized,
        "This action requires " + requiredPermission + " permissions on the app!"
      );

    return true;
  }

  function getPackageFromLabel(history: storageTypes.Package[], label: string): storageTypes.Package {
    if (!history) {
      return null;
    }

    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].label === label) {
        return history[i];
      }
    }

    return null;
  }

  function getLastPackageHashWithSameAppVersion(history: storageTypes.Package[], appVersion: string): string {
    if (!history || !history.length) {
      return null;
    }

    const lastPackageIndex: number = history.length - 1;
    if (!semver.valid(appVersion)) {
      // appVersion is a range
      const oldAppVersion: string = history[lastPackageIndex].appVersion;
      const oldRange: string = semver.validRange(oldAppVersion);
      const newRange: string = semver.validRange(appVersion);
      return oldRange === newRange ? history[lastPackageIndex].packageHash : null;
    } else {
      // appVersion is not a range
      for (let i = lastPackageIndex; i >= 0; i--) {
        if (semver.satisfies(appVersion, history[i].appVersion)) {
          return history[i].packageHash;
        }
      }
    }

    return null;
  }

  function addDiffInfoForPackage(
    accountId: string,
    appId: string,
    deploymentId: string,
    appPackage: storageTypes.Package,
    diffPackageMap: storageTypes.PackageHashToBlobInfoMap
  ) {
    let updateHistory: boolean = false;

    return storage
      .getApp(accountId, appId)
      .then((storageApp: storageTypes.App) => {
        throwIfInvalidPermissions(storageApp, storageTypes.Permissions.Editor);
        return storage.getPackageHistory(accountId, appId, deploymentId);
      })
      .then((history: storageTypes.Package[]) => {
        if (history) {
          for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].label === appPackage.label && !history[i].diffPackageMap) {
              history[i].diffPackageMap = diffPackageMap;
              updateHistory = true;
              break;
            }
          }

          if (updateHistory) {
            return storage.updatePackageHistory(accountId, appId, deploymentId, history);
          }
        }
      })
      .then(() => {
        if (updateHistory) {
          //MARK: TODO This Method needs to be TESTed
          return storage.getDeployment(accountId, appId, deploymentId).then((deployment: storageTypes.Deployment) => {
            return invalidateCachedPackage(deployment.key);
          });
        }
      })
      .catch(diffErrorUtils.diffErrorHandler);
  }

  function processDiff(accountId: string, appId: string, deploymentId: string, appPackage: storageTypes.Package): Promise<void> {
    if (!appPackage.manifestBlobUrl || process.env.ENABLE_PACKAGE_DIFFING) {
      // No need to process diff because either:
      //   1. The release just contains a single file.
      //   2. Diffing disabled.
      return Promise.resolve(<void>null);
    }

    console.log(`Processing package: ${appPackage.label}`);

    return packageDiffing
      .generateDiffPackageMap(accountId, appId, deploymentId, appPackage)
      .then((diffPackageMap: storageTypes.PackageHashToBlobInfoMap) => {
        console.log(`Package processed, adding diff info`);
        addDiffInfoForPackage(accountId, appId, deploymentId, appPackage, diffPackageMap);
      });
  }

  return router;
}