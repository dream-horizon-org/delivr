/**
 * Release Details Form Component
 * Basic release information (version, dates, description)
 */

import { TextInput, Textarea, Select, Stack, Text, Group } from '@mantine/core';
import type { ReleaseBasicDetails } from '~/types/release-creation';

interface ReleaseDetailsFormProps {
  details: Partial<ReleaseBasicDetails>;
  onChange: (details: Partial<ReleaseBasicDetails>) => void;
  prePopulated?: boolean; // If from configuration
}

const releaseTypes = [
  { value: 'PLANNED', label: 'Planned Release' },
  { value: 'HOTFIX', label: 'Hotfix Release' },
  { value: 'EMERGENCY', label: 'Emergency Release' },
];

export function ReleaseDetailsForm({
  details,
  onChange,
  prePopulated = false,
}: ReleaseDetailsFormProps) {
  return (
    <Stack gap="md">
      <div>
        <Text fw={600} size="lg" className="mb-2">
          Release Details
        </Text>
        <Text size="sm" c="dimmed">
          Basic information about this release
        </Text>
      </div>
      
      <Group grow>
        <TextInput
          label="Version"
          placeholder="e.g., v1.2.3"
          value={details.version || ''}
          onChange={(e) => onChange({ ...details, version: e.target.value })}
          required
          description="Release version number"
        />
        
        <Select
          label="Release Type"
          data={releaseTypes}
          value={details.releaseType || 'PLANNED'}
          onChange={(val) => onChange({ ...details, releaseType: val as any })}
          required
          description={prePopulated ? 'From configuration' : 'Type of release'}
        />
      </Group>
      
      <TextInput
        label="Base Version (Optional)"
        placeholder="e.g., v1.2.0"
        value={details.baseVersion || ''}
        onChange={(e) => onChange({ ...details, baseVersion: e.target.value })}
        description="Version to branch from"
      />
      
      <Group grow>
        <TextInput
          label="Kickoff Date"
          type="date"
          value={details.kickoffDate || ''}
          onChange={(e) => onChange({ ...details, kickoffDate: e.target.value })}
          required
          description="When to start the release process"
        />
        
        <TextInput
          label="Release Date"
          type="date"
          value={details.releaseDate || ''}
          onChange={(e) => onChange({ ...details, releaseDate: e.target.value })}
          required
          description="Target production release date"
        />
      </Group>
      
      <Textarea
        label="Description (Optional)"
        placeholder="What's new in this release..."
        value={details.description || ''}
        onChange={(e) => onChange({ ...details, description: e.target.value })}
        rows={4}
        description="Release highlights and notes"
      />
    </Stack>
  );
}

