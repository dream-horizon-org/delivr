/**
 * Checkmate Provider Implementation
 * Implements test management integration with Checkmate
 */

import { AUTH_SCHEMES, CONTENT_TYPES, HTTP_HEADERS, HTTP_METHODS, HTTP_STATUS } from '~constants/http';
import { TestManagementProviderType, TestRunStatus } from '~types/integrations/test-management';
import type { TenantTestManagementIntegrationConfig } from '~types/integrations/test-management/tenant-integration';
import type {
  ITestManagementProvider,
  PlatformTestParameters,
  TestRunResult,
  TestStatusResult
} from '../provider.interface';
import {
  CHECKMATE_API_ENDPOINTS,
  CHECKMATE_DEFAULTS,
  CHECKMATE_ERROR_MESSAGES,
  CHECKMATE_QUERY_PARAMS,
  CHECKMATE_URL_PARAMS,
  CHECKMATE_URL_TEMPLATES
} from './checkmate.constants';
import type {
  CheckmateConfig,
  CheckmateCreateRunRequest,
  CheckmateCreateRunResponse,
  CheckmateLabelsResponse,
  CheckmateProjectsResponse,
  CheckmateRunStateData,
  CheckmateRunStateResponse,
  CheckmateSectionsResponse,
  CheckmateSquadsResponse
} from './checkmate.interface';

/**
 * Checkmate Provider
 * Handles communication with Checkmate API
 */
export class CheckmateProvider implements ITestManagementProvider {
  readonly providerType = TestManagementProviderType.CHECKMATE;

  /**
   * Type guard to validate Checkmate configuration
   * Checks for required fields: baseUrl (string), authToken (string), orgId (number)
   */
  private isCheckmateConfig = (config: TenantTestManagementIntegrationConfig): config is CheckmateConfig => {
    const hasValidBaseUrl = 'baseUrl' in config && typeof config.baseUrl === 'string';
    const hasValidAuthToken = 'authToken' in config && typeof config.authToken === 'string';
    const hasValidOrgId = 'orgId' in config && typeof config.orgId === 'number';
    
    return hasValidBaseUrl && hasValidAuthToken && hasValidOrgId;
  };

  /**
   * Get Checkmate config from generic config (with validation)
   */
  private getCheckmateConfig = (config: TenantTestManagementIntegrationConfig): CheckmateConfig => {
    const isValidConfig = this.isCheckmateConfig(config);
    
    if (!isValidConfig) {
      throw new Error(CHECKMATE_ERROR_MESSAGES.CONFIG_VALIDATION_FAILED);
    }
    
    return config;
  };

