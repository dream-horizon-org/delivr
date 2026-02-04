/**
 * Release Notification Types - Public Exports
 */

// Enums and constants
export {
  NotificationType,
  NOTIFICATION_TYPES,
  PLATFORM_SPECIFIC_NOTIFICATION_TYPES,
  PLATFORM_TARGET_TO_TEMPLATE_KEY,
  PlatformName,
  TargetName
} from './release-notification.interface';

// Database/Repository layer types
export type {
  ChannelDeliveryResponse,
  DeliveryStatus,
  ReleaseNotification,
  CreateReleaseNotificationDto,
  UpdateReleaseNotificationDto,
  NotificationQueryFilters
} from './release-notification.interface';

// Service layer types
export type {
  TemplatePlatformKey,
  BaseNotificationPayload,
  NotificationPayload,
  NotificationResult
} from './release-notification.interface';

// Ad-hoc notification types
export type {
  AdHocNotificationRequest,
  ChannelValidationResult,
  AdHocNotificationResponse,
  AdHocNotificationErrorResponse
} from './adhoc-notification.interface';

