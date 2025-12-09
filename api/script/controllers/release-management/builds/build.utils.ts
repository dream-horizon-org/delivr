import { getTrimmedString } from '~utils/request.utils';
import {
  BUILD_PLATFORMS,
  BUILD_STAGES,
  STORE_TYPES,
  BUILD_TYPES,
  WORKFLOW_STATUSES,
  BUILD_UPLOAD_STATUSES,
  type BuildPlatform,
  type BuildStage,
  type StoreType,
  type BuildType,
  type WorkflowStatus,
  type BuildUploadStatus
} from './build.constants';

/**
 * Parse and validate platform from string
 * Returns null if value is empty or invalid
 */
export const parsePlatform = (value: unknown): BuildPlatform | null => {
  const trimmed = getTrimmedString(value);
  if (!trimmed) return null;

  const normalized = trimmed.toUpperCase();
  const isValid = BUILD_PLATFORMS.includes(normalized as BuildPlatform);
  return isValid ? (normalized as BuildPlatform) : null;
};

/**
 * Parse and validate build stage from string
 * Returns null if value is empty or invalid
 */
export const parseBuildStage = (value: unknown): BuildStage | null => {
  const trimmed = getTrimmedString(value);
  if (!trimmed) return null;

  const normalized = trimmed.toUpperCase();
  const isValid = BUILD_STAGES.includes(normalized as BuildStage);
  return isValid ? (normalized as BuildStage) : null;
};

/**
 * Parse and validate store type from string
 * Returns null if value is empty or invalid
 */
export const parseStoreType = (value: unknown): StoreType | null => {
  const trimmed = getTrimmedString(value);
  if (!trimmed) return null;

  const normalized = trimmed.toUpperCase();
  const isValid = STORE_TYPES.includes(normalized as StoreType);
  return isValid ? (normalized as StoreType) : null;
};

/**
 * Parse and validate build type from string
 * Returns null if value is empty or invalid
 */
export const parseBuildType = (value: unknown): BuildType | null => {
  const trimmed = getTrimmedString(value);
  if (!trimmed) return null;

  const normalized = trimmed.toUpperCase();
  const isValid = BUILD_TYPES.includes(normalized as BuildType);
  return isValid ? (normalized as BuildType) : null;
};

/**
 * Parse and validate workflow status from string
 * Returns null if value is empty or invalid
 */
export const parseWorkflowStatus = (value: unknown): WorkflowStatus | null => {
  const trimmed = getTrimmedString(value);
  if (!trimmed) return null;

  const normalized = trimmed.toUpperCase();
  const isValid = WORKFLOW_STATUSES.includes(normalized as WorkflowStatus);
  return isValid ? (normalized as WorkflowStatus) : null;
};

/**
 * Parse and validate build upload status from string
 * Returns null if value is empty or invalid
 */
export const parseBuildUploadStatus = (value: unknown): BuildUploadStatus | null => {
  const trimmed = getTrimmedString(value);
  if (!trimmed) return null;

  const normalized = trimmed.toUpperCase();
  const isValid = BUILD_UPLOAD_STATUSES.includes(normalized as BuildUploadStatus);
  return isValid ? (normalized as BuildUploadStatus) : null;
};

