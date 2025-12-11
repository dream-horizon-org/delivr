/**
 * Configuration Summary Component
 * Display complete configuration for review with brand styling
 */

import {
  Stack,
  Text,
  Paper,
  Group,
  Badge,
  List,
  Box,
  ThemeIcon,
  SimpleGrid,
  useMantineTheme,
} from '@mantine/core';
import {
  IconSettings,
  IconTarget,
  IconTestPipe,
  IconCalendar,
  IconBell,
  IconCheck,
  IconX,
  IconTicket,
  IconFileCheck,
  IconGitBranch,
  IconBrandSlack,
  IconMail,
} from '@tabler/icons-react';
import type { ConfigSummaryProps } from '~/types/release-config-props';

export function ConfigSummary({ config }: ConfigSummaryProps) {
  const theme = useMantineTheme();

  const SectionCard = ({
    icon: Icon,
    iconColor,
    title,
    children,
  }: {
    icon: React.ElementType;
    iconColor: string;
    title: string;
    children: React.ReactNode;
  }) => (
    <Paper p="lg" radius="md" withBorder>
      <Group gap="sm" mb="md">
        <ThemeIcon size={28} radius="md" variant="light" color={iconColor}>
          <Icon size={16} />
        </ThemeIcon>
        <Text fw={600} size="sm" c={theme.colors.slate[8]}>
          {title}
        </Text>
      </Group>
      {children}
    </Paper>
  );

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Group justify="space-between" py={6}>
      <Text size="sm" c={theme.colors.slate[5]}>
        {label}
      </Text>
      <Box>{value}</Box>
    </Group>
  );

  return (
    <Stack gap="lg">
      {/* Header */}
      <Paper
        p="md"
        radius="md"
        style={{
          backgroundColor: theme.colors.green[0],
          border: `1px solid ${theme.colors.green[2]}`,
        }}
      >
        <Group gap="sm">
          <ThemeIcon size={32} radius="md" variant="light" color="green">
            <IconFileCheck size={18} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="sm" fw={600} c={theme.colors.green[8]} mb={2}>
              Review & Confirm
            </Text>
            <Text size="xs" c={theme.colors.green[7]}>
              Please review your configuration before saving
            </Text>
          </Box>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {/* Basic Info */}
        <SectionCard icon={IconSettings} iconColor="brand" title="Basic Information">
          <Stack gap={0}>
            <InfoRow
              label="Name"
              value={
                <Text size="sm" fw={500} c={theme.colors.slate[8]}>
                  {config.name || 'Not set'}
                </Text>
              }
            />
            <InfoRow
              label="Release Type"
              value={
                <Badge variant="light" size="sm" color="brand">
                  {config.releaseType || 'Planned'}
                </Badge>
              }
            />
            <InfoRow
              label="Default Config"
              value={
                config.isDefault ? (
                  <Badge variant="light" size="sm" color="green">
                    Yes
                  </Badge>
                ) : (
                  <Text size="sm" c={theme.colors.slate[5]}>
                    No
                  </Text>
                )
              }
            />
            {config.baseBranch && (
              <InfoRow
                label="Base Branch"
                value={
                  <Group gap={4}>
                    <IconGitBranch size={14} color={theme.colors.slate[5]} />
                    <Text size="sm" fw={500}>
                      {config.baseBranch}
                    </Text>
                  </Group>
                }
              />
            )}
          </Stack>
        </SectionCard>

        {/* Build Upload */}
        <SectionCard icon={IconSettings} iconColor="green" title="Build Upload Method">
          <Stack gap="sm">
            <Badge
              size="lg"
              variant="light"
              color={!config.hasManualBuildUpload ? 'grape' : 'blue'}
            >
              {!config.hasManualBuildUpload ? 'CI/CD Integration' : 'Manual Upload'}
            </Badge>

            {!config.hasManualBuildUpload &&
              config.ciConfig?.workflows &&
              config.ciConfig.workflows.length > 0 && (
                <Box
                  p="sm"
                  style={{
                    backgroundColor: theme.colors.slate[0],
                    borderRadius: theme.radius.sm,
                  }}
                >
                  <Text size="xs" fw={500} c={theme.colors.slate[6]} mb="xs">
                    {config.ciConfig.workflows.length} Workflow(s) Configured
                  </Text>
                  <Stack gap={4}>
                    {config.ciConfig.workflows.slice(0, 3).map((pipeline) => (
                      <Group key={pipeline.id} gap="xs">
                        {pipeline.enabled ? (
                          <IconCheck size={12} color={theme.colors.green[6]} />
                        ) : (
                          <IconX size={12} color={theme.colors.slate[4]} />
                        )}
                        <Text size="xs">{pipeline.name}</Text>
                      </Group>
                    ))}
                    {config.ciConfig.workflows.length > 3 && (
                      <Text size="xs" c={theme.colors.slate[5]}>
                        +{config.ciConfig.workflows.length - 3} more
                      </Text>
                    )}
                  </Stack>
                </Box>
              )}

            {config.hasManualBuildUpload && (
              <Text size="xs" c={theme.colors.slate[5]}>
                Builds will be uploaded manually via dashboard
              </Text>
            )}
          </Stack>
        </SectionCard>

        {/* Target Platforms */}
        <SectionCard icon={IconTarget} iconColor="orange" title="Target Platforms">
          {config.targets && config.targets.length > 0 ? (
            <Group gap="xs">
              {config.targets.map((target) => (
                <Badge key={target} variant="light" size="md" color="orange">
                  {target.replace('_', ' ')}
                </Badge>
              ))}
            </Group>
          ) : (
            <Text size="sm" c={theme.colors.slate[5]}>
              No platforms selected
            </Text>
          )}
        </SectionCard>

        {/* Test Management */}
        <SectionCard icon={IconTestPipe} iconColor="grape" title="Test Management">
          {config?.testManagementConfig?.enabled ? (
            <Group gap="xs">
              <IconCheck size={14} color={theme.colors.green[6]} />
              <Text size="sm">
                {config?.testManagementConfig.provider}
              </Text>
            </Group>
          ) : (
            <Group gap="xs">
              <IconX size={14} color={theme.colors.slate[4]} />
              <Text size="sm" c={theme.colors.slate[5]}>
                Disabled
              </Text>
            </Group>
          )}
        </SectionCard>

        {/* Project Management */}
        <SectionCard icon={IconTicket} iconColor="blue" title="Project Management (JIRA)">
          {config?.projectManagementConfig?.enabled ? (
            <Stack gap="xs">
              <Group gap="xs">
                <IconCheck size={14} color={theme.colors.green[6]} />
                <Text size="sm">JIRA Integration Enabled</Text>
              </Group>
              {config?.projectManagementConfig?.platformConfigurations &&
                config.projectManagementConfig.platformConfigurations.length > 0 && (
                  <Text size="xs" c={theme.colors.slate[5]}>
                    {config.projectManagementConfig.platformConfigurations.length} platform(s) configured
                  </Text>
                )}
            </Stack>
          ) : (
            <Group gap="xs">
              <IconX size={14} color={theme.colors.slate[4]} />
              <Text size="sm" c={theme.colors.slate[5]}>
                Disabled
              </Text>
            </Group>
          )}
        </SectionCard>

        {/* Scheduling */}
        <SectionCard icon={IconCalendar} iconColor="cyan" title="Scheduling">
          {config.releaseSchedule ? (
            <Stack gap={0}>
              <InfoRow
                label="Frequency"
                value={
                  <Badge variant="light" size="sm" color="cyan">
                    {config.releaseSchedule.releaseFrequency}
                  </Badge>
                }
              />
              <InfoRow
                label="Timezone"
                value={
                  <Text size="sm" fw={500}>
                    {config.releaseSchedule.timezone}
                  </Text>
                }
              />
              <InfoRow
                label="Regression Slots"
                value={
                  <Text size="sm" fw={500}>
                    {config.releaseSchedule.regressionSlots?.length || 0}
                  </Text>
                }
              />
            </Stack>
          ) : (
            <Text size="sm" c={theme.colors.slate[5]}>
              Not configured
            </Text>
          )}
        </SectionCard>

        {/* Communication */}
        <SectionCard icon={IconBell} iconColor="indigo" title="Communication">
          <Stack gap="sm">
            <Group gap="xs">
              {config.communicationConfig?.slack?.enabled ? (
                <>
                  <IconBrandSlack size={14} color={theme.colors.green[6]} />
                  <Text size="sm">Slack enabled</Text>
                </>
              ) : (
                <>
                  <IconBrandSlack size={14} color={theme.colors.slate[4]} />
                  <Text size="sm" c={theme.colors.slate[5]}>
                    Slack disabled
                  </Text>
                </>
              )}
            </Group>

            <Group gap="xs">
              {config.communicationConfig?.email?.enabled ? (
                <>
                  <IconMail size={14} color={theme.colors.green[6]} />
                  <Text size="sm">Email enabled</Text>
                </>
              ) : (
                <>
                  <IconMail size={14} color={theme.colors.slate[4]} />
                  <Text size="sm" c={theme.colors.slate[5]}>
                    Email disabled
                  </Text>
                </>
              )}
            </Group>
          </Stack>
        </SectionCard>
      </SimpleGrid>

      {/* Description Section */}
      {config.description && (
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" fw={600} c={theme.colors.slate[5]} tt="uppercase" mb="xs">
            Description
          </Text>
          <Text size="sm" c={theme.colors.slate[7]}>
            {config.description}
          </Text>
        </Paper>
      )}
    </Stack>
  );
}
