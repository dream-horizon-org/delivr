// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Sequelize Models for Release Management
 * Migrated from OG Delivr Prisma schema with tenant-centric modifications
 * 
 * PERMISSION MODEL:
 * Releases are children of Tenants (like Apps). Permissions are tenant-based:
 * - Owner (tenant creator)   → Full access to releases (create, edit, delete, assign pilot)
 * - Editor                   → Can create/edit releases, manage builds, cherry-picks
 * - Viewer                   → Read-only access to releases
 * - Release Pilot            → Special role, can edit release status, approve builds
 * 
 * MAPPING FROM OG DELIVR:
 * - OG ADMIN  → New Owner
 * - OG WRITE  → New Editor  
 * - OG READ   → New Viewer
 */

import { Sequelize, DataTypes, Model } from "sequelize";

// ============================================================================
// ENUMS
// ============================================================================

// Note: User permissions are handled by tenant-level roles (Owner/Editor/Viewer)
// defined in the existing tenant permission system. No separate UserRoles needed.

export enum PlatformName {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB'
}

export enum TargetName {
  WEB = 'WEB',
  PLAY_STORE = 'PLAY_STORE',
  APP_STORE = 'APP_STORE'
}

export enum ReleaseType {
  HOTFIX = 'HOTFIX',
  PLANNED = 'PLANNED',
  MAJOR = 'MAJOR'
}

export enum UpdateType {
  OPTIONAL = 'OPTIONAL',
  FORCE = 'FORCE'
}

export enum ReleaseStatus {
  PENDING = 'PENDING',
  STARTED = 'STARTED',
  REGRESSION_IN_PROGRESS = 'REGRESSION_IN_PROGRESS',
  BUILD_SUBMITTED = 'BUILD_SUBMITTED',
  RELEASED = 'RELEASED',
  ARCHIVED = 'ARCHIVED'
}

export enum StateChangeType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  REMOVE = 'REMOVE',
  ADD = 'ADD'
}

export enum WorkFlowStatus {
  TRIGGERED = 'triggered',
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  WAITING = 'waiting',
  REQUESTED = 'requested'
}

export enum ReleaseTaskConclusion {
  SUCCESS = 'success',
  FAILURE = 'failure',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped'
}

export enum RegressionCycleStatus {
  NOT_STARTED = 'NOT_STARTED',
  STARTED = 'STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export enum CherryPickApprovalStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum CherryPickStatus {
  PENDING = 'PENDING',
  PICKED = 'PICKED',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE'
}

