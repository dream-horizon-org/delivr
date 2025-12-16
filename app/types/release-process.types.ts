/**
 * Release Process Types
 * TypeScript interfaces and types for release process APIs
 */

import type {
  TaskStage,
  TaskType,
  TaskStatus,
  TaskConclusion,
  StageStatus,
  RegressionCycleStatus,
  BuildUploadStage,
  Platform,
  Phase,
} from './release-process-enums';

/**
 * Task Output Types - Union type for task-specific output structures
 * Each task type has its own output format (flat structure, no nested layers)
 */

// Fork Branch Task Output
export interface ForkBranchTaskOutput {
  branchName: string;
  branchUrl: string;
}

// Project Management Task Output (flattened - no projectManagement wrapper)
export interface ProjectManagementTaskOutput {
  platforms: Array<{
    platform: string;
    ticketUrl: string;
  }>;
}

// Test Management Task Output (flattened - no testManagement wrapper)
export interface TestManagementTaskOutput {
  platforms: Array<{
    platform: string;
    runId: string;
    runUrl: string;
  }>;
}

// RC Tag Task Output
export interface CreateRcTagTaskOutput {
  tagName: string;
  tagUrl: string;
}

// Release Notes Task Output (tagUrl only)
export interface ReleaseNotesTaskOutput {
  tagUrl: string;
}

// Release Tag Task Output
export interface CreateReleaseTagTaskOutput {
  tagName: string;
  tagUrl: string;
}

// Final Release Notes Task Output (tagUrl only)
export interface FinalReleaseNotesTaskOutput {
  tagUrl: string;
}

// Build Task Output (for CI/CD build tasks)
// jobUrl is available when task starts running (IN_PROGRESS, AWAITING_CALLBACK, etc.)
// Special case: Unlike other tasks, build tasks can have output even when IN_PROGRESS
// Supports multi-platform builds where each platform has its own CI/CD job URL
export interface BuildTaskOutput {
  platforms: Array<{
    platform: string;  // 'ANDROID' | 'IOS' | 'WEB'
    jobUrl: string;    // CI/CD job URL for this platform
  }>;
}

// Tasks with no output (or minimal output)
export type EmptyTaskOutput = null | { error?: string };

/**
 * Union type for all task outputs
 * Each task type maps to its specific output interface
 */
export type TaskOutput =
  | ForkBranchTaskOutput
  | ProjectManagementTaskOutput
  | TestManagementTaskOutput
  | CreateRcTagTaskOutput
  | ReleaseNotesTaskOutput
  | CreateReleaseTagTaskOutput
  | FinalReleaseNotesTaskOutput
  | BuildTaskOutput
  | EmptyTaskOutput;

/**
 * Task - Matches backend contract exactly
 * Note: Backend API contract uses `taskStage` and `status`, but our implementation uses `stage` and `taskStatus`
 * The mock server maps between these field names for compatibility
 * Task-specific output is stored in `output` field (replaces `externalData`)
 */
export interface Task {
  id: string;                              // Primary key (UUID)
  taskId: string;                          // Unique task identifier
  taskType: TaskType;
  stage: TaskStage;                        // Backend contract uses `taskStage`, mock server maps it
  taskStatus: TaskStatus;                  // Backend contract uses `status`, mock server maps it
  taskConclusion: TaskConclusion;
  accountId: string | null;
  regressionId: string | null;             // FK to regression cycle (if regression task)
  isReleaseKickOffTask: boolean;
  isRegressionSubTasks: boolean;
  identifier: string | null;
  externalId: string | null;               // External system ID (e.g., Jira ticket ID)
  output: TaskOutput | null;               // Task-specific output (union type based on taskType)
  builds: BuildInfo[];                     // Builds linked to this task (builds.taskId = task.id). Always present, empty array if no builds.
  branch?: string | null;                  // Branch name (optional, only for branch-related tasks)
  createdAt: string;                       // ISO 8601
  updatedAt: string;                       // ISO 8601
}


