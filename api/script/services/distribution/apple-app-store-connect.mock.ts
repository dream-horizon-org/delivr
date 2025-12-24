/**
 * Stateful Mock Apple App Store Connect Service
 * 
 * Architecture:
 * ✅ Bound to credentials (like Apple's real SDK)
 * ✅ appId is implicit context, not domain data
 * ✅ Each service instance scoped to one app
 * ✅ Deterministic, stable IDs (no random timestamps)
 * ✅ Enforces real Apple state transition rules
 * ✅ True state persistence across requests
 * 
 * Response formats match Apple's App Store Connect API v1.
 */

/* ==================== TYPES ==================== */

type AppStoreState =
  | 'PREPARE_FOR_SUBMISSION'
  | 'IN_REVIEW'
  | 'REJECTED'
  | 'METADATA_REJECTED'
  | 'INVALID_BINARY'
  | 'DEVELOPER_REJECTED'
  | 'READY_FOR_SALE';

type PhasedState = 'ACTIVE' | 'PAUSED' | 'COMPLETE';

type AppVersion = {
  id: string;
  versionString: string;
  state: AppStoreState;
  buildId: string | null;
};

type PhasedRelease = {
  id: string;
  versionId: string;
  state: PhasedState;
  startDate: string;
  totalPauseDuration: number;
  currentDayNumber: number;
};

/* ==================== IN-MEMORY DATABASE (SINGLETON) ==================== */

class MockAppleDB {
  versions = new Map<string, AppVersion>();
  phasedReleases = new Map<string, PhasedRelease>();
  reviewSubmissions = new Map<string, { versionId: string; submittedDate: string }>();

  reset() {
    this.versions.clear();
    this.phasedReleases.clear();
    this.reviewSubmissions.clear();
  }
}

// ✅ Singleton instance - shared across all mock service instances
// This ensures state persists between API calls
const globalMockAppleDB = new MockAppleDB();

/* ==================== SEED DATA ==================== */

/**
 * Seeds deterministic test data for one app
 * Matches database seed patterns for testing
 * Only seeds if DB is empty (prevents resetting state on every service instantiation)
 */
