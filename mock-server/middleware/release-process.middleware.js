/**
 * Mock Server Middleware - Release Process Module
 * 
 * Custom middleware for simulating release process scenarios matching backend contract:
 * - Stage APIs: GET /tasks?stage={stage}
 * - Task retry logic
 * - Build upload handling
 * - Status check responses
 * - Approval workflows
 * - Activity log
 */

/**
 * Helper to extract release ID from path
 */
function extractReleaseId(path) {
  const match = path.match(/\/releases\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Helper to extract task ID from path
 */
function extractTaskId(path) {
  const match = path.match(/\/tasks\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Helper to extract tenant ID from path
 */
function extractTenantId(path) {
  const match = path.match(/\/tenants\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Map old task structure to new Task interface (backend contract)
 */
function mapTaskToBackendContract(task) {
  // Extract metadata from old structure and put in externalData
  const externalData = {};
  if (task.branchUrl) externalData.branchUrl = task.branchUrl;
  if (task.commitId) externalData.commitId = task.commitId;
  if (task.ticketId) externalData.ticketId = task.ticketId;
  if (task.ticketUrl) externalData.ticketUrl = task.ticketUrl;
  if (task.testSuiteId) externalData.testSuiteId = task.testSuiteId;
  if (task.testRunId) externalData.testRunId = task.testRunId;
  if (task.runLink) externalData.runLink = task.runLink;
  if (task.tag) externalData.tag = task.tag;
  if (task.notesUrl) externalData.notesUrl = task.notesUrl;
  if (task.builds) externalData.builds = task.builds;
  if (task.error) externalData.error = task.error;

  return {
    id: task.id,
    taskId: task.taskId || task.id, // Use taskId if exists, otherwise use id
    taskType: task.taskType,
    stage: task.taskStage || task.stage, // Support both old and new field names
    taskStatus: task.taskStatus || task.status || 'PENDING', // Map status to taskStatus
    taskConclusion: task.taskConclusion || (task.status === 'COMPLETED' ? 'success' : task.status === 'FAILED' ? 'failure' : null),
    accountId: task.accountId || null,
    regressionId: task.regressionId || task.releaseCycleId || null, // Map releaseCycleId to regressionId
    isReleaseKickOffTask: task.isReleaseKickOffTask || false,
    isRegressionSubTasks: task.isRegressionSubTasks || false,
    identifier: task.identifier || null,
    externalId: task.externalId || task.ticketId || task.testSuiteId || null,
    externalData: Object.keys(externalData).length > 0 ? externalData : null,
    branch: task.branch || null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt || task.createdAt,
  };
}

/**
 * Map old cycle structure to new RegressionCycle interface (backend contract)
 */
function mapCycleToBackendContract(cycle, allCycles) {
  // Find if this is the latest cycle
  const sortedCycles = [...allCycles].sort((a, b) => 
    new Date(b.createdAt || b.slotDateTime || 0) - new Date(a.createdAt || a.slotDateTime || 0)
  );
  const isLatest = sortedCycles[0]?.id === cycle.id;

  return {
    id: cycle.id,
    releaseId: cycle.releaseId,
    isLatest,
    status: mapCycleStatus(cycle.status),
    cycleTag: cycle.cycleTag || cycle.tag || null,
    createdAt: cycle.createdAt || cycle.slotDateTime,
    completedAt: cycle.completedAt || (cycle.status === 'DONE' || cycle.status === 'COMPLETED' ? cycle.updatedAt : null),
  };
}

/**
 * Map old cycle status to new status enum values
 */
function mapCycleStatus(oldStatus) {
  const statusMap = {
    'PENDING': 'NOT_STARTED',
    'ACTIVE': 'IN_PROGRESS',
    'COMPLETED': 'DONE',
    'FAILED': 'DONE', // Failed cycles are considered done
    'ABANDONED': 'ABANDONED',
  };
  return statusMap[oldStatus] || oldStatus || 'NOT_STARTED';
}

/**
 * Map old stage status to new StageStatus enum
 */
function mapStageStatus(oldStatus) {
  const statusMap = {
    'NOT_STARTED': 'PENDING',
    'FAILED': 'IN_PROGRESS', // Failed stages are still in progress
    'PAUSED': 'IN_PROGRESS', // Paused stages are still in progress
  };
  return statusMap[oldStatus] || oldStatus || 'PENDING';
}

/**
 * Release Process Middleware
 * @param {object} router - json-server router instance
 */
function createReleaseProcessMiddleware(router) {
  return function releaseProcessMiddleware(req, res, next) {
    const { method, path, body } = req;
    const query = req.query || {}; // Get query params from req.query
    const db = router.db;
  
    // Only handle release process API paths
    if (!path.includes('/tenants/') || !path.includes('/releases/')) {
      return next();
    }

    const tenantId = extractTenantId(path);
    const releaseId = extractReleaseId(path);

    // ============================================================================
    // STAGE APIs - Backend contract: GET /tasks?stage={stage}
    // ============================================================================

    // GET /api/v1/tenants/:tenantId/releases/:releaseId/tasks?stage={stage}
    if (method === 'GET' && path.includes('/tasks')) {
      // Get stage from query params (try both req.query and destructured query)
      const stage = req.query?.stage || query.stage;
      console.log('[Mock Server] Tasks request:', { method, path, query, reqQuery: req.query, stage, releaseId });
      
      if (stage === 'KICKOFF') {
        // Try to find release by both id (UUID) and releaseId (user-facing)
        let release = db.get('releases').find({ id: releaseId }).value();
        if (!release) {
          release = db.get('releases').find({ releaseId: releaseId }).value();
        }
        
        // Tasks use the release's UUID id, not the user-facing releaseId
        const releaseUuid = release?.id || releaseId;
        
        // Get all tasks first for debugging
        const allTasks = db.get('releaseTasks').value() || [];
        const matchingTasks = allTasks.filter(task => 
          task.releaseId === releaseUuid && task.taskStage === 'KICKOFF'
        );
        
        // Also try json-server filter
        const filteredTasks = db.get('releaseTasks').filter({ releaseId: releaseUuid, taskStage: 'KICKOFF' }).value() || [];
        
        // Use matchingTasks if filteredTasks is empty (fallback)
        const tasks = filteredTasks.length > 0 ? filteredTasks : matchingTasks;

        console.log('[Mock Server] KICKOFF stage lookup:', { 
          releaseId, 
          releaseUuid, 
          releaseFound: !!release,
          allTasksCount: allTasks.length,
          matchingTasksCount: matchingTasks.length,
          filteredTasksCount: filteredTasks.length,
          finalTasksCount: tasks.length,
          sampleTask: allTasks.find(t => t.taskStage === 'KICKOFF') // Show first KICKOFF task for debugging
        });

        if (!release) {
          return res.status(404).json({
            success: false,
            error: 'Release not found',
          });
        }

        return res.json({
          success: true,
          stage: 'KICKOFF',
          releaseId: release.id, // Return the UUID id
          tasks: tasks.map(mapTaskToBackendContract),
          stageStatus: mapStageStatus(release.cronJob?.stage1Status || release.stage1Status || 'PENDING'),
        });
      }

      if (stage === 'REGRESSION') {
        // Try to find release by both id (UUID) and releaseId (user-facing)
        let release = db.get('releases').find({ id: releaseId }).value();
        if (!release) {
          release = db.get('releases').find({ releaseId: releaseId }).value();
        }
        
        // Tasks use the release's UUID id, not the user-facing releaseId
        const releaseUuid = release?.id || releaseId;
        const tasks = db.get('releaseTasks').filter({ releaseId: releaseUuid, taskStage: 'REGRESSION' }).value() || [];
        const allCycles = db.get('regressionCycles').filter({ releaseId: releaseUuid }).value() || [];
        const currentCycle = allCycles.find(c => c.status === 'IN_PROGRESS' || c.status === 'ACTIVE') || 
                            allCycles.find(c => c.status === 'NOT_STARTED') ||
                            allCycles[allCycles.length - 1];

        if (!release) {
          return res.status(404).json({
            success: false,
            error: 'Release not found',
          });
        }

        // Get available builds
        const availableBuilds = db.get('buildUploadsStaging')
          .filter({ releaseId: releaseUuid, isUsed: false })
          .value() || [];

        const buildsRequired = release.platforms || ['ANDROID', 'IOS'];
        const allBuildsUploaded = buildsRequired.every(platform =>
          availableBuilds.some(build => build.platform === platform)
        );

        // Map builds to new BuildInfo structure
        const mappedBuilds = availableBuilds.map(build => ({
        id: build.id,
        tenantId: tenantId || build.tenantId,
        releaseId: build.releaseId,
        platform: build.platform,
        storeType: null,
        buildNumber: null,
        artifactVersionName: build.versionName || null,
        artifactPath: build.artifactPath,
        regressionId: build.regressionId || null,
        ciRunId: build.ciRunId || null,
        buildUploadStatus: build.buildUploadStatus || 'UPLOADED',
        buildType: build.buildType || 'MANUAL',
        buildStage: build.stage === 'PRE_REGRESSION' ? 'KICK_OFF' : build.stage === 'REGRESSION' ? 'REGRESSION' : 'PRE_RELEASE',
        queueLocation: null,
        workflowStatus: null,
        ciRunType: null,
        taskId: build.taskId || null,
        internalTrackLink: build.internalTrackLink || null,
        testflightNumber: build.testflightNumber || null,
          createdAt: build.createdAt,
          updatedAt: build.updatedAt || build.createdAt,
        }));

        // Map cycles to new structure
        const mappedCycles = allCycles.map(cycle => mapCycleToBackendContract(cycle, allCycles));

        // Determine approval status
        const cyclesCompleted = allCycles.length > 0 && allCycles.every(c => 
          c.status === 'COMPLETED' || c.status === 'DONE'
        );
        const noActiveCycles = !allCycles.some(c => 
          c.status === 'IN_PROGRESS' || c.status === 'ACTIVE' || c.status === 'NOT_STARTED'
        );

        return res.json({
          success: true,
          stage: 'REGRESSION',
          releaseId,
          tasks: tasks.map(mapTaskToBackendContract),
          stageStatus: mapStageStatus(release.stage2Status || 'PENDING'),
          cycles: mappedCycles,
          currentCycle: currentCycle ? mapCycleToBackendContract(currentCycle, allCycles) : null,
          approvalStatus: {
            canApprove: cyclesCompleted && noActiveCycles,
            approvalRequirements: {
              testManagementPassed: true, // Mock: always true
              cherryPickStatusOk: true, // Mock: always true
              cyclesCompleted: cyclesCompleted && noActiveCycles,
            },
          },
          availableBuilds: mappedBuilds,
          upcomingSlot: allCycles.length === 0 ? [{
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            config: {},
          }] : null,
        });
      }

      if (stage === 'POST_REGRESSION') {
        // Try to find release by both id (UUID) and releaseId (user-facing)
        let release = db.get('releases').find({ id: releaseId }).value();
        if (!release) {
          release = db.get('releases').find({ releaseId: releaseId }).value();
        }
        
        // Tasks use the release's UUID id, not the user-facing releaseId
        const releaseUuid = release?.id || releaseId;
        const tasks = db.get('releaseTasks').filter({ releaseId: releaseUuid, taskStage: 'POST_REGRESSION' }).value() || [];

        console.log('[Mock Server] POST_REGRESSION stage lookup:', { 
          releaseId, 
          releaseUuid, 
          releaseFound: !!release,
          tasksFound: tasks.length 
        });

        if (!release) {
          return res.status(404).json({
            success: false,
            error: 'Release not found',
          });
        }

        return res.json({
          success: true,
          stage: 'POST_REGRESSION',
          releaseId: release.id, // Return the UUID id
          tasks: tasks.map(mapTaskToBackendContract),
          stageStatus: mapStageStatus(release.stage3Status || 'PENDING'),
        });
      }

      // If stage doesn't match any known stage, return 404
      return res.status(404).json({
        success: false,
        error: `Stage '${stage}' not found`,
      });
    }

    // ============================================================================
    // TASK APIs
    // ============================================================================

    // POST /api/v1/tenants/:tenantId/releases/:releaseId/tasks/:taskId/retry
    if (method === 'POST' && path.includes('/tasks/') && path.includes('/retry')) {
      const taskId = extractTaskId(path);
      const task = db.get('releaseTasks').find({ id: taskId }).value();

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found',
        });
      }

      // Update task status to PENDING
      db.get('releaseTasks')
        .find({ id: taskId })
        .assign({
          taskStatus: 'PENDING',
          status: 'PENDING', // Keep old field for compatibility
          taskConclusion: null,
          error: null,
          updatedAt: new Date().toISOString(),
        })
        .write();

      const updatedTask = db.get('releaseTasks').find({ id: taskId }).value();

      return res.json({
        success: true,
        message: 'Task queued for retry',
        task: mapTaskToBackendContract(updatedTask),
      });
    }

    // ============================================================================
    // BUILD APIs
    // ============================================================================

    // POST /api/v1/tenants/:tenantId/releases/:releaseId/stages/:stage/builds/:platform
    // Backend route structure: stage and platform are path parameters
    // Stage can be: 'KICKOFF' | 'REGRESSION' | 'POST_REGRESSION' (TaskStage)
    // Frontend sends: 'PRE_REGRESSION' | 'REGRESSION' | 'PRE_RELEASE' (BuildUploadStage)
    // BFF route handles the mapping, so mock server receives TaskStage values
    if (method === 'POST' && path.includes('/stages/') && path.includes('/builds/')) {
      // Extract stage and platform from path
      // Path format: /api/v1/tenants/:tenantId/releases/:releaseId/stages/:stage/builds/:platform
      const stageMatch = path.match(/\/stages\/([^/]+)\/builds\/([^/]+)/);
      if (!stageMatch) {
        return res.status(400).json({
          success: false,
          error: 'Invalid route format. Expected: /stages/:stage/builds/:platform',
        });
      }

      const stage = stageMatch[1]; // TaskStage: 'KICKOFF' | 'REGRESSION' | 'POST_REGRESSION'
      const platform = stageMatch[2]; // Platform: 'ANDROID' | 'IOS' | 'WEB'

      // Extract file from form data (backend expects 'artifact' field, but BFF receives 'file')
      const file = req.file || (body && body.file) || (body && body.artifact);

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: file (artifact)',
        });
      }

      // Map TaskStage back to BuildUploadStage for storage (for consistency with existing data)
      const buildUploadStage = 
        stage === 'KICKOFF' ? 'PRE_REGRESSION' :
        stage === 'REGRESSION' ? 'REGRESSION' :
        stage === 'POST_REGRESSION' ? 'PRE_RELEASE' :
        stage; // Fallback

      const buildId = `build_${Date.now()}`;
      const buildData = {
        id: buildId,
        tenantId,
        releaseId,
        platform,
        stage: buildUploadStage, // Store as BuildUploadStage for consistency
        artifactPath: `s3://bucket/releases/${releaseId}/${platform}/${file.name || file.originalname || 'build'}`,
        isUsed: false,
        createdAt: new Date().toISOString(),
      };

      db.get('buildUploadsStaging').push(buildData).write();

      return res.json({
        success: true,
        buildId,
        message: 'Build uploaded successfully',
        build: {
          id: buildId,
          tenantId,
          releaseId,
          platform,
          storeType: null,
          buildNumber: null,
          artifactVersionName: null,
          artifactPath: buildData.artifactPath,
          regressionId: null,
          ciRunId: null,
          buildUploadStatus: 'UPLOADED',
          buildType: 'MANUAL',
          buildStage: buildUploadStage === 'PRE_REGRESSION' ? 'KICK_OFF' : buildUploadStage === 'REGRESSION' ? 'REGRESSION' : 'PRE_RELEASE',
          queueLocation: null,
          workflowStatus: null,
          ciRunType: null,
          taskId: null,
          internalTrackLink: null,
          testflightNumber: null,
          createdAt: buildData.createdAt,
          updatedAt: buildData.createdAt,
        },
      });
    }

    // DELETE /api/v1/tenants/:tenantId/releases/:releaseId/builds/:buildId
    if (method === 'DELETE' && path.includes('/builds/')) {
      const buildId = path.split('/builds/')[1];
      const build = db.get('buildUploadsStaging').find({ id: buildId }).value();

      if (!build) {
        return res.status(404).json({
          success: false,
          error: 'Build not found',
        });
      }

      db.get('buildUploadsStaging').remove({ id: buildId }).write();

      return res.json({
        success: true,
        message: 'Build deleted successfully',
      });
    }

    // ============================================================================
    // STATUS CHECK APIs - Updated to match backend contract
    // ============================================================================

    // GET /api/v1/tenants/:tenantId/releases/:releaseId/test-management-run-status
    if (method === 'GET' && path.includes('/test-management-run-status')) {
      const platform = query.platform;
      const task = db.get('releaseTasks')
        .filter({ releaseId, taskType: 'CREATE_TEST_SUITE' })
        .value()[0];

      if (platform) {
        // Single platform response
        return res.json({
          success: true,
          releaseId,
          testManagementConfigId: 'test-config-1',
          platform,
          target: platform === 'IOS' ? 'APP_STORE' : platform === 'ANDROID' ? 'PLAY_STORE' : 'WEB',
          version: '1.0.0',
          hasTestRun: !!task?.testRunId,
          runId: task?.testRunId || null,
          status: task?.status === 'COMPLETED' ? 'PASSED' : task?.status === 'FAILED' ? 'FAILED' : 'PENDING',
          runLink: task?.runLink,
          total: 100,
          testResults: {
            passed: 95,
            failed: 2,
            untested: 3,
            skipped: 0,
            blocked: 0,
            inProgress: 0,
            passPercentage: 95,
            threshold: 90,
            thresholdPassed: true,
          },
        });
      } else {
        // All platforms response
        const platforms = ['ANDROID', 'IOS'];
        return res.json({
          success: true,
          releaseId,
          testManagementConfigId: 'test-config-1',
          platforms: platforms.map(p => ({
            platform: p,
            target: p === 'IOS' ? 'APP_STORE' : 'PLAY_STORE',
            version: '1.0.0',
            hasTestRun: !!task?.testRunId,
            runId: task?.testRunId || null,
            status: task?.status === 'COMPLETED' ? 'PASSED' : task?.status === 'FAILED' ? 'FAILED' : 'PENDING',
            runLink: task?.runLink,
            total: 100,
            testResults: {
              passed: 95,
              failed: 2,
              untested: 3,
              skipped: 0,
              blocked: 0,
              inProgress: 0,
              passPercentage: 95,
              threshold: 90,
              thresholdPassed: true,
            },
          })),
        });
      }
    }

    // GET /api/v1/tenants/:tenantId/releases/:releaseId/project-management-run-status
    if (method === 'GET' && path.includes('/project-management-run-status')) {
      const platform = query.platform;
      const task = db.get('releaseTasks')
        .filter({ releaseId, taskType: 'CREATE_PROJECT_MANAGEMENT_TICKET' })
        .value()[0];

      if (platform) {
        // Single platform response
        return res.json({
          success: true,
          releaseId,
          projectManagementConfigId: 'pm-config-1',
          platform,
          target: platform === 'IOS' ? 'APP_STORE' : platform === 'ANDROID' ? 'PLAY_STORE' : 'WEB',
          version: '1.0.0',
          hasTicket: !!task?.ticketId,
          ticketKey: task?.ticketId || null,
          currentStatus: task?.status === 'COMPLETED' ? 'RESOLVED' : task?.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING',
          completedStatus: 'RESOLVED',
          isCompleted: task?.status === 'COMPLETED',
          message: task?.status === 'COMPLETED' ? 'Ticket resolved' : 'Ticket in progress',
        });
      } else {
        // All platforms response
        const platforms = ['ANDROID', 'IOS'];
        return res.json({
          success: true,
          releaseId,
          projectManagementConfigId: 'pm-config-1',
          platforms: platforms.map(p => ({
            platform: p,
            target: p === 'IOS' ? 'APP_STORE' : 'PLAY_STORE',
            version: '1.0.0',
            hasTicket: !!task?.ticketId,
            ticketKey: task?.ticketId || null,
            currentStatus: task?.status === 'COMPLETED' ? 'RESOLVED' : task?.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING',
            completedStatus: 'RESOLVED',
            isCompleted: task?.status === 'COMPLETED',
            message: task?.status === 'COMPLETED' ? 'Ticket resolved' : 'Ticket in progress',
          })),
        });
      }
    }

    // GET /api/v1/tenants/:tenantId/releases/:releaseId/check-cherry-pick-status
    if (method === 'GET' && path.includes('/check-cherry-pick-status')) {
      return res.json({
        success: true,
        releaseId,
        latestReleaseTag: 'v1.0.0',
        commitIdsMatch: true,
      });
    }

    // ============================================================================
    // APPROVAL APIs
    // ============================================================================

    // POST /api/v1/tenants/:tenantId/releases/:releaseId/stages/regression/approve
    if (method === 'POST' && path.includes('/stages/regression/approve')) {
      const release = db.get('releases').find({ id: releaseId }).value();

      if (!release) {
        return res.status(404).json({
          success: false,
          error: 'Release not found',
        });
      }

      db.get('releases')
        .find({ id: releaseId })
        .assign({
          stage2Status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
        })
        .write();

      return res.json({
        success: true,
        message: 'Regression stage approved',
        releaseId,
        approvedAt: new Date().toISOString(),
        approvedBy: body.approvedBy || 'user-123',
        nextStage: 'POST_REGRESSION',
      });
    }

    // POST /api/v1/tenants/:tenantId/releases/:releaseId/stages/post-regression/complete
    if (method === 'POST' && path.includes('/stages/post-regression/complete')) {
      const release = db.get('releases').find({ id: releaseId }).value();

      if (!release) {
        return res.status(404).json({
          success: false,
          error: 'Release not found',
        });
      }

      db.get('releases')
        .find({ id: releaseId })
        .assign({
          stage3Status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
        })
        .write();

      return res.json({
        success: true,
        message: 'Post-regression stage completed',
        releaseId,
        completedAt: new Date().toISOString(),
        nextStage: 'RELEASE_SUBMISSION',
      });
    }

    // ============================================================================
    // NOTIFICATION APIs
    // ============================================================================

    // GET /api/v1/tenants/:tenantId/releases/:releaseId/notifications
    if (method === 'GET' && path.includes('/notifications')) {
      const notifications = db.get('notifications')
        .filter({ releaseId })
        .value() || [];

      return res.json({
        success: true,
        releaseId,
        notifications: notifications.map(notif => ({
          id: notif.id,
          tenantId: notif.tenantId,
          releaseId: notif.releaseId,
          notificationType: notif.notificationType || 'RELEASE_KICKOFF',
          isSystemGenerated: notif.isSystemGenerated !== false,
          createdByUserId: notif.createdByUserId || null,
          taskId: notif.taskId || null,
          delivery: notif.delivery || {},
          createdAt: notif.createdAt,
        })),
      });
    }

    // POST /api/v1/tenants/:tenantId/releases/:releaseId/notify
    if (method === 'POST' && path.includes('/notify')) {
      const { messageType } = body;

      if (!messageType) {
        return res.status(400).json({
          success: false,
          error: 'messageType is required',
        });
      }

      const notification = {
        id: Date.now(),
        tenantId: parseInt(tenantId) || 1,
        releaseId: parseInt(releaseId) || 1,
        notificationType: messageType,
        isSystemGenerated: false,
        createdByUserId: 1,
        taskId: null,
        delivery: {},
        createdAt: new Date().toISOString(),
      };

      db.get('notifications').push(notification).write();

      return res.status(201).json({
        success: true,
        notification,
      });
    }

    // ============================================================================
    // ACTIVITY LOG API - Updated to match backend contract
    // ============================================================================

    // GET /api/v1/tenants/:tenantId/releases/:releaseId/activity-logs
    if (method === 'GET' && path.includes('/activity-logs')) {
      const activities = db.get('activityLogs')
        .filter({ releaseId })
        .value() || [];

      return res.json({
        success: true,
        releaseId,
        activityLogs: activities.map(activity => ({
          id: activity.id,
          releaseId: activity.releaseId,
          type: activity.type || activity.action || 'TASK_UPDATE',
          previousValue: activity.previousValue || null,
          newValue: activity.newValue || activity.details || null,
          updatedAt: activity.updatedAt || activity.timestamp,
          updatedBy: activity.updatedBy || activity.performedBy,
        })),
      });
    }

    // Continue to next middleware if no match
    return next();
  };
}

export default createReleaseProcessMiddleware;
