/**
 * Release Config BFF Module
 * Exports service and payload preparation utilities
 * 
 * Note: Backend has different field names for REQUEST vs RESPONSE
 * - REQUEST: defaultTargets
 * - RESPONSE: targets
 */

export { ReleaseConfigService } from './release-config.service';
export {
  prepareReleaseConfigPayload,
  prepareUpdatePayload,
  transformFromBackend,
} from './release-config-payload';

