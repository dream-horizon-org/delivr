/**
 * Release Management Routes
 * 
 * Handles all release-related API endpoints:
 * - Create Release
 * - Get Release
 * - Update Release
 * - Delete Release
 * - Task Management
 * - Build Management
 * - Cron Job Management
 * - State History
 */

import { Request, Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { Sequelize } from "sequelize";
import * as storageTypes from "../../storage/storage";
import * as tenantPermissions from "../../middleware/tenant-permissions";
import { ReleaseType, StageStatus, CronStatus } from "../../storage/release/release-models";
import { hasSequelize, StorageWithSequelize, RegressionBuildSlot } from "./release-types";
import { startCronJob } from "../../services/cron-scheduler";
import { executeKickoffCronJob } from "./kickoff-cron-job";

export interface ReleaseManagementConfig {
  storage: storageTypes.Storage;
}

/**
 * Creates and configures the Release Management router
 */
export function getReleaseManagementRouter(config: ReleaseManagementConfig): Router {
  const storage: storageTypes.Storage = config.storage;
  const router: Router = Router();

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================
  router.get("/health", (req: Request, res: Response): Response => {
    return res.status(200).json({
      service: "Release Management",
      status: "healthy",
      timestamp: new Date().toISOString()
    });
  });

  // ============================================================================
  // RELEASE CRUD OPERATIONS
  // ============================================================================

  // Create a new release
  router.post(
    "/tenants/:tenantId/releases",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      const tenantId: string = req.params.tenantId;
      
      // Get accountId from authenticated user
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: User not authenticated'
        });
      }
      const accountId: string = req.user.id;
      const body = req.body;

      try {
        // ========================================================================
        // VALIDATION: 7 Mandatory Parameters (per IMPLEMENTATION_BLUEPRINT.md)
        // ========================================================================
        // 1. targetReleaseDate - Release DateTime
        // 2. plannedDate - Branch Fork off DateTime
        // 3. regressionBuildSlots OR preCreatedBuilds - Regression Build Management
        // 4. version - Release Version
                                          // 5. type - Release Type (HOTFIX, PLANNED, MAJOR)
        // 6. baseBranch - Base branch
        // 7. platforms - Platforms array (IOS, ANDROID, WEB) - MANDATORY
        const mandatoryFields = [
          'targetReleaseDate',  // 1. Release DateTime
          'plannedDate',         // 2. Branch Fork off DateTime
          'version',             // 4. Release Version
          'type',                // 5. Release Type
          'baseBranch',          // 6. Base branch
          'platforms'            // 7. Platforms array (IOS, ANDROID, WEB)
        ];

        const missingFields = mandatoryFields.filter(field => !body[field]);
        if (missingFields.length > 0) {
          return res.status(400).json({
            success: false,
            error: `Missing required fields: ${missingFields.join(', ')}`
          });
        }

        // Validate version format (semver-like)
        if (!/^\d+\.\d+\.\d+/.test(body.version)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid version format. Expected format: X.Y.Z (e.g., 1.0.0)'
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

        // Validate platforms (MANDATORY - 7th parameter)
        // Platforms: IOS, ANDROID, WEB (per user clarification)
        const validPlatforms = ['IOS', 'ANDROID', 'WEB'];
        if (!body.platforms) {
          return res.status(400).json({
            success: false,
            error: 'platforms is required (array of platform names: IOS, ANDROID, WEB)'
          });
        }
        if (!Array.isArray(body.platforms) || body.platforms.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'platforms must be a non-empty array'
          });
        }
        for (const platform of body.platforms) {
          if (!validPlatforms.includes(platform)) {
            return res.status(400).json({
              success: false,
              error: `Invalid platform: ${platform}. Must be one of: ${validPlatforms.join(', ')}`
            });
          }
        }

        // Validate platforms in preCreatedBuilds if provided (must match platforms array)
        if (body.preCreatedBuilds) {
          for (const build of body.preCreatedBuilds) {
            if (build.platform && !validPlatforms.includes(build.platform)) {
              return res.status(400).json({
                success: false,
                error: `Invalid platform in preCreatedBuilds: ${build.platform}. Must be one of: ${validPlatforms.join(', ')}`
              });
            }
          }
        }

        // Validate regressionBuildSlots OR preCreatedBuilds (mutually exclusive)
        if (body.regressionBuildSlots && body.preCreatedBuilds) {
          return res.status(400).json({
            success: false,
            error: 'Cannot provide both regressionBuildSlots and preCreatedBuilds. Provide one or the other.'
          });
        }

        // Validate regressionBuildSlots format if provided
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

        // Validate preCreatedBuilds format if provided
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

        // ========================================================================
        // BASE BRANCH RESOLUTION (for HOTFIX type)
        // ========================================================================
        let baseBranch = body.baseBranch;
        const baseVersion = body.baseVersion || body.version;
        let parentId: string | undefined;

        if (body.type === 'HOTFIX' && body.baseVersion) {
          // For HOTFIX, fetch base release to get its branchRelease
          const { ReleaseDTO } = await import('../../storage/release/release-dto');
          const releaseDTO = new ReleaseDTO();
          const baseRelease = await releaseDTO.getBaseRelease(body.baseVersion, tenantId);
          
          if (baseRelease) {
            baseBranch = baseRelease.branchRelease || body.baseBranch;
            parentId = baseRelease.id;
          }
        }

        // ========================================================================
        // CREATE RELEASE
        // ========================================================================
        const { ReleaseDTO } = await import('../../storage/release/release-dto');
        const releaseDTO = new ReleaseDTO();

        // Prepare regressionBuildSlots (convert dates to Date objects)
        const regressionBuildSlots: RegressionBuildSlot[] | undefined = body.regressionBuildSlots
          ? body.regressionBuildSlots.map((slot: { date: string; config?: Record<string, unknown> }) => ({
              date: new Date(slot.date),
              config: slot.config || {}
            }))
          : undefined;

        // Note: releasePilotAccountId is optional (not in 6 mandatory params per blueprint)
        // releasePilotAccountId: The person responsible for managing the release (per IMPLEMENTATION_BLUEPRINT.md line 2609)
        // If not provided, defaults to accountId (the creator)
        const releasePilotAccountId = body.releasePilotAccountId || accountId;

        // Convert type string to ReleaseType enum
        const releaseType = body.type as ReleaseType;

        const release = await releaseDTO.create({
          tenantId,
          accountId,
          version: body.version,
          type: releaseType,
          targetReleaseDate,
          plannedDate,
          baseBranch,
          releasePilotAccountId,
          baseVersion,
          parentId,
          customIntegrationConfigs: body.customIntegrationConfigs || null,
          regressionBuildSlots,
          preCreatedBuilds: body.preCreatedBuilds || undefined,
          kickOffReminderDate: body.kickOffReminderDate ? new Date(body.kickOffReminderDate) : undefined
        });

        // ========================================================================
        // LINK PLATFORMS TO RELEASE (via platform_releases junction table)
        // ========================================================================
        // Pattern: Same as Delivr - find or create Platform records, then link via junction table
        if (!hasSequelize(storage)) {
          return res.status(500).json({
            success: false,
            error: 'Storage does not have Sequelize instance'
          });
        }
        const storageSequelize: StorageWithSequelize = storage;
        const PlatformModel = storageSequelize.sequelize.models.platform;
        const ReleaseModel = storageSequelize.sequelize.models.release;

        if (PlatformModel && ReleaseModel) {
          // Find or create Platform records by name
          const platformRecords = [];
          for (const platformName of body.platforms) {
            const [platform, created] = await PlatformModel.findOrCreate({
              where: { name: platformName },
              defaults: {
                id: uuidv4(),
                name: platformName,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            platformRecords.push(platform);
          }

          // Link platforms to release via belongsToMany association
          // This will automatically create entries in platform_releases junction table
          const releaseInstance = await ReleaseModel.findByPk(release.id);
          if (releaseInstance) {
            // Type assertion for Sequelize model with setPlatforms method
            const releaseModelWithPlatforms = releaseInstance as unknown as {
              setPlatforms: (platforms: unknown[]) => Promise<unknown>;
            };
            if (typeof releaseModelWithPlatforms.setPlatforms === 'function') {
              await releaseModelWithPlatforms.setPlatforms(platformRecords);
            }
          }
        }

        // ========================================================================
        // CREATE CRON JOB
        // ========================================================================
        const { CronJobDTO } = await import('../../storage/release/cron-job-dto');
        const cronJobDTO = new CronJobDTO();

        // Prepare upcomingRegressions from regressionBuildSlots (for cron job)
        const upcomingRegressions = regressionBuildSlots || undefined;

        // Default cron config
        const cronConfig = body.cronConfig || {
          kickOffReminder: true,
          preRegressionBuilds: false,
          automationBuilds: false,
          automationRuns: false
        };

        const cronJob = await cronJobDTO.create({
          releaseId: release.id,
          accountId,
          cronConfig,
          upcomingRegressions,
          regressionTimings: body.regressionTimings || '09:00,17:00'
        });

        // ========================================================================
        // CREATE STAGE 1 TASKS
        // ========================================================================
        const { ReleaseTasksDTO } = await import('../../storage/release/release-tasks-dto');
        const releaseTasksDTO = new ReleaseTasksDTO();
        const { createStage1Tasks } = await import('../../utils/task-creation');

        // Create Stage 1 tasks based on cron config
        // Note: Integration availability checks will be added in later chunks
        // For now, assume integrations are available if needed
        const stage1TaskIds = await createStage1Tasks(releaseTasksDTO, {
          releaseId: release.id,
          accountId,
          cronConfig: cronConfig,
          hasJiraIntegration: true, // TODO: Check actual integration availability
          hasTestPlatformIntegration: true // TODO: Check actual integration availability
        });

        // ========================================================================
        // CREATE STATE HISTORY
        // ========================================================================
        // Simple state history creation for release creation
        // TODO: Create proper StateHistoryDTO in later chunk
        const StateHistoryModel = storageSequelize.sequelize.models.stateHistory;
        const StateHistoryItemModel = storageSequelize.sequelize.models.stateHistoryItem;

        if (StateHistoryModel && StateHistoryItemModel) {
          const historyId = uuidv4();
          
          await StateHistoryModel.create({
            id: historyId,
            action: 'CREATE',
            accountId,
            releaseId: release.id,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          // Create history item for release creation
          await StateHistoryItemModel.create({
            id: uuidv4(),
            historyId,
            group: 'creation',
            type: 'CREATE',
            key: 'version',
            value: JSON.stringify(body.version),
            oldValue: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        // ========================================================================
        // AUTO-START CRON JOB
        // ========================================================================
        // Automatically start the cron job to begin release workflow
        // This ensures releases start executing even if user forgets to call start endpoint
        // Note: For a new release with a new UUID, the cron job should never already be running
        try {
          const started = startCronJob(release.id, async () => {
            await executeKickoffCronJob(release.id, storage);
          });

          if (!started) {
            // This should never happen for a new release, but log if it does (defensive programming)
            console.error(`[Create Release] Unexpected: Cron job already running for new release ${release.id}. This indicates a bug or race condition.`);
            // Continue anyway - release is created, but cron job state is unexpected
          } else {
            // Update cron job status to IN_PROGRESS to indicate Stage 1 has started
            await cronJobDTO.update(cronJob.id, {
              stage1Status: StageStatus.IN_PROGRESS,
              cronStatus: CronStatus.RUNNING
            });
            console.log(`[Create Release] Auto-started cron job for release ${release.id}`);
          }
        } catch (cronError: unknown) {
          // Don't fail release creation if cron start fails - log and continue
          const errorMessage = cronError instanceof Error ? cronError.message : String(cronError);
          console.error(`[Create Release] Failed to auto-start cron job for release ${release.id}:`, errorMessage);
          // Release is still created successfully, but cron job needs to be started manually
        }

        // ========================================================================
        // RESPONSE
        // ========================================================================
        return res.status(201).json({
          success: true,
          release: {
            ...release,
            cronJob: {
              id: cronJob.id,
              stage1Status: cronJob.stage1Status,
              stage2Status: cronJob.stage2Status,
              stage3Status: cronJob.stage3Status,
              cronStatus: cronJob.cronStatus
            },
            stage1Tasks: {
              count: stage1TaskIds.length,
              taskIds: stage1TaskIds
            }
          }
        });
      } catch (error: unknown) {
        console.error('[Create Release] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({
          success: false,
          error: 'Failed to create release',
          message: errorMessage
        });
      }
    }
  );

  // Get a specific release
  router.get(
    "/tenants/:tenantId/releases/:releaseId",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement release details
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Release details endpoint coming soon"
      });
    }
  );

  // Get all releases for a tenant
  router.get(
    "/tenants/:tenantId/releases",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement release listing
      // - Filter by status (KICKOFF_PENDING, STARTED, RELEASED, etc.)
      // - Pagination
      // - Sort by date
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Release listing endpoint coming soon"
      });
    }
  );

  // Update a release
  router.patch(
    "/tenants/:tenantId/releases/:releaseId",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement release update
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Release update endpoint coming soon"
      });
    }
  );

  // Delete a release
  router.delete(
    "/tenants/:tenantId/releases/:releaseId",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement release deletion (soft delete)
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Release deletion endpoint coming soon"
      });
    }
  );

  // ============================================================================
  // TASK MANAGEMENT
  // ============================================================================
  
  // Get tasks for a release
  router.get(
    "/tenants/:tenantId/releases/:releaseId/tasks",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      const tenantId: string = req.params.tenantId;
      const releaseId: string = req.params.releaseId;
      const stage: string | undefined = req.query.stage as string | undefined;

      try {
        // Verify release belongs to tenant
        const { ReleaseDTO } = await import('../../storage/release/release-dto');
        const releaseDTO = new ReleaseDTO();
        const release = await releaseDTO.get(releaseId);

        if (!release) {
          return res.status(404).json({
            success: false,
            error: 'Release not found'
          });
        }

        if (release.tenantId !== tenantId) {
          return res.status(403).json({
            success: false,
            error: 'Release does not belong to this tenant'
          });
        }

        // Get tasks
        const { ReleaseTasksDTO } = await import('../../storage/release/release-tasks-dto');
        const releaseTasksDTO = new ReleaseTasksDTO();
        const releaseModels = await import('../../storage/release/release-models');
        const { TaskStage } = releaseModels;

        let tasks;
        if (stage) {
          // Validate stage
          const validStages = Object.values(TaskStage);
          if (!validStages.includes(stage as typeof TaskStage[keyof typeof TaskStage])) {
            return res.status(400).json({
              success: false,
              error: `Invalid stage. Must be one of: ${validStages.join(', ')}`
            });
          }
          tasks = await releaseTasksDTO.getByReleaseAndStage(releaseId, stage as typeof TaskStage[keyof typeof TaskStage]);
        } else {
          tasks = await releaseTasksDTO.getByRelease(releaseId);
        }

        return res.status(200).json({
          success: true,
          tasks,
          count: tasks.length
        });
      } catch (error: unknown) {
        console.error('[Get Tasks] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({
          success: false,
          error: 'Failed to get tasks',
          message: errorMessage
        });
      }
    }
  );

  // Get a specific task
  router.get(
    "/tenants/:tenantId/releases/:releaseId/tasks/:taskId",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      const tenantId: string = req.params.tenantId;
      const releaseId: string = req.params.releaseId;
      const taskId: string = req.params.taskId;

      try {
        // Verify release belongs to tenant
        const { ReleaseDTO } = await import('../../storage/release/release-dto');
        const releaseDTO = new ReleaseDTO();
        const release = await releaseDTO.get(releaseId);

        if (!release) {
          return res.status(404).json({
            success: false,
            error: 'Release not found'
          });
        }

        if (release.tenantId !== tenantId) {
          return res.status(403).json({
            success: false,
            error: 'Release does not belong to this tenant'
          });
        }

        // Get task
        const { ReleaseTasksDTO } = await import('../../storage/release/release-tasks-dto');
        const releaseTasksDTO = new ReleaseTasksDTO();
        const task = await releaseTasksDTO.get(taskId);

        if (!task) {
          return res.status(404).json({
            success: false,
            error: 'Task not found'
          });
        }

        // Verify task belongs to release
        if (task.releaseId !== releaseId) {
          return res.status(403).json({
            success: false,
            error: 'Task does not belong to this release'
          });
        }

        return res.status(200).json({
          success: true,
          task
        });
      } catch (error: unknown) {
        console.error('[Get Task] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({
          success: false,
          error: 'Failed to get task',
          message: errorMessage
        });
      }
    }
  );

  // Update task status
  router.put(
    "/tenants/:tenantId/releases/:releaseId/tasks/:taskId",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement task status update
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Task status update endpoint coming soon"
      });
    }
  );

  // ============================================================================
  // CRON JOB MANAGEMENT
  // ============================================================================
  
  // Start cron job
  router.post(
    "/tenants/:tenantId/releases/:releaseId/cron/start",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement cron job start
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Cron job start endpoint coming soon"
      });
    }
  );

  // Pause cron job
  router.post(
    "/tenants/:tenantId/releases/:releaseId/cron/pause",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement cron job pause
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Cron job pause endpoint coming soon"
      });
    }
  );

  // Resume cron job
  router.post(
    "/tenants/:tenantId/releases/:releaseId/cron/resume",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement cron job resume
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Cron job resume endpoint coming soon"
      });
    }
  );

  // ============================================================================
  // STATE HISTORY
  // ============================================================================
  
  // Get release timeline
  router.get(
    "/tenants/:tenantId/releases/:releaseId/timeline",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement timeline retrieval
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Timeline endpoint coming soon"
      });
    }
  );

  // ============================================================================
  // STAGE 3 TRIGGER
  // ============================================================================
  
  // Trigger Pre-Release (Stage 3)
  router.post(
    "/tenants/:tenantId/releases/:releaseId/trigger-pre-release",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      const tenantId: string = req.params.tenantId;
      const releaseId: string = req.params.releaseId;

      // Get accountId from authenticated user
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: User not authenticated'
        });
      }
      const accountId: string = req.user.id;

      try {
        const { CronJobDTO } = await import('../../storage/release/cron-job-dto');
        const { ReleaseDTO } = await import('../../storage/release/release-dto');
        const { StageStatus } = await import('../../storage/release/release-models');
        const { startCronJob } = await import('../../services/cron-scheduler');
        const { executePostRegressionCronJob } = await import('./post-regression-cron-job');

        const releaseDTO = new ReleaseDTO();
        const cronJobDTO = new CronJobDTO();

        // Verify release exists and belongs to tenant
        const release = await releaseDTO.get(releaseId);
        if (!release) {
          return res.status(404).json({
            success: false,
            error: `Release not found: ${releaseId}`
          });
        }

        if (release.tenantId !== tenantId) {
          return res.status(403).json({
            success: false,
            error: 'Release does not belong to this tenant'
          });
        }

        // Get cron job
        const cronJob = await cronJobDTO.getByReleaseId(releaseId);
        if (!cronJob) {
          return res.status(404).json({
            success: false,
            error: `Cron job not found for release: ${releaseId}`
          });
        }

        // Check if Stage 2 is COMPLETED
        if (cronJob.stage2Status !== StageStatus.COMPLETED) {
          return res.status(400).json({
            success: false,
            error: `Stage 2 must be COMPLETED before triggering Stage 3. Current status: ${cronJob.stage2Status}`
          });
        }

        // Check if Stage 3 is already in progress or completed
        if (cronJob.stage3Status === StageStatus.IN_PROGRESS) {
          return res.status(400).json({
            success: false,
            error: 'Stage 3 is already in progress'
          });
        }

        if (cronJob.stage3Status === StageStatus.COMPLETED) {
          return res.status(400).json({
            success: false,
            error: 'Stage 3 is already completed'
          });
        }

        // Set autoTransitionToStage3 = true and start Stage 3
        await cronJobDTO.update(cronJob.id, {
          autoTransitionToStage3: true,
          stage3Status: StageStatus.IN_PROGRESS
        });

        // Start the post-regression cron job for Stage 3
        startCronJob(releaseId, async () => {
          await executePostRegressionCronJob(releaseId, storage);
        });

        // Get updated cron job
        const updatedCronJob = await cronJobDTO.getByReleaseId(releaseId);

        return res.status(200).json({
          success: true,
          message: 'Stage 3 triggered successfully',
          release: {
            id: releaseId,
            stage3Status: updatedCronJob?.stage3Status
          }
        });

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Trigger Pre-Release] Error for release ${releaseId}:`, errorMessage);
        return res.status(500).json({
          success: false,
          error: 'Failed to trigger Stage 3',
          message: errorMessage
        });
      }
    }
  );

  // ============================================================================
  // MANUAL APIS AFTER STAGE 3
  // ============================================================================
  
  // Store What's New
  router.post(
    "/tenants/:tenantId/releases/:releaseId/whats-new",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement What's New storage
      return res.status(501).json({
        error: "Not implemented yet",
        message: "What's New endpoint coming soon"
      });
    }
  );

  // Check Cherry Pick Status
  router.get(
    "/tenants/:tenantId/releases/:releaseId/check-cherry-pick-status",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<Response> => {
      // TODO: Implement cherry pick status check
      return res.status(501).json({
        error: "Not implemented yet",
        message: "Cherry pick status endpoint coming soon"
      });
    }
  );

  return router;
}

