import { ActivityLogRepository } from '~models/release/activity-log.repository';
import { v4 as uuidv4 } from 'uuid';
import type * as storageTypes from '../../storage/storage';
import type { AccountDetails } from '../../types/release/release.interface';
import { getAccountDetails as getAccountDetailsUtil } from '../../utils/account.utils';

/**
 * Service for registering activity logs
 * Single method that compares previous and new values and logs changes
 */
export class ReleaseActivityLogService {
  
  constructor(
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly storage: storageTypes.Storage
  ) {}
  
  /**
   * Register activity log by comparing previous and new values
   * Detects changes, makes values consistent, and inserts into database
   * 
   * @param releaseId - The release ID
   * @param updatedByAccountId - Account ID of the user making the update
   * @param updatedAt - Timestamp of the update
   * @param type - High-level field name/type (RELEASE, PLATFORM_TARGET, REGRESSION, CRONCONFIG)
   * @param previousValue - Value before update (can be object or null)
   * @param newValue - Value after update (can be object or null)
   */
  async registerActivityLogs(
    releaseId: string,
    updatedByAccountId: string,
    updatedAt: Date,
    type: string,
    previousValue: Record<string, any> | null,
    newValue: Record<string, any> | null
  ): Promise<void> {
    
    try {
      // Handle ADDED case (previousValue is null)
      const isAdded = !previousValue && newValue;
      if (isAdded) {
        const consistentNewValue = this.makeValueConsistent(newValue);
        
        await this.activityLogRepository.create({
          id: uuidv4(),
          releaseId,
          type,
          previousValue: null,
          newValue: consistentNewValue,
          updatedBy: updatedByAccountId
        });
        return;
      }
      
      // Handle REMOVED case (newValue is null)
      const isRemoved = previousValue && !newValue;
      if (isRemoved) {
        const consistentPreviousValue = this.makeValueConsistent(previousValue);
        
        await this.activityLogRepository.create({
          id: uuidv4(),
          releaseId,
          type,
          previousValue: consistentPreviousValue,
          newValue: null,
          updatedBy: updatedByAccountId
        });
        return;
      }
      
      // Handle UPDATED case (compare and log only changed fields)
      const hasBothValues = previousValue && newValue;
      if (hasBothValues) {
        const changedFields: string[] = [];
        const changedPreviousValue: Record<string, any> = {};
        const changedNewValue: Record<string, any> = {};
        
        // Get all unique keys from both objects
        const allKeys = new Set([
          ...Object.keys(previousValue),
          ...Object.keys(newValue)
        ]);
        
        // Compare each field
        for (const key of allKeys) {
          const oldVal = previousValue[key];
          const newVal = newValue[key];
          
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
            releaseId,
            type,
            previousValue: consistentPreviousValue,
            newValue: consistentNewValue,
            updatedBy: updatedByAccountId
          });
        }
      }
      
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get all activity logs for a release
   * 
   * @param releaseId - The release ID
   * @returns Array of activity logs for the release with populated updatedBy account details
   */
  async getActivityLogs(releaseId: string) {
    const logs = await this.activityLogRepository.findByReleaseId(releaseId);
    
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
          updatedAt: log.updatedAt instanceof Date ? log.updatedAt.toISOString() : log.updatedAt, // Convert Date to ISO string
          updatedBy: log.updatedBy, // Keep the account ID
          updatedByAccount: accountDetails, // Add populated account details
          newValue: enrichedNewValue // Replace approvedBy with email if present
        };
      })
    );
    
    return logsWithAccountDetails;
  }

  private async getAccountDetails(accountId: string | null): Promise<AccountDetails | null> {
    return getAccountDetailsUtil(this.storage, accountId, 'Activity Log Service');
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
