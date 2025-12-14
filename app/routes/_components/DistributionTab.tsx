/**
 * DistributionTab - Distribution tab content showing submissions and status
 * Extracted from dashboard.$org.releases.$releaseId.distribution.tsx
 */

import { Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { Link } from '@remix-run/react';
import { IconExternalLink, IconRocket } from '@tabler/icons-react';
import {
  DistributionStatusPanel,
  ReleaseCompleteView,
  SubmissionStatusCard,
} from '~/components/distribution';
import type { DistributionStatusResponse } from '~/types/distribution.types';
import { ROLLOUT_COMPLETE_PERCENT } from '~/constants/distribution.constants';
import { SubmissionStatus } from '~/types/distribution.types';
import type { useDistribution } from '~/hooks/useDistribution';
import { EmptySubmissionsCard } from './EmptySubmissionsCard';
import { RejectionWarningCard } from './RejectionWarningCard';

export type DistributionTabProps = {
  distribution: ReturnType<typeof useDistribution>;
  distributionStatusData: DistributionStatusResponse['data'];
  org: string;
  releaseId: string;
};

export function DistributionTab({
  distribution,
  distributionStatusData,
  org,
  releaseId,
}: DistributionTabProps) {
  const showManagementButton = distribution.hasSubmissions;
  const showSubmitButton = distribution.canSubmitToStores && distribution.availablePlatforms.length > 0;
  const isAllPlatformsComplete = distribution.submissions.every(
    (s) => s.submissionStatus === SubmissionStatus.LIVE && s.rolloutPercent === ROLLOUT_COMPLETE_PERCENT
  );
  const completedAt = distribution.submissions.reduce((latest, s) => {
    const releasedAt = s.releasedAt;
    if (!releasedAt) return latest;
    if (!latest) return releasedAt;
    return new Date(releasedAt) > new Date(latest) ? releasedAt : latest;
  }, null as string | null) ?? new Date().toISOString();

  return (
    <Stack gap="lg">
      <DistributionStatusPanel status={distributionStatusData} />

      {/* Open in Distribution Management Button */}
      {showManagementButton && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text fw={600} size="sm">
                Need to manage rollout or retry submissions?
              </Text>
              <Text size="xs" c="dimmed">
                Access full distribution management with rollout controls, pause/resume, and more.
              </Text>
            </div>
            <Button
              component={Link}
              to={`/dashboard/${org}/distributions/${distributionStatusData.distributionId}`}
              variant="light"
              leftSection={<IconExternalLink size={16} />}
            >
              Open in Distribution Management
            </Button>
          </Group>
        </Card>
      )}

      <div>
        <Group justify="space-between" mb="md">
          <Title order={3}>Store Submissions</Title>
          {showSubmitButton && (
            <Button leftSection={<IconRocket size={16} />} onClick={distribution.openSubmitDialog}>
              Submit to Stores
            </Button>
          )}
        </Group>

        {distribution.hasSubmissions ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {distribution.submissions.map((submission) => (
                <SubmissionStatusCard
                  key={submission.id}
                  submission={submission}
                  org={org}
                  distributionId={submission.distributionId}
                />
              ))}
            </div>
            
            {/* Release Complete View (if all platforms at 100%) */}
            {isAllPlatformsComplete && (
              <ReleaseCompleteView
                releaseVersion={distributionStatusData.releaseVersion}
                platforms={distribution.submissions.map((s) => ({
                  platform: s.platform,
                  versionName: s.versionName,
                  rolloutPercent: s.rolloutPercent,
                  submittedAt: s.submittedAt,
                  releasedAt: s.releasedAt,
                }))}
                completedAt={completedAt}
              />
            )}
          </>
        ) : (
          <EmptySubmissionsCard
            showButton={distribution.availablePlatforms.length > 0}
            onSubmit={distribution.openSubmitDialog}
          />
        )}
      </div>

      {distribution.hasRejections && <RejectionWarningCard />}
    </Stack>
  );
}

