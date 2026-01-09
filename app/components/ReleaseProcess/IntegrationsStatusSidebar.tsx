/**
 * IntegrationsStatusSidebar Component
 * Right sidebar below stages sidebar showing real-time integration status
 * Fetches from individual APIs for constant visibility
 * 
 * For Regression Stage:
 * - Cherry Pick Status (from /check-cherry-pick-status)
 * - Test Management Status (from /test-management-run-status)
 * 
 * For Pre-Release Stage:
 * - Cherry Pick Status (from /check-cherry-pick-status)
 * - Project Management Status (from /project-management-run-status) - platform-wise
 */

import { Card, Divider, Group, Stack, Text, Badge, Loader, Anchor, ActionIcon } from '@mantine/core';
import { IconCheck, IconX, IconAlertCircle, IconExternalLink } from '@tabler/icons-react';
import { 
  useCherryPickStatus, 
  useTestManagementStatus, 
  useProjectManagementStatus 
} from '~/hooks/useReleaseProcess';
import { useConfig } from '~/contexts/ConfigContext';
import { useRelease } from '~/hooks/useRelease';
import { TaskStage, TaskStage as TaskStageEnum, TestManagementStatus, Phase } from '~/types/release-process-enums';
import { shouldEnableCherryPickStatus, determineReleasePhase } from '~/utils/release-process-utils';

interface IntegrationsStatusSidebarProps {
  tenantId: string;
  releaseId: string;
  currentStage: TaskStage | null;
  className?: string;
}

