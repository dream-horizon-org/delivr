/**
 * PostRegressionApprovalSection Component
 * Handles Project Management approval UI and logic
 */

import { Button, Card, Group, Stack, Text } from '@mantine/core';
import { useCallback } from 'react';
import { ManualApprovalDialog } from '~/components/distribution';
import { ApproverRole } from '~/types/distribution.types';
import type { PMStatusResponse } from '~/types/distribution.types';
import { PMApprovalStatus } from '~/components/distribution';
import { apiGet } from '~/utils/api-client';
import { handleStageError } from '~/utils/stage-error-handling';
import { showSuccessToast } from '~/utils/toast';

interface PostRegressionApprovalSectionProps {
  releaseId: string;
  pmStatus: PMStatusResponse['data'] | null;
  showApprovalDialog: boolean;
  onShowApprovalDialog: (show: boolean) => void;
  onPmStatusUpdate: (status: PMStatusResponse['data']) => void;
  onRefetch: () => Promise<unknown>;
}

export function PostRegressionApprovalSection({
  releaseId,
  pmStatus,
  showApprovalDialog,
  onShowApprovalDialog,
  onPmStatusUpdate,
  onRefetch,
}: PostRegressionApprovalSectionProps) {
  const handleApprove = useCallback(
    async (comments?: string) => {
      try {
        // Call manual approval API
        const response = await fetch(`/api/v1/releases/${releaseId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comments }),
        });

        if (!response.ok) {
          throw new Error('Failed to approve release');
        }

        showSuccessToast({ message: 'Release approved successfully' });
        onShowApprovalDialog(false);
        // Refetch PM status to update approval state
        const pmStatusResult = await apiGet<PMStatusResponse>(`/api/v1/releases/${releaseId}/pm-status`);
        if (pmStatusResult.success && pmStatusResult.data) {
          onPmStatusUpdate(pmStatusResult.data.data);
        }
        await onRefetch();
      } catch (error) {
        handleStageError(error, 'approve release');
      }
    },
    [releaseId, onShowApprovalDialog, onPmStatusUpdate, onRefetch]
  );

  if (!pmStatus) {
    return null;
  }

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <div>
              <Text fw={600} size="lg" mb="xs">
                Project Management Approval
              </Text>
              <Text size="sm" c="dimmed">
                {pmStatus.approved
                  ? 'All tickets approved. Ready to proceed.'
                  : 'Waiting for project management approval.'}
              </Text>
            </div>
            {!pmStatus.approved && (
              <Button onClick={() => onShowApprovalDialog(true)}>Request Approval</Button>
            )}
          </Group>
          <PMApprovalStatus
            pmStatus={pmStatus}
            isApproving={false}
            onApproveRequested={() => onShowApprovalDialog(true)}
          />
        </Stack>
      </Card>

      <ManualApprovalDialog
        opened={showApprovalDialog}
        releaseId={releaseId}
        approverRole={pmStatus?.approver || ApproverRole.RELEASE_LEAD}
        isApproving={false}
        onApprove={handleApprove}
        onClose={() => onShowApprovalDialog(false)}
      />
    </>
  );
}

