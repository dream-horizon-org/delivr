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
  } else if (taskStage === 'PRE_RELEASE') {
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
  
  // API contract: builds field must always be present, empty array if no builds
  if (allBuilds.length === 0) {
    return [];
  }

  // Get tenantId from release or use default (mandatory field)
  const release = db ? db.get('releases').find({ id: releaseId }).value() : null;
  const defaultTenantId = release?.tenantId || releaseId?.split('-')[0] || '00000000-0000-0000-0000-000000000000';

  return allBuilds.map(build => {
    // Determine platform from build
    const platform = build.platform || 'ANDROID';
    
    // Keep storeType from build data (backend may or may not send it)
    // Frontend doesn't depend on it anymore - uses platform + testflightNumber/internalTrackLink instead
    const storeType = build.storeType || null;
    
    // Determine buildStage (must be one of: 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE')
    // API contract: buildStage must be one of: 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE'
    let mappedBuildStage = build.buildStage;
    if (!mappedBuildStage || !['KICKOFF', 'REGRESSION', 'PRE_RELEASE'].includes(mappedBuildStage)) {
      // Map from taskStage or buildStage parameter
      if (buildStage === 'PRE_REGRESSION' || buildStage === 'KICKOFF' || buildStage === 'KICKOFF') {
        mappedBuildStage = 'KICKOFF';
      } else if (buildStage === 'REGRESSION') {
        mappedBuildStage = 'REGRESSION';
      } else if (buildStage === 'PRE_RELEASE') {
        mappedBuildStage = 'PRE_RELEASE';
      } else {
        mappedBuildStage = 'KICKOFF'; // Default fallback
      }
    }

    // API contract: BuildInfo mandatory fields
    return {
      // MANDATORY fields (must always be present)
      id: build.id,
      tenantId: build.tenantId || defaultTenantId, // Must be string, never null
      releaseId: build.releaseId || releaseId, // Must be release.id (UUID), not release.releaseId
      platform: platform,
      buildStage: mappedBuildStage, // Must be one of: 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE'
      artifactPath: build.artifactPath || null, // Mandatory field (can be null)
      internalTrackLink: build.internalTrackLink || (platform === 'ANDROID' && taskStage === 'PRE_RELEASE' ? 'https://play.google.com/apps/internaltest/...' : null), // Mandatory field (can be null)
      testflightNumber: build.testflightNumber || (platform === 'IOS' && taskStage === 'PRE_RELEASE' ? build.buildNumber : null), // Mandatory field (can be null)
      createdAt: build.createdAt || new Date().toISOString(),
      updatedAt: build.updatedAt || build.createdAt || new Date().toISOString(),
      
      // OPTIONAL fields (only in builds table)
      buildType: build.buildType || 'MANUAL',
      buildUploadStatus: build.buildUploadStatus || (build.isUsed === false ? 'UPLOADED' : 'UPLOADED'),
      storeType: storeType,
      buildNumber: build.buildNumber || build.testflightNumber || null,
      artifactVersionName: build.artifactVersionName || build.versionName || null,
      regressionId: build.regressionId || null,
      ciRunId: build.ciRunId || null,
      queueLocation: build.queueLocation || null,
      workflowStatus: build.workflowStatus || null,
      ciRunType: build.ciRunType || null,
      taskId: build.taskId || task.id,
      
      // OPTIONAL fields (only in uploads table)
      isUsed: build.isUsed !== undefined ? build.isUsed : undefined,
      usedByTaskId: build.usedByTaskId || null,
    };
  });
}

/**
 * Get uploaded builds (staging builds) for a stage
 * Returns BuildInfo[] array from buildUploadsStaging table
 * These are builds uploaded but not yet consumed by tasks
 */