export enum TaskType {
  // Stage 1: Kickoff (5 tasks)
  PRE_KICK_OFF_REMINDER = 'PRE_KICK_OFF_REMINDER',
  FORK_BRANCH = 'FORK_BRANCH',
  CREATE_PROJECT_MANAGEMENT_TICKET = 'CREATE_PROJECT_MANAGEMENT_TICKET',
  CREATE_TEST_SUITE = 'CREATE_TEST_SUITE',
  TRIGGER_PRE_REGRESSION_BUILDS = 'TRIGGER_PRE_REGRESSION_BUILDS',
  // Stage 2: Regression Testing (7 tasks)
  RESET_TEST_SUITE = 'RESET_TEST_SUITE',
  CREATE_RC_TAG = 'CREATE_RC_TAG',
  CREATE_RELEASE_NOTES = 'CREATE_RELEASE_NOTES',
  TRIGGER_REGRESSION_BUILDS = 'TRIGGER_REGRESSION_BUILDS',
  TRIGGER_AUTOMATION_RUNS = 'TRIGGER_AUTOMATION_RUNS',
  AUTOMATION_RUNS = 'AUTOMATION_RUNS',
  SEND_REGRESSION_BUILD_MESSAGE = 'SEND_REGRESSION_BUILD_MESSAGE',
  // Stage 3: Post-Regression (6 tasks)
  PRE_RELEASE_CHERRY_PICKS_REMINDER = 'PRE_RELEASE_CHERRY_PICKS_REMINDER',
  CREATE_RELEASE_TAG = 'CREATE_RELEASE_TAG',
  CREATE_FINAL_RELEASE_NOTES = 'CREATE_FINAL_RELEASE_NOTES', // Stage 3 final release notes (renamed from CREATE_GITHUB_RELEASE)
  // Note: CREATE_RELEASE_NOTES is used in Stage 2 (regression cycles) only
  TRIGGER_TEST_FLIGHT_BUILD = 'TRIGGER_TEST_FLIGHT_BUILD',
  SEND_POST_REGRESSION_MESSAGE = 'SEND_POST_REGRESSION_MESSAGE',
  CHECK_PROJECT_RELEASE_APPROVAL = 'CHECK_PROJECT_RELEASE_APPROVAL', // Renamed from ADD_L6_APPROVAL_CHECK
  // Manual API (1 task)
  SUBMIT_TO_TARGET = 'SUBMIT_TO_TARGET'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum TaskIdentifier {
  PRE_REGRESSION = 'PRE_REGRESSION_',
  REGRESSION = 'REGRESSION_',
  REGRESSION_SUB = 'REGRESSION_SUB_',
  PRE_RELEASE = 'PRE_RELEASE_'
}

export enum CherryPickFailureType {
  NOT_APPROVED = 'NOT_APPROVED',
  CONFLICTS = 'CONFLICTS',
  SERVER_ERROR = 'SERVER_ERROR'
}

export enum CronStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export enum StageStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum TaskStage {
  KICKOFF = 'KICKOFF',
  REGRESSION = 'REGRESSION',
  POST_REGRESSION = 'POST_REGRESSION'
}

// ============================================================================
// MODEL CREATORS
// ============================================================================

/**
 * TenantIntegrations Model - Stores tenant-level integration configurations
 * Replaces hardcoded environment variables from OG Delivr
 */
export function createTenantIntegrationsModel(sequelize: Sequelize) {
  return sequelize.define('tenantIntegrations', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id'
      }
    },
    integrationType: {
      type: DataTypes.ENUM(
        'GITHUB', 'GITLAB', 'BITBUCKET',
        'JENKINS', 'GITHUB_ACTIONS',
        'SLACK', 'TEAMS',
        'JIRA', 'LINEAR',
        'APP_STORE_CONNECT', 'PLAY_STORE',
        'CODE_SIGNING', 'FIREBASE', 'TEST_RAIL'
      ),
      allowNull: false
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    config: {
      type: DataTypes.JSON,
      allowNull: false
    },
    configuredByAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'accounts',
        key: 'id'
      }
    },
    lastVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    verificationStatus: {
      type: DataTypes.ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED'),
      defaultValue: 'NOT_VERIFIED'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'tenant_integrations',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['integrationType'] },
      { fields: ['tenantId', 'isEnabled'] },
      { fields: ['tenantId', 'integrationType'], unique: true }
    ]
  });
}

/**
 * Platform Model (Reference table - shared across tenants)
 */
export function createPlatformModel(sequelize: Sequelize) {
  return sequelize.define('platform', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    name: {
      type: DataTypes.ENUM(...Object.values(PlatformName)),
      unique: true,
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'platforms',
    timestamps: true
  });
}

/**
 * Target Model (Reference table - shared across tenants)
 */
export function createTargetModel(sequelize: Sequelize) {
  return sequelize.define('target', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    name: {
      type: DataTypes.ENUM(...Object.values(TargetName)),
      unique: true,
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'targets',
    timestamps: true
  });
}

/**
 * Release Platforms Targets Mapping (Consolidated)
 * Links releases to platform-target combinations with version and integration run IDs
 * Replaces the old releaseToPlatforms and releaseToTargets junction tables
 */
export function createReleasePlatformTargetMappingModel(sequelize: Sequelize) {
  return sequelize.define('releasePlatformTargetMapping', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    releaseId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'releases',
        key: 'id'
      }
    },
    platform: {
      type: DataTypes.ENUM(...Object.values(PlatformName)),
      allowNull: false
    },
    target: {
      type: DataTypes.ENUM(...Object.values(TargetName)),
      allowNull: false
    },
    version: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Version for this platform-target combination (e.g., v6.5.0)'
    },
    projectManagementRunId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Project management run ID (e.g., Jira epic ID for this platform-target)'
    },
    testManagementRunId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Test management run ID (e.g., test suite run ID for this platform-target)'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'release_platforms_targets_mapping',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['releaseId', 'platform', 'target']
      },
      {
        fields: ['projectManagementRunId']
      },
      {
        fields: ['testManagementRunId']
      }
    ]
  });
}

