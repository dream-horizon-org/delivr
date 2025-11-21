import { JenkinsConnectionService } from "../../../../services/integrations/ci-cd/connections/jenkins-connection.service";
import { ERROR_MESSAGES, PROVIDER_DEFAULTS } from "../constants";
import type { ConnectionAdapter, VerifyResult } from "./connection-adapter.utils";
import type { UpdateCICDIntegrationDto, SafeCICDIntegration } from "~types/integrations/ci-cd/connection.interface";

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

  // prepareVerifyOnUpdate removed; update handled via service.update

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

  const update = async (tenantId: string, updateData: UpdateCICDIntegrationDto): Promise<SafeCICDIntegration> => {
    const safe = await service.update(tenantId, updateData);
    return safe;
  };

  return { verify, create, update };
};


