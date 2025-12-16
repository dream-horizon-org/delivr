/**
 * ReleaseCompleteView - Celebration view when release reaches 100%
 * 
 * Per distribution-frontend-implementation-plan.md Week 5:
 * Shows success state with summary and store links
 */

import { Anchor, Badge, Card, Group, Stack, Text, ThemeIcon, Timeline } from '@mantine/core';
import { IconBrandAndroid, IconBrandApple, IconCheck, IconConfetti, IconExternalLink } from '@tabler/icons-react';
import {
  DIST_BADGE_PROPS,
  DIST_CARD_PROPS,
  DS_COLORS,
  DS_TYPOGRAPHY,
  DIST_FONT_WEIGHTS,
  DIST_ICON_PROPS,
  DIST_ICON_SIZES,
  DS_SPACING,
} from '~/constants/distribution-design.constants';
import { PLATFORM_LABELS } from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';
import { formatDateTime } from '~/utils/distribution-ui.utils';

export type PlatformReleaseInfo = {
  platform: Platform;
  versionName: string;
  rolloutPercentage: number;
  storeLink?: string;
  submittedAt: string | null;
  releasedAt: string | null;
};

export type ReleaseCompleteViewProps = {
  releaseVersion: string;
  platforms: PlatformReleaseInfo[];
  completedAt: string;
  totalDuration?: string;
};

export function ReleaseCompleteView({
  releaseVersion,
  platforms,
  completedAt,
  totalDuration,
}: ReleaseCompleteViewProps) {
  return (
    <Card {...DIST_CARD_PROPS.DEFAULT}>
      <Stack gap={DS_SPACING.LG}>
        {/* Header - Celebration */}
        <Group justify="center">
          <ThemeIcon size={60} radius="xl" color={DS_COLORS.STATUS.SUCCESS} variant="light">
            <IconConfetti size={32} />
          </ThemeIcon>
        </Group>

        <Stack gap={DS_SPACING.XS} align="center">
          <Text size={DS_TYPOGRAPHY.SIZE.XL} fw={DIST_FONT_WEIGHTS.BOLD} c={DS_COLORS.STATUS.SUCCESS}>
            🎉 Release Complete!
          </Text>
          <Text size={DS_TYPOGRAPHY.SIZE.LG} fw={DIST_FONT_WEIGHTS.MEDIUM}>
            Version {releaseVersion}
          </Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.SECONDARY}>
            Successfully released to all platforms
          </Text>
        </Stack>

        {/* Platform Summary */}
        <Stack gap={DS_SPACING.MD}>
          {platforms.map((platform) => (
            <Card key={platform.platform} {...DIST_CARD_PROPS.COMPACT}>
              <Group justify="space-between">
                <Group gap={DS_SPACING.SM}>
                  <ThemeIcon
                    {...DIST_ICON_PROPS.LARGE}
                    color={platform.platform === Platform.ANDROID ? DS_COLORS.PLATFORM.ANDROID : DS_COLORS.PLATFORM.IOS}
                  >
                    {platform.platform === Platform.ANDROID ? (
                      <IconBrandAndroid size={DIST_ICON_SIZES.XL} />
                    ) : (
                      <IconBrandApple size={DIST_ICON_SIZES.XL} />
                    )}
                  </ThemeIcon>
                  <div>
                    <Text fw={DIST_FONT_WEIGHTS.MEDIUM}>{PLATFORM_LABELS[platform.platform]}</Text>
                    <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY}>
                      v{platform.versionName}
                    </Text>
                  </div>
                </Group>

                <Group gap={DS_SPACING.MD}>
                  <Badge color={DS_COLORS.STATUS.SUCCESS} {...DIST_BADGE_PROPS.LARGE}>
                    <Group gap={DS_SPACING.XS}>
                      <IconCheck size={DIST_ICON_SIZES.SM} />
                      {platform.rolloutPercentage}%
                    </Group>
                  </Badge>

                  {platform.storeLink && (
                    <Anchor
                      href={platform.storeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      size={DS_TYPOGRAPHY.SIZE.SM}
                    >
                      <Group gap={DS_SPACING.XS}>
                        <IconExternalLink size={DIST_ICON_SIZES.SM} />
                        View in Store
                      </Group>
                    </Anchor>
                  )}
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>

        {/* Timeline */}
        <Timeline active={-1} bulletSize={20} lineWidth={2}>
          {platforms[0]?.submittedAt && (
            <Timeline.Item title="Submitted">
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY}>
                {formatDateTime(platforms[0].submittedAt)}
              </Text>
            </Timeline.Item>
          )}
          <Timeline.Item title="Released">
            <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.SECONDARY}>
              {formatDateTime(completedAt)}
            </Text>
          </Timeline.Item>
        </Timeline>

        {/* Summary */}
        {totalDuration && (
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.SECONDARY} ta="center">
            Total time: {totalDuration}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

