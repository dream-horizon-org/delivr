/**
 * Jenkins CI/CD Connection Flow Component
 * Handles verification and connection of Jenkins integrations
 */

import { useState } from 'react';
import { useParams } from '@remix-run/react';
import {
  TextInput,
  Alert,
  PasswordInput,
  Switch,
  Stack,
  Text
} from '@mantine/core';
import { apiPost, apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { BUILD_PROVIDERS } from '~/types/release-config-constants';
import { JENKINS_LABELS, ALERT_MESSAGES, INTEGRATION_MODAL_LABELS } from '~/constants/integration-ui';
import { ActionButtons } from './shared/ActionButtons';
import { ConnectionAlert } from './shared/ConnectionAlert';

interface JenkinsConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  existingData?: {
    id: string; // integrationId - required for updates
    displayName?: string;
    hostUrl?: string;
    username?: string;
    verificationStatus?: string;
    providerConfig?: {
      useCrumb?: boolean;
      crumbPath?: string;
    };
  };
}

export function JenkinsConnectionFlow({ onConnect, onCancel, isEditMode = false, existingData }: JenkinsConnectionFlowProps) {
  const params = useParams();
  const tenantId = params.org;

  const [formData, setFormData] = useState({
    displayName: existingData?.displayName || '',
    hostUrl: existingData?.hostUrl || '',
    username: existingData?.username || '',
    apiToken: '', // Never pre-populate sensitive data
    useCrumb: existingData?.providerConfig?.useCrumb ?? true,
    crumbPath: existingData?.providerConfig?.crumbPath || '/crumbIssuer/api/json'
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    setVerificationResult(null);

    try {
      const result = await apiPost<{ verified: boolean; message?: string }>(
        `/api/v1/tenants/${tenantId}/integrations/ci-cd/${BUILD_PROVIDERS.JENKINS.toLowerCase()}/verify`,
        {
          displayName: formData.displayName || undefined,
          hostUrl: formData.hostUrl,
          username: formData.username,
          apiToken: formData.apiToken,
          providerConfig: {
            useCrumb: formData.useCrumb,
            crumbPath: formData.crumbPath
          }
        }
      );

      if (result.data?.verified) {
        setVerificationResult({
          success: true,
          message: result.data.message || 'Jenkins connection verified successfully!'
        });
      } else {
        setVerificationResult({
          success: false,
          message: 'Failed to verify Jenkins connection'
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to verify Jenkins connection'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const payload: any = {
        displayName: formData.displayName || `${formData.hostUrl}`,
        hostUrl: formData.hostUrl,
        username: formData.username,
        providerConfig: {
          useCrumb: formData.useCrumb,
          crumbPath: formData.crumbPath
        }
      };

      // Only include apiToken if it's provided (required for create, optional for update)
      if (formData.apiToken) {
        payload.apiToken = formData.apiToken;
      } else if (!isEditMode) {
        setError('API Token is required');
        setIsConnecting(false);
        return;
      }

      // For updates, include integrationId so service layer knows to use new backend path
      if (isEditMode && existingData?.id) {
        payload.integrationId = existingData.id;
      }

      const endpoint = `/api/v1/tenants/${tenantId}/integrations/ci-cd/${BUILD_PROVIDERS.JENKINS.toLowerCase()}`;
      const result = isEditMode
        ? await apiPatch(endpoint, payload)
        : await apiPost(endpoint, payload);

      if (result.success) {
        onConnect(result);
      } else {
        setError(`Failed to ${isEditMode ? 'update' : 'connect'} Jenkins integration`);
      }
    } catch (err) {
      const action = isEditMode ? 'update' : 'connect';
      setError(getApiErrorMessage(err, `Failed to ${action} Jenkins integration`));
    } finally {
      setIsConnecting(false);
    }
  };

  // For edit mode, apiToken is optional. For create mode, it's required
  const isFormValid = formData.hostUrl && formData.username && (isEditMode || formData.apiToken);

  return (
    <Stack gap="md">
      <ConnectionAlert 
        color="blue" 
        title={isEditMode ? `${INTEGRATION_MODAL_LABELS.EDIT} ${JENKINS_LABELS.JENKINS_DETAILS}` : JENKINS_LABELS.JENKINS_DETAILS} 
        icon={<span>🔨</span>}
      >
        {isEditMode 
          ? 'Update your Jenkins server connection details.'
          : 'Connect your Jenkins server to trigger builds and track deployment pipelines.'}
      </ConnectionAlert>

      <TextInput
        label="Display Name (Optional)"
        placeholder="My Jenkins Server"
        value={formData.displayName}
        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
      />

      <TextInput
        label={JENKINS_LABELS.SERVER_URL_LABEL}
        placeholder={JENKINS_LABELS.SERVER_URL_PLACEHOLDER}
        required
        value={formData.hostUrl}
        onChange={(e) => setFormData({ ...formData, hostUrl: e.target.value })}
        error={!formData.hostUrl && 'Host URL is required'}
      />

      <TextInput
        label={JENKINS_LABELS.USERNAME_LABEL}
        placeholder={JENKINS_LABELS.USERNAME_PLACEHOLDER}
        required
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        error={!formData.username && 'Username is required'}
      />

      <PasswordInput
        label={isEditMode ? `${JENKINS_LABELS.API_TOKEN_LABEL} (leave blank to keep existing)` : JENKINS_LABELS.API_TOKEN_LABEL}
        placeholder={isEditMode ? "Leave blank to keep existing token" : JENKINS_LABELS.API_TOKEN_PLACEHOLDER}
        required={!isEditMode}
        value={formData.apiToken}
        onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
        error={!isEditMode && !formData.apiToken && 'API Token is required'}
        description={isEditMode ? "Only provide a new token if you want to update it" : undefined}
      />

      <Stack gap="xs">
        <Switch
          label="Use CSRF Protection (Recommended)"
          checked={formData.useCrumb}
          onChange={(e) => setFormData({ ...formData, useCrumb: e.currentTarget.checked })}
        />
        
        {formData.useCrumb && (
          <TextInput
            label="Crumb Path"
            placeholder="/crumbIssuer/api/json"
            value={formData.crumbPath}
            onChange={(e) => setFormData({ ...formData, crumbPath: e.target.value })}
            size="xs"
          />
        )}
      </Stack>

      {error && (
        <Alert color="red" title="Error" icon={<span>❌</span>}>
          {error}
        </Alert>
      )}

      {verificationResult && (
        <ConnectionAlert
          color={verificationResult.success ? 'green' : 'red'}
          title={verificationResult.success ? ALERT_MESSAGES.VERIFICATION_SUCCESS : ALERT_MESSAGES.VERIFICATION_FAILED}
          icon={<span>{verificationResult.success ? '✅' : '❌'}</span>}
        >
          {verificationResult.message}
        </ConnectionAlert>
      )}

      {!isEditMode ? (
        <>
          {!verificationResult?.success ? (
            <ActionButtons
              onCancel={onCancel}
              onPrimary={handleVerify}
              primaryLabel={JENKINS_LABELS.VERIFY_CONNECTION}
              cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
              isPrimaryLoading={isVerifying}
              isPrimaryDisabled={!isFormValid || isVerifying || isConnecting}
              primaryClassName="bg-gray-600 hover:bg-gray-700"
            />
          ) : (
            <ActionButtons
              onCancel={onCancel}
              onPrimary={handleConnect}
              primaryLabel={JENKINS_LABELS.CONNECT_JENKINS}
              cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
              isPrimaryLoading={isConnecting}
              isPrimaryDisabled={isConnecting}
            />
          )}
        </>
      ) : (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleConnect}
          primaryLabel="Update"
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isConnecting}
          isPrimaryDisabled={!isFormValid || isConnecting}
        />
      )}

      <Text size="xs" c="dimmed" className="mt-2">
        <strong>{JENKINS_LABELS.HOW_TO_GET_TOKEN}</strong> {JENKINS_LABELS.INSTRUCTIONS.join(' → ')}
      </Text>
    </Stack>
  );
}
