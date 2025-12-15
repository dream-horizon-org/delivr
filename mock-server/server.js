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
import createReleaseProcessMiddleware from './middleware/release-process.middleware.js';

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

// Custom release process middleware (handles release process APIs)
server.use(createReleaseProcessMiddleware(router));

// ============================================================================
// CUSTOM ROUTES
// ============================================================================

// Helper function to transform release to backend format
// Matches BackendReleaseResponse interface and backend contract
function transformRelease(release, tenantId) {
  // Check if release is in new format by looking for new format fields
  // New format has: releasePhase, cronJob, createdByAccountId, or platformTargetMappings array
  // Also check if releaseId is different from id (new format indicator)
  const isNewFormat = 
    release.releasePhase !== undefined || // Has releasePhase
    release.cronJob !== undefined || // Has cronJob
    release.createdByAccountId !== undefined || // Has new account ID fields
    (release.platformTargetMappings !== undefined && Array.isArray(release.platformTargetMappings)) || // Has platformTargetMappings array (even if empty)
    (release.releaseId && release.releaseId !== release.id); // releaseId exists and is different from id

  if (isNewFormat) {
    // Already in new format - preserve ALL fields exactly as they are in db.json
    // This includes empty arrays, null values, etc.
    const transformed = JSON.parse(JSON.stringify(release)); // Deep clone to preserve everything
    
    // Debug: Log to verify platformTargetMappings is preserved
    if (transformed.platformTargetMappings) {
      console.log(`[transformRelease] Preserving platformTargetMappings: ${transformed.platformTargetMappings.length} items`);
    } else {
      console.log(`[transformRelease] WARNING: platformTargetMappings is missing or undefined in release ${release.id}`);
    }
    
    // Only override tenantId to match request
    transformed.tenantId = tenantId;
    
    // Ensure account ID fields use new format (fallback to old if needed, but don't overwrite if already set)
    if (!transformed.createdByAccountId && transformed.createdBy) {
      transformed.createdByAccountId = transformed.createdBy;
    }
    if (!transformed.lastUpdatedByAccountId && transformed.lastUpdatedBy) {
      transformed.lastUpdatedByAccountId = transformed.lastUpdatedBy;
    }
    if (transformed.releasePilotAccountId === undefined && transformed.createdByAccountId) {
      transformed.releasePilotAccountId = transformed.createdByAccountId;
    }
    
    // Remove old/legacy fields that shouldn't be in response (only if they exist)
    // Use hasOwnProperty to check, not 'in' operator, to avoid prototype chain issues
    if (transformed.hasOwnProperty('createdBy')) delete transformed.createdBy;
    if (transformed.hasOwnProperty('lastUpdatedBy')) delete transformed.lastUpdatedBy;
    if (transformed.hasOwnProperty('regressionComplete')) delete transformed.regressionComplete;
    if (transformed.hasOwnProperty('version')) delete transformed.version;
    if (transformed.hasOwnProperty('platforms')) delete transformed.platforms;
    if (transformed.hasOwnProperty('stage1Status')) delete transformed.stage1Status;
    if (transformed.hasOwnProperty('stage2Status')) delete transformed.stage2Status;
    if (transformed.hasOwnProperty('stage3Status')) delete transformed.stage3Status;
    
    // Ensure all required fields exist (even if null/empty) to match backend contract
    // Don't add defaults - preserve null/empty as-is from db.json
    return transformed;
  }

  // Legacy format - transform to new format
  return {
    id: release.id,
    releaseId: release.releaseId || release.id,
    releaseConfigId: release.releaseConfigId || null,
    tenantId: tenantId,
    type: release.type || 'PLANNED',
    status: release.status || 'IN_PROGRESS',
    releasePhase: release.releasePhase || null,
    branch: release.branch || null,
    baseBranch: release.baseBranch || 'main',
    baseReleaseId: release.baseReleaseId || null,
    platformTargetMappings: release.platformTargetMappings || (release.platforms && release.platforms.length > 0 ? release.platforms.map((platform, idx) => ({
      id: `mapping-${release.id}-${idx}`,
      releaseId: release.id,
      platform: platform,
      target: platform === 'ANDROID' ? 'PLAY_STORE' : platform === 'IOS' ? 'APP_STORE' : 'WEB',
      version: release.version ? `v${release.version}` : null,
      projectManagementRunId: null,
      testManagementRunId: null,
      createdAt: release.createdAt || new Date().toISOString(),
      updatedAt: release.updatedAt || new Date().toISOString(),
    })) : []),
    kickOffReminderDate: release.kickOffReminderDate || null,
    kickOffDate: release.kickOffDate || release.createdAt || null,
    targetReleaseDate: release.targetReleaseDate || null,
    releaseDate: release.releaseDate || null,
    hasManualBuildUpload: release.hasManualBuildUpload !== undefined ? release.hasManualBuildUpload : false,
    customIntegrationConfigs: release.customIntegrationConfigs || null,
    preCreatedBuilds: release.preCreatedBuilds || null,
    createdByAccountId: release.createdByAccountId || release.createdBy || '4JCGF-VeXg',
    releasePilotAccountId: release.releasePilotAccountId || release.createdByAccountId || release.createdBy || null,
    lastUpdatedByAccountId: release.lastUpdatedByAccountId || release.lastUpdatedBy || '4JCGF-VeXg',
    createdAt: release.createdAt || new Date().toISOString(),
    updatedAt: release.updatedAt || new Date().toISOString(),
    cronJob: release.cronJob || null,
    tasks: release.tasks || [],
  };
}

