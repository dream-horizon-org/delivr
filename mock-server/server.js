/**
 * Mock API Server
 * 
 * Simulates the Delivr backend API for frontend development
 * Uses json-server with custom middleware for complex scenarios
 * 
 * Usage:
 *   pnpm run mock-server
 * 
 * Then frontend connects to http://localhost:4000
 */

import jsonServer from 'json-server';
import path from 'path';
import { fileURLToPath } from 'url';
import distributionMiddleware from './middleware/distribution.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create server
const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'data', 'db.json'));
const middlewares = jsonServer.defaults();

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Default middlewares (CORS, logger, static, etc.)
server.use(middlewares);

// Body parser
server.use(jsonServer.bodyParser);

// Request logger
server.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Custom distribution middleware (handles complex scenarios)
server.use(distributionMiddleware);

// ============================================================================
// CUSTOM ROUTES
// ============================================================================

// Helper function to transform release to backend format
function transformRelease(release, tenantId) {
  return {
    id: release.id,
    releaseId: release.id,
    releaseConfigId: release.releaseConfigId || null,
    tenantId: tenantId,
    type: release.type || 'PLANNED',
    status: release.status || 'IN_PROGRESS',
    branch: release.branch || `release/${release.version}`,
    baseBranch: release.baseBranch || 'main',
    baseReleaseId: null,
    platformTargetMappings: release.platforms?.map(p => ({ platform: p })) || [],
    kickOffReminderDate: null,
    kickOffDate: release.kickOffDate || release.createdAt,
    targetReleaseDate: release.targetReleaseDate || null,
    releaseDate: release.status === 'RELEASED' ? release.updatedAt : null,
    hasManualBuildUpload: true,
    customIntegrationConfigs: null,
    preCreatedBuilds: null,
    createdBy: 'mock-user',
    lastUpdatedBy: 'mock-user',
    createdAt: release.createdAt,
    updatedAt: release.updatedAt,
    regressionComplete: release.regressionComplete || false,
    tasks: release.tasks || [],
  };
}

/**
 * GET /tenants/:tenantId/releases/:releaseId
 * Get single release by ID
 */
server.get('/tenants/:tenantId/releases/:releaseId', (req, res) => {
  const { tenantId, releaseId } = req.params;
  const db = router.db;
  const release = db.get('releases').find({ id: releaseId }).value();
  
  if (!release) {
    return res.status(404).json({
      success: false,
      error: 'Release not found',
    });
  }
  
  res.json({
    success: true,
    release: transformRelease(release, tenantId),
  });
});

/**
 * GET /tenants/:tenantId/releases
 * List all releases for a tenant (matches ReleaseManagement service)
 */
server.get('/tenants/:tenantId/releases', (req, res) => {
  const db = router.db;
  const releases = db.get('releases').value() || [];
  
  // Transform to match backend response format
  const transformedReleases = releases.map(release => transformRelease(release, req.params.tenantId));
  
  res.json({
    success: true,
    releases: transformedReleases,
  });
});

/**
 * GET /tenants/:tenantId/release-configs
 * List release configs (mock to prevent errors)
 */
server.get('/tenants/:tenantId/release-configs', (req, res) => {
  res.json({
    success: true,
    data: [],
  });
});

/**
 * GET /api/v1/tenants/:tenantId/release-config
 * List release configs (alternate path - for client-side calls)
 */
server.get('/api/v1/tenants/:tenantId/release-config', (req, res) => {
  res.json({
    success: true,
    data: [],
  });
});

/**
 * GET /api/v1/releases/:releaseId/builds
 * Get all builds for a release
 */
server.get('/api/v1/releases/:releaseId/builds', (req, res) => {
  const { releaseId } = req.params;
  const db = router.db; // Access lowdb instance
  
  const builds = db.get('builds')
    .filter({ releaseId })
    .value();
  
  const summary = {
    android: {
      exists: builds.some(b => b.platform === 'ANDROID'),
      ready: builds.some(b => b.platform === 'ANDROID' && b.buildUploadStatus === 'UPLOADED'),
      status: builds.find(b => b.platform === 'ANDROID')?.buildUploadStatus || 'PENDING',
    },
    ios: {
      exists: builds.some(b => b.platform === 'IOS'),
      ready: builds.some(b => b.platform === 'IOS' && b.buildUploadStatus === 'UPLOADED'),
      status: builds.find(b => b.platform === 'IOS')?.buildUploadStatus || 'PENDING',
    },
  };
  
  res.json({
    success: true,
    data: {
      builds,
      summary,
    },
  });
});

