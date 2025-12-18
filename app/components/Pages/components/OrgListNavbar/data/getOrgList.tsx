import { apiGet } from "~/utils/api-client";
import { route } from "routes-gen";
import { TenantsResponse } from "~/.server/services/Codepush/types";
import { TenantRole } from "~/constants/permissions";

export type Organization = {
  id: string;
  orgName: string;
  isAdmin: boolean;
  role: TenantRole;
};

export const getOrgList = async (): Promise<Organization[]> => {
  // Use apiGet for relative requests to Remix routes (not direct backend calls)
  const result = await apiGet<TenantsResponse>(
    route("/api/v1/tenants")
  );
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch organizations');
  }
  
  return result.data.organisations.map((item) => {
    // Backend returns "Owner" | "Editor" | "Viewer" (despite type saying "Collaborator")
    // Map "Collaborator" to Viewer for backward compatibility if needed
    let role: TenantRole;
    if (item.role === 'Collaborator') {
      role = TenantRole.VIEWER;
    } else if (item.role === TenantRole.OWNER || item.role === 'Owner') {
      role = TenantRole.OWNER;
    } else if (item.role === TenantRole.EDITOR || item.role === 'Editor') {
      role = TenantRole.EDITOR;
    } else if (item.role === TenantRole.VIEWER || item.role === 'Viewer') {
      role = TenantRole.VIEWER;
    } else {
      // Fallback to Viewer if unknown role
      role = TenantRole.VIEWER;
    }
    
    return {
      id: item.id,
      orgName: item.displayName,
      isAdmin: role === TenantRole.OWNER,
      role, // Backend sends Owner/Editor/Viewer from collaborators.permission
    };
  });
};
