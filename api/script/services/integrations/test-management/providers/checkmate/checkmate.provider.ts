/**
 * Checkmate Provider Implementation
 * Implements test management integration with Checkmate
 */

import { TestManagementProviderType, TestRunStatus } from '~types/integrations/test-management';
import type { ProjectTestManagementIntegrationConfig } from '~types/integrations/test-management/project-integration';
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
  CHECKMATE_HEADERS,
  CHECKMATE_HTTP_METHODS,
  CHECKMATE_HTTP_STATUS,
  CHECKMATE_QUERY_PARAMS,
  CHECKMATE_URL_PARAMS,
  CHECKMATE_URL_TEMPLATES
} from './checkmate.constants';
import type {
  CheckmateConfig,
  CheckmateCreateRunRequest,
  CheckmateCreateRunResponse,
  CheckmateRunStateData,
  CheckmateRunStateResponse
} from './checkmate.interface';

/**
 * Checkmate Provider
 * Handles communication with Checkmate API
 */
export class CheckmateProvider implements ITestManagementProvider {
  readonly providerType = TestManagementProviderType.CHECKMATE;

  /**
   * Type guard to validate Checkmate configuration
   */
  private isCheckmateConfig = (config: ProjectTestManagementIntegrationConfig): config is CheckmateConfig => {
    const baseUrlExists = 'baseUrl' in config;
    const baseUrlIsString = typeof config.baseUrl === 'string';
    const hasBaseUrl = baseUrlExists && baseUrlIsString;
    
    const authTokenExists = 'authToken' in config;
    const authTokenIsString = typeof config.authToken === 'string';
    const hasAuthToken = authTokenExists && authTokenIsString;
    
    const configIsValid = hasBaseUrl && hasAuthToken;
    return configIsValid;
  };

  /**
   * Get Checkmate config from generic config (with validation)
   */
  private getCheckmateConfig = (config: ProjectTestManagementIntegrationConfig): CheckmateConfig => {
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
    const url = `${checkmateConfig.baseUrl}${endpoint}`;
    const authorizationValue = `${CHECKMATE_HEADERS.BEARER_PREFIX} ${checkmateConfig.authToken}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        [CHECKMATE_HEADERS.CONTENT_TYPE_KEY]: CHECKMATE_HEADERS.CONTENT_TYPE_VALUE,
        [CHECKMATE_HEADERS.AUTHORIZATION_KEY]: authorizationValue,
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
   */
  private mapRunStatus = (checkmateData: CheckmateRunStateData): TestRunStatus => {
    const inProgressCount = checkmateData.inProgress ?? 0;
    const allTestsCompleted = checkmateData.untested === 0 && inProgressCount === 0;
    
    if (allTestsCompleted) {
      return checkmateData.failed > 0 ? TestRunStatus.FAILED : TestRunStatus.COMPLETED;
    }
    
    const testingHasStarted = checkmateData.passed > 0 || checkmateData.failed > 0;
    
    if (testingHasStarted) {
      return TestRunStatus.IN_PROGRESS;
    }
    
    return TestRunStatus.PENDING;
  };

  /**
   * Build run URL for Checkmate UI
   */
  private buildRunUrl = (baseUrl: string, projectId: number, runId: string): string => {
    const url = CHECKMATE_URL_TEMPLATES.PROJECT_RUN
      .replace(CHECKMATE_URL_PARAMS.PROJECT_ID, projectId.toString())
      .replace(CHECKMATE_URL_PARAMS.RUN_ID, runId);
    return `${baseUrl}${url}`;
  };

  /**
   * Build simple run URL
   */
  private buildSimpleRunUrl = (baseUrl: string, runId: string): string => {
    const urlTemplate = CHECKMATE_URL_TEMPLATES.RUNS;
    const url = urlTemplate.replace(CHECKMATE_URL_PARAMS.RUN_ID, runId);
    return `${baseUrl}${url}`;
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
  validateConfig = async (config: ProjectTestManagementIntegrationConfig): Promise<boolean> => {
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
          method: CHECKMATE_HTTP_METHODS.GET
        });
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '';
        const isUnauthorized = errorMessage.includes(CHECKMATE_HTTP_STATUS.UNAUTHORIZED.toString());
        const isForbidden = errorMessage.includes(CHECKMATE_HTTP_STATUS.FORBIDDEN.toString());
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
    config: ProjectTestManagementIntegrationConfig,
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
    const filterType = parameters.filterType;
    const createdBy = parameters.createdBy;

    const requestBody: CheckmateCreateRunRequest = {
      projectId,
      runName,
      ...(runDescription && { runDescription }),
      ...(sectionIds && { sectionIds }),
      ...(labelIds && { labelIds }),
      ...(squadIds && { squadIds }),
      ...(platformIds && { platformIds }),
      ...(filterType && { filterType }),
      ...(createdBy && { createdBy })
    };

    const response = await this.makeRequest<CheckmateCreateRunResponse>(
      checkmateConfig,
      CHECKMATE_API_ENDPOINTS.CREATE_RUN,
      {
        method: CHECKMATE_HTTP_METHODS.POST,
        body: JSON.stringify(requestBody)
      }
    );

    const runId = response.runId.toString();
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
    config: ProjectTestManagementIntegrationConfig,
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
        method: CHECKMATE_HTTP_METHODS.GET
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
   */
  resetTestRun = async (
    config: ProjectTestManagementIntegrationConfig,
    runId: string
  ): Promise<TestRunResult> => {
    const checkmateConfig = this.getCheckmateConfig(config);
    const endpoint = this.buildRunActionEndpoint(CHECKMATE_API_ENDPOINTS.RUN_RESET, runId);
    
    await this.makeRequest(
      checkmateConfig,
      endpoint,
      {
        method: CHECKMATE_HTTP_METHODS.POST,
        body: '{}'
      }
    );

    const runUrl = this.buildSimpleRunUrl(checkmateConfig.baseUrl, runId);

    return {
      runId,
      url: runUrl,
      status: TestRunStatus.PENDING
    };
  };

  /**
   * Cancel a test run in Checkmate
   */
  cancelTestRun = async (
    config: ProjectTestManagementIntegrationConfig,
    runId: string
  ): Promise<void> => {
    const checkmateConfig = this.getCheckmateConfig(config);
    const endpoint = this.buildRunActionEndpoint(CHECKMATE_API_ENDPOINTS.RUN_CANCEL, runId);
    
    await this.makeRequest(
      checkmateConfig,
      endpoint,
      {
        method: CHECKMATE_HTTP_METHODS.POST,
        body: '{}'
      }
    );
  };

  /**
   * Get detailed test report from Checkmate
   */
  getTestReport = async (
    config: ProjectTestManagementIntegrationConfig,
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
        method: CHECKMATE_HTTP_METHODS.GET
      }
    );

    return response.data;
  };
}