function seedMockAppleData(db: MockAppleDB) {
  // ✅ Only seed if DB is empty (first initialization)
  if (db.versions.size > 0) {
    console.log('[MockApple] DB already seeded, preserving existing state');
    return;
  }
  
  db.reset();
  
  console.log('[MockApple] Seeding deterministic data...');
  
  // ========== VERSIONS (deterministic IDs based on version string) ==========
  
  // v1.2.1 → IN_REVIEW (for cancel testing)
  db.versions.set('version-121', {
    id: 'version-121',
    versionString: '1.2.1',
    state: 'IN_REVIEW',
    buildId: 'build-121'
  });

  // v1.3.x → PREPARE_FOR_SUBMISSION (first-time submission)
  db.versions.set('version-130', {
    id: 'version-130',
    versionString: '1.3.0',
    state: 'PREPARE_FOR_SUBMISSION',
    buildId: null
  });

  // v1.4.x → REJECTED (resubmission scenario)
  db.versions.set('version-140', {
    id: 'version-140',
    versionString: '1.4.0',
    state: 'REJECTED',
    buildId: 'build-140'
  });

  // v1.5.x → METADATA_REJECTED
  db.versions.set('version-150', {
    id: 'version-150',
    versionString: '1.5.0',
    state: 'METADATA_REJECTED',
    buildId: 'build-150'
  });

  // v1.6.x → INVALID_BINARY
  db.versions.set('version-160', {
    id: 'version-160',
    versionString: '1.6.0',
    state: 'INVALID_BINARY',
    buildId: 'build-160'
  });

  // v1.7.x → DEVELOPER_REJECTED
  db.versions.set('version-170', {
    id: 'version-170',
    versionString: '1.7.0',
    state: 'DEVELOPER_REJECTED',
    buildId: 'build-170'
  });

  // v1.8.2 → READY_FOR_SALE (with PAUSED phased release)
  db.versions.set('version-182', {
    id: 'version-182',
    versionString: '1.8.2',
    state: 'READY_FOR_SALE',
    buildId: 'build-182'
  });

  // v1.8.3 → READY_FOR_SALE (with PAUSED phased release)
  db.versions.set('version-183', {
    id: 'version-183',
    versionString: '1.8.3',
    state: 'READY_FOR_SALE',
    buildId: 'build-183'
  });

  // v1.8.4 → READY_FOR_SALE (with ACTIVE phased release - for pause testing)
  db.versions.set('version-184', {
    id: 'version-184',
    versionString: '1.8.4',
    state: 'READY_FOR_SALE',
    buildId: 'build-184'
  });

  // v1.8.5 → READY_FOR_SALE (with PAUSED phased release - for resume testing)
  db.versions.set('version-185', {
    id: 'version-185',
    versionString: '1.8.5',
    state: 'READY_FOR_SALE',
    buildId: 'build-185'
  });

  // v1.8.6 → READY_FOR_SALE (with ACTIVE phased release - for pause testing)
  db.versions.set('version-186', {
    id: 'version-186',
    versionString: '1.8.6',
    state: 'READY_FOR_SALE',
    buildId: 'build-186'
  });

  // ========== PHASED RELEASES ==========
  
  // v1.8.2 → PAUSED at day 4 (can RESUME)
  db.phasedReleases.set('phased-182', {
    id: 'phased-182',
    versionId: 'version-182',
    state: 'PAUSED',
    startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalPauseDuration: 2,
    currentDayNumber: 4
  });

  // v1.8.3 → PAUSED at day 3 (can RESUME)
  db.phasedReleases.set('phased-183', {
    id: 'phased-183',
    versionId: 'version-183',
    state: 'PAUSED',
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalPauseDuration: 1,
    currentDayNumber: 3
  });

  // v1.8.4 → ACTIVE at day 2 (can PAUSE)
  db.phasedReleases.set('phased-184', {
    id: 'phased-184',
    versionId: 'version-184',
    state: 'ACTIVE',
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalPauseDuration: 0,
    currentDayNumber: 2
  });

  // v1.8.5 → PAUSED at day 5 (can RESUME)
  db.phasedReleases.set('phased-185', {
    id: 'phased-185',
    versionId: 'version-185',
    state: 'PAUSED',
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalPauseDuration: 3,
    currentDayNumber: 5
  });

  // v1.8.6 → ACTIVE at day 1 (can PAUSE)
  db.phasedReleases.set('phased-186', {
    id: 'phased-186',
    versionId: 'version-186',
    state: 'ACTIVE',
    startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalPauseDuration: 0,
    currentDayNumber: 1
  });

  console.log('[MockApple] ✅ Seeded versions:');
  console.log('  - version-121 (v1.2.1): IN_REVIEW (cancelable)');
  console.log('  - version-130 (v1.3.0): PREPARE_FOR_SUBMISSION');
  console.log('  - version-182 to version-186 (v1.8.2-1.8.6): READY_FOR_SALE');
  console.log('[MockApple] ✅ Seeded phased releases (5 test cases):');
  console.log('  - phased-182 (v1.8.2): PAUSED, day 4 → Can RESUME');
  console.log('  - phased-183 (v1.8.3): PAUSED, day 3 → Can RESUME');
  console.log('  - phased-184 (v1.8.4): ACTIVE, day 2 → Can PAUSE');
  console.log('  - phased-185 (v1.8.5): PAUSED, day 5 → Can RESUME');
  console.log('  - phased-186 (v1.8.6): ACTIVE, day 1 → Can PAUSE');
}

/**
 * Force reset the mock database to initial seed state
 * Useful for testing or when Docker restarts
 */
export function resetMockAppleDB() {
  globalMockAppleDB.reset();
  seedMockAppleData(globalMockAppleDB);
  console.log('[MockApple] ✅ Database forcefully reset to seed state');
}

/* ==================== MOCK SERVICE ==================== */

/**
 * Mock Apple App Store Connect Service
 * 
 * Architecture:
 * - Each instance is scoped to ONE app (via credentials)
 * - appId is implicit (stored once, not passed around)
 * - All operations automatically scoped to this app
 * - Matches how Apple's real SDK works
 */
export class MockAppleAppStoreConnectService {
  private db: MockAppleDB;
  private appId: string;