export function IntegrationsStatusSidebar({
  tenantId,
  releaseId,
  currentStage,
  className,
}: IntegrationsStatusSidebarProps) {
  // Get release data to access releaseConfigId
  const { release } = useRelease(tenantId, releaseId);
  
  // Get cached release configs from ConfigContext
  const { releaseConfigs } = useConfig();
  
  // Find the release config for this release
  const releaseConfig = release?.releaseConfigId 
    ? releaseConfigs.find((c) => c.id === release.releaseConfigId)
    : null;
  
  // Check if integrations are configured and enabled
  const hasTestManagement = !!(
    releaseConfig?.testManagementConfig?.enabled && 
    releaseConfig.testManagementConfig
  );
  
  const hasProjectManagement = !!(
    releaseConfig?.projectManagementConfig?.enabled && 
    releaseConfig.projectManagementConfig
  );
  
  // Determine release phase (use existing phase if available, otherwise calculate)
  const releasePhase = release?.releasePhase || (release ? determineReleasePhase(release) : undefined);
  
  // Check if cherry-pick-status API should be enabled
  const cherryPickEnabled = shouldEnableCherryPickStatus(
    currentStage,
    release?.status,
    releasePhase
  );
  
  // Fetch cherry pick status (only enabled for REGRESSION and PRE_RELEASE stages, not archived/pre-kickoff)
  const cherryPickStatus = useCherryPickStatus(tenantId, releaseId, cherryPickEnabled);
  
  // Fetch test management status (Regression stage only, and only if configured)
  const testManagementStatus = useTestManagementStatus(
    tenantId,
    releaseId,
    undefined, // No platform filter = all platforms
    currentStage === TaskStageEnum.REGRESSION && hasTestManagement // Only enable if in regression stage and config exists
  );
  
  // Fetch project management status (Pre-Release stage only, and only if configured)
  const projectManagementStatus = useProjectManagementStatus(
    tenantId,
    releaseId,
    undefined, // No platform filter = all platforms
    currentStage === TaskStageEnum.PRE_RELEASE && hasProjectManagement // Only enable if in pre-release stage and config exists
  );

  // Only show for REGRESSION or PRE_RELEASE stages
  if (currentStage !== TaskStageEnum.REGRESSION && currentStage !== TaskStageEnum.PRE_RELEASE) {
    return null;
  }

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder className={className}>
      <Stack gap="md">
        {/* Cherry Pick Status - Always shown */}
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Cherry Pick Status
          </Text>
          {cherryPickStatus.isLoading ? (
            <Loader size="xs" />
          ) : cherryPickStatus.data ? (
            <Group gap="xs">
              {!cherryPickStatus.data.cherryPickAvailable ? (
                <>
                  <IconCheck size={16} color="green" />
                  <Text size="sm" c="green" fw={500}>
                    OK
                  </Text>
                </>
              ) : (
                <>
                  <IconX size={16} color="red" />
                  <Text size="sm" c="red">
                    New cherry picks found
                  </Text>
                </>
              )}
            </Group>
          ) : cherryPickStatus.error ? (
            <Text size="sm" c="red">
              Error loading
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              Unable to fetch
            </Text>
          )}
        </Stack>

        {/* Regression Stage: Test Management Status - Only show if configured */}
        {currentStage === TaskStage.REGRESSION && (
          <>
            <Divider />
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                Test Management Status
              </Text>
              {!hasTestManagement ? (
                <Text size="sm" c="dimmed">
                  Not configured
                </Text>
              ) : testManagementStatus.isLoading ? (
                <Loader size="xs" />
              ) : testManagementStatus.data ? (
              'platforms' in testManagementStatus.data ? (
                // All platforms response
                <Stack gap="xs">
                  {testManagementStatus.data.platforms.map((platform) => {
                    const isCompleted = platform.status === TestManagementStatus.PASSED || platform.status === TestManagementStatus.COMPLETED;
                    const hasError = !!platform.error;
                    return (
                      <Group key={platform.platform} gap="xs" justify="space-between">
                        <Text size="xs" c="dimmed">
                          {platform.platform}
                        </Text>
                        <Group gap="xs">
                          {isCompleted ? (
                            <Badge color="green" size="sm">
                              <Group gap={4}>
                                <IconCheck size={12} />
                                {platform.status === TestManagementStatus.COMPLETED ? 'Completed' : 'Passed'}
                              </Group>
                            </Badge>
                          ) : hasError ? (
                            <Badge color="red" size="sm">
                              Failed
                            </Badge>
                          ) : (
                            <Badge color="red" size="sm">
                              {platform.status || 'Pending'}
                            </Badge>
                          )}
                          {platform.runLink && (
                            <ActionIcon
                              component="a"
                              href={platform.runLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="sm"
                              variant="subtle"
                              color="blue"
                              aria-label="Open test run in new tab"
                            >
                              <IconExternalLink size={14} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Group>
                    );
                  })}
                </Stack>
              ) : (
                // Single platform response
                <Group gap="xs">
                  {(testManagementStatus.data.status === TestManagementStatus.PASSED || testManagementStatus.data.status === TestManagementStatus.COMPLETED) ? (
                    <>
                      <IconCheck size={16} color="green" />
                      <Text size="sm" c="green" fw={500}>
                        {testManagementStatus.data.status === TestManagementStatus.COMPLETED ? 'Completed' : 'Passed'}
                      </Text>
                    </>
                  ) : testManagementStatus.data.error ? (
                    <>
                      <IconX size={16} color="red" />
                      <Text size="sm" c="red">
                        Failed
                      </Text>
                    </>
                  ) : (
                    <>
                      <IconX size={16} color="red" />
                      <Text size="sm" c="red">
                        {testManagementStatus.data.status || 'Pending'}
                      </Text>
                    </>
                  )}
                  {testManagementStatus.data.runLink && (
                    <ActionIcon
                      component="a"
                      href={testManagementStatus.data.runLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="sm"
                      variant="subtle"
                      color="blue"
                      aria-label="Open test run in new tab"
                    >
                      <IconExternalLink size={14} />
                    </ActionIcon>
                  )}
                </Group>
              )
            ) : testManagementStatus.error ? (
              <Text size="sm" c="red">
                Error loading
              </Text>
            ) : (
              <Text size="sm" c="dimmed">
                Unable to fetch
              </Text>
            )}
          </Stack>
          </>
        )}

        {/* Pre-Release Stage: Project Management Status (Platform-wise) - Only show if configured */}
        {currentStage === TaskStageEnum.PRE_RELEASE && (
          <>
            <Divider />
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                Project Management Status
              </Text>
              {!hasProjectManagement ? (
                <Text size="sm" c="dimmed">
                  Not configured
                </Text>
              ) : projectManagementStatus.isLoading ? (
                <Loader size="xs" />
              ) : projectManagementStatus.data ? (
              'platforms' in projectManagementStatus.data ? (
                // All platforms response
                <Stack gap="xs">
                  {projectManagementStatus.data.platforms.map((platform) => (
                    <Stack key={platform.platform} gap={4}>
                      <Group gap="xs" justify="space-between">
                        <Text size="xs" fw={500}>
                          {platform.platform}
                        </Text>
                        {platform.isCompleted ? (
                          <Badge color="green" size="sm">
                            <Group gap={4}>
                              <IconCheck size={12} />
                              Completed
                            </Group>
                          </Badge>
                        ) : platform.hasTicket ? (
                          <Badge color="blue" size="sm">
                            In Progress
                          </Badge>
                        ) : (
                          <Badge color="gray" size="sm">
                            No Ticket
                          </Badge>
                        )}
                      </Group>
                      {platform.ticketKey && (
                        <Group gap={4}>
                          {platform.ticketUrl ? (
                            <Anchor
                              href={platform.ticketUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="xs"
                              c="blue"
                              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              {platform.ticketKey}
                              <IconExternalLink size={12} />
                            </Anchor>
                          ) : (
                            <Text size="xs" c="dimmed">
                              {platform.ticketKey}
                            </Text>
                          )}
                        </Group>
                      )}
                      {platform.message && (
                        <Text size="xs" c="dimmed">
                          {platform.message}
                        </Text>
                      )}
                    </Stack>
                  ))}
                </Stack>
              ) : (
                // Single platform response
                <Stack gap="xs">
                  <Group gap="xs">
                    {projectManagementStatus.data.isCompleted ? (
                      <>
                        <IconCheck size={16} color="green" />
                        <Text size="sm" c="green" fw={500}>
                          Completed
                        </Text>
                      </>
                    ) : projectManagementStatus.data.hasTicket ? (
                      <>
                        <IconAlertCircle size={16} color="blue" />
                        <Text size="sm" c="blue">
                          In Progress
                        </Text>
                      </>
                    ) : (
                      <>
                        <IconX size={16} color="gray" />
                        <Text size="sm" c="dimmed">
                          No Ticket
                        </Text>
                      </>
                    )}
                  </Group>
                  {projectManagementStatus.data.ticketKey && (
                    <Group gap={4}>
                      {projectManagementStatus.data.ticketUrl ? (
                        <Anchor
                          href={projectManagementStatus.data.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="xs"
                          c="blue"
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          {projectManagementStatus.data.ticketKey}
                          <IconExternalLink size={12} />
                        </Anchor>
                      ) : (
                        <Text size="xs" c="dimmed">
                          {projectManagementStatus.data.ticketKey}
                        </Text>
                      )}
                    </Group>
                  )}
                  {projectManagementStatus.data.message && (
                    <Text size="xs" c="dimmed">
                      {projectManagementStatus.data.message}
                    </Text>
                  )}
                </Stack>
              )
            ) : projectManagementStatus.error ? (
              <Text size="sm" c="red">
                Error loading
              </Text>
            ) : (
              <Text size="sm" c="dimmed">
                Unable to fetch
              </Text>
            )}
          </Stack>
          </>
        )}
      </Stack>
    </Card>
  );
}

