/**
 * Slack Channel Configuration Validation
 * Input validation for channel config endpoints
 */

import type { SlackChannel, StageChannelMapping } from '~types/integrations/comm/comm-integration';

/**
 * Validate stage name
 */
export const validateStageName = (stage: unknown): string | null => {
  if (!stage) {
    return 'Stage name is required';
  }

  if (typeof stage !== 'string') {
    return 'Stage name must be a string';
  }

  if (stage.trim().length === 0) {
    return 'Stage name cannot be empty';
  }

  return null;
};

/**
 * Validate Slack channel object
 */
export const validateSlackChannel = (channel: unknown): string | null => {
  if (!channel) {
    return 'Channel is required';
  }

  if (typeof channel !== 'object' || channel === null) {
    return 'Channel must be an object';
  }

  const ch = channel as Record<string, unknown>;

  if (!ch.id || typeof ch.id !== 'string') {
    return 'Channel ID is required and must be a string';
  }

  if (!ch.name || typeof ch.name !== 'string') {
    return 'Channel name is required and must be a string';
  }

  return null;
};

/**
 * Validate array of Slack channels
 */
export const validateChannelsArray = (channels: unknown): string | null => {
  if (!channels) {
    return 'Channels array is required';
  }

  if (!Array.isArray(channels)) {
    return 'Channels must be an array';
  }

  if (channels.length === 0) {
    return 'At least one channel is required';
  }

  for (let i = 0; i < channels.length; i++) {
    const error = validateSlackChannel(channels[i]);
    if (error) {
      return `Channel at index ${i}: ${error}`;
    }
  }

  return null;
};

/**
 * Validate stage channel mapping
 */
export const validateStageChannelMapping = (channelData: unknown): string | null => {
  if (!channelData) {
    return 'Channel data is required';
  }

  if (typeof channelData !== 'object' || channelData === null) {
    return 'Channel data must be an object';
  }

  const mapping = channelData as Record<string, unknown>;
  const stages = Object.keys(mapping);

  if (stages.length === 0) {
    return 'At least one stage must be configured';
  }

  for (const stage of stages) {
    const stageError = validateStageName(stage);
    if (stageError) {
      return `Stage name error: ${stageError}`;
    }

    const channelsError = validateChannelsArray(mapping[stage]);
    if (channelsError) {
      return `Stage "${stage}": ${channelsError}`;
    }
  }

  return null;
};

/**
 * Validate action type for update
 */
export const validateUpdateAction = (action: unknown): string | null => {
  if (!action) {
    return 'Action is required';
  }

  if (typeof action !== 'string') {
    return 'Action must be a string';
  }

  if (action !== 'add' && action !== 'remove') {
    return 'Action must be either "add" or "remove"';
  }

  return null;
};

