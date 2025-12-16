import { generateAppStoreConnectJWT } from '../../controllers/integrations/store-controllers';
import { getStorage } from '../../storage/storage-instance';
import { StoreCredentialController } from '../../storage/integrations/store/store-controller';
import { decryptFromStorage } from '../../utils/encryption';

/**
 * Apple App Store Connect API Service
 * Handles all interactions with Apple's App Store Connect API
 */

export type PhasedReleaseState = 'ACTIVE' | 'PAUSED' | 'COMPLETE';

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
   * @returns Promise with app store version data or null if not found
   */
  async getAppStoreVersionByVersionString(appId: string, versionString: string): Promise<any | null> {
    try {
      const response = await this.makeRequest<any>('GET', 
        `/apps/${appId}/appStoreVersions?filter[versionString]=${versionString}`
      );
      
      const versions = (response as any)?.data || [];
      return versions.length > 0 ? versions[0] : null;
    } catch (error) {
      console.error(`[AppleService] Error fetching version ${versionString}:`, error);
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
   * Submit an app version for review
   * 
   * @param appStoreVersionId - The ID of the app version to submit
   * @returns Promise resolving when submission is successful
   */
  async submitForReview(appStoreVersionId: string): Promise<void> {
    await this.makeRequest('POST', '/appStoreReviewSubmissions', {
      data: {
        type: 'appStoreReviewSubmissions',
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
   * Get all builds for an app
   * 
   * @param appId - The app ID
   * @returns Promise with builds data
   */
  async getBuilds(appId: string): Promise<any> {
    return this.makeRequest<any>('GET', `/apps/${appId}/builds`);
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
      console.log(`[AppleService] Fetching build ${testflightNumber} with version ${appVersion} for app ${appId}`);
      
      // Use Apple API query parameters for server-side filtering
      const endpoint = `/builds?filter[app]=${appId}&filter[version]=${appVersion}&filter[buildNumber]=${testflightNumber}`;
      const buildsResponse = await this.makeRequest<any>('GET', endpoint);
      const builds = buildsResponse?.data ?? [];
      
      // Find VALID build (processingState cannot be filtered server-side)
      const validBuild = builds.find(
        (build: any) => build.attributes?.processingState === 'VALID'
      );
      
      if (!validBuild) {
        console.warn(`[AppleService] No VALID build found with testflight number ${testflightNumber} and version ${appVersion}`);
        
        // Log available builds for debugging
        const buildCount = builds.length;
        if (buildCount > 0) {
          console.warn(`[AppleService] Found ${buildCount} matching build(s) but none are VALID:`);
          console.warn(builds.map((b: any) => ({
            id: b.id,
            appVersion: b.attributes?.version,
            buildNumber: b.attributes?.buildNumber,
            processingState: b.attributes?.processingState
          })));
        } else {
          console.warn(`[AppleService] No builds found matching the criteria`);
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
): Promise<AppleAppStoreConnectService> {
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

