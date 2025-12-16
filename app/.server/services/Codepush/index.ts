import axios, { AxiosResponse } from "axios";
import { getBackendBaseURL } from '~/.server/utils/base-url.utils';
import { User } from "../Auth/Auth.interface";
import {
  AcceptTermsRequest,
  AcceptTermsResponse,
  AccessKeyRequest,
  AccessKeyResponse,
  AddCollabaratorsRequest,
  AddCollabaratorsResponse,
  AppsRequest,
  AppsResponse,
  BaseHeader,
  CollabaratorsRequest,
  CollabaratorsResponse,
  CreateAccessKeyRequest,
  CreateAccessKeyResponse,
  CreateAppRequest,
  CreateAppResponse,
  CreateDeploymentsRequest,
  CreateDeploymentsResponse,
  CreateReleaseRequest,
  CreateReleaseResponse,
  DeleteAccessKeyRequest,
  DeleteAccessKeyResponse,
  DeleteAppRequest,
  DeleteAppResponse,
  DeleteDeploymentsRequest,
  DeleteDeploymentsResponse,
  DeleteTenantResponse,
  DeploymentsReleaseRequest,
  DeploymentsReleaseResponse,
  DeploymentsRequest,
  DeploymentsResponse,
  OwnerTermsStatusRequest,
  OwnerTermsStatusResponse,
  PromoteReleaseToDeploymentRequest,
  PromoteReleaseToDeploymentResponse,
  RemoveCollabaratorsRequest,
  RemoveCollabaratorsResponse,
  TenantsRequest,
  TenantsResponse,
  UpdateCollabaratorsRequest,
  UpdateCollabaratorsResponse,
  UpdateDeploymentsReleaseRequest,
  UpdatePackageRequest,
  TenantInfoRequest,
  TenantInfoResponse,
} from "./types";

class Codepush {
  private __client = axios.create({
    baseURL: getBackendBaseURL(),
    timeout: 10000,
  });

