/**
 * VersionConflictAlert - Alert shown when version already exists in store
 * 
 * Provides resolution options:
 * - Create new release with incremented version
 * - Delete draft version in store console (if applicable)
 */

import {
  Alert,
  Button,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { Link } from '@remix-run/react';
import type { Platform } from '~/types/distribution.types';

type VersionConflictAlertProps = {
  platform: Platform;
  version: string;
  existingStatus: string;
  org: string;
};

export function VersionConflictAlert({
  platform,
  version,
  existingStatus,
  org,
}: VersionConflictAlertProps) {
  const platformName = platform === 'ANDROID' ? 'Play Store' : 'App Store';
  const canDeleteDraft = existingStatus === 'DRAFT';

  return (
    <Alert
      icon={<IconAlertCircle size={20} />}
      title="Version Conflict"
      color="orange"
      variant="light"
    >
      <Stack gap="sm">
        <Text size="sm">
          Version <strong>{version}</strong> already exists in {platformName} with status{' '}
          <strong>{existingStatus}</strong>.
        </Text>

        <Text size="sm" c="dimmed">
          You have the following options:
        </Text>

        <Stack gap="xs" mt="xs">
          <Button
            component={Link}
            to={`/dashboard/${org}/releases/new`}
            variant="light"
            color="blue"
            size="sm"
            fullWidth
          >
            Create New Release with Incremented Version
          </Button>

          {canDeleteDraft && (
            <Button
              component="a"
              href={
                platform === 'ANDROID'
                  ? 'https://play.google.com/console'
                  : 'https://appstoreconnect.apple.com'
              }
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              color="orange"
              size="sm"
              fullWidth
            >
              Delete Draft in {platformName} Console
            </Button>
          )}
        </Stack>

        <Text size="xs" c="dimmed" mt="xs">
          <strong>Recommended:</strong> Create a new release with an incremented version number
          (e.g., {getIncrementedVersion(version)}).
        </Text>
      </Stack>
    </Alert>
  );
}

/**
 * Helper to suggest incremented version
 */
function getIncrementedVersion(version: string): string {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return `${version}.1`;
  
  const [, major, minor, patch] = match;
  return `${major}.${minor}.${parseInt(patch) + 1}`;
}

