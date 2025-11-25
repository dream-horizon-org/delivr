/**
 * Release Config Payload Preparation - BFF Transformation Layer
 * 
 * PURPOSE: Bridge UI structure (optimized for UX) with Backend API contract
 * 
 * TRANSFORMATIONS PERFORMED:
 * 1. ✅ Remove UI-only fields (id, status, timestamps, buildUploadStep, workflows)
 * 2. ✅ Flatten testManagement (extract from providerConfig)
 * 3. ✅ Flatten projectManagement (add required fields, remove UI fields)
 * 4. ✅ Handle communication (only send if configured, proper structure)
 * 5. ✅ Field renames (targets → defaultTargets, jiraProject → projectManagement)
 * 6. ✅ Case transformations (scheduling.releaseFrequency)
 * 7. ✅ Security injection (createdByAccountId)
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
      workflowUrl = providerConfig.workflowUrl || '';
      parameters = {
        workflowId: providerConfig.workflowId,
        branch: providerConfig.branch,
        ...(providerConfig.inputs && { inputs: providerConfig.inputs }),
      };
      providerIdentifiers = {
        workflowId: providerConfig.workflowId,
        workflowPath: providerConfig.workflowPath,
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
    // NULL-VALIDATION - Only include if provided (optional fields)
    // ========================================================================
    ...(config.description && { description: config.description }),
    ...(config.isDefault !== undefined && { isDefault: config.isDefault }),
    ...(config.baseBranch && { baseBranch: config.baseBranch }),
  };

  // ========================================================================
  // TRANSFORMATION 2: Test Management - Flatten providerConfig structure
  // Why: UI nests config inside "providerConfig", backend expects flat structure
  // ========================================================================
  if (config.testManagement?.enabled && config.testManagement.providerConfig) {
    const providerConfig = config.testManagement.providerConfig as any;
    
    // Type guard: Only Checkmate has the fields we need for backend
    // TestRail would have different structure - handle when implemented
    if (providerConfig.type === 'checkmate' && providerConfig.integrationId) {
      // Transform platformConfigurations: UI sends "ANDROID"/"IOS", backend expects specific enums
      const originalPlatformConfigs = providerConfig.platformConfigurations || [];
      const transformedPlatformConfigs = originalPlatformConfigs.map((pc: any) => {
        const originalPlatform = pc.platform;
        const mappedPlatform = mapTestManagementPlatform(pc.platform, config.targets || []);
        console.log(`[TestManagement] Platform mapping: ${originalPlatform} → ${mappedPlatform}`);
        return {
          ...pc,
          platform: mappedPlatform,
        };
      });
      
      payload.testManagement = {
        tenantId: tenantId,  // Use parameter
        integrationId: providerConfig.integrationId,
        name: `Test Management for ${config.name}`,
        passThresholdPercent: providerConfig.passThresholdPercent || 100,
        platformConfigurations: transformedPlatformConfigs,
        createdByAccountId: userId,
      };
      
      console.log('[TestManagement] Final payload:', JSON.stringify(payload.testManagement, null, 2));
      
      // Verify tenantId is not null/undefined/empty
      if (!payload.testManagement.tenantId || payload.testManagement.tenantId.trim() === '') {
        console.error('[TestManagement] ERROR: tenantId is blank!', payload.testManagement.tenantId);
      }
    }
  }
  // If not enabled or no config, omit entirely (backend optional)

  // ========================================================================
  // TRANSFORMATION 3: Communication - Extract channelData from slack config
  // Why: UI has slack.channelData, backend expects top-level channelData
  // ========================================================================
  if (config.communication?.slack?.enabled && config.communication.slack.channelData) {
    payload.communication = {
      tenantId: tenantId,  // Use parameter
      channelData: config.communication.slack.channelData,
    };
  }
  // If not configured or empty, omit entirely (backend optional)

  // ========================================================================
  // TRANSFORMATION 4: Project Management - Clean and add required fields
  // Why: UI has extra fields (enabled, createReleaseTicket), backend needs tenantId, name
  // Also: Backend expects platformConfigurations with nested "parameters" object
  // ========================================================================
  if (config.jiraProject?.enabled && config.jiraProject.integrationId) {
    // Transform platformConfigurations: UI sends flat structure, backend expects nested "parameters"
    const transformedPMPlatformConfigs = (config.jiraProject.platformConfigurations || []).map((pc: any) => {
      const { platform, projectKey, issueType, completedStatus, priority, labels, assignee, customFields, ...rest } = pc;
      
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
          ...rest, // Any other provider-specific fields
        },
      };
    });
    
    payload.projectManagement = {
      tenantId: tenantId,  // Use parameter
      integrationId: config.jiraProject.integrationId,
      name: `PM Config for ${config.name}`,
      ...(config.description && { description: config.description }),
      platformConfigurations: transformedPMPlatformConfigs,
      createdByAccountId: userId,
    };
    
    console.log('[ProjectManagement] Transformed platformConfigurations:', JSON.stringify(transformedPMPlatformConfigs, null, 2));
    // Explicitly remove UI-only fields: enabled, createReleaseTicket, linkBuildsToIssues
  }

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
  // CLEANUP - Remove UI-only fields that should NOT be sent to backend
  // Why: Backend generates these (id, status, timestamps) or doesn't expect them
  // ========================================================================
  // These fields are NOT included in payload by design:
  // - id (backend generates)
  // - status (backend manages)
  // - createdAt (backend generates)
  // - updatedAt (backend generates)
  // - buildUploadStep (not in API contract)
  // - targets, platforms (replaced by platformTargets)
  // - jiraProject (renamed to projectManagement)
  // 
  // These fields ARE included if present:
  // - platformTargets (NEW: combines platforms + targets)
  // - workflows (CI/CD configuration)

  console.log('[prepareReleaseConfigPayload] Final payload.tenantId:', payload.tenantId);
  console.log('[prepareReleaseConfigPayload] Final payload keys:', Object.keys(payload));
  
  return payload;
}

/**
 * Transform backend response to frontend schema
 * Reverse transformation: Backend → Frontend
 */
