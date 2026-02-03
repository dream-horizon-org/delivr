/**
 * Unified Activity Log Interfaces
 * Supports activity logging for all entity types (releases, configurations, integrations, etc.)
 */

import type { AccountDetails } from '../../types/release/release.interface';

/**
 * Entity types that can have activity logs
 */
export enum EntityType {
  RELEASE = 'RELEASE',
  CONFIGURATION = 'CONFIGURATION',
  INTEGRATION = 'INTEGRATION',
  DISTRIBUTION = 'DISTRIBUTION'
}

/**
 * Unified activity log interface
 */
export interface UnifiedActivityLog {
  id: string;
  entityType: EntityType;
  entityId: string;
  tenantId: string;
  type: string;
  previousValue: any; // JSON object
  newValue: any; // JSON object
  updatedAt: Date;
  updatedBy: string; // Account ID of user who made the change
  updatedByAccount?: AccountDetails | null; // Populated account details
}

/**
 * DTO for creating activity log
 */
export interface CreateActivityLogDto {
  id: string;
  entityType: EntityType;
  entityId: string;
  tenantId: string;
  type: string;
  previousValue?: any | null;
  newValue?: any | null;
  updatedBy: string;
}
