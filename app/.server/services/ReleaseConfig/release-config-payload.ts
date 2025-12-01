/**
 * Release Config Payload Preparation - BFF Transformation Layer
 * 
 * PURPOSE: Transform UI structure to Backend API contract
 * 
 * TRANSFORMATIONS PERFORMED:
 * 1. ✅ Platform mapping: testManagement platforms (ANDROID → ANDROID_PLAY_STORE)
 * 2. ✅ Case transformation: scheduling.releaseFrequency (WEEKLY → weekly)
 * 3. ✅ Inject system fields: tenantId, createdByAccountId, name (for nested configs)
 * 4. ✅ platformTargets: Combine platforms + targets or pass through
 * 5. ✅ Extract from UI wrappers: providerConfig, slack, etc.
 * 6. ✅ Nest/Unnest: Project management parameters
 * 
 
 */

import type { ReleaseConfiguration, Workflow, JenkinsConfig, GitHubActionsConfig } from '~/types/release-config';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { CICDIntegrationService } from '~/.server/services/ReleaseManagement/integrations';
import { BUILD_ENVIRONMENTS, BUILD_PROVIDERS } from '~/types/release-config-constants';
import { workflowTypeToEnvironment } from '~/types/workflow-mappings';

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
  // Backend TestPlatform enum only accepts 'IOS' or 'ANDROID'
  // UI already uses these values, so return as-is
  if (platform === 'ANDROID' || platform === 'IOS') {
    return platform;
  }
  
  // Fallback: try to extract platform from compound values (for backward compatibility)
  if (platform.includes('ANDROID')) {
    return 'ANDROID';
  }
  if (platform.includes('IOS')) {
    return 'IOS';
  }
  
  // Default fallback
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
    'PRODUCTION': 'CUSTOM',
  };
  return mapping[environment] || environment;
}

/**
 * Transform frontend Workflow to backend Workflow format
 * Handles field renames, enum mappings, and config flattening
 */
function transformWorkflowToBackend(tenantId: string, userId: string) {
  return (workflow: any): any => {
    const { name, provider, environment, platform, providerConfig, id, ...rest } = workflow;
    
    // Extract integration-specific fields from providerConfig
    let integrationId = '';
    let workflowUrl = '';
    let parameters: Record<string, unknown> = {};
    let providerIdentifiers: Record<string, unknown> | undefined;
    
    // Handle provider-specific configurations
    if (providerConfig.type === 'JENKINS') {
      integrationId = providerConfig.integrationId || '';
      workflowUrl = providerConfig.jobUrl || '';
      parameters = {
        jobName: providerConfig.jobName,
        ...(providerConfig.buildParameters && { buildParameters: providerConfig.buildParameters }),
      };
      providerIdentifiers = {
        jobName: providerConfig.jobName,
      };
    } else if (providerConfig.type === 'GITHUB_ACTIONS') {
      integrationId = providerConfig.integrationId || '';
      // Use workflowUrl (preferred) or fallback to workflowPath for backward compatibility
      workflowUrl = providerConfig.workflowUrl || providerConfig.workflowPath || '';
      
      // Extract branch from URL if not provided separately
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
        workflowPath: workflowUrl, // Store full URL as workflowPath in providerIdentifiers
      };
    }
    
    return {
      // Use existing ID if available (for edit mode), otherwise backend will generate
      ...(id && { id }),
      tenantId,
      providerType: provider, // 'JENKINS' | 'GITHUB_ACTIONS'
      integrationId,
      displayName: name,
      workflowUrl,
      ...(providerIdentifiers && { providerIdentifiers }),
      platform, // 'ANDROID' | 'IOS'
      workflowType: mapWorkflowType(environment),
      ...(parameters && Object.keys(parameters).length > 0 && { parameters }),
      createdByAccountId: userId,
    };
  };
}

/**
 * Prepare release config payload for backend API
 */