/**
 * Release Model (Core table - tenant-linked)
 */
export function createReleaseModel(sequelize: Sequelize) {
  return sequelize.define('release', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    releaseKey: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
      field: 'releaseKey' // Explicitly use camelCase in DB
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    kickOffReminderDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    plannedDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    releaseDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    targetReleaseDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    isDelayed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    delayedReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM(...Object.values(ReleaseType)),
      defaultValue: ReleaseType.PLANNED
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ReleaseStatus)),
      defaultValue: ReleaseStatus.PENDING
    },
    baseVersion: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    baseBranch: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    branchRelease: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    branchCodepush: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    updateType: {
      type: DataTypes.ENUM(...Object.values(UpdateType)),
      defaultValue: UpdateType.OPTIONAL
    },
    createdByAccountId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'createdByAccountId',
      references: {
        model: 'accounts',
        key: 'id'
      }
    },
    parentId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'releases',
        key: 'id'
      }
    },
    releasePilotAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'releasePilotAccountId',
      references: {
        model: 'accounts',
        key: 'id'
      }
    },
    lastUpdateByAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'lastUpdateByAccountId',
      references: {
        model: 'accounts',
        key: 'id'
      }
    },
    iOSTestRunId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    webTestRunId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    playStoreRunId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    webEpicId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    playStoreEpicId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    iOSEpicId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    releaseTag: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    slackMessageTimestamps: {
      type: DataTypes.JSON,
      allowNull: true
    },
    iOSUserAdoption: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    playstoreUserAdoption: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    webUserAdoption: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    webFinalBuildNumber: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    PSFinalBuildNumber: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    IOSFinalBuildNumber: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    // Configuration reference (links to integration configs)
    releaseConfigId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'FK to release_configs table (links to integration configuration)'
    },
    // Orchestration-specific columns (NEW)
    // Note: Using camelCase in DB to match remote's convention
    stageData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Stores integration responses per stage (JSON object)'
    },
    customIntegrationConfigs: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Per-release integration config overrides (JSON object)'
    },
    preCreatedBuilds: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of pre-created builds: [{"platform": "IOS", "target": "APP_STORE", "buildNumber": "...", "buildUrl": "..."}]'
    },
    hasManualBuildUpload: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether manual build upload is enabled for this release'
    }
  }, {
    tableName: 'releases',
    underscored: false, // Keep camelCase field names (DB has camelCase columns)
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['tenantId', 'createdAt'] },
      { fields: ['tenantId', 'status', 'plannedDate'] },
      { fields: ['releasePilotAccountId', 'status'] },
      { fields: ['releaseKey'], unique: true },
      { fields: ['lastUpdateByAccountId'] },
      { fields: ['parentId'] },
      { fields: ['releaseConfigId'] }
    ]
  });
}

/**
 * ReleaseBuilds Model - Container for final builds
 */
export function createReleaseBuildsModel(sequelize: Sequelize) {
  return sequelize.define('releaseBuilds', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    releaseId: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: true,
      references: {
        model: 'releases',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'release_builds',
    timestamps: true
  });
}

/**
 * Build Model - Individual builds (iOS, Android, Web)
 */
export function createBuildModel(sequelize: Sequelize) {
  return sequelize.define('build', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    number: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    link: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    releaseId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'releases',
        key: 'id'
      }
    },
    platformId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'platforms',
        key: 'id'
      }
    },
    targetId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'targets',
        key: 'id'
      }
    },
    regressionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'regression_cycles',
        key: 'id'
      }
    },
    releaseBuildsId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'release_builds',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'builds',
    timestamps: true,
    indexes: [
      { fields: ['releaseId'] },
      { fields: ['platformId'] },
      { fields: ['targetId'] },
      { fields: ['regressionId'] },
      { fields: ['releaseBuildsId'] },
      { 
        fields: ['regressionId', 'platformId'], 
        unique: true,
        name: 'idx_builds_regression_platform'
      }
    ]
  });
}

