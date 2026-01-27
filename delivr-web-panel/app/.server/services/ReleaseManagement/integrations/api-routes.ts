/**
 * Centralized API Routes Configuration
 * 
 * This file contains all backend API endpoint mappings used by the BFF layer.
 * If any backend route changes, update it here in a single place.
 * 
 * Convention:
 * - Static routes: Use constants (e.g., SYSTEM_METADATA)
 * - Dynamic routes: Use arrow functions (e.g., projectManagementVerify)
 */

// ============================================================================
// Project Management Integrations (JIRA, Linear, Asana, etc.)
// ============================================================================

export const PROJECT_MANAGEMENT = {
  /**
   * Verify credentials (stateless - no save)
   * POST /api/v1/apps/:appId/integrations/project-management/verify
   */
  verify: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/project-management/verify`,
  
  /**
   * List all project management integrations
   * GET /api/v1/apps/:appId/integrations/project-management
   */
  list: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/project-management`,
  
  /**
   * Create project management integration
   * POST /api/v1/apps/:appId/integrations/project-management
   */
  create: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/project-management`,
  
  /**
   * Get single integration
   * GET /api/v1/apps/:appId/integrations/project-management/:integrationId
   */
  get: (appId: string, integrationId: string) => 
    `/api/v1/apps/${appId}/integrations/project-management/${integrationId}`,
  
  /**
   * Update integration
   * PUT /api/v1/apps/:appId/integrations/project-management/:integrationId
   */
  update: (appId: string, integrationId: string) => 
    `/api/v1/apps/${appId}/integrations/project-management/${integrationId}`,
  
  /**
   * Delete integration
   * DELETE /api/v1/apps/:appId/integrations/project-management/:integrationId
   */
  delete: (appId: string, integrationId: string) => 
    `/api/v1/apps/${appId}/integrations/project-management/${integrationId}`,
  
  /**
   * Verify existing integration
   * POST /api/v1/apps/:appId/integrations/project-management/:integrationId/verify
   */
  verifyExisting: (appId: string, integrationId: string) => 
    `/api/v1/apps/${appId}/integrations/project-management/${integrationId}/verify`,
  
  /**
   * Project Management Config Routes
   * For managing platform-specific PM configurations
   */
  config: {
    /**
     * Create PM configuration
     * POST /api/v1/apps/:appId/integrations/project-management/config
     */
    create: (appId: string) => 
      `/api/v1/apps/${appId}/integrations/project-management/config`,
    
    /**
     * Get PM configuration
     * GET /api/v1/apps/:appId/integrations/project-management/config/:configId
     */
    get: (appId: string, configId: string) => 
      `/api/v1/apps/${appId}/integrations/project-management/config/${configId}`,
    
    /**
     * Update PM configuration
     * PUT /api/v1/apps/:appId/integrations/project-management/config/:configId
     */
    update: (appId: string, configId: string) => 
      `/api/v1/apps/${appId}/integrations/project-management/config/${configId}`,
    
    /**
     * Delete PM configuration
     * DELETE /api/v1/apps/:appId/integrations/project-management/config/:configId
     */
    delete: (appId: string, configId: string) => 
      `/api/v1/apps/${appId}/integrations/project-management/config/${configId}`,
  },
  
  /**
   * Jira Metadata Routes
   * For fetching Jira-specific metadata (projects, etc.)
   */
  jiraMetadata: {
    /**
     * Get all Jira projects
     * GET /api/v1/apps/:appId/integrations/project-management/:integrationId/jira/metadata/projects
     */
    getProjects: (appId: string, integrationId: string) =>
      `/api/v1/apps/${appId}/integrations/project-management/${integrationId}/jira/metadata/projects`,
  },
} as const;

// ============================================================================
// CI/CD Integrations (Jenkins, GitHub Actions, CircleCI, etc.)
// ============================================================================

export const CICD = {
  /**
   * Verify provider credentials
   * POST /api/v1/apps/:appId/integrations/ci-cd/connections/:providerType/verify
   */
  verifyConnection: (appId: string, providerType: string) => 
    `/api/v1/apps/${appId}/integrations/ci-cd/connections/${providerType}/verify`,
  
  /**
   * Create CI/CD connection
   * POST /api/v1/apps/:appId/integrations/ci-cd/connections/:providerType
   */
  createConnection: (appId: string, providerType: string) => 
    `/api/v1/apps/${appId}/integrations/ci-cd/connections/${providerType}`,
  
  /**
   * Get provider integration
   * GET /api/v1/apps/:appId/integrations/ci-cd/:provider
   */
  getProvider: (appId: string, provider: string) => 
    `/api/v1/apps/${appId}/integrations/ci-cd/${provider}`,
  
  /**
   * Update connection
   * PATCH /api/v1/apps/:appId/integrations/ci-cd/connections/:integrationId
   */
  updateConnection: (appId: string, integrationId: string) => 
    `/api/v1/apps/${appId}/integrations/ci-cd/connections/${integrationId}`,
  
  /**
   * Delete connection
   * DELETE /api/v1/apps/:appId/integrations/ci-cd/connections/:integrationId
   */
  deleteConnection: (appId: string, integrationId: string) => 
    `/api/v1/apps/${appId}/integrations/ci-cd/connections/${integrationId}`,
  
  /**
   * Fetch job parameters (Jenkins/GitHub Actions)
   * POST /api/v1/apps/:appId/integrations/ci-cd/:integrationId/job-parameters
   */
  jobParameters: (appId: string, integrationId: string) => 
    `/api/v1/apps/${appId}/integrations/ci-cd/${integrationId}/job-parameters`,
  
  /**
   * List all workflows (with optional filters)
   * GET /api/v1/apps/:appId/integrations/ci-cd/workflows
   */
  listWorkflows: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/ci-cd/workflows`,
  
  /**
   * Get single workflow
   * GET /api/v1/apps/:appId/integrations/ci-cd/workflows/:workflowId
   */
  getWorkflow: (appId: string, workflowId: string) => 
    `/api/v1/apps/${appId}/integrations/ci-cd/workflows/${workflowId}`,
  
  /**
   * Create workflow
   * POST /api/v1/apps/:appId/integrations/ci-cd/workflows
   */
  createWorkflow: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/ci-cd/workflows`,
  
  /**
   * Update workflow
   * PATCH /api/v1/apps/:appId/integrations/ci-cd/workflows/:workflowId
   */
  updateWorkflow: (appId: string, workflowId: string) => 
    `/api/v1/apps/${appId}/integrations/ci-cd/workflows/${workflowId}`,
  
  /**
   * Delete workflow
   * DELETE /api/v1/apps/:appId/integrations/ci-cd/workflows/:workflowId
   */
  deleteWorkflow: (appId: string, workflowId: string) => 
    `/api/v1/apps/${appId}/integrations/ci-cd/workflows/${workflowId}`,
} as const;

// ============================================================================
// Communication Integrations (Slack, Teams, Discord)
// ============================================================================

export const COMMUNICATION = {
  slack: {
    /**
     * Verify Slack bot token
     * POST /api/v1/apps/:appId/integrations/slack/verify
     */
    verify: (appId: string) => 
      `/api/v1/apps/${appId}/integrations/slack/verify`,
    
    /**
     * Get Slack channels (using stored integration)
     * Backend requires POST with botToken in body
     * POST /api/v1/apps/:appId/integrations/slack/channels
     */
    getChannels: (appId: string) => 
      `/api/v1/apps/${appId}/integrations/slack/channels`,
    
    /**
     * Get Slack channels by Integration ID (uses stored token)
     * GET /api/v1/apps/:appId/integrations/slack/:integrationId/channels
     */
    getChannelsByIntegrationId: (appId: string, integrationId: string) => 
      `/api/v1/apps/${appId}/integrations/slack/${integrationId}/channels`,
    
    /**
     * Create/Update Slack integration
     * POST /api/v1/apps/:appId/integrations/slack
     */
    create: (appId: string) => 
      `/api/v1/apps/${appId}/integrations/slack`,
    
    /**
     * Get Slack integration
     * GET /api/v1/apps/:appId/integrations/slack
     */
    get: (appId: string) => 
      `/api/v1/apps/${appId}/integrations/slack`,
    
    /**
     * Update Slack integration
     * PATCH /api/v1/apps/:appId/integrations/slack
     */
    update: (appId: string) => 
      `/api/v1/apps/${appId}/integrations/slack`,
    
    /**
     * Delete Slack integration
     * DELETE /api/v1/apps/:appId/integrations/slack
     */
    delete: (appId: string) => 
      `/api/v1/apps/${appId}/integrations/slack`,
  },
} as const;

// ============================================================================
// Source Control Management (GitHub, GitLab, Bitbucket)
// ============================================================================

export const SCM = {
  /**
   * Verify SCM connection
   * Backend uses provider-specific routes (e.g., /api/v1/apps/:appId/integrations/scm/github/verify)
   * POST /api/v1/apps/:appId/integrations/scm/:provider/verify
   */
  verify: (appId: string, scmType: string = 'GITHUB') => {
    const provider = scmType.toLowerCase();
    return `/api/v1/apps/${appId}/integrations/scm/${provider}/verify`;
  },
  
  /**
   * Create SCM integration
   * Backend uses provider-specific routes (e.g., /api/v1/apps/:appId/integrations/scm/github)
   * POST /api/v1/apps/:appId/integrations/scm/:provider
   */
  create: (appId: string, scmType: string = 'GITHUB') => {
    const provider = scmType.toLowerCase();
    return `/api/v1/apps/${appId}/integrations/scm/${provider}`;
  },
  
  /**
   * Get SCM integration
   * Backend uses provider-specific routes (e.g., /api/v1/apps/:appId/integrations/scm/github)
   * GET /api/v1/apps/:appId/integrations/scm/:provider
   */
  get: (appId: string, scmType: string = 'GITHUB') => {
    const provider = scmType.toLowerCase();
    return `/api/v1/apps/${appId}/integrations/scm/${provider}`;
  },
  
  /**
   * Update SCM integration
   * Backend uses provider-specific routes (e.g., /api/v1/apps/:appId/integrations/scm/github)
   * PATCH /api/v1/apps/:appId/integrations/scm/:provider
   */
  update: (appId: string, scmType: string = 'GITHUB') => {
    const provider = scmType.toLowerCase();
    return `/api/v1/apps/${appId}/integrations/scm/${provider}`;
  },
  
  /**
   * Delete SCM integration
   * Backend uses provider-specific routes (e.g., /api/v1/apps/:appId/integrations/scm/github)
   * DELETE /api/v1/apps/:appId/integrations/scm/:provider
   */
  delete: (appId: string, scmType: string = 'GITHUB') => {
    const provider = scmType.toLowerCase();
    return `/api/v1/apps/${appId}/integrations/scm/${provider}`;
  },
  
  /**
   * Fetch branches from repository
   * GET /api/v1/apps/:appId/integrations/scm/github/branches
   */
  branches: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/scm/github/branches`,
} as const;

