/**
 * PostRegressionPromotionCard Component
 * Handles the "Complete Post-Regression" promotion button
 */

import { Button, Card, Group, Text } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';
import { useCallback } from 'react';
import { useCompletePostRegression } from '~/hooks/useReleaseProcess';
import { handleStageError } from '~/utils/stage-error-handling';
import { showSuccessToast } from '~/utils/toast';

interface PostRegressionPromotionCardProps {
  tenantId: string;
  releaseId: string;
  canPromote: boolean;
  onComplete: () => Promise<unknown>;
}

export function PostRegressionPromotionCard({
  tenantId,
  releaseId,
  canPromote,
  onComplete,
}: PostRegressionPromotionCardProps) {
  const completeMutation = useCompletePostRegression(tenantId, releaseId);

  const handleCompletePostRegression = useCallback(async () => {
    try {
      await completeMutation.mutateAsync();
      showSuccessToast({ message: 'Post-regression stage completed successfully' });
      await onComplete();
    } catch (error) {
      handleStageError(error, 'complete post-regression stage');
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
          onClick={handleCompletePostRegression}
          leftSection={<IconRocket size={18} />}
          loading={completeMutation.isLoading}
        >
          Complete Post-Regression
        </Button>
      </Group>
    </Card>
  );
}

