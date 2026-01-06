import { Request, Response } from 'express';
// @ts-ignore - jsonwebtoken types may not be available
import * as jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
// For Google Play Store verification
const { GoogleAuth } = require('google-auth-library');
// For multipart/form-data file uploads
const FormData = require('form-data');
import { getStorage } from '../../storage/storage-instance';
import { 
  StoreIntegrationController, 
  StoreCredentialController
} from '../../storage/integrations/store/store-controller';
import {
  StoreType,
  IntegrationStatus,
  CredentialType,
  DefaultTrack,
  ConnectStoreRequestBody,
  ConnectStoreResponse,
  AppStoreConnectPayload,
  GooglePlayStorePayload,
  UpdateStoreIntegrationDto,
  SafeStoreIntegration,
  mapStoreTypeFromApi,
  isValidTrackForStoreType,
  getInvalidTrackErrorMessage,
  UploadAabToPlayStoreRequest,
  UploadAabToPlayStoreResponse,
} from '../../storage/integrations/store/store-types';
import { HTTP_STATUS, RESPONSE_STATUS } from '../../constants/http';
import { ERROR_MESSAGES, PLAY_STORE_UPLOAD_ERROR_MESSAGES, PLAY_STORE_UPLOAD_CONSTANTS } from '../../constants/store';
import { getErrorMessage } from '../../utils/error.utils';
import type { StoreIntegration } from '../../storage/integrations/store/store-types';
import { ReleasePlatformTargetMappingRepository } from '~models/release/release-platform-target-mapping.repository';
import { createPlatformTargetMappingModel } from '~models/release/platform-target-mapping.sequelize.model';
import { ReleaseRepository } from '~models/release/release.repository';
import { createReleaseModel } from '~models/release/release.sequelize.model';
import { AndroidSubmissionBuildRepository } from '~models/distribution';
import { DistributionRepository } from '~models/distribution';
import { decryptIfEncrypted, encryptForStorage, decryptFromStorage } from '../../utils/encryption';
import { BUILD_PLATFORM, STORE_TYPE } from '~types/release-management/builds/build.constants';

const isNonEmptyString = (value: unknown): value is string => {
  const isString = typeof value === 'string';
  const trimmed = isString ? value.trim() : '';
  const isNonEmpty = trimmed.length > 0;
  return isString && isNonEmpty;
};

const getStoreController = (): StoreIntegrationController => {
  const storage = getStorage();
  const controller = (storage as any).storeIntegrationController;
  const controllerMissing = !controller;
  if (controllerMissing) {
    throw new Error('StoreIntegrationController not initialized. Storage setup may not have completed.');
  }
  return controller;
};

const getCredentialController = (): StoreCredentialController => {
  const storage = getStorage();
  const controller = (storage as any).storeCredentialController;
  const controllerMissing = !controller;
  if (controllerMissing) {
    throw new Error('StoreCredentialController not initialized. Storage setup may not have completed.');
  }
  return controller;
};

// ============================================================================
// Common Helper: Validate Integration Status
// ============================================================================
// This function validates that an integration is in VERIFIED status before
// proceeding with operations that require credentials (e.g., uploads, API calls).
// Can be used by both Android (Play Store) and iOS (App Store) services.

/**
 * Validates that a store integration is in VERIFIED status
 * This is a common function that can be used by both Android (Play Store) and iOS (App Store) services
 * @param integration - The store integration to validate (can be StoreIntegration or SafeStoreIntegration)
 * @throws Error if integration status is not VERIFIED
 */
export const validateIntegrationStatus = (integration: StoreIntegration | SafeStoreIntegration): void => {
  const status = integration.status;
  const isVerified = status === IntegrationStatus.VERIFIED;
  
  if (isVerified) {
    return; // Status is valid, proceed
  }

  // Status is not VERIFIED, throw appropriate error
  let errorMessage: string;

  if (status === IntegrationStatus.REVOKED) {
    errorMessage = PLAY_STORE_UPLOAD_ERROR_MESSAGES.INTEGRATION_STATUS_REVOKED;
  } else if (status === IntegrationStatus.PENDING) {
    errorMessage = PLAY_STORE_UPLOAD_ERROR_MESSAGES.INTEGRATION_STATUS_PENDING;
  } else {
    errorMessage = `${PLAY_STORE_UPLOAD_ERROR_MESSAGES.INTEGRATION_STATUS_INVALID} Current status: ${status}`;
  }

  throw new Error(errorMessage);
};

// ============================================================================
// Helper: Encrypt credentials for backend storage
// Uses BACKEND_STORAGE_ENCRYPTION_KEY (backend-only, frontend never sees this)
// ============================================================================

const encryptCredentials = (payload: string): Buffer => {
  // Encrypt using backend storage encryption (double-layer security)
  const encryptedString = encryptForStorage(payload);
  // Store as Buffer in database
  return Buffer.from(encryptedString, 'utf-8');
};

// ============================================================================
// Helper: Decrypt credentials from backend storage
// Uses BACKEND_STORAGE_ENCRYPTION_KEY to decrypt values stored in database
// ============================================================================

const decryptCredentials = (encryptedBuffer: Buffer): string => {
  // Convert Buffer to string (contains backend-encrypted value)
  const encryptedString = encryptedBuffer.toString('utf-8');
  // Decrypt using backend storage decryption
  return decryptFromStorage(encryptedString);
};

// ============================================================================
// Helper: Generate JWT token for App Store Connect API
// ============================================================================

export const generateAppStoreConnectJWT = (
  issuerId: string,
  keyId: string,
  privateKeyPem: string
): string => {
  const now = Math.floor(Date.now() / 1000);
  const expirationTime = now + 120; // 2 minutes (20 min max allowed by Apple)

  // Replace literal \n with actual newlines if needed
  // This handles cases where PEM is stored/transmitted with escaped newlines
  const formattedKey = privateKeyPem.replace(/\\n/g, '\n');

  const token = jwt.sign(
    {
      iss: issuerId,
      iat: now,
      exp: expirationTime,
      aud: 'appstoreconnect-v1',
    },
    formattedKey,
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: keyId,
        typ: 'JWT',
      },
    }
  );

  return token;
};

// ============================================================================
// Helper: Verify App Store Connect credentials
// ============================================================================

const verifyAppStoreConnect = async (
  payload: AppStoreConnectPayload
): Promise<{ isValid: boolean; message: string; details?: any }> => {
  try {
    const { issuerId, keyId, targetAppId, appIdentifier } = payload;
    let { privateKeyPem } = payload;

    // Decrypt private key if encrypted (check if it's not a PEM format)
    if (privateKeyPem && !privateKeyPem.startsWith('-----BEGIN')) {
      console.log('[AppStore] Encrypted privateKeyPem detected, attempting decryption...');
      // Decrypt frontend-encrypted value (Layer 1)
      const decrypted = decryptIfEncrypted(privateKeyPem, 'privateKeyPem');
      
      // Verify decryption worked (should now start with -----BEGIN)
      if (!decrypted.startsWith('-----BEGIN')) {
        return {
          isValid: false,
          message: 'Failed to decrypt private key. Please check ENCRYPTION_KEY environment variable is set correctly on the backend.',
          details: {
            error: 'Decryption did not produce valid PEM format',
            hint: 'Ensure ENCRYPTION_KEY matches between frontend and backend',
          },
        };
      }
      
      privateKeyPem = decrypted;
      console.log('[AppStore] Private key decrypted successfully');
    }

    // Validate required fields
    const isIssuerIdMissing = !issuerId || issuerId.trim().length === 0;
    const isKeyIdMissing = !keyId || keyId.trim().length === 0;
    const isPrivateKeyMissing = !privateKeyPem || privateKeyPem.trim().length === 0;

    if (isIssuerIdMissing || isKeyIdMissing || isPrivateKeyMissing) {
      return {
        isValid: false,
        message: 'Missing required App Store Connect credentials (issuerId, keyId, or privateKeyPem)',
        details: {
          hasIssuerId: !isIssuerIdMissing,
          hasKeyId: !isKeyIdMissing,
          hasPrivateKey: !isPrivateKeyMissing,
        },
      };
    }

    // Validate that privateKeyPem is now in PEM format after decryption
    if (!privateKeyPem.startsWith('-----BEGIN')) {
      console.error('[AppStore] Private key is not in PEM format after decryption');
      console.error('[AppStore] Key starts with:', privateKeyPem.substring(0, 50) + '...');
      return {
        isValid: false,
        message: 'Private key is not in valid PEM format. Ensure you are providing a valid .p8 private key from App Store Connect.',
        details: {
          error: 'Expected PEM format starting with -----BEGIN PRIVATE KEY-----',
          received: privateKeyPem.substring(0, 50) + '...',
        },
      };
    }

    // Generate JWT token
    let jwtToken: string;
    try {
      console.log('[AppStore] Generating JWT token...');
      console.log('[AppStore] Issuer ID:', issuerId);
      console.log('[AppStore] Key ID:', keyId);
      console.log('[AppStore] Private Key format:', privateKeyPem.substring(0, 30) + '...' + privateKeyPem.substring(privateKeyPem.length - 30));
      
      jwtToken = generateAppStoreConnectJWT(issuerId, keyId, privateKeyPem);
      
      console.log('[AppStore] JWT token generated successfully');
    } catch (jwtError: unknown) {
      const jwtErrorMessage = jwtError instanceof Error ? jwtError.message : 'Unknown JWT error';
      console.error('[AppStore] JWT generation failed:', jwtErrorMessage);
      return {
        isValid: false,
        message: `Failed to generate JWT token: ${jwtErrorMessage}`,
        details: { 
          error: jwtErrorMessage,
          hint: 'Ensure the private key is a valid ES256 key from App Store Connect (.p8 file)'
        },
      };
    }

    // Verify token by calling App Store Connect API
    // Endpoint: GET /v1/apps (lists all apps accessible with this token)
    const apiUrl = 'https://api.appstoreconnect.apple.com/v1/apps';
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
    });

    const responseStatus = response.status;
    const isUnauthorized = responseStatus === 401;
    const isForbidden = responseStatus === 403;

    if (isUnauthorized || isForbidden) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        isValid: false,
        message: `App Store Connect authentication failed (${responseStatus}): Invalid credentials or insufficient permissions`,
        details: {
          status: responseStatus,
          error: errorText,
        },
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        isValid: false,
        message: `App Store Connect API error (${responseStatus}): ${errorText}`,
        details: {
          status: responseStatus,
          error: errorText,
        },
      };
    }

    // Parse response to check if app exists (if targetAppId provided)
    const data = await response.json();
    const apps = data.data || [];
    
    // If targetAppId is provided, verify the app exists and is accessible
    if (targetAppId) {
      const appExists = apps.some((app: any) => app.id === targetAppId);
      if (!appExists) {
        return {
          isValid: false,
          message: `App with ID ${targetAppId} not found or not accessible with these credentials`,
          details: {
            targetAppId,
            accessibleAppsCount: apps.length,
          },
        };
      }
    }

    return {
      isValid: true,
      message: 'App Store Connect credentials verified successfully',
      details: {
        issuerId,
        keyId,
        appId: targetAppId || 'Not specified',
        appIdentifier: appIdentifier || 'Not specified',
        accessibleAppsCount: apps.length,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return {
      isValid: false,
      message: `App Store Connect verification failed: ${errorMessage}`,
      details: {
        error: errorMessage,
        stack: errorStack,
      },
    };
  }
};

