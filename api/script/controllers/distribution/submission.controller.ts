import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { SubmissionService } from '~services/distribution';
import {
  errorResponse,
  getErrorStatusCode,
  successResponse,
  notFoundResponse,
  validationErrorResponse,
  successMessageResponse
} from '~utils/response.utils';
import { 
  SUBMISSION_ERROR_MESSAGES,
  SUBMISSION_ACTION_HISTORY_ERROR_MESSAGES,
  SUBMISSION_ACTION_HISTORY_SUCCESS_MESSAGES
} from '~types/distribution/submission.constants';

/**
 * Get submission details by ID
 * GET /submissions/:submissionId
 * 
 * Fetches submission details from either Android or iOS table
 * Returns complete submission info with artifact and action history
 */
const getSubmissionDetailsHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { submissionId } = req.params;

      if (!submissionId || typeof submissionId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('submissionId is required'),
            'Invalid submission ID'
          )
        );
        return;
      }

      const submission = await service.getSubmissionDetails(submissionId);

      if (!submission) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Submission')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse(submission)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to get submission details')
      );
    }
  };

/**
 * Submit existing submission to store
 * PUT /submissions/:submissionId/submit?platform=<ANDROID|IOS>
 * 
 * Submits an existing PENDING submission to the store for review
 * Query params: platform (ANDROID or IOS)
 * 
 * Request body (iOS):
 * - phasedRelease: boolean
 * - resetRating: boolean
 * - releaseNotes: string
 * 
 * Request body (Android):
 * - rolloutPercent: number (0-100)
 * - inAppPriority: number (0-5)
 * - releaseNotes: string
 */
const submitExistingSubmissionHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { submissionId } = req.params;
      const { platform } = req.query;
      const submittedBy = req.user?.email ?? 'unknown';

      if (!submissionId || typeof submissionId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('submissionId is required'),
            'Invalid submission ID'
          )
        );
        return;
      }

      // Validate platform parameter
      if (!platform || typeof platform !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', 'platform query parameter is required')
        );
        return;
      }

      const platformUpper = platform.toUpperCase();
      if (platformUpper !== 'ANDROID' && platformUpper !== 'IOS') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', 'platform must be ANDROID or IOS')
        );
        return;
      }

      // Check if credentials for submissionId -> distributionId -> tenantId -> platform & Store_type -> store_credentials status is VERIFIED

      let result;

      if (platformUpper === 'IOS') {
        // iOS submission
        const { phasedRelease, resetRating, releaseNotes } = req.body;

        // Validate iOS fields
        if (typeof phasedRelease !== 'boolean') {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('phasedRelease', 'phasedRelease must be a boolean')
          );
          return;
        }

        if (typeof resetRating !== 'boolean') {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('resetRating', 'resetRating must be a boolean')
          );
          return;
        }

        if (!releaseNotes || typeof releaseNotes !== 'string') {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('releaseNotes', 'releaseNotes is required')
          );
          return;
        }

        result = await service.submitExistingIosSubmission(
          submissionId,
          { phasedRelease, resetRating, releaseNotes },
          submittedBy
        );
      } else {
        // Android submission
        const { rolloutPercent, inAppPriority, releaseNotes } = req.body;

        // Validate Android fields
        if (typeof rolloutPercent !== 'number') {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('rolloutPercent', 'rolloutPercent must be a number')
          );
          return;
        }

        if (rolloutPercent < 0 || rolloutPercent > 100) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('rolloutPercent', 'rolloutPercent must be between 0 and 100')
          );
          return;
        }

        if (typeof inAppPriority !== 'number') {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('inAppPriority', 'inAppPriority must be a number')
          );
          return;
        }

        if (inAppPriority < 0 || inAppPriority > 5) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('inAppPriority', 'inAppPriority must be between 0 and 5')
          );
          return;
        }

        if (!releaseNotes || typeof releaseNotes !== 'string') {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('releaseNotes', 'releaseNotes is required')
          );
          return;
        }

        result = await service.submitExistingAndroidSubmission(
          submissionId,
          { rolloutPercent, inAppPriority, releaseNotes },
          submittedBy
        );
      }

      if (!result) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Submission')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse(result)
      );
    } catch (error) {
      // Check for specific validation errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Must be PENDING') || 
          errorMessage.includes('version conflict') ||
          errorMessage.includes('already submitted')) {
        res.status(HTTP_STATUS.CONFLICT).json(
          errorResponse(error, 'Cannot submit submission')
        );
        return;
      }

      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to submit submission')
      );
    }
  };

