import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http';
import { ERROR_MESSAGES, PLAY_STORE_UPLOAD_ERROR_MESSAGES } from '../constants/store';
import { 
  StoreType as _StoreType, 
  DefaultTrack,
  AppStoreConnectPayload, 
  GooglePlayStorePayload,
  mapStoreTypeFromApi,
  isValidTrackForStoreType,
  getInvalidTrackErrorMessage
} from '../storage/integrations/store/store-types';
import { BUILD_PLATFORM, STORE_TYPE } from '~types/release-management/builds/build.constants';

const isNonEmptyString = (value: unknown): value is string => {
  const isString = typeof value === 'string';
  const trimmed = isString ? value.trim() : '';
  const isNonEmpty = trimmed.length > 0;
  return isString && isNonEmpty;
};

export const validateTenantId = (req: Request, res: Response, next: NextFunction): void => {
  const tenantId = req.params.tenantId;
  const isTenantIdInvalid = !isNonEmptyString(tenantId);
  if (isTenantIdInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: ERROR_MESSAGES.TENANT_ID_REQUIRED 
    });
    return;
  }
  next();
};

export const validateIntegrationId = (req: Request, res: Response, next: NextFunction): void => {
  const integrationId = req.params.integrationId;
  const isIntegrationIdInvalid = !isNonEmptyString(integrationId);
  if (isIntegrationIdInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: 'integrationId is required in path parameters' 
    });
    return;
  }
  next();
};

export const validateConnectStoreBody = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body || {};
  const { storeType, platform, tenantId, payload } = body;

  const isStoreTypeInvalid = !isNonEmptyString(storeType);
  const isPlatformInvalid = !isNonEmptyString(platform);
  const isTenantIdInvalid = !isNonEmptyString(tenantId);
  const isPayloadMissing = !payload || typeof payload !== 'object';

  const hasInvalid = isStoreTypeInvalid || isPlatformInvalid || isTenantIdInvalid || isPayloadMissing;

  if (hasInvalid) {
    const missingFields: string[] = [];
    if (isStoreTypeInvalid) missingFields.push('storeType');
    if (isPlatformInvalid) missingFields.push('platform');
    if (isTenantIdInvalid) missingFields.push('tenantId');
    if (isPayloadMissing) missingFields.push('payload');

    const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: errorMessage 
    });
    return;
  }

  // Validate platform value
  const platformUpper = platform.toUpperCase();
  const isValidPlatform = platformUpper === 'ANDROID' || platformUpper === 'IOS';
  if (!isValidPlatform) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: 'platform must be either ANDROID or IOS (case-insensitive)' 
    });
    return;
  }

  const validStoreTypes = ['app_store', 'play_store', 'testflight', 'microsoft_store', 'firebase'];
  const isValidStoreType = validStoreTypes.includes(storeType.toLowerCase());
  if (!isValidStoreType) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: ERROR_MESSAGES.INVALID_STORE_TYPE 
    });
    return;
  }

  const isDisplayNameInvalid = !isNonEmptyString(payload.displayName);
  const isAppIdentifierInvalid = !isNonEmptyString(payload.appIdentifier);

  if (isDisplayNameInvalid || isAppIdentifierInvalid) {
    const missingFields: string[] = [];
    if (isDisplayNameInvalid) missingFields.push('payload.displayName');
    if (isAppIdentifierInvalid) missingFields.push('payload.appIdentifier');

    const errorMessage = `Missing required fields in payload: ${missingFields.join(', ')}`;
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: errorMessage 
    });
    return;
  }

  const storeTypeLower = storeType.toLowerCase();
  const isAppStore = storeTypeLower === 'app_store' || storeTypeLower === 'testflight';
  const isPlayStore = storeTypeLower === 'play_store';

  if (isAppStore) {
    const appStorePayload = payload as AppStoreConnectPayload;
    const isIssuerIdInvalid = !isNonEmptyString(appStorePayload.issuerId);
    const isKeyIdInvalid = !isNonEmptyString(appStorePayload.keyId);
    const isPrivateKeyInvalid = !isNonEmptyString(appStorePayload.privateKeyPem);

    if (isIssuerIdInvalid || isKeyIdInvalid || isPrivateKeyInvalid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false, 
        error: ERROR_MESSAGES.INVALID_APP_STORE_PAYLOAD 
      });
      return;
    }
  }

  if (isPlayStore) {
    const playStorePayload = payload as GooglePlayStorePayload;
    const isServiceAccountInvalid = !playStorePayload.serviceAccountJson || 
      typeof playStorePayload.serviceAccountJson !== 'object' ||
      !isNonEmptyString(playStorePayload.serviceAccountJson.type) ||
      !isNonEmptyString(playStorePayload.serviceAccountJson.project_id) ||
      !isNonEmptyString(playStorePayload.serviceAccountJson.client_email) ||
      !isNonEmptyString(playStorePayload.serviceAccountJson.private_key);

    if (isServiceAccountInvalid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false, 
        error: ERROR_MESSAGES.INVALID_PLAY_STORE_PAYLOAD 
      });
      return;
    }

    // Validate defaultTrack for Play Store (cannot be TESTFLIGHT)
    if (playStorePayload.defaultTrack) {
      const mappedStoreType = mapStoreTypeFromApi(storeType);
      const mappedTrack = playStorePayload.defaultTrack.toUpperCase() as DefaultTrack;
      const trackIsValid = isValidTrackForStoreType(mappedStoreType, mappedTrack);
      
      if (!trackIsValid) {
        const errorMessage = getInvalidTrackErrorMessage(mappedStoreType, mappedTrack);
        res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          success: false, 
          error: errorMessage 
        });
        return;
      }
    }
  }

  // Validate defaultTrack for App Store/TestFlight if provided
  if (isAppStore) {
    const _appStorePayload = payload as AppStoreConnectPayload;
    // App Store doesn't have defaultTrack in payload, but if it did, we'd validate here
    // For now, App Store uses targetAppId and other fields
  }

  next();
};

