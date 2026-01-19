import { BuildArtifactError, type BuildArtifactErrorCode } from './build-artifact.interface';
import { BUILD_ARTIFACT_FILE_EXTENSIONS, ALLOWED_ARTIFACT_EXTENSIONS } from './build-artifact.constants';
import type { PlatformName } from '../../../models/release/release.interface';
import type { UploadStage } from '../../../models/release/release-uploads.sequelize.model';

/**
 * Helper to execute an async operation with consistent error handling.
 * Wraps any error (except BuildArtifactError) into a BuildArtifactError with the specified code/message.
 *
 * @param operation - The async operation to execute
 * @param errorCode - Error code to use if operation fails
 * @param errorMessage - Error message to use if operation fails
 * @returns The result of the operation
 * @throws BuildArtifactError if the operation fails
 */
export const executeOperation = async <T>(
  operation: () => Promise<T>,
  errorCode: BuildArtifactErrorCode,
  errorMessage: string
): Promise<T> => {
  try {
    return await operation();
  } catch (err) {
    // If it's already a BuildArtifactError, rethrow as-is
    const isAlreadyBuildArtifactError = err instanceof BuildArtifactError;
    if (isAlreadyBuildArtifactError) {
      throw err;
    }
    // Wrap unknown errors
    throw new BuildArtifactError(errorCode, errorMessage);
  }
};

/**
 * Check if a filename represents an Android App Bundle (.aab) file.
 *
 * @param filename - The filename to check
 * @returns true if the file is an AAB file, false otherwise
 */
export const isAabFile = (filename: string): boolean => {
  const lowercaseFilename = filename.toLowerCase();
  return lowercaseFilename.endsWith(BUILD_ARTIFACT_FILE_EXTENSIONS.AAB);
};

/**
 * Check if filename has a valid artifact extension (.ipa, .apk, .aab).
 *
 * @param filename - The original filename to check
 * @returns true if extension is allowed, false otherwise
 */
export const isValidArtifactExtension = (filename: string): boolean => {
  const lowerFilename = filename.toLowerCase();
  return ALLOWED_ARTIFACT_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
};

/**
 * Get file extension from filename.
 *
 * @param filename - The original filename
 * @returns The file extension (lowercase with dot) or empty string if no extension
 */
export const getFileExtension = (filename: string): string => {
  const dotIndex = filename.lastIndexOf('.');
  const hasExtension = dotIndex > -1 && dotIndex < filename.length - 1;
  return hasExtension ? filename.slice(dotIndex).toLowerCase() : '';
};

/**
 * Validate file extension based on platform and stage.
 * 
 * Rules:
 * - iOS platform: must be .ipa
 * - Android platform + PRE_RELEASE stage: must be .aab
 * - Android platform + KICKOFF or REGRESSION stage: can be .aab or .apk
 * 
 * @param filename - The original filename to check
 * @param platform - The platform (ANDROID, IOS, WEB)
 * @param stage - The upload stage (KICKOFF, REGRESSION, PRE_RELEASE)
 * @returns Object with isValid flag and error message if invalid
 */
export const validateArtifactExtensionForPlatformAndStage = (
  filename: string,
  platform: PlatformName,
  stage: UploadStage
): { isValid: boolean; errorMessage?: string } => {
  const fileExtension = getFileExtension(filename);
  const lowerExtension = fileExtension.toLowerCase();
  
  const platformIsIOS = platform === 'IOS';
  const platformIsAndroid = platform === 'ANDROID';
  const stageIsPreRelease = stage === 'PRE_RELEASE';
  const stageIsKickoff = stage === 'KICKOFF';
  const stageIsRegression = stage === 'REGRESSION';
  const stageIsKickoffOrRegression = stageIsKickoff || stageIsRegression;
  
  const extensionIsIPA = lowerExtension === BUILD_ARTIFACT_FILE_EXTENSIONS.IPA;
  const extensionIsAAB = lowerExtension === BUILD_ARTIFACT_FILE_EXTENSIONS.AAB;
  const extensionIsAPK = lowerExtension === BUILD_ARTIFACT_FILE_EXTENSIONS.APK;
  
  // iOS platform: must be .ipa
  if (platformIsIOS) {
    const isValidForIOS = extensionIsIPA;
    if (!isValidForIOS) {
      return {
        isValid: false,
        errorMessage: `iOS platform requires .ipa file extension, but received ${fileExtension || 'no extension'}`
      };
    }
    return { isValid: true };
  }
  
  // Android platform + PRE_RELEASE stage: must be .aab
  if (platformIsAndroid && stageIsPreRelease) {
    const isValidForAndroidPreRelease = extensionIsAAB;
    if (!isValidForAndroidPreRelease) {
      return {
        isValid: false,
        errorMessage: `Android platform with PRE_RELEASE stage requires .aab file extension, but received ${fileExtension || 'no extension'}`
      };
    }
    return { isValid: true };
  }
  
  // Android platform + KICKOFF or REGRESSION stage: can be .aab or .apk
  if (platformIsAndroid && stageIsKickoffOrRegression) {
    const isValidForAndroidKickoffOrRegression = extensionIsAAB || extensionIsAPK;
    if (!isValidForAndroidKickoffOrRegression) {
      return {
        isValid: false,
        errorMessage: `Android platform with ${stage} stage requires .aab or .apk file extension, but received ${fileExtension || 'no extension'}`
      };
    }
    return { isValid: true };
  }
  
  // Default: use generic validation for other cases (e.g., WEB platform)
  const hasValidExtension = isValidArtifactExtension(filename);
  if (!hasValidExtension) {
    return {
      isValid: false,
      errorMessage: `Invalid file extension: ${fileExtension || 'no extension'}. Allowed: ${ALLOWED_ARTIFACT_EXTENSIONS.join(', ')}`
    };
  }
  
  return { isValid: true };
};

/**
 * Play Store internal track link base URL
 */
const PLAY_STORE_INTERNAL_TRACK_BASE_URL = 'https://play.google.com/apps/test';

/**
 * Generate Play Store internal track link.
 *
 * @param packageName - Android package name (e.g., "com.example.app")
 * @param versionCode - Build version code (e.g., "12345")
 * @returns Internal track link (e.g., "https://play.google.com/apps/test/com.example.app/12345")
 */
export const generateInternalTrackLink = (packageName: string, versionCode: string): string => {
  return `${PLAY_STORE_INTERNAL_TRACK_BASE_URL}/${packageName}/${versionCode}`;
};
