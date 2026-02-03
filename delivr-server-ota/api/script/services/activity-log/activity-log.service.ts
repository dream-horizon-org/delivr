import { UnifiedActivityLogRepository } from '~models/activity-log/activity-log.repository';
import { EntityType, UnifiedActivityLog } from '~models/activity-log/activity-log.interface';
import { v4 as uuidv4 } from 'uuid';
import type * as storageTypes from '../../storage/storage';
import type { AccountDetails } from '../../types/release/release.interface';
import { getAccountDetails as getAccountDetailsUtil } from '../../utils/account.utils';

/**
 * Unified Activity Log Service
 * Single service for registering and retrieving activity logs across all entity types
 * (releases, configurations, integrations, distributions, etc.)
 */
export class UnifiedActivityLogService {
  
  constructor(
    private readonly activityLogRepository: UnifiedActivityLogRepository,
    private readonly storage: storageTypes.Storage
  ) {}
  
  /**
   * Register activity log by comparing previous and new values
   * Detects changes, makes values consistent, and inserts into database
   * 
   * @param params - Activity log parameters
   * @param params.entityType - Type of entity (RELEASE, CONFIGURATION, etc.)
   * @param params.entityId - ID of the entity (releaseId, configId, etc.)
   * @param params.tenantId - Tenant ID for data isolation
   * @param params.updatedBy - Account ID of the user making the update
   * @param params.type - High-level field name/type (RELEASE, PLATFORM_TARGET, CI_CONFIG, etc.)
   * @param params.previousValue - Value before update (can be object or null)
   * @param params.newValue - Value after update (can be object or null)
   */
  async registerActivityLog(params: {
    entityType: EntityType;
    entityId: string;
    tenantId: string;
    updatedBy: string;
    type: string;
    previousValue: Record<string, any> | null;
    newValue: Record<string, any> | null;
  }): Promise<void> {
    
    try {
      // Handle ADDED case (previousValue is null)
      const isAdded = !params.previousValue && params.newValue;
      if (isAdded) {
        const consistentNewValue = this.makeValueConsistent(params.newValue);
        
        await this.activityLogRepository.create({
          id: uuidv4(),
          entityType: params.entityType,
          entityId: params.entityId,
          tenantId: params.tenantId,
          type: params.type,
          previousValue: null,
          newValue: consistentNewValue,
          updatedBy: params.updatedBy
        });
        return;
      }
      
      // Handle REMOVED case (newValue is null)
      const isRemoved = params.previousValue && !params.newValue;
      if (isRemoved) {
        const consistentPreviousValue = this.makeValueConsistent(params.previousValue);
        
        await this.activityLogRepository.create({
          id: uuidv4(),
          entityType: params.entityType,
          entityId: params.entityId,
          tenantId: params.tenantId,
          type: params.type,
          previousValue: consistentPreviousValue,
          newValue: null,
          updatedBy: params.updatedBy
        });
        return;
      }
      
      // Handle UPDATED case (compare and log only changed fields)
      const hasBothValues = params.previousValue && params.newValue;
      if (hasBothValues) {
        const changedFields: string[] = [];
        const changedPreviousValue: Record<string, any> = {};
        const changedNewValue: Record<string, any> = {};
        
        // Get all unique keys from both objects
        const allKeys = new Set([
          ...Object.keys(params.previousValue),
          ...Object.keys(params.newValue)
        ]);
        
        // Compare each field
        for (const key of allKeys) {
          const oldVal = params.previousValue[key];
          const newVal = params.newValue[key];
          
          // For objects/arrays, compare JSON strings
          const oldValStr = typeof oldVal === 'object'
            ? JSON.stringify(oldVal)
            : oldVal;
          const newValStr = typeof newVal === 'object'
            ? JSON.stringify(newVal)
            : newVal;
          
          const valueChanged = oldValStr !== newValStr;
          if (valueChanged) {
            changedFields.push(key);
            changedPreviousValue[key] = oldVal;
            changedNewValue[key] = newVal;
          }
        }
        
        // Only log if something actually changed
        const hasChanges = changedFields.length > 0;
        if (hasChanges) {
          const consistentPreviousValue = this.makeValueConsistent(changedPreviousValue);
          const consistentNewValue = this.makeValueConsistent(changedNewValue);
          
          await this.activityLogRepository.create({
            id: uuidv4(),
            entityType: params.entityType,
            entityId: params.entityId,
            tenantId: params.tenantId,
            type: params.type,
            previousValue: consistentPreviousValue,
            newValue: consistentNewValue,
            updatedBy: params.updatedBy
          });
        }
      }
      
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get all activity logs for a specific entity
   * 
   * @param entityType - Type of entity (RELEASE, CONFIGURATION, etc.)
   * @param entityId - ID of the entity
   * @param enrichAccountDetails - Whether to populate account details (default: true)
   * @returns Array of activity logs with optional account details enrichment
   */
  async getActivityLogs(
    entityType: EntityType,
    entityId: string,
    enrichAccountDetails: boolean = true
  ): Promise<UnifiedActivityLog[]> {
    const logs = await this.activityLogRepository.findByEntity(entityType, entityId);
    
    if (!enrichAccountDetails) {
      return logs;
    }
    
    // Populate updatedBy with account details for each log
    const logsWithAccountDetails = await Promise.all(
      logs.map(async (log) => {
        const accountDetails = await this.getAccountDetails(log.updatedBy);
        
        // Extract approvedBy from newValue if present (for regression approvals)
        let approvedByEmail: string | null = null;
        if (log.newValue?.approvedBy) {
          const approvedByAccount = await this.getAccountDetails(log.newValue.approvedBy);
          approvedByEmail = approvedByAccount?.email ?? null;
        }
        
        // Replace approvedBy in newValue with email if present
        const enrichedNewValue = log.newValue?.approvedBy 
          ? { ...log.newValue, approvedBy: approvedByEmail ?? log.newValue.approvedBy }
          : log.newValue;
        
        return {
          ...log,
          updatedBy: log.updatedBy, // Keep the account ID
          updatedByAccount: accountDetails, // Add populated account details
          newValue: enrichedNewValue // Replace approvedBy with email if present
        };
      })
    );
    
    return logsWithAccountDetails;
  }

  /**
   * Get activity logs by tenant with optional filtering
   * 
   * @param tenantId - Tenant ID
   * @param options - Optional filtering and pagination options
   * @returns Array of activity logs for the tenant
   */
  async getActivityLogsByTenant(
    tenantId: string,
    options?: {
      entityType?: EntityType;
      limit?: number;
      offset?: number;
      enrichAccountDetails?: boolean;
    }
  ): Promise<UnifiedActivityLog[]> {
    const logs = await this.activityLogRepository.findByTenant(tenantId, {
      entityType: options?.entityType,
      limit: options?.limit,
      offset: options?.offset
    });

    if (!options?.enrichAccountDetails) {
      return logs;
    }

    // Populate account details if requested
    const logsWithAccountDetails = await Promise.all(
      logs.map(async (log) => {
        const accountDetails = await this.getAccountDetails(log.updatedBy);
        return {
          ...log,
          updatedBy: log.updatedBy,
          updatedByAccount: accountDetails
        };
      })
    );

    return logsWithAccountDetails;
  }

  /**
   * Delete all activity logs for a specific entity
   */
  async deleteActivityLogs(entityId: string, entityType: EntityType): Promise<void> {
    await this.activityLogRepository.deleteByEntity(entityType, entityId);
  }

  private async getAccountDetails(accountId: string | null): Promise<AccountDetails | null> {
    return getAccountDetailsUtil(this.storage, accountId, 'Unified Activity Log Service');
  }

  /**
   * Make value consistent for storage
   * Ensures all values are properly formatted for JSON storage
   */
  private makeValueConsistent(value: Record<string, any> | null): Record<string, any> | null {
    if (!value) {
      return null;
    }
    
    const consistent: Record<string, any> = {};
    
    for (const [key, val] of Object.entries(value)) {
      // Handle null/undefined
      const isNullish = val === null || val === undefined;
      if (isNullish) {
        consistent[key] = null;
        continue;
      }
      
      // Handle Date objects - convert to ISO string
      const isDate = val instanceof Date;
      if (isDate) {
        consistent[key] = val.toISOString();
        continue;
      }
      
      // Everything else (primitives, objects, arrays) - store as-is
      consistent[key] = val;
    }
    
    return consistent;
  }
}