// ============================================================================
// Helper: Verify Google Play Store credentials
// ============================================================================

// ============================================================================
// Helper: Verify Google Play Store credentials
// ============================================================================

const verifyGooglePlayStore = async (
  payload: GooglePlayStorePayload
): Promise<{ isValid: boolean; message: string; details?: any }> => {
  try {
    const serviceAccountJson = payload.serviceAccountJson as any;
    const { appIdentifier } = payload;

    // Decrypt service account private_key if encrypted
    if (serviceAccountJson._encrypted && serviceAccountJson.private_key) {
      console.log('[PlayStore] Encrypted private_key detected, attempting decryption...');
      console.log('[PlayStore] Encrypted key length:', serviceAccountJson.private_key.length);
      // Decrypt frontend-encrypted value (Layer 1)
      const decrypted = decryptIfEncrypted(serviceAccountJson.private_key, 'private_key');
      console.log('[PlayStore] Decryption successful, decrypted key length:', decrypted.length);
      serviceAccountJson.private_key = decrypted;
      // Remove the encryption flag
      delete serviceAccountJson._encrypted;
    }

    // Validate required fields
    const isServiceAccountMissing = !serviceAccountJson || typeof serviceAccountJson !== 'object';
    const isAppIdentifierMissing = !appIdentifier || appIdentifier.trim().length === 0;
    const isTypeMissing = !serviceAccountJson?.type || serviceAccountJson.type !== 'service_account';
    const isClientEmailMissing = !serviceAccountJson?.client_email || serviceAccountJson.client_email.trim().length === 0;
    const isPrivateKeyMissing = !serviceAccountJson?.private_key || serviceAccountJson.private_key.trim().length === 0;
    
    console.log('[PlayStore] Validation check:', {
      hasServiceAccount: !isServiceAccountMissing,
      hasAppIdentifier: !isAppIdentifierMissing,
      hasType: !isTypeMissing,
      hasClientEmail: !isClientEmailMissing,
      hasPrivateKey: !isPrivateKeyMissing,
      privateKeyLength: serviceAccountJson?.private_key?.length || 0,
    });
    
    // project_id is optional for verification but should be in metadata
    const isProjectIdMissing = !serviceAccountJson?.project_id || serviceAccountJson.project_id.trim().length === 0;

    if (isServiceAccountMissing || isAppIdentifierMissing || isTypeMissing || 
        isClientEmailMissing || isPrivateKeyMissing) {
      return {
        isValid: false,
        message: 'Missing required Google Play Store credentials (serviceAccountJson with type, client_email, private_key, or appIdentifier)',
        details: {
          hasServiceAccount: !isServiceAccountMissing,
          hasAppIdentifier: !isAppIdentifierMissing,
          hasType: !isTypeMissing,
          hasClientEmail: !isClientEmailMissing,
          hasPrivateKey: !isPrivateKeyMissing,
          hasProjectId: !isProjectIdMissing,
        },
      };
    }

    // Warn if project_id is missing (unusual but not critical)
    if (isProjectIdMissing) {
      console.warn('project_id missing in service account JSON (unusual but not critical for authentication)');
    }

    // Fix escaped newlines in private key
    // When sent via JSON, \n becomes \\n, so we need to convert it back
    const privateKey = serviceAccountJson.private_key.replace(/\\n/g, '\n');

    // Create GoogleAuth instance with service account credentials
    const credentials: any = {
      type: serviceAccountJson.type,
      private_key: privateKey,
      client_email: serviceAccountJson.client_email,
    };

    // Add optional fields if present
    if (serviceAccountJson.project_id) {
      credentials.project_id = serviceAccountJson.project_id;
    }
    if (serviceAccountJson.private_key_id) {
      credentials.private_key_id = serviceAccountJson.private_key_id;
    }
    if (serviceAccountJson.client_id) {
      credentials.client_id = serviceAccountJson.client_id;
    }
    if (serviceAccountJson.auth_uri) {
      credentials.auth_uri = serviceAccountJson.auth_uri;
    } else {
      credentials.auth_uri = 'https://accounts.google.com/o/oauth2/auth';
    }
    if (serviceAccountJson.token_uri) {
      credentials.token_uri = serviceAccountJson.token_uri;
    } else {
      credentials.token_uri = 'https://oauth2.googleapis.com/token';
    }
    if (serviceAccountJson.auth_provider_x509_cert_url) {
      credentials.auth_provider_x509_cert_url = serviceAccountJson.auth_provider_x509_cert_url;
    }
    if (serviceAccountJson.client_x509_cert_url) {
      credentials.client_x509_cert_url = serviceAccountJson.client_x509_cert_url;
    }

    const googleAuth = new GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/androidpublisher',
      ],
    });

    // Get access token
    let accessToken: string;
    try {
      const client = await googleAuth.getClient();
      const tokenResponse = await client.getAccessToken();
      const tokenMissing = !tokenResponse.token;
      
      if (tokenMissing) {
        return {
          isValid: false,
          message: 'Failed to obtain access token from Google service account',
          details: { error: 'No access token returned' },
        };
      }
      
      accessToken = tokenResponse.token;
    } catch (authError: unknown) {
      const authErrorMessage = authError instanceof Error ? authError.message : 'Unknown error';
      console.error('Google authentication failed: ', authErrorMessage);
      return {
        isValid: false,
        message: `Google authentication failed: ${authErrorMessage}`,
        details: { error: authErrorMessage },
      };
    }

    // Verify credentials by calling Google Play Developer API
    // Use Edits API to verify access - try to create an edit (which verifies both credentials and app access)
    // Endpoint: POST /androidpublisher/v3/applications/{packageName}/edits
    const apiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${appIdentifier}/edits`;
    
    // Create a temporary edit to verify access (API auto-generates edit ID)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const responseStatus = response.status;
    const isUnauthorized = responseStatus === 401;
    const isForbidden = responseStatus === 403;
    const isNotFound = responseStatus === 404;

    if (isUnauthorized || isForbidden) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        isValid: false,
        message: `Google Play Store authentication failed (${responseStatus}): Invalid credentials or insufficient permissions`,
        details: {
          status: responseStatus,
          error: errorText,
        },
      };
    }

    if (isNotFound) {
      return {
        isValid: false,
        message: `App with package name ${appIdentifier} not found or not accessible with these credentials. Please verify: 1) App exists in Google Play Console, 2) Service account has been granted access in Play Console > Settings > API Access, 3) Package name matches exactly`,
        details: {
          appIdentifier,
          status: responseStatus,
          hint: 'Check Google Play Console > Settings > API Access to ensure service account is linked',
        },
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        isValid: false,
        message: `Google Play Developer API error (${responseStatus}): ${errorText}`,
        details: {
          status: responseStatus,
          error: errorText,
        },
      };
    }

    // Parse response to get edit details
    const editData = await response.json();
    const editId = editData.id;
    
    // Clean up: Delete the temporary edit we created for verification
    if (editId) {
      try {
        const deleteUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${appIdentifier}/edits/${editId}`;
        await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      } catch (deleteError) {
        // Ignore delete errors - edit will expire automatically
        console.warn('Failed to delete temporary edit, it will expire automatically');
      }
    }
    
    return {
      isValid: true,
      message: 'Google Play Store credentials verified successfully',
      details: {
        appIdentifier,
        projectId: serviceAccountJson.project_id || 'Not provided',
        clientEmail: serviceAccountJson.client_email,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return {
      isValid: false,
      message: `Google Play Store verification failed: ${errorMessage}`,
      details: {
        error: errorMessage,
        stack: errorStack,
      },
    };
  }
};