export function transformFromBackend(backendConfig: any): Partial<ReleaseConfiguration> {
  const frontendConfig: any = {
    ...backendConfig,
  };

  // Reverse transformation for platformTargets → derive old format for UI compatibility
  if (backendConfig.platformTargets && Array.isArray(backendConfig.platformTargets)) {
    // Extract unique platforms and targets from platformTargets
    frontendConfig.platforms = [...new Set(backendConfig.platformTargets.map((pt: any) => pt.platform))];
    frontendConfig.targets = backendConfig.platformTargets.map((pt: any) => pt.target);
    // Keep platformTargets for new UI components
    frontendConfig.platformTargets = backendConfig.platformTargets;
  }

  // Reverse transformation for projectManagement → jiraProject
  if (backendConfig.projectManagement) {
    frontendConfig.jiraProject = {
      enabled: true,
      integrationId: backendConfig.projectManagement.integrationId,
      platformConfigurations: backendConfig.projectManagement.platformConfigurations,
      // Note: Backend doesn't store createReleaseTicket, linkBuildsToIssues - UI defaults will apply
    };
    delete frontendConfig.projectManagement;
  }

  // Reverse transformation for testManagement (if needed in future)
  if (backendConfig.testManagement) {
    // For now, keep it as-is since UI can handle flat structure
    // If UI needs providerConfig wrapper, add transformation here
  }

  // Reverse transformation for communication
  if (backendConfig.communication?.channelData) {
    frontendConfig.communication = {
      slack: {
        enabled: true,
        integrationId: backendConfig.communication.integrationId || '',
        channelData: backendConfig.communication.channelData,
      },
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
    transformations.push('  • platformTargets: passed through (NEW API format)');
  } else if (before.targets && after.platformTargets) {
    transformations.push('  • targets → platformTargets (legacy fallback)');
  }
  if (before.jiraProject && after.projectManagement) {
    transformations.push('  • jiraProject → projectManagement (flattened)');
  }
  if (before.testManagement?.providerConfig && after.testManagement) {
    transformations.push('  • testManagement.providerConfig → flattened structure');
  }
  if (before.communication && after.communication) {
    transformations.push('  • communication.slack.channelData → communication.channelData');
  }
  if (before.scheduling?.releaseFrequency) {
    transformations.push(`  • scheduling.releaseFrequency: ${before.scheduling.releaseFrequency} → ${after.scheduling?.releaseFrequency}`);
  }
  if (before.id && !after.id) {
    transformations.push('  • Removed UI-only fields: id, status, timestamps');
  }
  
  console.log(transformations.join('\n') || '  • No transformations needed');
  console.log('─'.repeat(80) + '\n');
}
