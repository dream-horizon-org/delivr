/**
 * JIRA Utility Functions
 * 
 * Complete Jira integration utilities including:
 * - Jira API client for REST API communication
 * - URL generation and link building
 * - Integration helper functions
 * - Epic management utilities
 * - Validation functions
 */

import axios, { AxiosInstance } from 'axios';
import { getStorage } from '../storage/storage-instance';
import { JiraIntegrationController, JiraConfigurationController } from '../storage/integrations/jira/jira-controller';
import { 
  JiraLinkParams, 
  ReleaseJiraLinks, 
  JiraIntegration,
  JiraIntegrationType,
  JiraConfiguration,
  PlatformJiraConfig,
  EpicPlatform
} from '../storage/integrations/jira/jira-types';

// ============================================================================
// JIRA API CLIENT
// ============================================================================

/**
 * Jira API Client for making authenticated requests to Jira
 * Handles communication with Jira REST API for epic and ticket management
 */
export class JiraApiClient {
  private axiosInstance: AxiosInstance;
  
  constructor(
    private jiraInstanceUrl: string,
    private apiToken: string,
    private email?: string,
    private jiraType: JiraIntegrationType = JiraIntegrationType.JIRA_CLOUD
  ) {
    // Remove trailing slash from base URL
    const baseURL = jiraInstanceUrl.replace(/\/$/, '');
    
    this.axiosInstance = axios.create({
      baseURL,
      auth: {
        username: email || 'api-token',
        password: apiToken
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
  }
  
  /**
   * Create an epic in Jira
   * 
   * @param projectKey - Jira project key (e.g., 'FE', 'PROJ')
   * @param summary - Epic title/summary
   * @param description - Epic description (optional)
   * @returns Created epic information
   */
  async createEpic(
    projectKey: string,
    summary: string,
    description?: string
  ): Promise<{ id: string; key: string; url: string }> {
    try {
      // Build description in Atlassian Document Format (ADF)
      const adfDescription = description ? {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: description
          }]
        }]
      } : undefined;
      
      const payload: any = {
        fields: {
          project: { key: projectKey },
          summary: summary,
          issuetype: { name: 'Epic' }
        }
      };
      
      // Add description if provided
      if (adfDescription) {
        payload.fields.description = adfDescription;
      }
      
      // For Jira Cloud, the epic name field might be different
      // Some versions use customfield_10011 for epic name
      // We'll use the summary as the epic name
      if (this.jiraType === JiraIntegrationType.JIRA_CLOUD) {
        // Try to set epic name (customfield may vary by Jira configuration)
        // This is a common field ID but might need adjustment
        payload.fields.customfield_10011 = summary;
      }
      
      console.log('[JiraApiClient] Creating epic:', { projectKey, summary });
      
      const response = await this.axiosInstance.post('/rest/api/3/issue', payload);
      
      const epicUrl = `${this.jiraInstanceUrl}/browse/${response.data.key}`;
      
      console.log('[JiraApiClient] Epic created successfully:', response.data.key);
      
      return {
        id: response.data.id,
        key: response.data.key,
        url: epicUrl
      };
    } catch (error: any) {
      console.error('[JiraApiClient] Failed to create epic:', {
        projectKey,
        summary,
        error: error.response?.data || error.message
      });
      
      // Provide more helpful error messages
      if (error.response?.status === 400) {
        throw new Error(`Invalid project key or epic configuration: ${error.response.data?.errorMessages?.[0] || 'Bad request'}`);
      } else if (error.response?.status === 401) {
        throw new Error('Jira authentication failed. Please check your API token.');
      } else if (error.response?.status === 403) {
        throw new Error(`Insufficient permissions to create epics in project ${projectKey}`);
      } else if (error.response?.status === 404) {
        throw new Error(`Project ${projectKey} not found or Epic issue type not available`);
      }
      
      throw new Error(`Failed to create Jira epic: ${error.message}`);
    }
  }
  
  /**
   * Test connection to Jira API
   * 
   * @returns True if connection successful, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('[JiraApiClient] Testing connection to Jira...');
      
      // Try to get current user info
      await this.axiosInstance.get('/rest/api/3/myself');
      
      console.log('[JiraApiClient] Connection test successful');
      return true;
    } catch (error: any) {
      console.error('[JiraApiClient] Connection test failed:', {
        status: error.response?.status,
        message: error.message
      });
      return false;
    }
  }
  
  /**
   * Get epic details from Jira
   * 
   * @param epicKey - Epic key (e.g., 'FE-1234')
   * @returns Epic details
   */
  async getEpic(epicKey: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/rest/api/3/issue/${epicKey}`);
      return response.data;
    } catch (error: any) {
      console.error('[JiraApiClient] Failed to get epic:', epicKey, error.message);
      throw new Error(`Failed to get epic ${epicKey}: ${error.message}`);
    }
  }
  
  /**
   * Get epic status from Jira
   * 
   * @param epicKey - Epic key (e.g., 'FE-1234')
   * @returns Epic status information
   */
  async getEpicStatus(epicKey: string): Promise<{ name: string; id: string; statusCategory?: any }> {
    try {
      console.log(`[JiraApiClient] Fetching status for epic: ${epicKey}`);
      
      const response = await this.axiosInstance.get(`/rest/api/3/issue/${epicKey}`, {
        params: {
          fields: 'status'
        }
      });
      
      const status = response.data.fields?.status;
      
      if (!status) {
        throw new Error('Epic status not found in response');
      }
      
      console.log(`[JiraApiClient] Epic ${epicKey} current status:`, status.name);
      
      return {
        name: status.name,
        id: status.id,
        statusCategory: status.statusCategory
      };
    } catch (error: any) {
      console.error('[JiraApiClient] Failed to get epic status:', epicKey, error.message);
      
      if (error.response?.status === 404) {
        throw new Error(`Epic ${epicKey} not found in Jira`);
      } else if (error.response?.status === 401) {
        throw new Error('Jira authentication failed. Please check your API token.');
      } else if (error.response?.status === 403) {
        throw new Error(`Insufficient permissions to access epic ${epicKey}`);
      }
      
      throw new Error(`Failed to get epic status: ${error.message}`);
    }
  }
  
  /**
   * Get available projects from Jira
   * 
   * @returns List of projects
   */
  async getProjects(): Promise<Array<{ key: string; name: string; id: string }>> {
    try {
      const response = await this.axiosInstance.get('/rest/api/3/project');
      return response.data.map((project: any) => ({
        key: project.key,
        name: project.name,
        id: project.id
      }));
    } catch (error: any) {
      console.error('[JiraApiClient] Failed to get projects:', error.message);
      throw new Error(`Failed to get Jira projects: ${error.message}`);
    }
  }
}

/**
 * Factory function to create a Jira API client for a tenant
 * Uses the new jira_integrations table
 * 
 * @param tenantId - Tenant ID
 * @returns Jira API client or null if integration not configured
 */
export async function createJiraClientForTenant(tenantId: string): Promise<JiraApiClient | null> {
  try {
    const integration = await getJiraIntegrationForTenant(tenantId);
    
    if (!integration) {
      console.log('[JiraApiClient] No Jira integration found for tenant:', tenantId);
      return null;
    }
    
    if (!integration.isEnabled) {
      console.log('[JiraApiClient] Jira integration is disabled for tenant:', tenantId);
      return null;
    }
    
    const { jiraInstanceUrl, apiToken, email, jiraType } = integration;
    
    if (!jiraInstanceUrl || !apiToken) {
      console.error('[JiraApiClient] Invalid Jira configuration for tenant:', tenantId);
      return null;
    }
    
    return new JiraApiClient(jiraInstanceUrl, apiToken, email, jiraType);
  } catch (error: any) {
    console.error('[JiraApiClient] Error creating Jira client for tenant:', tenantId, error.message);
    return null;
  }
}

// ============================================================================
// URL Generation Functions
// ============================================================================

/**
 * Generate JIRA ticket URL
 * 
 * @param baseUrl - JIRA instance URL (e.g., 'https://company.atlassian.net')
 * @param ticketKey - Full ticket key (e.g., 'FE-1234', 'PROJ-567')
 * @returns Full JIRA ticket URL
 * 
 * @example
 * generateJiraTicketUrl('https://company.atlassian.net', 'FE-1234')
 * // Returns: 'https://company.atlassian.net/browse/FE-1234'
 */
export function generateJiraTicketUrl(baseUrl: string, ticketKey: string): string {
  // Normalize base URL (remove trailing slash)
  const normalizedBase = baseUrl.replace(/\/$/, '');
  return `${normalizedBase}/browse/${ticketKey}`;
}

/**
 * Generate JIRA epic URL from project key and epic ID
 * 
 * @param baseUrl - JIRA instance URL
 * @param projectKey - Project key (e.g., 'FE', 'PROJ')
 * @param epicId - Epic ID (numeric or with prefix)
 * @returns Full JIRA epic URL
 * 
 * @example
 * generateJiraEpicUrl('https://company.atlassian.net', 'FE', '1234')
 * // Returns: 'https://company.atlassian.net/browse/FE-1234'
 */
export function generateJiraEpicUrl(
  baseUrl: string, 
  projectKey: string, 
  epicId: string
): string {
  const ticketKey = buildJiraTicketKey(projectKey, epicId);
  return generateJiraTicketUrl(baseUrl, ticketKey);
}

/**
 * Build JIRA ticket key from project key and ID
 * 
 * Handles both cases:
 * - If epicId already has prefix (e.g., 'FE-1234'), returns as-is
 * - If epicId is just numeric (e.g., '1234'), combines with projectKey
 * 
 * @param projectKey - Project key (e.g., 'FE', 'PROJ')
 * @param epicId - Epic ID (numeric or with prefix)
 * @returns Full ticket key
 * 
 * @example
 * buildJiraTicketKey('FE', '1234') // Returns: 'FE-1234'
 * buildJiraTicketKey('FE', 'FE-1234') // Returns: 'FE-1234'
 */
export function buildJiraTicketKey(projectKey: string, epicId: string): string {
  // If epicId already contains a hyphen, assume it's a full ticket key
  if (epicId.includes('-')) {
    return epicId;
  }
  
  // Otherwise, combine project key with numeric ID
  return `${projectKey}-${epicId}`;
}

/**
 * Generate JIRA link from parameters
 * 
 * @param params - Link generation parameters
 * @returns Full JIRA URL or null if insufficient data
 */
export function generateJiraLink(params: JiraLinkParams): string | null {
  if (!params.baseUrl) return null;
  
  if (params.ticketKey) {
    return generateJiraTicketUrl(params.baseUrl, params.ticketKey);
  }
  
  if (params.projectKey && params.epicId) {
    return generateJiraEpicUrl(params.baseUrl, params.projectKey, params.epicId);
  }
  
  return null;
}

// ============================================================================
// Integration Helper Functions
// ============================================================================

/**
 * Get JIRA Integration controller from storage singleton
 * 
 * @returns JiraIntegrationController instance
 */
export function getJiraIntegrationController(): JiraIntegrationController {
  const storage = getStorage();
  return (storage as any).jiraIntegrationController;
}

/**
 * Get JIRA Configuration controller from storage singleton
 * 
 * @returns JiraConfigurationController instance
 */
export function getJiraConfigurationController(): JiraConfigurationController {
  const storage = getStorage();
  return (storage as any).jiraConfigurationController;
}

/**
 * Get JIRA integration for a tenant (with tokens for internal use)
 * Uses the new jira_integrations table
 * 
 * @param tenantId - Tenant ID
 * @returns JIRA integration with decrypted tokens, or null if not configured
 */
export async function getJiraIntegrationForTenant(
  tenantId: string
): Promise<JiraIntegration | null> {
  try {
    const controller = getJiraIntegrationController();
    const integration = await controller.findByTenantId(tenantId, true);  // includeTokens = true
    
    if (!integration || !integration.isEnabled) {
      return null;
    }
    
    return integration as JiraIntegration;
  } catch (error) {
    console.error(`[JIRA Utils] Error fetching JIRA integration for tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get JIRA configuration by ID
 * 
 * @param configId - Configuration ID
 * @returns JIRA configuration or null
 */
export async function getJiraConfigurationById(
  configId: string
): Promise<JiraConfiguration | null> {
  try {
    const controller = getJiraConfigurationController();
    const config = await controller.findById(configId);
    
    if (!config || !config.isActive) {
      return null;
    }
    
    return config;
  } catch (error) {
    console.error(`[JIRA Utils] Error fetching JIRA configuration ${configId}:`, error);
    return null;
  }
}

/**
 * Resolve platform configuration from a configuration
 * Extracts platform-specific settings from the platformsConfig JSON
 * 
 * @param configId - Configuration ID
 * @param platform - Platform to resolve
 * @returns Platform configuration or null
 */
export async function resolvePlatformConfig(
  configId: string,
  platform: EpicPlatform
): Promise<PlatformJiraConfig | null> {
  try {
    const controller = getJiraConfigurationController();
    return await controller.resolvePlatformConfig(configId, platform);
  } catch (error) {
    console.error(`[JIRA Utils] Error resolving platform config:`, error);
    return null;
  }
}

/**
 * Check if tenant has JIRA integration configured and enabled
 * 
 * @param tenantId - Tenant ID
 * @returns True if JIRA is configured and enabled
 */
export async function hasJiraIntegration(tenantId: string): Promise<boolean> {
  const integration = await getJiraIntegrationForTenant(tenantId);
  return integration !== null && integration.isEnabled;
}

// ============================================================================
// Release JIRA Links Generation
// ============================================================================

/**
 * Generate all JIRA links for a release (DEPRECATED)
 * 
 * @deprecated Use generateReleaseJiraLinksFromEpics instead
 * This function is kept for backward compatibility but no longer works
 * with the new architecture where project keys are per-configuration
 * 
 * @param tenantId - Tenant ID
 * @param webEpicId - Web epic ID (optional)
 * @param iOSEpicId - iOS epic ID (optional)
 * @param playStoreEpicId - PlayStore epic ID (optional)
 * @returns Object with generated JIRA URLs for each platform
 */
export async function generateReleaseJiraLinks(
  tenantId: string,
  webEpicId?: string | null,
  iOSEpicId?: string | null,
  playStoreEpicId?: string | null
): Promise<ReleaseJiraLinks> {
  console.warn('[JiraUtils] generateReleaseJiraLinks is deprecated. Use generateReleaseJiraLinksFromEpics instead.');
  
    return {
      webEpicUrl: null,
      iOSEpicUrl: null,
      playStoreEpicUrl: null
    };
  }

/**
 * Generate JIRA link for a single epic using configuration
 * 
 * @param tenantId - Tenant ID
 * @param configId - Configuration ID
 * @param platform - Platform
 * @param epicId - Epic ID
 * @returns JIRA URL or null
 */
export async function generateSingleEpicLink(
  tenantId: string,
  configId: string,
  platform: EpicPlatform,
  epicId: string
): Promise<string | null> {
  try {
  const integration = await getJiraIntegrationForTenant(tenantId);
  if (!integration) return null;

    const platformConfig = await resolvePlatformConfig(configId, platform);
    if (!platformConfig) return null;

    const baseUrl = integration.jiraInstanceUrl;
    const projectKey = platformConfig.projectKey;

    return generateJiraEpicUrl(baseUrl, projectKey, epicId);
  } catch (error) {
    console.error('[JiraUtils] Error generating epic link:', error);
    return null;
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate JIRA instance URL format
 * 
 * @param url - URL to validate
 * @returns True if valid JIRA URL format
 */
export function isValidJiraUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    // Must be HTTP or HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // Must have a hostname
    return !!parsed.hostname;
  } catch {
    return false;
  }
}

/**
 * Validate JIRA project key format
 * 
 * JIRA project keys must:
 * - Start with a letter
 * - Contain only uppercase letters (A-Z)
 * - Be 2-10 characters long
 * 
 * @param projectKey - Project key to validate
 * @returns True if valid format
 */
export function isValidProjectKey(projectKey: string): boolean {
  if (!projectKey) return false;
  
  // JIRA project key pattern: 2-10 uppercase letters, starting with a letter
  const projectKeyPattern = /^[A-Z][A-Z]{1,9}$/;
  return projectKeyPattern.test(projectKey);
}

/**
 * Extract project key from full ticket key
 * 
 * @param ticketKey - Full ticket key (e.g., 'FE-1234')
 * @returns Project key (e.g., 'FE') or null if invalid
 */
export function extractProjectKey(ticketKey: string): string | null {
  if (!ticketKey) return null;
  
  const parts = ticketKey.split('-');
  if (parts.length < 2) return null;
  
  const projectKey = parts[0];
  return isValidProjectKey(projectKey) ? projectKey : null;
}

/**
 * Extract epic ID from full ticket key
 * 
 * @param ticketKey - Full ticket key (e.g., 'FE-1234')
 * @returns Epic ID (e.g., '1234') or null if invalid
 */
export function extractEpicId(ticketKey: string): string | null {
  if (!ticketKey) return null;
  
  const parts = ticketKey.split('-');
  if (parts.length < 2) return null;
  
  const epicId = parts.slice(1).join('-');  // Handle cases like 'PROJ-SUB-123'
  return epicId || null;
}

// ============================================================================
// Release Epic Management (using release_jira_epics table)
// ============================================================================

/**
 * Generate JIRA links for a release from release_jira_epics table
 * This is the new approach that uses the dedicated epic management table
 * 
 * @param releaseId - Release ID
 * @returns Object with generated JIRA URLs for each platform
 */
export async function generateReleaseJiraLinksFromEpics(
  releaseId: string
): Promise<ReleaseJiraLinks> {
  try {
    const storage = getStorage();
    const jiraController = (storage as any).jiraController;
    
    if (!jiraController || !jiraController.epicService) {
      console.warn('[JiraUtils] Epic service not available');
      return {
        webEpicUrl: null,
        iOSEpicUrl: null,
        playStoreEpicUrl: null
      };
    }
    
    const epics = await jiraController.epicService.findEpicsByReleaseId(releaseId);
    
    const links: ReleaseJiraLinks = {
      webEpicUrl: null,
      iOSEpicUrl: null,
      playStoreEpicUrl: null
    };
    
    for (const epic of epics) {
      if (epic.jiraEpicUrl) {
        switch (epic.platform) {
          case 'WEB':
            links.webEpicUrl = epic.jiraEpicUrl;
            break;
          case 'IOS':
            links.iOSEpicUrl = epic.jiraEpicUrl;
            break;
          case 'ANDROID':
            links.playStoreEpicUrl = epic.jiraEpicUrl;
            break;
        }
      }
    }
    
    return links;
  } catch (error: any) {
    console.error('[JiraUtils] Error generating links from epics:', error.message);
    return {
      webEpicUrl: null,
      iOSEpicUrl: null,
      playStoreEpicUrl: null
    };
  }
}

/**
 * Get epic details for a release
 * 
 * @param releaseId - Release ID
 * @returns Array of epic details with status and URLs
 */
export async function getEpicsForRelease(releaseId: string): Promise<any[]> {
  try {
    const storage = getStorage();
    const jiraController = (storage as any).jiraController;
    
    if (!jiraController || !jiraController.epicService) {
      console.warn('[JiraUtils] Epic service not available');
      return [];
    }
    
    const epics = await jiraController.epicService.findEpicsByReleaseId(releaseId);
    
    return epics.map(epic => ({
      id: epic.id,
      platform: epic.platform,
      projectKey: epic.projectKey,
      title: epic.epicTitle,
      description: epic.epicDescription,
      status: epic.creationStatus,
      jiraKey: epic.jiraEpicKey,
      jiraUrl: epic.jiraEpicUrl,
      error: epic.creationError,
      createdAt: epic.createdAt,
      jiraCreatedAt: epic.jiraCreatedAt
    }));
  } catch (error: any) {
    console.error('[JiraUtils] Error getting epics for release:', error.message);
    return [];
  }
}

/**
 * Check if a release has any epics configured
 * 
 * @param releaseId - Release ID
 * @returns True if release has epics
 */
export async function releaseHasEpics(releaseId: string): Promise<boolean> {
  try {
    const epics = await getEpicsForRelease(releaseId);
    return epics.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get epic creation status summary for a release
 * 
 * @param releaseId - Release ID
 * @returns Summary of epic statuses
 */
export async function getEpicStatusSummary(releaseId: string): Promise<{
  total: number;
  pending: number;
  creating: number;
  created: number;
  failed: number;
}> {
  try {
    const epics = await getEpicsForRelease(releaseId);
    
    return {
      total: epics.length,
      pending: epics.filter(e => e.status === 'PENDING').length,
      creating: epics.filter(e => e.status === 'CREATING').length,
      created: epics.filter(e => e.status === 'CREATED').length,
      failed: epics.filter(e => e.status === 'FAILED').length
    };
  } catch (error) {
    return { total: 0, pending: 0, creating: 0, created: 0, failed: 0 };
  }
}