export const validateGetPlatformStoreTypesQuery = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { platform } = req.query || {};
  
  const isPlatformMissing = !platform;
  if (isPlatformMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
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
      success: false,
      error: 'platform must be a string or array (e.g., ?platform=ANDROID,IOS)',
    });
    return;
  }

  const isPlatformsEmpty = platforms.length === 0;
  if (isPlatformsEmpty) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'At least one platform is required (e.g., ?platform=ANDROID or ?platform=ANDROID,IOS)',
    });
    return;
  }

  // Validate each platform
  const validPlatforms = ['ANDROID', 'IOS'];
  const invalidPlatforms: string[] = [];
  
  platforms.forEach(p => {
    const platformUpper = p.toUpperCase();
    const isValidPlatform = validPlatforms.includes(platformUpper);
    if (!isValidPlatform) {
      invalidPlatforms.push(p);
    }
  });

  const hasInvalidPlatforms = invalidPlatforms.length > 0;
  if (hasInvalidPlatforms) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: `Invalid platform(s): ${invalidPlatforms.join(', ')}. Must be one of: ANDROID, IOS`,
    });
    return;
  }

  next();
};

export const validateRevokeStoreIntegrationsQuery = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { storeType, platform } = req.query || {};
  
  const isStoreTypeMissing = !storeType || typeof storeType !== 'string';
  if (isStoreTypeMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: ERROR_MESSAGES.STORE_TYPE_REQUIRED,
    });
    return;
  }

  const isPlatformMissing = !platform || typeof platform !== 'string';
  if (isPlatformMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'platform query parameter is required (e.g., ?platform=ANDROID or ?platform=IOS)',
    });
    return;
  }

  // Validate storeType
  const validStoreTypes = ['app_store', 'play_store', 'testflight', 'microsoft_store', 'firebase'];
  const isValidStoreType = validStoreTypes.includes(storeType.toLowerCase());
  if (!isValidStoreType) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: ERROR_MESSAGES.INVALID_STORE_TYPE 
    });
    return;
  }

  // Validate platform
  const platformUpper = platform.toUpperCase();
  const isValidPlatform = platformUpper === 'ANDROID' || platformUpper === 'IOS';
  if (!isValidPlatform) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'platform must be either ANDROID or IOS (case-insensitive)',
    });
    return;
  }

  next();
};

