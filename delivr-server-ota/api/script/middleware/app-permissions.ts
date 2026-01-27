// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Request, Response, NextFunction } from 'express';
import * as semver from 'semver';
import { Storage } from '../storage/storage';
import { getUserAppPermission as getUserAppPermissionFromTenant } from './tenant-permissions';
import { getCliVersion } from '~utils/rest-headers';
import { MIN_CLI_VERSION_REQUIRING_TENANT } from '~constants/cli';

/**
 * App-level permission middleware
 * 
 * Permission hierarchy:
 * 1. App creator (apps.created_by) → automatic Owner (can delete)
 * 2. Tenant Owner → full access including delete
 * 3. Tenant Editor → can create/edit apps but NOT delete
 * 4. Tenant Viewer → read-only, but can perform deployments
 * 
 * SELF-RESOLVING: Middleware automatically resolves appName → appId
 */

export interface AppPermissionConfig {
  storage: Storage;
}

// ============================================================
// INTERNAL UTILITY: Resolve app (name or ID)
// ============================================================

/**
 * Internal helper to resolve app from request parameters
 * Handles both :appName and :appId route patterns
 * 
 * @returns { appId, app? } or null if not found
 */
async function resolveApp(
  config: AppPermissionConfig,
  req: Request
): Promise<{ appId: string; app?: any } | null> {
  const userId = req.user?.id;
  
  if (!userId) {
    return null;
  }
  
  // Try appName first (most common pattern)
  if (req.params.appName) {
    const appName = req.params.appName;
    const appId = Array.isArray(req.headers.tenant) 
      ? req.headers.tenant[0] 
      : req.headers.tenant;
    
    // Validate tenant header for newer CLI versions
    const cliVersion = getCliVersion(req);
    const cliVersionExists = Boolean(cliVersion);
    const cliVersionIsValid = cliVersionExists && semver.valid(cliVersion) !== null;
    const cliVersionRequiresTenant = cliVersionIsValid && 
      semver.gte(cliVersion, MIN_CLI_VERSION_REQUIRING_TENANT);
    const tenantIdMissing = !appId;
    const shouldRequireTenantHeader = tenantIdMissing && cliVersionRequiresTenant;
    
    if (shouldRequireTenantHeader) {
      throw new Error('Tenant header required');
    }
    
    try {
      // Import NameResolver from storage
      const storageModule = await import('../storage/storage');
      const NameResolver = storageModule.NameResolver;
      const nameResolver = new NameResolver(config.storage);
      
      const app = await nameResolver.resolveApp(userId, appName, appId);
      
      if (!app) {
        return null;
      }
      
      return { appId: app.id, app };
    } catch (error) {
      console.error('Error resolving app by name:', error);
      return null;
    }
  }
  
  // Try appId from params
  if (req.params.appId) {
    return { appId: req.params.appId };
  }
  
  // Try appId from body (rare)
  if (req.body.appId) {
    return { appId: req.body.appId };
  }
  
  return null;
}

/**
 * Get user's effective permission for an app
 * Returns: { permission: 'Owner' | 'Editor' | 'Viewer' | null, source: string, canDelete: boolean }
 */
export async function getUserAppPermission(
  storage: Storage,
  userId: string,
  appId: string
): Promise<{ permission: string; isCreator: boolean; source: string; canDelete: boolean } | null> {
  try {
    const sequelize = (storage as any).sequelize;
    
    // Get DOTA app (not the new App entity)
    // DOTA apps are stored in the 'dota_apps' table
    const app = await sequelize.models["dota_apps"].findByPk(appId);
    
    if (!app) {
      return null;
    }
    
    // Check if user is app creator (can delete)
    // Note: DB column is accountId, but parameter is userId (from req.user.id)
    if (app.dataValues.accountId === userId) {
      return {
        permission: 'Owner',
        isCreator: true,
        source: 'app_creator',
        canDelete: true  // Creator can delete
      };
    }
    
    // Get app-level permission (appId field references the new App entity)
    // DOTA apps have appId (FK to new apps table), not appId
    const appEntityId = app.dataValues.appId;
    
    if (!appEntityId) {
      // Old-style DOTA app without App entity association
      // Fall back to account-based permission check
      return null;
    }
    
    const tenantPermission = await getUserAppPermissionFromTenant(
      storage,
      userId,
      appEntityId  // This is the App entity ID (not appId)
    );
    
    if (!tenantPermission) {
      return null;
    }
    
    // Tenant Owner → full access including delete
    if (tenantPermission.permission === 'Owner') {
      return {
        permission: 'Owner',
        isCreator: tenantPermission.isCreator,
        source: 'tenant_owner',
        canDelete: true  // Tenant owner can delete any app
      };
    }
    
    // Tenant Editor → can create/edit but NOT delete
    if (tenantPermission.permission === 'Editor') {
      return {
        permission: 'Editor',
        isCreator: false,
        source: 'tenant_editor',
        canDelete: false  // Editor CANNOT delete apps
      };
    }
    
    // Tenant Viewer → read-only (but can do deployments)
    if (tenantPermission.permission === 'Viewer') {
      return {
        permission: 'Viewer',
        isCreator: false,
        source: 'tenant_viewer',
        canDelete: false
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('Error fetching user app permission:', error);
    return null;
  }
}

/**
 * Middleware: Require app access
 * User must have at least 'Viewer' permission
 * Automatically resolves appName → appId
 */
export function requireAppAccess(config: AppPermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Resolve app (handles both appName and appId)
    const resolved = await resolveApp(config, req);
    
    if (!resolved) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    const { appId, app } = resolved;
    
    // Check permission
    const appPermission = await getUserAppPermission(config.storage, userId, appId);
    
    if (!appPermission) {
      return res.status(403).json({ 
        error: 'You do not have access to this app' 
      });
    }
    
    // Attach to request
    if (app) (req as any).app = app;
    (req as any).appPermission = appPermission;
    next();
  };
}

/**
 * Middleware: Require Editor or Owner permission
 * User must be able to modify the app
 * Automatically resolves appName → appId
 */
export function requireAppEditor(config: AppPermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Resolve app (handles both appName and appId)
    const resolved = await resolveApp(config, req);
    
    if (!resolved) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    const { appId, app } = resolved;
    
    // Check permission
    const appPermission = await getUserAppPermission(config.storage, userId, appId);
    
    if (!appPermission) {
      return res.status(403).json({ 
        error: 'You do not have access to this app' 
      });
    }
    
    // Check if user has Editor or Owner permission
    if (appPermission.permission !== 'Owner' && appPermission.permission !== 'Editor') {
      return res.status(403).json({ 
        error: 'You need Editor or Owner permissions to modify this app',
        currentPermission: appPermission.permission
      });
    }
    
    // Attach to request
    if (app) (req as any).app = app;
    (req as any).appPermission = appPermission;
    next();
  };
}

