import {
  TenantsResponse,
  AppsResponse,
  DeploymentsResponse,
  CollabaratorsResponse,
  AccessKeyResponse,
  CreateAppResponse,
  CreateDeploymentsResponse,
  CreateReleaseResponse,
  DeploymentsReleaseResponse,
  AddCollabaratorsResponse,
  UpdateCollabaratorsResponse,
  RemoveCollabaratorsResponse,
  DeleteAppResponse,
  DeleteDeploymentsResponse,
  DeleteTenantResponse,
  CreateAccessKeyResponse,
  DeleteAccessKeyResponse,
  PromoteReleaseToDeploymentResponse,
} from "./types";

// Mock Organizations
export const mockOrganizations: TenantsResponse = {
  organisations: [
    {
      id: "org-1",
      displayName: "TechCorp",
      role: "Owner",
    },
    {
      id: "org-2",
      displayName: "InnovateX",
      role: "Owner",
    },
    {
      id: "org-3",
      displayName: "CodeMaster",
      role: "Collaborator",
    },
    {
      id: "org-4",
      displayName: "DevSolutions",
      role: "Collaborator",
    },
  ],
};

// Mock Apps
export const mockApps: AppsResponse = {
  apps: [
    {
      name: "Mobile Banking App",
      collaborators: {
        "john.doe@techcorp.com": {
          isCurrentAccount: true,
          permission: "Owner",
        },
        "jane.smith@techcorp.com": {
          isCurrentAccount: false,
          permission: "Collaborator",
        },
      },
      deployments: ["Production", "Staging", "Development"],
    },
    {
      name: "E-commerce Platform",
      collaborators: {
        "mike.wilson@techcorp.com": {
          isCurrentAccount: true,
          permission: "Owner",
        },
      },
      deployments: ["Production", "Staging"],
    },
    {
      name: "Fitness Tracker",
      collaborators: {
        "sarah.jones@techcorp.com": {
          isCurrentAccount: true,
          permission: "Owner",
        },
      },
      deployments: ["Production"],
    },
  ],
};

// Mock Deployments
export const mockDeployments: DeploymentsResponse = {
  deployments: [
    {
      id: "deploy-1",
      name: "Production",
      key: "prod-key-abc123def456ghi789",
      packageId: null,
      appId: "app-1",
      createdTime: "2024-01-20T11:00:00.000Z",
      createdAt: "2024-01-20T11:00:00.000Z",
      updatedAt: "2024-01-20T11:00:00.000Z",
    },
    {
      id: "deploy-2",
      name: "Staging",
      key: "staging-key-xyz789mno321pqr654",
      packageId: null,
      appId: "app-1",
      createdTime: "2024-01-20T11:05:00.000Z",
      createdAt: "2024-01-20T11:05:00.000Z",
      updatedAt: "2024-01-20T11:05:00.000Z",
    },
    {
      id: "deploy-3",
      name: "Development",
      key: "dev-key-lmn456opq789rst123",
      packageId: null,
      appId: "app-1",
      createdTime: "2024-01-20T11:10:00.000Z",
      createdAt: "2024-01-20T11:10:00.000Z",
      updatedAt: "2024-01-20T11:10:00.000Z",
    },
    {
      id: "deploy-4",
      name: "QA",
      key: "qa-key-uvw987abc654def321",
      packageId: null,
      appId: "app-1",
      createdTime: "2024-01-20T11:15:00.000Z",
      createdAt: "2024-01-20T11:15:00.000Z",
      updatedAt: "2024-01-20T11:15:00.000Z",
    },
    {
      id: "deploy-5",
      name: "Beta",
      key: "beta-key-ghi321jkl654mno987",
      packageId: null,
      appId: "app-1",
      createdTime: "2024-01-20T11:20:00.000Z",
      createdAt: "2024-01-20T11:20:00.000Z",
      updatedAt: "2024-01-20T11:20:00.000Z",
    },
    {
      id: "deploy-6",
      name: "Alpha",
      key: "alpha-key-pqr123stu456vwx789",
      packageId: null,
      appId: "app-1",
      createdTime: "2024-01-20T11:25:00.000Z",
      createdAt: "2024-01-20T11:25:00.000Z",
      updatedAt: "2024-01-20T11:25:00.000Z",
    },
    {
      id: "deploy-7",
      name: "Canary",
      key: "canary-key-yza987bcd321efg654",
      packageId: null,
      appId: "app-1",
      createdTime: "2024-01-20T11:30:00.000Z",
      createdAt: "2024-01-20T11:30:00.000Z",
      updatedAt: "2024-01-20T11:30:00.000Z",
    },
    {
      id: "deploy-8",
      name: "Integration",
      key: "integration-key-hij321klm987nop543",
      packageId: null,
      appId: "app-1",
      createdTime: "2024-01-20T11:35:00.000Z",
      createdAt: "2024-01-20T11:35:00.000Z",
      updatedAt: "2024-01-20T11:35:00.000Z",
    },
    {
      id: "deploy-9",
      name: "UAT",
      key: "uat-key-qrs654tuv321wxy876",
      packageId: null,
      appId: "app-1",
      createdTime: "2024-01-20T11:40:00.000Z",
      createdAt: "2024-01-20T11:40:00.000Z",
      updatedAt: "2024-01-20T11:40:00.000Z",
    },
    {
      id: "deploy-10",
      name: "Hotfix",
      key: "hotfix-key-zab987cde321fgh654",
      packageId: null,
      appId: "app-1",
      createdTime: "2024-01-20T11:45:00.000Z",
      createdAt: "2024-01-20T11:45:00.000Z",
      updatedAt: "2024-01-20T11:45:00.000Z",
    },
  ],
};