/**
 * ReleaseTasks Model - Kick-off, pre-release, and regression tasks
 */
export function createReleaseTasksModel(sequelize: Sequelize) {
  return sequelize.define('releaseTasks', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    taskId: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: true
    },
    branch: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    isReleaseKickOffTask: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isRegressionSubTasks: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    identifier: {
      type: DataTypes.ENUM(...Object.values(TaskIdentifier)),
      allowNull: true
    },
    taskType: {
      type: DataTypes.ENUM(...Object.values(TaskType)),
      allowNull: true
    },
    taskStatus: {
      type: DataTypes.ENUM(...Object.values(TaskStatus)),
      defaultValue: TaskStatus.PENDING
    },
    taskConclusion: {
      type: DataTypes.ENUM(...Object.values(ReleaseTaskConclusion)),
      allowNull: true
    },
    accountId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'accounts',
        key: 'id'
      }
    },
    regressionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'regression_cycles',
        key: 'id'
      }
    },
    releaseId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'releases',
        key: 'id'
      }
    },
    // Orchestration-specific columns (NEW)
    stage: {
      type: DataTypes.ENUM(...Object.values(TaskStage)),
      allowNull: true,
      comment: 'Which stage this task belongs to (no RELEASE stage - submission is manual API)'
    },
    // Note: Using camelCase in DB to match remote's convention
    externalId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'ID returned by integration (e.g., JIRA ticket ID, build ID, suite ID)'
    },
    externalData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional data from integration response (e.g., build URL, ticket details, suite status)'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'release_tasks',
    timestamps: true,
    indexes: [
      { fields: ['releaseId'] },
      { fields: ['regressionId'] },
      { fields: ['accountId'] },
      { fields: ['taskId'], unique: true },
      { fields: ['stage'] },
      { fields: ['externalId'] }
    ]
  });
}

/**
 * RegressionCycle Model - Regression test cycles
 */
export function createRegressionCycleModel(sequelize: Sequelize) {
  return sequelize.define('regressionCycle', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    isLatest: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    releaseId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'releases',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM(...Object.values(RegressionCycleStatus)),
      defaultValue: RegressionCycleStatus.NOT_STARTED
    },
    cycleTag: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'regression_cycles',
    timestamps: true,
    indexes: [
      { fields: ['releaseId'] }
    ]
  });
}

/**
 * Rollout Model - Release rollout tracking
 */
export function createRolloutModel(sequelize: Sequelize) {
  return sequelize.define('rollout', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    releaseId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'releases',
        key: 'id'
      }
    },
    platformId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'platforms',
        key: 'id'
      }
    },
    targetId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'targets',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'rollouts',
    timestamps: true,
    indexes: [
      { fields: ['releaseId'] },
      { fields: ['platformId'] },
      { fields: ['targetId'] }
    ]
  });
}

/**
 * RolloutStats Model - Rollout statistics
 */
export function createRolloutStatsModel(sequelize: Sequelize) {
  return sequelize.define('rolloutStats', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    stats: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    rolloutId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'rollouts',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'rollout_stats',
    timestamps: true,
    indexes: [
      { fields: ['rolloutId'] }
    ]
  });
}

/**
 * RolloutUserAdoption Model - User adoption metrics
 */
export function createRolloutUserAdoptionModel(sequelize: Sequelize) {
  return sequelize.define('rolloutUserAdoption', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    userAdoption: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    userAdoptionPercentage: {
      type: DataTypes.STRING(255),
      defaultValue: '0.0'
    },
    rolloutId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'rollouts',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'rollout_user_adoption',
    timestamps: true,
    indexes: [
      { fields: ['rolloutId'] }
    ]
  });
}

/**
 * CherryPicks Model - Cherry-pick PR requests
 */
