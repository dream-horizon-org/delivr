import { generateAppStoreConnectJWT } from '../../controllers/integrations/store-controllers';
import { getStorage } from '../../storage/storage-instance';
import { StoreCredentialController, StoreIntegrationController } from '../../storage/integrations/store/store-controller';
import { decryptFromStorage } from '../../utils/encryption';
import { MockAppleAppStoreConnectService } from './apple-app-store-connect.mock';

/**
 * Apple App Store Connect API Service
 * Handles all interactions with Apple's App Store Connect API
 */

export type PhasedReleaseState = 'ACTIVE' | 'PAUSED' | 'COMPLETE';

/**
 * Check if mock mode is enabled via environment variable
 */
const isMockMode = (): boolean => {
  const mockEnv = process.env.MOCK_APPLE_API ?? 'false';
  return mockEnv.toLowerCase() === 'true';
};

/**
 * Helper function to get StoreCredentialController from storage
 */
const getCredentialController = (): StoreCredentialController => {
  const storage = getStorage();
  const controller = (storage as any).storeCredentialController;
  const controllerMissing = !controller;
  if (controllerMissing) {
    throw new Error('StoreCredentialController not initialized. Storage setup may not have completed.');
  }
  return controller;
};

/**
 * Helper function to get StoreIntegrationController from storage
 */
const getStoreIntegrationController = (): StoreIntegrationController => {
  const storage = getStorage();
  const controller = (storage as any).storeIntegrationController;
  const controllerMissing = !controller;
  if (controllerMissing) {
    throw new Error('StoreIntegrationController not initialized. Storage setup may not have completed.');
  }
  return controller;
};

/**
 * Helper function to decrypt credentials from backend storage
 */
const decryptCredentials = (encryptedBuffer: Buffer): string => {
  const encryptedString = encryptedBuffer.toString('utf-8');
  return decryptFromStorage(encryptedString);
};

/**
 * Apple App Store Connect Service
 * 
 * Provides methods to interact with Apple's App Store Connect API
 * for managing app submissions, phased releases, and builds
 */
export class AppleAppStoreConnectService {
  private readonly baseUrl = 'https://api.appstoreconnect.apple.com/v1';
  
  constructor(
    private readonly issuerId: string,
    private readonly keyId: string,
    private readonly privateKeyPem: string
  ) {}

  /**
   * Generate JWT token for Apple API authentication
   * Uses the existing JWT generation implementation from store-controllers
   */
  private async generateAuthToken(): Promise<string> {
    return generateAppStoreConnectJWT(
      this.issuerId,
      this.keyId,
      this.privateKeyPem
    );
  }

  /**
   * Make authenticated request to Apple API
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const token = await this.generateAuthToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Apple API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get app store versions filtered by state
   * 
   * @param appId - The ID of the app
   * @param state - The state to filter by (e.g., READY_FOR_SALE)
   * @returns Promise with app store versions data
   */
  async getAppStoreVersions(appId: string, state?: string): Promise<any> {
    const endpoint = state 
      ? `/apps/${appId}/appStoreVersions?filter[appStoreState]=${state}`
      : `/apps/${appId}/appStoreVersions`;
    
    return this.makeRequest('GET', endpoint);
  }