// ============================================================================
// POST /integrations/store/verify
// ============================================================================

export const verifyStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as ConnectStoreRequestBody;
    const { storeType, payload } = body;

    const mappedStoreType = mapStoreTypeFromApi(storeType);
    const isAppStore = mappedStoreType === StoreType.APP_STORE || mappedStoreType === StoreType.TESTFLIGHT;
    const isPlayStore = mappedStoreType === StoreType.PLAY_STORE;

    let verificationResult: { isValid: boolean; message: string; details?: any };

    if (isAppStore) {
      const appStorePayload = payload as AppStoreConnectPayload;
      verificationResult = await verifyAppStoreConnect(appStorePayload);
    } else if (isPlayStore) {
      const playStorePayload = payload as GooglePlayStorePayload;
      verificationResult = await verifyGooglePlayStore(playStorePayload);
    } else {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        verified: false,
        error: ERROR_MESSAGES.INVALID_STORE_TYPE,
      });
      return;
    }

    const isVerified = verificationResult.isValid;
    const statusCode = isVerified ? HTTP_STATUS.OK : HTTP_STATUS.UNAUTHORIZED;

    res.status(statusCode).json({
      success: isVerified ? RESPONSE_STATUS.SUCCESS : RESPONSE_STATUS.FAILURE,
      verified: isVerified,
      message: verificationResult.message,
      details: verificationResult.details,
    });
  } catch (error) {
    const message = getErrorMessage(error, ERROR_MESSAGES.VERIFICATION_FAILED);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      verified: false,
      error: message,
    });
  }
};

// ============================================================================
// PUT /integrations/store/connect
// ============================================================================

export const connectStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as ConnectStoreRequestBody;
    const { storeType, platform, tenantId, payload } = body;
    
    // Get userId from authenticated user (set by auth middleware) or header (for local dev)
    // Authentication is handled by middleware layer, not business logic
    const userIdFromAuth = (req as any).user?.id;
    const userIdFromHeader = Array.isArray(req.headers.userid) 
      ? req.headers.userid[0] 
      : req.headers.userid;
    const userId = userIdFromAuth || userIdFromHeader || 'system'; // Use 'system' as fallback if neither available
    
    // Normalize platform to uppercase
    const platformUpper = platform.toUpperCase() as 'ANDROID' | 'IOS';

    const mappedStoreType = mapStoreTypeFromApi(storeType);
    const integrationController = getStoreController();
    const credentialController = getCredentialController();

    // Verify credentials before saving
    const isAppStoreType = mappedStoreType === StoreType.APP_STORE || mappedStoreType === StoreType.TESTFLIGHT;
    const isPlayStoreType = mappedStoreType === StoreType.PLAY_STORE;

    let verificationResult: { isValid: boolean; message: string; details?: any };

    if (isAppStoreType) {
      const appStorePayload = payload as AppStoreConnectPayload;
      verificationResult = await verifyAppStoreConnect(appStorePayload);
    } else if (isPlayStoreType) {
      const playStorePayload = payload as GooglePlayStorePayload;
      verificationResult = await verifyGooglePlayStore(playStorePayload);
    } else {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.INVALID_STORE_TYPE,
      });
      return;
    }

    const isVerified = verificationResult.isValid;
    if (!isVerified) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: RESPONSE_STATUS.FAILURE,
        error: `Verification failed: ${verificationResult.message}`,
        details: verificationResult.details,
      });
      return;
    }

    // Check if integration already exists by tenantId + storeType + platform
    const integrations = await integrationController.findAll({
      tenantId,
      storeType: mappedStoreType,
      platform: platformUpper,
    });
    
    // If multiple found, take the first one (or could return error if multiple)
    const existingIntegration = integrations.length > 0 ? integrations[0] : null;

    let integrationId: string;
    const integrationExists = !!existingIntegration;

    if (integrationExists) {
      // Validate defaultTrack if provided
      const playStorePayloadForUpdate = payload as GooglePlayStorePayload;
      const defaultTrackProvided = playStorePayloadForUpdate.defaultTrack !== undefined;
      
      if (defaultTrackProvided && playStorePayloadForUpdate.defaultTrack) {
        const mappedTrack = playStorePayloadForUpdate.defaultTrack.toUpperCase() as DefaultTrack;
        const trackIsValid = isValidTrackForStoreType(mappedStoreType, mappedTrack);
        
        if (!trackIsValid) {
          const errorMessage = getInvalidTrackErrorMessage(mappedStoreType, mappedTrack);
          res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: RESPONSE_STATUS.FAILURE,
            error: errorMessage,
          });
          return;
        }
      }

      // Update existing integration with VERIFIED status
      const defaultTrackValue = defaultTrackProvided 
        ? (playStorePayloadForUpdate.defaultTrack?.toUpperCase() as DefaultTrack || null)
        : null;
      
      const updatedIntegration = await integrationController.update(existingIntegration.id, {
        platform: platformUpper,
        displayName: payload.displayName,
        targetAppId: (payload as AppStoreConnectPayload).targetAppId || null,
        defaultLocale: (payload as AppStoreConnectPayload).defaultLocale || null,
        teamName: (payload as AppStoreConnectPayload).teamName || null,
        defaultTrack: defaultTrackValue,
        status: IntegrationStatus.VERIFIED, // Set to VERIFIED since verification passed
      });

      const updateFailed = !updatedIntegration;
      if (updateFailed) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: RESPONSE_STATUS.FAILURE,
          error: ERROR_MESSAGES.INTEGRATION_UPDATE_FAILED,
        });
        return;
      }

      integrationId = updatedIntegration.id;

      // Update lastVerifiedAt
      await integrationController.updateStatus(integrationId, IntegrationStatus.VERIFIED);

      // Delete old credentials
      await credentialController.deleteByIntegrationId(integrationId);
    } else {
      // Validate defaultTrack if provided
      const playStorePayloadForCreate = payload as GooglePlayStorePayload;
      const defaultTrackProvided = playStorePayloadForCreate.defaultTrack !== undefined;
      
      if (defaultTrackProvided && playStorePayloadForCreate.defaultTrack) {
        const mappedTrack = playStorePayloadForCreate.defaultTrack.toUpperCase() as DefaultTrack;
        const trackIsValid = isValidTrackForStoreType(mappedStoreType, mappedTrack);
        
        if (!trackIsValid) {
          const errorMessage = getInvalidTrackErrorMessage(mappedStoreType, mappedTrack);
          res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: RESPONSE_STATUS.FAILURE,
            error: errorMessage,
          });
          return;
        }
      }

      // Create new integration (status defaults to PENDING, will be updated to VERIFIED)
      const defaultTrackValue = defaultTrackProvided 
        ? (playStorePayloadForCreate.defaultTrack?.toUpperCase() as DefaultTrack || null)
        : null;
      
      const newIntegration = await integrationController.create({
        tenantId,
        storeType: mappedStoreType,
        platform: platformUpper,
        displayName: payload.displayName,
        appIdentifier: payload.appIdentifier,
        targetAppId: (payload as AppStoreConnectPayload).targetAppId || null,
        defaultLocale: (payload as AppStoreConnectPayload).defaultLocale || null,
        teamName: (payload as AppStoreConnectPayload).teamName || null,
        defaultTrack: defaultTrackValue,
        createdByAccountId: userId,
      });

      integrationId = newIntegration.id;

      // Update status to VERIFIED since verification passed
      await integrationController.updateStatus(integrationId, IntegrationStatus.VERIFIED);

      const createFailed = !newIntegration;
      if (createFailed) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: RESPONSE_STATUS.FAILURE,
          error: ERROR_MESSAGES.INTEGRATION_CREATE_FAILED,
        });
        return;
      }

      integrationId = newIntegration.id;
    }

    // Create credentials based on store type
    // IMPORTANT: Decrypt any frontend-encrypted values before backend encryption
    if (isAppStoreType) {
      const appStorePayload = payload as AppStoreConnectPayload;
      
      // Decrypt privateKeyPem if it's frontend-encrypted (not in PEM format)
      let privateKeyPem = appStorePayload.privateKeyPem;
      if (privateKeyPem && !privateKeyPem.startsWith('-----BEGIN')) {
        // Decrypt using frontend encryption key (ENCRYPTION_KEY) - Layer 1
        privateKeyPem = decryptIfEncrypted(appStorePayload.privateKeyPem, 'privateKeyPem');
      }
      
      // Create credential payload with plaintext values
      const credentialPayload = JSON.stringify({
        issuerId: appStorePayload.issuerId,
        keyId: appStorePayload.keyId,
        privateKeyPem: privateKeyPem, // Now plaintext
      });

      // Encrypt with backend storage encryption (double-layer security)
      const encryptedPayload = encryptCredentials(credentialPayload);

      await credentialController.create({
        integrationId,
        credentialType: CredentialType.APPLE_API_KEY,
        encryptedPayload,
        encryptionScheme: 'AES-256-GCM',
      });
    }

    if (isPlayStoreType) {
      const playStorePayload = payload as GooglePlayStorePayload;
      const serviceAccountJson = { ...playStorePayload.serviceAccountJson } as any;
      
      // Decrypt private_key if it's frontend-encrypted
      if (serviceAccountJson._encrypted && serviceAccountJson.private_key) {
        // Decrypt using frontend encryption key (ENCRYPTION_KEY) - Layer 1
        serviceAccountJson.private_key = decryptIfEncrypted(serviceAccountJson.private_key, 'private_key');
        delete serviceAccountJson._encrypted;
      }
      
      // Create credential payload with plaintext values
      const credentialPayload = JSON.stringify(serviceAccountJson);

      // Encrypt with backend storage encryption (double-layer security)
      const encryptedPayload = encryptCredentials(credentialPayload);

      await credentialController.create({
        integrationId,
        credentialType: CredentialType.GOOGLE_SERVICE_ACCOUNT,
        encryptedPayload,
        encryptionScheme: 'AES-256-GCM',
      });
    }

    // Set status to VERIFIED since verification was successful
    const response: ConnectStoreResponse = {
      integrationId,
      status: IntegrationStatus.VERIFIED,
    };

    res.status(HTTP_STATUS.CREATED).json({
      success: RESPONSE_STATUS.SUCCESS,
      data: response,
    });
  } catch (error) {
    const message = getErrorMessage(error, ERROR_MESSAGES.INTEGRATION_CREATE_FAILED);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message,
    });
  }
};

