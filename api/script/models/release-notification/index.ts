/**
 * Release Notification Models - Public Exports
 * Central export point for release notification model and repository
 */

// Sequelize Model
export { createReleaseNotificationModel } from './release-notification.sequelize.model';
export type {
  ReleaseNotificationAttributes,
  ReleaseNotificationModelType
} from './release-notification.sequelize.model';

// Repository
export { ReleaseNotificationRepository } from './release-notification.repository';

// Re-export types from ~types/release-notification for convenience
export {
  NotificationType,
  NOTIFICATION_TYPES,
  PLATFORM_SPECIFIC_NOTIFICATION_TYPES,
  PLATFORM_TARGET_TO_TEMPLATE_KEY,
  PlatformName,
  TargetName
} from '~types/release-notification';

export type {
  ChannelDeliveryResponse,
  DeliveryStatus,
  ReleaseNotification,
  CreateReleaseNotificationDto,
  UpdateReleaseNotificationDto,
  NotificationQueryFilters,
  TemplatePlatformKey,
  BaseNotificationPayload,
  NotificationPayload,
  NotificationResult
} from '~types/release-notification';

