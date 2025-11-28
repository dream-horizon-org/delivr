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
   * POST /tenants/:tenantId/integrations/project-management/verify
   */
  verify: (tenantId: string) => 
    `/tenants/${tenantId}/integrations/project-management/verify`,
  
  /**
   * List all project management integrations
   * GET /tenants/:tenantId/integrations/project-management
   */
  list: (tenantId: string) => 
    `/tenants/${tenantId}/integrations/project-management`,
  
  /**
   * Create project management integration
   * POST /tenants/:tenantId/integrations/project-management
   */
  create: (tenantId: string) => 
    `/tenants/${tenantId}/integrations/project-management`,
  
  /**
   * Get single integration
   * GET /tenants/:tenantId/integrations/project-management/:integrationId
   */
  get: (tenantId: string, integrationId: string) => 
    `/tenants/${tenantId}/integrations/project-management/${integrationId}`,
  
  /**
   * Update integration
   * PUT /tenants/:tenantId/integrations/project-management/:integrationId
   */
  update: (tenantId: string, integrationId: string) => 
    `/tenants/${tenantId}/integrations/project-management/${integrationId}`,
  
  /**
   * Delete integration
   * DELETE /tenants/:tenantId/integrations/project-management/:integrationId
   */
  delete: (tenantId: string, integrationId: string) => 
    `/tenants/${tenantId}/integrations/project-management/${integrationId}`,
  
  /**
   * Verify existing integration
   * POST /tenants/:tenantId/integrations/project-management/:integrationId/verify
   */
  verifyExisting: (tenantId: string, integrationId: string) => 
    `/tenants/${tenantId}/integrations/project-management/${integrationId}/verify`,
  
  /**
   * Project Management Config Routes
   * For managing platform-specific PM configurations
   */
  config: {
    /**
     * Create PM configuration
     * POST /tenants/:tenantId/integrations/project-management/config
     */
    create: (tenantId: string) => 
      `/tenants/${tenantId}/integrations/project-management/config`,
    
    /**
     * Get PM configuration
     * GET /tenants/:tenantId/integrations/project-management/config/:configId
     */
    get: (tenantId: string, configId: string) => 
      `/tenants/${tenantId}/integrations/project-management/config/${configId}`,
    
    /**
     * Update PM configuration
     * PUT /tenants/:tenantId/integrations/project-management/config/:configId
     */
    update: (tenantId: string, configId: string) => 
      `/tenants/${tenantId}/integrations/project-management/config/${configId}`,
    
    /**
     * Delete PM configuration
     * DELETE /tenants/:tenantId/integrations/project-management/config/:configId
     */
    delete: (tenantId: string, configId: string) => 
      `/tenants/${tenantId}/integrations/project-management/config/${configId}`,
  },
} as const;

// ============================================================================
// CI/CD Integrations (Jenkins, GitHub Actions, CircleCI, etc.)
// ============================================================================