/**
 * BuildInfo - Matches backend contract exactly
 * Used for Kickoff, Regression, and Pre-Release build tasks
 * 
 * For Kickoff/Regression tasks:
 * - Contains artifactPath for download links
 * - Used to display build artifacts by platform
 * 
 * For Pre-Release tasks:
 * - iOS: Contains testflightNumber for TestFlight link
 * - Android: Contains internalTrackLink for Play Store Internal Track link
 */
export interface BuildInfo {
  // ============================================================================
  // MANDATORY: Available in BOTH builds and uploads
  // ============================================================================
  id: string;
  tenantId: string;
  releaseId: string;
  platform: Platform;
  buildStage: 'KICK_OFF' | 'REGRESSION' | 'PRE_RELEASE';
  artifactPath: string | null;
  internalTrackLink: string | null;     // Play Store Internal Track Link
  testflightNumber: string | null;      // TestFlight build number
  createdAt: string;                    // ISO 8601
  updatedAt: string;                    // ISO 8601

  // ============================================================================
  // OPTIONAL: Only in builds table (from CI/CD or consumed manual uploads)
  // ============================================================================
  buildType?: 'MANUAL' | 'CI_CD';
  buildUploadStatus?: 'PENDING' | 'UPLOADED' | 'FAILED';
  storeType?: 'APP_STORE' | 'PLAY_STORE' | 'TESTFLIGHT' | 'MICROSOFT_STORE' | 'FIREBASE' | 'WEB' | null;
  buildNumber?: string | null;
  artifactVersionName?: string | null;
  regressionId?: string | null;         // FK to regression cycle
  ciRunId?: string | null;
  queueLocation?: string | null;
  workflowStatus?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | null;
  ciRunType?: 'JENKINS' | 'GITHUB_ACTIONS' | 'CIRCLE_CI' | 'GITLAB_CI' | null;
  taskId?: string | null;               // Reference to release_tasks table

  // ============================================================================
  // OPTIONAL: Only in uploads table (unused manual uploads)
  // ============================================================================
  isUsed?: boolean;                     // Whether consumed by a task
  usedByTaskId?: string | null;         // FK to release_tasks.id if consumed
}

/**
 * Regression Slot - Matches backend contract
 */
export interface RegressionSlot {
  date: string;                            // ISO 8601
  config: Record<string, unknown>;
}

/**
 * Regression Cycle - Matches backend contract exactly
 */
export interface RegressionCycle {
  id: string;                           // Cycle UUID
  releaseId: string;
  isLatest: boolean;
  status: RegressionCycleStatus;
  cycleTag: string | null;              // e.g., "RC1", "RC2"
  createdAt: string;                    // ISO 8601 (also serves as slot time)
  completedAt: string | null;           // ISO 8601 (updatedAt when status = DONE)
}

/**
 * Approval Requirements - Matches backend contract
 */
export interface ApprovalRequirements {
  testManagementPassed: boolean;      // Test run threshold passed
  cherryPickStatusOk: boolean;        // No new cherry picks found
  cyclesCompleted: boolean;           // No active cycles AND no upcoming slots
}

/**
 * Approval Status - Matches backend contract exactly
 */
export interface ApprovalStatus {
  canApprove: boolean;                  // True if all requirements met
  approvalRequirements: ApprovalRequirements;
}

/**
 * Base Stage Response - Common fields for all stage APIs
 * Matches backend contract for KICKOFF and PRE_RELEASE
 */
export interface StageTasksResponse {
  success: true;
  stage: TaskStage;
  releaseId: string;
  tasks: Task[];
  stageStatus: StageStatus;
  uploadedBuilds: BuildInfo[];  // Staging builds not yet consumed by tasks
}

/**
 * Kickoff Stage Response - Matches backend contract
 */
export interface KickoffStageResponse extends StageTasksResponse {
  stage: TaskStage.KICKOFF;
}

/**
 * Regression Stage Response - Matches backend contract exactly
 * Includes additional regression-specific fields
 */
export interface RegressionStageResponse {
  success: true;
  stage: TaskStage.REGRESSION;
  releaseId: string;
  tasks: Task[];
  stageStatus: StageStatus;
  
