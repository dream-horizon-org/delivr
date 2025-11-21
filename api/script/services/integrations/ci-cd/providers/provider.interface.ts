import type { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';

export interface CICDProvider {
  readonly type: CICDProviderType;
}


