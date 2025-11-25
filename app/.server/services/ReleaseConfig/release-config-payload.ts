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
 * FIELD NAMES NOW CONSISTENT: UI and Backend use same names (testManagement, communication, projectManagement)
 */

import type { ReleaseConfiguration } from '~/types/release-config';

/**
 * Map UI platform to backend TestPlatform enum
 * UI uses simple platforms (ANDROID, IOS)
 * Backend expects specific distribution platforms
 */
function mapTestManagementPlatform(
  platform: string,
  selectedTargets: string[]
): string {
  if (platform === 'ANDROID') {
    // For Android, use PLAY_STORE as primary (can be extended for other targets)
    return 'ANDROID_PLAY_STORE';
  }
  if (platform === 'IOS') {
    // For iOS, use APP_STORE as primary (can be extended for TestFlight)
    return 'IOS_APP_STORE';
  }
  // Fallback: return as-is if already in correct format
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
  // UI Structure: config.testManagement.providerConfig (Checkmate/TestRail/etc)
  // Backend Structure: flat testManagement with platform mapping
  // Platform Transform: ANDROID → ANDROID_PLAY_STORE, IOS → IOS_APP_STORE
  // ========================================================================
  if (config.testManagement?.enabled && config.testManagement.providerConfig) {
    const providerConfig = config.testManagement.providerConfig as any;
    
    // Transform platformConfigurations: Map platform enums
    const transformedPlatformConfigs = (providerConfig.platformConfigurations || []).map((pc: any) => {
      const originalPlatform = pc.platform;
      const mappedPlatform = mapTestManagementPlatform(pc.platform, config.targets || []);
      console.log(`[TestManagement] Platform mapping: ${originalPlatform} → ${mappedPlatform}`);
      return {
        ...pc,
        platform: mappedPlatform,
      };
    });
    
    payload.testManagement = {
      tenantId: tenantId,
      integrationId: providerConfig.integrationId,
      name: `Test Management for ${config.name}`,
      projectId: providerConfig.projectId || 0, // ✅ ALWAYS include projectId (required for Checkmate)
      passThresholdPercent: providerConfig.passThresholdPercent || 100,
      platformConfigurations: transformedPlatformConfigs,
      createdByAccountId: userId,
    };
    
    console.log('[TestManagement] Final payload:', JSON.stringify(payload.testManagement, null, 2));
  }
  // If undefined or disabled, omit entirely (backend optional)

  // ========================================================================
  // TRANSFORMATION 3: Communication - Extract from slack wrapper
  // UI Structure: config.communication.slack (flexible for multiple providers)
  // Backend Structure: flat communication
  // ========================================================================
  if (config.communication?.slack?.enabled && config.communication.slack.channelData) {
    payload.communication = {
      tenantId: tenantId,
      integrationId: config.communication.slack.integrationId,
      channelData: config.communication.slack.channelData,
    };
  }
  // If undefined or disabled, omit entirely (backend optional)

  // ========================================================================
  // TRANSFORMATION 4: Project Management - Nest into parameters object
  // UI Structure: config.projectManagement with flat platformConfigurations
  // Backend Structure: projectManagement with nested parameters
  // ========================================================================
  if (config.projectManagement?.enabled && config.projectManagement.integrationId) {
    const pmConfig = config.projectManagement;
    
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
    
    payload.projectManagement = {
      tenantId: tenantId,
      integrationId: pmConfig.integrationId,
      name: `PM Config for ${config.name}`,
      ...(config.description && { description: config.description }),
      platformConfigurations: transformedPMPlatformConfigs,
      createdByAccountId: userId,
    };
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
  // TRANSFORMATION 6: Workflows (CI/CD) - Transform UI structure to Backend API
  // Why: UI has different field names and structure than backend expects
  // ========================================================================
  if (config.workflows && config.workflows.length > 0) {
    payload.workflows = config.workflows.map(transformWorkflowToBackend(tenantId, userId));
    console.log('[prepareReleaseConfigPayload] Transformed workflows:', payload.workflows.length);
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
 * ANDROID_PLAY_STORE → ANDROID
 * IOS_APP_STORE → IOS
 */
function reverseMapTestManagementPlatform(backendPlatform: string): string {
  if (backendPlatform.startsWith('ANDROID')) return 'ANDROID';
  if (backendPlatform.startsWith('IOS')) return 'IOS';
  return backendPlatform;
}

/**
 * Transform backend response to frontend schema
 * Reverse transformation: Backend → Frontend
 * 
 * SIMPLIFIED: UI structure now matches backend, minimal transformation needed
 */
export function transformFromBackend(backendConfig: any): Partial<ReleaseConfiguration> {
  const frontendConfig: any = {
    ...backendConfig,
  };

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
  // 2. Reverse testManagement → testManagement.providerConfig
  // Backend: flat testManagement
  // UI: testManagement.enabled + providerConfig wrapper
  // ========================================================================
  if (backendConfig.testManagement) {
    const backend = backendConfig.testManagement;
    
    // Reverse platform mapping: ANDROID_PLAY_STORE → ANDROID
    const uiPlatformConfigurations = (backend.platformConfigurations || []).map((pc: any) => ({
      ...pc,
      platform: reverseMapTestManagementPlatform(pc.platform),
    }));
    
    frontendConfig.testManagement = {
      enabled: true,
      provider: 'checkmate', // Inferred from backend having config
      integrationId: backend.integrationId,
      projectId: backend.projectId?.toString() || '0',
      providerConfig: {
        type: 'checkmate',
        integrationId: backend.integrationId,
        projectId: backend.projectId || 0,
        passThresholdPercent: backend.passThresholdPercent,
        platformConfigurations: uiPlatformConfigurations,
        autoCreateRuns: false, // Not stored in backend
        filterType: 'AND', // Not stored in backend
      },
    };
  } else {
    frontendConfig.testManagement = undefined;
  }

  // ========================================================================
  // 3. Reverse projectManagement → projectManagement (flatten parameters)
  // Backend: nested parameters object
  // UI: flat structure with enabled flag
  // ========================================================================
  if (backendConfig.projectManagement) {
    const backend = backendConfig.projectManagement;
    
    // Flatten parameters object back to top level
    const uiPlatformConfigurations = (backend.platformConfigurations || []).map((pc: any) => ({
      platform: pc.platform,
      ...(pc.parameters || {}), // Flatten parameters
    }));
    
    frontendConfig.projectManagement = {
      enabled: true,
      integrationId: backend.integrationId,
      platformConfigurations: uiPlatformConfigurations,
      createReleaseTicket: true,
      linkBuildsToIssues: true,
    };
  } else {
    frontendConfig.projectManagement = undefined;
  }

  // ========================================================================
  // 4. Reverse communication → communication.slack (wrap in slack)
  // Backend: flat communication
  // UI: nested in communication.slack wrapper
  // ========================================================================
  if (backendConfig.communication) {
    const backend = backendConfig.communication;
    
    frontendConfig.communication = {
      slack: {
        enabled: true,
        integrationId: backend.integrationId || '',
        channelData: backend.channelData || {},
      },
      email: undefined,
    };
  } else {
    frontendConfig.communication = undefined;
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
  console.log('📦 Backend Payload:', JSON.stringify(after, null, 2).substring(0, 2000));
  console.log('✅ Transformations applied:');
  
  const transformations: string[] = [];
  
  if (before.platformTargets && after.platformTargets) {
    transformations.push('  • platformTargets: passed through');
  } else if (before.targets && after.platformTargets) {
    transformations.push('  • targets + platforms → platformTargets (derived)');
  }
  if (before.testManagement && after.testManagement) {
    transformations.push('  • testManagement: platform enum mapped (ANDROID → ANDROID_PLAY_STORE)');
  }
  if (before.projectManagement && after.projectManagement) {
    transformations.push('  • projectManagement: parameters nested');
  }
  if (before.communication && after.communication) {
    transformations.push('  • communication: extracted from slack wrapper');
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
