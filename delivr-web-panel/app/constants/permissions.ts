/**
 * Permission Constants
 * 
 * Centralized constants for tenant/user permissions.
 * Matches backend permission values from collaborators.permission field.
 */

/**
 * Tenant Role Enum
 * Represents user's permission level in a tenant/organization
 */
export enum AppLevelRole {
  OWNER = 'Owner',
  EDITOR = 'Editor',
  VIEWER = 'Viewer',
}

/**
 * Permission constants (for backward compatibility and convenience)
 */
export const PERMISSIONS = {
  OWNER: AppLevelRole.OWNER,
  EDITOR: AppLevelRole.EDITOR,
  VIEWER: AppLevelRole.VIEWER,
} as const;

/**
 * Type for tenant role values
 */
export type AppLevelRoleType = AppLevelRole | null;


