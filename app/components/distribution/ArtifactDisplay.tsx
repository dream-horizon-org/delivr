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
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import {
  DEFAULT_AAB_ARTIFACT_NAME,
  DIALOG_ICON_SIZES,
  DISTRIBUTION_UI_LABELS,
  PLATFORM_LABELS,
} from '~/constants/distribution/distribution.constants';
import { Platform } from '~/types/distribution/distribution.types';

export type ArtifactDisplayProps = {
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
  [Platform.ANDROID]: DS_COLORS.PLATFORM.ANDROID,
  [Platform.IOS]: DS_COLORS.PLATFORM.IOS,
} as const;

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
  const displayArtifactName = artifactName ?? DEFAULT_AAB_ARTIFACT_NAME;

  return (
    <Card shadow="sm" padding="lg" radius={DS_SPACING.BORDER_RADIUS} withBorder>
      <Stack gap={DS_SPACING.MD}>
        <Group>
          <ThemeIcon size={DS_TYPOGRAPHY.SIZE.XL} variant="light" color={platformColor} radius={DS_SPACING.BORDER_RADIUS}>
            {isAndroid ? (
              <IconBrandAndroid size={DIALOG_ICON_SIZES.TITLE} />
            ) : (
              <IconBrandApple size={DIALOG_ICON_SIZES.TITLE} />
            )}
          </ThemeIcon>
          <div>
            <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} size={DS_TYPOGRAPHY.SIZE.LG}>
              {DISTRIBUTION_UI_LABELS.ARTIFACT_TITLE(platformLabel)}
            </Text>
            <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
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
          <Text size={DS_TYPOGRAPHY.SIZE.SM}>{DISTRIBUTION_UI_LABELS.ARTIFACT_TESTED_DESC}</Text>
        </Alert>

        {isAndroid ? (
          <>
            {/* Android Artifact */}
            <Group gap={DS_SPACING.XS}>
              <IconFileZip size={DIALOG_ICON_SIZES.TITLE} style={{ color: DS_COLORS.TEXT.MUTED }} />
              <div style={{ flex: 1 }}>
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                  {displayArtifactName}
                </Text>
                {artifactSize && (
                  <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                    {DISTRIBUTION_UI_LABELS.SIZE_LABEL}: {artifactSize}
                  </Text>
                )}
              </div>
              <Badge variant="light" color={DS_COLORS.STATUS.SUCCESS}>
                {DISTRIBUTION_UI_LABELS.AAB_BADGE}
              </Badge>
            </Group>

            {/* Internal Testing Link */}
            {internalTrackLink && (
              <Group gap={DS_SPACING.XS}>
                <IconExternalLink size={DIALOG_ICON_SIZES.TITLE} style={{ color: DS_COLORS.STATUS.SUCCESS }} />
                <div style={{ flex: 1 }}>
                  <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                    {DISTRIBUTION_UI_LABELS.INTERNAL_TESTING}
                  </Text>
                  <Text
                    size={DS_TYPOGRAPHY.SIZE.XS}
                    c={DS_COLORS.ACTION.PRIMARY}
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
            <Group gap={DS_SPACING.XS}>
              <IconRocket size={DIALOG_ICON_SIZES.TITLE} style={{ color: DS_COLORS.STATUS.INFO }} />
              <div style={{ flex: 1 }}>
                <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                  {DISTRIBUTION_UI_LABELS.TESTFLIGHT_BUILD(buildNumber ?? '')}
                </Text>
                <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
                  {DISTRIBUTION_UI_LABELS.READY_FOR_APPSTORE}
                </Text>
              </div>
              <Badge variant="light" color={DS_COLORS.ACTION.PRIMARY}>
                {DISTRIBUTION_UI_LABELS.TESTFLIGHT_BADGE}
              </Badge>
            </Group>

            {/* TestFlight Link */}
            {testflightLink && (
              <Group gap={DS_SPACING.XS}>
                <IconExternalLink size={DIALOG_ICON_SIZES.TITLE} style={{ color: DS_COLORS.STATUS.INFO }} />
                <div style={{ flex: 1 }}>
                  <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
                    {DISTRIBUTION_UI_LABELS.TESTFLIGHT_TESTING}
                  </Text>
                  <Text
                    size={DS_TYPOGRAPHY.SIZE.XS}
                    c={DS_COLORS.ACTION.PRIMARY}
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