function getUploadedBuilds(releaseId, buildStage, db) {
  // Map buildStage to staging table stage format
  // Staging table uses: 'PRE_REGRESSION' for KICKOFF, 'REGRESSION' for REGRESSION, 'PRE_RELEASE' for PRE_RELEASE
  let stagingStage = null;
  if (buildStage === 'KICKOFF' || buildStage === 'PRE_REGRESSION' || buildStage === 'KICKOFF') {
    stagingStage = 'PRE_REGRESSION'; // Staging table uses PRE_REGRESSION for KICKOFF builds
  } else if (buildStage === 'REGRESSION') {
    stagingStage = 'REGRESSION';
  } else if (buildStage === 'PRE_RELEASE') {
    stagingStage = 'PRE_RELEASE';
  }

  if (!stagingStage) {
    return [];
  }

  // Get staging builds that are not used and match the stage
  const stagingBuilds = db.get('buildUploadsStaging')
    .filter({ 
      releaseId: releaseId, 
      isUsed: false,
      stage: stagingStage 
    })
    .value() || [];

  // Get tenantId from release or use default (mandatory field)
  const release = db.get('releases').find({ id: releaseId }).value();
  const defaultTenantId = release?.tenantId || releaseId?.split('-')[0] || '00000000-0000-0000-0000-000000000000';

  return stagingBuilds.map(build => {
    const platform = build.platform || 'ANDROID';
    
    // Map staging stage to response buildStage
    // API contract: buildStage must be one of: 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE'
    let responseBuildStage = 'PRE_RELEASE';
    if (stagingStage === 'PRE_REGRESSION') {
      responseBuildStage = 'KICKOFF'; // API contract uses 'KICKOFF', not 'KICKOFF'
    } else if (stagingStage === 'REGRESSION') {
      responseBuildStage = 'REGRESSION';
    } else if (stagingStage === 'PRE_RELEASE') {
      responseBuildStage = 'PRE_RELEASE';
    }
    
    // API contract: BuildInfo mandatory fields
    return {
      // MANDATORY fields (must always be present)
      id: build.id,
      tenantId: build.tenantId || defaultTenantId, // Must be string, never null
      releaseId: build.releaseId || releaseId, // Must be release.id (UUID), not release.releaseId
      platform: platform,
      buildStage: responseBuildStage, // Must be one of: 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE'
      artifactPath: build.artifactPath || null, // Mandatory field (can be null)
      internalTrackLink: build.internalTrackLink || null, // Mandatory field (can be null)
      testflightNumber: build.testflightNumber || null, // Mandatory field (can be null)
      createdAt: build.createdAt || new Date().toISOString(),
      updatedAt: build.updatedAt || build.createdAt || new Date().toISOString(),
      
      // OPTIONAL fields (only in builds table)
      buildType: build.buildType || 'MANUAL',
      buildUploadStatus: build.buildUploadStatus || 'UPLOADED',
      storeType: null,
      buildNumber: null,
      artifactVersionName: build.versionName || null,
      regressionId: build.regressionId || null,
      ciRunId: build.ciRunId || null,
      queueLocation: null,
      workflowStatus: null,
      ciRunType: null,
      taskId: null, // Staging builds don't have taskId yet
      
      // OPTIONAL fields (only in uploads table)
      isUsed: build.isUsed !== undefined ? build.isUsed : false,
      usedByTaskId: build.usedByTaskId || null,
    };
  });
}

/**
 * Map old task structure to new Task interface (backend contract)
 * Populates output with task-specific structure based on taskType
 */
