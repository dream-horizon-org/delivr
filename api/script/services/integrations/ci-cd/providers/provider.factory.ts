import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';
import type { CICDProvider } from './provider.interface';

// Lazy imports to avoid circular dependencies during tests/build
const getJenkinsProvider = async (): Promise<CICDProvider> => {
  const mod = await import('./jenkins/jenkins.provider');
  return new mod.JenkinsProvider();
};

const getGitHubActionsProvider = async (): Promise<CICDProvider> => {
  const mod = await import('./github-actions/github-actions.provider');
  return new mod.GitHubActionsProvider();
};

export const ProviderFactory = {
  getProvider: async (type: CICDProviderType): Promise<CICDProvider> => {
    switch (type) {
      case CICDProviderType.JENKINS:
        return getJenkinsProvider();
      case CICDProviderType.GITHUB_ACTIONS:
        return getGitHubActionsProvider();
      default:
        throw new Error(`Unsupported CI/CD provider: ${type}`);
    }
  }
};


