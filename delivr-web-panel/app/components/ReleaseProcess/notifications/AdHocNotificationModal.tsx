import { useState, useEffect } from 'react';
import { Modal, Stack, SegmentedControl, Button, Group, Divider, Text } from '@mantine/core';
import { IconMessageCircle } from '@tabler/icons-react';
import { TemplateSelectionView } from './TemplateSelectionView';
import { CustomMessageView } from './CustomMessageView';
import { ChannelSelector } from './ChannelSelector';
import { useSendAdHocNotification } from '~/hooks/useReleaseProcess';
import { AD_HOC_NOTIFICATION_LABELS } from '~/constants/release-process-ui';
import type { MessageTypeEnum, AdHocNotificationRequest, SlackChannelRef } from '~/types/release-process.types';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import type { ReleaseConfiguration } from '~/types/release-config';

interface AdHocNotificationModalProps {
  opened: boolean;
  onClose: () => void;
  tenantId: string;
  release: BackendReleaseResponse;
  integrationId: string | null;
  releaseConfig: ReleaseConfiguration | null;
}

type NotificationMode = 'template' | 'custom';

export function AdHocNotificationModal({
  opened,
  onClose,
  tenantId,
  release,
  integrationId,
  releaseConfig,
}: AdHocNotificationModalProps) {
  const [mode, setMode] = useState<NotificationMode>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTypeEnum | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<SlackChannelRef[]>([]);
  const [validationError, setValidationError] = useState('');

  const sendNotificationMutation = useSendAdHocNotification(tenantId, release.id);

  useEffect(() => {
    if (!opened) {
      setMode('template');
      setSelectedTemplate(null);
      setCustomMessage('');
      setSelectedChannels([]);
      setValidationError('');
    }
  }, [opened]);

  const validate = (): boolean => {
    setValidationError('');

    if (selectedChannels.length === 0) {
      setValidationError(AD_HOC_NOTIFICATION_LABELS.ERROR_NO_CHANNELS);
      return false;
    }

    if (mode === 'template' && !selectedTemplate) {
      setValidationError(AD_HOC_NOTIFICATION_LABELS.ERROR_NO_TEMPLATE);
      return false;
    }

    if (mode === 'custom') {
      if (!customMessage.trim()) {
        setValidationError(AD_HOC_NOTIFICATION_LABELS.ERROR_NO_MESSAGE);
        return false;
      }
      if (customMessage.length > AD_HOC_NOTIFICATION_LABELS.CHARACTER_LIMIT) {
        setValidationError(AD_HOC_NOTIFICATION_LABELS.ERROR_MESSAGE_TOO_LONG);
        return false;
      }
    }

    return true;
  };

  const handleSend = async () => {
    if (!validate()) return;

    const request: AdHocNotificationRequest = {
      type: mode,
      channels: selectedChannels,
    };

    if (mode === 'template') {
      request.messageType = selectedTemplate!;
    } else {
      request.customMessage = customMessage;
    }

    try {
      await sendNotificationMutation.mutateAsync(request);
      onClose();
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const isLoading = sendNotificationMutation.isLoading;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={AD_HOC_NOTIFICATION_LABELS.MODAL_TITLE}
      size="lg"
      closeOnClickOutside={!isLoading}
      closeOnEscape={!isLoading}
    >
      <Stack gap="lg">
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as NotificationMode)}
          data={[
            { value: 'template', label: AD_HOC_NOTIFICATION_LABELS.MODE_TEMPLATE },
            { value: 'custom', label: AD_HOC_NOTIFICATION_LABELS.MODE_CUSTOM },
          ]}
          fullWidth
          disabled={isLoading}
        />

        {mode === 'template' ? (
          <TemplateSelectionView
            selectedTemplate={selectedTemplate}
            onTemplateChange={setSelectedTemplate}
            releaseConfig={releaseConfig}
          />
        ) : (
          <CustomMessageView message={customMessage} onChange={setCustomMessage} />
        )}

        <Divider />

        <ChannelSelector
          integrationId={integrationId}
          tenantId={tenantId}
          selectedChannels={selectedChannels}
          onChange={setSelectedChannels}
        />

        {validationError && (
          <Text size="sm" c="red">{validationError}</Text>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={isLoading}>
            {AD_HOC_NOTIFICATION_LABELS.BUTTON_CANCEL}
          </Button>
          <Button
            onClick={handleSend}
            loading={isLoading}
            disabled={!integrationId}
            leftSection={<IconMessageCircle size={16} />}
          >
            {isLoading
              ? AD_HOC_NOTIFICATION_LABELS.BUTTON_SENDING
              : AD_HOC_NOTIFICATION_LABELS.BUTTON_SEND}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
