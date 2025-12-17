/**
 * Mock Apple App Store Connect Service
 * 
 * Used for testing and development when actual Apple credentials are not available.
 * Simulates Apple API responses without making real API calls.
 * 
 * Response formats match Apple's actual App Store Connect API v1 structure.
 */

type PhasedReleaseData = {
  id: string;
  state: 'ACTIVE' | 'PAUSED' | 'COMPLETE';
  appId: string;
  startDate: string;
  totalPauseDuration: number;
  currentDayNumber: number;
  appStoreVersionId: string;
};

/**
 * Mock Apple App Store Connect Service
 * Simulates Apple API behavior for testing with realistic response formats
 */
export class MockAppleAppStoreConnectService {
  // In-memory storage for mock phased releases
  private static mockPhasedReleases: Map<string, PhasedReleaseData> = new Map();

  constructor(
    private readonly _issuer: string,
    private readonly _keyId: string,
    private readonly _privateKey: string
  ) {
    console.log('[MockAppleService] Initialized mock Apple App Store Connect service');
  }

  /**
   * Mock: Get current phased release ID by state
   * 
   * Apple behavior: Returns null if phased release doesn't exist.
   * Caller must explicitly create phased release - no auto-creation.
   */
  async getCurrentPhasedReleaseId(
    appId: string, 
    state: 'ACTIVE' | 'PAUSED' | 'COMPLETE'
  ): Promise<string | null> {
    console.log(`[MockAppleService] Getting phased release for app ${appId} with state ${state}`);
    
    // Find phased release in mock storage
    for (const [id, release] of MockAppleAppStoreConnectService.mockPhasedReleases.entries()) {
      const appMatches = release.appId === appId;
      const stateMatches = release.state === state;
      
      if (appMatches && stateMatches) {
        console.log(`[MockAppleService] Found phased release: ${id} with state ${state}`);
        return id;
      }
    }

    // Apple never auto-creates phased releases
    // If not found, return null (caller must handle)
    console.log(`[MockAppleService] No phased release found with state ${state} - returning null`);
    return null;
  }