// ============================================================================
// PATCH /integrations/store/:integrationId (Partial Update)
// ============================================================================

export const patchStoreIntegration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { integrationId } = req.params;
    const body = req.body || {};
    const { payload } = body;

    const integrationController = getStoreController();
    const credentialController = getCredentialController();

    // STEP 1: Fetch existing integration
    const existingIntegration = await integrationController.findById(integrationId);

    const integrationNotFound = !existingIntegration;
    if (integrationNotFound) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND,
      });
      return;
    }

    // If payload is empty or not provided, return success (no changes)
    const isPayloadEmpty = !payload || Object.keys(payload).length === 0;
    if (isPayloadEmpty) {
      res.status(HTTP_STATUS.OK).json({
        success: RESPONSE_STATUS.SUCCESS,
        data: {
          integrationId: existingIntegration.id,
          status: existingIntegration.status,
        },
        message: 'No changes provided. Integration unchanged.',
      });
      return;
    }

    // Determine store type
    const isAppStoreType = existingIntegration.storeType === StoreType.APP_STORE || existingIntegration.storeType === StoreType.TESTFLIGHT;
    const isPlayStoreType = existingIntegration.storeType === StoreType.PLAY_STORE;

    // STEP 2: Fetch existing credentials from DB
    const existingCredential = await credentialController.findByIntegrationId(existingIntegration.id);

    if (!existingCredential) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'No existing credentials found for this integration. Use PUT /integrations/store/connect to create credentials.',
      });
      return;
    }

    // Decrypt existing credentials
    let existingCredentialData: any;
    try {
      const buffer = existingCredential.encryptedPayload;
      
      let decryptedPayload: string;
      if (Buffer.isBuffer(buffer)) {
        decryptedPayload = decryptCredentials(buffer);
      } else {
        decryptedPayload = decryptFromStorage(String(buffer));
      }
      
      existingCredentialData = JSON.parse(decryptedPayload);
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'Failed to decrypt or parse existing credentials',
      });
      return;
    }

    // STEP 3: Merge payload with existing data (metadata + credentials together)
    
    // Merge metadata fields
    const mergedMetadata = {
      displayName: payload.displayName ?? existingIntegration.displayName,
      appIdentifier: payload.appIdentifier ?? existingIntegration.appIdentifier,
      targetAppId: isAppStoreType ? (payload.targetAppId ?? existingIntegration.targetAppId) : null,
      defaultLocale: isAppStoreType ? (payload.defaultLocale ?? existingIntegration.defaultLocale) : null,
      teamName: isAppStoreType ? (payload.teamName ?? existingIntegration.teamName) : null,
      defaultTrack: isPlayStoreType ? (payload.defaultTrack ?? existingIntegration.defaultTrack) : null,
    };

    // Validate defaultTrack for Play Store
    if (isPlayStoreType && mergedMetadata.defaultTrack) {
      const defaultTrackValue = mergedMetadata.defaultTrack.toUpperCase() as DefaultTrack;
      const trackIsValid = isValidTrackForStoreType(existingIntegration.storeType, defaultTrackValue);
      
      if (!trackIsValid) {
        const errorMessage = getInvalidTrackErrorMessage(existingIntegration.storeType, defaultTrackValue);
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: RESPONSE_STATUS.FAILURE,
          error: errorMessage,
        });
        return;
      }
      
      mergedMetadata.defaultTrack = defaultTrackValue;
    }

    // Merge credential fields
    let mergedCredentials: any;
    
    if (isAppStoreType) {
      mergedCredentials = {
        issuerId: payload.issuerId ?? existingCredentialData.issuerId,
        keyId: payload.keyId ?? existingCredentialData.keyId,
        privateKeyPem: payload.privateKeyPem ?? existingCredentialData.privateKeyPem,
      };
    } else if (isPlayStoreType) {
      const serviceAccountJson = payload.serviceAccountJson ?? {};
      
      mergedCredentials = {
        type: serviceAccountJson.type ?? existingCredentialData.type,
        project_id: serviceAccountJson.project_id ?? existingCredentialData.project_id,
        client_email: serviceAccountJson.client_email ?? existingCredentialData.client_email,
        private_key: serviceAccountJson.private_key ?? existingCredentialData.private_key,
        private_key_id: serviceAccountJson.private_key_id ?? existingCredentialData.private_key_id,
        client_id: serviceAccountJson.client_id ?? existingCredentialData.client_id,
        auth_uri: serviceAccountJson.auth_uri ?? existingCredentialData.auth_uri,
        token_uri: serviceAccountJson.token_uri ?? existingCredentialData.token_uri,
        auth_provider_x509_cert_url: serviceAccountJson.auth_provider_x509_cert_url ?? existingCredentialData.auth_provider_x509_cert_url,
        client_x509_cert_url: serviceAccountJson.client_x509_cert_url ?? existingCredentialData.client_x509_cert_url,
      };
      
      // Preserve _encrypted flag if present in payload
      if (serviceAccountJson._encrypted) {
        mergedCredentials._encrypted = true;
      }
    }

    // STEP 4: VERIFY merged data FIRST (before saving anything)
    let verificationResult;

    if (isAppStoreType) {
      verificationResult = await verifyAppStoreConnect({
        issuerId: mergedCredentials.issuerId,
        keyId: mergedCredentials.keyId,
        privateKeyPem: mergedCredentials.privateKeyPem,
        appIdentifier: mergedMetadata.appIdentifier,
        displayName: mergedMetadata.displayName,
      });
    } else if (isPlayStoreType) {
      verificationResult = await verifyGooglePlayStore({
        serviceAccountJson: mergedCredentials,
        appIdentifier: mergedMetadata.appIdentifier,
        displayName: mergedMetadata.displayName,
      });
    }

    // If verification fails, return error WITHOUT saving anything
    if (!verificationResult || !verificationResult.isValid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'Verification failed',
        details: {
          message: verificationResult?.message,
          ...verificationResult?.details,
        },
      });
      return;
    }

    // STEP 5: Verification passed - now save EVERYTHING to DB
    
    // Save metadata to store_integrations table
    const metadataUpdateData: Partial<UpdateStoreIntegrationDto> = {
      displayName: mergedMetadata.displayName,
      appIdentifier: mergedMetadata.appIdentifier,
    };

    if (isAppStoreType) {
      metadataUpdateData.targetAppId = mergedMetadata.targetAppId ?? null;
      metadataUpdateData.defaultLocale = mergedMetadata.defaultLocale ?? null;
      metadataUpdateData.teamName = mergedMetadata.teamName ?? null;
    }

    if (isPlayStoreType) {
      metadataUpdateData.defaultTrack = mergedMetadata.defaultTrack ?? null;
    }

    const updatedIntegration = await integrationController.update(existingIntegration.id, metadataUpdateData);
    
    const updateFailed = !updatedIntegration;
    if (updateFailed) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.INTEGRATION_UPDATE_FAILED,
      });
      return;
    }

    // Save credentials to store_credentials table
    const credentialPayload = JSON.stringify(mergedCredentials);
    const encryptedPayload = encryptCredentials(credentialPayload);

    await credentialController.deleteByIntegrationId(existingIntegration.id);
    await credentialController.create({
      integrationId: existingIntegration.id,
      credentialType: existingCredential.credentialType,
      encryptedPayload,
      encryptionScheme: existingCredential.encryptionScheme,
    });

    // STEP 6: Return success
    res.status(HTTP_STATUS.OK).json({
      success: RESPONSE_STATUS.SUCCESS,
      data: {
        integrationId: updatedIntegration.id,
        status: updatedIntegration.status,
      },
      message: 'Store integration updated successfully',
    });
  } catch (error) {
    const message = getErrorMessage(error, ERROR_MESSAGES.INTEGRATION_UPDATE_FAILED);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message,
    });
  }
};

