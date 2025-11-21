/**
 * Checkmate Metadata Validation Utilities
 */

export const validateProjectId = (projectId: unknown): string | null => {
  if (!projectId) {
    return 'projectId query parameter is required';
  }

  const projectIdString = String(projectId);
  const projectIdNumber = parseInt(projectIdString, 10);
  
  const isNotANumber = isNaN(projectIdNumber);
  if (isNotANumber) {
    return 'projectId must be a valid number';
  }

  const isNotPositive = projectIdNumber <= 0;
  if (isNotPositive) {
    return 'projectId must be a positive number';
  }

  return null;
};

