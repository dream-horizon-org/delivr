/**
 * Draft Release Dialog
 * Dialog shown when a draft configuration is found
 */

import {
  Modal,
  Button,
  Text,
  Stack,
  Group,
  Paper,
  Badge,
  Box,
  ThemeIcon,
  useMantineTheme,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconPlus,
  IconEdit,
  IconFileDescription,
  IconClock,
  IconTarget,
  IconSettings,
} from '@tabler/icons-react';
import type { DraftReleaseDialogProps } from '~/types/release-config-props';

export function DraftReleaseDialog({
  opened,
  onClose,
  draftConfig,
  onContinueDraft,
  onStartNew,
}: DraftReleaseDialogProps) {
  const theme = useMantineTheme();
  
  const lastSaved = draftConfig?.updatedAt 
    ? new Date(draftConfig.updatedAt).toLocaleString()
    : 'Unknown';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon size={28} radius="md" variant="light" color="yellow">
            <IconAlertTriangle size={16} />
          </ThemeIcon>
          <Text fw={600}>Draft Configuration Found</Text>
        </Group>
      }
      size="md"
      centered
      radius="md"
    >
      <Stack gap="lg">
        {/* Alert Banner */}
        <Paper
          p="md"
          radius="md"
          style={{
            backgroundColor: theme.colors.yellow[0],
            border: `1px solid ${theme.colors.yellow[3]}`,
          }}
        >
          <Group gap="sm" align="flex-start">
            <ThemeIcon size={32} radius="md" variant="light" color="yellow">
              <IconFileDescription size={18} />
            </ThemeIcon>
            <Box>
              <Text size="sm" fw={500} c={theme.colors.yellow[9]}>
                Unsaved Draft Detected
              </Text>
              <Text size="xs" c={theme.colors.yellow[8]}>
                You have a draft configuration that wasn't completed
              </Text>
            </Box>
          </Group>
        </Paper>

        {/* Draft Details Card */}
        {draftConfig && (
          <Paper p="md" radius="md" withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" fw={600} c={theme.colors.slate[8]}>
                  {draftConfig.name || 'Unnamed Configuration'}
                </Text>
                <Badge color="yellow" size="sm" variant="light">
                  Draft
                </Badge>
              </Group>
              
              {draftConfig.description && (
                <Text size="xs" c={theme.colors.slate[5]} lineClamp={2}>
                  {draftConfig.description}
                </Text>
              )}
              
              <Box
                p="sm"
                style={{
                  backgroundColor: theme.colors.slate[0],
                  borderRadius: theme.radius.sm,
                }}
              >
                <Group gap="lg">
                  <Group gap="xs">
                    <IconClock size={14} color={theme.colors.slate[5]} />
                    <Text size="xs" c={theme.colors.slate[6]}>
                      Last saved: {lastSaved}
                    </Text>
                  </Group>
                </Group>
                
                <Group gap="lg" mt="xs">
                  <Group gap="xs">
                    <IconTarget size={14} color={theme.colors.slate[5]} />
                    <Text size="xs" c={theme.colors.slate[6]}>
                      {draftConfig.targets?.length || 0} platform(s)
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <IconSettings size={14} color={theme.colors.slate[5]} />
                    <Text size="xs" c={theme.colors.slate[6]}>
                      {draftConfig.ciConfig?.workflows?.length || 0} pipeline(s)
                    </Text>
                  </Group>
                </Group>
              </Box>
            </Stack>
          </Paper>
        )}

        {/* Question */}
        <Text size="sm" c={theme.colors.slate[6]} ta="center">
          Would you like to continue editing this draft or start fresh?
        </Text>

        {/* Action Buttons */}
        <Group gap="md" grow>
          <Button
            variant="default"
            leftSection={<IconPlus size={16} />}
            onClick={onStartNew}
            size="sm"
          >
            Start New
          </Button>
          
          <Button
            color="brand"
            leftSection={<IconEdit size={16} />}
            onClick={onContinueDraft}
            size="sm"
          >
            Continue Draft
          </Button>
        </Group>

        <Button
          variant="subtle"
          color="gray"
          size="xs"
          onClick={onClose}
          fullWidth
        >
          Cancel
        </Button>
      </Stack>
    </Modal>
  );
}
