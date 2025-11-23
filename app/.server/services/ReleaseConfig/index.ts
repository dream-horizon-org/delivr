/**
 * Release Config BFF Module
 * Exports service and payload preparation utilities
 * 
 * SIMPLIFIED: UI schema now matches backend schema
 * Only necessary transformations remain
 */

export { ReleaseConfigService } from './release-config.service';
export {
  prepareReleaseConfigPayload,
  prepareUpdatePayload,
} from './release-config-payload';