  /**
   * Get phased release for an app store version
   * 
   * @param appStoreVersionId - The ID of the app store version
   * @returns Promise with phased release data (null if no phased release exists)
   */
  async getPhasedReleaseForVersion(appStoreVersionId: string): Promise<any | null> {
    try {
      return await this.makeRequest('GET', `/appStoreVersions/${appStoreVersionId}/appStoreVersionPhasedRelease`);
    } catch (error) {
      // If no phased release exists, Apple returns 404
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get the current phased release ID for a live app with specific state validation
   * This method follows the correct Apple workflow:
   * 1. Get READY_FOR_SALE app store version (sorted by creation date)
   * 2. Get phased release for that version
   * 3. Validate state matches expected state (if provided)
   * 4. Return the phased release ID
   * 
   * @param appId - The app ID (targetAppId from store integration)
   * @param expectedState - Optional: Expected state (ACTIVE, PAUSED, COMPLETE)
   * @returns Promise with phased release ID (null if no matching phased release exists)
   */
  async getCurrentPhasedReleaseId(appId: string, expectedState?: PhasedReleaseState): Promise<string | null> {
    // Step 1: Get READY_FOR_SALE app store versions
    const versionsResponse = await this.getAppStoreVersions(appId, 'READY_FOR_SALE');
    
    const versions = versionsResponse?.data || [];
    if (versions.length === 0) {
      console.warn(`[AppleService] No READY_FOR_SALE version found for app ${appId}`);
      return null;
    }

    // Sort by createdDate descending to get the latest version
    // (In rare cases, Apple can return multiple READY_FOR_SALE versions)
    const sortedVersions = versions.sort((a: any, b: any) => {
      const dateA = new Date(a.attributes?.createdDate || 0).getTime();
      const dateB = new Date(b.attributes?.createdDate || 0).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

    const liveVersion = sortedVersions[0];
    const appStoreVersionId = liveVersion.id;
    const versionString = liveVersion.attributes?.versionString || 'unknown';

    console.log(`[AppleService] Found READY_FOR_SALE version: ${appStoreVersionId} (v${versionString})`);

    // Step 2: Get phased release for that version
    const phasedReleaseResponse = await this.getPhasedReleaseForVersion(appStoreVersionId);
    
    if (!phasedReleaseResponse || !phasedReleaseResponse.data) {
      console.warn(`[AppleService] No phased release found for version ${appStoreVersionId}`);
      return null;
    }

    // Step 3: Extract phased release ID and state
    const phasedReleaseId = phasedReleaseResponse.data.id;
    const phasedReleaseState = phasedReleaseResponse.data.attributes?.phasedReleaseState;

    console.log(`[AppleService] Found phased release: ${phasedReleaseId}, state: ${phasedReleaseState}`);

    // Step 4: Validate state matches expected state (if provided)
    if (expectedState && phasedReleaseState !== expectedState) {
      console.warn(
        `[AppleService] Phased release ${phasedReleaseId} state mismatch. ` +
        `Expected: ${expectedState}, Actual: ${phasedReleaseState}`
      );
      return null;
    }

    return phasedReleaseId;
  }

  /**
   * Pause a phased release
   * 
   * @param phasedReleaseId - The ID of the phased release resource
   * @returns Promise resolving when pause is successful
   */
  async pausePhasedRelease(phasedReleaseId: string): Promise<void> {
    await this.makeRequest('PATCH', `/appStoreVersionPhasedReleases/${phasedReleaseId}`, {
      data: {
        type: 'appStoreVersionPhasedReleases',
        id: phasedReleaseId,
        attributes: {
          phasedReleaseState: 'PAUSED' as PhasedReleaseState
        }
      }
    });
  }

  /**
   * Resume a paused phased release
   * 
   * @param phasedReleaseId - The ID of the phased release resource
   * @returns Promise resolving when resume is successful
   */
  async resumePhasedRelease(phasedReleaseId: string): Promise<void> {
    await this.makeRequest('PATCH', `/appStoreVersionPhasedReleases/${phasedReleaseId}`, {
      data: {
        type: 'appStoreVersionPhasedReleases',
        id: phasedReleaseId,
        attributes: {
          phasedReleaseState: 'ACTIVE' as PhasedReleaseState
        }
      }
    });
  }

  /**
   * Complete a phased release immediately (set to 100%)
   * 
   * @param phasedReleaseId - The ID of the phased release resource
   * @returns Promise resolving when completion is successful
   */
  async completePhasedRelease(phasedReleaseId: string): Promise<void> {
    await this.makeRequest('PATCH', `/appStoreVersionPhasedReleases/${phasedReleaseId}`, {
      data: {
        type: 'appStoreVersionPhasedReleases',
        id: phasedReleaseId,
        attributes: {
          phasedReleaseState: 'COMPLETE' as PhasedReleaseState
        }
      }
    });
  }

  /**
   * Create a phased release for an app store version
   * This enables 7-day gradual rollout for automatic updates
   * 
   * @param appStoreVersionId - The ID of the app store version
   * @returns Promise resolving when phased release is created
   */
  async createPhasedRelease(appStoreVersionId: string): Promise<void> {
    await this.makeRequest('POST', '/appStoreVersionPhasedReleases', {
      data: {
        type: 'appStoreVersionPhasedReleases',
        relationships: {
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: appStoreVersionId
            }
          }
        }
      }
    });
  }

  /**
   * Get specific app store version by app ID and version string
   * 
   * @param appId - The app ID
   * @param versionString - The version string (e.g., "1.2.3")
   * @param includeBuild - Whether to include build relationship (default: false)
   * @returns Promise with app store version data or null if not found
   */
  async getAppStoreVersionByVersionString(
    appId: string, 
    versionString: string, 
    includeBuild: boolean = false
  ): Promise<any | null> {
    try {
      const includeParam = includeBuild ? '&include=build' : '';
      const response = await this.makeRequest<any>('GET', 
        `/apps/${appId}/appStoreVersions?filter[versionString]=${versionString}${includeParam}`
      );
      
      const versions = (response as any)?.data || [];
      return versions.length > 0 ? versions[0] : null;
    } catch (error) {
      console.error(`[AppleService] Error fetching version ${versionString}:`, error);
      return null;
    }
  }

  /**
   * Get the build currently associated with an app store version
   * 
   * @param appStoreVersionId - The ID of the app store version
   * @returns Promise with build data or null if no build is associated
   */
  async getAssociatedBuild(appStoreVersionId: string): Promise<any | null> {
    try {
      const response = await this.makeRequest<any>('GET', 
        `/appStoreVersions/${appStoreVersionId}?include=build`
      );
      
      // Check if build is included in the response
      const included = response?.included || [];
      const build = included.find((item: any) => item.type === 'builds');
      
      return build ?? null;
    } catch (error) {
      console.error(`[AppleService] Error fetching associated build:`, error);
      return null;
    }
  }

  /**
   * Create a new app store version
   * 
   * @param appId - The app ID
   * @param versionString - The version string (e.g., "1.2.3")
   * @param platform - The platform (IOS, MAC_OS, TV_OS)
   * @returns Promise with created version data
   */
  async createAppStoreVersion(appId: string, versionString: string, platform: string = 'IOS'): Promise<any> {
    const response = await this.makeRequest<any>('POST', '/appStoreVersions', {
      data: {
        type: 'appStoreVersions',
        attributes: {
          versionString,
          platform
        },
        relationships: {
          app: {
            data: {
              type: 'apps',
              id: appId
            }
          }
        }
      }
    });
    return response;
  }

  /**
   * Update app store version release type to AFTER_APPROVAL
   * Fixed to AFTER_APPROVAL: Automatically release this version after App Review approval
   * 
   * @param appStoreVersionId - The ID of the app store version
   * @returns Promise resolving when update is successful
   */
  async updateAppStoreVersionReleaseType(appStoreVersionId: string): Promise<void> {
    await this.makeRequest('PATCH', `/appStoreVersions/${appStoreVersionId}`, {
      data: {
        type: 'appStoreVersions',
        id: appStoreVersionId,
        attributes: {
          releaseType: 'AFTER_APPROVAL'
        }
      }
    });
  }

  /**
   * Update reset rating flag for app store version
   * 
   * @param appStoreVersionId - The ID of the app store version
   * @param resetRatings - Whether to reset ratings when this version is released
   * @returns Promise resolving when update is successful
   */
  async updateResetRatings(
    appStoreVersionId: string,
    resetRatings: boolean
  ): Promise<void> {
    await this.makeRequest('PATCH', `/appStoreVersions/${appStoreVersionId}`, {
      data: {
        type: 'appStoreVersions',
        id: appStoreVersionId,
        attributes: {
          resetRatings
        }
      }
    });
  }

  /**
   * Get app store version localizations
   * 
   * @param appStoreVersionId - The ID of the app store version
   * @returns Promise with localization data
   */
  async getAppStoreVersionLocalizations(appStoreVersionId: string): Promise<any> {
    return this.makeRequest<any>('GET', 
      `/appStoreVersions/${appStoreVersionId}/appStoreVersionLocalizations`
    );
  }

  /**
   * Update app store version localization with release notes (What's New)
   * 
   * @param localizationId - The ID of the localization to update
   * @param whatsNew - The release notes / what's new text
   * @returns Promise resolving when update is successful
   */
  async updateAppStoreVersionLocalization(
    localizationId: string,
    whatsNew: string
  ): Promise<void> {
    await this.makeRequest('PATCH', `/appStoreVersionLocalizations/${localizationId}`, {
      data: {
        type: 'appStoreVersionLocalizations',
        id: localizationId,
        attributes: {
          whatsNew
        }
      }
    });
  }

  /**
   * Create app store version localization if it doesn't exist
   * 
   * @param appStoreVersionId - The ID of the app store version
   * @param locale - The locale code (e.g., 'en-US')
   * @param whatsNew - The release notes / what's new text
   * @returns Promise with created localization data
   */
  async createAppStoreVersionLocalization(
    appStoreVersionId: string,
    locale: string,
    whatsNew: string
  ): Promise<any> {
    return this.makeRequest('POST', '/appStoreVersionLocalizations', {
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: {
          locale,
          whatsNew
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
    });
  }

  /**
   * Update or create release notes for app store version
   * Handles both existing and new localizations
   * 
   * @param appStoreVersionId - The ID of the app store version
   * @param releaseNotes - The release notes to set
   * @param locale - The locale code (default: 'en-US')
   */
  async updateReleaseNotes(
    appStoreVersionId: string,
    releaseNotes: string,
    locale: string = 'en-US'
  ): Promise<void> {
    try {
      // Step 1: Get existing localizations
      const localizationsResponse = await this.getAppStoreVersionLocalizations(appStoreVersionId);
      const localizations = (localizationsResponse as any)?.data || [];

      // Step 2: Find localization for the specified locale
      const existingLocalization = localizations.find(
        (loc: any) => loc.attributes?.locale === locale
      );

      if (existingLocalization) {
        // Update existing localization
        console.log(`[AppleService] Updating existing ${locale} localization with release notes`);
        await this.updateAppStoreVersionLocalization(existingLocalization.id, releaseNotes);
      } else {
        // Create new localization
        console.log(`[AppleService] Creating new ${locale} localization with release notes`);
        await this.createAppStoreVersionLocalization(appStoreVersionId, locale, releaseNotes);
      }

      console.log(`[AppleService] Successfully updated release notes for locale ${locale}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update release notes: ${errorMessage}`);
    }
  }

  /**
   * Add an app store version item to a review submission
   * This is required before the submission can be submitted to App Review
   * 
   * @param reviewSubmissionId - The review submission ID
   * @param appStoreVersionId - The app store version ID to add as an item
   * @returns Promise resolving when item is added
   */
  async addReviewSubmissionItem(reviewSubmissionId: string, appStoreVersionId: string): Promise<void> {
    const itemData = {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: {
            data: {
              type: 'reviewSubmissions',
              id: reviewSubmissionId
            }
          },
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: appStoreVersionId
            }
          }
        }
      }
    };

