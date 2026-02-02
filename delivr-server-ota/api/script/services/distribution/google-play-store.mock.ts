/**
 * Mock Google Play Store Service
 *
 * Used for testing and development when actual Google Play credentials are not available.
 * Simulates Google Play API responses without making real API calls.
 *
 * This mock is STATEFUL - maintains state between requests to simulate real API behavior:
 * - Edit sessions persist until committed or deleted
 * - commitEdit simulates "submit for review" only: it does NOT update production track.
 *   Production track (seed data) stays unchanged so production-state returns seed, matching
 *   real behavior where production changes only after Google accepts the release.
 * - Supports submission, resubmission, halt, resume, and rollout increase workflows
 *
 * Response formats match Google Play's actual Android Publisher API v3 structure.
 */

import { GOOGLE_PLAY_RELEASE_STATUS } from '../../constants/store';

type EditSessionData = {
  id: string;
  packageName: string;
  expiryTimeSeconds: string;
  createdAt: Date;
  committed: boolean;
  pendingTrackUpdate?: {
    track: string;
    releases: Array<{
      name: string;
      versionCodes: string[];
      status: string;
      userFraction?: number;
      inAppUpdatePriority?: number;
      releaseNotes?: Array<{ language: string; text: string }>;
    }>;
  };
};

type ProductionTrackData = {
  track: string;
  releases: Array<{
    name: string;
    versionCodes: string[];
    status: string;
    userFraction?: number;
    inAppUpdatePriority?: number;
    releaseNotes?: Array<{ language: string; text: string }>;
  }>;
};

type UploadedBundleData = {
  versionCode: number;
  sha1: string;
  sha256: string;
  uploadedAt: Date;
};

/**
 * Mock Google Play Store Service
 * Simulates Google Play API behavior for testing with realistic response formats
 */
export class MockGooglePlayStoreService {
  // In-memory storage for edit sessions (key: editId)
  private static editSessions: Map<string, EditSessionData> = new Map();
  
  // In-memory storage for production track state (key: packageName)
  private static productionTracks: Map<string, ProductionTrackData> = new Map();
  
  // In-memory storage for uploaded bundles (key: editId-versionCode)
  private static uploadedBundles: Map<string, UploadedBundleData> = new Map();

  constructor(
    private readonly accessToken: string,
    private readonly packageName: string
  ) {
    console.log(`[MockGooglePlayService] Initialized mock Google Play Store service for ${packageName}`);
    // Seed initial production track state if not exists
    this.seedInitialTrackState();
  }

