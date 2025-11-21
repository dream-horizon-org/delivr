/**
 * Manual Upload Step
 * Displays information about manual build upload (CI/CD coming soon)
 */

import { Stack, Text, Card, Alert, List, ThemeIcon } from '@mantine/core';
import { IconUpload, IconRocket, IconInfoCircle } from '@tabler/icons-react';

export function ManualUploadStep() {
  return (
    <Stack gap="xl">
      {/* Header */}
      <div>
        <Text fw={600} size="lg" className="mb-1">
          Build Upload
        </Text>
        <Text size="sm" c="dimmed">
          How your builds reach the release dashboard
        </Text>
      </div>

      {/* Manual Upload Card */}
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Stack gap="lg" align="center">
          <ThemeIcon size={80} radius="md" variant="light" color="blue">
            <IconUpload size={48} />
          </ThemeIcon>

          <div style={{ textAlign: 'center' }}>
            <Text fw={600} size="xl" mb="xs">
              Manual Upload
            </Text>
            <Text size="md" c="dimmed">
              Full control over your build releases
            </Text>
          </div>

          <Alert
            icon={<IconInfoCircle size={18} />}
            color="blue"
            variant="light"
            style={{ width: '100%' }}
          >
            <Text size="sm">
              Upload builds through the release dashboard. For each build or regression slot, you'll manually upload the build files when ready.
            </Text>
          </Alert>

          {/* How it works */}
          <div style={{ width: '100%' }}>
            <List
              spacing="sm"
              size="sm"
              center
              icon={
                <ThemeIcon color="blue" size={20} radius="xl">
                  <Text size="xs">✓</Text>
                </ThemeIcon>
              }
            >
              <List.Item>
                <Text size="sm">
                  <strong>Build anywhere</strong> — Use any tool or CI/CD system
                </Text>
              </List.Item>
              <List.Item>
                <Text size="sm">
                  <strong>Upload .apk, .aab, .ipa files</strong> — When you're ready
                </Text>
              </List.Item>
              <List.Item>
                <Text size="sm">
                  <strong>Zero configuration</strong> — Start releasing immediately
                </Text>
              </List.Item>
            </List>
          </div>
        </Stack>
      </Card>

      {/* Coming Soon Card */}
      <Card shadow="sm" padding="lg" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="md" align="center">
          <ThemeIcon size={60} radius="md" variant="light" color="grape">
            <IconRocket size={32} />
          </ThemeIcon>

          <div style={{ textAlign: 'center' }}>
            <Text fw={600} size="lg" mb="xs" c="grape">
              CI/CD Integration Coming Soon
            </Text>
            <Text size="sm" c="dimmed">
              Automated builds from Jenkins, GitHub Actions & more
            </Text>
          </div>
        </Stack>
      </Card>
    </Stack>
  );
}

