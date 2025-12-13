import { Request, Response } from 'express';
// @ts-ignore - jsonwebtoken types may not be available
import * as jwt from 'jsonwebtoken';
// For Google Play Store verification
const { GoogleAuth } = require('google-auth-library');
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
} from '../../storage/integrations/store/store-types';
import { HTTP_STATUS, RESPONSE_STATUS } from '../../constants/http';
import { ERROR_MESSAGES } from '../../constants/store';
import { getErrorMessage } from '../../utils/error.utils';
import { decrypt, encryptForStorage, decryptFromStorage } from '../../utils/encryption';

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
      try {
        console.log('[AppStore] Encrypted privateKeyPem detected, attempting decryption...');
        const decrypted = decrypt(privateKeyPem);
        
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
      } catch (error) {
        console.error('[AppStore] Failed to decrypt privateKeyPem:', error);
        return {
          isValid: false,
          message: 'Failed to decrypt private key. ENCRYPTION_KEY may be missing or incorrect.',
          details: {
            error: error instanceof Error ? error.message : 'Unknown decryption error',
            hint: 'Check backend .env file for ENCRYPTION_KEY',
          },
        };
      }
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
      try {
        const decrypted = decrypt(serviceAccountJson.private_key);
        console.log('[PlayStore] Decryption successful, decrypted key length:', decrypted.length);
        serviceAccountJson.private_key = decrypted;
        // Remove the encryption flag
        delete serviceAccountJson._encrypted;
      } catch (error) {
        console.error('[PlayStore] Failed to decrypt service account private_key:', error);
        delete serviceAccountJson._encrypted;
        return {
          isValid: false,
          message: `Failed to decrypt private_key: ${error instanceof Error ? error.message : 'Unknown decryption error'}`,
          details: { error: String(error) },
        };
      }
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
    const { storeType, platform, tenantId, userId, payload } = body;
    
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
        try {
          // Decrypt using frontend encryption key (ENCRYPTION_KEY)
          privateKeyPem = decrypt(appStorePayload.privateKeyPem);
        } catch (error) {
          console.error('[Store] Failed to decrypt privateKeyPem before storage:', error);
          // If decryption fails, use as-is (might already be plaintext or backend-encrypted)
        }
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
        try {
          // Decrypt using frontend encryption key (ENCRYPTION_KEY)
          serviceAccountJson.private_key = decrypt(serviceAccountJson.private_key);
          delete serviceAccountJson._encrypted;
        } catch (error) {
          console.error('[Store] Failed to decrypt private_key before storage:', error);
          // If decryption fails, use as-is
          delete serviceAccountJson._encrypted;
        }
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

    // Find existing integration by ID
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

    // Determine store type for credential handling
    const isAppStoreType = existingIntegration.storeType === StoreType.APP_STORE || existingIntegration.storeType === StoreType.TESTFLIGHT;
    const isPlayStoreType = existingIntegration.storeType === StoreType.PLAY_STORE;

    // Build update data for store_integrations table - only include fields that are provided in payload
    const updateData: Partial<UpdateStoreIntegrationDto> = {};

    // Update displayName if provided
    if (payload.displayName !== undefined) {
      updateData.displayName = payload.displayName;
    }

    // Update appIdentifier if provided
    if (payload.appIdentifier !== undefined) {
      updateData.appIdentifier = payload.appIdentifier;
    }

    // Update App Store specific fields if provided
    if (isAppStoreType) {
      if (payload.targetAppId !== undefined) {
        updateData.targetAppId = payload.targetAppId || null;
      }
      if (payload.defaultLocale !== undefined) {
        updateData.defaultLocale = payload.defaultLocale || null;
      }
      if (payload.teamName !== undefined) {
        updateData.teamName = payload.teamName || null;
      }
    }

    // Update Play Store specific fields if provided
    if (isPlayStoreType) {
      if (payload.defaultTrack !== undefined) {
        const defaultTrackValue = payload.defaultTrack
          ? (payload.defaultTrack.toUpperCase() as DefaultTrack)
          : null;
        
        const trackIsValid = isValidTrackForStoreType(existingIntegration.storeType, defaultTrackValue ?? DefaultTrack.INTERNAL);
        
        if (defaultTrackValue && !trackIsValid) {
          const errorMessage = getInvalidTrackErrorMessage(existingIntegration.storeType, defaultTrackValue);
          res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: RESPONSE_STATUS.FAILURE,
            error: errorMessage,
          });
          return;
        }
        
        updateData.defaultTrack = defaultTrackValue;
      }
    }

    // Update store_integrations table if there are fields to update
    const hasFieldsToUpdate = Object.keys(updateData).length > 0;
    let updatedIntegration = existingIntegration;

    if (hasFieldsToUpdate) {
      updatedIntegration = await integrationController.update(existingIntegration.id, updateData);
      
      const updateFailed = !updatedIntegration;
      if (updateFailed) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: RESPONSE_STATUS.FAILURE,
          error: ERROR_MESSAGES.INTEGRATION_UPDATE_FAILED,
        });
        return;
      }
    }

    // Handle credential updates (partial updates supported)
    const hasCredentialFields = (isAppStoreType && (payload.issuerId !== undefined || payload.keyId !== undefined || payload.privateKeyPem !== undefined)) ||
                                (isPlayStoreType && payload.serviceAccountJson !== undefined);

    if (hasCredentialFields) {
      // Get existing credential
      const existingCredential = await credentialController.findByIntegrationId(existingIntegration.id);

      if (!existingCredential) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: RESPONSE_STATUS.FAILURE,
          error: 'No existing credentials found for this integration. Use PUT /integrations/store/connect to create credentials.',
        });
        return;
      }

      // Read and decrypt existing credential payload from backend storage
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
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: RESPONSE_STATUS.FAILURE,
          error: 'Failed to decrypt existing credentials',
        });
        return;
      }

      // Parse decrypted JSON
      let credentialData: any;
      try {
        credentialData = JSON.parse(decryptedPayload);
      } catch (parseError) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: RESPONSE_STATUS.FAILURE,
          error: 'Failed to parse existing credential data',
        });
        return;
      }

      // Update only the fields provided in payload (partial update)
      if (isAppStoreType) {
        if (payload.issuerId !== undefined) {
          credentialData.issuerId = payload.issuerId;
        }
        if (payload.keyId !== undefined) {
          credentialData.keyId = payload.keyId;
        }
        if (payload.privateKeyPem !== undefined) {
          credentialData.privateKeyPem = payload.privateKeyPem;
        }
      } else if (isPlayStoreType && payload.serviceAccountJson) {
        // Update serviceAccountJson fields
        const serviceAccountJson = payload.serviceAccountJson;
        if (serviceAccountJson.type !== undefined) {
          credentialData.type = serviceAccountJson.type;
        }
        if (serviceAccountJson.project_id !== undefined) {
          credentialData.project_id = serviceAccountJson.project_id;
        }
        if (serviceAccountJson.client_email !== undefined) {
          credentialData.client_email = serviceAccountJson.client_email;
        }
        if (serviceAccountJson.private_key !== undefined) {
          credentialData.private_key = serviceAccountJson.private_key;
        }
        // Update other service account fields if provided
        if (serviceAccountJson.private_key_id !== undefined) {
          credentialData.private_key_id = serviceAccountJson.private_key_id;
        }
        if (serviceAccountJson.client_id !== undefined) {
          credentialData.client_id = serviceAccountJson.client_id;
        }
        if (serviceAccountJson.auth_uri !== undefined) {
          credentialData.auth_uri = serviceAccountJson.auth_uri;
        }
        if (serviceAccountJson.token_uri !== undefined) {
          credentialData.token_uri = serviceAccountJson.token_uri;
        }
        if (serviceAccountJson.auth_provider_x509_cert_url !== undefined) {
          credentialData.auth_provider_x509_cert_url = serviceAccountJson.auth_provider_x509_cert_url;
        }
        if (serviceAccountJson.client_x509_cert_url !== undefined) {
          credentialData.client_x509_cert_url = serviceAccountJson.client_x509_cert_url;
        }
      }

      // Save updated credentials as plain text (no encryption)
      // Note: encryptCredentials() just converts to Buffer, doesn't actually encrypt
      const updatedCredentialPayload = JSON.stringify(credentialData);
      const encryptedPayload = encryptCredentials(updatedCredentialPayload);

      // Update the existing credential record
      await credentialController.deleteByIntegrationId(existingIntegration.id);
      await credentialController.create({
        integrationId: existingIntegration.id,
        credentialType: existingCredential.credentialType,
        encryptedPayload,
        encryptionScheme: existingCredential.encryptionScheme,
      });
    }

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

