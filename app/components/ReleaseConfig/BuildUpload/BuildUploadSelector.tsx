/**
 * Build Upload Selector Component
 * Allows users to choose between Manual Upload and CI/CD Workflows
 */

import { Stack, Text, Card, Radio, Group, Alert } from '@mantine/core';
import { IconUpload, IconRocket, IconInfoCircle } from '@tabler/icons-react';
import type { BuildUploadStep } from '~/types/release-config';

interface BuildUploadSelectorProps {
  selectedMode: BuildUploadStep;
  onChange: (mode: BuildUploadStep) => void;
  hasIntegrations: boolean; // Whether CI/CD integrations are available
}

export function BuildUploadSelector({
  selectedMode,
  onChange,
  hasIntegrations,
}: BuildUploadSelectorProps) {
  return (
    <Stack gap="xl">
      {/* Header */}
      <div>
        <Text fw={600} size="lg" className="mb-1">
          Build Upload Method
        </Text>
        <Text size="sm" c="dimmed">
          Choose how builds reach the release dashboard
        </Text>
      </div>

      {/* Radio Button Selector */}
      <Radio.Group
        value={selectedMode}
        onChange={(value) => onChange(value as BuildUploadStep)}
      >
        <Stack gap="md">
          {/* Manual Upload Option */}
          <Card
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            className={`cursor-pointer transition-all ${
              selectedMode === 'MANUAL'
                ? 'border-blue-500 bg-blue-50'
                : 'hover:border-gray-300'
            }`}
            onClick={() => onChange('MANUAL')}
          >
            <Group gap="md" align="flex-start">
              <Radio value="MANUAL" size="md" className="mt-1" />
              <div className="flex-1">
                <Group gap="sm" className="mb-2">
                  <IconUpload size={24} className="text-blue-600" />
                  <Text fw={600} size="md">
                    Manual Upload
                  </Text>
                </Group>
                <Text size="sm" c="dimmed">
                  Upload builds manually through the release dashboard. Build anywhere, upload when ready.
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
                : selectedMode === 'CI_CD'
                ? 'border-grape-500 bg-grape-50'
                : 'hover:border-gray-300'
            }`}
            onClick={() => hasIntegrations && onChange('CI_CD')}
          >
            <Group gap="md" align="flex-start">
              <Radio value="CI_CD" size="md" disabled={!hasIntegrations} className="mt-1" />
              <div className="flex-1">
                <Group gap="sm" className="mb-2">
                  <IconRocket size={24} className={hasIntegrations ? 'text-grape-600' : 'text-gray-400'} />
                  <Text fw={600} size="md">
                    CI/CD Workflows
                  </Text>
                  {!hasIntegrations && (
                    <Text size="xs" c="dimmed" className="italic">
                      (Requires integrations)
                    </Text>
                  )}
                </Group>
                <Text size="sm" c="dimmed">
                  Automated builds from Jenkins or GitHub Actions. Trigger builds directly from the dashboard.
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
            To use <strong>CI/CD Workflows</strong>, you need to connect at least one provider:
          </Text>
          <ul className="list-disc list-inside text-sm mb-2">
            <li>Jenkins</li>
            <li>GitHub Actions</li>
          </ul>
          <Text size="sm" fw={500}>
            📍 Go to <strong>Settings → Integrations</strong> to connect a CI/CD provider.
          </Text>
        </Alert>
      )}

      {/* Next Step Info */}
      {selectedMode === 'CI_CD' && (
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