/**
 * GET /api/v1/releases/:releaseId/pm-status
 * Get PM approval status
 */
server.get('/api/v1/releases/:releaseId/pm-status', (req, res) => {
  const { releaseId } = req.params;
  const db = router.db;
  
  const pmApproval = db.get('pmApprovals')
    .find({ releaseId })
    .value();
  
  if (pmApproval) {
    res.json({
      success: true,
      data: pmApproval,
    });
  } else {
    res.json({
      success: true,
      data: {
        hasPmIntegration: false,
        approved: false,
        requiresManualApproval: true,
        approver: 'RELEASE_LEAD',
      },
    });
  }
});

/**
 * GET /api/v1/releases/:releaseId/extra-commits
 * Check for extra commits
 */
server.get('/api/v1/releases/:releaseId/extra-commits', (req, res) => {
  const { releaseId } = req.params;
  const db = router.db;
  
  const extraCommitsData = db.get('extraCommits')
    .find({ releaseId })
    .value();
  
  if (extraCommitsData) {
    res.json({
      success: true,
      data: extraCommitsData,
    });
  } else {
    res.json({
      success: true,
      data: {
        hasExtraCommits: false,
        releaseBranch: 'release/2.5.0',
        lastRegressionCommit: 'abc123',
        currentHeadCommit: 'abc123',
        commitsAhead: 0,
      },
    });
  }
});

/**
 * POST /api/v1/releases/:releaseId/approve
 * Manual approval
 */
server.post('/api/v1/releases/:releaseId/approve', (req, res) => {
  const { releaseId } = req.params;
  
  res.json({
    success: true,
    data: {
      releaseId,
      approved: true,
      approvedBy: {
        id: 'user_1',
        name: 'Release Lead',
        role: 'RELEASE_LEAD',
      },
      approvedAt: new Date().toISOString(),
      comments: req.body.approverComments || null,
    },
  });
});

// NOTE: No retry endpoint for CICD builds
// CICD builds are auto-triggered by Release Orchestrator
// If CI build fails, user retries via their CI system (Jenkins, GitHub Actions, etc.)
// We just provide a link to the CI run URL (ciRunUrl) for the user to retry there

/**
 * POST /api/v1/releases/:releaseId/builds/upload-aab
 * Upload Android AAB (manual mode)
 */
