/**
 * ArtifactDisplay - Shows pre-release artifact being promoted to production
 * 
 * Displays:
 * - Android: AAB file name, size, internal testing link
 * - iOS: TestFlight build number and link
 * 
 * This is READ-ONLY - no selection, just showing what will be promoted
 */

import {
  Alert,
  Badge,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconBrandAndroid,
  IconBrandApple,
  IconExternalLink,
  IconFileZip,
  IconRocket,
} from '@tabler/icons-react';
import {
  DIALOG_ICON_SIZES,
  DISTRIBUTION_UI_LABELS,
  PLATFORM_LABELS,
} from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';

type ArtifactDisplayProps = {
  platform: Platform;
  // Android specific
  artifactName?: string;
  artifactSize?: string;
  internalTrackLink?: string;  // Renamed from internalTestingLink
  // iOS specific
  buildNumber?: string;
  testflightLink?: string;
};

const PLATFORM_COLORS = {
  [Platform.ANDROID]: 'green',
  [Platform.IOS]: 'blue',
} as const;

const DEFAULT_ARTIFACT_NAME = 'app-release.aab';

export function ArtifactDisplay({
  platform,
  artifactName,
  artifactSize,
  internalTrackLink,  // Renamed from internalTestingLink
  buildNumber,
  testflightLink,
}: ArtifactDisplayProps) {
  const isAndroid = platform === Platform.ANDROID;
  const platformColor = PLATFORM_COLORS[platform];
  const platformLabel = PLATFORM_LABELS[platform];
  const displayArtifactName = artifactName || DEFAULT_ARTIFACT_NAME;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group>
          <ThemeIcon size="xl" variant="light" color={platformColor} radius="md">
            {isAndroid ? (
              <IconBrandAndroid size={DIALOG_ICON_SIZES.TITLE} />
            ) : (
              <IconBrandApple size={DIALOG_ICON_SIZES.TITLE} />
            )}
          </ThemeIcon>
          <div>
            <Text fw={600} size="lg">
              {DISTRIBUTION_UI_LABELS.ARTIFACT_TITLE(platformLabel)}
            </Text>
            <Text size="sm" c="dimmed">
              {DISTRIBUTION_UI_LABELS.FROM_PRERELEASE}
            </Text>
          </div>
        </Group>

        <Alert
          icon={<IconRocket size={DIALOG_ICON_SIZES.ALERT} />}
          title={DISTRIBUTION_UI_LABELS.PROMOTING_TO_PRODUCTION}
          color={platformColor}
          variant="light"
        >
          <Text size="sm">{DISTRIBUTION_UI_LABELS.ARTIFACT_TESTED_DESC}</Text>
        </Alert>

        {isAndroid ? (
          <>
            {/* Android Artifact */}
            <Group gap="xs">
              <IconFileZip size={DIALOG_ICON_SIZES.TITLE} color="var(--mantine-color-gray-6)" />
              <div style={{ flex: 1 }}>
                <Text size="sm" fw={500}>
                  {displayArtifactName}
                </Text>
                {artifactSize && (
                  <Text size="xs" c="dimmed">
                    {DISTRIBUTION_UI_LABELS.SIZE_LABEL}: {artifactSize}
                  </Text>
                )}
              </div>
              <Badge variant="light" color="green">
                {DISTRIBUTION_UI_LABELS.AAB_BADGE}
              </Badge>
            </Group>

            {/* Internal Testing Link */}
            {internalTrackLink && (
              <Group gap="xs">
                <IconExternalLink size={DIALOG_ICON_SIZES.TITLE} color="var(--mantine-color-green-6)" />
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={500}>
                    {DISTRIBUTION_UI_LABELS.INTERNAL_TESTING}
                  </Text>
                  <Text
                    size="xs"
                    c="blue"
                    component="a"
                    href={internalTrackLink}  // Renamed from internalTestingLink
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    {DISTRIBUTION_UI_LABELS.TEST_BUILD_BEFORE_PROMOTION}
                  </Text>
                </div>
              </Group>
            )}
          </>
        ) : (
          <>
            {/* iOS TestFlight */}
            <Group gap="xs">
              <IconRocket size={DIALOG_ICON_SIZES.TITLE} color="var(--mantine-color-blue-6)" />
              <div style={{ flex: 1 }}>
                <Text size="sm" fw={500}>
                  {DISTRIBUTION_UI_LABELS.TESTFLIGHT_BUILD(buildNumber || '')}
                </Text>
                <Text size="xs" c="dimmed">
                  {DISTRIBUTION_UI_LABELS.READY_FOR_APPSTORE}
                </Text>
              </div>
              <Badge variant="light" color="blue">
                {DISTRIBUTION_UI_LABELS.TESTFLIGHT_BADGE}
              </Badge>
            </Group>

            {/* TestFlight Link */}
            {testflightLink && (
              <Group gap="xs">
                <IconExternalLink size={DIALOG_ICON_SIZES.TITLE} color="var(--mantine-color-blue-6)" />
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={500}>
                    {DISTRIBUTION_UI_LABELS.TESTFLIGHT_TESTING}
                  </Text>
                  <Text
                    size="xs"
                    c="blue"
                    component="a"
                    href={testflightLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    {DISTRIBUTION_UI_LABELS.TEST_BUILD_BEFORE_PROMOTION}
                  </Text>
                </div>
              </Group>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}