  constructor(
    private readonly _issuer: string,
    private readonly _keyId: string,
    private readonly _privateKey: string
  ) {
    // Extract appId from credentials (in real Apple SDK, this would be from JWT)
    // For mock, we use a fixed appId
    this.appId = '123456789';
    
    // ✅ Use singleton DB - shared across all service instances
    // This ensures pause/resume state persists between API calls
    this.db = globalMockAppleDB;
    seedMockAppleData(this.db);
    
    console.log(`[MockApple] Initialized for app ${this.appId} (using shared state)`);
  }

  /* ==================== VERSION READS ==================== */

  /**
   * Get app store version by version string
   * Returns deterministic version ID based on version string
   * 
   * ✅ Deterministic: "1.8.2" → "version-182" (always)
   */
  async getAppStoreVersionByVersionString(
    _appId: string, // Ignored (already have it)
    versionString: string,
    _includeBuild: boolean = false
  ): Promise<any | null> {
    console.log(`[MockApple] Getting version ${versionString}`);
    
    // Generate deterministic ID
    const versionId = `version-${versionString.replace(/\./g, '')}`;
    const version = this.db.versions.get(versionId);
    
    if (!version) {
      console.log(`[MockApple] Version ${versionString} not found`);
      return null;
    }
    
    console.log(`[MockApple] Found version ${versionString} with state: ${version.state}`);
    
    return {
      type: 'appStoreVersions',
      id: version.id,
      attributes: {
        platform: 'IOS',
        versionString: version.versionString,
        appStoreState: version.state,
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
            id: this.appId
          }
        }
      },
      links: {
        self: `https://api.appstoreconnect.apple.com/v1/appStoreVersions/${version.id}`
      }
    };
  }

  /* ==================== PHASED RELEASE READS ==================== */

  /**
   * Get phased release for a specific version
   * Returns the active/paused phased release (not completed ones)
   */
  async getPhasedReleaseForVersion(versionId: string): Promise<any | null> {
    console.log(`[MockApple] Getting phased release for version ${versionId}`);
    
    // Find active or paused phased release for this version
    for (const [phasedId, phased] of this.db.phasedReleases.entries()) {
      if (phased.versionId === versionId && phased.state !== 'COMPLETE') {
        console.log(`[MockApple] Found phased release: ${phasedId} (${phased.state})`);
        
        return {
          data: {
            type: 'appStoreVersionPhasedReleases',
            id: phasedId,
            attributes: {
              phasedReleaseState: phased.state,
              startDate: phased.startDate,
              totalPauseDuration: phased.totalPauseDuration,
              currentDayNumber: phased.currentDayNumber
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
    }
    
    console.log(`[MockApple] No phased release found for version ${versionId}`);
    return null;
  }

  /**
   * Get current phased release by state
   * Used to find ACTIVE/PAUSED releases for pause/resume operations
   */
  async getCurrentPhasedReleaseId(
    _appId: string, // Ignored
    state: PhasedState
  ): Promise<string | null> {
    console.log(`[MockApple] Getting phased release with state ${state}`);
    
    for (const [phasedId, phased] of this.db.phasedReleases.entries()) {
      if (phased.state === state) {
        console.log(`[MockApple] Found phased release: ${phasedId}`);
        return phasedId;
      }
    }
    
    console.log(`[MockApple] No phased release found with state ${state}`);
    return null;
  }

  /* ==================== PHASED RELEASE MUTATIONS ==================== */

  /**
   * Pause phased release
   * ❌ Rule: Must be ACTIVE
   */
  async pausePhasedRelease(phasedId: string): Promise<any> {
    console.log(`[MockApple] Pausing phased release: ${phasedId}`);
    
    const phased = this.db.phasedReleases.get(phasedId);
    if (!phased) {
      throw new Error(`Phased release not found: ${phasedId}`);
    }

    if (phased.state !== 'ACTIVE') {
      throw new Error(`Cannot pause phased release with state: ${phased.state}. Must be ACTIVE.`);
    }

    // ✅ Mutate state
    phased.state = 'PAUSED';
    phased.totalPauseDuration += 1;
    
    console.log(`[MockApple] Successfully paused: ${phasedId}`);
    
    return {
      data: {
        type: 'appStoreVersionPhasedReleases',
        id: phasedId,
        attributes: {
          phasedReleaseState: 'PAUSED',
          startDate: phased.startDate,
          totalPauseDuration: phased.totalPauseDuration,
          currentDayNumber: phased.currentDayNumber
        },
        relationships: {
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: phased.versionId
            }
          }
        },
        links: {
          self: `https://api.appstoreconnect.apple.com/v1/appStoreVersionPhasedReleases/${phasedId}`
        }
      }
    };
  }

  /**
   * Resume phased release
   * ❌ Rule: Must be PAUSED
   */
  async resumePhasedRelease(phasedId: string): Promise<any> {
    console.log(`[MockApple] Resuming phased release: ${phasedId}`);
    
    const phased = this.db.phasedReleases.get(phasedId);
    if (!phased) {
      throw new Error(`Phased release not found: ${phasedId}`);
    }

    if (phased.state !== 'PAUSED') {
      throw new Error(`Cannot resume phased release with state: ${phased.state}. Must be PAUSED.`);
    }

    // ✅ Mutate state
    phased.state = 'ACTIVE';
    
    console.log(`[MockApple] Successfully resumed: ${phasedId}`);
    
    return {
      data: {
        type: 'appStoreVersionPhasedReleases',
        id: phasedId,
        attributes: {
          phasedReleaseState: 'ACTIVE',
          startDate: phased.startDate,
          totalPauseDuration: phased.totalPauseDuration,
          currentDayNumber: phased.currentDayNumber
        },
        relationships: {
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: phased.versionId
            }
          }
        },
        links: {
          self: `https://api.appstoreconnect.apple.com/v1/appStoreVersionPhasedReleases/${phasedId}`
        }
      }
    };
  }

  /**
   * Complete phased release (set to 100%)
   * ❌ Rule: Must be ACTIVE
   */
  async completePhasedRelease(phasedId: string): Promise<any> {
    console.log(`[MockApple] Completing phased release: ${phasedId}`);
    
    const phased = this.db.phasedReleases.get(phasedId);
    if (!phased) {
      throw new Error(`Phased release not found: ${phasedId}`);
    }

    if (phased.state !== 'ACTIVE') {
      throw new Error(
        `Cannot complete phased release with state: ${phased.state}. Must be ACTIVE. If PAUSED, resume first.`
      );
    }

    // ✅ Mutate state
    phased.state = 'COMPLETE';
    phased.currentDayNumber = 7;
    
    console.log(`[MockApple] Successfully completed: ${phasedId}`);
    
    return {
      data: {
        type: 'appStoreVersionPhasedReleases',
        id: phasedId,
        attributes: {
          phasedReleaseState: 'COMPLETE',
          startDate: phased.startDate,
          totalPauseDuration: phased.totalPauseDuration,
          currentDayNumber: phased.currentDayNumber
        },
        relationships: {
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: phased.versionId
            }
          }
        },
        links: {
          self: `https://api.appstoreconnect.apple.com/v1/appStoreVersionPhasedReleases/${phasedId}`
        }
      }
    };
  }

  /**
   * Create phased release for a version
   */
  async createPhasedRelease(versionId: string): Promise<any> {
    console.log(`[MockApple] Creating phased release for version ${versionId}`);
    
    const phasedId = `phased-${versionId}`;
    const today = new Date().toISOString().split('T')[0];
    
    const newPhased: PhasedRelease = {
      id: phasedId,
      versionId: versionId,
      state: 'ACTIVE',
      startDate: today,
      totalPauseDuration: 0,
      currentDayNumber: 1
    };
    
    this.db.phasedReleases.set(phasedId, newPhased);
    
    console.log(`[MockApple] Created phased release: ${phasedId}`);
    
    return {
      data: {
        type: 'appStoreVersionPhasedReleases',
        id: phasedId,
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
          self: `https://api.appstoreconnect.apple.com/v1/appStoreVersionPhasedReleases/${phasedId}`
        }
      }
    };
  }

  /* ==================== REVIEW SUBMISSION ==================== */

  /**
   * Submit version for review
   */
  async submitForReview(versionId: string): Promise<any> {
    console.log(`[MockApple] Submitting version ${versionId} for review`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const submissionId = `submission-${versionId}`;
    
    this.db.reviewSubmissions.set(submissionId, {
      versionId: versionId,
      submittedDate: new Date().toISOString()
    });
    
    console.log(`[MockApple] Submitted: ${submissionId}`);
    
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
              id: versionId
            }
          }
        }
      }
    };
  }

  /**
   * Delete (cancel) a review submission
   */
  async deleteVersionSubmissionRelationship(
    versionId: string,
    _appId?: string // Ignored
  ): Promise<void> {
    console.log(`[MockApple] Looking for review submissions for version ${versionId}...`);
    
    // Find submission for this version
    for (const [submissionId, submission] of this.db.reviewSubmissions.entries()) {
      if (submission.versionId === versionId) {
        console.log(`[MockApple] Found matching review submission: ${submissionId}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        this.db.reviewSubmissions.delete(submissionId);
        console.log(`[MockApple] Successfully deleted review submission ${submissionId}`);
        return;
      }
    }
    
    console.log(`[MockApple] No review submission found for version ${versionId}`);
  }

  /* ==================== HELPERS ==================== */

  /**
   * Get build by build number
   */
  async getBuildIdByBuildNumber(
    _appId: string, // Ignored
    buildNumber: string
  ): Promise<string | null> {
    console.log(`[MockApple] Getting build ID for build ${buildNumber}`);
    const buildId = `build-${buildNumber}`;
    console.log(`[MockApple] Found build ID: ${buildId}`);
    return buildId;
  }

  /**
   * Get associated build for version
   */
  async getAssociatedBuild(_versionId: string): Promise<any | null> {
    return null;
  }

  /**
   * Associate build with version
   */
  async associateBuildWithVersion(_versionId: string, _buildId: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { data: { type: 'builds', id: _buildId } };
  }

  /**
   * Update release notes
   */
  async updateReleaseNotes(_versionId: string, releaseNotes: string): Promise<any> {
    console.log(`[MockApple] Updating release notes (${releaseNotes.length} chars)`);
    return {
      data: {
        type: 'appStoreVersionLocalizations',
        id: 'mock-localization',
        attributes: {
          locale: 'en-US',
          whatsNew: releaseNotes
        }
      }
    };
  }

  /**
   * Update app store version release type
   */
  async updateAppStoreVersionReleaseType(versionId: string): Promise<void> {
    console.log(`[MockApple] Setting release type to AFTER_APPROVAL for version ${versionId}`);
    const version = this.db.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }
    // In real Apple API, this sets the release type to AFTER_APPROVAL
    // For mock purposes, we just log it - no state change needed
  }

  /**
   * Update reset ratings flag
   */
  async updateResetRatings(versionId: string, resetRatings: boolean): Promise<void> {
    console.log(`[MockApple] Setting resetRatings=${resetRatings} for version ${versionId}`);
    const version = this.db.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }
    // In real Apple API, this determines if ratings are reset when version goes live
    // For mock purposes, we just log it - no state change needed
  }

  /**
   * Create app store version
   */
  async createAppStoreVersion(
    _appId: string, // Ignored
    versionString: string,
    _platform: string = 'IOS'
  ): Promise<any> {
    console.log(`[MockApple] Creating version ${versionString}`);
    
    const versionId = `version-${versionString.replace(/\./g, '')}`;
    
    const newVersion: AppVersion = {
      id: versionId,
      versionString: versionString,
      state: 'PREPARE_FOR_SUBMISSION',
      buildId: null
    };
    
    this.db.versions.set(versionId, newVersion);
    
    return {
      data: {
        type: 'appStoreVersions',
        id: versionId,
        attributes: {
          platform: 'IOS',
          versionString: versionString,
          appStoreState: 'PREPARE_FOR_SUBMISSION'
        }
      }
    };
  }

  /* ==================== DEBUG ==================== */

  /**
   * Dump current state (for debugging)
   */
  dumpState() {
    return {
      appId: this.appId,
      versions: [...this.db.versions.values()],
      phasedReleases: [...this.db.phasedReleases.values()],
      reviewSubmissions: [...this.db.reviewSubmissions.entries()].map(([id, data]) => ({
        id,
        ...data
      }))
    };
  }
}
