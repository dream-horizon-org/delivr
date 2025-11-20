/**
 * App Distribution Connection Flow
 * Handles Play Store and App Store connection
 */

import { useState } from 'react';
import {
  Stack,
  Text,
  TextInput,
  Textarea,
  Button,
  Group,
  Alert,
  Loader,
  Select,
  Checkbox,
  Divider,
} from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import type {
  StoreType,
  Platform,
  PlayStorePayload,
  AppStorePayload,
} from '~/types/app-distribution';

interface AppDistributionConnectionFlowProps {
  storeType: StoreType;
  tenantId: string;
  onConnect: (data: any) => void;
  onCancel: () => void;
  allowedPlatforms: Platform[];
}

export function AppDistributionConnectionFlow({
  storeType,
  tenantId,
  onConnect,
  onCancel,
  allowedPlatforms,
}: AppDistributionConnectionFlowProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(
    allowedPlatforms.length === 1 ? allowedPlatforms : []
  );

  // Play Store form state
  const [playStoreData, setPlayStoreData] = useState<Partial<PlayStorePayload>>({
    displayName: '',
    appIdentifier: '',
    defaultTrack: 'internal',
    serviceAccountJson: {
      type: 'service_account',
      project_id: '',
      client_email: '',
      private_key: '',
    },
  });

  // App Store form state
  const [appStoreData, setAppStoreData] = useState<Partial<AppStorePayload>>({
    displayName: '',
    targetAppId: '',
    appIdentifier: '',
    issuerId: '',
    keyId: '',
    privateKeyPem: '',
    teamName: '',
    defaultLocale: 'en-US',
  });

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      const payload = storeType === 'play_store' ? playStoreData : appStoreData;

      const response = await fetch(
        `/api/v1/tenants/${tenantId}/distributions?action=verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeType,
            tenantId,
            payload,
          }),
        }
      );

      const result = await response.json();

      if (result.success && result.verified) {
        setIsVerified(true);
      } else {
        setError(result.error || result.message || 'Verification failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify credentials');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConnect = async () => {
    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = storeType === 'play_store' ? playStoreData : appStoreData;

      const response = await fetch(`/api/v1/tenants/${tenantId}/distributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeType,
          tenantId,
          platforms: selectedPlatforms,
          payload,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onConnect(result);
      } else {
        setError(result.error || 'Failed to connect');
        setIsSaving(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
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
          { value: 'internal', label: 'Internal Testing' },
          { value: 'alpha', label: 'Alpha' },
          { value: 'beta', label: 'Beta' },
          { value: 'production', label: 'Production' },
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
      <div>
        <Text fw={600} size="lg">
          Connect {storeType === 'play_store' ? 'Play Store' : 'App Store'}
        </Text>
        <Text size="sm" c="dimmed">
          Enter your credentials to connect your store
        </Text>
      </div>

      {/* Platform Selection */}
      {allowedPlatforms.length > 1 && (
        <div>
          <Text fw={500} size="sm" className="mb-2">
            Select Platforms
          </Text>
          <Group gap="sm">
            {allowedPlatforms.map((platform) => (
              <Checkbox
                key={platform}
                label={platform}
                checked={selectedPlatforms.includes(platform)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedPlatforms([...selectedPlatforms, platform]);
                  } else {
                    setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
                  }
                }}
              />
            ))}
          </Group>
        </div>
      )}

      {/* Form */}
      {storeType === 'play_store' ? renderPlayStoreForm() : renderAppStoreForm()}

      {/* Error */}
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
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
        {!isVerified ? (
          <Button onClick={handleVerify} loading={isVerifying}>
            Verify Credentials
          </Button>
        ) : (
          <Button onClick={handleConnect} loading={isSaving} color="green">
            Connect
          </Button>
        )}
      </Group>
    </Stack>
  );
}

