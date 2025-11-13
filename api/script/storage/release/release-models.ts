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
  IOS = 'IOS'
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
  PRE_KICK_OFF_REMINDER = 'PRE_KICK_OFF_REMINDER',
  FORK_BRANCH = 'FORK_BRANCH',
  UPDATE_GITHUB_VARIABLES = 'UPDATE_GITHUB_VARIABLES',
  PRE_RELEASE_CHERRY_PICKS_REMINDER = 'PRE_RELEASE_CHERRY_PICKS_REMINDER',
  ADD_L6_APPROVAL_CHECK = 'ADD_L6_APPROVAL_CHECK',
  FINAL_PRE_REGRESSION_BUILDS = 'FINAL_PRE_REGRESSION_BUILDS',
  TRIGGER_REGRESSION_BUILDS = 'TRIGGER_REGRESSION_BUILDS',
  AUTOMATION_RUNS = 'AUTOMATION_RUNS',
  TRIGGER_AUTOMATION_RUNS = 'TRIGGER_AUTOMATION_RUNS',
  RESET_TEST_RAIL_STATUS = 'RESET_TEST_RAIL_STATUS',
  CHERRY_REMINDER = 'CHERRY_REMINDER',
  CREATE_RELEASE_NOTES = 'CREATE_RELEASE_NOTES',
  TEST_FLIGHT_BUILD = 'TEST_FLIGHT_BUILD',
  CREATE_RELEASE_TAG = 'CREATE_RELEASE_TAG'
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
      allowNull: false
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
    version: {
      type: DataTypes.STRING(255),
      allowNull: false
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
      references: {
        model: 'accounts',
        key: 'id'
      }
    },
    lastUpdateByAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    autoPilot: {
      type: DataTypes.ENUM(...Object.values(CronStatus)),
      defaultValue: CronStatus.PENDING
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
    }
  }, {
    tableName: 'releases',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['tenantId', 'createdAt'] },
      { fields: ['tenantId', 'status', 'plannedDate'] },
      { fields: ['releasePilotAccountId', 'status'] },
      { fields: ['releaseKey'], unique: true },
      { fields: ['lastUpdateByAccountId'] },
      { fields: ['parentId'] }
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
      { fields: ['releaseBuildsId'] }
    ]
  });
}

/**
 * PreReleaseTasks Model - Container for pre-release tasks
 */