  // Regression-specific fields
  cycles: RegressionCycle[];
  currentCycle: RegressionCycle | null;
  approvalStatus: ApprovalStatus;
  uploadedBuilds: BuildInfo[];  // Builds uploaded for upcoming slot (not yet consumed by cycle)
  upcomingSlot: RegressionSlot[] | null;
}

/**
 * Pre-Release Stage Response
 */
export interface PreReleaseStageResponse extends StageTasksResponse {
  stage: TaskStage.PRE_RELEASE;
}

/**
 * Retry Task Request
 */
export interface RetryTaskRequest {
  taskId: string;
}

/**
 * Retry Task Response - Matches backend contract
 */
export interface RetryTaskResponse {
  success: true;
  message: string;                      // "Task retry initiated. Cron will re-execute on next tick."
  data: {
    taskId: string;                     // Task UUID
    releaseId: string;                  // Release UUID (primary key)
    previousStatus: string;             // Previous task status (should be "FAILED")
    newStatus: string;                  // New task status (should be "PENDING")
  };
}

/**
 * Build Upload Request
 */
export interface BuildUploadRequest {
  file: File;
  platform: Platform;
  stage: BuildUploadStage;
}

/**
 * Build Upload Response - Matches API contract
 */
export interface BuildUploadResponse {
  success: boolean;
  data: {
    uploadId: string;
    platform: string;
    stage: string;
    downloadUrl: string;
    internalTrackLink: string | null;
    uploadedPlatforms: string[];
    missingPlatforms: string[];
    allPlatformsReady: boolean;
  };
}

/**
 * Build Artifact - From list artifacts API
 */