// Mock Collaborators
export const mockCollaborators: CollabaratorsResponse = {
  collaborators: {
    "john.doe@techcorp.com": {
      isCurrentAccount: true,
      permission: "Owner",
    },
    "jane.smith@techcorp.com": {
      isCurrentAccount: false,
      permission: "Collaborator",
    },
    "mike.wilson@techcorp.com": {
      isCurrentAccount: false,
      permission: "Collaborator",
    },
  },
};

// Mock Access Keys
export const mockAccessKeys: AccessKeyResponse = {
  accessKeys: [
    {
      id: "key-1",
      name: "Production Key",
      friendlyName: "Production Key",
      description: null,
      scope: "All",
      createdTime: Date.now() - 86400000, // 1 day ago
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
    },
    {
      id: "key-2",
      name: "Development Key",
      friendlyName: "Development Key",
      description: null,
      scope: "Read",
      createdTime: Date.now() - 172800000, // 2 days ago
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
    },
  ],
};

// Mock Releases
export const mockReleases: DeploymentsReleaseResponse = {
  deployment: {
    name: "Production",
    key: "prod-key-abc123def456ghi789",
    package: {
      label: "v1.5.0",
      appVersion: "1.5.0",
      description: "Major feature update with new dashboard and performance improvements",
      packageHash: "hash-abc123xyz789",
      blobUrl: "https://storage.example.com/releases/v1.5.0.zip",
      size: 3145728, // 3MB
      rollout: 100,
      isMandatory: false,
      isDisabled: false,
      uploadTime: Date.now() - 86400000, // 1 day ago
      releasedBy: "john.doe@techcorp.com",
      releaseMethod: "Manual",
      originalDeployment: null,
      originalLabel: null,
      active: 2500,
      downloaded: 2300,
      failed: 50,
      installed: 2250,
      totalActive: 2500,
    },
    packageHistory: [
      {
        label: "v1.4.2",
        appVersion: "1.4.2",
        description: "Hotfix for critical bug in payment processing",
        packageHash: "hash-def456abc123",
        blobUrl: "https://storage.example.com/releases/v1.4.2.zip",
        size: 2097152, // 2MB
        rollout: 100,
        isMandatory: true,
        isDisabled: false,
        uploadTime: Date.now() - 172800000, // 2 days ago
        releasedBy: "jane.smith@techcorp.com",
        releaseMethod: "Manual",
        originalDeployment: null,
        originalLabel: null,
        active: 2200,
        downloaded: 2100,
        failed: 30,
        installed: 2070,
        totalActive: 2200,
      },
      {
        label: "v1.4.1",
        appVersion: "1.4.1",
        description: "Minor bug fixes and UI improvements",
        packageHash: "hash-ghi789def456",
        blobUrl: "https://storage.example.com/releases/v1.4.1.zip",
        size: 2048576,
        rollout: 100,
        isMandatory: false,
        isDisabled: false,
        uploadTime: Date.now() - 345600000, // 4 days ago
        releasedBy: "mike.wilson@techcorp.com",
        releaseMethod: "Manual",
        originalDeployment: null,
        originalLabel: null,
        active: 2000,
        downloaded: 1900,
        failed: 40,
        installed: 1860,
        totalActive: 2000,
      },
      {
        label: "v1.4.0",
        appVersion: "1.4.0",
        description: "New user profile features and settings page redesign",
        packageHash: "hash-jkl123mno456",
        blobUrl: "https://storage.example.com/releases/v1.4.0.zip",
        size: 2621440, // 2.5MB
        rollout: 100,
        isMandatory: false,
        isDisabled: false,
        uploadTime: Date.now() - 604800000, // 7 days ago
        releasedBy: "sarah.jones@techcorp.com",
        releaseMethod: "Manual",
        originalDeployment: null,
        originalLabel: null,
        active: 1800,
        downloaded: 1700,
        failed: 35,
        installed: 1665,
        totalActive: 1800,
      },
      {
        label: "v1.3.5",
        appVersion: "1.3.5",
        description: "Performance optimizations and caching improvements",
        packageHash: "hash-pqr789stu123",
        blobUrl: "https://storage.example.com/releases/v1.3.5.zip",
        size: 1966080, // 1.9MB
        rollout: 100,
        isMandatory: false,
        isDisabled: false,
        uploadTime: Date.now() - 1209600000, // 14 days ago
        releasedBy: "john.doe@techcorp.com",
        releaseMethod: "Manual",
        originalDeployment: null,
        originalLabel: null,
        active: 1500,
        downloaded: 1400,
        failed: 45,
        installed: 1355,
        totalActive: 1500,
      },
      {
        label: "v1.3.0",
        appVersion: "1.3.0",
        description: "Added dark mode support and accessibility features",
        packageHash: "hash-vwx456yza789",
        blobUrl: "https://storage.example.com/releases/v1.3.0.zip",
        size: 2359296, // 2.25MB
        rollout: 100,
        isMandatory: false,
        isDisabled: false,
        uploadTime: Date.now() - 2419200000, // 28 days ago
        releasedBy: "jane.smith@techcorp.com",
        releaseMethod: "Manual",
        originalDeployment: null,
        originalLabel: null,
        active: 1200,
        downloaded: 1150,
        failed: 25,
        installed: 1125,
        totalActive: 1200,
      },
    ],
  },
};

