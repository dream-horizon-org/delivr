import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http';
import { ERROR_MESSAGES } from '../constants/store';
import { 
  StoreType, 
  DefaultTrack,
  AppStoreConnectPayload, 
  GooglePlayStorePayload,
  mapStoreTypeFromApi,
  isValidTrackForStoreType,
  getInvalidTrackErrorMessage
} from '../storage/integrations/store/store-types';

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
  const { storeType, platform, tenantId, userId, payload } = body;

  const isStoreTypeInvalid = !isNonEmptyString(storeType);
  const isPlatformInvalid = !isNonEmptyString(platform);
  const isTenantIdInvalid = !isNonEmptyString(tenantId);
  const isUserIdInvalid = !isNonEmptyString(userId);
  const isPayloadMissing = !payload || typeof payload !== 'object';

  const hasInvalid = isStoreTypeInvalid || isPlatformInvalid || isTenantIdInvalid || isUserIdInvalid || isPayloadMissing;

  if (hasInvalid) {
    const missingFields: string[] = [];
    if (isStoreTypeInvalid) missingFields.push('storeType');
    if (isPlatformInvalid) missingFields.push('platform');
    if (isTenantIdInvalid) missingFields.push('tenantId');
    if (isUserIdInvalid) missingFields.push('userId');
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
    const appStorePayload = payload as AppStoreConnectPayload;
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
