import { apiGet } from "~/utils/api-client";
import { extractApiErrorMessage } from "~/utils/api-error-utils";
import { TenantsResponse } from "~/.server/services/Codepush/types";
import { AppLevelRole } from "~/constants/permissions";

/**
 * App entity (renamed from Organization/Tenant)
 * Represents a user's app with their role/permission
 */
export type App = {
  id: string;
  name: string;
  displayName: string;
  isAdmin: boolean;
  role: AppLevelRole;
};

/**
 * Organization type (legacy - kept for backward compatibility)
 * Maps to App entity
 * @deprecated Use App type instead
 */
export type Organization = App;

/**
 * Get list of apps (renamed from getOrgList)
 * Fetches apps where the user is a collaborator
 * 
 * Note: Backend returns both `apps` and `organisations` for backward compatibility
 */
export const getAppList = async (): Promise<App[]> => {
  // Use string literal instead of route() since route generator doesn't have /api/v1/apps yet
  const result = await apiGet<{ apps?: TenantsResponse['organisations']; organisations?: TenantsResponse['organisations'] }>(
    "/api/v1/apps"
  );
  
  if (!result.success || !result.data) {
    const errorMessage = extractApiErrorMessage(result.error, 'Failed to fetch apps');
    throw new Error(errorMessage);
  }
  
  // Backend returns both apps and organisations for backward compatibility
  const apps = result.data.apps || result.data.organisations || [];
  
  return apps.map((item) => {
    // Backend returns "Owner" | "Editor" | "Viewer"
    let role: AppLevelRole;
    if (item.role === 'Collaborator') {
      role = AppLevelRole.VIEWER;
    } else if (item.role === AppLevelRole.OWNER || item.role === 'Owner') {
      role = AppLevelRole.OWNER;
    } else if (item.role === AppLevelRole.EDITOR || item.role === 'Editor') {
      role = AppLevelRole.EDITOR;
    } else if (item.role === AppLevelRole.VIEWER || item.role === 'Viewer') {
      role = AppLevelRole.VIEWER;
    } else {
      // Fallback to Viewer if unknown role
      role = AppLevelRole.VIEWER;
    }
    
    return {
      id: item.id,
      name: item.displayName, // Use displayName as name
      displayName: item.displayName,
      isAdmin: role === AppLevelRole.OWNER,
      role,
    };
  });
};

/**
 * Get list of organizations (legacy function - delegates to getAppList)
 * @deprecated Use getAppList instead
 */
export const getOrgList = async (): Promise<Organization[]> => {
  return getAppList();
};
