/**
 * App Controller
 * HTTP handlers for App entity management (renamed from Tenant)
 */

import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { AppService } from '~services/app/app.service';
import type { CreateAppRequest, UpdateAppRequest } from '~types/app.types';
import {
  errorResponse,
  getErrorStatusCode,
  notFoundResponse,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';
import { buildAppConfig } from '~utils/tenant-metadata.utils';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
  };
};

/**
 * Create a new app
 * POST /apps
 */
const createAppHandler = (appService: AppService, _storage: any) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user?.id;
      if (!accountId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          errorResponse(new Error('User not authenticated'), 'Authentication required')
        );
        return;
      }

      const { name, displayName } = req.body;

      if (!name && !displayName) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('name', 'Name or displayName is required')
        );
        return;
      }

      const orgId = null; // TODO: Get from request context when Organizations are implemented
      const appData: CreateAppRequest = {
        name: displayName ?? name ?? '',
        displayName: displayName ?? name,
        organizationId: orgId ?? ''
      };

      const createdApp = await appService.createApp(orgId ?? '', appData, accountId);

      const appPayload = {
        id: createdApp.id,
        displayName: createdApp.displayName ?? createdApp.name,
        name: createdApp.name,
        role: 'Owner',
        createdBy: createdApp.createdBy,
        createdTime: createdApp.createdAt instanceof Date ? createdApp.createdAt.getTime() : Date.now()
      };

      res.status(HTTP_STATUS.CREATED).json(
        successResponse({ app: appPayload }, 'App created successfully')
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to create app')
      );
    }
  };

/**
 * Get app by ID with platform targets and connected integrations (same config format as getTenantInfo).
 * GET /apps/:appId
 * Tries App table first; if not found, falls back to getOrgApps (legacy tenant id).
 * Returns app and organisation with platformTargets and releaseManagement.config.
 */
const getAppHandler = (appService: AppService, storage: any) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      const accountId = (req as AuthenticatedRequest).user?.id;
      const orgId = null; // TODO: Get from request context when Organizations are implemented

      const app = await appService.getApp(orgId ?? '', appId, accountId);
      if (!app) {
        res.status(HTTP_STATUS.NOT_FOUND).json(notFoundResponse('App'));
        return;
      }

      // Core app fields only (no nested platformTargets, setupStatus, or releaseManagement)
      const appCore = {
        id: app.id,
        name: app.name,
        displayName: app.displayName,
        organizationId: app.organizationId,
        description: app.description,
        isActive: app.isActive,
        createdBy: app.createdBy,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      };

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      let platformTargetsFull: Array<{ platform: string; target: string; [key: string]: unknown }> = [];
      const appPlatformTargetService = (storage as any).appPlatformTargetService;
      if (appPlatformTargetService) {
        try {
          const result = await appPlatformTargetService.getPlatformTargets(appId, true);
          platformTargetsFull = (result ?? []) as Array<{ platform: string; target: string; [key: string]: unknown }>;
        } catch (_err) {
          // keep default []
        }
      }

      const platformTargetsMinimal: Array<{ platform: string; target: string }> = platformTargetsFull.map(
        (pt) => ({ platform: pt.platform, target: pt.target })
      );

      const scmController = (storage as any).scmController;
      const commIntegrationRepository = (storage as any).commIntegrationRepository;
      const cicdIntegrationRepository = (storage as any).cicdIntegrationRepository;
      const projectManagementIntegrationRepository = (storage as any).projectManagementIntegrationRepository;

      const scmIntegrations = scmController ? await scmController.findAll({ appId, isActive: true }) : [];
      const slackIntegration = commIntegrationRepository ? await commIntegrationRepository.findByApp(appId, 'SLACK') : null;
      const cicdIntegrations = cicdIntegrationRepository ? await cicdIntegrationRepository.findAll({ appId }) : [];

      let testManagementIntegrations: unknown[] = [];
      if ((storage as any).testManagementIntegrationService) {
        try {
          testManagementIntegrations = await (storage as any).testManagementIntegrationService.listTenantIntegrations(appId);
        } catch (_err) {
          // keep default []
        }
      }

      let projectManagementIntegrations: unknown[] = [];
      if (projectManagementIntegrationRepository) {
        try {
          projectManagementIntegrations = await projectManagementIntegrationRepository.findAll({ appId });
        } catch (_err) {
          // keep default []
        }
      }

      let storeIntegrations: unknown[] = [];
      if ((storage as any).storeIntegrationController) {
        try {
          storeIntegrations = await (storage as any).storeIntegrationController.findAll({ appId, status: 'VERIFIED' });
        } catch (_err) {
          // keep default []
        }
      }

      const tenantConfig = await buildAppConfig(
        scmIntegrations,
        slackIntegration,
        cicdIntegrations,
        testManagementIntegrations,
        projectManagementIntegrations,
        storeIntegrations,
        storage,
        platformTargetsMinimal
      );

      const hasScm = (scmIntegrations?.length ?? 0) > 0;
      const hasPlatformTargets = platformTargetsMinimal.length > 0;
      const setupCompleted = hasPlatformTargets;
      const setupStep: number | 'done' = !hasPlatformTargets ? 3 : 'done';
      const setupStatus = {
        hasScm,
        hasPlatformTargets,
        step: setupStep,
        completed: setupCompleted,
      };

      // Single flat shape: app (core only), platformTargets (minimal), integrations, allowedReleaseTypes, setupStatus.
      // enabledPlatforms, enabledTargets, hasDotaTarget are derived on the frontend from platformTargets.
      res.status(HTTP_STATUS.OK).json(
        successResponse({
          app: appCore,
          organisation: appCore,
          platformTargets: platformTargetsMinimal,
          integrations: tenantConfig.connectedIntegrations,
          allowedReleaseTypes: tenantConfig.allowedReleaseTypes,
          setupStatus,
        })
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to get app')
      );
    }
  };

