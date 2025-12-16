/**
 * TestFlightVerificationSection Component
 * Handles TestFlight build verification for iOS
 */

import { Alert, Button, Stack, TextInput } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useVerifyTestFlight } from '~/hooks/useReleaseProcess';
import type { BuildUploadStage } from '~/types/release-process-enums';
import { handleStageError } from '~/utils/stage-error-handling';
import { showSuccessToast } from '~/utils/toast';
import type { BackendReleaseResponse } from '~/types/release-management.types';

interface TestFlightVerificationSectionProps {
  tenantId: string;
  releaseId: string;
  stage: BuildUploadStage;
  release?: BackendReleaseResponse;
  onUploadComplete?: () => void;
  onRefetchArtifacts: () => Promise<unknown>;
}

export function TestFlightVerificationSection({
  tenantId,
  releaseId,
  stage,
  release,
  onUploadComplete,
  onRefetchArtifacts,
}: TestFlightVerificationSectionProps) {
  const [testflightBuildNumber, setTestflightBuildNumber] = useState('');
  const [versionName, setVersionName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const verifyTestFlightMutation = useVerifyTestFlight(tenantId, releaseId);

  // Pre-fill version from release if available
  useEffect(() => {
    if (release?.platformTargetMappings) {
      const iosMapping = release.platformTargetMappings.find(m => m.platform === 'IOS');
      if (iosMapping?.version && !versionName) {
        setVersionName(iosMapping.version);
      }
    }
  }, [release?.platformTargetMappings, versionName]);

  const handleTestFlightVerify = useCallback(async () => {
    if (!testflightBuildNumber.trim()) {
      setValidationError('TestFlight build number is required');
      return;
    }
    if (!versionName.trim()) {
      setValidationError('Version name is required');
      return;
    }

    setIsVerifying(true);
    setValidationError(null);

    try {
      await verifyTestFlightMutation.mutateAsync({
        stage,
        testflightBuildNumber: testflightBuildNumber.trim(),
        versionName: versionName.trim(),
      });

      showSuccessToast({ message: 'TestFlight build verified successfully' });
      setTestflightBuildNumber('');
      setVersionName('');
      await onRefetchArtifacts();
      onUploadComplete?.();
    } catch (error) {
      const errorMessage = handleStageError(error, 'verify TestFlight build');
      setValidationError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  }, [testflightBuildNumber, versionName, stage, verifyTestFlightMutation, onRefetchArtifacts, onUploadComplete]);

  const canVerifyTestFlight =
    testflightBuildNumber.trim() &&
    versionName.trim() &&
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

      <TextInput
        label="Version Name"
        description="The version string (must match release version)"
        placeholder="e.g., 6.5.0"
        value={versionName}
        onChange={(e) => {
          setVersionName(e.target.value);
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