server.post('/api/v1/releases/:releaseId/builds/upload-aab', (req, res) => {
  const { releaseId } = req.params;
  const db = router.db;
  
  // Create a new build entry
  const newBuild = {
    id: `build_android_${Date.now()}`,
    releaseId,
    platform: 'ANDROID',
    buildType: 'PRODUCTION',
    versionName: req.body.versionName || '1.0.0',
    versionCode: req.body.versionCode || '100',
    artifactPath: `s3://delivr-builds/${releaseId}/android.aab`,
    internalTrackLink: 'https://play.google.com/apps/internaltest/mock',
    checksum: 'sha256:mock123',
    buildStrategy: 'MANUAL',
    buildUploadStatus: 'UPLOADED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Add to database
  db.get('builds').push(newBuild).write();
  
  res.json({
    success: true,
    data: {
      build: newBuild,
    },
  });
});

/**
 * POST /api/v1/releases/:releaseId/builds/verify-testflight
 * Verify iOS TestFlight build
 */
server.post('/api/v1/releases/:releaseId/builds/verify-testflight', (req, res) => {
  const { releaseId } = req.params;
  const { buildNumber, expectedVersion } = req.body;
  const db = router.db;
  
  // Create a new build entry
  const newBuild = {
    id: `build_ios_${Date.now()}`,
    releaseId,
    platform: 'IOS',
    buildType: 'TESTFLIGHT',
    versionName: expectedVersion || '1.0.0',
    versionCode: buildNumber || '100',
    testflightNumber: buildNumber,
    buildStrategy: 'MANUAL',
    buildUploadStatus: 'UPLOADED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Add to database
  db.get('builds').push(newBuild).write();
  
  res.json({
    success: true,
    data: {
      build: newBuild,
      verified: true,
    },
  });
});

/**
 * GET /api/v1/releases/:releaseId/builds/:buildId
 * Get single build details (pre-release builds only)
 */
server.get('/api/v1/releases/:releaseId/builds/:buildId', (req, res) => {
  const { releaseId, buildId } = req.params;
  const db = router.db;
  
  const build = db.get('builds')
    .find({ id: buildId, releaseId })
    .value();
  
  if (build) {
    res.json({
      success: true,
      data: build,
    });
  } else {
    res.status(404).json({
      success: false,
      error: {
        code: 'BUILD_NOT_FOUND',
        message: 'Build not found',
      },
    });
  }
});

/**
 * GET /api/v1/releases/:releaseId/distribution/status
 * Get distribution status (with optional platform filter)
 */
server.get('/api/v1/releases/:releaseId/distribution/status', (req, res) => {
  const { releaseId } = req.params;
  const { platform } = req.query;
  const db = router.db;
  
  // Get all submissions for this release
  const submissions = db.get('submissions')
    .filter({ releaseId })
    .value();
  
  // Build per-platform status
  const platforms = {};
  
  const androidSubmission = submissions.find(s => s.platform === 'ANDROID');
  const iosSubmission = submissions.find(s => s.platform === 'IOS');
  
  if ((!platform || platform === 'ANDROID') && androidSubmission) {
    platforms.android = {
      submitted: true,
      submissionId: androidSubmission.id,
      status: androidSubmission.submissionStatus,
      exposurePercent: androidSubmission.exposurePercent,
      canRetry: androidSubmission.submissionStatus === 'REJECTED',
      error: null,
    };
  }
  
  if ((!platform || platform === 'IOS') && iosSubmission) {
    platforms.ios = {
      submitted: true,
      submissionId: iosSubmission.id,
      status: iosSubmission.submissionStatus,
      exposurePercent: iosSubmission.exposurePercent,
      canRetry: iosSubmission.submissionStatus === 'REJECTED',
      error: null,
    };
  }
  
  // Calculate overall progress
  const platformCount = Object.keys(platforms).length;
  const totalProgress = Object.values(platforms).reduce((sum, p) => {
    if (p.status === 'RELEASED') return sum + 100;
    if (p.status === 'APPROVED_RELEASED') return sum + p.exposurePercent;
    if (p.status === 'BUILD_SUBMITTED') return sum + 10;
    return sum;
  }, 0);
  const overallProgress = platformCount > 0 ? totalProgress / platformCount : 0;
  
  res.json({
    success: true,
    data: {
      releaseId,
      releaseVersion: '2.5.0',
      releaseStatus: submissions.length > 0 ? 'BUILDS_SUBMITTED' : 'PRE_RELEASE',
      platforms,
      isComplete: Object.values(platforms).every(p => p.status === 'RELEASED'),
      overallProgress: Math.round(overallProgress * 10) / 10,
      startedAt: submissions.length > 0 ? submissions[0].submittedAt : null,
      completedAt: null,
    },
  });
});

/**
 * GET /api/v1/releases/:releaseId/stores
 * Get stores configured for this release
 */
server.get('/api/v1/releases/:releaseId/stores', (req, res) => {
  const { releaseId } = req.params;
  const db = router.db;
  
  // In a real implementation, this would:
  // 1. Get release by releaseId
  // 2. Get release.releaseConfigId
  // 3. Get releaseConfig by releaseConfigId
  // 4. Get store integrations by androidStoreIntegrationId and iosStoreIntegrationId
  
  // For mock, return pre-configured stores
  const storeIntegrations = db.get('storeIntegrations').value();
  
  res.json({
    success: true,
    data: {
      releaseId,
      stores: storeIntegrations || [],
    },
  });
});

/**
 * POST /api/v1/releases/:releaseId/distribute
 * Submit release to stores (main entry point)
 */
server.post('/api/v1/releases/:releaseId/distribute', (req, res) => {
  const { releaseId } = req.params;
  const { platforms, android, ios } = req.body;
  const db = router.db;
  
  const results = [];
  const now = new Date().toISOString();
  
  // Process Android submission
  if (platforms?.includes('ANDROID') && android) {
    const androidSubmission = {
      id: `sub_android_${Date.now()}`,
      releaseId,
      platform: 'ANDROID',
      storeType: 'PLAY_STORE',
      versionName: android.versionName || '1.0.0',
      versionCode: android.versionCode || '100',
      submissionStatus: 'BUILD_SUBMITTED',
      exposurePercent: android.initialRolloutPercent || 10,
      track: android.track || 'PRODUCTION',
      releaseNotes: android.releaseNotes || '',
      submittedAt: now,
      availableActions: [],
      createdAt: now,
      updatedAt: now,
    };
    db.get('submissions').push(androidSubmission).write();
    results.push({ platform: 'ANDROID', success: true, submissionId: androidSubmission.id });
  }
  
  // Process iOS submission
  if (platforms?.includes('IOS') && ios) {
    const iosSubmission = {
      id: `sub_ios_${Date.now()}`,
      releaseId,
      platform: 'IOS',
      storeType: 'APP_STORE',
      versionName: ios.versionName || '1.0.0',
      versionCode: ios.versionCode || '100',
      submissionStatus: 'BUILD_SUBMITTED',
      exposurePercent: 0,
      track: 'PRODUCTION',
      releaseNotes: ios.releaseNotes || '',
      submittedAt: now,
      availableActions: [],
      createdAt: now,
      updatedAt: now,
    };
    db.get('submissions').push(iosSubmission).write();
    results.push({ platform: 'IOS', success: true, submissionId: iosSubmission.id });
  }
  
  // Update release status
  db.get('releases').find({ id: releaseId }).assign({ status: 'DISTRIBUTING', updatedAt: now }).write();
  
  res.json({
    success: true,
    data: {
      releaseId,
      platforms: results,
      submittedAt: now,
    },
  });
});

/**
 * GET /api/v1/releases/:releaseId/submissions
 * List submissions for release
 */
server.get('/api/v1/releases/:releaseId/submissions', (req, res) => {
  const { releaseId } = req.params;
  const db = router.db;
  
  const submissions = db.get('submissions')
    .filter({ releaseId })
    .value();
  
  res.json({
    success: true,
    data: {
      submissions,
    },
  });
});

/**
 * GET /api/v1/submissions/:submissionId
 * Get single submission details
 */
server.get('/api/v1/submissions/:submissionId', (req, res) => {
  const { submissionId } = req.params;
  const db = router.db;
  
  const submission = db.get('submissions').find({ id: submissionId }).value();
  
  if (submission) {
    res.json({
      success: true,
      data: submission,
    });
  } else {
    res.status(404).json({
      success: false,
      error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' },
    });
  }
});

/**
 * POST /api/v1/submissions/:submissionId/retry
 * Retry failed submission
 */
server.post('/api/v1/submissions/:submissionId/retry', (req, res) => {
  const { submissionId } = req.params;
  const db = router.db;
  
  const submission = db.get('submissions').find({ id: submissionId });
  if (submission.value()) {
    submission.assign({ 
      submissionStatus: 'BUILD_SUBMITTED',
      updatedAt: new Date().toISOString(),
    }).write();
    
    res.json({
      success: true,
      data: submission.value(),
    });
  } else {
    res.status(404).json({
      success: false,
      error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' },
    });
  }
});

/**
 * PATCH /api/v1/submissions/:submissionId/rollout
 * Update rollout percentage
 */
server.patch('/api/v1/submissions/:submissionId/rollout', (req, res) => {
  const { submissionId } = req.params;
  const { exposurePercent } = req.body;
  const db = router.db;
  
  const submission = db.get('submissions').find({ id: submissionId });
  if (submission.value()) {
    const previousPercent = submission.value().exposurePercent;
    submission.assign({ 
      exposurePercent,
      submissionStatus: exposurePercent >= 100 ? 'RELEASED' : 'APPROVED_RELEASED',
      availableActions: exposurePercent >= 100 ? [] : ['UPDATE_ROLLOUT', 'PAUSE', 'HALT'],
      updatedAt: new Date().toISOString(),
    }).write();
    
    res.json({
      success: true,
      data: {
        submissionId,
        previousExposurePercent: previousPercent,
        newExposurePercent: exposurePercent,
        status: submission.value().submissionStatus,
      },
    });
  } else {
    res.status(404).json({
      success: false,
      error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' },
    });
  }
});

/**
 * POST /api/v1/submissions/:submissionId/rollout/pause
 * Pause rollout
 */
server.post('/api/v1/submissions/:submissionId/rollout/pause', (req, res) => {
  const { submissionId } = req.params;
  const db = router.db;
  
  const submission = db.get('submissions').find({ id: submissionId });
  if (submission.value()) {
    submission.assign({ 
      submissionStatus: 'PAUSED',
      availableActions: ['RESUME', 'HALT'],
      updatedAt: new Date().toISOString(),
    }).write();
    
    res.json({
      success: true,
      data: {
        submissionId,
        status: 'PAUSED',
        pausedAt: new Date().toISOString(),
      },
    });
  } else {
    res.status(404).json({
      success: false,
      error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' },
    });
  }
});

/**
 * POST /api/v1/submissions/:submissionId/rollout/resume
 * Resume rollout
 */
server.post('/api/v1/submissions/:submissionId/rollout/resume', (req, res) => {
  const { submissionId } = req.params;
  const db = router.db;
  
  const submission = db.get('submissions').find({ id: submissionId });
  if (submission.value()) {
    submission.assign({ 
      submissionStatus: 'APPROVED_RELEASED',
      availableActions: ['UPDATE_ROLLOUT', 'PAUSE', 'HALT'],
      updatedAt: new Date().toISOString(),
    }).write();
    
    res.json({
      success: true,
      data: {
        submissionId,
        status: 'APPROVED_RELEASED',
        resumedAt: new Date().toISOString(),
      },
    });
  } else {
    res.status(404).json({
      success: false,
      error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' },
    });
  }
});

/**
 * POST /api/v1/submissions/:submissionId/rollout/halt
 * Emergency halt
 */
server.post('/api/v1/submissions/:submissionId/rollout/halt', (req, res) => {
  const { submissionId } = req.params;
  const { reason, severity } = req.body;
  const db = router.db;
  
  const submission = db.get('submissions').find({ id: submissionId });
  if (submission.value()) {
    submission.assign({ 
      submissionStatus: 'HALTED',
      haltReason: reason,
      haltSeverity: severity || 'HIGH',
      availableActions: [],
      updatedAt: new Date().toISOString(),
    }).write();
    
    res.json({
      success: true,
      data: {
        submissionId,
        status: 'HALTED',
        haltedAt: new Date().toISOString(),
        reason,
        severity,
      },
    });
  } else {
    res.status(404).json({
      success: false,
      error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' },
    });
  }
});

/**
 * GET /api/v1/submissions/:submissionId/status
 * Poll submission status (lightweight)
 */
server.get('/api/v1/submissions/:submissionId/status', (req, res) => {
  const { submissionId } = req.params;
  const db = router.db;
  
  const submission = db.get('submissions')
    .find({ id: submissionId })
    .value();
  
  if (submission) {
    res.json({
      success: true,
      data: {
        submissionId,
        submissionStatus: submission.submissionStatus,
        exposurePercent: submission.exposurePercent,
        updatedAt: submission.updatedAt,
      },
    });
  } else {
    res.status(404).json({
      success: false,
      error: {
        code: 'SUBMISSION_NOT_FOUND',
        message: 'Submission not found',
      },
    });
  }
});

/**
 * GET /api/v1/submissions/:submissionId/history
 * Get submission history
 */
server.get('/api/v1/submissions/:submissionId/history', (req, res) => {
  const { submissionId } = req.params;
  
  res.json({
    success: true,
    data: {
      submissionId,
      events: [
        {
          id: 'event_1',
          eventType: 'SUBMITTED',
          newState: { status: 'BUILD_SUBMITTED' },
          timestamp: new Date().toISOString(),
        },
      ],
      pagination: {
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
    },
  });
});

/**
 * GET /api/v1/distributions
 * List all active distributions across all releases
 * This aggregates release + submission data
 */
server.get('/api/v1/distributions', (req, res) => {
  const db = router.db;
  
  // Get all releases that have submissions or are in distribution-relevant status
  const releases = db.get('releases').value() || [];
  const submissions = db.get('submissions').value() || [];
  
  // Group submissions by releaseId
  const submissionsByRelease = submissions.reduce((acc, sub) => {
    if (!acc[sub.releaseId]) acc[sub.releaseId] = [];
    acc[sub.releaseId].push(sub);
    return acc;
  }, {});
  
  // Build distribution entries
  const distributions = releases
    .filter(release => {
      // Include releases that have submissions OR are in PRE_RELEASE/BUILDS_SUBMITTED status
      const hasSubmissions = submissionsByRelease[release.id]?.length > 0;
      const isDistributionRelevant = ['PRE_RELEASE', 'BUILDS_SUBMITTED', 'RELEASED', 'HALTED'].includes(release.status);
      return hasSubmissions || isDistributionRelevant;
    })
    .map(release => {
      const releaseSubmissions = submissionsByRelease[release.id] || [];
      
      // Build platform status from submissions
      const platforms = releaseSubmissions.map(sub => ({
        platform: sub.platform,
        status: sub.submissionStatus,
        exposurePercent: sub.exposurePercent,
        submissionId: sub.id,
      }));
      
      // Calculate overall status
      let status = release.status;
      if (releaseSubmissions.length > 0) {
        if (releaseSubmissions.every(s => s.submissionStatus === 'RELEASED')) {
          status = 'RELEASED';
        } else if (releaseSubmissions.some(s => s.submissionStatus === 'APPROVED_RELEASED')) {
          status = 'ROLLING_OUT';
        } else if (releaseSubmissions.some(s => s.submissionStatus === 'BUILD_SUBMITTED')) {
          status = 'IN_REVIEW';
        } else if (releaseSubmissions.some(s => s.submissionStatus === 'REJECTED')) {
          status = 'REJECTED';
        }
      }
      
      return {
        releaseId: release.id,
        version: release.version,
        branch: release.branch || `release/${release.version}`,
        status,
        platforms,
        submittedAt: releaseSubmissions[0]?.submittedAt || null,
        lastUpdated: release.updatedAt,
      };
    });
  
  res.json({
    success: true,
    data: {
      distributions,
    },
  });
});

// ============================================================================
// DEFAULT ROUTES (json-server)
// ============================================================================

// Use default router for standard CRUD operations
server.use('/api/v1', router);

// ============================================================================
// START SERVER
// ============================================================================

const PORT = 4000;
server.listen(PORT, () => {
  console.log('');
  console.log('🚀 Mock API Server is running!');
  console.log('');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📚 Resources: http://localhost:${PORT}/api/v1/db`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('   GET    /api/v1/distributions');
  console.log('   GET    /api/v1/releases');
  console.log('   GET    /api/v1/releases/:id/builds');
  console.log('   GET    /api/v1/releases/:id/builds/:buildId');
  console.log('   POST   /api/v1/releases/:id/builds/upload-aab');
  console.log('   POST   /api/v1/releases/:id/builds/verify-testflight');
  console.log('   GET    /api/v1/releases/:id/pm-status');
  console.log('   GET    /api/v1/releases/:id/extra-commits');
  console.log('   POST   /api/v1/releases/:id/approve');
  console.log('   POST   /api/v1/releases/:id/distribute');
  console.log('   GET    /api/v1/releases/:id/distribution/status');
  console.log('   GET    /api/v1/releases/:id/stores');
  console.log('   GET    /api/v1/releases/:id/submissions');
  console.log('   GET    /api/v1/submissions/:id');
  console.log('   GET    /api/v1/submissions/:id/status');
  console.log('   POST   /api/v1/submissions/:id/retry');
  console.log('   PATCH  /api/v1/submissions/:id/rollout');
  console.log('   POST   /api/v1/submissions/:id/rollout/pause');
  console.log('   POST   /api/v1/submissions/:id/rollout/resume');
  console.log('   POST   /api/v1/submissions/:id/rollout/halt');
  console.log('   GET    /api/v1/submissions/:id/history');
  console.log('');
  console.log('💡 Test Scenarios:');
  console.log('   - Version Conflict: POST /api/v1/releases/rel_version_conflict/distribute');
  console.log('   - Exposure Conflict: POST /api/v1/releases/rel_exposure_conflict/distribute');
  console.log('   - PM Not Approved: POST /api/v1/releases/rel_pm_not_approved/distribute');
  console.log('');
});