// ============================================================================
// Test Management (Checkmate, TestRail, etc.)
// ============================================================================

export const TEST_MANAGEMENT = {
  /**
   * Verify credentials (stateless - no save)
   * NEW: POST /apps/:appId/integrations/test-management/verify
   */
  verifyCredentials: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/test-management/verify`,
  
  /**
   * List all test management integrations for tenant
   * NEW: GET /apps/:appId/integrations/test-management
   */
  list: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/test-management`,
  
  /**
   * Create test management integration
   * NEW: POST /apps/:appId/integrations/test-management
   */
  create: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/test-management`,
  
  /**
   * Get single integration
   * NEW: GET /apps/:appId/integrations/test-management/:integrationId
   */
  get: (appId: string, integrationId: string) => 
    `/api/v1/apps/${appId}/integrations/test-management/${integrationId}`,
  
  /**
   * Update integration
   * NEW: PUT /apps/:appId/integrations/test-management/:integrationId
   */
  update: (appId: string, integrationId: string) => 
    `/api/v1/apps/${appId}/integrations/test-management/${integrationId}`,
  
  /**
   * Delete integration
   * NEW: DELETE /apps/:appId/integrations/test-management/:integrationId
   */
  delete: (appId: string, integrationId: string) => 
    `/api/v1/apps/${appId}/integrations/test-management/${integrationId}`,
  
  /**
   * Verify existing integration connection
   * NEW: POST /apps/:appId/integrations/test-management/:integrationId/verify
   */
  verify: (appId: string, integrationId: string) => 
    `/api/v1/apps/${appId}/integrations/test-management/${integrationId}/verify`,
  
  /**
   * Checkmate-specific metadata routes
   * NEW: GET /apps/:appId/integrations/test-management/:integrationId/checkmate/metadata/*
   */
  checkmate: {
    /**
     * Get Checkmate projects
     * NEW: GET /apps/:appId/integrations/test-management/:integrationId/checkmate/metadata/projects
     */
    projects: (appId: string, integrationId: string) => 
      `/api/v1/apps/${appId}/integrations/test-management/${integrationId}/checkmate/metadata/projects`,
    
    /**
     * Get Checkmate sections
     * NEW: GET /apps/:appId/integrations/test-management/:integrationId/checkmate/metadata/sections?projectId={projectId}
     */
    sections: (appId: string, integrationId: string) => 
      `/api/v1/apps/${appId}/integrations/test-management/${integrationId}/checkmate/metadata/sections`,
    
    /**
     * Get Checkmate labels
     * NEW: GET /apps/:appId/integrations/test-management/:integrationId/checkmate/metadata/labels?projectId={projectId}
     */
    labels: (appId: string, integrationId: string) => 
      `/api/v1/apps/${appId}/integrations/test-management/${integrationId}/checkmate/metadata/labels`,
    
    /**
     * Get Checkmate squads
     * NEW: GET /apps/:appId/integrations/test-management/:integrationId/checkmate/metadata/squads?projectId={projectId}
     */
    squads: (appId: string, integrationId: string) => 
      `/api/v1/apps/${appId}/integrations/test-management/${integrationId}/checkmate/metadata/squads`,
  },
} as const;

// ============================================================================
// App Distribution (Play Store, App Store, etc.)
// ============================================================================

export const APP_DISTRIBUTION = {
  /**
   * Verify store credentials
   * POST /api/v1/integrations/store/verify
   */
  verify: '/api/v1/integrations/store/verify',
  
  /**
   * Connect/Create store integration
   * PUT /api/v1/integrations/store/connect
   */
  connect: '/api/v1/integrations/store/connect',
  
  /**
   * Update store integration
   * PATCH /api/v1/integrations/store/:integrationId
   */
  update: (integrationId: string) => 
    `/api/v1/integrations/store/${integrationId}`,
  
  /**
   * List all store integrations for tenant
   * GET /api/v1/integrations/store/tenant/:appId
   */
  list: (appId: string) => 
    `/api/v1/integrations/store/tenant/${appId}`,
  
  /**
   * Get single store integration
   * GET /api/v1/integrations/store/:integrationId
   */
  get: (integrationId: string) => 
    `/api/v1/integrations/store/${integrationId}`,
  
  /**
   * Revoke store integration
   * PATCH /api/v1/integrations/store/tenant/:appId/revoke
   */
  revoke: (appId: string, storeType: string, platform: string) => 
    `/api/v1/integrations/store/tenant/${appId}/revoke?storeType=${storeType}&platform=${platform}`,
} as const;

// ============================================================================
// App Store Connect Integrations (Tenant-scoped)
// ============================================================================

export const APPSTORE = {
  /**
   * Verify App Store Connect credentials
   * GET /api/v1/apps/:appId/integrations/app-distribution/appstore/verify
   */
  verify: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/app-distribution/appstore/verify`,
  
  /**
   * Create App Store Connect integration
   * POST /api/v1/apps/:appId/integrations/app-distribution/appstore
   */
  create: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/app-distribution/appstore`,
  
  /**
   * Get App Store Connect integration
   * GET /api/v1/apps/:appId/integrations/app-distribution/appstore
   */
  get: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/app-distribution/appstore`,
  
  /**
   * Update App Store Connect integration
   * PATCH /api/v1/apps/:appId/integrations/app-distribution/appstore
   */
  update: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/app-distribution/appstore`,
  
  /**
   * Delete App Store Connect integration
   * DELETE /api/v1/apps/:appId/integrations/app-distribution/appstore
   */
  delete: (appId: string) => 
    `/api/v1/apps/${appId}/integrations/app-distribution/appstore`,
} as const;

// ============================================================================
// General Management Routes
// ============================================================================

export const MANAGEMENT = {
  /**
   * Get system metadata (available integrations, etc.)
   * GET /api/v1/metadata
   */
  metadata: '/api/v1/metadata',
  
  /**
   * List user's tenants
   * GET /api/v1/tenants
   */
  tenants: '/api/v1/tenants',
  
  /**
   * Get single tenant with integrations
   * GET /api/v1/apps/:appId
   */
  tenant: (appId: string) => 
    `/api/v1/apps/${appId}`,
  
  /**
   * Create tenant
   * POST /api/v1/tenants
   */
  createTenant: '/api/v1/tenants',
  
  /**
   * Delete tenant
   * DELETE /api/v1/apps/:appId
   */
  deleteTenant: (appId: string) => 
    `/api/v1/apps/${appId}`,
} as const;

// ============================================================================
// Helper: Build URL with Query Parameters
// ============================================================================

/**
 * Helper function to build URLs with query parameters
 * 
 * @example
 * buildUrl('/api/workflows', { platform: 'ANDROID', type: 'REGRESSION' })
 * // Returns: '/api/workflows?platform=ANDROID&type=REGRESSION'
 */
export function buildUrlWithQuery(
  baseUrl: string, 
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!params) return baseUrl;
  
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });
  
  const query = queryParams.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

// ============================================================================
// Release Configurations
// ============================================================================

export const RELEASE_CONFIG = {
  /**
   * Create release configuration
   * POST /api/v1/apps/:appId/release-configs
   */
  create: (appId: string) => 
    `/api/v1/apps/${appId}/release-configs`,
  
  /**
   * List all release configurations
   * GET /api/v1/apps/:appId/release-configs
   */
  list: (appId: string) => 
    `/api/v1/apps/${appId}/release-configs`,
  
  /**
   * Get single release configuration
   * GET /api/v1/apps/:appId/release-configs/:configId
   */
  get: (appId: string, configId: string) => 
    `/api/v1/apps/${appId}/release-configs/${configId}`,
  
  /**
   * Update release configuration
   * PUT /api/v1/apps/:appId/release-configs/:configId
   */
  update: (appId: string, configId: string) => 
    `/api/v1/apps/${appId}/release-configs/${configId}`,
  
  /**
   * Delete release configuration
   * DELETE /api/v1/apps/:appId/release-configs/:configId
   */
  delete: (appId: string, configId: string) => 
    `/api/v1/apps/${appId}/release-configs/${configId}`,
};

// ============================================================================
// Export All Routes (Individual Exports)
// ============================================================================

// All route objects are already exported above with their const declarations
// Services should import directly: import { PROJECT_MANAGEMENT, CICD, RELEASE_CONFIG } from './api-routes';

