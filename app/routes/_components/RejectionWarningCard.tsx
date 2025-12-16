/**
 * RejectionWarningCard - Warning for rejected submissions
 * Extracted from dashboard.$org.releases.$releaseId.distribution.tsx
 */

import { Card, Text, Title } from '@mantine/core';

export function RejectionWarningCard() {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder className="border-red-300 bg-red-50">
      <Title order={4} c="red.7" mb="sm">⚠️ Submission Rejected</Title>
      <Text size="sm" c="red.7">
        One or more submissions were rejected by the store. Please review the rejection details 
        and submit a corrected build.
      </Text>
    </Card>
  );
}