export function createCherryPicksModel(sequelize: Sequelize) {
  return sequelize.define('cherryPicks', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    commitId: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: true
    },
    isApprovalRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    prLink: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    authorAccountId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'accounts',
        key: 'id'
      }
    },
    jiraLink: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    approverAccountId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'accounts',
        key: 'id'
      }
    },
    approvalStatus: {
      type: DataTypes.ENUM(...Object.values(CherryPickApprovalStatus)),
      defaultValue: CherryPickApprovalStatus.REQUESTED
    },
    status: {
      type: DataTypes.ENUM(...Object.values(CherryPickStatus)),
      defaultValue: CherryPickStatus.PENDING
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    releaseId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'releases',
        key: 'id'
      }
    },
    failureStatus: {
      type: DataTypes.ENUM(...Object.values(CherryPickFailureType)),
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'cherry_picks',
    timestamps: true,
    indexes: [
      { fields: ['releaseId'] },
      { fields: ['authorAccountId'] },
      { fields: ['approverAccountId'] },
      { fields: ['commitId'], unique: true }
    ]
  });
}

/**
 * StateHistory Model - Audit trail for all changes
 */
export function createStateHistoryModel(sequelize: Sequelize) {
  return sequelize.define('stateHistory', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    action: {
      type: DataTypes.ENUM(...Object.values(StateChangeType)),
      defaultValue: StateChangeType.CREATE
    },
    accountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'accounts',
        key: 'id'
      }
    },
    releaseId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'releases',
        key: 'id'
      }
    },
    codepushId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    settingsId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'state_history',
    timestamps: true,
    indexes: [
      { fields: ['releaseId'] },
      { fields: ['accountId'] },
      { fields: ['id', 'releaseId', 'codepushId', 'settingsId'] }
    ]
  });
}

/**
 * StateHistoryItem Model - Individual change items in history
 */
export function createStateHistoryItemModel(sequelize: Sequelize) {
  return sequelize.define('stateHistoryItem', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    group: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'group' // Explicitly map to database column (group is reserved word in MySQL)
    },
    type: {
      type: DataTypes.ENUM(...Object.values(StateChangeType)),
      defaultValue: StateChangeType.CREATE
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    oldValue: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    key: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    historyId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'state_history',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'state_history_items',
    underscored: false, // Keep camelCase field names
    timestamps: true,
    indexes: [
      { fields: ['historyId'] },
      { fields: ['id', 'historyId'] }
    ]
  });
}

/**
 * CronJob Model - Autopilot automation
 */
export function createCronJobModel(sequelize: Sequelize) {
  return sequelize.define('cronJob', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    releaseId: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
      references: {
        model: 'releases',
        key: 'id'
      }
    },
    stage1Status: {
      type: DataTypes.ENUM(...Object.values(StageStatus)),
      defaultValue: StageStatus.PENDING
    },
    stage2Status: {
      type: DataTypes.ENUM(...Object.values(StageStatus)),
      defaultValue: StageStatus.PENDING
    },
    stage3Status: {
      type: DataTypes.ENUM(...Object.values(StageStatus)),
      defaultValue: StageStatus.PENDING
    },
    cronStatus: {
      type: DataTypes.ENUM(...Object.values(CronStatus)),
      defaultValue: CronStatus.PENDING
    },
    cronCreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    cronStoppedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cronCreatedByAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'accounts',
        key: 'id'
      }
    },
    regressionTimings: {
      type: DataTypes.STRING(255),
      defaultValue: '09:00,17:00'
    },
    upcomingRegressions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    cronConfig: {
      type: DataTypes.JSON,
      allowNull: false
    },
    regressionTimestamp: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    // Locking columns (NEW - for horizontal scaling)
    // Note: Using snake_case field mapping for compatibility
    lockedBy: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'locked_by',
      comment: 'Instance ID holding the lock (for horizontal scaling)'
    },
    lockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'locked_at',
      comment: 'When lock was acquired'
    },
    // lockExpiry removed - not in database schema, lockTimeout is used instead
    lockTimeout: {
      type: DataTypes.INTEGER,
      defaultValue: 300,
      field: 'lock_timeout',
      comment: 'Lock timeout in seconds (default 300 = 5 minutes)'
    },
    autoTransitionToStage3: {
      type: DataTypes.BOOLEAN,
      allowNull: true, // Allow null until migration is run
      defaultValue: false,
      comment: 'Controls automatic Stage 2 → Stage 3 transition (default: false, must be manually triggered)'
    }
  }, {
    tableName: 'cron_jobs',
    timestamps: false,
    indexes: [
      { fields: ['releaseId'], unique: true },
      { fields: ['cronCreatedByAccountId'] },
      { fields: ['lockedBy', 'lockedAt'] }
    ]
  });
}

