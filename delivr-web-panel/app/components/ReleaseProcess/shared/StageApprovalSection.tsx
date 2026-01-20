/**
 * StageApprovalSection - Reusable approval component for both Regression and Pre-Release stages
 * A "dumb" presentational component that accepts handlers and data as props
 */

import {
  Accordion,
  Button,
  Card,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { IconCheck, IconRocket, IconX } from '@tabler/icons-react';

export interface ApprovalRequirement {
  label: string;
  passed: boolean;
  message?: string; // Optional message for failed requirements
}

interface StageApprovalSectionProps {
  title: string; // e.g., "Regression Approval" or "Pre-Release Approval"
  canApprove: boolean;
  onApprove: () => void;
  isApproving: boolean;
  approvalButtonText: string; // e.g., "Approve Regression Stage"
  requirements: ApprovalRequirement[];
  passedCount: number;
  pendingCount: number;
  renderRequirements?: () => React.ReactNode; // Optional custom renderer
}

export function StageApprovalSection({
  title,
  canApprove,
  onApprove,
  isApproving,
  approvalButtonText,
  requirements,
  passedCount,
  pendingCount,
  renderRequirements,
}: StageApprovalSectionProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="nowrap">
          <div style={{ flex: 1 }}>
            <Text fw={600} size="lg" mb={4}>
              {title}
            </Text>
            <Group gap="md">
              {passedCount > 0 && (
                <Text size="sm" c="green">
                  Passed: {passedCount}
                </Text>
              )}
              {pendingCount > 0 && (
                <Text size="sm" c="red">
                  Pending: {pendingCount}
                </Text>
              )}
              {passedCount === 0 && pendingCount === 0 && (
                <Text size="sm" c="dimmed">
                  No requirements defined
                </Text>
              )}
            </Group>
          </div>
          <Button
            size="md"
            disabled={!canApprove}
            onClick={onApprove}
            leftSection={<IconRocket size={18} />}
            loading={isApproving}
          >
            {approvalButtonText}
          </Button>
        </Group>

        {/* Approval Requirements - Accordion */}
        {requirements.length > 0 && (
          <Accordion variant="separated" radius="md">
            <Accordion.Item value="requirements">
              <Accordion.Control>
                <Group gap="xs">
                  <Text size="sm" fw={500}>
                    View Requirements
                  </Text>
                  {canApprove && (
                    <IconCheck size={16} color="green" />
                  )}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  {renderRequirements ? (
                    renderRequirements()
                  ) : (
                    // Default rendering
                    requirements.map((req, index) => (
                      <Group key={index} gap="sm">
                        {req.passed ? (
                          <IconCheck size={16} color="green" />
                        ) : (
                          <IconX size={16} color="red" />
                        )}
                        <Text size="sm" style={{ flex: 1 }}>
                          {req.passed ? (
                            <Text component="span" c="green" fw={500}>
                              {req.label}
                            </Text>
                          ) : (
                            <Text component="span" c="red">
                              {req.label}
                              {req.message && `: ${req.message}`}
                            </Text>
                          )}
                        </Text>
                      </Group>
                    ))
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}
      </Stack>
    </Card>
  );
}

