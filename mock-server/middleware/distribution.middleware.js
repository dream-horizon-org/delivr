/**
 * Mock Server Middleware - Distribution Module
 * 
 * Custom middleware for simulating complex scenarios:
 * - Version conflicts
 * - Exposure control conflicts
 * - Submission state transitions
 * - Rollout updates
 */

/**
 * Distribution Middleware
 */
function distributionMiddleware(req, res, next) {
  const { method, path, body } = req;
  
  // ============================================================================
  // SUBMIT TO STORES
  // ============================================================================
  
  if (method === 'POST' && path.includes('/distribute')) {
    const releaseId = extractReleaseId(path);
    
    // Scenario: Version conflict (409)
    if (releaseId === 'rel_version_conflict') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'VERSION_EXISTS',
          message: 'This version already exists in the store',
          category: 'CONFLICT',
          httpStatus: 409,
          details: {
            platform: 'ANDROID',
            version: '2.5.0',
            existingStatus: 'LIVE',
            resolution: {
              title: 'Version Conflict',
              message: 'Version 2.5.0 already exists in Play Store',
              options: [
                {
                  action: 'CREATE_NEW_RELEASE',
                  label: 'Create new release with incremented version',
                  recommended: true,
                },
                {
                  action: 'DELETE_DRAFT',
                  label: 'Delete draft version in store console',
                  availableIf: 'existingStatus === DRAFT',
                },
              ],
            },
          },
        },
      });
    }
    
    // Scenario: Exposure control conflict (409)
    if (releaseId === 'rel_exposure_conflict') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EXPOSURE_CONTROL_CONFLICT',
          message: 'Previous release has active partial rollout',
          category: 'CONFLICT',
          httpStatus: 409,
          details: {
            platform: 'ANDROID',
            currentRelease: {
              version: '2.4.0',
              exposurePercent: 25,
              status: 'APPROVED_RELEASED',
            },
            resolution: {
              title: 'Active Rollout Detected',
              message: 'Previous release v2.4.0 is at 25% rollout',
              impact: 'Submitting new version will affect current rollout',
              options: [
                {
                  action: 'COMPLETE_PREVIOUS',
                  label: 'Complete previous rollout to 100% first',
                  recommended: true,
                },
                {
                  action: 'HALT_PREVIOUS',
                  label: 'Halt previous release (make new release primary)',
                  warning: 'Users on v2.4.0 may be affected',
                },
                {
                  action: 'PROCEED_ANYWAY',
                  label: 'Proceed with submission (advanced)',
                  warning: 'Requires manual store console management',
                },
              ],
            },
          },
        },
      });
    }
    
    // Scenario: PM approval required (403)
    if (releaseId === 'rel_pm_not_approved') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PM_APPROVAL_REQUIRED',
          message: 'Project management approval required before distribution',
          category: 'AUTH',
          httpStatus: 403,
          details: {
            pmTicket: {
              id: 'PROJ-1234',
              status: 'IN_PROGRESS',
              url: 'https://jira.example.com/browse/PROJ-1234',
            },
            requiredStatus: 'DONE',
          },
        },
      });
    }
    
    // Success case
    return res.status(201).json({
      success: true,
      data: {
        releaseId,
        submissionIds: ['sub_new_android', 'sub_new_ios'],
        submissions: [
          {
            id: 'sub_new_android',
            platform: 'ANDROID',
            storeType: 'PLAY_STORE',
            status: 'BUILD_SUBMITTED',
            buildId: 'build_android_1',
            versionName: '2.5.0',
            versionCode: '250',
            externalSubmissionId: 'edit_new_123',
            track: 'PRODUCTION',
            exposurePercent: 1,
            submittedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          {
            id: 'sub_new_ios',
            platform: 'IOS',
            storeType: 'APP_STORE',
            status: 'BUILD_SUBMITTED',
            buildId: 'build_ios_1',
            versionName: '2.5.0',
            versionCode: '250',
            externalSubmissionId: 'sub_new_456',
            track: null,
            exposurePercent: 0,
            submittedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
        releaseStatus: 'BUILDS_SUBMITTED',
      },
    });
  }
  
  // ============================================================================
  // UPDATE ROLLOUT
  // ============================================================================
  
  if (method === 'PATCH' && path.includes('/rollout')) {
    const submissionId = extractSubmissionId(path);
    const { percentage } = body;
    
    // Validate percentage
    if (!percentage || percentage < 1 || percentage > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROLLOUT_PERCENTAGE',
          message: 'Rollout percentage must be between 1 and 100',
          category: 'VALIDATION',
          httpStatus: 400,
          details: {
            requestedPercentage: percentage,
            minAllowed: 1,
            maxAllowed: 100,
          },
        },
      });
    }
    
    // Success case
    return res.status(200).json({
      success: true,
      data: {
        submissionId,
        previousPercentage: 1,
        newPercentage: percentage,
        exposurePercent: percentage,
        updatedAt: new Date().toISOString(),
        autoPromotedToReleased: percentage === 100,
        releaseStatus: percentage === 100 ? 'RELEASED' : 'BUILDS_SUBMITTED',
      },
    });
  }
  
  // ============================================================================
  // PAUSE ROLLOUT
  // ============================================================================
  
  if (method === 'POST' && path.includes('/pause')) {
    const submissionId = extractSubmissionId(path);
    
    return res.status(200).json({
      success: true,
      data: {
        submissionId,
        rolloutStatus: 'PAUSED',
        pausedAt: new Date().toISOString(),
        reason: body.reason || null,
      },
    });
  }
  
  // ============================================================================
  // RESUME ROLLOUT
  // ============================================================================
  
  if (method === 'POST' && path.includes('/resume')) {
    const submissionId = extractSubmissionId(path);
    
    return res.status(200).json({
      success: true,
      data: {
        submissionId,
        rolloutStatus: 'ACTIVE',
        resumedAt: new Date().toISOString(),
      },
    });
  }
  
  // ============================================================================
  // HALT ROLLOUT
  // ============================================================================
  
  if (method === 'POST' && path.includes('/halt')) {
    const submissionId = extractSubmissionId(path);
    
    return res.status(200).json({
      success: true,
      data: {
        submissionId,
        releaseStatus: 'HALTED',
        haltedAt: new Date().toISOString(),
        reason: body.reason,
        severity: body.severity,
        message: 'Release halted. A new hotfix release is required.',
      },
    });
  }
  
  // ============================================================================
  // RETRY SUBMISSION
  // ============================================================================
  
  if (method === 'POST' && path.includes('/retry')) {
    const submissionId = extractSubmissionId(path);
    
    return res.status(200).json({
      success: true,
      data: {
        submissionId,
        status: 'BUILD_SUBMITTED',
        retryCount: 1,
        submittedAt: new Date().toISOString(),
        message: 'Submission retried successfully',
      },
    });
  }
  
  // ============================================================================
  // UPLOAD AAB
  // ============================================================================
  
  if (method === 'POST' && path.includes('/upload-aab')) {
    const releaseId = extractReleaseId(path);
    
    // Simulate successful upload
    return res.status(201).json({
      success: true,
      data: {
        buildId: `build_android_${Date.now()}`,
        releaseId,
        platform: 'ANDROID',
        versionName: '2.5.0',
        versionCode: '250',
        packageName: 'com.example.app',
        fileName: 'app-release.aab',
        fileSize: 50 * 1024 * 1024, // 50 MB
        checksum: 'mock_checksum_123',
        artifactPath: 's3://delivr-builds/mock.aab',
        internalTrackLink: 'https://play.google.com/apps/internaltest/mock',
        uploadedToTrack: 'INTERNAL',
        buildUploadStatus: 'UPLOADED',
        createdAt: new Date().toISOString(),
      },
    });
  }
  
  // ============================================================================
  // VERIFY TESTFLIGHT
  // ============================================================================
  
  if (method === 'POST' && path.includes('/verify-testflight')) {
    const releaseId = extractReleaseId(path);
    const { testflightBuildNumber } = body;
    
    // Success case
    return res.status(200).json({
      success: true,
      data: {
        buildId: `build_ios_${Date.now()}`,
        releaseId,
        platform: 'IOS',
        testflightNumber: testflightBuildNumber,
        versionName: '2.5.0',
        versionCode: '250',
        buildStatus: 'PROCESSED',
        appStoreConnectId: 'mock_asc_id',
        bundleId: 'com.example.app',
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        testflightLink: 'https://testflight.apple.com/join/mock',
        verified: true,
        buildUploadStatus: 'UPLOADED',
        createdAt: new Date().toISOString(),
      },
    });
  }
  
  // ============================================================================
  // GET BUILD DETAILS (Pre-Release Build)
  // ============================================================================
  
  if (method === 'GET' && /releases\/[^/]+\/builds\/[^/]+/.test(path)) {
    const releaseId = extractReleaseId(path);
    const buildIdMatch = path.match(/builds\/([^/]+)/);
    const buildId = buildIdMatch ? buildIdMatch[1] : null;
    
    // Mock: Return a pre-release build with testing links
    return res.status(200).json({
      success: true,
      data: {
        id: buildId,
        releaseId,
        platform: 'ANDROID', // or IOS based on buildId
        buildType: 'PRODUCTION',
        versionName: '2.5.0',
        versionCode: '250',
        artifactPath: 's3://delivr-builds/rel_1/android/app-release.aab',
        checksum: 'mock-checksum',
        internalTrackLink: 'https://play.google.com/apps/internaltest/com.example.app',
        testflightLink: buildId.includes('ios') ? 'https://testflight.apple.com/join/mock' : null,
        testflightNumber: buildId.includes('ios') ? '17965' : null,
        buildStrategy: 'MANUAL',
        buildUploadStatus: 'UPLOADED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }
  
  // ============================================================================
  // GET DISTRIBUTION STATUS
  // ============================================================================
  
  if (method === 'GET' && path.includes('/distribution/status')) {
    const releaseId = extractReleaseId(path);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const platform = url.searchParams.get('platform');
    
    // Mock: Return per-platform status
    const androidStatus = {
      submitted: true,
      submissionId: 'sub_android_1',
      status: 'APPROVED_RELEASED',
      exposurePercent: 25,
      canRetry: false,
      error: null,
    };
    
    const iosStatus = {
      submitted: true,
      submissionId: 'sub_ios_1',
      status: 'BUILD_SUBMITTED',
      exposurePercent: 0,
      canRetry: false,
      error: null,
    };
    
    const platforms = {};
    if (!platform || platform === 'ANDROID') {
      platforms.android = androidStatus;
    }
    if (!platform || platform === 'IOS') {
      platforms.ios = iosStatus;
    }
    
    return res.status(200).json({
      success: true,
      data: {
        releaseId,
        releaseVersion: '2.5.0',
        releaseStatus: 'BUILDS_SUBMITTED',
        platforms,
        isComplete: false,
        overallProgress: 12.5,
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        completedAt: null,
      },
    });
  }
  
  // ============================================================================
  // GET RELEASE STORES
  // ============================================================================
  
  if (method === 'GET' && path.includes('/stores') && !path.includes('/submissions')) {
    const releaseId = extractReleaseId(path);
    
    // Mock: Return stores configured for this release
    // (from release config)
    return res.status(200).json({
      success: true,
      data: {
        releaseId,
        stores: [
          {
            id: 'play_store_app_a',
            channelType: 'PLAY_STORE',
            platform: 'ANDROID',
            displayName: 'Google Play Store - App A',
            appIdentifier: 'com.example.app_a',
            status: 'VERIFIED',
            capabilities: {
              supportsRollout: true,
              supportsTracks: true,
              supportsVersionCheck: true,
              supportsStatusPolling: true,
              requiresReview: true,
              availableTracks: ['INTERNAL', 'ALPHA', 'BETA', 'PRODUCTION'],
            },
            lastVerifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'app_store_app_a',
            channelType: 'APP_STORE',
            platform: 'IOS',
            displayName: 'Apple App Store - App A',
            appIdentifier: 'com.example.app_a',
            status: 'VERIFIED',
            capabilities: {
              supportsRollout: false,
              supportsTracks: false,
              supportsVersionCheck: true,
              supportsStatusPolling: true,
              requiresReview: true,
            },
            lastVerifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      },
    });
  }
  
  // Continue to next middleware
  next();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractReleaseId(path) {
  const match = path.match(/releases\/([^/]+)/);
  return match ? match[1] : null;
}

function extractSubmissionId(path) {
  const match = path.match(/submissions\/([^/]+)/);
  return match ? match[1] : null;
}

export default distributionMiddleware;



