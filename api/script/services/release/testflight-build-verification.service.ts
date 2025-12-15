/**
 * TestFlight Build Verification Service
 * 
 * Simple lookup service to check if an iOS build exists in TestFlight
 * via App Store Connect API.
 */

import {
  TESTFLIGHT_BUILD_ERROR_MESSAGES,
  APP_STORE_CONNECT_API,
  APP_STORE_CONNECT_TIMEOUTS,
} from '../../constants/testflight-build';
import type { StoreIntegrationController, StoreCredentialController } from '../../storage/integrations/store/store-controller';
import { StoreType, IntegrationStatus } from '../../storage/integrations/store/store-types';
import { decrypt, decryptFromStorage } from '../../utils/encryption';
import { generateAppStoreConnectJWT } from '../../controllers/integrations/store-controllers';
import type { ReleasePlatformTargetMappingRepository } from '../../models/release/release-platform-target-mapping.repository';
import type { ReleaseRepository } from '../../models/release/release.repository';
import { PlatformName, TargetName } from '../../models/release/release.interface';

// ============================================================================
// TYPES (inline - no external file needed)
// ============================================================================

type VerifyBuildParams = {
  releaseId: string;
  tenantId: string;
  testflightBuildNumber: string;
  versionName: string;
};

type VerifyBuildResult = {
  success: boolean;
  data?: {
    buildNumber: string;
    version: string;
    status: string;
    expirationDate: string;
    bundleId: string;
  };
  error?: {
    code: string;
    message: string;
  };
};

type Credentials = {
  issuerId: string;
  keyId: string;
  privateKeyPem: string;
  targetAppId?: string;
  bundleId: string;
};

// ============================================================================
// SERVICE
// ============================================================================

export class TestFlightBuildVerificationService {
  constructor(
    private readonly storeIntegrationController: StoreIntegrationController,
    private readonly storeCredentialController: StoreCredentialController,
    private readonly platformTargetMappingRepository: ReleasePlatformTargetMappingRepository,
    private readonly releaseRepository: ReleaseRepository
  ) {}