/**
 * Middleware: Require delete permission
 * User must be app creator OR tenant owner
 * Tenant Editor CANNOT delete apps (even if they created them)
 * Automatically resolves appName → appId
 */
export function requireAppDeletePermission(config: AppPermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Resolve app (handles both appName and appId)
    const resolved = await resolveApp(config, req);
    
    if (!resolved) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    const { appId, app } = resolved;
    
    // Check permission
    const appPermission = await getUserAppPermission(config.storage, userId, appId);
    
    if (!appPermission) {
      return res.status(403).json({ 
        error: 'You do not have access to this app' 
      });
    }
    
    // Check canDelete flag
    if (!appPermission.canDelete) {
      return res.status(403).json({ 
        error: 'Only app creators and tenant owners can delete apps',
        currentPermission: appPermission.permission,
        source: appPermission.source,
        hint: 'Editors cannot delete apps, even if they created them'
      });
    }
    
    // Attach to request
    if (app) (req as any).app = app;
    (req as any).appPermission = appPermission;
    next();
  };
}

/**
 * Middleware: Require deployment permission
 * Viewers can perform deployments (special case)
 * Automatically resolves appName → appId
 */
export function requireDeploymentPermission(config: AppPermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Resolve app (handles both appName and appId)
    const resolved = await resolveApp(config, req);
    
    if (!resolved) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    const { appId, app } = resolved;
    
    // Check permission
    const appPermission = await getUserAppPermission(config.storage, userId, appId);
    
    if (!appPermission) {
      return res.status(403).json({ 
        error: 'You do not have access to this app' 
      });
    }
    
    // All roles (Viewer+) can perform deployments
    // Attach to request
    if (app) (req as any).app = app;
    (req as any).appPermission = appPermission;
    next();
  };
}

/**
 * Middleware: Require Editor or Owner permission for deployment structure changes
 * Used for: create deployment, rename deployment, delete deployment, clear history
 * Viewers CANNOT change deployment structure (only perform release operations)
 * Automatically resolves appName → appId
 */
export function requireDeploymentStructurePermission(config: AppPermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Resolve app (handles both appName and appId)
    const resolved = await resolveApp(config, req);
    
    if (!resolved) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    const { appId, app } = resolved;
    
    // Check permission
    const appPermission = await getUserAppPermission(config.storage, userId, appId);
    
    if (!appPermission) {
      return res.status(403).json({ 
        error: 'You do not have access to this app' 
      });
    }
    
    // Editor or Owner required
    if (appPermission.permission === 'Viewer') {
      return res.status(403).json({ 
        error: 'Viewers cannot modify deployment structure',
        currentPermission: appPermission.permission,
        hint: 'You need Editor or Owner permission to create/delete deployments'
      });
    }
    
    // Attach to request
    if (app) (req as any).app = app;
    (req as any).appPermission = appPermission;
    next();
  };
}

/**
 * Middleware: Require Owner permission
 * User must be app creator OR tenant owner (not tenant editor)
 * Used for sensitive operations like transferring ownership
 * Automatically resolves appName → appId
 */
export function requireAppOwner(config: AppPermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Resolve app (handles both appName and appId)
    const resolved = await resolveApp(config, req);
    
    if (!resolved) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    const { appId, app } = resolved;
    
    // Check permission
    const appPermission = await getUserAppPermission(config.storage, userId, appId);
    
    if (!appPermission) {
      return res.status(403).json({ 
        error: 'You do not have access to this app' 
      });
    }
    
    // Only Owner (app creator OR tenant owner)
    if (appPermission.permission !== 'Owner') {
      return res.status(403).json({ 
        error: 'Only app owners can perform this action',
        currentPermission: appPermission.permission,
        hint: 'You need to be the app creator or tenant owner'
      });
    }
    
    // Attach to request
    if (app) (req as any).app = app;
    (req as any).appPermission = appPermission;
    next();
  };
}

/**
 * Helper: Check if user can delete a specific app
 */
export async function canUserDeleteApp(
  storage: Storage,
  userId: string,
  appId: string
): Promise<boolean> {
  const permission = await getUserAppPermission(storage, userId, appId);
  return permission?.canDelete || false;
}

/**
 * Helper: Extract app ID from request
 */
export function extractAppId(req: Request): string | null {
  return req.params.appId || 
         req.body.appId || 
         req.query.appId as string || 
         null;
}

