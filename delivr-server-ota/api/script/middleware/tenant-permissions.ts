// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Request, Response, NextFunction } from 'express';
import { Storage } from '../storage/storage';

/**
 * Tenant-level permission middleware
 * Checks if user has required permission in the tenant
 * Uses the unified collaborators table (where appId=NULL for tenant-level)
 */

export interface TenantPermissionConfig {
  storage: Storage;
}

// Define permission hierarchy (updated for unified collaborators)
const PERMISSION_HIERARCHY = {
  'Owner': 3,
  'Editor': 2,
  'Viewer': 1,
  'Collaborator': 1  // Same as Viewer for tenant-level
};

/**
 * Get user's permission in a tenant
 * Queries the unified collaborators table (appId=NULL, tenantId=X)
 */
export async function getUserTenantPermission(
  storage: Storage,
  userId: string,
  tenantId: string
): Promise<{ permission: string; isCreator: boolean } | null> {
  try {
    const sequelize = (storage as any).sequelize;
    const MODELS = (storage as any).constructor.MODELS || {
      COLLABORATOR: 'collaborator'
    };
    
    // Query tenant-level collaborators (where appId is NULL)
    const tenantCollab = await sequelize.models[MODELS.COLLABORATOR].findOne({
      where: { 
        accountId: userId,
        tenantId: tenantId,
        appId: null  // Tenant-level collaborator
      }
    });
    
    if (!tenantCollab) {
      return null;
    }
    
    return {
      permission: tenantCollab.dataValues.permission,
      isCreator: tenantCollab.dataValues.isCreator || false
    };
  } catch (error) {
    console.error('Error fetching user tenant permission:', error);
    return null;
  }
}

/**
 * Check if user has required permission level
 */
function hasPermission(userPermission: string, requiredPermission: string): boolean {
  const userLevel = PERMISSION_HIERARCHY[userPermission] || 0;
  const requiredLevel = PERMISSION_HIERARCHY[requiredPermission] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Middleware: Require tenant membership
 * User must be a member of the tenant (any permission level)
 */
export function requireTenantMembership(config: TenantPermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const tenantId = req.params.tenantId || req.body.tenantId|| req.query.tenantId as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    const userPermission = await getUserTenantPermission(config.storage, userId, tenantId);
    
    if (!userPermission) {
      return res.status(403).json({ 
        error: 'You are not a member of this organization' 
      });
    }
    
    // Attach permission info to request for later use
    (req as any).tenantPermission = userPermission;
    next();
  };
}

/**
 * Middleware: Require Editor or Owner permission
 * User must have at least 'Editor' permissions
 */
export function requireEditor(config: TenantPermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const tenantId = req.params.tenantId || req.body.tenantId || req.headers.tenant;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    const userPermission = await getUserTenantPermission(config.storage, userId, tenantId);
    
    if (!userPermission) {
      return res.status(403).json({ 
        error: 'You are not a member of this organization' 
      });
    }
    
    if (!hasPermission(userPermission.permission, 'Editor')) {
      return res.status(403).json({ 
        error: 'You need Editor or Owner permissions to perform this action' 
      });
    }
    
    (req as any).tenantPermission = userPermission;
    next();
  };
}

/**
 * Middleware: Require Owner permission
 * User must be organization owner
 */
export const allowAll = (_config: TenantPermissionConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    next();
  };
};

/**
 * Middleware: Require Owner permission
 * User must be organization owner
 */
export function requireOwner(config: TenantPermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const tenantId = req.params.tenantId || req.body.tenantId || req.headers.tenant;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    const userPermission = await getUserTenantPermission(config.storage, userId, tenantId);
    
    if (!userPermission) {
      return res.status(403).json({ 
        error: 'You are not a member of this organization' 
      });
    }
    
    if (userPermission.permission !== 'Owner') {
      return res.status(403).json({ 
        error: 'Only organization owners can perform this action' 
      });
    }
    
    (req as any).tenantPermission = userPermission;
    next();
  };
}

/**
 * Alias for backward compatibility
 * @deprecated Use requireOwner instead
 */
export const requireOrgAdmin = requireOwner;

/**
 * Helper: Extract tenant ID from request
 * Checks params, body, and query in order
 */
export function extractTenantId(req: Request): string | null {
  return req.params.tenantId || 
         req.body.tenantId || 
         req.query.tenantId as string || 
         null;
}

