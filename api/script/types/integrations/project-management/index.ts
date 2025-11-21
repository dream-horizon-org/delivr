// Platform types
export { Platform, PLATFORMS, PLATFORM_DISPLAY_NAMES } from './platform.interface';
export {
  isValidPlatform,
  getPlatformDisplayName,
  validatePlatforms
} from './platform.utils';

// Integration types
export type {
  ProjectManagementIntegrationConfig,
  JiraIntegrationConfig,
  LinearIntegrationConfig,
  ProjectManagementIntegration,
  CreateProjectManagementIntegrationDto,
  UpdateProjectManagementIntegrationDto,
  VerifyProjectManagementIntegrationResult
} from './integration';
export {
  ProjectManagementProviderType,
  PROJECT_MANAGEMENT_PROVIDER_TYPES,
  VerificationStatus
} from './integration';

// Configuration types
export type {
  PlatformConfiguration,
  ProjectManagementConfig,
  CreateProjectManagementConfigDto,
  UpdateProjectManagementConfigDto,
  ValidateProjectManagementConfigResult,
  ValidationError,
  VerifyProjectManagementConfigResult
} from './configuration';

// Ticket types
export type {
  CreateTicketsRequest,
  TicketCreationResult,
  CreateTicketsResponse,
  CheckTicketStatusResult
} from './ticket';