  async getUser(token: string): Promise<User> {
    const { data } = await this.__client.get<
      null,
      { status: number; data: User }
    >("/authenticated", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    return data;
  }

  getUserByAccessKey(key: string) {
    return this.__client.get<null, AxiosResponse<Omit<User, "authenticated">>>(
      "/accountByaccessKeyName",
      {
        headers: {
          accessKeyName: key,
        },
      }
    );
  }

  async getTenants(userId: string) {
    const headers: TenantsRequest = {
      userId,
    };

    return this.__client.get<null, AxiosResponse<TenantsResponse>>("/tenants", {
      headers,
    });
  }

  async getSystemMetadata(userId: string) {
    return this.__client.get("/system/metadata", {
      headers: {
        userId,
      },
    });
  }

  async getAppsForTenants(data: AppsRequest) {
    const headers: AppsRequest = data;

    return this.__client.get<null, AxiosResponse<AppsResponse>>("/apps", {
      headers,
    });
  }

  async createAppForTenant(data: CreateAppRequest) {
    const headers: CreateAppRequest = data;

    const payload = data.orgId?.length
      ? {
          orgId: data.orgId,
        }
      : {
          orgName: data.orgName,
        };

    return this.__client.post<null, AxiosResponse<CreateAppResponse>>(
      "/apps",
      {
        name: data.name,
        organisation: payload,
      },
      {
        headers,
      }
    );
  }

  async deleteTenant(data: AppsRequest) {
    const headers: Omit<AppsRequest, "userId"> = data;

    return this.__client.delete<null, AxiosResponse<DeleteTenantResponse>>(
      `/tenants/${encodeURIComponent(data.tenant)}`,
      {
        headers,
      }
    );
  }

  async getDeployentsForApp(data: DeploymentsRequest) {
    const headers: DeploymentsRequest = data;

    return this.__client.get<null, AxiosResponse<DeploymentsResponse>>(
      `/apps/${encodeURIComponent(data.appId)}/deployments`,
      {
        headers,
      }
    );
  }

  async deleteDeployentsForApp(data: DeleteDeploymentsRequest) {
    const headers: DeleteDeploymentsRequest = data;

    return this.__client.delete<null, AxiosResponse<DeleteDeploymentsResponse>>(
      `/apps/${encodeURIComponent(data.appId)}/deployments/${encodeURIComponent(
        data.deploymentName
      )}`,
      {
        headers,
      }
    );
  }

  async getCollaboratorForApp(data: CollabaratorsRequest) {
    const headers: CollabaratorsRequest = data;

    return this.__client.get<null, AxiosResponse<CollabaratorsResponse>>(
      `/apps/${encodeURIComponent(data.appId)}/collaborators`,
      {
        headers,
      }
    );
  }

  async deleteAppForTenant(data: DeleteAppRequest) {
    const headers: Omit<DeleteAppRequest, "appId"> = data;

    return this.__client.delete<null, AxiosResponse<DeleteAppResponse>>(
      `/apps/${encodeURIComponent(data.appId)}`,
      {
        headers,
      }
    );
  }

  async addCollaboratorForApp(data: AddCollabaratorsRequest) {
    const headers: AddCollabaratorsRequest = data;

    return this.__client.post<null, AxiosResponse<AddCollabaratorsResponse>>(
      `/apps/${encodeURIComponent(
        data.appId
      )}/collaborators/${encodeURIComponent(data.email)}`,
      {},
      {
        headers,
      }
    );
  }

  async removeCollaboratorForApp(data: RemoveCollabaratorsRequest) {
    const headers: RemoveCollabaratorsRequest = data;

    return this.__client.delete<
      null,
      AxiosResponse<RemoveCollabaratorsResponse>
    >(
      `/apps/${encodeURIComponent(
        data.appId
      )}/collaborators/${encodeURIComponent(data.email)}`,
      {
        headers,
      }
    );
  }

  async updateCollaboratorPermissionForApp(data: UpdateCollabaratorsRequest) {
    const headers: UpdateCollabaratorsRequest = data;

    return this.__client.patch<
      null,
      AxiosResponse<UpdateCollabaratorsResponse>
    >(
      `/apps/${encodeURIComponent(
        data.appId
      )}/collaborators/${encodeURIComponent(data.email)}`,
      {
        role: data.role,
      },
      {
        headers,
      }
    );
  }

  async createDeployentsForApp(data: CreateDeploymentsRequest) {
    const headers: BaseHeader = data;

    return this.__client.post<null, AxiosResponse<CreateDeploymentsResponse>>(
      `/apps/${encodeURIComponent(data.appId)}/deployments`,
      {
        name: data.name,
      },
      {
        headers,
      }
    );
  }

  async getReleasesForDeployentsForApp(data: DeploymentsReleaseRequest) {
    const headers: DeploymentsReleaseRequest = data;

    return this.__client.get<null, AxiosResponse<DeploymentsReleaseResponse>>(
      `/apps/${encodeURIComponent(data.appId)}/deployments/${encodeURIComponent(
        data.deploymentName
      )}`,
      {
        headers,
      }
    );
  }

  async updateReleaseForDeployentForApp(data: UpdateDeploymentsReleaseRequest) {
    const headers: Pick<UpdateDeploymentsReleaseRequest, "tenant" | "userId"> =
      data;
    const body: UpdatePackageRequest = { ...data };

    return this.__client.patch<null, AxiosResponse<DeploymentsReleaseResponse>>(
      `/apps/${encodeURIComponent(data.appId)}/deployments/${encodeURIComponent(
        data.deploymentName
      )}/release`,
      {
        packageInfo: body,
      },
      {
        headers,
      }
    );
  }

  async getAccessKeys(data: AccessKeyRequest) {
    const headers: AccessKeyRequest = data;

    return this.__client.get<null, AxiosResponse<AccessKeyResponse>>(
      `/accessKeys`,
      {
        headers,
      }
    );
  }

  async createAccessKey(data: CreateAccessKeyRequest) {
    const headers: AccessKeyRequest = data;

    return this.__client.post<null, AxiosResponse<CreateAccessKeyResponse>>(
      `/accessKeys`,
      {
        friendlyName: data.name,
        scope: data.access,
      },
      {
        headers,
      }
    );
  }

  async deleteAccessKey(data: DeleteAccessKeyRequest) {
    const headers: BaseHeader = data;

    return this.__client.delete<null, AxiosResponse<DeleteAccessKeyResponse>>(
      `/accessKeys/${encodeURIComponent(data.name)}`,
      {
        headers,
      }
    );
  }

  async promoteReleaseFromDeployment(data: PromoteReleaseToDeploymentRequest) {
    const headers: Pick<
      PromoteReleaseToDeploymentRequest,
      "userId" | "tenant"
    > = data;

    return this.__client.post<
      null,
      AxiosResponse<PromoteReleaseToDeploymentResponse>
    >(
      `apps/${encodeURIComponent(data.appId)}/deployments/${encodeURIComponent(
        data.sourceDeployment
      )}/promote/${encodeURIComponent(data.targetDeployment)}`,
      {
        packageInfo: {
          appVersion: data.appVersion,
          label: data.label,
          rollout: 1,
          description: data.description,
          isDisabled: data.isDisabled,
          isMandatory: data.isMandatory,
        },
      },
      {
        headers,
      }
    );
  }

  async createRelease(data: CreateReleaseRequest) {
    // Create multipart form data for CodePush server
    const formData = new FormData();
    formData.append("package", data.packageFile);
    formData.append("packageInfo", JSON.stringify(data.packageInfo));

    const headers = {
      "userId": data.userId,
      "tenant": data.tenant,
      "Accept": "application/vnd.code-push.v1+json",
    };

    try {
      // Use axios client for consistency (configured with baseURL)
      const response = await this.__client.post<CreateReleaseResponse>(
        `/apps/${encodeURIComponent(data.appId)}/deployments/${encodeURIComponent(data.deploymentName)}/release`,
        formData,
        { headers }
      );

      return { data: response.data, status: response.status };
    } catch (error: any) {
      // Handle axios errors to preserve original status codes and messages
      if (error.response) {
        // Server responded with error status (4xx, 5xx)
        return {
          data: error.response.data,
          status: error.response.status,
          error: true
        };
      } else if (error.request) {
        // Network error - no response received
        throw new Error("Network error: Unable to reach CodePush server");
      } else {
        // Other error
        throw error;
      }
    }
  }

  async getOwnerTermsStatus(data: OwnerTermsStatusRequest) {
    const headers: Pick<OwnerTermsStatusRequest, "userId"> = data;

    return this.__client.get<null, AxiosResponse<OwnerTermsStatusResponse>>(
      "/account/ownerTermsStatus",
      {
        headers,
      }
    );
  }

  async acceptTerms(data: AcceptTermsRequest) {
    const headers: Pick<AcceptTermsRequest, "userId"> = data;

    return this.__client.post<
      Pick<AcceptTermsRequest, "termsVersion">,
      AxiosResponse<AcceptTermsResponse>
    >(
      "/account/acceptTerms",
      {
        termsVersion: data.termsVersion,
      },
      {
        headers,
      }
    );
  }

  async createOrganization(displayName: string, userId: string) {
    return this.__client.post<
      { displayName: string },
      AxiosResponse<{ organisation: { id: string; displayName: string; role: string; createdBy: string; createdTime: number } }>
    >(
      "/tenants",
      {
        displayName,
      },
      {
        headers: {
          userId: userId,
        },
      }
    );
  }

  // Tenant Collaborator Methods
  async getTenantCollaborators(tenantId: string, userId: string) {
    return this.__client.get<
      null,
      AxiosResponse<{ collaborators: Record<string, { accountId: string; permission: string }> }>
    >(
      `/tenants/${tenantId}/collaborators`,
      {
        headers: {
          userId: userId,
        },
      }
    );
  }

  async addTenantCollaborator(tenantId: string, email: string, permission: string, userId: string) {
    return this.__client.post<
      { email: string; permission: string },
      AxiosResponse<{ message: string }>
    >(
      `/tenants/${tenantId}/collaborators`,
      {
        email,
        permission,
      },
      {
        headers: {
          userId: userId,
        },
      }
    );
  }

  async updateTenantCollaborator(tenantId: string, email: string, permission: string, userId: string) {
    return this.__client.patch<
      { permission: string },
      AxiosResponse<{ message: string }>
    >(
      `/tenants/${tenantId}/collaborators/${encodeURIComponent(email)}`,
      {
        permission,
      },
      {
        headers: {
          userId: userId,
        },
      }
    );
  }

  async removeTenantCollaborator(tenantId: string, email: string, userId: string) {
    return this.__client.delete<
      null,
      AxiosResponse<{ message: string }>
    >(
      `/tenants/${tenantId}/collaborators/${encodeURIComponent(email)}`,
      {
        headers: {
          userId: userId,
        },
      }
    );
  }

  /**
   * Get tenant info with release management setup status
   */
  async getTenantInfo(data: TenantInfoRequest) {
    const headers: Pick<TenantInfoRequest, "userId"> = {
      userId: data.userId,
    };
    
    return this.__client.get<TenantInfoResponse>(
      `/tenants/${data.tenantId}`,
      { headers }
    );
  }
}

export const CodepushService = new Codepush();