export const CICD = {
  /**
   * Verify provider credentials
   * POST /tenants/:tenantId/integrations/ci-cd/connections/:providerType/verify
   */
  verifyConnection: (tenantId: string, providerType: string) => 
    `/tenants/${tenantId}/integrations/ci-cd/connections/${providerType}/verify`,
  
  /**
   * Create CI/CD connection
   * POST /tenants/:tenantId/integrations/ci-cd/connections/:providerType
   */
  createConnection: (tenantId: string, providerType: string) => 
    `/tenants/${tenantId}/integrations/ci-cd/connections/${providerType}`,
  
  /**
   * Get provider integration
   * GET /tenants/:tenantId/integrations/ci-cd/:provider
   */
  getProvider: (tenantId: string, provider: string) => 
    `/tenants/${tenantId}/integrations/ci-cd/${provider}`,
  
  /**
   * Update connection
   * PATCH /tenants/:tenantId/integrations/ci-cd/connections/:integrationId
   */
  updateConnection: (tenantId: string, integrationId: string) => 
    `/tenants/${tenantId}/integrations/ci-cd/connections/${integrationId}`,
  
  /**
   * Delete connection
   * DELETE /tenants/:tenantId/integrations/ci-cd/connections/:integrationId
   */
  deleteConnection: (tenantId: string, integrationId: string) => 
    `/tenants/${tenantId}/integrations/ci-cd/connections/${integrationId}`,
  
  /**
   * Fetch job parameters (Jenkins/GitHub Actions)
   * POST /tenants/:tenantId/integrations/ci-cd/:integrationId/job-parameters
   */
  jobParameters: (tenantId: string, integrationId: string) => 
    `/tenants/${tenantId}/integrations/ci-cd/${integrationId}/job-parameters`,
  
  /**
   * List all workflows (with optional filters)
   * GET /tenants/:tenantId/integrations/ci-cd/workflows
   */
  listWorkflows: (tenantId: string) => 
    `/tenants/${tenantId}/integrations/ci-cd/workflows`,
  
  /**
   * Get single workflow
   * GET /tenants/:tenantId/integrations/ci-cd/workflows/:workflowId
   */
  getWorkflow: (tenantId: string, workflowId: string) => 
    `/tenants/${tenantId}/integrations/ci-cd/workflows/${workflowId}`,
  
  /**
   * Create workflow
   * POST /tenants/:tenantId/integrations/ci-cd/workflows
   */
  createWorkflow: (tenantId: string) => 
    `/tenants/${tenantId}/integrations/ci-cd/workflows`,
  
  /**
   * Update workflow
   * PATCH /tenants/:tenantId/integrations/ci-cd/workflows/:workflowId
   */
  updateWorkflow: (tenantId: string, workflowId: string) => 
    `/tenants/${tenantId}/integrations/ci-cd/workflows/${workflowId}`,
  
  /**
   * Delete workflow
   * DELETE /tenants/:tenantId/integrations/ci-cd/workflows/:workflowId
   */
  deleteWorkflow: (tenantId: string, workflowId: string) => 
    `/tenants/${tenantId}/integrations/ci-cd/workflows/${workflowId}`,
} as const;

// ============================================================================
// Communication Integrations (Slack, Teams, Discord)
// ============================================================================

export const COMMUNICATION = {
  slack: {
    /**
     * Verify Slack bot token
     * POST /tenants/:tenantId/integrations/slack/verify
     */
    verify: (tenantId: string) => 
      `/tenants/${tenantId}/integrations/slack/verify`,
    
    /**
     * Get Slack channels (using stored integration)
     * GET /tenants/:tenantId/integrations/slack/channels
     */
    getChannels: (tenantId: string) => 
      `/tenants/${tenantId}/integrations/slack/channels`,
    
    /**
     * Create/Update Slack integration
     * POST /tenants/:tenantId/integrations/slack
     */
    create: (tenantId: string) => 
      `/tenants/${tenantId}/integrations/slack`,
    
    /**
     * Get Slack integration
     * GET /tenants/:tenantId/integrations/slack
     */
    get: (tenantId: string) => 
      `/tenants/${tenantId}/integrations/slack`,
    
    /**
     * Update Slack integration
     * PATCH /tenants/:tenantId/integrations/slack
     */
    update: (tenantId: string) => 
      `/tenants/${tenantId}/integrations/slack`,
    
    /**
     * Delete Slack integration
     * DELETE /tenants/:tenantId/integrations/slack
     */
    delete: (tenantId: string) => 
      `/tenants/${tenantId}/integrations/slack`,
  },
} as const;

// ============================================================================
// Source Control Management (GitHub, GitLab, Bitbucket)
// ============================================================================

