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
import { STORE_NAMES } from '~/constants/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';
import { Platform } from '~/types/distribution.types';

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
  const platformName = STORE_NAMES[platform];
  const canDeleteDraft = existingStatus === 'DRAFT';

  return (
    <Alert
      icon={<IconAlertCircle size={20} />}
      title="Version Conflict"
      color={DS_COLORS.STATUS.WARNING}
      variant="light"
      radius={DS_SPACING.BORDER_RADIUS}
    >
      <Stack gap={DS_SPACING.SM}>
        <Text size={DS_TYPOGRAPHY.SIZE.SM}>
          Version <strong>{version}</strong> already exists in {platformName} with status{' '}
          <strong>{existingStatus}</strong>.
        </Text>

        <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
          You have the following options:
        </Text>

        <Stack gap={DS_SPACING.XS} mt={DS_SPACING.XS}>
          <Button
            component={Link}
            to={`/dashboard/${org}/releases/new`}
            variant="light"
            color={DS_COLORS.ACTION.PRIMARY}
            size="sm"
            fullWidth
            radius={DS_SPACING.BORDER_RADIUS}
          >
            Create New Release with Incremented Version
          </Button>

          {canDeleteDraft && (
            <Button
              component="a"
              href={
                platform === Platform.ANDROID
                  ? 'https://play.google.com/console'
                  : 'https://appstoreconnect.apple.com'
              }
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              color={DS_COLORS.STATUS.WARNING}
              size="sm"
              fullWidth
              radius={DS_SPACING.BORDER_RADIUS}
            >
              Delete Draft in {platformName} Console
            </Button>
          )}
        </Stack>

        <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED} mt={DS_SPACING.XS}>
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