export const validatePatchStoreBody = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body || {};
  const { storeType, platform, tenantId, userId, payload } = body;

  // Validate required fields
  const isStoreTypeInvalid = !isNonEmptyString(storeType);
  const isPlatformInvalid = !isNonEmptyString(platform);
  const isTenantIdInvalid = !isNonEmptyString(tenantId);
  const isUserIdInvalid = !isNonEmptyString(userId);

  const hasInvalidRequired = isStoreTypeInvalid || isPlatformInvalid || isTenantIdInvalid || isUserIdInvalid;

  if (hasInvalidRequired) {
    const missingFields: string[] = [];
    if (isStoreTypeInvalid) missingFields.push('storeType');
    if (isPlatformInvalid) missingFields.push('platform');
    if (isTenantIdInvalid) missingFields.push('tenantId');
    if (isUserIdInvalid) missingFields.push('userId');

    const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: errorMessage 
    });
    return;
  }

  // Validate platform value
  const platformUpper = platform.toUpperCase();
  const isValidPlatform = platformUpper === 'ANDROID' || platformUpper === 'IOS';
  if (!isValidPlatform) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: 'platform must be either ANDROID or IOS (case-insensitive)' 
    });
    return;
  }

  // Validate storeType
  const validStoreTypes = ['app_store', 'play_store', 'testflight', 'microsoft_store', 'firebase'];
  const isValidStoreType = validStoreTypes.includes(storeType.toLowerCase());
  if (!isValidStoreType) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: ERROR_MESSAGES.INVALID_STORE_TYPE 
    });
    return;
  }

  // payload is optional - if provided, validate structure but allow empty object
  const isPayloadProvided = payload !== undefined;
  if (isPayloadProvided) {
    const isPayloadInvalid = payload !== null && typeof payload !== 'object';
    if (isPayloadInvalid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false, 
        error: 'payload must be an object if provided (can be empty object {})' 
      });
      return;
    }

    // If payload is provided and not empty, validate fields based on storeType
    const payloadKeys = payload ? Object.keys(payload) : [];
    const isPayloadEmpty = payloadKeys.length === 0;
    
    if (!isPayloadEmpty) {
      const storeTypeLower = storeType.toLowerCase();
      const isAppStore = storeTypeLower === 'app_store' || storeTypeLower === 'testflight';
      const isPlayStore = storeTypeLower === 'play_store';

      // Validate App Store credential fields if provided
      // For PATCH: Only validate individual fields if present, don't require all fields (allows partial updates)
      if (isAppStore) {
        const appStorePayload = payload as AppStoreConnectPayload;
        
        // For PATCH: Validate individual credential fields if present, but don't require all
        if (appStorePayload.issuerId !== undefined && !isNonEmptyString(appStorePayload.issuerId)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            error: 'payload.issuerId must be a non-empty string if provided' 
          });
          return;
        }
        
        if (appStorePayload.keyId !== undefined && !isNonEmptyString(appStorePayload.keyId)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            error: 'payload.keyId must be a non-empty string if provided' 
          });
          return;
        }
        
        if (appStorePayload.privateKeyPem !== undefined && !isNonEmptyString(appStorePayload.privateKeyPem)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            error: 'payload.privateKeyPem must be a non-empty string if provided' 
          });
          return;
        }

        // Validate displayName if provided
        if (appStorePayload.displayName !== undefined && !isNonEmptyString(appStorePayload.displayName)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            error: 'payload.displayName must be a non-empty string if provided' 
          });
          return;
        }

        // Validate appIdentifier if provided
        if (appStorePayload.appIdentifier !== undefined && !isNonEmptyString(appStorePayload.appIdentifier)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            error: 'payload.appIdentifier must be a non-empty string if provided' 
          });
          return;
        }
      }

      // Validate Play Store credential fields if provided
      if (isPlayStore) {
        const playStorePayload = payload as GooglePlayStorePayload;
        
        // If serviceAccountJson is provided, validate it
        // For PATCH: Only validate structure, not all required fields (allows partial updates)
        if (playStorePayload.serviceAccountJson !== undefined) {
          const isServiceAccountInvalid = !playStorePayload.serviceAccountJson || 
            typeof playStorePayload.serviceAccountJson !== 'object';

          if (isServiceAccountInvalid) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ 
              success: false, 
              error: 'payload.serviceAccountJson must be an object if provided' 
            });
            return;
          }

          // For PATCH: If serviceAccountJson is provided, validate individual fields if present
          // But don't require all fields - user might only want to update other fields
          const serviceAccountJson = playStorePayload.serviceAccountJson;
          if (serviceAccountJson.type !== undefined && !isNonEmptyString(serviceAccountJson.type)) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ 
              success: false, 
              error: 'payload.serviceAccountJson.type must be a non-empty string if provided' 
            });
            return;
          }
          if (serviceAccountJson.project_id !== undefined && !isNonEmptyString(serviceAccountJson.project_id)) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ 
              success: false, 
              error: 'payload.serviceAccountJson.project_id must be a non-empty string if provided' 
            });
            return;
          }
          if (serviceAccountJson.client_email !== undefined && !isNonEmptyString(serviceAccountJson.client_email)) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ 
              success: false, 
              error: 'payload.serviceAccountJson.client_email must be a non-empty string if provided' 
            });
            return;
          }
          if (serviceAccountJson.private_key !== undefined && !isNonEmptyString(serviceAccountJson.private_key)) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ 
              success: false, 
              error: 'payload.serviceAccountJson.private_key must be a non-empty string if provided' 
            });
            return;
          }
        }

        // Validate defaultTrack if provided
        if (playStorePayload.defaultTrack !== undefined && playStorePayload.defaultTrack) {
          const mappedStoreType = mapStoreTypeFromApi(storeType);
          const mappedTrack = playStorePayload.defaultTrack.toUpperCase() as DefaultTrack;
          const trackIsValid = isValidTrackForStoreType(mappedStoreType, mappedTrack);
          
          if (!trackIsValid) {
            const errorMessage = getInvalidTrackErrorMessage(mappedStoreType, mappedTrack);
            res.status(HTTP_STATUS.BAD_REQUEST).json({ 
              success: false, 
              error: errorMessage 
            });
            return;
          }
        }

        // Validate displayName if provided
        if (playStorePayload.displayName !== undefined && !isNonEmptyString(playStorePayload.displayName)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            error: 'payload.displayName must be a non-empty string if provided' 
          });
          return;
        }

        // Validate appIdentifier if provided
        if (playStorePayload.appIdentifier !== undefined && !isNonEmptyString(playStorePayload.appIdentifier)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            error: 'payload.appIdentifier must be a non-empty string if provided' 
          });
          return;
        }
      }
    }
  }

  next();
};

