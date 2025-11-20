import type { CICDProviderType } from '../../../../storage/integrations/ci-cd/ci-cd-types';

export interface CICDProvider {
  readonly type: CICDProviderType;
}


