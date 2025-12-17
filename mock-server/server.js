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

import fs from 'fs';
import jsonServer from 'json-server';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import distributionMiddleware from './middleware/distribution.middleware.js';
import createReleaseProcessMiddleware from './middleware/release-process.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// LOAD AND MERGE DATA FROM BOTH DB FILES
// ============================================================================

// Load distribution data
const distributionDbPath = path.join(__dirname, 'data', 'db-distribution.json');
const distributionData = JSON.parse(fs.readFileSync(distributionDbPath, 'utf-8'));

// Load release process data
const releaseProcessDbPath = path.join(__dirname, 'data', 'db-release-process.json');
const releaseProcessData = JSON.parse(fs.readFileSync(releaseProcessDbPath, 'utf-8'));

// Merge data from both files
// Distribution data takes priority for distributions/submissions
// Release process data provides releases, tasks, cycles, staging builds
const mergedData = {
  // From distribution DB - distribution-specific entities
  releases: [
    ...(distributionData.releases || []),
    ...(releaseProcessData.releases || []),
  ],
  store_distribution: distributionData.store_distribution || [],
  android_submission_builds: distributionData.android_submission_builds || [],
  ios_submission_builds: distributionData.ios_submission_builds || [],
  submissions: distributionData.submissions || [],
  
  // From release process DB - release process entities
  releaseTasks: releaseProcessData.releaseTasks || [],
  regressionCycles: releaseProcessData.regressionCycles || [],
  buildUploadsStaging: releaseProcessData.buildUploadsStaging || [],
  builds: [
    ...(distributionData.builds || []),
    ...(releaseProcessData.builds || []),
  ],
  
  // Optional shared entities
  storeIntegrations: distributionData.storeIntegrations || releaseProcessData.storeIntegrations || [],
  pmApprovals: distributionData.pmApprovals || releaseProcessData.pmApprovals || [],
  extraCommits: distributionData.extraCommits || releaseProcessData.extraCommits || [],
};

console.log('📂 Loaded and merged data from both DB files:');
console.log(`   - Distribution DB: ${Object.keys(distributionData).length} collections`);
console.log(`   - Release Process DB: ${Object.keys(releaseProcessData).length} collections`);
console.log(`   - Merged releases: ${mergedData.releases.length}`);
console.log(`   - Distributions: ${mergedData.store_distribution.length}`);
console.log(`   - Release Tasks: ${mergedData.releaseTasks.length}`);
console.log(`   - Regression Cycles: ${mergedData.regressionCycles.length}`);

// Create server with merged data
const server = jsonServer.create();
const router = jsonServer.router(mergedData);
const middlewares = jsonServer.defaults();

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Default middlewares (CORS, logger, static, etc.)
server.use(middlewares);

// Configure multer for file uploads (multipart/form-data)
// Only process multipart requests, skip others
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for mock server
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit
  },
});

// Multer middleware for file upload routes
// This must come BEFORE jsonServer.bodyParser to handle multipart/form-data
server.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  // Only process multipart requests
  if (contentType.includes('multipart/form-data')) {
    // Use .any() to accept any field name (both files and regular fields)
    upload.any()(req, res, (err) => {
      if (err) {
        console.error('[Multer] Error processing file upload:', err);
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload error',
        });
      }
      
      next();
    });
  } else {
    // For non-multipart requests, continue to body parser
    next();
  }
});

// Body parser (for JSON requests)
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

/**
 * Helper function to get mock account details
 * In a real scenario, this would fetch from accounts collection
 */
