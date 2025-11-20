import { JenkinsConnectionService } from "../../../../services/integrations/ci-cd/connections/jenkins-connection.service";
import { ERROR_MESSAGES, PROVIDER_DEFAULTS } from "../constants";
import type { ConnectionAdapter, VerifyResult, VerifyPreparation } from "./connection-adapter.utils";
import type { TenantCICDIntegration, UpdateCICDIntegrationDto } from "~types/integrations/ci-cd/connection.interface";

export const createJenkinsConnectionAdapter = (): ConnectionAdapter => {
  const service = new JenkinsConnectionService();

  const verify: ConnectionAdapter["verify"] = async (body) => {
    const hostUrl = body.hostUrl as string | undefined;
    const username = body.username as string | undefined;
    const apiToken = body.apiToken as string | undefined;
    const useCrumb = (body.useCrumb as boolean | undefined) ?? true;
    const crumbPath = (body.crumbPath as string | undefined) ?? PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH;

    const missing = !hostUrl || !username || !apiToken;
    if (missing) {
      return { isValid: false, message: ERROR_MESSAGES.JENKINS_VERIFY_REQUIRED } as VerifyResult;
    }
    const result = await service.verifyConnection({ hostUrl, username, apiToken, useCrumb, crumbPath });
    return result;
  };

  const prepareVerifyOnUpdate: NonNullable<ConnectionAdapter["prepareVerifyOnUpdate"]> = (args) => {
    const { existing, update, secrets } = args;
    const hasApiTokenUpdate = typeof update.apiToken === 'string';
    const hasUsernameUpdate = typeof update.username === 'string';
    const hasHostUrlUpdate = typeof update.hostUrl === 'string';
    const shouldVerify = hasApiTokenUpdate || hasUsernameUpdate || hasHostUrlUpdate;
    if (!shouldVerify) {
      return { shouldVerify: false };
    }
    const hostUrl = typeof update.hostUrl === 'string' && update.hostUrl ? update.hostUrl : existing.hostUrl;
    const username = typeof update.username === 'string' && update.username ? update.username : (existing.username ?? '');
    const preferredToken = update.apiToken;
    const tokenFromSecrets = typeof secrets.apiToken === 'string' ? secrets.apiToken : undefined;
    const apiToken = typeof preferredToken === 'string' && preferredToken.trim().length > 0
      ? preferredToken
      : (tokenFromSecrets && tokenFromSecrets.trim().length > 0 ? tokenFromSecrets : undefined);
    const tokenMissing = !apiToken;
    if (tokenMissing) {
      return { shouldVerify: true, missingSecretMessage: ERROR_MESSAGES.JENKINS_VERIFY_REQUIRED };
    }
    const providerConfig = (update.providerConfig as Record<string, unknown> | null | undefined) ?? {};
    const useCrumbRaw = providerConfig && Object.prototype.hasOwnProperty.call(providerConfig, 'useCrumb')
      ? providerConfig['useCrumb']
      : undefined;
    const crumbPathRaw = providerConfig && Object.prototype.hasOwnProperty.call(providerConfig, 'crumbPath')
      ? providerConfig['crumbPath']
      : undefined;
    const useCrumb = typeof useCrumbRaw === 'boolean' ? useCrumbRaw : true;
    const crumbPath = typeof crumbPathRaw === 'string' && crumbPathRaw.length > 0 ? crumbPathRaw : PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH;
    const body: Record<string, unknown> = { hostUrl, username, apiToken, useCrumb, crumbPath };
    return { shouldVerify: true, body } as VerifyPreparation;
  };

  const create: ConnectionAdapter["create"] = async (tenantId, accountId, body) => {
    const displayName = body.displayName as string | undefined;
    const hostUrl = body.hostUrl as string | undefined;
    const username = body.username as string | undefined;
    const apiToken = body.apiToken as string | undefined;
    const providerConfig = (body.providerConfig as { useCrumb?: boolean; crumbPath?: string } | undefined) ?? { useCrumb: true, crumbPath: PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH };
    const missing = !hostUrl || !username || !apiToken;
    if (missing) {
      throw new Error(ERROR_MESSAGES.JENKINS_CREATE_REQUIRED);
    }
    const created = await service.create(tenantId, accountId, { displayName, hostUrl, username, apiToken, providerConfig });
    return created;
  };

  return { verify, create, prepareVerifyOnUpdate };
};


