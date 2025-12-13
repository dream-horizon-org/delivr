/**
 * Release Management Controller
 * 
 * Handles HTTP requests for Release Management.
 * Focuses on validation and delegates to ReleaseCreationService.
 */

import { Request, Response } from 'express';
import { ReleaseCreationService } from '../../services/release/release-creation.service';
import { ReleaseRetrievalService } from '../../services/release/release-retrieval.service';
import { ReleaseStatusService } from '../../services/release/release-status.service';
import { ReleaseUpdateService } from '../../services/release/release-update.service';
import { CronJobService } from '../../services/release/cron-job/cron-job.service';
import { ManualUploadService } from '../../services/release/manual-upload.service';
import { UploadStage } from '../../models/release/release-uploads.sequelize.model';
import { PlatformName } from '../../models/release/release.interface';
import { HTTP_STATUS } from '../../constants/http';
import type { 
  CreateReleaseRequestBody,
  CreateReleasePayload,
  UpdateReleaseRequestBody,
  ReleaseListResponseBody, 
  SingleReleaseResponseBody 
} from '~types/release';
import { validateCreateReleaseRequest, validateUpdateReleaseRequest } from './release-validation';
import type { Platform } from '~types/integrations/project-management';
import { RELEASE_MANAGEMENT_ERROR_MESSAGES } from './release-management.constants';
import { isValidArtifactExtension } from '../../services/release/build/build-artifact.utils';

export class ReleaseManagementController {
  private creationService: ReleaseCreationService;
  private retrievalService: ReleaseRetrievalService;
  private statusService: ReleaseStatusService;
  private updateService: ReleaseUpdateService;
  private cronJobService: CronJobService;
  private manualUploadService: ManualUploadService | null;

  constructor(
    creationService: ReleaseCreationService,
    retrievalService: ReleaseRetrievalService,
    statusService: ReleaseStatusService,
    updateService: ReleaseUpdateService,
    cronJobService: CronJobService,
    manualUploadService?: ManualUploadService
  ) {
    this.creationService = creationService;
    this.retrievalService = retrievalService;
    this.statusService = statusService;
    this.updateService = updateService;
    this.cronJobService = cronJobService;
    this.manualUploadService = manualUploadService ?? null;
  }

