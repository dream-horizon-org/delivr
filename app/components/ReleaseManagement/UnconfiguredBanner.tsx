/**
 * Unconfigured Release Banner
 * Displays when an organization hasn't configured their release process yet
 */

import { Link } from '@remix-run/react';
import { Alert, Button, Group, Text } from '@mantine/core';
import { IconSettings, IconRocket, IconAlertCircle } from '@tabler/icons-react';

interface UnconfiguredBannerProps {
  organizationId: string;
}

export function UnconfiguredBanner({ organizationId }: UnconfiguredBannerProps) {
  return (
    <Alert
      variant="light"
      color="blue"
      radius="md"
      icon={<IconAlertCircle size={24} />}
      className="mb-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Text fw={600} size="lg" className="mb-2">
            Configure Your Release Process
          </Text>
          
          <Text size="sm" c="dimmed" className="mb-4">
            Before creating releases, you need to configure your release management process. 
            This includes setting up build pipelines, regression schedules, test management, 
            and communication channels.
          </Text>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <IconSettings size={16} className="text-blue-600" />
                <Text size="sm" fw={500}>Build Pipelines</Text>
              </div>
              <Text size="xs" c="dimmed">
                Configure Jenkins or GitHub Actions for automated builds
              </Text>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <IconRocket size={16} className="text-blue-600" />
                <Text size="sm" fw={500}>Regression Schedules</Text>
              </div>
              <Text size="xs" c="dimmed">
                Define regression testing slots and timings
              </Text>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <IconSettings size={16} className="text-blue-600" />
                <Text size="sm" fw={500}>Integrations</Text>
              </div>
              <Text size="xs" c="dimmed">
                Connect test management and communication tools
              </Text>
            </div>
          </div>
        </div>
        
        <Link to={`/dashboard/${organizationId}/releases/configure`}>
          <Button
            variant="filled"
            size="md"
            leftSection={<IconSettings size={18} />}
            className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
          >
            Configure Release
          </Button>
        </Link>
      </div>
    </Alert>
  );
}

/**
 * Compact version for secondary pages
 */
export function UnconfiguredBannerCompact({ organizationId }: UnconfiguredBannerProps) {
  return (
    <Alert
      variant="light"
      color="yellow"
      radius="md"
      icon={<IconAlertCircle size={20} />}
      className="mb-4"
    >
      <Group justify="apart">
        <div>
          <Text fw={500} size="sm">
            Release configuration required
          </Text>
          <Text size="xs" c="dimmed">
            Configure your release process before creating releases
          </Text>
        </div>
        
        <Link to={`/dashboard/${organizationId}/releases/configure`}>
          <Button
            variant="light"
            size="sm"
            leftSection={<IconSettings size={16} />}
          >
            Configure
          </Button>
        </Link>
      </Group>
    </Alert>
  );
}

