import { Modal, Button, Text, Stack, Group, Card, Badge } from '@mantine/core';
import { IconAlertCircle, IconPlus, IconEdit } from '@tabler/icons-react';
import type { DraftReleaseDialogProps } from '~/types/release-config-props';
import { ICON_SIZES } from '~/constants/release-config-ui';

export function DraftReleaseDialog({
  opened,
  onClose,
  draftConfig,
  onContinueDraft,
  onStartNew,
}: DraftReleaseDialogProps) {
  const lastSaved = draftConfig?.updatedAt 
    ? new Date(draftConfig.updatedAt).toLocaleString()
    : 'Unknown';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Draft Configuration Found"
      size="md"
      centered
    >
      <Stack gap="lg">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <Group gap="sm">
            <IconAlertCircle size={ICON_SIZES.SMALL} className="text-yellow-600" />
            <Text size="sm" c="orange">
              You have an unsaved draft configuration
            </Text>
          </Group>
        </div>

        {draftConfig && (
          <Card shadow="sm" padding="md" withBorder>
            <Stack gap="xs">
              <Group justify="apart">
                <Text size="sm" fw={600}>
                  {draftConfig.name || 'Unnamed Configuration'}
                </Text>
                <Badge color="yellow" size="sm">Draft</Badge>
              </Group>
              
              {draftConfig.description && (
                <Text size="xs" c="dimmed">
                  {draftConfig.description}
                </Text>
              )}
              
              <Text size="xs" c="dimmed">
                Last saved: {lastSaved}
              </Text>
              
              <div className="mt-2">
                <Text size="xs" c="dimmed">
                  {draftConfig.targets?.length || 0} platform(s) selected
                </Text>
                <Text size="xs" c="dimmed">
                  {draftConfig.ciConfig?.workflows?.length || 0} pipeline(s) configured
                </Text>
              </div>
            </Stack>
          </Card>
        )}

        <Text size="sm" c="dimmed">
          Would you like to continue editing this draft or start a new configuration from scratch?
        </Text>

        <Group justify="apart" grow>
          <Button
            variant="light"
            leftSection={<IconPlus size={18} />}
            onClick={onStartNew}
          >
            Start New
          </Button>
          
          <Button
            variant="filled"
            leftSection={<IconEdit size={18} />}
            onClick={onContinueDraft}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue Draft
          </Button>
        </Group>

        <Button
          variant="subtle"
          size="sm"
          onClick={onClose}
          className="w-full"
        >
          Cancel
        </Button>
      </Stack>
    </Modal>
  );
}

