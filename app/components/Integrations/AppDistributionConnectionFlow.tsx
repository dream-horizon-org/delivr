/**
 * App Distribution Connection Flow
 * Handles Play Store and App Store connection with auto-save draft support
 */

import { useState, useEffect, useRef } from 'react';
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
  Card,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconDeviceMobile } from '@tabler/icons-react';
import { apiPost, apiPatch, getApiErrorMessage } from '~/utils/api-client';
import type {
  StoreType,
  Platform,
  PlayStorePayload,
  AppStorePayload,
} from '~/types/app-distribution';
import { encrypt, isEncryptionConfigured } from '~/utils/encryption';
import { TARGET_PLATFORMS } from '~/types/release-config-constants';
import { DEBUG_LABELS } from '~/constants/integration-ui';
import { useDraftStorage, generateStorageKey } from '~/hooks/useDraftStorage';
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
}

export function AppDistributionConnectionFlow({
  storeType,
  tenantId,
  onConnect,
  onCancel,
  allowedPlatforms,
  isEditMode = false,
  existingData,
}: AppDistributionConnectionFlowProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Platforms are fixed based on store type (from system metadata)
  // Validate that we have at least one platform from metadata
  console.log('existingData', existingData);
  const selectedPlatforms = allowedPlatforms;
  
  if (allowedPlatforms.length === 0) {
    console.error(`${DEBUG_LABELS.APP_DIST_PREFIX} ${DEBUG_LABELS.APP_DIST_NO_PLATFORMS}`);
  }

  // Play Store draft storage with auto-save
  // Ref to track if we're in the middle of verify/connect flow
  const isInFlowRef = useRef(false);

  const playStoreDraft = useDraftStorage<Partial<PlayStorePayload>>(
    {
      storageKey: generateStorageKey('playstore', tenantId),
      sensitiveFields: ['serviceAccountJson.private_key'],
      // Only save draft if NOT in verify/connect flow and NOT in edit mode
      shouldSaveDraft: (data) => !isInFlowRef.current && !isEditMode && !!(data.displayName || data.appIdentifier),
    },
    mapPlayStoreFormData(existingData),
    isEditMode ? existingData : undefined // Pass existingData to hook to prioritize over draft in edit mode
  );

  // App Store draft storage with auto-save
  const appStoreDraft = useDraftStorage<Partial<AppStorePayload>>(
    {
      storageKey: generateStorageKey('appstore', tenantId),
      sensitiveFields: ['privateKeyPem'],
      // Only save draft if NOT in verify/connect flow and NOT in edit mode
      shouldSaveDraft: (data) => !isInFlowRef.current && !isEditMode && !!(data.displayName || data.appIdentifier),
    },
    mapAppStoreFormData(existingData),
    isEditMode ? existingData : undefined // Pass existingData to hook to prioritize over draft in edit mode
  );

  // Select the appropriate draft based on store type
  const { formData, setFormData, isDraftRestored, markSaveSuccessful } =
    storeType === TARGET_PLATFORMS.PLAY_STORE ? playStoreDraft : appStoreDraft;

  // Type-safe accessors for form data
  const playStoreData = formData as Partial<PlayStorePayload>;
  const appStoreData = formData as Partial<AppStorePayload>;
  const setPlayStoreData = setFormData as typeof playStoreDraft.setFormData;
  const setAppStoreData = setFormData as typeof appStoreDraft.setFormData;

  // Check encryption configuration on mount
  useEffect(() => {
    if (!isEncryptionConfigured()) {
      console.error('❌ VITE_ENCRYPTION_KEY is not configured!');
      setError('Encryption is not configured. Please contact your system administrator.');
    }
  }, []);

  // Validation functions
  const isFormValid =
    storeType === TARGET_PLATFORMS.PLAY_STORE
      ? validatePlayStoreData(playStoreData, isEditMode)
      : validateAppStoreData(appStoreData, isEditMode);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    isInFlowRef.current = true; // Prevent draft save during verify

    try {
      let payload: any;
      const platform = allowedPlatforms[0]; // Backend expects singular

      // Encrypt sensitive credentials before sending
      if (storeType === TARGET_PLATFORMS.PLAY_STORE) {
        const encryptedPrivateKey = await encrypt(playStoreData.serviceAccountJson?.private_key || '');
        payload = {
          ...playStoreData,
          serviceAccountJson: {
            ...playStoreData.serviceAccountJson,
            private_key: encryptedPrivateKey,
            _encrypted: true, // Flag to indicate encryption
          },
        };
      } else {
        // App Store - encrypt privateKeyPem
        const encryptedPem = await encrypt(appStoreData.privateKeyPem || '');
        payload = {
          ...appStoreData,
          privateKeyPem: encryptedPem,
        };
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
        // Keep isInFlowRef.current = true until Connect is clicked
      } else {
        const errorMsg = result.data?.message || result.error || 'Verification failed';
        setError(errorMsg);
        isInFlowRef.current = false; // Reset flag on verification failure
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to verify credentials'));
      isInFlowRef.current = false; // Reset flag on error
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
          payload = {
            ...playStoreData,
            serviceAccountJson: {
              ...playStoreData.serviceAccountJson,
              private_key: encryptedPrivateKey,
              _encrypted: true, // Flag to indicate encryption
            },
          };
        } else {
          // In edit mode without new private key
          payload = {
            displayName: playStoreData.displayName,
            appIdentifier: playStoreData.appIdentifier,
            defaultTrack: playStoreData.defaultTrack,
          };
          // Only include serviceAccountJson fields if they exist (excluding private_key)
          if (playStoreData.serviceAccountJson) {
            const { private_key, ...restServiceAccount } = playStoreData.serviceAccountJson;
            if (Object.keys(restServiceAccount).length > 0) {
              payload.serviceAccountJson = restServiceAccount;
            }
          }
        }
      } else {
        // For App Store
        if (appStoreData.privateKeyPem) {
          // Encrypt privateKeyPem if provided
          const encryptedPem = await encrypt(appStoreData.privateKeyPem);
          payload = {
            ...appStoreData,
            privateKeyPem: encryptedPem,
          };
        } else {
          // In edit mode without new privateKeyPem, only send other fields
          const { privateKeyPem, ...restAppStoreData } = appStoreData;
          payload = restAppStoreData;
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
        // Mark connection as successful and clear draft
        markSaveSuccessful();
        isInFlowRef.current = false; // Reset flag after successful connect
        console.log(`[${storeType}] ${isEditMode ? 'Update' : 'Connection'} successful, draft cleared`);
        onConnect(result);
      } else {
        setError(isEditMode ? 'Failed to update' : 'Failed to connect');
        isInFlowRef.current = false; // Reset flag on connect failure
        setIsSaving(false);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, isEditMode ? 'Failed to update' : 'Failed to connect'));
      isInFlowRef.current = false; // Reset flag on error
      setIsSaving(false);
    }
  };

  const renderPlayStoreForm = () => (
    <Stack gap="md">
      <TextInput
        label="Display Name"
        placeholder="My Production Play Store"
        value={playStoreData.displayName}
        onChange={(e) =>
          setPlayStoreData({ ...playStoreData, displayName: e.target.value })
        }
        required
      />

      <TextInput
        label="App Package Name"
        placeholder="com.example.app"
        value={playStoreData.appIdentifier}
        onChange={(e) =>
          setPlayStoreData({ ...playStoreData, appIdentifier: e.target.value })
        }
        required
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
      />

      <Divider label="Service Account Credentials" />

      <TextInput
        label="Project ID"
        placeholder="your-project-id"
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
        required
      />

      <TextInput
        label="Client Email"
        placeholder="service-account@project.iam.gserviceaccount.com"
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
        required
      />

      <Textarea
        label="Private Key"
        placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
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
        required
        minRows={4}
      />
    </Stack>
  );

  const renderAppStoreForm = () => (
    <Stack gap="md">
      <TextInput
        label="Display Name"
        placeholder="My Production App Store"
        value={appStoreData.displayName}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, displayName: e.target.value })
        }
        required
      />

      <TextInput
        label="App ID"
        placeholder="1234567890"
        value={appStoreData.targetAppId}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, targetAppId: e.target.value })
        }
        required
      />

      <TextInput
        label="Bundle ID"
        placeholder="com.example.app"
        value={appStoreData.appIdentifier}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, appIdentifier: e.target.value })
        }
        required
      />

      <TextInput
        label="Team Name"
        placeholder="My Company Inc."
        value={appStoreData.teamName}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, teamName: e.target.value })
        }
        required
      />

      <Divider label="App Store Connect API Credentials" />

      <TextInput
        label="Issuer ID"
        placeholder="69a6de93-2dc1-47e3-e053-5b8c7c11a4d1"
        value={appStoreData.issuerId}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, issuerId: e.target.value })
        }
        required
      />

      <TextInput
        label="Key ID"
        placeholder="2S5FVTVKZ8"
        value={appStoreData.keyId}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, keyId: e.target.value })
        }
        required
      />

      <Textarea
        label="Private Key (PEM)"
        placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
        value={appStoreData.privateKeyPem}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, privateKeyPem: e.target.value })
        }
        required
        minRows={4}
      />

      <TextInput
        label="Default Locale"
        placeholder="en-US"
        value={appStoreData.defaultLocale}
        onChange={(e) =>
          setAppStoreData({ ...appStoreData, defaultLocale: e.target.value })
        }
      />
    </Stack>
  );

  return (
    <Stack gap="lg">
      {/* Draft Restored Alert */}
      {isDraftRestored && (
        <Alert icon={<IconCheck size={16} />} color="blue" title="Draft Restored">
          Your previously entered data has been restored. Note: Sensitive credentials (like private keys) are never saved for security.
        </Alert>
      )}
      
      {/* Platform Information */}
      {allowedPlatforms.length === 0 ? (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          No platforms configured for this store type. Please contact support.
        </Alert>
      ) : (
        <Card padding="md" radius="md" withBorder className="bg-blue-50 dark:bg-blue-950/20">
          <Group gap="md" align="center">
            <IconDeviceMobile size={24} className="text-blue-600" />
            <div className="flex-1">
              <Text size="sm" fw={500} className="mb-1">
                Target Platform{allowedPlatforms.length > 1 ? 's' : ''}
              </Text>
              <Group gap="xs">
                {allowedPlatforms.map((platform) => (
                  <Badge
                    key={platform}
                    size="lg"
                    variant="filled"
                    color="blue"
                    leftSection={<span>📱</span>}
                  >
                    {platform}
                  </Badge>
                ))}
              </Group>
            </div>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            {storeType === TARGET_PLATFORMS.PLAY_STORE 
              ? 'This integration will be used for Android app distribution via Google Play Store'
              : 'This integration will be used for iOS app distribution via Apple App Store'}
          </Text>
        </Card>
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
        >
          {error}
        </Alert>
      )}

      {/* Success */}
      {isVerified && (
        <Alert icon={<IconCheck size={16} />} color="green">
          Credentials verified successfully! Click "Connect" to save.
        </Alert>
      )}

      {/* Actions */}
      <Group justify="flex-end">
        <Button variant="subtle" onClick={onCancel} disabled={isVerifying || isSaving}>
          Cancel
        </Button>
        {isEditMode ? (
          // In edit mode, show "Save Changes" button directly
          <Button 
            onClick={handleConnect} 
            loading={isSaving} 
            color="blue"
            disabled={!isFormValid || allowedPlatforms.length === 0}
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
            >
              Verify Credentials
            </Button>
          ) : (
            <Button 
              onClick={handleConnect} 
              loading={isSaving} 
              color="green"
              disabled={allowedPlatforms.length === 0}
            >
              Connect
            </Button>
          )
        )}
      </Group>
    </Stack>
  );
}

