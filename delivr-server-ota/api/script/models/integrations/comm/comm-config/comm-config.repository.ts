import type {
  AppCommChannel,
  StageChannelMapping,
  SlackChannel
} from '~types/integrations/comm/comm-integration';
import type { CommConfigModelType } from './comm-config.sequelize.model';

/**
 * Communication Configuration Repository
 * Data access layer for slack_configuration table
 */
export class CommConfigRepository {
  private model: CommConfigModelType;

  constructor(model: CommConfigModelType) {
    this.model = model;
  }

  /**
   * Convert Sequelize model instance to plain object
   */
  private toPlainObject = (instance: InstanceType<CommConfigModelType>): AppCommChannel => {
    const json = instance.toJSON();
    return json;
  };

  /**
   * Create channel configuration
   */
  create = async (
    id: string,
    integrationId: string,
    appId: string,
    channelData: StageChannelMapping
  ): Promise<AppCommChannel> => {
    const channelConfig = await this.model.create({
      id,
      integrationId,
      appId,
      channelData
    });

    return this.toPlainObject(channelConfig);
  };

  /**
   * Find channel configuration by ID
   */
  findById = async (id: string): Promise<AppCommChannel | null> => {
    const channelConfig = await this.model.findByPk(id);

    if (!channelConfig) {
      return null;
    }

    return this.toPlainObject(channelConfig);
  };

  /**
   * Find channel configuration by app
   */
  findByApp = async (appId: string): Promise<AppCommChannel | null> => {
    const channelConfig = await this.model.findOne({
      where: { appId },
      order: [['createdAt', 'DESC']]
    });

    if (!channelConfig) {
      return null;
    }

    return this.toPlainObject(channelConfig);
  };

  /**
   * Update channel configuration (general update)
   */
  update = async (
    id: string,
    data: Partial<{ channelData: StageChannelMapping }>
  ): Promise<AppCommChannel | null> => {
    const channelConfig = await this.model.findByPk(id);

    if (!channelConfig) {
      return null;
    }

    await channelConfig.update(data);

    return this.toPlainObject(channelConfig);
  };

  /**
   * Update stage channels - add or remove channels from a specific stage
   */
  updateStageChannels = async (
    id: string,
    stage: string,
    action: 'add' | 'remove',
    channels: SlackChannel[]
  ): Promise<AppCommChannel | null> => {
    const channelConfig = await this.model.findByPk(id);

    if (!channelConfig) {
      return null;
    }

    const currentData: StageChannelMapping = channelConfig.get('channelData') as StageChannelMapping ?? {};
    const currentChannels: SlackChannel[] = currentData[stage] ?? [];

    let updatedChannels: SlackChannel[];

    if (action === 'add') {
      // Add channels (avoid duplicates by ID)
      const currentIds = currentChannels.map(ch => ch.id);
      const newChannels = channels.filter(ch => !currentIds.includes(ch.id));
      updatedChannels = [...currentChannels, ...newChannels];
    } else {
      // Remove channels (by ID)
      const removeIds = channels.map(ch => ch.id);
      updatedChannels = currentChannels.filter(ch => !removeIds.includes(ch.id));
    }

    // Update channelData with new channels for this stage
    const updatedData: StageChannelMapping = {
      ...currentData,
      [stage]: updatedChannels
    };

    await channelConfig.update({ channelData: updatedData });

    return this.toPlainObject(channelConfig);
  };

  /**
   * Delete channel configuration by ID (hard delete)
   */
  delete = async (id: string): Promise<boolean> => {
    const result = await this.model.destroy({
      where: { id }
    });
    return result > 0;
  };
}

