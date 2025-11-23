import { DataTypes, Model, Sequelize } from 'sequelize';

// ============================================================================
// Platform Store Mapping Model
// ============================================================================

export interface PlatformStoreMappingAttributes {
  id: string;
  platform: 'ANDROID' | 'IOS';
  allowedStoreTypes: string[]; // JSON array of store types
  createdAt?: Date;
  updatedAt?: Date;
}

export function createPlatformStoreMappingModel(sequelize: Sequelize) {
  class PlatformStoreMappingModel extends Model<PlatformStoreMappingAttributes> 
    implements PlatformStoreMappingAttributes {
    declare id: string;
    declare platform: 'ANDROID' | 'IOS';
    declare allowedStoreTypes: string[];
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  PlatformStoreMappingModel.init(
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier (nanoid)',
      },
      platform: {
        type: DataTypes.ENUM('ANDROID', 'IOS'),
        allowNull: false,
        unique: true,
        comment: 'Platform type',
      },
      allowedStoreTypes: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Array of allowed store types for this platform',
        get() {
          const rawValue = this.getDataValue('allowedStoreTypes');
          return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        },
        set(value: string[] | string | unknown) {
          const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
          this.setDataValue('allowedStoreTypes', valueToStore as any);
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'PlatformStoreMapping',
      tableName: 'platform_store_type_mapping',
      timestamps: true,
      charset: 'latin1',
      collate: 'latin1_swedish_ci',
      comment: 'Platform to store type mapping (static reference data)',
    }
  );

  return PlatformStoreMappingModel;
}

