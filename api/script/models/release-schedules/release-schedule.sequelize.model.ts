/**
 * Release Schedule Sequelize Model
 * Stores scheduling configuration for recurring releases
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import type {
  ReleaseFrequency,
  WorkingDay,
  InitialVersion,
  RegressionSlot
} from '~types/release-schedules/release-schedule.interface';

// ============================================================================
// TYPES
// ============================================================================

export type ReleaseScheduleAttributes = {
  id: string;
  tenantId: string;
  releaseConfigId: string; // FK to release_configurations

  // Scheduling Configuration
  releaseFrequency: ReleaseFrequency;
  firstReleaseKickoffDate: string;
  initialVersions: InitialVersion[];
  kickoffReminderTime: string;
  kickoffTime: string;
  targetReleaseTime: string;
  targetReleaseDateOffsetFromKickoff: number;
  kickoffReminderEnabled: boolean;
  timezone: string;
  regressionSlots: RegressionSlot[] | null;
  workingDays: WorkingDay[];

  // Runtime State
  nextReleaseKickoffDate: string;
  isEnabled: boolean;
  lastCreatedReleaseId: string | null;
  cronicleJobId: string | null;

  // Metadata
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ReleaseScheduleModelType = typeof Model & {
  new (): Model<ReleaseScheduleAttributes>;
};

// ============================================================================
// MODEL FACTORY
// ============================================================================

export const createReleaseScheduleModel = (
  sequelize: Sequelize
): ReleaseScheduleModelType => {
  const ReleaseScheduleModel = sequelize.define<Model<ReleaseScheduleAttributes>>(
    'ReleaseSchedule',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      tenantId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        field: 'tenantId',
        references: {
          model: 'tenants',
          key: 'id'
        },
        comment: 'Tenant identifier (denormalized for query performance)'
      },
      releaseConfigId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'releaseConfigId',
        references: {
          model: 'release_configurations',
          key: 'id'
        },
        comment: 'FK to release_configurations - the config this schedule belongs to'
      },

      // ========================================================================
      // SCHEDULING CONFIGURATION
      // ========================================================================

      releaseFrequency: {
        type: DataTypes.ENUM('WEEKLY', 'BIWEEKLY', 'TRIWEEKLY', 'MONTHLY'),
        allowNull: false,
        field: 'releaseFrequency',
        comment: 'How often releases are scheduled'
      },
      firstReleaseKickoffDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'firstReleaseKickoffDate',
        comment: 'Date of the first release kickoff'
      },
      initialVersions: {
        type: DataTypes.JSON,
        allowNull: false,
        field: 'initialVersions',
        comment: 'Array of platform-target-version combinations (e.g., [{"platform": "ANDROID", "target": "PLAY_STORE", "version": "6.2.0"}])'
      },
      kickoffReminderTime: {
        type: DataTypes.STRING(5),
        allowNull: false,
        field: 'kickoffReminderTime',
        comment: 'Time for kickoff reminder (HH:mm format)'
      },
      kickoffTime: {
        type: DataTypes.STRING(5),
        allowNull: false,
        field: 'kickoffTime',
        comment: 'Time for release kickoff (HH:mm format)'
      },
      targetReleaseTime: {
        type: DataTypes.STRING(5),
        allowNull: false,
        field: 'targetReleaseTime',
        comment: 'Target time for release (HH:mm format)'
      },
      targetReleaseDateOffsetFromKickoff: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'targetReleaseDateOffsetFromKickoff',
        comment: 'Number of days from kickoff to target release date'
      },
      kickoffReminderEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'kickoffReminderEnabled',
        comment: 'Whether kickoff reminder is enabled'
      },
      timezone: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'timezone',
        comment: 'Timezone for scheduling (e.g., Asia/Kolkata)'
      },
      regressionSlots: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'regressionSlots',
        comment: 'Array of regression slot configurations'
      },
      workingDays: {
        type: DataTypes.JSON,
        allowNull: false,
        field: 'workingDays',
        comment: 'Array of working days (1=Monday, 7=Sunday)'
      },

      // ========================================================================
      // RUNTIME STATE
      // ========================================================================

      nextReleaseKickoffDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'nextReleaseKickoffDate',
        comment: 'Date of the next scheduled release kickoff (indexed for cron queries)'
      },
      isEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'isEnabled',
        comment: 'Whether this schedule is active'
      },

      lastCreatedReleaseId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'lastCreatedReleaseId',
        comment: 'ID of the last release created by this schedule'
      },
      cronicleJobId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'cronicleJobId',
        comment: 'Cronicle job ID for this schedule (null if no job created yet)'
      },

      // ========================================================================
      // METADATA
      // ========================================================================

      createdByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'createdByAccountId',
        references: {
          model: 'accounts',
          key: 'id'
        },
        comment: 'Account who created this schedule'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'createdAt'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updatedAt'
      }
    },
    {
      tableName: 'release_schedules',
      timestamps: true,
      underscored: false,
      indexes: [
        {
          name: 'idx_schedules_next_kickoff',
          fields: ['isEnabled', 'nextReleaseKickoffDate']
        },
        {
          name: 'idx_schedules_tenant',
          fields: ['tenantId']
        },
        {
          name: 'idx_schedules_release_config',
          fields: ['releaseConfigId'],
          unique: true
        }
      ]
    }
  ) as ReleaseScheduleModelType;

  return ReleaseScheduleModel;
};