/**
 * CronChangeLogs Model - Cron job change history
 */
export function createCronChangeLogsModel(sequelize: Sequelize) {
  return sequelize.define('cronChangeLogs', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    releaseId: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    previousValue: {
      type: DataTypes.JSON,
      allowNull: true
    },
    newValue: {
      type: DataTypes.JSON,
      allowNull: true
    },
    updatedByAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'accounts',
        key: 'id'
      }
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'cron_change_logs',
    timestamps: false
  });
}

/**
 * WhatsNew Model - Release notes/announcements
 */
export function createWhatsNewModel(sequelize: Sequelize) {
  return sequelize.define('whatsNew', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    releaseId: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    target: {
      type: DataTypes.ENUM(...Object.values(TargetName)),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    body: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    CTA: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'whats_new',
    timestamps: false
  });
}

/**
 * Settings Model - Global release settings
 */
export function createSettingsModel(sequelize: Sequelize) {
  return sequelize.define('settings', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    releaseOffset: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    tableName: 'release_settings',
    timestamps: false
  });
}

/**
 * GlobalSettings Model - Global configuration
 */
export function createGlobalSettingsModel(sequelize: Sequelize) {
  return sequelize.define('globalSettings', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    config: {
      type: DataTypes.JSON,
      allowNull: true
    },
    updatedByAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'accounts',
        key: 'id'
      }
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'global_settings',
    timestamps: false
  });
}

// ============================================================================
// MODEL SETUP AND ASSOCIATIONS
// ============================================================================

/**
 * Create all Release Management models and set up associations
 */