  /**
   * Mock: Create a new edit session
   * POST /applications/{packageName}/edits
   * 
   * Creates a transactional edit session for making changes
   */
  async createEdit(): Promise<{ id: string; expiryTimeSeconds: string }> {
    console.log(`[MockGooglePlayService] Creating edit for ${this.packageName}`);
    
    // Generate unique edit ID
    const editId = `edit_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiryTimeSeconds = '3600'; // 1 hour
    
    // Store edit session
    const editSession: EditSessionData = {
      id: editId,
      packageName: this.packageName,
      expiryTimeSeconds,
      createdAt: new Date(),
      committed: false,
    };
    
    MockGooglePlayStoreService.editSessions.set(editId, editSession);
    
    console.log(`[MockGooglePlayService] Created edit session: ${editId}`);
    
    return {
      id: editId,
      expiryTimeSeconds,
    };
  }

  /**
   * Mock: Get current production track state
   * GET /applications/{packageName}/edits/{editId}/tracks/production
   * 
   * Returns current production track state (committed releases)
   * Note: Returns full release data including userFraction, etc. for internal use
   */
  async getProductionTrack(editId: string): Promise<{
    track: string;
    releases: Array<{
      name: string;
      versionCodes: string[];
      status: string;
      userFraction?: number;
      inAppUpdatePriority?: number;
      releaseNotes?: Array<{ language: string; text: string }>;
    }>;
  }> {
    console.log(`[MockGooglePlayService] Getting production track for edit ${editId}`);
    
    // Verify edit session exists
    const editSession = MockGooglePlayStoreService.editSessions.get(editId);
    if (!editSession) {
      throw new Error(`Edit session not found: ${editId}`);
    }

    // Get current production track state for this package
    const trackData = MockGooglePlayStoreService.productionTracks.get(this.packageName);
    
    if (!trackData) {
      // Return empty track if no releases exist
      return {
        track: 'production',
        releases: [],
      };
    }

    // Return full release data (including userFraction, etc.) for internal processing
    console.log(`[MockGooglePlayService] Returning production track with ${trackData.releases.length} release(s)`);
    
    return {
      track: trackData.track,
      releases: trackData.releases.map(release => ({ ...release })),
    };
  }

  /**
   * Mock: Update production track with new release
   * PUT /applications/{packageName}/edits/{editId}/tracks/production
   * 
   * Updates track state in the edit session (not committed yet)
   */
  async updateProductionTrack(
    editId: string,
    trackData: {
      track: string;
      releases: Array<{
        name: string;
        versionCodes: string[];
        status: string;
        userFraction?: number;
        inAppUpdatePriority?: number;
        releaseNotes?: Array<{ language: string; text: string }>;
      }>;
    }
  ): Promise<{
    track: string;
    releases: Array<{
      name: string;
      versionCodes: string[];
      status: string;
    }>;
  }> {
    console.log(`[MockGooglePlayService] Updating production track for edit ${editId}`);
    console.log(`[MockGooglePlayService] Request Body:`, JSON.stringify(trackData, null, 2));
    
    // Verify edit session exists and is not committed
    const editSession = MockGooglePlayStoreService.editSessions.get(editId);
    if (!editSession) {
      throw new Error(`Edit session not found: ${editId}`);
    }
    
    if (editSession.committed) {
      throw new Error(`Edit session ${editId} is already committed`);
    }

    // Store pending track update in edit session
    editSession.pendingTrackUpdate = {
      track: trackData.track,
      releases: trackData.releases.map(release => ({ ...release })),
    };
    
    MockGooglePlayStoreService.editSessions.set(editId, editSession);
    
    console.log(`[MockGooglePlayService] Track update stored in edit session (pending commit)`);
    
    // Return simplified response (echoes request but simplified)
    const simplifiedReleases = trackData.releases.map(release => ({
      name: release.name,
      versionCodes: release.versionCodes,
      status: release.status,
    }));

    return {
      track: trackData.track,
      releases: simplifiedReleases,
    };
  }

  /**
   * Mock: Validate the edit (dry run)
   * POST /applications/{packageName}/edits/{editId}:validate
   * 
   * Validates the edit without committing
   */
  async validateEdit(editId: string): Promise<any> {
    console.log(`[MockGooglePlayService] Validating edit ${editId}`);
    
    // Verify edit session exists
    const editSession = MockGooglePlayStoreService.editSessions.get(editId);
    if (!editSession) {
      throw new Error(`Edit session not found: ${editId}`);
    }
    
    if (editSession.committed) {
      throw new Error(`Edit session ${editId} is already committed`);
    }

    // Validate pending track update if exists
    if (editSession.pendingTrackUpdate) {
      const releases = editSession.pendingTrackUpdate.releases;
      
      // Basic validation: check for required fields
      for (const release of releases) {
        if (!release.name || !release.versionCodes || release.versionCodes.length === 0) {
          throw new Error('Validation failed: Release must have name and at least one versionCode');
        }
        
        // Validate status
        const validStatuses = [
          GOOGLE_PLAY_RELEASE_STATUS.IN_PROGRESS,
          GOOGLE_PLAY_RELEASE_STATUS.COMPLETED,
          GOOGLE_PLAY_RELEASE_STATUS.HALTED,
        ];
        
        if (!validStatuses.includes(release.status as any)) {
          throw new Error(`Validation failed: Invalid release status: ${release.status}`);
        }
        
        // Validate userFraction if status is inProgress
        if (release.status === GOOGLE_PLAY_RELEASE_STATUS.IN_PROGRESS) {
          if (release.userFraction !== undefined) {
            const isValidFraction = release.userFraction >= 0.0001 && release.userFraction <= 1.0;
            if (!isValidFraction) {
              throw new Error(`Validation failed: userFraction must be between 0.0001 and 1.0 for inProgress status`);
            }
          }
        }
        
        // Validate userFraction is not present for completed status
        if (release.status === GOOGLE_PLAY_RELEASE_STATUS.COMPLETED && release.userFraction !== undefined) {
          throw new Error('Validation failed: userFraction must not be present for completed status');
        }
      }
    }

    console.log(`[MockGooglePlayService] Edit validation successful`);
    
    // Return empty object on success (matches Google API)
    return {};
  }

  /**
   * Mock: Commit the edit
   * POST /applications/{packageName}/edits/{editId}:commit
   *
   * Simulates "submit for review" only. Does NOT update production track (productionTracks).
   * Real Google API: commit submits to Google, which later accepts/rejects; production track
   * changes only when accepted. Mock has no review step, so we keep seed/committed state
   * unchanged — production-state continues to return seed data.
   */
  async commitEdit(editId: string): Promise<{ id: string }> {
    console.log(`[MockGooglePlayService] Committing edit ${editId}`);
    
    // Verify edit session exists
    const editSession = MockGooglePlayStoreService.editSessions.get(editId);
    if (!editSession) {
      throw new Error(`Edit session not found: ${editId}`);
    }
    
    if (editSession.committed) {
      throw new Error(`Edit session ${editId} is already committed`);
    }

    // Mock: do NOT apply pending track update to productionTracks.
    // commit = "submit for review"; production track stays as seed until "Google" would accept.
    if (editSession.pendingTrackUpdate) {
      console.log(
        `[MockGooglePlayService] Simulating submit-for-review: not updating production track (${editSession.pendingTrackUpdate.releases.length} release(s) pending)`
      );
    }

    // Mark edit as committed (flow succeeds; production track unchanged)
    editSession.committed = true;
    MockGooglePlayStoreService.editSessions.set(editId, editSession);
    
    console.log(`[MockGooglePlayService] Edit ${editId} committed successfully (production track unchanged)`);
    
    return {
      id: editId,
    };
  }

  /**
   * Mock: Delete the edit (cleanup on error)
   * DELETE /applications/{packageName}/edits/{editId}
   * 
   * Deletes an edit session
   */
  async deleteEdit(editId: string): Promise<void> {
    console.log(`[MockGooglePlayService] Deleting edit ${editId}`);
    
    const editSession = MockGooglePlayStoreService.editSessions.get(editId);
    if (!editSession) {
      console.warn(`[MockGooglePlayService] Edit session ${editId} not found for deletion`);
      return; // Don't throw - matches real API behavior
    }

    // Delete edit session
    MockGooglePlayStoreService.editSessions.delete(editId);
    
    console.log(`[MockGooglePlayService] Edit ${editId} deleted successfully`);
  }

  /**
   * Ensure an edit session exists for the given editId (e.g. from real Google createEdit).
   * Used by resubmission when MOCK_GOOGLE_PLAY_API=true: real createEdit + upload bundle,
   * then mock updateProductionTrack/validateEdit/commitEdit for that editId.
   */
  ensureEditSession(editId: string): void {
    if (MockGooglePlayStoreService.editSessions.has(editId)) {
      return;
    }
    const editSession: EditSessionData = {
      id: editId,
      packageName: this.packageName,
      expiryTimeSeconds: '3600',
      createdAt: new Date(),
      committed: false,
    };
    MockGooglePlayStoreService.editSessions.set(editId, editSession);
    console.log(`[MockGooglePlayService] Ensured edit session for external editId: ${editId}`);
  }

  /**
   * Seed initial production track state for testing
   * Creates a default track with some releases for testing
   */
  private seedInitialTrackState(): void {
    // Only seed if track doesn't exist
    const existingTrack = MockGooglePlayStoreService.productionTracks.get(this.packageName);
    if (existingTrack) {
      return;
    }

    // Create initial track with staged rollout scenario
    const initialTrack: ProductionTrackData = {
      track: 'production',
      releases: [
        {
          name: '2.9.0',
          versionCodes: ['1334'],
          status: GOOGLE_PLAY_RELEASE_STATUS.IN_PROGRESS,
          inAppUpdatePriority: 2,
          releaseNotes: [
            {
              language: 'en-US',
              text: 'Promoting versionCode 1334 to internal testers via API',
            },
          ],
          userFraction: 0.05,
        },
        {
          name: 'Staged Rollout V1.0.17',
          versionCodes: ['10017'],
          status: GOOGLE_PLAY_RELEASE_STATUS.IN_PROGRESS,
          userFraction: 0.5,
          inAppUpdatePriority: 2,
          releaseNotes: [
            {
              language: 'en-US',
              text: 'New features and improvements',
            },
          ],
        },
        {
          name: 'Stable V1.0.13',
          versionCodes: ['10013'],
          status: GOOGLE_PLAY_RELEASE_STATUS.COMPLETED,
        },
      ],
    };

    MockGooglePlayStoreService.productionTracks.set(this.packageName, initialTrack);
    console.log(`[MockGooglePlayService] Seeded initial production track for ${this.packageName}`);
  }

  /**
   * Static method to clear all mock data (for testing)
   */
  static clearAllMockData(): void {
    MockGooglePlayStoreService.editSessions.clear();
    MockGooglePlayStoreService.productionTracks.clear();
    MockGooglePlayStoreService.uploadedBundles.clear();
    console.log('[MockGooglePlayService] Cleared all mock data');
  }

  /**
   * Static method to seed test data for a package
   * Useful for setting up specific test scenarios
   */
  static seedTestData(packageName: string, trackData?: ProductionTrackData): void {
    if (trackData) {
      MockGooglePlayStoreService.productionTracks.set(packageName, trackData);
      console.log(`[MockGooglePlayService] Seeded test data for ${packageName}`);
    }
  }
}


