import { CICDProviderType } from "~types/integrations/ci-cd/connection.interface";
import { ERROR_MESSAGES } from "../constants";
import { createJenkinsConnectionAdapter } from "./jenkins-connection-adapter.utils";
import { createGitHubActionsConnectionAdapter } from "./github-actions-connection-adapter.utils";
import type { TenantCICDIntegration, UpdateCICDIntegrationDto } from "~types/integrations/ci-cd/connection.interface";

export type VerifyResult = { isValid: boolean; message: string };

export type VerifyPreparation = {
  shouldVerify: boolean;
  body?: Record<string, unknown>;
  missingSecretMessage?: string | null;
};

export type ConnectionAdapter = {
  verify: (body: Record<string, unknown>) => Promise<VerifyResult>;
  create: (tenantId: string, accountId: string, body: Record<string, unknown>) => Promise<unknown>;
  prepareVerifyOnUpdate?: (args: {
    existing: TenantCICDIntegration;
    update: UpdateCICDIntegrationDto;
    secrets: { apiToken?: string | null };
  }) => VerifyPreparation;
};

export const getConnectionAdapter = (provider: CICDProviderType): ConnectionAdapter => {
  const isJenkins = provider === CICDProviderType.JENKINS;
  if (isJenkins) return createJenkinsConnectionAdapter();
  const isGha = provider === CICDProviderType.GITHUB_ACTIONS;
  if (isGha) return createGitHubActionsConnectionAdapter();
  throw new Error(ERROR_MESSAGES.OPERATION_NOT_SUPPORTED);
};


