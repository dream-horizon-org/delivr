/**
 * App Distribution Connection Flow
 * Handles Play Store and App Store connection
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Stack,
  Text,
  TextInput,
  Textarea,
  Button,
  Group,
  Alert,
  Select,
  Divider,
  Badge,
  Box,
  ThemeIcon,
  useMantineTheme,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconDeviceMobile } from '@tabler/icons-react';
import { apiPost, apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { extractApiErrorMessage } from '~/utils/api-error-utils';
import { trimIntegrationFields } from '~/utils/integration-helpers';
import type {
  StoreType,
  Platform,
  PlayStorePayload,
  AppStorePayload,
} from '~/types/distribution/app-distribution';
import { encrypt, isEncryptionConfigured } from '~/utils/encryption';
import { TARGET_PLATFORMS } from '~/types/release-config-constants';
import { DEBUG_LABELS } from '~/constants/integration-ui';
import { ConfirmationModal } from '~/components/Common/ConfirmationModal';
import { ConnectionAlert } from './shared/ConnectionAlert';
import { 
  mapPlayStoreFormData, 
  mapAppStoreFormData,
  validatePlayStoreData,
  validateAppStoreData 
} from '~/utils/integration-helpers';

interface AppDistributionConnectionFlowProps {
  storeType: StoreType;
  tenantId: string;
  onConnect: (data: any) => void;
  onCancel: () => void;
  allowedPlatforms: Platform[];
  isEditMode?: boolean;
  existingData?: any;
  onRequestClose?: (handler: () => void) => void; // Register close handler for modal close/outside click
}

export function AppDistributionConnectionFlow({
  storeType,
  tenantId,
  onConnect,
  onCancel,
  allowedPlatforms,
  isEditMode = false,
  existingData,
  onRequestClose,
}: AppDistributionConnectionFlowProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Platforms are fixed based on store type (from system metadata)
  // Validate that we have at least one platform from metadata
  console.log('existingData', existingData);
  const selectedPlatforms = allowedPlatforms;
  
  if (allowedPlatforms.length === 0) {
    console.error(`${DEBUG_LABELS.APP_DIST_PREFIX} ${DEBUG_LABELS.APP_DIST_NO_PLATFORMS}`);
  }

  // Initialize form data from existingData or empty
  const initialPlayStoreData = useMemo(
    () => (isEditMode && storeType === TARGET_PLATFORMS.PLAY_STORE 
      ? mapPlayStoreFormData(existingData) 
      : {}),
    [isEditMode, storeType, existingData]
  );

  const initialAppStoreData = useMemo(
    () => (isEditMode && storeType === TARGET_PLATFORMS.APP_STORE 
      ? mapAppStoreFormData(existingData) 
      : {}),
    [isEditMode, storeType, existingData]
  );

  // Form state (replacing draft storage)
  const [playStoreData, setPlayStoreData] = useState<Partial<PlayStorePayload>>(initialPlayStoreData);
  const [appStoreData, setAppStoreData] = useState<Partial<AppStorePayload>>(initialAppStoreData);

  // Store initial data for comparison
  const initialDataRef = useRef(
    storeType === TARGET_PLATFORMS.PLAY_STORE ? initialPlayStoreData : initialAppStoreData
  );

  // Update initial data ref when existingData changes
  useEffect(() => {
    if (storeType === TARGET_PLATFORMS.PLAY_STORE) {
      initialDataRef.current = initialPlayStoreData;
      setPlayStoreData(initialPlayStoreData);
    } else {
      initialDataRef.current = initialAppStoreData;
      setAppStoreData(initialAppStoreData);
    }
  }, [initialPlayStoreData, initialAppStoreData, storeType]);

  // Check encryption configuration on mount
  useEffect(() => {
    if (!isEncryptionConfigured()) {
      console.error('❌ VITE_ENCRYPTION_KEY is not configured!');
      setError('Encryption is not configured. Please contact your system administrator.');
    }
  }, []);

  // Deep comparison helper for form data
  const deepEqual = (obj1: any, obj2: any): boolean => {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  };

  // Check if form has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    const currentData = storeType === TARGET_PLATFORMS.PLAY_STORE ? playStoreData : appStoreData;
    return !deepEqual(currentData, initialDataRef.current);
  }, [playStoreData, appStoreData, storeType]);

  // Check if any Play Store credential has changed
  const hasPlayStoreCredentialChanged = useMemo((): boolean => {
    if (!isEditMode || storeType !== TARGET_PLATFORMS.PLAY_STORE) return false;
    const initial = initialDataRef.current as Partial<PlayStorePayload>;
    const current = playStoreData;
    
    const initialProjectId = initial.serviceAccountJson?.project_id || '';
    const initialClientEmail = initial.serviceAccountJson?.client_email || '';
    const initialPrivateKey = initial.serviceAccountJson?.private_key || '';
    
    const currentProjectId = current.serviceAccountJson?.project_id || '';
    const currentClientEmail = current.serviceAccountJson?.client_email || '';
    const currentPrivateKey = current.serviceAccountJson?.private_key || '';
    
    return !!(
      (currentProjectId.trim() && currentProjectId !== initialProjectId) ||
      (currentClientEmail.trim() && currentClientEmail !== initialClientEmail) ||
      (currentPrivateKey.trim() && currentPrivateKey !== initialPrivateKey)
    );
  }, [isEditMode, storeType, playStoreData]);

  // Check if any App Store credential has changed
  const hasAppStoreCredentialChanged = useMemo((): boolean => {
    if (!isEditMode || storeType !== TARGET_PLATFORMS.APP_STORE) return false;
    const initial = initialDataRef.current as Partial<AppStorePayload>;
    const current = appStoreData;
    
    const initialIssuerId = initial.issuerId || '';
    const initialKeyId = initial.keyId || '';
    const initialPrivateKeyPem = initial.privateKeyPem || '';
    
    const currentIssuerId = current.issuerId || '';
    const currentKeyId = current.keyId || '';
    const currentPrivateKeyPem = current.privateKeyPem || '';
    
    return !!(
      (currentIssuerId.trim() && currentIssuerId !== initialIssuerId) ||
      (currentKeyId.trim() && currentKeyId !== initialKeyId) ||
      (currentPrivateKeyPem.trim() && currentPrivateKeyPem !== initialPrivateKeyPem)
    );
  }, [isEditMode, storeType, appStoreData]);

  // Validation functions
  const isFormValid =
    storeType === TARGET_PLATFORMS.PLAY_STORE
      ? validatePlayStoreData(playStoreData, isEditMode, hasPlayStoreCredentialChanged)
      : validateAppStoreData(appStoreData, isEditMode, hasAppStoreCredentialChanged);

  // Handle cancel with confirmation
  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setShowConfirmModal(true);
    } else {
      onCancel();
    }
  };

  // Handle confirmation modal actions
  const handleConfirmClose = () => {
    setShowConfirmModal(false);
    onCancel(); // Close the modal
  };

  const handleContinueEditing = () => {
    setShowConfirmModal(false);
  };

  // Register close handler with parent (for modal close button/outside click)
  useEffect(() => {
    if (onRequestClose) {
      const closeHandler = () => {
        if (hasUnsavedChanges) {
          setShowConfirmModal(true);
        } else {
          onCancel(); // This will close the modal via parent
        }
      };
      onRequestClose(closeHandler);
    }
  }, [hasUnsavedChanges, onRequestClose, onCancel]);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      let payload: any;
      const platform = allowedPlatforms[0]; // Backend expects singular

      // Encrypt sensitive credentials before sending
      if (storeType === TARGET_PLATFORMS.PLAY_STORE) {
        const encryptedPrivateKey = await encrypt(playStoreData.serviceAccountJson?.private_key || '');
        payload = trimIntegrationFields({
          ...playStoreData,
          serviceAccountJson: {
            ...playStoreData.serviceAccountJson,
            type: 'service_account', // Required by backend validation
            private_key: encryptedPrivateKey,
            _encrypted: true, // Flag to indicate encryption
          },
        });
      } else {
        // App Store - encrypt privateKeyPem
        const encryptedPem = await encrypt(appStoreData.privateKeyPem || '');
        payload = trimIntegrationFields({
          ...appStoreData,
          privateKeyPem: encryptedPem,
        });
      }

      const endpoint = `/api/v1/tenants/${tenantId}/distributions?action=verify`;
      const requestBody = {
        storeType,
        platform,
        payload,
      };
      
      const result = await apiPost<{ verified: boolean; message?: string; details?: any }>(
        endpoint,
        requestBody
      );

      // BFF returns: {success: true, data: {verified: true, message: "..."}}
      if (result.success && result.data?.verified) {
        setIsVerified(true);
      } else {
        const errorMsg = result.data?.message 
          || extractApiErrorMessage(result.error, 'Verification failed');
        setError(errorMsg);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to verify credentials'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConnect = async () => {
    if (allowedPlatforms.length === 0) {
      setError('No platform configured for this store type');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let payload: any;
      const platform = allowedPlatforms[0]; // Backend expects singular

      // Encrypt sensitive credentials before sending (only for new connections or when credentials are updated)
      if (storeType === TARGET_PLATFORMS.PLAY_STORE) {
        // For Play Store
        if (playStoreData.serviceAccountJson?.private_key) {
          // Encrypt private key if provided
          const encryptedPrivateKey = await encrypt(playStoreData.serviceAccountJson.private_key);
          payload = trimIntegrationFields({
            ...playStoreData,
            serviceAccountJson: {
              ...playStoreData.serviceAccountJson,
              type: 'service_account', 
              private_key: encryptedPrivateKey,
              _encrypted: true, // Flag to indicate encryption
            },
          });
        } else {
          // In edit mode without new private key
          // Only include serviceAccountJson fields if they have values
          const { serviceAccountJson, ...restPlayStoreData } = playStoreData;
          payload = trimIntegrationFields({
            ...restPlayStoreData,
          });
          
          // Only include serviceAccountJson if it has non-empty fields (excluding private_key)
          if (serviceAccountJson) {
            const { private_key, ...restServiceAccount } = serviceAccountJson;
            const filteredServiceAccount: any = {};
            
            // Only include fields that have non-empty values
            if (restServiceAccount.project_id?.trim()) {
              filteredServiceAccount.project_id = restServiceAccount.project_id;
            }
            if (restServiceAccount.client_email?.trim()) {
              filteredServiceAccount.client_email = restServiceAccount.client_email;
            }
            if (restServiceAccount.type) {
              filteredServiceAccount.type = restServiceAccount.type;
            }
            
            // Only add serviceAccountJson if it has any fields
            if (Object.keys(filteredServiceAccount).length > 0) {
              payload.serviceAccountJson = filteredServiceAccount;
            }
          }
        }
      } else {
        // For App Store
        if (appStoreData.privateKeyPem) {
          // Encrypt privateKeyPem if provided
          const encryptedPem = await encrypt(appStoreData.privateKeyPem);
          payload = trimIntegrationFields({
            ...appStoreData,
            privateKeyPem: encryptedPem,
          });
        } else {
          // In edit mode without new privateKeyPem, only send fields that have values
          // Filter out empty strings for credential fields to avoid backend validation errors
          const { privateKeyPem, issuerId, keyId, ...restAppStoreData } = appStoreData;
          payload = trimIntegrationFields({
            ...restAppStoreData,
            // Only include credential fields if they have non-empty values
            ...(issuerId && issuerId.trim() && { issuerId }),
            ...(keyId && keyId.trim() && { keyId }),
          });
        }
      }

      let result;
      
      // Prepare payload logging (hide sensitive data)
      const logPayload = storeType === TARGET_PLATFORMS.PLAY_STORE
        ? {
            ...payload,
            serviceAccountJson: payload.serviceAccountJson
              ? {
                  ...payload.serviceAccountJson,
                  private_key: payload.serviceAccountJson.private_key
                    ? `[ENCRYPTED: ${payload.serviceAccountJson.private_key.length} chars]`
                    : '[NOT PROVIDED]',
                }
              : undefined,
          }
        : {
            ...payload,
            privateKeyPem: payload.privateKeyPem
              ? `[ENCRYPTED: ${payload.privateKeyPem.length} chars]`
              : '[NOT PROVIDED]',
          };
      
      if (isEditMode && existingData?.id) {
        // Update existing integration
        const endpoint = `/api/v1/tenants/${tenantId}/distributions?integrationId=${existingData.id}`;
        
        
        result = await apiPatch(endpoint, { payload });
      } else {
        // Create new integration
        const endpoint = `/api/v1/tenants/${tenantId}/distributions`;
        
        result = await apiPost(endpoint, {
          storeType,
          platform,
          payload,
        });
      }

      if (result.success) {
        console.log(`[${storeType}] ${isEditMode ? 'Update' : 'Connection'} successful`);
        onConnect(result);
      } else {
        setError(isEditMode ? 'Failed to update' : 'Failed to connect');
        setIsSaving(false);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, isEditMode ? 'Failed to update' : 'Failed to connect'));
      setIsSaving(false);
    }
  };

  const renderPlayStoreForm = () => (
    <Stack gap="md">
      <TextInput
        label="Display Name"
        placeholder="Play Store Integration"
        value={playStoreData.displayName}
        onChange={(e) =>
          setPlayStoreData({ ...playStoreData, displayName: e.target.value })
        }
        required
        size="sm"
        disabled={isVerified}
      />

      <TextInput
        label="App Package Name"
        placeholder="Enter your package name"
        value={playStoreData.appIdentifier}
        onChange={(e) =>
          setPlayStoreData({ ...playStoreData, appIdentifier: e.target.value })
        }
        required
        size="sm"
        disabled={isVerified}
      />

      <Select
        label="Default Track"
        data={[
          { value: 'INTERNAL', label: 'Internal Testing' },
          { value: 'ALPHA', label: 'Alpha' },
          { value: 'BETA', label: 'Beta' },
          { value: 'PRODUCTION', label: 'Production' },
        ]}
        value={playStoreData.defaultTrack}
        onChange={(val) =>
          setPlayStoreData({ ...playStoreData, defaultTrack: val as any })
        }
        required
        size="sm"
        disabled={isVerified}
      />

      <Divider label="Service Account Credentials" labelPosition="center" />

      {isEditMode && hasPlayStoreCredentialChanged && (
        <ConnectionAlert color="yellow" title="Credentials Changed">
          <Text size="sm">You've changed one or more credentials. All three credentials (Project ID, Client Email, and Private Key) are now required.</Text>
        </ConnectionAlert>
      )}

      <TextInput
        label={isEditMode && !hasPlayStoreCredentialChanged ? "Project ID (leave blank to keep existing)" : "Project ID"}
        placeholder={isEditMode && !hasPlayStoreCredentialChanged ? "Leave blank to keep existing" : "Enter your project ID"}
        value={playStoreData.serviceAccountJson?.project_id}
        onChange={(e) =>
          setPlayStoreData({
            ...playStoreData,
            serviceAccountJson: {
              ...playStoreData.serviceAccountJson!,
              project_id: e.target.value,
            },
          })
        }
        required={!isEditMode || !!hasPlayStoreCredentialChanged} 
        size="sm"
        disabled={isVerified}
        description={
          isEditMode 
            ? hasPlayStoreCredentialChanged 
              ? ''
              : 'Only provide a new project ID if you want to update it'
            : ''
        }
      />

      <TextInput
        label={isEditMode && !hasPlayStoreCredentialChanged ? "Client Email (leave blank to keep existing)" : "Client Email"}
        placeholder={isEditMode && !hasPlayStoreCredentialChanged ? "Leave blank to keep existing" : "Enter your service account email"}
        value={playStoreData.serviceAccountJson?.client_email}
        onChange={(e) =>
          setPlayStoreData({
            ...playStoreData,
            serviceAccountJson: {
              ...playStoreData.serviceAccountJson!,
              client_email: e.target.value,
            },
          })
        }
        required={!isEditMode || !!hasPlayStoreCredentialChanged} 
        size="sm"
        disabled={isVerified}
        description={
          isEditMode 
            ? hasPlayStoreCredentialChanged 
              ? ''
              : 'Only provide a new client email if you want to update it'
            : ''
        }
      />

      <Textarea
        label={isEditMode && !hasPlayStoreCredentialChanged ? "Private Key (leave blank to keep existing)" : "Private Key"}
        placeholder={`-----BEGIN PRIVATE KEY-----\\n.......\\n-----END PRIVATE KEY-----`}
        value={playStoreData.serviceAccountJson?.private_key}
        onChange={(e) =>
          setPlayStoreData({
            ...playStoreData,
            serviceAccountJson: {
              ...playStoreData.serviceAccountJson!,
              private_key: e.target.value,
            },
          })
        }
        required={!isEditMode || !!hasPlayStoreCredentialChanged} 
        minRows={4}
        size="sm"
        disabled={isVerified}
        description={
          isEditMode 
            ? hasPlayStoreCredentialChanged
              ? 'Paste the complete private key from your .pem file, including the BEGIN and END markers'
              : 'Only provide a new private key if you want to update it'
            : 'Paste the complete private key from your .pem file, including the BEGIN and END markers'
        }
      />
    </Stack>
  );

  const renderAppStoreForm = () => (
    <Stack gap="md">
      <TextInput
        label="Display Name"
        placeholder="App Store Integration"
        value={appStoreData.displayName}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, displayName: e.target.value })
        }
        required
        size="sm"
        disabled={isVerified}
      />

      <TextInput
        label="App ID"
        placeholder="Enter your App ID"
        value={appStoreData.targetAppId}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, targetAppId: e.target.value })
        }
        required
        size="sm"
        disabled={isVerified}
      />

      <TextInput
        label="Bundle ID"
        placeholder="com.example.app"
        value={appStoreData.appIdentifier}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, appIdentifier: e.target.value })
        }
        required
        size="sm"
        disabled={isVerified}
      />

      <TextInput
        label="Team Name"
        placeholder="Enter your team name"
        value={appStoreData.teamName}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, teamName: e.target.value })
        }
        required
        size="sm"
        disabled={isVerified}
      />

      <Divider label="App Store Connect API Credentials" labelPosition="center" />

      {isEditMode && hasAppStoreCredentialChanged && (
        <ConnectionAlert color="yellow" title="Credentials Changed">
          <Text size="sm">You've changed one or more credentials. All three credentials (Issuer ID, Key ID, and Private Key) are now required.</Text>
        </ConnectionAlert>
      )}

      <TextInput
        label={isEditMode && !hasAppStoreCredentialChanged ? "Issuer ID (leave blank to keep existing)" : "Issuer ID"}
        placeholder={isEditMode && !hasAppStoreCredentialChanged ? "Leave blank to keep existing" : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
        value={appStoreData.issuerId}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, issuerId: e.target.value })
        }
        required={!isEditMode || !!hasAppStoreCredentialChanged} 
        size="sm"
        disabled={isVerified}
        description={
          isEditMode 
            ? hasAppStoreCredentialChanged 
              ? ''
              : 'Only provide a new issuer ID if you want to update it'
            : ''
        }
      />

      <TextInput
        label={isEditMode && !hasAppStoreCredentialChanged ? "Key ID (leave blank to keep existing)" : "Key ID"}
        placeholder={isEditMode && !hasAppStoreCredentialChanged ? "Leave blank to keep existing" : "XXXXXXXXXX"}
        value={appStoreData.keyId}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, keyId: e.target.value })
        }
        required={!isEditMode || !!hasAppStoreCredentialChanged} 
        size="sm"
        disabled={isVerified}
        description={
          isEditMode 
            ? hasAppStoreCredentialChanged 
              ? ''
              : 'Only provide a new key ID if you want to update it'
            : ''
        }
      />

      <Textarea
        label={isEditMode && !hasAppStoreCredentialChanged ? "Private Key (PEM) (leave blank to keep existing)" : "Private Key (PEM)"}
        placeholder={`-----BEGIN PRIVATE KEY-----\\n.......\\n-----END PRIVATE KEY-----`}
        value={appStoreData.privateKeyPem}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, privateKeyPem: e.target.value })
        }
        required={!isEditMode || !!hasAppStoreCredentialChanged} 
        minRows={4}
        size="sm"
        disabled={isVerified}
        description={
          isEditMode 
            ? hasAppStoreCredentialChanged
              ? 'Paste the complete private key from your .p8 file, including the BEGIN and END markers'
              : 'Only provide a new private key if you want to update it'
            : 'Paste the complete private key from your .p8 file, including the BEGIN and END markers'
        }
      />

      <TextInput
        label="Default Locale"
        placeholder="en-US"
        value={appStoreData.defaultLocale}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, defaultLocale: e.target.value })
        }
        size="sm"
      />
    </Stack>
  );

  const theme = useMantineTheme();

  return (
    <>
      <ConfirmationModal
        opened={showConfirmModal}
        onClose={handleContinueEditing}
        onConfirm={handleConfirmClose}
        title="Unsaved Changes"
        message="You have unsaved changes. Your progress may be lost. Do you want to continue editing or close?"
        confirmLabel="Close"
        cancelLabel="Continue Editing"
        confirmColor="red"
      />
      <Stack gap="lg">
      {/* Platform Information */}
      {allowedPlatforms.length === 0 ? (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color="red"
          variant="light"
          radius="md"
        >
          No platforms configured for this store type. Please contact support.
        </Alert>
      ) : (
        <Box
          p="md"
          style={{
            backgroundColor: theme.colors.brand[0],
            borderRadius: theme.radius.md,
            border: `1px solid ${theme.colors.brand[2]}`,
          }}
        >
          <Group gap="sm">
            <Badge size="md" variant="light" color="brand">
              Platform: {allowedPlatforms[0]}
            </Badge>
            <Badge size="md" variant="light" color="brand">
              Target: {storeType === TARGET_PLATFORMS.PLAY_STORE ? 'Play Store' : 'App Store'}
            </Badge>
          </Group>
        </Box>
      )}

      {/* Form */}
      {storeType === TARGET_PLATFORMS.PLAY_STORE ? renderPlayStoreForm() : renderAppStoreForm()}

      {/* Error */}
      {error && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color="red" 
          title="Error"
          onClose={() => setError(null)}
          withCloseButton
          variant="light"
          radius="md"
        >
          {error}
        </Alert>
      )}

      {/* Success */}
      {isVerified && (
        <Alert 
          icon={<IconCheck size={16} />} 
          color="green"
          variant="light"
          radius="md"
        >
          Credentials verified successfully! Click "Connect" to save.
        </Alert>
      )}

      {/* Actions */}
      <Group justify="flex-end" gap="sm">
        <Button 
          variant="default" 
          onClick={handleCancelClick} 
          disabled={isVerifying || isSaving}
          size="sm"
        >
          Cancel
        </Button>
        {isEditMode ? (
          // In edit mode, show "Save Changes" button directly
          <Button 
            onClick={handleConnect} 
            loading={isSaving} 
            color="brand"
            disabled={!isFormValid || allowedPlatforms.length === 0}
            size="sm"
          >
            Save Changes
          </Button>
        ) : (
          // In create mode, show verify then connect flow
          !isVerified ? (
            <Button 
              onClick={handleVerify} 
              loading={isVerifying}
              disabled={!isFormValid || allowedPlatforms.length === 0}
              color="brand"
              size="sm"
            >
              Verify Credentials
            </Button>
          ) : (
            <Button 
              onClick={handleConnect} 
              loading={isSaving} 
              color="green"
              disabled={allowedPlatforms.length === 0}
              size="sm"
            >
              Connect
            </Button>
          )
        )}
      </Group>
    </Stack>
    </>
  );
}

