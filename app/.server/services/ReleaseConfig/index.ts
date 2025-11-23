/**
 * Release Config BFF Module
 * Exports service and transformers for release configuration
 */

export { ReleaseConfigService } from './release-config.service';
export {
  transformToBackendPayload,
  transformFromBackendResponse,
  transformToUpdatePayload,
  type CreateReleaseConfigRequest,
  type SafeReleaseConfiguration,
  type BackendWorkflow,
  type BackendTestManagementConfig,
  type BackendCommunicationConfig,
  type BackendProjectManagementConfig,
  type BackendReleaseScheduling,
} from './release-config-transformer';