export const validatePatchStoreBodyByIntegrationId = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body || {};
  const { payload } = body;

  // payload is optional - if provided, validate structure but allow empty object
  const isPayloadProvided = payload !== undefined;
  if (isPayloadProvided) {
    const isPayloadInvalid = payload !== null && typeof payload !== 'object';
    if (isPayloadInvalid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false, 
        error: 'payload must be an object if provided (can be empty object {})' 
      });
      return;
    }

    // If payload is provided and not empty, validate individual fields
    const payloadKeys = payload ? Object.keys(payload) : [];
    const isPayloadEmpty = payloadKeys.length === 0;
    
    if (!isPayloadEmpty) {
      // Validate App Store credential fields if provided (partial updates allowed)
      if (payload.issuerId !== undefined && !isNonEmptyString(payload.issuerId)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          success: false, 
          error: 'payload.issuerId must be a non-empty string if provided' 
        });
        return;
      }
      
      if (payload.keyId !== undefined && !isNonEmptyString(payload.keyId)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          success: false, 
          error: 'payload.keyId must be a non-empty string if provided' 
        });
        return;
      }
      
      if (payload.privateKeyPem !== undefined && !isNonEmptyString(payload.privateKeyPem)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          success: false, 
          error: 'payload.privateKeyPem must be a non-empty string if provided' 
        });
        return;
      }

      // Validate Play Store serviceAccountJson if provided
      if (payload.serviceAccountJson !== undefined) {
        const isServiceAccountInvalid = !payload.serviceAccountJson || 
          typeof payload.serviceAccountJson !== 'object';

        if (isServiceAccountInvalid) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            error: 'payload.serviceAccountJson must be an object if provided' 
          });
          return;
        }

        // Validate individual serviceAccountJson fields if present
        const serviceAccountJson = payload.serviceAccountJson;
        if (serviceAccountJson.type !== undefined && !isNonEmptyString(serviceAccountJson.type)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            error: 'payload.serviceAccountJson.type must be a non-empty string if provided' 
          });
          return;
        }
        if (serviceAccountJson.project_id !== undefined && !isNonEmptyString(serviceAccountJson.project_id)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            error: 'payload.serviceAccountJson.project_id must be a non-empty string if provided' 
          });
          return;
        }
        if (serviceAccountJson.client_email !== undefined && !isNonEmptyString(serviceAccountJson.client_email)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            error: 'payload.serviceAccountJson.client_email must be a non-empty string if provided' 
          });
          return;
        }
        if (serviceAccountJson.private_key !== undefined && !isNonEmptyString(serviceAccountJson.private_key)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            error: 'payload.serviceAccountJson.private_key must be a non-empty string if provided' 
          });
          return;
        }
      }

      // Validate other fields
      if (payload.displayName !== undefined && !isNonEmptyString(payload.displayName)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          success: false, 
          error: 'payload.displayName must be a non-empty string if provided' 
        });
        return;
      }

      if (payload.appIdentifier !== undefined && !isNonEmptyString(payload.appIdentifier)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          success: false, 
          error: 'payload.appIdentifier must be a non-empty string if provided' 
        });
        return;
      }
    }
  }

  next();
};

