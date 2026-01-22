/**
 * ManualBuildUploadHeader Component
 * Displays the header section of ManualBuildUploadWidget
 * Shows title, badges, and platform information
 */

import { Group, Text } from '@mantine/core';
import { PLATFORMS } from '~/types/release-config-constants';
import { Platform, TaskType } from '~/types/release-process-enums';
import { AppBadge, PlatformBadge } from '~/components/Common/AppBadge';

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
          <AppBadge
            type="store-type"
            value="TESTFLIGHT"
            title="TestFlight"
            size="sm"
          />
        </>
      ) : (
        <>
          <Text fw={600} size="sm">Upload</Text>
          {getFileExtension() && (
            <AppBadge
              type="status"
              value="info"
              title={getFileExtension()}
              size="sm"
              color={fixedPlatform === PLATFORMS.ANDROID ? 'green' : 'blue'}
            />
          )}
          {fixedPlatform && (
            <PlatformBadge platform={fixedPlatform} size="sm" />
          )}
        </>
      )}
    </Group>
  );
}

