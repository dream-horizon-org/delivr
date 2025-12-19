/**
 * ManualBuildUploadHeader Component
 * Displays the header section of ManualBuildUploadWidget
 * Shows title, badges, and platform information
 */

import { Badge, Group, Text } from '@mantine/core';
import { PLATFORMS } from '~/types/release-config-constants';
import { Platform, TaskType } from '~/types/release-process-enums';

interface ManualBuildUploadHeaderProps {
  isTestFlightVerification: boolean;
  fixedPlatform?: Platform;
  taskType: TaskType;
}

export function ManualBuildUploadHeader({
  isTestFlightVerification,
  fixedPlatform,
  taskType,
}: ManualBuildUploadHeaderProps) {
  const getFileExtension = () => {
    if (isTestFlightVerification) return null;
    if (fixedPlatform === PLATFORMS.ANDROID) {
      // AAB build task uses .aab, others use .apk
      return taskType === TaskType.CREATE_AAB_BUILD ? '.aab' : '.apk';
    }
    if (fixedPlatform === PLATFORMS.IOS) return '.ipa';
    return null;
  };

  const getPlatformName = () => {
    if (isTestFlightVerification) return 'TestFlight';
    if (fixedPlatform === PLATFORMS.ANDROID) return 'Android';
    if (fixedPlatform === PLATFORMS.IOS) return 'iOS';
    if (fixedPlatform === Platform.WEB) return 'Web';
    return null;
  };

  return (
    <Group gap="xs" align="center">
      {isTestFlightVerification ? (
        <>
          <Text fw={600} size="sm">Verify</Text>
          <Badge size="sm" variant="light" color="blue">TestFlight</Badge>
        </>
      ) : (
        <>
          <Text fw={600} size="sm">Upload</Text>
          {getFileExtension() && (
            <Badge size="sm" variant="light" color={fixedPlatform === PLATFORMS.ANDROID ? 'green' : 'blue'}>
              {getFileExtension()}
            </Badge>
          )}
          {getPlatformName() && (
            <Text size="sm" c="dimmed">for {getPlatformName()}</Text>
          )}
        </>
      )}
    </Group>
  );
}

