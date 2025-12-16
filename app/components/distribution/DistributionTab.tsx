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
} from '~/components/Distribution';
import { DS_COLORS, DS_SPACING, DS_TYPOGRAPHY } from '~/constants/distribution/distribution-design.constants';
import { ROLLOUT_COMPLETE_PERCENT } from '~/constants/distribution/distribution.constants';
import type { useDistribution } from '~/hooks/distribution';
import type { DistributionStatusResponse } from '~/types/distribution/distribution.types';
import { SubmissionStatus } from '~/types/distribution/distribution.types';
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
    (s) => s.status === SubmissionStatus.LIVE && s.rolloutPercentage === ROLLOUT_COMPLETE_PERCENT
  );
  // Use statusUpdatedAt for completed releases (releasedAt not in API spec)
  const completedAt = distribution.submissions.reduce((latest, s) => {
    const updatedAt = s.statusUpdatedAt;
    if (!updatedAt) return latest;
    if (!latest) return updatedAt;
    return new Date(updatedAt) > new Date(latest) ? updatedAt : latest;
  }, null as string | null) ?? new Date().toISOString();

  return (
    <Stack gap={DS_SPACING.LG}>
      <DistributionStatusPanel status={distributionStatusData} />

      {/* Open in Distribution Management Button */}
      {showManagementButton && (
        <Card shadow="sm" padding={DS_SPACING.MD} radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} size={DS_TYPOGRAPHY.SIZE.SM}>
                Need to manage rollout or retry submissions?
              </Text>
              <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>
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
        <Group justify="space-between" mb={DS_SPACING.MD}>
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
                  versionName: s.version,
                  rolloutPercentage: s.rolloutPercentage,
                  submittedAt: s.submittedAt || null,
                  releasedAt: null, // Not in API spec
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

