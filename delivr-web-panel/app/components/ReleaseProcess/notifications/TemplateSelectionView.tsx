import { Stack, Radio, Text, Tooltip, Alert, Group, Box } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { NOTIFICATION_TEMPLATES, AD_HOC_NOTIFICATION_LABELS } from '~/constants/release-process-ui';
import { NotificationPreview } from './NotificationPreview';
import type { MessageTypeEnum } from '~/types/release-process.types';
import type { ReleaseConfiguration } from '~/types/release-config';

interface TemplateSelectionViewProps {
  selectedTemplate: MessageTypeEnum | null;
  onTemplateChange: (template: MessageTypeEnum) => void;
  releaseConfig: ReleaseConfiguration | null;
}

interface TemplateAvailability {
  available: boolean;
  reason?: string;
}

export function TemplateSelectionView({
  selectedTemplate,
  onTemplateChange,
  releaseConfig,
}: TemplateSelectionViewProps) {
  const templates = Object.values(NOTIFICATION_TEMPLATES);
  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  // Check if test management is configured
  const hasTestManagement = !!(
    releaseConfig?.testManagementConfig?.enabled && 
    releaseConfig.testManagementConfig.integrationId
  );

  // Check if project management is configured
  const hasProjectManagement = !!(
    releaseConfig?.projectManagementConfig?.enabled && 
    releaseConfig.projectManagementConfig.integrationId
  );

  // Check if manual build upload is enabled
  const hasManualBuildUpload = releaseConfig?.hasManualBuildUpload || false;

  // Determine availability for each template
  const getTemplateAvailability = (templateId: string): TemplateAvailability => {
    switch (templateId) {
      case 'test-results-summary':
        if (!hasTestManagement) {
          return {
            available: false,
            reason: 'Test management integration not configured. Go to Release Settings → Test Management to set it up.',
          };
        }
        return { available: true };

      case 'project-management-approval':
        if (!hasProjectManagement) {
          return {
            available: false,
            reason: 'Project management integration not configured. Go to Release Settings → Project Management to set it up.',
          };
        }
        return { available: true };

      case 'manual-build-upload-reminder':
        if (!hasManualBuildUpload) {
          return {
            available: false,
            reason: 'Manual build upload is not enabled for this release configuration.',
          };
        }
        return { available: true };

      default:
        return { available: true };
    }
  };

  return (
    <Stack gap="lg">
      <div>
        <Text size="sm" fw={600} mb="xs">
          {AD_HOC_NOTIFICATION_LABELS.TEMPLATE_SECTION_TITLE}
        </Text>
        
        <Radio.Group
          value={selectedTemplate ? String(selectedTemplate) : ''}
          onChange={(value) => {
            if (typeof value !== 'string') return;
            const availability = getTemplateAvailability(value);
            if (availability.available) {
              onTemplateChange(value as MessageTypeEnum);
            }
          }}
        >
          <Stack gap="sm" mt="sm">
            {templates.map((template) => {
              const templateId = String(template.id || '');
              const availability = getTemplateAvailability(templateId);
              const isDisabled = !availability.available;

              const radioButton = (
                <Radio
                  key={templateId}
                  value={templateId}
                  disabled={isDisabled}
                  label={
                    <div>
                      <Group gap="xs" align="center">
                        <Text size="sm" fw={500} c={isDisabled ? 'dimmed' : undefined}>
                          {String(template.label || '')}
                        </Text>
                        {isDisabled && (
                          <IconInfoCircle size={14} style={{ color: 'var(--mantine-color-yellow-6)' }} />
                        )}
                      </Group>
                      <Text size="xs" c="dimmed">
                        {String(template.description || '')}
                      </Text>
                    </div>
                  }
                  styles={{
                    root: {
                      opacity: isDisabled ? 0.6 : 1,
                    },
                  }}
                />
              );

              // Wrap disabled templates in a tooltip
              if (isDisabled && availability.reason) {
                return (
                  <Tooltip
                    key={template.id}
                    label={
                      <Text size="xs" style={{ lineHeight: 1.5 }}>
                        {availability.reason}
                      </Text>
                    }
                    multiline
                    w={300}
                    withArrow
                    color="dark"
                    styles={{
                      tooltip: {
                        backgroundColor: 'var(--mantine-color-dark-6)',
                        padding: '8px 12px',
                        maxWidth: '300px',
                      },
                    }}
                  >
                    <Box>{radioButton}</Box>
                  </Tooltip>
                );
              }

              return radioButton;
            })}
          </Stack>
        </Radio.Group>
      </div>

      {/* Show info alert if no templates are available */}
      {templates.every(t => !getTemplateAvailability(t.id).available) && (
        <Alert icon={<IconInfoCircle size={16} />} color="yellow" variant="light">
          <Text size="sm">
            No notification templates are currently available. Please configure the required integrations in your release settings.
          </Text>
        </Alert>
      )}

      {selectedTemplateData && selectedTemplateData.id && (
        <NotificationPreview template={selectedTemplateData} />
      )}
    </Stack>
  );
}
