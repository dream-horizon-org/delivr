/**
 * Manual Upload Configuration Form Component
 * For pipelines where builds are uploaded manually
 */

import { Textarea, Stack, Text, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { ManualUploadConfigFormProps } from '~/types/release-config-props';
import { ICON_SIZES } from '~/constants/release-config-ui';

export function ManualUploadConfigForm({
  config,
  onChange,
}: ManualUploadConfigFormProps) {
  return (
    <Stack gap="md">
      <Alert icon={<IconInfoCircle size={ICON_SIZES.SMALL} />} color="blue" variant="light">
        <Text size="sm">
          This pipeline requires manual build uploads. You'll need to upload builds 
          through the release dashboard when creating each release.
        </Text>
      </Alert>
      
      <Textarea
        label="Instructions (Optional)"
        placeholder="Enter any special instructions for uploading builds..."
        value={config.instructions || ''}
        onChange={(e) => onChange({ ...config, instructions: e.target.value })}
        rows={4}
        description="Provide guidance for team members on how to prepare and upload builds"
      />
    </Stack>
  );
}
