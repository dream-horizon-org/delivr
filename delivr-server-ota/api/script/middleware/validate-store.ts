import { NextFunction, Request, Response } from 'express';
import * as yup from 'yup';
import { HTTP_STATUS } from '../constants/http';
import { ERROR_MESSAGES, PLAY_STORE_UPLOAD_ERROR_MESSAGES } from '../constants/store';
import type { ValidationResult } from '~types/validation/validation-result.interface';
import { validationErrorsResponse, simpleErrorResponse } from '../utils/response.utils';
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
import { getStorage } from '../storage/storage-instance';

// ============================================================================
// YUP VALIDATION SCHEMAS
// ============================================================================

/**
 * App Store Verify Schema
 * Validates App Store Connect credentials for verification
 */
const appStoreVerifySchema = yup.object({
  storeType: yup
    .string()
    .trim()
    .required('storeType is required')
    .test('valid-store-type', 
      "storeType must be either 'app_store' or 'testflight'",
      (value) => {
        if (!value) return true;
        const lower = value.toLowerCase();
        return lower === 'app_store' || lower === 'testflight';
      }
    ),
  
  platform: yup
    .string()
    .trim()
    .required('platform is required')
    .test('valid-platform',
      "platform must be 'IOS' for App Store integrations",
      (value) => {
        if (!value) return true;
        return value.toUpperCase() === 'IOS';
      }
    ),
  
  tenantId: yup
    .string()
    .trim()
    .required('tenantId is required'),

  payload: yup.object({
    displayName: yup
      .string()
      .trim()
      .required('Display name is required'),

    
    appIdentifier: yup
      .string()
      .trim()
      .required('App identifier (bundle ID) is required')
      .test('valid-bundle-id', 
        'App identifier must be a valid bundle ID (e.g., com.company.app)',
        (value) => {
          if (!value) return true;
          return /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(value);
        }
      ),
    
    issuerId: yup
      .string()
      .trim()
      .required('App Store Connect Issuer ID is required')
      .test('valid-uuid',
        'Issuer ID must be a valid UUID (e.g., 12345678-1234-1234-1234-123456789abc)',
        (value) => {
          if (!value) return true; // Skip validation if empty (required() handles it)
          return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
        }
      ),
    
    keyId: yup
      .string()
      .trim()
      .required('App Store Connect Key ID is required')
      .test('valid-key-id',
        'Key ID must be exactly 10 uppercase alphanumeric characters (e.g., ABC1234DEF)',
        (value) => {
          if (!value) return true; // Skip validation if empty (required() handles it)
          return /^[A-Z0-9]{10}$/.test(value);
        }
      ),
    
    privateKeyPem: yup
      .string()
      .trim()
      .required('Private key is required'),
    
    targetAppId: yup
      .string()
      .trim()
      .required('Target App ID is required'),
    
    teamName: yup
      .string()
      .trim()
      .required('Team name is required'),
    
    defaultLocale: yup
      .string()
      .trim()
      .optional(),
    
    _encrypted: yup
      .boolean()
      .optional()
  }).required('payload is required')
});

/**
 * App Store Update Schema (for PATCH operations)
 * All fields are optional, but validated if present
 */
const appStoreUpdateSchema = yup.object({
  payload: yup.object({
    displayName: yup
      .string()
      .trim()
      .optional()
      .min(1, 'Display name cannot be empty if provided'),

    appIdentifier: yup
      .string()
      .trim()
      .optional()
      .min(1, 'App identifier cannot be empty if provided')
      .test('valid-bundle-id', 
        'App identifier must be a valid bundle ID (e.g., com.company.app)',
        (value) => {
          if (!value) return true; // Skip if not provided
          return /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(value);
        }
      ),
    
    issuerId: yup
      .string()
      .trim()
      .optional()
      .min(1, 'Issuer ID cannot be empty if provided')
      .test('valid-uuid',
        'Issuer ID must be a valid UUID (e.g., 12345678-1234-1234-1234-123456789abc)',
        (value) => {
          if (!value) return true; // Skip if not provided
          return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
        }
      ),
    
    keyId: yup
      .string()
      .trim()
      .optional()
      .min(1, 'Key ID cannot be empty if provided')
      .test('valid-key-id',
        'Key ID must be exactly 10 uppercase alphanumeric characters (e.g., ABC1234DEF)',
        (value) => {
          if (!value) return true; // Skip if not provided
          return /^[A-Z0-9]{10}$/.test(value);
        }
      ),
    
    privateKeyPem: yup
      .string()
      .trim()
      .optional()
      .min(1, 'Private key cannot be empty if provided'),
    
    targetAppId: yup
      .string()
      .trim()
      .optional()
      .min(1, 'Target App ID cannot be empty if provided'),
    
    teamName: yup
      .string()
      .trim()
      .optional()
      .min(1, 'Team name cannot be empty if provided'),
    
    defaultLocale: yup
      .string()
      .trim()
      .optional()
      .min(1, 'Default locale cannot be empty if provided'),

    _encrypted: yup
      .boolean()
      .optional(),

    // Play Store fields (also optional in App Store update)
    serviceAccountJson: yup.object().optional(),
    defaultTrack: yup
      .string()
      .trim()
      .optional()
      .min(1, 'Default track cannot be empty if provided')
  }).optional()
});