  /**
   * Create a new Release
   * 
   * Flow:
   * 1. Mandatory field validation
   * 2. Optional field validation
   * 3. baseBranch resolution for hotfix
   * 4. create a release record
   * 5. link platforms to release
   * 6. create cron job
   * 7. create stage 1 tasks
   * 8. state history for this release/cron
   */
  createRelease = async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = req.params.tenantId;
      if (!req.user?.id) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Unauthorized' });
      }
      const accountId = req.user.id;
      const body = req.body as CreateReleaseRequestBody;

      // Validate request using extracted validation functions
      const validationResult = validateCreateReleaseRequest(body);
      if (!validationResult.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: validationResult.error
        });
      }

      // Parse validated dates
      const targetReleaseDate = body.targetReleaseDate ? new Date(body.targetReleaseDate) : undefined;
      const kickOffDate = body.kickOffDate ? new Date(body.kickOffDate) : undefined;
      const kickOffReminderDate = body.kickOffReminderDate ? new Date(body.kickOffReminderDate) : undefined;

      // STEP 3-8: Delegate to service
      const payload: CreateReleasePayload = {
        tenantId,
        accountId,
        platformTargets: body.platformTargets.map(pt => ({
          platform: pt.platform,
          target: pt.target,
          version: pt.version
        })),
        type: body.type as 'MAJOR' | 'MINOR' | 'HOTFIX',
        releaseConfigId: body.releaseConfigId,
        branch: body.branch,
        baseBranch: body.baseBranch,
        baseReleaseId: body.baseReleaseId,
        targetReleaseDate,
        kickOffReminderDate,
        kickOffDate,
        releasePilotAccountId: body.releasePilotAccountId,
        regressionBuildSlots: body.regressionBuildSlots,
        cronConfig: body.cronConfig,
        hasManualBuildUpload: body.hasManualBuildUpload
      };

      const result = await this.creationService.createRelease(payload);

      // ========================================================================
      // AUTO-START CRON JOB
      // ========================================================================
      // Automatically start the cron job to begin release workflow
      // This ensures releases start executing even if user forgets to call start endpoint
      let cronJobStarted = false;
      let updatedCronJob = result.cronJob;

      try {
        // Service handles both starting cron and updating DB status
        updatedCronJob = await this.cronJobService.startCronJob(result.release.id);
        cronJobStarted = true;
        console.log(`[Create Release] Auto-started cron job for release ${result.release.id}`);
      } catch (cronError: unknown) {
        // Don't fail release creation if cron start fails - log and continue
        const errorMessage = cronError instanceof Error ? cronError.message : String(cronError);
        console.error(`[Create Release] Failed to auto-start cron job for release ${result.release.id}:`, errorMessage);
        // Release is still created successfully, but cron job needs to be started manually
      }

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        release: {
          ...result.release,
          cronJob: {
            id: updatedCronJob.id,
            stage1Status: updatedCronJob.stage1Status,
            stage2Status: updatedCronJob.stage2Status,
            stage3Status: updatedCronJob.stage3Status,
            cronStatus: updatedCronJob.cronStatus
          },
          stage1Tasks: {
            count: result.stage1TaskIds.length,
            taskIds: result.stage1TaskIds
          },
          cronJobStarted // Indicate if auto-start was successful
        }
      });
    } catch (error: any) {
      console.error('[Create Release] Error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to create release',
        message: error.message || 'Unknown error'
      });
    }
  }

  /**
   * Get all releases for a tenant
   * Query params:
   * - includeTasks: 'true' to include task details (default: false for performance)
   */
  listReleases = async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = req.params.tenantId;
      const includeTasks = req.query.includeTasks === 'true';
      
      const releases = await this.retrievalService.getAllReleases(tenantId, includeTasks);
      
      const responseBody: ReleaseListResponseBody = {
        success: true,
        releases
      };
      
      return res.status(HTTP_STATUS.OK).json(responseBody);
    } catch (error: any) {
      console.error('[List Releases] Error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch releases',
        message: error.message || 'Unknown error'
      });
    }
  }

  /**
   * Get a specific release by ID
   */
  getRelease = async (req: Request, res: Response): Promise<Response> => {
    try {
      const releaseId = req.params.releaseId;
      
      const release = await this.retrievalService.getReleaseById(releaseId);
      
      if (!release) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Release not found'
        });
      }
      
      const responseBody: SingleReleaseResponseBody = {
        success: true,
        release
      };
      
      return res.status(HTTP_STATUS.OK).json(responseBody);
    } catch (error: any) {
      console.error('[Get Release] Error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch release',
        message: error.message || 'Unknown error'
      });
    }
  }

  /**
   * Update Release (PATCH)
   * Updates an existing release with business rule validations
   */
  updateRelease = async (req: Request, res: Response): Promise<Response> => {
    try {
      const releaseId = req.params.releaseId;
      const body = req.body as UpdateReleaseRequestBody;
      const accountId = (req as any).user?.id || 'system'; // Get from auth middleware

      if (!releaseId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Release ID is required'
        });
      }

      // Validate request body
      const validation = validateUpdateReleaseRequest(body);
      if (!validation.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: validation.error
        });
      }

      // Update the release
      await this.updateService.updateRelease({
        releaseId,
        accountId,
        updates: body
      });

      // Get the full release with all associations for response
      const fullRelease = await this.retrievalService.getReleaseById(releaseId);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Release updated successfully',
        release: fullRelease
      });

    } catch (error: any) {
      console.error('Error updating release:', error);
      
      // Handle specific business rule errors
      if (error.message.includes('Only IN_PROGRESS releases') || 
          error.message.includes('not found') ||
          error.message.includes('before kickoff')) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: error.message
        });
      }

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message || 'Error occured on server side'
      });
    }
  };

  /**
   * Get tasks for a release
   * Query params:
   * - stage: Optional stage filter (KICKOFF, REGRESSION, PRE_RELEASE)
   */
  getTasks = async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = req.params.tenantId;
      const releaseId = req.params.releaseId;
      const stage = req.query.stage as string | undefined;

      // Delegate to service
      const result = await this.retrievalService.getTasksForRelease(releaseId, tenantId, stage);

      if (result.success === false) {
        return res.status(result.statusCode).json({
          success: false,
          error: result.error
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        tasks: result.tasks,
        count: result.count
      });
    } catch (error: unknown) {
      console.error('[Get Tasks] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get tasks',
        message: errorMessage
      });
    }
  };

  /**
   * Get a specific task by ID
   */
  getTaskById = async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = req.params.tenantId;
      const releaseId = req.params.releaseId;
      const taskId = req.params.taskId;

      // Delegate to service
      const result = await this.retrievalService.getTaskById(taskId, releaseId, tenantId);

      if (result.success === false) {
        return res.status(result.statusCode).json({
          success: false,
          error: result.error
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        task: result.task
      });
    } catch (error: unknown) {
      console.error('[Get Task] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get task',
        message: errorMessage
      });
    }
  };

  /**
   * Trigger Stage 2 (Regression Testing)
   * POST /tenants/:tenantId/releases/:releaseId/trigger-regression-testing
   */
  triggerRegressionTesting = async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = req.params.tenantId;
      const releaseId = req.params.releaseId;

      // Delegate to service
      const result = await this.cronJobService.triggerStage2(releaseId, tenantId);

      if (result.success === false) {
        return res.status(result.statusCode).json({
          success: false,
          error: result.error
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Stage 2 (Regression Testing) triggered successfully',
        release: result.data
      });
    } catch (error: unknown) {
      console.error('[Trigger Regression Testing] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to trigger regression testing',
        message: errorMessage
      });
    }
  };

  /**
   * Trigger Stage 3 (Pre-Release)
   * POST /tenants/:tenantId/releases/:releaseId/trigger-pre-release
   */
  triggerPreRelease = async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = req.params.tenantId;
      const releaseId = req.params.releaseId;

      // Delegate to service
      const result = await this.cronJobService.triggerStage3(releaseId, tenantId);

      if (result.success === false) {
        return res.status(result.statusCode).json({
          success: false,
          error: result.error
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Stage 3 (Pre-Release) triggered successfully',
        release: result.data
      });
    } catch (error: unknown) {
      console.error('[Trigger Pre-Release] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to trigger pre-release',
        message: errorMessage
      });
    }
  };

  /**
   * Archive (cancel) a release
   * PUT /tenants/:tenantId/releases/:releaseId/archive
   */
  archiveRelease = async (req: Request, res: Response): Promise<Response> => {
    try {
      const releaseId = req.params.releaseId;
      const accountId = (req as any).account?.id || (req as any).user?.id;

      if (!accountId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Unauthorized: Account ID not found'
        });
      }

      // Delegate to service
      const result = await this.cronJobService.archiveRelease(releaseId, accountId);

      if (result.success === false) {
        return res.status(result.statusCode).json({
          success: false,
          error: result.error
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.data.alreadyArchived ? 'Release already archived' : 'Release archived successfully',
        data: result.data
      });
    } catch (error: unknown) {
      console.error('[Archive Release] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to archive release',
        message: errorMessage
      });
    }
  };

  /**
   * Check project management run status
   * Query params:
   * - platform: Optional platform (WEB, IOS, ANDROID) - if not provided, returns all platforms
   */
  checkProjectManagementRunStatus = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { releaseId } = req.params;
      const platform = req.query.platform as Platform | undefined;

      // Delegate to service (platform is now optional)
      const result = await this.statusService.getProjectManagementStatus(releaseId, platform);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      });
    } catch (error: any) {
      console.error('[Check Project Management Run Status] Error:', error);
      
      // Determine status code based on error message
      let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      if (error.message?.includes('not found')) {
        statusCode = HTTP_STATUS.NOT_FOUND;
      } else if (error.message?.includes('does not have')) {
        statusCode = HTTP_STATUS.BAD_REQUEST;
      }

      return res.status(statusCode).json({
        success: false,
        error: error.message ?? 'Failed to check project management run status'
      });
    }
  }

  /**
   * Check test management run status
   * Query params:
   * - platform: Optional platform (WEB, IOS, ANDROID) - if not provided, returns all platforms
   */
  checkTestManagementRunStatus = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { releaseId } = req.params;
      const platform = req.query.platform as Platform | undefined;

      // Delegate to service (platform is now optional)
      const result = await this.statusService.getTestManagementStatus(releaseId, platform);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      });
    } catch (error: any) {
      console.error('[Check Test Management Run Status] Error:', error);
      
      // Determine status code based on error message
      let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      if (error.message?.includes('not found')) {
        statusCode = HTTP_STATUS.NOT_FOUND;
      } else if (error.message?.includes('does not have')) {
        statusCode = HTTP_STATUS.BAD_REQUEST;
      }

      return res.status(statusCode).json({
        success: false,
        error: error.message ?? 'Failed to check test management run status'
      });
    }
  }

  /**
   * Retry a failed task
   * 
   * POST /tenants/:tenantId/releases/:releaseId/tasks/:taskId/retry
   * 
   * Resets the task status to PENDING so the cron job can pick it up
   * and re-execute it. For build tasks, also resets failed build entries.
   * 
   * LAZY approach: Cron picks up and executes on next tick.
   */
  retryTask = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { releaseId, taskId } = req.params;
      const accountId = (req as any).account?.id ?? (req as any).user?.id;

      if (!accountId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Unauthorized: Account ID not found'
        });
      }

      if (!taskId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Task ID is required'
        });
      }

      // Delegate to service
      const result = await this.updateService.retryTask(taskId, accountId);

      if (!result.success) {
        // Determine status code based on error
        const isNotFound = result.error?.includes('not found');
        const statusCode = isNotFound ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
        
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Task retry initiated. Cron will re-execute on next tick.',
        data: {
          taskId: result.taskId,
          releaseId,
          previousStatus: result.previousStatus,
          newStatus: result.newStatus
        }
      });
    } catch (error: unknown) {
      console.error('[Retry Task] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to retry task',
        message: errorMessage
      });
    }
  };

  /**
   * Upload Manual Build
   * 
   * Handles manual build upload for a specific platform.
   * Used when hasManualBuildUpload = true.
   * 
   * Flow:
   * 1. Validate request (releaseId, taskId, platform, artifactPath)
   * 2. Create build entry with UPLOADED status
   * 3. Check if all platforms are uploaded
   * 4. If all uploaded → complete task and resume release
   */
  /**
   * Upload manual build - Stage 1, 2, or 3
   * 
   * Uses release_uploads staging table approach:
   * - Validates upload is allowed (hasManualBuildUpload, platform, window)
   * - Uploads to S3
   * - Creates entry in release_uploads table
   * - Returns status (all platforms ready or not)
   * 
   * Task consumption happens separately when TaskExecutor runs.
   * 
   * TODO: Wire up ManualUploadService with actual dependencies
   * Reference: docs/MANUAL_BUILD_UPLOAD_FLOW.md
   */
  uploadManualBuild = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { releaseId, stage, platform } = req.params;
      const accountId = (req as any).account?.id ?? (req as any).user?.id;

      if (!accountId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Unauthorized: Account ID not found'
        });
      }

      // Validate required parameters
      if (!releaseId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Release ID is required'
        });
      }

      if (!stage) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Stage is required (KICK_OFF, REGRESSION, PRE_RELEASE)'
        });
      }

      if (!platform) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Platform is required'
        });
      }

      // Validate stage is valid
      const validStages = ['KICK_OFF', 'REGRESSION', 'PRE_RELEASE'];
      const upperStage = stage.toUpperCase();
      if (!validStages.includes(upperStage)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: `Invalid buildStage: ${stage}. Must be one of: ${validStages.join(', ')}`
        });
      }

      // Validate platform is valid
      const validPlatforms = [PlatformName.ANDROID, PlatformName.IOS, PlatformName.WEB];
      const upperPlatform = platform.toUpperCase() as PlatformName;
      const platformIsInvalid = !validPlatforms.includes(upperPlatform);
      if (platformIsInvalid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: `Invalid platform: ${platform}. Must be one of: ${validPlatforms.join(', ')}`
        });
      }

      // Check if ManualUploadService is available
      const serviceNotAvailable = !this.manualUploadService;
      if (serviceNotAvailable) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: RELEASE_MANAGEMENT_ERROR_MESSAGES.MANUAL_UPLOAD_SERVICE_NOT_CONFIGURED
        });
      }

      // Check if file is provided (from multer middleware)
      const file = (req as any).file;
      const fileNotProvided = !file?.buffer;
      if (fileNotProvided) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: RELEASE_MANAGEMENT_ERROR_MESSAGES.FILE_REQUIRED
        });
      }

      // Extract original filename from multer and validate extension
      const originalFilename = file.originalname as string | undefined;
      const filenameNotProvided = !originalFilename;
      if (filenameNotProvided) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: RELEASE_MANAGEMENT_ERROR_MESSAGES.FILE_REQUIRED
        });
      }

      // Validate file extension (.ipa, .apk, .aab only)
      const hasValidExtension = isValidArtifactExtension(originalFilename);
      if (!hasValidExtension) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: RELEASE_MANAGEMENT_ERROR_MESSAGES.INVALID_FILE_EXTENSION
        });
      }

      // Map stage string to UploadStage type
      const uploadStage = upperStage as UploadStage;

      // Delegate to ManualUploadService
      const result = await this.manualUploadService.handleUpload(
        releaseId,
        uploadStage,
        upperPlatform,
        file.buffer,
        originalFilename
      );

      if (!result.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: result.error
        });
      }

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          uploadId: result.uploadId,
          platform: result.platform,
          stage: result.stage,
          artifactPath: result.artifactPath,
          downloadUrl: result.downloadUrl,
          uploadedPlatforms: result.uploadedPlatforms,
          missingPlatforms: result.missingPlatforms,
          allPlatformsReady: result.allPlatformsReady
        }
      });
    } catch (error: unknown) {
      console.error('[Upload Manual Build] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: RELEASE_MANAGEMENT_ERROR_MESSAGES.FAILED_TO_UPLOAD_BUILD,
        message: errorMessage
      });
    }
  };
}