/**
 * Create new submission (resubmission)
 * POST /distributions/:distributionId/submissions
 * 
 * Creates a completely new submission after rejection/cancellation
 * User provides new artifact and can update any fields
 * 
 * Request body (iOS):
 * - platform: "IOS"
 * - version: string
 * - testflightNumber: string
 * - phasedRelease: boolean
 * - resetRating: boolean
 * - releaseNotes: string
 * 
 * Request body (Android):
 * - platform: "ANDROID"
 * - version: string
 * - versionCode: number (optional)
 * - aabFile: file (multipart)
 * - rolloutPercent: number
 * - inAppPriority: number
 * - releaseNotes: string
 */
const createNewSubmissionHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { distributionId } = req.params;
      const { platform } = req.body;
      const submittedBy = req.user?.email ?? 'unknown';

      if (!distributionId || typeof distributionId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('distributionId is required'),
            'Invalid distribution ID'
          )
        );
        return;
      }

      // Validate platform field
      if (!platform || typeof platform !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', 'platform is required')
        );
        return;
      }

      const platformUpper = platform.toUpperCase();
      if (platformUpper !== 'ANDROID' && platformUpper !== 'IOS') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', 'platform must be ANDROID or IOS')
        );
        return;
      }

      let result;

      if (platformUpper === 'IOS') {
        // iOS resubmission
        const { version, testflightNumber, phasedRelease, resetRating, releaseNotes } = req.body;

        // Validate iOS fields
        if (!version || typeof version !== 'string') {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('version', 'version is required')
          );
          return;
        }

        if (!testflightNumber || (typeof testflightNumber !== 'string' && typeof testflightNumber !== 'number')) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('testflightNumber', 'testflightNumber is required')
          );
          return;
        }

        if (typeof phasedRelease !== 'boolean') {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('phasedRelease', 'phasedRelease must be a boolean')
          );
          return;
        }

        if (typeof resetRating !== 'boolean') {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('resetRating', 'resetRating must be a boolean')
          );
          return;
        }

        if (!releaseNotes || typeof releaseNotes !== 'string') {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('releaseNotes', 'releaseNotes is required')
          );
          return;
        }

        result = await service.createNewIosSubmission(
          distributionId,
          {
            version,
            testflightNumber: String(testflightNumber),
            phasedRelease,
            resetRating,
            releaseNotes
          },
          submittedBy
        );
      } else {
        // Android resubmission - not yet implemented
        res.status(HTTP_STATUS.NOT_IMPLEMENTED).json({
          error: "Not implemented yet",
          message: "Android resubmission will be implemented later"
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse(result)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to create new submission')
      );
    }
  };

/**
 * Pause iOS rollout / Halt Android rollout
 * PATCH /submissions/:submissionId/rollout/pause?platform=<IOS|ANDROID>
 * 
 * - iOS: Pauses an active iOS phased release rollout
 * - Android: Halts an active Android release rollout
 * 
 * Query params: platform (IOS or ANDROID)
 * Request body: { reason: string }
 */
const pauseRolloutHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { submissionId } = req.params;
      const { platform } = req.query;
      const { reason } = req.body;
      const createdBy = req.user?.email ?? 'unknown';

      if (!submissionId || typeof submissionId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('submissionId is required'),
            'Invalid submission ID'
          )
        );
        return;
      }

      // Validate platform parameter
      if (!platform || typeof platform !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', 'platform query parameter is required')
        );
        return;
      }

      const platformUpper = platform.toUpperCase();
      if (platformUpper !== 'IOS' && platformUpper !== 'ANDROID') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', 'platform must be IOS or ANDROID')
        );
        return;
      }

      if (!reason || typeof reason !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('reason', SUBMISSION_ACTION_HISTORY_ERROR_MESSAGES.REASON_REQUIRED)
        );
        return;
      }

      let result;

      if (platformUpper === 'IOS') {
        // iOS: Pause rollout
        result = await service.pauseRollout(submissionId, reason, createdBy);
      } else {
        // Android: Halt rollout
        result = await service.haltAndroidRollout(submissionId, reason, createdBy);
      }

      if (!result) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Submission')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse(result)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const action = req.query.platform?.toString().toUpperCase() === 'ANDROID' ? 'halt' : 'pause';
      res.status(statusCode).json(
        errorResponse(error, `Failed to ${action} rollout`)
      );
    }
  };

/**
 * Resume iOS rollout
 * PATCH /submissions/:submissionId/rollout/resume?platform=IOS
 * 
 * Resumes a paused iOS phased release rollout
 * Query params: platform (IOS only)
 */
const resumeRolloutHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { submissionId } = req.params;
      const { platform } = req.query;
      const createdBy = req.user?.email ?? 'unknown';

      if (!submissionId || typeof submissionId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('submissionId is required'),
            'Invalid submission ID'
          )
        );
        return;
      }

      // Validate platform parameter
      if (!platform || typeof platform !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', 'platform query parameter is required')
        );
        return;
      }

      // Only iOS supports pause/resume
      if (platform.toUpperCase() === 'ANDROID') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('Resume rollout is only supported for iOS submissions'),
            'Android submissions do not support pause/resume functionality'
          )
        );
        return;
      }

      if (platform.toUpperCase() !== 'IOS') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', 'platform must be IOS')
        );
        return;
      }

      const result = await service.resumeRollout(submissionId, createdBy);

      if (!result) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Submission')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse(result)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to resume rollout')
      );
    }
  };

/**
 * Update rollout percentage
 * PATCH /submissions/:submissionId/rollout?platform=<ANDROID|IOS>
 * 
 * Updates rollout percentage for a submission (platform-specific rules)
 * Query params: platform (ANDROID or IOS)
 * Request body: { rolloutPercent: number }
 */
const updateRolloutPercentageHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { submissionId } = req.params;
      const { platform } = req.query;
      const { rolloutPercent } = req.body;

      if (!submissionId || typeof submissionId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('submissionId is required'),
            'Invalid submission ID'
          )
        );
        return;
      }

      // Validate platform parameter
      if (!platform || typeof platform !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', 'platform query parameter is required')
        );
        return;
      }

      const platformUpper = platform.toUpperCase();
      if (platformUpper !== 'ANDROID' && platformUpper !== 'IOS') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', 'platform must be ANDROID or IOS')
        );
        return;
      }

      // Validate rolloutPercent
      if (typeof rolloutPercent !== 'number') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('rolloutPercent', 'rolloutPercent must be a number')
        );
        return;
      }

      if (rolloutPercent < 0 || rolloutPercent > 100) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('rolloutPercent', 'rolloutPercent must be between 0 and 100')
        );
        return;
      }

      let result;

      if (platformUpper === 'IOS') {
        result = await service.updateIosRolloutPercentage(submissionId, rolloutPercent);
      } else {
        // Android
        result = await service.updateAndroidRolloutPercentage(submissionId, rolloutPercent);
      }

      if (!result) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Submission')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse(result)
      );
    } catch (error) {
      // Check for specific iOS validation errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('already at 100%') || 
          errorMessage.includes('can only be updated to 100%')) {
        res.status(HTTP_STATUS.CONFLICT).json(
          errorResponse(error, 'Rollout percentage update not allowed')
        );
        return;
      }

      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to update rollout percentage')
      );
    }
  };

/**
 * Cancel iOS submission (iOS only)
 * PATCH /submissions/:submissionId/cancel
 * Query params: platform (IOS only)
 * Request body: { reason: string }
 */
const cancelSubmissionHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { submissionId } = req.params;
      const { platform } = req.query;
      const { reason } = req.body;
      const createdBy = req.user?.email ?? 'unknown';

      if (!submissionId || typeof submissionId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('submissionId is required'),
            'Invalid submission ID'
          )
        );
        return;
      }

      // Validate platform parameter
      if (!platform || typeof platform !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', 'platform query parameter is required')
        );
        return;
      }

      // Only iOS supports cancel submission (for now)
      if (platform.toUpperCase() === 'ANDROID') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('Cancel submission is only supported for iOS submissions'),
            'Android submission cancellation will be implemented later'
          )
        );
        return;
      }

      if (platform.toUpperCase() !== 'IOS') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', 'platform must be IOS')
        );
        return;
      }

      if (!reason || typeof reason !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('reason', SUBMISSION_ACTION_HISTORY_ERROR_MESSAGES.REASON_REQUIRED)
        );
        return;
      }

      const result = await service.cancelSubmission(submissionId, reason, createdBy);

      if (!result) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Submission')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        successResponse(result)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to cancel submission')
      );
    }
  };

/**
 * Create and export controller with all handlers
 */
export const createSubmissionController = (service: SubmissionService) => ({
  getSubmissionDetails: getSubmissionDetailsHandler(service),
  submitExistingSubmission: submitExistingSubmissionHandler(service),
  createNewSubmission: createNewSubmissionHandler(service),
  pauseRollout: pauseRolloutHandler(service),
  resumeRollout: resumeRolloutHandler(service),
  updateRolloutPercentage: updateRolloutPercentageHandler(service),
  cancelSubmission: cancelSubmissionHandler(service)
});

export type SubmissionController = ReturnType<typeof createSubmissionController>;

