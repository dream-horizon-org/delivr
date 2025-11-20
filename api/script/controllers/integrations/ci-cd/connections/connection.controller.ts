import { Request, Response } from "express";
import { HTTP_STATUS, RESPONSE_STATUS } from "../../../../constants/http";
import { ERROR_MESSAGES } from "../constants";
import { getErrorMessage } from "../../../../utils/cicd";
import { getStorage } from "../../../../storage/storage-instance";
import type { CICDIntegrationRepository } from "~models/integrations/ci-cd/connection/connection.repository";
import type { TenantCICDIntegration, UpdateCICDIntegrationDto, SafeCICDIntegration } from "~types/integrations/ci-cd/connection.interface";
import { CICDProviderType, VerificationStatus } from "~types/integrations/ci-cd/connection.interface";
import { getConnectionAdapter } from "./connection-adapter.utils";

const toSafe = (integration: TenantCICDIntegration): SafeCICDIntegration => {
  const { apiToken, headerValue, ...rest } = integration;
  return { ...rest };
};

export const getIntegrationById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const integrationId = req.params.integrationId;
  try {
    const storage = getStorage();
    const repo = (storage as any).cicdIntegrationRepository as CICDIntegrationRepository;
    const integration = await repo.findById(integrationId);
    const notFoundOrMismatch = !integration || integration.tenantId !== tenantId;
    if (notFoundOrMismatch) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, data: toSafe(integration) });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.FAILED_FETCH_GHA);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const updateIntegrationById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const integrationId = req.params.integrationId;
  const updateData = (req.body || {}) as UpdateCICDIntegrationDto;
  try {
    const storage = getStorage();
    const repo = (storage as any).cicdIntegrationRepository as CICDIntegrationRepository;
    const existing = await repo.findById(integrationId);
    const notFoundOrMismatch = !existing || existing.tenantId !== tenantId;
    if (notFoundOrMismatch) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }
    // Delegate verification decision and payload building to provider adapter
    const provider = existing.providerType;
    const adapter = getConnectionAdapter(provider);
    if (adapter.prepareVerifyOnUpdate) {
      const withSecrets = await repo.findById(integrationId);
      const secrets = { apiToken: (withSecrets && typeof (withSecrets as any).apiToken !== 'undefined') ? (withSecrets as any).apiToken as (string | null) : null };
      const prep = adapter.prepareVerifyOnUpdate({ existing, update: updateData, secrets });
      const shouldVerify = prep.shouldVerify;
      if (shouldVerify) {
        const hasMissingSecret = typeof prep.missingSecretMessage === 'string' && prep.missingSecretMessage.length > 0;
        if (hasMissingSecret) {
          updateData.verificationStatus = VerificationStatus.INVALID;
          updateData.lastVerifiedAt = new Date();
          updateData.verificationError = prep.missingSecretMessage || null;
        } else if (prep.body) {
          const verifyResult = await adapter.verify(prep.body);
          const isValid = verifyResult.isValid;
          updateData.verificationStatus = isValid ? VerificationStatus.VALID : VerificationStatus.INVALID;
          updateData.lastVerifiedAt = new Date();
          updateData.verificationError = isValid ? null : verifyResult.message;
        }
      }
    }

    const updated = await repo.update(integrationId, updateData);
    if (!updated) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.JENKINS_UPDATE_FAILED });
    }
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS, data: toSafe(updated) });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.JENKINS_UPDATE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const deleteIntegrationById = async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.params.tenantId;
  const integrationId = req.params.integrationId;
  try {
    const storage = getStorage();
    const repo = (storage as any).cicdIntegrationRepository as CICDIntegrationRepository;
    const existing = await repo.findById(integrationId);
    const notFoundOrMismatch = !existing || existing.tenantId !== tenantId;
    if (notFoundOrMismatch) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }
    await repo.delete(integrationId);
    return res.status(HTTP_STATUS.OK).json({ success: RESPONSE_STATUS.SUCCESS });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.JENKINS_DELETE_FAILED);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};

export const verifyConnectionByProvider = async (req: Request, res: Response): Promise<any> => {
  try {
    const providerType = String(req.params.providerType || '').toUpperCase().replace('-', '_') as keyof typeof CICDProviderType;
    const provider = CICDProviderType[providerType] as CICDProviderType | undefined;
    if (!provider) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ verified: false, message: ERROR_MESSAGES.OPERATION_NOT_SUPPORTED });
    }
    const adapter = getConnectionAdapter(provider);
    const result = await adapter.verify(req.body || {});
    const status = result.isValid ? HTTP_STATUS.OK : HTTP_STATUS.UNAUTHORIZED;
    return res.status(status).json({ verified: result.isValid, message: result.message });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.FAILED_VERIFY_GHA);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ verified: false, message });
  }
};

export const createConnectionByProvider = async (req: Request, res: Response): Promise<any> => {
  try {
    const tenantId = req.params.tenantId;
    const accountId: string = req.user?.id ?? 'id_0';
    const providerType = String(req.params.providerType || '').toUpperCase().replace('-', '_') as keyof typeof CICDProviderType;
    const provider = CICDProviderType[providerType] as CICDProviderType | undefined;
    if (!provider) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: RESPONSE_STATUS.FAILURE, error: ERROR_MESSAGES.OPERATION_NOT_SUPPORTED });
    }
    const adapter = getConnectionAdapter(provider);
    const created = await adapter.create(tenantId, accountId, req.body || {});
    return res.status(HTTP_STATUS.CREATED).json({ success: RESPONSE_STATUS.SUCCESS, integration: created });
  } catch (e: any) {
    const message = getErrorMessage(e, ERROR_MESSAGES.FAILED_SAVE_GHA);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: RESPONSE_STATUS.FAILURE, error: message });
  }
};