  /**
   * Mock: Pause phased release
   * Returns Apple API formatted response
   */
  async pausePhasedRelease(phasedReleaseId: string): Promise<any> {
    console.log(`[MockAppleService] Pausing phased release: ${phasedReleaseId}`);
    
    const release = MockAppleAppStoreConnectService.mockPhasedReleases.get(phasedReleaseId);
    
    if (!release) {
      throw new Error(`Phased release not found: ${phasedReleaseId}`);
    }

    const isNotActive = release.state !== 'ACTIVE';
    if (isNotActive) {
      throw new Error(`Cannot pause phased release with state: ${release.state}. Must be ACTIVE.`);
    }

    // Update state to PAUSED and increment pause duration
    release.state = 'PAUSED';
    release.totalPauseDuration += 1;
    MockAppleAppStoreConnectService.mockPhasedReleases.set(phasedReleaseId, release);
    
    console.log(`[MockAppleService] Successfully paused phased release: ${phasedReleaseId}`);
    
    // Return Apple API formatted response with links
    return {
      data: {
        type: 'appStoreVersionPhasedReleases',
        id: phasedReleaseId,
        attributes: {
          phasedReleaseState: 'PAUSED',
          startDate: release.startDate,
          totalPauseDuration: release.totalPauseDuration,
          currentDayNumber: release.currentDayNumber
        },
        relationships: {
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: release.appStoreVersionId
            }
          }
        },
        links: {
          self: `https://api.appstoreconnect.apple.com/v1/appStoreVersionPhasedReleases/${phasedReleaseId}`
        }
      }
    };
  }

  /**
   * Mock: Resume phased release
   * Returns Apple API formatted response
   */
  async resumePhasedRelease(phasedReleaseId: string): Promise<any> {
    console.log(`[MockAppleService] Resuming phased release: ${phasedReleaseId}`);
    
    const release = MockAppleAppStoreConnectService.mockPhasedReleases.get(phasedReleaseId);
    
    if (!release) {
      throw new Error(`Phased release not found: ${phasedReleaseId}`);
    }

    const isNotPaused = release.state !== 'PAUSED';
    if (isNotPaused) {
      throw new Error(`Cannot resume phased release with state: ${release.state}. Must be PAUSED.`);
    }

    // Update state to ACTIVE
    release.state = 'ACTIVE';
    MockAppleAppStoreConnectService.mockPhasedReleases.set(phasedReleaseId, release);
    
    console.log(`[MockAppleService] Successfully resumed phased release: ${phasedReleaseId}`);
    
    // Return Apple API formatted response with links
    return {
      data: {
        type: 'appStoreVersionPhasedReleases',
        id: phasedReleaseId,
        attributes: {
          phasedReleaseState: 'ACTIVE',
          startDate: release.startDate,
          totalPauseDuration: release.totalPauseDuration,
          currentDayNumber: release.currentDayNumber
        },
        relationships: {
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: release.appStoreVersionId
            }
          }
        },
        links: {
          self: `https://api.appstoreconnect.apple.com/v1/appStoreVersionPhasedReleases/${phasedReleaseId}`
        }
      }
    };
  }

  /**
   * Mock: Complete phased release (set to 100%)
   * Returns Apple API formatted response
   */
  async completePhasedRelease(phasedReleaseId: string): Promise<any> {
    console.log(`[MockAppleService] Completing phased release: ${phasedReleaseId}`);
    
    const release = MockAppleAppStoreConnectService.mockPhasedReleases.get(phasedReleaseId);
    
    if (!release) {
      throw new Error(`Phased release not found: ${phasedReleaseId}`);
    }

    // Must be ACTIVE to complete (if PAUSED, must resume first)
    if (release.state !== 'ACTIVE') {
      throw new Error(
        `Cannot complete phased release with state: ${release.state}. Must be ACTIVE. If PAUSED, resume first.`
      );
    }

    // Update state to COMPLETE and set to day 7 (100%)
    release.state = 'COMPLETE';
    release.currentDayNumber = 7;
    MockAppleAppStoreConnectService.mockPhasedReleases.set(phasedReleaseId, release);
    
    console.log(`[MockAppleService] Successfully completed phased release: ${phasedReleaseId}`);
    
    // Return Apple API formatted response with links
    return {
      data: {
        type: 'appStoreVersionPhasedReleases',
        id: phasedReleaseId,
        attributes: {
          phasedReleaseState: 'COMPLETE',
          startDate: release.startDate,
          totalPauseDuration: release.totalPauseDuration,
          currentDayNumber: release.currentDayNumber
        },
        relationships: {
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: release.appStoreVersionId
            }
          }
        },
        links: {
          self: `https://api.appstoreconnect.apple.com/v1/appStoreVersionPhasedReleases/${phasedReleaseId}`
        }
      }
    };
  }

  /**
   * Mock: Submit version for review
   * Returns Apple API formatted response
   */
  async submitForReview(appStoreVersionId: string): Promise<any> {
    console.log(`[MockAppleService] Submitting version ${appStoreVersionId} for review`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const submissionId = `mock-submission-${Date.now()}`;
    
    console.log(`[MockAppleService] Successfully submitted version for review - Submission ID: ${submissionId}`);
    
    // Return Apple API formatted response
    return {
      data: {
        type: 'appStoreReviewSubmissions',
        id: submissionId,
        attributes: {
          submittedDate: new Date().toISOString()
        },
        relationships: {
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: appStoreVersionId
            }
          }
        }
      }
    };
  }

  /**
   * Mock: Get app store version by version string
   * Returns single version object (first element) or null, matching real Apple service behavior
   * 
   * State logic for testing:
   * - Version 1.3.x: PREPARE_FOR_SUBMISSION (first-time submission)
   * - Version 1.4.x: REJECTED (resubmission after rejection)
   * - Version 1.5.x: METADATA_REJECTED (resubmission after metadata issues)
   * - Version 1.6.x: INVALID_BINARY (resubmission after binary issues)
   * - Version 1.7.x: DEVELOPER_REJECTED (resubmission after developer cancellation)
   * - Other versions: Return null (version doesn't exist, will create new)
   */
  async getAppStoreVersionByVersionString(
    appId: string,
    versionString: string,
    includeBuild: boolean = false
  ): Promise<any | null> {
    console.log(`[MockAppleService] Getting app store version for ${appId} v${versionString} (includeBuild: ${includeBuild})`);
    
    // Determine state based on version string for testing different scenarios
    let appStoreState: string;
    
    if (versionString.startsWith('1.3')) {
      appStoreState = 'PREPARE_FOR_SUBMISSION';  // First-time submission
    } else if (versionString.startsWith('1.4')) {
      appStoreState = 'REJECTED';  // Resubmission after rejection
    } else if (versionString.startsWith('1.5')) {
      appStoreState = 'METADATA_REJECTED';  // Resubmission after metadata issues
    } else if (versionString.startsWith('1.6')) {
      appStoreState = 'INVALID_BINARY';  // Resubmission after binary issues
    } else if (versionString.startsWith('1.7')) {
      appStoreState = 'DEVELOPER_REJECTED';  // Resubmission after developer cancellation
    } else {
      // Version doesn't exist in Apple - will trigger creation
      console.log(`[MockAppleService] Version ${versionString} not found (return null)`);
      return null;
    }
    
    const versionId = `mock-version-${Date.now()}`;
    
    console.log(`[MockAppleService] Returning version ${versionString} with state: ${appStoreState}`);
    
    // Return single version object (not array), matching real service behavior
    return {
        type: 'appStoreVersions',
        id: versionId,
        attributes: {
          platform: 'IOS',
          versionString: versionString,
        appStoreState: appStoreState,
          copyright: '2025 Mock Company',
          releaseType: 'AFTER_APPROVAL',
          earliestReleaseDate: null,
          usesIdfa: false,
          downloadable: true,
          createdDate: new Date().toISOString()
        },
        relationships: {
          app: {
            data: {
              type: 'apps',
              id: appId
            }
          }
        },
        links: {
          self: `https://api.appstoreconnect.apple.com/v1/appStoreVersions/${versionId}`
        }
    };
  }

  /**
   * Mock: Get the build currently associated with an app store version
   */
  async getAssociatedBuild(appStoreVersionId: string): Promise<any | null> {
    console.log(`[MockAppleService] Getting associated build for version ${appStoreVersionId}`);
    
    // Mock: Return null (no build associated) for testing
    // In real scenarios, this could return a build if one exists
    return null;
  }

  /**
   * Mock: Create app store version
   * Returns Apple API formatted response
   */
  async createAppStoreVersion(
    appId: string,
    versionString: string,
    platform: string = 'IOS'
  ): Promise<any> {
    console.log(`[MockAppleService] Creating app store version ${versionString} for app ${appId}`);
    
    const versionId = `mock-version-${Date.now()}`;
    
    // Return Apple API formatted response
    return {
      data: {
        type: 'appStoreVersions',
        id: versionId,
        attributes: {
          platform: platform.toUpperCase(),
          versionString: versionString,
          appStoreState: 'PREPARE_FOR_SUBMISSION',
          copyright: '2025 Mock Company',
          releaseType: 'MANUAL',
          earliestReleaseDate: null,
          usesIdfa: false,
          downloadable: false,
          createdDate: new Date().toISOString()
        },
        relationships: {
          app: {
            data: {
              type: 'apps',
              id: appId
            }
          },
          build: {
            data: null
          },
          appStoreVersionLocalizations: {
            data: []
          }
        }
      }
    };
  }

  /**
   * Mock: Update app store version release type
   * Returns Apple API formatted response
   */
  async updateAppStoreVersionReleaseType(versionId: string): Promise<any> {
    console.log(`[MockAppleService] Updating version ${versionId} release type to AFTER_APPROVAL`);
    
    // Return Apple API formatted response
    return {
      data: {
        type: 'appStoreVersions',
        id: versionId,
        attributes: {
          releaseType: 'AFTER_APPROVAL'
        }
      }
    };
  }

  /**
   * Mock: Update release notes
   * Returns Apple API formatted response
   */
  async updateReleaseNotes(
    versionId: string,
    releaseNotes: string
  ): Promise<any> {
    console.log(`[MockAppleService] Updating release notes for version ${versionId}`);
    console.log(`[MockAppleService] Release notes length: ${releaseNotes.length} characters`);
    
    // Return Apple API formatted response
    return {
      data: {
        type: 'appStoreVersionLocalizations',
        id: `mock-localization-${Date.now()}`,
        attributes: {
          locale: 'en-US',
          whatsNew: releaseNotes
        },
        relationships: {
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: versionId
            }
          }
        }
      }
    };
  }

  /**
   * Mock: Get build ID by build number
   * Returns Apple API formatted response
   */
  async getBuildIdByBuildNumber(
    appId: string,
    buildNumber: string
  ): Promise<string | null> {
    console.log(`[MockAppleService] Getting build ID for build ${buildNumber} (app ${appId})`);
    
    const buildId = `mock-build-${buildNumber}-${Date.now()}`;
    
    console.log(`[MockAppleService] Found build ID: ${buildId}`);
    return buildId;
  }

  /**
   * Mock: Associate build with version
   * Returns Apple API formatted response
   */
  async associateBuildWithVersion(
    versionId: string,
    buildId: string
  ): Promise<any> {
    console.log(`[MockAppleService] Associating build ${buildId} with version ${versionId}`);
    
    // Return Apple API formatted response
    return {
      data: {
        type: 'appStoreVersions',
        id: versionId,
        relationships: {
          build: {
            data: {
              type: 'builds',
              id: buildId
            }
          }
        }
      }
    };
  }

  /**
   * Mock: Get phased release for an app store version
   * Returns null if no phased release exists
   */
  async getPhasedReleaseForVersion(appStoreVersionId: string): Promise<any | null> {
    console.log(`[MockAppleService] Getting phased release for version ${appStoreVersionId}`);
    
    // Check if a phased release exists for this version
    for (const [phasedReleaseId, phasedReleaseData] of MockAppleAppStoreConnectService.mockPhasedReleases.entries()) {
      if (phasedReleaseData.appStoreVersionId === appStoreVersionId) {
        console.log(`[MockAppleService] Found phased release: ${phasedReleaseId}`);
        
        return {
          data: {
            type: 'appStoreVersionPhasedReleases',
            id: phasedReleaseId,
            attributes: {
              phasedReleaseState: phasedReleaseData.state,
              startDate: phasedReleaseData.startDate,
              totalPauseDuration: phasedReleaseData.totalPauseDuration,
              currentDayNumber: phasedReleaseData.currentDayNumber
            },
            relationships: {
              appStoreVersion: {
                data: {
                  type: 'appStoreVersions',
                  id: appStoreVersionId
                }
              }
            }
          }
        };
      }
    }
    
    console.log(`[MockAppleService] No phased release found for version ${appStoreVersionId}`);
    return null;
  }

  /**
   * Mock: Create phased release
   * Returns Apple API formatted response
   */
  async createPhasedRelease(versionId: string): Promise<any> {
    console.log(`[MockAppleService] Creating phased release for version ${versionId}`);
    
    const phasedReleaseId = `mock-phased-release-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    
    // Store the phased release
    MockAppleAppStoreConnectService.mockPhasedReleases.set(phasedReleaseId, {
      id: phasedReleaseId,
      state: 'ACTIVE',
      appId: 'mock-app-id',
      startDate: today,
      totalPauseDuration: 0,
      currentDayNumber: 1,
      appStoreVersionId: versionId
    });
    
    console.log(`[MockAppleService] Created phased release: ${phasedReleaseId}`);
    
    // Return Apple API formatted response with links
    return {
      data: {
        type: 'appStoreVersionPhasedReleases',
        id: phasedReleaseId,
        attributes: {
          phasedReleaseState: 'ACTIVE',
          startDate: today,
          totalPauseDuration: 0,
          currentDayNumber: 1
        },
        relationships: {
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: versionId
            }
          }
        },
        links: {
          self: `https://api.appstoreconnect.apple.com/v1/appStoreVersionPhasedReleases/${phasedReleaseId}`
        }
      }
    };
  }

  /**
   * Mock: Update reset ratings
   * Returns Apple API formatted response
   * 
   * Apple API: Reset ratings is controlled via resetRatings boolean attribute
   */
  async updateResetRatings(
    versionId: string,
    resetRating: boolean
  ): Promise<any> {
    console.log(`[MockAppleService] Updating reset ratings to ${resetRating} for version ${versionId}`);
    
    // Return Apple API formatted response
    return {
      data: {
        type: 'appStoreVersions',
        id: versionId,
        attributes: {
          resetRatings: resetRating
        }
      }
    };
  }

  /**
   * Clear all mock data (useful for testing)
   */
  static clearMockData(): void {
    MockAppleAppStoreConnectService.mockPhasedReleases.clear();
    console.log('[MockAppleService] Cleared all mock phased release data');
  }

  /**
   * Mock: Get app store review submission ID for a specific version
   * Returns mock review submission ID
   */
  async getReviewSubmissionIdForVersion(appStoreVersionId: string): Promise<string | null> {
    console.log(`[MockAppleService] Getting review submission for version ${appStoreVersionId}`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Generate mock review submission ID
    const reviewSubmissionId = `mock-review-submission-${Date.now()}`;
    
    console.log(`[MockAppleService] Found review submission: ${reviewSubmissionId}`);
    
    return reviewSubmissionId;
  }

  /**
   * Mock: Delete (cancel) an app store review submission
   * Simulates canceling a submission in Apple App Store Connect
   */
  async deleteReviewSubmission(reviewSubmissionId: string): Promise<void> {
    console.log(`[MockAppleService] Deleting review submission ${reviewSubmissionId}`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`[MockAppleService] Successfully deleted review submission ${reviewSubmissionId}`);
  }

  /**
   * Seed mock data for testing (creates ACTIVE and PAUSED phased releases)
   * Call this when mock service is created to populate test data
   * 
   * @param appId - The App Store Connect app ID (e.g., "1234567890")
   */
  static seedTestData(appId: string = '1234567890'): void {
    console.log(`[MockAppleService] Seeding test data for app ${appId}...`);
    
    // Create ACTIVE phased release for PAUSE testing (started 2 days ago)
    const activePhasedRelease1 = {
      id: 'mock-phased-active-1',
      state: 'ACTIVE' as const,
      appId: appId,
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalPauseDuration: 0,
      currentDayNumber: 2,
      appStoreVersionId: 'mock-version-1'
    };
    
    // Create PAUSED phased release for RESUME testing (started 4 days ago, paused 2 days)
    const pausedPhasedRelease = {
      id: 'mock-phased-paused-1',
      state: 'PAUSED' as const,
      appId: appId,
      startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalPauseDuration: 2,
      currentDayNumber: 4,
      appStoreVersionId: 'mock-version-2'
    };
    
    // Create ACTIVE phased release for COMPLETE testing (started 5 days ago)
    const activePhasedRelease2 = {
      id: 'mock-phased-active-2',
      state: 'ACTIVE' as const,
      appId: appId,
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalPauseDuration: 1,
      currentDayNumber: 5,
      appStoreVersionId: 'mock-version-3'
    };
    
    MockAppleAppStoreConnectService.mockPhasedReleases.set(activePhasedRelease1.id, activePhasedRelease1);
    MockAppleAppStoreConnectService.mockPhasedReleases.set(pausedPhasedRelease.id, pausedPhasedRelease);
    MockAppleAppStoreConnectService.mockPhasedReleases.set(activePhasedRelease2.id, activePhasedRelease2);
    
    console.log('[MockAppleService] ✅ Seeded 3 phased releases:');
    console.log(`  - ${activePhasedRelease1.id}: ACTIVE (for pause testing)`);
    console.log(`  - ${pausedPhasedRelease.id}: PAUSED (for resume testing)`);
    console.log(`  - ${activePhasedRelease2.id}: ACTIVE (for complete testing)`);
  }
}