/**
 * Play Store Verify Schema
 * Validates Google Play Store credentials for verification
 */
const playStoreVerifySchema = yup.object({
  storeType: yup
    .string()
    .trim()
    .required('storeType is required')
    .test('valid-store-type', 
      "storeType must be 'play_store'",
      (value) => {
        if (!value) return true;
        return value.toLowerCase() === 'play_store';
      }
    ),
  
  platform: yup
    .string()
    .trim()
    .required('platform is required')
    .test('valid-platform',
      "platform must be 'ANDROID' for Play Store integrations",
      (value) => {
        if (!value) return true;
        return value.toUpperCase() === 'ANDROID';
      }
    ),
  
  tenantId: yup
    .string()
    .trim()
    .required('tenantId is required'),

  payload: yup.object({
    displayName: yup
      .string()
      .trim()
      .required('Display name is required'),

    appIdentifier: yup
      .string()
      .trim()
      .required('App identifier (package name) is required')
      .test('valid-package-name', 
        'App identifier must be a valid Android package name (e.g., com.company.app)',
        (value) => {
          if (!value) return true;
          // Android package name: must start with lowercase letter, segments separated by dots
          return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(value);
        }
      ),
    
    serviceAccountJson: yup.object({
      type: yup
        .string()
        .required('Service account type is required'),
      
      project_id: yup
        .string()
        .required('Service account project_id is required'),
      
      client_email: yup
        .string()
        .email('Service account client_email must be a valid email')
        .required('Service account client_email is required'),
      
      private_key: yup
        .string()
        .required('Service account private_key is required'),
      
      _encrypted: yup
        .boolean()
        .optional()
    }).required('serviceAccountJson is required'),
    
    defaultTrack: yup
      .string()
      .transform(() => 'INTERNAL') // Always force to INTERNAL
      .default('INTERNAL')
  }).required('payload is required')
});

/**
 * Play Store Update Schema (for PATCH operations)
 * All fields are optional, but validated if present
 */
const playStoreUpdateSchema = yup.object({
  payload: yup.object({
    displayName: yup
      .string()
      .trim()
      .optional()
      .min(1, 'Display name cannot be empty if provided'),

    appIdentifier: yup
      .string()
      .trim()
      .optional()
      .min(1, 'App identifier cannot be empty if provided')
      .test('valid-package-name', 
        'App identifier must be a valid Android package name (e.g., com.company.app)',
        (value) => {
          if (!value) return true;
          return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(value);
        }
      ),
    
    serviceAccountJson: yup.object({
      type: yup
        .string()
        .optional()
        .min(1, 'Service account type cannot be empty if provided'),
      project_id: yup
        .string()
        .optional()
        .min(1, 'Project ID cannot be empty if provided'),
      client_email: yup
        .string()
        .optional()
        .min(1, 'Client email cannot be empty if provided')
        .email('Service account client_email must be a valid email'),
      private_key: yup
        .string()
        .optional()
        .min(1, 'Private key cannot be empty if provided'),
      _encrypted: yup
        .boolean()
        .optional()
    }).optional(),
    
    defaultTrack: yup
      .string()
      .transform(() => 'INTERNAL') // Always force to INTERNAL
      .optional()
  }).optional()
});

/**
 * Helper function to validate with Yup and format errors
 * Returns ValidationResult for middleware to handle responses
 */