export function createReleaseModels(sequelize: Sequelize) {
  const models = {
    // TenantIntegrations removed - each integration has its own table
    Platform: createPlatformModel(sequelize),
    Target: createTargetModel(sequelize),
    ReleasePlatformTargetMapping: createReleasePlatformTargetMappingModel(sequelize),
    Release: createReleaseModel(sequelize),
    ReleaseBuilds: createReleaseBuildsModel(sequelize),
    Build: createBuildModel(sequelize),
    ReleaseTasks: createReleaseTasksModel(sequelize),
    RegressionCycle: createRegressionCycleModel(sequelize),
    Rollout: createRolloutModel(sequelize),
    RolloutStats: createRolloutStatsModel(sequelize),
    RolloutUserAdoption: createRolloutUserAdoptionModel(sequelize),
    CherryPicks: createCherryPicksModel(sequelize),
    StateHistory: createStateHistoryModel(sequelize),
    StateHistoryItem: createStateHistoryItemModel(sequelize),
    CronJob: createCronJobModel(sequelize),
    CronChangeLogs: createCronChangeLogsModel(sequelize),
    WhatsNew: createWhatsNewModel(sequelize),
    Settings: createSettingsModel(sequelize),
    GlobalSettings: createGlobalSettingsModel(sequelize)
  };

  // Set up associations
  
  // Note: TenantIntegrations removed - each integration has its own table
  
  // Release associations
  // Note: Model names in sequelize.models are lowercase (e.g., 'tenant', 'account')
  if (sequelize.models.tenant) {
    models.Release.belongsTo(sequelize.models.tenant, { foreignKey: 'tenantId', as: 'tenant' });
  }
  if (sequelize.models.account) {
    models.Release.belongsTo(sequelize.models.account, { foreignKey: 'createdByAccountId', as: 'creator' });
    models.Release.belongsTo(sequelize.models.account, { foreignKey: 'releasePilotAccountId', as: 'releasePilot' });
    models.Release.belongsTo(sequelize.models.account, { foreignKey: 'lastUpdateByAccountId', as: 'lastUpdater' });
  }
  models.Release.belongsTo(models.Release, { foreignKey: 'parentId', as: 'parent' });
  models.Release.hasMany(models.Release, { foreignKey: 'parentId', as: 'hotfixes' });
  
  // Release ↔ ReleasePlatformTargetMapping (one-to-many)
  models.Release.hasMany(models.ReleasePlatformTargetMapping, {
    foreignKey: 'releaseId',
    as: 'platformTargetMappings'
  });
  models.ReleasePlatformTargetMapping.belongsTo(models.Release, {
    foreignKey: 'releaseId',
    as: 'release'
  });
  
  // ReleaseBuilds associations
  models.ReleaseBuilds.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  models.ReleaseBuilds.hasMany(models.Build, { foreignKey: 'releaseBuildsId', as: 'builds' });
  
  // Build associations
  models.Build.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  models.Build.belongsTo(models.Platform, { foreignKey: 'platformId', as: 'platform' });
  models.Build.belongsTo(models.Target, { foreignKey: 'targetId', as: 'target' });
  models.Build.belongsTo(models.RegressionCycle, { foreignKey: 'regressionId', as: 'regressionCycle' });
  models.Build.belongsTo(models.ReleaseBuilds, { foreignKey: 'releaseBuildsId', as: 'releaseBuilds' });
  
  // ReleaseTasks associations
  models.ReleaseTasks.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  models.ReleaseTasks.belongsTo(models.RegressionCycle, { foreignKey: 'regressionId', as: 'regressionCycle' });
  if (sequelize.models.account) {
    models.ReleaseTasks.belongsTo(sequelize.models.account, { foreignKey: 'accountId', as: 'account' });
  }
  
  // RegressionCycle associations
  models.RegressionCycle.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  models.RegressionCycle.hasMany(models.Build, { foreignKey: 'regressionId', as: 'builds' });
  models.RegressionCycle.hasMany(models.ReleaseTasks, { foreignKey: 'regressionId', as: 'tasks' });
  
  // Rollout associations
  models.Rollout.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  models.Rollout.belongsTo(models.Platform, { foreignKey: 'platformId', as: 'platform' });
  models.Rollout.belongsTo(models.Target, { foreignKey: 'targetId', as: 'target' });
  models.Rollout.hasMany(models.RolloutStats, { foreignKey: 'rolloutId', as: 'stats' });
  models.Rollout.hasMany(models.RolloutUserAdoption, { foreignKey: 'rolloutId', as: 'userAdoption' });
  
  // RolloutStats associations
  models.RolloutStats.belongsTo(models.Rollout, { foreignKey: 'rolloutId', as: 'rollout' });
  
  // RolloutUserAdoption associations
  models.RolloutUserAdoption.belongsTo(models.Rollout, { foreignKey: 'rolloutId', as: 'rollout' });
  
  // CherryPicks associations
  models.CherryPicks.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  if (sequelize.models.account) {
    models.CherryPicks.belongsTo(sequelize.models.account, { foreignKey: 'authorAccountId', as: 'author' });
    models.CherryPicks.belongsTo(sequelize.models.account, { foreignKey: 'approverAccountId', as: 'approver' });
  }
  
  // StateHistory associations
  models.StateHistory.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  if (sequelize.models.account) {
    models.StateHistory.belongsTo(sequelize.models.account, { foreignKey: 'accountId', as: 'account' });
  }
  models.StateHistory.hasMany(models.StateHistoryItem, { foreignKey: 'historyId', as: 'changes' });
  
  // StateHistoryItem associations
  models.StateHistoryItem.belongsTo(models.StateHistory, { foreignKey: 'historyId', as: 'history' });
  
  // CronJob associations
  models.CronJob.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  if (sequelize.models.account) {
    models.CronJob.belongsTo(sequelize.models.account, { foreignKey: 'cronCreatedByAccountId', as: 'creator' });
  }
  
  // CronChangeLogs associations
  if (sequelize.models.account) {
    models.CronChangeLogs.belongsTo(sequelize.models.account, { foreignKey: 'updatedByAccountId', as: 'updater' });
  }
  
  // GlobalSettings associations
  if (sequelize.models.account) {
    models.GlobalSettings.belongsTo(sequelize.models.account, { foreignKey: 'updatedByAccountId', as: 'updater' });
  }

  return models;
}

