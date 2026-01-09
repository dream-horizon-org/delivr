/**
 * Release Config Payload Preparation - BFF Transformation Layer
 * 
 * PURPOSE: Transform UI structure to Backend API contract
 * 
 * TRANSFORMATIONS PERFORMED:
 * 1. ✅ Platform mapping: testManagement platforms (ANDROID → ANDROID_PLAY_STORE)
 * 2. ✅ Inject system fields: tenantId, createdByAccountId, name (for nested configs)
 * 4. ✅ platformTargets: Combine platforms + targets or pass through
 * 5. ✅ Extract from UI wrappers: providerConfig, slack, etc.
 * 6. ✅ Nest/Unnest: Project management parameters
 * 
 
 */

import type { ReleaseConfiguration, Workflow, JenkinsConfig, GitHubActionsConfig } from '~/types/release-config';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { CICDIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { BUILD_ENVIRONMENTS, BUILD_PROVIDERS, PLATFORMS, TEST_PROVIDERS } from '~/types/release-config-constants';
import { workflowTypeToEnvironment } from '~/types/workflow-mappings';

// ============================================================================
// Type Definitions
// ============================================================================

interface PlatformTarget {
  platform: string;
  target: string;
}

interface BackendWorkflow {
  id?: string;
  tenantId?: string;
  providerType: string;
  integrationId: string;
  displayName: string;
  workflowUrl: string;
  providerIdentifiers?: Record<string, unknown> | null;
  platform: string;
  workflowType: string;
  parameters?: unknown;
  createdByAccountId?: string;
}

interface FrontendWorkflow {
  id?: string;
  name: string;
  provider: string;
  environment: string;
  platform: string;
  providerConfig?: {
    type: string;
    integrationId?: string;
    jobUrl?: string;
    workflowUrl?: string;
    workflowPath?: string;
    branch?: string;
    jobName?: string;
    buildParameters?: Record<string, unknown>;
    inputs?: Record<string, unknown>;
  };
}

interface TestManagementPlatformConfig {
  platform: string;
  projectId?: number;
  sectionIds?: number[];
  labelIds?: number[];
  squadIds?: number[];
  parameters?: {
    projectId?: number;
    sectionIds?: number[];
    labelIds?: number[];
    squadIds?: number[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface TestManagementConfigData {
  id?: string;
  tenantId?: string;
  name?: string;
  enabled?: boolean;
  provider?: string;
  integrationId?: string;
  providerConfig?: {
    platformConfigurations?: TestManagementPlatformConfig[];
    integrationId?: string;
    passThresholdPercent?: number;
    autoCreateRuns?: boolean;
    filterType?: string;
  };
  platformConfigurations?: TestManagementPlatformConfig[];
  passThresholdPercent?: number;
  createdByAccountId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface ProjectManagementPlatformConfig {
  platform: string;
  projectKey?: string;
  issueType?: string;
  completedStatus?: string;
  priority?: string;
  labels?: string[];
  assignee?: string;
  customFields?: Record<string, unknown>;
  parameters?: {
    projectKey?: string;
    issueType?: string;
    completedStatus?: string;
    priority?: string;
    labels?: string[];
    assignee?: string;
    customFields?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ProjectManagementConfigData {
  id?: string;
  tenantId?: string;
  name?: string;
  description?: string;
  integrationId?: string;
  platformConfigurations?: ProjectManagementPlatformConfig[];
  createdByAccountId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface CommunicationConfigData {
  id?: string;
  tenantId?: string;
  integrationId?: string;
  channelData?: Record<string, unknown>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  slack?: {
    enabled?: boolean;
    integrationId?: string;
    channelData?: Record<string, unknown>;
  };
}

interface InitialVersionItem {
  platform?: string;
  target?: string;
  version?: string;
}

interface BackendReleaseConfig {
  tenantId: string;
  name: string;
  description?: string;
  releaseType: string;
  platformTargets: PlatformTarget[];
  baseBranch?: string;
  hasManualBuildUpload?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  ciConfig?: {
    id?: string;
    workflows?: BackendWorkflow[];
  };
  testManagementConfig?: unknown;
  projectManagementConfig?: unknown;
  communicationConfig?: unknown;
  releaseSchedule?: {
    releaseFrequency: string;
    initialVersions?: InitialVersionItem[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Map UI platform to backend TestPlatform enum
 * UI uses simple platforms (ANDROID, IOS)
 * Backend TestPlatform enum expects: 'IOS' or 'ANDROID' (not ANDROID_PLAY_STORE/IOS_APP_STORE)
 * 
 * The UI already stores platforms as 'ANDROID' and 'IOS', which match the backend enum,
 * so we just need to ensure they're in the correct format.
 */
function mapTestManagementPlatform(
  platform: string,
  selectedTargets: string[]
): string {
  if (platform === PLATFORMS.ANDROID || platform === PLATFORMS.IOS) {
    return platform;
  }
  if (platform.includes(PLATFORMS.ANDROID)) {
    return PLATFORMS.ANDROID;
  }
  if (platform.includes(PLATFORMS.IOS)) {
    return PLATFORMS.IOS;
  }
  return platform;
}

/**
 * Map UI BuildEnvironment to backend WorkflowType enum
 */
function mapWorkflowType(environment: string): string {
  const mapping: Record<string, string> = {
    'PRE_REGRESSION': 'PRE_REGRESSION_BUILD',
    'REGRESSION': 'REGRESSION_BUILD',
    'TESTFLIGHT': 'TEST_FLIGHT_BUILD',
    'AAB_BUILD': 'AAB_BUILD',
    'PRODUCTION': 'CUSTOM',
  };
  return mapping[environment] || environment;
}

/**
 * Transform frontend Workflow to backend Workflow format
 * Handles field renames, enum mappings, and config flattening
 */
/**
 * Transform workflow from backend format to backend format (pass-through with validation)
 * Backend format: { displayName, providerType, integrationId, workflowUrl, platform, workflowType, ... }
 */
function transformBackendFormatWorkflow(
  workflow: BackendWorkflow,
  tenantId: string,
  userId: string
): BackendWorkflow {
  return {
    ...workflow,
    tenantId: workflow.tenantId || tenantId,
    createdByAccountId: workflow.createdByAccountId || userId,
  };
}

/**
 * Transform workflow from frontend format to backend format
 * Frontend format: { name, provider, environment, platform, providerConfig: { type, integrationId, ... }, ... }
 * Backend format: { displayName, providerType, integrationId, workflowUrl, platform, workflowType, ... }
 */
function transformFrontendFormatWorkflow(
  workflow: FrontendWorkflow,
  tenantId: string,
  userId: string
): BackendWorkflow {
  const { name, provider, environment, providerConfig, platform, id } = workflow;
  
  if (!providerConfig) {
    throw new Error('Workflow is missing providerConfig. This indicates a data integrity issue.');
  }
  
  let integrationId = '';
  let workflowUrl = '';
  let parameters: Record<string, unknown> = {};
  let providerIdentifiers: Record<string, unknown> | undefined;
  
  if (providerConfig.type === BUILD_PROVIDERS.JENKINS) {
    integrationId = providerConfig.integrationId || '';
    workflowUrl = providerConfig.jobUrl || '';
    parameters = {
      jobName: providerConfig.jobName,
      ...(providerConfig.buildParameters && { buildParameters: providerConfig.buildParameters }),
    };
    providerIdentifiers = {
      jobName: providerConfig.jobName,
    };
  } else if (providerConfig.type === BUILD_PROVIDERS.GITHUB_ACTIONS) {
    integrationId = providerConfig.integrationId || '';
    workflowUrl = providerConfig.workflowUrl || providerConfig.workflowPath || '';
    
    let branch = providerConfig.branch || 'main';
    if (workflowUrl && !providerConfig.branch) {
      const branchMatch = workflowUrl.match(/\/blob\/([^/]+)\//);
      if (branchMatch) {
        branch = branchMatch[1];
      }
    }
    
    parameters = {
      branch: branch,
      ...(providerConfig.inputs && { inputs: providerConfig.inputs }),
    };
    providerIdentifiers = {
      workflowPath: workflowUrl,
    };
  }
  
  return {
    ...(id && { id }),
    tenantId,
    providerType: provider,
    integrationId,
    displayName: name,
    workflowUrl,
    platform: platform.toUpperCase(),
    workflowType: mapWorkflowType(environment),
    createdByAccountId: userId,
    ...(providerIdentifiers && { providerIdentifiers }),
    ...(Object.keys(parameters).length > 0 && { parameters }),
  };
}

function transformWorkflowToBackend(tenantId: string, userId: string) {
  return (workflow: FrontendWorkflow | BackendWorkflow): BackendWorkflow => {
    const isBackendFormat = 'displayName' in workflow || 
                           ('providerType' in workflow && !('providerConfig' in workflow));
    return isBackendFormat
      ? transformBackendFormatWorkflow(workflow as BackendWorkflow, tenantId, userId)
      : transformFrontendFormatWorkflow(workflow as FrontendWorkflow, tenantId, userId);
  };
}

function transformTestManagementPlatformConfigs(
  platformConfigs: TestManagementPlatformConfig[],
  platformTargets: PlatformTarget[]
): Array<{ platform: string; parameters: Record<string, unknown> }> {
  const targets = platformTargets?.map((pt) => pt.target) || [];
  return (platformConfigs || []).map((pc) => {
    const { platform, projectId, sectionIds, labelIds, squadIds, ...rest } = pc;
    return {
      platform: mapTestManagementPlatform(platform, targets),
      parameters: {
        ...(projectId && { projectId }),
        ...(sectionIds && sectionIds.length > 0 && { sectionIds }),
        ...(labelIds && labelIds.length > 0 && { labelIds }),
        ...(squadIds && squadIds.length > 0 && { squadIds }),
        ...rest,
      },
    };
  });
}

function transformTestManagementConfig(
  config: ReleaseConfiguration,
  tenantId: string,
  userId: string
): {
  tenantId: string;
  integrationId: string;
  name: string;
  passThresholdPercent: number;
  platformConfigurations: Array<{ platform: string; parameters: Record<string, unknown> }>;
  createdByAccountId: string;
  id?: string;
} | undefined {
  const tmConfig = config.testManagementConfig;
  if (!tmConfig?.enabled || !tmConfig.integrationId) return undefined;
  return {
    tenantId,
    integrationId: tmConfig.integrationId,
    name: `Test Management for ${config.name || 'Release Config'}`,
    passThresholdPercent: tmConfig.passThresholdPercent || 100,
    platformConfigurations: transformTestManagementPlatformConfigs(
      (tmConfig.platformConfigurations || []) as TestManagementPlatformConfig[],
      config.platformTargets || []
    ),
    createdByAccountId: userId,
    ...(tmConfig.id && { id: tmConfig.id }),
  };
}

function transformCommunicationConfig(
  config: ReleaseConfiguration,
  tenantId: string
): {
  tenantId: string;
  integrationId: string;
  channelData: Record<string, unknown>;
  id?: string;
} | undefined {
  const commConfig = config.communicationConfig;
  if (!commConfig?.enabled || !commConfig.integrationId || !commConfig.channelData) return undefined;
  return {
    tenantId,
    integrationId: commConfig.integrationId,
    channelData: commConfig.channelData as unknown as Record<string, unknown>,
    ...(commConfig.id && { id: commConfig.id }),
  };
}

function transformProjectManagementPlatformConfigs(
  platformConfigs: Array<{ platform: string; parameters?: Record<string, unknown> }>
): Array<{ platform: string; parameters: Record<string, unknown> }> {
  // UI now matches backend format - pass through directly
  return (platformConfigs || []).map((pc) => ({
    platform: pc.platform,
    parameters: pc.parameters || {},
  }));
}

function transformProjectManagementConfig(
  config: ReleaseConfiguration,
  tenantId: string,
  userId: string
): {
  tenantId: string;
  integrationId: string;
  name: string;
  description?: string;
  platformConfigurations: Array<{ platform: string; parameters: Record<string, unknown> }>;
  createdByAccountId: string;
  id?: string;
} | undefined {
  const pmConfig = config.projectManagementConfig;
  if (!pmConfig?.enabled || !pmConfig.integrationId) return undefined;
  const pmConfigId = (pmConfig as { id?: string }).id;
  return {
    tenantId,
    integrationId: pmConfig.integrationId,
    name: `PM Config for ${config.name || 'Release Config'}`,
    ...(config.description && { description: config.description }),
    platformConfigurations: transformProjectManagementPlatformConfigs(
      pmConfig.platformConfigurations || []
    ),
    createdByAccountId: userId,
    ...(pmConfigId && { id: pmConfigId }),
  };
}

function transformInitialVersions(
  initialVersions: InitialVersionItem[] | undefined,
  platformTargets: PlatformTarget[]
): Array<{ platform: string; target: string; version: string }> {
  if (!initialVersions || !Array.isArray(initialVersions) || platformTargets.length === 0) return [];
  
  // UI now always uses array format - validate and normalize
  return initialVersions
    .filter((item) => {
      if (!item?.platform || !item?.target || !item?.version) return false;
      const platform = item.platform;
      const target = item.target;
      // Validate against platformTargets
      return platformTargets.some(
        (pt) => pt.platform?.toUpperCase() === platform.toUpperCase() && 
                pt.target?.toUpperCase() === target.toUpperCase()
      );
    })
    .map((item) => ({
      platform: item.platform!.toUpperCase(),
      target: item.target!.toUpperCase(),
      version: typeof item.version === 'string' ? item.version.trim() : String(item.version),
    }));
}

function transformReleaseSchedule(
  config: ReleaseConfiguration
): {
  releaseFrequency: string;
  initialVersions: Array<{ platform: string; target: string; version: string }>;
  [key: string]: unknown;
} | undefined {
  if (!config.releaseSchedule) return undefined;
  if (!config.platformTargets || config.platformTargets.length === 0) {
    throw new Error(
      'Cannot configure releaseSchedule: No platform targets selected. ' +
      'This should be prevented by wizard validation. Please select platforms first.'
    );
  }
  const initialVersionsArray = transformInitialVersions(
    config.releaseSchedule.initialVersions,
    config.platformTargets
  );
  if (initialVersionsArray.length === 0) {
    throw new Error(
      'Cannot configure releaseSchedule: No valid initial versions found. ' +
      'Please ensure all selected platforms have valid version numbers in scheduling configuration.'
    );
  }
  return {
    ...config.releaseSchedule,
    releaseFrequency: config.releaseSchedule.releaseFrequency,
    initialVersions: initialVersionsArray,
  };
}

function transformCIConfig(
  config: ReleaseConfiguration,
  tenantId: string,
  userId: string
): {
  id?: string;
  workflows: BackendWorkflow[];
} | undefined {
  if (!config.ciConfig?.workflows || config.ciConfig.workflows.length === 0) return undefined;
  return {
    ...(config.ciConfig.id && { id: config.ciConfig.id }),
    workflows: config.ciConfig.workflows.map(transformWorkflowToBackend(tenantId, userId)),
  };
}

export function prepareReleaseConfigPayload(
  config: ReleaseConfiguration,
  tenantId: string,
  userId: string
): BackendReleaseConfig {
  const payload: BackendReleaseConfig = {
    tenantId,
    name: config.name,
    releaseType: config.releaseType,
    platformTargets: config.platformTargets || [],
    hasManualBuildUpload: config.hasManualBuildUpload,
    ...(config.description && { description: config.description }),
    ...(config.isDefault !== undefined && { isDefault: config.isDefault }),
    ...(config.isActive !== undefined && { isActive: config.isActive }),
    ...(config.baseBranch && { baseBranch: config.baseBranch }),
  };
  const testManagementConfig = transformTestManagementConfig(config, tenantId, userId);
  if (testManagementConfig) payload.testManagementConfig = testManagementConfig;
  const communicationConfig = transformCommunicationConfig(config, tenantId);
  if (communicationConfig) payload.communicationConfig = communicationConfig;
  const projectManagementConfig = transformProjectManagementConfig(config, tenantId, userId);
  if (projectManagementConfig) payload.projectManagementConfig = projectManagementConfig;
  const releaseSchedule = transformReleaseSchedule(config);
  if (releaseSchedule) payload.releaseSchedule = releaseSchedule;
  const ciConfig = transformCIConfig(config, tenantId, userId);
  if (ciConfig) payload.ciConfig = ciConfig;
  return payload;
}

/**
 * Reverse map backend TestPlatform enum to UI platform
 * Backend TestPlatform enum: 'IOS' or 'ANDROID'
 * UI uses: 'ANDROID' or 'IOS'
 * 
 * Since backend and UI now both use 'IOS' and 'ANDROID', this is mainly for backward compatibility
 * with old data that might have 'ANDROID_PLAY_STORE' or 'IOS_APP_STORE' format
 */
function reverseMapTestManagementPlatform(backendPlatform: string): string {
  if (backendPlatform === PLATFORMS.ANDROID || backendPlatform === PLATFORMS.IOS) {
    return backendPlatform;
  }
  if (backendPlatform.startsWith(PLATFORMS.ANDROID) || backendPlatform.includes(PLATFORMS.ANDROID)) {
    return PLATFORMS.ANDROID;
  }
  if (backendPlatform.startsWith(PLATFORMS.IOS) || backendPlatform.includes(PLATFORMS.IOS)) {
    return PLATFORMS.IOS;
  }
  return backendPlatform;
}

/**
 * Convert CICDWorkflow (backend) to Workflow (frontend config)
 * Same logic as convertCICDWorkflowToWorkflow in PipelineEditModal
 */
function convertCICDWorkflowToWorkflow(cicdWorkflow: CICDWorkflow): Workflow {
  const environment = workflowTypeToEnvironment[cicdWorkflow.workflowType] || BUILD_ENVIRONMENTS.PRE_REGRESSION;
  
  let providerConfig: JenkinsConfig | GitHubActionsConfig;
  
  if (cicdWorkflow.providerType === BUILD_PROVIDERS.JENKINS) {
    providerConfig = {
      type: BUILD_PROVIDERS.JENKINS,
      integrationId: cicdWorkflow.integrationId,
      jobUrl: cicdWorkflow.workflowUrl,
      parameters: (cicdWorkflow.parameters as Record<string, string>) || {},
    };
  } else {
    providerConfig = {
      type: BUILD_PROVIDERS.GITHUB_ACTIONS,
      integrationId: cicdWorkflow.integrationId,
      workflowUrl: cicdWorkflow.workflowUrl,
      inputs: ((cicdWorkflow.parameters as any)?.inputs || {}) as Record<string, string>,
    };
  }
  
  return {
    id: cicdWorkflow.id,
    name: cicdWorkflow.displayName,
    platform: cicdWorkflow.platform as any,
    environment: environment,
    provider: cicdWorkflow.providerType as any,
    providerConfig: providerConfig,
    enabled: true,
    timeout: 3600,
    retryAttempts: 3,
  };
}

/**
 * Transform backend response to frontend schema
 * Reverse transformation: Backend → Frontend
 * 
 * SIMPLIFIED: UI structure now matches backend, minimal transformation needed
 * 
 * NEW: Fetches workflows from workflowIds in ciConfig and populates workflows array
 */
function reverseTransformTestManagementPlatformConfigs(
  platformConfigs: Array<{ platform: string; parameters?: Record<string, unknown> }>
): Array<{ platform: string; projectId?: number; sectionIds?: number[]; labelIds?: number[]; squadIds?: number[] }> {
  // Backend format: { platform, parameters: { projectId, sectionIds, ... } }
  // UI format: { platform, projectId, sectionIds, ... } (flat)
  return (platformConfigs || []).map((pc) => {
    const { platform, parameters = {} } = pc;
    return {
      platform: reverseMapTestManagementPlatform(platform) as 'ANDROID' | 'IOS',
      projectId: parameters.projectId as number | undefined,
      sectionIds: parameters.sectionIds as number[] | undefined,
      labelIds: parameters.labelIds as number[] | undefined,
      squadIds: parameters.squadIds as number[] | undefined,
    };
  });
}

function reverseTransformTestManagementConfig(
  backendConfig: BackendReleaseConfig
): {
  enabled: boolean;
  provider: string;
  integrationId: string;
  platformConfigurations: Array<{ platform: string; projectId?: number; sectionIds?: number[]; labelIds?: number[]; squadIds?: number[] }>;
  passThresholdPercent: number;
  autoCreateRuns: boolean;
  filterType: string;
  id?: string;
  // Preserve backend metadata
  tenantId?: string;
  name?: string;
  createdByAccountId?: string;
  createdAt?: string;
  updatedAt?: string;
} | undefined {
  const testManagementData = backendConfig.testManagementConfig as TestManagementConfigData | undefined;
  if (!testManagementData || !testManagementData.integrationId) return undefined;
  
  return {
    enabled: testManagementData.enabled !== false,
    provider: testManagementData.provider || TEST_PROVIDERS.CHECKMATE,
    integrationId: testManagementData.integrationId,
    platformConfigurations: reverseTransformTestManagementPlatformConfigs(testManagementData.platformConfigurations || []),
    passThresholdPercent: testManagementData.passThresholdPercent || 100,
    autoCreateRuns: (testManagementData as { autoCreateRuns?: boolean }).autoCreateRuns || false,
    filterType: (testManagementData as { filterType?: string }).filterType || 'AND',
    ...(testManagementData.id && { id: testManagementData.id }),
    // Preserve backend metadata
    ...(testManagementData.tenantId && { tenantId: testManagementData.tenantId }),
    ...(testManagementData.name && { name: testManagementData.name }),
    ...(testManagementData.createdByAccountId && { createdByAccountId: testManagementData.createdByAccountId }),
    ...(testManagementData.createdAt && { 
      createdAt: typeof testManagementData.createdAt === 'string' 
        ? testManagementData.createdAt 
        : testManagementData.createdAt.toISOString() 
    }),
    ...(testManagementData.updatedAt && { 
      updatedAt: typeof testManagementData.updatedAt === 'string' 
        ? testManagementData.updatedAt 
        : testManagementData.updatedAt.toISOString() 
    }),
  };
}

function reverseTransformProjectManagementPlatformConfigs(
  platformConfigs: ProjectManagementPlatformConfig[]
): ProjectManagementPlatformConfig[] {
  // Backend format: { platform, parameters: { projectKey, issueType, ... } }
  // UI format: { platform, parameters: { projectKey, issueType, ... } } (same structure)
  // Pass through directly - preserve nested parameters structure
  return (platformConfigs || []).map((pc) => {
    const { platform, parameters = {} } = pc;
    // Ensure parameters exists (even if empty) and is nested
    return {
      platform,
      parameters: parameters || {},
    } as ProjectManagementPlatformConfig;
  });
}

function reverseTransformProjectManagementConfig(
  backendConfig: BackendReleaseConfig
): {
  enabled: boolean;
  integrationId: string;
  platformConfigurations: Array<{ platform: string; parameters: Record<string, unknown> }>;
  createReleaseTicket: boolean;
  linkBuildsToIssues: boolean;
  id?: string;
  // Preserve backend metadata
  tenantId?: string;
  name?: string;
  description?: string;
  createdByAccountId?: string;
  createdAt?: string;
  updatedAt?: string;
} | undefined {
  const projectManagementData = backendConfig.projectManagementConfig as ProjectManagementConfigData | undefined;
  if (!projectManagementData || !projectManagementData.integrationId) return undefined;
  return {
    enabled: true,
    integrationId: projectManagementData.integrationId,
    platformConfigurations: reverseTransformProjectManagementPlatformConfigs(
      (projectManagementData.platformConfigurations || []) as Array<{ platform: string; parameters?: Record<string, unknown> }>
    ) as Array<{ platform: string; parameters: Record<string, unknown> }>,
    createReleaseTicket: true,
    linkBuildsToIssues: true,
    ...(projectManagementData.id && { id: projectManagementData.id }),
    // Preserve backend metadata
    ...(projectManagementData.tenantId && { tenantId: projectManagementData.tenantId }),
    ...(projectManagementData.name && { name: projectManagementData.name }),
    ...(projectManagementData.description && { description: projectManagementData.description }),
    ...(projectManagementData.createdByAccountId && { createdByAccountId: projectManagementData.createdByAccountId }),
    ...(projectManagementData.createdAt && { 
      createdAt: typeof projectManagementData.createdAt === 'string' 
        ? projectManagementData.createdAt 
        : projectManagementData.createdAt.toISOString() 
    }),
    ...(projectManagementData.updatedAt && { 
      updatedAt: typeof projectManagementData.updatedAt === 'string' 
        ? projectManagementData.updatedAt 
        : projectManagementData.updatedAt.toISOString() 
    }),
  };
}

function reverseTransformCommunicationConfig(
  backendConfig: BackendReleaseConfig
): {
  enabled: boolean;
  integrationId: string;
  channelData: Record<string, unknown>;
  id?: string;
  // Preserve backend metadata
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
} | undefined {
  const communicationData = backendConfig.communicationConfig as CommunicationConfigData | undefined;
  if (!communicationData || !communicationData.integrationId) return undefined;
  
  // Backend format: { integrationId, channelData }
  // UI format: { enabled, integrationId, channelData } (flat)
  return {
    enabled: true,
    integrationId: communicationData.integrationId,
    channelData: communicationData.channelData || {},
    ...(communicationData.id && { id: communicationData.id }),
    // Preserve backend metadata
    ...(communicationData.tenantId && { tenantId: communicationData.tenantId }),
    ...(communicationData.createdAt && { 
      createdAt: typeof communicationData.createdAt === 'string' 
        ? communicationData.createdAt 
        : communicationData.createdAt.toISOString() 
    }),
    ...(communicationData.updatedAt && { 
      updatedAt: typeof communicationData.updatedAt === 'string' 
        ? communicationData.updatedAt 
        : communicationData.updatedAt.toISOString() 
    }),
  };
}

function reverseTransformInitialVersions(
  initialVersions: InitialVersionItem[]
): Array<{ platform: string; target: string; version: string }> | undefined {
  // UI now uses array format - pass through directly
  if (!initialVersions || !Array.isArray(initialVersions)) return undefined;
  return initialVersions
    .filter((item) => item?.platform && item?.target && item?.version)
    .map((item) => ({
      platform: item.platform!.toUpperCase(),
      target: item.target!.toUpperCase(),
      version: typeof item.version === 'string' ? item.version.trim() : String(item.version),
    }));
}

function reverseTransformReleaseSchedule(
  backendConfig: BackendReleaseConfig
): {
  releaseFrequency: string;
  initialVersions: Array<{ platform: string; target: string; version: string }>;
  [key: string]: unknown;
} | undefined {
  if (!backendConfig.releaseSchedule?.releaseFrequency) return undefined;
  const { initialVersions: _, ...restSchedule } = backendConfig.releaseSchedule;
  const transformedInitialVersions = reverseTransformInitialVersions(
    (backendConfig.releaseSchedule.initialVersions || []) as InitialVersionItem[]
  ) || [];
  
  return {
    ...restSchedule,
    releaseFrequency: backendConfig.releaseSchedule.releaseFrequency.toUpperCase(),
    initialVersions: transformedInitialVersions,
  };
}

async function reverseTransformCIConfig(
  backendConfig: BackendReleaseConfig,
  userId?: string
): Promise<{
  id?: string;
  workflowIds: string[];
  workflows: Workflow[];
} | undefined> {
  if (!backendConfig.ciConfig) return undefined;
  const ciConfig = backendConfig.ciConfig as { id?: string; workflowIds?: string[]; workflows?: BackendWorkflow[] };
  const workflowIds = (ciConfig.workflowIds as string[]) || [];
  if (!Array.isArray(workflowIds) || workflowIds.length === 0) {
    if (ciConfig.id) {
      return { id: ciConfig.id, workflowIds: [], workflows: [] };
    }
    return undefined;
  }
  const tenantId = backendConfig.tenantId;
  if (!tenantId || !userId) {
    return {
      ...(ciConfig.id && { id: ciConfig.id }),
      workflowIds,
      workflows: [],
    };
  }
  try {
    const workflowsResult = await CICDIntegrationService.listAllWorkflows(tenantId, userId);
    if (workflowsResult.success && workflowsResult.workflows) {
      const matchingWorkflows = workflowsResult.workflows.filter((wf) => workflowIds.includes(wf.id));
      const workflows = matchingWorkflows.map(convertCICDWorkflowToWorkflow);
      return {
        ...(ciConfig.id && { id: ciConfig.id }),
        workflowIds,
        workflows,
      };
    }
  } catch (error) {
    console.error('[transformFromBackend] Error fetching workflows:', error);
  }
  return {
    ...(ciConfig.id && { id: ciConfig.id }),
    workflowIds,
    workflows: [],
  };
}

export async function transformFromBackend(
  backendConfig: BackendReleaseConfig,
  userId?: string
): Promise<Partial<ReleaseConfiguration>> {
  const frontendConfig: Partial<ReleaseConfiguration> = { ...backendConfig } as unknown as Partial<ReleaseConfiguration>;
  delete (frontendConfig as { projectManagement?: unknown }).projectManagement;
  if (backendConfig.platformTargets && Array.isArray(backendConfig.platformTargets)) {
    frontendConfig.platformTargets = backendConfig.platformTargets as Array<{ platform: 'ANDROID' | 'IOS'; target: 'WEB' | 'PLAY_STORE' | 'APP_STORE' }>;
  }
  const testManagementConfig = reverseTransformTestManagementConfig(backendConfig);
  if (testManagementConfig) frontendConfig.testManagementConfig = testManagementConfig as unknown as ReleaseConfiguration['testManagementConfig'];
  const projectManagementConfig = reverseTransformProjectManagementConfig(backendConfig);
  if (projectManagementConfig) frontendConfig.projectManagementConfig = projectManagementConfig as unknown as ReleaseConfiguration['projectManagementConfig'];
  delete (frontendConfig as { projectManagement?: unknown }).projectManagement;
  const communicationConfig = reverseTransformCommunicationConfig(backendConfig);
  if (communicationConfig) frontendConfig.communicationConfig = communicationConfig as unknown as ReleaseConfiguration['communicationConfig'];
  const releaseSchedule = reverseTransformReleaseSchedule(backendConfig);
  if (releaseSchedule) frontendConfig.releaseSchedule = releaseSchedule as unknown as ReleaseConfiguration['releaseSchedule'];
  const ciConfig = await reverseTransformCIConfig(backendConfig, userId);
  if (ciConfig) frontendConfig.ciConfig = ciConfig as ReleaseConfiguration['ciConfig'];
  return frontendConfig;
}

/**
 * Prepare update payload (same as create)
 * ALWAYS applies transformation since GET transforms backend → frontend format
 * All UI updates are in frontend format and must be transformed to backend format
 */
export function prepareUpdatePayload(
  updates: Partial<ReleaseConfiguration>,
  tenantId: string,
  userId: string
): Partial<BackendReleaseConfig> {
  // Always transform since UI always sends frontend format (from GET transformation)
  return prepareReleaseConfigPayload(updates as ReleaseConfiguration, tenantId, userId);
}

/**
 * Debug helper: Log transformation details
 */
export function logTransformation(
  before: Partial<ReleaseConfiguration> | Partial<BackendReleaseConfig> | BackendReleaseConfig,
  after: Partial<BackendReleaseConfig> | BackendReleaseConfig,
  operation: 'create' | 'update'
): void {
  console.log(`\n🔄 [BFF Transformation] ${operation.toUpperCase()}`);
  console.log('📤 UI Input:', JSON.stringify(before, null, 2).substring(0, 5000));
  console.log('📦 Backend Payload:', JSON.stringify(after, null, 2).substring(0, 5000));
  console.log('✅ Transformations applied:');
  
  const transformations: string[] = [];
  
  if (before.platformTargets && after.platformTargets) {
    transformations.push('  • platformTargets: passed through');
  } else if ('targets' in before && after.platformTargets) {
    transformations.push('  • targets + platforms → platformTargets (derived)');
  }
  if (before.testManagementConfig && after.testManagementConfig) {
    transformations.push('  • testManagementConfig: platform enum mapped (ANDROID → ANDROID_PLAY_STORE)');
  }
  if (before.projectManagementConfig && after.projectManagementConfig) {
    transformations.push('  • projectManagementConfig: parameters nested');
  }
  if (before.communicationConfig && after.communicationConfig) {
    transformations.push('  • communicationConfig: extracted from slack wrapper');
  }
  if (before.releaseSchedule?.releaseFrequency) {
    transformations.push(`  • releaseSchedule.releaseFrequency: passed through (uppercase)`);
  }
  if (before.hasManualBuildUpload !== undefined && after.hasManualBuildUpload !== undefined) {
    transformations.push('  • hasManualBuildUpload: direct pass-through');
  }
  if (before.id && !after.id) {
    transformations.push('  • Removed UI-only fields: id, status, timestamps');
  }
  
  console.log(transformations.join('\n') || '  • No transformations needed');
  console.log('─'.repeat(80) + '\n');
}