    console.log(`[AppleService] Adding appStoreVersion ${appStoreVersionId} to reviewSubmission ${reviewSubmissionId}`);
    await this.makeRequest('POST', '/reviewSubmissionItems', itemData);
    console.log(`[AppleService] Review submission item added successfully`);
  }

  /**
   * Submit a review submission to App Review (final step - clicks "Submit for Review")
   * This actually submits the submission after items have been added
   * 
   * @param reviewSubmissionId - The review submission ID to submit
   * @returns Promise resolving when submission is sent to App Review
   */
  async submitReviewSubmission(reviewSubmissionId: string): Promise<void> {
    const submitData = {
      data: {
        type: 'reviewSubmissions',
        id: reviewSubmissionId,
        attributes: {
          submitted: true
        }
      }
    };

    console.log(`[AppleService] Submitting reviewSubmission ${reviewSubmissionId} to App Review (clicking Submit button)`);
    await this.makeRequest('PATCH', `/reviewSubmissions/${reviewSubmissionId}`, submitData);
    console.log(`[AppleService] Review submission successfully sent to App Review!`);
  }

  /**
   * Delete a review submission (cancels it)
   * This removes all items from the submission
   * 
   * @param reviewSubmissionId - The review submission ID to delete
   * @returns Promise resolving when deletion is successful
   */
  async deleteReviewSubmission(reviewSubmissionId: string): Promise<void> {
    console.log(`[AppleService] Deleting review submission ${reviewSubmissionId}...`);
    
    try {
      // Get all items in the submission
      const itemsResponse = await this.makeRequest<any>(
        'GET',
        `/reviewSubmissions/${reviewSubmissionId}/items`
      );
      
      const items = itemsResponse?.data ?? [];
      console.log(`[AppleService] Found ${items.length} item(s) to delete`);
      
      // Delete each item
      for (const item of items) {
        const itemId = item.id;
        console.log(`[AppleService] Deleting item ${itemId}...`);
        await this.makeRequest('DELETE', `/reviewSubmissionItems/${itemId}`);
      }
      
      console.log(`[AppleService] Successfully deleted review submission ${reviewSubmissionId}`);
    } catch (error) {
      console.error(`[AppleService] Error deleting review submission:`, error);
      throw error;
    }
  }

  /**
   * Submit an app version for review using Apple's correct public API endpoint
   * 
   * Apple review submissions are SINGLE-USE, disposable transactions.
   * This method:
   * 1. Checks if version is already submitted (WAITING_FOR_REVIEW/IN_REVIEW)
   * 2. If already submitted → returns existing submission (idempotent)
   * 3. If not → creates fresh submission
   * 4. Adds items and verifies they exist
   * 5. Submits for review
   * 
   * @param appId - The app ID (from targetAppId in store integration)
   * @param appStoreVersionId - The app store version ID to submit
   * @returns Promise resolving with review submission ID
   */
  async submitForReview(appId: string, appStoreVersionId: string): Promise<string> {
    console.log(`[AppleService] Starting submission process for app ${appId}, version ${appStoreVersionId}`);
    
    // STEP 0: Check if version is already submitted
    console.log(`[AppleService] Step 0: Checking for existing submission...`);
    const existingSubmission = await this.getExistingSubmissionForVersion(appId, appStoreVersionId);
    
    if (existingSubmission) {
      const submissionId = existingSubmission.id;
      const state = existingSubmission.state;
      console.log(`[AppleService] ✓ Version already in submission ${submissionId} (state: ${state})`);
      console.log(`[AppleService] Returning existing submission (idempotent behavior)`);
      return submissionId;
    }
    
    console.log(`[AppleService] No existing submission found, creating new one`);
    
    // STEP 1: Clean up ONLY truly stale/draft submissions
    await this.cleanupStaleSubmissions(appId);
    
    // STEP 2: Create FRESH new review submission
    console.log(`[AppleService] Step 1/4: Creating fresh review submission`);
    const submitData = {
      data: {
        type: 'reviewSubmissions',
        attributes: {
          platform: 'IOS'
        },
        relationships: {
          app: {
            data: {
              type: 'apps',
              id: appId
            }
          }
        }
      }
    };

    const response = await this.makeRequest<any>('POST', '/reviewSubmissions', submitData);
    const reviewSubmissionId = response?.data?.id;
    
    if (!reviewSubmissionId) {
      throw new Error('No review submission ID returned from Apple');
    }
    console.log(`[AppleService] ✓ Fresh submission created: ${reviewSubmissionId}`);

    // STEP 3: Add appStoreVersion as item
    console.log(`[AppleService] Step 2/4: Adding appStoreVersion as item`);
    
    try {
      await this.addReviewSubmissionItem(reviewSubmissionId, appStoreVersionId);
      console.log(`[AppleService] ✓ Item added`);
    } catch (addItemError: any) {
      const addItemErrorMsg = addItemError.message || '';
      
      // Handle race condition: version was submitted by another process
      if (addItemErrorMsg.includes('409') && addItemErrorMsg.includes('ITEM_PART_OF_ANOTHER_SUBMISSION')) {
        console.log(`[AppleService] Version already in another submission (race condition)`);
        
        // Check if that other submission is active
        const otherSubmission = await this.getExistingSubmissionForVersion(appId, appStoreVersionId);
        
        if (otherSubmission && 
            (otherSubmission.state === 'WAITING_FOR_REVIEW' || otherSubmission.state === 'IN_REVIEW')) {
          console.log(`[AppleService] ✓ Version already submitted in ${otherSubmission.id} (state: ${otherSubmission.state})`);
          console.log(`[AppleService] Deleting our empty draft submission ${reviewSubmissionId}...`);
          
          // Clean up our empty submission
          await this.deleteReviewSubmission(reviewSubmissionId).catch(() => {
            console.warn(`[AppleService] Could not delete draft submission ${reviewSubmissionId}`);
          });
          
          console.log(`[AppleService] Returning existing submission (idempotent)`);
          return otherSubmission.id;
        }
      }
      
      throw addItemError;
    }

    // STEP 4: Verify items exist (guard against 0-item submissions)
    console.log(`[AppleService] Step 3/4: Verifying items were added`);
    const itemsResponse = await this.makeRequest<any>(
      'GET',
      `/reviewSubmissions/${reviewSubmissionId}/items`
    );
    const items = itemsResponse?.data ?? [];
    
    if (items.length === 0) {
      // Clean up broken submission
      await this.deleteReviewSubmission(reviewSubmissionId).catch(() => {});
      
      throw new Error(
        'Submission has 0 items after adding. This is an invalid state. ' +
        'The version may not be in a reviewable state yet.'
      );
    }
    console.log(`[AppleService] ✓ Verified: ${items.length} item(s) in submission`);
    
    // STEP 5: Submit to App Review
    console.log(`[AppleService] Step 4/4: Submitting to App Review`);
    await this.submitReviewSubmission(reviewSubmissionId);
    console.log(`[AppleService] ✓ Successfully submitted to App Review!`);
    
    return reviewSubmissionId;
  }

  /**
   * Get existing submission for a specific app store version
   * 
   * Checks if the version is already part of an active submission.
   * 
   * @param appId - The app ID
   * @param appStoreVersionId - The app store version ID
   * @returns Submission info or null if not found
   */
  private async getExistingSubmissionForVersion(
    appId: string, 
    appStoreVersionId: string
  ): Promise<{ id: string; state: string } | null> {
    try {
      const submissionsResponse = await this.makeRequest<any>(
        'GET',
        `/reviewSubmissions?filter[app]=${appId}&filter[state]=WAITING_FOR_REVIEW,IN_REVIEW,READY_FOR_REVIEW`
      );
      
      const submissions = submissionsResponse?.data ?? [];
      
      for (const submission of submissions) {
        const submissionId = submission.id;
        const state = submission.attributes?.state;
        
        try {
          const itemsResponse = await this.makeRequest<any>(
            'GET',
            `/reviewSubmissions/${submissionId}/items?include=appStoreVersion`
          );
          
          const items = itemsResponse?.data ?? [];
          
          for (const item of items) {
            const versionId = item.relationships?.appStoreVersion?.data?.id;
            if (versionId === appStoreVersionId) {
              return { id: submissionId, state };
            }
          }
        } catch (itemError) {
          console.warn(`[AppleService] Could not check items for submission ${submissionId}:`, itemError);
        }
      }
      
      return null;
    } catch (error) {
      console.warn(`[AppleService] Error checking existing submissions:`, error);
      return null;
    }
  }

  /**
   * Clean up truly stale review submissions for an app
   * 
   * ONLY deletes submissions in READY_FOR_REVIEW state with 0 items.
   * These are draft/broken submissions that will never be reviewed.
   * 
   * NEVER deletes:
   * - WAITING_FOR_REVIEW (already submitted)
   * - IN_REVIEW (Apple is reviewing)
   * - Submissions with items (valid)
   * 
   * @param appId - The app ID
   */
  private async cleanupStaleSubmissions(appId: string): Promise<void> {
    try {
      const submissionsResponse = await this.makeRequest<any>(
        'GET',
        `/reviewSubmissions?filter[app]=${appId}&filter[state]=READY_FOR_REVIEW`
      );
      
      const submissions = submissionsResponse?.data ?? [];
      
      if (submissions.length === 0) {
        console.log(`[AppleService] No draft submissions to clean up`);
        return;
      }
      
      console.log(`[AppleService] Found ${submissions.length} draft submission(s), checking for empty ones...`);
      
      // Only delete submissions with 0 items
      for (const submission of submissions) {
        const submissionId = submission.id;
        const state = submission.attributes?.state;
        
        try {
          // Check item count
          const itemsResponse = await this.makeRequest<any>(
            'GET',
            `/reviewSubmissions/${submissionId}/items`
          );
          const items = itemsResponse?.data ?? [];
          
          if (items.length === 0) {
            console.log(`[AppleService] Deleting empty draft ${submissionId} (0 items)`);
            await this.deleteReviewSubmission(submissionId);
            console.log(`[AppleService] ✓ Deleted ${submissionId}`);
          } else {
            console.log(`[AppleService] Keeping ${submissionId} (has ${items.length} item(s))`);
          }
        } catch (deleteError) {
          console.warn(`[AppleService] Could not process ${submissionId}:`, deleteError);
          // Continue with other submissions
        }
      }
      
      console.log(`[AppleService] ✓ Cleanup complete`);
    } catch (error) {
      console.warn(`[AppleService] Error during cleanup (non-fatal):`, error);
      // Don't throw - cleanup failure shouldn't block submission
    }
  }

  /**
   * Cancel a review submission (modern API 1.7+)
   * 
   * Uses PATCH /reviewSubmissions/{id} with canceled: true
   * This is the modern approach (replaces deprecated DELETE /appStoreVersionSubmissions)
   * 
   * IMPORTANT: This only works if the submission is in WAITING_FOR_REVIEW state.
   * Once Apple starts reviewing (IN_REVIEW or later), cancellation is not possible.
   * 
   * @param appStoreVersionId - The ID of the app store version
   * @param appId - The app ID (required to filter reviewSubmissions)
   * @returns Promise resolving when cancellation is successful
   * @throws Error if version not found, already reviewed, or cannot be cancelled
   */
  async deleteVersionSubmissionRelationship(appStoreVersionId: string, appId?: string): Promise<void> {
    if (!appId) {
      throw new Error('appId is required to cancel review submission');
    }

    console.log(`[AppleService] Looking for review submissions for app ${appId}...`);

    // Step 1: Get review submissions for this app (only WAITING_FOR_REVIEW can be cancelled)
    const reviewSubmissionsResponse = await this.makeRequest<any>(
      'GET',
      `/reviewSubmissions?filter[app]=${appId}&filter[state]=WAITING_FOR_REVIEW`
    );

    const reviewSubmissions = reviewSubmissionsResponse?.data ?? [];

    console.log(`[AppleService] Found ${reviewSubmissions.length} review submission(s) in WAITING_FOR_REVIEW state`);

    if (reviewSubmissions.length === 0) {
      throw new Error(
        'No cancellable review submissions found. ' +
        'The version may have already been submitted to Apple Review and cannot be cancelled.'
      );
    }

    // Step 2: For each submission, find the one containing our version
    for (const submission of reviewSubmissions) {
      const submissionId = submission.id;
      console.log(`[AppleService] Checking submission ${submissionId}...`);
      
      try {
        // Get items for this submission
        const itemsResponse = await this.makeRequest<any>(
          'GET',
          `/reviewSubmissions/${submissionId}/items?include=appStoreVersion`
        );

        const items = itemsResponse?.data ?? [];
        console.log(`[AppleService] Found ${items.length} item(s) in submission ${submissionId}`);

        // Check if any item references our appStoreVersion
        const hasOurVersion = items.some((item: any) => 
          item.relationships?.appStoreVersion?.data?.id === appStoreVersionId
        );
        
        if (hasOurVersion) {
          console.log(`[AppleService] ✅ Found version ${appStoreVersionId} in submission ${submissionId}`);
          console.log(`[AppleService] Cancelling submission using modern API (PATCH with canceled: true)...`);
          
          // Modern API: PATCH /reviewSubmissions/{id} with canceled: true
          await this.makeRequest('PATCH', `/reviewSubmissions/${submissionId}`, {
            data: {
              type: 'reviewSubmissions',
              id: submissionId,
              attributes: {
                canceled: true
              }
            }
          });
          
          console.log(`[AppleService] Successfully cancelled submission ${submissionId}`);
          return; // Successfully cancelled
        }
        
      } catch (error: any) {
        const errorMsg = error.message || '';
        console.log(`[AppleService] Error processing submission ${submissionId}:`, errorMsg);
        
        // Handle specific errors
        if (errorMsg.includes('409')) {
          if (errorMsg.includes('already submitted') || errorMsg.includes('ENTITY_STATE_INVALID')) {
            throw new Error(
              'Cannot cancel: The submission has already been sent to Apple Review. ' +
              'Once the review process starts, cancellation is only possible through the App Store Connect web interface.'
            );
          }
        }
        
        // Continue to check other submissions
      }
    }

    // If we reach here, no matching submission was found
    throw new Error(
      `Version ${appStoreVersionId} not found in any cancellable submission. ` +
      `It may have already been cancelled or is not in review.`
    );
  }

  /**
   * Get build ID by app ID, build number, and app version
   * 
   * Uses Apple API's server-side filtering for efficient querying:
   * - filter[app] = app ID
   * - filter[version] = app version (e.g., "1.2.3")
   * - filter[buildNumber] = testflight build number (e.g., "123")
   * - attributes.processingState = must be 'VALID' (checked client-side)
   * 
   * @param appId - The app ID
   * @param testflightNumber - The testflight build number (e.g., "123")
   * @param appVersion - The app version (e.g., "1.2.3")
   * @returns Promise with build ID or null if not found
   */
  async getBuildIdByBuildNumber(
    appId: string, 
    testflightNumber: string, 
    appVersion: string
  ): Promise<string | null> {
    try {
      console.log(`[AppleService] Fetching build ${testflightNumber} with version filter ${appVersion} for app ${appId}`);
      
      // Note: filter[version] searches build.attributes.version (not App Store version)
      // For apps where build.attributes.version equals the build number, pass buildNumber as appVersion
      const endpoint = `/builds?filter[app]=${appId}&filter[version]=${appVersion}`;
      const buildsResponse = await this.makeRequest<any>('GET', endpoint);
      const builds = buildsResponse?.data ?? [];
      
      // Match by version attribute (in this app, version equals the build number)
      // This is the same logic as TestFlight verification
      const matchingBuilds = builds.filter((build: any) => {
        const buildVersion = build.attributes?.version;
        return buildVersion === testflightNumber || buildVersion === String(testflightNumber);
      });
      
      // Find VALID build (processingState cannot be filtered server-side)
      const validBuild = matchingBuilds.find(
        (build: any) => build.attributes?.processingState === 'VALID'
      );
      
      if (!validBuild) {
        console.warn(`[AppleService] No VALID build found with testflight number ${testflightNumber} and version ${appVersion}`);
        
        // Log available builds for debugging
        const buildCount = matchingBuilds.length;
        if (buildCount > 0) {
          console.warn(`[AppleService] Found ${buildCount} matching build(s) but none are VALID:`);
          console.warn(matchingBuilds.map((b: any) => ({
            id: b.id,
            appVersion: b.attributes?.version,
            buildNumber: b.attributes?.buildNumber,
            processingState: b.attributes?.processingState
          })));
        } else {
          console.warn(`[AppleService] No builds found with version matching ${testflightNumber}`);
          console.warn(`[AppleService] Total builds returned for version filter ${appVersion}: ${builds.length}`);
          if (builds.length > 0) {
            console.warn(`[AppleService] Available builds:`, builds.map((b: any) => ({
              version: b.attributes?.version,
              buildNumber: b.attributes?.buildNumber,
              processingState: b.attributes?.processingState
            })));
          }
        }
        
        return null;
      }
      
      console.log(`[AppleService] Found VALID build: ${validBuild.id}`);
      console.log(`[AppleService] Build details:`, {
        buildId: validBuild.id,
        appVersion: validBuild.attributes?.version,
        buildNumber: validBuild.attributes?.buildNumber,
        processingState: validBuild.attributes?.processingState
      });
      
      return validBuild.id;
    } catch (error) {
      console.error(`[AppleService] Error fetching build:`, error);
      return null;
    }
  }

  /**
   * Associate a build with an app version (for resubmission)
   * 
   * @param appStoreVersionId - The ID of the app version
   * @param buildId - The ID of the build to associate
   * @returns Promise resolving when association is successful
   */
  async associateBuildWithVersion(appStoreVersionId: string, buildId: string): Promise<void> {
    await this.makeRequest('PATCH', `/appStoreVersions/${appStoreVersionId}`, {
      data: {
        type: 'appStoreVersions',
        id: appStoreVersionId,
        relationships: {
          build: {
            data: {
              type: 'builds',
              id: buildId
            }
          }
        }
      }
    });
  }
}