// ============================================================================
// Validate Play Store AAB Upload Request
// ============================================================================

export const validatePlayStoreUploadBody = (req: Request, res: Response, next: NextFunction): void => {
  // Extract form fields from multipart/form-data
  const tenantId = req.body?.tenantId;
  const storeType = req.body?.storeType;
  const platform = req.body?.platform;
  const versionName = req.body?.versionName;
  const releaseId = req.body?.releaseId;
  const releaseNotes = req.body?.releaseNotes; // Optional

  // Validate tenantId
  const isTenantIdInvalid = !isNonEmptyString(tenantId);
  if (isTenantIdInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: ERROR_MESSAGES.TENANT_ID_REQUIRED,
    });
    return;
  }

  // Validate releaseId
  const isReleaseIdInvalid = !isNonEmptyString(releaseId);
  if (isReleaseIdInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'releaseId is required',
    });
    return;
  }

  // Validate storeType
  const isStoreTypeInvalid = !isNonEmptyString(storeType);
  if (isStoreTypeInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: ERROR_MESSAGES.STORE_TYPE_REQUIRED,
    });
    return;
  }

  // Validate storeType is 'play_store'
  const storeTypeLower = storeType.toLowerCase();
  const isPlayStore = storeTypeLower === 'play_store';
  if (!isPlayStore) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'storeType must be "play_store" for AAB upload',
    });
    return;
  }

  // Validate platform
  const isPlatformInvalid = !isNonEmptyString(platform);
  if (isPlatformInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'platform is required',
    });
    return;
  }

  // Validate platform is 'ANDROID'
  const platformUpper = platform.toUpperCase();
  const isAndroid = platformUpper === 'ANDROID';
  if (!isAndroid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'platform must be "ANDROID" for Play Store upload',
    });
    return;
  }

  // Validate versionName
  const isVersionNameInvalid = !isNonEmptyString(versionName);
  if (isVersionNameInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: PLAY_STORE_UPLOAD_ERROR_MESSAGES.VERSION_NAME_REQUIRED,
    });
    return;
  }

  // Validate releaseNotes if provided (optional)
  if (releaseNotes !== undefined && releaseNotes !== null) {
    const isReleaseNotesInvalid = typeof releaseNotes !== 'string';
    if (isReleaseNotesInvalid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'releaseNotes must be a string if provided',
      });
      return;
    }
  }

  // Validate .aab file exists in req.files (from multer)
  const files = req.files as Express.Multer.File[] | undefined;
  const filesMissing = !files || !Array.isArray(files) || files.length === 0;
  if (filesMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: PLAY_STORE_UPLOAD_ERROR_MESSAGES.AAB_FILE_REQUIRED,
    });
    return;
  }

  // Find .aab file
  const aabFile = files.find(file => {
    const fileName = file.originalname || file.filename || '';
    return fileName.toLowerCase().endsWith('.aab');
  });

  const aabFileMissing = !aabFile;
  if (aabFileMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: PLAY_STORE_UPLOAD_ERROR_MESSAGES.INVALID_AAB_FILE,
    });
    return;
  }

  // Validate file has buffer
  const bufferMissing = !aabFile.buffer || !Buffer.isBuffer(aabFile.buffer);
  if (bufferMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: PLAY_STORE_UPLOAD_ERROR_MESSAGES.INVALID_AAB_FILE,
    });
    return;
  }

  // Attach aabFile to request for use in controller
  (req as any).aabFile = aabFile;

  next();
};

