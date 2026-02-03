/**
 * Checkmate Provider Implementation
 * Implements test management integration with Checkmate
 */

import { AUTH_SCHEMES, CONTENT_TYPES, HTTP_HEADERS, HTTP_METHODS } from '~constants/http';
import { TestManagementProviderType, TestRunStatus } from '~types/integrations/test-management';
import type { TenantTestManagementIntegrationConfig } from '~types/integrations/test-management/tenant-integration';
import { decryptConfigFields } from '~utils/encryption';
import type {
  ITestManagementProvider,
  PlatformTestParameters,
  TestRunResult,
  TestStatusResult,
  ValidationResult
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
  CheckmateMetadataResult,
  CheckmateProject,
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
   * Get Checkmate config from generic config (with validation and decryption)
   * The authToken is stored encrypted in the database (frontend or backend format)
   */
  private getCheckmateConfig = (config: TenantTestManagementIntegrationConfig): CheckmateConfig => {
    const isValidConfig = this.isCheckmateConfig(config);
    
    if (!isValidConfig) {
      throw new Error(CHECKMATE_ERROR_MESSAGES.CONFIG_VALIDATION_FAILED);
    }
    
    // Decrypt the authToken before using for API calls
    // Uses decryptConfigFields which handles both frontend and backend encryption formats
    const decryptedConfig = decryptConfigFields(config, ['authToken']);
    
    return decryptedConfig as CheckmateConfig;
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
      const error = new Error(errorMessage) as Error & { status?: number; responseText?: string };
      error.status = response.status;
      error.responseText = errorText;
      throw error;
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
  validateConfig = async (config: TenantTestManagementIntegrationConfig): Promise<ValidationResult> => {
    if (!this.isCheckmateConfig(config)) {
      return {
        isValid: false,
        message: 'Invalid Checkmate configuration structure'
      };
    }
    
    try {
      // Decrypt authToken for API calls (move inside try to catch decryption errors)
      const checkmateConfig = this.getCheckmateConfig(config);
      

      // Test credentials by fetching projects
      // Validation requires BOTH successful API call AND valid orgId (returns projects)
      const params = new URLSearchParams({
        [CHECKMATE_QUERY_PARAMS.ORG_ID]: checkmateConfig.orgId.toString(),
        [CHECKMATE_QUERY_PARAMS.PAGE]: '1',
        [CHECKMATE_QUERY_PARAMS.PAGE_SIZE]: '1'  // Just need to test connection
      });
      
      const endpoint = `${CHECKMATE_API_ENDPOINTS.PROJECTS}?${params.toString()}`;
      
      // makeRequest handles URL concatenation (removes trailing slash from baseUrl)
      // Fetch raw response and transform to simplified structure
      const rawResponse = await this.makeRequest<{
        data: {
          projectsList: unknown[];
          projectCount: Array<{ count: number }>;
        };
      }>(checkmateConfig, endpoint, {
        method: HTTP_METHODS.GET
      });
      
      // Extract and validate project count
      const projectCount = rawResponse?.data?.projectCount?.[0]?.count ?? 0;
      
      if (projectCount === 0) {
        return {
          isValid: false,
          message: 'Organization has no projects. Verify orgId is correct.',
          details: {
            errorCode: 'no_projects',
            message: 'Check that the orgId matches your Checkmate organization'
          }
        };
      }
      
      return {
        isValid: true,
        message: 'Successfully connected to Checkmate'
      };
    } catch (error: unknown) {
      const status = (error && typeof error === 'object' && 'status' in error) ? (error as { status?: number }).status : undefined;
      const errorText = (error && typeof error === 'object' && 'responseText' in error) 
        ? String((error as { responseText?: string }).responseText)
        : (error instanceof Error ? error.message : 'Unknown error');

      // Handle HTTP status codes from API responses
      if (status === 401) {
        return {
          isValid: false,
          message: 'Invalid Checkmate credentials. Please verify your authToken is correct.',
          details: {
            errorCode: 'invalid_credentials',
            message: 'Generate a new auth token from Checkmate settings if the current one is invalid or expired'
          }
        };
      }

      if (status === 403) {
        return {
          isValid: false,
          message: 'Invalid Checkmate authToken or insufficient permissions. Please verify your token is correct and has required permissions.',
          details: {
            errorCode: 'invalid_credentials_or_permissions',
            message: 'Check: 1) Auth token is valid (generate a new one from Checkmate settings if needed), 2) Token has access to read projects for the specified organization'
          }
        };
      }

      if (status === 404) {
        return {
          isValid: false,
          message: 'Checkmate resource not found.',
          details: {
            errorCode: 'resource_not_found',
            message: 'Verify the baseUrl and orgId are correct'
          }
        };
      }

      if (status >= 500 && status < 600) {
        return {
          isValid: false,
          message: `Checkmate service temporarily unavailable (${status}). Please try again later.`,
          details: {
            errorCode: 'service_unavailable',
            message: 'Checkmate servers are experiencing issues. This is not a credentials problem - retry in a few minutes.'
          }
        };
      }

      // Network errors (no HTTP response received)
      if (!status) {
        // Check if it's a fetch network error vs other errors
        const errorMessage = error instanceof Error ? error.message : '';
        const errorName = error instanceof Error ? error.name : '';
        const isFetchError = errorMessage && (
          errorMessage.includes('fetch') || 
          errorMessage.includes('Failed to fetch') || 
          errorName === 'TypeError'
        );
        
        return {
          isValid: false,
          message: isFetchError 
            ? 'Network error: Unable to connect to Checkmate. Please verify the baseUrl is correct and accessible.'
            : `Configuration error: ${errorText}`,
          details: {
            errorCode: isFetchError ? 'network_error' : 'config_error',
            message: isFetchError 
              ? 'Check: 1) Base URL is correct, 2) Checkmate server is accessible from your network, 3) No firewall blocking the connection'
              : errorText
          }
        };
      }

      // Generic API error
      return {
        isValid: false,
        message: `Checkmate API error (${status}): ${errorText}`,
        details: {
          errorCode: 'api_error',
          message: errorText
        }
      };
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

    const runName = parameters.runName; // Required parameter (validated at API layer)
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
    runId: string,
    projectId: number
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
    const runUrl = this.buildRunUrl(checkmateConfig.baseUrl, projectId, runId);

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
   * Get the URL for a test run
   * Requires projectId to construct the proper URL
   */
  getRunUrl = async (
    config: TenantTestManagementIntegrationConfig,
    runId: string,
    projectId: number
  ): Promise<string> => {
    const checkmateConfig = this.getCheckmateConfig(config);
    
    // Validate projectId
    const projectIdMissing = !projectId;
    
    if (projectIdMissing) {
      throw new Error(CHECKMATE_ERROR_MESSAGES.PROJECT_ID_REQUIRED);
    }
    
    // Use buildRunUrl (with projectId) instead of buildSimpleRunUrl
    return this.buildRunUrl(checkmateConfig.baseUrl, projectId, runId);
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
    
    // Fetch raw API response
    const rawResponse = await this.makeRequest<{
      data: {
        projectsList: CheckmateProject[];
        projectCount: Array<{ count: number }>;
      };
    }>(
      checkmateConfig,
      endpoint,
      {
        method: HTTP_METHODS.GET
      }
    );

    // Transform to simplified structure
    return {
      data: {
        projectsList: rawResponse.data.projectsList,
        projectCount: rawResponse.data.projectCount[0]?.count ?? 0
      }
    };
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

  // ============================================================================
  // METADATA API METHODS WITH RESULT OBJECT PATTERN
  // ============================================================================

  /**
   * Get error message based on HTTP status code
   * Centralized error messages for consistent user feedback
   */
  private getMetadataErrorMessage(status: number, operation: string): string {
    const messages: Record<number, string> = {
      401: 'Invalid Checkmate credentials. Please check your API token and base URL.',
      403: 'Insufficient Checkmate permissions. Ensure your user has the required access.',
      404: 'Checkmate resource not found',
      408: 'Request to Checkmate API timed out. Please try again.',
      429: 'Checkmate API rate limit exceeded. Please wait and try again.',
      500: 'Checkmate server error. Please try again later.',
      503: 'Checkmate service is temporarily unavailable. Please try again later.'
    };
    
    return messages[status] || `Failed to ${operation}`;
  }

  /**
   * Get projects with result object pattern
   * Returns success/failure without throwing exceptions
   */
  getProjectsWithResult = async (
    config: TenantTestManagementIntegrationConfig
  ): Promise<CheckmateMetadataResult<CheckmateProjectsResponse>> => {
    try {
      const data = await this.getProjects(config);
      return {
        success: true,
        data
      };
    } catch (error: unknown) {
      const status = (error && typeof error === 'object' && 'status' in error && typeof (error as { status?: number }).status === 'number')
        ? (error as { status: number }).status
        : 500;
      return {
        success: false,
        message: this.getMetadataErrorMessage(status, 'fetch projects'),
        statusCode: status
      };
    }
  };

  /**
   * Get sections with result object pattern
   * Returns success/failure without throwing exceptions
   */
  getSectionsWithResult = async (
    config: TenantTestManagementIntegrationConfig,
    projectId: number
  ): Promise<CheckmateMetadataResult<CheckmateSectionsResponse>> => {
    try {
      const data = await this.getSections(config, projectId);
      return {
        success: true,
        data
      };
    } catch (error: unknown) {
      const status = (error && typeof error === 'object' && 'status' in error && typeof (error as { status?: number }).status === 'number')
        ? (error as { status: number }).status
        : 500;
      return {
        success: false,
        message: this.getMetadataErrorMessage(status, 'fetch sections'),
        statusCode: status
      };
    }
  };

  /**
   * Get labels with result object pattern
   * Returns success/failure without throwing exceptions
   */
  getLabelsWithResult = async (
    config: TenantTestManagementIntegrationConfig,
    projectId: number
  ): Promise<CheckmateMetadataResult<CheckmateLabelsResponse>> => {
    try {
      const data = await this.getLabels(config, projectId);
      return {
        success: true,
        data
      };
    } catch (error: unknown) {
      const status = (error && typeof error === 'object' && 'status' in error && typeof (error as { status?: number }).status === 'number')
        ? (error as { status: number }).status
        : 500;
      return {
        success: false,
        message: this.getMetadataErrorMessage(status, 'fetch labels'),
        statusCode: status
      };
    }
  };

  /**
   * Get squads with result object pattern
   * Returns success/failure without throwing exceptions
   */
  getSquadsWithResult = async (
    config: TenantTestManagementIntegrationConfig,
    projectId: number
  ): Promise<CheckmateMetadataResult<CheckmateSquadsResponse>> => {
    try {
      const data = await this.getSquads(config, projectId);
      return {
        success: true,
        data
      };
    } catch (error: unknown) {
      const status = (error && typeof error === 'object' && 'status' in error && typeof (error as { status?: number }).status === 'number')
        ? (error as { status: number }).status
        : 500;
      return {
        success: false,
        message: this.getMetadataErrorMessage(status, 'fetch squads'),
        statusCode: status
      };
    }
  };
}