export const SCM = {
  /**
   * Verify SCM connection
   * Backend uses provider-specific routes (e.g., /tenants/:tenantId/integrations/scm/github/verify)
   * POST /tenants/:tenantId/integrations/scm/:provider/verify
   */
  verify: (tenantId: string, scmType: string = 'GITHUB') => {
    const provider = scmType.toLowerCase();
    return `/tenants/${tenantId}/integrations/scm/${provider}/verify`;
  },
  
  /**
   * Create SCM integration
   * Backend uses provider-specific routes (e.g., /tenants/:tenantId/integrations/scm/github)
   * POST /tenants/:tenantId/integrations/scm/:provider
   */
  create: (tenantId: string, scmType: string = 'GITHUB') => {
    const provider = scmType.toLowerCase();
    return `/tenants/${tenantId}/integrations/scm/${provider}`;
  },
  
  /**
   * Get SCM integration
   * Backend uses provider-specific routes (e.g., /tenants/:tenantId/integrations/scm/github)
   * GET /tenants/:tenantId/integrations/scm/:provider
   */
  get: (tenantId: string, scmType: string = 'GITHUB') => {
    const provider = scmType.toLowerCase();
    return `/tenants/${tenantId}/integrations/scm/${provider}`;
  },
  
  /**
   * Update SCM integration
   * Backend uses provider-specific routes (e.g., /tenants/:tenantId/integrations/scm/github)
   * PATCH /tenants/:tenantId/integrations/scm/:provider
   */
  update: (tenantId: string, scmType: string = 'GITHUB') => {
    const provider = scmType.toLowerCase();
    return `/tenants/${tenantId}/integrations/scm/${provider}`;
  },
  
  /**
   * Delete SCM integration
   * Backend uses provider-specific routes (e.g., /tenants/:tenantId/integrations/scm/github)
   * DELETE /tenants/:tenantId/integrations/scm/:provider
   */
  delete: (tenantId: string, scmType: string = 'GITHUB') => {
    const provider = scmType.toLowerCase();
    return `/tenants/${tenantId}/integrations/scm/${provider}`;
  },
  
  /**
   * Fetch branches from repository
   * GET /tenants/:tenantId/integrations/scm/github/branches
   */
  branches: (tenantId: string) => 
    `/tenants/${tenantId}/integrations/scm/github/branches`,
} as const;

// ============================================================================
// Test Management (Checkmate, TestRail, etc.)
// ============================================================================

export const TEST_MANAGEMENT = {
  /**
   * Verify credentials (stateless - no save)
   * POST /test-management/integrations/verify
   */
  verifyCredentials: '/test-management/integrations/verify',
  
  /**
   * List all test management integrations for tenant
   * GET /test-management/tenants/:tenantId/integrations
   */
  list: (tenantId: string) => 
    `/test-management/tenants/${tenantId}/integrations`,
  
  /**
   * Create test management integration
   * POST /test-management/tenants/:tenantId/integrations
   */
  create: (tenantId: string) => 
    `/test-management/tenants/${tenantId}/integrations`,
  
  /**
   * Get single integration
   * GET /test-management/integrations/:integrationId
   */
  get: (integrationId: string) => 
    `/test-management/integrations/${integrationId}`,
  
  /**
   * Update integration
   * PUT /test-management/integrations/:integrationId
   */
  update: (integrationId: string) => 
    `/test-management/integrations/${integrationId}`,
  
  /**
   * Delete integration
   * DELETE /test-management/integrations/:integrationId
   */
  delete: (integrationId: string) => 
    `/test-management/integrations/${integrationId}`,
  
  /**
   * Verify existing integration connection
   * POST /test-management/integrations/:integrationId/verify
   */
  verify: (integrationId: string) => 
    `/test-management/integrations/${integrationId}/verify`,
  
  /**
   * Checkmate-specific metadata routes
   */
  checkmate: {
    /**
     * Get Checkmate projects
     * GET /test-management/integrations/:integrationId/checkmate/metadata/projects
     */
    projects: (integrationId: string) => 
      `/test-management/integrations/${integrationId}/checkmate/metadata/projects`,
    
    /**
     * Get Checkmate sections
     * GET /test-management/integrations/:integrationId/checkmate/metadata/sections?projectId={projectId}
     */
    sections: (integrationId: string) => 
      `/test-management/integrations/${integrationId}/checkmate/metadata/sections`,
    
    /**
     * Get Checkmate labels
     * GET /test-management/integrations/:integrationId/checkmate/metadata/labels?projectId={projectId}
     */
    labels: (integrationId: string) => 
      `/test-management/integrations/${integrationId}/checkmate/metadata/labels`,
    
    /**
     * Get Checkmate squads
     * GET /test-management/integrations/:integrationId/checkmate/metadata/squads?projectId={projectId}
     */
    squads: (integrationId: string) => 
      `/test-management/integrations/${integrationId}/checkmate/metadata/squads`,
  },
} as const;

// ============================================================================
// App Distribution (Play Store, App Store, etc.)
// ============================================================================

