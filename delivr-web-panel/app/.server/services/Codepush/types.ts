// ============================================================================
// Integration Type Constants (Re-exported from shared constants)
// ============================================================================

import {
  INTEGRATION_TYPES,
  SCM_TYPES,
  TARGET_PLATFORM_TYPES,
  PIPELINE_TYPES,
  COMMUNICATION_TYPES,
  VERIFICATION_STATUS,
} from '~/constants/integrations';

// Re-export for backward compatibility
export {
  INTEGRATION_TYPES,
  SCM_TYPES,
  TARGET_PLATFORM_TYPES,
  PIPELINE_TYPES,
  COMMUNICATION_TYPES,
  VERIFICATION_STATUS,
};

export type {
  IntegrationType,
  SCMType,
  TargetPlatformType,
  PipelineType,
  CommunicationType,
  VerificationStatusType,
} from '~/constants/integrations';

// ============================================================================
// Integration Type Definitions
// ============================================================================

export type SCMIntegration = {
  type: typeof INTEGRATION_TYPES.SCM;
  id: string;
  scmType: (typeof SCM_TYPES)[keyof typeof SCM_TYPES];
  displayName: string;
  owner: string;
  repo: string;
  repositoryUrl: string;
  defaultBranch: string;
  isActive: boolean;
  verificationStatus: (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TargetPlatformIntegration = {
  type: typeof INTEGRATION_TYPES.TARGET_PLATFORM;
  id: string;
  platform: (typeof TARGET_PLATFORM_TYPES)[keyof typeof TARGET_PLATFORM_TYPES];
  displayName: string;
  isActive: boolean;
  verificationStatus: (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];
  // TODO: Add more fields when implemented
};

export type PipelineIntegration = {
  type: typeof INTEGRATION_TYPES.PIPELINE;
  id: string;
  pipelineType: (typeof PIPELINE_TYPES)[keyof typeof PIPELINE_TYPES];
  displayName: string;
  isActive: boolean;
  // TODO: Add more fields when implemented
};

export type CommunicationIntegration = {
  type: typeof INTEGRATION_TYPES.COMMUNICATION;
  id: string;
  communicationType: (typeof COMMUNICATION_TYPES)[keyof typeof COMMUNICATION_TYPES];
  displayName: string;
  isActive: boolean;
  // TODO: Add more fields when implemented
};

export type Integration = 
  | SCMIntegration 
  | TargetPlatformIntegration 
  | PipelineIntegration 
  | CommunicationIntegration;

export type Organization = {
  id: string;
  displayName: string;
  role: "Owner" | "Collaborator";
  releaseManagement?: {
    config?: {
      connectedIntegrations: {
        SOURCE_CONTROL: any[];
        COMMUNICATION: any[];
        CI_CD: any[];
        TEST_MANAGEMENT: any[];
        PROJECT_MANAGEMENT: any[];
        APP_DISTRIBUTION: any[];
      };
      enabledPlatforms: string[];
      enabledTargets: string[];
      allowedReleaseTypes: string[];
      customSettings: Record<string, any>;
    };
  };
};

// Base types for terms-related entities
export type TermsAccountInfo = {
  accountId: string;
  email: string;
};

export type TermsVersionInfo = {
  termsVersion: string;
  acceptedTime: number; // Epoch timestamp
};

export type TermsStatusInfo = {
  termsAccepted: boolean;
  isCurrentVersion: boolean;
  currentRequiredVersion: string;
};

export type OwnershipInfo = {
  isOwner: boolean;
  ownerAppCount: number;
};

// Composed types using base types
export type TermsAcceptance = TermsAccountInfo & TermsVersionInfo & {
  id: string;
};

export type OwnerTermsStatusResponse = TermsAccountInfo & 
  TermsStatusInfo & 
  OwnershipInfo & {
    termsVersion: string | null;
    acceptedTime?: number;
    message?: string;
  };

export type OwnerTermsStatusRequest = BaseHeader;

export type AcceptTermsRequest = BaseHeader & {
  termsVersion: string;
};

export type AcceptTermsResponse = {
  message: string;
  termsAcceptance: TermsAcceptance;
};

// Utility types for different use cases
export type TermsAcceptanceRecord = Pick<TermsAcceptance, 'termsVersion' | 'acceptedTime'>;
export type UserAccountInfo = Pick<TermsAcceptance, 'accountId' | 'email'>;
export type TermsCheckResult = Pick<OwnerTermsStatusResponse, 'termsAccepted' | 'isCurrentVersion'>;
export type OwnershipStatus = Pick<OwnerTermsStatusResponse, 'isOwner' | 'ownerAppCount'>;

type Collaborator = {
  isCurrentAccount: boolean;
  permission: Organization["role"];
};

type Apps = {
  name: string;
  collaborators: Record<string, Collaborator>;
  deployments: string[];
};

type Deployment = {
  id: string;
  name: string;
  key: string;
  packageId: null | string;
  appId: string;
  createdTime: string;
  createdAt: string;
  updatedAt: string;
};

type Package = {
  appVersion: string;
  blobUrl: string;
  description: string;
  isDisabled: boolean;
  isMandatory: boolean;
  label: string;
  originalDeployment: string | null;
  originalLabel: string | null;
  packageHash: string;
  releasedBy: string;
  releaseMethod: string;
  rollout: number;
  size: number;
  uploadTime: number;
  active: number | null;
  downloaded: number | null;
  failed: number | null;
  installed: number | null;
  totalActive: number | null;
  isBundlePatchingEnabled?: boolean;
};

export type UpdatePackageRequest = {
  appVersion: string;
  description: string;
  isDisabled: boolean;
  isMandatory: boolean;
  rollout: number;
  label: string;
};

type AccessKey = {
  createdTime: number;
  expires: number;
  description: null;
  friendlyName: string;
  name: string;
  id: string;
  scope: CreateAccessKeyRequest["access"];
};

export type BaseHeader = {
  userId: string;
};

export type TenantsResponse = {
  organisations: Organization[];
};

export type TenantsRequest = BaseHeader;

export type AppsRequest = BaseHeader & {
  tenant: string;
};

export type DeleteTenantResponse = {
  status: string;
};

export type AppsResponse = {
  apps: Apps[];
};

export type CreateAppRequest =
  | (BaseHeader & {
      name: string;
      orgId: string;
      orgName?: never;
    })
  | (BaseHeader & {
      name: string;
      orgName: string;
      orgId?: never;
    });

export type CreateAppResponse = {
  app: Apps;
};

export type DeploymentsRequest = BaseHeader & {
  appId: string;
  tenant: string;
};

export type DeploymentsResponse = {
  deployments: Deployment[];
};

export type DeleteDeploymentsRequest = BaseHeader & {
  appId: string;
  tenant: string;
  deploymentName: string;
};

export type DeleteDeploymentsResponse = {
  deployment: Deployment;
};

export type CreateDeploymentsRequest = BaseHeader & {
  appId: string;
  name: string;
  tenant: string;
};

export type CreateDeploymentsResponse = {
  deployments: Deployment;
};

export type DeploymentsReleaseRequest = BaseHeader & {
  appId: string;
  deploymentName: string;
  tenant: string;
};

export type DeploymentsReleaseResponse = {
  deployment: {
    name: string;
    key: string;
    package: Package;
    packageHistory: Package[];
  };
};

export type UpdateDeploymentsReleaseRequest = BaseHeader & {
  appId: string;
  deploymentName: string;
  tenant: string;
} & UpdatePackageRequest;

export type UpdateDeploymentsReleaseResponse = {
  deployment: {
    name: string;
    key: string;
    package: Package;
    packageHistory: Package[];
  };
};

export type AccessKeyRequest = BaseHeader;

export type AccessKeyResponse = {
  accessKeys: AccessKey[];
};

export type CreateAccessKeyRequest = BaseHeader & {
  name: string;
  access: "All" | "Write" | "Read";
};

export type DeleteAccessKeyRequest = BaseHeader & {
  name: string;
};

export type DeleteAccessKeyResponse = {
  name: string;
};

export type CreateAccessKeyResponse = {
  accessKey: {
    friendlyName: string;
    description: string;
    name: string;
    createdBy: string;
    createdTime: number;
    expires: number;
  };
};

export type CollabaratorsRequest = BaseHeader & {
  tenant: string;
  appId: string;
};

export type CollabaratorsResponse = {
  collaborators: Record<string, Collaborator>;
};

export type DeleteAppRequest = BaseHeader & {
  tenant: string;
  appId: string;
};

export type DeleteAppResponse = {
  status: string;
};

export type AddCollabaratorsRequest = BaseHeader & {
  tenant: string;
  appId: string;
  email: string;
};

export type AddCollabaratorsResponse = {
  collaborators: Record<string, Collaborator>;
};

export type RemoveCollabaratorsRequest = BaseHeader & {
  tenant: string;
  appId: string;
  email: string;
};

export type RemoveCollabaratorsResponse = {
  collaborators: Record<string, Collaborator>;
};

export type UpdateCollabaratorsRequest = BaseHeader & {
  tenant: string;
  appId: string;
  email: string;
  role: Organization["role"];
};

export type UpdateCollabaratorsResponse = {
  collaborators: Record<string, Collaborator>;
};

export type PromoteReleaseToDeploymentRequest = BaseHeader & {
  sourceDeployment: string;
  targetDeployment: string;
  appVersion: string;
  label: string;
  appId: string;
  description: string;
  isDisabled: boolean;
  isMandatory: boolean;
  tenant: string;
};

export type PromoteReleaseToDeploymentResponse = {
  package: Package;
};

export type CreateReleaseRequest = BaseHeader & {
  tenant: string;
  appId: string;
  deploymentName: string;
  packageFile: File;
  packageInfo: {
    appVersion: string;
    description?: string;
    rollout?: number;
    isMandatory?: boolean;
    isDisabled?: boolean;
  };
};

export type CreateReleaseResponse = {
  package: Package;
};

// Tenant Info Types
export type TenantInfoRequest = BaseHeader & {
  tenantId: string;
};

export type TenantInfoResponse = {
  organisation: Organization;
};