/**
 * Factory function to create AppleAppStoreConnectService from store integration
 * 
 * @param integrationId - The ID of the store integration
 * @returns AppleAppStoreConnectService instance with credentials loaded from database
 */
export async function createAppleServiceFromIntegration(
  integrationId: string
): Promise<AppleAppStoreConnectService | MockAppleAppStoreConnectService> {
  // Check if mock mode is enabled
  const mockEnabled = isMockMode();
  if (mockEnabled) {
    console.log('[AppleServiceFactory] MOCK_APPLE_API=true - Using mock Apple service');
    
    // Seed mock data with test phased releases
    // Get the targetAppId from the integration to seed properly
    const integrationController = getStoreIntegrationController();
    const integration = await integrationController.findById(integrationId);
    const targetAppId = integration?.targetAppId ?? '1234567890';
    
    console.log(`[AppleServiceFactory] Seeding mock data for app ${targetAppId}`);
    MockAppleAppStoreConnectService.seedTestData(targetAppId);
    
    return new MockAppleAppStoreConnectService(
      'mock-issuer-id',
      'mock-key-id',
      'mock-private-key'
    );
  }

  const credentialController = getCredentialController();
  
  // Get credentials from DB
  const existingCredential = await credentialController.findByIntegrationId(integrationId);
  if (!existingCredential) {
    throw new Error('Apple App Store Connect credentials not found for this integration');
  }

  // Decrypt credential payload
  let decryptedPayload: string;
  try {
    const buffer = existingCredential.encryptedPayload;
    
    if (Buffer.isBuffer(buffer)) {
      decryptedPayload = decryptCredentials(buffer);
    } else {
      decryptedPayload = decryptFromStorage(String(buffer));
    }
  } catch (readError) {
    throw new Error('Failed to decrypt Apple App Store Connect credentials');
  }

  // Parse credential JSON
  let credentialData: any;
  try {
    credentialData = JSON.parse(decryptedPayload);
  } catch (parseError) {
    throw new Error('Failed to parse Apple App Store Connect credential data');
  }

  // Validate required fields
  const { issuerId, keyId, privateKeyPem } = credentialData;
  
  if (!issuerId || !keyId || !privateKeyPem) {
    throw new Error('Missing required Apple App Store Connect credentials (issuerId, keyId, or privateKeyPem)');
  }

  // Create and return service instance
  return new AppleAppStoreConnectService(issuerId, keyId, privateKeyPem);
}

