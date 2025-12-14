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

import crypto from 'crypto';

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
 * Get builds for a task based on task type and stage
 * Returns BuildInfo[] array matching the backend contract
 */
function getBuildsForTask(task, db, releaseId) {
  const buildTaskTypes = [
    'TRIGGER_PRE_REGRESSION_BUILDS',
    'TRIGGER_REGRESSION_BUILDS',
    'TRIGGER_TEST_FLIGHT_BUILD',
    'CREATE_AAB_BUILD',
  ];

  // Only attach builds for build-related tasks
  if (!buildTaskTypes.includes(task.taskType)) {
    return undefined;
  }

  const taskStage = task.taskStage || task.stage;
  let buildStage = null;
  
  // Map task stage to build stage
  if (taskStage === 'KICKOFF') {
    buildStage = 'PRE_REGRESSION';
  } else if (taskStage === 'REGRESSION') {
    buildStage = 'REGRESSION';
  } else if (taskStage === 'POST_REGRESSION') {
    buildStage = 'PRE_RELEASE';
  }

  if (!buildStage) {
    return undefined;
  }

  // Only get consumed builds from builds table
  // Staging builds belong in stage.availableBuilds (for Regression stage only)
  // task.builds should only contain consumed builds where taskId === task.id
  const consumedBuilds = db.get('builds')
    .filter({ releaseId, taskId: task.id })
    .value() || [];

  // Only use consumed builds (not staging builds)
  const allBuilds = consumedBuilds;
  
  if (allBuilds.length === 0) {
    return undefined;
  }

  return allBuilds.map(build => {
    // Determine platform from build
    const platform = build.platform || 'ANDROID';
    
    // Keep storeType from build data (backend may or may not send it)
    // Frontend doesn't depend on it anymore - uses platform + testflightNumber/internalTrackLink instead
    const storeType = build.storeType || null;

    return {
      id: build.id,
      tenantId: build.tenantId || null,
      releaseId: build.releaseId || releaseId,
      platform: platform,
      storeType: storeType,
      buildNumber: build.buildNumber || build.testflightNumber || null,
      artifactVersionName: build.artifactVersionName || build.versionName || null,
      artifactPath: build.artifactPath || null,
      regressionId: build.regressionId || null,
      ciRunId: build.ciRunId || null,
      buildUploadStatus: build.buildUploadStatus || (build.isUsed === false ? 'UPLOADED' : 'UPLOADED'),
      buildType: build.buildType || 'MANUAL',
      buildStage: buildStage === 'PRE_REGRESSION' ? 'KICK_OFF' : buildStage === 'REGRESSION' ? 'REGRESSION' : 'PRE_RELEASE',
      queueLocation: build.queueLocation || null,
      workflowStatus: build.workflowStatus || null,
      ciRunType: build.ciRunType || null,
      taskId: build.taskId || task.id,
      internalTrackLink: build.internalTrackLink || (platform === 'ANDROID' && taskStage === 'POST_REGRESSION' ? 'https://play.google.com/apps/internaltest/...' : null),
      testflightNumber: build.testflightNumber || (platform === 'IOS' && taskStage === 'POST_REGRESSION' ? build.buildNumber : null),
      createdAt: build.createdAt || new Date().toISOString(),
      updatedAt: build.updatedAt || build.createdAt || new Date().toISOString(),
    };
  });
}

/**
 * Map old task structure to new Task interface (backend contract)
 */
