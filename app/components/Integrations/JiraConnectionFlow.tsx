/**
 * Jira Project Management Connection Flow Component
 * Handles verification and connection of Jira integrations
 * 
 * Backend API: /projects/:projectId/integrations/project-management
 * Config: { baseUrl, email, apiToken, jiraType }
 */

import { useState } from 'react';
import { useParams } from '@remix-run/react';
import {
  TextInput,
  PasswordInput,
  Select,
  Stack,
  Text
} from '@mantine/core';
import { apiPost, apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { JIRA_TYPES } from '~/types/jira-integration';
import type { JiraType } from '~/types/jira-integration';
import { JIRA_LABELS, ALERT_MESSAGES, INTEGRATION_MODAL_LABELS } from '~/constants/integration-ui';
import { ActionButtons } from './shared/ActionButtons';
import { ConnectionAlert } from './shared/ConnectionAlert';

interface JiraConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  existingData?: any;
}

export function JiraConnectionFlow({ onConnect, onCancel, isEditMode = false, existingData }: JiraConnectionFlowProps) {
  const params = useParams();
  const tenantId = params.org;

  const [formData, setFormData] = useState({
    displayName: existingData?.displayName || existingData?.name || '',
    hostUrl: existingData?.hostUrl || existingData?.config?.hostUrl || '',
    email: existingData?.email || existingData?.config?.email || '',
    apiToken: '', // Never prefill sensitive data
    jiraType: (existingData?.jiraType || existingData?.config?.jiraType || 'CLOUD') as JiraType,
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerified, setIsVerified] = useState(!!existingData?.isVerified || isEditMode);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    setIsVerified(false);

    try {
      const result = await apiPost<{ verified: boolean }>(
        `/api/v1/tenants/${tenantId}/integrations/project-management/verify?providerType=JIRA`,
        {
          hostUrl: formData.hostUrl,
          email: formData.email,
          apiToken: formData.apiToken,
          jiraType: formData.jiraType,
        }
      );

      if (result.data?.verified || result.success) {
        setIsVerified(true);
      } else {
        setError(ALERT_MESSAGES.VERIFICATION_FAILED);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, ALERT_MESSAGES.VERIFICATION_FAILED));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const payload: any = {
        name: formData.displayName || `Jira - ${formData.hostUrl}`,
        hostUrl: formData.hostUrl,
        email: formData.email,
        jiraType: formData.jiraType,
      };

      // Only include apiToken if provided (required for create, optional for update)
      if (formData.apiToken) {
        payload.apiToken = formData.apiToken;
      } else if (!isEditMode) {
        setError('API Token is required');
        setIsConnecting(false);
        return;
      }

      // For updates, include integrationId as query parameter
      const endpoint = isEditMode && existingData?.id
        ? `/api/v1/tenants/${tenantId}/integrations/project-management?providerType=JIRA&integrationId=${existingData.id}`
        : `/api/v1/tenants/${tenantId}/integrations/project-management?providerType=JIRA`;
      
      const result = isEditMode && existingData?.id
        ? await apiPatch(endpoint, payload)
        : await apiPost(endpoint, payload);

      if (result.success) {
        onConnect(result);
      } else {
        setError(ALERT_MESSAGES.CONNECTION_FAILED);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, ALERT_MESSAGES.CONNECTION_FAILED));
    } finally {
      setIsConnecting(false);
    }
  };

  const isFormValid = () => {
    return formData.hostUrl && formData.email && (isEditMode || formData.apiToken);
  };

  return (
    <Stack gap="lg">
      {/* Header removed as it's in the modal title */}
      
      <TextInput
        label={JIRA_LABELS.DISPLAY_NAME_LABEL}
        placeholder={JIRA_LABELS.DISPLAY_NAME_PLACEHOLDER}
        value={formData.displayName}
        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
      />

      <Select
        label={JIRA_LABELS.JIRA_TYPE_LABEL}
        required
        value={formData.jiraType}
        onChange={(value) => setFormData({ ...formData, jiraType: value as JiraType })}
        data={JIRA_TYPES.map(type => ({
          value: type.value,
          label: type.label,
        }))}
        description={JIRA_LABELS.JIRA_TYPE_DESCRIPTION}
      />

      <TextInput
        label={JIRA_LABELS.BASE_URL_LABEL}
        placeholder={formData.jiraType === 'CLOUD' ? JIRA_LABELS.BASE_URL_PLACEHOLDER_CLOUD : JIRA_LABELS.BASE_URL_PLACEHOLDER_SERVER}
        required
        value={formData.hostUrl}
        onChange={(e) => setFormData({ ...formData, hostUrl: e.target.value })}
        error={!formData.hostUrl && 'Base URL is required'}
        description={formData.jiraType === 'CLOUD' ? JIRA_LABELS.CLOUD_URL_DESCRIPTION : JIRA_LABELS.SERVER_URL_DESCRIPTION}
      />

      <TextInput
        label={JIRA_LABELS.EMAIL_LABEL}
        placeholder={JIRA_LABELS.EMAIL_PLACEHOLDER}
        type="email"
        required
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={!formData.email && 'Email is required'}
        description={JIRA_LABELS.EMAIL_DESCRIPTION}
      />

      <PasswordInput
        label={isEditMode ? `${JIRA_LABELS.API_TOKEN_LABEL} (leave blank to keep existing)` : JIRA_LABELS.API_TOKEN_LABEL}
        placeholder={isEditMode ? 'Leave blank to keep existing token' : JIRA_LABELS.API_TOKEN_PLACEHOLDER}
        required={!isEditMode}
        value={formData.apiToken}
        onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
        error={!isEditMode && !formData.apiToken && 'API Token is required'}
        description={isEditMode ? 'Only provide a new token if you want to update it' : JIRA_LABELS.API_TOKEN_DESCRIPTION}
      />

      {error && (
        <ConnectionAlert color="red" title="Error">
          {error}
        </ConnectionAlert>
      )}

      {isVerified && (
        <ConnectionAlert color="green" title={ALERT_MESSAGES.VERIFICATION_SUCCESS}>
          {JIRA_LABELS.VERIFIED_MESSAGE}
        </ConnectionAlert>
      )}

      {!isVerified ? (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleVerify}
          primaryLabel={JIRA_LABELS.VERIFY_CREDENTIALS}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isVerifying}
          isPrimaryDisabled={!isFormValid()}
          isCancelDisabled={isVerifying || isConnecting}
          primaryClassName="bg-gray-600 hover:bg-gray-700"
        />
      ) : (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleConnect}
          primaryLabel={isEditMode ? 'Save Changes' : JIRA_LABELS.CONNECT_JIRA}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isConnecting}
          isCancelDisabled={isVerifying || isConnecting}
          primaryClassName="bg-green-600 hover:bg-green-700"
        />
      )}

      <Text size="xs" c="dimmed">
        <strong>{JIRA_LABELS.FOR_CLOUD}</strong>{' '}
        <a
          href="https://id.atlassian.com/manage-profile/security/api-tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {JIRA_LABELS.ATLASSIAN_SETTINGS}
        </a>
      </Text>
    </Stack>
  );
}