// ============================================================================
// Get Platform Store Type Mappings
// ============================================================================

interface PlatformStoreTypeMapping {
  platform: 'ANDROID' | 'IOS';
  allowedStoreTypes: string[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _GetPlatformStoreTypesResponse {
  success: boolean;
  data?: PlatformStoreTypeMapping[];
  error?: string;
}

export const getPlatformStoreTypes = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { platform } = req.query;
    
    const isPlatformMissing = !platform;
    if (isPlatformMissing) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'platform query parameter is required (e.g., ?platform=ANDROID or ?platform=ANDROID,IOS)',
      });
      return;
    }

    // Handle both array format (?platform[]=ANDROID&platform[]=IOS) and comma-separated (?platform=ANDROID,IOS)
    let platforms: string[] = [];
    
    if (Array.isArray(platform)) {
      platforms = platform as string[];
    } else if (typeof platform === 'string') {
      platforms = platform.split(',').map(p => p.trim());
    } else {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'platform must be a string or array (e.g., ?platform=ANDROID,IOS)',
      });
      return;
    }

    const isPlatformsEmpty = platforms.length === 0;
    if (isPlatformsEmpty) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'At least one platform is required',
      });
      return;
    }

    // Normalize platforms to uppercase and remove duplicates
    const normalizedPlatforms = [...new Set(platforms.map(p => p.toUpperCase()))] as ('ANDROID' | 'IOS')[];
    const validPlatforms = ['ANDROID', 'IOS'];
    const invalidPlatforms = normalizedPlatforms.filter(p => !validPlatforms.includes(p));
    
    const hasInvalidPlatforms = invalidPlatforms.length > 0;
    if (hasInvalidPlatforms) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: `Invalid platform(s): ${invalidPlatforms.join(', ')}. Must be one of: ANDROID, IOS`,
      });
      return;
    }

    const storage = getStorage();
    const models = (storage as any).sequelize?.models;
    const modelsMissing = !models;
    
    if (modelsMissing) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'Database models not initialized',
      });
      return;
    }

    const PlatformStoreMapping = models.PlatformStoreMapping;
    const modelMissing = !PlatformStoreMapping;
    
    if (modelMissing) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'PlatformStoreMapping model not found',
      });
      return;
    }

    // Fetch all requested platforms
    const mappings = await PlatformStoreMapping.findAll({
      where: {
        platform: normalizedPlatforms,
      },
    });

    const mappingsFound = mappings.length > 0;
    if (!mappingsFound) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: `No store type mappings found for platforms: ${normalizedPlatforms.join(', ')}`,
      });
      return;
    }

    // Build response array with platform and allowedStoreTypes
    const responseData: PlatformStoreTypeMapping[] = mappings.map(mapping => ({
      platform: mapping.platform,
      allowedStoreTypes: mapping.allowedStoreTypes,
    }));

    // Sort by platform name for consistent ordering
    responseData.sort((a, b) => {
      const platformOrder = { 'ANDROID': 0, 'IOS': 1 };
      return platformOrder[a.platform] - platformOrder[b.platform];
    });

    res.status(HTTP_STATUS.OK).json({
      success: RESPONSE_STATUS.SUCCESS,
      data: responseData,
    });
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to get platform store types');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message,
    });
  }
};

// ============================================================================
// Get Store Integrations by Tenant (Grouped by Platform)
// ============================================================================

interface StoreIntegrationMetadata {
  integrationId: string;
  tenantId: string;
  storeType: StoreType;
  platform: 'ANDROID' | 'IOS';
  status: IntegrationStatus;
  displayName: string;
  appIdentifier: string;
  defaultTrack?: DefaultTrack | null;
  lastVerifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _StoreIntegrationsByPlatformResponse {
  success: boolean;
  data?: {
    IOS?: StoreIntegrationMetadata[];
    ANDROID?: StoreIntegrationMetadata[];
  };
  error?: string;
}

export const getStoreIntegrationsByTenant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tenantId } = req.params;
    
    const isTenantIdMissing = !tenantId || typeof tenantId !== 'string';
    if (isTenantIdMissing) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.TENANT_ID_REQUIRED,
      });
      return;
    }

    const integrationController = getStoreController();
    
    // Fetch all integrations for this tenant
    const integrations = await integrationController.findAll({
      tenantId,
    });

    // Group integrations by platform
    const groupedByPlatform: {
      IOS: StoreIntegrationMetadata[];
      ANDROID: StoreIntegrationMetadata[];
    } = {
      IOS: [],
      ANDROID: [],
    };

    integrations.forEach(integration => {
      const metadata: StoreIntegrationMetadata = {
        integrationId: integration.id,
        tenantId: integration.tenantId,
        storeType: integration.storeType,
        platform: integration.platform,
        status: integration.status,
        displayName: integration.displayName,
        appIdentifier: integration.appIdentifier,
        defaultTrack: integration.defaultTrack || null,
        lastVerifiedAt: integration.lastVerifiedAt || null,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      };

      const platform = integration.platform;
      const isIOS = platform === 'IOS';
      const isAndroid = platform === 'ANDROID';
      
      if (isIOS) {
        groupedByPlatform.IOS.push(metadata);
      } else if (isAndroid) {
        groupedByPlatform.ANDROID.push(metadata);
      }
    });

    // Sort each platform's integrations by createdAt (newest first)
    groupedByPlatform.IOS.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    groupedByPlatform.ANDROID.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Build response - only include platforms that have integrations
    const responseData: {
      IOS?: StoreIntegrationMetadata[];
      ANDROID?: StoreIntegrationMetadata[];
    } = {};

    const hasIOSIntegrations = groupedByPlatform.IOS.length > 0;
    const hasAndroidIntegrations = groupedByPlatform.ANDROID.length > 0;
    
    if (hasIOSIntegrations) {
      responseData.IOS = groupedByPlatform.IOS;
    }
    
    if (hasAndroidIntegrations) {
      responseData.ANDROID = groupedByPlatform.ANDROID;
    }

    res.status(HTTP_STATUS.OK).json({
      success: RESPONSE_STATUS.SUCCESS,
      data: responseData,
    });
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to get store integrations by tenant');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message,
    });
  }
};

// ============================================================================
// Revoke Store Integrations by Tenant, StoreType, and Platform
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _RevokeStoreIntegrationsResponse {
  success: boolean;
  data?: {
    revokedCount: number;
    integrations: Array<{
      integrationId: string;
      tenantId: string;
      storeType: StoreType;
      platform: 'ANDROID' | 'IOS';
      status: IntegrationStatus;
    }>;
  };
  error?: string;
}