async function validateWithYup<T>(
  schema: yup.Schema<T>,
  data: unknown
): Promise<ValidationResult<T>> {
  try {
    const validated = await schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });
    return { success: true, data: validated };
  } catch (error: unknown) {
    if (error instanceof yup.ValidationError) {
      // Group errors by field
      const errorsByField = new Map<string, string[]>();
      
      error.inner.forEach((err) => {
        const field = err.path || 'unknown';
        if (!errorsByField.has(field)) {
          errorsByField.set(field, []);
        }
        errorsByField.get(field)!.push(err.message);
      });

      // Convert to ValidationError array format
      const errors = Array.from(errorsByField.entries()).map(([field, messages]) => ({
        field,
        messages
      }));

      return { success: false, errors };
    }
    
    // Unexpected error - rethrow to be handled by caller
    throw error;
  }
}

// ============================================================================
// LEGACY VALIDATION HELPERS
// ============================================================================

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
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(ERROR_MESSAGES.TENANT_ID_REQUIRED, 'validation_failed')
    );
    return;
  }
  next();
};

export const validateIntegrationId = (req: Request, res: Response, next: NextFunction): void => {
  const integrationId = req.params.integrationId;
  const isIntegrationIdInvalid = !isNonEmptyString(integrationId);
  if (isIntegrationIdInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('integrationId is required in path parameters', 'validation_failed')
    );
    return;
  }
  next();
};

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validate store connect/verify request body
 * Uses Yup validation for both App Store and Play Store
 * Used for: POST /integrations/store/verify and PUT /integrations/store/connect
 */
export const validateConnectStoreBody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const body = req.body || {};
  const { storeType } = body;

  // Quick check if storeType exists to determine validation strategy
  if (!storeType || typeof storeType !== 'string') {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      ...validationErrorsResponse('storeType is required', [{ field: 'storeType', errorCode: 'validation_failed', messages: ['storeType is required'] }]),
      verified: false
    });
    return;
  }

  const storeTypeLower = storeType.toLowerCase();
  const isAppStore = storeTypeLower === 'app_store' || storeTypeLower === 'testflight';
  const isPlayStore = storeTypeLower === 'play_store';

  // Use Yup validation for App Store
  if (isAppStore) {
    const validationResult = await validateWithYup(appStoreVerifySchema, req.body);
    if (validationResult.success === false) {
      const errorsWithCode = validationResult.errors.map(err => ({ ...err, errorCode: 'validation_failed' }));
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        ...validationErrorsResponse('Request validation failed', errorsWithCode),
        verified: false
      });
      return;
    }
    
    // Update req.body with validated and trimmed data
    req.body = validationResult.data;
    next();
    return;
  }

  // Use Yup validation for Play Store
  if (isPlayStore) {
    const validationResult = await validateWithYup(playStoreVerifySchema, req.body);
    if (validationResult.success === false) {
      const errorsWithCode = validationResult.errors.map(err => ({ ...err, errorCode: 'validation_failed' }));
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        ...validationErrorsResponse('Request validation failed', errorsWithCode),
        verified: false
      });
      return;
    }
    
    // Update req.body with validated and trimmed data
    req.body = validationResult.data;
    next();
    return;
  }

  // If not App Store or Play Store, return error
  res.status(HTTP_STATUS.BAD_REQUEST).json(
    simpleErrorResponse('Invalid storeType. Must be app_store, testflight, or play_store', 'validation_failed')
  );
  return;
};

