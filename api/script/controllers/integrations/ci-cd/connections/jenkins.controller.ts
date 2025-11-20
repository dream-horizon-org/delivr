import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "../../../../constants/http";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, PROVIDER_DEFAULTS } from "../../../../constants/cicd";
import { getErrorMessage } from "../../../../utils/cicd";
import { JenkinsConnectionService } from "../../../../services/integrations/ci-cd/connections/jenkins-connection.service";

export const verifyJenkinsConnection = async (req: Request, res: Response): Promise<any> => {
  const { hostUrl, username, apiToken, useCrumb = true, crumbPath = "/crumbIssuer/api/json" } = req.body;

  const hasAllRequired = !!hostUrl && !!username && !!apiToken;
  if (!hasAllRequired) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ verified: false, message: ERROR_MESSAGES.JENKINS_VERIFY_REQUIRED });
  }

  try {
    const service = new JenkinsConnectionService();
    const result = await service.verifyConnection({ hostUrl, username, apiToken, useCrumb, crumbPath });
    if (!result.isValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ verified: false, message: result.message });
    }
    return res.status(HTTP_STATUS.OK).json({ verified: result.isValid, message: result.message });
  } catch {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ verified: false, message: ERROR_MESSAGES.JENKINS_VERIFY_FAILED });
  }
};

export const createJenkinsConnection = async (req: Request, res: Response): Promise<any> => {
  try {
    const tenantId: string = req.params.tenantId;
    const accountId: string = req.user?.id ?? 'id_0';
    const {
      displayName,
      hostUrl,
      username,
      apiToken,
      providerConfig = { useCrumb: true, crumbPath: PROVIDER_DEFAULTS.JENKINS_CRUMB_PATH },
    } = req.body;

    const missingRequired = !hostUrl || !username || !apiToken;
    if (missingRequired) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_CREATE_REQUIRED });
    }
    const service = new JenkinsConnectionService();
    const created = await service.create(tenantId, accountId, { displayName, hostUrl, username, apiToken, providerConfig });
    return res.status(HTTP_STATUS.CREATED).json({ success: RESPONSE_STATUS.SUCCESS, message: SUCCESS_MESSAGES.JENKINS_CREATED, integration: created });
  } catch (error: any) {
    const message = getErrorMessage(error, ERROR_MESSAGES.JENKINS_SAVE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, message });
  }
};

export const getJenkinsConnection = async (req: Request, res: Response): Promise<any> => {
  try {
    const tenantId: string = req.params.tenantId;
    const service = new JenkinsConnectionService();
    const integration = await service.get(tenantId);
    if (!integration) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_NOT_FOUND });
    }
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, integration });
  } catch (error: any) {
    const message = getErrorMessage(error, ERROR_MESSAGES.JENKINS_SAVE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const updateJenkinsConnection = async (req: Request, res: Response): Promise<any> => {
  try {
    const tenantId: string = req.params.tenantId;
    const updateData = req.body;
    const service = new JenkinsConnectionService();
    const updated = await service.update(tenantId, updateData);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, message: SUCCESS_MESSAGES.JENKINS_UPDATED, integration: updated });
  } catch (error: any) {
    const message = getErrorMessage(error, ERROR_MESSAGES.JENKINS_UPDATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, message });
  }
};

export const deleteJenkinsConnection = async (req: Request, res: Response): Promise<any> => {
  try {
    const tenantId: string = req.params.tenantId;
    const service = new JenkinsConnectionService();
    await service.delete(tenantId);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, message: SUCCESS_MESSAGES.JENKINS_DELETED });
  } catch (error: any) {
    const message = getErrorMessage(error, ERROR_MESSAGES.JENKINS_DELETE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, message });
  }
};


