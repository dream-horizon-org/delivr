import { useQuery } from "react-query";
import axios, { AxiosResponse } from "axios";
import { TenantInfoResponse, Organization } from "~/.server/services/Codepush/types";

export const getTenantInfo = async (tenantId: string): Promise<Organization> => {
  const { data } = await axios.get<null, AxiosResponse<TenantInfoResponse>>(
    `/api/v1/tenants/${tenantId}/info`
  );
  return data.organisation;
};

export const useTenantInfo = (tenantId: string | undefined) => {
  return useQuery(
    ["tenant-info", tenantId],
    () => getTenantInfo(tenantId!),
    {
      enabled: !!tenantId,
      staleTime: 30000, // Consider data fresh for 30 seconds
      refetchOnWindowFocus: false,
    }
  );
};