export interface BuildArtifact {
  id: string;
  artifactPath: string | null;
  downloadUrl: string | null;
  artifactVersionName: string;
  buildNumber: string | null;
  releaseId: string;
  platform: string;
  storeType: string | null;
  buildStage: string;
  buildType: string;
  buildUploadStatus: string;
  workflowStatus: string | null;
  regressionId: string | null;
  ciRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * List Build Artifacts Response
 */
export interface ListBuildArtifactsResponse {
  success: boolean;
  data: BuildArtifact[];
}

/**
 * Test Management Status Response - Single Platform
 * Matches backend contract when platform query param is provided
 */
export interface GetTestManagementStatusResponse {
  success: true;
  releaseId: string;
  testManagementConfigId: string;
  platform: string;
  target: string;
  version: string;
  hasTestRun: boolean;
  runId: string | null;                 // This is the testRunId
  status?: string;                      // 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PASSED' (PASSED is used by component)
  runLink?: string;
  total?: number;
  testResults?: {
    passed?: number;
    failed?: number;
    untested?: number;
    skipped?: number;
    blocked?: number;
    inProgress?: number;
    passPercentage?: number;
    threshold?: number;
    thresholdPassed?: boolean;
  };
  readyForApproval?: boolean;           // Extra: status === COMPLETED && thresholdPassed
  message: string;                      // Extra: Descriptive message
  error?: string;                       // Extra: Error message if fetch failed
}

/**
 * Test Management Status Result - Single platform result
 */
export type TestManagementStatusResult = {
  platform: string;
  target: string;
  version: string;
  hasTestRun: boolean;
  runId: string | null;
  status?: string;                      // 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PASSED'
  runLink?: string;
  total?: number;
  testResults?: {
    passed?: number;
    failed?: number;
    untested?: number;
    skipped?: number;
    blocked?: number;
    inProgress?: number;
    passPercentage?: number;
    threshold?: number;
    thresholdPassed?: boolean;
  };
  readyForApproval?: boolean;
  message: string;
  error?: string;
};

/**
 * Test Management Status Response - All Platforms
 * Matches backend contract when no platform query param
 */
export interface GetTestManagementStatusAllPlatformsResponse {
  success: true;
  releaseId: string;
  testManagementConfigId: string;
  platforms: TestManagementStatusResult[];
}

/**
 * Test Management Status Response - Union type
 */
export type TestManagementStatusResponse = 
  | GetTestManagementStatusResponse 
  | GetTestManagementStatusAllPlatformsResponse;

/**
 * Project Management Status Response - Single Platform
 * Matches backend contract when platform query param is provided
 */
export interface GetProjectManagementStatusResponse {
  success: true;
  releaseId: string;
  projectManagementConfigId: string;
  platform: string;
  target: string;
  version: string;
  hasTicket: boolean;
  ticketKey: string | null;
  currentStatus?: string;
  completedStatus?: string;
  isCompleted?: boolean;
  message: string;
  error?: string;
}

/**
 * Project Management Status Result - Single platform result
 */
export type ProjectManagementStatusResult = {
  platform: string;
  target: string;
  version: string;
  hasTicket: boolean;
  ticketKey: string | null;
  currentStatus?: string;
  completedStatus?: string;
  isCompleted?: boolean;
  message: string;
  error?: string;
};

/**
 * Project Management Status Response - All Platforms
 * Matches backend contract when no platform query param
 */
export interface GetProjectManagementStatusAllPlatformsResponse {
  success: true;
  releaseId: string;
  projectManagementConfigId: string;
  platforms: ProjectManagementStatusResult[];
}

/**
 * Project Management Status Response - Union type
 */
export type ProjectManagementStatusResponse = 
  | GetProjectManagementStatusResponse 
  | GetProjectManagementStatusAllPlatformsResponse;

/**
 * Cherry Pick Status Response - Matches backend contract exactly
 */
export interface CherryPickStatusResponse {
  success: true;
  releaseId: string;
  cherryPickAvailable: boolean;  // true = cherry picks exist, false = commits match
}

/**
 * Approve Regression Request - Matches backend contract
 */
export interface ApproveRegressionStageRequest {
  approvedBy: string;                   // Account ID of approver
  comments?: string;                    // Optional approval comments
  forceApprove?: boolean;               // Override requirements (not recommended)
}

/**
 * Approve Regression Response - Matches backend contract
 */
export interface ApproveRegressionStageResponse {
  success: true;
  message: string;
  releaseId: string;
  approvedAt: string;                   // ISO 8601
  approvedBy: string;
  nextStage: 'PRE_RELEASE';
}


/**
 * Complete Pre-Release Request
 */
export interface CompletePreReleaseRequest {
  notes?: string;
}

/**
 * Complete Pre-Release Response - Matches backend contract
 */
export interface CompletePreReleaseResponse {
  success: true;
  message: string;
  releaseId: string;
  completedAt: string;                  // ISO 8601
  nextStage: 'RELEASE_SUBMISSION';
}


/**
 * Post Slack Message Request
 */
export interface PostSlackMessageRequest {
  message: string;
  channel?: string;
}

/**
 * Post Slack Message Response
 */
export interface PostSlackMessageResponse {
  success: boolean;
  message: string;
  timestamp?: string;
}

/**
 * Activity Log - Matches backend contract
 */
export interface ActivityLog {
  id: string;
  releaseId: string;
  type: string;                          // Type of activity/change
  previousValue: Record<string, any> | null;  // Previous value before change
  newValue: Record<string, any> | null;       // New value after change
  updatedAt: string;
  updatedBy: string;                     // Account ID who made the change
}

/**
 * Activity Logs Response - Matches backend contract
 */
export interface ActivityLogsResponse {
  success: true;
  releaseId: string;
  activityLogs: ActivityLog[];
}


/**
 * Phase - Detailed release phase
 * Matches backend contract from API #1: Get Release Details
 * Re-exported from release-process-enums for backward compatibility
 */
export { Phase } from './release-process-enums';

/**
 * Platform Target Mapping - Matches backend contract
 */
export interface PlatformTargetMapping {
  id: string;
  releaseId: string;
  platform: Platform;
  target: 'PLAY_STORE' | 'APP_STORE' | 'WEB';
  version: string;                         // e.g., "v6.5.0"
  projectManagementRunId: string | null;   // Jira ticket ID
  testManagementRunId: string | null;      // Test run ID
  createdAt: string;
  updatedAt: string;
}

/**
 * Cron Job - Matches backend contract
 */
export interface CronJob {
  id: string;
  stage1Status: StageStatus;
  stage2Status: StageStatus;
  stage3Status: StageStatus;
  stage4Status: StageStatus;
  cronStatus: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  pauseType: 'NONE' | 'AWAITING_STAGE_TRIGGER' | 'USER_REQUESTED' | 'TASK_FAILURE';
  cronConfig: Record<string, unknown>;
  upcomingRegressions: RegressionSlot[] | null;
  cronCreatedAt: string;
  cronStoppedAt: string | null;
  cronCreatedByAccountId: string;
  autoTransitionToStage2: boolean;
  autoTransitionToStage3: boolean;
  stageData: Record<string, unknown> | null;
}

/**
 * Release Details - Matches backend contract from API #1
 */
export interface ReleaseDetails {
  // Primary identification
  id: string;                              // Primary key (UUID)
  releaseId: string;                       // User-facing release identifier (e.g., "REL-001")
  releaseConfigId: string | null;          // FK to release configuration
  tenantId: string;                        // Tenant UUID
  
