import type { AdHocNotificationRequest, ChannelValidationResult } from '~types/release-notification/adhoc-notification.interface';
import type { TenantCommChannel, SlackChannel } from '~types/integrations/comm/comm-integration';
import { 
  ADHOC_NOTIFICATION_LIMITS,
  ADHOC_NOTIFICATION_ERROR_MESSAGES,
  ADHOC_NOTIFICATION_MESSAGE_TYPES,
  SUPPORTED_MESSAGE_TYPES
} from './constants';

/**
 * Validate ad-hoc notification request body
 */
export function validateAdHocNotificationRequest(body: unknown): {
  isValid: boolean;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  data?: AdHocNotificationRequest;
} {
  const request = body as AdHocNotificationRequest;

  // Validate type field
  if (!request.type) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: ADHOC_NOTIFICATION_ERROR_MESSAGES.TYPE_REQUIRED,
        details: { field: 'type' }
      }
    };
  }

  if (request.type !== 'custom' && request.type !== 'template') {
    return {
      isValid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: ADHOC_NOTIFICATION_ERROR_MESSAGES.INVALID_TYPE,
        details: { field: 'type' }
      }
    };
  }

  // Validate channels array
  if (!request.channels) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: ADHOC_NOTIFICATION_ERROR_MESSAGES.CHANNELS_REQUIRED,
        details: { field: 'channels' }
      }
    };
  }

  if (!Array.isArray(request.channels)) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: ADHOC_NOTIFICATION_ERROR_MESSAGES.CHANNELS_INVALID_TYPE,
        details: { field: 'channels' }
      }
    };
  }

  if (request.channels.length === 0) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: ADHOC_NOTIFICATION_ERROR_MESSAGES.CHANNELS_EMPTY,
        details: { field: 'channels' }
      }
    };
  }

  if (request.channels.length > ADHOC_NOTIFICATION_LIMITS.MAX_CHANNELS) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: ADHOC_NOTIFICATION_ERROR_MESSAGES.CHANNELS_TOO_MANY,
        details: { 
          field: 'channels',
          currentCount: request.channels.length,
          maxChannels: ADHOC_NOTIFICATION_LIMITS.MAX_CHANNELS
        }
      }
    };
  }

  // Validate each channel object has id and name
  for (const channel of request.channels) {
    const isObject = typeof channel === 'object' && channel !== null;
    const hasId = isObject && 'id' in channel && typeof channel.id === 'string';
    const hasName = isObject && 'name' in channel && typeof channel.name === 'string';
    
    if (!hasId || !hasName) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Each channel must have an "id" and "name" property',
          details: { 
            field: 'channels',
            invalidChannel: channel
          }
        }
      };
    }
  }

  // Type-specific validation
  if (request.type === 'custom') {
    return validateCustomMessageRequest(request);
  } else {
    return validateTemplateMessageRequest(request);
  }
}

/**
 * Validate custom message request
 */
function validateCustomMessageRequest(request: AdHocNotificationRequest): {
  isValid: boolean;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  data?: AdHocNotificationRequest;
} {
  if (!request.customMessage) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: ADHOC_NOTIFICATION_ERROR_MESSAGES.CUSTOM_MESSAGE_REQUIRED,
        details: { field: 'customMessage' }
      }
    };
  }

  const trimmedMessage = request.customMessage.trim();

  if (trimmedMessage.length === 0) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: ADHOC_NOTIFICATION_ERROR_MESSAGES.CUSTOM_MESSAGE_EMPTY,
        details: { field: 'customMessage' }
      }
    };
  }

  if (trimmedMessage.length > ADHOC_NOTIFICATION_LIMITS.MAX_CUSTOM_MESSAGE_LENGTH) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: ADHOC_NOTIFICATION_ERROR_MESSAGES.CUSTOM_MESSAGE_TOO_LONG,
        details: {
          field: 'customMessage',
          currentLength: trimmedMessage.length,
          maxLength: ADHOC_NOTIFICATION_LIMITS.MAX_CUSTOM_MESSAGE_LENGTH
        }
      }
    };
  }

  return {
    isValid: true,
    data: request
  };
}

/**
 * Validate template message request
 */
function validateTemplateMessageRequest(request: AdHocNotificationRequest): {
  isValid: boolean;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  data?: AdHocNotificationRequest;
} {
  if (!request.messageType) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: ADHOC_NOTIFICATION_ERROR_MESSAGES.MESSAGE_TYPE_REQUIRED,
        details: { field: 'messageType' }
      }
    };
  }

  // Validate messageType is supported
  const messageType = request.messageType;
  const isSupportedType = SUPPORTED_MESSAGE_TYPES.includes(messageType as typeof SUPPORTED_MESSAGE_TYPES[number]);
  if (!isSupportedType) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_REQUEST',
        message: ADHOC_NOTIFICATION_ERROR_MESSAGES.MESSAGE_TYPE_UNSUPPORTED,
        details: { 
          field: 'messageType',
          providedValue: request.messageType,
          supportedValues: SUPPORTED_MESSAGE_TYPES
        }
      }
    };
  }

  // Validation passed
  return {
    isValid: true,
    data: request
  };
}

/**
 * Validate channel IDs against release's configured channels
 */
export function validateChannelsAgainstConfig(
  requestedChannelIds: string[],
  channelConfig: TenantCommChannel
): ChannelValidationResult {
  // Extract all channels from channelData (supports both bucket-based and stage-based structure)
  const configuredChannels = extractChannelsFromConfig(channelConfig);
  
  const configuredChannelIds = new Set(configuredChannels.map(ch => ch.id));
  
  const validChannels: Array<{ id: string; name: string }> = [];
  const invalidChannelIds: string[] = [];

  for (const requestedId of requestedChannelIds) {
    if (configuredChannelIds.has(requestedId)) {
      const channel = configuredChannels.find(ch => ch.id === requestedId);
      if (channel) {
        validChannels.push({ id: channel.id, name: channel.name });
      }
    } else {
      invalidChannelIds.push(requestedId);
    }
  }

  return {
    valid: invalidChannelIds.length === 0,
    validChannels,
    invalidChannelIds
  };
}

/**
 * Extract all channels from channelData (supports both structures)
 */
function extractChannelsFromConfig(channelConfig: TenantCommChannel): SlackChannel[] {
  const channels: SlackChannel[] = [];
  const channelData = channelConfig.channelData;

  if (!channelData) {
    return channels;
  }

  // Check if new bucket-based structure
  if ('channels' in channelData && typeof (channelData as any).channels === 'object') {
    const buckets = (channelData as any).channels;
    for (const bucketChannels of Object.values(buckets)) {
      if (Array.isArray(bucketChannels)) {
        for (const channel of bucketChannels) {
          if (typeof channel === 'string') {
            // String ID only - cannot use for name mapping
            continue;
          }
          if (channel && typeof channel === 'object' && channel.id && channel.name) {
            channels.push({ id: channel.id, name: channel.name });
          }
        }
      }
    }
  } else {
    // Old stage-based structure
    for (const stageChannels of Object.values(channelData)) {
      if (Array.isArray(stageChannels)) {
        for (const channel of stageChannels) {
          if (channel && typeof channel === 'object' && channel.id && channel.name) {
            channels.push({ id: channel.id, name: channel.name });
          }
        }
      }
    }
  }

  return channels;
}