export const APP_DISTRIBUTION = {
  /**
   * Verify store credentials
   * POST /integrations/store/verify
   */
  verify: '/integrations/store/verify',
  
  /**
   * Connect/Create store integration
   * PUT /integrations/store/connect
   */
  connect: '/integrations/store/connect',
  
  /**
   * List all store integrations for tenant
   * GET /integrations/store/tenant/:tenantId
   */
  list: (tenantId: string) => 
    `/integrations/store/tenant/${tenantId}`,
  
  /**
   * Get single store integration
   * GET /integrations/store/:integrationId
   */
  get: (integrationId: string) => 
    `/integrations/store/${integrationId}`,
  
  /**
   * Revoke store integration
   * PATCH /integrations/store/tenant/:tenantId/revoke
   */
  revoke: (tenantId: string, storeType: string, platform: string) => 
    `/integrations/store/tenant/${tenantId}/revoke?storeType=${storeType}&platform=${platform}`,
} as const;

// ============================================================================
// App Store Connect Integrations (Tenant-scoped)
// ============================================================================

export const APPSTORE = {
  /**
   * Verify App Store Connect credentials
   * GET /tenants/:tenantId/integrations/app-distribution/appstore/verify
   */
  verify: (tenantId: string) => 
    `/tenants/${tenantId}/integrations/app-distribution/appstore/verify`,
  
  /**
   * Create App Store Connect integration
   * POST /tenants/:tenantId/integrations/app-distribution/appstore
   */
  create: (tenantId: string) => 
    `/tenants/${tenantId}/integrations/app-distribution/appstore`,
  
  /**
   * Get App Store Connect integration
   * GET /tenants/:tenantId/integrations/app-distribution/appstore
   */
  get: (tenantId: string) => 
    `/tenants/${tenantId}/integrations/app-distribution/appstore`,
  
  /**
   * Update App Store Connect integration
   * PATCH /tenants/:tenantId/integrations/app-distribution/appstore
   */
  update: (tenantId: string) => 
    `/tenants/${tenantId}/integrations/app-distribution/appstore`,
  
  /**
   * Delete App Store Connect integration
   * DELETE /tenants/:tenantId/integrations/app-distribution/appstore
   */
  delete: (tenantId: string) => 
    `/tenants/${tenantId}/integrations/app-distribution/appstore`,
} as const;

// ============================================================================
// General Management Routes
// ============================================================================

export const MANAGEMENT = {
  /**
   * Get system metadata (available integrations, etc.)
   * GET /metadata
   */
  metadata: '/metadata',
  
  /**
   * List user's tenants
   * GET /tenants
   */
  tenants: '/tenants',
  
  /**
   * Get single tenant with integrations
   * GET /tenants/:tenantId
   */
  tenant: (tenantId: string) => 
    `/tenants/${tenantId}`,
  
  /**
   * Create tenant
   * POST /tenants
   */
  createTenant: '/tenants',
  
  /**
   * Delete tenant
   * DELETE /tenants/:tenantId
   */
  deleteTenant: (tenantId: string) => 
    `/tenants/${tenantId}`,
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
   * POST /tenants/:tenantId/release-configs
   */
  create: (tenantId: string) => 
    `/tenants/${tenantId}/release-configs`,
  
  /**
   * List all release configurations
   * GET /tenants/:tenantId/release-configs
   */
  list: (tenantId: string) => 
    `/tenants/${tenantId}/release-configs`,
  
  /**
   * Get single release configuration
   * GET /tenants/:tenantId/release-configs/:configId
   */
  get: (tenantId: string, configId: string) => 
    `/tenants/${tenantId}/release-configs/${configId}`,
  
  /**
   * Update release configuration
   * PUT /tenants/:tenantId/release-configs/:configId
   */
  update: (tenantId: string, configId: string) => 
    `/tenants/${tenantId}/release-configs/${configId}`,
  
  /**
   * Delete release configuration
   * DELETE /tenants/:tenantId/release-configs/:configId
   */
  delete: (tenantId: string, configId: string) => 
    `/tenants/${tenantId}/release-configs/${configId}`,
};

// ============================================================================
// Export All Routes (Individual Exports)
// ============================================================================

// All route objects are already exported above with their const declarations
// Services should import directly: import { PROJECT_MANAGEMENT, CICD, RELEASE_CONFIG } from './api-routes';

