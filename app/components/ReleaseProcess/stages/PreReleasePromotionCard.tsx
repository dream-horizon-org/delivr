/**
 * PreReleasePromotionCard Component
 * Handles the "Complete Pre-Release" promotion button
 */

import { Button, Card, Group, Text } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';
import { useCallback } from 'react';
import { useCompletePreReleaseStage } from '~/hooks/useReleaseProcess';
import { handleStageError } from '~/utils/stage-error-handling';
import { showSuccessToast } from '~/utils/toast';

interface PreReleasePromotionCardProps {
  tenantId: string;
  releaseId: string;
  canPromote: boolean;
  onComplete: () => Promise<unknown>;
}

export function PreReleasePromotionCard({
  tenantId,
  releaseId,
  canPromote,
  onComplete,
}: PreReleasePromotionCardProps) {
  const completeMutation = useCompletePreReleaseStage(tenantId, releaseId);

  const handleCompletePreRelease = useCallback(async () => {
    try {
      await completeMutation.mutateAsync();
      showSuccessToast({ message: 'Pre-release stage completed successfully' });
      await onComplete();
    } catch (error) {
      handleStageError(error, 'complete pre-release stage');
    }
  }, [completeMutation, onComplete]);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between">
        <div>
          <Text fw={600} size="lg" mb="xs">
            Ready for Distribution?
          </Text>
          <Text size="sm" c="dimmed">
            {canPromote
              ? 'All requirements met. You can proceed to distribution.'
              : 'Complete all tasks first.'}
          </Text>
        </div>
        <Button
          size="lg"
          disabled={!canPromote}
          onClick={handleCompletePreRelease}
          leftSection={<IconRocket size={18} />}
          loading={completeMutation.isLoading}
        >
          Complete Pre-Release
        </Button>
      </Group>
    </Card>
  );
}