export function createPreReleaseTasksModel(sequelize: Sequelize) {
  return sequelize.define('preReleaseTasks', {
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
    tableName: 'pre_release_tasks',
    timestamps: true
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
    workflowStatus: {
      type: DataTypes.ENUM(...Object.values(WorkFlowStatus)),
      allowNull: true
    },
    isGithubWorkflow: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    taskType: {
      type: DataTypes.ENUM(...Object.values(TaskType)),
      allowNull: true
    },
    taskStatus: {
      type: DataTypes.ENUM(...Object.values(TaskStatus)),
      defaultValue: TaskStatus.PENDING
    },
    runId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    workflowId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    taskConclusion: {
      type: DataTypes.ENUM(...Object.values(ReleaseTaskConclusion)),
      allowNull: true
    },
    userId: {
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
    preReleaseTasksId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'pre_release_tasks',
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
    tableName: 'release_tasks',
    timestamps: true,
    indexes: [
      { fields: ['releaseId'] },
      { fields: ['regressionId'] },
      { fields: ['preReleaseTasksId'] },
      { fields: ['userId'] },
      { fields: ['taskId'], unique: true }
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
    userId: {
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
      { fields: ['userId'] },
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
      allowNull: true
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
    }
  }, {
    tableName: 'cron_jobs',
    timestamps: false,
    indexes: [
      { fields: ['releaseId'], unique: true },
      { fields: ['cronCreatedByAccountId'] }
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
    TenantIntegrations: createTenantIntegrationsModel(sequelize),
    Platform: createPlatformModel(sequelize),
    Target: createTargetModel(sequelize),
    Release: createReleaseModel(sequelize),
    ReleaseBuilds: createReleaseBuildsModel(sequelize),
    Build: createBuildModel(sequelize),
    PreReleaseTasks: createPreReleaseTasksModel(sequelize),
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
  
  // TenantIntegrations associations
  models.TenantIntegrations.belongsTo(sequelize.models.tenants, { foreignKey: 'tenantId', as: 'tenant' });
  models.TenantIntegrations.belongsTo(sequelize.models.user, { foreignKey: 'configuredByAccountId', as: 'configuredBy' });
  
  // Release associations
  models.Release.belongsTo(sequelize.models.tenants, { foreignKey: 'tenantId', as: 'tenant' });
  models.Release.belongsTo(sequelize.models.user, { foreignKey: 'createdByAccountId', as: 'creator' });
  models.Release.belongsTo(sequelize.models.user, { foreignKey: 'releasePilotAccountId', as: 'releasePilot' });
  models.Release.belongsTo(sequelize.models.user, { foreignKey: 'lastUpdateByAccountId', as: 'lastUpdater' });
  models.Release.belongsTo(models.Release, { foreignKey: 'parentId', as: 'parent' });
  models.Release.hasMany(models.Release, { foreignKey: 'parentId', as: 'hotfixes' });
  
  // ReleaseBuilds associations
  models.ReleaseBuilds.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  models.ReleaseBuilds.hasMany(models.Build, { foreignKey: 'releaseBuildsId', as: 'builds' });
  
  // Build associations
  models.Build.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  models.Build.belongsTo(models.Platform, { foreignKey: 'platformId', as: 'platform' });
  models.Build.belongsTo(models.Target, { foreignKey: 'targetId', as: 'target' });
  models.Build.belongsTo(models.RegressionCycle, { foreignKey: 'regressionId', as: 'regressionCycle' });
  models.Build.belongsTo(models.ReleaseBuilds, { foreignKey: 'releaseBuildsId', as: 'releaseBuilds' });
  
  // PreReleaseTasks associations
  models.PreReleaseTasks.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  models.PreReleaseTasks.hasMany(models.ReleaseTasks, { foreignKey: 'preReleaseTasksId', as: 'tasks' });
  
  // ReleaseTasks associations
  models.ReleaseTasks.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  models.ReleaseTasks.belongsTo(models.RegressionCycle, { foreignKey: 'regressionId', as: 'regressionCycle' });
  models.ReleaseTasks.belongsTo(models.PreReleaseTasks, { foreignKey: 'preReleaseTasksId', as: 'preReleaseTasks' });
  models.ReleaseTasks.belongsTo(sequelize.models.user, { foreignKey: 'userId', as: 'account' });
  
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
  models.CherryPicks.belongsTo(sequelize.models.user, { foreignKey: 'authorAccountId', as: 'author' });
  models.CherryPicks.belongsTo(sequelize.models.user, { foreignKey: 'approverAccountId', as: 'approver' });
  
  // StateHistory associations
  models.StateHistory.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  models.StateHistory.belongsTo(sequelize.models.user, { foreignKey: 'userId', as: 'account' });
  models.StateHistory.hasMany(models.StateHistoryItem, { foreignKey: 'historyId', as: 'changes' });
  
  // StateHistoryItem associations
  models.StateHistoryItem.belongsTo(models.StateHistory, { foreignKey: 'historyId', as: 'history' });
  
  // CronJob associations
  models.CronJob.belongsTo(models.Release, { foreignKey: 'releaseId', as: 'release' });
  models.CronJob.belongsTo(sequelize.models.user, { foreignKey: 'cronCreatedByAccountId', as: 'creator' });
  
  // CronChangeLogs associations
  models.CronChangeLogs.belongsTo(sequelize.models.user, { foreignKey: 'updatedByAccountId', as: 'updater' });
  
  // GlobalSettings associations
  models.GlobalSettings.belongsTo(sequelize.models.user, { foreignKey: 'updatedByAccountId', as: 'updater' });

  return models;
}