  /**
   * Make HTTP request to Checkmate API
   */
  private makeRequest = async <T>(
    checkmateConfig: CheckmateConfig,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    // Remove trailing slash from baseUrl to avoid double slashes
    const baseUrl = checkmateConfig.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}${endpoint}`;
    const authorizationValue = `${AUTH_SCHEMES.BEARER} ${checkmateConfig.authToken}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON,
        [HTTP_HEADERS.AUTHORIZATION]: authorizationValue,
        ...options.headers
      }
    });

    const requestFailed = !response.ok;
    if (requestFailed) {
      const errorText = await response.text().catch(() => CHECKMATE_ERROR_MESSAGES.UNKNOWN_ERROR);
      const errorMessage = `${CHECKMATE_ERROR_MESSAGES.API_ERROR_PREFIX}: ${response.status} ${response.statusText} - ${errorText}`;
      throw new Error(errorMessage);
    }

    const jsonResponse: T = await response.json();
    return jsonResponse;
  };

  /**
   * Map Checkmate run status to our TestRunStatus
   * 
   * Status meanings:
   * - PENDING: Test run created but not yet started
   * - IN_PROGRESS: Tests are currently being executed
   * - COMPLETED: Test run finished execution (regardless of pass/fail)
   * - FAILED: Test run failed to execute (system error, not test failures)
   * 
   * Note: Pass/fail evaluation based on test results happens at the service layer
   * using passThresholdPercent. This method only indicates execution status.
   */
  private mapRunStatus = (checkmateData: CheckmateRunStateData): TestRunStatus => {
    const inProgressCount = checkmateData.inProgress ?? 0;
    const allTestsCompleted = checkmateData.untested === 0 && inProgressCount === 0;
    
    // If all tests are completed (no untested, no in-progress), mark as COMPLETED
    // The service layer will evaluate pass/fail using the threshold
    if (allTestsCompleted) {
      return TestRunStatus.COMPLETED;
    }
    
    // If any tests have been executed, mark as IN_PROGRESS
    const testingHasStarted = checkmateData.passed > 0 || checkmateData.failed > 0;
    
    if (testingHasStarted) {
      return TestRunStatus.IN_PROGRESS;
    }
    
    // No tests executed yet
    return TestRunStatus.PENDING;
  };

  /**
   * Build run URL for Checkmate UI
   */
  private buildRunUrl = (baseUrl: string, projectId: number, runId: string): string => {
    // Remove trailing slash from baseUrl
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    const url = CHECKMATE_URL_TEMPLATES.PROJECT_RUN
      .replace(CHECKMATE_URL_PARAMS.PROJECT_ID, projectId.toString())
      .replace(CHECKMATE_URL_PARAMS.RUN_ID, runId);
    return `${normalizedBaseUrl}${url}`;
  };

  /**
   * Build simple run URL
   */
  private buildSimpleRunUrl = (baseUrl: string, runId: string): string => {
    // Remove trailing slash from baseUrl
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    const urlTemplate = CHECKMATE_URL_TEMPLATES.RUNS;
    const url = urlTemplate.replace(CHECKMATE_URL_PARAMS.RUN_ID, runId);
    return `${normalizedBaseUrl}${url}`;
  };

  /**
   * Build reset/cancel endpoint URL
   */
  private buildRunActionEndpoint = (endpointTemplate: string, runId: string): string => {
    return endpointTemplate.replace(CHECKMATE_URL_PARAMS.RUN_ID, runId);
  };

  /**
   * Validate Checkmate configuration
   */
  validateConfig = async (config: TenantTestManagementIntegrationConfig): Promise<boolean> => {
    const isValidCheckmateConfig = this.isCheckmateConfig(config);
    
    if (!isValidCheckmateConfig) {
      return false;
    }
    
    const checkmateConfig = config;
    
    try {
      const baseUrlMissing = !checkmateConfig.baseUrl;
      const authTokenMissing = !checkmateConfig.authToken;
      const requiredFieldsMissing = baseUrlMissing || authTokenMissing;
      
      if (requiredFieldsMissing) {
        return false;
      }

      // Validate URL format
      try {
        new URL(checkmateConfig.baseUrl);
      } catch {
        return false;
      }

      // Try to make a simple API call to validate credentials
      try {
        await this.makeRequest(checkmateConfig, CHECKMATE_API_ENDPOINTS.PROJECTS, {
          method: HTTP_METHODS.GET
        });
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '';
        const isUnauthorized = errorMessage.includes(HTTP_STATUS.UNAUTHORIZED.toString());
        const isForbidden = errorMessage.includes(HTTP_STATUS.FORBIDDEN.toString());
        const isAuthError = isUnauthorized || isForbidden;
        
        if (isAuthError) {
          return false;
        }
        
        // For other errors (like 404), assume config is valid
        return true;
      }
    } catch (error) {
      console.error(CHECKMATE_ERROR_MESSAGES.CONFIG_VALIDATION_FAILED, error);
      return false;
    }
  };

  /**
   * Create a new test run in Checkmate
   */
  createTestRun = async (
    config: TenantTestManagementIntegrationConfig,
    parameters: PlatformTestParameters
  ): Promise<TestRunResult> => {
    const checkmateConfig = this.getCheckmateConfig(config);
    
    // Extract Checkmate-specific parameters
    const projectId = parameters.projectId;
    const projectIdMissing = !projectId;
    
    if (projectIdMissing) {
      throw new Error(CHECKMATE_ERROR_MESSAGES.PROJECT_ID_REQUIRED);
    }

    const runName = parameters.runName ?? CHECKMATE_DEFAULTS.RUN_NAME;
    const runDescription = parameters.runDescription;
    const sectionIds = parameters.sectionIds;
    const labelIds = parameters.labelIds;
    const squadIds = parameters.squadIds;
    const platformIds = parameters.platformIds;
    const filterType = parameters.filterType ?? 'and';
    const createdBy = parameters.createdBy;

    const requestBody: CheckmateCreateRunRequest = {
      projectId,
      runName,
      filterType,
      ...(runDescription && { runDescription }),
      ...(sectionIds && { sectionIds }),
      ...(labelIds && { labelIds }),
      ...(squadIds && { squadIds }),
      ...(platformIds && { platformIds }),
      ...(createdBy && { createdBy })
    };

    const response = await this.makeRequest<CheckmateCreateRunResponse>(
      checkmateConfig,
      CHECKMATE_API_ENDPOINTS.CREATE_RUN,
      {
        method: HTTP_METHODS.POST,
        body: JSON.stringify(requestBody)
      }
    );

    // Validate response has runId
    const isValidRunId = response?.data?.runId ?? false;
    if (!isValidRunId) {
      throw new Error('Checkmate API returned success but no runId in response');
    }

    const runId = response.data.runId.toString();
    const runUrl = this.buildRunUrl(checkmateConfig.baseUrl, projectId, runId);
    
    return {
      runId,
      url: runUrl,
      status: TestRunStatus.PENDING
    };
  };

  /**
   * Get test status from Checkmate
   */
  getTestStatus = async (
    config: TenantTestManagementIntegrationConfig,
    runId: string
  ): Promise<TestStatusResult> => {
    const checkmateConfig = this.getCheckmateConfig(config);
    const queryParams = new URLSearchParams();
    queryParams.append(CHECKMATE_QUERY_PARAMS.RUN_ID, runId);
    const endpoint = `${CHECKMATE_API_ENDPOINTS.RUN_STATE_DETAIL}?${queryParams.toString()}`;
    
    const response = await this.makeRequest<CheckmateRunStateResponse>(
      checkmateConfig,
      endpoint,
      {
        method: HTTP_METHODS.GET
      }
    );

    const data = response.data;
    const status = this.mapRunStatus(data);
    const runUrl = this.buildSimpleRunUrl(checkmateConfig.baseUrl, runId);

    return {
      status,
      url: runUrl,
      total: data.total,
      passed: data.passed,
      failed: data.failed,
      untested: data.untested,
      blocked: data.blocked,
      inProgress: data.inProgress ?? 0
    };
  };

  /**
   * Reset a test run in Checkmate
   * Calls Checkmate's /api/v1/run/reset which marks all Passed tests as Retest
   */
  resetTestRun = async (
    config: TenantTestManagementIntegrationConfig,
    runId: string
  ): Promise<TestRunResult> => {
    const checkmateConfig = this.getCheckmateConfig(config);
    
    // Call Checkmate's reset endpoint (only requires runId)
    await this.makeRequest(
      checkmateConfig,
      CHECKMATE_API_ENDPOINTS.RUN_RESET,
      {
        method: HTTP_METHODS.PUT,
        body: JSON.stringify({
          runId: parseInt(runId)
        })
      }
    );
    
    const runUrl = this.buildSimpleRunUrl(checkmateConfig.baseUrl, runId);
    
    return {
      runId,
      url: runUrl,
      status: TestRunStatus.PENDING // Reset makes tests available for re-execution
    };
  };

  /**
   * Cancel a test run in Checkmate
   * Calls Checkmate's /api/v1/run/delete which soft-deletes the run (sets status to 'Deleted')
   */
  cancelTestRun = async (
    config: TenantTestManagementIntegrationConfig,
    runId: string,
    projectId: number
  ): Promise<void> => {
    const checkmateConfig = this.getCheckmateConfig(config);
    
    if (!projectId) {
      throw new Error('projectId is required for Checkmate cancel operation');
    }
    
    // Call Checkmate's delete endpoint (soft delete)
    // Note: userId is added server-side by Checkmate from authenticated user
    await this.makeRequest(
      checkmateConfig,
      CHECKMATE_API_ENDPOINTS.RUN_DELETE,
      {
        method: HTTP_METHODS.DELETE,
        body: JSON.stringify({
          runId: parseInt(runId),
          projectId: projectId
        })
      }
    );
  };

  /**
   * Get detailed test report from Checkmate
   */
  getTestReport = async (
    config: TenantTestManagementIntegrationConfig,
    runId: string,
    groupBy?: string
  ): Promise<unknown> => {
    const checkmateConfig = this.getCheckmateConfig(config);
    
    // Build query params
    const params = new URLSearchParams();
    params.append(CHECKMATE_QUERY_PARAMS.RUN_ID, runId);
    
    if (groupBy) {
      params.append(CHECKMATE_QUERY_PARAMS.GROUP_BY, groupBy);
    }

    const endpoint = `${CHECKMATE_API_ENDPOINTS.RUN_STATE_DETAIL}?${params.toString()}`;
    const response = await this.makeRequest<CheckmateRunStateResponse>(
      checkmateConfig,
      endpoint,
      {
        method: HTTP_METHODS.GET
      }
    );

    return response.data;
  };

  /**
   * Get all projects for an organization
   */
  getProjects = async (config: TenantTestManagementIntegrationConfig): Promise<CheckmateProjectsResponse> => {
    const checkmateConfig = this.getCheckmateConfig(config);
    
    const params = new URLSearchParams();
    params.append(CHECKMATE_QUERY_PARAMS.ORG_ID, checkmateConfig.orgId.toString());
    params.append(CHECKMATE_QUERY_PARAMS.PAGE, '1');
    params.append(CHECKMATE_QUERY_PARAMS.PAGE_SIZE, CHECKMATE_DEFAULTS.METADATA_PAGE_SIZE.toString());
    
    const endpoint = `${CHECKMATE_API_ENDPOINTS.PROJECTS}?${params.toString()}`;
    const response = await this.makeRequest<CheckmateProjectsResponse>(
      checkmateConfig,
      endpoint,
      {
        method: HTTP_METHODS.GET
      }
    );

    return response;
  };

  /**
   * Get all sections for a project
   */
  getSections = async (
    config: TenantTestManagementIntegrationConfig,
    projectId: number
  ): Promise<CheckmateSectionsResponse> => {
    const checkmateConfig = this.getCheckmateConfig(config);
    
    const params = new URLSearchParams();
    params.append(CHECKMATE_QUERY_PARAMS.PROJECT_ID, projectId.toString());
    
    const endpoint = `${CHECKMATE_API_ENDPOINTS.SECTIONS}?${params.toString()}`;
    const response = await this.makeRequest<CheckmateSectionsResponse>(
      checkmateConfig,
      endpoint,
      {
        method: HTTP_METHODS.GET
      }
    );

    return response;
  };

  /**
   * Get all labels for a project
   */
  getLabels = async (
    config: TenantTestManagementIntegrationConfig,
    projectId: number
  ): Promise<CheckmateLabelsResponse> => {
    const checkmateConfig = this.getCheckmateConfig(config);
    
    const params = new URLSearchParams();
    params.append(CHECKMATE_QUERY_PARAMS.PROJECT_ID, projectId.toString());
    
    const endpoint = `${CHECKMATE_API_ENDPOINTS.LABELS}?${params.toString()}`;
    const response = await this.makeRequest<CheckmateLabelsResponse>(
      checkmateConfig,
      endpoint,
      {
        method: HTTP_METHODS.GET
      }
    );

    return response;
  };

  /**
   * Get all squads for a project
   */
  getSquads = async (
    config: TenantTestManagementIntegrationConfig,
    projectId: number
  ): Promise<CheckmateSquadsResponse> => {
    const checkmateConfig = this.getCheckmateConfig(config);
    
    const params = new URLSearchParams();
    params.append(CHECKMATE_QUERY_PARAMS.PROJECT_ID, projectId.toString());
    
    const endpoint = `${CHECKMATE_API_ENDPOINTS.SQUADS}?${params.toString()}`;
    const response = await this.makeRequest<CheckmateSquadsResponse>(
      checkmateConfig,
      endpoint,
      {
        method: HTTP_METHODS.GET
      }
    );

    return response;
  };
}
