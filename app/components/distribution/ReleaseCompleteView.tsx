/**
 * ReleaseCompleteView - Celebration view when release reaches 100%
 * 
 * Per distribution-frontend-implementation-plan.md Week 5:
 * Shows success state with summary and store links
 */

import { Anchor, Badge, Card, Group, Stack, Text, ThemeIcon, Timeline } from '@mantine/core';
import { IconBrandAndroid, IconBrandApple, IconCheck, IconConfetti, IconExternalLink } from '@tabler/icons-react';
import { PLATFORM_LABELS } from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';
import { formatRelativeTime } from './distribution.utils';

export type PlatformReleaseInfo = {
  platform: Platform;
  versionName: string;
  exposurePercent: number;
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
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="lg">
        {/* Header - Celebration */}
        <Group justify="center">
          <ThemeIcon size={60} radius="xl" color="green" variant="light">
            <IconConfetti size={32} />
          </ThemeIcon>
        </Group>

        <Stack gap={4} align="center">
          <Text size="xl" fw={700} c="green">
            🎉 Release Complete!
          </Text>
          <Text size="lg" fw={500}>
            Version {releaseVersion}
          </Text>
          <Text size="sm" c="dimmed">
            Successfully released to all platforms
          </Text>
        </Stack>

        {/* Platform Summary */}
        <Stack gap="md">
          {platforms.map((platform) => (
            <Card key={platform.platform} withBorder padding="sm">
              <Group justify="space-between">
                <Group gap="sm">
                  <ThemeIcon
                    size="lg"
                    radius="md"
                    variant="light"
                    color={platform.platform === Platform.ANDROID ? 'green' : 'blue'}
                  >
                    {platform.platform === Platform.ANDROID ? (
                      <IconBrandAndroid size={20} />
                    ) : (
                      <IconBrandApple size={20} />
                    )}
                  </ThemeIcon>
                  <div>
                    <Text fw={500}>{PLATFORM_LABELS[platform.platform]}</Text>
                    <Text size="xs" c="dimmed">
                      v{platform.versionName}
                    </Text>
                  </div>
                </Group>

                <Group gap="md">
                  <Badge color="green" variant="filled" size="lg">
                    <Group gap={4}>
                      <IconCheck size={14} />
                      {platform.exposurePercent}%
                    </Group>
                  </Badge>

                  {platform.storeLink && (
                    <Anchor
                      href={platform.storeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="sm"
                    >
                      <Group gap={4}>
                        <IconExternalLink size={14} />
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
              <Text size="xs" c="dimmed">
                {formatRelativeTime(platforms[0].submittedAt)}
              </Text>
            </Timeline.Item>
          )}
          <Timeline.Item title="Released">
            <Text size="xs" c="dimmed">
              {formatRelativeTime(completedAt)}
            </Text>
          </Timeline.Item>
        </Timeline>

        {/* Summary */}
        {totalDuration && (
          <Text size="sm" c="dimmed" ta="center">
            Total time: {totalDuration}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

