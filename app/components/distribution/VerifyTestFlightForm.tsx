/**
 * VerifyTestFlightForm - Form to verify iOS TestFlight builds
 * 
 * Features:
 * - Input for TestFlight build number
 * - Version validation
 * - Verification status feedback
 */

import { useState, useCallback, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import { 
  Stack, 
  Group, 
  Text, 
  Button, 
  TextInput,
  Alert,
  Paper,
} from '@mantine/core';
import { IconCheck, IconAlertCircle, IconBrandApple } from '@tabler/icons-react';
import { 
  BUTTON_LABELS,
  VALIDATION_RULES,
} from '~/constants/distribution.constants';
import type { BuildOperationResponse } from '~/types/distribution.types';
import type { VerifyTestFlightFormProps } from './distribution.types';

// ============================================================================
// HELPER HOOKS
// ============================================================================

function useVerifyState() {
  const [buildNumber, setBuildNumber] = useState('');
  const [versionName, setVersionName] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    buildNumber?: string;
    versionName?: string;
  }>({});
  
  const fetcher = useFetcher<BuildOperationResponse>();
  
  const isVerifying = fetcher.state === 'submitting';
  const verifyError = fetcher.data?.error?.message ?? null;
  const verifySuccess = fetcher.data?.success === true;

  const validate = useCallback((): boolean => {
    const errors: { buildNumber?: string; versionName?: string } = {};
    
    // Validate build number
    if (!buildNumber.trim()) {
      errors.buildNumber = 'Build number is required';
    } else if (!VALIDATION_RULES.TESTFLIGHT_BUILD_NUMBER.PATTERN.test(buildNumber)) {
      errors.buildNumber = 'Build number must be numeric';
    }
    
    // Validate version name
    if (!versionName.trim()) {
      errors.versionName = 'Version name is required';
    } else if (!VALIDATION_RULES.VERSION_NAME.PATTERN.test(versionName)) {
      errors.versionName = `Version must match format ${VALIDATION_RULES.VERSION_NAME.EXAMPLE}`;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [buildNumber, versionName]);

  const clearForm = useCallback(() => {
    setBuildNumber('');
    setVersionName('');
    setValidationErrors({});
  }, []);

  return {
    buildNumber,
    setBuildNumber,
    versionName,
    setVersionName,
    validationErrors,
    isVerifying,
    verifyError,
    verifySuccess,
    fetcher,
    validate,
    clearForm,
  };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function VerificationSuccess({ buildNumber, versionName }: { buildNumber: string; versionName: string }) {
  return (
    <Paper p="md" withBorder radius="md" className="border-green-500 bg-green-50">
      <Group gap="sm">
        <IconCheck size={24} className="text-green-600" />
        <div>
          <Text fw={500} c="green.7">TestFlight Build Verified</Text>
          <Text size="sm" c="dimmed">
            Build #{buildNumber} (v{versionName}) is ready for App Store submission.
          </Text>
        </div>
      </Group>
    </Paper>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VerifyTestFlightForm(props: VerifyTestFlightFormProps) {
  const { 
    releaseId, 
    expectedVersion,
    onVerifyComplete, 
    onVerifyError, 
    onClose,
    className,
  } = props;

  const {
    buildNumber,
    setBuildNumber,
    versionName,
    setVersionName,
    validationErrors,
    isVerifying,
    verifyError,
    verifySuccess,
    fetcher,
    validate,
  } = useVerifyState();

  // Pre-fill expected version if provided
  useEffect(() => {
    if (expectedVersion && !versionName) {
      setVersionName(expectedVersion);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedVersion]);

  // Handle verification submission
  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const formData = new FormData();
    formData.append('_action', 'verify-testflight');
    formData.append('testflightBuildNumber', buildNumber);
    formData.append('versionName', versionName);

    fetcher.submit(formData, { method: 'post' });
  }, [buildNumber, versionName, fetcher, validate]);

  // Handle success/error callbacks
  if (verifySuccess && onVerifyComplete && fetcher.data?.data) {
    onVerifyComplete(fetcher.data.data);
  }

  if (verifyError && onVerifyError) {
    onVerifyError(verifyError);
  }

  return (
    <Stack gap="md" className={className}>
      {/* Header Info */}
      <Paper p="md" withBorder radius="md" bg="blue.0">
        <Group gap="sm">
          <IconBrandApple size={24} className="text-blue-600" />
          <div>
            <Text fw={500}>Verify TestFlight Build</Text>
            <Text size="sm" c="dimmed">
              Enter the TestFlight build number to verify it exists and is ready for App Store submission.
            </Text>
          </div>
        </Group>
      </Paper>

      {/* Error Alert */}
      {verifyError && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color="red" 
          title="Verification Failed"
          variant="light"
        >
          {verifyError}
        </Alert>
      )}

      {/* Success State */}
      {verifySuccess && (
        <VerificationSuccess buildNumber={buildNumber} versionName={versionName} />
      )}

      {/* Form Fields */}
      {!verifySuccess && (
        <>
          <TextInput
            label="TestFlight Build Number"
            description="The build number shown in App Store Connect / TestFlight"
            placeholder="e.g., 17965"
            value={buildNumber}
            onChange={(e) => setBuildNumber(e.target.value)}
            error={validationErrors.buildNumber}
            disabled={isVerifying}
            required
            data-autofocus
          />

          <TextInput
            label="Version Name"
            description="The version string (must match release version)"
            placeholder={VALIDATION_RULES.VERSION_NAME.EXAMPLE}
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            error={validationErrors.versionName}
            disabled={isVerifying}
            required
          />

          {/* Action Buttons */}
          <Group justify="flex-end" mt="md">
            {onClose && (
              <Button 
                variant="subtle" 
                onClick={onClose}
                disabled={isVerifying}
              >
                {BUTTON_LABELS.CANCEL}
              </Button>
            )}
            
            <Button
              onClick={handleSubmit}
              loading={isVerifying}
              leftSection={<IconCheck size={16} />}
            >
              {BUTTON_LABELS.VERIFY}
            </Button>
          </Group>
        </>
      )}

      {/* Close button after success */}
      {verifySuccess && onClose && (
        <Group justify="flex-end">
          <Button onClick={onClose}>{BUTTON_LABELS.CLOSE}</Button>
        </Group>
      )}
    </Stack>
  );
}