function mapTaskToBackendContract(task, db = null, releaseId = null) {
  // Build output based on task type
  // First, check if output or externalData already exists with new structure (from generator)
  let output = null;
  
  // Support both output (new) and externalData (legacy) fields
  const existingData = task.output || task.externalData;
  
  // If output/externalData already exists and has the expected structure, use it
  if (existingData && typeof existingData === 'object' && existingData !== null && Object.keys(existingData).length > 0) {
    // Check if it's already in the new format (has expected keys for this task type)
    const hasNewStructure = 
      (task.taskType === 'FORK_BRANCH' && (existingData.branchName || existingData.branchUrl)) ||
      (task.taskType === 'CREATE_PROJECT_MANAGEMENT_TICKET' && (existingData.platforms || existingData.projectManagement)) ||
      (task.taskType === 'CREATE_TEST_SUITE' && (existingData.platforms || existingData.testManagement)) ||
      (task.taskType === 'RESET_TEST_SUITE' && (existingData.platforms || existingData.testManagement)) ||
      (task.taskType === 'CREATE_RC_TAG' && (existingData.tagName || existingData.tagUrl)) ||
      (task.taskType === 'CREATE_RELEASE_NOTES' && (existingData.tagUrl || existingData.notesUrl)) ||
      (task.taskType === 'CREATE_RELEASE_TAG' && (existingData.tagName || existingData.tagUrl)) ||
      (task.taskType === 'CREATE_FINAL_RELEASE_NOTES' && (existingData.tagUrl || existingData.notesUrl)) ||
      ((task.taskType === 'TRIGGER_PRE_REGRESSION_BUILDS' || 
        task.taskType === 'TRIGGER_REGRESSION_BUILDS' || 
        task.taskType === 'TRIGGER_TEST_FLIGHT_BUILD' || 
        task.taskType === 'CREATE_AAB_BUILD') && (existingData.platforms || existingData.workflowUrl));
    
    if (hasNewStructure) {
      // Flatten nested structures if needed
      if (existingData.projectManagement && existingData.projectManagement.platforms) {
        output = { platforms: existingData.projectManagement.platforms };
      } else if (existingData.testManagement && existingData.testManagement.platforms) {
        output = { platforms: existingData.testManagement.platforms };
      } else if (existingData.notesUrl && !existingData.tagUrl) {
        // Convert notesUrl to tagUrl for release notes tasks
        output = { tagUrl: existingData.notesUrl };
      } else {
        output = existingData;
      }
    }
  }
  
  // If no new structure found, build from old fields or generate default for COMPLETED tasks
  if (!output) {
    switch (task.taskType) {
      case 'FORK_BRANCH':
        if (task.branch || task.branchUrl || existingData?.branchName || existingData?.branchUrl) {
          output = {
            branchName: existingData?.branchName || task.branch || task.branchName || null,
            branchUrl: existingData?.branchUrl || task.branchUrl || (task.branch ? `https://github.com/org/repo/tree/${task.branch}` : null),
          };
        } else if (task.taskStatus === 'COMPLETED' && task.branch) {
          // Generate default for COMPLETED tasks even if no explicit data
          output = {
            branchName: task.branch,
            branchUrl: `https://github.com/org/repo/tree/${task.branch}`,
          };
        }
        break;

      case 'CREATE_PROJECT_MANAGEMENT_TICKET':
        // Support both old flat structure and new organized structure
        if (task.ticketUrl || task.platformTickets || existingData?.projectManagement || existingData?.platforms) {
          let platforms = [];
          if (existingData?.platforms) {
            platforms = existingData.platforms;
          } else if (existingData?.projectManagement?.platforms) {
            platforms = existingData.projectManagement.platforms;
          } else if (task.platformTickets) {
            platforms = task.platformTickets;
          } else if (task.ticketUrl) {
            // Single ticket - create platform entry if we have platform info
            platforms.push({
              platform: task.platform || 'ANDROID',
              ticketUrl: task.ticketUrl,
            });
          }
          if (platforms.length > 0) {
            output = {
              platforms: platforms.map(pt => ({
                platform: pt.platform || pt.platformName,
                ticketUrl: pt.ticketUrl || pt.url,
              })),
            };
          }
        } else if (task.taskStatus === 'COMPLETED' && task.externalId) {
          // Generate default for COMPLETED tasks
          output = {
            platforms: [
              { platform: 'ANDROID', ticketUrl: `https://company.atlassian.net/browse/${task.externalId}-ANDROID` },
              { platform: 'IOS', ticketUrl: `https://company.atlassian.net/browse/${task.externalId}-IOS` },
            ],
          };
        }
        break;

      case 'CREATE_TEST_SUITE':
        if (task.testSuiteUrl || task.testRunId || task.runLink || existingData?.testManagement || existingData?.platforms) {
          let platforms = [];
          if (existingData?.platforms) {
            platforms = existingData.platforms;
          } else if (existingData?.testManagement?.platforms) {
            platforms = existingData.testManagement.platforms;
          } else if (task.platformRuns) {
            platforms = task.platformRuns;
          } else if (task.runLink) {
            // Single run - create platform entry
            platforms.push({
              platform: task.platform || 'ANDROID',
              runId: task.testRunId || task.runId || 'RUN-001',
              runUrl: task.runLink || task.runUrl,
            });
          }
          if (platforms.length > 0) {
            output = {
              platforms: platforms.map(pr => ({
                platform: pr.platform || pr.platformName,
                runId: pr.runId || pr.testRunId,
                runUrl: pr.runUrl || pr.runLink,
              })),
            };
          }
        } else if (task.taskStatus === 'COMPLETED' && task.externalId) {
          // Generate default for COMPLETED tasks
          output = {
            platforms: [
              { platform: 'ANDROID', runId: 'RUN-ANDROID-001', runUrl: `https://testmanagement.company.com/runs/RUN-ANDROID-001` },
              { platform: 'IOS', runId: 'RUN-IOS-001', runUrl: `https://testmanagement.company.com/runs/RUN-IOS-001` },
            ],
          };
        }
        break;

      case 'RESET_TEST_SUITE':
        if (task.testSuiteUrl || task.testRunId || task.runLink || existingData?.testManagement || existingData?.platforms) {
          let platforms = [];
          if (existingData?.platforms) {
            platforms = existingData.platforms;
          } else if (existingData?.testManagement?.platforms) {
            platforms = existingData.testManagement.platforms;
          } else if (task.platformRuns) {
            platforms = task.platformRuns;
          } else if (task.runLink) {
            platforms.push({
              platform: task.platform || 'ANDROID',
              runId: task.testRunId || task.runId || 'RUN-002',
              runUrl: task.runLink || task.runUrl,
            });
          }
          if (platforms.length > 0) {
            output = {
              platforms: platforms.map(pr => ({
                platform: pr.platform || pr.platformName,
                runId: pr.runId || pr.testRunId,
                runUrl: pr.runUrl || pr.runLink,
              })),
            };
          }
        } else if (task.taskStatus === 'COMPLETED' && task.externalId) {
          // Generate default for COMPLETED tasks
          output = {
            platforms: [
              { platform: 'ANDROID', runId: 'RUN-ANDROID-002', runUrl: `https://testmanagement.company.com/runs/RUN-ANDROID-002` },
              { platform: 'IOS', runId: 'RUN-IOS-002', runUrl: `https://testmanagement.company.com/runs/RUN-IOS-002` },
            ],
          };
        }
        break;

      case 'CREATE_RC_TAG':
        if (task.tag || task.tagUrl || task.tagName || existingData?.tagName || existingData?.tagUrl) {
          output = {
            tagName: existingData?.tagName || task.tagName || task.tag || 'v1.0.0-RC1',
            tagUrl: existingData?.tagUrl || task.tagUrl || (task.tag ? `https://github.com/org/repo/releases/tag/${task.tag}` : null),
          };
        } else if (task.taskStatus === 'COMPLETED') {
          // Generate default for COMPLETED tasks
          output = {
            tagName: 'v1.0.0-RC1',
            tagUrl: 'https://github.com/org/repo/releases/tag/v1.0.0-RC1',
          };
        }
        break;

      case 'CREATE_RELEASE_NOTES':
        if (task.notesUrl || task.tagUrl || existingData?.tagUrl || existingData?.notesUrl) {
          output = {
            tagUrl: existingData?.tagUrl || task.tagUrl || task.notesUrl || existingData?.notesUrl || null,
          };
        } else if (task.taskStatus === 'COMPLETED') {
          // Generate default for COMPLETED tasks
          output = {
            tagUrl: 'https://github.com/org/repo/releases/tag/v1.0.0-rc1',
          };
        }
        break;

      case 'CREATE_RELEASE_TAG':
        if (task.tag || task.tagUrl || task.tagName || existingData?.tagName || existingData?.tagUrl) {
          output = {
            tagName: existingData?.tagName || task.tagName || task.tag || 'v1.0.0',
            tagUrl: existingData?.tagUrl || task.tagUrl || (task.tag ? `https://github.com/org/repo/releases/tag/${task.tag}` : null),
          };
        } else if (task.taskStatus === 'COMPLETED') {
          // Generate default for COMPLETED tasks
          output = {
            tagName: 'v1.0.0',
            tagUrl: 'https://github.com/org/repo/releases/tag/v1.0.0',
          };
        }
        break;

      case 'CREATE_FINAL_RELEASE_NOTES':
        if (task.notesUrl || task.tagUrl || existingData?.tagUrl || existingData?.notesUrl) {
          output = {
            tagUrl: existingData?.tagUrl || task.tagUrl || task.notesUrl || existingData?.notesUrl || null,
          };
        } else if (task.taskStatus === 'COMPLETED') {
          // Generate default for COMPLETED tasks
          output = {
            tagUrl: 'https://github.com/org/repo/releases/tag/v1.0.0',
          };
        }
        break;

      case 'TRIGGER_PRE_REGRESSION_BUILDS':
      case 'TRIGGER_REGRESSION_BUILDS':
      case 'TRIGGER_TEST_FLIGHT_BUILD':
      case 'CREATE_AAB_BUILD':
        // Build tasks now always have a platforms array for jobUrls
        const platforms = task.builds?.map(b => ({
          platform: b.platform,
          jobUrl: `https://ci.company.com/job/${task.id}-${b.platform}` // Example URL
        })) || [];
        
        if (platforms.length > 0) {
          output = { platforms };
        } else if (task.taskStatus === 'IN_PROGRESS' || task.taskStatus === 'AWAITING_CALLBACK') {
          // Generate default URLs for running build tasks if no specific builds yet
          // Assuming expected platforms can be derived or passed
          const defaultPlatforms = ['ANDROID', 'IOS'].map(p => ({
            platform: p,
            jobUrl: `https://ci.company.com/job/${task.id}-${p}`
          }));
          output = { platforms: defaultPlatforms };
        } else if (existingData?.platforms) {
          // Use existing platforms array if present
          output = { platforms: existingData.platforms };
        }
        break;

      default:
        // For other task types or error cases, preserve existing output/externalData or use legacy structure
        if (existingData && typeof existingData === 'object') {
          output = existingData;
        } else {
          const legacyData = {};
          if (task.branchUrl) legacyData.branchUrl = task.branchUrl;
          if (task.commitId) legacyData.commitId = task.commitId;
          if (task.ticketUrl) legacyData.ticketUrl = task.ticketUrl;
          if (task.runLink) legacyData.runLink = task.runLink;
          if (task.tag) legacyData.tag = task.tag;
          if (task.notesUrl) legacyData.notesUrl = task.notesUrl;
          if (task.error) legacyData.error = task.error;
          if (Object.keys(legacyData).length > 0) {
            output = legacyData;
          }
        }
        break;
    }
  }

  // Get builds for this task if db and releaseId are provided
  // API contract: builds field must always be present, empty array if no builds
  const builds = db && releaseId ? getBuildsForTask(task, db, releaseId) : [];

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
    output: output && Object.keys(output).length > 0 ? output : null, // API contract: output field (not externalData)
    builds: builds || [], // API contract: Always present, empty array if no builds
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

        // Get uploaded builds for KICKOFF stage
        const uploadedBuilds = getUploadedBuilds(releaseUuid, 'KICKOFF', db);

        return res.json({
          success: true,
          stage: 'KICKOFF',
          releaseId: release.id, // Return the UUID id
          tasks: tasks.map(task => mapTaskToBackendContract(task, db, releaseUuid)),
          stageStatus: release.cronJob?.stage1Status || release.stage1Status || 'PENDING',
          uploadedBuilds: uploadedBuilds,
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

        // NOTE: Cycle start logic (handled by backend cron):
        // 1. Cycle starts only when ALL required builds are uploaded for upcoming slot
        // 2. If builds are uploaded after slot time has passed, cycle starts immediately when all builds are uploaded
        // 3. When cycle starts, builds are consumed (moved from buildUploadsStaging to builds table with taskId)
        // 4. Tasks in cycle then pick builds from task.builds (consumed builds)
        // 5. uploadedBuilds are only visible when cycle hasn't started (currentCycle is null or DONE)

        if (!release) {
          return res.status(404).json({
            success: false,
            error: 'Release not found',
          });
        }

        // Get uploaded builds for upcoming slot (only when cycle hasn't started)
        // uploadedBuilds are only visible when:
        // 1. No current cycle exists, OR
        // 2. Current cycle is DONE (completed)
        // When cycle is IN_PROGRESS, builds are consumed and in task.builds
        const uploadedBuildsForUpcomingSlot = getUploadedBuilds(releaseUuid, 'REGRESSION', db);
        
        // Only return uploadedBuilds if cycle hasn't started (currentCycle is null or DONE)
        // If cycle is IN_PROGRESS, builds are consumed and should be in task.builds
        const cycleHasStarted = currentCycle && (
          currentCycle.status === 'IN_PROGRESS' || 
          currentCycle.status === 'ACTIVE' ||
          currentCycle.status === 'NOT_STARTED'
        );
        
        const uploadedBuilds = cycleHasStarted ? [] : uploadedBuildsForUpcomingSlot;

        // Map cycles to new structure
        const mappedCycles = allCycles.map(cycle => mapCycleToBackendContract(cycle, allCycles));

        // Determine approval status
        // Calculate upcomingSlot first (needed for cyclesCompleted check)
        const upcomingSlot = (() => {
          // If current cycle is DONE, show next upcoming slot
          if (currentCycle && (currentCycle.status === 'DONE' || currentCycle.status === 'COMPLETED')) {
            // Calculate next slot (7 days after current cycle completion)
            const nextSlotDate = currentCycle.completedAt 
              ? new Date(new Date(currentCycle.completedAt).getTime() + 7 * 24 * 60 * 60 * 1000)
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            return [{
              date: nextSlotDate.toISOString(),
              config: {},
            }];
          }
          // If no cycles exist yet, show first upcoming slot
          if (allCycles.length === 0) {
            return [{
              date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              config: {},
            }];
          }
          // If cycle is IN_PROGRESS, no upcoming slot (cycle has started)
          return null;
        })();

        // Check if all cycles are completed (DONE or COMPLETED)
        const allCyclesCompleted = allCycles.length > 0 && allCycles.every(c => 
          c.status === 'COMPLETED' || c.status === 'DONE'
        );
        
        // Check if there are no active cycles
        const noActiveCycles = !allCycles.some(c => 
          c.status === 'IN_PROGRESS' || c.status === 'ACTIVE' || c.status === 'NOT_STARTED'
        );
        
        // Check if there are no upcoming slots
        const noUpcomingSlots = !upcomingSlot || upcomingSlot.length === 0;

        // cyclesCompleted = No active cycles AND no upcoming slots
        // According to API contract: "No active cycles AND no upcoming slots"
        const cyclesCompleted = noActiveCycles && noUpcomingSlots;

        // Check test management status (check CREATE_TEST_SUITE task)
        const testSuiteTask = tasks.find(t => t.taskType === 'CREATE_TEST_SUITE');
        const testManagementPassed = testSuiteTask?.taskStatus === 'COMPLETED' || false;

        // Check cherry pick status (mock: check if cycles are completed)
        // In real implementation, this would call the cherry pick status API
        const cherryPickStatusOk = cyclesCompleted && noActiveCycles;

        const allRequirementsMet = testManagementPassed && cherryPickStatusOk && cyclesCompleted;

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
              cyclesCompleted: cyclesCompleted, // Already includes noActiveCycles && noUpcomingSlots
            },
          },
          uploadedBuilds: uploadedBuilds,  // Only when cycle hasn't started
          upcomingSlot: upcomingSlot,
        });
      }

      if (stage === 'PRE_RELEASE') {
        // Try to find release by both id (UUID) and releaseId (user-facing)
        let release = db.get('releases').find({ id: releaseId }).value();
        if (!release) {
          release = db.get('releases').find({ releaseId: releaseId }).value();
        }
        
        // Tasks use the release's UUID id, not the user-facing releaseId
        const releaseUuid = release?.id || releaseId;
        const tasks = db.get('releaseTasks')
          .filter({ releaseId: releaseUuid, taskStage: 'PRE_RELEASE' })
          .value() || [];

        console.log('[Mock Server] PRE_RELEASE stage lookup:', { 
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

        // Get uploaded builds for PRE_RELEASE stage
        const uploadedBuilds = getUploadedBuilds(releaseUuid, 'PRE_RELEASE', db);

        return res.json({
          success: true,
          stage: 'PRE_RELEASE', // Return PRE_RELEASE as the stage
          releaseId: release.id, // Return the UUID id
          tasks: tasks.map(task => mapTaskToBackendContract(task, db, releaseUuid)),
          stageStatus: release.stage3Status || 'PENDING',
          uploadedBuilds: uploadedBuilds,
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
    // Stage can be: 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE' (TaskStage)
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

      const stage = stageMatch[1]; // TaskStage: 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE'
      const platform = stageMatch[2]; // Platform: 'ANDROID' | 'IOS' | 'WEB'

      // Extract file from multer (multer.any() puts files in req.files array)
      // Backend expects 'artifact' field name
      const file = req.files?.find(f => f.fieldname === 'artifact') || req.file;
      
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
        stage === 'PRE_RELEASE' ? 'PRE_RELEASE' :
        stage; // Fallback

      // For PUT requests: Find and remove existing unused build for this platform/stage
      // This ensures we replace instead of adding duplicates (API contract: "Creates/updates entry")
      if (method === 'PUT') {
        const existingBuilds = db.get('buildUploadsStaging')
          .filter({ 
            releaseId, 
            stage: buildUploadStage, 
            platform,
            isUsed: false 
          })
          .value() || [];
        
        // Remove all existing unused builds for this platform/stage (should be only one, but handle multiple)
        existingBuilds.forEach(existingBuild => {
          db.get('buildUploadsStaging')
            .remove({ id: existingBuild.id })
            .write();
        });
      }

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
          stage: buildUploadStage === 'PRE_REGRESSION' ? 'KICKOFF' : buildUploadStage === 'REGRESSION' ? 'REGRESSION' : 'PRE_RELEASE',
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

      const stage = stageMatch[1]; // TaskStage: 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE'
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
        stage === 'PRE_RELEASE' ? 'PRE_RELEASE' :
        stage;

      // Remove existing unused iOS builds for this stage (when changing build)
      // This ensures we replace instead of adding duplicates
      const existingBuilds = db.get('buildUploadsStaging')
        .filter({ 
          releaseId, 
          stage: buildUploadStage, 
          platform: 'IOS',
          isUsed: false 
        })
        .value() || [];
      
      // Remove all existing unused iOS builds for this stage
      existingBuilds.forEach(existingBuild => {
        db.get('buildUploadsStaging')
          .remove({ id: existingBuild.id })
          .write();
      });

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
          stage: buildUploadStage === 'PRE_REGRESSION' ? 'KICKOFF' : buildUploadStage === 'REGRESSION' ? 'REGRESSION' : 'PRE_RELEASE',
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
          stage === 'PRE_REGRESSION' ? 'KICKOFF' :
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
        buildStage: artifact.buildStage || (artifact.stage === 'PRE_REGRESSION' ? 'KICKOFF' : artifact.stage === 'REGRESSION' ? 'REGRESSION' : 'PRE_RELEASE'),
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
      // For testing: If release has a flag or specific state, make it deterministic
      // Otherwise, use random but favor OK status when cycles are completed
      const allCycles = db.get('regressionCycles').filter({ releaseId }).value() || [];
      const allCyclesCompleted = allCycles.length > 0 && allCycles.every(c => 
        c.status === 'COMPLETED' || c.status === 'DONE'
      );
      
      // If all cycles are completed, cherry picks should be OK (false) for approval testing
      // Otherwise, random but with 30% chance of cherry picks
      const cherryPickAvailable = !allCyclesCompleted && Math.random() > 0.7; // 30% chance of cherry picks when cycles not completed
      
      return res.json({
        success: true,
        releaseId,
        cherryPickAvailable: cherryPickAvailable,
      });
    }

    // ============================================================================
    // APPROVAL APIs
    // ============================================================================

    // POST /api/v1/tenants/:tenantId/releases/:releaseId/trigger-pre-release
    // Also handle legacy path: /api/v1/tenants/:tenantId/releases/:releaseId/stages/regression/approve
    if (method === 'POST' && (path.includes('/trigger-pre-release') || path.includes('/stages/regression/approve'))) {
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
        message: 'Regression stage approved and Pre-Release stage triggered successfully',
        releaseId,
        approvedAt: new Date().toISOString(),
        approvedBy: body.approvedBy || 'user-123',
        nextStage: 'PRE_RELEASE',
      });
    }

    // POST /api/v1/tenants/:tenantId/releases/:releaseId/stages/pre-release/complete
    if (method === 'POST' && path.includes('/stages/pre-release/complete')) {
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
        message: 'Pre-release stage completed',
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
