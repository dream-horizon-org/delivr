/**
 * Manual Upload Configuration Form Component
 * For pipelines where builds are uploaded manually
 */

import { Textarea, Stack, Text, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { ManualUploadConfig } from '~/types/release-config';

interface ManualUploadConfigFormProps {
  config: Partial<ManualUploadConfig>;
  onChange: (config: Partial<ManualUploadConfig>) => void;
}

export function ManualUploadConfigForm({
  config,
  onChange,
}: ManualUploadConfigFormProps) {
  return (
    <Stack gap="md">
      <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
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

