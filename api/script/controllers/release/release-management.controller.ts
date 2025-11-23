/**
 * Release Management Controller
 * 
 * Handles HTTP requests for Release Management.
 * Focuses on validation and delegates to ReleaseCreationService.
 */

import { Request, Response } from 'express';
import { ReleaseCreationService, CreateReleasePayload } from '../../services/release/release-creation.service';
import { ReleaseRetrievalService } from '../../services/release/release-retrieval.service';
import { ReleaseType } from '../../storage/release/release-models';

export class ReleaseManagementController {
  private creationService: ReleaseCreationService;
  private retrievalService: ReleaseRetrievalService;

  constructor(
    creationService: ReleaseCreationService,
    retrievalService: ReleaseRetrievalService
  ) {
    this.creationService = creationService;
    this.retrievalService = retrievalService;
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
      const body = req.body;

      // STEP 1: Mandatory field validation
      const mandatoryFields = [
        'targetReleaseDate',
        'plannedDate',
        'platformVersions',
        'targets',
        'type',
        'baseBranch'
      ];

      const missingFields = mandatoryFields.filter(field => !body[field]);
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      // STEP 2: Optional field validation
      
      // Validate platformVersions format (object with platform -> version mapping)
      if (typeof body.platformVersions !== 'object' || Object.keys(body.platformVersions).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'platformVersions must be a non-empty object mapping platforms to versions'
        });
      }

      // Validate each version format (semver-like)
      for (const [platform, version] of Object.entries(body.platformVersions)) {
        if (typeof version !== 'string' || !/^v?\d+\.\d+\.\d+/.test(version as string)) {
          return res.status(400).json({
            success: false,
            error: `Invalid version format for platform ${platform}. Expected format: vX.Y.Z (e.g., v1.0.0)`
          });
        }
      }

      // Validate targets
      if (!Array.isArray(body.targets) || body.targets.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'targets must be a non-empty array'
        });
      }

      // Validate dates
      const targetReleaseDate = new Date(body.targetReleaseDate);
      const plannedDate = new Date(body.plannedDate);

      if (isNaN(targetReleaseDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid targetReleaseDate format'
        });
      }

      if (isNaN(plannedDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plannedDate format'
        });
      }

      // Validate type
      const validTypes = ['PLANNED', 'HOTFIX', 'MAJOR'];
      if (!validTypes.includes(body.type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
        });
      }

      // Validate platform names in platformVersions
      const validPlatforms = ['IOS', 'ANDROID', 'WEB'];
      for (const platform of Object.keys(body.platformVersions)) {
        if (!validPlatforms.includes(platform)) {
          return res.status(400).json({
            success: false,
            error: `Invalid platform: ${platform}. Must be one of: ${validPlatforms.join(', ')}`
          });
        }
      }

      // Validate target names
      const validTargets = ['WEB', 'PLAY_STORE', 'APP_STORE'];
      for (const target of body.targets) {
        if (!validTargets.includes(target)) {
          return res.status(400).json({
            success: false,
            error: `Invalid target: ${target}. Must be one of: ${validTargets.join(', ')}`
          });
        }
      }

      // Validate regressionBuildSlots if provided
      if (body.regressionBuildSlots) {
        if (!Array.isArray(body.regressionBuildSlots)) {
          return res.status(400).json({
            success: false,
            error: 'regressionBuildSlots must be an array'
          });
        }
        for (const slot of body.regressionBuildSlots) {
          if (!slot.date || isNaN(new Date(slot.date).getTime())) {
            return res.status(400).json({
              success: false,
              error: 'Each regressionBuildSlots entry must have a valid date'
            });
          }
        }
      }

      // Validate preCreatedBuilds if provided
      if (body.preCreatedBuilds) {
        if (!Array.isArray(body.preCreatedBuilds)) {
          return res.status(400).json({
            success: false,
            error: 'preCreatedBuilds must be an array'
          });
        }
        for (const build of body.preCreatedBuilds) {
          if (!build.platform || !build.target || !build.buildNumber || !build.buildUrl) {
            return res.status(400).json({
              success: false,
              error: 'Each preCreatedBuilds entry must have platform, target, buildNumber, and buildUrl'
            });
          }
        }
      }

      // STEP 3-8: Delegate to service
      const payload: CreateReleasePayload = {
        tenantId,
        accountId,
        platformVersions: body.platformVersions,
        targets: body.targets,
        type: body.type as ReleaseType,
        targetReleaseDate,
        plannedDate,
        baseBranch: body.baseBranch,
        baseVersion: body.baseVersion,
        parentId: body.parentId,
        releasePilotAccountId: body.releasePilotAccountId,
        kickOffReminderDate: body.kickOffReminderDate ? new Date(body.kickOffReminderDate) : undefined,
        customIntegrationConfigs: body.customIntegrationConfigs,
        regressionBuildSlots: body.regressionBuildSlots,
        preCreatedBuilds: body.preCreatedBuilds,
        cronConfig: body.cronConfig,
        regressionTimings: body.regressionTimings
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
      
      return res.status(200).json({
        success: true,
        releases
      });
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
      
      return res.status(200).json({
        success: true,
        release
      });
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
}