  /**
   * Check if a TestFlight build exists in App Store Connect
   * with matching build number and version.
   * 
   * Verification Steps:
   * 1. Verify release exists and belongs to tenant
   * 2. Verify version matches release table (iOS App Store version)
   * 3. Get App Store Connect credentials
   * 4. Lookup build in App Store Connect
   * 5. Verify version matches in App Store Connect
   */
   async verifyBuild(params: VerifyBuildParams): Promise<VerifyBuildResult> {
    const { releaseId, tenantId, testflightBuildNumber, versionName } = params;

    // STEP 1: Verify release exists and belongs to tenant
    const versionCheckResult = await this.verifyVersionMatchesRelease(releaseId, tenantId, versionName);
    if (!versionCheckResult.success) {
      return {
        success: false,
        error: versionCheckResult.error!,
      };
    }

    // STEP 2: Get App Store Connect credentials for tenant
    const credentialsResult = await this.getCredentials(tenantId);
    if (!credentialsResult.success) {
      return {
        success: false,
        error: { code: credentialsResult.errorCode!, message: credentialsResult.errorMessage! },
      };
    }
    const credentials = credentialsResult.credentials!;

    // STEP 3: Look up build in App Store Connect
    const buildLookup = await this.lookupBuild(credentials, testflightBuildNumber);

    if (!buildLookup.found) {
      return {
        success: false,
        error: buildLookup.error!,
      };
    }

    // STEP 4: Check version matches in App Store Connect
    const actualVersion = buildLookup.version;
    if (actualVersion && actualVersion !== versionName) {
      return {
        success: false,
        error: {
          code: 'VERSION_MISMATCH',
          message: `Version mismatch with App Store Connect: expected ${versionName}, found ${actualVersion}`,
        },
      };
    }

    // Success - build exists with matching version
    return {
      success: true,
      data: {
        buildNumber: testflightBuildNumber,
        version: actualVersion ?? versionName,
        status: buildLookup.status!,
        expirationDate: buildLookup.expirationDate!,
        bundleId: credentials.bundleId,
      },
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Verify that the provided version matches the iOS App Store version
   * in the release_platforms_targets_mapping table
   * 
   * Steps:
   * 1. Check if release exists in releases table
   * 2. Verify release belongs to the specified tenant
   * 3. Check if release has iOS App Store configuration
   * 4. Verify version matches
   */
  private async verifyVersionMatchesRelease(
    releaseId: string,
    tenantId: string,
    versionName: string
  ): Promise<{
    success: boolean;
    error?: { code: string; message: string };
  }> {
    // Check if release exists
    const release = await this.releaseRepository.findById(releaseId);
    
    if (!release) {
      return {
        success: false,
        error: {
          code: 'RELEASE_NOT_FOUND',
          message: `Release ${releaseId} not found`,
        },
      };
    }

    // Verify release belongs to the specified tenant
    if (release.tenantId !== tenantId) {
      return {
        success: false,
        error: {
          code: 'RELEASE_TENANT_MISMATCH',
          message: `Release ${releaseId} does not belong to tenant ${tenantId}`,
        },
      };
    }

    // Check if release has iOS App Store configuration
    const iosMapping = await this.platformTargetMappingRepository.getByReleasePlatformTarget(
      releaseId,
      PlatformName.IOS,
      TargetName.APP_STORE
    );

    if (!iosMapping) {
      return {
        success: false,
        error: {
          code: 'IOS_RELEASE_NOT_FOUND',
          message: `No iOS App Store configuration found for release ${releaseId}`,
        },
      };
    }

    // Verify version matches
    const expectedVersion = iosMapping.version;
    if (expectedVersion !== versionName) {
      return {
        success: false,
        error: {
          code: 'VERSION_MISMATCH_WITH_RELEASE',
          message: `Version mismatch with release configuration: expected ${expectedVersion}, provided ${versionName}`,
        },
      };
    }

    return { success: true };
  }

  private async getCredentials(tenantId: string): Promise<{
    success: boolean;
    credentials?: Credentials;
    errorCode?: string;
    errorMessage?: string;
  }> {
    const integrations = await this.storeIntegrationController.findByTenantAndStoreType(
      tenantId,
      StoreType.APP_STORE
    );

    if (integrations.length === 0) {
      return {
        success: false,
        errorCode: 'STORE_INTEGRATION_NOT_FOUND',
        errorMessage: TESTFLIGHT_BUILD_ERROR_MESSAGES.STORE_INTEGRATION_NOT_FOUND,
      };
    }

    const verifiedIntegration = integrations.find(i => i.status === IntegrationStatus.VERIFIED);
    if (!verifiedIntegration) {
      return {
        success: false,
        errorCode: 'STORE_INTEGRATION_INVALID',
        errorMessage: TESTFLIGHT_BUILD_ERROR_MESSAGES.STORE_INTEGRATION_INVALID,
      };
    }

    const credential = await this.storeCredentialController.findByIntegrationId(verifiedIntegration.id);
    if (!credential) {
      return {
        success: false,
        errorCode: 'STORE_INTEGRATION_INVALID',
        errorMessage: TESTFLIGHT_BUILD_ERROR_MESSAGES.STORE_INTEGRATION_INVALID,
      };
    }

    let credentialPayload: any;
    try {
      // Decrypt the encrypted payload first
      const encryptedString = credential.encryptedPayload.toString('utf-8');
      const decryptedString = decryptFromStorage(encryptedString);
      credentialPayload = JSON.parse(decryptedString);
    } catch {
      return {
        success: false,
        errorCode: 'STORE_INTEGRATION_INVALID',
        errorMessage: 'Failed to decrypt or parse App Store Connect credentials',
      };
    }

    let privateKeyPem = credentialPayload.privateKeyPem ?? '';
    if (privateKeyPem && !privateKeyPem.startsWith('-----BEGIN')) {
      try {
        privateKeyPem = decrypt(privateKeyPem);
      } catch {
        return {
          success: false,
          errorCode: 'STORE_INTEGRATION_INVALID',
          errorMessage: 'Failed to decrypt App Store Connect private key',
        };
      }
    }

    return {
      success: true,
      credentials: {
        issuerId: credentialPayload.issuerId,
        keyId: credentialPayload.keyId,
        privateKeyPem,
        targetAppId: verifiedIntegration.targetAppId ?? undefined,
        bundleId: verifiedIntegration.appIdentifier,
      },
    };
  }

  private async lookupBuild(
    credentials: Credentials,
    buildNumber: string
  ): Promise<{
    found: boolean;
    version?: string;
    status?: string;
    expirationDate?: string;
    error?: { code: string; message: string };
  }> {
    try {
      const jwtToken = generateAppStoreConnectJWT(credentials.issuerId, credentials.keyId, credentials.privateKeyPem);

      const appId = credentials.targetAppId ?? '';
      const buildsUrl = appId
        ? `${APP_STORE_CONNECT_API.BASE_URL}/builds?filter[app]=${appId}&filter[version]=${buildNumber}&include=preReleaseVersion`
        : `${APP_STORE_CONNECT_API.BASE_URL}/builds?filter[version]=${buildNumber}&include=preReleaseVersion`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), APP_STORE_CONNECT_TIMEOUTS.BUILD_LOOKUP);

      const response = await fetch(buildsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          found: false,
          error: { code: 'APP_STORE_CONNECT_ERROR', message: `API error: ${response.status}` },
        };
      }

      const data = await response.json();
      const builds = data.data ?? [];

      // Find matching build
      const matchingBuild = builds.find((b: any) => b.attributes.version === buildNumber);
      if (!matchingBuild) {
        return {
          found: false,
          error: { code: 'TESTFLIGHT_BUILD_NOT_FOUND', message: TESTFLIGHT_BUILD_ERROR_MESSAGES.BUILD_NOT_FOUND },
        };
      }

      // Get version from preReleaseVersion if available
      let version: string | undefined;
      if (data.included) {
        const preReleaseVersionId = matchingBuild.relationships?.preReleaseVersion?.data?.id;
        if (preReleaseVersionId) {
          const preReleaseVersion = data.included.find(
            (item: any) => item.type === 'preReleaseVersions' && item.id === preReleaseVersionId
          );
          version = preReleaseVersion?.attributes?.version;
        }
      }

      return {
        found: true,
        version,
        status: matchingBuild.attributes.processingState,
        expirationDate: matchingBuild.attributes.expirationDate,
      };
    } catch (error) {
      const isAbortError = error instanceof Error && error.name === 'AbortError';
      return {
        found: false,
        error: {
          code: 'APP_STORE_CONNECT_ERROR',
          message: isAbortError ? 'Request timed out' : TESTFLIGHT_BUILD_ERROR_MESSAGES.APP_STORE_CONNECT_ERROR,
        },
      };
    }
  }
}