function mapTaskToBackendContract(task, db = null, releaseId = null) {
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
  if (task.error) externalData.error = task.error;
  // Note: task.builds is no longer moved to externalData - it's now a direct property

  // Get builds for this task if db and releaseId are provided
  const builds = db && releaseId ? getBuildsForTask(task, db, releaseId) : undefined;

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
    builds: builds, // Include builds array if available
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
          tasks: tasks.map(task => mapTaskToBackendContract(task, db, releaseUuid)),
          stageStatus: release.cronJob?.stage1Status || release.stage1Status || 'PENDING',
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

        // Check test management status (check CREATE_TEST_SUITE task)
        const testSuiteTask = tasks.find(t => t.taskType === 'CREATE_TEST_SUITE');
        const testManagementPassed = testSuiteTask?.taskStatus === 'COMPLETED' || false;

        // Check cherry pick status (mock: check if cycles are completed)
        // In real implementation, this would call the cherry pick status API
        const cherryPickStatusOk = cyclesCompleted && noActiveCycles;

        const allRequirementsMet = testManagementPassed && cherryPickStatusOk && cyclesCompleted && noActiveCycles;

        return res.json({
          success: true,
          stage: 'REGRESSION',
          releaseId,
          tasks: tasks.map(task => mapTaskToBackendContract(task, db, releaseUuid)),
          stageStatus: release.stage2Status || 'PENDING',
          cycles: mappedCycles,
          currentCycle: currentCycle ? mapCycleToBackendContract(currentCycle, allCycles) : null,
          approvalStatus: {
            canApprove: allRequirementsMet,
            approvalRequirements: {
              testManagementPassed: testManagementPassed,
              cherryPickStatusOk: cherryPickStatusOk,
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
          tasks: tasks.map(task => mapTaskToBackendContract(task, db, releaseUuid)),
          stageStatus: release.stage3Status || 'PENDING',
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
      const releaseId = extractReleaseId(path);
      const task = db.get('releaseTasks').find({ id: taskId }).value();

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found',
        });
      }

      // Get release UUID if needed
      let releaseUuid = releaseId;
      if (releaseId) {
        const release = db.get('releases').find({ id: releaseId }).value() ||
                       db.get('releases').find({ releaseId: releaseId }).value();
        releaseUuid = release?.id || releaseId;
      } else {
        // Fallback to task's releaseId
        releaseUuid = task.releaseId;
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
        message: 'Task retry initiated. Cron will re-execute on next tick.',
        data: {
          taskId: updatedTask.id,
          releaseId: releaseUuid,
          previousStatus: task.taskStatus || task.status || 'FAILED',
          newStatus: 'PENDING',
        },
      });
    }

    // ============================================================================
    // BUILD APIs
    // ============================================================================

    // PUT/POST /api/v1/tenants/:tenantId/releases/:releaseId/stages/:stage/builds/:platform
    // Backend route structure: stage and platform are path parameters
    // Stage can be: 'KICKOFF' | 'REGRESSION' | 'POST_REGRESSION' (TaskStage)
    // Frontend sends: 'PRE_REGRESSION' | 'REGRESSION' | 'PRE_RELEASE' (BuildUploadStage)
    // BFF route handles the mapping, so mock server receives TaskStage values
    // API contract specifies PUT, but we support both PUT and POST for compatibility
    if ((method === 'PUT' || method === 'POST') && path.includes('/stages/') && path.includes('/builds/')) {
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

      // Extract file from multer (multer.any() puts files in req.files array)
      // Backend expects 'artifact' field name
      const file = req.files?.find(f => f.fieldname === 'artifact') || req.file;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f9402839-8b19-4c73-b767-d6dcf38aa8d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'release-process.middleware.js:394',message:'Mock server file extraction',data:{filesCount:req.files?.length||0,fileFieldnames:req.files?.map(f=>f.fieldname)||[],hasFile:!!file,fileSize:file?.size,fileName:file?.originalname||file?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      console.log('[Mock Server] Build upload request:', { 
        method, 
        path, 
        body, 
        files: req.files,
        file,
        contentType: req.headers['content-type']
      });

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

      const uploadId = `upload_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const buildData = {
        id: uploadId,
        tenantId,
        releaseId,
        platform,
        stage: buildUploadStage, // Store as BuildUploadStage for consistency
        artifactPath: `s3://bucket/releases/${releaseId}/${platform}/${file.name || file.originalname || 'build'}`,
        isUsed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.get('buildUploadsStaging').push(buildData).write();

      // Get all staging builds for this release and stage to determine platform status
      const allStagingBuilds = db.get('buildUploadsStaging')
        .filter({ releaseId, stage: buildUploadStage, isUsed: false })
        .value() || [];
      
      // Get required platforms from release
      const release = db.get('releases').find({ id: releaseId }).value() || 
                      db.get('releases').find({ releaseId: releaseId }).value();
      const requiredPlatforms = release?.platforms || ['ANDROID', 'IOS'];
      
      const uploadedPlatforms = [...new Set(allStagingBuilds.map(b => b.platform))];
      const missingPlatforms = requiredPlatforms.filter(p => !uploadedPlatforms.includes(p));
      const allPlatformsReady = missingPlatforms.length === 0;

      // Generate presigned download URL (mock)
      const downloadUrl = `https://s3.amazonaws.com/bucket/releases/${releaseId}/${platform}/${file.name || file.originalname || 'build'}?presigned=true`;

      return res.json({
        success: true,
        data: {
          uploadId,
          platform,
          stage: buildUploadStage === 'PRE_REGRESSION' ? 'KICK_OFF' : buildUploadStage === 'REGRESSION' ? 'REGRESSION' : 'PRE_RELEASE',
          downloadUrl,
          internalTrackLink: platform === 'ANDROID' && allPlatformsReady ? 'https://play.google.com/apps/internaltest/...' : null,
          uploadedPlatforms,
          missingPlatforms,
          allPlatformsReady,
        },
      });
    }

    // POST /api/v1/tenants/:tenantId/releases/:releaseId/stages/:stage/builds/ios/verify-testflight
    if (method === 'POST' && path.includes('/builds/ios/verify-testflight')) {
      const stageMatch = path.match(/\/stages\/([^/]+)\/builds\/ios\/verify-testflight/);
      if (!stageMatch) {
        return res.status(400).json({
          success: false,
          error: 'Invalid route format. Expected: /stages/:stage/builds/ios/verify-testflight',
        });
      }

      const stage = stageMatch[1]; // TaskStage: 'KICKOFF' | 'REGRESSION' | 'POST_REGRESSION'
      const { testflightBuildNumber, versionName } = body;

      if (!testflightBuildNumber || !versionName) {
        return res.status(400).json({
          success: false,
          error: 'testflightBuildNumber and versionName are required',
        });
      }

      // Map TaskStage back to BuildUploadStage
      const buildUploadStage = 
        stage === 'KICKOFF' ? 'PRE_REGRESSION' :
        stage === 'REGRESSION' ? 'REGRESSION' :
        stage === 'POST_REGRESSION' ? 'PRE_RELEASE' :
        stage;

      const uploadId = `upload_testflight_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const buildData = {
        id: uploadId,
          tenantId,
        releaseId,
        platform: 'IOS',
        stage: buildUploadStage,
        artifactPath: null, // TestFlight builds don't have S3 path
        testflightNumber: testflightBuildNumber,
        versionName,
        isUsed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.get('buildUploadsStaging').push(buildData).write();

      // Get all staging builds for this release and stage
      const allStagingBuilds = db.get('buildUploadsStaging')
        .filter({ releaseId, stage: buildUploadStage, isUsed: false })
        .value() || [];
      
      const release = db.get('releases').find({ id: releaseId }).value() || 
                      db.get('releases').find({ releaseId: releaseId }).value();
      const requiredPlatforms = release?.platforms || ['ANDROID', 'IOS'];
      
      const uploadedPlatforms = [...new Set(allStagingBuilds.map(b => b.platform))];
      const missingPlatforms = requiredPlatforms.filter(p => !uploadedPlatforms.includes(p));
      const allPlatformsReady = missingPlatforms.length === 0;

      return res.json({
        success: true,
        data: {
          uploadId,
          releaseId,
          platform: 'IOS',
          stage: buildUploadStage === 'PRE_REGRESSION' ? 'KICK_OFF' : buildUploadStage === 'REGRESSION' ? 'REGRESSION' : 'PRE_RELEASE',
          testflightNumber,
          versionName,
          verified: true,
          isUsed: false,
          uploadedPlatforms,
          missingPlatforms,
          allPlatformsReady,
          createdAt: buildData.createdAt,
        },
      });
    }

    // GET /api/v1/tenants/:tenantId/releases/:releaseId/builds/artifacts
    if (method === 'GET' && path.includes('/builds/artifacts') && !path.includes('/builds/artifacts/')) {
      const platform = query.platform;
      const buildStage = query.buildStage;

      // Get artifacts from builds table (consumed builds)
      let consumedArtifacts = db.get('builds').filter({ releaseId }).value() || [];

      // ALSO get staging builds (unconsumed uploads) - these should be visible in UI
      // Map staging stage to buildStage format
      const stagingBuilds = db.get('buildUploadsStaging')
        .filter({ releaseId, isUsed: false })
        .value() || [];
      
      // Convert staging builds to BuildArtifact format
      const mappedStagingBuilds = stagingBuilds.map(staging => {
        const stage = staging.stage;
        const buildStageValue = 
          stage === 'PRE_REGRESSION' ? 'KICK_OFF' :
          stage === 'REGRESSION' ? 'REGRESSION' :
          stage === 'PRE_RELEASE' ? 'PRE_RELEASE' :
          stage;
        
        return {
          id: staging.id, // Use staging id as uploadId
          artifactPath: staging.artifactPath || null,
          downloadUrl: staging.artifactPath ? `https://s3.amazonaws.com/bucket/${staging.artifactPath.replace('s3://bucket/', '')}?presigned=true` : null,
          artifactVersionName: staging.versionName || '1.0.0',
          buildNumber: staging.testflightNumber || null,
          releaseId: staging.releaseId,
          platform: staging.platform,
          storeType: staging.testflightNumber ? 'TESTFLIGHT' : null,
          buildStage: buildStageValue,
          buildType: 'MANUAL',
          buildUploadStatus: staging.buildUploadStatus || 'UPLOADED',
          workflowStatus: null,
          regressionId: staging.regressionId || null,
          ciRunId: null,
          createdAt: staging.createdAt || new Date().toISOString(),
          updatedAt: staging.updatedAt || staging.createdAt || new Date().toISOString(),
        };
      });

      // Combine consumed and staging artifacts
      let allArtifacts = [...consumedArtifacts, ...mappedStagingBuilds];

      // Apply filters
      if (platform) {
        allArtifacts = allArtifacts.filter(a => a.platform === platform);
      }
      if (buildStage) {
        allArtifacts = allArtifacts.filter(a => {
          const stage = a.buildStage || a.stage;
          return stage === buildStage;
        });
      }

      // Map consumed artifacts to BuildArtifact interface
      const mappedConsumedArtifacts = consumedArtifacts.map(artifact => ({
        id: artifact.id,
        artifactPath: artifact.artifactPath || null,
        downloadUrl: artifact.artifactPath ? `https://s3.amazonaws.com/bucket/${artifact.artifactPath.replace('s3://bucket/', '')}?presigned=true` : null,
        artifactVersionName: artifact.artifactVersionName || artifact.versionName || '1.0.0',
        buildNumber: artifact.buildNumber || artifact.testflightNumber || null,
        releaseId: artifact.releaseId,
        platform: artifact.platform,
        storeType: artifact.storeType || (artifact.testflightNumber ? 'TESTFLIGHT' : null),
        buildStage: artifact.buildStage || (artifact.stage === 'PRE_REGRESSION' ? 'KICK_OFF' : artifact.stage === 'REGRESSION' ? 'REGRESSION' : 'PRE_RELEASE'),
        buildType: artifact.buildType || 'MANUAL',
        buildUploadStatus: artifact.buildUploadStatus || 'UPLOADED',
        workflowStatus: artifact.workflowStatus || null,
        regressionId: artifact.regressionId || null,
        ciRunId: artifact.ciRunId || null,
        createdAt: artifact.createdAt || new Date().toISOString(),
        updatedAt: artifact.updatedAt || artifact.createdAt || new Date().toISOString(),
      }));

      // Combine and return (staging builds are already mapped above)
      const finalArtifacts = [...mappedConsumedArtifacts, ...mappedStagingBuilds];

      // Remove duplicates (in case a staging build was consumed and exists in both)
      const uniqueArtifacts = finalArtifacts.filter((artifact, index, self) =>
        index === self.findIndex(a => a.id === artifact.id)
      );

      return res.json({
        success: true,
        data: uniqueArtifacts,
      });
    }

    // DELETE endpoints removed - delete functionality not supported

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
        const taskStatus = task?.taskStatus || task?.status || 'PENDING';
        const isCompleted = taskStatus === 'COMPLETED';
        const isFailed = taskStatus === 'FAILED';
        
        return res.json({
          success: true,
          releaseId,
          testManagementConfigId: 'test-config-1',
          platform,
          target: platform === 'IOS' ? 'APP_STORE' : platform === 'ANDROID' ? 'PLAY_STORE' : 'WEB',
          version: '1.0.0',
          hasTestRun: !!task?.testRunId,
          runId: task?.testRunId || null,
          status: isCompleted ? 'PASSED' : isFailed ? 'FAILED' : 'PENDING', // Component expects 'PASSED', not 'COMPLETED'
          runLink: task?.runLink || (isCompleted ? `https://test-management.example.com/runs/${task?.testRunId || '123'}` : undefined),
          total: 100,
          testResults: {
            passed: isCompleted ? 95 : 0,
            failed: isFailed ? 5 : (isCompleted ? 2 : 0),
            untested: isCompleted ? 3 : 100,
            skipped: 0,
            blocked: 0,
            inProgress: 0,
            passPercentage: isCompleted ? 95 : 0,
            threshold: 90,
            thresholdPassed: isCompleted,
          },
          lastUpdated: task?.updatedAt || task?.createdAt || new Date().toISOString(),
        });
      } else {
        // All platforms response
        const platforms = ['ANDROID', 'IOS'];
        const taskStatus = task?.taskStatus || task?.status || 'PENDING';
        const isCompleted = taskStatus === 'COMPLETED';
        const isFailed = taskStatus === 'FAILED';
        
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
            status: isCompleted ? 'PASSED' : isFailed ? 'FAILED' : 'PENDING', // Component expects 'PASSED', not 'COMPLETED'
            runLink: task?.runLink || (isCompleted ? `https://test-management.example.com/runs/${task?.testRunId || '123'}` : undefined),
            total: 100,
            testResults: {
              passed: isCompleted ? 95 : 0,
              failed: isFailed ? 5 : (isCompleted ? 2 : 0),
              untested: isCompleted ? 3 : 100,
              skipped: 0,
              blocked: 0,
              inProgress: 0,
              passPercentage: isCompleted ? 95 : 0,
              threshold: 90,
              thresholdPassed: isCompleted,
            },
            lastUpdated: task?.updatedAt || task?.createdAt || new Date().toISOString(),
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
      // Get release to determine cherry pick status
      const release = db.get('releases').find({ id: releaseId }).value();
      
      // Mock: Determine status based on release state
      // In real implementation, this would check if branch head commit == latest tag commit
      // cherryPickAvailable: true = cherry picks exist, false = commits match
      const cherryPickAvailable = release?.stage2Status !== 'COMPLETED' && Math.random() > 0.3; // 70% chance of no cherry picks when stage2 is completed
      
      return res.json({
        success: true,
        releaseId,
        cherryPickAvailable: cherryPickAvailable,
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
        message: 'Regression stage approved and Post-Regression stage triggered successfully',
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
