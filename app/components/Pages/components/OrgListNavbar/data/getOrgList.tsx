import { apiGet } from "~/utils/api-client";
import { route } from "routes-gen";
import { TenantsResponse } from "~/.server/services/Codepush/types";

type Organization = {
  id: string;
  orgName: string;
  isAdmin: boolean;
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
    return {
      id: item.id,
      orgName: item.displayName,
      isAdmin: item.role === "Owner",
    };
  });
};