export const revokeStoreIntegrations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const { storeType, platform } = req.query;
    
    const isTenantIdMissing = !tenantId || typeof tenantId !== 'string';
    if (isTenantIdMissing) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.TENANT_ID_REQUIRED,
      });
      return;
    }

    const isStoreTypeMissing = !storeType || typeof storeType !== 'string';
    if (isStoreTypeMissing) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.STORE_TYPE_REQUIRED,
      });
      return;
    }

    const isPlatformMissing = !platform || typeof platform !== 'string';
    if (isPlatformMissing) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'platform query parameter is required (e.g., ?platform=ANDROID or ?platform=IOS)',
      });
      return;
    }

    // Normalize storeType and platform
    const mappedStoreType = mapStoreTypeFromApi(storeType);
    const platformUpper = platform.toUpperCase() as 'ANDROID' | 'IOS';
    
    const isValidPlatform = platformUpper === 'ANDROID' || platformUpper === 'IOS';
    if (!isValidPlatform) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'platform must be either ANDROID or IOS (case-insensitive)',
      });
      return;
    }

    const integrationController = getStoreController();
    
    // Find all integrations matching tenantId, storeType, and platform
    const integrations = await integrationController.findAll({
      tenantId,
      storeType: mappedStoreType,
      platform: platformUpper,
    });

    const noIntegrationsFound = integrations.length === 0;
    if (noIntegrationsFound) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: `No store integrations found for tenantId: ${tenantId}, storeType: ${mappedStoreType}, platform: ${platformUpper}`,
      });
      return;
    }

    // Update status to REVOKED for all matching integrations
    const revokedIntegrations = [];
    for (const integration of integrations) {
      const updatedIntegration = await integrationController.updateStatus(
        integration.id,
        IntegrationStatus.REVOKED
      );
      
      if (updatedIntegration) {
        revokedIntegrations.push({
          integrationId: updatedIntegration.id,
          tenantId: updatedIntegration.tenantId,
          storeType: updatedIntegration.storeType,
          platform: updatedIntegration.platform,
          status: updatedIntegration.status,
        });
      }
    }

    const revokedCount = revokedIntegrations.length;
    const updateFailed = revokedCount === 0;
    if (updateFailed) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'Failed to revoke store integrations',
      });
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      success: RESPONSE_STATUS.SUCCESS,
      data: {
        revokedCount,
        integrations: revokedIntegrations,
      },
      message: `Successfully revoked ${revokedCount} store integration(s)`,
    });
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to revoke store integrations');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message,
    });
  }
};

// ============================================================================
// Get Store Integration by ID
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _GetStoreIntegrationResponse {
  success: boolean;
  data?: {
    integrationId: string;
    tenantId: string;
    storeType: StoreType;
    platform: 'ANDROID' | 'IOS';
    status: IntegrationStatus;
    displayName: string;
    appIdentifier: string;
    targetAppId?: string | null;
    defaultLocale?: string | null;
    teamName?: string | null;
    defaultTrack?: DefaultTrack | null;
    lastVerifiedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  error?: string;
}

export const getStoreIntegrationById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { integrationId } = req.params;
    
    const isIntegrationIdMissing = !integrationId || typeof integrationId !== 'string';
    if (isIntegrationIdMissing) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'integrationId is required in path parameters',
      });
      return;
    }

    const integrationController = getStoreController();
    
    // Find integration by ID
    const integration = await integrationController.findById(integrationId);

    const integrationNotFound = !integration;
    if (integrationNotFound) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND,
      });
      return;
    }

    // Build response with status and metadata
    const responseData = {
      integrationId: integration.id,
      tenantId: integration.tenantId,
      storeType: integration.storeType,
      platform: integration.platform,
      status: integration.status,
      displayName: integration.displayName,
      appIdentifier: integration.appIdentifier,
      targetAppId: integration.targetAppId || null,
      defaultLocale: integration.defaultLocale || null,
      teamName: integration.teamName || null,
      defaultTrack: integration.defaultTrack || null,
      lastVerifiedAt: integration.lastVerifiedAt || null,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };

    res.status(HTTP_STATUS.OK).json({
      success: RESPONSE_STATUS.SUCCESS,
      data: responseData,
    });
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to get store integration');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message,
    });
  }
};

// ============================================================================
// Helper: Get GoogleAuth Client from Integration
// ============================================================================

const getGoogleAuthClientFromIntegration = async (
  integrationId: string
): Promise<{ accessToken: string; appIdentifier: string }> => {
  const credentialController = getCredentialController();
  
  // Get credentials from DB
  const existingCredential = await credentialController.findByIntegrationId(integrationId);
  if (!existingCredential) {
    throw new Error(PLAY_STORE_UPLOAD_ERROR_MESSAGES.CREDENTIALS_NOT_FOUND);
  }

  // Read and decrypt existing credential payload
  let decryptedPayload: string;
  try {
    const buffer = existingCredential.encryptedPayload;
    
    // Decrypt using backend storage decryption (double-layer security)
    if (Buffer.isBuffer(buffer)) {
      decryptedPayload = decryptCredentials(buffer);
    } else {
      // Fallback: treat as string and try to decrypt
      decryptedPayload = decryptFromStorage(String(buffer));
    }
  } catch (readError) {
    throw new Error('Failed to decrypt existing credentials');
  }

  // Parse credential JSON
  let credentialData: any;
  try {
    credentialData = JSON.parse(decryptedPayload);
  } catch (parseError) {
    throw new Error('Failed to parse existing credential data');
  }

  // Get service account JSON
  const serviceAccountJson = credentialData;
  
  // Fix escaped newlines in private key
  const privateKey = serviceAccountJson.private_key.replace(/\\n/g, '\n');

  // Create GoogleAuth instance with service account credentials
  const credentials: any = {
    type: serviceAccountJson.type,
    private_key: privateKey,
    client_email: serviceAccountJson.client_email,
  };

  // Add optional fields if present
  if (serviceAccountJson.project_id) {
    credentials.project_id = serviceAccountJson.project_id;
  }
  if (serviceAccountJson.private_key_id) {
    credentials.private_key_id = serviceAccountJson.private_key_id;
  }
  if (serviceAccountJson.client_id) {
    credentials.client_id = serviceAccountJson.client_id;
  }
  if (serviceAccountJson.auth_uri) {
    credentials.auth_uri = serviceAccountJson.auth_uri;
  } else {
    credentials.auth_uri = 'https://accounts.google.com/o/oauth2/auth';
  }
  if (serviceAccountJson.token_uri) {
    credentials.token_uri = serviceAccountJson.token_uri;
  } else {
    credentials.token_uri = 'https://oauth2.googleapis.com/token';
  }
  if (serviceAccountJson.auth_provider_x509_cert_url) {
    credentials.auth_provider_x509_cert_url = serviceAccountJson.auth_provider_x509_cert_url;
  }
  if (serviceAccountJson.client_x509_cert_url) {
    credentials.client_x509_cert_url = serviceAccountJson.client_x509_cert_url;
  }

  const googleAuth = new GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/androidpublisher',
    ],
  });

  // Get access token
  const client = await googleAuth.getClient();
  const tokenResponse = await client.getAccessToken();
  const tokenMissing = !tokenResponse.token;
  
  if (tokenMissing) {
    throw new Error('Failed to obtain access token from Google service account');
  }

  // Get appIdentifier from integration
  const integrationController = getStoreController();
  const integration = await integrationController.findById(integrationId);
  if (!integration) {
    throw new Error(ERROR_MESSAGES.INTEGRATION_NOT_FOUND);
  }

  return {
    accessToken: tokenResponse.token,
    appIdentifier: integration.appIdentifier,
  };
};

// ============================================================================
// Internal Function: Upload AAB to Play Store Internal Track
// ============================================================================

