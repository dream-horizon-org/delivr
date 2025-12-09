import { BuildArtifactError, type BuildArtifactErrorCode } from './build-artifact.interface';

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

