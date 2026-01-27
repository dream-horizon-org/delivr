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
const createAppHandler = (appService: AppService, storage: any) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user?.id;
      if (!accountId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          errorResponse(new Error('User not authenticated'), 'Authentication required')
        );
        return;
      }

      const { name, displayName, description } = req.body;

      // Validate required fields
      if (!name && !displayName) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('name', 'Name or displayName is required')
        );
        return;
      }

      // For now, orgId is null (will be set when Organizations are implemented)
      // We'll use the storage method which handles collaborator creation
      const orgId = null; // TODO: Get from request context when Organizations are implemented

      // Use storage.addOrgApp for now (handles collaborator creation)
      // This maintains backward compatibility with existing flow
      const createdApp = await storage.addOrgApp(accountId, {
        id: undefined, // Will be generated
        displayName: displayName || name,
        role: 'Owner',
        createdBy: accountId,
        createdTime: Date.now()
      });

      // If we want to use AppService in the future, we can do:
      // const appData: CreateAppRequest = {
      //   name: name || displayName || '',
      //   displayName: displayName || name,
      //   description,
      //   organizationId: orgId || ''
      // };
      // const app = await appService.createApp(orgId || '', appData, accountId);
      // Then create collaborator via storage.addOrgAppCollaborator

      res.status(HTTP_STATUS.CREATED).json(
        successResponse({ app: createdApp }, 'App created successfully')
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to create app')
      );
    }
  };

/**
 * Get app by ID
 * GET /apps/:appId
 */
const getAppHandler = (appService: AppService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      // For now, orgId is null (will be set when Organizations are implemented)
      const orgId = null; // TODO: Get from request context when Organizations are implemented

      const app = await appService.getApp(orgId || '', appId);

      if (!app) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('App')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(successResponse({ app }));
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
const listAppsHandler = (appService: AppService, storage: any) =>
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.user?.id;
      if (!accountId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          errorResponse(new Error('User not authenticated'), 'Authentication required')
        );
        return;
      }

      // For now, use storage.getOrgApps (maintains backward compatibility)
      // This returns apps where user is a collaborator
      const apps = await storage.getOrgApps(accountId);

      // If we want to use AppService in the future:
      // const orgId = null; // TODO: Get from request context
      // const apps = await appService.listApps(orgId || '');

      res.status(HTTP_STATUS.OK).json(
        successResponse({ apps, organisations: apps }) // Maintain backward compatibility
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

      const updatedApp = await appService.updateApp(orgId || '', appId, updates);

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
const deleteAppHandler = (appService: AppService, storage: any) =>
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

      // For now, use storage.removeOrgApp (maintains backward compatibility)
      // This handles permission checks and cleanup
      await storage.removeOrgApp(accountId, appId);

      // If we want to use AppService in the future:
      // const orgId = null; // TODO: Get from request context
      // const deleted = await appService.deleteApp(orgId || '', appId);
      // if (!deleted) {
      //   res.status(HTTP_STATUS.NOT_FOUND).json(notFoundResponse('App'));
      //   return;
      // }

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
  getApp: getAppHandler(appService),
  listApps: listAppsHandler(appService, storage),
  updateApp: updateAppHandler(appService),
  deleteApp: deleteAppHandler(appService, storage)
});

export type AppController = ReturnType<typeof createAppController>;