function getAccountDetails(accountId) {
  if (!accountId) return null;
  
  // Mock account data - in real server this would come from accounts table
  // For now, generate mock data based on accountId
  return {
    id: accountId,
    email: `user-${accountId.substring(0, 8)}@example.com`,
    name: `User ${accountId.substring(0, 8)}`
  };
}

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
    
    // Add releasePilot account details if releasePilotAccountId exists
    if (transformed.releasePilotAccountId) {
      transformed.releasePilot = getAccountDetails(transformed.releasePilotAccountId);
    } else {
      transformed.releasePilot = null;
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
    type: release.type || 'MINOR',
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
    releasePilot: release.releasePilotAccountId ? getAccountDetails(release.releasePilotAccountId) : 
                   (release.createdByAccountId || release.createdBy ? getAccountDetails(release.createdByAccountId || release.createdBy) : null),
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
server.get('/api/v1/tenants/:tenantId/releases/:releaseId', (req, res) => {
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
server.get('/api/v1/tenants/:tenantId/releases', (req, res) => {
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
 * GET /api/v1/tenants/:tenantId (MOCK for tenant info with integrations)
 * Returns tenant info with APP_DISTRIBUTION integrations enabled
 * This mock enables the Distribution step in the release process
 */
server.get('/api/v1/tenants/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  
  // Mock tenant response with APP_DISTRIBUTION integrations
  res.json({
    success: true,
    data: {
      organisation: {
        id: tenantId,
        displayName: 'TestAbc',
        releaseManagement: {
          config: {
            connectedIntegrations: {
              SOURCE_CONTROL: [
                {
                  id: 'int_github_1',
                  provider: 'GITHUB',
                  status: 'CONNECTED',
                  name: 'GitHub - delivr',
                  connectedAt: '2024-01-15T10:00:00.000Z',
                }
              ],
              COMMUNICATION: [
                {
                  id: 'int_slack_1',
                  provider: 'SLACK',
                  status: 'CONNECTED',
                  name: 'Slack - Delivr Workspace',
                  connectedAt: '2024-01-15T10:00:00.000Z',
                }
              ],
              CI_CD: [],
              TEST_MANAGEMENT: [
                {
                  id: 'int_checkmate_1',
                  provider: 'CHECKMATE',
                  status: 'CONNECTED',
                  name: 'Checkmate',
                  connectedAt: '2024-01-15T10:00:00.000Z',
                }
              ],
              PROJECT_MANAGEMENT: [
                {
                  id: 'int_jira_1',
                  provider: 'JIRA',
                  status: 'CONNECTED',
                  name: 'Jira - Delivr Project',
                  connectedAt: '2024-01-15T10:00:00.000Z',
                }
              ],
              APP_DISTRIBUTION: [
                {
                  id: 'int_play_store_1',
                  provider: 'PLAY_STORE',
                  status: 'CONNECTED',
                  name: 'Google Play Store - Delivr App',
                  connectedAt: '2024-02-01T10:00:00.000Z',
                  config: {
                    packageName: 'com.delivr.app',
                    serviceAccountEmail: 'delivr-release@delivr-app.iam.gserviceaccount.com',
                  }
                },
                {
                  id: 'int_app_store_1',
                  provider: 'APP_STORE',
                  status: 'CONNECTED',
                  name: 'App Store Connect - Delivr iOS',
                  connectedAt: '2024-02-01T10:00:00.000Z',
                  config: {
                    bundleId: 'com.delivr.ios',
                    teamId: 'ABCD1234',
                  }
                }
              ],
            },
            enabledPlatforms: ['ANDROID', 'IOS'],
            enabledTargets: ['PLAY_STORE', 'APP_STORE'],
            allowedReleaseTypes: ['MINOR', 'HOTFIX', 'MAJOR'],
            customSettings: {},
          },
        },
      },
      // App distribution integrations (also returned separately)
      appDistributions: [
        {
          id: 'dist_int_play_store_1',
          platform: 'ANDROID',
          target: 'PLAY_STORE',
          status: 'ACTIVE',
          packageName: 'com.delivr.app',
          createdAt: '2024-02-01T10:00:00.000Z',
        },
        {
          id: 'dist_int_app_store_1',
          platform: 'IOS',
          target: 'APP_STORE',
          status: 'ACTIVE',
          bundleId: 'com.delivr.ios',
          createdAt: '2024-02-01T10:00:00.000Z',
        }
      ],
    },
  });
});

/**
 * GET /tenants/:tenantId/release-configs
 * List release configs (mock to prevent errors)
 */
server.get('/api/v1/tenants/:tenantId/release-configs', (req, res) => {
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
  
  // ✅ Query store_distribution table by releaseId
  const distribution = db.get('store_distribution').find({ releaseId }).value();
  if (!distribution) {
    return res.status(404).json({
      success: false,
      error: { code: 'DISTRIBUTION_NOT_FOUND', message: 'Distribution not found for this release' },
    });
  }
  
  // Get all submissions for this distribution (current + historical) from both tables
  const androidSubs = db.get('android_submission_builds').filter({ distributionId: distribution.id }).value() || [];
  const iosSubs = db.get('ios_submission_builds').filter({ distributionId: distribution.id }).value() || [];
  
  // Build complete submissions array with artifacts (✅ EXACT API SPEC)
  const submissions = [];
  
  // Android submissions
  androidSubs.forEach(sub => {
    submissions.push({
      id: sub.id,
      distributionId: sub.distributionId,
      platform: 'ANDROID',
      storeType: sub.storeType,
      status: sub.status,
      version: sub.version,
      versionCode: sub.versionCode,
      rolloutPercentage: sub.rolloutPercentage,
      inAppUpdatePriority: sub.inAppUpdatePriority,
      releaseNotes: sub.releaseNotes,
      submittedAt: sub.submittedAt,
      submittedBy: sub.submittedBy,
      statusUpdatedAt: sub.statusUpdatedAt,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      isActive: sub.isCurrent, // ✅ Map isCurrent to isActive
      artifact: sub.artifact || {
        artifactPath: sub.artifactPath,
        ...(sub.internalTrackLink && { internalTrackLink: sub.internalTrackLink }),
      },
      actionHistory: sub.actionHistory || [],
      ...(sub.rejectionReason && { rejectionReason: sub.rejectionReason }),
    });
  });
  
  // iOS submissions
  iosSubs.forEach(sub => {
    submissions.push({
      id: sub.id,
      distributionId: sub.distributionId,
      platform: 'IOS',
      storeType: sub.storeType,
      status: sub.status,
      version: sub.version,
      releaseType: sub.releaseType || 'AFTER_APPROVAL',
      phasedRelease: sub.phasedRelease,
      resetRating: sub.resetRating,
      rolloutPercentage: sub.rolloutPercentage,
      releaseNotes: sub.releaseNotes,
      submittedAt: sub.submittedAt,
      submittedBy: sub.submittedBy,
      statusUpdatedAt: sub.statusUpdatedAt,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      isActive: sub.isCurrent, // ✅ Map isCurrent to isActive
      artifact: sub.artifact || {
        testflightNumber: sub.testflightNumber,
      },
      actionHistory: sub.actionHistory || [],
    });
  });
  
  // Determine platforms from submissions
  const platforms = ['ANDROID', 'IOS'].filter(p => submissions.some(s => s.platform === p));
  
  res.json({
    success: true,
    data: {
      id: distribution.id,
      releaseId: distribution.releaseId,
      branch: release.branch || 'unknown',
      status: distribution.status, // ✅ Use status from distribution table
      platforms,
      createdAt: distribution.createdAt,
      updatedAt: distribution.updatedAt,
      submissions,
    },
  });
});

// ❌ REMOVED: Legacy endpoint not in DISTRIBUTION_API_SPEC.md
// GET /api/v1/releases/:releaseId/distribution/status was removed
// Use GET /api/v1/releases/:releaseId/distribution instead

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

// ❌ REMOVED: Legacy endpoints not in DISTRIBUTION_API_SPEC.md
// POST /api/v1/releases/:releaseId/distribute was removed
// GET /api/v1/releases/:releaseId/submissions was removed
// Use GET /api/v1/releases/:releaseId/distribution instead

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
      rolloutPercentage: submission.rolloutPercentage || submission.exposurePercent || 0,
      inAppUpdatePriority: submission.inAppUpdatePriority || 0,
    }),
    ...(submission.platform === 'IOS' && {
      releaseType: 'AFTER_APPROVAL',
      phasedRelease: submission.phasedRelease ?? true,
      resetRating: submission.resetRating ?? false,
      rolloutPercentage: submission.rolloutPercentage || submission.exposurePercent || 0,
    }),
    releaseNotes: submission.releaseNotes || '',
    submittedAt: submission.submittedAt || null,
    submittedBy: submission.submittedBy || null,
    statusUpdatedAt: submission.statusUpdatedAt || submission.updatedAt || new Date().toISOString(),
    createdAt: submission.createdAt || new Date().toISOString(),
    updatedAt: submission.updatedAt || new Date().toISOString(),
    isActive: submission.isActive ?? true, // ✅ Maps from DB isCurrent field
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
  
  // Get submission from correct table based on platform
  const table = platform === 'ANDROID' ? 'android_submission_builds' : 'ios_submission_builds';
  const submission = db.get(table).find({ id: submissionId });
  const submissionData = submission.value();
  
  if (!submissionData) {
    return res.status(404).json({
      success: false,
      error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' },
    });
  }
  
  if (submissionData.status !== 'PENDING') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: 'Can only submit PENDING submissions' },
    });
  }
  
  const now = new Date().toISOString();
  const updates = {
    ...req.body,
    status: 'IN_REVIEW',
    submittedAt: now,
    submittedBy: 'prince@dream11.com',
    statusUpdatedAt: now,
    updatedAt: now,
  };
  
  submission.assign(updates).write();
  
  // Also update the distribution status if all submissions are no longer pending
  const distributionId = submissionData.distributionId;
  const distribution = db.get('store_distribution').find({ id: distributionId });
  if (distribution.value()) {
    const allAndroidSubmissions = db.get('android_submission_builds').filter({ distributionId }).value();
    const allIosSubmissions = db.get('ios_submission_builds').filter({ distributionId }).value();
    const allSubmissions = [...allAndroidSubmissions, ...allIosSubmissions];
    
    const anyPending = allSubmissions.some(s => s.status === 'PENDING');
    const anySubmitted = allSubmissions.some(s => ['IN_REVIEW', 'APPROVED', 'LIVE'].includes(s.status));
    
    let newDistStatus = distribution.value().status;
    if (!anyPending && anySubmitted) {
      newDistStatus = 'PARTIALLY_SUBMITTED';
    }
    
    distribution.assign({ status: newDistStatus, updatedAt: now }).write();
  }
  
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
  const { rolloutPercentage } = req.body;
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
      rolloutPercentage,
      exposurePercent: rolloutPercentage, // Legacy field
      submissionStatus: rolloutPercentage >= 100 ? 'LIVE' : 'LIVE',
      statusUpdatedAt,
      updatedAt: statusUpdatedAt,
    }).write();
    
    res.json({
      success: true,
      data: {
        id: submissionId,
        rolloutPercentage,
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
 * GET /api/v1/distributions?tenantId=xxx&page=1&pageSize=10
 * List all distributions with pagination
 * ✅ 100% ALIGNED WITH DISTRIBUTION_API_SPEC.md
 * 
 * Query Parameters:
 * - tenantId: Tenant/Organization ID (required)
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 10, max: 100)
 * - status: Filter by status (optional)
 * - platform: Filter by platform (optional)
 * 
 * Returns ONLY latest submission per platform (not historical)
 * Stats calculated from ALL distributions (not just current page)
 */
server.get('/api/v1/distributions', (req, res) => {
  const db = router.db;
  
  // Extract query params
  const tenantId = req.query.tenantId;
  const page = parseInt(req.query.page) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100); // Max 100
  const statusFilter = req.query.status; // PENDING, PARTIALLY_SUBMITTED, SUBMITTED, PARTIALLY_RELEASED, RELEASED
  const platformFilter = req.query.platform; // ANDROID, IOS
  
  // Validate tenantId
  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_TENANT_ID', message: 'tenantId query parameter is required' },
    });
  }
  
  console.log(`[distributions] Fetching distributions for tenant: ${tenantId}`);
  
  // ✅ Query from actual database tables and filter by tenantId
  const allDistributionsFromDb = (db.get('store_distribution').value() || [])
    .filter(d => d.tenantId === tenantId);
  const androidSubmissions = db.get('android_submission_builds').value() || [];
  const iosSubmissions = db.get('ios_submission_builds').value() || [];
  const releases = db.get('releases').value() || [];
  
  // Create lookup maps
  const releaseById = releases.reduce((acc, rel) => {
    acc[rel.id] = rel;
    return acc;
  }, {});
  
  // Build distribution response objects
  let allDistributions = allDistributionsFromDb
    .map(dist => {
      const release = releaseById[dist.releaseId];
      
      // Get current (isCurrent = true) submissions for this distribution
      const currentAndroidSub = androidSubmissions.find(s => 
        s.distributionId === dist.id && s.isCurrent === true
      );
      const currentIosSub = iosSubmissions.find(s => 
        s.distributionId === dist.id && s.isCurrent === true
      );
      
      // Get ALL submissions for platform determination (including historical)
      const hasAndroidSubs = androidSubmissions.some(s => s.distributionId === dist.id);
      const hasIosSubs = iosSubmissions.some(s => s.distributionId === dist.id);
      
      // Build submissions array per API spec (ONLY current submissions)
      const submissions = [];
      
      if (currentAndroidSub) {
        submissions.push({
          id: currentAndroidSub.id,
          platform: 'ANDROID',
          status: currentAndroidSub.status,
          rolloutPercentage: currentAndroidSub.rolloutPercentage || 0,
          statusUpdatedAt: currentAndroidSub.statusUpdatedAt,
          isActive: true, // isCurrent = true maps to isActive = true
        });
      }
      
      if (currentIosSub) {
        submissions.push({
          id: currentIosSub.id,
          platform: 'IOS',
          status: currentIosSub.status,
          rolloutPercentage: currentIosSub.rolloutPercentage || 0,
          statusUpdatedAt: currentIosSub.statusUpdatedAt,
          isActive: true, // isCurrent = true maps to isActive = true
        });
      }
      
      // Determine platforms from ALL submissions (current + historical)
      // This ensures platforms show even when all submissions are inactive (REJECTED/CANCELLED)
      const platforms = [];
      if (hasAndroidSubs) platforms.push('ANDROID');
      if (hasIosSubs) platforms.push('IOS');
      
      // statusUpdatedAt = max of all submissions' statusUpdatedAt (including historical)
      const allDistSubmissions = [
        ...androidSubmissions.filter(s => s.distributionId === dist.id),
        ...iosSubmissions.filter(s => s.distributionId === dist.id),
      ];
      const statusUpdatedAt = allDistSubmissions.length > 0
        ? new Date(Math.max(...allDistSubmissions.map(s => new Date(s.statusUpdatedAt).getTime()))).toISOString()
        : dist.updatedAt;
      
      // Calculate distribution status based on current submissions
      let calculatedStatus = dist.status;
      if (submissions.length === 0) {
        calculatedStatus = 'PENDING';
      } else if (submissions.length === 1) {
        const sub = submissions[0];
        if (sub.status === 'PENDING') calculatedStatus = 'PENDING';
        else if (['APPROVED', 'LIVE', 'PAUSED', 'HALTED'].includes(sub.status)) calculatedStatus = 'RELEASED';
        else calculatedStatus = 'SUBMITTED';
      } else {
        // Multiple platforms
        const allPending = submissions.every(s => s.status === 'PENDING');
        const allReleased = submissions.every(s => ['APPROVED', 'LIVE', 'PAUSED', 'HALTED'].includes(s.status));
        const someReleased = submissions.some(s => ['APPROVED', 'LIVE', 'PAUSED', 'HALTED'].includes(s.status));
        const allInReview = submissions.every(s => s.status === 'IN_REVIEW');
        
        if (allPending) calculatedStatus = 'PENDING';
        else if (allReleased) calculatedStatus = 'RELEASED';
        else if (someReleased) calculatedStatus = 'PARTIALLY_RELEASED';
        else if (allInReview) calculatedStatus = 'SUBMITTED';
        else calculatedStatus = 'PARTIALLY_SUBMITTED';
      }
      
      return {
        id: dist.id,
        releaseId: dist.releaseId, // ✅ Included for linking to release page
        branch: release?.branch || 'unknown',
        status: calculatedStatus, // ✅ Calculate based on current submissions
        platforms, // ✅ Based on ALL submissions (current + historical)
        submissions, // ONLY current submissions per API spec
        createdAt: dist.createdAt,
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
      sum + d.submissions.filter(s => s.status === 'LIVE' && s.rolloutPercentage === 100).length, 0
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
  
  // ✅ Query from actual database tables
  const distribution = db.get('store_distribution').find({ id: distributionId }).value();
  
  if (!distribution) {
    return res.status(404).json({
      success: false,
      error: { code: 'DISTRIBUTION_NOT_FOUND', message: 'Distribution not found' },
    });
  }
  
  // Get release for branch info
  const release = db.get('releases').find({ id: distribution.releaseId }).value();
  
  // Get all submissions for this distribution (current + historical) from both tables
  const androidSubs = db.get('android_submission_builds').filter({ distributionId }).value() || [];
  const iosSubs = db.get('ios_submission_builds').filter({ distributionId }).value() || [];
  
  // Build complete submissions array with artifacts (✅ EXACT API SPEC)
  const submissions = [];
  
  // Android submissions
  androidSubs.forEach(sub => {
    submissions.push({
      id: sub.id,
      distributionId: sub.distributionId,
      platform: 'ANDROID',
      storeType: sub.storeType,
      status: sub.status,
      version: sub.version,
      versionCode: sub.versionCode,
      rolloutPercentage: sub.rolloutPercentage,
      inAppUpdatePriority: sub.inAppUpdatePriority,
      releaseNotes: sub.releaseNotes,
      submittedAt: sub.submittedAt,
      submittedBy: sub.submittedBy,
      statusUpdatedAt: sub.statusUpdatedAt,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      isActive: sub.isCurrent, // ✅ Map isCurrent to isActive
      artifact: sub.artifact || {
        artifactPath: sub.artifactPath,
        ...(sub.internalTrackLink && { internalTrackLink: sub.internalTrackLink }),
      },
      actionHistory: sub.actionHistory || [],
      ...(sub.rejectionReason && { rejectionReason: sub.rejectionReason }),
    });
  });
  
  // iOS submissions
  iosSubs.forEach(sub => {
    submissions.push({
      id: sub.id,
      distributionId: sub.distributionId,
      platform: 'IOS',
      storeType: sub.storeType,
      status: sub.status,
      version: sub.version,
      releaseType: sub.releaseType || 'AFTER_APPROVAL',
      phasedRelease: sub.phasedRelease,
      resetRating: sub.resetRating,
      rolloutPercentage: sub.rolloutPercentage,
      releaseNotes: sub.releaseNotes,
      submittedAt: sub.submittedAt,
      submittedBy: sub.submittedBy,
      statusUpdatedAt: sub.statusUpdatedAt,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      isActive: sub.isCurrent, // ✅ Map isCurrent to isActive
      artifact: sub.artifact || {
        testflightNumber: sub.testflightNumber,
      },
      actionHistory: sub.actionHistory || [],
      ...(sub.rejectionReason && { rejectionReason: sub.rejectionReason }),
    });
  });
  
  // Determine platforms based on actual submissions
  const platforms = ['ANDROID', 'IOS'].filter(p => submissions.some(s => s.platform === p));
  
  res.json({
    success: true,
    data: {
      id: distribution.id,
      releaseId: distribution.releaseId, // ✅ From distribution table
      branch: release?.branch || 'unknown', // ✅ From release table (joined)
      status: distribution.status, // ✅ From distribution table
      platforms,
      createdAt: distribution.createdAt,
      updatedAt: distribution.updatedAt,
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
  const { platform, version, versionCode, rolloutPercentage, inAppUpdatePriority, phasedRelease, resetRating, releaseNotes, testflightNumber } = req.body;
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
      rolloutPercentage: rolloutPercentage || 5,
      inAppUpdatePriority: inAppUpdatePriority !== undefined ? inAppUpdatePriority : 0,
    }),
    ...(platform === 'IOS' && {
      releaseType: 'AFTER_APPROVAL',
      phasedRelease: phasedRelease !== undefined ? phasedRelease : true,
      resetRating: resetRating || false,
      rolloutPercentage: 0,
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
  console.log('   GET    /api/v1/releases/:id/distribution');
  console.log('   GET    /api/v1/releases/:id/stores');
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
  // Legacy endpoints removed - use GET /api/v1/releases/:id/distribution instead
  console.log('');
});

