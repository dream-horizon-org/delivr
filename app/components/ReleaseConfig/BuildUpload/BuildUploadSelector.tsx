/**
 * Build Upload Selector Component
 * Allows users to choose between Manual Upload and CI/CD Workflows
 */

import { Stack, Text, Card, Radio, Group, Alert } from '@mantine/core';
import { IconUpload, IconRocket, IconInfoCircle } from '@tabler/icons-react';
import type { BuildUploadSelectorProps } from '~/types/release-config-props';
import { BUILD_UPLOAD_STEPS } from '~/types/release-config-constants';
import {
  BUILD_UPLOAD_LABELS,
  BUILD_UPLOAD_DESCRIPTIONS,
  SECTION_TITLES,
  INFO_MESSAGES,
  PROVIDER_LABELS,
  ICON_SIZES,
} from '~/constants/release-config-ui';

export function BuildUploadSelector({
  hasManualBuildUpload,
  onChange,
  hasIntegrations,
}: BuildUploadSelectorProps) {
  // Convert boolean to display mode
  const selectedMode = hasManualBuildUpload ? BUILD_UPLOAD_STEPS.MANUAL : BUILD_UPLOAD_STEPS.CI_CD;
  
  return (
    <Stack gap="xl">
      {/* Header */}
      <div>
        <Text fw={600} size="lg" className="mb-1">
          {SECTION_TITLES.BUILD_UPLOAD_METHOD}
        </Text>
        <Text size="sm" c="dimmed">
          Choose how builds reach the release dashboard
        </Text>
      </div>

      {/* Radio Button Selector */}
      <Radio.Group
        value={selectedMode}
        onChange={(value) => onChange(value === BUILD_UPLOAD_STEPS.MANUAL)}
      >
        <Stack gap="md">
          {/* Manual Upload Option */}
          <Card
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            className={`cursor-pointer transition-all ${
              selectedMode === BUILD_UPLOAD_STEPS.MANUAL
                ? 'border-blue-500 bg-blue-50'
                : 'hover:border-gray-300'
            }`}
            onClick={() => onChange(true)}
          >
            <Group gap="md" align="flex-start">
              <Radio value={BUILD_UPLOAD_STEPS.MANUAL} size="md" className="mt-1" />
              <div className="flex-1">
                <Group gap="sm" className="mb-2">
                  <IconUpload size={ICON_SIZES.LARGE} className="text-blue-600" />
                  <Text fw={600} size="md">
                    {BUILD_UPLOAD_LABELS.MANUAL}
                  </Text>
                </Group>
                <Text size="sm" c="dimmed">
                  {BUILD_UPLOAD_DESCRIPTIONS.MANUAL}
                </Text>
              </div>
            </Group>
          </Card>

          {/* CI/CD Workflows Option */}
          <Card
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            className={`cursor-pointer transition-all ${
              !hasIntegrations
                ? 'opacity-50 cursor-not-allowed'
                : selectedMode === BUILD_UPLOAD_STEPS.CI_CD
                ? 'border-grape-500 bg-grape-50'
                : 'hover:border-gray-300'
            }`}
            onClick={() => hasIntegrations && onChange(false)}
          >
            <Group gap="md" align="flex-start">
              <Radio value={BUILD_UPLOAD_STEPS.CI_CD} size="md" disabled={!hasIntegrations} className="mt-1" />
              <div className="flex-1">
                <Group gap="sm" className="mb-2">
                  <IconRocket size={ICON_SIZES.LARGE} className={hasIntegrations ? 'text-grape-600' : 'text-gray-400'} />
                  <Text fw={600} size="md">
                    {BUILD_UPLOAD_LABELS.CI_CD}
                  </Text>
                  {!hasIntegrations && (
                    <Text size="xs" c="dimmed" className="italic">
                      (Requires integrations)
                    </Text>
                  )}
                </Group>
                <Text size="sm" c="dimmed">
                  {BUILD_UPLOAD_DESCRIPTIONS.CI_CD}
                </Text>
              </div>
            </Group>
          </Card>
        </Stack>
      </Radio.Group>

      {/* Alert for no integrations */}
      {!hasIntegrations && (
        <Alert
          icon={<IconInfoCircle size={18} />}
          color="orange"
          variant="light"
          title="CI/CD Providers Required"
        >
          <Text size="sm" className="mb-2">
            To use <strong>{BUILD_UPLOAD_LABELS.CI_CD}</strong>, you need to connect at least one provider:
          </Text>
          <ul className="list-disc list-inside text-sm mb-2">
            <li>{PROVIDER_LABELS.JENKINS}</li>
            <li>{PROVIDER_LABELS.GITHUB_ACTIONS}</li>
          </ul>
          <Text size="sm" fw={500}>
            📍 Go to <strong>Settings → Integrations</strong> to connect a CI/CD provider.
          </Text>
        </Alert>
      )}

      {/* Next Step Info */}
      {selectedMode === BUILD_UPLOAD_STEPS.CI_CD && (
        <Alert
          icon={<IconInfoCircle size={18} />}
          color="grape"
          variant="light"
        >
          <Text size="sm">
            <strong>Next:</strong> You'll configure your CI/CD workflows for the platforms you selected.
          </Text>
        </Alert>
      )}
    </Stack>
  );
}