export const uploadAabToPlayStoreInternal = async (
  aabBuffer: Buffer,
  versionName: string,
  tenantId: string,
  storeType: string,
  platform: string,
  releaseId: string,
  releaseNotes?: string
): Promise<UploadAabToPlayStoreResponse> => {
  const mappedStoreType = mapStoreTypeFromApi(storeType);
  const platformUpper = platform.toUpperCase() as 'ANDROID' | 'IOS';
  
  // Validate storeType and platform
  const isPlayStore = mappedStoreType === StoreType.PLAY_STORE;
  const isAndroid = platformUpper === 'ANDROID';
  
  if (!isPlayStore || !isAndroid) {
    throw new Error('storeType must be "play_store" and platform must be "ANDROID"');
  }

  // Map StoreType to target (for release_platforms_targets_mapping table)
  // StoreType.PLAY_STORE -> target 'PLAY_STORE'
  // StoreType.APP_STORE -> target 'APP_STORE'
  const isPlayStoreType = mappedStoreType === StoreType.PLAY_STORE;
  
  if (!isPlayStoreType && mappedStoreType !== StoreType.APP_STORE) {
    throw new Error('storeType must be "play_store" or "app_store" for version validation');
  }

  // Determine target based on storeType
  const target: 'PLAY_STORE' | 'APP_STORE' = isPlayStoreType ? 'PLAY_STORE' : 'APP_STORE';

  // ✅ Get repositories from storage (centralized initialization - replaces factory)
  const storage = getStorage();
  const storageWithServices = storage as any; // Type guard would require importing StorageWithReleaseServices
  
  // Verify repositories are available on storage
  if (!storageWithServices.releaseRepository || !storageWithServices.releasePlatformTargetMappingRepository) {
    throw new Error('Release repositories not available on storage instance');
  }
  
  // ✅ Use repositories from storage (no new keyword)
  const releaseRepo = storageWithServices.releaseRepository;
  const platformTargetMappingRepo = storageWithServices.releasePlatformTargetMappingRepository;

  // First, verify that the release exists and belongs to the tenant
  // Note: releaseId parameter from client is actually the database 'id' field
  const release = await releaseRepo.findById(releaseId);
  const releaseNotFound = !release;
  if (releaseNotFound) {
    throw new Error(PLAY_STORE_UPLOAD_ERROR_MESSAGES.RELEASE_NOT_FOUND);
  }

  // Verify the release belongs to the specified tenant
    const tenantMismatch = release.tenantId !== tenantId;
    if (tenantMismatch) {
      throw new Error(PLAY_STORE_UPLOAD_ERROR_MESSAGES.RELEASE_NOT_FOUND);
    }

  // Query release_platforms_targets_mapping for releaseId, platform, and target
  const mapping = await platformTargetMappingRepo.getByReleasePlatformTarget(
    release.id,  
    platformUpper,
    target
  );

  const mappingNotFound = !mapping;
  if (mappingNotFound) {
    throw new Error(PLAY_STORE_UPLOAD_ERROR_MESSAGES.RELEASE_PLATFORM_TARGET_MAPPING_NOT_FOUND);
  }

  // Compare version from mapping with versionName provided by user
  const releaseVersion = mapping.version;
  const versionMismatch = releaseVersion !== versionName;
  if (versionMismatch) {
    throw new Error(`${PLAY_STORE_UPLOAD_ERROR_MESSAGES.VERSION_MISMATCH} Release version: ${releaseVersion}, Artifact version: ${versionName}`);
  }

  // Find integration by tenantId, storeType, and platform
  const integrationController = getStoreController();
  const integrations = await integrationController.findAll({
    tenantId,
    storeType: mappedStoreType,
    platform: platformUpper,
  });

  const integrationNotFound = integrations.length === 0;
  if (integrationNotFound) {
    throw new Error(PLAY_STORE_UPLOAD_ERROR_MESSAGES.INTEGRATION_NOT_FOUND_FOR_UPLOAD);
  }

  // Use first integration found
  const integration = integrations[0];
  const integrationId = integration.id;
  const packageName = integration.appIdentifier;

  // Validate integration status before proceeding with credential operations
  // This prevents attempting to decrypt credentials or generate access tokens
  // for integrations that are not verified
  validateIntegrationStatus(integration);

  // Get GoogleAuth client and access token
  // Only proceed if integration status is VERIFIED
  const { accessToken } = await getGoogleAuthClientFromIntegration(integrationId);

  console.log('accessToken', accessToken);

  const apiBaseUrl = PLAY_STORE_UPLOAD_CONSTANTS.API_BASE_URL;
  const internalTrack = PLAY_STORE_UPLOAD_CONSTANTS.INTERNAL_TRACK;

  // Step 1: Create edit
  const createEditUrl = `${apiBaseUrl}/applications/${packageName}/edits`;
  const createEditResponse = await fetch(createEditUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!createEditResponse.ok) {
    const errorText = await createEditResponse.text().catch(() => 'Unknown error');
    throw new Error(`Failed to create edit: ${createEditResponse.status} ${errorText}`);
  }

  const editData = await createEditResponse.json();
  const editId = editData.id;

  console.log('editId', editId);

  try {
    // Step 2: Upload bundle
    // CRITICAL: Use /upload/ prefix with ?uploadType=media query parameter
    // POST /upload/androidpublisher/v3/applications/{packageName}/edits/{editId}/bundles?uploadType=media
    // Google Play API upload endpoint expects raw binary data with uploadType=media
    const uploadBundleUrl = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${packageName}/edits/${editId}/bundles?uploadType=media`;
    
    // Send file as raw binary data with application/octet-stream content type
    const uploadBundleResponse = await fetch(uploadBundleUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: aabBuffer,
    });

    if (!uploadBundleResponse.ok) {
      const errorText = await uploadBundleResponse.text().catch(() => 'Unknown error');
      throw new Error(`Failed to upload bundle: ${uploadBundleResponse.status} ${errorText}`);
    }

    const bundleData = await uploadBundleResponse.json();
    const versionCode = bundleData.versionCode;

    if (!versionCode || typeof versionCode !== 'number') {
      throw new Error('Failed to get version code from bundle upload response');
    }

    // Step 3: Create/update release in Internal track
    // PUT /androidpublisher/v3/applications/{packageName}/edits/{editId}/tracks/internal
    // Create release with status="completed" and versionCodes from bundle upload
    const releaseNotesText = releaseNotes ?? PLAY_STORE_UPLOAD_CONSTANTS.DEFAULT_RELEASE_NOTES;
    
    const trackUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editId}/tracks/${internalTrack}`;
    
    // Build release object with status="completed" (as per tested API)
    const release = {
      status: 'completed' as const,
      versionCodes: [versionCode], // version code from bundle upload
      name: versionName, // version name from user request
      releaseNotes: [
        {
          language: 'en-US',
          text: releaseNotesText,
        },
      ],
    };

    // Create/update track with the release
    const trackPayload = {
      releases: [release],
    };

    const updateTrackResponse = await fetch(trackUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trackPayload),
    });

    if (!updateTrackResponse.ok) {
      const errorText = await updateTrackResponse.text().catch(() => 'Unknown error');
      throw new Error(`Failed to create/update release: ${updateTrackResponse.status} ${errorText}`);
    }

    // Verify the response has status="completed" and status code is 200
    const trackResponseData = await updateTrackResponse.json();
    const isStatusCompleted = trackResponseData.releases && 
      trackResponseData.releases.length > 0 && 
      trackResponseData.releases[0].status === 'completed';
    
    if (!isStatusCompleted) {
      throw new Error('Release was not created with completed status');
    }

    // Step 4: Commit edit
    // POST /androidpublisher/v3/applications/{packageName}/edits/{editId}:commit
    // If status code is 200 then success, otherwise return exact Google API error
    const commitEditUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editId}:commit`;
    const commitEditResponse = await fetch(commitEditUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!commitEditResponse.ok) {
      // Return exact Google API error response
      const errorData = await commitEditResponse.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Failed to commit edit: ${commitEditResponse.status} ${JSON.stringify(errorData)}`);
    }

    // Step 5: Generate shareable link
    // versionSpecificUrl = "https://play.google.com/apps/test/{packageName}/{versionCode}"
    const versionSpecificUrl = `https://play.google.com/apps/test/${packageName}/${versionCode}`;

    return {
      versionCode,
      versionSpecificUrl,
      packageName,
      versionName,
    };
  } catch (error) {
    // Clean up: Delete edit if it was created
    console.log('Deleting the edit with editId', editId);
    try {
      const deleteEditUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editId}`;
      await fetch(deleteEditUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    } catch (deleteError) {
      // Ignore delete errors - edit will expire automatically
      console.warn('Failed to delete edit after error, it will expire automatically');
    }
    throw error;
  }
};

// ============================================================================
// POST /integrations/store/play-store/upload
// ============================================================================

export const uploadAabToPlayStore = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract .aab file from request (attached by validation middleware)
    const aabFile = (req as any).aabFile as Express.Multer.File;
    const aabFileMissing = !aabFile || !aabFile.buffer;
    
    if (aabFileMissing) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: PLAY_STORE_UPLOAD_ERROR_MESSAGES.AAB_FILE_REQUIRED,
      });
      return;
    }

    // Extract form fields
    const tenantId = req.body.tenantId as string;
    const storeType = req.body.storeType as string;
    const platform = req.body.platform as string;
    const versionName = req.body.versionName as string;
    const releaseId = req.body.releaseId as string;
    const releaseNotes = req.body.releaseNotes as string | undefined;

    // Call internal function
    const result = await uploadAabToPlayStoreInternal(
      aabFile.buffer,
      versionName,
      tenantId,
      storeType,
      platform,
      releaseId,
      releaseNotes
    );

    res.status(HTTP_STATUS.OK).json({
      success: RESPONSE_STATUS.SUCCESS,
      data: result,
      message: 'AAB uploaded to Play Store Internal track successfully',
    });
  } catch (error) {
    const message = getErrorMessage(error, PLAY_STORE_UPLOAD_ERROR_MESSAGES.PLAY_STORE_UPLOAD_FAILED);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message,
    });
  }
};

// ============================================================================
// GET /integrations/store/play-store/listings
// ============================================================================

export const getPlayStoreListings = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.query.tenantId as string;
    const storeType = req.query.storeType as string;
    const platform = req.query.platform as string;

    const mappedStoreType = mapStoreTypeFromApi(storeType);
    const platformUpper = platform.toUpperCase() as 'ANDROID' | 'IOS';

    // Validate storeType and platform (using constants)
    const isPlayStore = mappedStoreType === StoreType.PLAY_STORE;
    const isAndroid = platformUpper === BUILD_PLATFORM.ANDROID;

    if (!isPlayStore || !isAndroid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: `storeType must be "play_store" (${STORE_TYPE.PLAY_STORE}) and platform must be "${BUILD_PLATFORM.ANDROID}"`,
      });
      return;
    }

    // Find Play Store integration for tenant
    const integrationController = getStoreController();
    const integrations = await integrationController.findAll({
      tenantId,
      storeType: mappedStoreType,
      platform: platformUpper,
    });

    if (integrations.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: PLAY_STORE_UPLOAD_ERROR_MESSAGES.INTEGRATION_NOT_FOUND_FOR_UPLOAD,
      });
      return;
    }

    // Use first integration found
    const integration = integrations[0];
    const integrationId = integration.id;
    const packageName = integration.appIdentifier;

    // Validate integration status before proceeding with credential operations
    // This prevents attempting to decrypt credentials or generate access tokens
    // for integrations that are not verified
    validateIntegrationStatus(integration);

    // Get GoogleAuth client and access token
    // Only proceed if integration status is VERIFIED
    const { accessToken } = await getGoogleAuthClientFromIntegration(integrationId);

    const apiBaseUrl = PLAY_STORE_UPLOAD_CONSTANTS.API_BASE_URL;

    // Step 1: Create edit (required for listings API)
    const createEditUrl = `${apiBaseUrl}/applications/${packageName}/edits`;
    const createEditResponse = await fetch(createEditUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!createEditResponse.ok) {
      const errorText = await createEditResponse.text().catch(() => 'Unknown error');
      throw new Error(`Failed to create edit: ${createEditResponse.status} ${errorText}`);
    }

    const editData = await createEditResponse.json();
    const editId = editData.id;

    try {
      // Step 2: Get listings (supported languages)
      const listingsUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editId}/listings`;
      const listingsResponse = await fetch(listingsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!listingsResponse.ok) {
        const errorText = await listingsResponse.text().catch(() => 'Unknown error');
        throw new Error(`Failed to get listings: ${listingsResponse.status} ${errorText}`);
      }

      const listingsData = await listingsResponse.json();

      // Step 3: Clean up - Delete edit
      const deleteEditUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editId}`;
      await fetch(deleteEditUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }).catch(() => {
        // Ignore delete errors - edit will expire automatically
        console.warn('Failed to delete edit, it will expire automatically');
      });

      res.status(HTTP_STATUS.OK).json({
        success: RESPONSE_STATUS.SUCCESS,
        data: listingsData,
      });
    } catch (error) {
      // Clean up edit on error
      try {
        const deleteEditUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editId}`;
        await fetch(deleteEditUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      } catch (deleteError) {
        // Ignore delete errors
        console.warn('Failed to delete edit after error, it will expire automatically');
      }
      throw error;
    }
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to get Play Store listings');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message,
    });
  }
};