/**
 * List all apps for the authenticated user
 * GET /apps
 */
const listAppsHandler = (appService: AppService, _storage: any) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user?.id;
      if (!accountId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          errorResponse(new Error('User not authenticated'), 'Authentication required')
        );
        return;
      }

      const orgId = null; // TODO: Get from request context when Organizations are implemented
      const apps = await appService.listApps(orgId ?? '', accountId);

      res.status(HTTP_STATUS.OK).json(
        successResponse({ apps, organisations: apps })
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to list apps')
      );
    }
  };

/**
 * Update an app
 * PUT /apps/:appId
 */
const updateAppHandler = (appService: AppService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      const { name, displayName, description } = req.body;

      // For now, orgId is null (will be set when Organizations are implemented)
      const orgId = null; // TODO: Get from request context when Organizations are implemented

      const updates: UpdateAppRequest = {
        ...(name !== undefined && { name }),
        ...(displayName !== undefined && { displayName }),
        ...(description !== undefined && { description })
      };

      const updatedApp = await appService.updateApp(orgId ?? '', appId, updates);

      if (!updatedApp) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('App')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse({ app: updatedApp }, 'App updated successfully')
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to update app')
      );
    }
  };

/**
 * Delete an app
 * DELETE /apps/:appId
 */
const deleteAppHandler = (appService: AppService, _storage: any) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      const accountId = req.user?.id;
      if (!accountId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          errorResponse(new Error('User not authenticated'), 'Authentication required')
        );
        return;
      }

      const orgId = null; // TODO: Get from request context when Organizations are implemented
      const deleted = await appService.deleteApp(orgId ?? '', appId, accountId);
      if (!deleted) {
        res.status(HTTP_STATUS.NOT_FOUND).json(notFoundResponse('App'));
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse(undefined, 'App deleted successfully')
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to delete app')
      );
    }
  };

/**
 * Create and export controller
 */
export const createAppController = (
  appService: AppService,
  storage: any
) => ({
  createApp: createAppHandler(appService, storage),
  getApp: getAppHandler(appService, storage),
  listApps: listAppsHandler(appService, storage),
  updateApp: updateAppHandler(appService),
  deleteApp: deleteAppHandler(appService, storage)
});

export type AppController = ReturnType<typeof createAppController>;
