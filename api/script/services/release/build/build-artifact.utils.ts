import { BuildArtifactError, type BuildArtifactErrorCode } from './build-artifact.interface';
import { BUILD_ARTIFACT_FILE_EXTENSIONS } from './build-artifact.constants';

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
 * Version info extracted from an AAB file.
 */
export type AabVersionInfo = {
  versionCode: string;
  versionName: string | null;
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

/**
 * Extract version information (versionCode, versionName) from an AAB file buffer.
 *
 * AAB files are ZIP archives containing:
 * - base/manifest/AndroidManifest.xml (binary protobuf format)
 *
 * @param aabBuffer - The AAB file buffer
 * @returns Version info with versionCode and versionName
 *
 * TODO: Implement actual AAB parsing using:
 * - yauzl or adm-zip for ZIP extraction
 * - Protocol buffer parsing for AndroidManifest.xml
 * - Or bundletool CLI if available
 *
 * Expected implementation steps:
 * 1. Open AAB as ZIP archive
 * 2. Extract base/manifest/AndroidManifest.xml
 * 3. Parse protobuf to get versionCode and versionName
 */
export const extractVersionFromAab = async (aabBuffer: Buffer): Promise<AabVersionInfo> => {
  // TODO: Replace with actual AAB parsing implementation
  // For now, log the operation for debugging
  const bufferSizeBytes = aabBuffer.length;
  console.log(
    `[extractVersionFromAab] Placeholder: Would extract version from AAB (${bufferSizeBytes} bytes)`
  );

  // TODO: Remove placeholder and implement actual logic
  // This will throw an error until implemented
  throw new Error(
    'extractVersionFromAab is not implemented. ' +
    'Please implement AAB parsing to extract versionCode.'
  );

  // Expected return format after implementation:
  // return {
  //   versionCode: '12345',
  //   versionName: '1.2.3'
  // };
};