export function prepareReleaseConfigPayload(
  config: ReleaseConfiguration,
  tenantId: string,
  userId: string
): any {
  console.log('[prepareReleaseConfigPayload] Inputs:', { tenantId, userId, configName: config.name });
  console.log('[prepareReleaseConfigPayload] tenantId type:', typeof tenantId, 'value:', JSON.stringify(tenantId));
  
  // ========================================================================
  // CRITICAL: Extract platformTargets from config
  // NEW API CONTRACT: Backend expects platformTargets array, not separate targets/platforms
  // ========================================================================
  const platformTargets = (config as any).platformTargets || 
    // Fallback: derive from old format if new format not available
    (config.targets && config.platforms ? 
      config.targets.map((target: any) => {
        const platform = config.platforms?.includes('ANDROID' as any) ? 'ANDROID' : 'IOS';
        return { platform, target };
      }) : 
      []);
  
  const payload: any = {
    // ========================================================================
    // BASIC FIELDS - Direct pass-through (UI already matches backend)
    // ========================================================================
    tenantId: tenantId,  // Use parameter, not config.tenantId (UI doesn't have it)
    name: config.name,
    releaseType: config.releaseType,
    
    // ========================================================================
    // TRANSFORMATION 1: Platform Targets - NEW FORMAT
    // Why: Backend now uses platformTargets array instead of separate targets/platforms
    // Format: [{ platform: 'ANDROID', target: 'PLAY_STORE' }]
    // ========================================================================
    platformTargets,
    
    // ========================================================================
    // TRANSFORMATION 2: Build Upload Method - Boolean field
    // Why: Backend expects hasManualBuildUpload (boolean), not buildUploadStep (string enum)
    // true = manual upload, false = CI/CD
    // ========================================================================
    hasManualBuildUpload: config.hasManualBuildUpload,
    
    // ========================================================================
    // NULL-VALIDATION - Only include if provided (optional fields)
    // ========================================================================
    ...(config.description && { description: config.description }),
    ...(config.isDefault !== undefined && { isDefault: config.isDefault }),
    ...(config.baseBranch && { baseBranch: config.baseBranch }),
  };

  // ========================================================================
  // TRANSFORMATION 2: Test Management - Extract from providerConfig wrapper
  // UI Structure: config.testManagementConfig.providerConfig (Checkmate/TestRail/etc)
  // Backend Structure: testManagementConfig (same field name - no conversion needed)
  // Platform Transform: ANDROID → ANDROID, IOS → IOS (backend TestPlatform enum)
  // NOTE: projectId is now platform-specific (in platformConfigurations)
  // ========================================================================
  // Include testManagementConfig if:
  // 1. enabled is true AND providerConfig exists (create/new config)
  // 2. OR testManagementConfig has an id (existing config being updated) AND providerConfig exists
  const hasTestManagement = config.testManagementConfig?.providerConfig && 
    (config.testManagementConfig?.enabled || (config.testManagementConfig as any)?.id);
  
  if (hasTestManagement) {
    console.log('[TestManagement] Including testManagementConfig in payload:', {
      enabled: config.testManagementConfig?.enabled,
      hasId: !!(config.testManagementConfig as any)?.id,
      hasProviderConfig: !!config.testManagementConfig?.providerConfig,
    });
    const providerConfig = config.testManagementConfig.providerConfig as any;
    
    // Transform platformConfigurations: Map platform enums and move fields to parameters
    // Backend expects: { platform: 'IOS' or 'ANDROID' (TestPlatform enum), parameters: { projectId, sectionIds, labelIds, squadIds } }
    const transformedPlatformConfigs = (providerConfig.platformConfigurations || []).map((pc: any) => {
      const originalPlatform = pc.platform;
      const mappedPlatform = mapTestManagementPlatform(pc.platform, config.targets || []);
      console.log(`[TestManagement] Platform mapping: ${originalPlatform} → ${mappedPlatform}`);
      
      // Extract fields that should go into parameters
      const { platform, projectId, sectionIds, labelIds, squadIds, ...rest } = pc;
      
      return {
        platform: mappedPlatform,
        parameters: {
          // projectId is now platform-specific in parameters
          ...(projectId && { projectId }),
          ...(sectionIds && sectionIds.length > 0 && { sectionIds }),
          ...(labelIds && labelIds.length > 0 && { labelIds }),
          ...(squadIds && squadIds.length > 0 && { squadIds }),
          ...rest, // Any other fields
        },
      };
    });
    
    // Backend expects testManagementConfig (with Config suffix)
    payload.testManagementConfig = {
      tenantId: tenantId,
      integrationId: providerConfig.integrationId,
      name: `Test Management for ${config.name || 'Release Config'}`,
      // No global projectId - it's now platform-specific in platformConfigurations
      passThresholdPercent: providerConfig.passThresholdPercent || 100,
      platformConfigurations: transformedPlatformConfigs,
      createdByAccountId: userId,
      // Include id if it exists (needed for update operations)
      ...((config.testManagementConfig as any).id && { id: (config.testManagementConfig as any).id }),
    };
    
    console.log('[TestManagement] Final payload:', JSON.stringify(payload.testManagementConfig, null, 2));
  } else {
    console.log('[TestManagement] Excluding testManagementConfig from payload:', {
      hasTestManagementConfig: !!config.testManagementConfig,
      enabled: config.testManagementConfig?.enabled,
      hasId: !!(config.testManagementConfig as any)?.id,
      hasProviderConfig: !!config.testManagementConfig?.providerConfig,
    });
  }
  // If undefined or disabled, omit entirely (backend optional)

  // ========================================================================
  // TRANSFORMATION 3: Communication - Extract from slack wrapper
  // UI Structure: config.communicationConfig.slack (flexible for multiple providers)
  // Backend Structure: communicationConfig (same field name - no conversion needed)
  // ========================================================================
  if (config.communicationConfig?.slack?.enabled && config.communicationConfig.slack.channelData) {
    // Backend expects communicationConfig (same field name)
    payload.communicationConfig = {
      tenantId: tenantId,
      integrationId: config.communicationConfig.slack.integrationId,
      channelData: config.communicationConfig.slack.channelData,
      // Include id if it exists (needed for update operations)
      ...((config.communicationConfig as any).id && { id: (config.communicationConfig as any).id }),
    };
  }
  // If undefined or disabled, omit entirely (backend optional)

  // ========================================================================
  // TRANSFORMATION 4: Project Management - Nest into parameters object
  // UI Structure: config.projectManagementConfig with flat platformConfigurations
  // Backend Structure: projectManagementConfig (same field name - no conversion needed)
  // ========================================================================
  if (config.projectManagementConfig?.enabled && config.projectManagementConfig.integrationId) {
    const pmConfig = config.projectManagementConfig;
    const pmConfigId = (pmConfig as any).id; // Get id if it exists
    
    // Transform platformConfigurations: UI sends flat structure, backend expects nested "parameters"
    const transformedPMPlatformConfigs = (pmConfig.platformConfigurations || []).map((pc: any) => {
      const { platform, projectKey, issueType, completedStatus, priority, labels, assignee, customFields } = pc;
      return {
        platform,
        parameters: {
          projectKey,
          ...(issueType && { issueType }),
          completedStatus,
          ...(priority && { priority }),
          ...(labels && { labels }),
          ...(assignee && { assignee }),
          ...(customFields && { customFields }),
        },
      };
    });
    
    // Backend expects projectManagementConfig (with Config suffix)
    payload.projectManagementConfig = {
      tenantId: tenantId,
      integrationId: pmConfig.integrationId,
      name: `PM Config for ${config.name || 'Release Config'}`,
      ...(config.description && { description: config.description }),
      platformConfigurations: transformedPMPlatformConfigs,
      createdByAccountId: userId,
      // Include id if it exists (needed for update operations)
      ...(pmConfigId && { id: pmConfigId }),
    };
    
    console.log('[ProjectManagement] Payload includes id:', pmConfigId ? 'YES' : 'NO', pmConfigId);
  }
  // If undefined or disabled, omit entirely (backend optional)

  // ========================================================================
  // TRANSFORMATION 5: Scheduling - Lowercase releaseFrequency
  // Why: Backend expects lowercase enum ("weekly"), UI uses uppercase ("WEEKLY")
  // ========================================================================
  if (config.scheduling) {
    payload.scheduling = {
      ...config.scheduling,
      releaseFrequency: config.scheduling.releaseFrequency.toLowerCase(),
    };
  }

  // ========================================================================
  // TRANSFORMATION 6: Workflows (CI/CD) - Direct pass-through
  // UI now stores workflows in ciConfig.workflows (matches backend contract)
  // Backend contract: ciConfig: { id?: string, workflows: [...] }
  // ========================================================================
  if (config.ciConfig?.workflows && config.ciConfig.workflows.length > 0) {
    payload.ciConfig = {
      // Include existing ciConfig.id if present (for updates)
      ...(config.ciConfig.id && { id: config.ciConfig.id }),
      workflows: config.ciConfig.workflows.map(transformWorkflowToBackend(tenantId, userId))
    };
    console.log('[prepareReleaseConfigPayload] Transformed workflows:', payload.ciConfig.workflows.length);
    if (payload.ciConfig.id) {
      console.log('[prepareReleaseConfigPayload] Including ciConfig.id for update:', payload.ciConfig.id);
    }
  }

  // ========================================================================
  // CLEANUP - Field Exclusions
  // ========================================================================
  // CONSISTENT FIELD NAMES: UI and Backend now use same names!
  // - testManagement ✅
  // - projectManagement ✅
  // - communication ✅
  // 
  // Fields NOT included in payload (UI-only or backend-managed):
  // - id (backend generates)
  // - status (backend manages)
  // - createdAt (backend generates)
  // - updatedAt (backend generates)
  // - targets, platforms (helper arrays, replaced by platformTargets)
  // 
  // Fields included if present:
  // - platformTargets (combines platforms + targets)
  // - hasManualBuildUpload (boolean for build upload method)
  // - workflows (CI/CD configuration)
  // - testManagement, projectManagement, communication (integration configs)

  console.log('[prepareReleaseConfigPayload] Final payload.tenantId:', payload.tenantId);
  console.log('[prepareReleaseConfigPayload] Final payload keys:', Object.keys(payload));
  
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
  // Backend and UI both use 'IOS' and 'ANDROID' - return as-is
  if (backendPlatform === 'ANDROID' || backendPlatform === 'IOS') {
    return backendPlatform;
  }
  
  // Backward compatibility: extract platform from compound values
  if (backendPlatform.startsWith('ANDROID') || backendPlatform.includes('ANDROID')) {
    return 'ANDROID';
  }
  if (backendPlatform.startsWith('IOS') || backendPlatform.includes('IOS')) {
    return 'IOS';
  }
  
  // Default fallback
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
export async function transformFromBackend(
  backendConfig: any,
  userId?: string
): Promise<Partial<ReleaseConfiguration>> {
  const frontendConfig: any = {
    ...backendConfig,
  };
  
  // Remove backend-specific fields that will be transformed to UI format
  // This prevents duplicates (e.g., both projectManagement and projectManagementConfig)
  delete frontendConfig.projectManagement; // Remove if it exists (legacy or duplicate)

  // ========================================================================
  // 1. Reverse platformTargets → platforms + targets
  // Derives UI helper arrays from backend's canonical platformTargets
  // ========================================================================
  if (backendConfig.platformTargets && Array.isArray(backendConfig.platformTargets)) {
    // Extract unique platforms and targets from platformTargets
    frontendConfig.platforms = [...new Set(backendConfig.platformTargets.map((pt: any) => pt.platform))];
    frontendConfig.targets = backendConfig.platformTargets.map((pt: any) => pt.target);
    // Keep platformTargets for backward compatibility
    frontendConfig.platformTargets = backendConfig.platformTargets;
  }

  // ========================================================================
  // 2. Reverse testManagementConfig → testManagementConfig.providerConfig
  // Backend API Response: Uses 'testManagementConfig' (same field name - no conversion needed)
  // UI: testManagementConfig.enabled + providerConfig wrapper
  // NOTE: projectId is now platform-specific (in platformConfigurations)
  // 
  // IMPORTANT: Backend may return data in two formats:
  // 1. Raw backend format: { integrationId, platformConfigurations: [...] }
  // 2. Already transformed format: { enabled, provider, providerConfig: { platformConfigurations: [...] } }
  // ========================================================================
  const testManagementData = backendConfig.testManagementConfig;
  if (testManagementData) {
    // Check if data is already in UI format (has providerConfig) or raw backend format
    const isAlreadyTransformed = testManagementData.providerConfig && testManagementData.providerConfig.platformConfigurations;
    
    let sourcePlatformConfigs: any[] = [];
    let integrationId: string = '';
    let passThresholdPercent: number = 100;
    
    if (isAlreadyTransformed) {
      // Data is already in UI format - extract from providerConfig
      sourcePlatformConfigs = testManagementData.providerConfig.platformConfigurations || [];
      integrationId = testManagementData.integrationId || testManagementData.providerConfig.integrationId || '';
      passThresholdPercent = testManagementData.providerConfig.passThresholdPercent || 100;
    } else {
      // Data is in raw backend format - extract directly
      sourcePlatformConfigs = testManagementData.platformConfigurations || [];
      integrationId = testManagementData.integrationId || '';
      passThresholdPercent = testManagementData.passThresholdPercent || 100;
    }
    
    // Reverse platform mapping: Backend TestPlatform ('IOS' or 'ANDROID') → UI platform ('ANDROID' or 'IOS')
    // Since both use the same values, this is mainly for backward compatibility with old compound values
    // Extract fields from parameters back to direct fields (platform-specific)
    // Backend may return fields directly OR nested in parameters (handle both formats)
    const uiPlatformConfigurations = sourcePlatformConfigs.map((pc: any) => {
      const { platform, parameters = {} } = pc;
      
      // Check if fields are in parameters (expected format) or directly on pc (actual backend response format)
      const hasParametersWithData = parameters && typeof parameters === 'object' && Object.keys(parameters).length > 0;
      
      // Try parameters first (expected format), fallback to direct fields (actual format)
      const projectId = hasParametersWithData ? parameters.projectId : (pc.projectId !== undefined ? pc.projectId : undefined);
      const sectionIds = hasParametersWithData ? (parameters.sectionIds || []) : (pc.sectionIds || []);
      const labelIds = hasParametersWithData ? (parameters.labelIds || []) : (pc.labelIds || []);
      const squadIds = hasParametersWithData ? (parameters.squadIds || []) : (pc.squadIds || []);
      
      return {
        platform: reverseMapTestManagementPlatform(platform),
        // Extract projectId and other fields (support both formats)
        projectId: projectId !== undefined && projectId !== null ? projectId : undefined,
        sectionIds: Array.isArray(sectionIds) ? sectionIds : [],
        labelIds: Array.isArray(labelIds) ? labelIds : [],
        squadIds: Array.isArray(squadIds) ? squadIds : [],
      };
    });
    
    frontendConfig.testManagementConfig = {
      enabled: isAlreadyTransformed ? (testManagementData.enabled !== false) : true,
      provider: isAlreadyTransformed ? (testManagementData.provider || 'checkmate') : 'checkmate',
      integrationId: integrationId,
      projectId: '', // No global projectId - platform-specific now
      // Preserve id for update operations
      ...(testManagementData.id && { id: testManagementData.id }),
      providerConfig: {
        type: 'checkmate',
        integrationId: integrationId,
        projectId: 0, // No global projectId - platform-specific now
        passThresholdPercent: passThresholdPercent,
        platformConfigurations: uiPlatformConfigurations,
        autoCreateRuns: isAlreadyTransformed ? (testManagementData.providerConfig?.autoCreateRuns || false) : false,
        filterType: isAlreadyTransformed ? (testManagementData.providerConfig?.filterType || 'AND') : 'AND',
      },
    };
  } else {
    frontendConfig.testManagementConfig = undefined;
  }

  // ========================================================================
  // 3. Reverse projectManagementConfig → projectManagementConfig (flatten parameters)
  // Backend API Response: Uses 'projectManagementConfig' (with Config suffix)
  // UI: projectManagementConfig with enabled flag and flattened parameters
  // 
  // IMPORTANT: Backend may return data in two formats:
  // 1. Fields in parameters: { platform: "IOS", parameters: { priority, issueType, ... } }
  // 2. Fields directly: { platform: "IOS", priority, issueType, ... }
  // ========================================================================
  const projectManagementData = backendConfig.projectManagementConfig;
  if (projectManagementData) {
    const backend = projectManagementData;
    
    // Flatten parameters object back to top level
    // Handle both formats: fields in parameters OR fields directly on the object
    const uiPlatformConfigurations = (backend.platformConfigurations || []).map((pc: any) => {
      const { platform, parameters = {} } = pc;
      
      // Check if fields are in parameters (expected format) or directly on pc (actual backend response format)
      const hasParametersWithData = parameters && typeof parameters === 'object' && Object.keys(parameters).length > 0;
      
      if (hasParametersWithData) {
        // Fields are in parameters - flatten them
        return {
          platform: platform,
          ...parameters, // Flatten parameters
        };
      } else {
        // Fields are directly on the object - use them as-is (excluding platform which we already extracted)
        const { platform: _, ...restFields } = pc;
        return {
          platform: platform,
          ...restFields, // Include all other fields directly
        };
      }
    });
    
    // UI expects projectManagementConfig (not projectManagement)
    frontendConfig.projectManagementConfig = {
      enabled: true,
      integrationId: backend.integrationId,
      platformConfigurations: uiPlatformConfigurations,
      createReleaseTicket: true,
      linkBuildsToIssues: true,
      // Preserve id for update operations
      ...(backend.id && { id: backend.id }),
    };
  } else {
    frontendConfig.projectManagementConfig = undefined;
  }
  
  // Remove the duplicate projectManagement if it exists (from backend response)
  delete frontendConfig.projectManagement;

  // ========================================================================
  // 4. Reverse communicationConfig → communication.slack (wrap in slack)
  // Backend API Response: Uses 'communicationConfig' (with Config suffix)
  // UI: nested in communication.slack wrapper
  // 
  // IMPORTANT: Backend may return data in two formats:
  // 1. Raw backend format: { integrationId, channelData, ... }
  // 2. Already transformed format: { slack: { enabled, integrationId, channelData } }
  // ========================================================================
  const communicationData = backendConfig.communicationConfig;
  if (communicationData) {
    // Check if data is already in UI format (has slack wrapper) or raw backend format
    const isAlreadyTransformed = communicationData.slack && communicationData.slack.integrationId;
    
    let integrationId: string = '';
    let channelData: any = {};
    let enabled: boolean = true;
    
    if (isAlreadyTransformed) {
      // Data is already in UI format - extract from slack wrapper
      integrationId = communicationData.slack.integrationId || '';
      channelData = communicationData.slack.channelData || {};
      enabled = communicationData.slack.enabled !== false;
    } else {
      // Data is in raw backend format - extract directly
      integrationId = communicationData.integrationId || '';
      channelData = communicationData.channelData || {};
      enabled = true; // Default to enabled if raw format
    }
    
    frontendConfig.communicationConfig = {
      slack: {
        enabled: enabled,
        integrationId: integrationId,
        channelData: channelData,
      },
      email: undefined,
      // Preserve id for update operations
      ...(communicationData.id && { id: communicationData.id }),
    };
  } else {
    frontendConfig.communicationConfig = undefined;
  }

  // ========================================================================
  // 5. Reverse scheduling.releaseFrequency (uppercase)
  // Backend: lowercase ("weekly") → UI: uppercase ("WEEKLY")
  // ========================================================================
  if (backendConfig.scheduling?.releaseFrequency) {
    frontendConfig.scheduling = {
      ...backendConfig.scheduling,
      releaseFrequency: backendConfig.scheduling.releaseFrequency.toUpperCase(),
    };
  }

  // ========================================================================
  // 6. Fetch and populate workflows from ciConfig.workflowIds
  // Backend returns: ciConfig: { id, workflowIds: [...] }
  // UI expects: ciConfig: { id, workflowIds: [...], workflows: Workflow[] }
  // ========================================================================
  if (backendConfig.ciConfig) {
    // Extract workflowIds early for use in error handling
    const workflowIds = backendConfig.ciConfig.workflowIds || [];
    
    if (Array.isArray(workflowIds) && workflowIds.length > 0) {
      try {
        const tenantId = backendConfig.tenantId;
        if (tenantId && userId) {
          // Fetch all workflows for the tenant
          const workflowsResult = await CICDIntegrationService.listAllWorkflows(tenantId, userId);
          
          if (workflowsResult.success && workflowsResult.workflows) {
            // Filter workflows by the IDs in ciConfig.workflowIds
            const matchingWorkflows = workflowsResult.workflows.filter(
              (wf: CICDWorkflow) => workflowIds.includes(wf.id)
            );
            
            // Convert CICDWorkflow[] to Workflow[]
            const workflows = matchingWorkflows.map(convertCICDWorkflowToWorkflow);
            
            // Populate ciConfig with id, workflowIds (from backend), and workflows (populated for UI)
            frontendConfig.ciConfig = {
              ...(backendConfig.ciConfig.id && { id: backendConfig.ciConfig.id }),
              workflowIds: workflowIds, // Preserve workflowIds from backend GET response
              workflows: workflows // Populated workflows for UI (derived from workflowIds)
            };
            
            console.log('[transformFromBackend] Populated ciConfig.workflows:', workflows.length, 'from', workflowIds.length, 'workflowIds');
          } else {
            console.warn('[transformFromBackend] Failed to fetch workflows:', workflowsResult.error);
            // Still preserve ciConfig.id and workflowIds even if workflows fetch fails
            frontendConfig.ciConfig = {
              ...(backendConfig.ciConfig.id && { id: backendConfig.ciConfig.id }),
              workflowIds: workflowIds,
              workflows: []
            };
          }
        } else {
          console.warn('[transformFromBackend] Missing tenantId or userId, skipping workflow fetch');
          // Still preserve ciConfig.id and workflowIds even if we can't fetch workflows
          frontendConfig.ciConfig = {
            ...(backendConfig.ciConfig.id && { id: backendConfig.ciConfig.id }),
            workflowIds: workflowIds,
            workflows: []
          };
        }
      } catch (error) {
        console.error('[transformFromBackend] Error fetching workflows:', error);
        // Still preserve ciConfig.id and workflowIds even if there's an error
        frontendConfig.ciConfig = {
          ...(backendConfig.ciConfig.id && { id: backendConfig.ciConfig.id }),
          workflowIds: workflowIds,
          workflows: []
        };
      }
    } else if (backendConfig.ciConfig.id) {
      // ciConfig exists but no workflowIds - preserve id with empty arrays
      frontendConfig.ciConfig = {
        id: backendConfig.ciConfig.id,
        workflowIds: [],
        workflows: []
      };
    }
  }

  return frontendConfig;
}

/**
 * Prepare update payload (same as create)
 */
export function prepareUpdatePayload(
  config: Partial<ReleaseConfiguration>,
  tenantId: string,
  userId: string
): any {
  return prepareReleaseConfigPayload(config as ReleaseConfiguration, tenantId, userId);
}

/**
 * Debug helper: Log transformation details
 */
export function logTransformation(before: any, after: any, operation: 'create' | 'update') {
  console.log(`\n🔄 [BFF Transformation] ${operation.toUpperCase()}`);
  console.log('📤 UI Input:', JSON.stringify(before, null, 2).substring(0, 2000));
  console.log('📦 Backend Payload:', JSON.stringify(after, null, 2).substring(0, 5000));
  console.log('✅ Transformations applied:');
  
  const transformations: string[] = [];
  
  if (before.platformTargets && after.platformTargets) {
    transformations.push('  • platformTargets: passed through');
  } else if (before.targets && after.platformTargets) {
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
  if (before.scheduling?.releaseFrequency) {
    transformations.push(`  • scheduling.releaseFrequency: ${before.scheduling.releaseFrequency} → ${after.scheduling?.releaseFrequency} (case transform)`);
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