// ============================================================================
// GET /integrations/store/play-store/production-state
// ============================================================================

export const getPlayStoreProductionState = async (req: Request, res: Response): Promise<void> => {
  let editId: string | null = null;
  let packageName: string | null = null;
  let accessToken: string | null = null;
  
  try {
    // Extract query parameters
    const submissionId = req.query.submissionId as string;
    const platform = req.query.platform as string;
    const storeType = req.query.storeType as string;

    const platformUpper = platform.toUpperCase() as 'ANDROID' | 'IOS';
    const mappedStoreType = mapStoreTypeFromApi(storeType);

    // Validate storeType and platform
    const isPlayStore = mappedStoreType === StoreType.PLAY_STORE;
    const isAndroid = platformUpper === BUILD_PLATFORM.ANDROID;
    
    if (!isPlayStore || !isAndroid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: `storeType must be "play_store" and platform must be "${BUILD_PLATFORM.ANDROID}"`,
      });
      return;
    }

    // Get storage and repositories
    const storage = getStorage();
    const sequelize = (storage as any).sequelize;
    const sequelizeMissing = !sequelize;
    
    if (sequelizeMissing) {
      throw new Error('Sequelize instance not available');
    }

    // Get Android submission by submissionId
    const AndroidSubmissionBuildModel = sequelize.models.AndroidSubmissionBuild;
    const androidSubmissionRepo = new AndroidSubmissionBuildRepository(AndroidSubmissionBuildModel);
    
    const submission = await androidSubmissionRepo.findById(submissionId);
    if (!submission) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: `Android submission not found for submissionId: ${submissionId}`,
      });
      return;
    }

    // Get distributionId from submission
    const distributionId = submission.distributionId;

    // Get distribution to get tenantId
    const DistributionModel = sequelize.models.Distribution;
    const distributionRepo = new DistributionRepository(DistributionModel);
    
    const distribution = await distributionRepo.findById(distributionId);
    if (!distribution) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: `Distribution not found for distributionId: ${distributionId}`,
      });
      return;
    }

    const tenantId = distribution.tenantId;

    // Find Play Store integration for tenant with VERIFIED status
    const integrationController = getStoreController();
    const integrations = await integrationController.findAll({
      tenantId,
      storeType: mappedStoreType,
      platform: platformUpper,
    });

    if (integrations.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: RESPONSE_STATUS.FAILURE,
        error: PLAY_STORE_UPLOAD_ERROR_MESSAGES.INTEGRATION_NOT_FOUND_FOR_UPLOAD,
      });
      return;
    }

    // Find VERIFIED integration
    const verifiedIntegration = integrations.find(i => i.status === IntegrationStatus.VERIFIED);
    if (!verifiedIntegration) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: RESPONSE_STATUS.FAILURE,
        error: 'No verified Play Store integration found for this tenant',
      });
      return;
    }

    const integrationId = verifiedIntegration.id;
    packageName = verifiedIntegration.appIdentifier;

    // Validate integration status
    validateIntegrationStatus(verifiedIntegration);

    // Get GoogleAuth client and access token
    const authResult = await getGoogleAuthClientFromIntegration(integrationId);
    accessToken = authResult.accessToken;

    const apiBaseUrl = PLAY_STORE_UPLOAD_CONSTANTS.API_BASE_URL;

    // Step 1: Create edit
    const createEditUrl = `${apiBaseUrl}/applications/${packageName}/edits`;
    const createEditResponse = await fetch(createEditUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!createEditResponse.ok) {
      const errorText = await createEditResponse.text().catch(() => 'Unknown error');
      throw new Error(`Failed to create edit: ${createEditResponse.status} ${errorText}`);
    }

    const editData = await createEditResponse.json();
    editId = editData.id;

    // Step 2: Get production state
    const productionStateUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editId}/tracks/production`;
    const productionStateResponse = await fetch(productionStateUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Step 3: Always delete edit (success or failure)
    if (editId && packageName && accessToken) {
      try {
        const deleteEditUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editId}`;
        await fetch(deleteEditUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      } catch (deleteError) {
        // Ignore delete errors - edit will expire automatically
        console.warn('Failed to delete edit, it will expire automatically');
      }
    }

    // Return response based on status
    if (!productionStateResponse.ok) {
      const errorText = await productionStateResponse.text().catch(() => 'Unknown error');
      res.status(productionStateResponse.status).json({
        success: RESPONSE_STATUS.FAILURE,
        error: `Failed to get production state: ${productionStateResponse.status} ${errorText}`,
      });
      return;
    }

    const productionStateData = await productionStateResponse.json();

    // Step 4: Update Android submission status based on production state
    // Get submission service from storage to process status update
    let statusUpdateResult = null;
    try {
      const storageWithServices = storage as any;
      const submissionService = storageWithServices.submissionService;
      
      if (submissionService) {
        statusUpdateResult = await submissionService.updateAndroidSubmissionStatus(
          submissionId,
          productionStateData
        );
        console.log('[getPlayStoreProductionState] Status update result:', statusUpdateResult);
      } else {
        console.warn('[getPlayStoreProductionState] SubmissionService not available in storage');
      }
    } catch (statusUpdateError) {
      // Log error but don't fail the request - production state data is still valid
      console.error('[getPlayStoreProductionState] Failed to update submission status:', statusUpdateError);
    }

    res.status(HTTP_STATUS.OK).json({
      success: RESPONSE_STATUS.SUCCESS,
      data: productionStateData,
      statusUpdate: statusUpdateResult
    });
  } catch (error) {
    // Clean up edit on error if it was created
    if (editId && packageName && accessToken) {
      try {
        const apiBaseUrl = PLAY_STORE_UPLOAD_CONSTANTS.API_BASE_URL;
        const deleteEditUrl = `${apiBaseUrl}/applications/${packageName}/edits/${editId}`;
        await fetch(deleteEditUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      } catch (deleteError) {
        // Ignore delete errors - edit will expire automatically
        console.warn('Failed to delete edit after error, it will expire automatically');
      }
    }

    const message = getErrorMessage(error, 'Failed to get Play Store production state');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: RESPONSE_STATUS.FAILURE,
      error: message,
    });
  }
};

