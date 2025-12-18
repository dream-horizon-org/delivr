/**
 * Mock Server Middleware - Distribution Module
 * 
 * Custom middleware for simulating complex scenarios:
 * - Version conflicts
 * - Exposure control conflicts
 * - Submission state transitions
 * - Rollout updates
 * 
 * ✅ 100% ALIGNED WITH DISTRIBUTION_API_SPEC.md
 */

/**
 * Distribution Middleware
 */
function distributionMiddleware(req, res, next) {
  const { method, path, body } = req;
  
  // ============================================================================
  // SUBMIT EXISTING PENDING SUBMISSION (First-Time Submission)
  // PUT /api/v1/submissions/:submissionId/submit
  // ============================================================================
  
  if (method === 'PUT' && path.includes('/submissions/') && path.includes('/submit')) {
    const submissionId = extractSubmissionId(path);
    
    // Validate iOS fields if present
    if (body.phasedRelease !== undefined && typeof body.phasedRelease !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PHASED_RELEASE',
          message: 'phasedRelease must be a boolean',
          category: 'VALIDATION',
          httpStatus: 400,
        },
      });
    }
    if (body.resetRating !== undefined && typeof body.resetRating !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RESET_RATING',
          message: 'resetRating must be a boolean',
          category: 'VALIDATION',
          httpStatus: 400,
        },
      });
    }
    
    // Determine platform from submissionId
    const isAndroid = submissionId.includes('android');
    const isIOS = submissionId.includes('ios');
    
    // Android response
    if (isAndroid) {
      return res.status(200).json({
        success: true,
        data: {
          id: submissionId,
          distributionId: 'dist_123',
          platform: 'ANDROID',
          storeType: 'PLAY_STORE',
          status: 'IN_REVIEW',
          version: '2.7.0',
          versionCode: 270,
          rolloutPercentage: body.rolloutPercentage || 5.5,
          inAppUpdatePriority: body.inAppUpdatePriority || 0,
          releaseNotes: body.releaseNotes || '',
          submittedAt: new Date().toISOString(),
          submittedBy: 'prince@dream11.com',
          statusUpdatedAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          artifact: {
            artifactPath: 'https://s3.amazonaws.com/presigned-url/app-release.aab',
            internalTrackLink: 'https://play.google.com/apps/testing/com.app',
          },
          actionHistory: [],
        },
      });
    }
    
    // iOS response
    if (isIOS) {
      return res.status(200).json({
        success: true,
        data: {
          id: submissionId,
          distributionId: 'dist_123',
          platform: 'IOS',
          storeType: 'APP_STORE',
          status: 'IN_REVIEW',
          version: '2.7.0',
          releaseType: 'AFTER_APPROVAL',
          phasedRelease: body.phasedRelease ?? true,
          resetRating: body.resetRating ?? false,
          rolloutPercentage: 0,
          releaseNotes: body.releaseNotes || '',
          submittedAt: new Date().toISOString(),
          submittedBy: 'prince@dream11.com',
          statusUpdatedAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          artifact: {
            testflightNumber: 56789,
          },
          actionHistory: [],
        },
      });
    }
  }
  
  // ============================================================================
  // CREATE NEW SUBMISSION (Resubmission)
  // POST /api/v1/distributions/:distributionId/submissions
  // ============================================================================
  
  if (method === 'POST' && path.includes('/distributions/') && path.includes('/submissions')) {
    const distributionId = extractDistributionId(path);
    const { platform } = body;
    
    // Validate iOS fields if iOS platform
    if (platform === 'IOS') {
      if (body.phasedRelease !== undefined && typeof body.phasedRelease !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PHASED_RELEASE',
            message: 'phasedRelease must be a boolean',
            category: 'VALIDATION',
            httpStatus: 400,
          },
        });
      }
      if (body.resetRating !== undefined && typeof body.resetRating !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RESET_RATING',
            message: 'resetRating must be a boolean',
            category: 'VALIDATION',
            httpStatus: 400,
          },
        });
      }
    }
    
    // Android resubmission response
    if (platform === 'ANDROID') {
      return res.status(201).json({
        success: true,
        data: {
          id: `sub_new_android_${Date.now()}`,
          distributionId,
          platform: 'ANDROID',
          storeType: 'PLAY_STORE',
          status: 'IN_REVIEW',
          version: body.version || '2.7.1',
          versionCode: body.versionCode || 271,
          rolloutPercentage: body.rolloutPercentage || 5.5,
          inAppUpdatePriority: body.inAppUpdatePriority || 0,
          releaseNotes: body.releaseNotes || '',
          submittedAt: new Date().toISOString(),
          submittedBy: 'prince@dream11.com',
          statusUpdatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          artifact: {
            artifactPath: 'https://s3.amazonaws.com/new-build/app-release-v2.7.1.aab',
            // No internalTrackLink for resubmissions - goes directly to production
          },
          actionHistory: [],
        },
      });
    }
    
    // iOS resubmission response
    if (platform === 'IOS') {
      return res.status(201).json({
        success: true,
        data: {
          id: `sub_new_ios_${Date.now()}`,
          distributionId,
          platform: 'IOS',
          storeType: 'APP_STORE',
          status: 'IN_REVIEW',
          version: body.version || '2.7.1',
          releaseType: 'AFTER_APPROVAL',
          phasedRelease: body.phasedRelease ?? true,
          resetRating: body.resetRating ?? false,
          rolloutPercentage: 0,
          releaseNotes: body.releaseNotes || '',
          submittedAt: new Date().toISOString(),
          submittedBy: 'prince@dream11.com',
          statusUpdatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          artifact: {
            testflightNumber: body.testflightNumber || 56790,
          },
          actionHistory: [],
        },
      });
    }
  }
  
  // ============================================================================
  // UPDATE ROLLOUT
  // PATCH /api/v1/submissions/:submissionId/rollout
  // ============================================================================
  
  if (method === 'PATCH' && path.includes('/rollout') && !path.includes('/pause') && !path.includes('/resume') && !path.includes('/halt')) {
    const submissionId = extractSubmissionId(path);
    const { rolloutPercentage } = body;
    
    // Validate percentage (supports decimals like 5.5)
    if (rolloutPercentage === undefined || rolloutPercentage < 0 || rolloutPercentage > 100 || typeof rolloutPercentage !== 'number') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROLLOUT_PERCENTAGE',
          message: 'Rollout percentage must be a number between 0 and 100',
          category: 'VALIDATION',
          httpStatus: 400,
          details: {
            requestedPercentage: rolloutPercentage,
            minAllowed: 0,
            maxAllowed: 100,
            note: 'Decimals are supported (e.g., 5.5)',
          },
        },
      });
    }
    
    // Success case
    return res.status(200).json({
      success: true,
      data: {
        id: submissionId,
        rolloutPercentage: rolloutPercentage,
        statusUpdatedAt: new Date().toISOString(),
      },
    });
  }
  
  // ============================================================================
  // PAUSE ROLLOUT (iOS Only)
  // PATCH /api/v1/submissions/:submissionId/rollout/pause
  // ============================================================================
  
  if (method === 'PATCH' && path.includes('/rollout/pause')) {
    const submissionId = extractSubmissionId(path);
    
    return res.status(200).json({
      success: true,
      data: {
        id: submissionId,
        status: 'PAUSED',
        statusUpdatedAt: new Date().toISOString(),
      },
    });
  }
  
  // ============================================================================
  // RESUME ROLLOUT (iOS Only)
  // PATCH /api/v1/submissions/:submissionId/rollout/resume
  // ============================================================================
  
  if (method === 'PATCH' && path.includes('/rollout/resume')) {
    const submissionId = extractSubmissionId(path);
    
    return res.status(200).json({
      success: true,
      data: {
        id: submissionId,
        status: 'LIVE',
        statusUpdatedAt: new Date().toISOString(),
      },
    });
  }
  
  // ============================================================================
  // HALT ROLLOUT (Emergency Stop)
  // PATCH /api/v1/submissions/:submissionId/rollout/halt
  // ============================================================================
  
  if (method === 'PATCH' && path.includes('/rollout/halt')) {
    const submissionId = extractSubmissionId(path);
    
    return res.status(200).json({
      success: true,
      data: {
        id: submissionId,
        status: 'HALTED',
        statusUpdatedAt: new Date().toISOString(),
      },
    });
  }
  
  // ============================================================================
  // CANCEL SUBMISSION
  // PATCH /api/v1/submissions/:submissionId/cancel
  // ============================================================================
  
  if (method === 'PATCH' && path.includes('/cancel')) {
    const submissionId = extractSubmissionId(path);
    
    return res.status(200).json({
      success: true,
      data: {
        id: submissionId,
        status: 'CANCELLED',
        statusUpdatedAt: new Date().toISOString(),
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

function extractDistributionId(path) {
  const match = path.match(/distributions\/([^/]+)/);
  return match ? match[1] : null;
}

export default distributionMiddleware;
