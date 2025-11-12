// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Request, Response, NextFunction } from 'express';
import { Storage } from '../storage/storage';
import { getUserTenantPermission } from './tenant-permissions';

/**
 * App-level permission middleware
 * 
 * Permission hierarchy:
 * 1. App creator (apps.created_by) → automatic Owner (can delete)
 * 2. Tenant Owner → full access including delete
 * 3. Tenant Editor → can create/edit apps but NOT delete
 * 4. Tenant Viewer → read-only, but can perform deployments
 */

export interface AppPermissionConfig {
  storage: Storage;
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
    
    // Get app
    const app = await sequelize.models.apps.findByPk(appId);
    
    if (!app) {
      return null;
    }
    
    // Check if user is app creator (can delete)
    if (app.dataValues.userId === userId) {
      return {
        permission: 'Owner',
        isCreator: true,
        source: 'app_creator',
        canDelete: true  // Creator can delete
      };
    }
    
    // Get tenant-level permission
    const tenantPermission = await getUserTenantPermission(
      storage,
      userId,
      app.dataValues.tenantId
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
 */
export function requireAppAccess(config: AppPermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const appId = req.params.appId || req.body.appId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!appId) {
      return res.status(400).json({ error: 'App ID required' });
    }
    
    const appPermission = await getUserAppPermission(config.storage, userId, appId);
    
    if (!appPermission) {
      return res.status(403).json({ 
        error: 'You do not have access to this app' 
      });
    }
    
    // Attach permission info to request
    (req as any).appPermission = appPermission;
    next();
  };
}

/**
 * Middleware: Require Editor or Owner permission
 * User must be able to modify the app
 */
export function requireAppEditor(config: AppPermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const appId = req.params.appId || req.body.appId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!appId) {
      return res.status(400).json({ error: 'App ID required' });
    }
    
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
    
    (req as any).appPermission = appPermission;
    next();
  };
}

/**
 * Middleware: Require delete permission
 * User must be app creator OR tenant owner
 * Tenant Editor CANNOT delete apps (even if they created them)
 */
export function requireAppDeletePermission(config: AppPermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const appId = req.params.appId || req.body.appId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!appId) {
      return res.status(400).json({ error: 'App ID required' });
    }
    
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
    
    (req as any).appPermission = appPermission;
    next();
  };
}

/**
 * Middleware: Require deployment permission
 * Viewers can perform deployments (special case)
 */
export function requireDeploymentPermission(config: AppPermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const appId = req.params.appId || req.body.appId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!appId) {
      return res.status(400).json({ error: 'App ID required' });
    }
    
    const appPermission = await getUserAppPermission(config.storage, userId, appId);
    
    if (!appPermission) {
      return res.status(403).json({ 
        error: 'You do not have access to this app' 
      });
    }
    
    // All roles (Viewer+) can perform deployments
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

