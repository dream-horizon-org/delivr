// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Request, Response, NextFunction } from 'express';
import { Storage } from '../storage/storage';
import { getUserTenantPermission } from './tenant-permissions';

/**
 * Release-level permission middleware
 * 
 * Permission hierarchy:
 * 1. Release creator (created_by) → automatic Owner
 * 2. Release pilot (release_pilot_id) → automatic Owner
 * 3. Tenant permission → fallback to tenant-level role
 */

export interface ReleasePermissionConfig {
  storage: Storage;
}

/**
 * Get user's effective permission for a release
 * Returns: { permission: 'Owner' | 'Editor' | 'Viewer' | null, source: string }
 */
export async function getUserReleasePermission(
  storage: Storage,
  userId: string,
  releaseId: string
): Promise<{ permission: string; isCreator: boolean; source: string } | null> {
  try {
    const sequelize = (storage as any).sequelize;
    
    // Get release
    const release = await sequelize.models.release.findByPk(releaseId);
    
    if (!release) {
      return null;
    }
    
    // Check if user is release creator
    if (release.dataValues.createdBy === userId) {
      return {
        permission: 'Owner',
        isCreator: true,
        source: 'release_creator'
      };
    }
    
    // Check if user is release pilot
    if (release.dataValues.releasePilotId === userId) {
      return {
        permission: 'Owner',
        isCreator: false,
        source: 'release_pilot'
      };
    }
    
    // Fallback to tenant-level permission
    const tenantPermission = await getUserTenantPermission(
      storage,
      userId,
      release.dataValues.tenantId
    );
    
    if (!tenantPermission) {
      return null;
    }
    
    return {
      permission: tenantPermission.permission,
      isCreator: tenantPermission.isCreator,
      source: 'tenant_permission'
    };
    
  } catch (error) {
    console.error('Error fetching user release permission:', error);
    return null;
  }
}

/**
 * Middleware: Require release access
 * User must have at least 'Viewer' permission on the release's tenant
 */
export function requireReleaseAccess(config: ReleasePermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const releaseId = req.params.releaseId || req.body.releaseId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!releaseId) {
      return res.status(400).json({ error: 'Release ID required' });
    }
    
    const releasePermission = await getUserReleasePermission(config.storage, userId, releaseId);
    
    if (!releasePermission) {
      return res.status(403).json({ 
        error: 'You do not have access to this release' 
      });
    }
    
    // Attach permission info to request
    (req as any).releasePermission = releasePermission;
    next();
  };
}

/**
 * Middleware: Require Editor or Owner permission
 * User must be able to modify the release
 */
export function requireReleaseEditor(config: ReleasePermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const releaseId = req.params.releaseId || req.body.releaseId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!releaseId) {
      return res.status(400).json({ error: 'Release ID required' });
    }
    
    const releasePermission = await getUserReleasePermission(config.storage, userId, releaseId);
    
    if (!releasePermission) {
      return res.status(403).json({ 
        error: 'You do not have access to this release' 
      });
    }
    
    // Check if user has Editor or Owner permission
    if (releasePermission.permission !== 'Owner' && releasePermission.permission !== 'Editor') {
      return res.status(403).json({ 
        error: 'You need Editor or Owner permissions to modify this release',
        currentPermission: releasePermission.permission
      });
    }
    
    (req as any).releasePermission = releasePermission;
    next();
  };
}

/**
 * Middleware: Require Owner permission
 * User must be release creator, pilot, or tenant owner
 */
export function requireReleaseOwner(config: ReleasePermissionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const releaseId = req.params.releaseId || req.body.releaseId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!releaseId) {
      return res.status(400).json({ error: 'Release ID required' });
    }
    
    const releasePermission = await getUserReleasePermission(config.storage, userId, releaseId);
    
    if (!releasePermission) {
      return res.status(403).json({ 
        error: 'You do not have access to this release' 
      });
    }
    
    if (releasePermission.permission !== 'Owner') {
      return res.status(403).json({ 
        error: 'Only release owners can perform this action',
        currentPermission: releasePermission.permission,
        hint: 'You need to be the release creator, pilot, or tenant owner'
      });
    }
    
    (req as any).releasePermission = releasePermission;
    next();
  };
}

/**
 * Helper: Extract release ID from request
 */
export function extractReleaseId(req: Request): string | null {
  return req.params.releaseId || 
         req.body.releaseId || 
         req.query.releaseId as string || 
         null;
}

