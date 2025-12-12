/**
 * PreReleaseTab - Pre-release tab content showing builds and approval
 * Extracted from dashboard.$org.releases.$releaseId.distribution.tsx
 */

import { Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';
import { BuildStatusCard, ExtraCommitsWarning, PMApprovalStatus } from '~/components/distribution';
import { BUTTON_LABELS } from '~/constants/distribution.constants';
import type { ExtraCommitsResponse, PMStatusResponse } from '~/types/distribution.types';
import { Platform } from '~/types/distribution.types';
import type { usePreRelease } from '~/hooks/usePreRelease';

export type PreReleaseTabProps = {
  preRelease: ReturnType<typeof usePreRelease>;
  extraCommitsData: ExtraCommitsResponse['data'];
  pmStatusData: PMStatusResponse['data'];
  approveFetcherState: string;
  onOpenSubmitDialog: () => void;
};

export function PreReleaseTab({
  preRelease,
  extraCommitsData,
  pmStatusData,
  approveFetcherState,
  onOpenSubmitDialog,
}: PreReleaseTabProps) {
  const showExtraCommitsWarning = preRelease.hasExtraCommits;
  const isApproving = approveFetcherState === 'submitting';
  const promotionText = preRelease.canPromote 
    ? 'All requirements met. You can proceed to store submission.'
    : preRelease.promotionBlockedReason;

  return (
    <Stack gap="lg">
      {showExtraCommitsWarning && (
        <ExtraCommitsWarning
          extraCommits={extraCommitsData}
          canDismiss
          onProceed={preRelease.acknowledgeExtraCommits}
        />
      )}

      <div>
        <Title order={3} mb="md">Build Status</Title>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BuildStatusCard
            platform={Platform.ANDROID}
            build={preRelease.androidBuild}
            buildStrategy={preRelease.buildStrategy}
            onUploadRequested={preRelease.openUploadDialog}
          />
          <BuildStatusCard
            platform={Platform.IOS}
            build={preRelease.iosBuild}
            buildStrategy={preRelease.buildStrategy}
            onVerifyRequested={preRelease.openVerifyDialog}
          />
        </div>
      </div>

      <div>
        <Title order={3} mb="md">Approval</Title>
        <PMApprovalStatus
          pmStatus={pmStatusData}
          isApproving={isApproving}
          onApproveRequested={preRelease.openApprovalDialog}
        />
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between">
          <div>
            <Text fw={600}>Ready for Distribution?</Text>
            <Text size="sm" c="dimmed">
              {promotionText}
            </Text>
          </div>
          <Button
            size="lg"
            disabled={!preRelease.canPromote}
            leftSection={<IconRocket size={18} />}
            onClick={onOpenSubmitDialog}
          >
            {BUTTON_LABELS.PROMOTE_TO_DISTRIBUTION}
          </Button>
        </Group>
      </Card>
    </Stack>
  );
}