// ============================================================================
// Validate Play Store Listings Query
// ============================================================================

export const validatePlayStoreListingsQuery = (req: Request, res: Response, next: NextFunction): void => {
  // Extract from query parameters (GET request)
  const tenantId = req.query?.tenantId as string;
  const storeType = req.query?.storeType as string;
  const platform = req.query?.platform as string;

  // Validate tenantId
  const isTenantIdInvalid = !isNonEmptyString(tenantId);
  if (isTenantIdInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: ERROR_MESSAGES.TENANT_ID_REQUIRED,
    });
    return;
  }

  // Validate storeType
  const isStoreTypeInvalid = !isNonEmptyString(storeType);
  if (isStoreTypeInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: ERROR_MESSAGES.STORE_TYPE_REQUIRED,
    });
    return;
  }

  // Validate storeType is 'play_store' (API format, maps to STORE_TYPE.PLAY_STORE)
  const storeTypeLower = storeType.toLowerCase();
  const isPlayStore = storeTypeLower === 'play_store';
  if (!isPlayStore) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: `storeType must be "play_store" for listings (maps to ${STORE_TYPE.PLAY_STORE})`,
    });
    return;
  }

  // Validate platform
  const isPlatformInvalid = !isNonEmptyString(platform);
  if (isPlatformInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'platform is required',
    });
    return;
  }

  // Validate platform is ANDROID (using constant)
  const platformUpper = platform.toUpperCase();
  const isAndroid = platformUpper === BUILD_PLATFORM.ANDROID;
  if (!isAndroid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: `platform must be "${BUILD_PLATFORM.ANDROID}" for Play Store listings`,
    });
    return;
  }

  next();
};

// ============================================================================
// Validate Play Store Production State Query
// ============================================================================

export const validatePlayStoreProductionStateQuery = (req: Request, res: Response, next: NextFunction): void => {
  // Extract from query parameters (GET request)
  const submissionId = req.query?.submissionId as string;
  const platform = req.query?.platform as string;
  const storeType = req.query?.storeType as string;

  // Validate submissionId
  const isSubmissionIdInvalid = !isNonEmptyString(submissionId);
  if (isSubmissionIdInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'submissionId is required',
    });
    return;
  }

  // Validate platform
  const isPlatformInvalid = !isNonEmptyString(platform);
  if (isPlatformInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'platform is required',
    });
    return;
  }

  // Validate platform is 'Android'
  const platformUpper = platform.toUpperCase();
  const isAndroid = platformUpper === BUILD_PLATFORM.ANDROID;
  if (!isAndroid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: `platform must be "${BUILD_PLATFORM.ANDROID}" for Play Store production state`,
    });
    return;
  }

  // Validate storeType
  const isStoreTypeInvalid = !isNonEmptyString(storeType);
  if (isStoreTypeInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'storeType is required',
    });
    return;
  }

  // Validate storeType is 'play_store'
  const storeTypeLower = storeType.toLowerCase();
  const isPlayStore = storeTypeLower === 'play_store';
  if (!isPlayStore) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'storeType must be "play_store" for Play Store production state',
    });
    return;
  }

  next();
};
