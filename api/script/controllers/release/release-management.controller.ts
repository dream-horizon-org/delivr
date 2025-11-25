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
import { ReleaseType } from '../../storage/release/release-models';
import type { 
  CreateReleaseRequestBody,
  CreateReleasePayload,
  ReleaseListResponseBody, 
  SingleReleaseResponseBody 
} from '~types/release';
import { validateCreateReleaseRequest } from './release-validation';
import type { Platform } from '~types/integrations/project-management';

export class ReleaseManagementController {
  private creationService: ReleaseCreationService;
  private retrievalService: ReleaseRetrievalService;
  private statusService: ReleaseStatusService;

  constructor(
    creationService: ReleaseCreationService,
    retrievalService: ReleaseRetrievalService,
    statusService: ReleaseStatusService
  ) {
    this.creationService = creationService;
    this.retrievalService = retrievalService;
    this.statusService = statusService;
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
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const accountId = req.user.id;
      const body = req.body as CreateReleaseRequestBody;

      // Validate request using extracted validation functions
      const validationResult = validateCreateReleaseRequest(body);
      if (!validationResult.isValid) {
        return res.status(400).json({
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
        type: body.type as 'PLANNED' | 'HOTFIX' | 'UNPLANNED',
        releaseConfigId: body.releaseConfigId,
        branch: body.branch,
        baseBranch: body.baseBranch,
        baseReleaseId: body.baseReleaseId,
        targetReleaseDate,
        kickOffReminderDate,
        kickOffDate,
        customIntegrationConfigs: body.customIntegrationConfigs,
        regressionBuildSlots: body.regressionBuildSlots,
        preCreatedBuilds: body.preCreatedBuilds,
        cronConfig: body.cronConfig,
        regressionTimings: body.regressionTimings,
        hasManualBuildUpload: body.hasManualBuildUpload
      };

      const result = await this.creationService.createRelease(payload);

      return res.status(201).json({
        success: true,
        release: {
          ...result.release,
          cronJob: {
            id: result.cronJob.id,
            stage1Status: result.cronJob.stage1Status,
            stage2Status: result.cronJob.stage2Status,
            stage3Status: result.cronJob.stage3Status,
            cronStatus: result.cronJob.cronStatus
          },
          stage1Tasks: {
            count: result.stage1TaskIds.length,
            taskIds: result.stage1TaskIds
          }
        }
      });
    } catch (error: any) {
      console.error('[Create Release] Error:', error);
      return res.status(500).json({
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
      
      return res.status(200).json(responseBody);
    } catch (error: any) {
      console.error('[List Releases] Error:', error);
      return res.status(500).json({
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
        return res.status(404).json({
          success: false,
          error: 'Release not found'
        });
      }
      
      const responseBody: SingleReleaseResponseBody = {
        success: true,
        release
      };
      
      return res.status(200).json(responseBody);
    } catch (error: any) {
      console.error('[Get Release] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch release',
        message: error.message || 'Unknown error'
      });
    }
  }

  /**
   * Trigger Pre-Release (Stage 3)
   * TODO: Implement Stage 3 triggering logic
   */
  triggerPreRelease = async (req: Request, res: Response): Promise<Response> => {
    return res.status(501).json({
      success: false,
      error: 'Not implemented yet',
      message: 'Stage 3 trigger endpoint coming soon'
    });
  }

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

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error: any) {
      console.error('[Check Project Management Run Status] Error:', error);
      
      // Determine status code based on error message
      let statusCode = 500;
      if (error.message?.includes('not found')) {
        statusCode = 404;
      } else if (error.message?.includes('does not have')) {
        statusCode = 400;
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

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error: any) {
      console.error('[Check Test Management Run Status] Error:', error);
      
      // Determine status code based on error message
      let statusCode = 500;
      if (error.message?.includes('not found')) {
        statusCode = 404;
      } else if (error.message?.includes('does not have')) {
        statusCode = 400;
      }

      return res.status(statusCode).json({
        success: false,
        error: error.message ?? 'Failed to check test management run status'
      });
    }
  }
}