/**
 * GET /tenants/:tenantId/releases/:releaseId
 * Get single release by ID (can be either 'id' or 'releaseId' field)
 */
server.get('/tenants/:tenantId/releases/:releaseId', (req, res) => {
  const { tenantId, releaseId } = req.params;
  const db = router.db;
  
  // Try to find by 'id' first, then by 'releaseId' field
  let release = db.get('releases').find({ id: releaseId }).value();
  if (!release) {
    release = db.get('releases').find({ releaseId: releaseId }).value();
  }
  
  if (!release) {
    return res.status(404).json({
      success: false,
      error: 'Release not found',
    });
  }
  
  // Debug: Log the release found
  console.log(`[GET /tenants/:tenantId/releases/:releaseId] Found release:`, {
    id: release.id,
    releaseId: release.releaseId,
    hasPlatformTargetMappings: Array.isArray(release.platformTargetMappings),
    platformTargetMappingsLength: release.platformTargetMappings?.length || 0,
  });
  
  const transformed = transformRelease(release, tenantId);
  
  // Debug: Log after transformation
  console.log(`[GET /tenants/:tenantId/releases/:releaseId] Transformed release:`, {
    id: transformed.id,
    releaseId: transformed.releaseId,
    hasPlatformTargetMappings: Array.isArray(transformed.platformTargetMappings),
    platformTargetMappingsLength: transformed.platformTargetMappings?.length || 0,
  });
  
  res.json({
    success: true,
    release: transformed,
  });
});

/**
 * GET /tenants/:tenantId/releases
 * List all releases for a tenant (matches ReleaseManagement service)
 */
