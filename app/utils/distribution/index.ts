/**
 * Distribution Utilities
 * 
 * Pure utility functions for distribution management.
 * All functions are side-effect free and testable.
 */

// State derivation and display helpers
export {
  deriveActionAvailability,
  deriveApprovalState,
  deriveBuildState,
  formatDate,
  formatDateTime,
  getReleaseStatusColor,
  getRolloutDisplayStatus,
  getRolloutStatusColor,
  getRolloutStatusLabel,
} from './distribution.utils';

// Form validation
export {
  isAndroidPromoteFormValid,
  isIOSPromoteFormValid,
  validateInAppUpdatePriority,
  validateReason,
  validateReleaseNotes,
  validateRolloutPercentage,
} from './distribution.validation';

// Fetcher utilities
export {
  isFetcherIdleAndSuccessful,
  isFetcherSubmitting,
  parseFetcherResponse,
} from './distribution.fetcher';
export type { FetcherResponse, ParsedFetcherState } from './distribution.fetcher';

// UI utilities
export { getDropZoneClassName } from './getDropZoneClassName';

// Distribution UI helpers
export * from './distribution-ui.utils';

// Distribution icons
export * from './distribution-icons.utils';
