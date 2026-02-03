/**
 * TestFlightVerificationSection Component
 * Handles TestFlight build verification for iOS
 */

import { Alert, Button, Stack, TextInput } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useVerifyTestFlight } from '~/hooks/useReleaseProcess';
import type { BuildUploadStage } from '~/types/release-process-enums';
import { Platform } from '~/types/release-process-enums';
import { handleStageError } from '~/utils/stage-error-handling';
import { showSuccessToast } from '~/utils/toast';
import type { BackendReleaseResponse } from '~/types/release-management.types';

interface TestFlightVerificationSectionProps {
  appId: string;
  releaseId: string;
  stage: BuildUploadStage;
  release?: BackendReleaseResponse;
  onUploadComplete?: (platform?: Platform) => void;
  onRefetchArtifacts: () => Promise<unknown>;
}

export function TestFlightVerificationSection({
  appId,
  releaseId,
  stage,
  release,
  onUploadComplete,
  onRefetchArtifacts,
}: TestFlightVerificationSectionProps) {
  const [testflightBuildNumber, setTestflightBuildNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const verifyTestFlightMutation = useVerifyTestFlight(appId, releaseId);

  const handleTestFlightVerify = useCallback(async () => {
    if (!testflightBuildNumber.trim()) {
      setValidationError('TestFlight build number is required');
      return;
    }

    setIsVerifying(true);
    setValidationError(null);

    try {
      await verifyTestFlightMutation.mutateAsync({
        stage,
        testflightBuildNumber: testflightBuildNumber.trim(),
      });

      showSuccessToast({ message: 'TestFlight build verified successfully' });
      setTestflightBuildNumber('');
      await onRefetchArtifacts();
      // Pass platform to onUploadComplete so parent can track it
      onUploadComplete?.(Platform.IOS);
    } catch (error) {
      const errorMessage = handleStageError(error, 'verify TestFlight build');
      setValidationError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  }, [testflightBuildNumber, stage, verifyTestFlightMutation, onRefetchArtifacts, onUploadComplete]);

  const canVerifyTestFlight =
    testflightBuildNumber.trim() &&
    !validationError &&
    !isVerifying;

  return (
    <Stack gap="md">
      <TextInput
        label="TestFlight Build Number"
        description="The build number shown in App Store Connect / TestFlight"
        placeholder="e.g., 17965"
        value={testflightBuildNumber}
        onChange={(e) => {
          setTestflightBuildNumber(e.target.value);
          setValidationError(null);
        }}
        disabled={isVerifying}
        required
      />

      {/* Error Alert */}
      {validationError && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          {validationError}
        </Alert>
      )}

      {/* Verify Button */}
      <Button
        leftSection={<IconCheck size={16} />}
        onClick={handleTestFlightVerify}
        disabled={!canVerifyTestFlight}
        loading={isVerifying}
        fullWidth
      >
        {isVerifying ? 'Verifying...' : 'Verify TestFlight Build'}
      </Button>
    </Stack>
  );
}