  // Release metadata
  type: 'MAJOR' | 'MINOR' | 'HOTFIX';
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'COMPLETED' | 'ARCHIVED';
  currentActiveStage: 'PRE_KICKOFF' | 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE' | 'RELEASE_SUBMISSION' | 'RELEASE' | null;
  releasePhase: Phase;                     // Detailed phase
  
  // Branch information
  branch: string | null;                   // Release branch name (e.g., "release/v1.0.0")
  baseBranch: string | null;               // Base branch forked from (e.g., "master")
  baseReleaseId: string | null;            // Parent release ID (for hotfixes)
  
  // Dates (ISO 8601 format)
  kickOffReminderDate: string | null;
  kickOffDate: string | null;
  targetReleaseDate: string | null;
  releaseDate: string | null;              // Actual release date (populated when COMPLETED)
  
  // Platform targets
  platformTargetMappings: PlatformTargetMapping[];
  
  // Configuration
  hasManualBuildUpload: boolean;
  
  // Ownership
  createdByAccountId: string;
  releasePilotAccountId: string | null;
  releasePilot?: {
    id: string;
    email: string;
    name: string;
  } | null;
  lastUpdatedByAccountId: string;
  
  // Timestamps
  createdAt: string;                       // ISO 8601
  updatedAt: string;                       // ISO 8601
  
  // Related data
  cronJob?: CronJob;
  tasks?: Task[];
}

/**
 * Get Release Details Response - Matches backend contract
 */
export interface GetReleaseDetailsResponse {
  success: true;
  release: ReleaseDetails;
}

/**
 * Get All Builds Response - Matches backend contract from API #14
 */
export interface GetBuildsResponse {
  success: true;
  releaseId: string;
  builds: BuildInfo[];
  total: number;
}

/**
 * Notification Type - Values TBD based on notification_type DB enum
 */
export type NotificationType = string;

/**
 * Message Response - Raw response from MessagingService.sendMessage()
 */
export interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  // ... other provider-specific fields
}

/**
 * Release Notification - Matches backend contract
 */
export interface ReleaseNotification {
  id: number;
  tenantId: number;
  releaseId: number;
  notificationType: NotificationType;
  isSystemGenerated: boolean;
  createdByUserId: number | null;
  taskId: string | null;
  delivery: Record<string, MessageResponse>;  // Map<channelId, MessageResponse>
  createdAt: string;
}

/**
 * Notifications Response - Matches backend contract from API #20
 */
export interface NotificationsResponse {
  success: true;
  releaseId: string;
  notifications: ReleaseNotification[];
}

/**
 * Message Type Enum - Values based on notification_type DB enum
 * Supported manual message types for Slack notifications
 */
export type MessageTypeEnum = 
  | 'test-results-summary'
  | 'pre-kickoff-reminder';

/**
 * Notification Request - Matches backend contract from API #21
 */
export interface NotificationRequest {
  messageType: MessageTypeEnum;
}

/**
 * Send Notification Response - Matches backend contract from API #21
 */
export interface SendNotificationResponse {
  success: true;
  notification: ReleaseNotification;
}


