/**
 * Release Version Service Constants
 * Error messages for version validation
 */

export const RELEASE_VERSION_ERROR_MESSAGES = {
  INVALID_VERSION_FORMAT: 'Invalid version format. Expected semantic version (e.g., 1.0.0)',
  VERSION_TOO_LOW_MAJOR: 'Version must be a new major version (e.g., X.0.0)',
  VERSION_TOO_LOW_MINOR: 'Version must be a new minor version (e.g., X.Y.0)',
  VERSION_TOO_LOW_HOTFIX: 'Version must be a new patch version (e.g., X.Y.Z)',
  VERSION_EXCEEDS_MINOR_BOUND: 'Minor release version cannot exceed next major version',
  VERSION_EXCEEDS_HOTFIX_BOUND: 'Hotfix release version cannot exceed next minor version',
  LATEST_VERSION_FETCH_FAILED: 'Failed to fetch latest version for platform target'
} as const;

export const RELEASE_TYPE = {
  MAJOR: 'MAJOR',
  MINOR: 'MINOR',
  HOTFIX: 'HOTFIX'
} as const;

