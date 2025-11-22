import { SCMType } from '~storage/integrations/scm';
import type { SCMIntegration } from '../scm-integration.interface';
import { GitHubProvider } from './github/github.provider';

/**
 * SCM Provider Factory
 * Returns provider instances for a given SCMType.
 * Currently supports GitHub; other providers can be added later.
 */
export class SCMProviderFactory {
  private static providers: Map<string, SCMIntegration> = new Map();

  static getProvider(scmType: SCMType): SCMIntegration {
    const cached = this.providers.get(scmType);
    if (cached) {
      return cached;
    }

    switch (scmType) {
      case SCMType.GITHUB: {
        const provider = new GitHubProvider();
        this.providers.set(scmType, provider);
        return provider;
      }
      case SCMType.GITLAB:
      case SCMType.BITBUCKET:
        throw new Error(`SCM provider not yet implemented: ${scmType}`);
      default:
        throw new Error(`Unsupported SCM provider: ${String(scmType)}`);
    }
  }
}