export const validateGetPlatformStoreTypesQuery = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { platform } = req.query || {};
  
  const isPlatformMissing = !platform;
  if (isPlatformMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('platform query parameter is required (e.g., ?platform=ANDROID or ?platform=ANDROID,IOS)', 'validation_failed')
    );
    return;
  }

  // Handle both array format (?platform[]=ANDROID&platform[]=IOS) and comma-separated (?platform=ANDROID,IOS)
  let platforms: string[] = [];
  
  if (Array.isArray(platform)) {
    platforms = platform as string[];
  } else if (typeof platform === 'string') {
    platforms = platform.split(',').map(p => p.trim());
  } else {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('platform must be a string or array (e.g., ?platform=ANDROID,IOS)', 'validation_failed')
    );
    return;
  }

  const isPlatformsEmpty = platforms.length === 0;
  if (isPlatformsEmpty) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('At least one platform is required (e.g., ?platform=ANDROID or ?platform=ANDROID,IOS)', 'validation_failed')
    );
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
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(`Invalid platform(s): ${invalidPlatforms.join(', ')}. Must be one of: ANDROID, IOS`, 'validation_failed')
    );
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
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(ERROR_MESSAGES.STORE_TYPE_REQUIRED, 'validation_failed')
    );
    return;
  }

  const isPlatformMissing = !platform || typeof platform !== 'string';
  if (isPlatformMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('platform query parameter is required (e.g., ?platform=ANDROID or ?platform=IOS)', 'validation_failed')
    );
    return;
  }

  // Validate storeType
  const validStoreTypes = ['app_store', 'play_store', 'testflight', 'microsoft_store', 'firebase'];
  const isValidStoreType = validStoreTypes.includes(storeType.toLowerCase());
  if (!isValidStoreType) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(ERROR_MESSAGES.INVALID_STORE_TYPE, 'validation_failed')
    );
    return;
  }

  // Validate platform
  const platformUpper = platform.toUpperCase();
  const isValidPlatform = platformUpper === 'ANDROID' || platformUpper === 'IOS';
  if (!isValidPlatform) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('platform must be either ANDROID or IOS (case-insensitive)', 'validation_failed')
    );
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
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(errorMessage, 'validation_failed')
    );
    return;
  }

  // Validate platform value
  const platformUpper = platform.toUpperCase();
  const isValidPlatform = platformUpper === 'ANDROID' || platformUpper === 'IOS';
  if (!isValidPlatform) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('platform must be either ANDROID or IOS (case-insensitive)', 'validation_failed')
    );
    return;
  }

  // Validate storeType
  const validStoreTypes = ['app_store', 'play_store', 'testflight', 'microsoft_store', 'firebase'];
  const isValidStoreType = validStoreTypes.includes(storeType.toLowerCase());
  if (!isValidStoreType) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(ERROR_MESSAGES.INVALID_STORE_TYPE, 'validation_failed')
    );
    return;
  }

  // payload is optional - if provided, validate structure but allow empty object
  const isPayloadProvided = payload !== undefined;
  if (isPayloadProvided) {
    const isPayloadInvalid = payload !== null && typeof payload !== 'object';
    if (isPayloadInvalid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        simpleErrorResponse('payload must be an object if provided (can be empty object {})', 'validation_failed')
      );
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
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            simpleErrorResponse('payload.issuerId must be a non-empty string if provided', 'validation_failed')
          );
          return;
        }
        
        if (appStorePayload.keyId !== undefined && !isNonEmptyString(appStorePayload.keyId)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            simpleErrorResponse('payload.keyId must be a non-empty string if provided', 'validation_failed')
          );
          return;
        }
        
        if (appStorePayload.privateKeyPem !== undefined && !isNonEmptyString(appStorePayload.privateKeyPem)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            simpleErrorResponse('payload.privateKeyPem must be a non-empty string if provided', 'validation_failed')
          );
          return;
        }

        // Validate displayName if provided
        if (appStorePayload.displayName !== undefined && !isNonEmptyString(appStorePayload.displayName)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            simpleErrorResponse('payload.displayName must be a non-empty string if provided', 'validation_failed')
          );
          return;
        }

        // Validate appIdentifier if provided
        if (appStorePayload.appIdentifier !== undefined && !isNonEmptyString(appStorePayload.appIdentifier)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            simpleErrorResponse('payload.appIdentifier must be a non-empty string if provided', 'validation_failed')
          );
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
            res.status(HTTP_STATUS.BAD_REQUEST).json(
              simpleErrorResponse('payload.serviceAccountJson must be an object if provided', 'validation_failed')
            );
            return;
          }

          // For PATCH: If serviceAccountJson is provided, validate individual fields if present
          // But don't require all fields - user might only want to update other fields
          const serviceAccountJson = playStorePayload.serviceAccountJson;
          if (serviceAccountJson.type !== undefined && !isNonEmptyString(serviceAccountJson.type)) {
            res.status(HTTP_STATUS.BAD_REQUEST).json(
              simpleErrorResponse('payload.serviceAccountJson.type must be a non-empty string if provided', 'validation_failed')
            );
            return;
          }
          if (serviceAccountJson.project_id !== undefined && !isNonEmptyString(serviceAccountJson.project_id)) {
            res.status(HTTP_STATUS.BAD_REQUEST).json(
              simpleErrorResponse('payload.serviceAccountJson.project_id must be a non-empty string if provided', 'validation_failed')
            );
            return;
          }
          if (serviceAccountJson.client_email !== undefined && !isNonEmptyString(serviceAccountJson.client_email)) {
            res.status(HTTP_STATUS.BAD_REQUEST).json(
              simpleErrorResponse('payload.serviceAccountJson.client_email must be a non-empty string if provided', 'validation_failed')
            );
            return;
          }
          if (serviceAccountJson.private_key !== undefined && !isNonEmptyString(serviceAccountJson.private_key)) {
            res.status(HTTP_STATUS.BAD_REQUEST).json(
              simpleErrorResponse('payload.serviceAccountJson.private_key must be a non-empty string if provided', 'validation_failed')
            );
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
            res.status(HTTP_STATUS.BAD_REQUEST).json(
              simpleErrorResponse(errorMessage, 'validation_failed')
            );
            return;
          }
        }

        // Validate displayName if provided
        if (playStorePayload.displayName !== undefined && !isNonEmptyString(playStorePayload.displayName)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            simpleErrorResponse('payload.displayName must be a non-empty string if provided', 'validation_failed')
          );
          return;
        }

        // Validate appIdentifier if provided
        if (playStorePayload.appIdentifier !== undefined && !isNonEmptyString(playStorePayload.appIdentifier)) {
          res.status(HTTP_STATUS.BAD_REQUEST).json(
            simpleErrorResponse('payload.appIdentifier must be a non-empty string if provided', 'validation_failed')
          );
          return;
        }
      }
    }
  }

  next();
};

