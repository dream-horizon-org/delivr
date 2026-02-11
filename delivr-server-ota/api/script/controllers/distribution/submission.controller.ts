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
 * GET /tenants/:tenantId/submissions/:submissionId
 * 
 * Fetches submission details from either Android or iOS table
 * Returns complete submission info with artifact and action history
 */
const getSubmissionDetailsHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId, submissionId } = req.params;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('tenantId is required'),
            'Invalid tenant ID'
          )
        );
        return;
      }

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
 * PUT /tenants/:tenantId/submissions/:submissionId/submit?platform=<ANDROID|IOS>
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
 * - rolloutPercentage: number (0-100)
 * - inAppUpdatePriority: number (0-5)
 * - releaseNotes: string
 */
const submitExistingSubmissionHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId, submissionId } = req.params;
      const { platform } = req.query;
      
      // Get user ID from authentication - required
      const submittedBy = req.user?.id;
      if (!submittedBy) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          errorResponse(
            new Error('User ID not found'),
            'Authentication required'
          )
        );
        return;
      }

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('tenantId is required'),
            'Invalid tenant ID'
          )
        );
        return;
      }

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

        // Comprehensive validation - all fields and resources
        const validationResult = await service.validateIosSubmission(
          submissionId,
          { phasedRelease, resetRating, releaseNotes },
          tenantId
        );
        
        if (!validationResult.valid) {
          // If validation has a field, use validationErrorResponse, otherwise use errorResponse
          if (validationResult.field) {
            res.status(validationResult.statusCode).json(
              validationErrorResponse(validationResult.field, validationResult.error ?? 'Validation failed')
          );
          } else {
            res.status(validationResult.statusCode).json(
              errorResponse(
                new Error(validationResult.error ?? 'Validation failed'),
                validationResult.error ?? 'Validation failed'
              )
          );
          }
          return;
        }

        result = await service.submitExistingIosSubmission(
          submissionId,
          { phasedRelease, resetRating, releaseNotes },
          submittedBy,
          tenantId
        );
      } else {
        // Android submission
        const { rolloutPercentage, inAppUpdatePriority, releaseNotes } = req.body;

        // Comprehensive validation - all fields and resources
        const validationResult = await service.validateAndroidSubmission(
          submissionId,
          { rolloutPercentage, inAppUpdatePriority, releaseNotes },
          tenantId
        );
        
        if (!validationResult.valid) {
          // If validation has a field, use validationErrorResponse, otherwise use errorResponse
          if (validationResult.field) {
            res.status(validationResult.statusCode).json(
              validationErrorResponse(validationResult.field, validationResult.error ?? 'Validation failed')
          );
          } else {
            res.status(validationResult.statusCode).json(
              errorResponse(
                new Error(validationResult.error ?? 'Validation failed'),
                validationResult.error ?? 'Validation failed'
              )
          );
          }
          return;
        }

        result = await service.submitExistingAndroidSubmission(
          submissionId,
          { rolloutPercentage, inAppUpdatePriority, releaseNotes },
          submittedBy,
          tenantId
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
 * POST /tenants/:tenantId/distributions/:distributionId/submissions
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
 * - rolloutPercentage: number
 * - inAppUpdatePriority: number
 * - releaseNotes: string
 */
const createNewSubmissionHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId, distributionId } = req.params;
      const { platform } = req.body;
      
      // Get user ID from authentication - required
      const submittedBy = req.user?.id;
      if (!submittedBy) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          errorResponse(
            new Error('User ID not found'),
            'Authentication required'
          )
        );
        return;
      }

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('tenantId is required'),
            'Invalid tenant ID'
          )
        );
        return;
      }

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

        // Comprehensive validation - all fields and resources
        const validationResult = await service.validateCreateIosSubmission(
          distributionId,
          {
            version,
            testflightNumber: String(testflightNumber),
            phasedRelease,
            resetRating,
            releaseNotes
          },
          tenantId
        );
        
        if (!validationResult.valid) {
          // If validation has a field, use validationErrorResponse, otherwise use errorResponse
          if (validationResult.field) {
            res.status(validationResult.statusCode).json(
              validationErrorResponse(validationResult.field, validationResult.error ?? 'Validation failed')
          );
          } else {
            res.status(validationResult.statusCode).json(
              errorResponse(
                new Error(validationResult.error ?? 'Validation failed'),
                validationResult.error ?? 'Validation failed'
              )
          );
          }
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
          submittedBy,
          tenantId
        );
      } else {
        // Android resubmission (multipart/form-data: all body fields are strings; coerce numbers)
        const { version, versionCode, rolloutPercentage, inAppUpdatePriority, releaseNotes } = req.body;
        const aabFile = (req as any).file;

        const rolloutPercentageNum = rolloutPercentage != null ? Number(rolloutPercentage) : NaN;
        const inAppUpdatePriorityNum = inAppUpdatePriority != null ? Number(inAppUpdatePriority) : NaN;

        // Validate Android fields
        if (!version || typeof version !== 'string') {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('version', 'version is required')
          );
          return;
        }

        if (!aabFile || !aabFile.buffer) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('aabFile', 'aabFile is required')
          );
          return;
        }

        if (typeof rolloutPercentageNum !== 'number' || Number.isNaN(rolloutPercentageNum) || rolloutPercentageNum < 0 || rolloutPercentageNum > 100) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('rolloutPercentage', 'rolloutPercentage must be a number between 0 and 100')
          );
          return;
        }

        if (typeof inAppUpdatePriorityNum !== 'number' || Number.isNaN(inAppUpdatePriorityNum) || inAppUpdatePriorityNum < 0 || inAppUpdatePriorityNum > 5) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('inAppUpdatePriority', 'inAppUpdatePriority must be a number between 0 and 5')
          );
          return;
        }

        if (!releaseNotes || typeof releaseNotes !== 'string') {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            validationErrorResponse('releaseNotes', 'releaseNotes is required')
          );
          return;
        }

        // Comprehensive validation - all fields and resources
        const validationResult = await service.validateCreateAndroidSubmission(
          distributionId,
          {
            version,
            versionCode: versionCode != null && versionCode !== '' ? Number(versionCode) : undefined,
            aabFile: aabFile.buffer,
            rolloutPercentage: rolloutPercentageNum,
            inAppUpdatePriority: inAppUpdatePriorityNum,
            releaseNotes
          },
          tenantId
        );
        
        if (!validationResult.valid) {
          // If validation has a field, use validationErrorResponse, otherwise use errorResponse
          if (validationResult.field) {
            res.status(validationResult.statusCode).json(
              validationErrorResponse(validationResult.field, validationResult.error ?? 'Validation failed')
            );
          } else {
            res.status(validationResult.statusCode).json(
              errorResponse(
                new Error(validationResult.error ?? 'Validation failed'),
                validationResult.error ?? 'Validation failed'
              )
            );
          }
          return;
        }

        result = await service.createNewAndroidSubmission(
          distributionId,
          {
            version,
            versionCode: versionCode != null && versionCode !== '' ? Number(versionCode) : undefined,
            aabFile: aabFile.buffer,
            rolloutPercentage: rolloutPercentageNum,
            inAppUpdatePriority: inAppUpdatePriorityNum,
            releaseNotes
          },
          submittedBy,
          tenantId
        );
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
 * PATCH /tenants/:tenantId/submissions/:submissionId/rollout/pause?platform=<IOS|ANDROID>
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
      const { tenantId, submissionId } = req.params;
      const { platform } = req.query;
      const { reason } = req.body;
      
      // Get user ID from authentication - required
      const createdBy = req.user?.id;
      if (!createdBy) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          errorResponse(
            new Error('User ID not found'),
            'Authentication required'
          )
        );
        return;
      }

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('tenantId is required'),
            'Invalid tenant ID'
          )
        );
        return;
      }

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
        result = await service.pauseRollout(submissionId, reason, createdBy, tenantId);
      } else {
        // Android: Halt rollout
        result = await service.haltAndroidRollout(submissionId, reason, createdBy, tenantId);
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
 * Resume rollout (iOS or Android)
 * PATCH /tenants/:tenantId/submissions/:submissionId/rollout/resume?platform=<IOS|ANDROID>
 * 
 * - iOS: Resumes a paused iOS phased release rollout
 * - Android: Resumes a halted Android release rollout
 * 
 * Query params: platform (IOS or ANDROID)
 */
const resumeRolloutHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId, submissionId } = req.params;
      const { platform } = req.query;
      
      // Get user ID from authentication - required
      const createdBy = req.user?.id;
      if (!createdBy) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          errorResponse(
            new Error('User ID not found'),
            'Authentication required'
          )
        );
        return;
      }

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('tenantId is required'),
            'Invalid tenant ID'
          )
        );
        return;
      }

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

      const result = await service.resumeRollout(submissionId, createdBy, platformUpper, tenantId);

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
 * PATCH /tenants/:tenantId/submissions/:submissionId/rollout?platform=<ANDROID|IOS>
 * 
 * Updates rollout percentage for a submission (platform-specific rules)
 * Query params: platform (ANDROID or IOS)
 * Request body: { rolloutPercent: number }
 */
const updateRolloutPercentageHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId, submissionId } = req.params;
      const { platform } = req.query;
      const { rolloutPercent } = req.body;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('tenantId is required'),
            'Invalid tenant ID'
          )
        );
        return;
      }

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
        result = await service.updateIosRolloutPercentage(submissionId, rolloutPercent, tenantId);
      } else {
        // Android
        result = await service.updateAndroidRolloutPercentage(submissionId, rolloutPercent, tenantId);
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
 * PATCH /tenants/:tenantId/submissions/:submissionId/cancel
 * Query params: platform (IOS only)
 * Request body: { reason: string }
 */
const cancelSubmissionHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId, submissionId } = req.params;
      const { platform } = req.query;
      const { reason } = req.body;
      
      // Get user ID from authentication - required
      const createdBy = req.user?.id;
      if (!createdBy) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          errorResponse(
            new Error('User ID not found'),
            'Authentication required'
          )
        );
        return;
      }

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('tenantId is required'),
            'Invalid tenant ID'
          )
        );
        return;
      }

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

      const result = await service.cancelSubmission(submissionId, reason, createdBy, tenantId);

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
 * Submission status handler (Cronicle webhook handler)
 * POST /tenants/:tenantId/submissions/:submissionId/status?platform=<IOS|ANDROID>
 * 
 * Routes to platform-specific service method:
 * - iOS: service.IosSubmissionStatus()
 * - Android: service.AndroidSubmissionStatus() (not yet implemented)
 * 
 * Called by Cronicle every 2 hours to check submission status
 * Updates database if status changed, adds history if rejected
 */
const SubmissionStatusHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId, submissionId } = req.params;
      const { platform, storeType } = req.query;

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('tenantId is required'),
            'Invalid tenant ID'
          )
        );
        return;
      }

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

      // Validate storeType parameter
      if (!storeType || typeof storeType !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('storeType', 'storeType query parameter is required')
        );
        return;
      }

      const storeTypeUpper = storeType.toUpperCase();

      if (storeTypeUpper !== 'APP_STORE') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('storeType', 'storeType must be APP_STORE')
        );
        return;
      }

      if (platformUpper !== 'IOS' ) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('platform', 'platform must be IOS ')
        );
        return;
      }

      console.log(`[SubmissionStatus] Webhook received for ${platformUpper} submission ${submissionId} (storeType: ${storeTypeUpper})`);

      let result;

      
      // Call iOS-specific service method
      result = await service.IosSubmissionStatus(submissionId);
     

      res.status(HTTP_STATUS.OK).json(
        successResponse(result)
      );
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to update submission status')
      );
    }
  };

/**
 * Get submission artifact download URL
 * GET /tenants/:tenantId/submissions/:submissionId/artifact?platform={android|ios}
 * 
 * Generates presigned download URL for a submission artifact
 * Returns: { url: string, expiresAt: string }
 */
const getSubmissionArtifactDownloadHandler = (service: SubmissionService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { submissionId, tenantId } = req.params;
      const { platform } = req.query;

      // Validate submissionId
      if (!submissionId || typeof submissionId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          errorResponse(
            new Error('submissionId is required'),
            'Invalid submission ID'
          )
        );
        return;
      }

      // Validate tenantId
      if (!tenantId || typeof tenantId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('tenantId', 'Tenant ID is required')
        );
        return;
      }

      // Validate platform parameter
      if (!platform || typeof platform !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse(
            'platform',
            'Query parameter "platform" is required. Valid values: android, ios'
          )
        );
        return;
      }

      const platformUpper = platform.toUpperCase();
      if (platformUpper !== 'ANDROID' && platformUpper !== 'IOS') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse(
            'platform',
            'Platform must be ANDROID or IOS'
          )
        );
        return;
      }

      // Call service to get presigned URL (validates tenant ownership, generates URL with expiry)
      const result = await service.getSubmissionArtifactDownloadUrl(
        submissionId,
        platformUpper as 'ANDROID' | 'IOS',
        tenantId
      );

      res.status(HTTP_STATUS.OK).json(successResponse(result));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Map specific errors to 404
      const isNotFound = 
        errorMessage.includes('not found') ||
        errorMessage.includes('not available') ||
        errorMessage.includes('not belong');
      
      if (isNotFound) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          notFoundResponse('Submission artifact')
        );
        return;
      }

      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, 'Failed to get submission artifact download URL')
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
  cancelSubmission: cancelSubmissionHandler(service),
  submissionStatus: SubmissionStatusHandler(service),
  getSubmissionArtifactDownload: getSubmissionArtifactDownloadHandler(service)
});

export type SubmissionController = ReturnType<typeof createSubmissionController>;

