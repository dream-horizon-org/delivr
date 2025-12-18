/**
 * RejectionWarningCard - Warning for rejected submissions
 * Extracted from dashboard.$org.releases.$releaseId.distribution.tsx
 */

import { Card, Text, Title } from '@mantine/core';
import { DS_COLORS, DS_SPACING, DS_TYPOGRAPHY } from '~/constants/distribution/distribution-design.constants';

export function RejectionWarningCard() {
  return (
    <Card shadow="sm" padding={DS_SPACING.LG} radius="md" withBorder className="border-red-300 bg-red-50">
      <Title order={4} c={DS_COLORS.STATUS.ERROR} mb={DS_SPACING.SM}>⚠️ Submission Rejected</Title>
      <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.STATUS.ERROR}>
        One or more submissions were rejected by the store. Please review the rejection details 
        and submit a corrected build.
      </Text>
    </Card>
  );
}

