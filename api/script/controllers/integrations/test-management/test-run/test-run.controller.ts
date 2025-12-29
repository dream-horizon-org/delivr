import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { TestManagementRunService } from '~services/integrations/test-management/test-run';
import { TestPlatform } from '~types/integrations/test-management';
import {
  errorResponse,
  getErrorStatusCode,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';
import { TEST_MANAGEMENT_ERROR_MESSAGES, TEST_MANAGEMENT_SUCCESS_MESSAGES } from '../constants';
import { validatePlatforms, validateRunDescription, validateRunName } from './test-run.validation';

/**
 * Create test runs for platforms in a test management config
 * POST /test-management/test-runs
 * 
 * Body: {
 *   testManagementConfigId: string,  // REQUIRED: ID of test management config
 *   runName: string,                 // REQUIRED: display name (5-50 chars)
 *   runDescription?: string,         // Optional: description for test runs
 *   platforms?: TestPlatform[]       // Optional: only create for these platforms
 * }
 * 
 * If platforms is not provided, creates runs for ALL platforms in config.
 * If platforms is provided, only creates runs for those specific platforms.
 * runName will be used for all created test runs.
 * 
 * Returns: {
 *   IOS: { runId, url, status },      // Success
 *   ANDROID: { error: "..." }         // Failure (some platforms may fail)
 * }
 * 
 * Note: Supports partial success - some platforms may succeed while others fail.
 * Check for presence of 'error' field to determine if a platform failed.
 */
const createTestRunsHandler = (service: TestManagementRunService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { testManagementConfigId, runName, runDescription, platforms } = req.body;

      if (!testManagementConfigId || typeof testManagementConfigId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('testManagementConfigId', 'testManagementConfigId is required')
        );
        return;
      }

      // Validate runName
      const runNameError = validateRunName(runName);
      if (runNameError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('runName', runNameError)
        );
        return;
      }

      // Validate runDescription
      const runDescriptionError = validateRunDescription(runDescription);
      if (runDescriptionError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('runDescription', runDescriptionError)
        );
        return;
      }

      // Validate platforms if provided
      if (platforms) {
        const platformsError = validatePlatforms(platforms);
        if (platformsError) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('platforms', platformsError)
          );
          return;
        }
      }

      const result = await service.createTestRuns({ 
        testManagementConfigId,
        runName,
        runDescription,
        platforms 
      });

      res.status(HTTP_STATUS.CREATED).json(successResponse(result));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.CREATE_TEST_RUNS_FAILED));
    }
  };

/**
 * Get test status with threshold evaluation
 * GET /test-management/test-runs/:runId?testManagementConfigId=yyy
 * 
 * Returns: {
 *   runId, status, passPercentage, threshold,
 *   isPassingThreshold, readyForApproval
 * }
 */
const getTestStatusHandler = (service: TestManagementRunService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { runId, platform } = req.params;
      const { testManagementConfigId } = req.query;

      if (!runId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('runId', 'runId path parameter is required')
        );
        return;
      }

      if (!testManagementConfigId || typeof testManagementConfigId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('testManagementConfigId', 'testManagementConfigId query parameter is required')
        );
        return;
      }

      const result = await service.getTestStatus({ runId, testManagementConfigId, platform: platform as TestPlatform });

      res.status(HTTP_STATUS.OK).json(successResponse(result));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.GET_TEST_STATUS_FAILED));
    }
  };

/**
 * Reset test run in provider
 * POST /test-management/test-runs/:runId/reset
 * 
 * Body: {
 *   testManagementConfigId: string
 * }
 */
const resetTestRunHandler = (service: TestManagementRunService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { runId } = req.params;
      const { testManagementConfigId } = req.body;

      if (!runId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('runId', 'runId path parameter is required')
        );
        return;
      }

      if (!testManagementConfigId || typeof testManagementConfigId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('testManagementConfigId', 'testManagementConfigId is required')
        );
        return;
      }

      const result = await service.resetTestRun({ runId, testManagementConfigId });

      res.status(HTTP_STATUS.OK).json(
        successResponse(result, TEST_MANAGEMENT_SUCCESS_MESSAGES.TEST_RUN_RESET)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.RESET_TEST_RUN_FAILED));
    }
  };

/**
 * Cancel test run
 * POST /test-management/test-runs/:runId/cancel
 * 
 * Body: {
 *   testManagementConfigId: string
 * }
 */
const cancelTestRunHandler = (service: TestManagementRunService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { runId } = req.params;
      const { testManagementConfigId } = req.body;

      if (!runId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('runId', 'runId path parameter is required')
        );
        return;
      }

      if (!testManagementConfigId || typeof testManagementConfigId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('testManagementConfigId', 'testManagementConfigId is required')
        );
        return;
      }

      await service.cancelTestRun({ runId, testManagementConfigId });

      res.status(HTTP_STATUS.OK).json(
        successResponse(undefined, TEST_MANAGEMENT_SUCCESS_MESSAGES.TEST_RUN_CANCELLED)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.CANCEL_TEST_RUN_FAILED));
    }
  };

/**
 * Get detailed test report
 * GET /test-management/test-runs/:runId/report?testManagementConfigId=yyy&groupBy=section
 */
const getTestReportHandler = (service: TestManagementRunService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { runId } = req.params;
      const { testManagementConfigId, groupBy } = req.query;

      if (!runId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('runId', 'runId path parameter is required')
        );
        return;
      }

      if (!testManagementConfigId || typeof testManagementConfigId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('testManagementConfigId', 'testManagementConfigId query parameter is required')
        );
        return;
      }

      const groupByValue = typeof groupBy === 'string' ? groupBy : undefined;

      const result = await service.getTestReport({
        runId,
        testManagementConfigId,
        groupBy: groupByValue
      });

      res.status(HTTP_STATUS.OK).json(successResponse(result));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.GET_TEST_REPORT_FAILED));
    }
  };

export const createTestManagementRunController = (service: TestManagementRunService) => ({
  createTestRuns: createTestRunsHandler(service),
  getTestStatus: getTestStatusHandler(service),
  resetTestRun: resetTestRunHandler(service),
  cancelTestRun: cancelTestRunHandler(service),
  getTestReport: getTestReportHandler(service)
});

