/**
 * Release Model (from Delivr)
 * Extended with tenant_id for multi-tenancy support
 */

import { DataTypes, Sequelize } from 'sequelize';

export function createRelease(sequelize: Sequelize) {
  return sequelize.define('release', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    
    // Release identification
    releaseKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'release_key',
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    
    // Multi-tenancy (NEW - not in Delivr)
    tenantId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'tenant_id',
      references: {
        model: 'tenants',
        key: 'id',
      },
    },
    appId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'app_id',
      references: {
        model: 'apps',
        key: 'id',
      },
    },
    
    // Release metadata
    type: {
      type: DataTypes.ENUM('HOTFIX', 'PLANNED', 'MAJOR'),
      allowNull: false,
      defaultValue: 'PLANNED',
    },
    status: {
      type: DataTypes.ENUM(
        'PENDING',
        'STARTED',
        'REGRESSION_IN_PROGRESS',
        'BUILD_SUBMITTED',
        'RELEASED',
        'ARCHIVED'
      ),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    
    // Dates
    kickOffReminderDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'kick_off_reminder_date',
    },
    plannedDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'planned_date',
    },
    releaseDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'release_date',
    },
    targetReleaseDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'target_release_date',
    },
    
    // Delay tracking
    delayed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    delayedReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'delayed_reason',
    },
    
    // Version control
    baseVersion: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'base_version',
    },
    baseBranch: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'base_branch',
    },
    branchRelease: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'branch_release',
    },
    branchCodepush: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'branch_codepush',
    },
    
    // Update settings
    updateType: {
      type: DataTypes.ENUM('OPTIONAL', 'FORCE'),
      allowNull: false,
      defaultValue: 'OPTIONAL',
      field: 'update_type',
    },
    
    // Ownership & permissions
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'Release creator (automatic Owner)',
    },
    releasePilotId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'release_pilot_id',
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'Release pilot (automatic Owner)',
    },
    lastUpdatedBy: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'last_updated_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    
    // Parent release (for hotfixes)
    parentId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'parent_id',
      references: {
        model: 'releases',
        key: 'id',
      },
    },
    
    // Test run IDs
    iosTestRunId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'ios_test_run_id',
    },
    webTestRunId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'web_test_run_id',
    },
    playStoreRunId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'play_store_run_id',
    },
    
    // Epic IDs (Jira)
    webEpicId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'web_epic_id',
    },
    playStoreEpicId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'play_store_epic_id',
    },
    iosEpicId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'ios_epic_id',
    },
    
    // Release tag
    releaseTag: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'release_tag',
    },
    
    // Slack integration
    slackMessageTimestamps: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'slack_message_timestamps',
    },
    
    // User adoption
    iosUserAdoption: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'ios_user_adoption',
    },
    playstoreUserAdoption: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'playstore_user_adoption',
    },
    webUserAdoption: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'web_user_adoption',
    },
    
    // Autopilot
    autoPilot: {
      type: DataTypes.ENUM('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED'),
      allowNull: true,
      defaultValue: 'PENDING',
      field: 'auto_pilot',
    },
    
    // Final build numbers
    webFinalBuildNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'web_final_build_number',
    },
    psFinalBuildNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'ps_final_build_number',
    },
    iosFinalBuildNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'ios_final_build_number',
    },
  }, {
    tableName: 'releases',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
}