server.get('/tenants/:tenantId/releases', (req, res) => {
  const db = router.db;
  const releases = db.get('releases').value() || [];
  
  // Debug: Log first release to see what we're working with
  if (releases.length > 0) {
    console.log(`[GET /tenants/:tenantId/releases] First release from db:`, {
      id: releases[0].id,
      releaseId: releases[0].releaseId,
      hasReleasePhase: releases[0].releasePhase !== undefined,
      hasCronJob: releases[0].cronJob !== undefined,
      hasCreatedByAccountId: releases[0].createdByAccountId !== undefined,
      hasPlatformTargetMappings: Array.isArray(releases[0].platformTargetMappings),
      platformTargetMappingsLength: releases[0].platformTargetMappings?.length || 0,
    });
  }
  
  // Transform to match backend response format
  const transformedReleases = releases.map(release => {
    const transformed = transformRelease(release, req.params.tenantId);
    // Debug: Log after transformation
    if (release.id === releases[0]?.id) {
      console.log(`[GET /tenants/:tenantId/releases] After transform:`, {
        id: transformed.id,
        releaseId: transformed.releaseId,
        hasPlatformTargetMappings: Array.isArray(transformed.platformTargetMappings),
        platformTargetMappingsLength: transformed.platformTargetMappings?.length || 0,
      });
    }
    return transformed;
  });
  
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
 * POST /api/v1/releases/:releaseId/builds/:buildId/retry
 * Retry failed build (triggers CI/CD workflow)
 */
server.post('/api/v1/releases/:releaseId/builds/:buildId/retry', (req, res) => {
  const { releaseId, buildId } = req.params;
  const db = router.db;
  
  const build = db.get('builds')
    .find({ id: buildId, releaseId })
    .value();
  
  if (!build) {
    return res.status(404).json({
      success: false,
      error: { message: 'Build not found' },
    });
  }
  
  // Update build status to trigger retry
  const updatedBuild = {
    ...build,
    buildUploadStatus: 'UPLOADING',
    workflowStatus: 'QUEUED',
    updatedAt: new Date().toISOString(),
  };
  
  db.get('builds')
    .find({ id: buildId })
    .assign(updatedBuild)
    .write();
  
  // Simulate async CI/CD workflow - after 3 seconds, mark as UPLOADED
  setTimeout(() => {
    db.get('builds')
      .find({ id: buildId })
      .assign({
        buildUploadStatus: 'UPLOADED',
        workflowStatus: 'COMPLETED',
        updatedAt: new Date().toISOString(),
      })
      .write();
  }, 3000);
  
  res.json({
    success: true,
    data: updatedBuild,
    message: 'Build retry triggered successfully',
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
 * GET /api/v1/releases/:releaseId/distribution
 * Get full distribution with all submissions (used in release process)
 */
server.get('/api/v1/releases/:releaseId/distribution', (req, res) => {
  const { releaseId } = req.params;
  const db = router.db;
  
  const release = db.get('releases').find({ id: releaseId }).value();
  if (!release) {
    return res.status(404).json({
      success: false,
      error: { code: 'RELEASE_NOT_FOUND', message: 'Release not found' },
    });
  }
  
  // Get all submissions for this release (current + historical)
  const allSubmissions = db.get('submissions').filter({ releaseId }).value() || [];
  const distributionId = `dist_${releaseId.substring(0, 8)}`;
  
  // Build complete submissions array with artifacts
  const submissions = allSubmissions.map(sub => ({
    id: sub.id,
    distributionId,
    platform: sub.platform,
    storeType: sub.platform === 'ANDROID' ? 'PLAY_STORE' : 'APP_STORE',
    status: sub.submissionStatus,
    version: release.version,
    ...(sub.platform === 'ANDROID' && {
      versionCode: sub.versionCode || 270,
      rolloutPercent: sub.rolloutPercent || sub.exposurePercent || 0,
      inAppPriority: sub.inAppPriority || 0,
    }),
    ...(sub.platform === 'IOS' && {
      releaseType: 'AUTOMATIC',
      phasedRelease: sub.phasedRelease !== undefined ? sub.phasedRelease : true,
      resetRating: sub.resetRating || false,
      rolloutPercent: sub.rolloutPercent || sub.exposurePercent || 0,
    }),
    releaseNotes: sub.releaseNotes || 'Bug fixes and improvements',
    submittedAt: sub.submittedAt || null,
    submittedBy: sub.submittedBy || null,
    statusUpdatedAt: sub.statusUpdatedAt || sub.updatedAt || new Date().toISOString(),
    createdAt: sub.createdAt || new Date().toISOString(),
    updatedAt: sub.updatedAt || new Date().toISOString(),
    artifact: sub.platform === 'ANDROID' ? {
      artifactPath: `https://s3.amazonaws.com/builds/${sub.buildId}.aab`,
      ...(sub.internalTrackLink && { internalTrackLink: sub.internalTrackLink }),
    } : {
      testflightNumber: sub.testflightNumber || 56789,
    },
    actionHistory: sub.actionHistory || [],
  }));
  
  // Determine distribution status
  const platforms = ['ANDROID', 'IOS'].filter(p => submissions.some(s => s.platform === p));
  const latestSubmissions = platforms.map(platform => 
    submissions.filter(s => s.platform === platform).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]
  ).filter(Boolean);
  
  let status = 'PENDING';
  if (latestSubmissions.every(s => s.status === 'LIVE' && s.rolloutPercent === 100)) {
    status = 'RELEASED';
  } else if (latestSubmissions.some(s => s.status === 'LIVE')) {
    status = 'PARTIALLY_RELEASED';
  } else if (latestSubmissions.every(s => ['IN_REVIEW', 'APPROVED', 'LIVE'].includes(s.status))) {
    status = 'SUBMITTED';
  } else if (latestSubmissions.some(s => ['IN_REVIEW', 'APPROVED', 'LIVE'].includes(s.status))) {
    status = 'PARTIALLY_SUBMITTED';
  }
  
  res.json({
    success: true,
    data: {
      id: distributionId,
      releaseId,
      version: release.version,
      branch: release.branch || `release/${release.version}`,
      status,
      platforms,
      createdAt: release.createdAt || new Date().toISOString(),
      updatedAt: release.updatedAt || new Date().toISOString(),
      submissions,
    },
  });
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
      rolloutPercent: androidSubmission.rolloutPercent || androidSubmission.exposurePercent || 0,
      canRetry: androidSubmission.submissionStatus === 'REJECTED',
      error: null,
    };
  }
  
  if ((!platform || platform === 'IOS') && iosSubmission) {
    platforms.ios = {
      submitted: true,
      submissionId: iosSubmission.id,
      status: iosSubmission.submissionStatus,
      rolloutPercent: iosSubmission.rolloutPercent || iosSubmission.exposurePercent || 0,
      canRetry: iosSubmission.submissionStatus === 'REJECTED',
      error: null,
    };
  }
  
  // Calculate overall progress
  const platformCount = Object.keys(platforms).length;
  const totalProgress = Object.values(platforms).reduce((sum, p) => {
    if (p.status === 'RELEASED') return sum + 100;
    if (p.status === 'LIVE') return sum + (p.rolloutPercent || p.exposurePercent || 0);
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
      rolloutPercent: android.initialRolloutPercent || 10,
      exposurePercent: android.initialRolloutPercent || 10, // Legacy
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
      rolloutPercent: 0,
      exposurePercent: 0, // Legacy
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
 * ✅ 100% ALIGNED WITH DISTRIBUTION_API_SPEC.md
 */
/**
 * GET /api/v1/submissions/:submissionId
 * Get single submission details
 * REQUIRES: ?platform=<ANDROID|IOS> query parameter
 */
server.get('/api/v1/submissions/:submissionId', (req, res) => {
  const { submissionId } = req.params;
  const { platform } = req.query;
  const db = router.db;
  
  // Validate platform query parameter
  if (!platform || (platform !== 'ANDROID' && platform !== 'IOS')) {
    return res.status(400).json({
      success: false,
      error: { 
        code: 'INVALID_PLATFORM', 
        message: 'Platform query parameter is required and must be either ANDROID or IOS' 
      },
    });
  }
  
  const submission = db.get('submissions').find({ id: submissionId }).value();
  
  if (!submission) {
    return res.status(404).json({
      success: false,
      error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' },
    });
  }
  
  // Verify platform matches submission
  if (submission.platform !== platform) {
    return res.status(400).json({
      success: false,
      error: { 
        code: 'PLATFORM_MISMATCH', 
        message: `Submission platform (${submission.platform}) does not match query parameter (${platform})` 
      },
    });
  }
  
  // Get release for version info
  const release = db.get('releases').find({ id: submission.releaseId }).value();
  const distributionId = `dist_${submission.releaseId.substring(0, 8)}`;
  
  // Transform to match API spec exactly
  const data = {
    id: submission.id,
    distributionId,
    platform: submission.platform,
    storeType: submission.platform === 'ANDROID' ? 'PLAY_STORE' : 'APP_STORE',
    status: submission.submissionStatus || submission.status,
    version: release?.version || '2.7.0',
    ...(submission.platform === 'ANDROID' && {
      versionCode: submission.versionCode || 270,
      rolloutPercent: submission.rolloutPercent || submission.exposurePercent || 0,
      inAppPriority: submission.inAppPriority || 0,
    }),
    ...(submission.platform === 'IOS' && {
      releaseType: 'AUTOMATIC',
      phasedRelease: submission.phasedRelease ?? true,
      resetRating: submission.resetRating ?? false,
      rolloutPercent: submission.rolloutPercent || submission.exposurePercent || 0,
    }),
    releaseNotes: submission.releaseNotes || '',
    submittedAt: submission.submittedAt || null,
    submittedBy: submission.submittedBy || null,
    statusUpdatedAt: submission.statusUpdatedAt || submission.updatedAt || new Date().toISOString(),
    createdAt: submission.createdAt || new Date().toISOString(),
    updatedAt: submission.updatedAt || new Date().toISOString(),
    artifact: submission.platform === 'ANDROID' ? {
      artifactPath: `https://s3.amazonaws.com/presigned-url/app-release.aab`,
      ...(submission.internalTrackLink && { internalTrackLink: submission.internalTrackLink }),
    } : {
      testflightNumber: submission.testflightNumber || 56789,
    },
    actionHistory: submission.actionHistory || [],
  };
  
  res.json({
    success: true,
    data,
  });
});

// REMOVED: POST /api/v1/submissions/:submissionId/retry
// Replaced by: POST /api/v1/distributions/:distributionId/submissions (resubmission)

/**
 * PUT /api/v1/submissions/:submissionId/submit
 * Submit existing PENDING submission to store (first-time submission)
 * REQUIRES: ?platform=<ANDROID|IOS> query parameter
 */
server.put('/api/v1/submissions/:submissionId/submit', (req, res) => {
  const { submissionId } = req.params;
  const { platform } = req.query;
  const db = router.db;
  
  // Validate platform query parameter
  if (!platform || (platform !== 'ANDROID' && platform !== 'IOS')) {
    return res.status(400).json({
      success: false,
      error: { 
        code: 'INVALID_PLATFORM', 
        message: 'Platform query parameter is required and must be either ANDROID or IOS' 
      },
    });
  }
  
  const submission = db.get('submissions').find({ id: submissionId });
  const submissionData = submission.value();
  
  if (!submissionData) {
    return res.status(404).json({
      success: false,
      error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' },
    });
  }
  
  // Verify platform matches submission
  if (submissionData.platform !== platform) {
    return res.status(400).json({
      success: false,
      error: { 
        code: 'PLATFORM_MISMATCH', 
        message: `Submission platform (${submissionData.platform}) does not match query parameter (${platform})` 
      },
    });
  }
  
  if (submissionData.submissionStatus !== 'PENDING') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: 'Can only submit PENDING submissions' },
    });
  }
  
  const now = new Date().toISOString();
  const updates = {
    ...req.body,
    submissionStatus: 'IN_REVIEW',
    submittedAt: now,
    submittedBy: 'prince@dream11.com',
    statusUpdatedAt: now,
    updatedAt: now,
  };
  
  submission.assign(updates).write();
  
  res.json({
    success: true,
    data: submission.value(),
  });
});

/**
 * PATCH /api/v1/submissions/:submissionId/cancel
 * Cancel an in-review submission
 * REQUIRES: ?platform=<ANDROID|IOS> query parameter
 */
server.patch('/api/v1/submissions/:submissionId/cancel', (req, res) => {
  const { submissionId } = req.params;
  const { platform } = req.query;
  const { reason } = req.body;
  const db = router.db;
  
  // Validate platform query parameter
  if (!platform || (platform !== 'ANDROID' && platform !== 'IOS')) {
    return res.status(400).json({
      success: false,
      error: { 
        code: 'INVALID_PLATFORM', 
        message: 'Platform query parameter is required and must be either ANDROID or IOS' 
      },
    });
  }
  
  const submission = db.get('submissions').find({ id: submissionId });
  if (submission.value()) {
    const statusUpdatedAt = new Date().toISOString();
    submission.assign({ 
      submissionStatus: 'CANCELLED',
      cancelReason: reason || null,
      statusUpdatedAt,
      updatedAt: statusUpdatedAt,
    }).write();
    
    res.json({
      success: true,
      data: {
        id: submissionId,
        status: 'CANCELLED',
        statusUpdatedAt,
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
 * PATCH /api/v1/submissions/:submissionId/rollout
 * Update rollout percentage
 * REQUIRES: ?platform=<ANDROID|IOS> query parameter
 */
server.patch('/api/v1/submissions/:submissionId/rollout', (req, res) => {
  const { submissionId } = req.params;
  const { platform } = req.query;
  const { rolloutPercent } = req.body;
  const db = router.db;
  
  // Validate platform query parameter
  if (!platform || (platform !== 'ANDROID' && platform !== 'IOS')) {
    return res.status(400).json({
      success: false,
      error: { 
        code: 'INVALID_PLATFORM', 
        message: 'Platform query parameter is required and must be either ANDROID or IOS' 
      },
    });
  }
  
  const submission = db.get('submissions').find({ id: submissionId });
  if (submission.value()) {
    const statusUpdatedAt = new Date().toISOString();
    submission.assign({ 
      rolloutPercent,
      exposurePercent: rolloutPercent, // Legacy field
      submissionStatus: rolloutPercent >= 100 ? 'LIVE' : 'LIVE',
      statusUpdatedAt,
      updatedAt: statusUpdatedAt,
    }).write();
    
    res.json({
      success: true,
      data: {
        id: submissionId,
        rolloutPercent,
        statusUpdatedAt,
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
 * PATCH /api/v1/submissions/:submissionId/rollout/pause
 * Pause rollout (iOS only, phased release)
 * REQUIRES: ?platform=IOS query parameter
 */
server.patch('/api/v1/submissions/:submissionId/rollout/pause', (req, res) => {
  const { submissionId } = req.params;
  const { platform } = req.query;
  const db = router.db;
  
  // Validate platform query parameter (iOS only)
  if (platform !== 'IOS') {
    return res.status(400).json({
      success: false,
      error: { 
        code: 'INVALID_PLATFORM', 
        message: 'Platform query parameter must be IOS (Android does not support pause/resume)' 
      },
    });
  }
  
  const submission = db.get('submissions').find({ id: submissionId });
  if (submission.value()) {
    const statusUpdatedAt = new Date().toISOString();
    submission.assign({ 
      submissionStatus: 'PAUSED',
      statusUpdatedAt,
      updatedAt: statusUpdatedAt,
    }).write();
    
    res.json({
      success: true,
      data: {
        id: submissionId,
        status: 'PAUSED',
        statusUpdatedAt,
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
 * PATCH /api/v1/submissions/:submissionId/rollout/resume
 * Resume rollout (iOS only, phased release)
 * REQUIRES: ?platform=IOS query parameter
 */
server.patch('/api/v1/submissions/:submissionId/rollout/resume', (req, res) => {
  const { submissionId } = req.params;
  const { platform } = req.query;
  const db = router.db;
  
  // Validate platform query parameter (iOS only)
  if (platform !== 'IOS') {
    return res.status(400).json({
      success: false,
      error: { 
        code: 'INVALID_PLATFORM', 
        message: 'Platform query parameter must be IOS (Android does not support pause/resume)' 
      },
    });
  }
  
  const submission = db.get('submissions').find({ id: submissionId });
  if (submission.value()) {
    const statusUpdatedAt = new Date().toISOString();
    submission.assign({ 
      submissionStatus: 'LIVE',
      statusUpdatedAt,
      updatedAt: statusUpdatedAt,
    }).write();
    
    res.json({
      success: true,
      data: {
        id: submissionId,
        status: 'LIVE',
        statusUpdatedAt,
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
 * PATCH /api/v1/submissions/:submissionId/rollout/halt
 * Emergency halt (no resubmission, must create new release)
 * REQUIRES: ?platform=<ANDROID|IOS> query parameter
 */
server.patch('/api/v1/submissions/:submissionId/rollout/halt', (req, res) => {
  const { submissionId } = req.params;
  const { platform } = req.query;
  const { reason } = req.body;
  const db = router.db;
  
  // Validate platform query parameter
  if (!platform || (platform !== 'ANDROID' && platform !== 'IOS')) {
    return res.status(400).json({
      success: false,
      error: { 
        code: 'INVALID_PLATFORM', 
        message: 'Platform query parameter is required and must be either ANDROID or IOS' 
      },
    });
  }
  
  const submission = db.get('submissions').find({ id: submissionId });
  if (submission.value()) {
    const statusUpdatedAt = new Date().toISOString();
    submission.assign({ 
      submissionStatus: 'HALTED',
      haltReason: reason,
      availableActions: [],
      statusUpdatedAt,
      updatedAt: statusUpdatedAt,
    }).write();
    
    res.json({
      success: true,
      data: {
        id: submissionId,
        status: 'HALTED',
        statusUpdatedAt,
      },
    });
  } else {
    res.status(404).json({
      success: false,
      error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' },
    });
  }
});

// REMOVED: GET /api/v1/submissions/:submissionId/status
// Use GET /api/v1/submissions/:submissionId or GET /api/v1/distributions/:distributionId instead

// REMOVED: GET /api/v1/submissions/:submissionId/history
// History feature not in API spec

/**
 * GET /api/v1/distributions?page=1&pageSize=10
 * List all distributions with pagination
 * ✅ 100% ALIGNED WITH DISTRIBUTION_API_SPEC.md
 * 
 * Returns ONLY latest submission per platform (not historical)
 * Stats calculated from ALL distributions (not just current page)
 */
server.get('/api/v1/distributions', (req, res) => {
  const db = router.db;
  
  // Extract pagination params
  const page = parseInt(req.query.page) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100); // Max 100
  const statusFilter = req.query.status; // PENDING, PARTIALLY_SUBMITTED, SUBMITTED, PARTIALLY_RELEASED, RELEASED
  const platformFilter = req.query.platform; // ANDROID, IOS
  
  // Get all releases and submissions
  const releases = db.get('releases').value() || [];
  const allSubmissions = db.get('submissions').value() || [];
  
  // Group submissions by releaseId
  const submissionsByRelease = allSubmissions.reduce((acc, sub) => {
    if (!acc[sub.releaseId]) acc[sub.releaseId] = [];
    acc[sub.releaseId].push(sub);
    return acc;
  }, {});
  
  // Build distribution entries
  let allDistributions = releases
    .filter(release => {
      // Only include releases that have submissions
      return submissionsByRelease[release.id]?.length > 0;
    })
    .map(release => {
      const releaseSubmissions = submissionsByRelease[release.id] || [];
      
      // Get ONLY latest submission per platform
      const platforms = ['ANDROID', 'IOS'];
      const latestSubmissions = platforms
        .map(platform => {
          const platformSubs = releaseSubmissions.filter(s => s.platform === platform);
          if (platformSubs.length === 0) return null;
          // Sort by createdAt desc, get first
          return platformSubs.sort((a, b) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          )[0];
        })
        .filter(Boolean);
      
      // Build submissions array per API spec (ONLY latest per platform)
      const submissions = latestSubmissions.map(sub => ({
        id: sub.id,
        platform: sub.platform,
        status: sub.submissionStatus || sub.status,
        rolloutPercent: sub.rolloutPercent || sub.exposurePercent || 0,
        statusUpdatedAt: sub.statusUpdatedAt || sub.updatedAt || new Date().toISOString(),
      }));
      
      // Calculate distribution status per API spec
      let distStatus = 'PENDING';
      if (submissions.length === 0) {
        distStatus = 'PENDING';
      } else {
        const allSubmitted = submissions.every(s => ['IN_REVIEW', 'APPROVED', 'LIVE', 'PAUSED', 'REJECTED', 'HALTED', 'CANCELLED'].includes(s.status));
        const someSubmitted = submissions.some(s => ['IN_REVIEW', 'APPROVED', 'LIVE', 'PAUSED'].includes(s.status));
        const allFullyReleased = submissions.every(s => s.status === 'LIVE' && s.rolloutPercent === 100);
        const someFullyReleased = submissions.some(s => s.status === 'LIVE' && s.rolloutPercent === 100);
        
        if (allFullyReleased) {
          distStatus = 'RELEASED';
        } else if (someFullyReleased) {
          distStatus = 'PARTIALLY_RELEASED';
        } else if (allSubmitted) {
          distStatus = 'SUBMITTED';
        } else if (someSubmitted) {
          distStatus = 'PARTIALLY_SUBMITTED';
        }
      }
      
      // statusUpdatedAt = max of all submissions' statusUpdatedAt
      const statusUpdatedAt = submissions.length > 0
        ? new Date(Math.max(...submissions.map(s => new Date(s.statusUpdatedAt).getTime()))).toISOString()
        : new Date().toISOString();
      
      return {
        id: `dist_${release.id.substring(0, 8)}`,
        version: release.version || 'v2.7.0',
        branch: release.branch || `release/${release.version || '2.7.0'}`,
        status: distStatus,
        platforms: submissions.map(s => s.platform),
        submissions, // ONLY latest per platform
        statusUpdatedAt,
      };
    });
  
  // Apply filters
  if (statusFilter) {
    allDistributions = allDistributions.filter(d => d.status === statusFilter);
  }
  if (platformFilter) {
    allDistributions = allDistributions.filter(d => d.platforms.includes(platformFilter));
  }
  
  // Calculate stats from ALL distributions (after filter, before pagination)
  const stats = {
    totalDistributions: allDistributions.length,
    totalSubmissions: allDistributions.reduce((sum, d) => sum + d.submissions.length, 0),
    inReviewSubmissions: allDistributions.reduce((sum, d) => 
      sum + d.submissions.filter(s => s.status === 'IN_REVIEW').length, 0
    ),
    releasedSubmissions: allDistributions.reduce((sum, d) => 
      sum + d.submissions.filter(s => s.status === 'LIVE' && s.rolloutPercent === 100).length, 0
    ),
  };
  
  // Pagination
  const totalItems = allDistributions.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const distributions = allDistributions.slice(start, end);
  
  res.json({
    success: true,
    data: {
      distributions,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems,
        hasMore: page < totalPages,
      },
      stats, // At top level of data
    },
  });
});

/**
 * GET /api/v1/distributions/:distributionId
 * Get full distribution details with all submissions (current + historical)
 */
server.get('/api/v1/distributions/:distributionId', (req, res) => {
  const { distributionId } = req.params;
  const db = router.db;
  
  // Extract releaseId from distributionId (format: dist_releaseIdPrefix)
  const releaseIdPrefix = distributionId.replace('dist_', '');
  const release = db.get('releases').find(r => r.id.startsWith(releaseIdPrefix)).value();
  
  if (!release) {
    return res.status(404).json({
      success: false,
      error: { code: 'DISTRIBUTION_NOT_FOUND', message: 'Distribution not found' },
    });
  }
  
  // Get all submissions for this release (current + historical)
  const allSubmissions = db.get('submissions').filter({ releaseId: release.id }).value() || [];
  
  // Build complete submissions array with artifacts
  const submissions = allSubmissions.map(sub => ({
    id: sub.id,
    distributionId,
    platform: sub.platform,
    storeType: sub.platform === 'ANDROID' ? 'PLAY_STORE' : 'APP_STORE',
    status: sub.submissionStatus,
    version: release.version,
    ...(sub.platform === 'ANDROID' && {
      versionCode: sub.versionCode || 270,
      rolloutPercent: sub.rolloutPercent || sub.exposurePercent || 0,
      inAppPriority: sub.inAppPriority || 0,
    }),
    ...(sub.platform === 'IOS' && {
      releaseType: 'AUTOMATIC',
      phasedRelease: sub.phasedRelease !== undefined ? sub.phasedRelease : true,
      resetRating: sub.resetRating || false,
      rolloutPercent: sub.rolloutPercent || sub.exposurePercent || 0,
    }),
    releaseNotes: sub.releaseNotes || 'Bug fixes and improvements',
    submittedAt: sub.submittedAt || null,
    submittedBy: sub.submittedBy || null,
    statusUpdatedAt: sub.statusUpdatedAt || sub.updatedAt || new Date().toISOString(),
    createdAt: sub.createdAt || new Date().toISOString(),
    updatedAt: sub.updatedAt || new Date().toISOString(),
    artifact: sub.platform === 'ANDROID' ? {
      artifactPath: `https://s3.amazonaws.com/builds/${sub.buildId}.aab`,
      ...(sub.internalTrackLink && { internalTrackLink: sub.internalTrackLink }),
    } : {
      testflightNumber: sub.testflightNumber || 56789,
    },
    actionHistory: sub.actionHistory || [],
  }));
  
  // Determine distribution status
  const platforms = ['ANDROID', 'IOS'].filter(p => submissions.some(s => s.platform === p));
  const latestSubmissions = platforms.map(platform => 
    submissions.filter(s => s.platform === platform).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]
  );
  
  let status = 'PENDING';
  if (latestSubmissions.every(s => s.status === 'LIVE' && s.rolloutPercent === 100)) {
    status = 'RELEASED';
  } else if (latestSubmissions.some(s => s.status === 'LIVE')) {
    status = 'PARTIALLY_RELEASED';
  } else if (latestSubmissions.every(s => ['IN_REVIEW', 'APPROVED', 'LIVE'].includes(s.status))) {
    status = 'SUBMITTED';
  } else if (latestSubmissions.some(s => ['IN_REVIEW', 'APPROVED', 'LIVE'].includes(s.status))) {
    status = 'PARTIALLY_SUBMITTED';
  }
  
  res.json({
    success: true,
    data: {
      id: distributionId,
      releaseId: release.id,
      version: release.version,
      branch: release.branch || `release/${release.version}`,
      status,
      platforms,
      createdAt: release.createdAt || new Date().toISOString(),
      updatedAt: release.updatedAt || new Date().toISOString(),
      submissions,
    },
  });
});

/**
 * POST /api/v1/distributions/:distributionId/submissions
 * Create new submission (resubmission after rejection/cancellation)
 */
server.post('/api/v1/distributions/:distributionId/submissions', (req, res) => {
  const { distributionId } = req.params;
  const { platform, version, versionCode, rolloutPercent, inAppPriority, phasedRelease, resetRating, releaseNotes, testflightNumber } = req.body;
  const db = router.db;
  
  // Extract releaseId from distributionId
  const releaseIdPrefix = distributionId.replace('dist_', '');
  const release = db.get('releases').find(r => r.id.startsWith(releaseIdPrefix)).value();
  
  if (!release) {
    return res.status(404).json({
      success: false,
      error: { code: 'DISTRIBUTION_NOT_FOUND', message: 'Distribution not found' },
    });
  }
  
  const now = new Date().toISOString();
  const newSubmission = {
    id: `sub_new_${Date.now()}`,
    releaseId: release.id,
    distributionId,
    platform,
    storeType: platform === 'ANDROID' ? 'PLAY_STORE' : 'APP_STORE',
    submissionStatus: 'IN_REVIEW',
    version,
    ...(platform === 'ANDROID' && {
      versionCode: versionCode || parseInt(version.replace(/\./g, '')),
      rolloutPercent: rolloutPercent || 5,
      inAppPriority: inAppPriority !== undefined ? inAppPriority : 0,
    }),
    ...(platform === 'IOS' && {
      releaseType: 'AUTOMATIC',
      phasedRelease: phasedRelease !== undefined ? phasedRelease : true,
      resetRating: resetRating || false,
      rolloutPercent: 0,
      testflightNumber,
    }),
    releaseNotes: releaseNotes || '',
    submittedAt: now,
    submittedBy: 'prince@dream11.com',
    statusUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
    buildId: `build_${Date.now()}`,
  };
  
  // Add to database
  db.get('submissions').push(newSubmission).write();
  
  // Prepare response
  const response = {
    ...newSubmission,
    status: newSubmission.submissionStatus,
    artifact: platform === 'ANDROID' ? {
      artifactPath: `https://s3.amazonaws.com/builds/${newSubmission.buildId}.aab`,
    } : {
      testflightNumber: newSubmission.testflightNumber,
    },
    actionHistory: newSubmission.actionHistory || [],
  };
  
  delete response.submissionStatus;
  
  res.json({
    success: true,
    data: response,
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

