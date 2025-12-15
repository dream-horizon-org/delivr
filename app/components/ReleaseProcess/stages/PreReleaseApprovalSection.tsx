/**
 * PreReleaseApprovalSection Component
 * Handles Project Management approval UI and logic for Pre-Release stage
 * Uses the release process API contract endpoint: project-management-run-status
 */

import { Card, Group, Stack, Text, Loader } from '@mantine/core';
import { IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react';
import { useCallback } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ProjectManagementStatusResponse } from '~/types/release-process.types';

interface PreReleaseApprovalSectionProps {
  tenantId: string;
  releaseId: string;
  projectManagementStatus: UseQueryResult<ProjectManagementStatusResponse, Error>;
  onRefetch: () => Promise<unknown>;
}

export function PreReleaseApprovalSection({
  tenantId,
  releaseId,
  projectManagementStatus,
  onRefetch,
}: PreReleaseApprovalSectionProps) {
  // Determine if all platforms are completed
  const isAllCompleted = useCallback(() => {
    if (!projectManagementStatus.data) return false;
    
    if ('platforms' in projectManagementStatus.data) {
      // All platforms response - all must be completed
      return projectManagementStatus.data.platforms.every(
        (platform) => platform.isCompleted === true
      );
    } else {
      // Single platform response
      return projectManagementStatus.data.isCompleted === true;
    }
  }, [projectManagementStatus.data]);

  const allCompleted = isAllCompleted();
  const hasData = !!projectManagementStatus.data;
  const isLoading = projectManagementStatus.isLoading;

  // Don't show if no PM integration (no data and not loading)
  if (!isLoading && !hasData) {
    return null;
  }

  // Get status message
  const getStatusMessage = () => {
    if (isLoading) return 'Loading project management status...';
    if (!hasData) return 'No project management integration configured.';
    if (allCompleted) return 'All tickets completed. Ready to proceed.';
    return 'Waiting for project management tickets to be completed.';
  };

  // Get platform status details
  const getPlatformStatuses = () => {
    if (!projectManagementStatus.data) return [];
    
    if ('platforms' in projectManagementStatus.data) {
      return projectManagementStatus.data.platforms;
    } else {
      return [projectManagementStatus.data];
    }
  };

  const platformStatuses = getPlatformStatuses();

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Text fw={600} size="lg" mb="xs">
              Project Management Approval
            </Text>
            <Text size="sm" c="dimmed">
              {getStatusMessage()}
            </Text>
          </div>
        </Group>

        {isLoading ? (
          <Loader size="sm" />
        ) : hasData ? (
          <Stack gap="sm">
            {platformStatuses.map((platform, index) => (
              <Group key={platform.platform || index} gap="sm" justify="space-between">
                <Group gap="xs">
                  {platform.isCompleted ? (
                    <IconCheck size={16} color="green" />
                  ) : platform.hasTicket ? (
                    <IconAlertCircle size={16} color="blue" />
                  ) : (
                    <IconX size={16} color="gray" />
                  )}
                  <Text size="sm" fw={500}>
                    {platform.platform}
                  </Text>
                </Group>
                <Group gap="xs">
                  {platform.isCompleted ? (
                    <Text size="sm" c="green" fw={500}>
                      Completed
                    </Text>
                  ) : platform.hasTicket ? (
                    <Text size="sm" c="blue">
                      In Progress
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed">
                      No Ticket
                    </Text>
                  )}
                  {platform.ticketKey && (
                    <Text size="xs" c="dimmed">
                      {platform.ticketKey}
                    </Text>
                  )}
                </Group>
              </Group>
            ))}
            {platformStatuses.length === 0 && (
              <Text size="sm" c="dimmed">
                No project management integration configured.
              </Text>
            )}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

