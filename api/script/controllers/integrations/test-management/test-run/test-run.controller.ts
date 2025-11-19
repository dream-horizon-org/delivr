import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { TestManagementRunService } from '~services/integrations/test-management/test-run';
import {
  errorResponse,
  getErrorStatusCode,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';
import { TEST_MANAGEMENT_ERROR_MESSAGES, TEST_MANAGEMENT_SUCCESS_MESSAGES } from '../constants';

/**
 * Create test runs for all platforms in a test management config
 * POST /test-runs/create
 * 
 * Body: {
 *   testManagementConfigId: string
 * }
 * 
 * Returns: {
 *   ios: { runId, url, status },
 *   android: { runId, url, status }
 * }
 */
const createTestRunsHandler = (service: TestManagementRunService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { testManagementConfigId } = req.body;

      const testManagementConfigIdMissing = !testManagementConfigId;
      if (testManagementConfigIdMissing) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('testManagementConfigId', 'testManagementConfigId is required')
        );
        return;
      }

      const result = await service.createTestRuns({ testManagementConfigId });

      res.status(HTTP_STATUS.CREATED).json(successResponse(result));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.CREATE_TEST_RUNS_FAILED));
    }
  };

/**
 * Get test status with threshold evaluation
 * GET /test-status?runId=xxx&testManagementConfigId=yyy
 * 
 * Returns: {
 *   runId, status, passPercentage, threshold,
 *   isPassingThreshold, readyForApproval
 * }
 */
const getTestStatusHandler = (service: TestManagementRunService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { runId, testManagementConfigId } = req.query;

      if (!runId || typeof runId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('runId', 'runId query parameter is required')
        );
        return;
      }

      if (!testManagementConfigId || typeof testManagementConfigId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('testManagementConfigId', 'testManagementConfigId query parameter is required')
        );
        return;
      }

      const result = await service.getTestStatus({ runId, testManagementConfigId });

      res.status(HTTP_STATUS.OK).json(successResponse(result));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(errorResponse(error, TEST_MANAGEMENT_ERROR_MESSAGES.GET_TEST_STATUS_FAILED));
    }
  };

/**
 * Reset test run in provider
 * POST /test-runs/reset
 * 
 * Body: {
 *   runId: string,
 *   testManagementConfigId: string
 * }
 */
const resetTestRunHandler = (service: TestManagementRunService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { runId, testManagementConfigId } = req.body;

      if (!runId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('runId', 'runId is required')
        );
        return;
      }

      if (!testManagementConfigId) {
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
 * POST /test-runs/cancel
 * 
 * Body: {
 *   runId: string,
 *   testManagementConfigId: string
 * }
 */
const cancelTestRunHandler = (service: TestManagementRunService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { runId, testManagementConfigId } = req.body;

      if (!runId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('runId', 'runId is required')
        );
        return;
      }

      if (!testManagementConfigId) {
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
 * GET /test-report?runId=xxx&testManagementConfigId=yyy&groupBy=section
 */
const getTestReportHandler = (service: TestManagementRunService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { runId, testManagementConfigId, groupBy } = req.query;

      if (!runId || typeof runId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('runId', 'runId query parameter is required')
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