// Mock Response Creators
export const createMockTenantsResponse = (): TenantsResponse => mockOrganizations;

export const createMockAppsResponse = (): AppsResponse => mockApps;

export const createMockDeploymentsResponse = (): DeploymentsResponse => mockDeployments;

export const createMockCollaboratorsResponse = (): CollabaratorsResponse => mockCollaborators;

export const createMockAccessKeysResponse = (): AccessKeyResponse => mockAccessKeys;

export const createMockReleasesResponse = (): DeploymentsReleaseResponse => mockReleases;

export const createMockCreateAppResponse = (name: string): CreateAppResponse => ({
  app: {
    name,
    collaborators: {
      "dummy@example.com": {
        isCurrentAccount: true,
        permission: "Owner",
      },
    },
    deployments: ["Production"],
  },
});

export const createMockCreateDeploymentResponse = (name: string): CreateDeploymentsResponse => ({
  deployments: {
    id: `deploy-${Date.now()}`,
    name,
    key: `key-${Math.random().toString(36).substr(2, 9)}`,
    packageId: null,
    appId: "app-1",
    createdTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});

export const createMockCreateReleaseResponse = (data: any): CreateReleaseResponse => ({
  package: {
    label: `v${Date.now()}`,
    appVersion: data.packageInfo.appVersion,
    description: data.packageInfo.description || "",
    packageHash: `mock-hash-${Date.now()}`,
    blobUrl: "mock-blob-url",
    size: data.packageFile?.size || 1024000,
    rollout: data.packageInfo.rollout || 100,
    isMandatory: data.packageInfo.isMandatory || false,
    isDisabled: data.packageInfo.isDisabled || false,
    uploadTime: Date.now(),
    releasedBy: "mock-user@example.com",
    releaseMethod: "Manual",
    originalDeployment: null,
    originalLabel: null,
    active: null,
    downloaded: null,
    failed: null,
    installed: null,
    totalActive: null,
  },
});

export const createMockAddCollaboratorResponse = (): AddCollabaratorsResponse => ({
  collaborators: {
    "new@example.com": {
      isCurrentAccount: false,
      permission: "Collaborator",
    },
  },
});

export const createMockUpdateCollaboratorResponse = (): UpdateCollabaratorsResponse => ({
  collaborators: {
    "updated@example.com": {
      isCurrentAccount: false,
      permission: "Collaborator",
    },
  },
});

export const createMockRemoveCollaboratorResponse = (): RemoveCollabaratorsResponse => ({
  collaborators: {},
});

export const createMockDeleteAppResponse = (): DeleteAppResponse => ({
  status: "deleted",
});

export const createMockDeleteDeploymentResponse = (): DeleteDeploymentsResponse => ({
  deployment: {
    id: "deleted-deploy",
    name: "Deleted Deployment",
    key: "deleted-key",
    packageId: null,
    appId: "app-1",
    createdTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});

export const createMockDeleteTenantResponse = (): DeleteTenantResponse => ({
  status: "deleted",
});

export const createMockCreateAccessKeyResponse = (name: string): CreateAccessKeyResponse => ({
  accessKey: {
    name,
    friendlyName: name,
    description: "",
    createdBy: "mock-user",
    createdTime: Date.now(),
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
  },
});

export const createMockDeleteAccessKeyResponse = (): DeleteAccessKeyResponse => ({
  name: "deleted-key",
});

export const createMockPromoteReleaseResponse = (): PromoteReleaseToDeploymentResponse => ({
  package: {
    label: "promoted-v1.2.3",
    appVersion: "1.2.3",
    description: "Promoted release",
    packageHash: "promoted-hash",
    blobUrl: "promoted-blob-url",
    size: 1024000,
    rollout: 100,
    isMandatory: true,
    isDisabled: false,
    uploadTime: Date.now(),
    releasedBy: "promoter@example.com",
    releaseMethod: "Promotion",
    originalDeployment: "Staging",
    originalLabel: "v1.2.3",
    active: null,
    downloaded: null,
    failed: null,
    installed: null,
    totalActive: null,
  },
});