export const validatePatchStoreBodyByIntegrationId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Fetch integration to determine store type
    const { integrationId } = req.params;
    
    if (!integrationId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        simpleErrorResponse('integrationId is required in path parameters', 'validation_failed')
      );
      return;
    }

    const storage = getStorage();
    const storeController = (storage as any).storeIntegrationController;
    
    if (!storeController) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        simpleErrorResponse('Store controller not available', 'internal_error')
      );
      return;
    }

    const integration = await storeController.findById(integrationId);
    
    if (!integration) {
      res.status(HTTP_STATUS.NOT_FOUND).json(
        simpleErrorResponse('Integration not found', 'not_found')
      );
      return;
    }

    // Determine which schema to use based on store type
    const isAppStoreType = integration.storeType === 'APP_STORE' || integration.storeType === 'TESTFLIGHT';
    const isPlayStoreType = integration.storeType === 'PLAY_STORE';

    let schema: yup.Schema<any>;
    
    if (isAppStoreType) {
      schema = appStoreUpdateSchema;
    } else if (isPlayStoreType) {
      schema = playStoreUpdateSchema;
    } else {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        simpleErrorResponse(`Unsupported store type: ${integration.storeType}`, 'validation_failed')
      );
      return;
    }

    // Use Yup validation - all fields optional but validated if present
    const validationResult = await validateWithYup(schema, req.body);
    if (validationResult.success === false) {
      const errorsWithCode = validationResult.errors.map(err => ({ ...err, errorCode: 'validation_failed' }));
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        validationErrorsResponse('Request validation failed', errorsWithCode)
      );
      return;
    }
    
    // Update req.body with validated and trimmed data
    req.body = validationResult.data;
    next();
  } catch (error: unknown) {
    console.error('[validatePatchStoreBodyByIntegrationId] Error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      simpleErrorResponse('Failed to validate request', 'internal_error')
    );
    return;
  }
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
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(ERROR_MESSAGES.TENANT_ID_REQUIRED, 'validation_failed')
    );
    return;
  }

  // Validate releaseId
  const isReleaseIdInvalid = !isNonEmptyString(releaseId);
  if (isReleaseIdInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('releaseId is required', 'validation_failed')
    );
    return;
  }

  // Validate storeType
  const isStoreTypeInvalid = !isNonEmptyString(storeType);
  if (isStoreTypeInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(ERROR_MESSAGES.STORE_TYPE_REQUIRED, 'validation_failed')
    );
    return;
  }

  // Validate storeType is 'play_store'
  const storeTypeLower = storeType.toLowerCase();
  const isPlayStore = storeTypeLower === 'play_store';
  if (!isPlayStore) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('storeType must be "play_store" for AAB upload', 'validation_failed')
    );
    return;
  }

  // Validate platform
  const isPlatformInvalid = !isNonEmptyString(platform);
  if (isPlatformInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('platform is required', 'validation_failed')
    );
    return;
  }

  // Validate platform is 'ANDROID'
  const platformUpper = platform.toUpperCase();
  const isAndroid = platformUpper === 'ANDROID';
  if (!isAndroid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('platform must be "ANDROID" for Play Store upload', 'validation_failed')
    );
    return;
  }

  // Validate versionName
  const isVersionNameInvalid = !isNonEmptyString(versionName);
  if (isVersionNameInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(PLAY_STORE_UPLOAD_ERROR_MESSAGES.VERSION_NAME_REQUIRED, 'validation_failed')
    );
    return;
  }

  // Validate releaseNotes if provided (optional)
  if (releaseNotes !== undefined && releaseNotes !== null) {
    const isReleaseNotesInvalid = typeof releaseNotes !== 'string';
    if (isReleaseNotesInvalid) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        simpleErrorResponse('releaseNotes must be a string if provided', 'validation_failed')
      );
      return;
    }
  }

  // Validate .aab file exists in req.files (from multer)
  const files = req.files as Express.Multer.File[] | undefined;
  const filesMissing = !files || !Array.isArray(files) || files.length === 0;
  if (filesMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(PLAY_STORE_UPLOAD_ERROR_MESSAGES.AAB_FILE_REQUIRED, 'validation_failed')
    );
    return;
  }

  // Find .aab file
  const aabFile = files.find(file => {
    const fileName = file.originalname || file.filename || '';
    return fileName.toLowerCase().endsWith('.aab');
  });

  const aabFileMissing = !aabFile;
  if (aabFileMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(PLAY_STORE_UPLOAD_ERROR_MESSAGES.INVALID_AAB_FILE, 'validation_failed')
    );
    return;
  }

  // Validate file has buffer
  const bufferMissing = !aabFile.buffer || !Buffer.isBuffer(aabFile.buffer);
  if (bufferMissing) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(PLAY_STORE_UPLOAD_ERROR_MESSAGES.INVALID_AAB_FILE, 'validation_failed')
    );
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
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(ERROR_MESSAGES.TENANT_ID_REQUIRED, 'validation_failed')
    );
    return;
  }

  // Validate storeType
  const isStoreTypeInvalid = !isNonEmptyString(storeType);
  if (isStoreTypeInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(ERROR_MESSAGES.STORE_TYPE_REQUIRED, 'validation_failed')
    );
    return;
  }

  // Validate storeType is 'play_store' (API format, maps to STORE_TYPE.PLAY_STORE)
  const storeTypeLower = storeType.toLowerCase();
  const isPlayStore = storeTypeLower === 'play_store';
  if (!isPlayStore) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(`storeType must be "play_store" for listings (maps to ${STORE_TYPE.PLAY_STORE})`, 'validation_failed')
    );
    return;
  }

  // Validate platform
  const isPlatformInvalid = !isNonEmptyString(platform);
  if (isPlatformInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('platform is required', 'validation_failed')
    );
    return;
  }

  // Validate platform is ANDROID (using constant)
  const platformUpper = platform.toUpperCase();
  const isAndroid = platformUpper === BUILD_PLATFORM.ANDROID;
  if (!isAndroid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(`platform must be "${BUILD_PLATFORM.ANDROID}" for Play Store listings`, 'validation_failed')
    );
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
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('submissionId is required', 'validation_failed')
    );
    return;
  }

  // Validate platform
  const isPlatformInvalid = !isNonEmptyString(platform);
  if (isPlatformInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('platform is required', 'validation_failed')
    );
    return;
  }

  // Validate platform is 'Android'
  const platformUpper = platform.toUpperCase();
  const isAndroid = platformUpper === BUILD_PLATFORM.ANDROID;
  if (!isAndroid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse(`platform must be "${BUILD_PLATFORM.ANDROID}" for Play Store production state`, 'validation_failed')
    );
    return;
  }

  // Validate storeType
  const isStoreTypeInvalid = !isNonEmptyString(storeType);
  if (isStoreTypeInvalid) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('storeType is required', 'validation_failed')
    );
    return;
  }

  // Validate storeType is 'play_store'
  const storeTypeLower = storeType.toLowerCase();
  const isPlayStore = storeTypeLower === 'play_store';
  if (!isPlayStore) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      simpleErrorResponse('storeType must be "play_store" for Play Store production state', 'validation_failed')
    );
    return;
  }

  next();
};
